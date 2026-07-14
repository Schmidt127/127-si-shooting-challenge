#!/usr/bin/env python3
"""C-025 — offline contract for the corrected true-date deadline formula.

Mirrors docs/deploy-checklists/C-025-deadline-repair-design.md SS4: the fixed
`Calculated Recording Quiz Deadline` formula, using `Week End Date` (a real
date, sourced from Weeks.End Date) instead of the raw `Week` link field that
caused the live bug (result type collapsing to text because a linked-record
array was used where a date was expected).

No live Airtable calls. No network. No hardcoded season dates -- every test
uses relative offsets from arbitrary anchor dates, matching the design's
"no hardcoded season dates" requirement.
"""

from __future__ import annotations

from datetime import date, timedelta
import unittest


def recording_quiz_deadline(
    *,
    attendance_method: str,
    recording_available_at: date | None,
    week_end_date: date | None,
    makeup_window_days,
    deadline_mode,
) -> date | None:
    """Mirrors the corrected formula in C-025-deadline-repair-design.md SS4.

    Guard clause first (blank availability or non-Recording-Quiz row ->
    blank), then SWITCH on the resolved mode (blank mode -> "Later of Both"),
    with blank makeup days resolved to 7 inside the DATEADD branch.
    """
    if recording_available_at is None or attendance_method != "Recording Quiz":
        return None

    days = 7 if makeup_window_days is None else int(makeup_window_days)
    mode = deadline_mode or "Later of Both"
    days_deadline = recording_available_at + timedelta(days=days)

    if mode == "Days After Recording Available":
        return days_deadline

    if mode == "End of Program Week":
        return week_end_date

    if mode == "Earlier of Both":
        if week_end_date is None:
            return days_deadline
        if recording_available_at is None:
            return week_end_date
        return min(days_deadline, week_end_date)

    # Later of Both (default, also the blank-mode fallback)
    if week_end_date is None:
        return days_deadline
    if recording_available_at is None:
        return week_end_date
    return max(days_deadline, week_end_date)


class TestGuardClause(unittest.TestCase):
    def test_live_attendance_never_gets_a_deadline(self):
        self.assertIsNone(
            recording_quiz_deadline(
                attendance_method="Live",
                recording_available_at=date(2026, 7, 1),
                week_end_date=date(2026, 7, 10),
                makeup_window_days=7,
                deadline_mode="Later of Both",
            )
        )

    def test_blank_available_date_returns_blank(self):
        self.assertIsNone(
            recording_quiz_deadline(
                attendance_method="Recording Quiz",
                recording_available_at=None,
                week_end_date=date(2026, 7, 10),
                makeup_window_days=7,
                deadline_mode="Days After Recording Available",
            )
        )


class TestDaysAfterRecordingAvailable(unittest.TestCase):
    def test_seven_day_default(self):
        available = date(2026, 7, 1)
        deadline = recording_quiz_deadline(
            attendance_method="Recording Quiz",
            recording_available_at=available,
            week_end_date=date(2026, 7, 3),
            makeup_window_days=None,  # blank -> fallback 7
            deadline_mode="Days After Recording Available",
        )
        self.assertEqual(deadline, available + timedelta(days=7))

    def test_configured_days_changes_deadline(self):
        available = date(2026, 7, 1)
        for days in (3, 10, 14):
            deadline = recording_quiz_deadline(
                attendance_method="Recording Quiz",
                recording_available_at=available,
                week_end_date=date(2026, 7, 3),
                makeup_window_days=days,
                deadline_mode="Days After Recording Available",
            )
            self.assertEqual(deadline, available + timedelta(days=days))


class TestEndOfProgramWeek(unittest.TestCase):
    def test_uses_week_end_date_directly_not_the_link(self):
        week_end = date(2026, 7, 20)
        deadline = recording_quiz_deadline(
            attendance_method="Recording Quiz",
            recording_available_at=date(2026, 7, 1),
            week_end_date=week_end,
            makeup_window_days=7,
            deadline_mode="End of Program Week",
        )
        self.assertEqual(deadline, week_end)

    def test_blank_week_end_date_returns_blank_not_error(self):
        deadline = recording_quiz_deadline(
            attendance_method="Recording Quiz",
            recording_available_at=date(2026, 7, 1),
            week_end_date=None,
            makeup_window_days=7,
            deadline_mode="End of Program Week",
        )
        self.assertIsNone(deadline)


class TestLaterOfBoth(unittest.TestCase):
    def test_default_mode_when_blank(self):
        available = date(2026, 7, 1)
        week_end = date(2026, 7, 20)
        deadline = recording_quiz_deadline(
            attendance_method="Recording Quiz",
            recording_available_at=available,
            week_end_date=week_end,
            makeup_window_days=7,
            deadline_mode=None,  # blank -> Later of Both
        )
        self.assertEqual(deadline, week_end)  # week end (7/20) later than +7 days (7/8)

    def test_picks_the_later_date(self):
        available = date(2026, 7, 1)
        # +7 days = 7/8, which IS later than a week end of 7/3
        deadline = recording_quiz_deadline(
            attendance_method="Recording Quiz",
            recording_available_at=available,
            week_end_date=date(2026, 7, 3),
            makeup_window_days=7,
            deadline_mode="Later of Both",
        )
        self.assertEqual(deadline, available + timedelta(days=7))

    def test_falls_back_to_days_deadline_when_week_end_blank(self):
        available = date(2026, 7, 1)
        deadline = recording_quiz_deadline(
            attendance_method="Recording Quiz",
            recording_available_at=available,
            week_end_date=None,
            makeup_window_days=7,
            deadline_mode="Later of Both",
        )
        self.assertEqual(deadline, available + timedelta(days=7))


class TestEarlierOfBoth(unittest.TestCase):
    def test_picks_the_earlier_date(self):
        available = date(2026, 7, 1)
        deadline = recording_quiz_deadline(
            attendance_method="Recording Quiz",
            recording_available_at=available,
            week_end_date=date(2026, 7, 3),
            makeup_window_days=7,
            deadline_mode="Earlier of Both",
        )
        self.assertEqual(deadline, date(2026, 7, 3))

    def test_falls_back_to_days_deadline_when_week_end_blank(self):
        available = date(2026, 7, 1)
        deadline = recording_quiz_deadline(
            attendance_method="Recording Quiz",
            recording_available_at=available,
            week_end_date=None,
            makeup_window_days=5,
            deadline_mode="Earlier of Both",
        )
        self.assertEqual(deadline, available + timedelta(days=5))


class TestNoHardcodedSeasonDates(unittest.TestCase):
    def test_deadline_tracks_arbitrary_anchor_dates_not_fixed_season(self):
        """Prove the formula has no dependency on any literal season date --
        shifting every input by an arbitrary offset shifts the output by the
        same offset, for all four modes."""
        offset = timedelta(days=137)
        base_available = date(2025, 1, 5)
        base_week_end = date(2025, 1, 12)

        for mode in (
            "Days After Recording Available",
            "End of Program Week",
            "Later of Both",
            "Earlier of Both",
        ):
            d1 = recording_quiz_deadline(
                attendance_method="Recording Quiz",
                recording_available_at=base_available,
                week_end_date=base_week_end,
                makeup_window_days=4,
                deadline_mode=mode,
            )
            d2 = recording_quiz_deadline(
                attendance_method="Recording Quiz",
                recording_available_at=base_available + offset,
                week_end_date=base_week_end + offset,
                makeup_window_days=4,
                deadline_mode=mode,
            )
            self.assertEqual(d2, d1 + offset, msg=f"mode={mode}")


class TestPastDeadlineViewFilterLogic(unittest.TestCase):
    """Mirrors the three view filters in C-025-deadline-repair-design.md SS5:
    Attendance Method = Recording Quiz; true-date deadline before today;
    Zoom Credit Approved? empty/false."""

    @staticmethod
    def is_past_deadline_and_unapproved(
        *,
        attendance_method: str,
        deadline: date | None,
        today: date,
        credit_approved: bool,
    ) -> bool:
        if attendance_method != "Recording Quiz":
            return False
        if deadline is None:
            return False
        if deadline >= today:
            return False
        return not credit_approved

    def test_past_deadline_unapproved_shows_in_view(self):
        self.assertTrue(
            self.is_past_deadline_and_unapproved(
                attendance_method="Recording Quiz",
                deadline=date(2026, 7, 1),
                today=date(2026, 7, 13),
                credit_approved=False,
            )
        )

    def test_past_deadline_but_approved_excluded(self):
        self.assertFalse(
            self.is_past_deadline_and_unapproved(
                attendance_method="Recording Quiz",
                deadline=date(2026, 7, 1),
                today=date(2026, 7, 13),
                credit_approved=True,
            )
        )

    def test_not_yet_past_deadline_excluded(self):
        self.assertFalse(
            self.is_past_deadline_and_unapproved(
                attendance_method="Recording Quiz",
                deadline=date(2026, 7, 20),
                today=date(2026, 7, 13),
                credit_approved=False,
            )
        )

    def test_live_attendance_never_shows_in_view(self):
        self.assertFalse(
            self.is_past_deadline_and_unapproved(
                attendance_method="Live",
                deadline=date(2026, 7, 1),
                today=date(2026, 7, 13),
                credit_approved=False,
            )
        )

    def test_blank_deadline_excluded_not_treated_as_past(self):
        self.assertFalse(
            self.is_past_deadline_and_unapproved(
                attendance_method="Recording Quiz",
                deadline=None,
                today=date(2026, 7, 13),
                credit_approved=False,
            )
        )


if __name__ == "__main__":
    unittest.main()
