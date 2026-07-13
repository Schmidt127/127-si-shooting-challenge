#!/usr/bin/env python3
"""C-010 Stage 5 — post-OMNI verification scenario mocks (offline, no Airtable)."""

from __future__ import annotations

import unittest

SCHMIDT_ENROLLMENT_ID = "recgP9qZYjAhE7NXm"


def should_process_progress(active: bool, progress_enabled: bool) -> bool:
    return progress_enabled


def should_send_comms(active: bool, enrollment_id: str) -> bool:
    if enrollment_id == SCHMIDT_ENROLLMENT_ID:
        return False
    return active


def reactivation_xp_guard(existing_keys: set[str], source_key: str) -> str:
    if source_key in existing_keys:
        return "skipped_no_duplicate"
    existing_keys.add(source_key)
    return "created"


class TestC010PostOmniScenarios(unittest.TestCase):
    def test_hidden_athlete_progress_continues(self):
        self.assertTrue(should_process_progress(active=False, progress_enabled=True))

    def test_hidden_athlete_comms_suppressed(self):
        self.assertFalse(should_send_comms(active=False, enrollment_id="recE1"))

    def test_withdrawn_progress_stops(self):
        self.assertFalse(should_process_progress(active=False, progress_enabled=False))

    def test_schmidt_comms_always_suppressed(self):
        self.assertFalse(should_send_comms(active=True, enrollment_id=SCHMIDT_ENROLLMENT_ID))

    def test_schmidt_progress_can_continue(self):
        self.assertTrue(should_process_progress(active=False, progress_enabled=True))

    def test_reactivation_no_duplicate_xp(self):
        keys: set[str] = set()
        key = "SUBMISSION|recS1"
        self.assertEqual(reactivation_xp_guard(keys, key), "created")
        self.assertEqual(reactivation_xp_guard(keys, key), "skipped_no_duplicate")


if __name__ == "__main__":
    unittest.main()
