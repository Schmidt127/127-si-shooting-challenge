"""Formula snapshot / restore lifecycle for SC-001 three-athlete execute (Stage Z).

**Never use OMNI / in-base AI to generate or paste formulas.** OMNI has produced
``Unable to generate formula`` failures that leave fields invalid. Operators must
paste from ``tools/season_simulation/FORMULAS-TO-PASTE.txt`` or committed docs,
or use the Airtable Meta API / MCP ``update_field`` with **exact** formula text
from this repo (documented hooks only — not invoked by default in season sim).

Stage Z (restore Production-normal) must run on success, failure, and interrupt
whenever a temporary gated formula was installed.

Public hooks for ``execute_three.py``: ``snapshot_formulas``, ``restore_production_formulas``.
"""

from __future__ import annotations

import json
from contextlib import AbstractContextManager
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from .clock_override import (
    GATED_ACTIVITY_DATE_IS_FUTURE_FORMULA,
    PRODUCTION_ACTIVITY_DATE_IS_FUTURE_FORMULA,
    formula_text_has_season_sim_gate,
)
from .constants import CONFIRM_TOKEN

# Fail-closed: never accept OMNI / broken formula output.
OMNI_FORMULA_FAILURE_STRING = "Unable to generate formula"

MONITORED_FORMULA_FIELDS: tuple[tuple[str, str], ...] = (
    ("Submissions", "Activity Date Is Future?"),
    ("Submissions", "Submitted Same Day?"),
    ("Submissions", "Perfect Week Grace Eligible?"),
)

FORMULA_RESTORE_API_HOOK = {
    "tool": "plugin-airtable-airtable.update_field",
    "notes": (
        "Restore exact snapshot formula_text via update_field; verify resultType "
        "is formula and options.formula matches snapshot byte-for-byte. "
        "Do NOT use OMNI or natural-language formula generation."
    ),
    "required_payload_keys": ("baseId", "tableId", "fieldId", "formula"),
}


class FormulaLifecycleError(RuntimeError):
    """Formula snapshot/verify/restore refused (fail-closed)."""


@dataclass(frozen=True)
class FormulaFieldSnapshot:
    table: str
    field_name: str
    field_id: str
    formula_text: str
    captured_at: str
    result_type: str = "formula"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "FormulaFieldSnapshot":
        return cls(
            table=str(data["table"]),
            field_name=str(data["field_name"]),
            field_id=str(data.get("field_id") or ""),
            formula_text=str(data["formula_text"]),
            captured_at=str(data.get("captured_at") or ""),
            result_type=str(data.get("result_type") or "formula"),
        )


@dataclass
class FormulaSnapshotBundle:
    snapshots: list[FormulaFieldSnapshot]
    base_id: str = ""
    git_sha: str = ""
    run_id: str = ""
    notes: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "base_id": self.base_id,
            "git_sha": self.git_sha,
            "run_id": self.run_id,
            "notes": list(self.notes),
            "snapshots": [s.to_dict() for s in self.snapshots],
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "FormulaSnapshotBundle":
        return cls(
            snapshots=[
                FormulaFieldSnapshot.from_dict(row)
                for row in (data.get("snapshots") or [])
            ],
            base_id=str(data.get("base_id") or ""),
            git_sha=str(data.get("git_sha") or ""),
            run_id=str(data.get("run_id") or ""),
            notes=list(data.get("notes") or []),
        )


@dataclass
class FormulaVerifyResult:
    ok: bool
    production_normal: bool
    gated_detected: bool
    field_results: dict[str, dict[str, Any]]
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class StageZRestoreResult:
    attempted: bool
    dry_run: bool
    restored_fields: list[str]
    errors: list[str]
    hooks: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _require_formula_confirm(*, allow_writes: bool, confirm: str | None, action: str) -> None:
    if not allow_writes:
        return
    if (confirm or "") != CONFIRM_TOKEN:
        raise FormulaLifecycleError(
            f"{action} requires allow_writes with --confirm \"{CONFIRM_TOKEN}\" exactly; "
            f"got {confirm!r}"
        )


def reject_invalid_formula_text(formula_text: str | None, *, field_name: str) -> None:
    text = (formula_text or "").strip()
    if not text:
        raise FormulaLifecycleError(
            f"Formula for {field_name!r} is empty — refuse install/restore"
        )
    if OMNI_FORMULA_FAILURE_STRING in text:
        raise FormulaLifecycleError(
            f"Formula for {field_name!r} contains OMNI failure "
            f"{OMNI_FORMULA_FAILURE_STRING!r} — refuse (paste from repo docs)"
        )


def _field_from_meta(
    meta_tables: list[dict[str, Any]],
    table_name: str,
    field_name: str,
) -> dict[str, Any] | None:
    for table in meta_tables:
        if table.get("name") != table_name:
            continue
        for fld in table.get("fields") or []:
            if fld.get("name") == field_name:
                return fld
    return None


def _meta_tables_from_client(client: Any | None) -> list[dict[str, Any]]:
    if client is None:
        return []
    getter = getattr(client, "meta_tables", None)
    if not callable(getter):
        return []
    try:
        return list(getter() or [])
    except Exception:  # noqa: BLE001
        return []


def snapshot_formulas_from_meta(
    meta_tables: list[dict[str, Any]],
    *,
    base_id: str = "",
    git_sha: str = "",
    run_id: str = "",
    fields: tuple[tuple[str, str], ...] = MONITORED_FORMULA_FIELDS,
) -> FormulaSnapshotBundle:
    """Read-only snapshot of exact Production formula text before temporary paste."""
    captured_at = datetime.now(timezone.utc).isoformat()
    snapshots: list[FormulaFieldSnapshot] = []
    notes: list[str] = []

    for table_name, field_name in fields:
        fld = _field_from_meta(meta_tables, table_name, field_name)
        if fld is None:
            notes.append(f"Missing field {table_name}.{field_name} — skipped")
            continue
        opts = fld.get("options") or {}
        formula_text = str(opts.get("formula") or "")
        reject_invalid_formula_text(formula_text, field_name=field_name)
        snapshots.append(
            FormulaFieldSnapshot(
                table=table_name,
                field_name=field_name,
                field_id=str(fld.get("id") or ""),
                formula_text=formula_text,
                captured_at=captured_at,
                result_type=str(fld.get("type") or "formula"),
            )
        )

    return FormulaSnapshotBundle(
        snapshots=snapshots,
        base_id=base_id,
        git_sha=git_sha,
        run_id=run_id,
        notes=notes,
    )


def snapshot_formulas(
    client: Any | None,
    *,
    allow_writes: bool = False,
    confirm: str | None = None,
    run_id: str = "",
) -> dict[str, Any]:
    """Stage 0 hook — capture Production formula text before temporary gate paste.

    Read-only by default. Refuses live schema writes (fail-closed).
    """
    _require_formula_confirm(
        allow_writes=allow_writes,
        confirm=confirm,
        action="formula snapshot",
    )
    if allow_writes:
        raise FormulaLifecycleError(
            "snapshot_formulas refuses live writes — read-only Meta snapshot only"
        )

    meta_tables = _meta_tables_from_client(client)
    base_id = str(getattr(client, "base_id", "") or "")
    bundle = snapshot_formulas_from_meta(
        meta_tables,
        base_id=base_id,
        run_id=run_id,
    )
    return {
        "status": "ok" if bundle.snapshots else "partial",
        "snapshotted": bool(bundle.snapshots),
        "client_present": client is not None,
        "field_count": len(bundle.snapshots),
        "bundle": bundle.to_dict(),
        "notes": list(bundle.notes),
        "prohibit_omni_formula_generation": True,
    }


def save_formula_snapshot(bundle: FormulaSnapshotBundle, path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(bundle.to_dict(), indent=2) + "\n", encoding="utf-8")
    return path


def load_formula_snapshot(path: Path) -> FormulaSnapshotBundle:
    data = json.loads(path.read_text(encoding="utf-8"))
    return FormulaSnapshotBundle.from_dict(data)


def verify_formula_state(
    meta_tables: list[dict[str, Any]],
    *,
    expect_production_normal: bool = True,
    expect_gated: bool = False,
    baseline: FormulaSnapshotBundle | None = None,
) -> FormulaVerifyResult:
    """Verify live formula text is valid and matches expected mode."""
    field_results: dict[str, dict[str, Any]] = {}
    errors: list[str] = []
    warnings: list[str] = []
    gated_any = False
    production_any = False

    for table_name, field_name in MONITORED_FORMULA_FIELDS:
        key = f"{table_name}.{field_name}"
        fld = _field_from_meta(meta_tables, table_name, field_name)
        if fld is None:
            field_results[key] = {"present": False}
            if field_name == "Activity Date Is Future?":
                errors.append(f"Missing required formula field {key}")
            continue

        opts = fld.get("options") or {}
        formula_text = str(opts.get("formula") or "")
        try:
            reject_invalid_formula_text(formula_text, field_name=field_name)
        except FormulaLifecycleError as exc:
            errors.append(str(exc))
            field_results[key] = {"present": True, "valid": False, "error": str(exc)}
            continue

        is_gated = formula_text_has_season_sim_gate(formula_text)
        is_production = _is_production_activity_future_formula(field_name, formula_text)
        if is_gated:
            gated_any = True
        if is_production:
            production_any = True

        field_results[key] = {
            "present": True,
            "valid": True,
            "gated": is_gated,
            "production_normal": is_production,
            "length": len(formula_text),
        }

        if baseline:
            snap = next(
                (s for s in baseline.snapshots if s.field_name == field_name),
                None,
            )
            if snap and snap.formula_text != formula_text:
                warnings.append(
                    f"{key} differs from snapshot captured at {snap.captured_at}"
                )

    if expect_production_normal and gated_any:
        errors.append(
            "Production-normal required but Season Sim gate detected in formula text"
        )
    if expect_gated and not gated_any:
        errors.append(
            "Gated formula expected but Season Sim gate not detected "
            "(verify paste from FORMULAS-TO-PASTE.txt — not OMNI)"
        )

    ok = not errors
    production_normal = production_any and not gated_any
    return FormulaVerifyResult(
        ok=ok,
        production_normal=production_normal,
        gated_detected=gated_any,
        field_results=field_results,
        errors=errors,
        warnings=warnings,
    )


def stage_f_formula_verify_hook(
    client: Any | None,
    *,
    expect_gated: bool = False,
    snapshot_bundle: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Stage F hook for execute-three — read-only formula verification."""
    meta_tables = _meta_tables_from_client(client)
    baseline = None
    if snapshot_bundle:
        baseline = FormulaSnapshotBundle.from_dict(snapshot_bundle)
    verify = verify_formula_state(
        meta_tables,
        expect_production_normal=not expect_gated,
        expect_gated=expect_gated,
        baseline=baseline,
    )
    return {
        "stage": "F_formula_verify",
        "status": "ok" if verify.ok else "failed",
        "writes": False,
        "verify": verify.to_dict(),
    }


def _is_production_activity_future_formula(field_name: str, formula_text: str) -> bool:
    if field_name != "Activity Date Is Future?":
        return not formula_text_has_season_sim_gate(formula_text)
    normalized = " ".join(formula_text.split())
    prod = " ".join(PRODUCTION_ACTIVITY_DATE_IS_FUTURE_FORMULA.split())
    return prod in normalized or (
        "NOW()" in normalized
        and "Season Sim" not in normalized
        and "SEASON-SIM|" not in normalized
    )


def install_formula_hooks(
    *,
    bundle: FormulaSnapshotBundle | None = None,
    target_mode: str = "gated",
) -> dict[str, Any]:
    """Document install hooks for temporary gated formulas — never writes live."""
    gated_targets = {
        "Submissions.Activity Date Is Future?": GATED_ACTIVITY_DATE_IS_FUTURE_FORMULA,
    }
    return {
        "executed": False,
        "target_mode": target_mode,
        "prohibit_omni_formula_generation": True,
        "omni_failure_marker": OMNI_FORMULA_FAILURE_STRING,
        "gated_formula_templates": gated_targets,
        "restore_api_hook": FORMULA_RESTORE_API_HOOK,
        "baseline_snapshot": bundle.to_dict() if bundle else None,
        "operator_steps": [
            "Snapshot Production formulas (snapshot_formulas) before any paste",
            "Paste exact text from tools/season_simulation/FORMULAS-TO-PASTE.txt",
            "Re-run verify_formula_state(expect_gated=True)",
            "On closeout/interrupt: restore_production_formulas / restore_stage_z",
        ],
    }


def restore_stage_z(
    bundle: FormulaSnapshotBundle,
    *,
    client: Any | None = None,
    dry_run: bool = True,
    reason: str = "stage_z_closeout",
) -> StageZRestoreResult:
    """Restore Production-normal formulas from snapshot (Stage Z)."""
    restored: list[str] = []
    errors: list[str] = []

    for snap in bundle.snapshots:
        key = f"{snap.table}.{snap.field_name}"
        try:
            reject_invalid_formula_text(snap.formula_text, field_name=snap.field_name)
        except FormulaLifecycleError as exc:
            errors.append(str(exc))
            continue

        if dry_run or client is None:
            restored.append(key)
            continue

        writer = getattr(client, "update_formula_field", None)
        if not callable(writer):
            errors.append(
                f"No update_formula_field on client — Stage Z dry-run only for {key}"
            )
            continue
        try:
            writer(snap.table, snap.field_name, snap.formula_text)
            restored.append(key)
        except Exception as exc:  # noqa: BLE001
            errors.append(f"Restore failed for {key}: {exc}")

    return StageZRestoreResult(
        attempted=True,
        dry_run=dry_run or client is None,
        restored_fields=restored,
        errors=errors,
        hooks={
            **FORMULA_RESTORE_API_HOOK,
            "reason": reason,
            "snapshot_run_id": bundle.run_id,
        },
    )


def restore_production_formulas(
    client: Any | None,
    *,
    allow_writes: bool = False,
    confirm: str | None = None,
    snapshot_bundle: dict[str, Any] | FormulaSnapshotBundle | None = None,
    reason: str = "stage_z_closeout",
) -> dict[str, Any]:
    """Stage Z hook — restore Production-normal formulas after sim execute.

    Default dry-run. Pass ``snapshot_bundle`` from Stage 0 ``snapshot_formulas`` result.
    """
    _require_formula_confirm(
        allow_writes=allow_writes,
        confirm=confirm,
        action="formula restore",
    )

    bundle: FormulaSnapshotBundle | None = None
    if isinstance(snapshot_bundle, FormulaSnapshotBundle):
        bundle = snapshot_bundle
    elif isinstance(snapshot_bundle, dict) and snapshot_bundle.get("snapshots"):
        bundle = FormulaSnapshotBundle.from_dict(snapshot_bundle)
    elif isinstance(snapshot_bundle, dict) and snapshot_bundle.get("bundle"):
        bundle = FormulaSnapshotBundle.from_dict(snapshot_bundle["bundle"])

    if bundle is None or not bundle.snapshots:
        return {
            "status": "skipped",
            "restored": False,
            "dry_run": True,
            "client_present": client is not None,
            "note": "No snapshot bundle — Stage Z restore skipped (nothing to restore)",
            "errors": [],
        }

    if allow_writes:
        raise FormulaLifecycleError(
            "restore_production_formulas refuses live writes — use Mike-authorized "
            "Meta API restore with dry_run=False when implemented"
        )

    result = restore_stage_z(
        bundle,
        client=client,
        dry_run=True,
        reason=reason,
    )
    return {
        "status": "ok" if not result.errors else "failed",
        "restored": bool(result.restored_fields),
        "dry_run": result.dry_run,
        "client_present": client is not None,
        "restored_fields": list(result.restored_fields),
        "errors": list(result.errors),
        "hooks": result.hooks,
    }


class FormulaLifecycleContext(AbstractContextManager["FormulaLifecycleContext"]):
    """Context manager — Stage Z restore on __exit__ (always, including errors)."""

    def __init__(
        self,
        bundle: FormulaSnapshotBundle,
        *,
        restore_fn: Callable[..., StageZRestoreResult] | None = None,
        dry_run: bool = True,
        client: Any | None = None,
    ) -> None:
        self.bundle = bundle
        self.restore_fn = restore_fn or restore_stage_z
        self.dry_run = dry_run
        self.client = client
        self.restore_result: StageZRestoreResult | None = None

    def __enter__(self) -> "FormulaLifecycleContext":
        return self

    def __exit__(self, exc_type, exc, tb) -> bool:
        reason = "stage_z_success" if exc_type is None else "stage_z_failure_or_interrupt"
        self.restore_result = self.restore_fn(
            self.bundle,
            client=self.client,
            dry_run=self.dry_run,
            reason=reason,
        )
        return False


__all__ = [
    "FormulaLifecycleError",
    "FormulaFieldSnapshot",
    "FormulaSnapshotBundle",
    "FormulaVerifyResult",
    "StageZRestoreResult",
    "OMNI_FORMULA_FAILURE_STRING",
    "MONITORED_FORMULA_FIELDS",
    "snapshot_formulas",
    "snapshot_formulas_from_meta",
    "restore_production_formulas",
    "restore_stage_z",
    "verify_formula_state",
    "stage_f_formula_verify_hook",
    "install_formula_hooks",
    "FormulaLifecycleContext",
    "reject_invalid_formula_text",
    "save_formula_snapshot",
    "load_formula_snapshot",
]

def snapshot_formulas(
    client: Any | None,
    *,
    allow_writes: bool = False,
    confirm: str | None = None,
) -> dict[str, Any]:
    """A1 execute-three Stage 0 hook — read-only snapshot when client has meta.

    Never writes. ``allow_writes`` / ``confirm`` reserved for future live paste.
    """
    del confirm  # reserved
    if allow_writes:
        raise FormulaLifecycleError(
            "snapshot_formulas refuses live schema writes — use documented Meta API paste"
        )
    if client is None:
        return {
            "status": "skipped",
            "snapshotted": False,
            "client_present": False,
            "note": "No client — dry-plan Stage 0",
        }
    meta_fn = getattr(client, "meta_tables", None)
    if not callable(meta_fn):
        return {
            "status": "skipped",
            "snapshotted": False,
            "client_present": True,
            "note": "Client has no meta_tables — snapshot deferred",
        }
    try:
        tables = meta_fn()
        bundle = snapshot_formulas_from_meta(tables, run_id="stage0-preview")
        return {
            "status": "ok",
            "snapshotted": True,
            "client_present": True,
            "bundle": bundle.to_dict(),
        }
    except Exception as exc:  # noqa: BLE001
        return {
            "status": "error",
            "snapshotted": False,
            "client_present": True,
            "error": str(exc),
        }


def restore_production_formulas(
    client: Any | None,
    *,
    allow_writes: bool = False,
    confirm: str | None = None,
) -> dict[str, Any]:
    """A1 execute-three Stage Z hook — dry-run restore documentation by default.

    Live restore requires allow_writes + explicit future authorization path via
    ``restore_stage_z`` with a saved FormulaSnapshotBundle.
    """
    del confirm
    if allow_writes:
        raise FormulaLifecycleError(
            "restore_production_formulas refuses unconstrained live writes — "
            "call restore_stage_z(bundle, dry_run=False) only when authorized"
        )
    return {
        "status": "dry_run",
        "restored": False,
        "client_present": client is not None,
        "hooks": FORMULA_RESTORE_API_HOOK,
        "note": "Stage Z documented; no formula mutation without saved snapshot + authorization",
    }
