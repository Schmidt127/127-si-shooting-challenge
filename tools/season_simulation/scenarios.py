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
from .season_policy import (
    COMMON_HOMEWORK_DUE_DATE,
    evaluate_late_homework,
    week_label_for_activity_date,
)
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
# Gate-pressure signal: mark this day's homework Needs Revision (do NOT skip a PHA).
GATE_BLOCK_PROBE_DAY = 28
# Day 61 = 2027-06-30 (after common due 2027-06-29) → late homework probe for one Week 8 PHA
LATE_HOMEWORK_PROBE_DAY = 61
# Flag Perfect Week Manual Exception on a mid-season same-day week for PW timing
PW_MANUAL_EXCEPTION_DAY = SAME_DAY_SUBMIT_DAY

# Product homework weeks: Early Bird + Weeks 1–8 (2 slots each). Week 9 = 0.
HOMEWORK_WEEK_ORDER = ("Early Bird",) + tuple(f"Week {i}" for i in range(1, 9))


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


def _week_id_to_label(weeks: Sequence[dict[str, Any]]) -> dict[str, str]:
    out: dict[str, str] = {}
    for w in weeks:
        rid = str(w.get("record_id") or "")
        name = str(w.get("name") or w.get("display") or "").strip()
        if rid and name:
            out[rid] = name
    return out


def _infer_week_label_from_pha(pha: dict[str, Any]) -> str:
    display = str(pha.get("display") or pha.get("schedule_key") or "")
    if "Early Bird" in display:
        return "Early Bird"
    for i in range(1, 10):
        token = f"Week {i}"
        if token in display:
            return token
    return ""


def group_phas_by_homework_week(
    homework: Sequence[dict[str, Any]],
    weeks: Sequence[dict[str, Any]] | None = None,
) -> dict[str, list[dict[str, Any]]]:
    """Group PHAs into Early Bird + Weeks 1–8 (2 slots each).

    Prefer live ``week_id`` → Weeks.name. Offline fixtures without week_id are
    chunked in ``HOMEWORK_WEEK_ORDER`` order (2 per week).
    """
    hw_list = list(homework)
    id_to_label = _week_id_to_label(weeks or [])
    by_label: dict[str, list[dict[str, Any]]] = {label: [] for label in HOMEWORK_WEEK_ORDER}

    resolved_any = False
    for pha in hw_list:
        label = id_to_label.get(str(pha.get("week_id") or "")) or _infer_week_label_from_pha(pha)
        if label in by_label:
            by_label[label].append(pha)
            resolved_any = True

    if not resolved_any or any(
        len(by_label[label]) == 0 for label in HOMEWORK_WEEK_ORDER
    ):
        # Synthetic / incomplete week linkage — deterministic 2-per-week chunking.
        by_label = {label: [] for label in HOMEWORK_WEEK_ORDER}
        for i, pha in enumerate(hw_list):
            if i >= len(HOMEWORK_WEEK_ORDER) * 2:
                break
            label = HOMEWORK_WEEK_ORDER[i // 2]
            by_label[label].append(pha)

    for label in HOMEWORK_WEEK_ORDER:
        by_label[label].sort(
            key=lambda h: (str(h.get("slot") or ""), str(h.get("record_id") or ""))
        )
    return by_label


def _schedule_homework_attachments(
    *,
    run_id: str,
    days_meta: Sequence[Any],
    hw_list: Sequence[dict[str, Any]],
    weeks: Sequence[dict[str, Any]] | None,
    gate_notes: list[str],
) -> dict[int, list[dict[str, Any]]]:
    """Return day_number → homework payloads. Each PHA exactly once; Week 9 empty."""
    by_label = group_phas_by_homework_week(hw_list, weeks)
    attachments: dict[int, list[dict[str, Any]]] = {}
    assigned_pha_ids: list[str] = []
    hw_index = 0

    submit_days_by_label: dict[str, list[Any]] = {label: [] for label in HOMEWORK_WEEK_ORDER}
    week9_days: list[Any] = []
    for meta in days_meta:
        if meta.day_number in MISS_DAYS:
            continue
        label = week_label_for_activity_date(meta.activity_date)
        if label == "Week 9":
            week9_days.append(meta)
            continue
        if label in submit_days_by_label:
            submit_days_by_label[label].append(meta)

    for label in HOMEWORK_WEEK_ORDER:
        phas = by_label.get(label) or []
        days = list(submit_days_by_label.get(label) or [])
        if label == "Week 8" and days:
            # Reserve last Week 8 PHA for late probe on day 61 when possible.
            late_meta = next(
                (m for m in days_meta if m.day_number == LATE_HOMEWORK_PROBE_DAY),
                None,
            )
        else:
            late_meta = None

        slots = list(phas)
        if not slots:
            continue

        # Prefer spreading across distinct submit days; stack on one day if needed
        # (Early Bird has only SIM_START inside the sim window).
        target_days: list[Any] = []
        if late_meta is not None and len(slots) >= 2:
            # First Week 8 PHA(s) stay in-week; last PHA completes late on day 61.
            in_week_count = len(slots) - 1
            if days:
                if len(days) >= in_week_count:
                    # Pick evenly spaced days for in-week slots.
                    step = max(1, len(days) // in_week_count)
                    for i in range(in_week_count):
                        target_days.append(days[min(i * step, len(days) - 1)])
                else:
                    target_days = list(days)
                    while len(target_days) < in_week_count:
                        target_days.append(days[-1])
            target_days.append(late_meta)
            gate_notes.append(
                f"Day {LATE_HOMEWORK_PROBE_DAY}: late homework probe — "
                f"Week 8 PHA completed after due {COMMON_HOMEWORK_DUE_DATE} "
                "(Week 9 has no Week-9 PHAs; this is a late Week 8 completion)."
            )
        else:
            if not days:
                gate_notes.append(
                    f"{label}: no submit days available in sim window for {len(slots)} PHA(s)"
                )
                continue
            if len(days) >= len(slots):
                step = max(1, len(days) // len(slots))
                for i in range(len(slots)):
                    target_days.append(days[min(i * step, len(days) - 1)])
            else:
                target_days = list(days)
                while len(target_days) < len(slots):
                    target_days.append(days[-1])

        # De-dupe day picks while preserving count via stacking.
        if len(target_days) > len(slots):
            target_days = target_days[: len(slots)]
        while len(target_days) < len(slots):
            target_days.append(target_days[-1] if target_days else days[0])

        for pha, meta in zip(slots, target_days):
            n = meta.day_number
            late = evaluate_late_homework(
                submission_date=meta.activity_date,
                due_date=COMMON_HOMEWORK_DUE_DATE,
            )
            outcome = "Satisfactory" if hw_index % 2 == 0 else "Needs Revision"
            if n == GATE_BLOCK_PROBE_DAY:
                outcome = "Needs Revision"
                gate_notes.append(
                    f"Day {n}: gate-pressure homework marked Needs Revision "
                    "(PHA still completed — 18/18 coverage preserved)"
                )
            if n == LATE_HOMEWORK_PROBE_DAY or not late.credit_eligible:
                outcome = "Needs Revision"
            multi_asset = hw_index % 4 == 0
            library_id = str(pha.get("library_id") or "").strip()
            payload = {
                "pha_record_id": pha["record_id"],
                "library_id": library_id,
                "slot": pha.get("slot") or "",
                "week_label": label,
                "outcome": outcome,
                "asset_count": 2 if multi_asset else 1,
                "late_status": late.timing_status,
                "credit_eligible": late.credit_eligible,
                "dedupe_key": _dedupe_key(run_id, "HW", n, pha["record_id"]),
            }
            attachments.setdefault(n, []).append(payload)
            assigned_pha_ids.append(str(pha["record_id"]))
            hw_index += 1

    if week9_days:
        gate_notes.append(
            f"Week 9 ({week9_days[0].activity_date}..{week9_days[-1].activity_date}): "
            "no homework attached (policy)"
        )

    # Safety: every selected PHA must appear exactly once when count is 18.
    if len(hw_list) == 18:
        missing = [
            str(h["record_id"])
            for h in hw_list
            if str(h["record_id"]) not in assigned_pha_ids
        ]
        if missing:
            raise ValueError(
                "Homework planner failed to assign all 18 PHAs; missing: "
                + ", ".join(missing)
            )
        if len(assigned_pha_ids) != len(set(assigned_pha_ids)):
            raise ValueError("Homework planner assigned duplicate PHA record IDs")

    return attachments


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
    zoom_list = list(zoom_meetings)[:2]  # optional plan hints; execute creates disposable meetings
    # Prefer create-during-execute placeholders when no meetings supplied so dry-run
    # planning still shows day 12 / day 40 Zoom events without VERIFY 2026 IDs.
    if not zoom_list:
        zoom_list = [
            {
                "record_id": "__SIM_ZOOM_LIVE__",
                "display": "Sim create live (execute)",
                "create_during_execute": True,
            },
            {
                "record_id": "__SIM_ZOOM_REC__",
                "display": "Sim create recorded (execute)",
                "create_during_execute": True,
            },
        ]

    day_plans: list[DayPlan] = []
    intended_emails: list[dict[str, Any]] = []
    gate_notes: list[str] = []

    active_day_numbers = [d.day_number for d in days_meta if d.day_number not in MISS_DAYS]
    active_count = len(active_day_numbers)

    hw_by_day = _schedule_homework_attachments(
        run_id=run_id,
        days_meta=days_meta,
        hw_list=hw_list,
        weeks=weeks,
        gate_notes=gate_notes,
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

        week_label = week_label_for_activity_date(meta.activity_date)
        hw_payload = list(hw_by_day.get(n) or [])
        if week_label == "Week 9" and hw_payload:
            # Hard guard — Week 9 must never carry Week-9 PHAs; late Week 8 probe is OK
            # only when payloads are tagged week_label Week 8.
            hw_payload = [h for h in hw_payload if h.get("week_label") != "Week 9"]

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
        # SC-168: intended pipeline only — execute + --enable-email-delivery
        # arms Build Weekly (072); WEEKLY Hub handoffs require
        # `weekly-email-stage` apply (119 substitute). Sim clock does not
        # fire 118/119 Sunday cron.
        if meta.activity_date.weekday() == 5:  # Saturday
            emails.append(
                {
                    "event_type": "WEEKLY_ATHLETE_SUMMARY",
                    "day_number": n,
                    "week_sunday": sunday_of(meta.activity_date).isoformat(),
                    "recipient": SAFE_EMAIL_RECIPIENT,
                    "send": False,
                    "expected_from_execute_alone": False,
                    "requires_weekly_email_stage": True,
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

        notes = run_marker(run_id)
        if n == PW_MANUAL_EXCEPTION_DAY:
            notes = f"{notes}|PW_MANUAL_EXCEPTION"
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
                notes=notes,
                dedupe_key=_dedupe_key(run_id, "SUB", n),
            )
        )

    window_weeks = week_boundaries_for_dates(d.activity_date for d in day_plans)
    week9_days = [d.activity_date for d in day_plans if week_label_for_activity_date(d.activity_date) == "Week 9"]
    week9_bounds = (min(week9_days), max(week9_days)) if week9_days else None

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
        "Zoom Meetings",  # sim-created disposable meetings only
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
        homework_selected=[{"record_id": h["record_id"], **{k: h.get(k) for k in ("display", "slot", "week_id")}} for h in hw_list],
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
            "late_homework_probe_day": LATE_HOMEWORK_PROBE_DAY,
            "common_homework_due_date": COMMON_HOMEWORK_DUE_DATE.isoformat(),
            "early_bird_day_1": week_label_for_activity_date(SIM_START),
            "weeks_provided": len(weeks or []),
            "goal_coverage_ratio": round(total_shots / goal_total_shots, 3),
            "homework_selected_count": len(hw_list),
            "program_instance_hint": next(
                (h.get("program_instance_id") for h in hw_list if h.get("program_instance_id")),
                "",
            ),
            # SIM_START (May 1) is the last Early Bird day — both Early Bird PHAs attach that day.
            "early_bird_handling": "last_early_bird_day_in_window",
            "early_bird_in_window": True,
            "homework_weeks_policy": (
                "early_bird_plus_weeks_1_through_8_two_slots_each; week_9_zero_homework; "
                "each_pha_exactly_once"
            ),
            "sim_window_week_count": len(window_weeks),
            "week9_zero_homework": True,
            "zoom_meetings_create_during_execute": True,
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
