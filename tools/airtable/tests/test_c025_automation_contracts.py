#!/usr/bin/env python3
"""C-025 — automation contracts (XP once, conflict, email safe default)."""

from __future__ import annotations

import unittest


def blank(v) -> bool:
    return v is None or v == ""


def zoom_credit_key(enroll: str, meeting: str) -> str:
    return f"ZOOM_CREDIT|{enroll}|{meeting}"


def can_create_xp(
    *,
    approved: bool,
    conflict: bool,
    xp_amount: int,
    existing_source_keys: set[str],
    enroll: str,
    meeting: str,
) -> tuple[bool, str]:
    if conflict or not approved or xp_amount <= 0:
        return False, "skipped_not_awardable"
    key = zoom_credit_key(enroll, meeting)
    if key in existing_source_keys:
        return False, "skipped_exists"
    # also treat legacy live/recording family as blocking siblings
    live = f"ZOOM_LIVE|{meeting}|{enroll}"
    rec = f"ZOOM_RECORDING|{meeting}|{enroll}"
    if live in existing_source_keys or rec in existing_source_keys:
        return False, "skipped_sibling_exists"
    return True, "ok"


def after_create(keys: set[str], enroll: str, meeting: str) -> set[str]:
    keys = set(keys)
    keys.add(zoom_credit_key(enroll, meeting))
    return keys


def email_decision(enabled, satisfactory: bool, template: str | None, prior_send_keys: set[str], enroll: str, meeting: str):
    send_key = f"ZOOM_REC_EMAIL|{enroll}|{meeting}"
    if enabled is None:
        return False, "skipped_config_missing", send_key
    if not enabled:
        return False, "skipped_disabled", send_key
    if not satisfactory:
        return False, "skipped_not_satisfactory", send_key
    if blank(template):
        return False, "skipped_missing_template_key", send_key
    if send_key in prior_send_keys:
        return False, "skipped_already_sent", send_key
    return True, "ok", send_key


class TestC025AutomationXpOnce(unittest.TestCase):
    def test_first_create_ok(self):
        ok, reason = can_create_xp(
            approved=True, conflict=False, xp_amount=20, existing_source_keys=set(), enroll="recE", meeting="recM"
        )
        self.assertTrue(ok)
        self.assertEqual(reason, "ok")

    def test_resubmission_no_duplicate_xp(self):
        keys = {zoom_credit_key("recE", "recM")}
        ok, reason = can_create_xp(
            approved=True, conflict=False, xp_amount=20, existing_source_keys=keys, enroll="recE", meeting="recM"
        )
        self.assertFalse(ok)
        self.assertEqual(reason, "skipped_exists")

    def test_conflict_blocks_xp(self):
        ok, reason = can_create_xp(
            approved=False, conflict=True, xp_amount=40, existing_source_keys=set(), enroll="recE", meeting="recM"
        )
        self.assertFalse(ok)
        self.assertEqual(reason, "skipped_not_awardable")

    def test_live_sibling_blocks_recording(self):
        keys = {"ZOOM_LIVE|recM|recE"}
        ok, reason = can_create_xp(
            approved=True, conflict=False, xp_amount=20, existing_source_keys=keys, enroll="recE", meeting="recM"
        )
        self.assertFalse(ok)
        self.assertEqual(reason, "skipped_sibling_exists")


class TestC025ApprovalEmail(unittest.TestCase):
    def test_missing_config_no_send(self):
        ok, reason, _ = email_decision(None, True, "ZOOM_RECORDING_APPROVED", set(), "recE", "recM")
        self.assertFalse(ok)
        self.assertEqual(reason, "skipped_config_missing")

    def test_idempotent_send_key(self):
        key = "ZOOM_REC_EMAIL|recE|recM"
        ok, reason, sk = email_decision(True, True, "ZOOM_RECORDING_APPROVED", {key}, "recE", "recM")
        self.assertFalse(ok)
        self.assertEqual(reason, "skipped_already_sent")
        self.assertEqual(sk, key)


if __name__ == "__main__":
    unittest.main()
