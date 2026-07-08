from __future__ import annotations

import time
from datetime import datetime
from zoneinfo import ZoneInfo

import boto3

from upload_core.airtable import get_asset, get_enrollment_slug, patch_asset
from upload_core.config import TABLE, UploadConfig
from upload_core.duplicate import (
    build_c023_duplicate_report,
    build_duplicate_writeback,
    lookup_duplicate_matches,
)
from upload_core.util import (
    DENVER,
    athlete_slug_from_asset,
    build_storage_key,
    canonical_url,
    first_attachment,
    first_link,
    guess_mime,
    http_get_bytes,
    select_name,
    sha256_hex,
    verify_hash_hex,
)

DENVER_TZ = DENVER


class UploadError(Exception):
    def __init__(self, message: str, *, status_code: int = 400, action_out: str = "error"):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.action_out = action_out


def parse_payload(event: dict) -> dict:
    if not isinstance(event, dict):
        raise UploadError("Event must be a JSON object", status_code=400)
    if "submissionAssetRecordId" in event:
        return event
    body = event.get("body")
    if isinstance(body, str):
        import json

        try:
            parsed = json.loads(body)
        except json.JSONDecodeError as exc:
            raise UploadError(f"Invalid JSON body: {exc}", status_code=400) from exc
        if isinstance(parsed, dict):
            return parsed
    if isinstance(body, dict):
        return body
    raise UploadError("Missing submissionAssetRecordId in event/body", status_code=400)


def writeback_fields(
    *,
    canonical: str,
    storage_key: str,
    file_hash: str,
    size_bytes: int,
    mime_type: str,
) -> dict:
    uploaded_at = datetime.now(DENVER_TZ).isoformat(timespec="milliseconds")
    return {
        "Upload Status": "Uploaded",
        "Canonical File URL": canonical,
        "Storage Key": storage_key,
        "File Content Hash": file_hash,
        "File Hash Algorithm": "SHA-256",
        "Uploaded At": uploaded_at,
        "File Size Bytes": size_bytes,
        "File MIME Type": mime_type,
        "Upload Error": None,
    }


def upload_s3(bucket: str, region: str, key: str, body: bytes, content_type: str) -> dict:
    client = boto3.client("s3", region_name=region)
    client.put_object(Bucket=bucket, Key=key, Body=body, ContentType=content_type)
    return {"bucket": bucket, "key": key, "region": region, "etag": "uploaded"}


def validate_pre_upload(fields: dict, record_id: str) -> None:
    destination = select_name(fields.get("Upload Destination"))
    if destination != "Video Feedback":
        raise UploadError(
            f'Upload Destination must be "Video Feedback"; got "{destination or "[blank]"}"',
            action_out="error_unsupported_destination",
        )
    status = select_name(fields.get("Upload Status"))
    if status != "Pending Link":
        raise UploadError(
            f'Upload Status must be "Pending Link"; got "{status or "[blank]"}"',
            action_out="error_invalid_upload_status",
        )
    if not first_attachment(fields):
        raise UploadError("Airtable Attachment is missing", action_out="error_missing_attachment")
    vf_links = fields.get("Video Feedback")
    if not isinstance(vf_links, list) or not vf_links:
        raise UploadError("Video Feedback link is missing", action_out="error_missing_video_feedback")


def already_uploaded(fields: dict) -> bool:
    status = select_name(fields.get("Upload Status"))
    if status != "Uploaded":
        return False
    canonical = str(fields.get("Canonical File URL") or "").strip()
    file_hash = str(fields.get("File Content Hash") or "").strip()
    return bool(canonical) and verify_hash_hex(file_hash)


def process_upload_asset(config: UploadConfig, payload: dict) -> dict:
    started = time.time()
    route_key = str(payload.get("routeKey") or "").strip()
    automation_number = str(payload.get("automationNumber") or "").strip()
    record_id = str(payload.get("submissionAssetRecordId") or "").strip()

    if not record_id.startswith("rec"):
        raise UploadError("submissionAssetRecordId must start with rec", status_code=400)
    if route_key not in config.allow_route_keys:
        raise UploadError(
            f"routeKey {route_key!r} not allowed (ALLOW_ROUTE_KEYS={sorted(config.allow_route_keys)})",
            status_code=400,
            action_out="error_invalid_route",
        )
    if automation_number and automation_number != "070b":
        raise UploadError(
            f'automationNumber must be "070b" for this slice; got {automation_number!r}',
            status_code=400,
        )

    token = config.airtable_token
    base_id = config.airtable_base_id

    record = get_asset(token, base_id, record_id)
    fields = record.get("fields", {})

    if already_uploaded(fields):
        duration_ms = int((time.time() - started) * 1000)
        return {
            "ok": True,
            "statusOut": "skipped",
            "actionOut": "skipped_already_uploaded",
            "environment": config.environment,
            "submissionAssetRecordId": record_id,
            "routeKey": route_key,
            "automationNumber": automation_number or "070b",
            "message": "Asset already uploaded with canonical URL and hash.",
            "durationMs": duration_ms,
        }

    validate_pre_upload(fields, record_id)

    attachment = first_attachment(fields)
    assert attachment is not None

    enrollment_id = first_link(fields, "Enrollment - Linked")
    if config.athlete_slug_override:
        athlete_slug = config.athlete_slug_override
    else:
        athlete_slug = athlete_slug_from_asset(fields)
        if not athlete_slug and enrollment_id:
            athlete_slug = get_enrollment_slug(token, base_id, enrollment_id)
        if not athlete_slug:
            athlete_slug = "unknown-athlete"

    original_name = (
        str(fields.get("Original File Name") or "").strip()
        or str(attachment.get("filename") or "").strip()
        or "upload.bin"
    )
    date_str = datetime.now(DENVER_TZ).strftime("%Y-%m-%d")
    storage_key = build_storage_key(
        record_id=record_id,
        fields=fields,
        athlete_slug=athlete_slug,
        season_slug=config.season_slug,
        challenge_slug=config.challenge_slug,
        date_str=date_str,
        filename=original_name,
    )
    canonical = canonical_url(config.s3_bucket, config.aws_region, storage_key)

    file_bytes, header_mime = http_get_bytes(attachment["url"])
    mime_type = guess_mime(original_name, header_mime)
    file_hash = sha256_hex(file_bytes)
    size_bytes = len(file_bytes)

    dup_matches = lookup_duplicate_matches(token, base_id, file_hash, record_id)
    dup_fields, dup_decision = build_duplicate_writeback(
        dup_matches,
        file_hash=file_hash,
        write_to_airtable=True,
    )
    c023 = build_c023_duplicate_report(
        record_id=record_id,
        file_hash=file_hash,
        matches=dup_matches,
        decision=dup_decision,
        lookup_performed=True,
    )

    s3_result = upload_s3(
        config.s3_bucket,
        config.aws_region,
        storage_key,
        file_bytes,
        mime_type,
    )

    wb = writeback_fields(
        canonical=canonical,
        storage_key=storage_key,
        file_hash=file_hash,
        size_bytes=size_bytes,
        mime_type=mime_type,
    )
    wb_full = {**wb, **dup_fields}
    patched = patch_asset(token, base_id, record_id, wb_full)

    writeback_verification = {
        "canonicalUrlPopulated": bool(wb.get("Canonical File URL")),
        "storageKeyPopulated": bool(wb.get("Storage Key")),
        "fileContentHashPopulated": verify_hash_hex(file_hash),
        "fileHashAlgorithmSha256": wb.get("File Hash Algorithm") == "SHA-256",
        "uploadedAtPopulated": bool(wb.get("Uploaded At")),
        "uploadStatusUploaded": wb.get("Upload Status") == "Uploaded",
        "uploadErrorCleared": wb.get("Upload Error") is None,
        "hashHexLength": len(file_hash),
        "duplicateLookupPerformed": c023.get("duplicateLookupPerformed"),
        "duplicateBehaviorDecision": c023.get("duplicateBehaviorDecision"),
        "attachmentRetained": True,
    }
    writeback_verification["allPass"] = all(
        writeback_verification[k]
        for k in (
            "canonicalUrlPopulated",
            "storageKeyPopulated",
            "fileContentHashPopulated",
            "fileHashAlgorithmSha256",
            "uploadedAtPopulated",
            "uploadStatusUploaded",
            "uploadErrorCleared",
            "duplicateLookupPerformed",
        )
    )

    duration_ms = int((time.time() - started) * 1000)
    return {
        "ok": True,
        "statusOut": "success",
        "actionOut": "uploaded",
        "runtime": "lambda",
        "environment": config.environment,
        "baseId": base_id,
        "table": TABLE,
        "submissionAssetRecordId": record_id,
        "targetRecordId": payload.get("targetRecordId"),
        "routeKey": route_key,
        "automationNumber": automation_number or "070b",
        "s3": {
            "bucket": s3_result["bucket"],
            "region": s3_result["region"],
            "storageKey": storage_key,
            "canonicalFileUrl": canonical,
        },
        "hash": {
            "algorithm": "SHA-256",
            "hex": file_hash,
            "valid64CharHex": verify_hash_hex(file_hash),
        },
        "c023Duplicate": c023,
        "writebackApplied": wb_full,
        "airtablePatchId": patched.get("id"),
        "writebackVerification": writeback_verification,
        "durationMs": duration_ms,
    }


def process_with_error_writeback(config: UploadConfig, payload: dict) -> tuple[int, dict]:
    record_id = str(payload.get("submissionAssetRecordId") or "").strip()
    try:
        result = process_upload_asset(config, payload)
        return 200, result
    except UploadError as exc:
        if record_id.startswith("rec"):
            try:
                patch_asset(
                    config.airtable_token,
                    config.airtable_base_id,
                    record_id,
                    {
                        "Upload Status": "Error",
                        "Upload Error": exc.message,
                    },
                )
            except Exception:
                pass
        return exc.status_code, {
            "ok": False,
            "statusOut": "error",
            "actionOut": exc.action_out,
            "errorOut": exc.message,
            "submissionAssetRecordId": record_id,
        }
    except Exception as exc:
        message = str(exc)
        if record_id.startswith("rec"):
            try:
                patch_asset(
                    config.airtable_token,
                    config.airtable_base_id,
                    record_id,
                    {
                        "Upload Status": "Error",
                        "Upload Error": message[:1000],
                    },
                )
            except Exception:
                pass
        return 500, {
            "ok": False,
            "statusOut": "error",
            "actionOut": "error_internal",
            "errorOut": message,
            "submissionAssetRecordId": record_id,
        }
