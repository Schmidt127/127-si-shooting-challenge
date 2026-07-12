#!/usr/bin/env python3
"""C-023 Stage 1 duplicate-detection matrix (Worker C).

Covers filename vs hash scenarios, retry/idempotency, multi-asset submissions,
missing hash, and hash lookup failure — without live AWS/Airtable.
"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from upload_core.config import UploadConfig
from upload_core.duplicate import (
    REASON_SAME_ASSIGNMENT_RESUB,
    build_c023_duplicate_report,
    build_review_writeback,
    classify_duplicate_matches,
    lookup_duplicate_matches,
)
from upload_core.fields import (
    FIELD_CANONICAL_FILE_URL,
    FIELD_DUPLICATE_CHECK_ERROR,
    FIELD_DUPLICATE_FILE_STATUS,
    FIELD_EXACT_HASH_MATCH_FOUND,
    FIELD_FILE_CONTENT_HASH,
    FIELD_POTENTIAL_ASSET_REUSE,
    FIELD_UPLOAD_STATUS,
)
from upload_core.processor import process_upload_asset
from upload_core.util import sha256_hex

HASH_A = sha256_hex(b"same-file-bytes")
HASH_B = sha256_hex(b"different-file-bytes")
ENROLL = "recEnrollAAA"
FILENAME_A = "homework-week2.png"
FILENAME_B_RENAMED = "week2-homework-renamed.png"

SHARED_PRIOR_FIELDS = {
    "Enrollment - Linked": [ENROLL],
    "Asset Type": "Homework",
    "Asset Purpose": "Homework",
    "Upload Destination": "Homework",
    "Homework Completions": ["recHc1"],
    "Homework Name - Slot Correct": "HW 1",
    "Week": "2",
    "Submission - Linked": ["recSubA"],
    "Uploaded At": "2026-06-01T10:00:00.000-06:00",
    "File Content Hash": HASH_A,
    "Original File Name": FILENAME_A,
    "Canonical File URL": "https://example.com/recPrior",
}


def _asset_fields(
    *,
    record_suffix: str = "New",
    filename: str = FILENAME_A,
    file_hash: str = HASH_A,
    upload_status: str = "Pending Link",
    canonical: str = "",
) -> dict:
    fields = {
        "Upload Destination": "Homework Completions",
        "Upload Status": upload_status,
        "Airtable Attachment": [
            {"url": f"https://example.com/{filename}", "filename": filename}
        ],
        "Homework Completions": ["recHc1"],
        "Enrollment - Linked": [ENROLL],
        "Original File Name": filename,
        "Asset Type": "Homework",
        "Asset Purpose": "Homework",
        "Week": "2",
        "Submission - Linked": ["recSubA"],
    }
    if canonical:
        fields[FIELD_CANONICAL_FILE_URL] = canonical
    if file_hash:
        fields[FIELD_FILE_CONTENT_HASH] = file_hash
    return fields


def _prior_match(record_id: str = "recPrior", *, filename: str = FILENAME_A) -> dict:
    return {
        "id": record_id,
        "fields": {**SHARED_PRIOR_FIELDS, "Original File Name": filename},
    }


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


def _payload(record_id: str, **extra) -> dict:
    base = {
        "submissionAssetRecordId": record_id,
        "routeKey": "homework_completion",
        "automationNumber": "070a",
        "uploadDestination": "Homework Completions",
        "targetTable": "Homework Completions",
        "targetRecordId": "recHc1",
    }
    base.update(extra)
    return base


def _run_homework_upload(
    record_id: str,
    fields: dict,
    *,
    file_bytes: bytes = b"same-file-bytes",
    matches: list | None = None,
    lookup_side_effect=None,
    patch_side_effect=None,
):
    matches = matches if matches is not None else []
    config = _config()
    fields_copy = dict(fields)

    def patch_impl(token, base_id, rid, patch_fields):
        if patch_side_effect:
            patch_side_effect(token, base_id, rid, patch_fields)
        fields_copy.update(patch_fields)
        return {"id": rid, "fields": fields_copy}

    lookup_kw = {}
    if lookup_side_effect is not None:
        lookup_kw["side_effect"] = lookup_side_effect
    else:
        lookup_kw["return_value"] = matches

    with (
        patch(
            "upload_core.processor.get_asset",
            return_value={"id": record_id, "fields": dict(fields)},
        ),
        patch("upload_core.processor.patch_asset", side_effect=patch_impl),
        patch(
            "upload_core.processor.http_get_bytes",
            return_value=(file_bytes, "image/png"),
        ),
        patch(
            "upload_core.processor.upload_s3",
            return_value={"bucket": "b", "region": "us-east-2", "etag": "x"},
        ),
        patch("upload_core.processor.lookup_duplicate_matches", **lookup_kw),
    ):
        return process_upload_asset(config, _payload(record_id)), fields_copy


class DuplicateMatrixClassificationTests(unittest.TestCase):
    """Hash vs filename — classification layer only."""

    def test_same_file_same_filename_exact_duplicate_and_resub(self):
        current = _asset_fields(filename=FILENAME_A)
        classification = classify_duplicate_matches(
            current_record_id="recNew",
            current_fields=current,
            matches=[_prior_match(filename=FILENAME_A)],
        )
        self.assertTrue(classification.exact_hash_match)
        self.assertTrue(classification.potential_reuse)
        self.assertIn(REASON_SAME_ASSIGNMENT_RESUB, classification.all_reasons)
        wb = build_review_writeback(classification, existing_fields={}, file_hash=HASH_A)
        self.assertEqual(wb[FIELD_DUPLICATE_FILE_STATUS], "Exact Duplicate")
        self.assertTrue(wb[FIELD_POTENTIAL_ASSET_REUSE])

    def test_same_file_renamed_still_matches_by_hash(self):
        current = _asset_fields(filename=FILENAME_B_RENAMED)
        classification = classify_duplicate_matches(
            current_record_id="recNew",
            current_fields=current,
            matches=[_prior_match(filename=FILENAME_A)],
        )
        self.assertTrue(classification.exact_hash_match)
        self.assertTrue(classification.potential_reuse)
        self.assertIn(REASON_SAME_ASSIGNMENT_RESUB, classification.all_reasons)

    def test_different_file_same_filename_no_match_unique(self):
        current = _asset_fields(filename=FILENAME_A)
        classification = classify_duplicate_matches(
            current_record_id="recNew",
            current_fields=current,
            matches=[],
        )
        self.assertFalse(classification.exact_hash_match)
        self.assertFalse(classification.potential_reuse)
        wb = build_review_writeback(classification, existing_fields={}, file_hash=HASH_B)
        self.assertEqual(wb[FIELD_DUPLICATE_FILE_STATUS], "Unique")
        self.assertFalse(wb[FIELD_EXACT_HASH_MATCH_FOUND])


class DuplicateMatrixWritebackTests(unittest.TestCase):
    """Missing hash and lookup failure writeback contracts."""

    def test_missing_hash_writeback_error_state(self):
        classification = classify_duplicate_matches(
            current_record_id="recNew",
            current_fields=_asset_fields(),
            matches=[],
        )
        wb = build_review_writeback(classification, existing_fields={}, file_hash="")
        self.assertEqual(wb[FIELD_DUPLICATE_FILE_STATUS], "Error")
        self.assertEqual(wb[FIELD_DUPLICATE_CHECK_ERROR], "SHA-256 hash not computed.")
        self.assertFalse(wb[FIELD_EXACT_HASH_MATCH_FOUND])

    def test_hash_lookup_failure_writeback_error_state(self):
        classification = classify_duplicate_matches(
            current_record_id="recNew",
            current_fields=_asset_fields(),
            matches=[],
        )
        err = "duplicate lookup GET -> HTTP 503: service unavailable"
        wb = build_review_writeback(
            classification,
            existing_fields={},
            file_hash=HASH_A,
            lookup_error=err,
        )
        self.assertEqual(wb[FIELD_DUPLICATE_FILE_STATUS], "Error")
        self.assertEqual(wb[FIELD_DUPLICATE_CHECK_ERROR], err)
        self.assertFalse(wb[FIELD_EXACT_HASH_MATCH_FOUND])

    def test_lookup_duplicate_matches_skips_empty_hash(self):
        self.assertEqual(
            lookup_duplicate_matches("tok", "appX", "", "recNew"),
            [],
        )

    def test_lookup_duplicate_matches_skips_invalid_hash(self):
        self.assertEqual(
            lookup_duplicate_matches("tok", "appX", "not-a-valid-hash", "recNew"),
            [],
        )

    def test_lookup_duplicate_matches_raises_on_http_error(self):
        with patch(
            "upload_core.duplicate.http_json",
            return_value=(503, {"error": "unavailable"}),
        ):
            with self.assertRaises(RuntimeError) as ctx:
                lookup_duplicate_matches("tok", "appX", HASH_A, "recNew")
        self.assertIn("HTTP 503", str(ctx.exception))

    def test_c023_report_never_blocks_upload(self):
        classification = classify_duplicate_matches(
            current_record_id="recNew",
            current_fields=_asset_fields(),
            matches=[_prior_match()],
        )
        report = build_c023_duplicate_report(
            record_id="recNew",
            file_hash=HASH_A,
            classification=classification,
            lookup_performed=True,
            review_writeback_applied=True,
        )
        self.assertFalse(report["uploadBlocked"])
        self.assertTrue(report["exactHashMatchFound"])
        self.assertTrue(report["potentialAssetReuse"])


class DuplicateMatrixProcessorTests(unittest.TestCase):
    """End-to-end processor matrix with mocks."""

    def test_same_file_same_filename_upload_not_blocked(self):
        fields = _asset_fields()
        result, updated = _run_homework_upload(
            "recAssetSameName",
            fields,
            matches=[_prior_match()],
        )
        self.assertEqual(result["actionOut"], "uploaded")
        self.assertFalse(result["c023Duplicate"]["uploadBlocked"])
        self.assertTrue(result["c023Duplicate"]["exactHashMatchFound"])
        self.assertTrue(result["c023Duplicate"]["potentialAssetReuse"])
        self.assertIn(REASON_SAME_ASSIGNMENT_RESUB, result["c023Duplicate"]["reviewReasons"])
        self.assertEqual(updated[FIELD_UPLOAD_STATUS], "Uploaded")
        self.assertTrue(updated[FIELD_FILE_CONTENT_HASH])

    def test_same_file_renamed_upload_detects_prior_by_hash(self):
        fields = _asset_fields(filename=FILENAME_B_RENAMED)
        result, _ = _run_homework_upload(
            "recAssetRenamed",
            fields,
            matches=[_prior_match(filename=FILENAME_A)],
        )
        self.assertEqual(result["actionOut"], "uploaded")
        self.assertFalse(result["c023Duplicate"]["uploadBlocked"])
        self.assertTrue(result["c023Duplicate"]["exactHashMatchFound"])
        self.assertTrue(result["c023Duplicate"]["potentialAssetReuse"])

    def test_different_file_same_filename_upload_unique(self):
        fields = _asset_fields(filename=FILENAME_A)
        result, updated = _run_homework_upload(
            "recAssetDiffBytes",
            fields,
            file_bytes=b"different-file-bytes",
            matches=[],
        )
        self.assertEqual(result["actionOut"], "uploaded")
        self.assertFalse(result["c023Duplicate"]["uploadBlocked"])
        self.assertFalse(result["c023Duplicate"]["exactHashMatchFound"])
        self.assertFalse(result["c023Duplicate"]["potentialAssetReuse"])
        self.assertEqual(updated[FIELD_FILE_CONTENT_HASH], HASH_B)

    def test_retry_after_successful_upload_skips_s3_and_lookup(self):
        fields = _asset_fields(
            upload_status="Uploaded",
            canonical="https://example.com/prior-upload",
            file_hash=HASH_A,
        )
        with patch("upload_core.processor.upload_s3") as mock_s3, patch(
            "upload_core.processor.lookup_duplicate_matches"
        ) as mock_lookup:
            result, _ = _run_homework_upload("recRetrySuccess", fields)
        self.assertEqual(result["actionOut"], "skipped_already_uploaded")
        mock_s3.assert_not_called()
        mock_lookup.assert_not_called()

    def test_retry_after_partial_writeback_review_not_reapplied(self):
        """Upload writeback complete; review patch failed on first run — retry skips."""
        fields = _asset_fields(
            upload_status="Uploaded",
            canonical="https://example.com/partial",
            file_hash=HASH_A,
        )
        review_patches: list[dict] = []

        def patch_side_effect(token, base_id, rid, patch_fields):
            if "Potential Asset Reuse?" in patch_fields:
                review_patches.append(dict(patch_fields))

        with patch("upload_core.processor.upload_s3") as mock_s3, patch(
            "upload_core.processor.lookup_duplicate_matches"
        ) as mock_lookup:
            result, updated = _run_homework_upload(
                "recRetryPartial",
                fields,
                matches=[_prior_match()],
                patch_side_effect=patch_side_effect,
            )
        self.assertEqual(result["actionOut"], "skipped_already_uploaded")
        mock_s3.assert_not_called()
        mock_lookup.assert_not_called()
        self.assertEqual(len(review_patches), 0)
        self.assertNotIn("Potential Asset Reuse?", updated)

    def test_multi_file_submission_one_duplicate_other_unique(self):
        fields_unique = _asset_fields()
        result_unique, _ = _run_homework_upload(
            "recMultiUnique",
            fields_unique,
            file_bytes=b"unique-submission-file",
            matches=[],
        )
        self.assertEqual(result_unique["actionOut"], "uploaded")
        self.assertFalse(result_unique["c023Duplicate"]["exactHashMatchFound"])
        self.assertFalse(result_unique["c023Duplicate"]["potentialAssetReuse"])

        fields_dup = _asset_fields(filename=FILENAME_B_RENAMED)
        result_dup, _ = _run_homework_upload(
            "recMultiDuplicate",
            fields_dup,
            matches=[_prior_match(record_id="recMultiUnique")],
        )
        self.assertEqual(result_dup["actionOut"], "uploaded")
        self.assertFalse(result_dup["c023Duplicate"]["uploadBlocked"])
        self.assertTrue(result_dup["c023Duplicate"]["exactHashMatchFound"])
        self.assertTrue(result_dup["c023Duplicate"]["potentialAssetReuse"])
        self.assertEqual(result_dup["c023Duplicate"]["primaryMatchId"], "recMultiUnique")

    def test_hash_lookup_failure_upload_continues_not_blocked(self):
        fields = _asset_fields()

        def lookup_fail(*_args, **_kwargs):
            raise RuntimeError("duplicate lookup GET -> HTTP 503: unavailable")

        result, updated = _run_homework_upload(
            "recLookupFail",
            fields,
            lookup_side_effect=lookup_fail,
        )
        self.assertEqual(result["actionOut"], "uploaded")
        self.assertFalse(result["c023Duplicate"]["uploadBlocked"])
        self.assertFalse(result["c023Duplicate"]["duplicateLookupPerformed"])
        self.assertEqual(updated[FIELD_UPLOAD_STATUS], "Uploaded")
        self.assertFalse(result["writebackVerification"]["duplicateLookupPerformed"])
        self.assertTrue(result["writebackVerification"]["uploadStatusUploaded"])
        self.assertIn("503", result["writebackApplied"].get("Duplicate Check Error", ""))


if __name__ == "__main__":
    unittest.main()
