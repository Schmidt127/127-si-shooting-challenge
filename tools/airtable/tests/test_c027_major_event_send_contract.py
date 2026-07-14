#!/usr/bin/env python3
"""C-027 — offline contract: major-event sends + configuration-driven eligibility."""

from __future__ import annotations

import unittest

SCHMIDT_ENROLLMENT_ID = "recgP9qZYjAhE7NXm"

IN_SCOPE_EVENTS = frozenset(
    {"LEVEL_UP", "SHOT_MILESTONE", "PERFECT_WEEK", "STREAK"}
)
OUT_OF_SCOPE_EVENTS = frozenset(
    {"DAILY_SUBMISSION", "HOMEWORK_FEEDBACK", "VIDEO_FEEDBACK", "WEEKLY_SUMMARY"}
)


def cfg_bool(config: dict, key: str, fallback: bool) -> bool:
    if key not in config or config.get(key) is None:
        return fallback
    return bool(config[key])


def cfg_select(config: dict, key: str, fallback: str) -> str:
    value = config.get(key)
    if not value:
        return fallback
    return str(value)


def major_event_send_key(event_type: str, enrollment_id: str, occurrence_id: str) -> str:
    if event_type not in IN_SCOPE_EVENTS:
        raise ValueError(f"out of scope event_type: {event_type}")
    return f"MEN|{event_type}|{enrollment_id}|{occurrence_id}"


def streak_parent_notify_eligible(achievement: dict) -> bool:
    """Eligibility from Achievement rule record — not a hardcoded day list."""
    return bool(achievement.get("Parent Notification Enabled?")) and achievement.get(
        "Trigger Type"
    ) == "Streak Length"


def shot_milestone_parent_notify_eligible(milestone: dict) -> bool:
    return bool(milestone.get("Parent Notification Enabled?"))


def should_send_major_event(
    *,
    event_type: str,
    active: bool,
    enrollment_id: str,
    existing_sends: list[dict],
    send_key: str,
    config: dict,
    rule_record: dict | None = None,
) -> tuple[bool, str]:
    if event_type in OUT_OF_SCOPE_EVENTS:
        return False, "skipped_out_of_scope"
    if event_type not in IN_SCOPE_EVENTS:
        return False, "skipped_unknown_event"

    # Master switch: missing → do not send (safe)
    if "Major Event Notify Enabled?" not in config or config.get(
        "Major Event Notify Enabled?"
    ) is None:
        return False, "skipped_master_config_missing"
    if not config.get("Major Event Notify Enabled?"):
        return False, "skipped_master_disabled"

    event_flag = {
        "LEVEL_UP": "Major Event Level Up Enabled?",
        "SHOT_MILESTONE": "Major Event Shot Milestone Enabled?",
        "PERFECT_WEEK": "Major Event Perfect Week Enabled?",
        "STREAK": "Major Event Streak Milestone Enabled?",
    }[event_type]
    if not cfg_bool(config, event_flag, True):
        return False, "skipped_event_type_disabled"

    channel = cfg_select(config, "Major Event Notify Channel", "Email")
    if channel not in ("Email", "SMS", "Email+SMS"):
        return False, "skipped_bad_channel"
    # v1 supports Email; SMS listed for future — treat SMS-only as blocked until provider exists
    if channel == "SMS":
        return False, "skipped_sms_not_configured"

    if not active:
        return False, "skipped_inactive"
    if enrollment_id == SCHMIDT_ENROLLMENT_ID:
        return False, "skipped_schmidt"

    if event_type == "STREAK":
        if not rule_record or not streak_parent_notify_eligible(rule_record):
            return False, "skipped_streak_rule_not_notify_eligible"
    if event_type == "SHOT_MILESTONE":
        if not rule_record or not shot_milestone_parent_notify_eligible(rule_record):
            return False, "skipped_shot_rule_not_notify_eligible"

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


class TestC027ConfigAndRuleDrivenEligibility(unittest.TestCase):
    def test_master_disable_prevents_send(self):
        key = major_event_send_key("LEVEL_UP", "recE1", "recL2")
        ok, reason = should_send_major_event(
            event_type="LEVEL_UP",
            active=True,
            enrollment_id="recE1",
            existing_sends=[],
            send_key=key,
            config={"Major Event Notify Enabled?": False},
        )
        self.assertFalse(ok)
        self.assertEqual(reason, "skipped_master_disabled")

    def test_missing_master_config_safe_fallback_no_send(self):
        key = major_event_send_key("LEVEL_UP", "recE1", "recL2")
        ok, reason = should_send_major_event(
            event_type="LEVEL_UP",
            active=True,
            enrollment_id="recE1",
            existing_sends=[],
            send_key=key,
            config={},
        )
        self.assertFalse(ok)
        self.assertEqual(reason, "skipped_master_config_missing")

    def test_streak_eligibility_from_rule_record_not_hardcoded_list(self):
        # Threshold 7 is NOT inherently major — flag decides
        key = major_event_send_key("STREAK", "recE1", "streak-7")
        base = {"Major Event Notify Enabled?": True, "Major Event Notify Channel": "Email"}
        ok_off, reason_off = should_send_major_event(
            event_type="STREAK",
            active=True,
            enrollment_id="recE1",
            existing_sends=[],
            send_key=key,
            config=base,
            rule_record={
                "Trigger Type": "Streak Length",
                "Trigger Threshold": 7,
                "Parent Notification Enabled?": False,
            },
        )
        self.assertFalse(ok_off)
        self.assertEqual(reason_off, "skipped_streak_rule_not_notify_eligible")

        ok_on, _ = should_send_major_event(
            event_type="STREAK",
            active=True,
            enrollment_id="recE1",
            existing_sends=[],
            send_key=key,
            config=base,
            rule_record={
                "Trigger Type": "Streak Length",
                "Trigger Threshold": 10,
                "Parent Notification Enabled?": True,
            },
        )
        self.assertTrue(ok_on)

    def test_shot_milestone_eligibility_from_rule_record(self):
        key = major_event_send_key("SHOT_MILESTONE", "recE1", "ms-1")
        cfg = {"Major Event Notify Enabled?": True, "Major Event Notify Channel": "Email"}
        ok, reason = should_send_major_event(
            event_type="SHOT_MILESTONE",
            active=True,
            enrollment_id="recE1",
            existing_sends=[],
            send_key=key,
            config=cfg,
            rule_record={"Parent Notification Enabled?": False},
        )
        self.assertFalse(ok)
        self.assertEqual(reason, "skipped_shot_rule_not_notify_eligible")

    def test_default_channel_email(self):
        key = major_event_send_key("PERFECT_WEEK", "recE1", "recW1")
        ok, _ = should_send_major_event(
            event_type="PERFECT_WEEK",
            active=True,
            enrollment_id="recE1",
            existing_sends=[],
            send_key=key,
            config={"Major Event Notify Enabled?": True},
        )
        self.assertTrue(ok)

    def test_blocks_daily_and_homework(self):
        cfg = {"Major Event Notify Enabled?": True}
        for event in ("DAILY_SUBMISSION", "HOMEWORK_FEEDBACK"):
            ok, reason = should_send_major_event(
                event_type=event,
                active=True,
                enrollment_id="recE1",
                existing_sends=[],
                send_key="x",
                config=cfg,
            )
            self.assertFalse(ok)
            self.assertEqual(reason, "skipped_out_of_scope")

    def test_skips_inactive_and_schmidt(self):
        cfg = {"Major Event Notify Enabled?": True}
        key = major_event_send_key("LEVEL_UP", "recE1", "recL1")
        ok_i, _ = should_send_major_event(
            event_type="LEVEL_UP",
            active=False,
            enrollment_id="recE1",
            existing_sends=[],
            send_key=key,
            config=cfg,
        )
        self.assertFalse(ok_i)
        ok_s, reason = should_send_major_event(
            event_type="LEVEL_UP",
            active=True,
            enrollment_id=SCHMIDT_ENROLLMENT_ID,
            existing_sends=[],
            send_key=major_event_send_key("LEVEL_UP", SCHMIDT_ENROLLMENT_ID, "recL1"),
            config=cfg,
        )
        self.assertFalse(ok_s)
        self.assertEqual(reason, "skipped_schmidt")

    def test_idempotent_sent(self):
        key = major_event_send_key("LEVEL_UP", "recE1", "recL3")
        ok, reason = should_send_major_event(
            event_type="LEVEL_UP",
            active=True,
            enrollment_id="recE1",
            existing_sends=[{"sendKey": key, "status": "sent"}],
            send_key=key,
            config={"Major Event Notify Enabled?": True},
        )
        self.assertFalse(ok)
        self.assertEqual(reason, "skipped_already_sent")


class TestC027HelperPredicates(unittest.TestCase):
    def test_seed_thresholds_are_data_not_code_list(self):
        """Demonstrate eligibility checks Achievements rows, not an embedded list."""
        rows = [
            {"Trigger Threshold": 10, "Parent Notification Enabled?": True, "Trigger Type": "Streak Length"},
            {"Trigger Threshold": 7, "Parent Notification Enabled?": False, "Trigger Type": "Streak Length"},
            {"Trigger Threshold": 20, "Parent Notification Enabled?": True, "Trigger Type": "Streak Length"},
        ]
        eligible = [r["Trigger Threshold"] for r in rows if streak_parent_notify_eligible(r)]
        self.assertEqual(eligible, [10, 20])


if __name__ == "__main__":
    unittest.main()
