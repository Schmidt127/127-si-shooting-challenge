from __future__ import annotations

import time
from datetime import datetime
from zoneinfo import ZoneInfo

import boto3

from upload_core.airtable import get_asset, get_enrollment, get_program_instance, patch_asset
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
    FIELD_FILE_HASH_ALGORITHM,
    FIELD_FILE_MIME_TYPE,
    FIELD_FILE_SIZE_BYTES,
    FIELD_REVIEWER_ACCESS_TOKEN,
    FIELD_STORAGE_KEY,
    FIELD_UPLOAD_ERROR,
    FIELD_UPLOAD_STATUS,
    FIELD_UPLOADED_AT,
)
from upload_core.routes import resolve_upload_route
from upload_core.season import SeasonResolutionError, resolve_upload_season
from upload_core.storage_key import resolve_storage_key
from upload_core.token import resolve_reviewer_token
from upload_core.upload_claim import (
    STATUS_ERROR,
    STATUS_PROCESSING,
    ClaimEvaluation,
    evaluate_upload_claim,
)
from upload_core.util import (
    DENVER,
    canonical_url,
    first_attachment,
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
    reviewer_access_token: str,
) -> dict:
    uploaded_at = datetime.now(DENVER_TZ).isoformat(timespec="milliseconds")
    return {
        FIELD_UPLOAD_STATUS: "Uploaded",
        FIELD_CANONICAL_FILE_URL: canonical,
        FIELD_STORAGE_KEY: storage_key,
        FIELD_FILE_CONTENT_HASH: file_hash,
        FIELD_FILE_HASH_ALGORITHM: "SHA-256",
        FIELD_UPLOADED_AT: uploaded_at,
        FIELD_FILE_SIZE_BYTES: size_bytes,
        FIELD_FILE_MIME_TYPE: mime_type,
        FIELD_REVIEWER_ACCESS_TOKEN: reviewer_access_token,
        FIELD_UPLOAD_ERROR: None,
    }


def verify_uploaded_writeback(
    *,
    token: str,
    base_id: str,
    record_id: str,
    expected_storage_key: str,
    expected_canonical: str,
    expected_reviewer_token: str,
) -> dict:
    """Re-read Airtable and confirm Lambda-owned final upload state."""
    record = get_asset(token, base_id, record_id)
    fields = record.get("fields", {}) if isinstance(record, dict) else {}
    status = select_name(fields.get(FIELD_UPLOAD_STATUS))
    storage_key = str(fields.get(FIELD_STORAGE_KEY) or "").strip()
    canonical = str(fields.get(FIELD_CANONICAL_FILE_URL) or "").strip()
    reviewer_token = str(fields.get(FIELD_REVIEWER_ACCESS_TOKEN) or "").strip()

    checks = {
        "uploadStatusUploaded": status == "Uploaded",
        "storageKeyMatches": storage_key == expected_storage_key and bool(storage_key),
        "canonicalUrlMatches": canonical == expected_canonical and bool(canonical),
        "reviewerTokenPopulated": bool(reviewer_token)
        and reviewer_token == expected_reviewer_token,
        "notProcessing": status != "Processing",
        "notPendingLink": status != "Pending Link",
    }
    checks["allPass"] = all(checks.values())
    if not checks["allPass"]:
        raise UploadError(
            "Airtable writeback verification failed: record is not in final Uploaded state",
            status_code=500,
            action_out="error_writeback_verification",
        )
    return checks


def ensure_reviewer_token_on_existing_upload(
    *,
    token: str,
    base_id: str,
    record_id: str,
    fields: dict,
) -> tuple[str, bool]:
    """If already Uploaded but token blank, mint once and patch (idempotent)."""
    reviewer_token, created = resolve_reviewer_token(fields.get(FIELD_REVIEWER_ACCESS_TOKEN))
    if created:
        patched = patch_asset(
            token,
            base_id,
            record_id,
            {FIELD_REVIEWER_ACCESS_TOKEN: reviewer_token},
        )
        patched_fields = patched.get("fields", {})
        fields[FIELD_REVIEWER_ACCESS_TOKEN] = patched_fields.get(
            FIELD_REVIEWER_ACCESS_TOKEN, reviewer_token
        )
    return reviewer_token, created


def upload_s3(bucket: str, region: str, key: str, body: bytes, content_type: str) -> dict:
    client = boto3.client("s3", region_name=region)
    client.put_object(Bucket=bucket, Key=key, Body=body, ContentType=content_type)
    return {"bucket": bucket, "key": key, "region": region, "etag": "uploaded"}


def validate_pre_upload(fields: dict, record_id: str, route) -> None:
    destination = select_name(fields.get("Upload Destination"))
    if destination != route.upload_destination:
        raise UploadError(
            f'Upload Destination must be "{route.upload_destination}"; got "{destination or "[blank]"}"',
            action_out="error_unsupported_destination",
        )
    if not first_attachment(fields):
        raise UploadError("Airtable Attachment is missing", action_out="error_missing_attachment")
    links = fields.get(route.target_link_field)
    if not isinstance(links, list) or not links:
        label = route.target_link_field
        raise UploadError(f"{label} link is missing", action_out=route.missing_link_action)


def validate_automation_number(route, automation_number: str) -> None:
    if not automation_number:
        return
    if automation_number != route.automation_number:
        raise UploadError(
            f'automationNumber must be "{route.automation_number}" for route '
            f"{route.route_key!r}; got {automation_number!r}",
            status_code=400,
        )


def already_uploaded(fields: dict) -> bool:
    status = select_name(fields.get(FIELD_UPLOAD_STATUS))
    if status != "Uploaded":
        return False
    canonical = str(fields.get(FIELD_CANONICAL_FILE_URL) or "").strip()
    file_hash = str(fields.get(FIELD_FILE_CONTENT_HASH) or "").strip()
    return bool(canonical) and verify_hash_hex(file_hash)


def id_suffix(value: str, *, keep: int = 6) -> str:
    text = str(value or "").strip()
    if len(text) <= keep:
        return text
    return text[-keep:]


def build_upload_status_diagnostics(
    *,
    config: UploadConfig,
    record_id: str,
    fields: dict,
    source: str = "airtable_api",
) -> dict:
    """Safe diagnostics when Upload Status disagrees with an expected retry state."""
    return {
        "environment": config.environment,
        "baseIdSuffix": id_suffix(config.airtable_base_id),
        "table": TABLE,
        "tableSuffix": id_suffix(TABLE.replace(" ", "")),
        "submissionAssetRecordId": record_id,
        "uploadStatusField": FIELD_UPLOAD_STATUS,
        "uploadStatusNormalized": select_name(fields.get(FIELD_UPLOAD_STATUS)) or "[blank]",
        "uploadErrorPresent": bool(str(fields.get(FIELD_UPLOAD_ERROR) or "").strip()),
        "readSource": source,
        "readAtIso": datetime.now(DENVER_TZ).isoformat(timespec="milliseconds"),
    }


def claim_response_from_evaluation(
    evaluation: ClaimEvaluation,
    *,
    config: UploadConfig,
    record_id: str,
    route_key: str,
    automation_number: str,
    started: float,
    fields: dict | None = None,
) -> dict | None:
    if evaluation.should_upload:
        return None
    duration_ms = int((time.time() - started) * 1000)
    body = {
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
    if evaluation.action_out == "error_invalid_upload_status" and fields is not None:
        body["statusDiagnostics"] = build_upload_status_diagnostics(
            config=config,
            record_id=record_id,
            fields=fields,
            source="airtable_api",
        )
    return body


def classify_airtable_write_failure(exc: Exception) -> UploadError | None:
    message = str(exc)
    lowered = message.lower()
    if "unknown field name" in lowered or "UNKNOWN_FIELD_NAME" in message:
        missing = FIELD_CANONICAL_FILE_URL
        if FIELD_CANONICAL_FILE_URL.lower() in lowered:
            missing = FIELD_CANONICAL_FILE_URL
        return UploadError(
            f"Airtable writeback field missing or renamed ({missing}): {message[:400]}",
            status_code=500,
            action_out="error_missing_airtable_field",
        )
    return None


def safe_patch_asset(token: str, base_id: str, record_id: str, fields: dict) -> dict:
    try:
        return patch_asset(token, base_id, record_id, fields)
    except Exception as exc:
        mapped = classify_airtable_write_failure(exc)
        if mapped is not None:
            raise mapped from exc
        raise


def apply_upload_claim(
    token: str,
    base_id: str,
    record_id: str,
    evaluation: ClaimEvaluation,
) -> dict:
    if evaluation.claim_patch:
        patched = safe_patch_asset(token, base_id, record_id, evaluation.claim_patch)
        return patched.get("fields", evaluation.claim_patch)
    return {}


def write_failure_fields_without_clobbering_retry(
    *,
    token: str,
    base_id: str,
    record_id: str,
    error_message: str,
) -> dict:
    """
    Write Upload Error, and Upload Status=Error only when safe.

    Never overwrite Pending Link (manual retry arm) or Uploaded (success).
    A late failure writeback must not beat a concurrent Pending Link reset.
    """
    try:
        latest = get_asset(token, base_id, record_id)
        latest_fields = latest.get("fields", {}) if isinstance(latest, dict) else {}
    except Exception:
        latest_fields = {}

    status = select_name(latest_fields.get(FIELD_UPLOAD_STATUS))
    patch_fields: dict = {FIELD_UPLOAD_ERROR: error_message[:1000]}
    if status in ("", STATUS_PROCESSING, STATUS_ERROR):
        patch_fields[FIELD_UPLOAD_STATUS] = STATUS_ERROR
    # Pending Link / Uploaded / Ready / other: leave status alone; error text still recorded.
    try:
        return safe_patch_asset(token, base_id, record_id, patch_fields)
    except Exception:
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

    token = config.airtable_token
    base_id = config.airtable_base_id

    record = get_asset(token, base_id, record_id)
    fields = record.get("fields", {})

    try:
        route = resolve_upload_route(fields=fields, route_key=route_key)
    except ValueError as exc:
        raise UploadError(str(exc), status_code=400, action_out="error_invalid_route") from exc

    if route.route_key != route_key:
        raise UploadError(
            f"routeKey {route_key!r} does not match asset Upload Destination "
            f'"{select_name(fields.get("Upload Destination")) or "[blank]"}"',
            status_code=400,
            action_out="error_invalid_route",
        )

    validate_automation_number(route, automation_number)
    effective_automation = automation_number or route.automation_number

    if already_uploaded(fields):
        reviewer_token, token_created = ensure_reviewer_token_on_existing_upload(
            token=token,
            base_id=base_id,
            record_id=record_id,
            fields=fields,
        )
        duration_ms = int((time.time() - started) * 1000)
        return {
            "ok": True,
            "statusOut": "skipped",
            "actionOut": "skipped_already_uploaded",
            "environment": config.environment,
            "submissionAssetRecordId": record_id,
            "routeKey": route_key,
            "automationNumber": effective_automation,
            "message": "Asset already uploaded with canonical URL and hash.",
            "reviewerTokenPopulated": bool(reviewer_token),
            "reviewerTokenCreated": token_created,
            "durationMs": duration_ms,
        }

    claim_eval = evaluate_upload_claim(fields, payload)
    early = claim_response_from_evaluation(
        claim_eval,
        config=config,
        record_id=record_id,
        route_key=route_key,
        automation_number=effective_automation,
        started=started,
        fields=fields,
    )
    if early is not None:
        if claim_eval.action_out == "error_invalid_upload_status":
            raise UploadError(
                claim_eval.message,
                action_out=claim_eval.action_out,
            )
        return early

    validate_pre_upload(fields, record_id, route)

    try:
        season = resolve_upload_season(
            asset_fields=fields,
            payload=payload,
            config=config,
            get_enrollment=lambda enrollment_id: get_enrollment(token, base_id, enrollment_id),
            get_program_instance=lambda pi_id: get_program_instance(
                token, base_id, pi_id
            ),
        )
    except SeasonResolutionError as exc:
        raise UploadError(exc.message, status_code=400, action_out=exc.action_out) from exc

    if not season.athlete_folder or season.athlete_folder == "Unknown_Athlete":
        raise UploadError(
            "Athlete folder could not be derived from Enrollment names.",
            action_out="error_missing_athlete_name",
        )
    if (
        not season.program_instance_folder
        or season.program_instance_folder == "Unknown_Program_Instance"
    ):
        raise UploadError(
            "Program Instance folder could not be derived from Program Instance name.",
            action_out="error_missing_program_instance",
        )

    storage_key, reused_storage_key = resolve_storage_key(
        record_id=record_id,
        fields=fields,
        athlete_folder=season.athlete_folder,
        program_instance_folder=season.program_instance_folder,
    )
    persist_fields = dict(claim_eval.claim_patch or {})
    if not reused_storage_key:
        persist_fields[FIELD_STORAGE_KEY] = storage_key
    if persist_fields:
        patched_claim = safe_patch_asset(token, base_id, record_id, persist_fields)
        fields = {**fields, **patched_claim.get("fields", persist_fields)}
    fields[FIELD_STORAGE_KEY] = storage_key

    attachment = first_attachment(fields)
    assert attachment is not None

    original_name = (
        str(fields.get("Original File Name") or "").strip()
        or str(attachment.get("filename") or "").strip()
        or "upload.bin"
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

    # Re-read before final writeback so retries reuse an existing reviewer token.
    try:
        latest = get_asset(token, base_id, record_id)
        latest_fields = latest.get("fields", {}) if isinstance(latest, dict) else {}
        existing_token_source = latest_fields.get(FIELD_REVIEWER_ACCESS_TOKEN)
    except Exception:
        existing_token_source = fields.get(FIELD_REVIEWER_ACCESS_TOKEN)
    reviewer_token, reviewer_token_created = resolve_reviewer_token(existing_token_source)

    upload_wb = writeback_fields(
        canonical=canonical,
        storage_key=storage_key,
        file_hash=file_hash,
        size_bytes=size_bytes,
        mime_type=mime_type,
        reviewer_access_token=reviewer_token,
    )
    patched_upload = safe_patch_asset(token, base_id, record_id, upload_wb)

    readback_checks = verify_uploaded_writeback(
        token=token,
        base_id=base_id,
        record_id=record_id,
        expected_storage_key=storage_key,
        expected_canonical=canonical,
        expected_reviewer_token=reviewer_token,
    )

    review_writeback_applied = False
    review_writeback_error = ""
    try:
        safe_patch_asset(token, base_id, record_id, review_wb)
        review_writeback_applied = True
    except Exception as exc:
        review_writeback_error = str(exc)[:1000]
        try:
            safe_patch_asset(
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

    # Response must not include the raw reviewer token (Airtable holds it).
    writeback_for_response = {
        k: v for k, v in {**upload_wb, **review_wb}.items() if k != FIELD_REVIEWER_ACCESS_TOKEN
    }
    writeback_for_response["Reviewer Access Token Set"] = True

    writeback_verification = {
        "canonicalUrlPopulated": bool(upload_wb.get(FIELD_CANONICAL_FILE_URL)),
        "storageKeyPopulated": bool(upload_wb.get(FIELD_STORAGE_KEY)),
        "fileContentHashPopulated": verify_hash_hex(file_hash),
        "fileHashAlgorithmSha256": upload_wb.get(FIELD_FILE_HASH_ALGORITHM) == "SHA-256",
        "uploadedAtPopulated": bool(upload_wb.get(FIELD_UPLOADED_AT)),
        "uploadStatusUploaded": upload_wb.get(FIELD_UPLOAD_STATUS) == "Uploaded",
        "uploadErrorCleared": upload_wb.get(FIELD_UPLOAD_ERROR) is None,
        "reviewerTokenPopulated": bool(reviewer_token),
        "reviewerTokenCreated": reviewer_token_created,
        "readbackVerified": readback_checks.get("allPass") is True,
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
            "reviewerTokenPopulated",
            "readbackVerified",
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
        "automationNumber": effective_automation,
        "uploadClaimRunId": claim_eval.claim_run_id,
        "claimActionOut": claim_eval.action_out,
        "season": {
            "slug": season.season_slug,
            "source": season.source,
            "fallbackUsed": season.fallback_used,
            "programInstanceId": season.program_instance_id,
            "enrollmentId": season.enrollment_id,
            "athleteFolder": season.athlete_folder,
            "programInstanceFolder": season.program_instance_folder,
            "storageKeyReused": reused_storage_key,
        },
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
        "writebackApplied": writeback_for_response,
        "airtablePatchId": patched_upload.get("id"),
        "writebackVerification": writeback_verification,
        "durationMs": duration_ms,
    }


def _should_write_error_status(action_out: str) -> bool:
    # Do not overwrite a successful Uploaded writeback when only verification failed.
    # Do not re-stamp Error when rejecting an already-invalid starting status (keeps
    # Pending Link resets from racing with a redundant Error write).
    return action_out not in (
        "error_writeback_verification",
        "error_invalid_upload_status",
    )


def process_with_error_writeback(config: UploadConfig, payload: dict) -> tuple[int, dict]:
    record_id = str(payload.get("submissionAssetRecordId") or "").strip()
    try:
        result = process_upload_asset(config, payload)
        return 200, result
    except UploadError as exc:
        body = {
            "ok": False,
            "statusOut": "error",
            "actionOut": exc.action_out,
            "errorOut": exc.message,
            "environment": config.environment,
            "submissionAssetRecordId": record_id,
        }
        if (
            record_id.startswith("rec")
            and exc.action_out == "error_invalid_upload_status"
        ):
            try:
                latest = get_asset(config.airtable_token, config.airtable_base_id, record_id)
                latest_fields = latest.get("fields", {}) if isinstance(latest, dict) else {}
                body["statusDiagnostics"] = build_upload_status_diagnostics(
                    config=config,
                    record_id=record_id,
                    fields=latest_fields,
                    source="airtable_api",
                )
            except Exception:
                body["statusDiagnostics"] = {
                    "environment": config.environment,
                    "baseIdSuffix": id_suffix(config.airtable_base_id),
                    "table": TABLE,
                    "submissionAssetRecordId": record_id,
                    "uploadStatusField": FIELD_UPLOAD_STATUS,
                    "readSource": "airtable_api_failed",
                }
        if record_id.startswith("rec") and _should_write_error_status(exc.action_out):
            write_failure_fields_without_clobbering_retry(
                token=config.airtable_token,
                base_id=config.airtable_base_id,
                record_id=record_id,
                error_message=exc.message,
            )
        return exc.status_code, body
    except Exception as exc:
        message = str(exc)
        mapped = classify_airtable_write_failure(exc)
        if mapped is not None:
            if record_id.startswith("rec"):
                write_failure_fields_without_clobbering_retry(
                    token=config.airtable_token,
                    base_id=config.airtable_base_id,
                    record_id=record_id,
                    error_message=mapped.message,
                )
            return mapped.status_code, {
                "ok": False,
                "statusOut": "error",
                "actionOut": mapped.action_out,
                "errorOut": mapped.message,
                "environment": config.environment,
                "submissionAssetRecordId": record_id,
            }
        if record_id.startswith("rec"):
            write_failure_fields_without_clobbering_retry(
                token=config.airtable_token,
                base_id=config.airtable_base_id,
                record_id=record_id,
                error_message=message,
            )
        return 500, {
            "ok": False,
            "statusOut": "error",
            "actionOut": "error_internal",
            "errorOut": message,
            "environment": config.environment,
            "submissionAssetRecordId": record_id,
        }
