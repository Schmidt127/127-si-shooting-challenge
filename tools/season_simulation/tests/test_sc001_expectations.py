#!/usr/bin/env python3
"""SC-SEASON-SIM-001 expectation contract tests (SC-167/168/169 + scenario truth)."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

PACKAGE_PARENT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PACKAGE_PARENT))

from season_simulation.constants import SIMULATION_DAY_COUNT  # noqa: E402
from season_simulation.expectations_achievements import (  # noqa: E402
    perfect_week_source_key,
    shot_milestone_source_key,
)
from season_simulation.expectations_matrix import (  # noqa: E402
    build_athlete_expectation_matrix,
    build_sanitized_dry_run_artifact,
    build_three_athlete_expectation_package,
)
from season_simulation.expectations_submission_xp import (  # noqa: E402
    SUBMISSION_XP_PREFIX,
)
from season_simulation.expectations_weekly_email import (  # noqa: E402
    ROOT_CAUSE_CLASSIFICATION,
    assert_zero_weekly_handoffs_ok_without_stage,
    expected_weekly_handoff_count_after_execute,
)
from season_simulation.run_registry import new_run_id  # noqa: E402
from season_simulation.scenario_base import AthleteProfile, compute_goal_met_crossing  # noqa: E402
from season_simulation.scenarios_sc001 import (  # noqa: E402
    ATHLETE2_MISS_DAYS,
    build_all_sc001_scenarios,
)
from season_simulation.simulation_clock import SubmissionTiming  # noqa: E402
from season_simulation.three_athlete import run_three_athlete_dry_run  # noqa: E402

OFFLINE_FIXTURE_RUN_ID = "SEASON-SIM-2027-OFFLINE-FIXTURE-threeathlete"


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


def _expectation_totals(scenarios: dict) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for profile, scenario in scenarios.items():
        matrix = build_athlete_expectation_matrix(scenario)
        out[profile] = {
            "total_planned_shots": matrix.total_planned_shots,
            "submit_days": matrix.submit_days,
            "miss_days": matrix.miss_days,
            "expected_perfect_week_count": matrix.expected_perfect_week_count,
            "expected_shot_milestones": matrix.expected_shot_milestones,
            "expected_streak_achievements": matrix.expected_streak_achievements,
            "expected_xp_by_category": matrix.expected_xp_by_category,
            "expected_goal_met_date": matrix.expected_goal_met_date,
            "expected_email_handoffs": matrix.expected_email_handoffs,
        }
    return out


class TestSc001WindowAndProfiles(unittest.TestCase):
    def test_simulation_window_full_challenge_days(self):
        rid = new_run_id(suffix="threeathlete")
        scenarios = build_all_sc001_scenarios(**_offline_kwargs(rid))
        for profile, scenario in scenarios.items():
            day_numbers = {d.day_number for d in scenario.days}
            self.assertEqual(min(day_numbers), 1, profile)
            self.assertEqual(max(day_numbers), SIMULATION_DAY_COUNT, profile)
            self.assertEqual(len(day_numbers), SIMULATION_DAY_COUNT, profile)
            by_num = sorted(scenario.days, key=lambda d: (d.day_number, d.dedupe_key))
            first = by_num[0].activity_date.isoformat()
            last = by_num[-1].activity_date.isoformat()
            self.assertEqual(first, "2027-04-25", profile)
            self.assertEqual(last, "2027-06-30", profile)
        a3 = scenarios["athlete3_edge"]
        self.assertEqual(len(a3.days), SIMULATION_DAY_COUNT + 1)  # same-day double

    def test_profile_keys_and_grades(self):
        rid = new_run_id(suffix="threeathlete")
        scenarios = build_all_sc001_scenarios(**_offline_kwargs(rid))
        self.assertEqual(set(scenarios), {
            AthleteProfile.ATHLETE1_PERFECT.value,
            AthleteProfile.ATHLETE2_RECOVERY.value,
            AthleteProfile.ATHLETE3_EDGE.value,
        })
        self.assertEqual(scenarios["athlete1_perfect"].athlete["grade"], "12")
        self.assertEqual(scenarios["athlete2_recovery"].athlete["grade"], "10")
        self.assertEqual(scenarios["athlete3_edge"].athlete["grade"], "8")


class TestSc001Athlete2MissDays(unittest.TestCase):
    def test_exact_miss_day_set(self):
        rid = new_run_id(suffix="threeathlete")
        a2 = build_all_sc001_scenarios(**_offline_kwargs(rid))["athlete2_recovery"]
        miss = {d.day_number for d in a2.days if d.action == "miss"}
        self.assertEqual(miss, ATHLETE2_MISS_DAYS)
        self.assertEqual(
            miss,
            frozenset({10, 17, 24, 31, 38, 45, 59, 64}),
        )
        self.assertNotIn(52, miss)  # Week 7 recovery must stay miss-free


class TestSc001Athlete3EdgeProbes(unittest.TestCase):
    def test_same_day_double_submission(self):
        rid = new_run_id(suffix="threeathlete")
        a3 = build_all_sc001_scenarios(**_offline_kwargs(rid))["athlete3_edge"]
        day25 = [d for d in a3.days if d.day_number == 25 and d.action == "submit"]
        self.assertEqual(len(day25), 2)
        self.assertEqual(sum(d.shot_total for d in day25), day25[0].shot_total + 45)

    def test_backdate_probe(self):
        rid = new_run_id(suffix="threeathlete")
        a3 = build_all_sc001_scenarios(**_offline_kwargs(rid))["athlete3_edge"]
        backdated = [d for d in a3.days if d.timing == SubmissionTiming.BACKDATED.value]
        self.assertEqual(len(backdated), 1)
        self.assertEqual(backdated[0].day_number, 42)
        self.assertEqual(backdated[0].write_on_day_number, 44)

    def test_replay_probe_days(self):
        rid = new_run_id(suffix="threeathlete")
        a3 = build_all_sc001_scenarios(**_offline_kwargs(rid))["athlete3_edge"]
        replay = {d.day_number for d in a3.days if d.replay_probe}
        self.assertEqual(replay, {16, 35, 51, 64})


class TestSc001Sc167SubmissionXp(unittest.TestCase):
    def test_submission_xp_one_per_countable_submit(self):
        rid = new_run_id(suffix="threeathlete")
        scenarios = build_all_sc001_scenarios(**_offline_kwargs(rid))
        for profile, scenario in scenarios.items():
            matrix = build_athlete_expectation_matrix(scenario)
            submit_days = sum(1 for d in scenario.days if d.action == "submit")
            self.assertEqual(
                matrix.expected_xp_by_category["SUBMISSION_XP"],
                submit_days,
                profile,
            )

    def test_athlete3_extra_same_day_does_not_duplicate_idempotent_key_pattern(self):
        rid = new_run_id(suffix="threeathlete")
        a3 = build_all_sc001_scenarios(**_offline_kwargs(rid))["athlete3_edge"]
        keys = [d.dedupe_key for d in a3.days if d.action == "submit"]
        self.assertEqual(len(keys), len(set(keys)))
        day25_keys = [d.dedupe_key for d in a3.days if d.day_number == 25]
        self.assertEqual(len(day25_keys), 2)
        self.assertNotEqual(day25_keys[0], day25_keys[1])
        self.assertTrue(any("|SUB2|" in k for k in day25_keys))
        self.assertTrue(any("|SUB|" in k and "|SUB2|" not in k for k in day25_keys))

    def test_submission_xp_source_key_prefix_documented(self):
        self.assertTrue(SUBMISSION_XP_PREFIX.startswith("SUBMISSION_XP|"))


class TestSc001Sc168WeeklyEmail(unittest.TestCase):
    def test_zero_weekly_hub_after_execute_alone_expected(self):
        rid = new_run_id(suffix="threeathlete")
        scenarios = build_all_sc001_scenarios(**_offline_kwargs(rid))
        for profile, scenario in scenarios.items():
            matrix = build_athlete_expectation_matrix(scenario)
            arms = matrix.expected_email_handoffs["weekly_summary_build_arms"]
            contract = expected_weekly_handoff_count_after_execute(
                enable_email_delivery=True,
                weekly_email_arms=arms,
                weekly_email_stage_completed=False,
            )
            self.assertEqual(contract["expected_max"], 0)
            self.assertEqual(contract["classification"], ROOT_CAUSE_CLASSIFICATION)
            assert_zero_weekly_handoffs_ok_without_stage(
                observed_weekly_handoffs=0,
                enable_email_delivery=True,
                weekly_email_arms=arms,
            )

    def test_build_arms_present_in_ready_package(self):
        rid = new_run_id(suffix="threeathlete")
        pkg = build_three_athlete_expectation_package(
            build_all_sc001_scenarios(**_offline_kwargs(rid))
        )
        self.assertTrue(pkg["email_verification"]["expect_weekly_summary_arms"])
        self.assertTrue(pkg["email_verification"]["expect_weekly_hub_after_stage"])


class TestSc001Sc169UnlockSourceKeys(unittest.TestCase):
    def test_shot_milestone_source_key_pattern(self):
        key = shot_milestone_source_key("recENROLL", "recMS3000")
        self.assertEqual(key, "SHOT_MILESTONE|recENROLL|recMS3000")

    def test_perfect_week_source_key_pattern(self):
        key = perfect_week_source_key("recENROLL", "recWEEK7")
        self.assertEqual(key, "PERFECT_WEEK|recENROLL|recWEEK7")

    def test_milestone_count_matches_xp_bucket(self):
        rid = new_run_id(suffix="threeathlete")
        scenarios = build_all_sc001_scenarios(**_offline_kwargs(rid))
        expected = {
            "athlete1_perfect": [3000, 6000, 9000, 12000, 14400],
            "athlete2_recovery": [3000, 6000],
            "athlete3_edge": [3000, 6000, 9000, 12000],
        }
        for profile, milestones in expected.items():
            matrix = build_athlete_expectation_matrix(scenarios[profile])
            self.assertEqual(matrix.expected_shot_milestones, milestones, profile)
            self.assertEqual(
                matrix.expected_xp_by_category["SHOT_MILESTONE"],
                len(milestones),
                profile,
            )


class TestSc001GoalMetAndDeterminism(unittest.TestCase):
    def test_goal_met_dates_match_manifest(self):
        rid = new_run_id(suffix="threeathlete")
        scenarios = build_all_sc001_scenarios(**_offline_kwargs(rid))
        a1_cross = compute_goal_met_crossing(scenarios["athlete1_perfect"])
        self.assertEqual(a1_cross[0], "2027-06-08")
        self.assertEqual(a1_cross[3], 12098)

        a3_cross = compute_goal_met_crossing(scenarios["athlete3_edge"])
        self.assertEqual(a3_cross[0], "2027-06-22")
        self.assertEqual(a3_cross[3], 12005)

        a2_cross = compute_goal_met_crossing(scenarios["athlete2_recovery"])
        self.assertIsNone(a2_cross[0])

    def test_totals_stable_across_run_ids(self):
        rid_a = new_run_id(suffix="threeathlete")
        rid_b = new_run_id(suffix="threeathlete")
        totals_a = _expectation_totals(build_all_sc001_scenarios(**_offline_kwargs(rid_a)))
        totals_b = _expectation_totals(build_all_sc001_scenarios(**_offline_kwargs(rid_b)))
        for profile in totals_a:
            a = totals_a[profile]
            b = totals_b[profile]
            self.assertEqual(a["total_planned_shots"], b["total_planned_shots"], profile)
            self.assertEqual(
                a["expected_perfect_week_count"],
                b["expected_perfect_week_count"],
                profile,
            )
            self.assertEqual(a["expected_xp_by_category"], b["expected_xp_by_category"], profile)


class TestSc001DryRunDeterminism(unittest.TestCase):
    def test_dry_run_expectation_totals_identical_twice(self):
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp)
            p1 = run_three_athlete_dry_run(
                run_id=OFFLINE_FIXTURE_RUN_ID,
                offline_fixture=True,
                out_dir=out,
            )
            p2 = run_three_athlete_dry_run(
                run_id=OFFLINE_FIXTURE_RUN_ID,
                offline_fixture=True,
                out_dir=out,
            )
            for profile in p1["expectations"]["matrices"]:
                m1 = p1["expectations"]["matrices"][profile]
                m2 = p2["expectations"]["matrices"][profile]
                self.assertEqual(
                    m1["total_planned_shots"],
                    m2["total_planned_shots"],
                    profile,
                )
                self.assertEqual(
                    m1["expected_perfect_week_count"],
                    m2["expected_perfect_week_count"],
                    profile,
                )
                self.assertEqual(
                    m1["expected_xp_by_category"],
                    m2["expected_xp_by_category"],
                    profile,
                )

    def test_sanitized_artifact_omits_bulk_day_plans(self):
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            payload = run_three_athlete_dry_run(
                run_id=OFFLINE_FIXTURE_RUN_ID,
                offline_fixture=True,
                out_dir=Path(tmp),
            )
            slim = build_sanitized_dry_run_artifact(payload)
            self.assertTrue(slim.get("sanitized"))
            self.assertIn("expectations", slim)
            self.assertNotIn("intended_writes_by_profile", slim)
            for profile, summary in slim["scenarios_summary"].items():
                self.assertNotIn("days", summary, profile)


if __name__ == "__main__":
    unittest.main()
