#!/usr/bin/env python3
"""C-027 Stage 13 — offline contract for major-event notification sends."""

from __future__ import annotations

import unittest

# Keep aligned with Stage 8 pipeline gates.
SCHMIDT_ENROLLMENT_ID = "recgP9qZYjAhE7NXm"


IN_SCOPE_EVENTS = frozenset(
    {
        "LEVEL_UP",
        "SHOT_MILESTONE",
        "PERFECT_WEEK",
        "STREAK",
    }
)

OUT_OF_SCOPE_EVENTS = frozenset(
    {
        "DAILY_SUBMISSION",
        "HOMEWORK_FEEDBACK",
        "VIDEO_FEEDBACK",
        "WEEKLY_SUMMARY",
    }
)


def major_event_send_key(event_type: str, enrollment_id: str, occurrence_id: str) -> str:
    if event_type not in IN_SCOPE_EVENTS:
        raise ValueError(f"out of scope event_type: {event_type}")
    return f"MEN|{event_type}|{enrollment_id}|{occurrence_id}"


def should_send_major_event(
    *,
    event_type: str,
    active: bool,
    enrollment_id: str,
    existing_sends: list[dict],
    send_key: str,
) -> tuple[bool, str]:
    if event_type in OUT_OF_SCOPE_EVENTS:
        return False, "skipped_out_of_scope"
    if event_type not in IN_SCOPE_EVENTS:
        return False, "skipped_unknown_event"
    if not active:
        return False, "skipped_inactive"
    if enrollment_id == SCHMIDT_ENROLLMENT_ID:
        return False, "skipped_schmidt"
    for row in existing_sends:
        if row.get("sendKey") != send_key:
            continue
        status = (row.get("status") or "").lower()
        if status == "sent":
            return False, "skipped_already_sent"
        if status == "failed":
            return True, "retry_after_failure"
        if status == "pending":
            return False, "skipped_pending"
    return True, "ok"


class TestC027MajorEventSendContract(unittest.TestCase):
    def test_send_key_builders(self):
        self.assertEqual(
            major_event_send_key("LEVEL_UP", "recE1", "recLevel2"),
            "MEN|LEVEL_UP|recE1|recLevel2",
        )
        self.assertEqual(
            major_event_send_key("PERFECT_WEEK", "recE1", "recW3"),
            "MEN|PERFECT_WEEK|recE1|recW3",
        )

    def test_send_key_rejects_out_of_scope(self):
        with self.assertRaises(ValueError):
            major_event_send_key("DAILY_SUBMISSION", "recE1", "recS1")

    def test_allows_active_non_schmidt(self):
        key = major_event_send_key("LEVEL_UP", "recE1", "recL2")
        ok, reason = should_send_major_event(
            event_type="LEVEL_UP",
            active=True,
            enrollment_id="recE1",
            existing_sends=[],
            send_key=key,
        )
        self.assertTrue(ok)
        self.assertEqual(reason, "ok")

    def test_skips_inactive(self):
        key = major_event_send_key("STREAK", "recE1", "streak-7")
        ok, reason = should_send_major_event(
            event_type="STREAK",
            active=False,
            enrollment_id="recE1",
            existing_sends=[],
            send_key=key,
        )
        self.assertFalse(ok)
        self.assertEqual(reason, "skipped_inactive")

    def test_skips_schmidt(self):
        key = major_event_send_key("SHOT_MILESTONE", SCHMIDT_ENROLLMENT_ID, "ms-500")
        ok, reason = should_send_major_event(
            event_type="SHOT_MILESTONE",
            active=True,
            enrollment_id=SCHMIDT_ENROLLMENT_ID,
            existing_sends=[],
            send_key=key,
        )
        self.assertFalse(ok)
        self.assertEqual(reason, "skipped_schmidt")

    def test_skips_duplicate_sent(self):
        key = major_event_send_key("PERFECT_WEEK", "recE1", "recW1")
        ok, reason = should_send_major_event(
            event_type="PERFECT_WEEK",
            active=True,
            enrollment_id="recE1",
            existing_sends=[{"sendKey": key, "status": "sent"}],
            send_key=key,
        )
        self.assertFalse(ok)
        self.assertEqual(reason, "skipped_already_sent")

    def test_retries_failed(self):
        key = major_event_send_key("LEVEL_UP", "recE1", "recL3")
        ok, reason = should_send_major_event(
            event_type="LEVEL_UP",
            active=True,
            enrollment_id="recE1",
            existing_sends=[{"sendKey": key, "status": "failed"}],
            send_key=key,
        )
        self.assertTrue(ok)
        self.assertEqual(reason, "retry_after_failure")

    def test_blocks_daily_submission_event(self):
        ok, reason = should_send_major_event(
            event_type="DAILY_SUBMISSION",
            active=True,
            enrollment_id="recE1",
            existing_sends=[],
            send_key="ignored",
        )
        self.assertFalse(ok)
        self.assertEqual(reason, "skipped_out_of_scope")

    def test_blocks_homework_feedback_event(self):
        ok, reason = should_send_major_event(
            event_type="HOMEWORK_FEEDBACK",
            active=True,
            enrollment_id="recE1",
            existing_sends=[],
            send_key="ignored",
        )
        self.assertFalse(ok)
        self.assertEqual(reason, "skipped_out_of_scope")


class TestC027ScopeSets(unittest.TestCase):
    def test_scope_sets_disjoint(self):
        self.assertFalse(IN_SCOPE_EVENTS & OUT_OF_SCOPE_EVENTS)


if __name__ == "__main__":
    unittest.main()
