from __future__ import annotations

import hmac
from typing import Any

from upload_core.config import UploadConfig

UNAUTHORIZED_ACTION = "error_unauthorized"


def unauthorized_body(message: str = "Unauthorized") -> dict[str, Any]:
    return {
        "ok": False,
        "statusOut": "error",
        "actionOut": UNAUTHORIZED_ACTION,
        "errorOut": message,
    }


def get_header(event: dict, name: str) -> str | None:
    """Read a request header case-insensitively (API Gateway / Function URL shape)."""
    headers = event.get("headers")
    if not isinstance(headers, dict):
        return None
    target = name.lower()
    for key, value in headers.items():
        if str(key).lower() == target:
            if value is None:
                return None
            text = str(value).strip()
            return text or None
    return None


def verify_upload_secret(event: dict, config: UploadConfig) -> tuple[int, dict] | None:
    """
    Validate X-Upload-Secret against UPLOAD_WEBHOOK_SECRET.
    Returns (status_code, body) on failure, or None when authorized.
    Does not touch Airtable.
    """
    expected = config.upload_webhook_secret
    if not expected:
        return 401, unauthorized_body("UPLOAD_WEBHOOK_SECRET is not configured")

    provided = get_header(event, "X-Upload-Secret")
    if not provided:
        return 401, unauthorized_body("Missing X-Upload-Secret header")

    if not hmac.compare_digest(provided, expected):
        return 401, unauthorized_body("Invalid X-Upload-Secret")

    return None
