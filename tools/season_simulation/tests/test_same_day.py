#!/usr/bin/env python3
"""Same-day / Perfect Week Season Sim contract tests (offline)."""

from __future__ import annotations

import re
import sys
import unittest
from pathlib import Path

PACKAGE_PARENT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PACKAGE_PARENT))

from season_simulation.same_day_contracts import (  # noqa: E402
    APPROVED_PASTE_FIELD_NAMES,
    FIELD_ID_SEASON_SIM_CLOCK_NOW,
    FIELD_ID_SEASON_SIM_TEST_RECORD,
    FIELD_ID_SEASON_SIM_TEST_SUBMITTED_AT,
    FIELD_ID_SUBMITTED_AT,
    FIELD_ID_VIDEO_UPLOAD_NOTE,
    PERFECT_WEEK_GRACE_ROLLBACK,
    PERFECT_WEEK_GRACE_TEMPORARY,
    SUBMITTED_SAME_DAY_ROLLBACK,
    SUBMITTED_SAME_DAY_TEMPORARY,
    assert_paste_formula_safe,
    assess_same_day_readiness,
    extract_field_references,
    inspect_perfect_week_grace_formula,
    inspect_submitted_same_day_formula,
    ordinary_same_day_result,
    perfect_week_grace_branch_result,
    simulated_same_day_result,
    submitted_same_day_branch_result,
    validate_all_paste_formulas,
)
from season_simulation.simulation_clock import FIELD_ID_ACTIVITY_DATE  # noqa: E402

PASTE_PACKETS = (
    ("Submitted Same Day? temporary", SUBMITTED_SAME_DAY_TEMPORARY),
    ("Submitted Same Day? rollback", SUBMITTED_SAME_DAY_ROLLBACK),
    ("Perfect Week Grace temporary", PERFECT_WEEK_GRACE_TEMPORARY),
    ("Perfect Week Grace rollback", PERFECT_WEEK_GRACE_ROLLBACK),
)


def _meta(
    *,
    submitted_same_day: str,
    grace: str,
    activity_gate: str | None = None,
) -> list[dict]:
    fields = [
        {
            "id": FIELD_ID_SUBMITTED_AT,
            "name": "Submitted At",
            "type": "formula",
            "options": {"formula": "CREATED_TIME()"},
        },
        {
            "id": "fldE7G8H1O7HPYuIi",
            "name": "Submitted Same Day?",
            "type": "formula",
            "options": {"formula": submitted_same_day},
        },
        {
            "id": "fldLo2GO5aac6tPX1",
            "name": "Perfect Week Grace Eligible?",
            "type": "formula",
            "options": {"formula": grace},
        },
        {
            "id": FIELD_ID_ACTIVITY_DATE,
            "name": "Activity Date",
            "type": "date",
        },
        {
            "id": FIELD_ID_VIDEO_UPLOAD_NOTE,
            "name": "Video Upload Note",
            "type": "multilineText",
        },
        {
            "id": FIELD_ID_SEASON_SIM_TEST_RECORD,
            "name": "Season Sim Test Record?",
            "type": "checkbox",
        },
        {
            "id": FIELD_ID_SEASON_SIM_CLOCK_NOW,
            "name": "Season Sim Clock Now",
            "type": "dateTime",
        },
        {
            "id": FIELD_ID_SEASON_SIM_TEST_SUBMITTED_AT,
            "name": "Season Sim Test Submitted At",
            "type": "dateTime",
        },
    ]
    if activity_gate is not None:
        fields.append(
            {
                "id": "fldyFAjhbfaC4LlPb",
                "name": "Activity Date Is Future?",
                "type": "formula",
                "options": {"formula": activity_gate},
            }
        )
    return [{"name": "Submissions", "fields": fields}]


class TestPasteFormulaSafety(unittest.TestCase):
    def test_validate_all_paste_formulas(self):
        validate_all_paste_formulas()

    def test_no_hardcoded_record_ids_or_pw_test_fields(self):
        for label, formula in PASTE_PACKETS:
            with self.subTest(label=label):
                assert_paste_formula_safe(formula, label=label)
                self.assertIsNone(re.search(r"\brec[A-Za-z0-9]{14}\b", formula))
                self.assertNotIn("Perfect Week Test Record?", formula)
                self.assertNotIn("Perfect Week Test Submitted At", formula)
                self.assertNotIn("Enrollment Record ID Lookup", formula)
                self.assertNotIn("ARRAYJOIN", formula)
                self.assertNotIn("IFERROR(", formula)
                self.assertIsNone(re.search(r"'[^'\\]*'", formula))
                refs = extract_field_references(formula)
                self.assertTrue(refs <= APPROVED_PASTE_FIELD_NAMES, refs)

    def test_temporary_uses_only_approved_season_sim_gates(self):
        for formula in (SUBMITTED_SAME_DAY_TEMPORARY, PERFECT_WEEK_GRACE_TEMPORARY):
            self.assertIn("{Season Sim Test Record?}", formula)
            self.assertIn("SEASON-SIM|", formula)
            self.assertIn("{Season Sim Test Submitted At}", formula)
            self.assertIn("{Video Upload Note}", formula)
            self.assertIn("{Submitted At}", formula)
        self.assertIn("{Season Sim Clock Now}", PERFECT_WEEK_GRACE_TEMPORARY)


class TestBranchSelection(unittest.TestCase):
    def test_sim_record_takes_season_sim_same_day_branch(self):
        branch, value = submitted_same_day_branch_result(
            season_sim_test_record=True,
            video_upload_note="SEASON-SIM|RUN1",
            season_sim_test_submitted_at_date="2027-05-08",
            submitted_at_date="2026-09-02",
            activity_date="2027-05-08",
        )
        self.assertEqual(branch, "season_sim")
        self.assertEqual(value, 1)
        # Wall-clock Submitted At must not decide the sim branch.
        self.assertEqual(
            ordinary_same_day_result(
                submitted_at_date="2026-09-02",
                activity_date="2027-05-08",
            ),
            0,
        )

    def test_ordinary_record_takes_submitted_at_branch(self):
        branch, value = submitted_same_day_branch_result(
            season_sim_test_record=False,
            video_upload_note="parent note",
            season_sim_test_submitted_at_date="2027-05-08",
            submitted_at_date="2026-09-02",
            activity_date="2026-09-02",
        )
        self.assertEqual(branch, "ordinary")
        self.assertEqual(value, 1)
        # Checkbox alone is not enough without SEASON-SIM| marker.
        branch2, _ = submitted_same_day_branch_result(
            season_sim_test_record=True,
            video_upload_note="missing marker",
            season_sim_test_submitted_at_date="2027-05-08",
            submitted_at_date="2026-09-02",
            activity_date="2026-09-02",
        )
        self.assertEqual(branch2, "ordinary")

    def test_sim_grace_uses_clock_now_not_today(self):
        branch, value = perfect_week_grace_branch_result(
            season_sim_test_record=True,
            video_upload_note="SEASON-SIM|RUN1",
            manual_exception=False,
            count_this_submission=True,
            activity_date="2027-05-08",
            season_sim_test_submitted_at_date="2027-05-08",
            season_sim_clock_now_date="2027-05-08",
            submitted_at_date="2026-09-02",
            today_date="2026-09-02",
            within_48h=True,
        )
        self.assertEqual(branch, "season_sim")
        self.assertEqual(value, 1)
        # Same row without sim gate would fail vs TODAY() in 2026.
        branch2, value2 = perfect_week_grace_branch_result(
            season_sim_test_record=False,
            video_upload_note="",
            manual_exception=False,
            count_this_submission=True,
            activity_date="2027-05-08",
            season_sim_test_submitted_at_date="2027-05-08",
            season_sim_clock_now_date="2027-05-08",
            submitted_at_date="2026-09-02",
            today_date="2026-09-02",
            within_48h=True,
        )
        self.assertEqual(branch2, "none")
        self.assertEqual(value2, 0)

    def test_ordinary_grace_uses_submitted_at_and_today(self):
        branch, value = perfect_week_grace_branch_result(
            season_sim_test_record=False,
            video_upload_note="",
            manual_exception=False,
            count_this_submission=True,
            activity_date="2026-09-01",
            season_sim_test_submitted_at_date="",
            season_sim_clock_now_date="",
            submitted_at_date="2026-09-01",
            today_date="2026-09-02",
            within_48h=True,
        )
        self.assertEqual(branch, "ordinary")
        self.assertEqual(value, 1)


class TestSameDayContracts(unittest.TestCase):
    def test_live_style_formulas_are_not_gated(self):
        meta = _meta(
            submitted_same_day=SUBMITTED_SAME_DAY_ROLLBACK,
            grace=PERFECT_WEEK_GRACE_ROLLBACK,
        )
        same = inspect_submitted_same_day_formula(meta)
        grace = inspect_perfect_week_grace_formula(meta)
        self.assertFalse(same.gated_season_sim_active)
        self.assertFalse(grace.gated_season_sim_active)
        readiness = assess_same_day_readiness(meta, activity_date_gate_active=True)
        self.assertFalse(readiness.same_day_logic_accurate_for_sim)
        self.assertTrue(readiness.submitted_at_is_created_time)

    def test_temporary_formulas_detected_as_gated(self):
        meta = _meta(
            submitted_same_day=SUBMITTED_SAME_DAY_TEMPORARY,
            grace=PERFECT_WEEK_GRACE_TEMPORARY,
        )
        same = inspect_submitted_same_day_formula(meta)
        grace = inspect_perfect_week_grace_formula(meta)
        self.assertTrue(same.gated_season_sim_active)
        self.assertTrue(grace.gated_season_sim_active)
        self.assertTrue(same.safe_for_normal_athletes)
        self.assertTrue(grace.safe_for_normal_athletes)
        readiness = assess_same_day_readiness(meta, activity_date_gate_active=True)
        self.assertTrue(readiness.same_day_logic_accurate_for_sim)
        self.assertTrue(readiness.sufficient_for_same_day_perfect_week)

    def test_live_meta_field_id_formulas_detected_as_gated(self):
        """Production Meta API stores {fld…} refs after paste — must still gate."""
        same_day_ids = (
            "IF(\n"
            "  AND(\n"
            f"    {{{FIELD_ID_SEASON_SIM_TEST_RECORD}}},\n"
            f'    FIND("SEASON-SIM|", {{{FIELD_ID_VIDEO_UPLOAD_NOTE}}} & "") > 0,\n'
            f"    {{{FIELD_ID_SEASON_SIM_TEST_SUBMITTED_AT}}},\n"
            f"    {{{FIELD_ID_ACTIVITY_DATE}}}\n"
            "  ),\n"
            "  IF(\n"
            f"    DATETIME_FORMAT(SET_TIMEZONE({{{FIELD_ID_SEASON_SIM_TEST_SUBMITTED_AT}}}, "
            '"America/Denver"), "YYYY-MM-DD") =\n'
            f"    DATETIME_FORMAT(SET_TIMEZONE({{{FIELD_ID_ACTIVITY_DATE}}}, \"UTC\"), "
            '"YYYY-MM-DD"),\n'
            "    1, 0\n"
            "  ),\n"
            "  IF(\n"
            f"    AND({{{FIELD_ID_SUBMITTED_AT}}}, {{{FIELD_ID_ACTIVITY_DATE}}}),\n"
            "    IF(\n"
            f"      DATETIME_FORMAT(SET_TIMEZONE({{{FIELD_ID_SUBMITTED_AT}}}, "
            '"America/Denver"), "YYYY-MM-DD") =\n'
            f"      DATETIME_FORMAT(SET_TIMEZONE({{{FIELD_ID_ACTIVITY_DATE}}}, \"UTC\"), "
            '"YYYY-MM-DD"),\n'
            "      1, 0\n"
            "    ),\n"
            "    0\n"
            "  )\n"
            ")"
        )
        grace_ids = (
            "IF(\n"
            "  OR(\n"
            "    {fldIb6nJu5TBkUUrD},\n"
            "    AND(\n"
            f"      {{{FIELD_ID_SEASON_SIM_TEST_RECORD}}},\n"
            f'      FIND("SEASON-SIM|", {{{FIELD_ID_VIDEO_UPLOAD_NOTE}}} & "") > 0,\n'
            "      {fld1gQ2c04pndnTKe} = 1,\n"
            f"      {{{FIELD_ID_ACTIVITY_DATE}}},\n"
            f"      {{{FIELD_ID_SEASON_SIM_TEST_SUBMITTED_AT}}},\n"
            f"      {{{FIELD_ID_SEASON_SIM_CLOCK_NOW}}},\n"
            f"      DATETIME_FORMAT(SET_TIMEZONE({{{FIELD_ID_ACTIVITY_DATE}}}, "
            '"America/Denver"), "YYYY-MM-DD") <=\n'
            f"      DATETIME_FORMAT(SET_TIMEZONE({{{FIELD_ID_SEASON_SIM_CLOCK_NOW}}}, "
            '"America/Denver"), "YYYY-MM-DD"),\n'
            "      1\n"
            "    ),\n"
            "    AND(\n"
            "      {fld1gQ2c04pndnTKe} = 1,\n"
            f"      {{{FIELD_ID_ACTIVITY_DATE}}},\n"
            f"      {{{FIELD_ID_SUBMITTED_AT}}},\n"
            f"      DATETIME_FORMAT(SET_TIMEZONE({{{FIELD_ID_ACTIVITY_DATE}}}, "
            '"America/Denver"), "YYYY-MM-DD") <= DATETIME_FORMAT(TODAY(), "YYYY-MM-DD"),\n'
            "      1\n"
            "    )\n"
            "  ),\n"
            "  1,\n"
            "  0\n"
            ")"
        )
        self.assertNotIn("Season Sim Test Record", same_day_ids)
        self.assertNotIn("Video Upload Note", same_day_ids)
        meta = _meta(submitted_same_day=same_day_ids, grace=grace_ids)
        same = inspect_submitted_same_day_formula(meta)
        grace = inspect_perfect_week_grace_formula(meta)
        self.assertTrue(same.gated_season_sim_active)
        self.assertTrue(grace.gated_season_sim_active)
        self.assertTrue(same.safe_for_normal_athletes)
        self.assertTrue(grace.safe_for_normal_athletes)
        readiness = assess_same_day_readiness(meta, activity_date_gate_active=True)
        self.assertTrue(readiness.same_day_logic_accurate_for_sim)

    def test_normal_records_unchanged_without_sim_marker(self):
        self.assertIn("{Submitted At}", SUBMITTED_SAME_DAY_TEMPORARY)
        self.assertIn("TODAY()", PERFECT_WEEK_GRACE_TEMPORARY)
        self.assertEqual(
            simulated_same_day_result(
                season_sim_test_record=False,
                video_upload_note="ordinary note",
                season_sim_test_submitted_at_date="2027-05-08",
                activity_date="2027-05-08",
            ),
            0,
        )

    def test_simulated_same_day_and_backdated(self):
        marker = "SEASON-SIM|SEASON-SIM-2027-test"
        self.assertEqual(
            simulated_same_day_result(
                season_sim_test_record=True,
                video_upload_note=marker,
                season_sim_test_submitted_at_date="2027-05-08",
                activity_date="2027-05-08",
            ),
            1,
        )
        self.assertEqual(
            simulated_same_day_result(
                season_sim_test_record=True,
                video_upload_note=marker,
                season_sim_test_submitted_at_date="2027-05-22",
                activity_date="2027-05-20",
            ),
            0,
        )

    def test_future_date_gate_still_required(self):
        meta = _meta(
            submitted_same_day=SUBMITTED_SAME_DAY_TEMPORARY,
            grace=PERFECT_WEEK_GRACE_TEMPORARY,
        )
        readiness = assess_same_day_readiness(meta, activity_date_gate_active=False)
        self.assertFalse(readiness.same_day_logic_accurate_for_sim)
        self.assertTrue(
            any("Activity Date Is Future?" in b for b in readiness.blockers)
        )


if __name__ == "__main__":
    unittest.main()
