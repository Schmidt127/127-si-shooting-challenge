"""FUT-009 — Safe post-feedback S3 video rename (copy-on-write).

Authority: docs/next-wave/aws-media/FUT-009-AWS-STORAGE-STRUCTURE-BRIEF.md
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable, Literal
from zoneinfo import ZoneInfo

from upload_core.fields import (
    FIELD_CANONICAL_FILE_URL,
    FIELD_ORIGINAL_FILE_NAME,
    FIELD_STORAGE_KEY,
    FIELD_UPLOAD_ERROR,
    FIELD_UPLOAD_STATUS,
)
from upload_core.fut007_basename import (
    Fut009DestinationInput,
    build_fut009_destination_key,
    extension_from_filename,
)
from upload_core.s3_storage_key_format import extract_basename_from_key, is_path_safe_storage_key
from upload_core.storage_key import folder_person_name, folder_program_instance
from upload_core.util import canonical_url, field_text, select_name

DENVER = ZoneInfo("America/Denver")

RenameAction = Literal[
    "renamed",
    "dry_run_would_rename",
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
    "error_copy_failed",
    "error_verify_failed",
    "error_airtable_failed",
    "error_unexpected_destination",
    "airtable_only_recovery",
]

FIELD_FORMATTED_UPLOAD_NAME = "Formatted Upload Name"
FIELD_PREVIOUS_STORAGE_KEY = "Previous Storage Key"
FIELD_RENAMED_AT = "Renamed At"
FIELD_CONFIRM_S3_RENAME = "Confirm S3 Video Rename"
FIELD_SEND_TO_MAKE_TRIGGER = "Send to Make Trigger"
FIELD_UPLOAD_DESTINATION = "Upload Destination"
FIELD_CUSTOM_VIDEO_FILE_NAME = "Custom Video File Name"

UPLOAD_STATUS_UPLOADED = "Uploaded"
UPLOAD_DESTINATION_VIDEO = "Video Feedback"
UNCERTAIN_UPLOAD_STATUSES = frozenset({"Pending Link", "Processing", "Ready", "Error", "No File"})

BLANK_CUSTOM_MARKERS = frozenset({"", "—", "-", "\u2014", "\u2013"})


@dataclass(frozen=True)
class RenameContext:
    record_id: str
    asset_fields: dict[str, Any]
    custom_video_file_name: str
    last_name: str = ""
    first_name: str = ""
    program_instance_name: str = ""
    activity_date: str = ""
    coach_confirmed: bool = False
    existing_basenames: tuple[str, ...] = ()


@dataclass
class RenameDecision:
    record_id: str
    action: RenameAction
    source_key: str = ""
    destination_key: str = ""
    custom_video_file_name: str = ""
    reason: str = ""
    should_copy: bool = False
    should_patch_airtable: bool = False
    writeback_fields: dict[str, Any] = field(default_factory=dict)
    log_line: str = ""


def is_blank_custom_name(value: object) -> bool:
    text = str(value or "").strip()
    return text in BLANK_CUSTOM_MARKERS


def normalize_custom_name(value: object) -> str:
    return str(value or "").strip()


def passes_coach_confirmation(*, coach_confirmed: bool, confirm_flag: bool) -> bool:
    """Require explicit operator or coach confirmation before S3 copy."""
    return coach_confirmed or confirm_flag


def evaluate_rename_eligibility(ctx: RenameContext, *, confirm_flag: bool = False) -> RenameDecision:
    """Validate trigger, confirmation, and asset state before computing destination key."""
    fields = ctx.asset_fields
    record_id = ctx.record_id
    source_key = str(fields.get(FIELD_STORAGE_KEY) or "").strip()

    base = RenameDecision(record_id=record_id, action="skipped_not_uploaded", source_key=source_key)

    destination = select_name(fields.get(FIELD_UPLOAD_DESTINATION))
    if destination != UPLOAD_DESTINATION_VIDEO:
        base.action = "skipped_not_video" if destination else "skipped_homework_or_headshot"
        base.reason = f"Upload Destination must be {UPLOAD_DESTINATION_VIDEO!r}; got {destination or '[blank]'!r}."
        return base

    status = select_name(fields.get(FIELD_UPLOAD_STATUS))
    if status in UNCERTAIN_UPLOAD_STATUSES:
        base.action = "skipped_upload_in_flight"
        base.reason = f"Upload Status {status!r} is in-flight or uncertain."
        return base
    if status != UPLOAD_STATUS_UPLOADED:
        base.reason = f"Upload Status must be {UPLOAD_STATUS_UPLOADED!r}; got {status or '[blank]'!r}."
        return base

    if fields.get(FIELD_SEND_TO_MAKE_TRIGGER) is True:
        base.action = "skipped_upload_in_flight"
        base.reason = "Send to Make Trigger is checked — upload may be in flight."
        return base

    if not source_key or not is_path_safe_storage_key(source_key):
        base.action = "skipped_missing_source_key"
        base.reason = "Storage Key is missing or unsafe."
        return base

    custom_raw = normalize_custom_name(ctx.custom_video_file_name)
    if is_blank_custom_name(custom_raw):
        base.action = "skipped_blank_custom_name" if custom_raw in {"—", "-", "\u2014", "\u2013"} else "skipped_missing_custom_name"
        base.reason = "Custom Video File Name is blank or em dash placeholder."
        return base

    if not passes_coach_confirmation(coach_confirmed=ctx.coach_confirmed, confirm_flag=confirm_flag):
        base.action = "skipped_missing_confirmation"
        base.reason = (
            "Coach confirmation required — set Confirm S3 Video Rename on Video Feedback "
            "or pass --confirm-rename on CLI."
        )
        return base

    if not ctx.activity_date:
        base.action = "error_verify_failed"
        base.reason = "Activity Date is required on linked Submission."
        return base

    athlete_folder = folder_person_name(ctx.last_name, ctx.first_name)
    program_folder = folder_program_instance(ctx.program_instance_name)
    original_name = str(fields.get(FIELD_ORIGINAL_FILE_NAME) or "").strip() or "upload.bin"
    extension = extension_from_filename(original_name)

    destination_key = build_fut009_destination_key(
        Fut009DestinationInput(
            athlete_folder=athlete_folder,
            program_instance_folder=program_folder,
            activity_date=ctx.activity_date,
            last_name=ctx.last_name,
            first_name=ctx.first_name,
            custom_video_file_name=custom_raw,
            extension=extension,
            existing_basenames=ctx.existing_basenames,
        )
    )

    base.destination_key = destination_key
    base.custom_video_file_name = custom_raw

    if source_key == destination_key:
        base.action = "skipped_already_named"
        base.reason = "Storage Key already matches computed FUT-009 destination."
        return base

    source_basename = extract_basename_from_key(source_key).lower()
    dest_basename = extract_basename_from_key(destination_key).lower()
    if source_basename == dest_basename:
        base.action = "skipped_unchanged_custom_name"
        base.reason = "Custom name sanitizes to the same basename as current Storage Key."
        return base

    base.action = "dry_run_would_rename"
    base.should_copy = True
    base.reason = "Eligible for FUT-009 copy-on-write rename."
    return base


def build_rename_writeback_fields(
    *,
    destination_key: str,
    bucket: str,
    region: str,
    previous_storage_key: str,
    formatted_basename: str,
    include_audit_fields: bool = False,
) -> dict[str, Any]:
    """Fields to patch on Submission Asset after verified S3 copy."""
    fields: dict[str, Any] = {
        FIELD_STORAGE_KEY: destination_key,
        FIELD_CANONICAL_FILE_URL: canonical_url(bucket, region, destination_key),
        FIELD_FORMATTED_UPLOAD_NAME: formatted_basename,
        FIELD_UPLOAD_ERROR: None,
    }
    if include_audit_fields:
        fields[FIELD_PREVIOUS_STORAGE_KEY] = previous_storage_key
        fields[FIELD_RENAMED_AT] = datetime.now(DENVER).isoformat(timespec="milliseconds")
    return fields


def execute_s3_copy(
    *,
    s3_client: Any,
    bucket: str,
    source_key: str,
    destination_key: str,
) -> tuple[bool, str]:
    """CopyObject from source to destination; never deletes source."""
    if source_key == destination_key:
        return True, "Source and destination keys are identical."
    try:
        s3_client.copy_object(
            Bucket=bucket,
            CopySource={"Bucket": bucket, "Key": source_key},
            Key=destination_key,
            MetadataDirective="COPY",
        )
    except Exception as exc:  # noqa: BLE001 — surfaced to operator JSON
        return False, f"CopyObject failed: {exc}"
    return True, "CopyObject succeeded."


def verify_destination_object(
    *,
    s3_client: Any,
    bucket: str,
    destination_key: str,
    source_head: dict[str, Any] | None = None,
) -> tuple[bool, str]:
    """HeadObject on destination; optional size/etag compare with source."""
    try:
        dest_head = s3_client.head_object(Bucket=bucket, Key=destination_key)
    except Exception as exc:  # noqa: BLE001
        return False, f"HeadObject on destination failed: {exc}"

    if source_head:
        src_size = source_head.get("ContentLength")
        dst_size = dest_head.get("ContentLength")
        if src_size is not None and dst_size is not None and src_size != dst_size:
            return False, f"Destination size mismatch: source={src_size} dest={dst_size}"

    return True, "Destination object verified."


def process_video_rename(
    ctx: RenameContext,
    *,
    bucket: str,
    region: str,
    dry_run: bool = True,
    confirm_flag: bool = False,
    include_audit_fields: bool = False,
    s3_client: Any | None = None,
    head_source: Callable[[str], dict[str, Any] | None] | None = None,
    head_destination: Callable[[str], bool] | None = None,
    copy_object: Callable[[str, str], tuple[bool, str]] | None = None,
    patch_airtable: Callable[[dict[str, Any]], None] | None = None,
) -> RenameDecision:
    """Full rename sequence: validate → compute → copy → verify → writeback."""
    decision = evaluate_rename_eligibility(ctx, confirm_flag=confirm_flag)
    if not decision.should_copy:
        decision.log_line = (
            f"recordId={ctx.record_id} action={decision.action} reason={decision.reason}"
        )
        return decision

    source_key = decision.source_key
    destination_key = decision.destination_key
    formatted_basename = extract_basename_from_key(destination_key)

    if dry_run or not confirm_flag:
        decision.action = "dry_run_would_rename"
        decision.log_line = (
            f"recordId={ctx.record_id} action=dry_run_would_rename "
            f"sourceKey={source_key!r} destinationKey={destination_key!r}"
        )
        return decision

    # Idempotent recovery: destination exists, Airtable still on source key.
    dest_exists = head_destination(destination_key) if head_destination else False
    source_exists = head_destination(source_key) if head_destination else True

    if dest_exists and decision.source_key != destination_key:
        writeback = build_rename_writeback_fields(
            destination_key=destination_key,
            bucket=bucket,
            region=region,
            previous_storage_key=source_key,
            formatted_basename=formatted_basename,
            include_audit_fields=include_audit_fields,
        )
        if patch_airtable:
            try:
                patch_airtable(writeback)
            except Exception as exc:  # noqa: BLE001
                decision.action = "error_airtable_failed"
                decision.reason = f"Airtable recovery patch failed: {exc}"
                decision.log_line = f"recordId={ctx.record_id} action=error_airtable_failed"
                return decision
        decision.action = "airtable_only_recovery"
        decision.should_patch_airtable = True
        decision.writeback_fields = writeback
        decision.reason = "Destination object already exists — Airtable writeback only."
        decision.log_line = (
            f"recordId={ctx.record_id} action=airtable_only_recovery "
            f"destinationKey={destination_key!r}"
        )
        return decision

    if not source_exists:
        decision.action = "error_verify_failed"
        decision.reason = "Source S3 object missing at Storage Key."
        decision.log_line = f"recordId={ctx.record_id} action=error_verify_failed"
        return decision

    if dest_exists and not head_source:
        decision.action = "error_unexpected_destination"
        decision.reason = "Destination key already occupied by unexpected object."
        decision.log_line = f"recordId={ctx.record_id} action=error_unexpected_destination"
        return decision

    source_head = head_source(source_key) if head_source else None

    if copy_object:
        ok, msg = copy_object(source_key, destination_key)
    elif s3_client is not None:
        ok, msg = execute_s3_copy(
            s3_client=s3_client,
            bucket=bucket,
            source_key=source_key,
            destination_key=destination_key,
        )
    else:
        decision.action = "error_copy_failed"
        decision.reason = "No S3 client or copy_object hook provided."
        return decision

    if not ok:
        decision.action = "error_copy_failed"
        decision.reason = msg
        decision.log_line = f"recordId={ctx.record_id} action=error_copy_failed reason={msg}"
        return decision

    if s3_client is not None:
        verified, verify_msg = verify_destination_object(
            s3_client=s3_client,
            bucket=bucket,
            destination_key=destination_key,
            source_head=source_head,
        )
    elif head_destination:
        verified = head_destination(destination_key)
        verify_msg = "Destination HeadObject passed." if verified else "Destination missing after copy."
    else:
        verified = False
        verify_msg = "No verification hook provided."

    if not verified:
        decision.action = "error_verify_failed"
        decision.reason = verify_msg
        decision.log_line = f"recordId={ctx.record_id} action=error_verify_failed reason={verify_msg}"
        return decision

    writeback = build_rename_writeback_fields(
        destination_key=destination_key,
        bucket=bucket,
        region=region,
        previous_storage_key=source_key,
        formatted_basename=formatted_basename,
        include_audit_fields=include_audit_fields,
    )

    if patch_airtable:
        try:
            patch_airtable(writeback)
        except Exception as exc:  # noqa: BLE001
            decision.action = "error_airtable_failed"
            decision.reason = (
                f"Airtable patch failed after successful S3 copy — recover with retry "
                f"(destinationKey={destination_key!r}): {exc}"
            )
            decision.writeback_fields = writeback
            decision.log_line = f"recordId={ctx.record_id} action=error_airtable_failed"
            return decision

    decision.action = "renamed"
    decision.should_patch_airtable = True
    decision.writeback_fields = writeback
    decision.reason = "Rename complete; source object retained."
    decision.log_line = (
        f"recordId={ctx.record_id} action=renamed sourceKey={source_key!r} "
        f"destinationKey={destination_key!r} oldObjectRetained=true"
    )
    return decision
