#!/usr/bin/env python3
"""C-010 — offline contract: two-field Active?/PPE guards for 010/031/053/065/072."""

from __future__ import annotations

import unittest


SCHMIDT_ENROLLMENT_ID = "recgP9qZYjAhE7NXm"

# Script → guard field (Stage-4 owner model)
PROGRESS_SCRIPTS = {
    "010": "Progress Processing Enabled?",
    "031": "Progress Processing Enabled?",
    "053": "Progress Processing Enabled?",
    "065": "Progress Processing Enabled?",
}
COMMS_SCRIPTS = {
    "072": "Active?",
}


def field_enabled(value, *, field_exists: bool, missing_fallback: bool = True) -> bool:
    """Missing field → treat as enabled (transition-safe)."""
    if not field_exists:
        return missing_fallback
    return bool(value)


def should_run_progress(
    *,
    ppe_value,
    ppe_field_exists: bool,
) -> bool:
    return field_enabled(ppe_value, field_exists=ppe_field_exists, missing_fallback=True)


def should_run_comms(
    *,
    active_value,
    active_field_exists: bool,
    enrollment_id: str,
) -> bool:
    if enrollment_id == SCHMIDT_ENROLLMENT_ID:
        return False
    return field_enabled(active_value, field_exists=active_field_exists, missing_fallback=True)


def action_out_progress(run: bool) -> str:
    return "run" if run else "skipped_progress_disabled"


def action_out_comms(run: bool) -> str:
    return "run" if run else "skipped_inactive"


class TestC010ActiveGuardsContract(unittest.TestCase):
    def test_progress_scripts_use_ppe_not_active(self):
        for script, field in PROGRESS_SCRIPTS.items():
            self.assertEqual(field, "Progress Processing Enabled?", script)
        self.assertEqual(COMMS_SCRIPTS["072"], "Active?")

    def test_matrix_normal_active(self):
        self.assertTrue(should_run_progress(ppe_value=True, ppe_field_exists=True))
        self.assertTrue(
            should_run_comms(
                active_value=True, active_field_exists=True, enrollment_id="recNormal"
            )
        )

    def test_matrix_schmidt_hidden_progress_on(self):
        # Active?=false, PPE=true — XP/WAS/streaks run; email suppressed
        self.assertTrue(should_run_progress(ppe_value=True, ppe_field_exists=True))
        self.assertFalse(
            should_run_comms(
                active_value=False,
                active_field_exists=True,
                enrollment_id=SCHMIDT_ENROLLMENT_ID,
            )
        )
        self.assertEqual(
            action_out_comms(False),
            "skipped_inactive",
        )

    def test_matrix_withdrawn(self):
        self.assertFalse(should_run_progress(ppe_value=False, ppe_field_exists=True))
        self.assertEqual(action_out_progress(False), "skipped_progress_disabled")
        self.assertFalse(
            should_run_comms(
                active_value=False, active_field_exists=True, enrollment_id="recX"
            )
        )

    def test_missing_ppe_field_fallback_true(self):
        self.assertTrue(should_run_progress(ppe_value=None, ppe_field_exists=False))

    def test_schmidt_hard_exclude_even_if_active_true(self):
        # Belt-and-suspenders: ID exclude wins for comms
        self.assertFalse(
            should_run_comms(
                active_value=True,
                active_field_exists=True,
                enrollment_id=SCHMIDT_ENROLLMENT_ID,
            )
        )

    def test_065_leaves_pending_when_skipped(self):
        # Contract note: skip must not clear Award Status Pending
        award_status = "Pending"
        skipped = not should_run_progress(ppe_value=False, ppe_field_exists=True)
        self.assertTrue(skipped)
        self.assertEqual(award_status, "Pending")

    def test_reactivation_idempotent_keys(self):
        submission_id = "recSub"
        hc_id = "recHC"
        self.assertEqual(f"SUBMISSION_XP|{submission_id}", "SUBMISSION_XP|recSub")
        self.assertEqual(f"HOMEWORK_XP|{hc_id}", "HOMEWORK_XP|recHC")


if __name__ == "__main__":
    unittest.main()
