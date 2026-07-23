#!/usr/bin/env python3
"""
Season / intake date boundary evaluator (America/Denver).

Separates:
  - enrollment-open / enrollment-close
  - challenge start / challenge end
  - week start / week end
  - submission eligibility
  - early-bird (Mike decision — not assumed on/off)
  - preseason access
  - late enrollment
  - backdated submission

Read-only; no Airtable writes.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from typing import Any, Optional
from zoneinfo import ZoneInfo

DENVER = ZoneInfo("America/Denver")


@dataclass(frozen=True)
class SeasonCalendar:
    enrollment_open: date
    enrollment_close: date
    challenge_start: date
    challenge_end: date
    early_bird_start: Optional[date] = None
    early_bird_end: Optional[date] = None
    preseason_access_start: Optional[date] = None
    allow_late_enrollment: bool = False
    late_enrollment_close: Optional[date] = None
    allow_backdated_submission: bool = False
    backdate_max_days: int = 0
    timezone: str = "America/Denver"


@dataclass(frozen=True)
class WeekWindow:
    week_name: str
    start: date
    end: date
    intake_open: bool = True
    counts_for_xp: bool = True
    counts_for_leaderboard: bool = True
    week_type: str = "Regular"  # Early Bird | Regular | Final | Preseason


def parse_date(value: Any) -> date:
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.astimezone(DENVER).date()
    s = str(value).strip()
    if "T" in s:
        # ISO datetime — interpret in Denver if naive Z/offset handled by fromisoformat
        if s.endswith("Z"):
            s = s[:-1] + "+00:00"
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=DENVER)
        return dt.astimezone(DENVER).date()
    return date.fromisoformat(s[:10])


def denver_now(moment: Optional[datetime] = None) -> datetime:
    if moment is None:
        return datetime.now(tz=DENVER)
    if moment.tzinfo is None:
        return moment.replace(tzinfo=DENVER)
    return moment.astimezone(DENVER)


def denver_today(moment: Optional[datetime] = None) -> date:
    return denver_now(moment).date()


def is_on_or_after(d: date, boundary: date) -> bool:
    return d >= boundary


def is_on_or_before(d: date, boundary: date) -> bool:
    return d <= boundary


def evaluate_intake_state(calendar: SeasonCalendar, as_of: Optional[datetime] = None) -> dict[str, Any]:
    today = denver_today(as_of)
    open_d = calendar.enrollment_open
    close_d = calendar.enrollment_close

    before_open = today < open_d
    open_day = today == open_d
    within = open_d <= today <= close_d
    after_close = today > close_d

    late_ok = False
    if calendar.allow_late_enrollment and calendar.late_enrollment_close:
        late_ok = close_d < today <= calendar.late_enrollment_close

    early_bird = False
    if calendar.early_bird_start and calendar.early_bird_end:
        early_bird = calendar.early_bird_start <= today <= calendar.early_bird_end

    preseason = False
    if calendar.preseason_access_start:
        preseason = calendar.preseason_access_start <= today < calendar.challenge_start

    challenge_active = calendar.challenge_start <= today <= calendar.challenge_end

    if before_open:
        intake_status = "before_intake"
    elif within:
        intake_status = "intake_open"
    elif late_ok:
        intake_status = "late_enrollment"
    elif after_close:
        intake_status = "intake_closed"
    else:
        intake_status = "unknown"

    return {
        "asOfDate": today.isoformat(),
        "timezone": calendar.timezone,
        "intakeStatus": intake_status,
        "enrollmentAllowed": within or late_ok,
        "isIntakeOpenDay": open_day,
        "isIntakeCloseDay": today == close_d,
        "isChallengeStartDay": today == calendar.challenge_start,
        "isChallengeEndDay": today == calendar.challenge_end,
        "challengeActive": challenge_active,
        "earlyBirdPeriod": early_bird,
        "earlyBirdDecision": "MIKE_DECISION_REQUIRED",
        "preseasonAccess": preseason,
        "lateEnrollment": late_ok,
    }


def evaluate_submission_eligibility(
    calendar: SeasonCalendar,
    *,
    activity_date: date,
    as_of: Optional[datetime] = None,
    covering_week: Optional[WeekWindow] = None,
) -> dict[str, Any]:
    """Submission eligibility relative to challenge window and week coverage."""
    today = denver_today(as_of)
    findings = []
    allowed = True

    if activity_date > today and not calendar.allow_backdated_submission:
        # future activity is never eligible
        allowed = False
        findings.append("future_activity_date")

    if activity_date < calendar.challenge_start and not (
        calendar.preseason_access_start
        and calendar.preseason_access_start <= activity_date < calendar.challenge_start
    ):
        allowed = False
        findings.append("before_challenge_or_preseason")

    if activity_date > calendar.challenge_end:
        allowed = False
        findings.append("after_challenge_end")

    if calendar.allow_backdated_submission:
        max_back = calendar.backdate_max_days
        if (today - activity_date).days > max_back:
            allowed = False
            findings.append("backdate_exceeds_max_days")
    else:
        # Backdated relative to week end: still allowed if within challenge and week covers it
        if covering_week and not (covering_week.start <= activity_date <= covering_week.end):
            allowed = False
            findings.append("activity_date_outside_covering_week")

    if covering_week and not covering_week.intake_open:
        allowed = False
        findings.append("week_intake_closed")

    return {
        "activityDate": activity_date.isoformat(),
        "asOfDate": today.isoformat(),
        "submissionAllowed": allowed,
        "findings": findings,
        "weekName": covering_week.week_name if covering_week else None,
    }


def timezone_boundary_cases(calendar: SeasonCalendar) -> list[dict[str, Any]]:
    """Generate boundary moments around intake/challenge dates in America/Denver."""
    cases = []
    points = [
        ("one_day_before_intake", calendar.enrollment_open - timedelta(days=1), time(12, 0)),
        ("intake_open_start_denver", calendar.enrollment_open, time(0, 0)),
        ("intake_open_end_denver", calendar.enrollment_open, time(23, 59)),
        ("intake_close_end_denver", calendar.enrollment_close, time(23, 59)),
        ("challenge_start_denver", calendar.challenge_start, time(0, 0)),
        ("challenge_end_denver", calendar.challenge_end, time(23, 59)),
        # UTC equivalents that often confuse naive Date parsing
        ("intake_open_utc_previous_evening", calendar.enrollment_open, time(0, 0)),
    ]
    for name, d, t in points:
        moment = datetime(d.year, d.month, d.day, t.hour, t.minute, tzinfo=DENVER)
        state = evaluate_intake_state(calendar, moment)
        cases.append(
            {
                "caseId": name,
                "momentDenver": moment.isoformat(),
                "momentUtc": moment.astimezone(ZoneInfo("UTC")).isoformat(),
                "state": state,
            }
        )
    return cases


__all__ = [
    "DENVER",
    "SeasonCalendar",
    "WeekWindow",
    "denver_now",
    "denver_today",
    "evaluate_intake_state",
    "evaluate_submission_eligibility",
    "parse_date",
    "timezone_boundary_cases",
]
