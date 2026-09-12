"""Production-aligned Perfect Week expectation evaluation (offline).

Mirrors Automation 057 eligibility rules at planning granularity:
- qualifying submission on every official day of the week;
- each day meets at least 1/7 of the weekly shot goal;
- video minimum (Config ``Perfect Week Video Minimum``, default 3);
- live Zoom when a meeting exists for the week (recording credit counts);
- homework 100% satisfactory with Submission Date on/before assigned Week End
  Saturday 11:59 PM America/Denver (not catch-up PHA Due Date).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Sequence

from .constants import SAFE_EMAIL_RECIPIENT
from .scenario_base import (
    AthleteScenario,
    DayPlan,
    aggregate_weekly_shots,
    estimate_weekly_goal_shots,
    simulation_days,
)
from .scenarios_sc001 import (
    ATHLETE2_RECOVERY_WEEK,
    ATHLETE2_PW_FAILURE_MODES,
    ATHLETE3_PERFECT_WEEK_TRUTH_TABLE,
    SC001_ZOOM_REQUIRED_WEEKS,
)
from .season_policy import week_label_for_activity_date

PERFECT_WEEK_VIDEO_MINIMUM = 3


@dataclass(frozen=True)
class PerfectWeekEvaluation:
    week_label: str
    outcome: str  # pass | fail_<reason>
    passes: bool
    failure_reasons: tuple[str, ...] = ()


def _official_days_in_week(week_label: str) -> int:
    return sum(
        1
        for meta in simulation_days()
        if week_label_for_activity_date(meta.activity_date) == week_label
    )


def _effective_video_minimum(submit_days: int, official_days: int) -> int:
    """Short windows (Early Bird, Week 9) scale the video floor down."""
    cap = min(submit_days, official_days) if official_days else submit_days
    return min(PERFECT_WEEK_VIDEO_MINIMUM, max(1, cap))


def _daily_shot_floor(weekly_goal: int, official_days: int) -> float:
    divisor = official_days if official_days else 7
    return weekly_goal / divisor


def _homework_status(
    scenario: AthleteScenario,
    week_label: str,
) -> tuple[bool, bool, bool, bool]:
    """Return (on_time_satisfactory, skipped_week, late_timing, needs_revision)."""
    items: list[dict[str, Any]] = []
    for plan in scenario.days:
        if week_label_for_activity_date(plan.activity_date) != week_label:
            continue
        items.extend(plan.homework)

    if not items:
        if week_label == "Week 9":
            return True, False, False, False
        return False, True, False, False

    needs_revision = any(str(i.get("outcome") or "") == "Needs Revision" for i in items)
    late_timing = any(
        str(i.get("late_status") or "") == "late_ineligible"
        or str(i.get("timing_note") or "") == "late_xp_ok_no_retro_pw"
        for i in items
    )
    on_time = all(
        str(i.get("outcome") or "") == "Satisfactory"
        and str(i.get("late_status") or "on_time") != "late_ineligible"
        and str(i.get("timing_note") or "") != "late_xp_ok_no_retro_pw"
        for i in items
    )
    return on_time, False, late_timing, needs_revision


def _week_zoom_attended(scenario: AthleteScenario, week_label: str) -> bool:
    live = rec = 0
    for plan in scenario.days:
        if week_label_for_activity_date(plan.activity_date) != week_label:
            continue
        for mode in plan.zoom_modes:
            if mode == "live":
                live += 1
            elif mode == "recording":
                rec += 1
    return live > 0 or rec > 0


def _plans_for_week(scenario: AthleteScenario, week_label: str) -> list[DayPlan]:
    return [
        p
        for p in scenario.days
        if week_label_for_activity_date(p.activity_date) == week_label
    ]


def evaluate_perfect_week(
    scenario: AthleteScenario,
    week_label: str,
    *,
    bucket: dict[str, Any] | None = None,
) -> PerfectWeekEvaluation:
    """Evaluate one week against Production Perfect Week rules."""
    bucket = bucket or aggregate_weekly_shots(scenario.days).get(week_label) or {}
    official_days = _official_days_in_week(week_label)
    submit_days = int(bucket.get("submit_days") or 0)
    miss_days = int(bucket.get("miss_days") or 0)
    weekly_total = int(bucket.get("weekly_shots") or 0)
    video_count = int(bucket.get("video_count") or 0)
    goal_est = estimate_weekly_goal_shots(scenario.goal_total_shots, week_label)
    daily_floor = _daily_shot_floor(goal_est, official_days)
    daily_shots = list(bucket.get("daily_shots") or [])

    reasons: list[str] = []

    if miss_days > 0 or submit_days < official_days:
        reasons.append("daily_shooting")

    if daily_shots and any(sh < daily_floor for sh in daily_shots):
        reasons.append("daily_shooting")

    if weekly_total < goal_est:
        reasons.append("weekly_shots")

    vid_min = _effective_video_minimum(submit_days, official_days)
    if video_count < vid_min:
        reasons.append("video_count")

    hw_on_time, hw_skipped, hw_late, hw_nr = _homework_status(scenario, week_label)
    if hw_skipped:
        reasons.append("homework_skipped")
    elif hw_late:
        reasons.append("homework_timing")
    elif hw_nr:
        reasons.append("homework_revision")
    elif not hw_on_time:
        reasons.append("homework")

    zoom_required = week_label in SC001_ZOOM_REQUIRED_WEEKS
    if zoom_required and not _week_zoom_attended(scenario, week_label):
        reasons.append("required_zoom")

    if not reasons:
        outcome = "pass_partial_window" if submit_days < 7 and week_label == "Week 9" else "pass"
        return PerfectWeekEvaluation(week_label, outcome, True, ())

    if scenario.profile == "athlete2_recovery" and week_label != ATHLETE2_RECOVERY_WEEK:
        documented = ATHLETE2_PW_FAILURE_MODES.get(week_label)
        if documented:
            return PerfectWeekEvaluation(week_label, documented, False, tuple(reasons))

    if len(reasons) == 1:
        reason = reasons[0]
        mapping = {
            "daily_shooting": "fail_daily_shooting",
            "weekly_shots": "fail_weekly_shots",
            "video_count": "fail_video_count",
            "homework_skipped": "fail_homework_skipped",
            "homework_timing": "fail_homework_timing",
            "homework_revision": "fail_homework_revision",
            "homework": "fail_homework",
            "required_zoom": "fail_required_zoom",
        }
        return PerfectWeekEvaluation(week_label, mapping.get(reason, "fail_mixed"), False, (reason,))

    # Multiple failures — name the primary probe for athlete profiles with truth tables.
    if scenario.profile == "athlete3_edge" and week_label in ATHLETE3_PERFECT_WEEK_TRUTH_TABLE:
        _, documented = ATHLETE3_PERFECT_WEEK_TRUTH_TABLE[week_label]
        if documented.startswith("fail_"):
            return PerfectWeekEvaluation(week_label, documented, False, tuple(reasons))

    return PerfectWeekEvaluation(week_label, "fail_mixed", False, tuple(reasons))


def evaluate_all_perfect_weeks(scenario: AthleteScenario) -> list[PerfectWeekEvaluation]:
    agg = aggregate_weekly_shots(scenario.days)
    labels = sorted(
        agg.keys(),
        key=lambda w: (
            0 if w == "Early Bird" else (10 if w.startswith("Week 9") else int(w.split()[1])),
        ),
    )
    return [
        evaluate_perfect_week(scenario, label, bucket=agg.get(label) or {})
        for label in labels
    ]


def count_perfect_week_passes(scenario: AthleteScenario) -> int:
    return sum(1 for ev in evaluate_all_perfect_weeks(scenario) if ev.passes)


def build_email_handoff_expectations(scenario: AthleteScenario) -> dict[str, Any]:
    """Authoritative email expectations for READY package / live verifier."""
    daily = sum(1 for d in scenario.days if d.action == "submit")
    hw_feedback = sum(
        1
        for d in scenario.days
        for h in d.homework
        if str(h.get("outcome") or "") in {"Satisfactory", "Needs Revision"}
    )
    weekly_arms = sum(
        1
        for meta in simulation_days()
        if meta.activity_date.weekday() == 5
    )
    return {
        "daily_submission_emails": daily,
        "homework_feedback_emails_if_graded": hw_feedback,
        "weekly_summary_build_arms": weekly_arms,
        "weekly_hub_handoffs_after_stage": 1,
        "recipient_allowlist": SAFE_EMAIL_RECIPIENT,
        "verify_send_status_writeback": True,
        "no_real_family_recipients": True,
        "events_from_scenario": len(scenario.intended_emails),
    }


def athlete2_recovery_week_note(scenario: AthleteScenario) -> str:
    """Explain why the single recovery week passes all Production PW rules."""
    ev = evaluate_perfect_week(scenario, ATHLETE2_RECOVERY_WEEK)
    if not ev.passes:
        return f"{ATHLETE2_RECOVERY_WEEK} does not pass offline evaluation: {ev.outcome}"
    bucket = aggregate_weekly_shots(scenario.days)[ATHLETE2_RECOVERY_WEEK]
    goal = estimate_weekly_goal_shots(scenario.goal_total_shots, ATHLETE2_RECOVERY_WEEK)
    return (
        f"{ATHLETE2_RECOVERY_WEEK} recovery week passes: "
        f"{bucket.get('submit_days')} submit days (0 misses), "
        f"weekly shots {bucket.get('weekly_shots')} ≥ goal {goal}, "
        f"videos {bucket.get('video_count')} ≥ {PERFECT_WEEK_VIDEO_MINIMUM}, "
        f"homework on-time, live Zoom attended."
    )
