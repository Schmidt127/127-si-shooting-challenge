"""Deterministic expected-outcome matrices for SC-SEASON-SIM-001.

Build weekly tables, XP buckets, Perfect Week counts, streak/milestone
expectations **before** live execute. Live verification compares against these.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Sequence

from .constants import (
    DEFAULT_SHOT_MILESTONES_912,
    DEFAULT_STREAK_GATE_THRESHOLDS,
    DEFAULT_STREAK_XP_THRESHOLDS,
)
from .expectations_achievements import (
    ShotMilestoneDef,
    select_crossed_shot_milestones,
)
from .perfect_week_eval import (
    build_email_handoff_expectations,
    evaluate_all_perfect_weeks,
    evaluate_perfect_week,
)
from .scenario_base import (
    AthleteScenario,
    aggregate_weekly_shots,
    compute_goal_met_crossing,
    estimate_weekly_goal_shots,
    weekly_threshold_tiers,
)
from .season_policy import week_label_for_activity_date
from .simulation_clock import build_simulation_days


WEEK_ORDER = (
    "Early Bird",
    "Week 1",
    "Week 2",
    "Week 3",
    "Week 4",
    "Week 5",
    "Week 6",
    "Week 7",
    "Week 8",
    "Week 9",
)


@dataclass
class WeeklyExpectationRow:
    week_label: str
    daily_shots: list[int]
    weekly_total: int
    weekly_goal_estimate: int
    goal_pct: float
    threshold_tiers: list[int]
    homework_expected: str
    homework_timing: str
    video_count: int
    zoom_state: str
    streak_state: str
    milestone_crossings: list[str]
    perfect_week: str
    xp_categories: list[str]
    level_gate_note: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class AthleteExpectationMatrix:
    profile: str
    athlete_name: str
    season_goal: int
    total_planned_shots: int
    submit_days: int
    miss_days: int
    weekly_rows: list[WeeklyExpectationRow]
    expected_perfect_week_count: int
    expected_streak_achievements: list[int]
    expected_shot_milestones: list[int]
    expected_weekly_threshold_awards: list[dict[str, Any]]
    expected_xp_by_category: dict[str, int]
    expected_level_note: str
    expected_goal_met_date: str
    expected_goal_met_cumulative_shots: int | None
    expected_email_handoffs: dict[str, Any]
    notes: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "profile": self.profile,
            "athlete_name": self.athlete_name,
            "season_goal": self.season_goal,
            "total_planned_shots": self.total_planned_shots,
            "submit_days": self.submit_days,
            "miss_days": self.miss_days,
            "weekly_rows": [r.to_dict() for r in self.weekly_rows],
            "expected_perfect_week_count": self.expected_perfect_week_count,
            "expected_streak_achievements": self.expected_streak_achievements,
            "expected_shot_milestones": self.expected_shot_milestones,
            "expected_weekly_threshold_awards": self.expected_weekly_threshold_awards,
            "expected_xp_by_category": self.expected_xp_by_category,
            "expected_level_note": self.expected_level_note,
            "expected_goal_met_date": self.expected_goal_met_date,
            "expected_goal_met_cumulative_shots": self.expected_goal_met_cumulative_shots,
            "expected_email_handoffs": self.expected_email_handoffs,
            "notes": self.notes,
        }


def _milestone_defs(grade_band_id: str = "recSIMGB912") -> list[ShotMilestoneDef]:
    return [
        ShotMilestoneDef(f"recSIMMS{i}", count, pts, label, True, grade_band_id, "9-12")
        for i, (count, pts, label) in enumerate(DEFAULT_SHOT_MILESTONES_912)
    ]


def _streaks_from_submit_days(
    submit_day_numbers: Sequence[int],
    *,
    thresholds: Sequence[int] = DEFAULT_STREAK_GATE_THRESHOLDS,
) -> list[int]:
    """Streak thresholds crossed by longest contiguous submit-day run."""
    if not submit_day_numbers:
        return []
    days = sorted(submit_day_numbers)
    best = cur = 1
    for i in range(1, len(days)):
        if days[i] == days[i - 1] + 1:
            cur += 1
        else:
            best = max(best, cur)
            cur = 1
    best = max(best, cur)
    return [t for t in thresholds if best >= t]


def _homework_summary(scenario: AthleteScenario, week_label: str) -> tuple[str, str]:
    items: list[dict[str, Any]] = []
    for d in scenario.days:
        if week_label_for_activity_date(d.activity_date) != week_label:
            continue
        items.extend(d.homework)
    if not items:
        if week_label == "Week 9":
            return "none", "n/a"
        return "skipped", "skipped"
    outcomes = {str(i.get("outcome") or "") for i in items}
    timing = str(items[0].get("timing_note") or items[0].get("late_status") or "on_time")
    if "Needs Revision" in outcomes:
        return "needs_revision_then_fix", timing
    if any(
        i.get("late_status") in {"late_ineligible", "late_xp_ok_no_retro_pw"}
        or i.get("perfect_week_homework_eligible") is False
        or str(i.get("timing_note") or "") == "late_xp_ok_no_retro_pw"
        for i in items
    ):
        return "late_satisfactory", timing
    return "complete_satisfactory", timing


def _format_goal_met_expectation(
    scenario: AthleteScenario,
    crossing_date: str | None,
    cumulative_on_date: int | None,
    total_shots: int,
) -> str:
    if crossing_date and cumulative_on_date is not None:
        return f"{crossing_date} (cumulative {cumulative_on_date:,} shots)"
    if total_shots < scenario.goal_total_shots:
        return f"Not reached — {total_shots:,} planned of {scenario.goal_total_shots:,} goal"
    return "TBD — cumulative total below season goal on last day"


def build_athlete_expectation_matrix(scenario: AthleteScenario) -> AthleteExpectationMatrix:
    weekly_agg = aggregate_weekly_shots(scenario.days)
    submit_nums = [d.day_number for d in scenario.days if d.action == "submit"]
    streak_gates = _streaks_from_submit_days(submit_nums)
    streak_xp = _streaks_from_submit_days(
        submit_nums, thresholds=DEFAULT_STREAK_XP_THRESHOLDS
    )
    milestones = _milestone_defs(scenario.grade_band_id or "recSIMGB912")
    total_shots = sum(d.shot_total for d in scenario.days if d.action == "submit")
    crossed = select_crossed_shot_milestones(
        milestones,
        total_shots=total_shots,
        grade_band_id=scenario.grade_band_id or "recSIMGB912",
        grade_band_name="9-12",
    )

    pw_evaluations = {ev.week_label: ev for ev in evaluate_all_perfect_weeks(scenario)}

    rows: list[WeeklyExpectationRow] = []
    threshold_awards: list[dict[str, Any]] = []
    pw_pass = 0
    running_shots = 0

    for label in WEEK_ORDER:
        bucket = weekly_agg.get(label) or {
            "weekly_shots": 0,
            "daily_shots": [],
            "video_count": 0,
            "submit_days": 0,
            "miss_days": 0,
            "live_zoom": 0,
            "recorded_zoom": 0,
        }
        goal_est = estimate_weekly_goal_shots(scenario.goal_total_shots, label)
        weekly_total = int(bucket.get("weekly_shots") or 0)
        ratio = weekly_total / goal_est if goal_est else 0.0
        tiers = weekly_threshold_tiers(ratio)
        for t in tiers:
            threshold_awards.append({"week": label, "tier": t})

        prev_running = running_shots
        running_shots += weekly_total
        week_crossings = [
            f"{m.shot_count} ({m.label})"
            for m in crossed
            if prev_running < m.shot_count <= running_shots
        ]

        hw_expected, hw_timing = _homework_summary(scenario, label)
        live_z = int(bucket.get("live_zoom") or 0)
        rec_z = int(bucket.get("recorded_zoom") or 0)
        zoom_state = (
            "live+recorded" if live_z and rec_z else ("live" if live_z else ("recorded" if rec_z else "none"))
        )

        pw_ev = pw_evaluations.get(label) or evaluate_perfect_week(scenario, label, bucket=bucket)
        pw = pw_ev.outcome
        if label == "Week 8" and scenario.profile == "athlete3_edge" and pw_ev.failure_reasons == ("video_count",):
            pw = "fail_single_requirement"
        if pw_ev.passes:
            pw_pass += 1

        xp_cats = ["SUBMISSION_XP"]
        if tiers:
            xp_cats.append("WEEKLY_THRESHOLD")
        if bucket.get("video_count"):
            xp_cats.append("VIDEO_SUBMISSION")
        if hw_expected.startswith("complete") or hw_expected.startswith("late"):
            xp_cats.append("HOMEWORK_XP")

        rows.append(
            WeeklyExpectationRow(
                week_label=label,
                daily_shots=list(bucket.get("daily_shots") or []),
                weekly_total=weekly_total,
                weekly_goal_estimate=goal_est,
                goal_pct=round(ratio * 100, 1),
                threshold_tiers=tiers,
                homework_expected=hw_expected,
                homework_timing=hw_timing,
                video_count=int(bucket.get("video_count") or 0),
                zoom_state=zoom_state,
                streak_state=f"longest_run≥{max(streak_xp) if streak_xp else 0}",
                milestone_crossings=week_crossings,
                perfect_week=pw,
                xp_categories=sorted(set(xp_cats)),
            )
        )

    xp_by_cat = _estimate_xp_buckets(
        scenario, threshold_awards, crossed, streak_xp, pw_pass
    )

    level_notes = {
        "athlete1_perfect": "Maximum realistic level progression — all gates satisfied",
        "athlete2_recovery": "Slower progression — streak/homework gates delay level ups",
        "athlete3_edge": "Mixed progression — partial gate satisfaction",
    }

    crossing_date, _cross_day, _before, cumulative_on_date = compute_goal_met_crossing(scenario)

    return AthleteExpectationMatrix(
        profile=scenario.profile,
        athlete_name=str(scenario.athlete.get("display_name") or ""),
        season_goal=scenario.goal_total_shots,
        total_planned_shots=total_shots,
        submit_days=sum(1 for d in scenario.days if d.action == "submit"),
        miss_days=sum(1 for d in scenario.days if d.action == "miss"),
        weekly_rows=rows,
        expected_perfect_week_count=pw_pass,
        expected_streak_achievements=streak_xp,
        expected_shot_milestones=[m.shot_count for m in crossed],
        expected_weekly_threshold_awards=threshold_awards,
        expected_xp_by_category=xp_by_cat,
        expected_level_note=level_notes.get(scenario.profile, ""),
        expected_goal_met_date=_format_goal_met_expectation(
            scenario, crossing_date, cumulative_on_date, total_shots
        ),
        expected_goal_met_cumulative_shots=cumulative_on_date,
        expected_email_handoffs=build_email_handoff_expectations(scenario),
        notes=list(scenario.gate_notes) + [
            f"Streak gate thresholds crossed: {streak_gates}",
            f"Streak XP thresholds crossed: {streak_xp}",
        ],
    )


def _estimate_xp_buckets(
    scenario: AthleteScenario,
    threshold_awards: list[dict[str, Any]],
    crossed: Sequence[Any],
    streaks: Sequence[int],
    perfect_week_count: int,
) -> dict[str, int]:
    """Offline XP category counts derived from scenario + matrix (not hand-tuned)."""
    subs = sum(1 for d in scenario.days if d.action == "submit")
    videos = sum(
        max(1, d.video_count) if (d.video_feedback or d.video_count) else 0
        for d in scenario.days
        if d.action == "submit"
    )
    hw_xp = sum(
        1
        for d in scenario.days
        for h in d.homework
        if str(h.get("outcome") or "") == "Satisfactory"
    )
    live_zoom = sum(1 for d in scenario.days if "live" in d.zoom_modes)
    rec_zoom = sum(1 for d in scenario.days if "recording" in d.zoom_modes)
    buckets = {
        "SUBMISSION_XP": subs,
        "WEEKLY_THRESHOLD": len(threshold_awards),
        "HOMEWORK_XP": hw_xp,
        "VIDEO_SUBMISSION": videos,
        "STREAK_XP": len(streaks),
        "SHOT_MILESTONE": len(crossed),
        "ZOOM_ATTEND_BASE": live_zoom,
        "ZOOM_RECORDING_CREDIT": rec_zoom,
        "PERFECT_WEEK": perfect_week_count,
    }
    # Production Zoom Attendance Bonus 2 / Bonus 3 fire once each when live count ≥ 2 / ≥ 3.
    if live_zoom >= 2:
        buckets["ZOOM_ATTEND_BONUS_2"] = 1
    if live_zoom >= 3:
        buckets["ZOOM_ATTEND_BONUS_3"] = 1
    return buckets


def build_three_athlete_expectation_package(
    scenarios: dict[str, AthleteScenario],
) -> dict[str, Any]:
    matrices = {
        profile: build_athlete_expectation_matrix(scenario).to_dict()
        for profile, scenario in scenarios.items()
    }
    return {
        "backlog_id": "SC-SEASON-SIM-001",
        "athlete_count": len(scenarios),
        "matrices": matrices,
        "combined_coverage": [
            "Athletes",
            "Enrollments",
            "Submissions",
            "Submission Assets",
            "Homework Completions",
            "Video Feedback",
            "Zoom Meetings",
            "Zoom Attendance",
            "Weekly Athlete Summary",
            "XP Events",
            "Streak Occurrences",
            "Athlete Achievement Unlocks",
            "Shot Milestones",
            "Perfect Week",
            "Weekly Threshold awards",
            "Level progression / gates",
            "Goal Met Date",
            "Email Handoff Queue (allowlist)",
        ],
        "email_verification": {
            "recipient_allowlist_only": True,
            "expect_daily_submission_emails": True,
            "expect_homework_feedback_when_graded": True,
            "expect_weekly_summary_arms": True,
            "expect_weekly_hub_after_stage": True,
            "verify_send_status_writeback": True,
            "no_send_during_preparation": True,
        },
        "authorization_phrase": "RUN 3-ATHLETE SEASON SIMULATION",
        "status": "READY — not executed",
    }


def build_sanitized_dry_run_artifact(payload: dict[str, Any]) -> dict[str, Any]:
    """Strip bulky/volatile fields for committed ``sc001-dry-run-latest.json``.

    Keeps expectation matrices and per-profile summaries only (offline fixture IDs).
    """
    scenarios_summary: dict[str, Any] = {}
    for profile, scenario in (payload.get("scenarios") or {}).items():
        if not isinstance(scenario, dict):
            continue
        scenarios_summary[profile] = {
            "profile": scenario.get("profile"),
            "meta": scenario.get("meta"),
            "intended_writes_summary": scenario.get("intended_writes_summary"),
        }
    return {
        "backlog_id": payload.get("backlog_id"),
        "run_id": payload.get("run_id"),
        "status": payload.get("status"),
        "executed": payload.get("executed"),
        "reference_meta": payload.get("reference_meta"),
        "expectations": payload.get("expectations"),
        "scenarios_summary": scenarios_summary,
        "sanitized": True,
        "note": (
            "Full day plans omitted. Regenerate with: "
            "python -m season_simulation dry-run-three --offline-fixture"
        ),
    }


def format_weekly_table_markdown(matrix: AthleteExpectationMatrix) -> str:
    lines = [
        f"### {matrix.athlete_name} (`{matrix.profile}`)",
        "",
        "| Week | Weekly shots | Goal est. | % | Thresholds | HW | Videos | Zoom | Perfect Week |",
        "|------|-------------:|----------:|--:|------------|----|-------:|------|--------------|",
    ]
    for r in matrix.weekly_rows:
        lines.append(
            f"| {r.week_label} | {r.weekly_total} | {r.weekly_goal_estimate} | "
            f"{r.goal_pct}% | {','.join(map(str, r.threshold_tiers)) or '—'} | "
            f"{r.homework_expected} | {r.video_count} | {r.zoom_state} | {r.perfect_week} |"
        )
    lines.extend(
        [
            "",
            f"- **Total planned shots:** {matrix.total_planned_shots}",
            f"- **Expected Perfect Weeks:** {matrix.expected_perfect_week_count}",
            f"- **Expected Goal Met Date:** {matrix.expected_goal_met_date}",
            f"- **Expected streak achievements (gate days):** {matrix.expected_streak_achievements}",
            f"- **Expected shot milestones:** {matrix.expected_shot_milestones}",
            f"- **Expected XP buckets:** `{matrix.expected_xp_by_category}`",
            f"- **Email handoffs:** `{matrix.expected_email_handoffs}`",
            "",
        ]
    )
    return "\n".join(lines)
