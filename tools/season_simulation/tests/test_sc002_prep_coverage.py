"""SC-SEASON-SIM-002 prep coverage — Perfect Week, homework, future-date, XP families."""

from __future__ import annotations

import sys
import unittest
from datetime import date, datetime, timezone
from pathlib import Path

TOOLS_DIR = Path(__file__).resolve().parents[2]
if str(TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_DIR))

from season_simulation.clock_override import (  # noqa: E402
    GATED_ACTIVITY_DATE_IS_FUTURE_FORMULA,
    PRODUCTION_ACTIVITY_DATE_IS_FUTURE_FORMULA,
    activity_date_is_future_gated,
    activity_date_is_future_production,
    formula_text_has_season_sim_gate,
)
from season_simulation.perfect_week_eval import (  # noqa: E402
    PERFECT_WEEK_VIDEO_MINIMUM,
    count_perfect_week_passes,
    evaluate_all_perfect_weeks,
)
from season_simulation.scenarios import (  # noqa: E402
    SAME_DAY_SUBMIT_DAY,
    VIDEO_FEEDBACK_DAYS,
    build_athlete1_scenario,
)
from season_simulation.season_policy import EXPECTED_ACTIVE_PHA_COUNT  # noqa: E402
from season_simulation.xp_event_families import (  # noqa: E402
    CASCADE_ONLY_SOURCE_FAMILIES,
    assert_sc002_xp_families_complete,
    classify_rule_key,
    sc002_family_gaps,
)


# Snapshot of Production XP Reward Rules Rule Keys (appn84sqPw03zEbTT, 2026-09-12).
# Re-verify live at preflight — do not invent amounts here.
LIVE_XP_REWARD_RULE_KEYS_20260912 = (
    "SHOOTING_BASE",
    "HOMEWORK_COMPLETION",
    "VIDEO_SUBMISSION",
    "PERFECT_WEEK",
    "ZOOM_ATTEND_BASE",
    "ZOOM_ATTEND_BONUS_2",
    "ZOOM_ATTEND_BONUS_3",
    "STREAK_3DAY",
    "STREAK_5DAY",
    "STREAK_7DAY",
    "STREAK_10DAY",
    "STREAK_20DAY",
    "STREAK_30DAY",
    "STREAK_40DAY",
    "STREAK_50DAY",
    "STREAK_60DAY",
    "WEEKLY_THRESHOLD_100_K2",
    "WEEKLY_THRESHOLD_125_K2",
    "WEEKLY_THRESHOLD_150_K2",
    "WEEKLY_THRESHOLD_100_34",
    "WEEKLY_THRESHOLD_125_34",
    "WEEKLY_THRESHOLD_150_34",
    "WEEKLY_THRESHOLD_100_56",
    "WEEKLY_THRESHOLD_125_56",
    "WEEKLY_THRESHOLD_150_56",
    "WEEKLY_THRESHOLD_100_78",
    "WEEKLY_THRESHOLD_125_78",
    "WEEKLY_THRESHOLD_150_78",
    "WEEKLY_THRESHOLD_100_912",
    "WEEKLY_THRESHOLD_125_912",
    "WEEKLY_THRESHOLD_150_912",
)


def _athlete1_offline():
    return build_athlete1_scenario(
        run_id="SEASON-SIM-2027-20260912T000000Z-athlete1",
        grade_band_id="recOFFLINEGRADE12BAND",
        goal_record_id="recOFFLINEGOALHIGHEST",
        goal_total_shots=12000,
        homework=[
            {
                "record_id": f"recOFFLINEHW{i:02d}",
                "slot": "HW1" if i % 2 else "HW2",
                "library_id": f"recOFFLINELIB{i:02d}",
                "display": f"HW{i}",
            }
            for i in range(1, 19)
        ],
        zoom_meetings=[
            {"record_id": "recOFFLINEZOOM1", "display": "Zoom A"},
            {"record_id": "recOFFLINEZOOM2", "display": "Zoom B"},
        ],
        weeks=[],
    )


class TestXpEventFamilies(unittest.TestCase):
    def test_classify_core_keys(self):
        self.assertEqual(classify_rule_key("SHOOTING_BASE"), "SUBMISSION_BASE")
        self.assertEqual(classify_rule_key("HOMEWORK_COMPLETION"), "HOMEWORK_COMPLETION")
        self.assertEqual(classify_rule_key("VIDEO_SUBMISSION"), "VIDEO_SUBMISSION")
        self.assertEqual(classify_rule_key("PERFECT_WEEK"), "PERFECT_WEEK")
        self.assertEqual(classify_rule_key("STREAK_7DAY"), "STREAK")
        self.assertEqual(classify_rule_key("WEEKLY_THRESHOLD_100_912"), "WEEKLY_THRESHOLD")
        self.assertEqual(classify_rule_key("ZOOM_ATTEND_BASE"), "ZOOM_ATTENDANCE")

    def test_live_snapshot_covers_sc002_families(self):
        rules = [{"Rule Key": k, "Active?": True} for k in LIVE_XP_REWARD_RULE_KEYS_20260912]
        report = sc002_family_gaps(rules)
        self.assertTrue(report["complete"], report["missing"])
        assert_sc002_xp_families_complete(rules)
        self.assertIn("ZOOM_RECORDING_CREDIT", CASCADE_ONLY_SOURCE_FAMILIES)
        self.assertIn("SHOT_MILESTONE", CASCADE_ONLY_SOURCE_FAMILIES)
        self.assertIn("LEVEL_PROGRESSION", CASCADE_ONLY_SOURCE_FAMILIES)

    def test_missing_shooting_base_is_detected(self):
        rules = [
            {"Rule Key": k, "Active?": True}
            for k in LIVE_XP_REWARD_RULE_KEYS_20260912
            if k != "SHOOTING_BASE"
        ]
        report = sc002_family_gaps(rules)
        self.assertIn("SUBMISSION_BASE", report["missing"])


class TestAthlete1PerfectWeek(unittest.TestCase):
    def test_athlete1_expects_zero_perfect_weeks(self):
        """SC-002 Athlete 1 is a mixed/negative PW path by design."""
        from season_simulation.scenario_base import AthleteScenario, DayPlan as BaseDayPlan

        scenario = _athlete1_offline()
        days = []
        for d in scenario.days:
            days.append(
                BaseDayPlan(
                    day_number=d.day_number,
                    activity_date=d.activity_date,
                    action=d.action,
                    shot_total=d.shot_total,
                    timing=d.timing,
                    write_on_day_number=d.write_on_day_number,
                    homework=tuple(d.homework or []),
                    video_feedback=bool(d.video_feedback),
                    video_count=1 if d.video_feedback else 0,
                    zoom_meeting_ids=tuple(d.zoom_meeting_ids or []),
                    zoom_modes=tuple(d.zoom_modes or []),
                    email_events=tuple(d.email_events or []),
                    notes=d.notes or "",
                    dedupe_key=d.dedupe_key or "",
                )
            )
        sc = AthleteScenario(
            profile="athlete1_sc002",
            version=scenario.version,
            seed=scenario.seed,
            run_id=scenario.run_id,
            athlete=scenario.athlete,
            grade_band_id=scenario.grade_band_id,
            goal_record_id=scenario.goal_record_id,
            goal_total_shots=scenario.goal_total_shots,
            days=days,
            zoom_selected=scenario.zoom_selected,
            homework_selected=scenario.homework_selected,
            intended_writes_summary=scenario.intended_writes_summary,
            intended_emails=scenario.intended_emails,
            cleanup_scope=scenario.cleanup_scope,
            gate_notes=scenario.gate_notes,
            meta=dict(scenario.meta or {}),
        )

        passes = count_perfect_week_passes(sc)
        self.assertEqual(passes, 0)
        evals = evaluate_all_perfect_weeks(sc)
        self.assertTrue(evals)
        self.assertTrue(all(not e.passes for e in evals))
        self.assertEqual(PERFECT_WEEK_VIDEO_MINIMUM, 3)
        self.assertEqual(len(VIDEO_FEEDBACK_DAYS), 4)
        self.assertEqual(SAME_DAY_SUBMIT_DAY, 8)


class TestFutureDateOverride(unittest.TestCase):
    def test_production_blocks_future_activity_dates(self):
        wall = datetime(2026, 9, 12, 12, 0, tzinfo=timezone.utc)
        d = activity_date_is_future_production(date(2027, 5, 1), wall_now=wall)
        self.assertTrue(d.is_future)
        self.assertFalse(d.counts_for_submission)

    def test_gated_formula_text_detection(self):
        self.assertFalse(
            formula_text_has_season_sim_gate(PRODUCTION_ACTIVITY_DATE_IS_FUTURE_FORMULA)
        )
        self.assertTrue(
            formula_text_has_season_sim_gate(GATED_ACTIVITY_DATE_IS_FUTURE_FORMULA)
        )

    def test_sim_clock_allows_same_day_under_gate(self):
        wall = datetime(2026, 9, 12, 12, 0, tzinfo=timezone.utc)
        marker = "SEASON-SIM|SEASON-SIM-2027-20260912T000000Z-athlete1"
        d = activity_date_is_future_gated(
            date(2027, 5, 8),
            wall_now=wall,
            season_sim_test_record=True,
            video_upload_note=marker,
            season_sim_clock_now=date(2027, 5, 8),
        )
        self.assertFalse(d.is_future)
        self.assertTrue(d.counts_for_submission)
        self.assertEqual(d.mode, "simulation_gated")


class TestHomeworkLifecyclePrep(unittest.TestCase):
    def test_product_expects_eighteen_active_pha(self):
        self.assertEqual(EXPECTED_ACTIVE_PHA_COUNT, 18)

    def test_offline_scenario_schedules_eighteen_when_phas_provided(self):
        s = _athlete1_offline()
        self.assertEqual(s.intended_writes_summary.get("homework_completions"), 18)
        self.assertEqual(s.meta.get("homework_selected_count"), 18)
        for day in s.days:
            for hw in day.homework:
                self.assertTrue(hw.get("pha_record_id") or hw.get("record_id"))
                self.assertIn(hw.get("outcome"), {"Satisfactory", "Needs Revision"})

    def test_live_four_pha_is_incomplete_for_final_run(self):
        """Document Production truth as of 2026-09-12: only Early Bird + Week 1."""
        live_active = 4
        self.assertLess(live_active, EXPECTED_ACTIVE_PHA_COUNT)
        self.assertEqual(EXPECTED_ACTIVE_PHA_COUNT - live_active, 14)


if __name__ == "__main__":
    unittest.main()
