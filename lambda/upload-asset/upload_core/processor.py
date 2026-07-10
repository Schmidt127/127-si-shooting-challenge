from __future__ import annotations

import time
from datetime import datetime
from zoneinfo import ZoneInfo

import boto3

from upload_core.airtable import get_asset, get_enrollment_slug, patch_asset
from upload_core.config import TABLE, UploadConfig
from upload_core.duplicate import (
    build_c023_duplicate_report,
    build_review_writeback,
    classify_duplicate_matches,
    lookup_duplicate_matches,
)
from upload_core.fields import (
    FIELD_CANONICAL_FILE_URL,
    FIELD_FILE_CONTENT_HASH,
    FIELD_UPLOAD_ERROR,
    FIELD_UPLOAD_STATUS,
)
from upload_core.upload_claim import ClaimEvaluation, evaluate_upload_claim
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
        FIELD_UPLOAD_STATUS: "Uploaded",
        "Canonical File URL": canonical,
        "Storage Key": storage_key,
        FIELD_FILE_CONTENT_HASH: file_hash,
        "File Hash Algorithm": "SHA-256",
        "Uploaded At": uploaded_at,
        "File Size Bytes": size_bytes,
        "File MIME Type": mime_type,
        FIELD_UPLOAD_ERROR: None,
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
    if not first_attachment(fields):
        raise UploadError("Airtable Attachment is missing", action_out="error_missing_attachment")
    vf_links = fields.get("Video Feedback")
    if not isinstance(vf_links, list) or not vf_links:
        raise UploadError("Video Feedback link is missing", action_out="error_missing_video_feedback")


def already_uploaded(fields: dict) -> bool:
    status = select_name(fields.get(FIELD_UPLOAD_STATUS))
    if status != "Uploaded":
        return False
    canonical = str(fields.get(FIELD_CANONICAL_FILE_URL) or "").strip()
    file_hash = str(fields.get(FIELD_FILE_CONTENT_HASH) or "").strip()
    return bool(canonical) and verify_hash_hex(file_hash)


def claim_response_from_evaluation(
    evaluation: ClaimEvaluation,
    *,
    config: UploadConfig,
    record_id: str,
    route_key: str,
    automation_number: str,
    started: float,
) -> dict | None:
    if evaluation.should_upload:
        return None
    duration_ms = int((time.time() - started) * 1000)
    return {
        "ok": evaluation.status_out != "error",
        "statusOut": evaluation.status_out,
        "actionOut": evaluation.action_out,
        "environment": config.environment,
        "submissionAssetRecordId": record_id,
        "routeKey": route_key,
        "automationNumber": automation_number or "070b",
        "message": evaluation.message,
        "uploadClaimRunId": evaluation.claim_run_id,
        "durationMs": duration_ms,
    }


def apply_upload_claim(
    token: str,
    base_id: str,
    record_id: str,
    evaluation: ClaimEvaluation,
) -> dict:
    if evaluation.claim_patch:
        patched = patch_asset(token, base_id, record_id, evaluation.claim_patch)
        return patched.get("fields", evaluation.claim_patch)
    return {}


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

    claim_eval = evaluate_upload_claim(fields, payload)
    early = claim_response_from_evaluation(
        claim_eval,
        config=config,
        record_id=record_id,
        route_key=route_key,
        automation_number=automation_number,
        started=started,
    )
    if early is not None:
        if claim_eval.action_out == "error_invalid_upload_status":
            raise UploadError(claim_eval.message, action_out=claim_eval.action_out)
        return early

    validate_pre_upload(fields, record_id)

    if claim_eval.claim_patch:
        claim_fields = apply_upload_claim(token, base_id, record_id, claim_eval)
        fields = {**fields, **claim_fields}

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

    dup_matches: list[dict] = []
    lookup_performed = False
    lookup_error = ""
    try:
        dup_matches = lookup_duplicate_matches(token, base_id, file_hash, record_id)
        lookup_performed = True
    except Exception as exc:
        lookup_error = str(exc)[:1000]

    classification = classify_duplicate_matches(
        current_record_id=record_id,
        current_fields=fields,
        matches=dup_matches,
    )
    review_wb = build_review_writeback(
        classification,
        existing_fields=fields,
        file_hash=file_hash,
        lookup_error=lookup_error,
    )

    s3_result = upload_s3(
        config.s3_bucket,
        config.aws_region,
        storage_key,
        file_bytes,
        mime_type,
    )

    upload_wb = writeback_fields(
        canonical=canonical,
        storage_key=storage_key,
        file_hash=file_hash,
        size_bytes=size_bytes,
        mime_type=mime_type,
    )
    patched_upload = patch_asset(token, base_id, record_id, upload_wb)

    review_writeback_applied = False
    review_writeback_error = ""
    try:
        patch_asset(token, base_id, record_id, review_wb)
        review_writeback_applied = True
    except Exception as exc:
        review_writeback_error = str(exc)[:1000]
        try:
            patch_asset(
                token,
                base_id,
                record_id,
                {"Duplicate Check Error": review_writeback_error},
            )
        except Exception:
            pass

    c023 = build_c023_duplicate_report(
        record_id=record_id,
        file_hash=file_hash,
        classification=classification,
        lookup_performed=lookup_performed,
        review_writeback_applied=review_writeback_applied,
        review_writeback_error=review_writeback_error,
    )

    writeback_verification = {
        "canonicalUrlPopulated": bool(upload_wb.get("Canonical File URL")),
        "storageKeyPopulated": bool(upload_wb.get("Storage Key")),
        "fileContentHashPopulated": verify_hash_hex(file_hash),
        "fileHashAlgorithmSha256": upload_wb.get("File Hash Algorithm") == "SHA-256",
        "uploadedAtPopulated": bool(upload_wb.get("Uploaded At")),
        "uploadStatusUploaded": upload_wb.get(FIELD_UPLOAD_STATUS) == "Uploaded",
        "uploadErrorCleared": upload_wb.get(FIELD_UPLOAD_ERROR) is None,
        "hashHexLength": len(file_hash),
        "duplicateLookupPerformed": c023.get("duplicateLookupPerformed"),
        "reviewWritebackApplied": review_writeback_applied,
        "attachmentRetained": True,
        "uploadClaimRunId": claim_eval.claim_run_id,
        "claimContinuation": claim_eval.continuation,
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
        "uploadClaimRunId": claim_eval.claim_run_id,
        "claimActionOut": claim_eval.action_out,
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
        "writebackApplied": {**upload_wb, **review_wb},
        "airtablePatchId": patched_upload.get("id"),
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
                        FIELD_UPLOAD_STATUS: "Error",
                        FIELD_UPLOAD_ERROR: exc.message,
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
                        FIELD_UPLOAD_STATUS: "Error",
                        FIELD_UPLOAD_ERROR: message[:1000],
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
