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
from .same_day_contracts import assess_same_day_readiness
from .simulation_clock import (
    assert_window_integrity,
    build_simulation_days,
    inspect_activity_date_is_future_formula,
)
from .writer import EXECUTE_SETS_SEASON_SIM_GATES


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
    activity_date_future_formula: dict[str, Any] = field(default_factory=dict)
    same_day_readiness: dict[str, Any] = field(default_factory=dict)
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
            f"Base: {self.base_id} (Production only — no DEV Airtable base)",
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
        formula_status = self.activity_date_future_formula or {}
        lines.append(
            "Activity Date Is Future? gate: "
            + (
                "ACTIVE (Season Sim)"
                if formula_status.get("gated_season_sim_active")
                else "NOW()-only / not gated"
            )
        )
        if formula_status.get("notes"):
            lines.append("Clock formula notes:")
            lines.extend(f"  - {n}" for n in formula_status["notes"])
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
        for required in (
            "Activity Date",
            "Enrollment",
            "Shot Total",
            "Activity Date Is Future?",
            "Video Upload Note",
            "Season Sim Test Record?",
            "Season Sim Clock Now",
            "Season Sim Test Submitted At",
        ):
            if required not in sub_fields:
                field_issues.append(f"Submissions missing field {required}")
    if field_issues:
        # Season Sim fields are required for gated early runs; keep as warnings
        # when only those are missing so connectivity still reports.
        sim_only = all("Season Sim" in issue for issue in field_issues)
        if sim_only:
            warnings.extend(field_issues)
        else:
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

    formula_status = inspect_activity_date_is_future_formula(meta_tables)
    formula_dict = formula_status.to_dict()
    same_day = assess_same_day_readiness(
        meta_tables,
        activity_date_gate_active=formula_status.gated_season_sim_active,
    )
    same_day_dict = same_day.to_dict()
    # Drop bulky paste formulas from JSON blockers path — keep keys, truncate in report file.
    same_day_dict["paste_required"] = {
        k: "(see docs/deploy-checklists/SC-SEASON-SIM-002-operator-checklist.md)"
        for k in (same_day.paste_required or {})
    }
    # Drop bulky formula from summary blockers path; keep full text in JSON.
    clock_blockers = list(formula_status.blockers)
    clock_blockers.extend(same_day.blockers)
    if formula_status.gated_season_sim_active:
        if EXECUTE_SETS_SEASON_SIM_GATES:
            warnings.append(
                "Season Sim gated Activity Date Is Future? is ACTIVE and the writer "
                "sets Season Sim Test Record?, Season Sim Clock Now, Video Upload Note "
                "SEASON-SIM| marker, and Season Sim Test Submitted At on sim Submissions. "
                "Restore NOW()-only formula after the authorized run."
            )
        else:
            warnings.append(
                "Season Sim gated Activity Date Is Future? is ACTIVE. "
                "Execute writer must set Season Sim Test Record?=true, "
                "Season Sim Clock Now, Video Upload Note containing SEASON-SIM|, "
                "and Season Sim Test Submitted At on sim rows; restore NOW()-only "
                "formula after the authorized run."
            )
    elif formula_status.uses_now:
        warnings.append(
            "Activity Date Is Future? is NOW()-only — May–June 2027 Activity Dates "
            "will not count until the temporary Season Sim gate is applied."
        )

    schema_requirements: list[str] = []
    if formula_status.gated_season_sim_active:
        schema_requirements.append(
            "ACTIVE: temporary Season Sim gate on `Activity Date Is Future?` "
            "(Test Record? + SEASON-SIM| marker + Season Sim Clock Now). "
            "Restore production NOW() formula immediately after the run."
        )
    else:
        schema_requirements.append(
            "REQUIRED before early countable run: paste temporary gated "
            "`Activity Date Is Future?` (Season Sim Test Record? + SEASON-SIM| "
            "in Video Upload Note + Season Sim Clock Now); restore NOW() after."
        )
    schema_requirements.extend(
        [
            "REQUIRED: Weeks rows covering every date from 2027-05-01 through 2027-06-30.",
            "REQUIRED before final run: finish editing Program Homework Assignments and Zoom Meetings; "
            "preflight reports live PHA counts (multi-band Grade Band links supported).",
            "REQUIRED: Resend domain/sender already used by live Hub pipeline must be verified before enabling delivery.",
            "Do not permanently weaken production future-date protections for normal athletes.",
            "Execute payloads must set: Season Sim Test Record?, Season Sim Clock Now, "
            "Video Upload Note with SEASON-SIM|, Season Sim Test Submitted At.",
            "REQUIRED before Perfect Week / same-day accuracy: temporary gated formulas on "
            "`Submitted Same Day?` and `Perfect Week Grace Eligible?` (see operator checklist); "
            "restore rollbacks after the run with Activity Date Is Future? NOW()-only.",
            "No DEV Airtable base — disposable Production VERIFY/Schmidt records only; "
            "email allowlist schmidt@fairfieldbasketballclub.com when email phase enabled.",
        ]
    )

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
        # Soft readiness: report, but don't require 18/2 yet
    )
    # Final-run readiness is stricter and still advisory during development:
    final_ready = bool(
        sufficient
        and hw_count > 0
        and zoom_count >= 1
        and reference_dict.get("xp_reward_rules_count", 0) > 0
        and formula_status.gated_season_sim_active
        and formula_status.safe_for_normal_athletes
        and not formula_status.gate_fields_missing
        and EXECUTE_SETS_SEASON_SIM_GATES
    )

    if formula_status.gated_season_sim_active and not EXECUTE_SETS_SEASON_SIM_GATES:
        warnings.append(
            "NO-GO for execute: gated formula is live, but execute writer does not yet "
            "set Season Sim Test Record?, Season Sim Clock Now, or Season Sim Test "
            "Submitted At (only Video Upload Note marker today)."
        )

    if not final_ready and not errors:
        warnings.append(
            "Configuration is readable but not marked sufficient_for_final_run "
            "(need at least one active PHA covering the Grade 12 band, Zoom meeting(s), "
            "weeks coverage, XP rules, active Season Sim clock gate, execute writer "
            "gate fields, and no errors)."
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
        activity_date_future_formula=formula_dict,
        same_day_readiness=same_day_dict,
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
