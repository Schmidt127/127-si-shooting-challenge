"""Read-only preflight for season simulation."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

from .airtable_client import AirtableClient, WriteBlockedError
from .clock_override import (
    GATED_ACTIVITY_DATE_IS_FUTURE_FORMULA,
    PRODUCTION_ACTIVITY_DATE_IS_FUTURE_FORMULA,
    SEASON_SIM_CLOCK_NOW_FIELD,
    SEASON_SIM_TEST_RECORD_FIELD,
    SEASON_SIM_TEST_SUBMITTED_AT_FIELD,
    assess_clock_override_readiness,
    dependency_impact_matrix,
    formula_text_has_season_sim_gate,
)
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
from .same_day_contracts import assess_same_day_readiness
from .season_policy import EXPECTED_ACTIVE_PHA_COUNT
from .simulation_clock import (
    assert_window_integrity,
    build_simulation_days,
    inspect_activity_date_is_future_formula,
)

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
    clock_override_readiness: dict[str, Any] = field(default_factory=dict)
    same_day_readiness: dict[str, Any] = field(default_factory=dict)
    dependency_impact: dict[str, str] = field(default_factory=dict)
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    sufficient_for_final_run: bool = False
    sufficient_for_same_day_perfect_week: bool = False
    no_dev_base: bool = True

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
            f"Sufficient for final run (graph + Activity Date gate): {self.sufficient_for_final_run}",
            f"Sufficient for same-day / Perfect Week: {self.sufficient_for_same_day_perfect_week}",
            f"Same-day logic accurate for sim: {(self.same_day_readiness or {}).get('same_day_logic_accurate_for_sim')}",
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
    sub_fields: set[str] = set()
    formula_future = ""
    if sub:
        sub_fields = {f.get("name") for f in sub.get("fields") or []}
        for required in ("Activity Date", "Enrollment", "Shot Total", "Activity Date Is Future?"):
            if required not in sub_fields:
                field_issues.append(f"Submissions missing field {required}")
        for f in sub.get("fields") or []:
            if f.get("name") == "Activity Date Is Future?":
                opts = f.get("options") or {}
                formula_future = str(opts.get("formula") or "")
    if field_issues:
        errors.extend(field_issues)
    tables_info["field_issues"] = field_issues

    future_status = inspect_activity_date_is_future_formula(meta_tables)
    if future_status.formula:
        formula_future = future_status.formula

    readiness = assess_clock_override_readiness(
        wall_date=date.today(),
        submission_field_names=sub_fields or None,
        formula_text_activity_date_is_future=formula_future or None,
        formula_override_acknowledged=False,
    )
    warnings.extend(readiness.warnings)
    # Clock blockers are informational for preflight (do not fail connectivity).
    # Execute still hard-gates on readiness.

    # Prefer live inspect (field-id aware) over name-only string heuristics.
    formula_gate_active = bool(
        future_status.gated_season_sim_active
        or readiness.formula_override_detected
        or formula_text_has_season_sim_gate(formula_future)
    )
    same_day = assess_same_day_readiness(
        meta_tables,
        activity_date_gate_active=formula_gate_active,
    )
    same_day_dict = same_day.to_dict()
    same_day_dict['paste_required_keys'] = sorted((same_day.paste_required or {}).keys())
    same_day_dict['activity_date_is_future_inspect'] = future_status.to_dict()

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

    clock_blockers = list(readiness.blockers) + list(same_day.blockers) + [
        "Submissions.`Submitted At` is formula CREATED_TIME() — cannot be future-dated via API.",
        "Created Time on all tables reflects real write time, not simulation clock.",
        "Perfect Week Grace Eligible? uses Activity Date <= TODAY() unless "
        "`Perfect Week Manual Exception?` is checked on disposable sim rows.",
    ]
    fields_present = dict(readiness.required_fields_present or {})
    missing_sim_fields = [
        name
        for name in (
            SEASON_SIM_TEST_RECORD_FIELD,
            SEASON_SIM_CLOCK_NOW_FIELD,
            SEASON_SIM_TEST_SUBMITTED_AT_FIELD,
        )
        if not fields_present.get(name)
    ]
    if missing_sim_fields:
        field_req = (
            "REQUIRED before early execute: create missing Submissions fields: "
            + ", ".join(f"`{n}`" for n in missing_sim_fields)
            + "."
        )
    else:
        field_req = (
            "Season Sim Submissions fields PRESENT "
            f"(`{SEASON_SIM_TEST_RECORD_FIELD}`, `{SEASON_SIM_CLOCK_NOW_FIELD}`, "
            f"`{SEASON_SIM_TEST_SUBMITTED_AT_FIELD}`) — unused while unchecked / unstamped."
        )

    if formula_gate_active:
        future_req = (
            "Activity Date Is Future? Season Sim gate is ACTIVE — restore Production "
            "NOW()-only formula immediately after the run (see rollback in operator checklist)."
        )
    else:
        future_req = (
            "REQUIRED for early execute: temporarily replace `Activity Date Is Future?` with "
            "the gated formula in docs/deploy-checklists/SC-SEASON-SIM-002-operator-checklist.md "
            "and tools/season_simulation/FORMULAS-TO-PASTE.txt; restore Production NOW() "
            "formula immediately after the run."
        )

    schema_requirements = [
        field_req,
        future_req,
        "Production formula (restore target):\n" + PRODUCTION_ACTIVITY_DATE_IS_FUTURE_FORMULA,
        "Gated formula (temporary):\n" + GATED_ACTIVITY_DATE_IS_FUTURE_FORMULA,
        "REQUIRED: Weeks rows covering every date from 2027-05-01 through 2027-06-30.",
        f"REQUIRED before final run: {EXPECTED_ACTIVE_PHA_COUNT} active Program Homework "
        "Assignments (Early Bird + Weeks 1–8 × 2 slots); Week 9 must have 0 PHA.",
        "REQUIRED: Resend domain/sender already used by live Hub pipeline must be verified before enabling delivery.",
        "Do not permanently weaken production future-date protections for normal athletes.",
        "Do not modify SC-147, Automation 101, or Zoom credit logic for this simulation.",
        "REQUIRED before Perfect Week / same-day accuracy: temporary gated formulas on "
        "Submitted Same Day? and Perfect Week Grace Eligible? (see operator checklist); "
        "restore rollbacks after the run with Activity Date Is Future? NOW()-only.",
        "No DEV Airtable base — disposable Production VERIFY/Schmidt records only; "
        "email allowlist schmidt@fairfieldbasketballclub.com when email phase enabled.",
    ]

    if not same_day.same_day_logic_accurate_for_sim:
        warnings.append(
            "Same-day / Perfect Week NOT accurate for sim yet: paste temporary "
            "Submitted Same Day? + Perfect Week Grace Eligible? Season Sim gates "
            "(operator checklist). Do not claim Perfect Week success from record create alone."
        )
    else:
        warnings.append(
            "Same-day / Perfect Week Season Sim gates ACTIVE — restore rollbacks after the run."
        )

    hw_count = int(reference_dict.get("homework_count") or 0)
    zoom_count = int(reference_dict.get("zoom_meetings_count") or 0)
    weeks_count = int(reference_dict.get("weeks_count") or 0)
    sufficient = (
        not errors
        and reference_dict.get("highest_goal")
        and weeks_count > 0
    )
    final_ready = bool(
        sufficient
        and hw_count >= EXPECTED_ACTIVE_PHA_COUNT
        and zoom_count >= 1
        and reference_dict.get("xp_reward_rules_count", 0) > 0
        and readiness.ready_for_early_execute
    )

    if hw_count and hw_count != EXPECTED_ACTIVE_PHA_COUNT:
        warnings.append(
            f"Active PHA count for Grade 12 band is {hw_count}; "
            f"product expectation is {EXPECTED_ACTIVE_PHA_COUNT}."
        )

    if not final_ready and not errors:
        warnings.append(
            "Configuration is readable but not marked sufficient_for_final_run "
            "(need 18 active PHA for the Grade 12 band, Zoom meeting(s), weeks coverage, "
            "XP rules, gated clock override readiness, and no errors)."
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
        clock_override_readiness=readiness.to_dict(),
        same_day_readiness=same_day_dict,
        dependency_impact=dependency_impact_matrix(),
        errors=errors,
        warnings=warnings,
        sufficient_for_final_run=final_ready,
        sufficient_for_same_day_perfect_week=bool(
            final_ready and same_day.sufficient_for_same_day_perfect_week
        ),
        no_dev_base=True,
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
