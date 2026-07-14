"""Offline contracts for Phase C2 combined 013 (VF create/link + Grade Band repair)."""

from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
COMBINED = (
    ROOT
    / "airtable/automations/shooting-challenge"
    / "013-submission-intake-create-or-link-video-feedback.js"
)
ROLLBACK_DIR = (
    ROOT
    / "airtable/automations/shooting-challenge/_rollback/phase-c2-013-111-2026-07-14"
)
LEGACY_111 = (
    ROOT
    / "airtable/automations/shooting-challenge"
    / "111-video-review-and-xp-copy-enrollment-grade-band-to-video-feedback.js"
)


def decide_grade_band_repair(
    *, existing_gb: list[str], enrollment_gb: list[str], has_enrollment: bool
) -> dict:
    if existing_gb:
        return {"action": "already_has_grade_band", "write": False, "ids": existing_gb}
    if not has_enrollment:
        return {"action": "skipped_no_enrollment", "write": False, "ids": []}
    if not enrollment_gb:
        return {"action": "skipped_no_enrollment_grade_band", "write": False, "ids": []}
    return {"action": "copied_grade_band", "write": True, "ids": enrollment_gb}


class TestPhaseC2Combined(unittest.TestCase):
    def test_combined_version_and_markers(self):
        text = COMBINED.read_text(encoding="utf-8")
        self.assertIn("v3.0.0", text)
        self.assertIn("decideGradeBandRepair", text)
        self.assertIn("former 111", text)
        self.assertIn("recheck_video_feedback_before_create", text)
        self.assertIn("gradeBandActionOut", text)
        self.assertIn("blank-only", text)

    def test_rollback_present(self):
        self.assertTrue(
            (ROLLBACK_DIR / "013-submission-intake-create-or-link-video-feedback.js").is_file()
        )
        self.assertTrue(
            (
                ROLLBACK_DIR
                / "111-video-review-and-xp-copy-enrollment-grade-band-to-video-feedback.js"
            ).is_file()
        )
        rb013 = (ROLLBACK_DIR / "013-submission-intake-create-or-link-video-feedback.js").read_text(
            encoding="utf-8"
        )
        self.assertIn("v2.0", rb013)
        self.assertNotIn("LIBRARY ONLY", rb013)
        # Pre-C2 could overwrite mismatched GB
        self.assertIn("!sameIdSet(currentGradeBandIds, gradeBandIds)", rb013)

    def test_111_is_library_stub(self):
        body = LEGACY_111.read_text(encoding="utf-8")
        self.assertIn("LIBRARY ONLY", body)
        self.assertIn("throw new Error", body)

    def test_blank_repair(self):
        r = decide_grade_band_repair(
            existing_gb=[], enrollment_gb=["recGB"], has_enrollment=True
        )
        self.assertTrue(r["write"])
        self.assertEqual(r["action"], "copied_grade_band")

    def test_already_correct_no_write(self):
        r = decide_grade_band_repair(
            existing_gb=["recGB"], enrollment_gb=["recGB"], has_enrollment=True
        )
        self.assertFalse(r["write"])
        self.assertEqual(r["action"], "already_has_grade_band")

    def test_nonempty_different_gb_not_overwritten(self):
        """C2 safer than legacy 111 / pre-C2 013: do not clobber non-empty GB."""
        r = decide_grade_band_repair(
            existing_gb=["recOther"], enrollment_gb=["recGB"], has_enrollment=True
        )
        self.assertFalse(r["write"])
        self.assertEqual(r["action"], "already_has_grade_band")

    def test_missing_enrollment_gb(self):
        r = decide_grade_band_repair(existing_gb=[], enrollment_gb=[], has_enrollment=True)
        self.assertFalse(r["write"])
        self.assertEqual(r["action"], "skipped_no_enrollment_grade_band")

    def test_missing_enrollment(self):
        r = decide_grade_band_repair(existing_gb=[], enrollment_gb=["recGB"], has_enrollment=False)
        self.assertFalse(r["write"])
        self.assertEqual(r["action"], "skipped_no_enrollment")

    def test_dedupe_markers_preserved(self):
        text = COMBINED.read_text(encoding="utf-8")
        self.assertIn("recheck_video_feedback_before_create", text)
        self.assertIn("findExistingVideoFeedback", text)
        self.assertIn("created_new_video_feedback", text)
        self.assertIn("linked_existing_or_repaired", text)
        self.assertIn('videoKeyPrefix: "VIDEO_FEEDBACK"', text)


if __name__ == "__main__":
    unittest.main()
