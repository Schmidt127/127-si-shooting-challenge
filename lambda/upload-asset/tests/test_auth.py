#!/usr/bin/env python3
"""Tests for X-Upload-Secret validation and handler auth gate."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from upload_core.auth import get_header, verify_upload_secret
from upload_core.config import UploadConfig

TEST_SECRET = "test-upload-secret-do-not-commit"


def _config(secret: str | None = TEST_SECRET) -> UploadConfig:
    return UploadConfig(
        airtable_base_id="appTetnuCZlCZdTCT",
        airtable_token="pat-test",
        s3_bucket="shooting-challenge-assets",
        aws_region="us-east-2",
        environment="DEV",
        allow_route_keys=frozenset({"video_feedback"}),
        season_slug="2026-2027",
        challenge_slug="shooting-challenge",
        athlete_slug_override=None,
        upload_webhook_secret=secret,
    )


def test_get_header_case_insensitive():
    event = {"headers": {"x-upload-secret": "abc", "Content-Type": "application/json"}}
    assert get_header(event, "X-Upload-Secret") == "abc"
    assert get_header(event, "content-type") == "application/json"
    assert get_header(event, "missing") is None


def test_missing_env_secret_returns_401():
    status, body = verify_upload_secret({"headers": {}}, _config(secret=None))
    assert status == 401
    assert body["actionOut"] == "error_unauthorized"
    assert body["ok"] is False


def test_missing_header_returns_401():
    status, body = verify_upload_secret({"headers": {}}, _config())
    assert status == 401
    assert body["actionOut"] == "error_unauthorized"
    assert "Missing" in body["errorOut"]


def test_wrong_secret_returns_401():
    event = {"headers": {"X-Upload-Secret": "wrong-value"}}
    status, body = verify_upload_secret(event, _config())
    assert status == 401
    assert body["actionOut"] == "error_unauthorized"
    assert "Invalid" in body["errorOut"]


def test_correct_secret_authorized():
    event = {"headers": {"x-upload-secret": TEST_SECRET}}
    assert verify_upload_secret(event, _config()) is None


def test_handler_unauthorized_does_not_process():
    from handler import lambda_handler

    env = {
        "AIRTABLE_BASE_ID": "appTetnuCZlCZdTCT",
        "AIRTABLE_TOKEN": "pat-test",
        "UPLOAD_WEBHOOK_SECRET": TEST_SECRET,
        "ENVIRONMENT": "DEV",
        "ALLOW_ROUTE_KEYS": "video_feedback",
    }
    event = {
        "headers": {"content-type": "application/json"},
        "body": json.dumps({"submissionAssetRecordId": "recTest123456789", "routeKey": "video_feedback"}),
    }
    with mock.patch.dict(os.environ, env, clear=False):
        with mock.patch("handler.process_with_error_writeback") as proc:
            resp = lambda_handler(event, None)
    assert resp["statusCode"] == 401
    body = json.loads(resp["body"])
    assert body["actionOut"] == "error_unauthorized"
    proc.assert_not_called()


def test_handler_authorized_calls_processor():
    from handler import lambda_handler

    env = {
        "AIRTABLE_BASE_ID": "appTetnuCZlCZdTCT",
        "AIRTABLE_TOKEN": "pat-test",
        "UPLOAD_WEBHOOK_SECRET": TEST_SECRET,
        "ENVIRONMENT": "DEV",
        "ALLOW_ROUTE_KEYS": "video_feedback",
    }
    payload = {"submissionAssetRecordId": "recTest123456789", "routeKey": "video_feedback"}
    event = {
        "headers": {"X-Upload-Secret": TEST_SECRET},
        "body": json.dumps(payload),
    }
    ok_body = {"ok": True, "statusOut": "success", "actionOut": "uploaded"}
    with mock.patch.dict(os.environ, env, clear=False):
        with mock.patch("handler.process_with_error_writeback", return_value=(200, ok_body)) as proc:
            resp = lambda_handler(event, None)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body["actionOut"] == "uploaded"
    proc.assert_called_once()


if __name__ == "__main__":
    test_get_header_case_insensitive()
    test_missing_env_secret_returns_401()
    test_missing_header_returns_401()
    test_wrong_secret_returns_401()
    test_correct_secret_authorized()
    test_handler_unauthorized_does_not_process()
    test_handler_authorized_calls_processor()
    print("OK — auth tests passed")
