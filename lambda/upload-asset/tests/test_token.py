#!/usr/bin/env python3
"""Tests for reviewer access tokens."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from upload_core.token import generate_reviewer_token, resolve_reviewer_token, tokens_equal


class TokenTests(unittest.TestCase):
    def test_generate_urlsafe_and_long_enough(self):
        token = generate_reviewer_token()
        self.assertGreaterEqual(len(token), 40)
        self.assertTrue(all(c.isalnum() or c in "-_" for c in token))

    def test_generate_rejects_small_nbytes(self):
        with self.assertRaises(ValueError):
            generate_reviewer_token(nbytes=16)

    def test_resolve_creates_when_blank(self):
        token, created = resolve_reviewer_token("")
        self.assertTrue(created)
        self.assertTrue(token)

    def test_resolve_preserves_existing(self):
        token, created = resolve_reviewer_token("abc-existing-token")
        self.assertFalse(created)
        self.assertEqual(token, "abc-existing-token")

    def test_tokens_equal_timing_safe(self):
        self.assertTrue(tokens_equal("same-token", "same-token"))
        self.assertFalse(tokens_equal("same-token", "diff-token"))
        self.assertFalse(tokens_equal("short", "longer-value"))
        self.assertFalse(tokens_equal("", "x"))
        self.assertFalse(tokens_equal(None, "x"))


if __name__ == "__main__":
    unittest.main()
