"""AWS Lambda handler — 127si-dev-shooting-challenge-asset-upload."""

from __future__ import annotations

import json
import logging
import os

from upload_core.config import UploadConfig
from upload_core.processor import parse_payload, process_with_error_writeback

logger = logging.getLogger()
logger.setLevel(os.getenv("LOG_LEVEL", "INFO"))


def lambda_handler(event, context):
    config = UploadConfig.from_env()
    payload = parse_payload(event if isinstance(event, dict) else {})
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
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
    }
