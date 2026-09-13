"""Authoritative business reconciliation expectations for SC-SEASON-SIM-001 profiles.

Values for athlete1_perfect match the Production final-run evidence
(SEASON-SIM-2027-20260913T010724Z-threeathlete) — 4910 XP oracle used at execute time.
"""

from __future__ import annotations

from typing import Any

from .constants import DEFAULT_STREAK_XP_THRESHOLDS

# Production run evidence (67-day window, 18 PHA, 10 Perfect Weeks).
PERFECT_BUSINESS_EXPECTATIONS: dict[str, Any] = {
    "total_xp": 4910,
    "perfect_weeks": 10,
    "public_level": "G.O.A.T.",
    "buckets": {
        "Submission XP": 1340,
        "Homework XP": 630,
        "Video XP": 750,
        "Streak XP": 455,
        "Weekly Threshold XP": 480,
        "Perfect Week XP": 1000,
        "Shot Milestone XP": 165,
        "Zoom XP": 90,
    },
    "streak_thresholds": list(DEFAULT_STREAK_XP_THRESHOLDS),
    "weekly_threshold_event_count": 26,
    "homework_completion_count": 18,
    "minimum_effective_zoom_gate_meetings": 2,
    "minimum_longest_streak_days": 60,
}

RECOVERY_BUSINESS_EXPECTATIONS: dict[str, Any] = {
    "total_xp": 2305,
    "perfect_weeks": 1,
    "public_level": None,  # gate-limited; reconciled at E2 from live Enrollment
    "buckets": {},  # bucket oracle verified at dry-run / execute report
}

EDGE_BUSINESS_EXPECTATIONS: dict[str, Any] = {
    "total_xp": 3620,
    "perfect_weeks": 5,
    "public_level": None,  # 45-day gate blocks higher level
    "minimum_longest_streak_days": 40,
    "buckets": {},
}

PROFILE_BUSINESS_EXPECTATIONS: dict[str, dict[str, Any]] = {
    "athlete1_perfect": PERFECT_BUSINESS_EXPECTATIONS,
    "athlete2_recovery": RECOVERY_BUSINESS_EXPECTATIONS,
    "athlete3_edge": EDGE_BUSINESS_EXPECTATIONS,
}


def expectations_for_profile(profile: str) -> dict[str, Any] | None:
    return PROFILE_BUSINESS_EXPECTATIONS.get(profile)
