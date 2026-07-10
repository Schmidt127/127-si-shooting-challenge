#!/usr/bin/env python3
"""Unit tests for contextual asset-reuse classification (no AWS/Airtable)."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from upload_core.duplicate import (
    REASON_CROSS_ENROLLMENT_INFO,
    REASON_DIFF_ASSIGNMENT,
    REASON_DIFF_SUBMISSION,
    REASON_DIFF_WEEK,
    REASON_HOMEWORK_FOR_VF,
    REASON_MISSING_CONTEXT,
    REASON_MULTIPLE_PRIOR,
    REASON_SAME_ASSIGNMENT_RESUB,
    REASON_VF_FOR_HOMEWORK,
    build_review_writeback,
    classify_duplicate_matches,
    compare_pair_reasons,
    extract_asset_context,
    human_decision_is_locked,
    select_primary_match,
)
from upload_core.fields import (
    ASSET_REUSE_DECISION_NOT_REVIEWED,
    FIELD_ASSET_REUSE_DECISION,
    FIELD_ASSET_REUSE_REVIEW_PRIMARY_REASON,
    FIELD_DUPLICATE_MATCH_RECORDS_ALL,
    FIELD_EXACT_HASH_MATCH_FOUND,
    FIELD_POTENTIAL_ASSET_REUSE,
    FIELD_SAME_ENROLLMENT_MATCH_FOUND,
)

HASH = "a" * 64
ENROLL = "recEnrollAAA"
OTHER_ENROLL = "recEnrollBBB"


def _asset(
    record_id: str,
    *,
    enrollment: str = ENROLL,
    asset_type: str = "Homework",
    purpose: str = "Homework",
    destination: str = "Homework",
    homework: list[str] | None = None,
    homework_label: str = "HW 1",
    week: str = "2",
    submission: str = "recSubA",
    vf: list[str] | None = None,
    uploaded_at: str = "2026-07-01T10:00:00.000-06:00",
) -> dict:
    return {
        "id": record_id,
        "fields": {
            "Enrollment - Linked": [enrollment],
            "Asset Type": asset_type,
            "Asset Purpose": purpose,
            "Upload Destination": destination,
            "Homework Completions": homework or ["recHc1"],
            "Homework Name - Slot Correct": homework_label,
            "Week": week,
            "Submission - Linked": [submission],
            "Video Feedback": vf or [],
            "Uploaded At": uploaded_at,
            "File Content Hash": HASH,
            "Canonical File URL": f"https://example.com/{record_id}",
        },
    }


class DuplicateReviewTests(unittest.TestCase):
    def test_same_assignment_resubmission(self):
        current = extract_asset_context("recNew", _asset("recNew")["fields"])
        prior = extract_asset_context("recOld", _asset("recOld", uploaded_at="2026-06-01T10:00:00.000-06:00")["fields"])
        reasons = compare_pair_reasons(current, prior)
        self.assertIn(REASON_SAME_ASSIGNMENT_RESUB, reasons)

    def test_different_homework_assignment(self):
        current = extract_asset_context("recNew", _asset("recNew", homework=["recHc2"], homework_label="HW 2")["fields"])
        prior = extract_asset_context("recOld", _asset("recOld")["fields"])
        reasons = compare_pair_reasons(current, prior)
        self.assertIn(REASON_DIFF_ASSIGNMENT, reasons)

    def test_different_week(self):
        current = extract_asset_context("recNew", _asset("recNew", week="5")["fields"])
        prior = extract_asset_context("recOld", _asset("recOld", week="2")["fields"])
        reasons = compare_pair_reasons(current, prior)
        self.assertIn(REASON_DIFF_WEEK, reasons)

    def test_different_submission(self):
        current = extract_asset_context("recNew", _asset("recNew", submission="recSubB")["fields"])
        prior = extract_asset_context("recOld", _asset("recOld", submission="recSubA")["fields"])
        reasons = compare_pair_reasons(current, prior)
        self.assertIn(REASON_DIFF_SUBMISSION, reasons)

    def test_homework_reused_for_video_feedback(self):
        current = extract_asset_context(
            "recNew",
            _asset(
                "recNew",
                asset_type="Video",
                purpose="Video Feedback",
                destination="Video Feedback",
                homework=[],
                vf=["recVf1"],
            )["fields"],
        )
        prior = extract_asset_context("recOld", _asset("recOld")["fields"])
        reasons = compare_pair_reasons(current, prior)
        self.assertIn(REASON_HOMEWORK_FOR_VF, reasons)

    def test_video_feedback_reused_as_homework(self):
        current = extract_asset_context("recNew", _asset("recNew")["fields"])
        prior = extract_asset_context(
            "recOld",
            _asset(
                "recOld",
                asset_type="Video",
                purpose="Video Feedback",
                destination="Video Feedback",
                homework=[],
                vf=["recVf1"],
            )["fields"],
        )
        reasons = compare_pair_reasons(current, prior)
        self.assertIn(REASON_VF_FOR_HOMEWORK, reasons)

    def test_cross_enrollment_informational_only(self):
        current_fields = _asset("recNew")["fields"]
        matches = [_asset("recOther", enrollment=OTHER_ENROLL)]
        classification = classify_duplicate_matches(
            current_record_id="recNew",
            current_fields=current_fields,
            matches=matches,
        )
        self.assertTrue(classification.exact_hash_match)
        self.assertFalse(classification.potential_reuse)
        self.assertEqual(len(classification.same_enrollment_matches), 0)
        self.assertIn(REASON_CROSS_ENROLLMENT_INFO, classification.all_reasons)

    def test_missing_context_triggers_review(self):
        current_fields = {
            "Enrollment - Linked": [ENROLL],
            "Asset Type": "",
            "Asset Purpose": "",
            "Upload Destination": "",
        }
        matches = [_asset("recOld")]
        classification = classify_duplicate_matches(
            current_record_id="recNew",
            current_fields=current_fields,
            matches=matches,
        )
        self.assertTrue(classification.potential_reuse)
        self.assertIn(REASON_MISSING_CONTEXT, classification.all_reasons)

    def test_multiple_prior_matches_retained(self):
        matches = [
            _asset("recPrior1", week="1", uploaded_at="2026-06-01T10:00:00.000-06:00"),
            _asset("recPrior2", week="3", uploaded_at="2026-06-15T10:00:00.000-06:00"),
        ]
        classification = classify_duplicate_matches(
            current_record_id="recNew",
            current_fields=_asset("recNew", week="5")["fields"],
            matches=matches,
        )
        self.assertEqual(len(classification.same_enrollment_matches), 2)
        self.assertIn(REASON_MULTIPLE_PRIOR, classification.all_reasons)
        wb = build_review_writeback(classification, existing_fields={}, file_hash=HASH)
        self.assertEqual(len(wb[FIELD_DUPLICATE_MATCH_RECORDS_ALL]), 2)

    def test_primary_match_severity_order(self):
        hw_prior = _asset("recPriorHW", week="5", uploaded_at="2026-06-20T10:00:00.000-06:00")
        vf_diff_week = _asset(
            "recPriorVFWeek",
            asset_type="Video",
            purpose="Video Feedback",
            destination="Video Feedback",
            homework=[],
            vf=["recVf9"],
            week="1",
            uploaded_at="2026-06-01T10:00:00.000-06:00",
        )
        current_fields = _asset(
            "recNew",
            asset_type="Video",
            purpose="Video Feedback",
            destination="Video Feedback",
            homework=[],
            vf=["recVf1"],
            week="5",
        )["fields"]
        classification = classify_duplicate_matches(
            current_record_id="recNew",
            current_fields=current_fields,
            matches=[vf_diff_week, hw_prior],
        )
        self.assertEqual(classification.primary_match["id"], "recPriorHW")
        self.assertEqual(classification.primary_reason, REASON_HOMEWORK_FOR_VF)

    def test_primary_tiebreak_earliest_uploaded_at(self):
        later = _asset("recLater", week="1", uploaded_at="2026-06-20T10:00:00.000-06:00")
        earlier = _asset("recEarlier", week="3", uploaded_at="2026-06-01T10:00:00.000-06:00")
        current_fields = _asset("recNew", week="5")["fields"]
        classification = classify_duplicate_matches(
            current_record_id="recNew",
            current_fields=current_fields,
            matches=[later, earlier],
        )
        self.assertEqual(classification.primary_match["id"], "recEarlier")

    def test_human_decision_never_overwritten(self):
        matches = [_asset("recOld", week="1")]
        classification = classify_duplicate_matches(
            current_record_id="recNew",
            current_fields=_asset("recNew", week="5")["fields"],
            matches=matches,
        )
        existing = {FIELD_ASSET_REUSE_DECISION: "Allowed — Legitimate Reuse"}
        wb = build_review_writeback(classification, existing_fields=existing, file_hash=HASH)
        self.assertNotIn(FIELD_ASSET_REUSE_DECISION, wb)
        self.assertNotIn(FIELD_POTENTIAL_ASSET_REUSE, wb)
        self.assertNotIn(FIELD_ASSET_REUSE_REVIEW_PRIMARY_REASON, wb)

    def test_default_decision_initialized_when_blank(self):
        classification = classify_duplicate_matches(
            current_record_id="recNew",
            current_fields=_asset("recNew", week="5")["fields"],
            matches=[_asset("recOld", week="1")],
        )
        wb = build_review_writeback(classification, existing_fields={}, file_hash=HASH)
        self.assertEqual(wb[FIELD_ASSET_REUSE_DECISION], ASSET_REUSE_DECISION_NOT_REVIEWED)
        self.assertTrue(wb[FIELD_POTENTIAL_ASSET_REUSE])

    def test_exact_hash_flags(self):
        classification = classify_duplicate_matches(
            current_record_id="recNew",
            current_fields=_asset("recNew")["fields"],
            matches=[_asset("recOld", enrollment=OTHER_ENROLL)],
        )
        wb = build_review_writeback(classification, existing_fields={}, file_hash=HASH)
        self.assertTrue(wb[FIELD_EXACT_HASH_MATCH_FOUND])
        self.assertFalse(wb[FIELD_SAME_ENROLLMENT_MATCH_FOUND])
        self.assertFalse(wb[FIELD_POTENTIAL_ASSET_REUSE])

    def test_select_primary_match_helper(self):
        current = extract_asset_context("recNew", _asset("recNew", week="5")["fields"])
        m1 = _asset("recA", week="1")
        m2 = _asset(
            "recB",
            asset_type="Video",
            purpose="Video Feedback",
            destination="Video Feedback",
            homework=[],
            vf=["recVf"],
        )
        pair = {
            "recA": [REASON_DIFF_WEEK],
            "recB": [REASON_HOMEWORK_FOR_VF],
        }
        primary, reason = select_primary_match(current, [m1, m2], pair)
        self.assertEqual(primary["id"], "recB")
        self.assertEqual(reason, REASON_HOMEWORK_FOR_VF)

    def test_human_decision_locked_helper(self):
        self.assertTrue(human_decision_is_locked({FIELD_ASSET_REUSE_DECISION: "Confirmed Duplicate"}))
        self.assertFalse(human_decision_is_locked({FIELD_ASSET_REUSE_DECISION: ASSET_REUSE_DECISION_NOT_REVIEWED}))
        self.assertFalse(human_decision_is_locked({}))


if __name__ == "__main__":
    unittest.main()
