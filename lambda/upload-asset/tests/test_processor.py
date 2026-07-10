#!/usr/bin/env python3
"""Processor integration tests with mocks (no AWS/Airtable runtime)."""

from __future__ import annotations

import sys
import unittest
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import MagicMock, patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from upload_core.config import UploadConfig
from upload_core.fields import (
    FIELD_ASSET_REUSE_DECISION,
    FIELD_CANONICAL_FILE_URL,
    FIELD_FILE_CONTENT_HASH,
    FIELD_PROCESSING_STARTED_AT,
    FIELD_UPLOAD_CLAIM_RUN_ID,
    FIELD_UPLOAD_STATUS,
)
from upload_core.processor import process_upload_asset
from upload_core.util import DENVER, sha256_hex

HASH = sha256_hex(b"test-bytes")
RECORD = "recTestAsset12345"
BASE_FIELDS = {
    "Upload Destination": "Video Feedback",
    "Upload Status": "Pending Link",
    "Airtable Attachment": [{"url": "https://example.com/file.png", "filename": "file.png"}],
    "Video Feedback": ["recVf1"],
    "Enrollment - Linked": ["recEnroll1"],
    "Original File Name": "file.png",
}


def _config() -> UploadConfig:
    return UploadConfig(
        airtable_base_id="appTetnuCZlCZdTCT",
        airtable_token="pat-test",
        s3_bucket="shooting-challenge-assets",
        aws_region="us-east-2",
        environment="DEV",
        allow_route_keys=frozenset({"video_feedback"}),
        season_slug="2026-2027",
        challenge_slug="shooting-challenge",
        athlete_slug_override="test-athlete",
        upload_webhook_secret=None,
    )


def _payload(**extra):
    base = {
        "submissionAssetRecordId": RECORD,
        "routeKey": "video_feedback",
        "automationNumber": "070b",
    }
    base.update(extra)
    return base


class ProcessorTests(unittest.TestCase):
    def _run_upload(self, fields: dict, *, matches: list | None = None, patch_side_effect=None):
        matches = matches if matches is not None else []
        config = _config()

        def patch_impl(token, base_id, record_id, patch_fields):
            if patch_side_effect:
                patch_side_effect(token, base_id, record_id, patch_fields)
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

    def test_pending_link_claim_then_upload(self):
        fields = dict(BASE_FIELDS)
        result = self._run_upload(fields)
        self.assertEqual(result["actionOut"], "uploaded")
        self.assertEqual(result["claimActionOut"], "claim_acquired")
        self.assertEqual(fields[FIELD_UPLOAD_STATUS], "Uploaded")
        self.assertTrue(fields[FIELD_UPLOAD_CLAIM_RUN_ID])
        self.assertTrue(fields[FIELD_PROCESSING_STARTED_AT])

    def test_already_uploaded_skips_without_s3(self):
        fields = {
            **BASE_FIELDS,
            FIELD_UPLOAD_STATUS: "Uploaded",
            FIELD_CANONICAL_FILE_URL: "https://example.com/x",
            FIELD_FILE_CONTENT_HASH: HASH,
        }
        with patch("upload_core.processor.upload_s3") as mock_s3:
            result = self._run_upload(fields)
        self.assertEqual(result["actionOut"], "skipped_already_uploaded")
        mock_s3.assert_not_called()

    def test_concurrent_worker_skips_s3(self):
        started = (datetime.now(DENVER) - timedelta(minutes=2)).isoformat(timespec="milliseconds")
        fields = {
            **BASE_FIELDS,
            FIELD_UPLOAD_STATUS: "Processing",
            FIELD_UPLOAD_CLAIM_RUN_ID: "owner-claim",
            FIELD_PROCESSING_STARTED_AT: started,
        }
        with patch("upload_core.processor.upload_s3") as mock_s3:
            config = _config()
            with (
                patch("upload_core.processor.get_asset", return_value={"id": RECORD, "fields": dict(fields)}),
                patch("upload_core.processor.patch_asset"),
            ):
                result = process_upload_asset(config, _payload(uploadClaimRunId="other-claim"))
        self.assertEqual(result["actionOut"], "skipped_concurrent_upload")
        mock_s3.assert_not_called()

    def test_stale_claim_skips_s3(self):
        started = (datetime.now(DENVER) - timedelta(minutes=45)).isoformat(timespec="milliseconds")
        fields = {
            **BASE_FIELDS,
            FIELD_UPLOAD_STATUS: "Processing",
            FIELD_UPLOAD_CLAIM_RUN_ID: "claim-1",
            FIELD_PROCESSING_STARTED_AT: started,
        }
        with patch("upload_core.processor.upload_s3") as mock_s3:
            config = _config()
            with (
                patch("upload_core.processor.get_asset", return_value={"id": RECORD, "fields": dict(fields)}),
                patch("upload_core.processor.patch_asset"),
            ):
                result = process_upload_asset(config, _payload(uploadClaimRunId="claim-1"))
        self.assertEqual(result["actionOut"], "stale_claim")
        mock_s3.assert_not_called()

    def test_each_distinct_asset_uploads_independently(self):
        fields = dict(BASE_FIELDS)
        result = self._run_upload(
            fields,
            matches=[
                {
                    "id": "recPrior",
                    "fields": {
                        "Enrollment - Linked": ["recEnroll1"],
                        "Week": "1",
                        "Homework Completions": ["recHc1"],
                        "Homework Name - Slot Correct": "HW 1",
                        "Asset Type": "Homework",
                        "Upload Destination": "Homework",
                        "Submission - Linked": ["recSub1"],
                        "Uploaded At": "2026-06-01T10:00:00.000-06:00",
                    },
                }
            ],
        )
        self.assertEqual(result["actionOut"], "uploaded")
        self.assertIn("storageKey", result["s3"])
        self.assertTrue(result["c023Duplicate"]["potentialAssetReuse"])

    def test_review_writeback_failure_preserves_upload(self):
        fields = dict(BASE_FIELDS)
        calls: list[dict] = []

        def patch_side_effect(token, base_id, record_id, patch_fields):
            calls.append(dict(patch_fields))
            if FIELD_UPLOAD_STATUS in patch_fields and patch_fields[FIELD_UPLOAD_STATUS] == "Uploaded":
                fields.update(patch_fields)
                return {"id": record_id, "fields": fields}
            if "Potential Asset Reuse?" in patch_fields:
                raise RuntimeError("review patch failed")
            fields.update(patch_fields)
            return {"id": record_id, "fields": fields}

        result = self._run_upload(fields, patch_side_effect=patch_side_effect)
        self.assertEqual(result["actionOut"], "uploaded")
        self.assertEqual(fields[FIELD_UPLOAD_STATUS], "Uploaded")
        self.assertFalse(result["writebackVerification"]["reviewWritebackApplied"])
        self.assertIn("review patch failed", result["c023Duplicate"]["reviewWritebackError"])

    def test_failed_upload_preserves_claim_on_error_status(self):
        fields = dict(BASE_FIELDS)
        config = _config()
        error_patches: list[dict] = []

        def patch_impl(token, base_id, record_id, patch_fields):
            fields.update(patch_fields)
            if patch_fields.get(FIELD_UPLOAD_STATUS) == "Error":
                error_patches.append(dict(patch_fields))
            return {"id": record_id, "fields": fields}

        with (
            patch("upload_core.processor.get_asset", return_value={"id": RECORD, "fields": dict(fields)}),
            patch("upload_core.processor.patch_asset", side_effect=patch_impl),
            patch("upload_core.processor.http_get_bytes", return_value=(b"x", "image/png")),
            patch("upload_core.processor.upload_s3", side_effect=RuntimeError("s3 failed")),
            patch("upload_core.processor.lookup_duplicate_matches", return_value=[]),
        ):
            from upload_core.processor import process_with_error_writeback

            status, body = process_with_error_writeback(config, _payload())

        self.assertEqual(status, 500)
        self.assertEqual(body["actionOut"], "error_internal")
        self.assertTrue(fields.get(FIELD_UPLOAD_CLAIM_RUN_ID))
        self.assertEqual(fields.get(FIELD_UPLOAD_STATUS), "Error")
        self.assertTrue(error_patches)


if __name__ == "__main__":
    unittest.main()
