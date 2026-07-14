#!/usr/bin/env python3
"""Stage 8 — pipeline communication send-gate mocks (offline, no Airtable)."""

from __future__ import annotations

import unittest

SCHMIDT_ENROLLMENT_ID = "recgP9qZYjAhE7NXm"


def should_send_homework_feedback(active: bool, enrollment_id: str) -> bool:
    if enrollment_id == SCHMIDT_ENROLLMENT_ID:
        return False
    return active


def should_send_video_feedback(active: bool, enrollment_id: str) -> bool:
    if enrollment_id == SCHMIDT_ENROLLMENT_ID:
        return False
    return active


def should_build_weekly_email(active: bool, enrollment_id: str) -> bool:
    if enrollment_id == SCHMIDT_ENROLLMENT_ID:
        return False
    return active


class TestPipelineCommsGates(unittest.TestCase):
    def test_hidden_suppresses_hw_feedback(self):
        self.assertFalse(should_send_homework_feedback(False, "recOther"))

    def test_schmidt_suppresses_hw_feedback(self):
        self.assertFalse(should_send_homework_feedback(True, SCHMIDT_ENROLLMENT_ID))

    def test_active_sends_hw_feedback(self):
        self.assertTrue(should_send_homework_feedback(True, "recOther"))

    def test_hidden_suppresses_video_feedback(self):
        self.assertFalse(should_send_video_feedback(False, "recOther"))

    def test_schmidt_suppresses_weekly(self):
        self.assertFalse(should_build_weekly_email(True, SCHMIDT_ENROLLMENT_ID))

    def test_hidden_suppresses_weekly(self):
        self.assertFalse(should_build_weekly_email(False, "recOther"))

    def test_active_builds_weekly(self):
        self.assertTrue(should_build_weekly_email(True, "recOther"))


if __name__ == "__main__":
    unittest.main()
