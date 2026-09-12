"""Season calendar policy helpers for Athlete 1 simulation (2026–2027).

Mirrors ``lib/workflow-contracts/season-calendar.js`` for offline Python tests.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any, Sequence

# Confirmed 2026–2027 challenge calendar (America/Denver date keys).
EARLY_BIRD_START = date(2027, 4, 25)
EARLY_BIRD_END = date(2027, 5, 1)  # inclusive — full Early Bird Sun–Sat week
WEEK1_START = date(2027, 5, 2)
PROGRAM_END = date(2027, 6, 30)  # inclusive end of challenge (11:59 PM Denver)
# Catalog/display recommendation only — NOT a normal Homework XP cutoff.
COMMON_HOMEWORK_DUE_DATE = date(2027, 6, 29)
EXPECTED_ACTIVE_PHA_COUNT = 18
HOMEWORK_SLOTS_PER_HOMEWORK_WEEK = 2
REGULAR_HOMEWORK_WEEKS = frozenset(range(1, 9))  # 1..8
# Production PHA schedule: Early Bird + Weeks 1–8 (2 slots each) = 18.
# Named Week 9 has 0 PHA rows; Perfect Week homework passes vacuously.
WEEK9_HAS_HOMEWORK = False

# Official Week End Saturday (or Wed for Week 9) for Perfect Week homework.
WEEK_END_CUTOFFS: dict[str, date] = {
    "Early Bird": date(2027, 5, 1),
    "Week 1": date(2027, 5, 8),
    "Week 2": date(2027, 5, 15),
    "Week 3": date(2027, 5, 22),
    "Week 4": date(2027, 5, 29),
    "Week 5": date(2027, 6, 5),
    "Week 6": date(2027, 6, 12),
    "Week 7": date(2027, 6, 19),
    "Week 8": date(2027, 6, 26),
    "Week 9": date(2027, 6, 30),  # partial week ends Wed Jun 30
}

# Challenge-week ordinal (1..10) vs business name (Early Bird + Week 1–9).
CHALLENGE_WEEK_ORDINALS: tuple[tuple[int, str, date, date], ...] = (
    (1, "Early Bird", date(2027, 4, 25), date(2027, 5, 1)),
    (2, "Week 1", date(2027, 5, 2), date(2027, 5, 8)),
    (3, "Week 2", date(2027, 5, 9), date(2027, 5, 15)),
    (4, "Week 3", date(2027, 5, 16), date(2027, 5, 22)),
    (5, "Week 4", date(2027, 5, 23), date(2027, 5, 29)),
    (6, "Week 5", date(2027, 5, 30), date(2027, 6, 5)),
    (7, "Week 6", date(2027, 6, 6), date(2027, 6, 12)),
    (8, "Week 7", date(2027, 6, 13), date(2027, 6, 19)),
    (9, "Week 8", date(2027, 6, 20), date(2027, 6, 26)),
    (10, "Week 9", date(2027, 6, 27), date(2027, 6, 30)),
)


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
    """Separated Homework XP vs Perfect Week homework timing eligibility.

    ``homework_xp_eligible`` — Satisfactory Homework earns normal XP regardless of lateness.
    ``perfect_week_homework_eligible`` — must be on/before assigned Week End cutoff.
    ``credit_eligible`` — backward-compat alias for ``homework_xp_eligible``.
    """

    homework_xp_eligible: bool
    perfect_week_homework_eligible: bool
    timing_status: str
    due_date: date | None
    week_end_cutoff: date | None
    reason: str

    @property
    def credit_eligible(self) -> bool:
        """Deprecated alias — means normal Homework XP eligible, not Perfect Week."""
        return self.homework_xp_eligible


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
                "Week 9 correctly has no active PHA (Production: 18 = EB + Weeks 1–8)."
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


def week_end_cutoff_for_label(week_label: str) -> date | None:
    return WEEK_END_CUTOFFS.get((week_label or "").strip())


def evaluate_late_homework(
    *,
    submission_date: date | None,
    due_date: date | None = COMMON_HOMEWORK_DUE_DATE,
    week_label: str | None = None,
    week_end_cutoff: date | None = None,
) -> LateHomeworkDecision:
    """Evaluate Homework timing with separated XP vs Perfect Week semantics.

    - Normal Homework XP: always eligible once Satisfactory (PHA Due Date is
      display/recommendation only — never an XP expiration).
    - Perfect Week homework: must complete by assigned Week End cutoff
      (Saturday 11:59 PM Denver for Early Bird / Weeks 1–8; Wed Jun 30 for Week 9).
    """
    cutoff = week_end_cutoff
    if cutoff is None and week_label:
        cutoff = week_end_cutoff_for_label(week_label)

    if submission_date is None:
        return LateHomeworkDecision(
            homework_xp_eligible=True,
            perfect_week_homework_eligible=False,
            timing_status="unknown_submission_date",
            due_date=due_date,
            week_end_cutoff=cutoff,
            reason=(
                "Submission date missing; Homework XP still allowed once Satisfactory. "
                "Perfect Week requires a known on-time Submission Date vs Week End."
            ),
        )

    # Perfect Week timing uses Week End cutoff when known.
    if cutoff is not None:
        if submission_date > cutoff:
            return LateHomeworkDecision(
                homework_xp_eligible=True,
                perfect_week_homework_eligible=False,
                timing_status="late_xp_ok_no_retro_pw",
                due_date=due_date,
                week_end_cutoff=cutoff,
                reason=(
                    f"Submission date {submission_date} is after Week End {cutoff}. "
                    "Normal Homework XP still applies; Perfect Week not retroactively repaired."
                ),
            )
        return LateHomeworkDecision(
            homework_xp_eligible=True,
            perfect_week_homework_eligible=True,
            timing_status="on_time",
            due_date=due_date,
            week_end_cutoff=cutoff,
            reason="",
        )

    # No Week End known — do not treat catalog Due Date as XP cutoff.
    return LateHomeworkDecision(
        homework_xp_eligible=True,
        perfect_week_homework_eligible=True,
        timing_status="on_time_no_week_end",
        due_date=due_date,
        week_end_cutoff=None,
        reason=(
            "Week End cutoff unknown; Homework XP allowed. "
            f"Catalog due date {due_date} is display-only and does not block XP."
            if due_date
            else "No Week End or due date; deadlines not enforced."
        ),
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


def challenge_week_ordinal(week_label: str) -> int | None:
    """Map business week name → challenge-week ordinal (1..10)."""
    label = (week_label or "").strip()
    for ordinal, name, _start, _end in CHALLENGE_WEEK_ORDINALS:
        if name == label:
            return ordinal
    return None


def partial_week_shot_target(normal_weekly_target: int, official_days: int) -> int:
    """Scale weekly shot target by official challenge days / 7."""
    if official_days <= 0:
        return 0
    if official_days >= 7:
        return normal_weekly_target
    return max(1, round(normal_weekly_target * official_days / 7))
