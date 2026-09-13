"""Regression tests for orchestration corrections (HC→WAS, settlement, business gate)."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock

PACKAGE_PARENT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PACKAGE_PARENT))

from season_simulation.business_reconciliation import (  # noqa: E402
    expected_points_from_matrix,
    reconcile_business_success,
    stage_e2_business_success_hook,
    sum_points,
)
from season_simulation.downstream_settlement import (  # noqa: E402
    classify_homework_settlement,
    classify_streak_settlement,
)
from season_simulation.execute import build_intended_writes  # noqa: E402
from season_simulation.expectations_matrix import build_athlete_expectation_matrix  # noqa: E402
from season_simulation.perfect_week_eval import (  # noqa: E402
    count_perfect_week_passes,
)
from season_simulation.business_reconciliation import level_for  # noqa: E402
from season_simulation.run_registry import new_run_id  # noqa: E402
from season_simulation.scenarios_sc001 import build_all_sc001_scenarios  # noqa: E402
from season_simulation.simulation_clock import SimulationClock  # noqa: E402
from season_simulation.writer import ExecuteContext  # noqa: E402


def _offline_kwargs(run_id: str) -> dict:
    homework = [
        {
            "record_id": f"recOFFHW{i:02d}",
            "slot": "HW1" if i % 2 else "HW2",
            "library_id": f"recOFFLIB{i:02d}",
            "display": f"HW{i}",
        }
        for i in range(1, 19)
    ]
    return dict(
        run_id=run_id,
        grade_band_id="recOFFGB",
        goal_record_id="recOFFGOAL",
        goal_total_shots=12000,
        homework=homework,
        zoom_meetings=[
            {"record_id": "recZ1", "display": "Live"},
            {"record_id": "recZ2", "display": "Rec"},
        ],
        weeks=[],
    )


class TestHcWasLinkage(unittest.TestCase):
    def test_intended_writes_include_was_link_not_text_field(self):
        rid = new_run_id(suffix="hcwas")
        scenario = build_all_sc001_scenarios(**_offline_kwargs(rid))["athlete1_perfect"]
        from season_simulation.constants import SIM_START

        clock = SimulationClock(enabled=True, current_date=SIM_START, run_id=rid)
        ctx = ExecuteContext(
            school_year="2026-2027",
            grade_band_id="recOFFGB",
            program_instance_id="recOFFPI",
            goal_record_id="recOFFGOAL",
            zoom_live_meeting_id="recZ1",
            zoom_recorded_meeting_id="recZ2",
            week_id_by_date={d.activity_date.isoformat(): "recWEEK" for d in scenario.days},
        )
        plan = build_intended_writes(scenario, clock, ctx=ctx)
        hc = [
            w
            for w in plan
            if w.get("table") == "Homework Completions" and w.get("op") == "create"
        ]
        self.assertGreater(len(hc), 0)
        for row in hc:
            fields = row["fields"]
            self.assertIn("Weekly Athlete Summary Link", fields)
            self.assertNotIn("Weekly Athlete Summary", fields)

    def test_writer_memory_sets_was_link_and_inverse(self):
        # Classify path covers HC settlement requirements used by Stage D.
        check = classify_homework_settlement(
            hc_id="recHC1",
            fields={
                "Satisfactory?": True,
                "Completion Status": "Satisfactory",
                "Award Status": "Awarded",
                "Base XP Awarded": 35,
                "Homework XP Reconciliation Needed?": 0,
                "Weekly Athlete Summary Link": ["recWAS1"],
            },
            xp_ids=["recXP1"],
        )
        self.assertTrue(check.ok)
        missing = classify_homework_settlement(
            hc_id="recHC2",
            fields={
                "Satisfactory?": True,
                "Award Status": "Awarded",
                "Base XP Awarded": 35,
                "Homework XP Reconciliation Needed?": 0,
            },
            xp_ids=["recXP2"],
        )
        self.assertFalse(missing.ok)
        self.assertIn("Weekly_Athlete_Summary_Link", missing.detail)


class TestStreakSettlementGate(unittest.TestCase):
    def test_current_gt_longest_fails(self):
        checks = classify_streak_settlement(
            enrollment_fields={
                "Current Shooting Streak": 67,
                "Longest Streak Days": 40,
            },
            expected_thresholds=(3, 5, 7, 10, 20, 30, 40, 50, 60),
            occurrence_by_threshold={
                3: ["a"],
                5: ["b"],
                7: ["c"],
                10: ["d"],
                20: ["e"],
                30: ["f"],
                40: ["g"],
                50: [],
                60: [],
            },
            xp_by_threshold={
                3: ["x"],
                5: ["x"],
                7: ["x"],
                10: ["x"],
                20: ["x"],
                30: ["x"],
                40: ["x"],
                50: [],
                60: [],
            },
        )
        self.assertTrue(any(not c.ok and "current_gt_longest" in c.name for c in checks))

    def test_duplicate_occurrence_detected_in_business_gate(self):
        rid = new_run_id(suffix="biz")
        scenario = build_all_sc001_scenarios(**_offline_kwargs(rid))["athlete1_perfect"]
        matrix = build_athlete_expectation_matrix(scenario)
        result = reconcile_business_success(
            profile="athlete1_perfect",
            matrix=matrix,
            actual_events=[],
            actual_lifetime_xp=0,
            actual_level="Beginner",
            duplicate_streak_keys={"streak|x|30-day_streak|2027-05-24": 2},
        )
        self.assertFalse(result.pass_)
        self.assertTrue(any("duplicate_streak" in e for e in result.errors))


class TestBusinessSuccessGate(unittest.TestCase):
    def test_cascade_complete_alone_is_not_pass(self):
        rid = new_run_id(suffix="biz2")
        scenario = build_all_sc001_scenarios(**_offline_kwargs(rid))["athlete1_perfect"]
        matrix = build_athlete_expectation_matrix(scenario)
        hook = stage_e2_business_success_hook(
            profile="athlete1_perfect",
            matrix=matrix,
            cascade_complete=True,
            actual_events=[],
            actual_lifetime_xp=3235,
            actual_level="All-Star",
            planned=False,
        )
        self.assertFalse(hook["pass"])
        self.assertTrue(any("cascade_complete=true" in e for e in hook["errors"]))

    def test_perfect_oracle_points_4910(self):
        rid = new_run_id(suffix="biz3")
        scenario = build_all_sc001_scenarios(**_offline_kwargs(rid))["athlete1_perfect"]
        matrix = build_athlete_expectation_matrix(scenario)
        pts = expected_points_from_matrix(matrix)
        self.assertEqual(sum_points(pts), 4910)
        self.assertEqual(level_for(4910), "G.O.A.T.")
        self.assertEqual(pts["Streak XP"], 455)
        self.assertEqual(pts["Weekly Threshold XP"], 480)
        self.assertEqual(pts["Perfect Week XP"], 1000)


class TestRecoveryEdgeOracle(unittest.TestCase):
    def test_recovery_perfect_week_one_and_xp(self):
        rid = new_run_id(suffix="rec")
        scenario = build_all_sc001_scenarios(**_offline_kwargs(rid))["athlete2_recovery"]
        self.assertEqual(count_perfect_week_passes(scenario), 1)
        matrix = build_athlete_expectation_matrix(scenario)
        pts = expected_points_from_matrix(matrix)
        self.assertEqual(matrix.expected_perfect_week_count, 1)
        self.assertEqual(sum_points(pts), 2305)
        self.assertEqual(pts["Perfect Week XP"], 100)

    def test_edge_perfect_week_five_and_xp(self):
        rid = new_run_id(suffix="edge")
        scenario = build_all_sc001_scenarios(**_offline_kwargs(rid))["athlete3_edge"]
        self.assertEqual(count_perfect_week_passes(scenario), 5)
        matrix = build_athlete_expectation_matrix(scenario)
        pts = expected_points_from_matrix(matrix)
        self.assertEqual(matrix.expected_perfect_week_count, 5)
        self.assertEqual(sum_points(pts), 3620)
        self.assertEqual(pts["Perfect Week XP"], 500)
        self.assertEqual(pts["Streak XP"], 260)


class TestDailyFloor191(unittest.TestCase):
    def test_production_daily_minimum_constant(self):
        from season_simulation.constants import (
            PRODUCTION_PERFECT_WEEK_DAILY_MINIMUM,
            PRODUCTION_WAS_WEEKLY_GOAL_SHOTS,
        )

        self.assertEqual(PRODUCTION_WAS_WEEKLY_GOAL_SHOTS, 1334)
        self.assertEqual(PRODUCTION_PERFECT_WEEK_DAILY_MINIMUM, 191)


if __name__ == "__main__":
    unittest.main()
