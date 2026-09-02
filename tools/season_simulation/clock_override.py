"""Gated simulation clock override ??? models Production vs season-sim behavior.

Live Production (verified 2026-09-02):
  Activity Date Is Future? =
    IF({Activity Date}, IF({Activity Date} > NOW(), 1, 0), BLANK())
  Count This Submission? returns 0 when Activity Date Is Future? = 1
  Submitted At = CREATED_TIME()  (API cannot backdate)
  Perfect Week Grace Eligible? requires Activity Date <= TODAY() unless
    Perfect Week Manual Exception? is checked

This module does **not** mutate Airtable. It documents and evaluates the
smallest reversible gated override so May???June 2027 Activity Dates can count
on disposable simulation records without weakening NOW()/TODAY() for normal
athletes.

Gate (both required for override path):
  1. Submissions.`Season Sim Test Record?` = checked
  2. Submissions.`Video Upload Note` contains run marker ``SEASON-SIM|???``

When the gate fails ??? Production formulas unchanged (NOW() / CREATED_TIME()).
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import date, datetime
from typing import Any

from .constants import RUN_MARKER_PREFIX, SIM_END, SIM_START
from .simulation_clock import (
    FIELD_ID_SEASON_SIM_CLOCK_NOW,
    FIELD_ID_SEASON_SIM_TEST_RECORD,
    FIELD_ID_VIDEO_UPLOAD_NOTE,
)


# Field names Mike must create (or confirm) before an early calendar execute.
SEASON_SIM_TEST_RECORD_FIELD = "Season Sim Test Record?"
SEASON_SIM_CLOCK_NOW_FIELD = "Season Sim Clock Now"
SEASON_SIM_TEST_SUBMITTED_AT_FIELD = "Season Sim Test Submitted At"

# Existing Production fields reused only on disposable sim rows.
VIDEO_UPLOAD_NOTE_FIELD = "Video Upload Note"
PERFECT_WEEK_MANUAL_EXCEPTION_FIELD = "Perfect Week Manual Exception?"
ACTIVITY_DATE_IS_FUTURE_FIELD = "Activity Date Is Future?"
COUNT_THIS_SUBMISSION_FIELD = "Count This Submission?"
SUBMITTED_AT_FIELD = "Submitted At"
SUBMITTED_SAME_DAY_FIELD = "Submitted Same Day?"


def formula_text_has_season_sim_gate(formula_text: str | None) -> bool:
    """Detect temporary Season Sim gate in live Meta formula text.

    Airtable Meta API returns field **ids** inside braces (``{fld…}``), not
    display names. Match either form so preflight/execute do not false-negative
    after a correct OMNI paste.
    """
    if not formula_text:
        return False
    text = formula_text
    refs_test = (
        FIELD_ID_SEASON_SIM_TEST_RECORD in text
        or SEASON_SIM_TEST_RECORD_FIELD in text
        or "Season Sim Test Record" in text
    )
    refs_marker = "SEASON-SIM|" in text
    refs_clock = (
        FIELD_ID_SEASON_SIM_CLOCK_NOW in text
        or SEASON_SIM_CLOCK_NOW_FIELD in text
    )
    refs_video = (
        FIELD_ID_VIDEO_UPLOAD_NOTE in text
        or VIDEO_UPLOAD_NOTE_FIELD in text
    )
    # Full gate (matches inspect_activity_date_is_future_formula).
    if refs_test and refs_marker and refs_clock:
        return True
    # Accept test + marker + Video Upload Note when clock field is absent from
    # an older paste variant (still safer than NOW()-only).
    return bool(refs_test and refs_marker and refs_video)

PRODUCTION_ACTIVITY_DATE_IS_FUTURE_FORMULA = """\
IF(
  {Activity Date},
  IF({Activity Date} > NOW(), 1, 0),
  BLANK()
)"""

GATED_ACTIVITY_DATE_IS_FUTURE_FORMULA = """\
IF(
  AND(
    {Season Sim Test Record?},
    FIND("SEASON-SIM|", {Video Upload Note} & "") > 0
  ),
  IF(
    {Season Sim Clock Now},
    IF({Activity Date} > {Season Sim Clock Now}, 1, 0),
    0
  ),
  IF(
    {Activity Date},
    IF({Activity Date} > NOW(), 1, 0),
    BLANK()
  )
)"""

PRODUCTION_SUBMITTED_SAME_DAY_NOTE = (
    "Production Submitted Same Day? uses Submitted At (CREATED_TIME) vs Activity Date, "
    "with a separate Perfect Week Test path gated to enrollment rec93mAfo5jKqP3g5 only."
)

GATED_SUBMITTED_SAME_DAY_FORMULA = """\
IF(
  AND(
    {Season Sim Test Record?},
    FIND("SEASON-SIM|", {Video Upload Note} & "") > 0,
    {Season Sim Test Submitted At},
    {Activity Date}
  ),
  IF(
    DATETIME_FORMAT(SET_TIMEZONE({Season Sim Test Submitted At}, "America/Denver"), "YYYY-MM-DD") =
    DATETIME_FORMAT(SET_TIMEZONE({Activity Date}, "UTC"), "YYYY-MM-DD"),
    1,
    0
  ),
  /* else: keep the existing Perfect Week Test / CREATED_TIME production formula unchanged */
  /* PASTE: wrap existing Submitted Same Day? body as the false branch of this IF */
  0
)"""


@dataclass(frozen=True)
class FutureDateDecision:
    """Result of evaluating Activity Date Is Future? under a clock mode."""

    is_future: bool | None
    mode: str  # production_now | simulation_gated | missing_activity_date
    compared_against: str
    counts_for_submission: bool
    reason: str


@dataclass(frozen=True)
class SameDayDecision:
    same_day: bool
    mode: str  # production_created_time | simulation_test_submitted_at | missing_inputs
    reason: str


@dataclass
class ClockOverrideReadiness:
    """Whether Production is ready for an early (pre-2027) simulation execute."""

    ready_for_early_execute: bool
    wall_date: date
    simulation_window: dict[str, str]
    blockers: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    required_fields_present: dict[str, bool] = field(default_factory=dict)
    formula_override_detected: bool = False
    formula_override_acknowledged: bool = False
    dependency_impact: dict[str, str] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        wd = data.get("wall_date")
        if hasattr(wd, "isoformat"):
            data["wall_date"] = wd.isoformat()
        return data


def activity_date_is_future_production(
    activity_date: date | None,
    *,
    wall_now: datetime,
) -> FutureDateDecision:
    """Mirror live Production: Activity Date > NOW()."""
    if activity_date is None:
        return FutureDateDecision(
            is_future=None,
            mode="missing_activity_date",
            compared_against="NOW()",
            counts_for_submission=False,
            reason="No Activity Date ??? formula returns BLANK(); Count This Submission? fails closed.",
        )
    # Airtable compares date/datetime to NOW(); treat date as start-of-day UTC-naive
    # for offline modeling (Denver wall date is what operators reason about).
    wall_date = wall_now.date() if hasattr(wall_now, "date") else wall_now
    is_future = activity_date > wall_date
    return FutureDateDecision(
        is_future=is_future,
        mode="production_now",
        compared_against="NOW()",
        counts_for_submission=not is_future,
        reason=(
            f"Activity Date {activity_date} {'is after' if is_future else 'is on/before'} "
            f"wall date {wall_date} (Production NOW() path)."
        ),
    )


def activity_date_is_future_gated(
    activity_date: date | None,
    *,
    wall_now: datetime,
    season_sim_test_record: bool,
    video_upload_note: str | None,
    season_sim_clock_now: date | datetime | None,
) -> FutureDateDecision:
    """Evaluate gated override: sim rows compare to Season Sim Clock Now (or force 0)."""
    gated = bool(season_sim_test_record) and RUN_MARKER_PREFIX + "|" in str(
        video_upload_note or ""
    )
    if not gated:
        return activity_date_is_future_production(activity_date, wall_now=wall_now)

    if activity_date is None:
        return FutureDateDecision(
            is_future=None,
            mode="simulation_gated",
            compared_against="Season Sim Clock Now",
            counts_for_submission=False,
            reason="Gated sim path but Activity Date missing.",
        )

    if season_sim_clock_now is None:
        # Preferred temporary behavior when Clock Now empty: treat as not-future
        # so disposable Activity Dates count under the explicit sim gate only.
        return FutureDateDecision(
            is_future=False,
            mode="simulation_gated",
            compared_against="(empty Season Sim Clock Now ??? force not-future)",
            counts_for_submission=True,
            reason=(
                "Gated Season Sim record with empty Season Sim Clock Now ??? "
                "Activity Date Is Future? forced to 0 (sim-only)."
            ),
        )

    clock_date = (
        season_sim_clock_now.date()
        if isinstance(season_sim_clock_now, datetime)
        else season_sim_clock_now
    )
    is_future = activity_date > clock_date
    return FutureDateDecision(
        is_future=is_future,
        mode="simulation_gated",
        compared_against="Season Sim Clock Now",
        counts_for_submission=not is_future,
        reason=(
            f"Gated sim: Activity Date {activity_date} vs Season Sim Clock Now {clock_date}."
        ),
    )


def submitted_same_day_production(
    activity_date: date | None,
    *,
    submitted_at_date: date | None,
) -> SameDayDecision:
    """Production path: CREATED_TIME calendar day vs Activity Date (cannot backdate)."""
    if activity_date is None or submitted_at_date is None:
        return SameDayDecision(
            same_day=False,
            mode="missing_inputs",
            reason="Submitted At or Activity Date missing.",
        )
    same = activity_date == submitted_at_date
    return SameDayDecision(
        same_day=same,
        mode="production_created_time",
        reason=(
            f"CREATED_TIME day {submitted_at_date} vs Activity Date {activity_date} "
            f"??? same_day={same}. CREATED_TIME cannot be API-backdated."
        ),
    )


def submitted_same_day_gated(
    activity_date: date | None,
    *,
    submitted_at_date: date | None,
    season_sim_test_record: bool,
    video_upload_note: str | None,
    season_sim_test_submitted_at: date | None,
) -> SameDayDecision:
    gated = bool(season_sim_test_record) and RUN_MARKER_PREFIX + "|" in str(
        video_upload_note or ""
    )
    if gated and season_sim_test_submitted_at is not None and activity_date is not None:
        same = activity_date == season_sim_test_submitted_at
        return SameDayDecision(
            same_day=same,
            mode="simulation_test_submitted_at",
            reason=(
                f"Gated sim Test Submitted At {season_sim_test_submitted_at} vs "
                f"Activity Date {activity_date} ??? same_day={same}."
            ),
        )
    return submitted_same_day_production(
        activity_date, submitted_at_date=submitted_at_date
    )


def dependency_impact_matrix() -> dict[str, str]:
    """What breaks before wall-clock reaches May 2027 without a gated override."""
    return {
        "daily_submission_counting": (
            "BLOCKED ??? Count This Submission? = 0 when Activity Date Is Future? = 1"
        ),
        "weekly_summaries": (
            "BLOCKED ??? Total Shots Counted / WAS rollups depend on countable submissions"
        ),
        "streaks": "BLOCKED ??? streak engines consume countable Activity Dates",
        "perfect_week": (
            "BLOCKED ??? needs Count This Submission?=1; Grace Eligible also uses "
            "Activity Date <= TODAY() unless Perfect Week Manual Exception? is checked "
            "on disposable sim rows"
        ),
        "xp_dates": (
            "PARTIAL ??? XP Activity Date is writable; Submission Base XP still requires "
            "Count This Submission?=1"
        ),
        "level_gates": "BLOCKED ??? gates/levels that read counted shots/XP stall",
        "homework": (
            "MOSTLY OK ??? HC uses PHA / Activity Date; late allowance uses due date "
            "(common due 2027-06-29), not NOW(). Still needs Weeks coverage."
        ),
        "video_counts": (
            "PARTIAL ??? VF rows can be created; VF XP paths that require countable "
            "submission status may skip"
        ),
        "zoom_credit": (
            "MOSTLY OK ??? Zoom Attendance / 101 use meeting dates; avoid changing 101/SC-147"
        ),
        "email_preparation": (
            "PARTIAL ??? handoff packages can build; counts/XP sections may be empty "
            "while submissions are uncountable; recipient allowlist still enforced"
        ),
        "submitted_at": (
            "ALWAYS REAL TIME ??? formula CREATED_TIME(); never pretend API can backdate"
        ),
        "submitted_same_day": (
            "BLOCKED for 2027 Activity Dates created in 2026 unless gated "
            "Season Sim Test Submitted At (or PW Manual Exception for Perfect Week only)"
        ),
    }


def assess_clock_override_readiness(
    *,
    wall_date: date,
    submission_field_names: set[str] | None = None,
    formula_text_activity_date_is_future: str | None = None,
    formula_override_acknowledged: bool = False,
) -> ClockOverrideReadiness:
    """Decide whether an early execute can safely count May???June 2027 dates."""
    fields = submission_field_names or set()
    required = {
        SEASON_SIM_TEST_RECORD_FIELD: SEASON_SIM_TEST_RECORD_FIELD in fields,
        SEASON_SIM_CLOCK_NOW_FIELD: SEASON_SIM_CLOCK_NOW_FIELD in fields,
        SEASON_SIM_TEST_SUBMITTED_AT_FIELD: SEASON_SIM_TEST_SUBMITTED_AT_FIELD in fields,
        ACTIVITY_DATE_IS_FUTURE_FIELD: ACTIVITY_DATE_IS_FUTURE_FIELD in fields
        or not fields,
        VIDEO_UPLOAD_NOTE_FIELD: VIDEO_UPLOAD_NOTE_FIELD in fields or not fields,
    }

    blockers: list[str] = []
    warnings: list[str] = []

    window_in_future = wall_date < SIM_START
    formula_has_gate = formula_text_has_season_sim_gate(
        formula_text_activity_date_is_future
    )

    if window_in_future:
        if not formula_has_gate and not formula_override_acknowledged:
            blockers.append(
                f"Wall date {wall_date} is before simulation start {SIM_START}. "
                "Without a gated Activity Date Is Future? override, every May???June 2027 "
                "Activity Date will set Activity Date Is Future?=1 and "
                "Count This Submission?=0."
            )
        if fields and not required[SEASON_SIM_TEST_RECORD_FIELD]:
            blockers.append(
                f"Missing Submissions field `{SEASON_SIM_TEST_RECORD_FIELD}` "
                "(required for gated override)."
            )
        if fields and not required[SEASON_SIM_CLOCK_NOW_FIELD]:
            warnings.append(
                f"Optional but recommended: `{SEASON_SIM_CLOCK_NOW_FIELD}` "
                "(when empty, gated formula forces not-future)."
            )
        if fields and not required[SEASON_SIM_TEST_SUBMITTED_AT_FIELD]:
            warnings.append(
                f"Missing `{SEASON_SIM_TEST_SUBMITTED_AT_FIELD}` ??? same-day / "
                "Perfect Week timing will not match 2027 Activity Dates via CREATED_TIME; "
                f"use `{PERFECT_WEEK_MANUAL_EXCEPTION_FIELD}` on Perfect Week sim rows "
                "or add the gated same-day field."
            )
        if formula_override_acknowledged and not formula_has_gate:
            warnings.append(
                "Operator acknowledged formula override, but live formula text was not "
                "detected as gated ??? verify OMNI paste before execute."
            )
    else:
        warnings.append(
            f"Wall date {wall_date} is on/after {SIM_START} ??? Production NOW() path "
            "can count simulation Activity Dates without a temporary override."
        )

    ready = len(blockers) == 0
    return ClockOverrideReadiness(
        ready_for_early_execute=ready,
        wall_date=wall_date,
        simulation_window={
            "start": SIM_START.isoformat(),
            "end": SIM_END.isoformat(),
        },
        blockers=blockers,
        warnings=warnings,
        required_fields_present=required,
        formula_override_detected=formula_has_gate,
        formula_override_acknowledged=formula_override_acknowledged,
        dependency_impact=dependency_impact_matrix(),
    )


def sim_submission_override_fields(
    *,
    run_marker: str,
    simulated_now: date,
    activity_date: date,
    test_submitted_at: date | None = None,
    perfect_week_manual_exception: bool = False,
    available_fields: set[str] | None = None,
) -> dict[str, Any]:
    """Fields the harness stamps on each disposable Submission create.

    Always stamps ``Video Upload Note`` (exists in Production). Season Sim
    fields are included only when present in ``available_fields`` (or when
    availability is unknown / None ??? intended-write planning).
    """
    submitted_day = test_submitted_at or activity_date
    fields: dict[str, Any] = {
        VIDEO_UPLOAD_NOTE_FIELD: run_marker,
    }
    optional = {
        SEASON_SIM_TEST_RECORD_FIELD: True,
        SEASON_SIM_CLOCK_NOW_FIELD: simulated_now.isoformat(),
        SEASON_SIM_TEST_SUBMITTED_AT_FIELD: f"{submitted_day.isoformat()}T18:00:00.000Z",
    }
    for name, value in optional.items():
        if available_fields is None or name in available_fields:
            fields[name] = value
    if perfect_week_manual_exception:
        if available_fields is None or PERFECT_WEEK_MANUAL_EXCEPTION_FIELD in available_fields:
            fields[PERFECT_WEEK_MANUAL_EXCEPTION_FIELD] = True
    return fields
