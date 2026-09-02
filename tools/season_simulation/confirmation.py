"""Confirmation token gating for execute / cleanup."""

from __future__ import annotations

from .constants import (
    CONFIRM_CLEANUP_TOKEN,
    CONFIRM_DISPOSABLE_TOKEN,
    CONFIRM_TOKEN,
)


class ConfirmationError(RuntimeError):
    pass


def require_confirmation(
    *,
    execute: bool,
    confirm: str | None,
    action: str,
) -> None:
    if not execute:
        raise ConfirmationError(
            f"{action} requires --execute (dry-run is the default)"
        )
    if (confirm or "") != CONFIRM_TOKEN:
        raise ConfirmationError(
            f"{action} requires --confirm \"{CONFIRM_TOKEN}\" exactly; "
            f"got {confirm!r}"
        )


def require_execute_gates(
    *,
    execute: bool,
    confirm: str | None,
    confirm_disposable: str | None,
    simulation_id: str | None,
    action: str = "season simulation execute",
) -> None:
    """Execute requires --execute, --confirm, --confirm-disposable, and --simulation-id."""
    require_confirmation(execute=execute, confirm=confirm, action=action)
    if (confirm_disposable or "") != CONFIRM_DISPOSABLE_TOKEN:
        raise ConfirmationError(
            f"{action} requires --confirm-disposable \"{CONFIRM_DISPOSABLE_TOKEN}\" "
            f"exactly; got {confirm_disposable!r}"
        )
    sid = (simulation_id or "").strip()
    if not sid.startswith("SEASON-SIM-2027-"):
        raise ConfirmationError(
            f"{action} requires --simulation-id starting with SEASON-SIM-2027-; "
            f"got {simulation_id!r}"
        )


def require_cleanup_gates(
    *,
    execute: bool,
    confirm: str | None,
    confirm_cleanup: str | None,
    simulation_id: str | None,
    action: str = "season simulation cleanup",
) -> None:
    """Cleanup deletes require --execute, --confirm, --confirm-cleanup, and --simulation-id."""
    require_confirmation(execute=execute, confirm=confirm, action=action)
    if (confirm_cleanup or "") != CONFIRM_CLEANUP_TOKEN:
        raise ConfirmationError(
            f"{action} requires --confirm-cleanup \"{CONFIRM_CLEANUP_TOKEN}\" "
            f"exactly; got {confirm_cleanup!r}"
        )
    sid = (simulation_id or "").strip()
    if not sid.startswith("SEASON-SIM-2027-"):
        raise ConfirmationError(
            f"{action} requires --simulation-id / --run-id starting with "
            f"SEASON-SIM-2027-; got {simulation_id!r}"
        )


def is_confirmed(*, execute: bool, confirm: str | None) -> bool:
    return bool(execute) and (confirm or "") == CONFIRM_TOKEN


def is_execute_fully_gated(
    *,
    execute: bool,
    confirm: str | None,
    confirm_disposable: str | None,
    simulation_id: str | None,
) -> bool:
    try:
        require_execute_gates(
            execute=execute,
            confirm=confirm,
            confirm_disposable=confirm_disposable,
            simulation_id=simulation_id,
        )
        return True
    except ConfirmationError:
        return False
