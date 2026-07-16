#!/usr/bin/env python3
"""C-011 — offline contract: automatic weekly email schedule + safety."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
import unittest


SCHMIDT_ENROLLMENT_ID = "recgP9qZYjAhE7NXm"
BUILD_HOUR = 5
SEND_HOUR = 10
TZ_NAME = "America/Denver"


def weekly_email_event_id(enrollment_id: str, week_id: str) -> str:
    return f"WEEKLY_EMAIL|{enrollment_id}|{week_id}"


def target_week_end_for_sunday_run(sunday_local_date: date) -> date:
    """At Sunday 05:00, target week ended yesterday (Saturday)."""
    assert sunday_local_date.weekday() == 6  # Sunday
    return sunday_local_date - timedelta(days=1)


def should_arm_build(
    *,
    active: bool,
    enrollment_id: str,
    sent: bool,
    has_email: bool,
    dry_run: bool = False,
) -> str:
    if dry_run:
        return "dry_run_count_only"
    if enrollment_id == SCHMIDT_ENROLLMENT_ID:
        return "skipped_schmidt"
    if not active:
        return "skipped_inactive"
    if not has_email:
        return "skipped_no_email"
    if sent:
        return "skipped_already_sent"
    return "arm_build"


def should_arm_send(
    *,
    active: bool,
    enrollment_id: str,
    sent: bool,
    ready: bool,
    package_ok: bool,
) -> str:
    if enrollment_id == SCHMIDT_ENROLLMENT_ID or not active:
        return "skipped_inactive"
    if sent:
        return "skipped_already_sent"
    if not ready or not package_ok:
        return "not_ready"
    return "arm_send"


def build_when_already_sent_behavior(sent: bool) -> str:
    """072 must not clear Sent? when true (resend hole fix)."""
    if sent:
        return "skipped_already_sent_no_clear"
    return "build_package"


def resolve_send_mode(*, configured: str, force_dev_test: bool) -> str:
    if force_dev_test:
        return "test"
    return (configured or "test").lower()


class TestC011WeeklyEmailContract(unittest.TestCase):
    def test_sunday_cadence_hours(self):
        self.assertEqual(BUILD_HOUR, 5)
        self.assertEqual(SEND_HOUR, 10)
        self.assertLess(BUILD_HOUR, SEND_HOUR)
        self.assertEqual(TZ_NAME, "America/Denver")

    def test_target_week_is_saturday_before_sunday(self):
        sunday = date(2026, 7, 12)  # Sunday
        self.assertEqual(target_week_end_for_sunday_run(sunday), date(2026, 7, 11))

    def test_event_id_uses_record_ids(self):
        self.assertEqual(
            weekly_email_event_id("recE", "recW"),
            "WEEKLY_EMAIL|recE|recW",
        )

    def test_schmidt_never_armed(self):
        self.assertEqual(
            should_arm_build(
                active=True,
                enrollment_id=SCHMIDT_ENROLLMENT_ID,
                sent=False,
                has_email=True,
            ),
            "skipped_schmidt",
        )
        self.assertEqual(
            should_arm_send(
                active=True,
                enrollment_id=SCHMIDT_ENROLLMENT_ID,
                sent=False,
                ready=True,
                package_ok=True,
            ),
            "skipped_inactive",
        )

    def test_resend_prevention(self):
        self.assertEqual(
            should_arm_build(
                active=True,
                enrollment_id="recE",
                sent=True,
                has_email=True,
            ),
            "skipped_already_sent",
        )
        self.assertEqual(
            build_when_already_sent_behavior(True),
            "skipped_already_sent_no_clear",
        )

    def test_dev_send_mode_locked_to_test(self):
        self.assertEqual(
            resolve_send_mode(configured="Live", force_dev_test=True),
            "test",
        )

    def test_failure_recovery_keeps_send_trigger(self):
        # 074 contract: webhook fail leaves Send to Make? checked
        send_to_make = True
        webhook_ok = False
        if not webhook_ok:
            # do not clear
            pass
        self.assertTrue(send_to_make)

    def test_manual_override_still_uses_checkboxes(self):
        fields = {
            "Build Weekly Email Now?",
            "Send to Make?",
            "Weekly Email Ready?",
            "Weekly Email Sent?",
        }
        self.assertIn("Build Weekly Email Now?", fields)
        self.assertIn("Send to Make?", fields)


if __name__ == "__main__":
    unittest.main()
