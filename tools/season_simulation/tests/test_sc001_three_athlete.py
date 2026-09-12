#!/usr/bin/env python3
"""Offline tests for SC-SEASON-SIM-001 three-athlete scenarios."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

PACKAGE_PARENT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PACKAGE_PARENT))

from season_simulation.confirmation import (  # noqa: E402
    ConfirmationError,
    is_three_athlete_execute_gated,
    require_three_athlete_execute_gates,
)
from season_simulation.constants import (  # noqa: E402
    CONFIRM_DISPOSABLE_TOKEN,
    CONFIRM_THREE_ATHLETE_TOKEN,
    CONFIRM_TOKEN,
    SIMULATION_DAY_COUNT,
    THREE_ATHLETE_AUTHORIZATION_PHRASE,
)
from season_simulation.expectations_matrix import (  # noqa: E402
    build_athlete_expectation_matrix,
    build_three_athlete_expectation_package,
)
from season_simulation.scenario_base import compute_goal_met_crossing
from season_simulation.perfect_week_eval import (  # noqa: E402
    athlete2_recovery_week_note,
    evaluate_all_perfect_weeks,
)
from season_simulation.run_registry import new_run_id  # noqa: E402
from season_simulation.scenarios_sc001 import (  # noqa: E402
    ATHLETE2_MISS_DAYS,
    ATHLETE2_RECOVERY_WEEK,
    ATHLETE3_PERFECT_WEEK_TRUTH_TABLE,
    build_all_sc001_scenarios,
    build_athlete1_perfect_scenario,
)
from season_simulation.three_athlete import run_three_athlete_dry_run  # noqa: E402


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


class TestSc001Athlete1GoalMet(unittest.TestCase):
    def test_exact_goal_met_crossing_date(self):
        rid = new_run_id(suffix="threeathlete")
        scenario = build_athlete1_perfect_scenario(**_offline_kwargs(rid))
        crossing_date, day_number, before, cumulative = compute_goal_met_crossing(scenario)
        self.assertEqual(crossing_date, "2027-06-08")
        self.assertEqual(day_number, 45)
        self.assertLess(before, 12000)
        self.assertGreaterEqual(cumulative, 12000)

    def test_goal_met_matrix_matches_crossing(self):
        rid = new_run_id(suffix="threeathlete")
        scenario = build_athlete1_perfect_scenario(**_offline_kwargs(rid))
        matrix = build_athlete_expectation_matrix(scenario)
        self.assertIn("2027-06-08", matrix.expected_goal_met_date)
        self.assertIn("12,098", matrix.expected_goal_met_date)
        self.assertEqual(matrix.expected_goal_met_cumulative_shots, 12098)

    def test_goal_met_crossing_stable_on_rebuild(self):
        rid_a = new_run_id(suffix="threeathlete")
        rid_b = new_run_id(suffix="threeathlete")
        cross_a = compute_goal_met_crossing(
            build_athlete1_perfect_scenario(**_offline_kwargs(rid_a))
        )
        cross_b = compute_goal_met_crossing(
            build_athlete1_perfect_scenario(**_offline_kwargs(rid_b))
        )
        self.assertEqual(cross_a[0], cross_b[0])
        self.assertEqual(cross_a[3], cross_b[3])


class TestSc001Athlete1Perfect(unittest.TestCase):
    def test_no_miss_days(self):
        rid = new_run_id(suffix="threeathlete")
        s = build_athlete1_perfect_scenario(**_offline_kwargs(rid))
        self.assertEqual(len(s.days), SIMULATION_DAY_COUNT)
        self.assertEqual(s.intended_writes_summary["miss_days"], 0)
        self.assertEqual(s.intended_writes_summary["submit_days"], SIMULATION_DAY_COUNT)

    def test_distinct_shot_totals_from_sc002(self):
        rid = new_run_id(suffix="threeathlete")
        s = build_athlete1_perfect_scenario(**_offline_kwargs(rid))
        shots = [d.shot_total for d in s.days if d.action == "submit"]
        self.assertGreater(len(set(shots)), 5)
        self.assertGreater(sum(shots), 12000)

    def test_perfect_week_xp_equals_derived_count(self):
        rid = new_run_id(suffix="threeathlete")
        scenario = build_athlete1_perfect_scenario(**_offline_kwargs(rid))
        matrix = build_athlete_expectation_matrix(scenario)
        self.assertEqual(matrix.expected_perfect_week_count, 10)
        self.assertEqual(
            matrix.expected_xp_by_category["PERFECT_WEEK"],
            matrix.expected_perfect_week_count,
        )


class TestSc001Athlete2RecoveryPerfectWeek(unittest.TestCase):
    def test_exactly_one_perfect_week(self):
        rid = new_run_id(suffix="threeathlete")
        scenario = build_all_sc001_scenarios(**_offline_kwargs(rid))["athlete2_recovery"]
        matrix = build_athlete_expectation_matrix(scenario)
        passing = [r for r in matrix.weekly_rows if r.perfect_week.startswith("pass")]
        self.assertEqual(len(passing), 1)
        self.assertEqual(passing[0].week_label, ATHLETE2_RECOVERY_WEEK)
        self.assertEqual(matrix.expected_perfect_week_count, 1)
        self.assertEqual(matrix.expected_xp_by_category["PERFECT_WEEK"], 1)

    def test_recovery_week_passes_all_production_rules(self):
        rid = new_run_id(suffix="threeathlete")
        scenario = build_all_sc001_scenarios(**_offline_kwargs(rid))["athlete2_recovery"]
        note = athlete2_recovery_week_note(scenario)
        self.assertIn("passes", note)
        self.assertIn(ATHLETE2_RECOVERY_WEEK, note)

    def test_earlier_weeks_fail_for_distinct_reasons(self):
        rid = new_run_id(suffix="threeathlete")
        scenario = build_all_sc001_scenarios(**_offline_kwargs(rid))["athlete2_recovery"]
        matrix = build_athlete_expectation_matrix(scenario)
        failing = {
            r.week_label: r.perfect_week
            for r in matrix.weekly_rows
            if r.week_label != ATHLETE2_RECOVERY_WEEK
        }
        self.assertTrue(all(not v.startswith("pass") for v in failing.values()))
        self.assertGreater(len(set(failing.values())), 3)


class TestSc001Athlete3PerfectWeekTable(unittest.TestCase):
    def test_truth_table_matches_matrix(self):
        rid = new_run_id(suffix="threeathlete")
        scenario = build_all_sc001_scenarios(**_offline_kwargs(rid))["athlete3_edge"]
        matrix = build_athlete_expectation_matrix(scenario)
        for row in matrix.weekly_rows:
            expected_mode = ATHLETE3_PERFECT_WEEK_TRUTH_TABLE[row.week_label][1]
            if expected_mode == "pass":
                self.assertTrue(
                    row.perfect_week.startswith("pass"),
                    f"{row.week_label} expected pass got {row.perfect_week}",
                )
            else:
                self.assertEqual(row.perfect_week, expected_mode)

    def test_exactly_five_perfect_weeks_derived(self):
        rid = new_run_id(suffix="threeathlete")
        scenario = build_all_sc001_scenarios(**_offline_kwargs(rid))["athlete3_edge"]
        matrix = build_athlete_expectation_matrix(scenario)
        truth_pass_count = sum(
            1 for outcome, _ in ATHLETE3_PERFECT_WEEK_TRUTH_TABLE.values() if outcome == "pass"
        )
        self.assertEqual(truth_pass_count, 5)
        self.assertEqual(matrix.expected_perfect_week_count, 5)
        self.assertEqual(matrix.expected_xp_by_category["PERFECT_WEEK"], 5)

    def test_scenario_metadata_matches_truth_table(self):
        rid = new_run_id(suffix="threeathlete")
        scenario = build_all_sc001_scenarios(**_offline_kwargs(rid))["athlete3_edge"]
        self.assertEqual(scenario.meta["expected_perfect_weeks"], 5)
        self.assertEqual(
            len([v for v in scenario.meta["perfect_week_truth_table"].values() if v["outcome"] == "pass"]),
            5,
        )


class TestSc001DerivedExpectations(unittest.TestCase):
    def test_weekly_threshold_count_equals_matrix(self):
        rid = new_run_id(suffix="threeathlete")
        scenarios = build_all_sc001_scenarios(**_offline_kwargs(rid))
        for profile, scenario in scenarios.items():
            matrix = build_athlete_expectation_matrix(scenario)
            self.assertEqual(
                matrix.expected_xp_by_category["WEEKLY_THRESHOLD"],
                len(matrix.expected_weekly_threshold_awards),
                profile,
            )

    def test_milestone_count_equals_crossings(self):
        rid = new_run_id(suffix="threeathlete")
        scenarios = build_all_sc001_scenarios(**_offline_kwargs(rid))
        for profile, scenario in scenarios.items():
            matrix = build_athlete_expectation_matrix(scenario)
            self.assertEqual(
                matrix.expected_xp_by_category["SHOT_MILESTONE"],
                len(matrix.expected_shot_milestones),
                profile,
            )

    def test_streak_xp_matches_gate_sequence(self):
        rid = new_run_id(suffix="threeathlete")
        scenarios = build_all_sc001_scenarios(**_offline_kwargs(rid))
        for profile, scenario in scenarios.items():
            matrix = build_athlete_expectation_matrix(scenario)
            self.assertEqual(
                matrix.expected_xp_by_category["STREAK_XP"],
                len(matrix.expected_streak_achievements),
                profile,
            )

    def test_email_handoffs_in_ready_package(self):
        rid = new_run_id(suffix="threeathlete")
        scenarios = build_all_sc001_scenarios(**_offline_kwargs(rid))
        pkg = build_three_athlete_expectation_package(scenarios)
        self.assertTrue(pkg["email_verification"]["recipient_allowlist_only"])
        self.assertTrue(pkg["email_verification"]["no_send_during_preparation"])
        matrix = build_athlete_expectation_matrix(scenarios["athlete1_perfect"])
        handoffs = matrix.expected_email_handoffs
        self.assertGreater(handoffs["daily_submission_emails"], 0)
        self.assertEqual(handoffs["recipient_allowlist"], "schmidt@fairfieldbasketballclub.com")
        self.assertTrue(handoffs["verify_send_status_writeback"])


class TestSc001ThreeAthletePack(unittest.TestCase):
    def test_three_profiles_differ(self):
        rid = new_run_id(suffix="threeathlete")
        scenarios = build_all_sc001_scenarios(**_offline_kwargs(rid))
        self.assertEqual(len(scenarios), 3)
        totals = {
            p: sum(d.shot_total for d in s.days)
            for p, s in scenarios.items()
        }
        self.assertEqual(len(set(totals.values())), 3)

    def test_athlete2_has_misses_and_recovery(self):
        rid = new_run_id(suffix="threeathlete")
        scenarios = build_all_sc001_scenarios(**_offline_kwargs(rid))
        a2 = scenarios["athlete2_recovery"]
        miss = {d.day_number for d in a2.days if d.action == "miss"}
        self.assertTrue(miss)
        self.assertTrue(miss.issubset(ATHLETE2_MISS_DAYS))
        self.assertNotIn(46, miss)

    def test_expectation_matrices_generated(self):
        rid = new_run_id(suffix="threeathlete")
        scenarios = build_all_sc001_scenarios(**_offline_kwargs(rid))
        pkg = build_three_athlete_expectation_package(scenarios)
        self.assertEqual(pkg["athlete_count"], 3)
        self.assertEqual(pkg["status"], "READY — not executed")
        m1 = build_athlete_expectation_matrix(scenarios["athlete1_perfect"])
        self.assertEqual(m1.expected_perfect_week_count, 10)
        self.assertGreater(len(m1.expected_shot_milestones), 0)


class TestSc001AuthorizationGates(unittest.TestCase):
    def test_execute_fails_without_phrase(self):
        self.assertFalse(
            is_three_athlete_execute_gated(
                execute=True,
                confirm=CONFIRM_TOKEN,
                confirm_disposable=CONFIRM_DISPOSABLE_TOKEN,
                confirm_three_athlete=CONFIRM_THREE_ATHLETE_TOKEN,
                authorization_phrase="wrong phrase",
                simulation_id="SEASON-SIM-2027-20260906T120000Z-threeathlete",
            )
        )

    def test_execute_passes_with_all_gates(self):
        self.assertTrue(
            is_three_athlete_execute_gated(
                execute=True,
                confirm=CONFIRM_TOKEN,
                confirm_disposable=CONFIRM_DISPOSABLE_TOKEN,
                confirm_three_athlete=CONFIRM_THREE_ATHLETE_TOKEN,
                authorization_phrase=THREE_ATHLETE_AUTHORIZATION_PHRASE,
                simulation_id="SEASON-SIM-2027-20260906T120000Z-threeathlete",
            )
        )

    def test_wrong_run_suffix_fails(self):
        with self.assertRaises(ConfirmationError):
            require_three_athlete_execute_gates(
                execute=True,
                confirm=CONFIRM_TOKEN,
                confirm_disposable=CONFIRM_DISPOSABLE_TOKEN,
                confirm_three_athlete=CONFIRM_THREE_ATHLETE_TOKEN,
                authorization_phrase=THREE_ATHLETE_AUTHORIZATION_PHRASE,
                simulation_id="SEASON-SIM-2027-20260906T120000Z-athlete1",
            )


class TestSc001DryRunOrchestration(unittest.TestCase):
    def test_offline_dry_run_three(self):
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            payload = run_three_athlete_dry_run(
                offline_fixture=True,
                out_dir=Path(tmp),
            )
            self.assertFalse(payload.get("executed", True))
            self.assertIn("threeathlete", payload["run_id"])
            self.assertEqual(len(payload["scenarios"]), 3)
            a2_pw = payload["expectations"]["matrices"]["athlete2_recovery"]["expected_perfect_week_count"]
            self.assertEqual(a2_pw, 1)
            a1_goal = payload["expectations"]["matrices"]["athlete1_perfect"]["expected_goal_met_date"]
            self.assertIn("2027-06-08", a1_goal)

    def test_dry_run_metadata_agrees_with_matrices(self):
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            payload = run_three_athlete_dry_run(
                offline_fixture=True,
                out_dir=Path(tmp),
            )
            scenarios = payload["scenarios"]
            for profile, scenario in scenarios.items():
                matrix = payload["expectations"]["matrices"][profile]
                if profile == "athlete3_edge":
                    self.assertEqual(
                        scenario["meta"]["expected_perfect_weeks"],
                        matrix["expected_perfect_week_count"],
                    )
                eval_count = sum(1 for ev in evaluate_all_perfect_weeks(
                    build_all_sc001_scenarios(**_offline_kwargs(payload["run_id"]))[profile]
                ) if ev.passes)
                self.assertEqual(matrix["expected_perfect_week_count"], eval_count)


if __name__ == "__main__":
    unittest.main()
