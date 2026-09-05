"""Unit tests for SC-167 submission XP duplicate expectations."""

from __future__ import annotations

import unittest

from season_simulation.expectations_submission_xp import (
    assert_no_award_bearing_submission_xp_duplicates,
    find_submission_xp_duplicate_groups,
)


class TestSubmissionXpExpectations(unittest.TestCase):
    def test_unique_keys_pass(self):
        report = find_submission_xp_duplicate_groups(
            [
                {"id": "a", "source_key": "SUBMISSION_XP|rec1", "active": True},
                {"id": "b", "source_key": "SUBMISSION_XP|rec2", "active": True},
            ]
        )
        self.assertEqual(report["unique_keys"], 2)
        self.assertFalse(report["has_duplicates"])

    def test_detects_season_sim_style_duplicate(self):
        # Mirrors T122531Z: 59 rows / 58 unique (one duplicate key).
        rows = [{"id": f"r{i}", "source_key": f"SUBMISSION_XP|rec{i:014d}", "active": True} for i in range(58)]
        rows.append({"id": "dup", "source_key": "SUBMISSION_XP|rec00000000000000", "active": True})
        report = find_submission_xp_duplicate_groups(rows)
        self.assertEqual(report["total_rows"], 59)
        self.assertEqual(report["unique_keys"], 58)
        self.assertTrue(report["has_award_bearing_duplicates"])
        with self.assertRaises(AssertionError):
            assert_no_award_bearing_submission_xp_duplicates(rows)

    def test_active_plus_voided_is_duplicate_row_not_award_bearing(self):
        report = find_submission_xp_duplicate_groups(
            [
                {"id": "a", "source_key": "SUBMISSION_XP|rec1", "active": True},
                {"id": "b", "source_key": "SUBMISSION_XP|rec1", "active": False},
            ]
        )
        self.assertTrue(report["has_duplicates"])
        self.assertFalse(report["has_award_bearing_duplicates"])
        assert_no_award_bearing_submission_xp_duplicates(
            [
                {"id": "a", "source_key": "SUBMISSION_XP|rec1", "active": True},
                {"id": "b", "source_key": "SUBMISSION_XP|rec1", "active": False},
            ]
        )


if __name__ == "__main__":
    unittest.main()
