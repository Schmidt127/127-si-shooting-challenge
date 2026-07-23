#!/usr/bin/env python3
"""Active? processing + Schmidt contract tests — SC-068/069 + SC-146 portion."""

from __future__ import annotations

import json
import unittest
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "tools" / "enrollment-season"))

from active_guard_contract import (  # noqa: E402
    SCHMIDT_ENROLLMENT_ID,
    audit_consumers,
    schmidt_expected_state,
    should_run_comms_foundation_reset,
    should_run_progress,
)

FIX = ROOT / "tests" / "fixtures" / "enrollment-season"


class TestActiveGuards(unittest.TestCase):
    def test_consumer_inventory(self):
        data = json.loads((FIX / "active-guard-consumers.json").read_text(encoding="utf-8"))
        consumers = audit_consumers()
        ids = {c["consumer"] for c in consumers}
        for expected in data["expectedConsumerIds"]:
            self.assertIn(expected, ids)

    def test_ppe_progress_matrix(self):
        self.assertTrue(should_run_progress(ppe_value=True, ppe_field_exists=True))
        self.assertFalse(should_run_progress(ppe_value=False, ppe_field_exists=True))
        self.assertTrue(should_run_progress(ppe_value=False, ppe_field_exists=False))

    def test_foundation_reset_comms_allows_schmidt_when_active(self):
        result = should_run_comms_foundation_reset(
            active_value=True,
            active_field_exists=True,
            enrollment_id=SCHMIDT_ENROLLMENT_ID,
            apply_schmidt_hard_exclude=False,
        )
        self.assertTrue(result["allow"])

    def test_legacy_hard_exclude_flagged_as_conflict(self):
        result = should_run_comms_foundation_reset(
            active_value=True,
            active_field_exists=True,
            enrollment_id=SCHMIDT_ENROLLMENT_ID,
            apply_schmidt_hard_exclude=True,
        )
        self.assertFalse(result["allow"])
        self.assertTrue(result["directionConflict"])


class TestSchmidtContract(unittest.TestCase):
    def test_fixture_matches_helper(self):
        fixture = json.loads((FIX / "schmidt-contract.json").read_text(encoding="utf-8"))
        state = schmidt_expected_state()
        self.assertEqual(fixture["enrollmentId"], state["enrollmentId"])
        self.assertTrue(state["active"])
        self.assertTrue(state["publiclyVisible"])
        self.assertFalse(state["createExclusionRule"])
        self.assertEqual(fixture["enrollmentId"], "recgP9qZYjAhE7NXm")


if __name__ == "__main__":
    unittest.main()
