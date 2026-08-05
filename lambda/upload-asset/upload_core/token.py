"""Cryptographically secure reviewer access tokens for private S3 viewer links."""

from __future__ import annotations

import hmac
import secrets


def generate_reviewer_token(*, nbytes: int = 32) -> str:
    """Return a URL-safe random token (base64url). At least 32 random bytes."""
    if nbytes < 32:
        raise ValueError("Reviewer tokens require at least 32 random bytes")
    return secrets.token_urlsafe(nbytes)


def resolve_reviewer_token(existing: object) -> tuple[str, bool]:
    """
    Preserve a nonblank existing token; otherwise mint a new one.

    Returns (token, created_new).
    """
    current = str(existing or "").strip()
    if current:
        return current, False
    return generate_reviewer_token(), True


def tokens_equal(provided: str | None, expected: str | None) -> bool:
    """Timing-safe compare when lengths match; otherwise False."""
    left = str(provided or "").strip()
    right = str(expected or "").strip()
    if not left or not right:
        return False
    if len(left) != len(right):
        return False
    return hmac.compare_digest(left.encode("utf-8"), right.encode("utf-8"))
