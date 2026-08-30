"""Controlled simulation clock for May–June 2027 season simulation.

Airtable ``CREATED_TIME()`` / ``Submitted At`` cannot be future-dated via API.
Business dates use writable ``Activity Date`` (and equivalent activity fields).

Critical live formula (Submissions):
  Activity Date Is Future? = IF({Activity Date} > NOW(), 1, 0)
  Count This Submission? is 0 when Activity Date Is Future? = 1

Until wall-clock time reaches each Activity Date, OR a temporary simulation
override is applied (see README § Simulation clock), future Activity Dates
will not count. This module does **not** alter production formulas.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from enum import Enum
from typing import Iterable, Iterator, Sequence

from .constants import DENVER, SIM_END, SIM_START, SIMULATION_DAY_COUNT


class SubmissionTiming(str, Enum):
    SAME_DAY = "same_day"
    BACKDATED = "backdated"
    MISSED = "missed"


@dataclass(frozen=True)
class SimulationDay:
    day_number: int  # 1..61
    activity_date: date
    week_sunday: date  # Sunday start of Sunday–Saturday week containing activity_date
    week_saturday: date

    @property
    def iso(self) -> str:
        return self.activity_date.isoformat()


def sunday_of(d: date) -> date:
    """Return the Sunday on or before ``d`` (America/Denver calendar date)."""
    # Python: Monday=0 ... Sunday=6
    return d - timedelta(days=(d.weekday() + 1) % 7)


def saturday_of(d: date) -> date:
    return sunday_of(d) + timedelta(days=6)


def iter_simulation_dates(
    start: date = SIM_START,
    end: date = SIM_END,
) -> Iterator[date]:
    if end < start:
        raise ValueError(f"end {end} before start {start}")
    cur = start
    while cur <= end:
        yield cur
        cur += timedelta(days=1)


def build_simulation_days(
    start: date = SIM_START,
    end: date = SIM_END,
) -> list[SimulationDay]:
    days: list[SimulationDay] = []
    for i, d in enumerate(iter_simulation_dates(start, end), start=1):
        sun = sunday_of(d)
        days.append(
            SimulationDay(
                day_number=i,
                activity_date=d,
                week_sunday=sun,
                week_saturday=sun + timedelta(days=6),
            )
        )
    return days


def assert_window_integrity(
    days: Sequence[SimulationDay] | None = None,
    *,
    start: date = SIM_START,
    end: date = SIM_END,
    expected_count: int = SIMULATION_DAY_COUNT,
) -> list[SimulationDay]:
    resolved = list(days) if days is not None else build_simulation_days(start, end)
    if len(resolved) != expected_count:
        raise ValueError(
            f"Expected {expected_count} simulation days, got {len(resolved)}"
        )
    if resolved[0].activity_date != start or resolved[-1].activity_date != end:
        raise ValueError(
            f"Window mismatch: {resolved[0].activity_date}..{resolved[-1].activity_date} "
            f"!= {start}..{end}"
        )
    for i, day in enumerate(resolved, start=1):
        if day.day_number != i:
            raise ValueError(f"Day numbering broken at index {i}: {day}")
        if day.week_sunday != sunday_of(day.activity_date):
            raise ValueError(f"Week Sunday mismatch for {day}")
        if day.week_saturday != saturday_of(day.activity_date):
            raise ValueError(f"Week Saturday mismatch for {day}")
    return resolved


@dataclass
class SimulationClock:
    """Harness-side clock. Does not mutate Airtable Config or formulas.

    Attributes
    ----------
    enabled:
        When True, consumers treat ``current_date`` as authoritative for
        same-day / backdated classification and intended email scheduling.
    current_date:
        Simulated "today" (defaults to SIM_START).
    run_id:
        Stable identifier stamped on transactional records / local registry.
    """

    enabled: bool
    current_date: date
    run_id: str
    start: date = SIM_START
    end: date = SIM_END

    def __post_init__(self) -> None:
        if self.start > self.end:
            raise ValueError("start after end")
        if not (self.start <= self.current_date <= self.end):
            # Allow current_date slightly outside for post-season audit; warn via property.
            pass

    @property
    def day_number(self) -> int:
        if self.current_date < self.start:
            return 0
        if self.current_date > self.end:
            return (self.end - self.start).days + 1
        return (self.current_date - self.start).days + 1

    @property
    def days(self) -> list[SimulationDay]:
        return build_simulation_days(self.start, self.end)

    def advance_to(self, d: date) -> None:
        self.current_date = d

    def advance_day(self) -> date:
        self.current_date = self.current_date + timedelta(days=1)
        return self.current_date

    def classify_submission(
        self,
        activity_date: date,
        *,
        missed: bool = False,
    ) -> SubmissionTiming:
        if missed:
            return SubmissionTiming.MISSED
        if activity_date == self.current_date:
            return SubmissionTiming.SAME_DAY
        if activity_date < self.current_date:
            return SubmissionTiming.BACKDATED
        raise ValueError(
            f"Activity date {activity_date} is after simulated today {self.current_date}; "
            "future activity dates are not modeled as submissions in this harness."
        )

    def activity_datetime_iso(self, activity_date: date, hour: int = 18, minute: int = 0) -> str:
        """Denver-local ISO timestamp for Activity Date writes."""
        dt = datetime(
            activity_date.year,
            activity_date.month,
            activity_date.day,
            hour,
            minute,
            tzinfo=DENVER,
        )
        return dt.isoformat()

    def as_dict(self) -> dict:
        return {
            "enabled": self.enabled,
            "current_date": self.current_date.isoformat(),
            "day_number": self.day_number,
            "run_id": self.run_id,
            "start": self.start.isoformat(),
            "end": self.end.isoformat(),
            "simulation_day_count": (self.end - self.start).days + 1,
            "timezone": "America/Denver",
            "airtable_notes": {
                "activity_date_writable": True,
                "submitted_at_is_created_time_formula": True,
                "activity_date_is_future_uses_now": True,
                "temporary_override_required_before_early_run": True,
            },
        }


def week_boundaries_for_dates(dates: Iterable[date]) -> list[tuple[date, date]]:
    """Unique Sunday–Saturday windows covering the given dates, sorted."""
    seen: set[tuple[date, date]] = set()
    for d in dates:
        key = (sunday_of(d), saturday_of(d))
        seen.add(key)
    return sorted(seen)
