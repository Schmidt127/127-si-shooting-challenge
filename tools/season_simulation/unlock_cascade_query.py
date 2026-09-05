"""SC-169 — Query Athlete Achievement Unlocks without false-negative Enrollment Record ID.

Athlete Achievement Unlocks does **not** have Enrollment Record ID (that field
exists on XP Events / Streak Occurrences / Email Handoff Queue). Cascade counts
that request Enrollment Record ID on Unlocks fail both formula attempts and
report unlocks=0 even when Milestone Source Key rows exist.

Always query Unlocks by:
1. FIND(enrollmentId, {Milestone Source Key}) — survives Enrollment delete
2. FIND(enrollmentId, ARRAYJOIN({Enrollment})) — while Enrollment is linked
"""

from __future__ import annotations

from typing import Any, Callable, Sequence


UNLOCK_TABLE = "Athlete Achievement Unlocks"
MILESTONE_SOURCE_KEY_FIELD = "Milestone Source Key"
ENROLLMENT_FIELD = "Enrollment"

# Fields that exist on Unlocks (do not request Enrollment Record ID).
DEFAULT_UNLOCK_FIELDS = (
    "Milestone Source Key",
    "Enrollment",
    "XP Award Status",
    "Active?",
    "Shot Milestone",
    "Achievement",
    "Week",
)


def unlock_formulas_for_enrollment(enrollment_id: str) -> list[str]:
    enr = enrollment_id.strip()
    return [
        f"FIND('{enr}', {{{MILESTONE_SOURCE_KEY_FIELD}}} & '')",
        f"FIND('{enr}', ARRAYJOIN({{{ENROLLMENT_FIELD}}}) & '')",
    ]


def list_unlocks_for_enrollment(
    list_records: Callable[..., list[dict[str, Any]]],
    enrollment_id: str,
    *,
    fields: Sequence[str] = DEFAULT_UNLOCK_FIELDS,
    max_records: int = 200,
) -> list[dict[str, Any]]:
    """List unlocks for an enrollment using safe formulas + field list.

    ``list_records`` should match season_simulation.AirtableClient.list_records
    signature: (table, *, fields=None, formula=None, max_records=...).
    """
    seen: dict[str, dict[str, Any]] = {}
    errors: list[str] = []
    for formula in unlock_formulas_for_enrollment(enrollment_id):
        try:
            rows = list_records(
                UNLOCK_TABLE,
                fields=list(fields),
                formula=formula,
                max_records=max_records,
            )
        except TypeError:
            # Some clients use positional max_records only.
            try:
                rows = list_records(
                    UNLOCK_TABLE,
                    fields=list(fields),
                    formula=formula,
                )
            except Exception as exc:  # noqa: BLE001
                errors.append(f"{formula}: {exc}")
                continue
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{formula}: {exc}")
            continue
        for row in rows or []:
            rid = str(row.get("id") or "")
            if rid:
                seen[rid] = row
    if not seen and errors:
        raise RuntimeError(
            "Unlock query failed for all formulas: " + "; ".join(errors)
        )
    return list(seen.values())


def unlock_source_keys(rows: Sequence[dict[str, Any]]) -> list[str]:
    keys: list[str] = []
    for row in rows:
        fields = row.get("fields") or {}
        key = fields.get(MILESTONE_SOURCE_KEY_FIELD)
        if key is None and MILESTONE_SOURCE_KEY_FIELD in row:
            key = row.get(MILESTONE_SOURCE_KEY_FIELD)
        if key:
            keys.append(str(key))
    return keys


def broken_unlock_count_pattern_explanation() -> str:
    return (
        "Do not query Athlete Achievement Unlocks with fields including "
        "'Enrollment Record ID' or formula FIND(..., {Enrollment Record ID}) — "
        "that field does not exist on Unlocks. Empty/exception paths falsely "
        "report unlocks=0 while Milestone Source Key rows (and 059 XP) exist."
    )
