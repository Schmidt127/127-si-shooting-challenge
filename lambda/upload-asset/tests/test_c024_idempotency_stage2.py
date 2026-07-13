#!/usr/bin/env python3
"""C-024 Stage 2 idempotency / rerun tests (Worker C).

Extends Stage 1 matrix with processor-level double-invoke, claim continuation,
and retry-after-success patch guards — no live AWS/Airtable.
"""

from __future__ import annotations

import sys
import unittest
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import test_duplicate_matrix_stage1 as matrix  # noqa: E402

from upload_core.fields import (  # noqa: E402
    FIELD_CANONICAL_FILE_URL,
    FIELD_FILE_CONTENT_HASH,
    FIELD_PROCESSING_STARTED_AT,
    FIELD_UPLOAD_CLAIM_RUN_ID,
    FIELD_UPLOAD_STATUS,
)
from upload_core.processor import process_upload_asset  # noqa: E402
from upload_core.util import DENVER  # noqa: E402


class C024RetryAfterSuccessTests(unittest.TestCase):
    """Retry-after-success must not re-upload or re-patch upload fields."""

    def test_retry_after_success_no_upload_patches(self):
        fields = matrix._asset_fields(
            upload_status="Uploaded",
            canonical="https://example.com/prior-upload",
            file_hash=matrix.HASH_A,
        )
        upload_patches: list[dict] = []

        def patch_side_effect(token, base_id, rid, patch_fields):
            if FIELD_UPLOAD_STATUS in patch_fields or FIELD_CANONICAL_FILE_URL in patch_fields:
                upload_patches.append(dict(patch_fields))

        with patch("upload_core.processor.upload_s3") as mock_s3, patch(
            "upload_core.processor.lookup_duplicate_matches"
        ) as mock_lookup:
            result, _ = matrix._run_homework_upload(
                "recRetryNoPatch",
                fields,
                patch_side_effect=patch_side_effect,
            )

        self.assertEqual(result["actionOut"], "skipped_already_uploaded")
        self.assertEqual(upload_patches, [])
        mock_s3.assert_not_called()
        mock_lookup.assert_not_called()

    def test_sequential_double_invoke_second_skips(self):
        first, updated = matrix._run_homework_upload(
            "recDoubleInvoke",
            matrix._asset_fields(),
        )
        self.assertEqual(first["actionOut"], "uploaded")
        self.assertEqual(updated[FIELD_UPLOAD_STATUS], "Uploaded")
        self.assertTrue(updated[FIELD_CANONICAL_FILE_URL])

        with patch("upload_core.processor.upload_s3") as mock_s3:
            second, _ = matrix._run_homework_upload(
                "recDoubleInvoke",
                dict(updated),
            )
        self.assertEqual(second["actionOut"], "skipped_already_uploaded")
        mock_s3.assert_not_called()


class C024DoubleProcessorInvokeTests(unittest.TestCase):
    """Concurrent or duplicate Lambda invocations must not double-upload."""

    def test_same_claim_continuation_completes_without_second_claim_patch(self):
        claim_id = "claim-c024-continuation"
        started = (datetime.now(DENVER) - timedelta(minutes=2)).isoformat(
            timespec="milliseconds"
        )
        fields = matrix._asset_fields(upload_status="Processing")
        fields[FIELD_UPLOAD_CLAIM_RUN_ID] = claim_id
        fields[FIELD_PROCESSING_STARTED_AT] = started
        claim_patches: list[dict] = []

        def patch_side_effect(token, base_id, rid, patch_fields):
            if patch_fields.get(FIELD_UPLOAD_STATUS) == "Processing":
                claim_patches.append(dict(patch_fields))
            fields.update(patch_fields)
            return {"id": rid, "fields": fields}

        with (
            patch(
                "upload_core.processor.get_asset",
                return_value={"id": "recClaimContinue", "fields": dict(fields)},
            ),
            patch("upload_core.processor.patch_asset", side_effect=patch_side_effect),
            patch(
                "upload_core.processor.http_get_bytes",
                return_value=(b"same-file-bytes", "image/png"),
            ),
            patch(
                "upload_core.processor.upload_s3",
                return_value={"bucket": "b", "region": "us-east-2", "etag": "x"},
            ),
            patch("upload_core.processor.lookup_duplicate_matches", return_value=[]),
        ):
            result = process_upload_asset(
                matrix._config(),
                matrix._payload("recClaimContinue", uploadClaimRunId=claim_id),
            )

        self.assertEqual(result["actionOut"], "uploaded")
        self.assertEqual(result["claimActionOut"], "claim_continuation")
        self.assertEqual(claim_patches, [])
        self.assertEqual(fields[FIELD_UPLOAD_STATUS], "Uploaded")

    def test_concurrent_claim_skips_s3_on_homework_route(self):
        started = (datetime.now(DENVER) - timedelta(minutes=2)).isoformat(
            timespec="milliseconds"
        )
        fields = matrix._asset_fields(upload_status="Processing")
        fields[FIELD_UPLOAD_CLAIM_RUN_ID] = "claim-owner-c024"
        fields[FIELD_PROCESSING_STARTED_AT] = started

        with patch("upload_core.processor.upload_s3") as mock_s3:
            with (
                patch(
                    "upload_core.processor.get_asset",
                    return_value={"id": "recConcurrent", "fields": dict(fields)},
                ),
                patch("upload_core.processor.patch_asset"),
            ):
                result = process_upload_asset(
                    matrix._config(),
                    matrix._payload(
                        "recConcurrent",
                        uploadClaimRunId="other-worker-claim",
                    ),
                )

        self.assertEqual(result["actionOut"], "skipped_concurrent_upload")
        mock_s3.assert_not_called()


class C024PartialWritebackRerunTests(unittest.TestCase):
    """Partial writeback reruns must not corrupt completed upload state."""

    def test_partial_review_missing_retry_skips_duplicate_lookup(self):
        fields = matrix._asset_fields(
            upload_status="Uploaded",
            canonical="https://example.com/partial-wb",
            file_hash=matrix.HASH_A,
        )

        with patch("upload_core.processor.upload_s3") as mock_s3, patch(
            "upload_core.processor.lookup_duplicate_matches"
        ) as mock_lookup:
            result, updated = matrix._run_homework_upload(
                "recPartialReview",
                fields,
                matches=[matrix._prior_match()],
            )

        self.assertEqual(result["actionOut"], "skipped_already_uploaded")
        mock_s3.assert_not_called()
        mock_lookup.assert_not_called()
        self.assertEqual(
            updated[FIELD_CANONICAL_FILE_URL],
            "https://example.com/partial-wb",
        )
        self.assertEqual(updated[FIELD_FILE_CONTENT_HASH], matrix.HASH_A)
        self.assertNotIn("Potential Asset Reuse?", updated)


if __name__ == "__main__":
    unittest.main()
