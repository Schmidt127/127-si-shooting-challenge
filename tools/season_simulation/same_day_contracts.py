"""Same-day / Perfect Week contracts for SC-SEASON-SIM-002.

Production truth (inspected 2026-09-02, base appn84sqPw03zEbTT):

- ``Submitted At`` = ``CREATED_TIME()`` — cannot be API-backdated.
- ``Submitted Same Day?`` compares ``Submitted At`` (or Perfect Week Test
  Submitted At for one enrollment) to ``Activity Date`` — does **not** read
  ``Season Sim Test Submitted At``.
- ``Perfect Week Grace Eligible?`` uses ``Submitted At`` + ``TODAY()`` vs
  Activity Date — fails for May–June 2027 Activity Dates when the wall clock
  is still 2026 unless Manual Exception is set.
- ``Perfect Week Countable Submission?`` requires ``Count This Submission?=1``
  **and** ``Perfect Week Grace Eligible?=1`` (not Submitted Same Day directly).

Season Sim writer already sets Season Sim gate fields. Without temporary gated
formulas on Submitted Same Day? and Perfect Week Grace Eligible?, same-day /
Perfect Week evaluation for the simulation is **incorrect**.

This module documents paste formulas for Mike/OMNI. It does **not** apply them.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Sequence

from .simulation_clock import (
    FIELD_ID_ACTIVITY_DATE,
    FIELD_ID_SEASON_SIM_CLOCK_NOW,
    FIELD_ID_SEASON_SIM_TEST_RECORD,
    FIELD_ID_SEASON_SIM_TEST_SUBMITTED_AT,
    FIELD_ID_VIDEO_UPLOAD_NOTE,
)

FIELD_ID_SUBMITTED_AT = "fld7JJ7neI0YYmB7i"
FIELD_ID_SUBMITTED_SAME_DAY = "fldE7G8H1O7HPYuIi"
FIELD_ID_PERFECT_WEEK_GRACE = "fldLo2GO5aac6tPX1"
FIELD_ID_PERFECT_WEEK_COUNTABLE = "fldYDitgQr6jgoDMk"
FIELD_ID_PERFECT_WEEK_MANUAL_EXCEPTION = "fldIb6nJu5TBkUUrD"
FIELD_ID_COUNT_THIS_SUBMISSION = "fld1gQ2c04pndnTKe"
FIELD_ID_PERFECT_WEEK_TEST_RECORD = "fld0xNqO0ryOe7uEY"
FIELD_ID_PERFECT_WEEK_TEST_SUBMITTED_AT = "fldr2msxUo1kPjROD"
FIELD_ID_ENROLLMENT_RECORD_ID_LOOKUP = "fldHH6GDDG9DixHBT"

# Existing Perfect Week harness enrollment (leave intact).
PERFECT_WEEK_TEST_ENROLLMENT_ID = "rec93mAfo5jKqP3g5"

SEASON_SIM_MARKER = "SEASON-SIM|"


# ---------------------------------------------------------------------------
# Paste packets (field names — OMNI / Airtable formula editor)
# ---------------------------------------------------------------------------

ACTIVITY_DATE_IS_FUTURE_ROLLBACK = """IF(
  {Activity Date},
  IF({Activity Date} > NOW(), 1, 0),
  BLANK()
)"""

SUBMITTED_SAME_DAY_TEMPORARY = """IF(
  AND(
    {Season Sim Test Record?},
    FIND("SEASON-SIM|", {Video Upload Note} & "") > 0,
    {Season Sim Test Submitted At},
    {Activity Date}
  ),
  IF(
    DATETIME_FORMAT(
      SET_TIMEZONE({Season Sim Test Submitted At}, "America/Denver"),
      "YYYY-MM-DD"
    )
    =
    DATETIME_FORMAT(
      SET_TIMEZONE({Activity Date}, "UTC"),
      "YYYY-MM-DD"
    ),
    1,
    0
  ),
  IF(
    AND(
      {Perfect Week Test Record?},
      {Perfect Week Test Submitted At},
      FIND("rec93mAfo5jKqP3g5", ARRAYJOIN({Enrollment Record ID Lookup})) > 0
    ),
    IF(
      AND(
        {Perfect Week Test Submitted At},
        {Activity Date}
      ),
      IF(
        DATETIME_FORMAT(
          SET_TIMEZONE({Perfect Week Test Submitted At}, "America/Denver"),
          "YYYY-MM-DD"
        )
        =
        DATETIME_FORMAT(
          SET_TIMEZONE({Activity Date}, "UTC"),
          "YYYY-MM-DD"
        ),
        1,
        0
      ),
      0
    ),
    IF(
      AND(
        {Submitted At},
        {Activity Date}
      ),
      IF(
        DATETIME_FORMAT(
          SET_TIMEZONE({Submitted At}, "America/Denver"),
          "YYYY-MM-DD"
        )
        =
        DATETIME_FORMAT(
          SET_TIMEZONE({Activity Date}, "UTC"),
          "YYYY-MM-DD"
        ),
        1,
        0
      ),
      0
    )
  )
)"""

SUBMITTED_SAME_DAY_ROLLBACK = """IF(
  AND(
    {Perfect Week Test Record?},
    {Perfect Week Test Submitted At},
    FIND("rec93mAfo5jKqP3g5", ARRAYJOIN({Enrollment Record ID Lookup})) > 0
  ),
  IF(
    AND(
      {Perfect Week Test Submitted At},
      {Activity Date}
    ),
    IF(
      DATETIME_FORMAT(
        SET_TIMEZONE({Perfect Week Test Submitted At}, "America/Denver"),
        "YYYY-MM-DD"
      )
      =
      DATETIME_FORMAT(
        SET_TIMEZONE({Activity Date}, "UTC"),
        "YYYY-MM-DD"
      ),
      1,
      0
    ),
    0
  ),
  IF(
    AND(
      {Submitted At},
      {Activity Date}
    ),
    IF(
      DATETIME_FORMAT(
        SET_TIMEZONE({Submitted At}, "America/Denver"),
        "YYYY-MM-DD"
      )
      =
      DATETIME_FORMAT(
        SET_TIMEZONE({Activity Date}, "UTC"),
        "YYYY-MM-DD"
      ),
      1,
      0
    ),
    0
  )
)"""

PERFECT_WEEK_GRACE_TEMPORARY = """IF(
  OR(
    {Perfect Week Manual Exception?},
    AND(
      {Season Sim Test Record?},
      FIND("SEASON-SIM|", {Video Upload Note} & "") > 0,
      {Count This Submission?} = 1,
      {Activity Date},
      {Season Sim Test Submitted At},
      {Season Sim Clock Now},
      DATETIME_FORMAT(
        SET_TIMEZONE({Activity Date}, 'America/Denver'),
        'YYYY-MM-DD'
      ) <= DATETIME_FORMAT(
        SET_TIMEZONE({Season Sim Clock Now}, 'America/Denver'),
        'YYYY-MM-DD'
      ),
      DATETIME_DIFF(
        {Season Sim Test Submitted At},
        DATETIME_PARSE(
          DATETIME_FORMAT(
            DATEADD(
              DATETIME_PARSE(
                DATETIME_FORMAT(
                  SET_TIMEZONE({Activity Date}, 'America/Denver'),
                  'YYYY-MM-DD'
                ),
                'YYYY-MM-DD'
              ),
              1,
              'days'
            ),
            'YYYY-MM-DD'
          ) & ' 00:00',
          'YYYY-MM-DD HH\\:mm'
        ),
        'hours'
      ) <= 48
    ),
    AND(
      {Count This Submission?} = 1,
      {Activity Date},
      {Submitted At},
      DATETIME_FORMAT(
        SET_TIMEZONE({Activity Date}, 'America/Denver'),
        'YYYY-MM-DD'
      ) <= DATETIME_FORMAT(TODAY(), 'YYYY-MM-DD'),
      DATETIME_DIFF(
        {Submitted At},
        DATETIME_PARSE(
          DATETIME_FORMAT(
            DATEADD(
              DATETIME_PARSE(
                DATETIME_FORMAT(
                  SET_TIMEZONE({Activity Date}, 'America/Denver'),
                  'YYYY-MM-DD'
                ),
                'YYYY-MM-DD'
              ),
              1,
              'days'
            ),
            'YYYY-MM-DD'
          ) & ' 00:00',
          'YYYY-MM-DD HH\\:mm'
        ),
        'hours'
      ) <= 48
    )
  ),
  1,
  0
)"""

PERFECT_WEEK_GRACE_ROLLBACK = """IF(
  OR(
    {Perfect Week Manual Exception?},
    AND(
      {Count This Submission?} = 1,
      {Activity Date},
      {Submitted At},
      DATETIME_FORMAT(
        SET_TIMEZONE({Activity Date}, 'America/Denver'),
        'YYYY-MM-DD'
      ) <= DATETIME_FORMAT(TODAY(), 'YYYY-MM-DD'),
      DATETIME_DIFF(
        {Submitted At},
        DATETIME_PARSE(
          DATETIME_FORMAT(
            DATEADD(
              DATETIME_PARSE(
                DATETIME_FORMAT(
                  SET_TIMEZONE({Activity Date}, 'America/Denver'),
                  'YYYY-MM-DD'
                ),
                'YYYY-MM-DD'
              ),
              1,
              'days'
            ),
            'YYYY-MM-DD'
          ) & ' 00:00',
          'YYYY-MM-DD HH\\:mm'
        ),
        'hours'
      ) <= 48
    )
  ),
  1,
  0
)"""


@dataclass(frozen=True)
class FormulaGateStatus:
    field_name: str
    field_present: bool
    formula: str
    gated_season_sim_active: bool
    references_season_sim_test_record: bool
    references_season_sim_submitted_at: bool
    references_season_sim_marker: bool
    references_season_sim_clock_now: bool
    safe_for_normal_athletes: bool
    blockers: tuple[str, ...]
    notes: tuple[str, ...]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class SameDayReadiness:
    """Whether live Perfect Week / same-day math can evaluate simulated dates."""

    submitted_at_is_created_time: bool
    activity_date_gate_active: bool
    submitted_same_day_gate_active: bool
    perfect_week_grace_gate_active: bool
    same_day_logic_accurate_for_sim: bool
    sufficient_for_same_day_perfect_week: bool
    blockers: tuple[str, ...]
    notes: tuple[str, ...]
    submitted_same_day: dict[str, Any]
    perfect_week_grace: dict[str, Any]
    paste_required: dict[str, str]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _formula_text(field: dict[str, Any] | None) -> str:
    if not field:
        return ""
    return str((field.get("options") or {}).get("formula") or "")


def _submissions_fields(meta_tables: Sequence[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    by_name = {t.get("name"): t for t in meta_tables}
    sub = by_name.get("Submissions") or {}
    return {f.get("name"): f for f in (sub.get("fields") or []) if f.get("name")}


def _refs_season_sim(formula: str) -> dict[str, bool]:
    return {
        "test_record": (
            FIELD_ID_SEASON_SIM_TEST_RECORD in formula
            or "{Season Sim Test Record?}" in formula
        ),
        "submitted_at": (
            FIELD_ID_SEASON_SIM_TEST_SUBMITTED_AT in formula
            or "{Season Sim Test Submitted At}" in formula
        ),
        "clock_now": (
            FIELD_ID_SEASON_SIM_CLOCK_NOW in formula
            or "{Season Sim Clock Now}" in formula
        ),
        "marker": SEASON_SIM_MARKER in formula,
    }


def inspect_submitted_same_day_formula(
    meta_tables: Sequence[dict[str, Any]],
) -> FormulaGateStatus:
    fields = _submissions_fields(meta_tables)
    field = fields.get("Submitted Same Day?")
    formula = _formula_text(field)
    refs = _refs_season_sim(formula)
    gated = bool(
        formula and refs["test_record"] and refs["marker"] and refs["submitted_at"]
    )
    blockers: list[str] = []
    notes: list[str] = []
    if not field:
        blockers.append("Submissions.`Submitted Same Day?` missing from meta.")
    elif not formula:
        blockers.append("Submissions.`Submitted Same Day?` has no formula text.")
    elif gated:
        notes.append(
            "Submitted Same Day? is Season Sim gated: sim rows use "
            "Season Sim Test Submitted At; other rows keep CREATED_TIME / "
            "Perfect Week test path."
        )
    else:
        blockers.append(
            "Submitted Same Day? does not use Season Sim Test Submitted At. "
            "May–June 2027 Activity Dates compared to CREATED_TIME() (wall clock) "
            "will yield Submitted Same Day?=0 for sim rows."
        )
    # Normal path must still mention Submitted At or Perfect Week test fields.
    safe_normal = bool(
        (not formula)
        or (
            (FIELD_ID_SUBMITTED_AT in formula or "{Submitted At}" in formula)
            and (not gated or (refs["test_record"] and refs["marker"]))
        )
    )
    return FormulaGateStatus(
        field_name="Submitted Same Day?",
        field_present=bool(field),
        formula=formula,
        gated_season_sim_active=gated,
        references_season_sim_test_record=refs["test_record"],
        references_season_sim_submitted_at=refs["submitted_at"],
        references_season_sim_marker=refs["marker"],
        references_season_sim_clock_now=refs["clock_now"],
        safe_for_normal_athletes=safe_normal,
        blockers=tuple(blockers),
        notes=tuple(notes),
    )


def inspect_perfect_week_grace_formula(
    meta_tables: Sequence[dict[str, Any]],
) -> FormulaGateStatus:
    fields = _submissions_fields(meta_tables)
    field = fields.get("Perfect Week Grace Eligible?")
    formula = _formula_text(field)
    refs = _refs_season_sim(formula)
    gated = bool(
        formula
        and refs["test_record"]
        and refs["marker"]
        and refs["submitted_at"]
        and refs["clock_now"]
    )
    blockers: list[str] = []
    notes: list[str] = []
    if not field:
        blockers.append("Submissions.`Perfect Week Grace Eligible?` missing from meta.")
    elif not formula:
        blockers.append(
            "Submissions.`Perfect Week Grace Eligible?` has no formula text."
        )
    elif gated:
        notes.append(
            "Perfect Week Grace Eligible? is Season Sim gated: sim rows use "
            "Season Sim Test Submitted At + Season Sim Clock Now; other rows "
            "keep Submitted At + TODAY()."
        )
    else:
        blockers.append(
            "Perfect Week Grace Eligible? uses Submitted At + TODAY(). "
            "Future Activity Dates (2027) while wall clock is earlier make "
            "Grace Eligible?=0 unless Manual Exception — Perfect Week Countable "
            "fails for the simulation."
        )
    uses_today = "TODAY()" in formula
    safe_normal = bool(
        (not formula)
        or (
            uses_today
            and (FIELD_ID_SUBMITTED_AT in formula or "{Submitted At}" in formula)
            and (not gated or (refs["test_record"] and refs["marker"]))
        )
    )
    return FormulaGateStatus(
        field_name="Perfect Week Grace Eligible?",
        field_present=bool(field),
        formula=formula,
        gated_season_sim_active=gated,
        references_season_sim_test_record=refs["test_record"],
        references_season_sim_submitted_at=refs["submitted_at"],
        references_season_sim_marker=refs["marker"],
        references_season_sim_clock_now=refs["clock_now"],
        safe_for_normal_athletes=safe_normal,
        blockers=tuple(blockers),
        notes=tuple(notes),
    )


def assess_same_day_readiness(
    meta_tables: Sequence[dict[str, Any]],
    *,
    activity_date_gate_active: bool,
) -> SameDayReadiness:
    fields = _submissions_fields(meta_tables)
    submitted_at = fields.get("Submitted At")
    submitted_at_formula = _formula_text(submitted_at)
    is_created_time = "CREATED_TIME()" in submitted_at_formula

    same_day = inspect_submitted_same_day_formula(meta_tables)
    grace = inspect_perfect_week_grace_formula(meta_tables)

    blockers: list[str] = []
    notes: list[str] = []
    if is_created_time:
        notes.append(
            "Submitted At is CREATED_TIME() — cannot be backdated; Season Sim "
            "Test Submitted At is the sim surrogate."
        )
    else:
        blockers.append(
            "Submitted At formula is not CREATED_TIME(); contracts may have changed."
        )

    blockers.extend(same_day.blockers)
    blockers.extend(grace.blockers)
    notes.extend(same_day.notes)
    notes.extend(grace.notes)

    if not activity_date_gate_active:
        blockers.append(
            "Activity Date Is Future? Season Sim gate must be active before "
            "Count This Submission? can pass for 2027 Activity Dates."
        )

    accurate = bool(
        activity_date_gate_active
        and same_day.gated_season_sim_active
        and grace.gated_season_sim_active
        and same_day.safe_for_normal_athletes
        and grace.safe_for_normal_athletes
    )
    if accurate:
        notes.append(
            "Same-day / Perfect Week Season Sim gates are active; ordinary "
            "athletes remain on CREATED_TIME / TODAY() paths."
        )

    return SameDayReadiness(
        submitted_at_is_created_time=is_created_time,
        activity_date_gate_active=activity_date_gate_active,
        submitted_same_day_gate_active=same_day.gated_season_sim_active,
        perfect_week_grace_gate_active=grace.gated_season_sim_active,
        same_day_logic_accurate_for_sim=accurate,
        sufficient_for_same_day_perfect_week=accurate,
        blockers=tuple(blockers),
        notes=tuple(notes),
        submitted_same_day=same_day.to_dict(),
        perfect_week_grace=grace.to_dict(),
        paste_required={
            "submitted_same_day_temporary": SUBMITTED_SAME_DAY_TEMPORARY,
            "submitted_same_day_rollback": SUBMITTED_SAME_DAY_ROLLBACK,
            "perfect_week_grace_temporary": PERFECT_WEEK_GRACE_TEMPORARY,
            "perfect_week_grace_rollback": PERFECT_WEEK_GRACE_ROLLBACK,
            "activity_date_is_future_rollback": ACTIVITY_DATE_IS_FUTURE_ROLLBACK,
        },
    )


def simulated_same_day_result(
    *,
    season_sim_test_record: bool,
    video_upload_note: str,
    season_sim_test_submitted_at_date: str,
    activity_date: str,
) -> int:
    """Pure harness mirror of the Season Sim branch of Submitted Same Day?."""
    if not (
        season_sim_test_record
        and SEASON_SIM_MARKER in (video_upload_note or "")
        and season_sim_test_submitted_at_date
        and activity_date
    ):
        return 0
    return 1 if season_sim_test_submitted_at_date == activity_date else 0
