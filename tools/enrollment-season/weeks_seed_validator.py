#!/usr/bin/env python3
"""
Read-only Weeks seed validator.

Validates manually seeded Weeks rows (CSV or list of dicts).
Does NOT create Week records in Airtable.
"""

from __future__ import annotations

import csv
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Any, Iterable, Optional

try:
    from season_date_boundaries import parse_date
except ImportError:  # pragma: no cover
    from enrollment_season.season_date_boundaries import parse_date  # type: ignore

REQUIRED_FIELDS = (
    "Week Name",
    "Start Date",
    "End Date",
    "Sequence",
)


@dataclass
class WeekSeedFinding:
    severity: str  # PASS | WARNING | FAIL
    code: str
    message: str
    week_name: str = ""


@dataclass
class WeekSeedReport:
    overall: str
    findings: list[WeekSeedFinding] = field(default_factory=list)
    weeks: list[dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "overall": self.overall,
            "findings": [f.__dict__ for f in self.findings],
            "weekCount": len(self.weeks),
            "weeks": self.weeks,
        }


def load_weeks_csv(path: str | Path) -> list[dict[str, str]]:
    with open(path, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        return [dict(row) for row in reader]


def _truthy(value: Any, default: bool = False) -> bool:
    if value is None or value == "":
        return default
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "yes", "y", "x"}


def validate_weeks_seed(
    rows: Iterable[dict[str, Any]],
    *,
    timezone: str = "America/Denver",
    require_program_instance: bool = False,
) -> WeekSeedReport:
    findings: list[WeekSeedFinding] = []
    parsed: list[dict[str, Any]] = []

    for idx, row in enumerate(rows, start=1):
        name = str(row.get("Week Name") or row.get("weekName") or "").strip()
        start_raw = row.get("Start Date") or row.get("startDate") or ""
        end_raw = row.get("End Date") or row.get("endDate") or ""
        seq_raw = row.get("Sequence") or row.get("sequence") or ""
        week_type = str(row.get("Week Type") or row.get("weekType") or "Regular").strip()
        active = _truthy(row.get("Active?") or row.get("active"), True)
        intake = _truthy(row.get("Intake Open?") or row.get("intakeOpen"), True)
        counts_xp = _truthy(row.get("Counts for XP?") or row.get("countsForXp"), True)
        counts_lb = _truthy(
            row.get("Counts for Leaderboard?") or row.get("countsForLeaderboard"), True
        )
        program = str(row.get("Program Instance") or row.get("programInstance") or "").strip()

        if not name:
            findings.append(
                WeekSeedFinding("FAIL", "missing_week_name", f"Row {idx}: Week Name required.")
            )
            continue
        if not start_raw or not end_raw:
            findings.append(
                WeekSeedFinding(
                    "FAIL",
                    "missing_dates",
                    f"{name}: Start Date and End Date are required.",
                    name,
                )
            )
            continue
        try:
            start = parse_date(start_raw)
            end = parse_date(end_raw)
        except Exception as exc:  # noqa: BLE001
            findings.append(
                WeekSeedFinding(
                    "FAIL",
                    "bad_date",
                    f"{name}: could not parse dates ({exc}).",
                    name,
                )
            )
            continue

        if end < start:
            findings.append(
                WeekSeedFinding(
                    "FAIL",
                    "end_before_start",
                    f"{name}: End Date is before Start Date.",
                    name,
                )
            )

        try:
            sequence = int(str(seq_raw).strip())
        except Exception:
            findings.append(
                WeekSeedFinding(
                    "FAIL",
                    "bad_sequence",
                    f"{name}: Sequence must be an integer.",
                    name,
                )
            )
            sequence = idx

        # Naming convention: Week N or Early Bird / Final labels
        if week_type == "Regular" and not (
            name.lower().startswith("week ") or name.lower().startswith("week")
        ):
            findings.append(
                WeekSeedFinding(
                    "WARNING",
                    "name_convention",
                    f"{name}: Regular weeks usually named 'Week N'.",
                    name,
                )
            )

        if require_program_instance and not program:
            findings.append(
                WeekSeedFinding(
                    "FAIL",
                    "missing_program_instance",
                    f"{name}: Program Instance required for multi-year scoping.",
                    name,
                )
            )

        if timezone != "America/Denver":
            findings.append(
                WeekSeedFinding(
                    "WARNING",
                    "timezone",
                    f"{name}: expected America/Denver; got {timezone}.",
                    name,
                )
            )

        parsed.append(
            {
                "weekName": name,
                "startDate": start.isoformat(),
                "endDate": end.isoformat(),
                "sequence": sequence,
                "weekType": week_type,
                "active": active,
                "intakeOpen": intake,
                "countsForXp": counts_xp,
                "countsForLeaderboard": counts_lb,
                "programInstance": program,
                "timezone": timezone,
            }
        )

    # Overlap / gap detection on active weeks sorted by sequence then start
    ordered = sorted(parsed, key=lambda w: (w["sequence"], w["startDate"]))
    prev: Optional[dict[str, Any]] = None
    seen_seq: set[int] = set()
    for week in ordered:
        seq = week["sequence"]
        if seq in seen_seq:
            findings.append(
                WeekSeedFinding(
                    "FAIL",
                    "duplicate_sequence",
                    f"{week['weekName']}: duplicate Sequence {seq}.",
                    week["weekName"],
                )
            )
        seen_seq.add(seq)

        if prev:
            prev_end = date.fromisoformat(prev["endDate"])
            cur_start = date.fromisoformat(week["startDate"])
            if cur_start <= prev_end:
                findings.append(
                    WeekSeedFinding(
                        "FAIL",
                        "overlap",
                        f"{week['weekName']} overlaps {prev['weekName']} "
                        f"({prev['startDate']}–{prev['endDate']} vs "
                        f"{week['startDate']}–{week['endDate']}).",
                        week["weekName"],
                    )
                )
            elif (cur_start - prev_end).days > 1:
                findings.append(
                    WeekSeedFinding(
                        "WARNING",
                        "gap",
                        f"Gap of {(cur_start - prev_end).days - 1} day(s) between "
                        f"{prev['weekName']} and {week['weekName']}.",
                        week["weekName"],
                    )
                )
        prev = week

    if not parsed:
        findings.append(
            WeekSeedFinding("FAIL", "empty_seed", "No valid week rows to seed.")
        )

    if not any(f.severity == "FAIL" for f in findings):
        findings.append(
            WeekSeedFinding(
                "PASS",
                "seed_structure_ok",
                f"Week seed structure OK for {len(parsed)} week(s).",
            )
        )

    severities = {f.severity for f in findings}
    if "FAIL" in severities:
        overall = "FAIL"
    elif "WARNING" in severities:
        overall = "WARNING"
    else:
        overall = "PASS"

    return WeekSeedReport(overall=overall, findings=findings, weeks=ordered)


__all__ = [
    "REQUIRED_FIELDS",
    "WeekSeedFinding",
    "WeekSeedReport",
    "load_weeks_csv",
    "validate_weeks_seed",
]
