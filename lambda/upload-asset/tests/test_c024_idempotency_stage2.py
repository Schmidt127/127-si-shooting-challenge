#!/usr/bin/env python3
"""C-024 Stage 2 upload idempotency tests (no AWS/Airtable runtime)."""

from __future__ import annotations

import sys
import unittest
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from upload_core.config import UploadConfig
from upload_core.fields import (
    FIELD_CANONICAL_FILE_URL,
    FIELD_FILE_CONTENT_HASH,
    FIELD_PROCESSING_STARTED_AT,
    FIELD_UPLOAD_CLAIM_RUN_ID,
    FIELD_UPLOAD_STATUS,
)
from upload_core.processor import process_upload_asset
from upload_core.util import DENVER, sha256_hex

RECORD = "recC024Asset12345"
CLAIM = "c024-claim-1"
HASH = sha256_hex(b"c024-upload-bytes")


def _config() -> UploadConfig:
    return UploadConfig(
        airtable_base_id="appTetnuCZlCZdTCT",
        airtable_token="pat-test",
        s3_bucket="shooting-challenge-assets",
        aws_region="us-east-2",
        environment="DEV",
        allow_route_keys=frozenset({"homework_completion"}),
        season_slug="2026-2027",
        challenge_slug="shooting-challenge",
        athlete_slug_override="test-athlete",
        upload_webhook_secret=None,
    )


def _payload(record_id: str = RECORD, **extra) -> dict:
    payload = {
        "submissionAssetRecordId": record_id,
        "routeKey": "homework_completion",
        "automationNumber": "070a",
        "uploadDestination": "Homework Completions",
        "targetTable": "Homework Completions",
        "targetRecordId": "recC024Homework01",
    }
    payload.update(extra)
    return payload


def _pending_fields(**overrides) -> dict:
    fields = {
        "Upload Destination": "Homework Completions",
        FIELD_UPLOAD_STATUS: "Pending Link",
        "Airtable Attachment": [
            {"url": "https://example.com/c024-homework.png", "filename": "c024-homework.png"}
        ],
        "Homework Completions": ["recC024Homework01"],
        "Enrollment - Linked": ["recC024Enroll01"],
        "Original File Name": "c024-homework.png",
        "Asset Type": "Homework",
        "Asset Purpose": "Homework",
        "Week": "2",
        "Submission - Linked": ["recC024Submission01"],
        FIELD_UPLOAD_CLAIM_RUN_ID: "",
        FIELD_PROCESSING_STARTED_AT: "",
    }
    fields.update(overrides)
    return fields


class C024UploadIdempotencyStage2Tests(unittest.TestCase):
    def _run_with_mutable_record(self, fields: dict, payload: dict | None = None):
        config = _config()

        def get_impl(_token, _base_id, record_id):
            return {"id": record_id, "fields": dict(fields)}

        def patch_impl(_token, _base_id, record_id, patch_fields):
            fields.update(patch_fields)
            return {"id": record_id, "fields": dict(fields)}

        with (
            patch("upload_core.processor.get_asset", side_effect=get_impl),
            patch("upload_core.processor.patch_asset", side_effect=patch_impl) as mock_patch,
            patch(
                "upload_core.processor.http_get_bytes",
                return_value=(b"c024-upload-bytes", "image/png"),
            ) as mock_get_bytes,
            patch(
                "upload_core.processor.upload_s3",
                return_value={"bucket": "b", "region": "us-east-2", "etag": "x"},
            ) as mock_s3,
            patch("upload_core.processor.lookup_duplicate_matches", return_value=[]) as mock_lookup,
        ):
            result = process_upload_asset(config, payload or _payload())
            return result, mock_patch, mock_get_bytes, mock_s3, mock_lookup

    def test_double_invoke_after_success_skips_second_upload(self):
        fields = _pending_fields()
        config = _config()

        def get_impl(_token, _base_id, record_id):
            return {"id": record_id, "fields": dict(fields)}

        def patch_impl(_token, _base_id, record_id, patch_fields):
            fields.update(patch_fields)
            return {"id": record_id, "fields": dict(fields)}

        with (
            patch("upload_core.processor.get_asset", side_effect=get_impl),
            patch("upload_core.processor.patch_asset", side_effect=patch_impl),
            patch(
                "upload_core.processor.http_get_bytes",
                return_value=(b"c024-upload-bytes", "image/png"),
            ) as mock_get_bytes,
            patch(
                "upload_core.processor.upload_s3",
                return_value={"bucket": "b", "region": "us-east-2", "etag": "x"},
            ) as mock_s3,
            patch("upload_core.processor.lookup_duplicate_matches", return_value=[]) as mock_lookup,
        ):
            first = process_upload_asset(config, _payload(uploadClaimRunId=CLAIM))
            second = process_upload_asset(config, _payload(uploadClaimRunId=CLAIM))

        self.assertEqual(first["actionOut"], "uploaded")
        self.assertEqual(first["claimActionOut"], "claim_acquired")
        self.assertEqual(second["actionOut"], "skipped_already_uploaded")
        self.assertEqual(fields[FIELD_UPLOAD_STATUS], "Uploaded")
        self.assertTrue(fields[FIELD_CANONICAL_FILE_URL])
        self.assertEqual(fields[FIELD_FILE_CONTENT_HASH], HASH)
        self.assertEqual(mock_s3.call_count, 1)
        self.assertEqual(mock_get_bytes.call_count, 1)
        self.assertEqual(mock_lookup.call_count, 1)

    def test_matching_claim_retry_continues_without_reclaiming(self):
        started = (datetime.now(DENVER) - timedelta(minutes=2)).isoformat(timespec="milliseconds")
        fields = _pending_fields(
            **{
                FIELD_UPLOAD_STATUS: "Processing",
                FIELD_UPLOAD_CLAIM_RUN_ID: CLAIM,
                FIELD_PROCESSING_STARTED_AT: started,
            }
        )

        result, mock_patch, _mock_get_bytes, mock_s3, mock_lookup = self._run_with_mutable_record(
            fields,
            _payload(uploadClaimRunId=CLAIM),
        )

        self.assertEqual(result["actionOut"], "uploaded")
        self.assertEqual(result["claimActionOut"], "claim_continuation")
        self.assertTrue(result["writebackVerification"]["claimContinuation"])
        self.assertEqual(result["uploadClaimRunId"], CLAIM)
        self.assertEqual(fields[FIELD_UPLOAD_STATUS], "Uploaded")
        self.assertEqual(mock_s3.call_count, 1)
        self.assertEqual(mock_lookup.call_count, 1)
        claim_patches = [
            call.args[3]
            for call in mock_patch.call_args_list
            if call.args[3].get(FIELD_UPLOAD_STATUS) == "Processing"
        ]
        self.assertEqual(claim_patches, [])

    def test_concurrent_double_invoke_other_claim_does_not_upload(self):
        started = (datetime.now(DENVER) - timedelta(minutes=2)).isoformat(timespec="milliseconds")
        fields = _pending_fields(
            **{
                FIELD_UPLOAD_STATUS: "Processing",
                FIELD_UPLOAD_CLAIM_RUN_ID: "claim-owner",
                FIELD_PROCESSING_STARTED_AT: started,
            }
        )
        config = _config()

        with (
            patch(
                "upload_core.processor.get_asset",
                return_value={"id": RECORD, "fields": dict(fields)},
            ),
            patch("upload_core.processor.patch_asset") as mock_patch,
            patch("upload_core.processor.http_get_bytes") as mock_get_bytes,
            patch("upload_core.processor.upload_s3") as mock_s3,
            patch("upload_core.processor.lookup_duplicate_matches") as mock_lookup,
        ):
            result = process_upload_asset(config, _payload(uploadClaimRunId="claim-other"))

        self.assertEqual(result["statusOut"], "skipped")
        self.assertEqual(result["actionOut"], "skipped_concurrent_upload")
        self.assertEqual(result["uploadClaimRunId"], "claim-owner")
        mock_patch.assert_not_called()
        mock_get_bytes.assert_not_called()
        mock_s3.assert_not_called()
        mock_lookup.assert_not_called()

    def test_uploaded_with_prior_claim_still_skips_before_claim_logic(self):
        fields = _pending_fields(
            **{
                FIELD_UPLOAD_STATUS: "Uploaded",
                FIELD_UPLOAD_CLAIM_RUN_ID: CLAIM,
                FIELD_PROCESSING_STARTED_AT: datetime.now(DENVER).isoformat(timespec="milliseconds"),
                FIELD_CANONICAL_FILE_URL: "https://shooting-challenge-assets.s3.us-east-2.amazonaws.com/x",
                FIELD_FILE_CONTENT_HASH: HASH,
            }
        )
        config = _config()

        with (
            patch(
                "upload_core.processor.get_asset",
                return_value={"id": RECORD, "fields": dict(fields)},
            ),
            patch("upload_core.processor.patch_asset") as mock_patch,
            patch("upload_core.processor.evaluate_upload_claim") as mock_claim,
            patch("upload_core.processor.upload_s3") as mock_s3,
        ):
            result = process_upload_asset(config, _payload(uploadClaimRunId="late-retry"))

        self.assertEqual(result["actionOut"], "skipped_already_uploaded")
        mock_claim.assert_not_called()
        mock_patch.assert_not_called()
        mock_s3.assert_not_called()


if __name__ == "__main__":
    unittest.main()
