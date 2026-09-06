"""Safe Submission Base XP re-arm for season-simulation records only.

Dry-run by default. Clears Last Reconciled Signature only when ownership of the
exact simulation run is proven and Active SUBMISSION_XP is missing for an
eligible countable submission. Never touches unknown / non-sim records.
Preserves 010 Source Key dedupe (does not create XP Events itself).
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .cascade_settlement import (
    classify_submission_xp_status,
    list_active_submission_xp_ids,
    snapshot_registry_submissions,
)
from .cleanup import three_athlete_registry_run_ids, validate_three_athlete_run_id
from .confirmation import ConfirmationError, require_execute_gates
from .constants import THREE_ATHLETE_RUN_SUFFIX
from .run_registry import RunRegistry, load_registry, registry_path, run_marker


@dataclass
class RearmCandidate:
    submission_id: str
    registry_run_id: str
    before_last_reconciled_signature: str
    before_reconciliation_needed: Any
    classification: str
    detail: str
    proposed_fields: dict[str, Any]
    owned: bool

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class RearmPlan:
    run_id: str
    dry_run: bool
    candidates: list[RearmCandidate] = field(default_factory=list)
    skipped: list[dict[str, Any]] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "run_id": self.run_id,
            "dry_run": self.dry_run,
            "candidate_count": len(self.candidates),
            "candidates": [c.to_dict() for c in self.candidates],
            "skipped": self.skipped,
            "errors": self.errors,
            "warnings": self.warnings,
        }


@dataclass
class RearmResult:
    run_id: str
    dry_run: bool
    applied: list[dict[str, Any]] = field(default_factory=list)
    plan: dict[str, Any] = field(default_factory=dict)
    errors: list[str] = field(default_factory=list)
    after_snapshot: list[dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _is_sim_owned_fields(fields: dict[str, Any], run_id: str) -> bool:
    """Prove disposable ownership via Season Sim gate + marker text."""
    marker = run_marker(run_id)
    # Profile registries use __athleteN suffix; Video Upload Note usually has shared
    # or profile marker. Accept either shared three-athlete run_id or exact registry id.
    note = str(fields.get("Video Upload Note") or "")
    sim_flag = fields.get("Season Sim Test Record?") is True
    if not sim_flag:
        return False
    if marker in note:
        return True
    # Shared three-athlete run: profile registry id embeds shared run_id.
    if THREE_ATHLETE_RUN_SUFFIX in run_id and run_id.split("__")[0] in note:
        return True
    # Also accept SEASON-SIM|<shared> without requiring exact profile suffix.
    shared = run_id.split("__")[0]
    if f"SEASON-SIM|{shared}" in note or shared in note:
        return True
    return False


def _registry_ids_for_run(run_id: str) -> list[str]:
    if THREE_ATHLETE_RUN_SUFFIX in run_id and "__" not in run_id:
        validate_three_athlete_run_id(run_id)
        return three_athlete_registry_run_ids(run_id)
    return [run_id]


def _load_owned_submission_ids(
    registry_dir: Path,
    run_id: str,
) -> tuple[dict[str, str], list[str], list[RunRegistry]]:
    """Map submission_id -> registry_run_id for owned registries only."""
    mapping: dict[str, str] = {}
    errors: list[str] = []
    regs: list[RunRegistry] = []
    found_any = False
    for reg_id in _registry_ids_for_run(run_id):
        path = registry_path(registry_dir, reg_id)
        if not path.exists():
            # Missing shared registry is OK for three-athlete; missing all is error.
            continue
        found_any = True
        try:
            reg = load_registry(registry_dir, reg_id)
        except Exception as exc:  # noqa: BLE001
            errors.append(str(exc))
            continue
        regs.append(reg)
        for rec in reg.records:
            if rec.table == "Submissions" and rec.record_id.startswith("rec"):
                mapping[rec.record_id] = reg_id
    if not found_any:
        errors.append(
            f"No local registry for run_id={run_id} under {registry_dir} — refuse re-arm"
        )
    return mapping, errors, regs


def build_rearm_plan(
    *,
    run_id: str,
    registry_dir: Path,
    client: Any,
) -> RearmPlan:
    """Build dry-run re-arm plan. Fail closed if ownership cannot be proven."""
    plan = RearmPlan(run_id=run_id, dry_run=True)
    if client is None:
        plan.errors.append("client required for re-arm planning")
        return plan

    owned_map, load_errors, regs = _load_owned_submission_ids(registry_dir, run_id)
    plan.errors.extend(load_errors)
    if plan.errors:
        return plan
    if not owned_map:
        plan.errors.append("No Submissions in local registries — refuse re-arm")
        return plan

    get_record = getattr(client, "get_record", None)
    list_records = getattr(client, "list_records", None)
    if not callable(get_record):
        plan.errors.append("client.get_record required")
        return plan

    # Prefer shared three-athlete run_id for marker checks.
    ownership_run_id = run_id.split("__")[0]

    for submission_id, reg_run_id in sorted(owned_map.items()):
        try:
            raw = get_record("Submissions", submission_id)
        except Exception as exc:  # noqa: BLE001
            plan.skipped.append(
                {
                    "submission_id": submission_id,
                    "reason": f"get_record failed: {exc}",
                }
            )
            continue
        fields = raw.get("fields") or {}
        if not _is_sim_owned_fields(fields, ownership_run_id) and not _is_sim_owned_fields(
            fields, reg_run_id
        ):
            plan.skipped.append(
                {
                    "submission_id": submission_id,
                    "reason": "ownership not proven (Season Sim Test Record? / marker)",
                }
            )
            continue

        active_ids: list[str] = []
        if callable(list_records):
            active_ids = list_active_submission_xp_ids(list_records, submission_id)

        status = classify_submission_xp_status(
            submission_id=submission_id,
            fields=fields,
            active_xp_ids=active_ids,
        )

        if status.classification == "settled":
            plan.skipped.append(
                {
                    "submission_id": submission_id,
                    "reason": "already has Active SUBMISSION_XP — no re-arm",
                }
            )
            continue
        if status.classification == "inapplicable":
            plan.skipped.append(
                {
                    "submission_id": submission_id,
                    "reason": status.detail or "inapplicable",
                }
            )
            continue
        if status.classification == "not_ready":
            plan.skipped.append(
                {
                    "submission_id": submission_id,
                    "reason": status.detail or "not_ready — fix links first",
                }
            )
            continue

        # pending or stuck → clear Last Reconciled Signature to re-match 010.
        # Do NOT clear Enrollment (that path races 010; use signature latch only).
        before_sig = status.last_reconciled_signature
        if not before_sig and status.classification == "pending":
            # Already Needed?=1 potentially — still propose a no-op-safe clear
            # only when a signature exists; otherwise skip (010 should still fire).
            plan.skipped.append(
                {
                    "submission_id": submission_id,
                    "reason": (
                        "pending with empty Last Reconciled Signature — "
                        "010 should already be eligible; wait/settle instead of re-arm"
                    ),
                }
            )
            continue

        plan.candidates.append(
            RearmCandidate(
                submission_id=submission_id,
                registry_run_id=reg_run_id,
                before_last_reconciled_signature=before_sig,
                before_reconciliation_needed=status.reconciliation_needed,
                classification=status.classification,
                detail=status.detail,
                proposed_fields={"Last Reconciled Signature": ""},
                owned=True,
            )
        )

    if not plan.candidates and not plan.skipped and not plan.errors:
        plan.warnings.append("No candidates and nothing skipped — unexpected empty plan")

    return plan


def run_rearm_submission_xp(
    *,
    run_id: str,
    registry_dir: Path,
    client: Any | None = None,
    execute: bool = False,
    confirm: str | None = None,
    confirm_disposable: str | None = None,
    out_dir: Path | None = None,
) -> RearmResult:
    """Dry-run by default. Live re-arm requires execute gates + owned candidates only."""
    plan = build_rearm_plan(run_id=run_id, registry_dir=registry_dir, client=client)
    if plan.errors:
        result = RearmResult(
            run_id=run_id,
            dry_run=True,
            plan=plan.to_dict(),
            errors=list(plan.errors),
        )
        _write_rearm_report(result, out_dir)
        return result

    if not execute:
        result = RearmResult(
            run_id=run_id,
            dry_run=True,
            plan=plan.to_dict(),
            errors=[],
        )
        _write_rearm_report(result, out_dir)
        return result

    try:
        require_execute_gates(
            execute=True,
            confirm=confirm,
            confirm_disposable=confirm_disposable,
            simulation_id=run_id.split("__")[0],
            action="season simulation submission XP re-arm",
        )
    except ConfirmationError as exc:
        result = RearmResult(
            run_id=run_id,
            dry_run=True,
            plan=plan.to_dict(),
            errors=[str(exc)],
        )
        _write_rearm_report(result, out_dir)
        return result

    if client is None:
        result = RearmResult(
            run_id=run_id,
            dry_run=True,
            plan=plan.to_dict(),
            errors=["client required for live re-arm"],
        )
        _write_rearm_report(result, out_dir)
        return result

    if hasattr(client, "allow_writes"):
        client.allow_writes = True

    applied: list[dict[str, Any]] = []
    errors: list[str] = []
    for cand in plan.candidates:
        if not cand.owned:
            errors.append(f"Refusing non-owned candidate {cand.submission_id}")
            continue
        # Re-verify ownership immediately before write (fail closed).
        try:
            raw = client.get_record("Submissions", cand.submission_id)
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{cand.submission_id}: re-fetch failed: {exc}")
            continue
        fields = raw.get("fields") or {}
        ownership_run_id = run_id.split("__")[0]
        if not _is_sim_owned_fields(fields, ownership_run_id) and not _is_sim_owned_fields(
            fields, cand.registry_run_id
        ):
            errors.append(f"{cand.submission_id}: ownership lost before write — skipped")
            continue
        before = str(fields.get("Last Reconciled Signature") or "")
        try:
            client.update_records(
                "Submissions",
                [{"id": cand.submission_id, "fields": dict(cand.proposed_fields)}],
            )
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{cand.submission_id}: update failed: {exc}")
            continue
        after_raw = client.get_record("Submissions", cand.submission_id)
        after_fields = after_raw.get("fields") or {}
        applied.append(
            {
                "submission_id": cand.submission_id,
                "before_last_reconciled_signature": before,
                "after_last_reconciled_signature": str(
                    after_fields.get("Last Reconciled Signature") or ""
                ),
                "proposed_fields": cand.proposed_fields,
            }
        )

    # After snapshot via registries
    after_snapshot: list[dict[str, Any]] = []
    _, _, regs = _load_owned_submission_ids(registry_dir, run_id)
    for reg in regs:
        try:
            after_snapshot.extend(
                s.to_dict() for s in snapshot_registry_submissions(client, reg)
            )
        except Exception as exc:  # noqa: BLE001
            errors.append(f"after-snapshot failed: {exc}")

    result = RearmResult(
        run_id=run_id,
        dry_run=False,
        applied=applied,
        plan=plan.to_dict(),
        errors=errors,
        after_snapshot=after_snapshot,
    )
    _write_rearm_report(result, out_dir)
    return result


def _write_rearm_report(result: RearmResult, out_dir: Path | None) -> None:
    if out_dir is None:
        return
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    path = out_dir / f"rearm-submission-xp-{result.run_id}-{stamp}.json"
    path.write_text(json.dumps(result.to_dict(), indent=2, default=str) + "\n", encoding="utf-8")


__all__ = [
    "RearmCandidate",
    "RearmPlan",
    "RearmResult",
    "build_rearm_plan",
    "run_rearm_submission_xp",
]
