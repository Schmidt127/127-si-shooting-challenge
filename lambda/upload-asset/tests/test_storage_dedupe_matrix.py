#!/usr/bin/env python3
"""WP-G storage dedupe / canonical URL / callback idempotency matrix (2026-07-23 overnight).

Covers the audit scenarios from docs/overnight/zoom-storage/STORAGE-DEDUPE-AUDIT.md:
same URL twice, same bytes different name, different bytes same name, missing hash,
callback retry, expired source URL, canonical already present, partial upload,
writeback failure, key determinism, and MIME/extension handling.
No AWS or Airtable network calls — everything is mocked.
"""

from __future__ import annotations

import sys
import unittest
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from upload_core.config import UploadConfig
from upload_core.duplicate import (
    REASON_DIFF_WEEK,
    REASON_SAME_ASSIGNMENT_RESUB,
    build_review_writeback,
    classify_duplicate_matches,
)
from upload_core.fields import (
    FIELD_ASSET_REUSE_DECISION,
    FIELD_ASSET_REUSE_REVIEW_SUMMARY,
    FIELD_CANONICAL_FILE_URL,
    FIELD_DUPLICATE_CHECK_ERROR,
    FIELD_DUPLICATE_FILE_STATUS,
    FIELD_FILE_CONTENT_HASH,
    FIELD_POTENTIAL_ASSET_REUSE,
    FIELD_PROCESSING_STARTED_AT,
    FIELD_UPLOAD_CLAIM_RUN_ID,
    FIELD_UPLOAD_ERROR,
    FIELD_UPLOAD_STATUS,
)
from upload_core.processor import process_upload_asset, process_with_error_writeback
from upload_core.util import DENVER, build_storage_key, canonical_url, guess_mime, sha256_hex

RECORD = "recDedupeAsset001"
HASH = sha256_hex(b"same-bytes")

BASE_FIELDS = {
    "Upload Destination": "Video Feedback",
    "Upload Status": "Pending Link",
    "Airtable Attachment": [{"url": "https://example.com/a.mp4", "filename": "a.mp4"}],
    "Video Feedback": ["recVf1"],
    "Enrollment - Linked": ["recEnroll1"],
    "Submission - Linked": ["recSub1"],
    "Original File Name": "a.mp4",
    "Asset Type": "Video Feedback",
    "Week": "3",
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
        athlete_slug_override="schmidt-test",
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


def _run(fields: dict, *, matches=None, body=b"same-bytes", mime="video/mp4", payload=None):
    def patch_impl(token, base_id, record_id, patch_fields):
        fields.update(patch_fields)
        return {"id": record_id, "fields": fields}

    with (
        patch("upload_core.processor.get_asset", return_value={"id": RECORD, "fields": dict(fields)}),
        patch("upload_core.processor.patch_asset", side_effect=patch_impl),
        patch("upload_core.processor.http_get_bytes", return_value=(body, mime)),
        patch("upload_core.processor.upload_s3", return_value={"bucket": "b", "region": "us-east-2", "etag": "x"}),
        patch("upload_core.processor.lookup_duplicate_matches", return_value=list(matches or [])),
    ):
        return process_upload_asset(_config(), payload or _payload())


class SameUrlTwiceTests(unittest.TestCase):
    """Same source URL sent twice — second run must not re-upload."""

    def test_second_callback_is_idempotent(self):
        fields = dict(BASE_FIELDS)
        first = _run(fields)
        self.assertEqual(first["actionOut"], "uploaded")

        with patch("upload_core.processor.upload_s3") as mock_s3:
            second = _run(fields)
        self.assertEqual(second["actionOut"], "skipped_already_uploaded")
        mock_s3.assert_not_called()

    def test_canonical_url_survives_retry(self):
        fields = dict(BASE_FIELDS)
        first = _run(fields)
        canonical_after_first = fields[FIELD_CANONICAL_FILE_URL]
        _run(fields)
        self.assertEqual(fields[FIELD_CANONICAL_FILE_URL], canonical_after_first)
        self.assertEqual(first["s3"]["canonicalFileUrl"], canonical_after_first)


class SameBytesDifferentNameTests(unittest.TestCase):
    """Same content hash, different filename — flagged for review, never blocked."""

    def test_same_assignment_resubmission_flagged_when_labeled(self):
        prior = {
            "id": "recPriorAsset",
            "fields": {
                "Enrollment - Linked": ["recEnroll1"],
                "Video Feedback": ["recVfOld"],
                "Asset Type": "Video Feedback",
                "Upload Destination": "Video Feedback",
                "Submission - Linked": ["recSub1"],
                "Week": "3",
                "Asset Label": "Daily Video",
                "Original File Name": "different-name.mp4",
                "Uploaded At": "2026-07-01T10:00:00.000-06:00",
            },
        }
        fields = {**BASE_FIELDS, "Asset Label": "Daily Video"}
        result = _run(fields, matches=[prior])
        self.assertEqual(result["actionOut"], "uploaded", "duplicate hash must never block upload")
        self.assertTrue(result["c023Duplicate"]["exactHashMatchFound"])
        self.assertIn(
            REASON_SAME_ASSIGNMENT_RESUB, result["c023Duplicate"]["reviewReasons"],
        )
        self.assertTrue(fields[FIELD_POTENTIAL_ASSET_REUSE])

    def test_unlabeled_video_resubmission_still_flagged_as_missing_context(self):
        """Video assets carry no assignment label, so identical-bytes resubmission
        classifies as Missing Context (not Same Assignment Resubmission) — but it
        is still flagged as potential reuse for manual review."""
        prior = {
            "id": "recPriorAsset",
            "fields": {
                "Enrollment - Linked": ["recEnroll1"],
                "Video Feedback": ["recVfOld"],
                "Asset Type": "Video Feedback",
                "Upload Destination": "Video Feedback",
                "Submission - Linked": ["recSub1"],
                "Week": "3",
                "Uploaded At": "2026-07-01T10:00:00.000-06:00",
            },
        }
        fields = dict(BASE_FIELDS)
        result = _run(fields, matches=[prior])
        self.assertEqual(result["actionOut"], "uploaded")
        self.assertTrue(result["c023Duplicate"]["potentialAssetReuse"])
        self.assertTrue(fields[FIELD_POTENTIAL_ASSET_REUSE])

    def test_different_week_reuse_flagged(self):
        prior = {
            "id": "recPriorAsset",
            "fields": {
                "Enrollment - Linked": ["recEnroll1"],
                "Video Feedback": ["recVfOld"],
                "Asset Type": "Video Feedback",
                "Upload Destination": "Video Feedback",
                "Submission - Linked": ["recSubOld"],
                "Week": "2",
                "Uploaded At": "2026-07-01T10:00:00.000-06:00",
            },
        }
        classification = classify_duplicate_matches(
            current_record_id=RECORD,
            current_fields=dict(BASE_FIELDS),
            matches=[prior],
        )
        self.assertTrue(classification.potential_reuse)
        self.assertIn(REASON_DIFF_WEEK, classification.all_reasons)

    def test_cross_enrollment_match_is_informational_only(self):
        prior = {
            "id": "recOtherAthlete",
            "fields": {
                "Enrollment - Linked": ["recEnrollOther"],
                "Asset Type": "Video Feedback",
                "Upload Destination": "Video Feedback",
                "Submission - Linked": ["recSubX"],
                "Week": "3",
            },
        }
        fields = dict(BASE_FIELDS)
        result = _run(fields, matches=[prior])
        self.assertEqual(result["actionOut"], "uploaded")
        self.assertFalse(result["c023Duplicate"]["potentialAssetReuse"])
        self.assertEqual(result["c023Duplicate"]["crossEnrollmentMatchCount"], 1)
        # Never auto-reuse another athlete's object: canonical URL is this record's own key.
        self.assertIn(RECORD, result["s3"]["storageKey"])


class DifferentBytesSameNameTests(unittest.TestCase):
    """Same filename, different content — unique, and keys can never collide."""

    def test_unique_when_no_hash_match(self):
        fields = dict(BASE_FIELDS)
        result = _run(fields, body=b"other-bytes")
        self.assertEqual(result["actionOut"], "uploaded")
        self.assertFalse(result["c023Duplicate"]["exactHashMatchFound"])
        self.assertEqual(fields[FIELD_DUPLICATE_FILE_STATUS], "Unique")

    def test_storage_keys_isolate_by_record_id(self):
        common = dict(
            fields=BASE_FIELDS,
            athlete_slug="schmidt-test",
            season_slug="2026-2027",
            challenge_slug="shooting-challenge",
            date_str="2026-07-23",
            filename="a.mp4",
        )
        key1 = build_storage_key(record_id="recAAA", **common)
        key2 = build_storage_key(record_id="recBBB", **common)
        self.assertNotEqual(key1, key2)
        self.assertIn("recAAA", key1)
        self.assertIn("recBBB", key2)


class MissingHashTests(unittest.TestCase):
    def test_missing_hash_routes_to_manual_review(self):
        wb = build_review_writeback(
            classify_duplicate_matches(current_record_id=RECORD, current_fields={}, matches=[]),
            existing_fields={},
            file_hash="",
        )
        self.assertEqual(wb[FIELD_DUPLICATE_FILE_STATUS], "Error")
        self.assertIn("hash", wb[FIELD_DUPLICATE_CHECK_ERROR].lower())

    def test_lookup_error_routes_to_manual_review_without_blocking(self):
        fields = dict(BASE_FIELDS)

        def patch_impl(token, base_id, record_id, patch_fields):
            fields.update(patch_fields)
            return {"id": record_id, "fields": fields}

        with (
            patch("upload_core.processor.get_asset", return_value={"id": RECORD, "fields": dict(fields)}),
            patch("upload_core.processor.patch_asset", side_effect=patch_impl),
            patch("upload_core.processor.http_get_bytes", return_value=(b"same-bytes", "video/mp4")),
            patch("upload_core.processor.upload_s3", return_value={"bucket": "b", "region": "us-east-2", "etag": "x"}),
            patch(
                "upload_core.processor.lookup_duplicate_matches",
                side_effect=RuntimeError("Airtable 503"),
            ),
        ):
            result = process_upload_asset(_config(), _payload())

        self.assertEqual(result["actionOut"], "uploaded", "lookup failure must not block upload")
        self.assertFalse(result["c023Duplicate"]["duplicateLookupPerformed"])
        self.assertEqual(fields[FIELD_DUPLICATE_FILE_STATUS], "Error")
        self.assertIn("503", fields[FIELD_DUPLICATE_CHECK_ERROR])


class CallbackRetryTests(unittest.TestCase):
    """Repeated Lambda callback / Make retry semantics."""

    def test_claim_continuation_within_lease_re_uploads(self):
        started = (datetime.now(DENVER) - timedelta(minutes=5)).isoformat(timespec="milliseconds")
        fields = {
            **BASE_FIELDS,
            FIELD_UPLOAD_STATUS: "Processing",
            FIELD_UPLOAD_CLAIM_RUN_ID: "claim-abc",
            FIELD_PROCESSING_STARTED_AT: started,
        }
        result = _run(fields, payload=_payload(uploadClaimRunId="claim-abc"))
        self.assertEqual(result["actionOut"], "uploaded")
        self.assertEqual(result["claimActionOut"], "claim_continuation")
        self.assertEqual(fields[FIELD_UPLOAD_STATUS], "Uploaded")

    def test_human_decision_not_overwritten_by_repeated_callback(self):
        prior = {
            "id": "recPriorAsset",
            "fields": {
                "Enrollment - Linked": ["recEnroll1"],
                "Video Feedback": ["recVfOld"],
                "Asset Type": "Video Feedback",
                "Upload Destination": "Video Feedback",
                "Submission - Linked": ["recSub1"],
                "Week": "3",
            },
        }
        fields = {**BASE_FIELDS, FIELD_ASSET_REUSE_DECISION: "Approved Reuse"}
        result = _run(fields, matches=[prior])
        self.assertEqual(result["actionOut"], "uploaded")
        # Locked decision: review verdict fields must not be re-written.
        self.assertNotIn(FIELD_ASSET_REUSE_DECISION, result["writebackApplied"])
        self.assertNotIn(FIELD_POTENTIAL_ASSET_REUSE, result["writebackApplied"])
        self.assertNotIn(FIELD_ASSET_REUSE_REVIEW_SUMMARY, result["writebackApplied"])
        self.assertEqual(fields[FIELD_ASSET_REUSE_DECISION], "Approved Reuse")


class ExpiredSourceUrlTests(unittest.TestCase):
    def test_expired_attachment_url_writes_error_and_keeps_claim(self):
        fields = dict(BASE_FIELDS)

        def patch_impl(token, base_id, record_id, patch_fields):
            fields.update(patch_fields)
            return {"id": record_id, "fields": fields}

        with (
            patch("upload_core.processor.get_asset", return_value={"id": RECORD, "fields": dict(fields)}),
            patch("upload_core.processor.patch_asset", side_effect=patch_impl),
            patch(
                "upload_core.processor.http_get_bytes",
                side_effect=RuntimeError("HTTP 410 Gone: expired attachment URL"),
            ),
            patch("upload_core.processor.upload_s3") as mock_s3,
            patch("upload_core.processor.lookup_duplicate_matches", return_value=[]),
        ):
            status, body = process_with_error_writeback(_config(), _payload())

        self.assertEqual(status, 500)
        self.assertEqual(body["statusOut"], "error")
        mock_s3.assert_not_called()
        self.assertEqual(fields[FIELD_UPLOAD_STATUS], "Error")
        self.assertIn("410", fields[FIELD_UPLOAD_ERROR])
        # Claim evidence retained for manual recovery / audit.
        self.assertTrue(fields.get(FIELD_UPLOAD_CLAIM_RUN_ID))


class CanonicalUrlAlreadyPresentTests(unittest.TestCase):
    def test_uploaded_with_canonical_and_hash_skips(self):
        fields = {
            **BASE_FIELDS,
            FIELD_UPLOAD_STATUS: "Uploaded",
            FIELD_CANONICAL_FILE_URL: "https://bucket.s3.us-east-2.amazonaws.com/x",
            FIELD_FILE_CONTENT_HASH: HASH,
        }
        with patch("upload_core.processor.upload_s3") as mock_s3:
            result = _run(fields)
        self.assertEqual(result["actionOut"], "skipped_already_uploaded")
        mock_s3.assert_not_called()

    def test_uploaded_missing_hash_is_not_silently_trusted(self):
        """Uploaded status with a blank hash falls through to claim evaluation.

        Documented behavior: claim evaluation reports skipped_already_uploaded
        (no repair path in v1) — this test pins that so any future change is
        deliberate.
        """
        fields = {
            **BASE_FIELDS,
            FIELD_UPLOAD_STATUS: "Uploaded",
            FIELD_CANONICAL_FILE_URL: "https://bucket.s3.us-east-2.amazonaws.com/x",
            FIELD_FILE_CONTENT_HASH: "",
        }
        with patch("upload_core.processor.upload_s3") as mock_s3:
            result = _run(fields)
        self.assertEqual(result["actionOut"], "skipped_already_uploaded")
        mock_s3.assert_not_called()


class PartialUploadTests(unittest.TestCase):
    def test_s3_failure_leaves_error_status_for_manual_recovery(self):
        fields = dict(BASE_FIELDS)

        def patch_impl(token, base_id, record_id, patch_fields):
            fields.update(patch_fields)
            return {"id": record_id, "fields": fields}

        with (
            patch("upload_core.processor.get_asset", return_value={"id": RECORD, "fields": dict(fields)}),
            patch("upload_core.processor.patch_asset", side_effect=patch_impl),
            patch("upload_core.processor.http_get_bytes", return_value=(b"same-bytes", "video/mp4")),
            patch("upload_core.processor.upload_s3", side_effect=RuntimeError("s3 timeout")),
            patch("upload_core.processor.lookup_duplicate_matches", return_value=[]),
        ):
            status, body = process_with_error_writeback(_config(), _payload())

        self.assertEqual(status, 500)
        self.assertEqual(fields[FIELD_UPLOAD_STATUS], "Error")
        self.assertNotIn(FIELD_CANONICAL_FILE_URL, BASE_FIELDS)
        self.assertFalse(fields.get(FIELD_CANONICAL_FILE_URL))


class UrlAndKeyConventionTests(unittest.TestCase):
    def test_canonical_url_percent_encodes_each_segment(self):
        key = "shooting-challenge/2026-2027/shooting-challenge/schmidt-test/2026-07-23-video-feedback-recX-a b#c.mp4"
        url = canonical_url("shooting-challenge-assets", "us-east-2", key)
        self.assertTrue(
            url.startswith("https://shooting-challenge-assets.s3.us-east-2.amazonaws.com/")
        )
        self.assertNotIn(" ", url)
        self.assertNotIn("#", url)
        self.assertIn("a%20b%23c.mp4", url)

    def test_storage_key_sanitizes_filename(self):
        key = build_storage_key(
            record_id="recX",
            fields=BASE_FIELDS,
            athlete_slug="schmidt-test",
            season_slug="2026-2027",
            challenge_slug="shooting-challenge",
            date_str="2026-07-23",
            filename="../..\\weird name?.mp4",
        )
        self.assertNotIn("..", key.split("/")[-1])
        self.assertNotIn("?", key)
        self.assertNotIn("\\", key)

    def test_guess_mime_prefers_header_then_extension(self):
        self.assertEqual(guess_mime("a.mp4", "video/mp4"), "video/mp4")
        self.assertEqual(guess_mime("a.mp4", "application/octet-stream"), "video/mp4")
        self.assertEqual(guess_mime("a.unknownext", ""), "application/octet-stream")


if __name__ == "__main__":
    unittest.main()
