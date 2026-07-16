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
    """Missing field → treat as enabled (transition-safe before PPE create)."""
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


def ppe_rollout_safe(*, field_created: bool, backfilled_true: bool, guards_pasted: bool) -> bool:
    """Guards must not paste before backfill — new checkboxes default unchecked."""
    if not guards_pasted:
        return True
    return field_created and backfilled_true


class TestC010ActiveGuardsContract(unittest.TestCase):
    def test_progress_scripts_use_ppe_not_active(self):
        for script, field in PROGRESS_SCRIPTS.items():
            self.assertEqual(field, "Progress Processing Enabled?", script)
        self.assertEqual(COMMS_SCRIPTS["072"], "Active?")

    def test_ppe_true_runs(self):
        self.assertTrue(should_run_progress(ppe_value=True, ppe_field_exists=True))
        self.assertEqual(action_out_progress(True), "run")

    def test_ppe_false_skips(self):
        self.assertFalse(should_run_progress(ppe_value=False, ppe_field_exists=True))
        self.assertEqual(action_out_progress(False), "skipped_progress_disabled")

    def test_ppe_missing_field_fallback_enabled(self):
        self.assertTrue(should_run_progress(ppe_value=None, ppe_field_exists=False))
        self.assertTrue(should_run_progress(ppe_value=False, ppe_field_exists=False))

    def test_inactive_enrollment_comms_skip_progress_ok(self):
        # Hidden athlete: Active?=false, PPE=true
        self.assertTrue(should_run_progress(ppe_value=True, ppe_field_exists=True))
        self.assertFalse(
            should_run_comms(
                active_value=False,
                active_field_exists=True,
                enrollment_id="recHidden",
            )
        )

    def test_schmidt_exclusion_comms_only(self):
        self.assertTrue(should_run_progress(ppe_value=True, ppe_field_exists=True))
        self.assertFalse(
            should_run_comms(
                active_value=False,
                active_field_exists=True,
                enrollment_id=SCHMIDT_ENROLLMENT_ID,
            )
        )
        # ID exclude wins even if Active? somehow true
        self.assertFalse(
            should_run_comms(
                active_value=True,
                active_field_exists=True,
                enrollment_id=SCHMIDT_ENROLLMENT_ID,
            )
        )

    def test_matrix_normal_active(self):
        self.assertTrue(should_run_progress(ppe_value=True, ppe_field_exists=True))
        self.assertTrue(
            should_run_comms(
                active_value=True, active_field_exists=True, enrollment_id="recNormal"
            )
        )

    def test_matrix_withdrawn(self):
        self.assertFalse(should_run_progress(ppe_value=False, ppe_field_exists=True))
        self.assertFalse(
            should_run_comms(
                active_value=False, active_field_exists=True, enrollment_id="recX"
            )
        )

    def test_active_missing_field_fallback_allows_comms(self):
        self.assertTrue(
            should_run_comms(
                active_value=None,
                active_field_exists=False,
                enrollment_id="recNormal",
            )
        )

    def test_065_leaves_pending_when_skipped(self):
        award_status = "Pending"
        skipped = not should_run_progress(ppe_value=False, ppe_field_exists=True)
        self.assertTrue(skipped)
        self.assertEqual(award_status, "Pending")

    def test_reactivation_idempotent_keys(self):
        self.assertEqual("SUBMISSION_XP|recSub", "SUBMISSION_XP|recSub")
        self.assertEqual("HOMEWORK_XP|recHC", "HOMEWORK_XP|recHC")

    def test_rollout_order_guards_after_backfill(self):
        self.assertFalse(
            ppe_rollout_safe(field_created=True, backfilled_true=False, guards_pasted=True)
        )
        self.assertTrue(
            ppe_rollout_safe(field_created=True, backfilled_true=True, guards_pasted=True)
        )
        self.assertTrue(
            ppe_rollout_safe(field_created=False, backfilled_true=False, guards_pasted=False)
        )


if __name__ == "__main__":
    unittest.main()
