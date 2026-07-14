"""Offline contracts for Phase C1 combined 020 (HC link/create + Grade Band repair)."""

from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
COMBINED = (
    ROOT
    / "airtable/automations/shooting-challenge"
    / "020-homework-link-or-create-homework-completion.js"
)
ROLLBACK_DIR = (
    ROOT
    / "airtable/automations/shooting-challenge/_rollback/phase-c1-020-063-2026-07-14"
)
LEGACY_063 = (
    ROOT
    / "airtable/automations/shooting-challenge"
    / "063-homework-review-and-xp-copy-enrollment-grade-band-to-homework-completion.js"
)


def resolve_grade_band(*, submission_gb: list[str], enrollment_gb: list[str]) -> dict:
    if submission_gb:
        return {"ids": list(submission_gb), "source": "submission", "action": "copied_grade_band"}
    if enrollment_gb:
        return {"ids": list(enrollment_gb), "source": "enrollment", "action": "copied_grade_band"}
    return {"ids": [], "source": "none", "action": "skipped_no_enrollment_grade_band"}


def repair_if_blank(*, existing_gb: list[str], enrollment_gb: list[str], has_enrollment: bool) -> dict:
    if existing_gb:
        return {"action": "already_has_grade_band", "write": False, "ids": existing_gb}
    if not has_enrollment:
        return {"action": "skipped_no_enrollment", "write": False, "ids": []}
    if not enrollment_gb:
        return {"action": "skipped_no_enrollment_grade_band", "write": False, "ids": []}
    return {"action": "copied_grade_band", "write": True, "ids": enrollment_gb}


class TestPhaseC1Combined(unittest.TestCase):
    def test_combined_version_and_helpers(self):
        text = COMBINED.read_text(encoding="utf-8")
        self.assertIn("v3.0.0", text)
        self.assertIn("repairHomeworkGradeBandIfBlank", text)
        self.assertIn("resolveGradeBandIds", text)
        self.assertIn("former 063", text)
        self.assertIn("Enrollments", text)
        self.assertIn("recheck_homework_completion_before_create", text)
        self.assertIn("gradeBandActionOut", text)

    def test_rollback_present(self):
        self.assertTrue(
            (ROLLBACK_DIR / "020-homework-link-or-create-homework-completion.js").is_file()
        )
        self.assertTrue(
            (
                ROLLBACK_DIR
                / "063-homework-review-and-xp-copy-enrollment-grade-band-to-homework-completion.js"
            ).is_file()
        )
        rb020 = (ROLLBACK_DIR / "020-homework-link-or-create-homework-completion.js").read_text(
            encoding="utf-8"
        )
        self.assertIn("v2.3", rb020)
        self.assertNotIn("LIBRARY ONLY", rb020)

    def test_063_is_library_stub(self):
        body = LEGACY_063.read_text(encoding="utf-8")
        self.assertIn("LIBRARY ONLY", body)
        self.assertIn("throw new Error", body)

    def test_prefer_submission_gb_on_create(self):
        r = resolve_grade_band(submission_gb=["recSubGB"], enrollment_gb=["recEnrGB"])
        self.assertEqual(r["ids"], ["recSubGB"])
        self.assertEqual(r["source"], "submission")

    def test_fallback_enrollment_gb(self):
        r = resolve_grade_band(submission_gb=[], enrollment_gb=["recEnrGB"])
        self.assertEqual(r["ids"], ["recEnrGB"])
        self.assertEqual(r["source"], "enrollment")

    def test_missing_enrollment_gb(self):
        r = resolve_grade_band(submission_gb=[], enrollment_gb=[])
        self.assertEqual(r["ids"], [])
        self.assertEqual(r["action"], "skipped_no_enrollment_grade_band")

    def test_blank_repair(self):
        r = repair_if_blank(existing_gb=[], enrollment_gb=["recGB"], has_enrollment=True)
        self.assertTrue(r["write"])
        self.assertEqual(r["action"], "copied_grade_band")

    def test_already_correct_no_write(self):
        r = repair_if_blank(existing_gb=["recGB"], enrollment_gb=["recGB"], has_enrollment=True)
        self.assertFalse(r["write"])
        self.assertEqual(r["action"], "already_has_grade_band")

    def test_nonempty_different_gb_not_overwritten(self):
        """C1 safer than legacy 063: do not clobber non-empty GB."""
        r = repair_if_blank(existing_gb=["recOther"], enrollment_gb=["recGB"], has_enrollment=True)
        self.assertFalse(r["write"])
        self.assertEqual(r["action"], "already_has_grade_band")

    def test_dedupe_markers_preserved(self):
        text = COMBINED.read_text(encoding="utf-8")
        self.assertIn("recheck_found_existing_before_create", text)
        self.assertIn("linked_existing_duplicate_resolved", text)
        self.assertIn("created_new", text)


if __name__ == "__main__":
    unittest.main()
