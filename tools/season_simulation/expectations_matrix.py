"""Deterministic expected-outcome matrices for SC-SEASON-SIM-001.

Build weekly tables, XP buckets, Perfect Week counts, streak/milestone
expectations **before** live execute. Live verification compares against these.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Sequence

from .constants import DEFAULT_SHOT_MILESTONES_912, DEFAULT_STREAK_GATE_THRESHOLDS
from .expectations_achievements import (
    ShotMilestoneDef,
    build_achievement_expectation,
    select_crossed_shot_milestones,
)
from .scenario_base import (
    AthleteScenario,
    aggregate_weekly_shots,
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
            "expected_email_handoffs": self.expected_email_handoffs,
            "notes": self.notes,
        }


def _milestone_defs(grade_band_id: str = "recSIMGB912") -> list[ShotMilestoneDef]:
    return [
        ShotMilestoneDef(f"recSIMMS{i}", count, pts, label, True, grade_band_id, "9-12")
        for i, (count, pts, label) in enumerate(DEFAULT_SHOT_MILESTONES_912)
    ]


def _streaks_from_submit_days(submit_day_numbers: Sequence[int]) -> list[int]:
    """Gate-eligible streak thresholds crossed by longest contiguous runs."""
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
    return [t for t in DEFAULT_STREAK_GATE_THRESHOLDS if best >= t]


def _homework_summary(scenario: AthleteScenario, week_label: str) -> tuple[str, str]:
    items: list[dict[str, Any]] = []
    for d in scenario.days:
        if week_label_for_activity_date(d.activity_date) != week_label:
            continue
        items.extend(d.homework)
    if not items:
        if week_label == "Week 9":
            return "none", "n/a"
        if scenario.profile == "athlete2_recovery" and week_label in {"Week 2", "Week 5"}:
            return "skipped", "skipped"
        return "none", "n/a"
    outcomes = {str(i.get("outcome") or "") for i in items}
    timing = str(items[0].get("timing_note") or items[0].get("late_status") or "on_time")
    if "Needs Revision" in outcomes:
        return "needs_revision_then_fix", timing
    if any(i.get("late_status") == "late_ineligible" for i in items):
        return "late_satisfactory", timing
    return "complete_satisfactory", timing


def _perfect_week_expectation(
    scenario: AthleteScenario,
    week_label: str,
    *,
    weekly_total: int,
    goal_est: int,
    video_count: int,
    homework: str,
    zoom_state: str,
    submit_days: int,
    miss_days: int,
) -> str:
    profile = scenario.profile
    ratio = weekly_total / goal_est if goal_est else 0

    if profile == "athlete1_perfect":
        if week_label == "Week 9" and submit_days < 7:
            return "pass_partial_window"
        if video_count >= 3 and homework.startswith("complete") and "live" in zoom_state:
            return "pass"
        if week_label == "Early Bird":
            return "pass" if video_count >= 1 and homework.startswith("complete") else "fail_video"
        return "pass" if video_count >= 3 else "fail_video"

    if profile == "athlete2_recovery":
        if week_label == "Week 3":
            return "fail_no_video"
        if week_label == "Week 4":
            return "fail_missed_zoom"
        if week_label in {"Week 2", "Week 5"}:
            return "fail_homework_skipped"
        if week_label == "Week 7" and video_count >= 3 and ratio >= 1.0:
            return "pass_recovery"
        if ratio < 1.0:
            return "fail_weekly_shots"
        return "fail_mixed"

    # athlete3_edge
    failures = {
        "Week 2": "fail_daily_shooting",
        "Week 3": "fail_video_count",
        "Week 5": "fail_homework_timing",
        "Week 4": "fail_required_zoom",
        "Week 6": "pass",
        "Week 8": "fail_single_requirement",
    }
    return failures.get(week_label, "fail_mixed" if miss_days else "pass")


def build_athlete_expectation_matrix(scenario: AthleteScenario) -> AthleteExpectationMatrix:
    weekly_agg = aggregate_weekly_shots(scenario.days)
    submit_nums = [d.day_number for d in scenario.days if d.action == "submit"]
    streaks = _streaks_from_submit_days(submit_nums)
    milestones = _milestone_defs(scenario.grade_band_id or "recSIMGB912")
    total_shots = sum(d.shot_total for d in scenario.days if d.action == "submit")
    crossed = select_crossed_shot_milestones(
        milestones,
        total_shots=total_shots,
        grade_band_id=scenario.grade_band_id or "recSIMGB912",
        grade_band_name="9-12",
    )

    rows: list[WeeklyExpectationRow] = []
    threshold_awards: list[dict[str, Any]] = []
    pw_pass = 0
    running_shots = 0
    milestone_labels: list[str] = []

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
        milestone_labels.extend(week_crossings)

        hw_expected, hw_timing = _homework_summary(scenario, label)
        live_z = int(bucket.get("live_zoom") or 0)
        rec_z = int(bucket.get("recorded_zoom") or 0)
        zoom_state = (
            "live+recorded" if live_z and rec_z else ("live" if live_z else ("recorded" if rec_z else "none"))
        )

        pw = _perfect_week_expectation(
            scenario,
            label,
            weekly_total=weekly_total,
            goal_est=goal_est,
            video_count=int(bucket.get("video_count") or 0),
            homework=hw_expected,
            zoom_state=zoom_state,
            submit_days=int(bucket.get("submit_days") or 0),
            miss_days=int(bucket.get("miss_days") or 0),
        )
        if pw.startswith("pass"):
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
                streak_state=f"longest_run≥{max(streaks) if streaks else 0}",
                milestone_crossings=week_crossings,
                perfect_week=pw,
                xp_categories=sorted(set(xp_cats)),
            )
        )

    xp_by_cat = _estimate_xp_buckets(scenario, threshold_awards, crossed, streaks)

    level_notes = {
        "athlete1_perfect": "Maximum realistic level progression — all gates satisfied",
        "athlete2_recovery": "Slower progression — streak/homework gates delay level ups",
        "athlete3_edge": "Mixed progression — partial gate satisfaction",
    }
    goal_met = {
        "athlete1_perfect": "During final week (total ≥ season goal)",
        "athlete2_recovery": "Late season if cumulative shots reach goal",
        "athlete3_edge": "May not reach season goal — edge-case volume",
    }

    return AthleteExpectationMatrix(
        profile=scenario.profile,
        athlete_name=str(scenario.athlete.get("display_name") or ""),
        season_goal=scenario.goal_total_shots,
        total_planned_shots=total_shots,
        submit_days=sum(1 for d in scenario.days if d.action == "submit"),
        miss_days=sum(1 for d in scenario.days if d.action == "miss"),
        weekly_rows=rows,
        expected_perfect_week_count=pw_pass,
        expected_streak_achievements=streaks,
        expected_shot_milestones=[m.shot_count for m in crossed],
        expected_weekly_threshold_awards=threshold_awards,
        expected_xp_by_category=xp_by_cat,
        expected_level_note=level_notes.get(scenario.profile, ""),
        expected_goal_met_date=goal_met.get(scenario.profile, "TBD at execute"),
        expected_email_handoffs={
            "daily_submission": sum(1 for d in scenario.days if d.action == "submit"),
            "weekly_build_arms": sum(
                1
                for d in build_simulation_days()
                if d.activity_date.weekday() == 5
            ),
            "weekly_hub_handoffs_after_stage": 1,
            "recipient": "schmidt@fairfieldbasketballclub.com only",
        },
        notes=list(scenario.gate_notes),
    )


def _estimate_xp_buckets(
    scenario: AthleteScenario,
    threshold_awards: list[dict[str, Any]],
    crossed: Sequence[Any],
    streaks: Sequence[int],
) -> dict[str, int]:
    """Offline lower-bound XP category counts (not dollar amounts)."""
    subs = sum(1 for d in scenario.days if d.action == "submit")
    videos = sum(
        max(1, d.video_count) if (d.video_feedback or d.video_count) else 0
        for d in scenario.days
        if d.action == "submit"
    )
    hw = sum(len(d.homework) for d in scenario.days)
    profile = scenario.profile
    streak_xp = len(streaks) if profile != "athlete2_recovery" else max(0, len(streaks) - 2)
    return {
        "SUBMISSION_XP": subs + (1 if profile == "athlete3_edge" else 0),
        "WEEKLY_THRESHOLD": len(threshold_awards),
        "HOMEWORK_XP": hw if profile != "athlete2_recovery" else max(0, hw - 4),
        "VIDEO_SUBMISSION": videos,
        "STREAK_XP": streak_xp,
        "SHOT_MILESTONE": len(crossed) if profile == "athlete1_perfect" else min(len(crossed), 3),
        "ZOOM_ATTEND_BASE": 1 if profile != "athlete2_recovery" else 1,
        "ZOOM_RECORDING_CREDIT": 1,
        "PERFECT_WEEK": (
            10
            if profile == "athlete1_perfect"
            else (1 if profile == "athlete2_recovery" else 1)
        ),
    }


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
        "authorization_phrase": "RUN 3-ATHLETE SEASON SIMULATION",
        "status": "READY — not executed",
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
            f"- **Expected streak achievements (gate days):** {matrix.expected_streak_achievements}",
            f"- **Expected shot milestones:** {matrix.expected_shot_milestones}",
            f"- **Expected XP buckets:** `{matrix.expected_xp_by_category}`",
            "",
        ]
    )
    return "\n".join(lines)
