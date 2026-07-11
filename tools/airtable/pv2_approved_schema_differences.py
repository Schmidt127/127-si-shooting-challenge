"""Approved DEV/PROD schema environment differences for Production v2 audits."""

from __future__ import annotations

from typing import Any

# Keys are "TableName.FieldName". Approved entries are excluded from required-missing
# counts and classified as intentional NO ACTION environment differences.
APPROVED_ENV_DIFFERENCES: list[dict[str, Any]] = [
    {
        "table": "Submission Assets",
        "field": "Calculation",
        "classification": "NO ACTION",
        "environment_difference": "intentional",
        "operational_impact": "none",
        "launch_blocker": False,
        "required_before_launch": False,
        "justification": (
            "Redundant DEV helper formula {RecordId}; PROD already contains RecordId "
            "and no production dependency references Calculation."
        ),
    },
]


def field_key(table: str, field: str) -> str:
    return f"{table}.{field}"


def approved_keys() -> set[str]:
    return {field_key(d["table"], d["field"]) for d in APPROVED_ENV_DIFFERENCES}


def is_approved_difference(table: str, field: str) -> bool:
    return field_key(table, field) in approved_keys()


def get_approved_difference(table: str, field: str) -> dict[str, Any] | None:
    for d in APPROVED_ENV_DIFFERENCES:
        if d["table"] == table and d["field"] == field:
            return d
    return None


def split_missing_fields(
    table: str, missing_in_prod: list[str]
) -> tuple[list[str], list[dict[str, Any]]]:
    """Return (required_missing, approved_difference_entries)."""
    required: list[str] = []
    approved: list[dict[str, Any]] = []
    for field in missing_in_prod:
        entry = get_approved_difference(table, field)
        if entry:
            approved.append({"table": table, "field": field, **entry})
        else:
            required.append(field)
    return required, approved
