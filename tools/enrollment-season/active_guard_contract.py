#!/usr/bin/env python3
"""
Enrollment Active? / PPE guard contract helpers (read-only documentation support).

Does not edit automation scripts. Encodes repository-evidenced expectations and
Foundation Reset direction for Schmidt (Active?=true, publicly visible, no new
exclusion field / do not invent standings exclusion in this package).
"""

from __future__ import annotations

from typing import Any, Optional

SCHMIDT_ENROLLMENT_ID = "recgP9qZYjAhE7NXm"
SCHMIDT_ATHLETE_ID = "recgqVstObQRzgXJF"

# Repo-evidenced consumers (documentation only). Owner agents recommended.
ACTIVE_CONSUMERS = [
    {
        "consumer": "023",
        "guard": "Active?",
        "whenActive": "May auto-link Submission → Enrollment for athlete",
        "whenInactive": "Will not auto-link; may clear bad inactive link",
        "riskIfMissing": "Wrong-season or withdrawn enrollment linked to submissions",
        "evidence": "023 docblock + close-out C-010 notes",
        "recommendedOwnerAgent": "submission-intake",
    },
    {
        "consumer": "010",
        "guard": "Progress Processing Enabled? (spec) / Active? gap historically",
        "whenActive": "Awards submission XP when counted path ready",
        "whenInactive": "Spec: skip only when PPE false; Active?-only would block Schmidt if false",
        "riskIfMissing": "Withdrawn athletes keep earning XP",
        "evidence": "C010_ACTIVE_GUARDS_DEV_INSTALL.md; ENROLLMENT_ACTIVE_GUARD_COVERAGE.gaps",
        "recommendedOwnerAgent": "xp-pipeline",
    },
    {
        "consumer": "031",
        "guard": "Progress Processing Enabled? (spec) / gap historically",
        "whenActive": "Create/link Weekly Athlete Summary",
        "whenInactive": "Skip WAS create when PPE false",
        "riskIfMissing": "WAS rows for withdrawn enrollments",
        "evidence": "C-010 packet; coverage gaps list",
        "recommendedOwnerAgent": "weekly-summary",
    },
    {
        "consumer": "053",
        "guard": "Progress Processing Enabled? (spec) / gap historically",
        "whenActive": "Rebuild streak occurrences",
        "whenInactive": "Skip streak rebuild when PPE false",
        "riskIfMissing": "Streaks continue for withdrawn athletes",
        "evidence": "C-010 packet",
        "recommendedOwnerAgent": "xp-pipeline",
    },
    {
        "consumer": "056",
        "guard": "Active?",
        "whenActive": "Refresh current shooting streaks",
        "whenInactive": "Skip inactive enrollments",
        "riskIfMissing": "Streak refresh for inactive enrollments",
        "evidence": "056 CONFIG.active; C-010 inventory",
        "recommendedOwnerAgent": "xp-pipeline",
    },
    {
        "consumer": "065",
        "guard": "Progress Processing Enabled? (spec) / gap historically",
        "whenActive": "Create homework XP",
        "whenInactive": "Skip; leave Award Status Pending",
        "riskIfMissing": "Homework XP for withdrawn athletes",
        "evidence": "C-010 packet; coverage gaps",
        "recommendedOwnerAgent": "homework",
    },
    {
        "consumer": "066",
        "guard": "Active?",
        "whenActive": "Create shot milestone unlocks",
        "whenInactive": "skipped_inactive",
        "riskIfMissing": "Milestones for inactive enrollments",
        "evidence": "066 docblock Active? check",
        "recommendedOwnerAgent": "achievements",
    },
    {
        "consumer": "072",
        "guard": "Active? + hardcoded Schmidt exclude (repo)",
        "whenActive": "Build weekly summary email package",
        "whenInactive": "skipped_inactive; clear Build Now?",
        "riskIfMissing": "Emails to inactive/withdrawn; Schmidt hard-exclude conflicts with Foundation Reset Active?=true email testing",
        "evidence": "072 v3.8; v2-engine-contracts evaluateCommsProcessingGuard",
        "recommendedOwnerAgent": "email-comms",
    },
    {
        "consumer": "076",
        "guard": "Active? field referenced; historical gap vs skip behavior",
        "whenActive": "Build daily submission email package",
        "whenInactive": "Documented gap — may still build if already linked",
        "riskIfMissing": "Daily emails for inactive enrollments",
        "evidence": "C-010 gaps; 076 CONFIG.active",
        "recommendedOwnerAgent": "email-comms",
    },
    {
        "consumer": "101",
        "guard": "Active?",
        "whenActive": "Award Zoom meeting XP to attendees",
        "whenInactive": "Skip inactive enrollment attendees",
        "riskIfMissing": "Zoom XP for inactive enrollments",
        "evidence": "101 Active? checks",
        "recommendedOwnerAgent": "zoom",
    },
    {
        "consumer": "114",
        "guard": "Active? (Video Feedback / enrollment path)",
        "whenActive": "Create/update video XP",
        "whenInactive": "skipped_inactive",
        "riskIfMissing": "Video XP while inactive",
        "evidence": "114 skipped_inactive path",
        "recommendedOwnerAgent": "video",
    },
    {
        "consumer": "118",
        "guard": "Active? + Schmidt hard exclude",
        "whenActive": "Ensure WAS exists for Active enrollments",
        "whenInactive": "Exclude inactive and Schmidt ID",
        "riskIfMissing": "Mass WAS create for wrong cohort; Schmidt excluded from auto-build",
        "evidence": "118 docblock",
        "recommendedOwnerAgent": "weekly-summary",
    },
    {
        "consumer": "119",
        "guard": "Active? + Schmidt hard exclude",
        "whenActive": "Arm Send to Make? for Active non-Schmidt",
        "whenInactive": "Skip inactive / Schmidt",
        "riskIfMissing": "Mass email arming",
        "evidence": "119 docblock",
        "recommendedOwnerAgent": "email-comms",
    },
    {
        "consumer": "web-leaderboard",
        "guard": "Web - Leaderboard view filter and/or Active? fallback",
        "whenActive": "Enrollment eligible for public standings queries",
        "whenInactive": "Hidden from Active?-based fallback queries",
        "riskIfMissing": "Public standings show withdrawn athletes",
        "evidence": "CRITICAL-PATH-FIELD-OWNERSHIP-MATRIX; foundation-reset evidence",
        "recommendedOwnerAgent": "website",
    },
]


def field_enabled(value: Any, *, field_exists: bool, missing_fallback: bool = True) -> bool:
    if not field_exists:
        return missing_fallback
    return bool(value)


def should_run_progress(*, ppe_value: Any, ppe_field_exists: bool) -> bool:
    return field_enabled(ppe_value, field_exists=ppe_field_exists, missing_fallback=True)


def should_run_comms_foundation_reset(
    *,
    active_value: Any,
    active_field_exists: bool,
    enrollment_id: str,
    apply_schmidt_hard_exclude: bool = False,
) -> dict[str, Any]:
    """
    Foundation Reset / Online Agent 7 direction:
      - Schmidt remains Active?=true
      - Schmidt remains publicly visible
      - Do not create a new Schmidt exclusion rule in this package
      - Existing repo hard-exclude in 072/118/119 is documented as a conflict/gap
    """
    if apply_schmidt_hard_exclude and enrollment_id == SCHMIDT_ENROLLMENT_ID:
        return {
            "allow": False,
            "reason": "schmidt_hard_exclude_legacy",
            "actionOut": "skipped_inactive",
            "directionConflict": True,
        }

    if active_field_exists and not field_enabled(
        active_value, field_exists=True, missing_fallback=True
    ):
        return {
            "allow": False,
            "reason": "enrollment_inactive",
            "actionOut": "skipped_inactive",
            "directionConflict": False,
        }

    return {
        "allow": True,
        "reason": "comms_allowed",
        "actionOut": "continue",
        "directionConflict": False,
    }


def schmidt_expected_state() -> dict[str, Any]:
    return {
        "athleteId": SCHMIDT_ATHLETE_ID,
        "enrollmentId": SCHMIDT_ENROLLMENT_ID,
        "active": True,
        "publiclyVisible": True,
        "createExclusionRule": False,
        "processingEligible": True,
        "emailTesting": "controlled Schmidt contacts only — do not send to real families",
        "legacyHardExcludeScripts": ["072", "118", "119", "v2-engine-contracts.evaluateCommsProcessingGuard"],
        "legacyHardExcludeStatus": "CONFLICT_WITH_FOUNDATION_RESET — document only; do not edit those scripts in this package",
    }


def audit_consumers() -> list[dict[str, Any]]:
    return list(ACTIVE_CONSUMERS)


__all__ = [
    "ACTIVE_CONSUMERS",
    "SCHMIDT_ATHLETE_ID",
    "SCHMIDT_ENROLLMENT_ID",
    "audit_consumers",
    "field_enabled",
    "schmidt_expected_state",
    "should_run_comms_foundation_reset",
    "should_run_progress",
]
