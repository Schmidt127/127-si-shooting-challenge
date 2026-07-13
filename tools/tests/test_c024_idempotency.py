#!/usr/bin/env python3
"""C-024 Stage 2 — minimal idempotency guard tests (no live API)."""

from __future__ import annotations

import unittest


def apply_source_key_guard(existing_keys: set[str], source_key: str) -> str:
    """Mirror automation pattern: find-by-key → skip if exists → create if missing."""
    if source_key in existing_keys:
        return "skipped"
    existing_keys.add(source_key)
    return "created"


class TestC024Idempotency(unittest.TestCase):
    def test_repeated_operation_does_not_create_second_result(self) -> None:
        """First deliverable: one passing test proving rerun does not double-create."""
        keys: set[str] = set()
        outcomes: list[str] = []

        key = "VIDEO_SUBMISSION|recVF01"
        outcomes.append(apply_source_key_guard(keys, key))
        outcomes.append(apply_source_key_guard(keys, key))

        self.assertEqual(outcomes, ["created", "skipped"])
        self.assertEqual(len(keys), 1)


if __name__ == "__main__":
    unittest.main()
