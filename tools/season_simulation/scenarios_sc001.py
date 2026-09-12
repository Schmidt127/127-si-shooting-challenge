"""SC-SEASON-SIM-001 — three-athlete deterministic scenario builders.

Athlete 1 — perfect / max-compliance
Athlete 2 — inconsistent participation / recovery
Athlete 3 — edge case / timing / idempotency

Reuses SC-SEASON-SIM-002 writer contracts via ``AthleteScenario`` / ``DayPlan``.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Sequence

from .constants import SC001_ATHLETES, SIM_START
from .scenario_base import (
    AthleteProfile,
    AthleteScenario,
    DayPlan,
    aggregate_weekly_shots,
    build_athlete_identity,
    compute_goal_met_crossing,
    dedupe_key,
    default_cleanup_scope,
    default_zoom_placeholders,
    estimate_weekly_goal_shots,
    saturday_email_events,
    simulation_days,
    summarize_scenario,
    write_day_from_template,
)
from .scenarios import (  # reuse homework scheduler from SC-002
    HOMEWORK_WEEK_ORDER,
    _schedule_homework_attachments,
    group_phas_by_homework_week,
)
from .season_policy import COMMON_HOMEWORK_DUE_DATE, week_label_for_activity_date
from .simulation_clock import SubmissionTiming


SC001_VERSION = "1.0.0"
PROFILE = AthleteProfile

# Weeks where a Program Zoom meeting exists (live attendance required for Perfect Week).
SC001_ZOOM_REQUIRED_WEEKS = frozenset(
    {"Week 2", "Week 3", "Week 4", "Week 6", "Week 7", "Week 8"}
)

# Athlete 2 — exactly one late-season Perfect Week (owner-approved).
ATHLETE2_RECOVERY_WEEK = "Week 7"

# Documented primary failure mode per week (distinct probes; Week 7 excluded — passes).
ATHLETE2_PW_FAILURE_MODES: dict[str, str] = {
    "Early Bird": "fail_weekly_shots",
    "Week 1": "fail_weekly_shots",
    "Week 2": "fail_homework_skipped",
    "Week 3": "fail_video_count",
    "Week 4": "fail_required_zoom",
    "Week 5": "fail_homework_skipped",
    "Week 6": "fail_homework_timing",
    "Week 8": "fail_weekly_shots",
    "Week 9": "fail_weekly_shots",
}

# Athlete 3 — explicit week-by-week Perfect Week design truth (outcome, failure_mode).
# Count of ``pass`` rows is authoritative; matrix + XP derive from evaluation, not this table alone.
ATHLETE3_PERFECT_WEEK_TRUTH_TABLE: dict[str, tuple[str, str]] = {
    "Early Bird": ("pass", "pass"),
    "Week 1": ("pass", "pass"),
    "Week 2": ("fail", "fail_daily_shooting"),
    "Week 3": ("fail", "fail_video_count"),
    "Week 4": ("fail", "fail_required_zoom"),
    "Week 5": ("fail", "fail_homework_timing"),
    "Week 6": ("pass", "pass"),
    "Week 7": ("pass", "pass"),
    "Week 8": ("fail", "fail_single_requirement"),
    "Week 9": ("pass", "pass"),
}

ATHLETE3_PASS_WEEKS = frozenset(
    label for label, (outcome, _) in ATHLETE3_PERFECT_WEEK_TRUTH_TABLE.items() if outcome == "pass"
)


# ---------------------------------------------------------------------------
# Athlete 1 — PERFECT SEASON
# ---------------------------------------------------------------------------

def _athlete1_shots(day_number: int) -> int:
    """High/medium/high rhythm — distinct from SC-002 Athlete 1 curve."""
    rhythm = (278, 222, 285, 218, 272, 225, 268)
    base = rhythm[(day_number - 1) % len(rhythm)]
    if 16 <= day_number <= 22:
        base += 48
    if 30 <= day_number <= 36:
        base += 35
    if 44 <= day_number <= 50:
        base += 62
    if day_number >= 55:
        base += 28
    return base


def _athlete1_video_days(days_meta: Sequence[Any]) -> frozenset[int]:
    """≥3 qualifying video days per challenge week."""
    by_week: dict[str, list[int]] = {}
    for meta in days_meta:
        label = week_label_for_activity_date(meta.activity_date)
        by_week.setdefault(label, []).append(meta.day_number)
    chosen: set[int] = set()
    for _label, day_nums in sorted(by_week.items()):
        pool = sorted(day_nums)
        if not pool:
            continue
        if len(pool) >= 3:
            step = max(1, len(pool) // 3)
            for i in range(3):
                chosen.add(pool[min(i * step, len(pool) - 1)])
        else:
            chosen.update(pool)
    return frozenset(chosen)


def _athlete1_zoom(days_meta: Sequence[Any]) -> dict[int, tuple[list[str], list[str]]]:
    """Live attendance every homework week + one recorded credit (Week 5)."""
    zoom = default_zoom_placeholders()
    live_id, rec_id = zoom[0]["record_id"], zoom[1]["record_id"]
    out: dict[int, tuple[list[str], list[str]]] = {}
    live_weeks = {"Week 2", "Week 3", "Week 4", "Week 6", "Week 7", "Week 8"}
    for meta in days_meta:
        label = week_label_for_activity_date(meta.activity_date)
        if label in live_weeks and meta.day_number % 7 == 3:
            out[meta.day_number] = ([live_id], ["live"])
        if label == "Week 5" and meta.day_number % 9 == 0:
            out[meta.day_number] = ([rec_id], ["recording"])
    # Ensure Early Bird live on day 1
    out[1] = ([live_id], ["live"])
    return out


def build_athlete1_perfect_scenario(
    *,
    run_id: str,
    grade_band_id: str,
    goal_record_id: str,
    goal_total_shots: int,
    homework: Sequence[dict[str, Any]],
    zoom_meetings: Sequence[dict[str, Any]],
    weeks: Sequence[dict[str, Any]] | None = None,
) -> AthleteScenario:
    profile = PROFILE.ATHLETE1_PERFECT.value
    days_meta = simulation_days()
    hw_list = list(homework)
    zoom_list = list(zoom_meetings)[:2] or default_zoom_placeholders()
    gate_notes: list[str] = []

    hw_by_day = _schedule_homework_attachments(
        run_id=run_id,
        days_meta=days_meta,
        hw_list=hw_list,
        weeks=weeks,
        gate_notes=gate_notes,
    )
    # Force all homework Satisfactory / on-time for perfect path.
    for day_num, payloads in hw_by_day.items():
        for p in payloads:
            p["outcome"] = "Satisfactory"
            p["late_status"] = "on_time"
            p["credit_eligible"] = True

    # Athlete-scoped dedupe keys (shared run_id across three enrollments).
    for day_num, payloads in hw_by_day.items():
        for p in payloads:
            p["dedupe_key"] = dedupe_key(
                run_id, profile, "HW", day_num, str(p.get("pha_record_id") or "")
            )

    video_days = _athlete1_video_days(days_meta)
    zoom_map = _athlete1_zoom(days_meta)
    day_plans: list[Any] = []

    for meta in days_meta:
        n = meta.day_number
        z_ids, z_modes = zoom_map.get(n, ([], []))
        day_plans.append(
            write_day_from_template(
                meta=meta,
                run_id=run_id,
                profile=profile,
                action="submit",
                shot_total=_athlete1_shots(n),
                timing=SubmissionTiming.SAME_DAY.value,
                write_on=n,
                homework=list(hw_by_day.get(n) or []),
                video_feedback=n in video_days,
                video_count=1 if n in video_days else 0,
                zoom_ids=list(z_ids),
                zoom_modes=list(z_modes),
            )
        )

    intended_emails = saturday_email_events(run_id, days_meta)
    for d in day_plans:
        intended_emails.extend(list(d.email_events))

    total = sum(d.shot_total for d in day_plans)
    gate_notes.append(
        f"Athlete 1 perfect path: {len(day_plans)} submit days, 0 misses, "
        f"{len(video_days)} video days, all homework Satisfactory."
    )

    identity = build_athlete_identity(
        profile=PROFILE.ATHLETE1_PERFECT,
        first_name="Sim",
        last_name="Perfect",
        grade="12",
    )

    scenario = AthleteScenario(
        profile=profile,
        version=SC001_VERSION,
        seed="sc001-athlete1-perfect-v1",
        run_id=run_id,
        athlete=identity,
        grade_band_id=grade_band_id,
        goal_record_id=goal_record_id,
        goal_total_shots=goal_total_shots,
        days=day_plans,
        zoom_selected=[{"record_id": z["record_id"], **{k: z.get(k) for k in ("display",)}} for z in zoom_list],
        homework_selected=[{"record_id": h["record_id"]} for h in hw_list],
        intended_writes_summary=summarize_scenario(day_plans, profile=profile),
        intended_emails=intended_emails,
        cleanup_scope=default_cleanup_scope(),
        gate_notes=gate_notes,
        meta={
            "path": "perfect_max_compliance",
            "expected_perfect_weeks": 10,
            "expected_goal_met": True,
            "total_planned_shots": total,
            "goal_coverage_ratio": round(total / goal_total_shots, 3) if goal_total_shots else 0,
            "video_days": sorted(video_days),
            "miss_days": [],
        },
    )
    scenario.meta.update(_athlete1_meta_goal_crossing(scenario))
    return scenario


def _athlete1_meta_goal_crossing(scenario: AthleteScenario) -> dict[str, Any]:
    crossing_date, day_number, before, cumulative = compute_goal_met_crossing(scenario)
    return {
        "expected_goal_met_date": crossing_date,
        "expected_goal_met_day_number": day_number,
        "cumulative_shots_before_crossing": before,
        "cumulative_shots_on_crossing_date": cumulative,
    }


# ---------------------------------------------------------------------------
# Athlete 2 — INCONSISTENT / RECOVERY
# ---------------------------------------------------------------------------

# Day 46→58 historically; +6 day shift with Apr 25 window so Week 7 recovery stays miss-free.
ATHLETE2_MISS_DAYS = frozenset({10, 17, 24, 31, 38, 45, 59, 64})
ATHLETE2_STREAK_BREAK_BEFORE_10 = 55  # miss day 59 breaks rebuild before day-10 gate


def _athlete2_shots(day_number: int, week_label: str, goal_total: int) -> int:
    """Lower irregular totals — boundary tests per week."""
    if day_number in ATHLETE2_MISS_DAYS:
        return 0
    base = 95 + (day_number * 11) % 67
    boosts = {
        "Week 3": -12,
        "Week 4": 8,
        "Week 5": 45,
        "Week 8": 90,
    }
    base += boosts.get(week_label, 0)
    if week_label == ATHLETE2_RECOVERY_WEEK:
        weekly_est = estimate_weekly_goal_shots(goal_total, week_label)
        daily_floor = max(1, (weekly_est + 6) // 7)
        return daily_floor + (day_number % 5) * 4
    if week_label == "Week 6":
        weekly_est = estimate_weekly_goal_shots(goal_total, week_label)
        return max(80, weekly_est // 7 - 3)
    if week_label == "Week 8" and day_number >= 60:
        return 140
    return max(70, base)


def _athlete2_homework_overrides(
    hw_by_day: dict[int, list[dict[str, Any]]],
    gate_notes: list[str],
) -> None:
    skip_weeks = {"Week 2", "Week 5"}
    late_day = 47  # Week 6 (calendar-shifted +6 from prior May-1 window)
    nr_day = 33
    for day_num, payloads in list(hw_by_day.items()):
        label = payloads[0].get("week_label") if payloads else ""
        if label in skip_weeks:
            hw_by_day[day_num] = []
            gate_notes.append(f"Athlete 2: skip homework week {label} (day {day_num})")
            continue
        for p in payloads:
            if day_num == nr_day:
                p["outcome"] = "Needs Revision"
                gate_notes.append(f"Day {nr_day}: Needs Revision → corrected later (Week 4)")
            elif day_num == late_day:
                p["late_status"] = "late_ineligible"
                p["credit_eligible"] = False
                p["outcome"] = "Satisfactory"
                gate_notes.append(f"Day {late_day}: late homework submission (Week 6)")
            else:
                p["outcome"] = "Satisfactory"


def _athlete2_video_days(days_meta: Sequence[Any]) -> dict[str, int]:
    """Videos per week — includes a zero-video week."""
    counts = {
        "Early Bird": 1,
        "Week 1": 2,
        "Week 2": 1,
        "Week 3": 0,
        "Week 4": 3,
        "Week 5": 2,
        "Week 6": 1,
        "Week 7": 3,
        "Week 8": 2,
        "Week 9": 1,
    }
    by_week: dict[str, list[int]] = {}
    for meta in days_meta:
        if meta.day_number in ATHLETE2_MISS_DAYS:
            continue
        label = week_label_for_activity_date(meta.activity_date)
        by_week.setdefault(label, []).append(meta.day_number)
    assigned: dict[str, int] = {}
    for label, need in counts.items():
        pool = by_week.get(label) or []
        for i, dn in enumerate(pool[: max(0, need)]):
            assigned[f"{label}:{i}"] = dn
    return assigned


def build_athlete2_recovery_scenario(
    *,
    run_id: str,
    grade_band_id: str,
    goal_record_id: str,
    goal_total_shots: int,
    homework: Sequence[dict[str, Any]],
    zoom_meetings: Sequence[dict[str, Any]],
    weeks: Sequence[dict[str, Any]] | None = None,
) -> AthleteScenario:
    profile = PROFILE.ATHLETE2_RECOVERY.value
    days_meta = simulation_days()
    hw_list = list(homework)
    zoom_list = list(zoom_meetings)[:2] or default_zoom_placeholders()
    gate_notes: list[str] = []

    hw_by_day = _schedule_homework_attachments(
        run_id=run_id,
        days_meta=[m for m in days_meta if m.day_number not in ATHLETE2_MISS_DAYS],
        hw_list=hw_list,
        weeks=weeks,
        gate_notes=gate_notes,
    )
    _athlete2_homework_overrides(hw_by_day, gate_notes)
    for day_num, payloads in hw_by_day.items():
        for p in payloads:
            p["dedupe_key"] = dedupe_key(
                run_id, profile, "HW", day_num, str(p.get("pha_record_id") or "")
            )

    video_assign = _athlete2_video_days(days_meta)
    video_day_set = frozenset(video_assign.values())
    live_id, rec_id = zoom_list[0]["record_id"], zoom_list[1]["record_id"]
    missed_live_week = "Week 4"
    day_plans: list[Any] = []

    for meta in days_meta:
        n = meta.day_number
        label = week_label_for_activity_date(meta.activity_date)
        if n in ATHLETE2_MISS_DAYS:
            day_plans.append(
                write_day_from_template(
                    meta=meta,
                    run_id=run_id,
                    profile=profile,
                    action="miss",
                    shot_total=0,
                    timing=SubmissionTiming.MISSED.value,
                    write_on=n,
                    notes=f"intentional miss — streak break / recovery probe",
                )
            )
            continue

        shots = _athlete2_shots(n, label, goal_total_shots)
        z_ids: list[str] = []
        z_modes: list[str] = []
        if label == "Week 7" and n == 53:
            z_ids, z_modes = [live_id], ["live"]
        if label == "Week 5" and n == 39:
            z_ids, z_modes = [rec_id], ["recording"]
        if label == missed_live_week:
            gate_notes.append(f"Week 4: missed required live Zoom (Athlete 2)")

        timing = SubmissionTiming.SAME_DAY.value
        write_on = n
        if n == 44:
            timing = SubmissionTiming.BACKDATED.value
            write_on = 46
            gate_notes.append("Day 46 writes backdated activity for day 44")

        day_plans.append(
            write_day_from_template(
                meta=meta,
                run_id=run_id,
                profile=profile,
                action="submit",
                shot_total=shots,
                timing=timing,
                write_on=write_on,
                homework=list(hw_by_day.get(n) or []),
                video_feedback=n in video_day_set,
                video_count=1 if n in video_day_set else 0,
                zoom_ids=z_ids,
                zoom_modes=z_modes,
            )
        )

    intended_emails = saturday_email_events(run_id, days_meta)
    identity = build_athlete_identity(
        profile=PROFILE.ATHLETE2_RECOVERY,
        first_name="Sim",
        last_name="Recovery",
        grade="10",
    )
    total = sum(d.shot_total for d in day_plans)

    return AthleteScenario(
        profile=profile,
        version=SC001_VERSION,
        seed="sc001-athlete2-recovery-v1",
        run_id=run_id,
        athlete=identity,
        grade_band_id=grade_band_id,
        goal_record_id=goal_record_id,
        goal_total_shots=goal_total_shots,
        days=day_plans,
        zoom_selected=[{"record_id": z["record_id"]} for z in zoom_list],
        homework_selected=[{"record_id": h["record_id"]} for h in hw_list],
        intended_writes_summary=summarize_scenario(day_plans, profile=profile),
        intended_emails=intended_emails,
        cleanup_scope=default_cleanup_scope(),
        gate_notes=gate_notes,
        meta={
            "path": "inconsistent_recovery",
            "miss_days": sorted(ATHLETE2_MISS_DAYS),
            "expected_perfect_weeks": 1,
            "recovery_perfect_week": ATHLETE2_RECOVERY_WEEK,
            "perfect_week_failure_modes": ATHLETE2_PW_FAILURE_MODES,
            "expected_goal_met": "late_if_at_all",
            "total_planned_shots": total,
            "video_day_map": video_assign,
        },
    )


# ---------------------------------------------------------------------------
# Athlete 3 — EDGE / IDEMPOTENCY
# ---------------------------------------------------------------------------

def _athlete3_daily_floor(week_label: str, goal_total: int) -> int:
    weekly_est = estimate_weekly_goal_shots(goal_total, week_label)
    official_days = sum(
        1
        for meta in simulation_days()
        if week_label_for_activity_date(meta.activity_date) == week_label
    )
    divisor = official_days if official_days else 7
    return max(1, (weekly_est + divisor - 1) // divisor)


def _athlete3_shots(day_number: int, week_label: str, goal_total: int) -> int:
    daily_floor = _athlete3_daily_floor(week_label, goal_total)
    weekly_est = estimate_weekly_goal_shots(goal_total, week_label)

    if week_label in ATHLETE3_PASS_WEEKS:
        return daily_floor + (day_number % 5) * 3

    if week_label == "Week 2":
        if day_number == 20:
            return daily_floor + 80
        return max(70, 110 + (day_number * 13) % 58)

    if week_label == "Week 8":
        if day_number == 66:
            return daily_floor + 2
        return daily_floor + 1

    if week_label == "Week 4" and day_number == 34:
        return weekly_est
    if week_label == "Week 5" and day_number == 40:
        return weekly_est + 1
    return 110 + (day_number * 13) % 58


def build_athlete3_edge_scenario(
    *,
    run_id: str,
    grade_band_id: str,
    goal_record_id: str,
    goal_total_shots: int,
    homework: Sequence[dict[str, Any]],
    zoom_meetings: Sequence[dict[str, Any]],
    weeks: Sequence[dict[str, Any]] | None = None,
) -> AthleteScenario:
    profile = PROFILE.ATHLETE3_EDGE.value
    days_meta = simulation_days()
    hw_list = list(homework)
    zoom_list = list(zoom_meetings)[:2] or default_zoom_placeholders()
    gate_notes: list[str] = []

    hw_by_day = _schedule_homework_attachments(
        run_id=run_id,
        days_meta=days_meta,
        hw_list=hw_list,
        weeks=weeks,
        gate_notes=gate_notes,
    )

    early_day = 3
    on_time_day = 26
    late_day = 39  # Week 5 — late satisfactory (XP yes, no Perfect Week)
    nr_day = 30
    multi_asset_day = 21

    for day_num, payloads in hw_by_day.items():
        for p in payloads:
            if day_num == early_day:
                p["timing_note"] = "early"
                p["outcome"] = "Satisfactory"
            elif day_num == on_time_day:
                p["timing_note"] = "in_week"
                p["outcome"] = "Satisfactory"
            elif day_num == late_day:
                p["late_status"] = "late_ineligible"
                p["credit_eligible"] = True
                p["outcome"] = "Satisfactory"
                p["timing_note"] = "late_xp_ok_no_retro_pw"
                gate_notes.append(
                    f"Day {late_day}: late Satisfactory homework — XP yes, no retro Perfect Week"
                )
            elif day_num == nr_day:
                p["outcome"] = "Needs Revision"
            elif day_num == multi_asset_day:
                p["asset_count"] = 2
                p["outcome"] = "Satisfactory"
            else:
                p["outcome"] = "Satisfactory"

    for day_num, payloads in hw_by_day.items():
        for p in payloads:
            p["dedupe_key"] = dedupe_key(
                run_id, profile, "HW", day_num, str(p.get("pha_record_id") or "")
            )

    # Week 9 pass requires on-time homework — override generic Week 8 late probe on day 67.
    for p in hw_by_day.get(67, []):
        p["late_status"] = "on_time"
        p["credit_eligible"] = True
        p.pop("timing_note", None)
        gate_notes.append(
            "Day 67: Week 8 PHA forced on-time so Week 9 Perfect Week passes "
            "(late homework probe lives on day 39 / Week 5)."
        )

    live_id, rec_id = zoom_list[0]["record_id"], zoom_list[1]["record_id"]
    video_week_counts = {
        "Early Bird": 3,
        "Week 1": 3,
        "Week 3": 2,
        "Week 6": 3,
        "Week 7": 3,
        "Week 8": 2,
        "Week 9": 3,
    }
    by_week: dict[str, list[int]] = {}
    for meta in days_meta:
        by_week.setdefault(
            week_label_for_activity_date(meta.activity_date), []
        ).append(meta.day_number)
    video_days: set[int] = set()
    for label, count in video_week_counts.items():
        for dn in (by_week.get(label) or [])[:count]:
            video_days.add(dn)

    same_day_extra = 25
    replay_days = frozenset({16, 35, 51, 64})
    day_plans: list[Any] = []

    for meta in days_meta:
        n = meta.day_number
        label = week_label_for_activity_date(meta.activity_date)
        shots = _athlete3_shots(n, label, goal_total_shots)
        timing = SubmissionTiming.SAME_DAY.value
        write_on = n
        if n == 42:
            timing = SubmissionTiming.BACKDATED.value
            write_on = 44
            gate_notes.append("Day 44 backdates activity to day 42 (boundary probe)")

        z_ids: list[str] = []
        z_modes: list[str] = []
        if n == 27:
            z_ids, z_modes = [live_id], ["live"]
        if n == 48:
            z_ids, z_modes = [rec_id], ["recording"]
        if n == 50:
            z_ids, z_modes = [live_id], ["live"]

        plan = write_day_from_template(
            meta=meta,
            run_id=run_id,
            profile=profile,
            action="submit",
            shot_total=shots,
            timing=timing,
            write_on=write_on,
            homework=list(hw_by_day.get(n) or []),
            video_feedback=n in video_days,
            video_count=2 if n == same_day_extra else (1 if n in video_days else 0),
            zoom_ids=z_ids,
            zoom_modes=z_modes,
            replay_probe=n in replay_days,
        )
        day_plans.append(plan)
        if n == same_day_extra:
            extra = DayPlan(
                day_number=n,
                activity_date=meta.activity_date,
                action="submit",
                shot_total=45,
                timing=timing,
                write_on_day_number=write_on,
                notes=f"{plan.notes}|SAME_DAY_EXTRA",
                dedupe_key=dedupe_key(run_id, profile, "SUB2", n),
            )
            day_plans.append(extra)
            gate_notes.append(
                f"Day {same_day_extra}: second same-day submission (supported path)"
            )

    intended_emails = saturday_email_events(run_id, days_meta)
    identity = build_athlete_identity(
        profile=PROFILE.ATHLETE3_EDGE,
        first_name="Sim",
        last_name="Edge",
        grade="8",
    )

    return AthleteScenario(
        profile=profile,
        version=SC001_VERSION,
        seed="sc001-athlete3-edge-v1",
        run_id=run_id,
        athlete=identity,
        grade_band_id=grade_band_id,
        goal_record_id=goal_record_id,
        goal_total_shots=goal_total_shots,
        days=day_plans,
        zoom_selected=[{"record_id": z["record_id"]} for z in zoom_list],
        homework_selected=[{"record_id": h["record_id"]} for h in hw_list],
        intended_writes_summary=summarize_scenario(day_plans, profile=profile),
        intended_emails=intended_emails,
        cleanup_scope=default_cleanup_scope(),
        gate_notes=gate_notes,
        meta={
            "path": "edge_idempotency",
            "replay_probe_days": sorted(replay_days),
            "expected_perfect_weeks": sum(
                1 for outcome, _ in ATHLETE3_PERFECT_WEEK_TRUTH_TABLE.values() if outcome == "pass"
            ),
            "perfect_week_truth_table": {
                week: {"outcome": outcome, "mode": mode}
                for week, (outcome, mode) in ATHLETE3_PERFECT_WEEK_TRUTH_TABLE.items()
            },
        },
    )


def build_all_sc001_scenarios(
    *,
    run_id: str,
    grade_band_id: str,
    goal_record_id: str,
    goal_total_shots: int,
    homework: Sequence[dict[str, Any]],
    zoom_meetings: Sequence[dict[str, Any]],
    weeks: Sequence[dict[str, Any]] | None = None,
) -> dict[str, AthleteScenario]:
    kwargs = dict(
        run_id=run_id,
        grade_band_id=grade_band_id,
        goal_record_id=goal_record_id,
        goal_total_shots=goal_total_shots,
        homework=homework,
        zoom_meetings=zoom_meetings,
        weeks=weeks,
    )
    return {
        PROFILE.ATHLETE1_PERFECT.value: build_athlete1_perfect_scenario(**kwargs),
        PROFILE.ATHLETE2_RECOVERY.value: build_athlete2_recovery_scenario(**kwargs),
        PROFILE.ATHLETE3_EDGE.value: build_athlete3_edge_scenario(**kwargs),
    }
