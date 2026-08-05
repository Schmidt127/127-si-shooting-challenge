#!/usr/bin/env python3
"""Tests for secure private-file viewer route."""

from __future__ import annotations

import json
import logging
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from upload_core.config import UploadConfig
from upload_core.fields import (
    FIELD_FILE_MIME_TYPE,
    FIELD_ORIGINAL_FILE_NAME,
    FIELD_REVIEWER_ACCESS_TOKEN,
    FIELD_STORAGE_KEY,
    FIELD_UPLOAD_STATUS,
)
from upload_core.viewer import handle_viewer_request, is_viewer_path

RECORD = "recTestAsset12345"
TOKEN = "viewer-token-abcdefghijklmnopqrstuvwxyz0123"
STORAGE_KEY = "shooting-challenge/2025-2026/shooting-challenge/schmidt-testing/file.pdf"
PRESIGNED = (
    "https://shooting-challenge-assets.s3.us-east-2.amazonaws.com/"
    f"{STORAGE_KEY}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=abc"
)


def _config() -> UploadConfig:
    return UploadConfig(
        airtable_base_id="appn84sqPw03zEbTT",
        airtable_token="pat-test",
        s3_bucket="shooting-challenge-assets",
        aws_region="us-east-2",
        environment="PROD",
        allow_route_keys=frozenset({"homework_completion", "video_feedback"}),
        season_slug="2025-2026",
        challenge_slug="shooting-challenge",
        athlete_slug_override=None,
        upload_webhook_secret="upload-secret",
        viewer_presign_ttl_seconds=900,
    )


def _event(*, method="GET", path=None, token=TOKEN, query=None):
    path = path if path is not None else f"/file/{RECORD}"
    qs = query if query is not None else ({"token": token} if token is not None else None)
    return {
        "rawPath": path,
        "requestContext": {"http": {"method": method, "path": path}},
        "queryStringParameters": qs,
        "headers": {},
    }


def _asset_fields(**overrides):
    base = {
        FIELD_REVIEWER_ACCESS_TOKEN: TOKEN,
        FIELD_STORAGE_KEY: STORAGE_KEY,
        FIELD_UPLOAD_STATUS: "Uploaded",
        FIELD_FILE_MIME_TYPE: "application/pdf",
        FIELD_ORIGINAL_FILE_NAME: "quote.pdf",
    }
    base.update(overrides)
    return base


class ViewerTests(unittest.TestCase):
    def test_is_viewer_path(self):
        self.assertTrue(is_viewer_path(_event()))
        self.assertFalse(is_viewer_path({"rawPath": "/", "requestContext": {"http": {"method": "GET"}}}))

    def test_valid_token_redirects_to_presigned_s3(self):
        with (
            patch(
                "upload_core.viewer.get_asset",
                return_value={"id": RECORD, "fields": _asset_fields()},
            ),
            patch(
                "upload_core.viewer.generate_presigned_get_url",
                return_value=PRESIGNED,
            ) as presign,
        ):
            resp = handle_viewer_request(_event(), _config())
        self.assertEqual(resp["statusCode"], 302)
        self.assertEqual(resp["headers"]["Location"], PRESIGNED)
        self.assertIn("s3.us-east-2.amazonaws.com", resp["headers"]["Location"])
        self.assertIn("X-Amz-Signature", resp["headers"]["Location"])
        kwargs = presign.call_args.kwargs
        self.assertEqual(kwargs["storage_key"], STORAGE_KEY)
        self.assertEqual(kwargs["expires_in"], 900)

    def test_missing_token_rejected(self):
        resp = handle_viewer_request(_event(token=None, query={}), _config())
        self.assertEqual(resp["statusCode"], 401)

    def test_incorrect_token_rejected(self):
        with patch(
            "upload_core.viewer.get_asset",
            return_value={"id": RECORD, "fields": _asset_fields()},
        ):
            resp = handle_viewer_request(_event(token="wrong-token-abcdefghijklmnopqrstuvwxyz0123"), _config())
        self.assertEqual(resp["statusCode"], 403)

    def test_missing_asset_rejected(self):
        with patch("upload_core.viewer.get_asset", side_effect=RuntimeError("HTTP 404")):
            resp = handle_viewer_request(_event(), _config())
        self.assertEqual(resp["statusCode"], 404)

    def test_missing_storage_key_rejected(self):
        with patch(
            "upload_core.viewer.get_asset",
            return_value={"id": RECORD, "fields": _asset_fields(**{FIELD_STORAGE_KEY: ""})},
        ):
            resp = handle_viewer_request(_event(), _config())
        self.assertEqual(resp["statusCode"], 404)

    def test_non_uploaded_rejected(self):
        with patch(
            "upload_core.viewer.get_asset",
            return_value={"id": RECORD, "fields": _asset_fields(**{FIELD_UPLOAD_STATUS: "Processing"})},
        ):
            resp = handle_viewer_request(_event(), _config())
        self.assertEqual(resp["statusCode"], 404)

    def test_post_to_viewer_path_rejected(self):
        resp = handle_viewer_request(_event(method="POST"), _config())
        self.assertEqual(resp["statusCode"], 405)

    def test_malformed_record_id_rejected(self):
        resp = handle_viewer_request(_event(path="/file/not-a-record"), _config())
        self.assertEqual(resp["statusCode"], 400)

    def test_token_not_printed_in_logs(self):
        log = logging.getLogger("upload_core.viewer")
        with self.assertLogs(log, level="INFO") as captured:
            with (
                patch(
                    "upload_core.viewer.get_asset",
                    return_value={"id": RECORD, "fields": _asset_fields()},
                ),
                patch(
                    "upload_core.viewer.generate_presigned_get_url",
                    return_value=PRESIGNED,
                ),
            ):
                handle_viewer_request(_event(), _config())
        joined = "\n".join(captured.output)
        self.assertNotIn(TOKEN, joined)

    def test_handler_get_upload_root_is_405(self):
        from handler import lambda_handler

        env = {
            "AIRTABLE_BASE_ID": "appn84sqPw03zEbTT",
            "AIRTABLE_TOKEN": "pat-test",
            "UPLOAD_WEBHOOK_SECRET": "upload-secret",
            "ENVIRONMENT": "PROD",
            "ALLOW_ROUTE_KEYS": "video_feedback,homework_completion",
        }
        event = {
            "rawPath": "/",
            "requestContext": {"http": {"method": "GET", "path": "/"}},
            "headers": {},
        }
        with patch.dict(os.environ, env, clear=False):
            resp = lambda_handler(event, None)
        self.assertEqual(resp["statusCode"], 405)
        body = json.loads(resp["body"])
        self.assertEqual(body["actionOut"], "error_method_not_allowed")

    def test_handler_routes_viewer_without_upload_secret(self):
        from handler import lambda_handler

        env = {
            "AIRTABLE_BASE_ID": "appn84sqPw03zEbTT",
            "AIRTABLE_TOKEN": "pat-test",
            "UPLOAD_WEBHOOK_SECRET": "upload-secret",
            "ENVIRONMENT": "PROD",
            "ALLOW_ROUTE_KEYS": "video_feedback,homework_completion",
        }
        with (
            patch.dict(os.environ, env, clear=False),
            patch(
                "handler.handle_viewer_request",
                return_value={"statusCode": 302, "headers": {"Location": PRESIGNED}, "body": ""},
            ) as viewer,
        ):
            resp = lambda_handler(_event(), None)
        self.assertEqual(resp["statusCode"], 302)
        viewer.assert_called_once()

    def test_handler_post_viewer_path_405(self):
        from handler import lambda_handler

        env = {
            "AIRTABLE_BASE_ID": "appn84sqPw03zEbTT",
            "AIRTABLE_TOKEN": "pat-test",
            "UPLOAD_WEBHOOK_SECRET": "upload-secret",
            "ENVIRONMENT": "PROD",
            "ALLOW_ROUTE_KEYS": "video_feedback,homework_completion",
        }
        with patch.dict(os.environ, env, clear=False):
            resp = lambda_handler(_event(method="POST"), None)
        self.assertEqual(resp["statusCode"], 405)


if __name__ == "__main__":
    unittest.main()
