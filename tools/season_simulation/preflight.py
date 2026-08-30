"""Read-only preflight for season simulation."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .airtable_client import AirtableClient, WriteBlockedError
from .constants import (
    PREFLIGHT_REQUIRED_TABLES,
    REFERENCE_TABLES,
    SAFE_EMAIL_RECIPIENT,
    SIM_END,
    SIM_START,
    SIMULATION_DAY_COUNT,
    TRANSACTIONAL_TABLES,
)
from .recipient_safety import resolve_simulation_recipient
from .reference_data import load_reference_snapshot
from .simulation_clock import assert_window_integrity, build_simulation_days


@dataclass
class PreflightReport:
    ok: bool
    generated_at: str
    base_id: str
    connectivity: dict[str, Any]
    tables: dict[str, Any]
    reference: dict[str, Any]
    simulation_window: dict[str, Any]
    email: dict[str, Any]
    simulation_clock_blockers: list[str]
    schema_requirements: list[str]
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    sufficient_for_final_run: bool = False

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    def summary_text(self) -> str:
        lines = [
            f"Season simulation preflight — {'PASS' if self.ok else 'FAIL'}",
            f"Base: {self.base_id}",
            f"Window: {SIM_START} .. {SIM_END} ({SIMULATION_DAY_COUNT} days)",
            f"Connectivity: {self.connectivity.get('status')}",
            f"Grade band: {self.reference.get('grade_band')}",
            f"Highest goal: {self.reference.get('highest_goal')}",
            f"Homework (active for band): {self.reference.get('homework_count')}",
            f"Zoom meetings (non-cancelled): {self.reference.get('zoom_meetings_count')}",
            f"Weeks covering window: {self.reference.get('weeks_count')}",
            f"Sufficient for final run: {self.sufficient_for_final_run}",
            "",
            "Errors:",
        ]
        if self.errors:
            lines.extend(f"  - {e}" for e in self.errors)
        else:
            lines.append("  (none)")
        lines.append("Warnings:")
        if self.warnings:
            lines.extend(f"  - {w}" for w in self.warnings)
        else:
            lines.append("  (none)")
        lines.append("Simulation-clock blockers:")
        lines.extend(f"  - {b}" for b in self.simulation_clock_blockers)
        lines.append("Schema / temporary config requirements:")
        lines.extend(f"  - {s}" for s in self.schema_requirements)
        return "\n".join(lines) + "\n"


def run_preflight(client: AirtableClient | None = None) -> PreflightReport:
    """Perform read-only checks. Never writes."""
    errors: list[str] = []
    warnings: list[str] = []
    generated_at = datetime.now(timezone.utc).isoformat()

    if client is None:
        client = AirtableClient(allow_writes=False)
    elif client.allow_writes:
        # Force read-only semantics even if caller passed a writeable client.
        client.allow_writes = False

    connectivity: dict[str, Any] = {"status": "unknown"}
    tables_info: dict[str, Any] = {}
    try:
        meta_tables = client.meta_tables()
        names = {t.get("name") for t in meta_tables}
        connectivity = {
            "status": "ok",
            "table_count": len(meta_tables),
            "base_id": client.base_id,
        }
        missing = [t for t in PREFLIGHT_REQUIRED_TABLES if t not in names]
        tables_info = {
            "required": list(PREFLIGHT_REQUIRED_TABLES),
            "missing": missing,
            "present_count": len(PREFLIGHT_REQUIRED_TABLES) - len(missing),
            "reference_tables": list(REFERENCE_TABLES),
            "transactional_tables": list(TRANSACTIONAL_TABLES),
        }
        if missing:
            errors.append(f"Missing tables: {', '.join(missing)}")
    except Exception as exc:  # noqa: BLE001 — surface as preflight error
        connectivity = {"status": "error", "error": str(exc)}
        errors.append(f"Airtable connectivity failed: {exc}")
        meta_tables = []

    # Field spot-checks for critical writable / formula fields
    field_issues: list[str] = []
    by_name = {t.get("name"): t for t in meta_tables}
    sub = by_name.get("Submissions")
    if sub:
        sub_fields = {f.get("name") for f in sub.get("fields") or []}
        for required in ("Activity Date", "Enrollment", "Shot Total", "Activity Date Is Future?"):
            if required not in sub_fields:
                field_issues.append(f"Submissions missing field {required}")
    if field_issues:
        errors.extend(field_issues)
    tables_info["field_issues"] = field_issues

    reference_dict: dict[str, Any] = {}
    try:
        snap = load_reference_snapshot(client)
        reference_dict = {
            "grade_band": (
                f"{snap.grade_band.name} ({snap.grade_band.record_id})"
                if snap.grade_band
                else None
            ),
            "highest_goal": (
                f"{snap.highest_goal.total_shot_target} shots "
                f"({snap.highest_goal.record_id})"
                if snap.highest_goal
                else None
            ),
            "homework_count": len(snap.homework),
            "zoom_meetings_count": len(snap.zoom_meetings),
            "weeks_count": len(snap.weeks_covering_window),
            "levels_count": len(snap.levels),
            "level_gate_rules_count": snap.level_gate_rules_count,
            "achievements_count": snap.achievements_count,
            "shot_milestones_count": snap.shot_milestones_count,
            "xp_reward_rules_count": snap.xp_reward_rules_count,
            "config_rows": snap.config_rows,
            "ambiguous": snap.ambiguous,
            "detail": snap.to_dict(),
        }
        errors.extend(snap.errors)
        warnings.extend(snap.warnings)
        warnings.extend(snap.ambiguous)
    except Exception as exc:  # noqa: BLE001
        errors.append(f"Reference data resolution failed: {exc}")

    # Window integrity (offline math)
    try:
        days = assert_window_integrity(build_simulation_days())
        window = {
            "start": SIM_START.isoformat(),
            "end": SIM_END.isoformat(),
            "day_count": len(days),
            "first_weekday": days[0].activity_date.strftime("%A"),
            "last_weekday": days[-1].activity_date.strftime("%A"),
        }
    except Exception as exc:  # noqa: BLE001
        window = {"error": str(exc)}
        errors.append(str(exc))

    email_decision = resolve_simulation_recipient(
        enrollment_parent_email=SAFE_EMAIL_RECIPIENT,
        force_safe=True,
    )
    email_info = {
        "allowlist_recipient": SAFE_EMAIL_RECIPIENT,
        "decision": asdict(email_decision),
        "labels_in_subject_body": "none — live-looking emails (no [TEST]/[SIMULATION])",
        "delivery_during_preflight": False,
    }
    if not email_decision.ok:
        errors.append(email_decision.reason)

    # Prove client rejects writes in preflight
    write_guard = "ok"
    try:
        client.create_records("Enrollments", [{"Athlete First Name": "SHOULD_NOT_WRITE"}])
        write_guard = "FAILED — write was not blocked"
        errors.append(write_guard)
    except WriteBlockedError:
        write_guard = "blocked_as_expected"
    except Exception as exc:  # noqa: BLE001
        # If allow_writes somehow true and API rejects, still flag
        write_guard = f"unexpected: {exc}"
        errors.append(f"Write guard unexpected error: {exc}")

    connectivity["write_guard"] = write_guard

    clock_blockers = [
        "Submissions.`Activity Date Is Future?` compares Activity Date to NOW(); "
        "May–June 2027 dates will not count until wall-clock passes them OR a temporary override is applied.",
        "Submissions.`Submitted At` is formula CREATED_TIME() — cannot be future-dated via API.",
        "Created Time on all tables reflects real write time, not simulation clock.",
    ]
    schema_requirements = [
        "OPTIONAL (authorized run only): temporary Config dateTime field e.g. "
        "`Simulation Clock Now` + temporary formula change on "
        "`Activity Date Is Future?` to compare against that field when set; "
        "restore production formula immediately after the run.",
        "ALTERNATE (authorized run only): temporarily set "
        "`Activity Date Is Future?` to `0` for the run window; restore after.",
        "REQUIRED: Weeks rows covering every date from 2027-05-01 through 2027-06-30.",
        "REQUIRED before final run: finish editing Program Homework Assignments and Zoom Meetings; "
        "preflight currently reports counts without enforcing 18 HW / 2 Zoom.",
        "REQUIRED: Resend domain/sender already used by live Hub pipeline must be verified before enabling delivery.",
        "Do not permanently weaken production future-date protections.",
    ]

    hw_count = int(reference_dict.get("homework_count") or 0)
    zoom_count = int(reference_dict.get("zoom_meetings_count") or 0)
    weeks_count = int(reference_dict.get("weeks_count") or 0)
    sufficient = (
        not errors
        and reference_dict.get("highest_goal")
        and weeks_count > 0
        # Soft readiness: report, but don't require 18/2 yet
    )
    # Final-run readiness is stricter and still advisory during development:
    final_ready = bool(
        sufficient
        and hw_count > 0
        and zoom_count >= 1
        and reference_dict.get("xp_reward_rules_count", 0) > 0
    )

    if not final_ready and not errors:
        warnings.append(
            "Configuration is readable but not marked sufficient_for_final_run "
            "(need at least one active PHA for the Grade 12 band, Zoom meeting(s), "
            "weeks coverage, XP rules, and no errors)."
        )

    ok = len(errors) == 0
    return PreflightReport(
        ok=ok,
        generated_at=generated_at,
        base_id=client.base_id,
        connectivity=connectivity,
        tables=tables_info,
        reference=reference_dict,
        simulation_window=window,
        email=email_info,
        simulation_clock_blockers=clock_blockers,
        schema_requirements=schema_requirements,
        errors=errors,
        warnings=warnings,
        sufficient_for_final_run=final_ready,
    )


def write_preflight_reports(report: PreflightReport, out_dir: Path) -> dict[str, Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    json_path = out_dir / f"preflight-{stamp}.json"
    md_path = out_dir / f"preflight-{stamp}.md"
    json_path.write_text(
        json.dumps(report.to_dict(), indent=2, default=str) + "\n", encoding="utf-8"
    )
    md_path.write_text(report.summary_text(), encoding="utf-8")
    latest_json = out_dir / "preflight-latest.json"
    latest_md = out_dir / "preflight-latest.md"
    latest_json.write_text(json_path.read_text(encoding="utf-8"), encoding="utf-8")
    latest_md.write_text(md_path.read_text(encoding="utf-8"), encoding="utf-8")
    return {"json": json_path, "md": md_path, "latest_json": latest_json, "latest_md": latest_md}
