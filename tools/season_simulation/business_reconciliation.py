"""Business-success reconciliation gate for season simulation.

cascade_complete (submission XP settled) is necessary but not sufficient.
This stage compares expected vs actual XP buckets, level, Perfect Weeks,
streaks, duplicates, and pending reconciliation fields — and hard-fails.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import asdict, dataclass, field
from typing import Any, Sequence

from .expectations_matrix import AthleteExpectationMatrix

SAFE_ALLOWLIST = {
    "schmidt@fairfieldbasketballclub.com",
}

# Production XP amounts (aligned with rebuild_perfect_season_oracle / XP Reward Rules).
SHOOTING_BASE = 20
STREAK = {3: 10, 5: 15, 7: 20, 10: 30, 20: 50, 30: 60, 40: 75, 50: 90, 60: 105}
THRESH = {100: 10, 125: 20, 150: 30}
PW = 100
HW = 35
VIDEO = 25
ZOOM_BASE = 60
ZOOM_REC = 30
MILESTONES = [
    (3000, 10, "25%"),
    (6000, 15, "50%"),
    (9000, 20, "75%"),
    (12000, 30, "100%"),
    (14400, 40, "120%"),
    (18000, 50, "150%"),
    (21000, 65, "175%"),
    (24000, 80, "200%"),
]
LEVELS = [
    (0, "Beginner"),
    (200, "Rookie Shooter"),
    (400, "Developing Shooter"),
    (600, "Consistent Shooter"),
    (800, "Dangerous Shooter"),
    (1000, "Hot Hand"),
    (1200, "Deadeye"),
    (1400, "Sharpshooter"),
    (1600, "Pro"),
    (1800, "All-Star"),
    (2000, "Legend"),
    (2200, "G.O.A.T."),
]


def level_for(xp: int) -> str:
    cur = "Beginner"
    for thr, name in LEVELS:
        if xp >= thr:
            cur = name
    return cur


@dataclass
class BucketDiff:
    name: str
    expected: int
    actual: int
    ok: bool

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class BusinessReconciliationResult:
    profile: str
    pass_: bool
    expected_total_xp: int
    actual_total_xp: int
    expected_level: str
    actual_level: str
    bucket_diffs: list[dict[str, Any]] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        d["pass"] = d.pop("pass_")
        return d


def xp_points_from_event_buckets(buckets: dict[str, int]) -> dict[str, int]:
    """Convert expectation-matrix event counts into XP points."""
    streak_thresholds = list(STREAK.keys())
    streak_events = int(buckets.get("STREAK_XP") or 0)
    streak_xp = sum(STREAK[t] for t in streak_thresholds[:streak_events])
    milestone_n = int(buckets.get("SHOT_MILESTONE") or 0)
    milestone_xp = sum(xp for _, xp, _ in MILESTONES[:milestone_n])
    return {
        "Submission XP": int(buckets.get("SUBMISSION_XP") or 0) * SHOOTING_BASE,
        "Homework XP": int(buckets.get("HOMEWORK_XP") or 0) * HW,
        "Video XP": int(buckets.get("VIDEO_SUBMISSION") or 0) * VIDEO,
        "Streak XP": streak_xp,
        "Weekly Threshold XP": 0,
        "Perfect Week XP": int(buckets.get("PERFECT_WEEK") or 0) * PW,
        "Shot Milestone XP": milestone_xp,
        "Zoom XP": (
            int(buckets.get("ZOOM_ATTEND_BASE") or 0) * ZOOM_BASE
            + int(buckets.get("ZOOM_RECORDING_CREDIT") or 0) * ZOOM_REC
        ),
    }


def threshold_xp_from_awards(awards: Sequence[dict[str, Any]]) -> int:
    total = 0
    for a in awards:
        tier = int(a.get("tier") or 0)
        total += int(THRESH.get(tier) or 0)
    return total


def expected_points_from_matrix(matrix: AthleteExpectationMatrix) -> dict[str, int]:
    pts = xp_points_from_event_buckets(dict(matrix.expected_xp_by_category))
    pts["Weekly Threshold XP"] = threshold_xp_from_awards(
        matrix.expected_weekly_threshold_awards
    )
    pts["Streak XP"] = sum(
        STREAK[t] for t in matrix.expected_streak_achievements if t in STREAK
    )
    mil_map = {shot: xp for shot, xp, _ in MILESTONES}
    pts["Shot Milestone XP"] = sum(
        mil_map.get(s, 0) for s in matrix.expected_shot_milestones
    )
    return pts


def sum_points(pts: dict[str, int]) -> int:
    return int(sum(pts.values()))


def actual_xp_buckets_from_events(events: Sequence[dict[str, Any]]) -> dict[str, int]:
    """Sum XP Points by coarse bucket from live XP Event rows."""
    buckets = {
        "Submission XP": 0,
        "Homework XP": 0,
        "Video XP": 0,
        "Streak XP": 0,
        "Weekly Threshold XP": 0,
        "Perfect Week XP": 0,
        "Shot Milestone XP": 0,
        "Zoom XP": 0,
    }
    for ev in events:
        f = ev.get("fields") or ev
        key = str(f.get("Source Key") or "").upper()
        pts = f.get("XP Points")
        if pts is None:
            pts = f.get("Points")
        try:
            amount = int(float(pts or 0))
        except (TypeError, ValueError):
            amount = 0
        status = str(f.get("Status") or "").lower()
        if status in {"void", "inactive", "duplicate", "superseded"}:
            continue
        if f.get("Active?") is False:
            continue
        if key.startswith("SUBMISSION_XP") or ("SHOOTING" in key and "BASE" in key):
            buckets["Submission XP"] += amount
        elif key.startswith("HOMEWORK"):
            buckets["Homework XP"] += amount
        elif "VIDEO" in key:
            buckets["Video XP"] += amount
        elif key.startswith("STREAK") or "STREAK" in key:
            buckets["Streak XP"] += amount
        elif "WEEKLY_THRESHOLD" in key or "THRESHOLD" in key:
            buckets["Weekly Threshold XP"] += amount
        elif "PERFECT_WEEK" in key:
            buckets["Perfect Week XP"] += amount
        elif "MILESTONE" in key or "SHOT_MILESTONE" in key:
            buckets["Shot Milestone XP"] += amount
        elif "ZOOM" in key:
            buckets["Zoom XP"] += amount
    return buckets


def reconcile_business_success(
    *,
    profile: str,
    matrix: AthleteExpectationMatrix,
    actual_events: Sequence[dict[str, Any]],
    actual_lifetime_xp: int | None,
    actual_level: str | None,
    actual_perfect_week_count: int | None = None,
    duplicate_streak_keys: dict[str, int] | None = None,
    duplicate_xp_keys: dict[str, int] | None = None,
    pending_reconciliation_fields: Sequence[str] | None = None,
    level_gate_ok: bool | None = None,
    email_report: dict[str, Any] | None = None,
) -> BusinessReconciliationResult:
    expected_pts = expected_points_from_matrix(matrix)
    actual_pts = actual_xp_buckets_from_events(actual_events)
    expected_total = sum_points(expected_pts)
    actual_total = (
        int(actual_lifetime_xp)
        if actual_lifetime_xp is not None
        else sum_points(actual_pts)
    )
    expected_level = level_for(expected_total)
    actual_level_s = str(actual_level or "")

    diffs: list[BucketDiff] = []
    errors: list[str] = []
    notes: list[str] = []

    for name in expected_pts:
        exp = int(expected_pts[name])
        act = int(actual_pts.get(name) or 0)
        ok = exp == act
        diffs.append(BucketDiff(name=name, expected=exp, actual=act, ok=ok))
        if not ok:
            errors.append(f"{name}: expected {exp} actual {act}")

    if expected_total != actual_total:
        errors.append(f"total XP: expected {expected_total} actual {actual_total}")

    if actual_level_s and actual_level_s != expected_level:
        errors.append(f"level: expected {expected_level} actual {actual_level_s}")

    if actual_perfect_week_count is not None:
        if int(actual_perfect_week_count) != int(matrix.expected_perfect_week_count):
            errors.append(
                f"perfect_week_count: expected {matrix.expected_perfect_week_count} "
                f"actual {actual_perfect_week_count}"
            )

    for k, n in (duplicate_streak_keys or {}).items():
        if int(n) > 1:
            errors.append(f"duplicate_streak_occurrence_key:{k} count={n}")

    for k, n in (duplicate_xp_keys or {}).items():
        if int(n) > 1:
            errors.append(f"duplicate_xp_source_key:{k} count={n}")

    for pending in pending_reconciliation_fields or []:
        errors.append(f"pending_reconciliation:{pending}")

    if level_gate_ok is False:
        errors.append("level_gate_state: expected pass, actual blocked/fail")

    if email_report:
        unsafe = email_report.get("unsafe_recipients") or []
        if unsafe:
            errors.append(f"email_unsafe_recipients:{unsafe}")
        for addr, count in (email_report.get("recipients") or {}).items():
            if str(addr).lower() not in SAFE_ALLOWLIST:
                errors.append(f"email_non_allowlisted:{addr} count={count}")
        dup_keys = (
            email_report.get("duplicate_handoff_keys")
            or email_report.get("duplicate_dedupe_keys")
            or {}
        )
        for k, n in dup_keys.items():
            if int(n) > 1:
                errors.append(f"duplicate_handoff_key:{k} count={n}")
        needs_review = int((email_report.get("statuses") or {}).get("Needs Review") or 0)
        if needs_review:
            errors.append(
                f"email_needs_review_count={needs_review} "
                f"cause={email_report.get('needs_review_cause') or 'unspecified'}"
            )
        notes.append(
            "Weekly summary emails are intentionally excluded from execute-three "
            "unless an explicit weekly-email simulation stage is enabled "
            "(072/074 arming is separate from daily/HW/Welcome/Zoom)."
        )

    return BusinessReconciliationResult(
        profile=profile,
        pass_=not errors,
        expected_total_xp=expected_total,
        actual_total_xp=actual_total,
        expected_level=expected_level,
        actual_level=actual_level_s or "(unknown)",
        bucket_diffs=[d.to_dict() for d in diffs],
        errors=errors,
        notes=notes,
    )


def stage_e2_business_success_hook(
    *,
    profile: str,
    matrix: AthleteExpectationMatrix | None,
    cascade_complete: bool,
    actual_events: Sequence[dict[str, Any]] | None = None,
    actual_lifetime_xp: int | None = None,
    actual_level: str | None = None,
    actual_perfect_week_count: int | None = None,
    duplicate_streak_keys: dict[str, int] | None = None,
    duplicate_xp_keys: dict[str, int] | None = None,
    pending_reconciliation_fields: Sequence[str] | None = None,
    level_gate_ok: bool | None = None,
    email_report: dict[str, Any] | None = None,
    planned: bool = False,
) -> dict[str, Any]:
    """Final business-success gate. cascade_complete alone never yields PASS."""
    if planned or matrix is None:
        return {
            "stage": "E2_business_success",
            "profile": profile,
            "status": "planned",
            "complete": False,
            "pass": False,
            "cascade_complete": cascade_complete,
            "note": (
                "Business-success reconciliation runs on live execute only; "
                "cascade_complete is not sufficient for PASS"
            ),
        }
    result = reconcile_business_success(
        profile=profile,
        matrix=matrix,
        actual_events=actual_events or [],
        actual_lifetime_xp=actual_lifetime_xp,
        actual_level=actual_level,
        actual_perfect_week_count=actual_perfect_week_count,
        duplicate_streak_keys=duplicate_streak_keys,
        duplicate_xp_keys=duplicate_xp_keys,
        pending_reconciliation_fields=pending_reconciliation_fields,
        level_gate_ok=level_gate_ok,
        email_report=email_report,
    )
    payload = result.to_dict()
    payload["stage"] = "E2_business_success"
    payload["status"] = "ok" if result.pass_ else "failed"
    payload["complete"] = bool(result.pass_)
    payload["cascade_complete"] = cascade_complete
    if cascade_complete and not result.pass_:
        payload["errors"] = list(result.errors) + [
            "cascade_complete=true but business expectations failed"
        ]
    if not cascade_complete:
        payload["errors"] = list(payload.get("errors") or []) + [
            "cascade_complete=false"
        ]
        payload["pass"] = False
        payload["complete"] = False
        payload["status"] = "failed"
    return payload


def count_duplicate_keys(keys: Sequence[str]) -> dict[str, int]:
    c = Counter(k for k in keys if k)
    return {k: n for k, n in c.items() if n > 1}


__all__ = [
    "SAFE_ALLOWLIST",
    "BusinessReconciliationResult",
    "expected_points_from_matrix",
    "reconcile_business_success",
    "stage_e2_business_success_hook",
    "threshold_xp_from_awards",
    "xp_points_from_event_buckets",
    "count_duplicate_keys",
    "level_for",
    "LEVELS",
    "sum_points",
]
