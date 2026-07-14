#!/usr/bin/env python3
"""C-027 — major-event notification offline contracts (S17)."""

from __future__ import annotations

import unittest

SEED_STREAKS = {10, 20, 30, 40, 50, 60}


def blank(v) -> bool:
    return v is None or v == ""


def men_allowed(
    *,
    master_enabled,
    event_enabled,
    channel: str | None = "Email",
) -> tuple[bool, str]:
    if master_enabled is None:
        return False, "skipped_master_missing"
    if not master_enabled:
        return False, "skipped_master_off"
    if event_enabled is None:
        return False, "skipped_event_missing"
    if not event_enabled:
        return False, "skipped_event_off"
    if blank(channel):
        channel = "Email"
    if channel != "Email":
        return False, "skipped_channel_unsupported_v1"
    return True, "ok"


def streak_notify(*, threshold: int, achievement_flag, master_enabled, streak_event_enabled) -> tuple[bool, str]:
    ok, reason = men_allowed(master_enabled=master_enabled, event_enabled=streak_event_enabled)
    if not ok:
        return ok, reason
    if achievement_flag is None or not achievement_flag:
        return False, "skipped_achievement_flag_off"
    if threshold not in SEED_STREAKS and not achievement_flag:
        return False, "skipped_not_seed"
    return True, "ok"


def send_key(kind: str, enrollment: str, identity: str) -> str:
    return f"MEN|{kind}|{enrollment}|{identity}"


def should_send(prior: set[str], key: str, eligible: bool) -> tuple[bool, str]:
    if not eligible:
        return False, "skipped_ineligible"
    if key in prior:
        return False, "skipped_already_sent"
    return True, "ok"


class TestC027MenEligibility(unittest.TestCase):
    def test_master_missing_no_send(self):
        ok, reason = men_allowed(master_enabled=None, event_enabled=True)
        self.assertFalse(ok)
        self.assertEqual(reason, "skipped_master_missing")

    def test_event_disabled(self):
        ok, reason = men_allowed(master_enabled=True, event_enabled=False)
        self.assertFalse(ok)
        self.assertEqual(reason, "skipped_event_off")

    def test_level_up_ok(self):
        ok, reason = men_allowed(master_enabled=True, event_enabled=True)
        self.assertTrue(ok)
        self.assertEqual(reason, "ok")


class TestC027StreakFlags(unittest.TestCase):
    def test_seed_thresholds(self):
        self.assertEqual(SEED_STREAKS, {10, 20, 30, 40, 50, 60})

    def test_flag_required(self):
        ok, reason = streak_notify(
            threshold=10, achievement_flag=False, master_enabled=True, streak_event_enabled=True
        )
        self.assertFalse(ok)
        self.assertEqual(reason, "skipped_achievement_flag_off")

    def test_flagged_seed_ok(self):
        ok, reason = streak_notify(
            threshold=30, achievement_flag=True, master_enabled=True, streak_event_enabled=True
        )
        self.assertTrue(ok)


class TestC027SendKeys(unittest.TestCase):
    def test_idempotent(self):
        key = send_key("STREAK", "recE", "streak_30")
        ok, reason = should_send({key}, key, True)
        self.assertFalse(ok)
        self.assertEqual(reason, "skipped_already_sent")

    def test_first_send(self):
        key = send_key("LEVEL", "recE", "Beginner")
        ok, reason = should_send(set(), key, True)
        self.assertTrue(ok)


if __name__ == "__main__":
    unittest.main()
