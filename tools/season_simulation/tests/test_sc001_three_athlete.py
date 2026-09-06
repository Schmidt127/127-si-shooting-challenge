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
from season_simulation.run_registry import new_run_id  # noqa: E402
from season_simulation.scenarios_sc001 import (  # noqa: E402
    ATHLETE2_MISS_DAYS,
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

    def test_all_homework_assigned(self):
        rid = new_run_id(suffix="threeathlete")
        s = build_athlete1_perfect_scenario(**_offline_kwargs(rid))
        self.assertEqual(s.intended_writes_summary["homework_completions"], 18)


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

    def test_expectation_matrices_generated(self):
        rid = new_run_id(suffix="threeathlete")
        scenarios = build_all_sc001_scenarios(**_offline_kwargs(rid))
        pkg = build_three_athlete_expectation_package(scenarios)
        self.assertEqual(pkg["athlete_count"], 3)
        self.assertEqual(pkg["status"], "READY — not executed")
        m1 = build_athlete_expectation_matrix(scenarios["athlete1_perfect"])
        self.assertGreater(m1.expected_perfect_week_count, 5)
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


if __name__ == "__main__":
    unittest.main()
