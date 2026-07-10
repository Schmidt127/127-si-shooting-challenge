#!/usr/bin/env python3
"""Unit tests for Lambda-owned upload claim (no AWS/Airtable)."""

from __future__ import annotations

import sys
import unittest
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from upload_core.fields import (
    FIELD_PROCESSING_STARTED_AT,
    FIELD_UPLOAD_CLAIM_RUN_ID,
    FIELD_UPLOAD_STATUS,
)
from upload_core.upload_claim import (
    CLAIM_LEASE_MINUTES,
    build_claim_patch,
    evaluate_upload_claim,
    is_claim_stale,
    processing_started_at_iso,
)


def _fields(**overrides):
    base = {
        FIELD_UPLOAD_STATUS: "Pending Link",
        FIELD_UPLOAD_CLAIM_RUN_ID: "",
        FIELD_PROCESSING_STARTED_AT: "",
    }
    base.update(overrides)
    return base


class UploadClaimTests(unittest.TestCase):
    def test_pending_link_claim_writes_processing_fields(self):
        now = datetime(2026, 7, 10, 12, 0, 0, tzinfo=__import__("upload_core.util", fromlist=["DENVER"]).DENVER)
        evaluation = evaluate_upload_claim(_fields(), {}, now=now)
        self.assertTrue(evaluation.should_upload)
        self.assertEqual(evaluation.action_out, "claim_acquired")
        self.assertIsNotNone(evaluation.claim_patch)
        patch = evaluation.claim_patch or {}
        self.assertEqual(patch[FIELD_UPLOAD_STATUS], "Processing")
        self.assertTrue(patch[FIELD_UPLOAD_CLAIM_RUN_ID])
        self.assertEqual(patch[FIELD_PROCESSING_STARTED_AT], processing_started_at_iso(now))

    def test_build_claim_patch_shape(self):
        patch = build_claim_patch("run-abc")
        self.assertEqual(patch[FIELD_UPLOAD_STATUS], "Processing")
        self.assertEqual(patch[FIELD_UPLOAD_CLAIM_RUN_ID], "run-abc")
        self.assertTrue(patch[FIELD_PROCESSING_STARTED_AT])

    def test_matching_processing_claim_continues(self):
        now = datetime(2026, 7, 10, 12, 0, 0, tzinfo=__import__("upload_core.util", fromlist=["DENVER"]).DENVER)
        started = (now - timedelta(minutes=5)).isoformat(timespec="milliseconds")
        fields = _fields(
            **{
                FIELD_UPLOAD_STATUS: "Processing",
                FIELD_UPLOAD_CLAIM_RUN_ID: "claim-1",
                FIELD_PROCESSING_STARTED_AT: started,
            }
        )
        evaluation = evaluate_upload_claim(fields, {"uploadClaimRunId": "claim-1"}, now=now)
        self.assertTrue(evaluation.should_upload)
        self.assertEqual(evaluation.action_out, "claim_continuation")
        self.assertIsNone(evaluation.claim_patch)

    def test_concurrent_worker_rejected(self):
        now = datetime(2026, 7, 10, 12, 0, 0, tzinfo=__import__("upload_core.util", fromlist=["DENVER"]).DENVER)
        started = (now - timedelta(minutes=5)).isoformat(timespec="milliseconds")
        fields = _fields(
            **{
                FIELD_UPLOAD_STATUS: "Processing",
                FIELD_UPLOAD_CLAIM_RUN_ID: "claim-owner",
                FIELD_PROCESSING_STARTED_AT: started,
            }
        )
        evaluation = evaluate_upload_claim(fields, {"uploadClaimRunId": "claim-other"}, now=now)
        self.assertFalse(evaluation.should_upload)
        self.assertEqual(evaluation.action_out, "skipped_concurrent_upload")

    def test_stale_processing_not_auto_reset(self):
        now = datetime(2026, 7, 10, 12, 0, 0, tzinfo=__import__("upload_core.util", fromlist=["DENVER"]).DENVER)
        started = (now - timedelta(minutes=CLAIM_LEASE_MINUTES + 1)).isoformat(timespec="milliseconds")
        fields = _fields(
            **{
                FIELD_UPLOAD_STATUS: "Processing",
                FIELD_UPLOAD_CLAIM_RUN_ID: "claim-1",
                FIELD_PROCESSING_STARTED_AT: started,
            }
        )
        evaluation = evaluate_upload_claim(fields, {"uploadClaimRunId": "claim-1"}, now=now)
        self.assertFalse(evaluation.should_upload)
        self.assertEqual(evaluation.action_out, "stale_claim")

    def test_stale_when_processing_started_missing(self):
        now = datetime(2026, 7, 10, 12, 0, 0, tzinfo=__import__("upload_core.util", fromlist=["DENVER"]).DENVER)
        fields = _fields(
            **{
                FIELD_UPLOAD_STATUS: "Processing",
                FIELD_UPLOAD_CLAIM_RUN_ID: "claim-1",
                FIELD_PROCESSING_STARTED_AT: "",
            }
        )
        self.assertTrue(is_claim_stale(None, now=now))
        evaluation = evaluate_upload_claim(fields, {"uploadClaimRunId": "claim-1"}, now=now)
        self.assertEqual(evaluation.action_out, "stale_claim")

    def test_legacy_processing_without_claim_is_conflict(self):
        now = datetime(2026, 7, 10, 12, 0, 0, tzinfo=__import__("upload_core.util", fromlist=["DENVER"]).DENVER)
        started = (now - timedelta(minutes=2)).isoformat(timespec="milliseconds")
        fields = _fields(
            **{
                FIELD_UPLOAD_STATUS: "Processing",
                FIELD_UPLOAD_CLAIM_RUN_ID: "",
                FIELD_PROCESSING_STARTED_AT: started,
            }
        )
        evaluation = evaluate_upload_claim(fields, {}, now=now)
        self.assertEqual(evaluation.action_out, "error_claim_conflict")

    def test_payload_claim_id_accepted_on_pending_link(self):
        evaluation = evaluate_upload_claim(_fields(), {"uploadClaimRunId": "provided-id"})
        self.assertEqual(evaluation.claim_run_id, "provided-id")
        self.assertEqual((evaluation.claim_patch or {})[FIELD_UPLOAD_CLAIM_RUN_ID], "provided-id")


if __name__ == "__main__":
    unittest.main()
