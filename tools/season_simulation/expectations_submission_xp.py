"""SC-167 — Submission XP duplicate expectation helpers for season simulation.

Identifies duplicate SUBMISSION_XP|{submissionId} Source Keys without deleting
rows. Used by reconcile / closeout reporting.
"""

from __future__ import annotations

from collections import defaultdict
from typing import Any


SUBMISSION_XP_PREFIX = "SUBMISSION_XP|"


def find_submission_xp_duplicate_groups(
    rows: list[dict[str, Any]],
) -> dict[str, Any]:
    """Group XP Event rows by SUBMISSION_XP Source Key.

    Each input row should include at least: id, source_key, and optionally active.
    """
    by_key: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        key = str(row.get("source_key") or row.get("Source Key") or "").strip()
        if not key.startswith(SUBMISSION_XP_PREFIX):
            continue
        by_key[key].append(
            {
                "id": row.get("id") or row.get("record_id"),
                "active": row.get("active", row.get("Active?")),
                "source_key": key,
            }
        )

    duplicates = []
    for source_key, group in sorted(by_key.items()):
        if len(group) < 2:
            continue
        active_ids = [g["id"] for g in group if g["active"] is True]
        duplicates.append(
            {
                "source_key": source_key,
                "count": len(group),
                "ids": [g["id"] for g in group],
                "active_ids": active_ids,
                "multiple_active": len(active_ids) > 1,
                "award_bearing_duplicate": len(active_ids) > 1,
            }
        )

    return {
        "total_rows": sum(len(g) for g in by_key.values()),
        "unique_keys": len(by_key),
        "duplicate_groups": duplicates,
        "has_duplicates": bool(duplicates),
        "has_award_bearing_duplicates": any(d["award_bearing_duplicate"] for d in duplicates),
    }


def assert_no_award_bearing_submission_xp_duplicates(rows: list[dict[str, Any]]) -> None:
    report = find_submission_xp_duplicate_groups(rows)
    if report["has_award_bearing_duplicates"]:
        keys = [d["source_key"] for d in report["duplicate_groups"] if d["award_bearing_duplicate"]]
        raise AssertionError(
            "Award-bearing duplicate SUBMISSION_XP keys: " + ", ".join(keys)
        )
