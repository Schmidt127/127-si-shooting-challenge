"""SC-SEASON-SIM-001 three-athlete staged execute orchestration.

Stages (ordered):
  0  — Auth / gate validation + formula snapshot hook
  A  — Assemble profiles + reference resolution
  B  — Create athlete + enrollment (per profile)
  C  — Daily activity writes (submissions, HW, zoom)
  D  — Settlement hooks (XP / milestones — Agent 3)
  E  — Reconcile hooks (registry vs Airtable — Agent 3)
  F  — Formula / clock verification hooks
  G  — Email arm verification hooks (no send)
  H  — Cleanup registration hooks (pre-final)
  Z  — Formula restore hook
  Final — Report + registry persist

Without all gates: zero writes. dry-run-three and prep mode (no --execute) plan only.
"""

from __future__ import annotations

import json
from dataclasses import replace
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .confirmation import ConfirmationError, require_three_athlete_execute_gates
from .constants import SIM_START, THREE_ATHLETE_RUN_SUFFIX
from .execute import (
    ExecuteAborted,
    build_intended_writes,
    run_execute,
    summarize_intended_write_readiness,
)
from .formula_lifecycle import (
    restore_production_formulas,
    snapshot_formulas,
    stage_f_formula_verify_hook,
)
from .cascade_settlement import stage_d_settlement_hook, stage_e_reconcile_hook
from .cleanup import stage_h_cleanup_preview_hook
from .rearm_submission_xp import run_rearm_submission_xp
from .run_registry import save_registry
from .writer import (
    build_execute_context_from_reference,
    field_names_for_table,
    load_or_new_registry,
)
from .scenario_base import athlete_marker
from .simulation_clock import SimulationClock
from .three_athlete import build_three_athlete_scenarios

# Per-profile cascade settle before the next athlete starts writing.
DEFAULT_PROFILE_SETTLEMENT_TIMEOUT_S = 300.0
DEFAULT_PROFILE_SETTLEMENT_POLL_S = 5.0

# Ordered profile execution — athlete1 perfect first, then recovery, then edge.
PROFILE_ORDER = (
    "athlete1_perfect",
    "athlete2_recovery",
    "athlete3_edge",
)


class ExecuteThreeAborted(RuntimeError):
    pass


def profile_registry_run_id(run_id: str, profile: str) -> str:
    """Per-profile registry file key under a shared three-athlete run_id."""
    slug = profile.replace("_", "-")
    return f"{run_id}__{slug}"


def profile_ownership_namespace(run_id: str, profile: str) -> str:
    """Text namespace stamped into dedupe keys / registry rows for one profile."""
    return athlete_marker(run_id, profile)


def _count_client_writes(client: Any | None) -> int:
    if client is None:
        return 0
    tables = getattr(client, "tables", None)
    if isinstance(tables, dict):
        return sum(len(bucket) for bucket in tables.values())
    return getattr(client, "write_count", 0)


def _gate_kwargs(
    *,
    execute: bool,
    confirm: str | None,
    confirm_disposable: str | None,
    confirm_three_athlete: str | None,
    authorization_phrase: str | None,
    simulation_id: str | None,
) -> dict[str, Any]:
    return dict(
        execute=execute,
        confirm=confirm,
        confirm_disposable=confirm_disposable,
        confirm_three_athlete=confirm_three_athlete,
        authorization_phrase=authorization_phrase,
        simulation_id=simulation_id,
    )


def _stage_stub(name: str, *, allow_writes: bool, profile: str | None = None) -> dict[str, Any]:
    return {
        "stage": name,
        "profile": profile,
        "status": "stub",
        "writes": allow_writes,
        "note": f"Agent 3 implements {name} hook",
    }


def _run_profile_writer(
    *,
    scenario: Any,
    clock: SimulationClock,
    run_id: str,
    profile: str,
    registry_dir: Path,
    client: Any,
    allow_writes: bool,
    execute: bool,
    confirm: str | None,
    confirm_disposable: str | None,
    enable_email_delivery: bool,
    acknowledge_clock_override: bool,
    execute_context: Any | None,
) -> dict[str, Any]:
    """Invoke SC-002 writer path for one profile with profile-scoped registry."""
    reg_run_id = profile_registry_run_id(run_id, profile)
    # Isolate Athlete/Enrollment registry keys per profile while keeping DayPlan
    # dedupe keys (already profile-scoped at scenario build) unchanged.
    write_scenario = replace(scenario, run_id=reg_run_id)
    if not allow_writes or not execute:
        intended = build_intended_writes(write_scenario, clock, ctx=execute_context)
        return {
            "mode": "dry-plan",
            "profile": profile,
            "registry_run_id": reg_run_id,
            "ownership_namespace": profile_ownership_namespace(run_id, profile),
            "intended_write_count": len(intended),
            "write_readiness": summarize_intended_write_readiness(intended),
        }

    if execute_context is None:
        raise ExecuteAborted(
            "ExecuteContext missing — weeks / Program Instance must be resolved "
            "before three-athlete writes"
        )

    result = run_execute(
        scenario=write_scenario,
        clock=clock,
        execute=True,
        confirm=confirm,
        confirm_disposable=confirm_disposable,
        simulation_id=reg_run_id,
        registry_dir=registry_dir,
        out_dir=registry_dir.parent / "reports",
        client=client,
        enable_email_delivery=enable_email_delivery,
        acknowledge_clock_override=acknowledge_clock_override,
        execute_context=execute_context,
    )
    result["profile"] = profile
    result["registry_run_id"] = reg_run_id
    result["ownership_namespace"] = profile_ownership_namespace(run_id, profile)
    result["shared_run_id"] = run_id
    return result


def run_execute_three(
    *,
    run_id: str,
    execute: bool = False,
    confirm: str | None = None,
    confirm_disposable: str | None = None,
    confirm_three_athlete: str | None = None,
    authorization_phrase: str | None = None,
    registry_dir: Path,
    out_dir: Path,
    client: Any | None = None,
    offline_fixture: bool = False,
    allow_writes: bool | None = None,
    enable_email_delivery: bool = False,
    acknowledge_clock_override: bool = False,
    execute_context: Any | None = None,
    confirm_for_formula: str | None = None,
) -> dict[str, Any]:
    """Three-athlete execute orchestration — gates first, then staged profiles."""
    simulation_id = run_id
    gates = _gate_kwargs(
        execute=execute,
        confirm=confirm,
        confirm_disposable=confirm_disposable,
        confirm_three_athlete=confirm_three_athlete,
        authorization_phrase=authorization_phrase,
        simulation_id=simulation_id,
    )

    writes_allowed = bool(allow_writes) if allow_writes is not None else bool(execute)
    if not execute:
        writes_allowed = False

    payload: dict[str, Any] = {
        "backlog_id": "SC-SEASON-SIM-001",
        "command": "execute-three",
        "run_id": run_id,
        "mode": "execute" if execute else "dry-plan",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "gates_passed": False,
        "allow_writes": writes_allowed,
        "profiles": list(PROFILE_ORDER),
        "stages": {},
        "profile_results": {},
        "airtable_writes_performed": 0,
        "errors": [],
    }

    writes_before = _count_client_writes(client)
    snapshot_result: dict[str, Any] | None = None
    # When --execute is requested, temporary formulas may already be live (operator
    # paste). Stage Z must run on every exit path after that, including gate refusal,
    # assemble failure, profile abort, and interrupt.
    stage_z_required = bool(execute)

    try:
        # Stage 0 — snapshot first (read-only), then auth gates before any mutation.
        if execute:
            snapshot_result = snapshot_formulas(
                client,
                allow_writes=False,
                confirm=confirm_for_formula or confirm,
                run_id=run_id,
            )
            try:
                require_three_athlete_execute_gates(**gates)
                payload["gates_passed"] = True
            except ConfirmationError as exc:
                payload["errors"].append(str(exc))
                payload["stages"]["0_auth"] = {
                    "status": "refused",
                    "error": str(exc),
                    "formula_snapshot": snapshot_result,
                }
                return payload
            payload["stages"]["0_auth"] = {
                "status": "passed",
                "formula_snapshot": snapshot_result,
            }
        else:
            payload["gates_passed"] = False
            payload["stages"]["0_auth"] = {
                "status": "dry-plan",
                "note": "Full gates evaluated only with --execute",
            }

        if THREE_ATHLETE_RUN_SUFFIX not in run_id:
            payload["errors"].append(
                f"run_id must contain {THREE_ATHLETE_RUN_SUFFIX!r}; got {run_id!r}"
            )
            return payload

        # Stage A — Assemble three profiles under shared run_id.
        try:
            scenarios, ref_meta = build_three_athlete_scenarios(
                run_id=run_id,
                client=client,
                offline_fixture=offline_fixture,
            )
        except ValueError as exc:
            payload["errors"].append(str(exc))
            payload["stages"]["A_assemble"] = {"status": "failed", "error": str(exc)}
            return payload

        clock = SimulationClock(enabled=True, current_date=SIM_START, run_id=run_id)
        payload["stages"]["A_assemble"] = {
            "status": "ok",
            "reference_meta": {
                k: v
                for k, v in ref_meta.items()
                if k not in {"weeks_objs"}  # WeekInfo objects are not JSON-serializable
            },
            "ownership_namespaces": {
                p: profile_ownership_namespace(run_id, p) for p in PROFILE_ORDER
            },
        }

        if client is not None and writes_allowed:
            if hasattr(client, "allow_writes"):
                client.allow_writes = True

        # Build one ExecuteContext per profile from live Weeks / goal PI.
        # Offline fixture without weeks_objs keeps execute_context=None (plan-only).
        shared_execute_context = execute_context
        weeks_objs = ref_meta.get("weeks_objs") or []
        if shared_execute_context is None and weeks_objs and writes_allowed and execute:
            sample = scenarios[PROFILE_ORDER[0]]
            sub_fields = field_names_for_table(client, "Submissions") if client else set()
            vf_fields = field_names_for_table(client, "Video Feedback") if client else set()
            zm_fields = field_names_for_table(client, "Zoom Meetings") if client else set()
            za_fields = field_names_for_table(client, "Zoom Attendance") if client else set()
            try:
                shared_execute_context = build_execute_context_from_reference(
                    scenario=sample,
                    weeks=weeks_objs,
                    school_year=str(ref_meta.get("school_year") or "2026-2027"),
                    goal_program_instance_ids=list(
                        ref_meta.get("goal_program_instance_ids") or []
                    ),
                    submission_field_names=sub_fields or None,
                    video_feedback_field_names=vf_fields or None,
                    zoom_meeting_field_names=zm_fields or None,
                    zoom_attendance_field_names=za_fields or None,
                )
                payload["stages"]["A_assemble"]["execute_context"] = {
                    "program_instance_id": shared_execute_context.program_instance_id,
                    "school_year": shared_execute_context.school_year,
                    "week_count": len(shared_execute_context.weeks_by_id),
                }
            except (ValueError, AssertionError) as exc:
                payload["errors"].append(f"ExecuteContext build failed: {exc}")
                payload["stages"]["A_assemble"]["execute_context_error"] = str(exc)
                return payload

        for profile in PROFILE_ORDER:
            scenario = scenarios[profile]
            profile_payload: dict[str, Any] = {
                "ownership_namespace": profile_ownership_namespace(run_id, profile),
                "registry_run_id": profile_registry_run_id(run_id, profile),
            }

            reg = load_or_new_registry(
                run_id=profile_registry_run_id(run_id, profile),
                registry_dir=registry_dir,
                athlete_name=str(scenario.athlete.get("display_name") or profile),
                meta={
                    "shared_run_id": run_id,
                    "profile": profile,
                    "ownership_namespace": profile_ownership_namespace(run_id, profile),
                },
            )

            # Stage B + C — writer path (dry-plan when writes_allowed is False).
            # Per-profile SC-002 writer reuse is intentional — not CLI fall-through.
            try:
                # Per-profile context: clone shared PI/weeks; goal/band from this scenario.
                profile_ctx = shared_execute_context
                if shared_execute_context is not None:
                    profile_ctx = replace(
                        shared_execute_context,
                        goal_record_id=scenario.goal_record_id,
                        grade_band_id=scenario.grade_band_id,
                    )
                writer_result = _run_profile_writer(
                    scenario=scenario,
                    clock=clock,
                    run_id=run_id,
                    profile=profile,
                    registry_dir=registry_dir,
                    client=client,
                    allow_writes=writes_allowed,
                    execute=execute,
                    confirm=confirm,
                    confirm_disposable=confirm_disposable,
                    enable_email_delivery=enable_email_delivery,
                    acknowledge_clock_override=acknowledge_clock_override,
                    execute_context=profile_ctx,
                )
                profile_payload["B_create"] = writer_result
                profile_payload["C_activity"] = {
                    "status": "delegated_to_writer" if writes_allowed and execute else "planned",
                    "writer_status": writer_result.get("writer_status"),
                }
                # Writer owns the registry file on execute — reload before status stamp
                # so we do not clobber created record IDs with a stale empty registry.
                if writes_allowed and execute:
                    reg = load_or_new_registry(
                        run_id=profile_registry_run_id(run_id, profile),
                        registry_dir=registry_dir,
                        athlete_name=str(scenario.athlete.get("display_name") or profile),
                        meta={
                            "shared_run_id": run_id,
                            "profile": profile,
                            "ownership_namespace": profile_ownership_namespace(run_id, profile),
                        },
                    )
                reg.last_completed_step = "C_activity"
                if writes_allowed and execute and writer_result.get("errors"):
                    reg.status = "paused"
                    reg.pause_reason = "; ".join(str(e) for e in writer_result["errors"][:3])
                    save_registry(reg, registry_dir)
                    payload["errors"].append(
                        f"{profile}: " + "; ".join(str(e) for e in writer_result["errors"][:5])
                    )
                    profile_payload["H_cleanup_hooks"] = stage_h_cleanup_preview_hook(
                        run_id=run_id,
                        registry_dir=registry_dir,
                        client=client,
                        profile=profile,
                    )
                    payload["profile_results"][profile] = profile_payload
                    payload["stages"]["failure_cleanup_preview"] = profile_payload["H_cleanup_hooks"]
                    break
                reg.status = "running" if writes_allowed and execute else "planned"
                save_registry(reg, registry_dir)
            except (ExecuteAborted, ConfirmationError) as exc:
                profile_payload["error"] = str(exc)
                reg.status = "paused"
                reg.pause_reason = str(exc)
                save_registry(reg, registry_dir)
                payload["errors"].append(f"{profile}: {exc}")
                # Failure path: always run read-only cleanup preview + continue to Stage Z.
                profile_payload["H_cleanup_hooks"] = stage_h_cleanup_preview_hook(
                    run_id=run_id,
                    registry_dir=registry_dir,
                    client=client,
                    profile=profile,
                )
                payload["profile_results"][profile] = profile_payload
                payload["stages"]["failure_cleanup_preview"] = profile_payload["H_cleanup_hooks"]
                break

            # Stage D — observed-state XP settlement (live execute only).
            if writes_allowed and execute:
                settlement = stage_d_settlement_hook(
                    client,
                    reg,
                    run_id=run_id,
                    profile=profile,
                    allow_writes=False,
                    timeout_s=DEFAULT_PROFILE_SETTLEMENT_TIMEOUT_S,
                    poll_interval_s=DEFAULT_PROFILE_SETTLEMENT_POLL_S,
                )
                # Bounded safe re-arm for stuck latched rows, then re-poll once.
                stuck = ((settlement.get("result") or {}).get("stuck") or [])
                if stuck and not settlement.get("complete"):
                    rearm = run_rearm_submission_xp(
                        run_id=profile_registry_run_id(run_id, profile),
                        registry_dir=registry_dir,
                        client=client,
                        execute=True,
                        confirm=confirm,
                        confirm_disposable=confirm_disposable,
                        out_dir=out_dir,
                    )
                    settlement["rearm"] = rearm.to_dict()
                    settlement = stage_d_settlement_hook(
                        client,
                        reg,
                        run_id=run_id,
                        profile=profile,
                        allow_writes=False,
                        timeout_s=DEFAULT_PROFILE_SETTLEMENT_TIMEOUT_S,
                        poll_interval_s=DEFAULT_PROFILE_SETTLEMENT_POLL_S,
                    )
                    settlement["rearm_applied"] = True
                profile_payload["D_settlement"] = settlement
            else:
                profile_payload["D_settlement"] = {
                    "stage": "D_settlement",
                    "profile": profile,
                    "status": "planned",
                    "writes": False,
                    "complete": False,
                    "note": "Settlement runs only on gated live execute",
                }

            # Stage E — truthful reconcile (writer complete ≠ cascade complete).
            created_n = len(writer_result.get("created_records") or [])
            reconcile = stage_e_reconcile_hook(
                profile_payload.get("D_settlement"),
                profile=profile,
                writer_created=created_n,
            )
            if not writes_allowed or not execute:
                reconcile = {
                    **reconcile,
                    "status": "planned",
                    "complete": False,
                    "note": "Dry-plan: cascade reconcile deferred to live execute",
                    "errors": [],
                }
            profile_payload["E_reconcile"] = reconcile
            reg.last_completed_step = "E_reconcile"

            if writes_allowed and execute and not reconcile.get("complete"):
                reg.status = "paused"
                reg.pause_reason = "cascade_reconciliation_incomplete"
                save_registry(reg, registry_dir)
                payload["errors"].append(
                    f"{profile}: cascade incomplete — "
                    + "; ".join(reconcile.get("errors") or ["settlement failed"])
                )
                profile_payload["H_cleanup_hooks"] = stage_h_cleanup_preview_hook(
                    run_id=run_id,
                    registry_dir=registry_dir,
                    client=client,
                    profile=profile,
                )
                payload["profile_results"][profile] = profile_payload
                payload["stages"]["failure_cleanup_preview"] = profile_payload["H_cleanup_hooks"]
                # Stop before the next profile floods Automations 010/053 further.
                break

            profile_payload["F_formula_verify"] = stage_f_formula_verify_hook(
                client,
                expect_gated=acknowledge_clock_override,
                snapshot_bundle=(snapshot_result or {}).get("bundle"),
            )
            profile_payload["G_email_verify"] = _stage_stub(
                "G_email_verify", allow_writes=writes_allowed, profile=profile
            )
            profile_payload["H_cleanup_hooks"] = stage_h_cleanup_preview_hook(
                run_id=run_id,
                registry_dir=registry_dir,
                client=client,
                profile=profile,
            )
            if writes_allowed and execute:
                reg.status = "complete"
                reg.last_completed_step = "H_cleanup_hooks"
            save_registry(reg, registry_dir)
            payload["profile_results"][profile] = profile_payload

    finally:
        # Stage Z — guaranteed after --execute (success, refusal, failure, interrupt).
        if stage_z_required:
            payload["stages"]["Z_formula_restore"] = restore_production_formulas(
                client,
                allow_writes=False,
                confirm=confirm_for_formula or confirm,
                snapshot_bundle=(snapshot_result or {}).get("bundle"),
            )

        profiles_complete = sum(
            1
            for pr in payload["profile_results"].values()
            if (pr.get("E_reconcile") or {}).get("complete")
            or (
                not execute
                and (pr.get("B_create") or {}).get("mode") == "dry-plan"
            )
        )
        writer_only_complete = sum(
            1
            for pr in payload["profile_results"].values()
            if (pr.get("B_create") or {}).get("writer_status") == "complete"
        )
        cascade_ok = (
            bool(execute and writes_allowed and payload["gates_passed"])
            and profiles_complete == len(PROFILE_ORDER)
            and not payload["errors"]
        )
        payload["stages"]["Final"] = {
            "status": "complete" if cascade_ok else ("partial" if payload["profile_results"] else "failed"),
            "executed": bool(execute and writes_allowed and payload["gates_passed"]),
            "profile_count": len(payload["profile_results"]),
            "profiles_cascade_complete": profiles_complete,
            "profiles_writer_complete": writer_only_complete,
            "cascade_complete": cascade_ok,
            "truth": (
                "all_profiles_xp_reconciled"
                if cascade_ok
                else "writer_complete_is_not_simulation_success"
            ),
            "stage_z_required": stage_z_required,
        }
        payload["cascade_complete"] = cascade_ok

        payload["airtable_writes_performed"] = _count_client_writes(client) - writes_before

        out_dir.mkdir(parents=True, exist_ok=True)
        report_path = out_dir / f"execute-three-{run_id}.json"
        report_path.write_text(json.dumps(payload, indent=2, default=str) + "\n", encoding="utf-8")
        payload["report_path"] = str(report_path)

    return payload


__all__ = [
    "ExecuteThreeAborted",
    "PROFILE_ORDER",
    "profile_registry_run_id",
    "profile_ownership_namespace",
    "run_execute_three",
]
