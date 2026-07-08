"""AWS Lambda handler — 127si-dev-shooting-challenge-asset-upload."""

from __future__ import annotations

import json
import logging
import os

from upload_core.auth import verify_upload_secret
from upload_core.config import UploadConfig
from upload_core.processor import parse_payload, process_with_error_writeback

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

    payload = parse_payload(event_dict)
    status_code, body = process_with_error_writeback(config, payload)
    logger.info(
        json.dumps(
            {
                "submissionAssetRecordId": body.get("submissionAssetRecordId"),
                "statusOut": body.get("statusOut"),
                "actionOut": body.get("actionOut"),
                "allPass": (body.get("writebackVerification") or {}).get("allPass"),
            }
        )
    )
    return _json_response(status_code, body)
