#!/usr/bin/env python3
"""C-019 — offline contract: required DEV Testing views specification."""

from __future__ import annotations

import unittest


SCHMIDT_ENROLLMENT_ID = "recgP9qZYjAhE7NXm"
SCHMIDT_LABEL = "Schmidt, Testing - 2025-2026"
VIEW_NAME = "Testing"

REQUIRED_VIEWS = [
    {
        "table": "Submissions",
        "filter_field": "Enrollment",
        "sort": "Activity Date desc",
        "group": None,
        "test_ids": ["C-020-A", "C-020-B", "C-020-D", "C010-T1", "C009-T1"],
    },
    {
        "table": "Submission Assets",
        "filter_field": "Enrollment - Linked",
        "sort": "Created desc",
        "group": None,
        "test_ids": ["C-020-B", "C-020-D", "C009-T2"],
    },
    {
        "table": "Homework Completions",
        "filter_field": "Enrollment",
        "sort": "Submission Date desc",
        "group": None,
        "test_ids": ["C-020-B", "C009-T1", "C010-T4", "C-025"],
    },
    {
        "table": "Video Feedback",
        "filter_field": "Enrollment",
        "sort": "Created desc",
        "group": None,
        "test_ids": ["C-020-D", "112-OFF"],
    },
    {
        "table": "XP Events",
        "filter_field": "Enrollment",
        "sort": "Activity Date desc",
        "group": None,
        "test_ids": ["C010-T1", "C010-T4", "C009-T7"],
    },
    {
        "table": "Weekly Athlete Summary",
        "filter_field": "Enrollment",
        "sort": "Week Start Date desc",
        "group": None,
        "test_ids": ["C010-T2", "C010-T5", "C011-T3"],
    },
    {
        "table": "Streak Occurrences",
        "filter_field": "Enrollment",
        "sort": "Created desc",
        "group": None,
        "test_ids": ["C010-T3"],
    },
    {
        "table": "Athlete Achievement Unlocks",
        "filter_field": "Enrollment",
        "sort": "Created desc",
        "group": None,
        "test_ids": ["059-T1", "C-020"],
    },
]

FORBIDDEN_FILTER_FIELDS = {
    "Is Test Record?",
    "Active?",
    "Test Status",
}


def view_is_valid(spec: dict, *, extra_filters: set[str]) -> bool:
    if spec.get("view_name", VIEW_NAME) != VIEW_NAME:
        return False
    if spec["filter_field"] in FORBIDDEN_FILTER_FIELDS:
        return False
    if extra_filters & FORBIDDEN_FILTER_FIELDS:
        return False
    if spec["filter_value"] != SCHMIDT_LABEL and spec["filter_value"] != SCHMIDT_ENROLLMENT_ID:
        return False
    return True


class TestC019TestingViewsContract(unittest.TestCase):
    def test_eight_required_tables(self):
        self.assertEqual(len(REQUIRED_VIEWS), 8)
        tables = [v["table"] for v in REQUIRED_VIEWS]
        self.assertEqual(len(tables), len(set(tables)))

    def test_submission_assets_uses_enrollment_linked(self):
        assets = next(v for v in REQUIRED_VIEWS if v["table"] == "Submission Assets")
        self.assertEqual(assets["filter_field"], "Enrollment - Linked")

    def test_forbidden_filters(self):
        for field in ("Is Test Record?", "Active?", "Test Status"):
            self.assertIn(field, FORBIDDEN_FILTER_FIELDS)

    def test_view_validator_rejects_active_filter(self):
        spec = {
            "view_name": VIEW_NAME,
            "filter_field": "Enrollment",
            "filter_value": SCHMIDT_LABEL,
        }
        self.assertTrue(view_is_valid(spec, extra_filters=set()))
        self.assertFalse(view_is_valid(spec, extra_filters={"Active?"}))

    def test_each_view_has_related_test_ids(self):
        for view in REQUIRED_VIEWS:
            self.assertTrue(view["test_ids"], view["table"])

    def test_schmidt_ids_locked(self):
        self.assertTrue(SCHMIDT_ENROLLMENT_ID.startswith("rec"))
        self.assertIn("Schmidt", SCHMIDT_LABEL)


if __name__ == "__main__":
    unittest.main()
