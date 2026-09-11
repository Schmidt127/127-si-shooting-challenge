"""Shared scenario types for SC-SEASON-SIM-001 (three-athlete) and SC-SEASON-SIM-002."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import date, timedelta
from enum import Enum
from typing import Any, Sequence

from .constants import SAFE_EMAIL_RECIPIENT, SIM_END, SIM_START
from .run_registry import run_marker
from .season_policy import week_label_for_activity_date
from .simulation_clock import (
    SubmissionTiming,
    assert_window_integrity,
    build_simulation_days,
    sunday_of,
)


class AthleteProfile(str, Enum):
    """SC-SEASON-SIM-001 disposable athlete profiles."""

    ATHLETE1_PERFECT = "athlete1_perfect"
    ATHLETE2_RECOVERY = "athlete2_recovery"
    ATHLETE3_EDGE = "athlete3_edge"
    # Historical SC-SEASON-SIM-002 single-athlete mixed path (do not reuse for SC-001 execute).
    ATHLETE1_SC002 = "athlete1_sc002"


HOMEWORK_WEEK_ORDER = ("Early Bird",) + tuple(f"Week {i}" for i in range(1, 9))


@dataclass(frozen=True)
class DayPlan:
    day_number: int
    activity_date: date
    action: str  # submit | miss
    shot_total: int
    timing: str  # same_day | backdated | missed
    write_on_day_number: int
    homework: tuple[dict[str, Any], ...] = ()
    video_feedback: bool = False
    video_count: int = 0  # qualifying videos created this day (0 or 1 typical)
    zoom_meeting_ids: tuple[str, ...] = ()
    zoom_modes: tuple[str, ...] = ()
    email_events: tuple[dict[str, Any], ...] = ()
    notes: str = ""
    dedupe_key: str = ""
    replay_probe: bool = False  # Athlete 3 idempotency exercises


@dataclass
class AthleteScenario:
    profile: str
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
            "profile": self.profile,
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


# Backward-compatible alias for SC-SEASON-SIM-002 imports.
Athlete1Scenario = AthleteScenario


def athlete_marker(run_id: str, profile: str) -> str:
    """Run marker scoped to one athlete within a combined three-athlete run."""
    base = run_marker(run_id)
    slug = profile.replace("athlete", "A").replace("_", "-").upper()
    if slug.startswith("A"):
        return f"{base}|{slug}"
    return f"{base}|{profile.upper()}"


def dedupe_key(run_id: str, profile: str, kind: str, day_number: int, extra: str = "") -> str:
    parts = [athlete_marker(run_id, profile), kind, f"D{day_number:02d}"]
    if extra:
        parts.append(extra)
    return "|".join(parts)


def default_cleanup_scope() -> list[str]:
    return [
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


def build_athlete_identity(
    *,
    profile: AthleteProfile,
    first_name: str,
    last_name: str,
    grade: str,
) -> dict[str, Any]:
    return {
        "display_name": f"{first_name} {last_name}",
        "first_name": first_name,
        "last_name": last_name,
        "grade": grade,
        "parent_email": SAFE_EMAIL_RECIPIENT,
        "active": True,
        "profile": profile.value,
    }


def simulation_days() -> list[Any]:
    return assert_window_integrity(build_simulation_days(SIM_START, SIM_END))


def compute_goal_met_crossing(
    scenario: AthleteScenario,
) -> tuple[str | None, int | None, int | None, int]:
    """Return (activity_date_iso, day_number, shots_before, cumulative_on_date) at first ≥ goal."""
    goal = int(scenario.goal_total_shots or 0)
    if goal <= 0:
        return None, None, None, 0

    cumulative = 0
    ordered = sorted(
        (d for d in scenario.days if d.action == "submit"),
        key=lambda p: (p.activity_date, p.day_number),
    )
    for plan in ordered:
        prev = cumulative
        cumulative += plan.shot_total
        if prev < goal <= cumulative:
            return (
                plan.activity_date.isoformat(),
                plan.day_number,
                prev,
                cumulative,
            )
    return None, None, None, cumulative


def weekly_threshold_tiers(ratio: float) -> list[int]:
    """Return 100/125/150 tiers met at given goal-completion ratio."""
    tiers: list[int] = []
    if ratio >= 1.0:
        tiers.append(100)
    if ratio >= 1.25:
        tiers.append(125)
    if ratio >= 1.5:
        tiers.append(150)
    return tiers


def estimate_weekly_goal_shots(
    season_goal: int,
    week_label: str,
    *,
    days_meta: Sequence[Any] | None = None,
) -> int:
    """Offline weekly target estimate — live WAS uses Goal Record + Weeks."""
    days_meta = days_meta or simulation_days()
    week_days = [
        d for d in days_meta if week_label_for_activity_date(d.activity_date) == week_label
    ]
    if not week_days:
        return max(1, season_goal // 10)
    share = len(week_days) / len(days_meta)
    return max(1, round(season_goal * share))


def aggregate_weekly_shots(days: Sequence[DayPlan]) -> dict[str, dict[str, Any]]:
    """Group submit/miss days by challenge week label."""
    out: dict[str, dict[str, Any]] = {}
    for plan in days:
        label = week_label_for_activity_date(plan.activity_date)
        bucket = out.setdefault(
            label,
            {
                "week_label": label,
                "submit_days": 0,
                "miss_days": 0,
                "weekly_shots": 0,
                "video_days": 0,
                "video_count": 0,
                "homework_items": 0,
                "live_zoom": 0,
                "recorded_zoom": 0,
                "daily_shots": [],
            },
        )
        if plan.action == "submit":
            bucket["submit_days"] += 1
            bucket["weekly_shots"] += plan.shot_total
            bucket["daily_shots"].append(plan.shot_total)
            if plan.video_feedback or plan.video_count:
                bucket["video_days"] += 1
                bucket["video_count"] += max(1, plan.video_count)
            bucket["homework_items"] += len(plan.homework)
            for mode in plan.zoom_modes:
                if mode == "live":
                    bucket["live_zoom"] += 1
                elif mode == "recording":
                    bucket["recorded_zoom"] += 1
        else:
            bucket["miss_days"] += 1
    return out


def summarize_scenario(days: Sequence[DayPlan], *, profile: str) -> dict[str, int]:
    submit_days = sum(1 for d in days if d.action == "submit")
    return {
        "simulation_days": len(days),
        "submit_days": submit_days,
        "miss_days": sum(1 for d in days if d.action == "miss"),
        "total_planned_shots": sum(d.shot_total for d in days if d.action == "submit"),
        "homework_completions": sum(len(d.homework) for d in days),
        "video_feedback_days": sum(
            1 for d in days if d.video_feedback or d.video_count > 0
        ),
        "zoom_attendance_events": sum(1 for d in days if d.zoom_meeting_ids),
        "same_day_submissions": sum(
            1 for d in days if d.timing == SubmissionTiming.SAME_DAY.value
        ),
        "backdated_submissions": sum(
            1 for d in days if d.timing == SubmissionTiming.BACKDATED.value
        ),
        "replay_probes": sum(1 for d in days if d.replay_probe),
        "profile": profile,
    }


def saturday_email_events(run_id: str, days_meta: Sequence[Any]) -> list[dict[str, Any]]:
    """SC-168: Build Weekly arms only; WEEKLY Hub needs weekly-email-stage."""
    events: list[dict[str, Any]] = []
    for meta in days_meta:
        if meta.activity_date.weekday() == 5:
            events.append(
                {
                    "event_type": "WEEKLY_ATHLETE_SUMMARY",
                    "day_number": meta.day_number,
                    "week_sunday": sunday_of(meta.activity_date).isoformat(),
                    "recipient": SAFE_EMAIL_RECIPIENT,
                    "send": False,
                    "expected_from_execute_alone": False,
                    "requires_weekly_email_stage": True,
                }
            )
    return events


def default_zoom_placeholders() -> list[dict[str, Any]]:
    return [
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


def write_day_from_template(
    *,
    meta: Any,
    run_id: str,
    profile: str,
    action: str,
    shot_total: int,
    timing: str,
    write_on: int,
    homework: list[dict[str, Any]] | None = None,
    video_feedback: bool = False,
    video_count: int = 0,
    zoom_ids: list[str] | None = None,
    zoom_modes: list[str] | None = None,
    notes: str = "",
    replay_probe: bool = False,
) -> DayPlan:
    marker = athlete_marker(run_id, profile)
    n = meta.day_number
    emails: list[dict[str, Any]] = []
    if action == "submit":
        emails.append(
            {
                "event_type": "DAILY_SUBMISSION",
                "day_number": n,
                "recipient": SAFE_EMAIL_RECIPIENT,
                "send": False,
            }
        )
        if video_feedback:
            emails.append(
                {
                    "event_type": "VIDEO_FEEDBACK",
                    "day_number": n,
                    "recipient": SAFE_EMAIL_RECIPIENT,
                    "send": False,
                    "expected_from_execute_alone": True,
                    "requires_parent_feedback_ready": True,
                }
            )
    kind = "SUB" if action == "submit" else "MISS"
    return DayPlan(
        day_number=n,
        activity_date=meta.activity_date,
        action=action,
        shot_total=shot_total if action == "submit" else 0,
        timing=timing,
        write_on_day_number=write_on,
        homework=tuple(homework or []),
        video_feedback=video_feedback,
        video_count=video_count if action == "submit" else 0,
        zoom_meeting_ids=tuple(zoom_ids or []),
        zoom_modes=tuple(zoom_modes or []),
        email_events=tuple(emails),
        notes=notes or marker,
        dedupe_key=dedupe_key(run_id, profile, kind, n),
        replay_probe=replay_probe,
    )


def backdate_write_day(
    activity_day: int,
    write_day: int,
    days_by_number: dict[int, Any],
) -> int:
    """Return write_on day number for backdated activity."""
    return write_day if activity_day in days_by_number else activity_day
