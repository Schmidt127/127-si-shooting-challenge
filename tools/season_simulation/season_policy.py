"""Season calendar policy helpers for Athlete 1 simulation (2026–2027).

Mirrors ``lib/workflow-contracts/season-calendar.js`` for offline Python tests.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any, Sequence

# Confirmed 2026–2027 challenge calendar (America/Denver date keys).
EARLY_BIRD_START = date(2027, 4, 25)
EARLY_BIRD_END = date(2027, 5, 1)  # inclusive — SIM_START is the last Early Bird day
WEEK1_START = date(2027, 5, 2)
PROGRAM_END = date(2027, 6, 30)
COMMON_HOMEWORK_DUE_DATE = date(2027, 6, 29)
EXPECTED_ACTIVE_PHA_COUNT = 18
HOMEWORK_SLOTS_PER_HOMEWORK_WEEK = 2
REGULAR_HOMEWORK_WEEKS = frozenset(range(1, 9))  # 1..8
WEEK9_HAS_HOMEWORK = False


@dataclass(frozen=True)
class EarlyBirdDecision:
    activity_date: date
    in_early_bird_window: bool
    countable: bool
    note: str


@dataclass(frozen=True)
class HomeworkWeekOwnership:
    week_label: str
    ok: bool
    expect_homework: bool
    actual_active_pha_count: int
    reason: str


@dataclass(frozen=True)
class LateHomeworkDecision:
    credit_eligible: bool
    timing_status: str
    due_date: date | None
    reason: str


def is_early_bird_day(activity_date: date) -> EarlyBirdDecision:
    in_window = EARLY_BIRD_START <= activity_date <= EARLY_BIRD_END
    return EarlyBirdDecision(
        activity_date=activity_date,
        in_early_bird_window=in_window,
        countable=in_window,
        note=(
            "Activity Date falls in Early Bird window (countable)."
            if in_window
            else "Activity Date outside Early Bird window."
        ),
    )


def evaluate_homework_week_ownership(
    week_label: str,
    active_pha_count_for_week: int,
) -> HomeworkWeekOwnership:
    label = (week_label or "").strip()
    lower = label.lower()
    is_week9 = lower in {"week 9", "week9"}
    is_early = lower == "early bird"
    week_num = None
    if lower.startswith("week "):
        try:
            week_num = int(lower.split()[1])
        except (IndexError, ValueError):
            week_num = None

    if is_week9:
        ok = active_pha_count_for_week == 0 and WEEK9_HAS_HOMEWORK is False
        return HomeworkWeekOwnership(
            week_label=label,
            ok=ok,
            expect_homework=False,
            actual_active_pha_count=active_pha_count_for_week,
            reason=(
                "Week 9 correctly has no active homework."
                if ok
                else f"Week 9 must have 0 active PHA (got {active_pha_count_for_week})."
            ),
        )

    if is_early or (week_num in REGULAR_HOMEWORK_WEEKS):
        expect = HOMEWORK_SLOTS_PER_HOMEWORK_WEEK
        ok = active_pha_count_for_week == expect
        return HomeworkWeekOwnership(
            week_label=label,
            ok=ok,
            expect_homework=True,
            actual_active_pha_count=active_pha_count_for_week,
            reason=(
                f"{label} has {active_pha_count_for_week} active PHA (expect {expect})."
            ),
        )

    return HomeworkWeekOwnership(
        week_label=label,
        ok=True,
        expect_homework=False,
        actual_active_pha_count=active_pha_count_for_week,
        reason="Week label outside Early Bird / Weeks 1–9 homework policy.",
    )


def evaluate_late_homework(
    *,
    submission_date: date | None,
    due_date: date | None = COMMON_HOMEWORK_DUE_DATE,
) -> LateHomeworkDecision:
    """Late homework after common due date is not credit-eligible (product rule)."""
    if submission_date is None:
        return LateHomeworkDecision(
            credit_eligible=True,
            timing_status="unknown_submission_date",
            due_date=due_date,
            reason="Submission date missing; deadline not enforced.",
        )
    if due_date is None:
        return LateHomeworkDecision(
            credit_eligible=True,
            timing_status="no_due_date",
            due_date=None,
            reason="No due date; deadline not enforced.",
        )
    if submission_date > due_date:
        return LateHomeworkDecision(
            credit_eligible=False,
            timing_status="late_ineligible",
            due_date=due_date,
            reason=(
                f"Submission date {submission_date} is after assignment due date {due_date}."
            ),
        )
    return LateHomeworkDecision(
        credit_eligible=True,
        timing_status="on_time",
        due_date=due_date,
        reason="",
    )


def assert_expected_pha_count(homework: Sequence[Any]) -> None:
    if len(homework) != EXPECTED_ACTIVE_PHA_COUNT:
        raise ValueError(
            f"Expected {EXPECTED_ACTIVE_PHA_COUNT} active Program Homework Assignments, "
            f"got {len(homework)}"
        )


def week_label_for_activity_date(activity_date: date) -> str:
    """Best-effort label for planning (not a substitute for live Weeks rows)."""
    if EARLY_BIRD_START <= activity_date <= EARLY_BIRD_END:
        return "Early Bird"
    # Week 1 starts 2027-05-02 (Sunday); each week is Sun–Sat.
    if activity_date < WEEK1_START or activity_date > PROGRAM_END:
        return "Out of season"
    days_from_week1 = (activity_date - WEEK1_START).days
    week_num = days_from_week1 // 7 + 1
    if week_num > 9:
        return "Post-Challenge"
    return f"Week {week_num}"
