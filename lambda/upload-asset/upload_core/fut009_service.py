"""FUT-009 — Lambda HTTP service for automatic post-feedback S3 video rename."""

from __future__ import annotations

import json
import re
from typing import Any

import boto3
from botocore.exceptions import ClientError

from upload_core.airtable import get_enrollment, get_program_instance, get_record, patch_asset
from upload_core.config import TABLE, UploadConfig
from upload_core.fut009_rename import (
    FIELD_CONFIRM_S3_RENAME,
    FIELD_CUSTOM_VIDEO_FILE_NAME,
    RenameContext,
    process_video_rename,
)
from upload_core.season import (
    FIELD_ENROLLMENT_FIRST_NAME,
    FIELD_ENROLLMENT_LAST_NAME,
    FIELD_PI_NAME,
    TABLE_ENROLLMENTS_NAME,
    TABLE_PROGRAM_INSTANCE_NAME,
)
from upload_core.util import field_text, first_link, record_link_ids
from upload_core.viewer import get_raw_path

TABLE_VIDEO_FEEDBACK = "Video Feedback"

RECORD_ID_RE = re.compile(r"^rec[a-zA-Z0-9]{14,}$")
FUT009_RENAME_PATH = "/fut009/rename"

ACTIVITY_DATE_FIELDS = (
    "Activity Date",
    "Activity Date (from Submissions)",
    "Activity Date (from Submission)",
    "Date",
)

SUCCESS_ACTIONS = frozenset({"renamed", "airtable_only_recovery", "skipped_already_named"})
SKIP_ACTIONS = frozenset(
    {
        "skipped_already_named",
        "skipped_missing_custom_name",
        "skipped_blank_custom_name",
        "skipped_unchanged_custom_name",
        "skipped_not_video",
        "skipped_not_uploaded",
        "skipped_upload_in_flight",
        "skipped_missing_confirmation",
        "skipped_missing_source_key",
        "skipped_homework_or_headshot",
        "dry_run_would_rename",
    }
)
ERROR_ACTIONS = frozenset(
    {
        "error_copy_failed",
        "error_verify_failed",
        "error_airtable_failed",
        "error_unexpected_destination",
    }
)


class Fut009RequestError(Exception):
    def __init__(self, message: str, *, status_code: int = 400, action_out: str = "error"):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.action_out = action_out


def is_fut009_rename_path(event: dict) -> bool:
    path = get_raw_path(event).rstrip("/") or "/"
    return path == FUT009_RENAME_PATH.rstrip("/")


def parse_fut009_payload(event: dict) -> dict[str, Any]:
    if not isinstance(event, dict):
        raise Fut009RequestError("Event must be a JSON object")
    if "videoFeedbackRecordId" in event or "submissionAssetRecordId" in event:
        payload = event
    else:
        body = event.get("body")
        if isinstance(body, str):
            try:
                parsed = json.loads(body)
            except json.JSONDecodeError as exc:
                raise Fut009RequestError(f"Invalid JSON body: {exc}") from exc
            if not isinstance(parsed, dict):
                raise Fut009RequestError("Request body must be a JSON object")
            payload = parsed
        elif isinstance(body, dict):
            payload = body
        else:
            raise Fut009RequestError(
                "Missing videoFeedbackRecordId or submissionAssetRecordId in request body"
            )

    vf_id = str(payload.get("videoFeedbackRecordId") or "").strip()
    asset_id = str(payload.get("submissionAssetRecordId") or "").strip()
    if not vf_id and not asset_id:
        raise Fut009RequestError(
            "Missing videoFeedbackRecordId or submissionAssetRecordId in request body"
        )
    return payload


def _require_record_id(value: object, label: str) -> str:
    text = str(value or "").strip()
    if not RECORD_ID_RE.fullmatch(text):
        raise Fut009RequestError(f"Invalid {label}: {value!r}")
    return text


def activity_date_from_fields(fields: dict[str, Any]) -> str:
    for key in ACTIVITY_DATE_FIELDS:
        text = field_text(fields.get(key))
        if text:
            return text
    return ""


def activity_date_from_vf_or_key(
    *,
    asset_fields: dict[str, Any],
    vf_fields: dict[str, Any] | None,
) -> str:
    """Resolve activity date for Option D path segment.

    Production Submission Assets expose ``Date`` (not ``Activity Date``).
    Video Feedback may carry ``Activity Date - Lkp``. Storage Key folder
    ``YYYY-MM-DD`` is a last-resort fallback for disposable/legacy rows.
    """
    text = activity_date_from_fields(asset_fields)
    if text:
        return text

    if vf_fields:
        for key in ("Activity Date - Lkp", "Activity Date", *ACTIVITY_DATE_FIELDS):
            text = field_text(vf_fields.get(key))
            if text:
                return text

    source_key = str(asset_fields.get("Storage Key") or "").strip()
    for part in source_key.split("/"):
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", part or ""):
            return part
    return ""


def resolve_submission_asset_id(
    *,
    token: str,
    base_id: str,
    payload: dict[str, Any],
) -> tuple[str, dict[str, Any] | None]:
    """Return (submission_asset_id, video_feedback_fields_or_none)."""
    asset_id = str(payload.get("submissionAssetRecordId") or "").strip()
    vf_id = str(payload.get("videoFeedbackRecordId") or "").strip()

    if asset_id:
        _require_record_id(asset_id, "submissionAssetRecordId")
        vf_fields = None
        if vf_id:
            vf = get_record(token, base_id, TABLE_VIDEO_FEEDBACK, vf_id)
            vf_fields = vf.get("fields", {})
        return asset_id, vf_fields

    if not vf_id:
        raise Fut009RequestError(
            "Provide videoFeedbackRecordId or submissionAssetRecordId"
        )
    vf_id = _require_record_id(vf_id, "videoFeedbackRecordId")
    vf = get_record(token, base_id, TABLE_VIDEO_FEEDBACK, vf_id)
    vf_fields = vf.get("fields", {})
    linked = record_link_ids(vf_fields.get("Submission Asset"))
    if not linked:
        raise Fut009RequestError(
            "Video Feedback has no linked Submission Asset",
            action_out="error_missing_submission_asset",
        )
    if len(linked) > 1:
        raise Fut009RequestError(
            "Video Feedback links to multiple Submission Assets — manual review required",
            action_out="error_ambiguous_submission_asset",
        )
    return linked[0], vf_fields


def load_rename_context(
    *,
    token: str,
    base_id: str,
    submission_asset_id: str,
    vf_fields: dict[str, Any] | None,
    coach_confirmed_override: bool | None = None,
) -> RenameContext:
    asset = get_record(token, base_id, TABLE, submission_asset_id)
    fields = asset.get("fields", {})

    custom_name = ""
    coach_confirmed = False
    if vf_fields is not None:
        custom_name = field_text(vf_fields.get(FIELD_CUSTOM_VIDEO_FILE_NAME))
        coach_confirmed = vf_fields.get(FIELD_CONFIRM_S3_RENAME) is True
    elif fields.get("Video Feedback"):
        vf_ids = record_link_ids(fields.get("Video Feedback"))
        if vf_ids:
            vf = get_record(token, base_id, TABLE_VIDEO_FEEDBACK, vf_ids[0])
            vf_fields_loaded = vf.get("fields", {})
            custom_name = field_text(vf_fields_loaded.get(FIELD_CUSTOM_VIDEO_FILE_NAME))
            coach_confirmed = vf_fields_loaded.get(FIELD_CONFIRM_S3_RENAME) is True

    if coach_confirmed_override is not None:
        coach_confirmed = coach_confirmed_override

    enrollment_id = first_link(fields, "Enrollment - Linked") or first_link(fields, "Enrollment")
    last_name = ""
    first_name = ""
    program_instance_name = ""
    if enrollment_id:
        enrollment = get_enrollment(token, base_id, enrollment_id)
        e_fields = enrollment.get("fields", {})
        last_name = field_text(e_fields.get(FIELD_ENROLLMENT_LAST_NAME))
        first_name = field_text(e_fields.get(FIELD_ENROLLMENT_FIRST_NAME))
        pi_ids = record_link_ids(e_fields.get("Program Instance"))
        if pi_ids:
            pi = get_program_instance(token, base_id, pi_ids[0])
            pi_fields = pi.get("fields", {})
            program_instance_name = field_text(pi_fields.get(FIELD_PI_NAME))

    return RenameContext(
        record_id=submission_asset_id,
        asset_fields=fields,
        custom_video_file_name=custom_name,
        last_name=last_name,
        first_name=first_name,
        program_instance_name=program_instance_name,
        activity_date=activity_date_from_vf_or_key(asset_fields=fields, vf_fields=vf_fields),
        coach_confirmed=coach_confirmed,
    )


def _head_object_exists(s3_client: Any, bucket: str, key: str) -> bool:
    try:
        s3_client.head_object(Bucket=bucket, Key=key)
        return True
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code", "")
        if code in ("404", "NoSuchKey", "NotFound"):
            return False
        raise


def handle_fut009_rename_request(config: UploadConfig, event: dict) -> tuple[int, dict[str, Any]]:
    """Execute FUT-009 rename from Lambda HTTP POST /fut009/rename."""
    payload = parse_fut009_payload(event)
    dry_run = payload.get("dryRun") is True
    include_audit_fields = payload.get("includeAuditFields") is True
    confirm_flag = payload.get("coachConfirmed") is True or payload.get("confirmRename") is True

    asset_id, vf_fields = resolve_submission_asset_id(
        token=config.airtable_token,
        base_id=config.airtable_base_id,
        payload=payload,
    )
    coach_override = True if confirm_flag else None
    ctx = load_rename_context(
        token=config.airtable_token,
        base_id=config.airtable_base_id,
        submission_asset_id=asset_id,
        vf_fields=vf_fields,
        coach_confirmed_override=coach_override,
    )

    s3_client = None if dry_run else boto3.client("s3", region_name=config.aws_region)

    def patch_airtable(fields: dict[str, Any]) -> None:
        """Patch SA fields; strip unknown optional fields and retry once if needed."""
        try:
            patch_asset(config.airtable_token, config.airtable_base_id, asset_id, fields)
            return
        except Exception as exc:  # noqa: BLE001 — classify unknown-field then re-raise
            message = str(exc)
            if "UNKNOWN_FIELD_NAME" not in message and "unknown field name" not in message.lower():
                raise
            # Optional / deferred schema (not present in Production as of 2026-09-04)
            optional = {
                "Formatted Upload Name",
                "Previous Storage Key",
                "Renamed At",
            }
            trimmed = {k: v for k, v in fields.items() if k not in optional}
            if trimmed == fields or not trimmed:
                raise
            patch_asset(config.airtable_token, config.airtable_base_id, asset_id, trimmed)

    def head_source(key: str) -> dict[str, Any] | None:
        try:
            return s3_client.head_object(Bucket=config.s3_bucket, Key=key)
        except ClientError:
            return None

    decision = process_video_rename(
        ctx,
        bucket=config.s3_bucket,
        region=config.aws_region,
        dry_run=dry_run,
        confirm_flag=confirm_flag and not dry_run,
        include_audit_fields=include_audit_fields,
        s3_client=s3_client,
        head_source=head_source,
        head_destination=lambda key: _head_object_exists(s3_client, config.s3_bucket, key),
        patch_airtable=None if dry_run or not confirm_flag else patch_airtable,
    )

    status_out = "success" if decision.action in SUCCESS_ACTIONS else "skipped"
    if decision.action in ERROR_ACTIONS:
        status_out = "error"
    elif decision.action in SKIP_ACTIONS and decision.action != "skipped_already_named":
        status_out = "skipped"

    body: dict[str, Any] = {
        "ok": decision.action not in ERROR_ACTIONS,
        "statusOut": status_out,
        "actionOut": decision.action,
        "errorOut": decision.reason if decision.action in ERROR_ACTIONS else "",
        "submissionAssetRecordId": asset_id,
        "videoFeedbackRecordId": str(payload.get("videoFeedbackRecordId") or "").strip(),
        "sourceKey": decision.source_key,
        "destinationKey": decision.destination_key,
        "customVideoFileName": decision.custom_video_file_name,
        "reason": decision.reason,
        "oldObjectRetained": decision.action == "renamed",
        "logLine": decision.log_line,
    }
    if decision.writeback_fields:
        body["writebackFields"] = list(decision.writeback_fields.keys())

    if decision.action in ERROR_ACTIONS:
        if confirm_flag and not dry_run:
            try:
                from upload_core.fields import FIELD_UPLOAD_ERROR

                patch_asset(
                    config.airtable_token,
                    config.airtable_base_id,
                    asset_id,
                    {FIELD_UPLOAD_ERROR: f"FUT-009 rename failed ({decision.action}): {decision.reason}"},
                )
            except Exception:
                pass
        return 500, body
    if decision.action == "dry_run_would_rename":
        return 200, body
    return 200, body
