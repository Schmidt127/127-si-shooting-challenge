#!/usr/bin/env python3
"""Same-day / Perfect Week Season Sim contract tests (offline)."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

PACKAGE_PARENT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PACKAGE_PARENT))

from season_simulation.same_day_contracts import (  # noqa: E402
    FIELD_ID_SEASON_SIM_CLOCK_NOW,
    FIELD_ID_SEASON_SIM_TEST_RECORD,
    FIELD_ID_SEASON_SIM_TEST_SUBMITTED_AT,
    FIELD_ID_SUBMITTED_AT,
    FIELD_ID_VIDEO_UPLOAD_NOTE,
    PERFECT_WEEK_GRACE_ROLLBACK,
    PERFECT_WEEK_GRACE_TEMPORARY,
    SUBMITTED_SAME_DAY_ROLLBACK,
    SUBMITTED_SAME_DAY_TEMPORARY,
    assess_same_day_readiness,
    inspect_perfect_week_grace_formula,
    inspect_submitted_same_day_formula,
    simulated_same_day_result,
)
from season_simulation.simulation_clock import FIELD_ID_ACTIVITY_DATE  # noqa: E402


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

    def test_normal_records_unchanged_without_sim_marker(self):
        # Temporary formula still contains Submitted At / TODAY branches.
        self.assertIn("{Submitted At}", SUBMITTED_SAME_DAY_TEMPORARY)
        self.assertIn("TODAY()", PERFECT_WEEK_GRACE_TEMPORARY)
        self.assertIn("{Season Sim Test Record?}", SUBMITTED_SAME_DAY_TEMPORARY)
        self.assertIn("SEASON-SIM|", PERFECT_WEEK_GRACE_TEMPORARY)
        # Without Season Sim checkbox/marker, harness mirror returns 0.
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

    def test_paste_packets_nonempty(self):
        self.assertGreater(len(SUBMITTED_SAME_DAY_TEMPORARY), 100)
        self.assertGreater(len(PERFECT_WEEK_GRACE_TEMPORARY), 100)
        self.assertGreater(len(SUBMITTED_SAME_DAY_ROLLBACK), 50)
        self.assertGreater(len(PERFECT_WEEK_GRACE_ROLLBACK), 50)


if __name__ == "__main__":
    unittest.main()
