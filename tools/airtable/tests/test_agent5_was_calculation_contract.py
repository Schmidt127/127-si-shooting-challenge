#!/usr/bin/env python3
"""Agent 5 — Weekly Athlete Summary calculation contract (SC-036).

Mirrors automation 072 v3.9 calculation semantics:
- Days Logged = DISTINCT activity-date keys of counted submissions
- Total Shots = sum over submissions inside the week window
- activity-date filtering is inclusive Sunday..Saturday on date keys
- date keys resolve in America/Denver (datetime cells shift from UTC)
- weekly XP = sum of bucket displays with stored-value fallback
- empty weeks produce zeroes, never crashes or blanks
"""

from __future__ import annotations

import unittest
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

DENVER = ZoneInfo("America/Denver")


def denver_date_key(value: str) -> str:
    """Mirror 072 toLocalDateKey: plain dates pass; datetimes -> Denver date."""
    if not value:
        return ""
    if len(value) == 10 and value[4] == "-" and value[7] == "-":
        return value
    dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return dt.astimezone(DENVER).strftime("%Y-%m-%d")


def inside_week(date_key: str, start_key: str, end_key: str) -> bool:
    if not date_key or not start_key or not end_key:
        return True  # 072 keeps rows it cannot date rather than dropping them
    return start_key <= date_key <= end_key


def summarize(submissions, start_key, end_key):
    rows = [
        s for s in submissions
        if inside_week(denver_date_key(s["date"]), start_key, end_key)
    ]
    counted = [s for s in rows if s.get("counted", True)]
    return {
        "days_logged": len({denver_date_key(s["date"]) for s in counted
                            if denver_date_key(s["date"])}),
        "total_shots": sum(int(s.get("shots") or 0) for s in rows),
        "submission_count": len(rows),
    }


def weekly_xp(calculated: float, stored: float) -> float:
    """072: prefer calculated; fall back to stored when calculated is 0."""
    return calculated or stored


class TestDaysLoggedDistinct(unittest.TestCase):
    WEEK = ("2026-07-19", "2026-07-25")

    def test_two_submissions_same_day_count_one_day(self):
        result = summarize(
            [
                {"date": "2026-07-23", "shots": 25},
                {"date": "2026-07-23", "shots": 30},
            ],
            *self.WEEK,
        )
        self.assertEqual(result["days_logged"], 1)
        self.assertEqual(result["total_shots"], 55)

    def test_uncounted_submission_excluded_from_days_but_shots_summed(self):
        result = summarize(
            [
                {"date": "2026-07-23", "shots": 25, "counted": True},
                {"date": "2026-07-24", "shots": 10, "counted": False},
            ],
            *self.WEEK,
        )
        self.assertEqual(result["days_logged"], 1)
        self.assertEqual(result["total_shots"], 35)


class TestWeekWindowAndTimezone(unittest.TestCase):
    WEEK = ("2026-05-31", "2026-06-06")  # Sunday .. Saturday (PROD Week 6)

    def test_saturday_submission_not_dropped(self):
        result = summarize([{"date": "2026-06-06", "shots": 40}], *self.WEEK)
        self.assertEqual(result["submission_count"], 1)

    def test_sunday_next_week_excluded(self):
        result = summarize([{"date": "2026-06-07", "shots": 40}], *self.WEEK)
        self.assertEqual(result["submission_count"], 0)

    def test_datetime_utc_late_saturday_stays_in_week(self):
        # Saturday 23:00 Denver = Sunday 05:00 UTC — must stay Saturday.
        result = summarize(
            [{"date": "2026-06-07T05:00:00Z", "shots": 15}], *self.WEEK
        )
        self.assertEqual(result["submission_count"], 1)
        self.assertEqual(result["days_logged"], 1)

    def test_datetime_utc_early_sunday_denver_excluded(self):
        # Sunday 06:01 UTC = Sunday 00:01 Denver — next week.
        result = summarize(
            [{"date": "2026-06-07T06:01:00Z", "shots": 15}], *self.WEEK
        )
        self.assertEqual(result["submission_count"], 0)


class TestEmptyStates(unittest.TestCase):
    def test_empty_week_zeroes(self):
        result = summarize([], "2026-07-19", "2026-07-25")
        self.assertEqual(result, {"days_logged": 0, "total_shots": 0,
                                  "submission_count": 0})

    def test_missing_shot_values_treated_as_zero(self):
        result = summarize(
            [{"date": "2026-07-23", "shots": None}], "2026-07-19", "2026-07-25"
        )
        self.assertEqual(result["total_shots"], 0)


class TestWeeklyXpFallback(unittest.TestCase):
    def test_calculated_preferred(self):
        self.assertEqual(weekly_xp(85, 40), 85)

    def test_stored_fallback_when_no_events(self):
        self.assertEqual(weekly_xp(0, 40), 40)

    def test_both_zero_stays_zero(self):
        self.assertEqual(weekly_xp(0, 0), 0)


class TestLiveScheduleFacts(unittest.TestCase):
    """Guard the live PROD structural facts the schedulers depend on."""

    def test_prod_week6_end_datetime_is_denver_saturday(self):
        self.assertEqual(denver_date_key("2026-06-07T05:59:00.000Z"), "2026-06-06")

    def test_sunday_five_am_run_is_after_week_close(self):
        run = datetime(2026, 6, 7, 5, 0, tzinfo=DENVER)
        week_end = datetime(2026, 6, 6, 23, 59, tzinfo=DENVER)
        self.assertGreater(run, week_end)
        self.assertLess(run - week_end, timedelta(hours=6))


if __name__ == "__main__":
    unittest.main()
