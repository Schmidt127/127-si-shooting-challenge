#!/usr/bin/env python3
"""Homework route processor tests (070a / homework_completion)."""

from __future__ import annotations

import sys
import unittest
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from upload_core.config import UploadConfig
from upload_core.duplicate import REASON_VF_FOR_HOMEWORK
from upload_core.fields import (
    FIELD_ASSET_REUSE_DECISION,
    FIELD_CANONICAL_FILE_URL,
    FIELD_FILE_CONTENT_HASH,
    FIELD_PROCESSING_STARTED_AT,
    FIELD_UPLOAD_CLAIM_RUN_ID,
    FIELD_UPLOAD_STATUS,
)
from upload_core.processor import UploadError, process_upload_asset, process_with_error_writeback
from upload_core.util import DENVER, sha256_hex

HASH = sha256_hex(b"test-bytes")
RECORD = "recHomeworkAsset01"
HW_FIELDS = {
    "Upload Destination": "Homework Completions",
    "Upload Status": "Pending Link",
    "Airtable Attachment": [{"url": "https://example.com/file.png", "filename": "hw.png"}],
    "Homework Completions": ["recHc1"],
    "Enrollment - Linked": ["recEnroll1"],
    "Original File Name": "hw.png",
    "Asset Type": "Homework Image",
}


def _config() -> UploadConfig:
    return UploadConfig(
        airtable_base_id="appTetnuCZlCZdTCT",
        airtable_token="pat-test",
        s3_bucket="shooting-challenge-assets",
        aws_region="us-east-2",
        environment="DEV",
        allow_route_keys=frozenset({"video_feedback", "homework_completion"}),
        season_slug="2026-2027",
        challenge_slug="shooting-challenge",
        athlete_slug_override="test-athlete",
        upload_webhook_secret=None,
    )


def _payload(**extra):
    base = {
        "submissionAssetRecordId": RECORD,
        "routeKey": "homework_completion",
        "automationNumber": "070a",
        "uploadDestination": "Homework Completions",
        "targetTable": "Homework Completions",
        "targetRecordId": "recHc1",
    }
    base.update(extra)
    return base


class HomeworkRouteTests(unittest.TestCase):
    def _run_upload(self, fields: dict, *, matches: list | None = None):
        matches = matches if matches is not None else []
        config = _config()

        def patch_impl(token, base_id, record_id, patch_fields):
            fields.update(patch_fields)
            return {"id": record_id, "fields": fields}

        with (
            patch("upload_core.processor.get_asset", return_value={"id": RECORD, "fields": dict(fields)}),
            patch("upload_core.processor.patch_asset", side_effect=patch_impl),
            patch("upload_core.processor.http_get_bytes", return_value=(b"test-bytes", "image/png")),
            patch("upload_core.processor.upload_s3", return_value={"bucket": "b", "region": "us-east-2", "etag": "x"}),
            patch("upload_core.processor.lookup_duplicate_matches", return_value=matches),
        ):
            return process_upload_asset(config, _payload())

    def test_valid_homework_upload(self):
        fields = dict(HW_FIELDS)
        result = self._run_upload(fields)
        self.assertEqual(result["actionOut"], "uploaded")
        self.assertEqual(result["routeKey"], "homework_completion")
        self.assertEqual(result["automationNumber"], "070a")
        self.assertEqual(fields[FIELD_UPLOAD_STATUS], "Uploaded")
        self.assertIn("homework", result["s3"]["storageKey"])

    def test_invalid_route_rejected(self):
        config = _config()
        fields = dict(HW_FIELDS)
        with (
            patch("upload_core.processor.get_asset", return_value={"id": RECORD, "fields": fields}),
            patch("upload_core.processor.patch_asset"),
        ):
            status, body = process_with_error_writeback(
                config,
                _payload(routeKey="video_feedback", automationNumber="070b"),
            )
        self.assertEqual(status, 400)
        self.assertEqual(body["actionOut"], "error_invalid_route")

    def test_homework_same_record_retry_skips_s3(self):
        fields = {
            **HW_FIELDS,
            FIELD_UPLOAD_STATUS: "Uploaded",
            FIELD_CANONICAL_FILE_URL: "https://example.com/hw",
            FIELD_FILE_CONTENT_HASH: HASH,
        }
        with patch("upload_core.processor.upload_s3") as mock_s3:
            result = self._run_upload(fields)
        self.assertEqual(result["actionOut"], "skipped_already_uploaded")
        mock_s3.assert_not_called()

    def test_video_feedback_reused_as_homework_reason(self):
        fields = dict(HW_FIELDS)
        result = self._run_upload(
            fields,
            matches=[
                {
                    "id": "recPriorVf",
                    "fields": {
                        "Enrollment - Linked": ["recEnroll1"],
                        "Asset Type": "Video Feedback",
                        "Asset Purpose": "Video Feedback",
                        "Upload Destination": "Video Feedback",
                        "Homework Completions": [],
                        "Video Feedback": ["recVf1"],
                        "Submission - Linked": ["recSub1"],
                        "Week": ["recWeek1"],
                        "Uploaded At": "2026-06-01T10:00:00.000-06:00",
                    },
                }
            ],
        )
        self.assertEqual(result["actionOut"], "uploaded")
        c023 = result["c023Duplicate"]
        self.assertTrue(c023["potentialAssetReuse"])
        self.assertIn(REASON_VF_FOR_HOMEWORK, c023["reviewReasons"])
        self.assertEqual(c023["primaryReason"], REASON_VF_FOR_HOMEWORK)

    def test_locked_decision_preserved_on_skip(self):
        fields = {
            **HW_FIELDS,
            FIELD_UPLOAD_STATUS: "Uploaded",
            FIELD_CANONICAL_FILE_URL: "https://example.com/hw",
            FIELD_FILE_CONTENT_HASH: HASH,
            FIELD_ASSET_REUSE_DECISION: "Allowed — Legitimate Reuse",
            "Asset Reuse Review Notes": "locked",
        }
        result = self._run_upload(fields)
        self.assertEqual(result["actionOut"], "skipped_already_uploaded")
        self.assertEqual(fields[FIELD_ASSET_REUSE_DECISION], "Allowed — Legitimate Reuse")

    def test_missing_homework_completion_link(self):
        config = _config()
        fields = {**HW_FIELDS, "Homework Completions": []}
        with (
            patch("upload_core.processor.get_asset", return_value={"id": RECORD, "fields": fields}),
            patch("upload_core.processor.patch_asset", side_effect=lambda *a, **k: {"id": RECORD, "fields": fields}),
        ):
            status, body = process_with_error_writeback(config, _payload())
        self.assertEqual(status, 400)
        self.assertEqual(body["actionOut"], "error_missing_homework_completion")

    def test_wrong_automation_number_rejected(self):
        config = _config()
        fields = dict(HW_FIELDS)
        with (
            patch("upload_core.processor.get_asset", return_value={"id": RECORD, "fields": fields}),
            patch("upload_core.processor.patch_asset"),
        ):
            status, body = process_with_error_writeback(config, _payload(automationNumber="070b"))
        self.assertEqual(status, 400)
        self.assertIn("automationNumber", body["errorOut"])


if __name__ == "__main__":
    unittest.main()
