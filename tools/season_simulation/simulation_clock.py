"""Controlled simulation clock for May–June 2027 season simulation.

Airtable ``CREATED_TIME()`` / ``Submitted At`` cannot be future-dated via API.
Business dates use writable ``Activity Date`` (and equivalent activity fields).

Production baseline (Submissions):
  Activity Date Is Future? compares Activity Date to NOW() for normal rows.
  Count This Submission? is 0 when Activity Date Is Future? = 1.

Temporary Season Sim gate (authorized runs only) may compare Activity Date to
``Season Sim Clock Now`` when ``Season Sim Test Record?`` is checked and
``Video Upload Note`` contains ``SEASON-SIM|``. Preflight must inspect the live
formula — do not assume NOW()-only forever.

This module does **not** alter production formulas.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import date, datetime, timedelta
from enum import Enum
from typing import Any, Iterable, Iterator, Sequence

from .constants import DENVER, SIM_END, SIM_START, SIMULATION_DAY_COUNT

# Live Submissions field ids (Production) — used when meta formula uses {fld…}.
FIELD_ID_ACTIVITY_DATE = "fldpkkSBsx8kQRZos"
FIELD_ID_ACTIVITY_DATE_IS_FUTURE = "fldyFAjhbfaC4LlPb"
FIELD_ID_SEASON_SIM_TEST_RECORD = "fldx964sodLvnCrWu"
FIELD_ID_SEASON_SIM_CLOCK_NOW = "fldyxzwotgqRhHIPC"
FIELD_ID_SEASON_SIM_TEST_SUBMITTED_AT = "fldD5fW93bsK42pPR"
FIELD_ID_VIDEO_UPLOAD_NOTE = "fldnUvkgsPsdrowqx"

SEASON_SIM_GATE_FIELD_NAMES = (
    "Season Sim Test Record?",
    "Season Sim Clock Now",
    "Season Sim Test Submitted At",
    "Video Upload Note",
)


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


@dataclass(frozen=True)
class ActivityDateFutureFormulaStatus:
    """Live inspection of Submissions.`Activity Date Is Future?`."""

    field_present: bool
    formula: str
    uses_now: bool
    gated_season_sim_active: bool
    references_season_sim_test_record: bool
    references_season_sim_clock_now: bool
    references_season_sim_marker: bool
    gate_fields_present: list[str]
    gate_fields_missing: list[str]
    safe_for_normal_athletes: bool
    blockers: tuple[str, ...]
    notes: tuple[str, ...]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _formula_text_from_field(field: dict[str, Any]) -> str:
    options = field.get("options") or {}
    return str(options.get("formula") or "")


def inspect_activity_date_is_future_formula(
    meta_tables: Sequence[dict[str, Any]],
) -> ActivityDateFutureFormulaStatus:
    """Inspect live meta for the temporary Season Sim gate vs NOW()-only.

    Detection is live (meta formula string + field presence), not a static warning.
    """
    by_name = {t.get("name"): t for t in meta_tables}
    sub = by_name.get("Submissions") or {}
    fields = list(sub.get("fields") or [])
    fields_by_name = {f.get("name"): f for f in fields}

    future_field = fields_by_name.get("Activity Date Is Future?")
    formula = _formula_text_from_field(future_field) if future_field else ""

    gate_present: list[str] = []
    gate_missing: list[str] = []
    for name in SEASON_SIM_GATE_FIELD_NAMES:
        if name in fields_by_name:
            gate_present.append(name)
        else:
            gate_missing.append(name)

    refs_test = (
        FIELD_ID_SEASON_SIM_TEST_RECORD in formula
        or "{Season Sim Test Record?}" in formula
    )
    refs_clock = (
        FIELD_ID_SEASON_SIM_CLOCK_NOW in formula
        or "{Season Sim Clock Now}" in formula
    )
    refs_marker = "SEASON-SIM|" in formula
    uses_now = "NOW()" in formula
    gated = bool(formula and refs_test and refs_marker and refs_clock)

    # Normal athletes stay on NOW() branch when gate checkbox/marker fail.
    safe_normal = bool(
        (not formula)
        or (uses_now and (not gated or (refs_test and refs_marker)))
    )

    blockers: list[str] = []
    notes: list[str] = []
    if not future_field:
        blockers.append(
            "Submissions.`Activity Date Is Future?` field missing from meta."
        )
    elif not formula:
        blockers.append(
            "Submissions.`Activity Date Is Future?` meta has no formula text."
        )
    elif gated:
        notes.append(
            "Live formula is Season Sim gated: sim rows use "
            "`Season Sim Clock Now` when `Season Sim Test Record?` is checked "
            "and `Video Upload Note` contains SEASON-SIM|; other rows still use NOW()."
        )
        if gate_missing:
            blockers.append(
                "Gated formula references Season Sim fields but schema missing: "
                + ", ".join(gate_missing)
            )
        if FIELD_ID_VIDEO_UPLOAD_NOTE not in formula and "{Video Upload Note}" not in formula:
            # Marker gate should bind Video Upload Note (field id or name).
            blockers.append(
                "Gated formula does not reference Video Upload Note "
                f"({FIELD_ID_VIDEO_UPLOAD_NOTE})."
            )
    elif uses_now:
        blockers.append(
            "Submissions.`Activity Date Is Future?` still compares Activity Date "
            "to NOW() only (no Season Sim gate). May–June 2027 dates will not "
            "count until wall-clock passes them OR the temporary gated formula "
            "is applied."
        )
    else:
        blockers.append(
            "Submissions.`Activity Date Is Future?` formula is neither the "
            "known NOW()-only baseline nor the documented Season Sim gate."
        )

    blockers.append(
        "Submissions.`Submitted At` is formula CREATED_TIME() — cannot be "
        "future-dated via API (use Season Sim Test Submitted At as surrogate)."
    )
    blockers.append(
        "Created Time on all tables reflects real write time, not simulation clock."
    )

    return ActivityDateFutureFormulaStatus(
        field_present=bool(future_field),
        formula=formula,
        uses_now=uses_now,
        gated_season_sim_active=gated,
        references_season_sim_test_record=refs_test,
        references_season_sim_clock_now=refs_clock,
        references_season_sim_marker=refs_marker,
        gate_fields_present=gate_present,
        gate_fields_missing=gate_missing,
        safe_for_normal_athletes=safe_normal,
        blockers=tuple(blockers),
        notes=tuple(notes),
    )
