"""Pure helpers safe for offline CI (no Airtable / third-party imports)."""

from __future__ import annotations

from typing import Any


def pick_highest_goal(goals: list[dict[str, Any]]) -> dict[str, Any] | None:
    """Deterministic highest Total Shot Target among active-like dicts."""
    pool = [
        g
        for g in goals
        if g.get("total_shot_target") is not None and g.get("active", True)
    ]
    if not pool:
        return None
    return max(pool, key=lambda g: int(g["total_shot_target"]))
