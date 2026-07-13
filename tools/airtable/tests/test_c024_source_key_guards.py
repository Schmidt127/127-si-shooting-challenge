#!/usr/bin/env python3
"""C-024 Stage 2 — Source Key guard and business-rule mocks (no live API)."""

from __future__ import annotations

import unittest


def find_or_create(existing: dict[str, str], source_key: str, create_label: str) -> str:
    if source_key in existing:
        return "skipped"
    existing[source_key] = create_label
    return "created"


def homework_completion_key(enrollment_id: str, assignment_id: str, week_id: str) -> str:
    return f"HC|{enrollment_id}|{assignment_id}|{week_id}"


def flag_identical_submission(
    seen: dict[str, list[str]], duplicate_key: str, record_id: str
) -> str:
    """Owner #3: flag identical stats; never auto-delete."""
    if duplicate_key in seen:
        seen[duplicate_key].append(record_id)
        return "flagged_for_review"
    seen[duplicate_key] = [record_id]
    return "unique"


def achievement_keeper(
    unlocks: dict[str, tuple[str, str]], source_key: str, record_id: str, created_at: str
) -> str:
    """Owner #5: keep earliest valid; flag later."""
    if source_key not in unlocks:
        unlocks[source_key] = (record_id, created_at)
        return "kept"
    _earliest_id, earliest_at = unlocks[source_key]
    if created_at < earliest_at:
        unlocks[source_key] = (record_id, created_at)
        return "replaced_earlier"
    return "flagged_duplicate"


class TestC024SourceKeyGuards(unittest.TestCase):
    def test_xp_source_key_rerun_skips_second_create(self):
        xp_index: dict[str, str] = {}
        key = "HOMEWORK_XP|recHC01"
        self.assertEqual(find_or_create(xp_index, key, "xp1"), "created")
        self.assertEqual(find_or_create(xp_index, key, "xp2"), "skipped")
        self.assertEqual(len(xp_index), 1)

    def test_one_official_homework_completion_key(self):
        key_a = homework_completion_key("recE1", "recA1", "recW2")
        key_b = homework_completion_key("recE1", "recA1", "recW2")
        self.assertEqual(key_a, key_b)
        self.assertEqual(key_a, "HC|recE1|recA1|recW2")

    def test_identical_submission_flagged_not_deleted(self):
        seen: dict[str, list[str]] = {}
        dk = "enroll|2026-07-01|10|5|0|0"
        self.assertEqual(flag_identical_submission(seen, dk, "recS1"), "unique")
        self.assertEqual(flag_identical_submission(seen, dk, "recS2"), "flagged_for_review")
        self.assertEqual(seen[dk], ["recS1", "recS2"])

    def test_achievement_keeps_earliest_unlock(self):
        unlocks: dict[str, tuple[str, str]] = {}
        key = "SHOT_MILESTONE|recE1|recM1"
        self.assertEqual(achievement_keeper(unlocks, key, "recU1", "2026-07-01"), "kept")
        self.assertEqual(achievement_keeper(unlocks, key, "recU2", "2026-07-02"), "flagged_duplicate")
        self.assertEqual(unlocks[key][0], "recU1")


if __name__ == "__main__":
    unittest.main()
