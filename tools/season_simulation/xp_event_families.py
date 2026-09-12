"""Map live XP Reward Rules Rule Keys to season-sim event families.

Does not invent XP amounts or rules — only classifies known Production keys
and cascade-only sources that are awarded outside the XP Reward Rules table.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Sequence


# Source Key prefixes written by automations (not always identical to Rule Key).
CASCADE_ONLY_SOURCE_FAMILIES: dict[str, str] = {
    "SUBMISSION_XP": "SHOOTING_BASE via Automation 010 (Source Key SUBMISSION_XP|{submissionId})",
    "HOMEWORK_XP": "HOMEWORK_COMPLETION via Automations 064/065 (Source Key HOMEWORK_XP|{hcId})",
    "ZOOM_RECORDING_CREDIT": "Config recording percent via Automation 101 (not an XP Reward Rules row)",
    "SHOT_MILESTONE": "Achievements / Automation 066→059 (not an XP Reward Rules row)",
    "LEVEL_PROGRESSION": "Enrollment level recalc from cumulative XP (not an XP Reward Rules row)",
}


@dataclass(frozen=True)
class XpFamilyCoverage:
    rule_key: str
    family: str
    active: bool
    notes: str = ""


def classify_rule_key(rule_key: str) -> str:
    """Return a stable event-family label for a Production Rule Key."""
    key = (rule_key or "").strip()
    if not key:
        return "UNKNOWN"
    if key == "SHOOTING_BASE":
        return "SUBMISSION_BASE"
    if key == "HOMEWORK_COMPLETION":
        return "HOMEWORK_COMPLETION"
    if key == "VIDEO_SUBMISSION":
        return "VIDEO_SUBMISSION"
    if key == "PERFECT_WEEK":
        return "PERFECT_WEEK"
    if key.startswith("STREAK_"):
        return "STREAK"
    if key.startswith("WEEKLY_THRESHOLD_"):
        return "WEEKLY_THRESHOLD"
    if key.startswith("ZOOM_ATTEND"):
        return "ZOOM_ATTENDANCE"
    return "OTHER"


def required_families_for_sc002() -> frozenset[str]:
    """Event families Athlete 1 season sim must be able to exercise."""
    return frozenset(
        {
            "SUBMISSION_BASE",
            "HOMEWORK_COMPLETION",
            "VIDEO_SUBMISSION",
            "STREAK",
            "WEEKLY_THRESHOLD",
            "PERFECT_WEEK",
            "ZOOM_ATTENDANCE",
            # Cascade-only (documented; not Reward Rules rows):
            "ZOOM_RECORDING_CREDIT",
            "SHOT_MILESTONE",
            "LEVEL_PROGRESSION",
        }
    )


def coverage_from_reward_rules(
    rules: Sequence[dict],
) -> list[XpFamilyCoverage]:
    """Build coverage rows from XP Reward Rules list payloads.

    Each rule dict should include at least ``Rule Key`` / ``rule_key`` and
    optionally ``Active?`` / ``active``.
    """
    out: list[XpFamilyCoverage] = []
    for row in rules:
        key = str(row.get("Rule Key") or row.get("rule_key") or "").strip()
        if not key:
            continue
        active = bool(row.get("Active?", row.get("active", True)))
        family = classify_rule_key(key)
        out.append(XpFamilyCoverage(rule_key=key, family=family, active=active))
    return out


def active_families_from_rules(rules: Sequence[dict]) -> set[str]:
    return {
        c.family
        for c in coverage_from_reward_rules(rules)
        if c.active and c.family != "OTHER"
    }


def sc002_family_gaps(rules: Sequence[dict]) -> dict[str, object]:
    """Compare live Reward Rules + cascade-only families to SC-002 requirements."""
    from_rules = active_families_from_rules(rules)
    cascade = set(CASCADE_ONLY_SOURCE_FAMILIES)
    present = from_rules | cascade
    required = required_families_for_sc002()
    missing = sorted(required - present)
    covered_from_rules = sorted(required & from_rules)
    covered_cascade = sorted(required & cascade)
    return {
        "required": sorted(required),
        "from_reward_rules": sorted(from_rules),
        "cascade_only": sorted(cascade),
        "covered_from_rules": covered_from_rules,
        "covered_cascade_only": covered_cascade,
        "missing": missing,
        "complete": not missing,
    }


def assert_sc002_xp_families_complete(rules: Iterable[dict]) -> None:
    report = sc002_family_gaps(list(rules))
    if not report["complete"]:
        raise AssertionError(
            "SC-002 XP event families incomplete vs live Reward Rules + cascade map: "
            + ", ".join(report["missing"])  # type: ignore[arg-type]
        )
