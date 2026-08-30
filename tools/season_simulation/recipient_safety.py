"""Email recipient safety — never deliver outside the allowlist."""

from __future__ import annotations

from dataclasses import dataclass

from .constants import SAFE_EMAIL_RECIPIENT


@dataclass(frozen=True)
class RecipientDecision:
    ok: bool
    recipient: str
    reason: str


def normalize_email(value: str | None) -> str:
    return (value or "").strip().lower()


def assert_safe_recipient(recipient: str | None) -> str:
    """Raise on incorrect recipient. Empty is also rejected for live delivery."""
    email = normalize_email(recipient)
    if not email:
        raise ValueError("Email recipient is empty — refusing send")
    if email != SAFE_EMAIL_RECIPIENT.lower():
        raise ValueError(
            f"Unsafe email recipient {email!r}; only "
            f"{SAFE_EMAIL_RECIPIENT!r} is allowed for season simulation"
        )
    return email


def evaluate_recipient(recipient: str | None) -> RecipientDecision:
    try:
        email = assert_safe_recipient(recipient)
        return RecipientDecision(ok=True, recipient=email, reason="allowlisted")
    except ValueError as exc:
        return RecipientDecision(
            ok=False,
            recipient=normalize_email(recipient),
            reason=str(exc),
        )


def resolve_simulation_recipient(
    *,
    enrollment_parent_email: str | None,
    force_safe: bool = True,
) -> RecipientDecision:
    """Resolve the outbound recipient for Athlete 1.

    When ``force_safe`` is True (default), always use SAFE_EMAIL_RECIPIENT and
    refuse if enrollment parent email is set to anything else (integrity stop).
    """
    parent = normalize_email(enrollment_parent_email)
    if force_safe:
        if parent and parent != SAFE_EMAIL_RECIPIENT.lower():
            return RecipientDecision(
                ok=False,
                recipient=parent,
                reason=(
                    "Enrollment Parent Email is not the simulation allowlist address; "
                    "refusing to proceed to avoid accidental delivery"
                ),
            )
        return RecipientDecision(
            ok=True,
            recipient=SAFE_EMAIL_RECIPIENT.lower(),
            reason="forced_safe_allowlist",
        )
    return evaluate_recipient(parent or SAFE_EMAIL_RECIPIENT)
