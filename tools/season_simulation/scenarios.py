"""Deterministic Athlete 1 scenario for May 1 – June 30, 2027.

All reference record IDs (homework, Zoom, goals, weeks) are injected at
runtime from Airtable — this module never fabricates those IDs.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import date, timedelta
from typing import Any, Sequence

from .constants import (
    ATHLETE_DISPLAY_NAME,
    ATHLETE_FIRST_NAME,
    ATHLETE_GRADE,
    ATHLETE_LAST_NAME,
    SAFE_EMAIL_RECIPIENT,
    SIM_END,
    SIM_START,
)
from .run_registry import run_marker
from .simulation_clock import (
    SimulationClock,
    SubmissionTiming,
    assert_window_integrity,
    build_simulation_days,
    sunday_of,
    week_boundaries_for_dates,
)


SCENARIO_SEED = "athlete1-2027-v1"
SCENARIO_VERSION = "1.0.0"

# Fixed day numbers (1..61) for special behaviors — documented & deterministic.
MISS_DAYS = frozenset({15, 36, 50})  # break streaks / inactivity signals
SAME_DAY_SUBMIT_DAY = 8  # clock on day 8, activity date day 8
BACKDATE_WRITE_DAY = 22  # when clock is on day 22, write activity for day 20
BACKDATE_ACTIVITY_DAY = 20
INACTIVITY_GAP_START = 49  # miss 50; light activity after for alert windows
VIDEO_FEEDBACK_DAYS = frozenset({5, 19, 33, 47})
GATE_BLOCK_PROBE_DAY = 28  # intentionally skip one homework before a gate-heavy stretch


@dataclass(frozen=True)
class DayPlan:
    day_number: int
    activity_date: date
    action: str  # submit | miss
    shot_total: int
    timing: str  # same_day | backdated | missed
    write_on_day_number: int  # simulation clock day when the write is intended
    homework: list[dict[str, Any]] = field(default_factory=list)
    video_feedback: bool = False
    zoom_meeting_ids: list[str] = field(default_factory=list)
    # Parallel to zoom_meeting_ids: "live" | "recording"
    zoom_modes: list[str] = field(default_factory=list)
    email_events: list[dict[str, Any]] = field(default_factory=list)
    notes: str = ""
    dedupe_key: str = ""


@dataclass
class Athlete1Scenario:
    version: str
    seed: str
    run_id: str
    athlete: dict[str, Any]
    grade_band_id: str
    goal_record_id: str
    goal_total_shots: int
    days: list[DayPlan]
    zoom_selected: list[dict[str, Any]]
    homework_selected: list[dict[str, Any]]
    intended_writes_summary: dict[str, int]
    intended_emails: list[dict[str, Any]]
    cleanup_scope: list[str]
    gate_notes: list[str]
    meta: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "version": self.version,
            "seed": self.seed,
            "run_id": self.run_id,
            "athlete": self.athlete,
            "grade_band_id": self.grade_band_id,
            "goal_record_id": self.goal_record_id,
            "goal_total_shots": self.goal_total_shots,
            "days": [asdict(d) for d in self.days],
            "zoom_selected": self.zoom_selected,
            "homework_selected": self.homework_selected,
            "intended_writes_summary": self.intended_writes_summary,
            "intended_emails": self.intended_emails,
            "cleanup_scope": self.cleanup_scope,
            "gate_notes": self.gate_notes,
            "meta": self.meta,
        }


def _shots_for_day(day_number: int, goal_total: int, active_days: int) -> int:
    """Deterministic volume curve aiming to meet/exceed the configured goal."""
    if active_days <= 0:
        return 0
    base = max(120, (goal_total + active_days - 1) // active_days)
    # Early ramp + mid-season surge for milestones / weekly thresholds.
    if day_number <= 14:
        return base + 40
    if 21 <= day_number <= 35:
        return base + 80
    if day_number >= 55:
        return base + 20
    return base


def _dedupe_key(run_id: str, kind: str, day_number: int, extra: str = "") -> str:
    parts = [run_marker(run_id), kind, f"D{day_number:02d}"]
    if extra:
        parts.append(extra)
    return "|".join(parts)


def build_athlete1_scenario(
    *,
    run_id: str,
    grade_band_id: str,
    goal_record_id: str,
    goal_total_shots: int,
    homework: Sequence[dict[str, Any]],
    zoom_meetings: Sequence[dict[str, Any]],
    weeks: Sequence[dict[str, Any]] | None = None,
) -> Athlete1Scenario:
    """Build the full 61-day plan.

    ``homework`` / ``zoom_meetings`` items are dicts with at least ``record_id``.
    They must come from Airtable resolution — empty lists are allowed for dry
    offline tests but preflight will warn.
    """
    if not grade_band_id or not goal_record_id:
        raise ValueError("grade_band_id and goal_record_id are required (from Airtable)")
    if goal_total_shots <= 0:
        raise ValueError("goal_total_shots must be positive (from Airtable)")

    days_meta = assert_window_integrity(build_simulation_days(SIM_START, SIM_END))
    hw_list = list(homework)
    zoom_list = list(zoom_meetings)[:2]  # use up to two existing meetings

    hw_outcomes = ["Satisfactory", "Needs Revision"]
    day_plans: list[DayPlan] = []
    intended_emails: list[dict[str, Any]] = []
    gate_notes: list[str] = []

    active_day_numbers = [d.day_number for d in days_meta if d.day_number not in MISS_DAYS]
    active_count = len(active_day_numbers)

    # Sunday–Saturday windows inside May–June 2027 (1-based week index in window).
    window_weeks = week_boundaries_for_dates(d.activity_date for d in days_meta)
    week9_bounds = window_weeks[8] if len(window_weeks) >= 9 else None
    day_by_number = {d.day_number: d for d in days_meta}

    def _in_week9(day_number: int) -> bool:
        if week9_bounds is None:
            return False
        act = day_by_number[day_number].activity_date
        return week9_bounds[0] <= act <= week9_bounds[1]

    # Prefer one Homework Completion per PHA (covers all 18 when provided).
    # Place HW only on Weeks 1–8 of the simulation window; Week 9 stays at zero.
    submit_day_numbers = [
        d.day_number
        for d in days_meta
        if d.day_number not in MISS_DAYS and not _in_week9(d.day_number)
    ]
    pha_by_day: dict[int, list[dict[str, Any]]] = {n: [] for n in submit_day_numbers}
    for i, pha in enumerate(hw_list):
        if i >= len(submit_day_numbers):
            break
        day_n = submit_day_numbers[i]
        if day_n == GATE_BLOCK_PROBE_DAY:
            gate_notes.append(
                f"Day {day_n}: skip homework completion to create an unmet-gate / incomplete-hw signal "
                "without blocking final advancement volume"
            )
            # Place this PHA on the next available day after the probe.
            alt = next((x for x in submit_day_numbers if x > day_n), None)
            if alt is None:
                continue
            day_n = alt
        outcome = hw_outcomes[i % len(hw_outcomes)]
        multi_asset = i % 4 == 0
        pha_by_day.setdefault(day_n, []).append(
            {
                "pha_record_id": pha["record_id"],
                "slot": pha.get("slot") or ("HW1" if i % 2 == 0 else "HW2"),
                "week_id": pha.get("week_id") or "",
                "library_id": pha.get("library_id") or "",
                "outcome": outcome,
                "asset_count": 2 if multi_asset else 1,
                "dedupe_key": _dedupe_key(run_id, "HW", day_n, pha["record_id"]),
            }
        )

    for meta in days_meta:
        n = meta.day_number
        if n in MISS_DAYS:
            day_plans.append(
                DayPlan(
                    day_number=n,
                    activity_date=meta.activity_date,
                    action="miss",
                    shot_total=0,
                    timing=SubmissionTiming.MISSED.value,
                    write_on_day_number=n,
                    notes="Intentional miss for streak / inactivity coverage",
                    dedupe_key=_dedupe_key(run_id, "MISS", n),
                )
            )
            continue

        timing = SubmissionTiming.SAME_DAY.value
        write_on = n
        if n == BACKDATE_ACTIVITY_DAY:
            # Activity happens on day 20 but is written when clock is on day 22.
            timing = SubmissionTiming.BACKDATED.value
            write_on = BACKDATE_WRITE_DAY
        elif n == SAME_DAY_SUBMIT_DAY:
            timing = SubmissionTiming.SAME_DAY.value
            write_on = SAME_DAY_SUBMIT_DAY

        shots = _shots_for_day(n, goal_total_shots, active_count)

        hw_payload: list[dict[str, Any]] = list(pha_by_day.get(n) or [])

        zoom_ids: list[str] = []
        zoom_modes: list[str] = []
        # Place the two selected Zoom meetings on two fixed days if available.
        # Day 12 = Live (Attendees path); Day 40 = Recording Quiz (never Attendees).
        if zoom_list:
            if n == 12 and len(zoom_list) >= 1:
                zoom_ids = [zoom_list[0]["record_id"]]
                zoom_modes = ["live"]
            if n == 40 and len(zoom_list) >= 2:
                zoom_ids = [zoom_list[1]["record_id"]]
                zoom_modes = ["recording"]
            elif n == 40 and len(zoom_list) == 1:
                zoom_ids = [zoom_list[0]["record_id"]]
                zoom_modes = ["recording"]

        video = n in VIDEO_FEEDBACK_DAYS

        emails: list[dict[str, Any]] = []
        # Daily submission email intent (pipeline creates handoff; recipient forced safe).
        emails.append(
            {
                "event_type": "DAILY_SUBMISSION",
                "day_number": n,
                "recipient": SAFE_EMAIL_RECIPIENT,
                "send": False,  # dry-run default; execute enables pipeline, not direct SMTP
            }
        )
        # Weekly athlete summary email on each Saturday in window.
        if meta.activity_date.weekday() == 5:  # Saturday
            emails.append(
                {
                    "event_type": "WEEKLY_ATHLETE_SUMMARY",
                    "day_number": n,
                    "week_sunday": sunday_of(meta.activity_date).isoformat(),
                    "recipient": SAFE_EMAIL_RECIPIENT,
                    "send": False,
                }
            )
            emails.append(
                {
                    "event_type": "COACH_DIGEST",
                    "day_number": n,
                    "recipient": SAFE_EMAIL_RECIPIENT,
                    "send": False,
                    "note": "Coach digest if configured in live pipeline",
                }
            )

        if n in MISS_DAYS or n == INACTIVITY_GAP_START:
            emails.append(
                {
                    "event_type": "INACTIVITY_ALERT",
                    "day_number": n,
                    "recipient": SAFE_EMAIL_RECIPIENT,
                    "send": False,
                    "note": "Emitted only if live inactivity rules fire for this gap",
                }
            )

        intended_emails.extend(emails)

        day_plans.append(
            DayPlan(
                day_number=n,
                activity_date=meta.activity_date,
                action="submit",
                shot_total=shots,
                timing=timing,
                write_on_day_number=write_on,
                homework=hw_payload,
                video_feedback=video,
                zoom_meeting_ids=zoom_ids,
                zoom_modes=zoom_modes,
                email_events=emails,
                notes=run_marker(run_id),
                dedupe_key=_dedupe_key(run_id, "SUB", n),
            )
        )

    total_shots = sum(d.shot_total for d in day_plans)
    submit_days = sum(1 for d in day_plans if d.action == "submit")
    summary = {
        "simulation_days": len(day_plans),
        "submit_days": submit_days,
        "miss_days": len(MISS_DAYS),
        "total_planned_shots": total_shots,
        "homework_completions": sum(len(d.homework) for d in day_plans),
        "video_feedback_days": len(VIDEO_FEEDBACK_DAYS),
        "zoom_attendance_events": sum(1 for d in day_plans if d.zoom_meeting_ids),
        "same_day_submissions": sum(
            1 for d in day_plans if d.timing == SubmissionTiming.SAME_DAY.value
        ),
        "backdated_submissions": sum(
            1 for d in day_plans if d.timing == SubmissionTiming.BACKDATED.value
        ),
        "email_events": len(intended_emails),
    }

    athlete = {
        "display_name": ATHLETE_DISPLAY_NAME,
        "first_name": ATHLETE_FIRST_NAME,
        "last_name": ATHLETE_LAST_NAME,
        "grade": ATHLETE_GRADE,
        "parent_email": SAFE_EMAIL_RECIPIENT,
        "active": True,
    }

    cleanup_scope = [
        "Athletes",
        "Enrollments",
        "Submissions",
        "Submission Assets",
        "Homework Completions",
        "XP Events",
        "Athlete Achievement Unlocks",
        "Streak Occurrences",
        "Video Feedback",
        "Weekly Athlete Summary",
        "Zoom Attendance",
        "Zoom Meetings",
        "Email Handoff Queue",
    ]

    return Athlete1Scenario(
        version=SCENARIO_VERSION,
        seed=SCENARIO_SEED,
        run_id=run_id,
        athlete=athlete,
        grade_band_id=grade_band_id,
        goal_record_id=goal_record_id,
        goal_total_shots=goal_total_shots,
        days=day_plans,
        zoom_selected=[{"record_id": z["record_id"], **{k: z.get(k) for k in ("display", "meeting_name", "start_time")}} for z in zoom_list],
        homework_selected=[{"record_id": h["record_id"], **{k: h.get(k) for k in ("display", "slot", "week_id", "library_id", "program_instance_id")}} for h in hw_list],
        intended_writes_summary=summary,
        intended_emails=intended_emails,
        cleanup_scope=cleanup_scope,
        gate_notes=gate_notes,
        meta={
            "sim_start": SIM_START.isoformat(),
            "sim_end": SIM_END.isoformat(),
            "miss_days": sorted(MISS_DAYS),
            "same_day_submit_day": SAME_DAY_SUBMIT_DAY,
            "backdate_write_day": BACKDATE_WRITE_DAY,
            "backdate_activity_day": BACKDATE_ACTIVITY_DAY,
            "video_feedback_days": sorted(VIDEO_FEEDBACK_DAYS),
            "weeks_provided": len(weeks or []),
            "weeks": [
                {
                    "record_id": getattr(w, "record_id", None) or (w.get("record_id") if isinstance(w, dict) else ""),
                    "name": getattr(w, "name", None) or (w.get("name") if isinstance(w, dict) else ""),
                }
                for w in (weeks or [])
            ],
            "goal_coverage_ratio": round(total_shots / goal_total_shots, 3),
            "program_instance_hint": next(
                (h.get("program_instance_id") for h in hw_list if h.get("program_instance_id")),
                "",
            ),
            # Early Bird (Week 0) is before May 2027 — out of this simulation window.
            "early_bird_handling": "out_of_window",
            "early_bird_in_window": False,
            "homework_weeks_policy": "weeks_1_through_8_of_sim_window; week_9_zero_homework",
            "sim_window_week_count": len(window_weeks),
            "week9_zero_homework": True,
            "week9_bounds": (
                [week9_bounds[0].isoformat(), week9_bounds[1].isoformat()]
                if week9_bounds
                else None
            ),
        },
    )


def scenario_from_reference(
    *,
    run_id: str,
    grade_band_id: str,
    goal_record_id: str,
    goal_total_shots: int,
    homework_objs: Sequence[Any],
    zoom_objs: Sequence[Any],
    week_objs: Sequence[Any] | None = None,
) -> Athlete1Scenario:
    """Adapter from dataclass reference objects to dict scenario builder."""

    def _as_dict(obj: Any) -> dict[str, Any]:
        if isinstance(obj, dict):
            return obj
        return {
            "record_id": getattr(obj, "record_id"),
            "display": getattr(obj, "display", getattr(obj, "name", "")),
            "slot": getattr(obj, "slot", ""),
            "week_id": getattr(obj, "week_id", ""),
            "library_id": getattr(obj, "library_id", ""),
            "program_instance_id": getattr(obj, "program_instance_id", ""),
            "meeting_name": getattr(obj, "meeting_name", ""),
            "start_time": getattr(obj, "start_time", ""),
            "name": getattr(obj, "name", ""),
            "start": getattr(obj, "start", None),
            "end": getattr(obj, "end", None),
        }

    return build_athlete1_scenario(
        run_id=run_id,
        grade_band_id=grade_band_id,
        goal_record_id=goal_record_id,
        goal_total_shots=goal_total_shots,
        homework=[_as_dict(h) for h in homework_objs],
        zoom_meetings=[_as_dict(z) for z in zoom_objs],
        weeks=[_as_dict(w) for w in (week_objs or [])],
    )


def classify_plan_timing(plan: DayPlan, clock: SimulationClock) -> SubmissionTiming:
    if plan.action == "miss":
        return SubmissionTiming.MISSED
    clock.advance_to(
        SIM_START + timedelta(days=plan.write_on_day_number - 1)
    )
    return clock.classify_submission(plan.activity_date, missed=False)
