"""AWS Lambda handler — 127si-upload-asset (upload POST + private file viewer GET)."""

from __future__ import annotations

import json
import logging
import os

from upload_core.auth import verify_upload_secret
from upload_core.config import UploadConfig
from upload_core.processor import parse_payload, process_with_error_writeback
from upload_core.viewer import get_http_method, handle_viewer_request, is_viewer_path

logger = logging.getLogger()
logger.setLevel(os.getenv("LOG_LEVEL", "INFO"))


def _json_response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
    }


def lambda_handler(event, context):
    event_dict = event if isinstance(event, dict) else {}

    try:
        config = UploadConfig.from_env()
    except ValueError as exc:
        body = {
            "ok": False,
            "statusOut": "error",
            "actionOut": "error_config",
            "errorOut": str(exc),
        }
        logger.warning(json.dumps({"statusOut": "error", "actionOut": "error_config"}))
        return _json_response(500, body)

    # Secure viewer: GET /file/{recordId}?token=… (token auth; no X-Upload-Secret)
    if is_viewer_path(event_dict):
        method = get_http_method(event_dict)
        if method and method != "GET":
            return _json_response(405, {"ok": False, "error": "Method not allowed"})
        return handle_viewer_request(event_dict, config)

    method = get_http_method(event_dict)
    if method == "GET":
        return _json_response(
            405,
            {
                "ok": False,
                "statusOut": "error",
                "actionOut": "error_method_not_allowed",
                "errorOut": "Upload endpoint accepts POST only",
            },
        )

    auth_failure = verify_upload_secret(event_dict, config)
    if auth_failure is not None:
        status_code, body = auth_failure
        logger.warning(
            json.dumps(
                {
                    "statusOut": body.get("statusOut"),
                    "actionOut": body.get("actionOut"),
                }
            )
        )
        return _json_response(status_code, body)

    try:
        payload = parse_payload(event_dict)
    except Exception as exc:
        from upload_core.processor import UploadError

        if isinstance(exc, UploadError):
            return _json_response(
                exc.status_code,
                {
                    "ok": False,
                    "statusOut": "error",
                    "actionOut": exc.action_out,
                    "errorOut": exc.message,
                },
            )
        raise

    status_code, body = process_with_error_writeback(config, payload)
    logger.info(
        json.dumps(
            {
                "submissionAssetRecordId": body.get("submissionAssetRecordId"),
                "statusOut": body.get("statusOut"),
                "actionOut": body.get("actionOut"),
                "allPass": (body.get("writebackVerification") or {}).get("allPass"),
                "reviewerTokenPopulated": (body.get("writebackVerification") or {}).get(
                    "reviewerTokenPopulated"
                ),
            }
        )
    )
    return _json_response(status_code, body)
