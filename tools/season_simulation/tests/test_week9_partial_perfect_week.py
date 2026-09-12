"""Week 9 partial-week Perfect Week regression tests.

Named Week 9 (Jun 27–30) is the 10th challenge-week ordinal: official, 4 days,
4/7 shooting target, normal daily minimum, video min still 3, homework vacuously
satisfied when Production has 0 Week-9 PHAs.
"""

from __future__ import annotations

import unittest
from dataclasses import replace
from datetime import date

from season_simulation.perfect_week_eval import (
    PERFECT_WEEK_VIDEO_MINIMUM,
    count_perfect_week_passes,
    evaluate_perfect_week,
)
from season_simulation.scenario_base import AthleteScenario, DayPlan
from season_simulation.scenarios_sc001 import build_athlete1_perfect_scenario
from season_simulation.season_policy import (
    CHALLENGE_WEEK_ORDINALS,
    challenge_week_ordinal,
    partial_week_shot_target,
    week_end_cutoff_for_label,
    week_label_for_activity_date,
)


def _perfect_fixture() -> AthleteScenario:
    labels = ("Early Bird",) + tuple(f"Week {i}" for i in range(1, 9))
    weeks = [{"record_id": f"recW{i}", "name": labels[i]} for i in range(len(labels))]
    homework = []
    for i in range(1, 19):
        label = labels[(i - 1) // 2]
        homework.append(
            {
                "record_id": f"recHW{i:02d}",
                "slot": "HW1" if i % 2 else "HW2",
                "week_id": weeks[(i - 1) // 2]["record_id"],
                "display": f"PHA | {label} | HW{'1' if i % 2 else '2'}",
            }
        )
    return build_athlete1_perfect_scenario(
        run_id="SEASON-SIM-2027-20260101T000000Z-pw9",
        grade_band_id="recBAND912",
        goal_record_id="recGOAL",
        goal_total_shots=12000,
        homework=homework,
        zoom_meetings=[
            {"record_id": "recZlive", "display": "Live"},
            {"record_id": "recZrec", "display": "Recording"},
        ],
        weeks=weeks,
    )


def _with_days(scenario: AthleteScenario, days: list[DayPlan]) -> AthleteScenario:
    return replace(scenario, days=days)


def _map_week9(
    scenario: AthleteScenario,
    mapper,
) -> AthleteScenario:
    new_days: list[DayPlan] = []
    for d in scenario.days:
        if week_label_for_activity_date(d.activity_date) == "Week 9":
            new_days.append(mapper(d))
        else:
            new_days.append(d)
    return _with_days(scenario, new_days)


class TestWeek9PartialPerfectWeek(unittest.TestCase):
    def test_week9_is_tenth_challenge_week_ordinal(self):
        self.assertEqual(challenge_week_ordinal("Week 9"), 10)
        self.assertEqual(challenge_week_ordinal("Early Bird"), 1)
        names = [name for _o, name, _s, _e in CHALLENGE_WEEK_ORDINALS]
        self.assertEqual(names[-1], "Week 9")
        self.assertEqual(len(CHALLENGE_WEEK_ORDINALS), 10)

    def test_week9_cutoff_is_june_30(self):
        self.assertEqual(week_end_cutoff_for_label("Week 9"), date(2027, 6, 30))
        self.assertEqual(week_end_cutoff_for_label("Week 8"), date(2027, 6, 26))

    def test_partial_target_is_four_sevenths(self):
        normal = 1254
        self.assertEqual(partial_week_shot_target(normal, 4), round(normal * 4 / 7))

    def test_pass_case_perfect_athlete_week9(self):
        scenario = _perfect_fixture()
        week9 = [
            d
            for d in scenario.days
            if week_label_for_activity_date(d.activity_date) == "Week 9"
        ]
        self.assertEqual(len(week9), 4)
        self.assertEqual(
            [d.activity_date for d in week9],
            [date(2027, 6, 27), date(2027, 6, 28), date(2027, 6, 29), date(2027, 6, 30)],
        )
        self.assertTrue(all(d.action == "submit" for d in week9))
        video_count = sum(1 for d in week9 if d.video_feedback or d.video_count)
        self.assertGreaterEqual(video_count, PERFECT_WEEK_VIDEO_MINIMUM)
        self.assertEqual(
            [hw for d in week9 for hw in d.homework if hw.get("week_label") == "Week 9"],
            [],
        )
        ev = evaluate_perfect_week(scenario, "Week 9")
        self.assertTrue(ev.passes, ev)
        self.assertIn(ev.outcome, {"pass", "pass_partial_window"})

    def test_fail_only_three_qualifying_dates(self):
        scenario = _map_week9(
            _perfect_fixture(),
            lambda d: replace(d, action="miss", shot_total=0, video_feedback=False, video_count=0)
            if d.activity_date == date(2027, 6, 30)
            else d,
        )
        ev = evaluate_perfect_week(scenario, "Week 9")
        self.assertFalse(ev.passes)
        self.assertIn("daily_shooting", ev.failure_reasons)

    def test_fail_four_dates_but_below_four_sevenths_target(self):
        scenario = _map_week9(
            _perfect_fixture(),
            lambda d: replace(d, shot_total=10),
        )
        ev = evaluate_perfect_week(scenario, "Week 9")
        self.assertFalse(ev.passes)
        self.assertTrue(
            "weekly_shots" in ev.failure_reasons or "daily_shooting" in ev.failure_reasons,
            ev,
        )

    def test_fail_homework_after_week9_cutoff(self):
        """Synthetic Week-9 homework completed after Jun 30 → PW fails; XP still ok."""
        base = _perfect_fixture()

        def add_late_hw(d: DayPlan) -> DayPlan:
            if d.activity_date != date(2027, 6, 30):
                return d
            hw = list(d.homework) + [
                {
                    "pha_record_id": "recHW_W9_SYN",
                    "week_label": "Week 9",
                    "outcome": "Satisfactory",
                    "homework_xp_eligible": True,
                    "perfect_week_homework_eligible": False,
                    "credit_eligible": True,
                    "late_status": "late_xp_ok_no_retro_pw",
                    "timing_note": "late_xp_ok_no_retro_pw",
                }
            ]
            return replace(d, homework=hw)

        scenario = _map_week9(base, add_late_hw)
        ev = evaluate_perfect_week(scenario, "Week 9")
        self.assertFalse(ev.passes)
        self.assertIn("homework_timing", ev.failure_reasons)

    def test_fail_required_zoom_missing(self):
        from season_simulation import perfect_week_eval as pwe

        original = pwe.SC001_ZOOM_REQUIRED_WEEKS
        try:
            pwe.SC001_ZOOM_REQUIRED_WEEKS = frozenset(set(original) | {"Week 9"})
            scenario = _map_week9(
                _perfect_fixture(),
                lambda d: replace(d, zoom_meeting_ids=[], zoom_modes=[]),
            )
            ev = evaluate_perfect_week(scenario, "Week 9")
            self.assertFalse(ev.passes)
            self.assertIn("required_zoom", ev.failure_reasons)
        finally:
            pwe.SC001_ZOOM_REQUIRED_WEEKS = original

    def test_fail_video_requirement_not_met(self):
        scenario = _map_week9(
            _perfect_fixture(),
            lambda d: replace(d, video_feedback=False, video_count=0),
        )
        ev = evaluate_perfect_week(scenario, "Week 9")
        self.assertFalse(ev.passes)
        self.assertIn("video_count", ev.failure_reasons)

    def test_perfect_athlete_earns_ten_perfect_weeks(self):
        scenario = _perfect_fixture()
        self.assertEqual(count_perfect_week_passes(scenario), 10)
        self.assertEqual(sum(1 for d in scenario.days if d.action == "miss"), 0)
        self.assertEqual(sum(1 for d in scenario.days if d.action == "submit"), 67)
        hw = [h for d in scenario.days for h in d.homework]
        self.assertEqual(len(hw), 18)
        self.assertTrue(all(h.get("outcome") == "Satisfactory" for h in hw))
        self.assertTrue(all(h.get("perfect_week_homework_eligible") for h in hw))


if __name__ == "__main__":
    unittest.main()
