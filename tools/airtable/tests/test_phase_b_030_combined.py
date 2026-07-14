"""Offline contracts for Phase B combined 030 (GB + Goal + Homework bootstrap)."""

from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
COMBINED = (
    ROOT
    / "airtable/automations/shooting-challenge"
    / "030-weekly-summary-and-goal-logic-bootstrap-grade-band-goal-and-homework.js"
)
ROLLBACK_DIR = (
    ROOT
    / "airtable/automations/shooting-challenge/_rollback/phase-b-030-032-033-2026-07-14"
)
LEGACY_030 = (
    ROOT
    / "airtable/automations/shooting-challenge"
    / "030-weekly-summary-and-goal-logic-copy-enrollment-grade-band-to-weekly-summary.js"
)
LEGACY_032 = (
    ROOT
    / "airtable/automations/shooting-challenge"
    / "032-weekly-summary-and-goal-logic-link-challenge-goal-record-to-weekly-athlete-summary.js"
)
LEGACY_033 = (
    ROOT
    / "airtable/automations/shooting-challenge"
    / "033-weekly-summary-and-goal-logic-assign-homework-to-weekly-athlete-summary.js"
)


def plan_bootstrap(
    *,
    enrollment_id: str,
    week_id: str,
    existing_gb: str,
    enrollment_gb: str,
    existing_goal: str,
    goal_matches: list[str],
    existing_hw: list[str],
    hw_matches: list[str],
) -> dict:
    """Mirror orchestrator decision order for offline unit tests."""
    actions: dict[str, str] = {}
    updates: dict[str, object] = {}
    grade_band = existing_gb

    # Step A
    if existing_gb:
        actions["A"] = "already_has_grade_band"
    else:
        if not enrollment_id:
            return {"error": "missing_enrollment", "actions": actions, "updates": updates}
        if not week_id:
            return {"error": "missing_week", "actions": actions, "updates": updates}
        if not enrollment_gb:
            actions["A"] = "skipped_no_enrollment_grade_band"
        else:
            grade_band = enrollment_gb
            updates["Grade Band"] = [enrollment_gb]
            actions["A"] = "copied_grade_band"

    # Step B
    if existing_goal:
        actions["B"] = "already_linked"
    elif not week_id or not grade_band:
        actions["B"] = "skipped_prereq_missing"
    elif len(goal_matches) == 0:
        actions["B"] = "skipped_no_matching_challenge_goal_record"
    elif len(goal_matches) > 1:
        return {
            "error": "duplicate_goals",
            "actions": actions,
            "updates": updates,
            "grade_band": grade_band,
        }
    else:
        updates["Goal Record"] = [goal_matches[0]]
        actions["B"] = "linked_goal_record"

    # Step C
    if existing_hw:
        actions["C"] = "already_assigned"
    elif not week_id or not grade_band:
        actions["C"] = "skipped_prereq_missing"
    elif len(hw_matches) == 0:
        actions["C"] = "skipped_no_matching_homework"
    else:
        updates["Homework"] = list(hw_matches)
        actions["C"] = "assigned_homework"

    any_write = bool(updates)
    status = "success" if any_write else "skipped"
    return {
        "error": None,
        "actions": actions,
        "updates": updates,
        "grade_band": grade_band,
        "status": status,
        "all_skipped": not any_write,
    }


class TestPhaseBCombined(unittest.TestCase):
    def test_combined_file_orders_steps(self):
        text = COMBINED.read_text(encoding="utf-8")
        self.assertIn("Step A Copy Grade Band", text)
        self.assertIn("Step B Link Goal Record", text)
        self.assertIn("Step C Assign Homework", text)
        self.assertLess(text.index("Step A"), text.index("Step B"))
        self.assertLess(text.index("Step B"), text.index("Step C"))
        self.assertIn("Match ANY", text)
        self.assertIn("Atomic write", text)
        self.assertIn("v1.0.0", text)
        self.assertIn("skipped_prereq_missing", text)

    def test_rollback_copies_present_and_runnable(self):
        for name in (
            "030-weekly-summary-and-goal-logic-copy-enrollment-grade-band-to-weekly-summary.js",
            "032-weekly-summary-and-goal-logic-link-challenge-goal-record-to-weekly-athlete-summary.js",
            "033-weekly-summary-and-goal-logic-assign-homework-to-weekly-athlete-summary.js",
        ):
            path = ROLLBACK_DIR / name
            self.assertTrue(path.is_file(), name)
            body = path.read_text(encoding="utf-8")
            self.assertNotIn("library-only after Phase B", body)
            self.assertIn("await main()", body)

    def test_legacy_paths_are_library_stubs(self):
        for path in (LEGACY_030, LEGACY_032, LEGACY_033):
            body = path.read_text(encoding="utf-8")
            self.assertIn("LIBRARY ONLY", body)
            self.assertIn("throw new Error", body)
            self.assertIn("bootstrap-grade-band-goal-and-homework", body)

    def test_full_bootstrap_all_three_steps(self):
        r = plan_bootstrap(
            enrollment_id="recEnr",
            week_id="recWeek",
            existing_gb="",
            enrollment_gb="recGB",
            existing_goal="",
            goal_matches=["recGoal"],
            existing_hw=[],
            hw_matches=["recHw1", "recHw2"],
        )
        self.assertIsNone(r["error"])
        self.assertEqual(r["actions"]["A"], "copied_grade_band")
        self.assertEqual(r["actions"]["B"], "linked_goal_record")
        self.assertEqual(r["actions"]["C"], "assigned_homework")
        self.assertEqual(r["updates"]["Grade Band"], ["recGB"])
        self.assertEqual(r["updates"]["Goal Record"], ["recGoal"])
        self.assertEqual(r["updates"]["Homework"], ["recHw1", "recHw2"])
        self.assertEqual(r["status"], "success")

    def test_missing_grade_band_only(self):
        r = plan_bootstrap(
            enrollment_id="recEnr",
            week_id="recWeek",
            existing_gb="",
            enrollment_gb="recGB",
            existing_goal="recGoal",
            goal_matches=["recGoal"],
            existing_hw=["recHw"],
            hw_matches=["recHw"],
        )
        self.assertEqual(r["actions"]["A"], "copied_grade_band")
        self.assertEqual(r["actions"]["B"], "already_linked")
        self.assertEqual(r["actions"]["C"], "already_assigned")
        self.assertEqual(list(r["updates"].keys()), ["Grade Band"])

    def test_missing_goal_only(self):
        r = plan_bootstrap(
            enrollment_id="recEnr",
            week_id="recWeek",
            existing_gb="recGB",
            enrollment_gb="recGB",
            existing_goal="",
            goal_matches=["recGoal"],
            existing_hw=["recHw"],
            hw_matches=["recHw"],
        )
        self.assertEqual(r["actions"]["A"], "already_has_grade_band")
        self.assertEqual(r["actions"]["B"], "linked_goal_record")
        self.assertEqual(r["actions"]["C"], "already_assigned")
        self.assertEqual(list(r["updates"].keys()), ["Goal Record"])

    def test_missing_homework_only(self):
        r = plan_bootstrap(
            enrollment_id="recEnr",
            week_id="recWeek",
            existing_gb="recGB",
            enrollment_gb="recGB",
            existing_goal="recGoal",
            goal_matches=["recGoal"],
            existing_hw=[],
            hw_matches=["recHw"],
        )
        self.assertEqual(r["actions"]["C"], "assigned_homework")
        self.assertEqual(list(r["updates"].keys()), ["Homework"])

    def test_already_correct_all_skipped(self):
        r = plan_bootstrap(
            enrollment_id="recEnr",
            week_id="recWeek",
            existing_gb="recGB",
            enrollment_gb="recGB",
            existing_goal="recGoal",
            goal_matches=["recGoal"],
            existing_hw=["recHw"],
            hw_matches=["recHw"],
        )
        self.assertTrue(r["all_skipped"])
        self.assertEqual(r["status"], "skipped")
        self.assertEqual(r["actions"]["A"], "already_has_grade_band")
        self.assertEqual(r["actions"]["B"], "already_linked")
        self.assertEqual(r["actions"]["C"], "already_assigned")

    def test_repeated_edit_idempotent(self):
        first = plan_bootstrap(
            enrollment_id="recEnr",
            week_id="recWeek",
            existing_gb="",
            enrollment_gb="recGB",
            existing_goal="",
            goal_matches=["recGoal"],
            existing_hw=[],
            hw_matches=["recHw"],
        )
        second = plan_bootstrap(
            enrollment_id="recEnr",
            week_id="recWeek",
            existing_gb="recGB",
            enrollment_gb="recGB",
            existing_goal="recGoal",
            goal_matches=["recGoal"],
            existing_hw=["recHw"],
            hw_matches=["recHw"],
        )
        self.assertEqual(first["status"], "success")
        self.assertTrue(second["all_skipped"])

    def test_prereq_soft_skip_when_no_gb(self):
        r = plan_bootstrap(
            enrollment_id="recEnr",
            week_id="recWeek",
            existing_gb="",
            enrollment_gb="",
            existing_goal="",
            goal_matches=["recGoal"],
            existing_hw=[],
            hw_matches=["recHw"],
        )
        self.assertEqual(r["actions"]["A"], "skipped_no_enrollment_grade_band")
        self.assertEqual(r["actions"]["B"], "skipped_prereq_missing")
        self.assertEqual(r["actions"]["C"], "skipped_prereq_missing")
        self.assertTrue(r["all_skipped"])

    def test_missing_enrollment_errors(self):
        r = plan_bootstrap(
            enrollment_id="",
            week_id="recWeek",
            existing_gb="",
            enrollment_gb="recGB",
            existing_goal="",
            goal_matches=[],
            existing_hw=[],
            hw_matches=[],
        )
        self.assertEqual(r["error"], "missing_enrollment")

    def test_duplicate_goals_error(self):
        r = plan_bootstrap(
            enrollment_id="recEnr",
            week_id="recWeek",
            existing_gb="recGB",
            enrollment_gb="recGB",
            existing_goal="",
            goal_matches=["recG1", "recG2"],
            existing_hw=[],
            hw_matches=[],
        )
        self.assertEqual(r["error"], "duplicate_goals")

    def test_no_goal_match_still_assigns_homework(self):
        r = plan_bootstrap(
            enrollment_id="recEnr",
            week_id="recWeek",
            existing_gb="recGB",
            enrollment_gb="recGB",
            existing_goal="",
            goal_matches=[],
            existing_hw=[],
            hw_matches=["recHw"],
        )
        self.assertEqual(r["actions"]["B"], "skipped_no_matching_challenge_goal_record")
        self.assertEqual(r["actions"]["C"], "assigned_homework")
        self.assertEqual(list(r["updates"].keys()), ["Homework"])

    def test_trigger_doc_covers_three_former_arms(self):
        text = COMBINED.read_text(encoding="utf-8")
        self.assertIn("Grade Band is empty", text)
        self.assertIn("Goal Record is empty", text)
        self.assertIn("Homework is empty", text)
        self.assertIn("031", text)
        self.assertIn("034", text)


if __name__ == "__main__":
    unittest.main()
