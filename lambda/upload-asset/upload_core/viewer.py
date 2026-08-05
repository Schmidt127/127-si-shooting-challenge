"""Secure private-file viewer: GET /file/{recordId}?token=… → S3 presigned redirect."""

from __future__ import annotations

import json
import logging
import re
from typing import Any
from urllib.parse import unquote_plus

import boto3

from upload_core.airtable import get_asset
from upload_core.config import UploadConfig
from upload_core.fields import (
    FIELD_FILE_MIME_TYPE,
    FIELD_ORIGINAL_FILE_NAME,
    FIELD_REVIEWER_ACCESS_TOKEN,
    FIELD_STORAGE_KEY,
    FIELD_UPLOAD_STATUS,
)
from upload_core.token import tokens_equal
from upload_core.util import select_name

logger = logging.getLogger(__name__)

RECORD_ID_RE = re.compile(r"^rec[a-zA-Z0-9]{14,}$")
FILE_PATH_RE = re.compile(r"^/file/(rec[a-zA-Z0-9]+)/?$")
DEFAULT_PRESIGN_TTL_SECONDS = 900  # 15 minutes


def get_http_method(event: dict) -> str:
    rc = event.get("requestContext")
    if isinstance(rc, dict):
        http = rc.get("http")
        if isinstance(http, dict) and http.get("method"):
            return str(http["method"]).upper()
    method = event.get("httpMethod") or event.get("requestContext", {}).get("httpMethod")
    if method:
        return str(method).upper()
    return ""


def get_raw_path(event: dict) -> str:
    path = event.get("rawPath") or event.get("path") or ""
    if not path:
        rc = event.get("requestContext")
        if isinstance(rc, dict):
            http = rc.get("http")
            if isinstance(http, dict):
                path = http.get("path") or ""
    return str(path or "")


def parse_file_record_id(path: str) -> str | None:
    match = FILE_PATH_RE.match(path.strip())
    if not match:
        return None
    return match.group(1)


def is_viewer_path(event: dict) -> bool:
    return parse_file_record_id(get_raw_path(event)) is not None


def get_query_param(event: dict, name: str) -> str | None:
    params = event.get("queryStringParameters")
    if isinstance(params, dict) and params.get(name) is not None:
        value = str(params.get(name) or "").strip()
        return unquote_plus(value) if value else None
    multi = event.get("multiValueQueryStringParameters")
    if isinstance(multi, dict):
        values = multi.get(name)
        if isinstance(values, list) and values:
            value = str(values[0] or "").strip()
            return unquote_plus(value) if value else None
    return None


def _json_response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
    }


def _redirect(url: str) -> dict:
    return {
        "statusCode": 302,
        "headers": {
            "Location": url,
            "Cache-Control": "no-store",
        },
        "body": "",
    }


def _safe_content_disposition(filename: str) -> str:
    safe = re.sub(r'["\\\r\n]', "", filename or "").strip() or "file"
    return f'inline; filename="{safe}"'


def generate_presigned_get_url(
    *,
    bucket: str,
    region: str,
    storage_key: str,
    expires_in: int,
    mime_type: str | None = None,
    filename: str | None = None,
) -> str:
    client = boto3.client("s3", region_name=region)
    params: dict[str, Any] = {"Bucket": bucket, "Key": storage_key}
    if mime_type:
        params["ResponseContentType"] = mime_type
    if filename:
        params["ResponseContentDisposition"] = _safe_content_disposition(filename)
    return client.generate_presigned_url(
        "get_object",
        Params=params,
        ExpiresIn=expires_in,
    )


def handle_viewer_request(event: dict, config: UploadConfig) -> dict:
    method = get_http_method(event)
    if method and method != "GET":
        return _json_response(
            405,
            {"ok": False, "error": "Method not allowed"},
        )

    path = get_raw_path(event)
    record_id = parse_file_record_id(path)
    if not record_id:
        return _json_response(400, {"ok": False, "error": "Malformed viewer path"})
    if not RECORD_ID_RE.match(record_id):
        return _json_response(400, {"ok": False, "error": "Malformed record id"})

    provided_token = get_query_param(event, "token")
    if not provided_token:
        return _json_response(401, {"ok": False, "error": "Missing token"})

    try:
        record = get_asset(config.airtable_token, config.airtable_base_id, record_id)
    except Exception:
        logger.info(
            json.dumps(
                {
                    "viewer": True,
                    "outcome": "asset_unavailable",
                    "submissionAssetRecordId": record_id,
                }
            )
        )
        return _json_response(404, {"ok": False, "error": "Not found"})

    fields = record.get("fields") if isinstance(record, dict) else None
    if not isinstance(fields, dict):
        return _json_response(404, {"ok": False, "error": "Not found"})

    stored_token = str(fields.get(FIELD_REVIEWER_ACCESS_TOKEN) or "").strip()
    if not tokens_equal(provided_token, stored_token):
        logger.info(
            json.dumps(
                {
                    "viewer": True,
                    "outcome": "token_rejected",
                    "submissionAssetRecordId": record_id,
                }
            )
        )
        return _json_response(403, {"ok": False, "error": "Forbidden"})

    storage_key = str(fields.get(FIELD_STORAGE_KEY) or "").strip()
    upload_status = select_name(fields.get(FIELD_UPLOAD_STATUS))
    if not storage_key or upload_status != "Uploaded":
        logger.info(
            json.dumps(
                {
                    "viewer": True,
                    "outcome": "asset_not_ready",
                    "submissionAssetRecordId": record_id,
                    "uploadStatus": upload_status or None,
                    "hasStorageKey": bool(storage_key),
                }
            )
        )
        return _json_response(404, {"ok": False, "error": "Not found"})

    mime_type = str(fields.get(FIELD_FILE_MIME_TYPE) or "").strip() or None
    filename = str(fields.get(FIELD_ORIGINAL_FILE_NAME) or "").strip() or None
    expires_in = config.viewer_presign_ttl_seconds

    try:
        url = generate_presigned_get_url(
            bucket=config.s3_bucket,
            region=config.aws_region,
            storage_key=storage_key,
            expires_in=expires_in,
            mime_type=mime_type,
            filename=filename,
        )
    except Exception:
        logger.exception(
            json.dumps(
                {
                    "viewer": True,
                    "outcome": "presign_failed",
                    "submissionAssetRecordId": record_id,
                }
            )
        )
        return _json_response(500, {"ok": False, "error": "Internal error"})

    logger.info(
        json.dumps(
            {
                "viewer": True,
                "outcome": "redirect",
                "submissionAssetRecordId": record_id,
                "expiresIn": expires_in,
            }
        )
    )
    return _redirect(url)
