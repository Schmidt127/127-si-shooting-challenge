#!/usr/bin/env python3
"""C-010 Stage 4 — enrollment lifecycle behavior mocks (offline, no Airtable)."""

from __future__ import annotations

import unittest


def should_show_on_leaderboard(active: bool) -> bool:
    return active


def should_send_parent_email(active: bool, is_schmidt_test: bool) -> bool:
    if is_schmidt_test:
        return False
    return active


def should_run_progress_calcs(progress_processing_enabled: bool) -> bool:
    return progress_processing_enabled


def should_create_xp_on_submission(progress_processing_enabled: bool, source_key_exists: bool) -> str:
    if not progress_processing_enabled:
        return "skipped_progress_disabled"
    if source_key_exists:
        return "skipped_existing_key"
    return "created"


def reactivation_xp_guard(existing_keys: set[str], source_key: str) -> str:
    """Reactivation must not double-award XP for same Source Key (C-024)."""
    if source_key in existing_keys:
        return "skipped_no_duplicate"
    existing_keys.add(source_key)
    return "created"


class TestC010EnrollmentLifecycle(unittest.TestCase):
    def test_hidden_athlete_suppressed_from_leaderboard(self):
        self.assertFalse(should_show_on_leaderboard(False))

    def test_hidden_athlete_suppresses_parent_email(self):
        self.assertFalse(should_send_parent_email(active=False, is_schmidt_test=False))

    def test_schmidt_test_suppresses_comms_even_if_active_checked(self):
        self.assertFalse(should_send_parent_email(active=True, is_schmidt_test=True))

    def test_hidden_athlete_progress_continues_when_processing_enabled(self):
        self.assertTrue(should_run_progress_calcs(progress_processing_enabled=True))

    def test_withdrawn_athlete_progress_stops(self):
        self.assertFalse(should_run_progress_calcs(progress_processing_enabled=False))

    def test_progress_disabled_skips_submission_xp(self):
        self.assertEqual(
            should_create_xp_on_submission(progress_processing_enabled=False, source_key_exists=False),
            "skipped_progress_disabled",
        )

    def test_reactivation_does_not_duplicate_xp(self):
        keys: set[str] = set()
        key = "SUBMISSION|recS1"
        self.assertEqual(reactivation_xp_guard(keys, key), "created")
        self.assertEqual(reactivation_xp_guard(keys, key), "skipped_no_duplicate")


if __name__ == "__main__":
    unittest.main()
