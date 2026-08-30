"""Confirmation token gating for execute / cleanup."""

from __future__ import annotations

from .constants import CONFIRM_TOKEN


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


def is_confirmed(*, execute: bool, confirm: str | None) -> bool:
    return bool(execute) and (confirm or "") == CONFIRM_TOKEN
