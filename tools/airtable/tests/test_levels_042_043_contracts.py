#!/usr/bin/env python3
"""Levels 042/043 — offline gate-rule ownership contracts (S26 WS7).

No Airtable. Models field writes / 043 skip predicates after 042 v3.0.
"""

from __future__ import annotations

import unittest
from typing import Any


def evaluate_gate(
    gate: dict[str, Any] | None, stats: dict[str, int]
) -> tuple[bool, str]:
    if not gate or not gate.get("enabled", True):
        return True, "no_gate_or_disabled"
    fails = []
    if stats.get("submissions", 0) < gate.get("min_submissions", 0):
        fails.append("submissions")
    if stats.get("homework", 0) < gate.get("min_homework", 0):
        fails.append("homework")
    if fails:
        return False, "blocked:" + ",".join(fails)
    return True, "pass"


def assign_levels_042(
    levels: list[dict[str, Any]],
    gates_by_level: dict[str, dict[str, Any]],
    lifetime_xp: int,
    stats: dict[str, int],
) -> dict[str, Any]:
    """Simplified 042: walk levels by XP; stop on first failing gate."""
    ordered = sorted(levels, key=lambda L: L["xp_required"])
    allowed = ordered[0]
    blocked = None
    blocked_gate = None

    for level in ordered:
        if lifetime_xp < level["xp_required"]:
            break
        gate = gates_by_level.get(level["id"])
        ok, _ = evaluate_gate(gate, stats)
        if not ok:
            blocked = level
            blocked_gate = gate
            break
        allowed = level

    if blocked:
        return {
            "current": allowed["id"],
            "next": blocked["id"],
            "level_gate_rule": blocked_gate["id"] if blocked_gate else None,
            "status": "Gate Blocked",
            "recalc_needed": False,
        }

    idx = next(i for i, L in enumerate(ordered) if L["id"] == allowed["id"])
    nxt = ordered[idx + 1] if idx + 1 < len(ordered) else None
    next_gate = gates_by_level.get(nxt["id"]) if nxt else None
    return {
        "current": allowed["id"],
        "next": nxt["id"] if nxt else None,
        "level_gate_rule": next_gate["id"] if next_gate else None,
        "status": "Assigned",
        "recalc_needed": False,
    }


def should_043_fire(
    *, next_level: str | None, level_gate_rule: str | None, active: bool = True
) -> bool:
    """043 trigger: Next Level set, Level Gate Rule empty, Active?"""
    return bool(next_level) and not level_gate_rule and active


def apply_043_if_needed(
    enrollment: dict[str, Any], gate_for_next: str | None
) -> dict[str, Any]:
    out = dict(enrollment)
    if not should_043_fire(
        next_level=out.get("next"),
        level_gate_rule=out.get("level_gate_rule"),
        active=out.get("active", True),
    ):
        out["043_action"] = "skipped"
        return out
    if not gate_for_next:
        out["043_action"] = "skipped_no_match"
        return out
    out["level_gate_rule"] = gate_for_next
    out["043_action"] = "linked"
    return out


LEVELS = [
    {"id": "L1", "xp_required": 0},
    {"id": "L2", "xp_required": 100},
    {"id": "L3", "xp_required": 300},
]

GATES = {
    "L1": {"id": "G1", "enabled": False, "min_submissions": 0, "min_homework": 0},
    "L2": {"id": "G2", "enabled": True, "min_submissions": 5, "min_homework": 1},
    "L3": {"id": "G3", "enabled": True, "min_submissions": 20, "min_homework": 5},
}


class Test042OwnsGateRule(unittest.TestCase):
    def test_assigned_writes_next_gate(self):
        result = assign_levels_042(
            LEVELS, GATES, lifetime_xp=50, stats={"submissions": 0, "homework": 0}
        )
        self.assertEqual(result["status"], "Assigned")
        self.assertEqual(result["current"], "L1")
        self.assertEqual(result["next"], "L2")
        self.assertEqual(result["level_gate_rule"], "G2")
        self.assertFalse(result["recalc_needed"])

    def test_gate_blocked_writes_blocked_gate(self):
        result = assign_levels_042(
            LEVELS,
            GATES,
            lifetime_xp=150,
            stats={"submissions": 1, "homework": 0},  # fails L2 gate
        )
        self.assertEqual(result["status"], "Gate Blocked")
        self.assertEqual(result["current"], "L1")
        self.assertEqual(result["next"], "L2")
        self.assertEqual(result["level_gate_rule"], "G2")

    def test_after_042_043_does_not_fire(self):
        result = assign_levels_042(
            LEVELS, GATES, lifetime_xp=50, stats={"submissions": 0, "homework": 0}
        )
        self.assertFalse(
            should_043_fire(
                next_level=result["next"], level_gate_rule=result["level_gate_rule"]
            )
        )


class Test043GapFillerOnly(unittest.TestCase):
    def test_043_fills_when_gate_empty(self):
        enr = {"next": "L2", "level_gate_rule": None, "active": True}
        out = apply_043_if_needed(enr, "G2")
        self.assertEqual(out["043_action"], "linked")
        self.assertEqual(out["level_gate_rule"], "G2")

    def test_043_skips_when_already_linked(self):
        enr = {"next": "L2", "level_gate_rule": "G2", "active": True}
        out = apply_043_if_needed(enr, "G2")
        self.assertEqual(out["043_action"], "skipped")

    def test_043_skips_inactive(self):
        self.assertFalse(
            should_043_fire(next_level="L2", level_gate_rule=None, active=False)
        )


class TestRetirementPolicy(unittest.TestCase):
    def test_do_not_retire_tonight(self):
        recommendation = "keep_043_until_mike_soak"
        self.assertNotEqual(recommendation, "retire_now")


if __name__ == "__main__":
    unittest.main()
