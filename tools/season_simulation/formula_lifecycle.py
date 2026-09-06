"""Formula snapshot / restore lifecycle for SC-001 three-athlete execute (Stage Z).

Agent 3 owns full Production formula paste/restore. This module provides fail-closed
stubs so execute-three orchestration and offline tests can import stable hooks.
"""

from __future__ import annotations

from typing import Any

from .confirmation import ConfirmationError
from .constants import CONFIRM_TOKEN


class FormulaLifecycleError(RuntimeError):
    pass


def _require_formula_confirm(*, allow_writes: bool, confirm: str | None, action: str) -> None:
    if not allow_writes:
        return
    if (confirm or "") != CONFIRM_TOKEN:
        raise FormulaLifecycleError(
            f"{action} requires allow_writes with --confirm \"{CONFIRM_TOKEN}\" exactly; "
            f"got {confirm!r}"
        )


def snapshot_formulas(
    client: Any | None,
    *,
    allow_writes: bool = False,
    confirm: str | None = None,
) -> dict[str, Any]:
    """Stage 0 hook — capture Production formula text before temporary gate paste.

    Stub: records intent only; no Airtable schema writes unless Agent 3 implements.
    """
    _require_formula_confirm(
        allow_writes=allow_writes,
        confirm=confirm,
        action="formula snapshot",
    )
    if allow_writes:
        raise FormulaLifecycleError(
            "snapshot_formulas stub refuses live writes — Agent 3 implements Production snapshot"
        )
    return {
        "status": "stub",
        "snapshotted": False,
        "client_present": client is not None,
        "note": "Agent 3 implements Production formula snapshot",
    }


def restore_production_formulas(
    client: Any | None,
    *,
    allow_writes: bool = False,
    confirm: str | None = None,
) -> dict[str, Any]:
    """Stage Z hook — restore Production-normal formulas after sim execute.

    Stub: fail-closed; refuses writes without confirm even when Agent 3 lands logic.
    """
    _require_formula_confirm(
        allow_writes=allow_writes,
        confirm=confirm,
        action="formula restore",
    )
    if allow_writes:
        raise FormulaLifecycleError(
            "restore_production_formulas stub refuses live writes — Agent 3 implements restore"
        )
    return {
        "status": "stub",
        "restored": False,
        "client_present": client is not None,
        "note": "Agent 3 implements Production formula restore",
    }


__all__ = [
    "FormulaLifecycleError",
    "snapshot_formulas",
    "restore_production_formulas",
]
