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
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

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
from .cleanup import stage_h_cleanup_preview_hook
from .run_registry import load_registry, save_registry
from .writer import load_or_new_registry
from .scenario_base import athlete_marker
from .simulation_clock import SimulationClock
from .three_athlete import build_three_athlete_scenarios

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
    if not allow_writes or not execute:
        intended = build_intended_writes(scenario, clock, ctx=execute_context)
        return {
            "mode": "dry-plan",
            "profile": profile,
            "registry_run_id": reg_run_id,
            "ownership_namespace": profile_ownership_namespace(run_id, profile),
            "intended_write_count": len(intended),
            "write_readiness": summarize_intended_write_readiness(intended),
        }

    result = run_execute(
        scenario=scenario,
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
            "reference_meta": ref_meta,
            "ownership_namespaces": {
                p: profile_ownership_namespace(run_id, p) for p in PROFILE_ORDER
            },
        }

        if client is not None and writes_allowed:
            if hasattr(client, "allow_writes"):
                client.allow_writes = True

        stage_runners: list[tuple[str, Callable[..., dict[str, Any]]]] = [
            ("B_create", lambda **kw: _stage_stub("B_create", **kw)),
            ("C_activity", lambda **kw: _stage_stub("C_activity", **kw)),
            ("D_settlement", lambda **kw: _stage_stub("D_settlement", **kw)),
            ("E_reconcile", lambda **kw: _stage_stub("E_reconcile", **kw)),
            (
                "F_formula_verify",
                lambda **kw: stage_f_formula_verify_hook(
                    client,
                    expect_gated=acknowledge_clock_override,
                    snapshot_bundle=(snapshot_result or {}).get("bundle"),
                ),
            ),
            ("G_email_verify", lambda **kw: _stage_stub("G_email_verify", **kw)),
            (
                "H_cleanup_hooks",
                lambda **kw: stage_h_cleanup_preview_hook(
                    run_id=run_id,
                    registry_dir=registry_dir,
                    client=client,
                    profile=kw.get("profile"),
                ),
            ),
        ]

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
                    execute_context=execute_context,
                )
                profile_payload["B_create"] = writer_result
                profile_payload["C_activity"] = {
                    "status": "delegated_to_writer" if writes_allowed and execute else "planned",
                    "writer_status": writer_result.get("writer_status"),
                }
                reg.last_completed_step = "C_activity"
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

            for stage_name, runner in stage_runners[2:]:
                hook = runner(allow_writes=writes_allowed, profile=profile)
                profile_payload[stage_name] = hook
                reg.last_completed_step = stage_name
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

        payload["stages"]["Final"] = {
            "status": "complete" if not payload["errors"] else "partial",
            "executed": bool(execute and writes_allowed and payload["gates_passed"]),
            "profile_count": len(payload["profile_results"]),
            "stage_z_required": stage_z_required,
        }

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
