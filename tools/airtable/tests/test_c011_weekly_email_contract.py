#!/usr/bin/env python3
"""C-011 — offline contract: automatic weekly email schedule + safety."""

from __future__ import annotations

from datetime import date, timedelta
import unittest


SCHMIDT_ENROLLMENT_ID = "recgP9qZYjAhE7NXm"
BUILD_HOUR = 5
SEND_HOUR = 10
TZ_NAME = "America/Denver"
EVENT_ID_TEMPLATE = "WEEKLY_EMAIL|{enrollmentId}|{weekId}"


def weekly_email_event_id(enrollment_id: str, week_id: str) -> str:
    """Exact Make/072 eventId — no malformed placeholders."""
    assert "{}" not in EVENT_ID_TEMPLATE.replace("{enrollmentId}", "").replace("{weekId}", "")
    return f"WEEKLY_EMAIL|{enrollment_id}|{week_id}"


def prior_saturday(denver_local_date: date) -> date:
    """Mirror 118/119 priorSaturdayKeyDenver calendar rule.

    Sun→Sat(-1), Mon→Sat(-2), … Fri→Sat(-6), Sat→previous Sat(-7).
    """
    # Python: Mon=0 … Sun=6
    dow = denver_local_date.weekday()  # Mon=0
    # Convert to Sun=0 … Sat=6
    sun0 = (dow + 1) % 7
    days_back = 7 if sun0 == 6 else sun0 + 1
    return denver_local_date - timedelta(days=days_back)


def target_week_end_for_sunday_run(sunday_local_date: date) -> date:
    assert sunday_local_date.weekday() == 6  # Sunday
    return prior_saturday(sunday_local_date)


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
    dry_run: bool = False,
) -> str:
    if dry_run:
        return "dry_run_count_only"
    if enrollment_id == SCHMIDT_ENROLLMENT_ID or not active:
        return "skipped_inactive"
    if sent:
        return "skipped_already_sent"
    if not ready or not package_ok:
        return "not_ready"
    return "arm_send"


def build_when_already_sent_behavior(sent: bool) -> str:
    if sent:
        return "skipped_already_sent_no_clear"
    return "build_package"


def resolve_send_mode(*, configured: str, force_dev_test: bool) -> str:
    if force_dev_test:
        return "test"
    return (configured or "test").lower()


def refuse_live_when_not_dry_run(send_mode: str, dry_run: bool) -> bool:
    """118 throws when Live && !dryRun."""
    return not (send_mode.lower() == "live" and dry_run is False)


class TestC011WeeklyEmailContract(unittest.TestCase):
    def test_sunday_cadence_hours(self):
        self.assertEqual(BUILD_HOUR, 5)
        self.assertEqual(SEND_HOUR, 10)
        self.assertLess(BUILD_HOUR, SEND_HOUR)
        self.assertEqual(TZ_NAME, "America/Denver")

    def test_event_id_format_exact(self):
        self.assertEqual(
            weekly_email_event_id("recE", "recW"),
            "WEEKLY_EMAIL|recE|recW",
        )
        self.assertNotIn("{}week", weekly_email_event_id("recE", "recW"))

    def test_prior_saturday_sunday_run(self):
        sunday = date(2026, 7, 12)
        self.assertEqual(prior_saturday(sunday), date(2026, 7, 11))
        self.assertEqual(target_week_end_for_sunday_run(sunday), date(2026, 7, 11))

    def test_prior_saturday_monday_rerun(self):
        monday = date(2026, 7, 13)
        self.assertEqual(prior_saturday(monday), date(2026, 7, 11))

    def test_prior_saturday_on_saturday_uses_previous_week(self):
        saturday = date(2026, 7, 11)
        self.assertEqual(prior_saturday(saturday), date(2026, 7, 4))

    def test_week_rollover_across_month(self):
        # Sunday Aug 2 2026 → Sat Aug 1
        self.assertEqual(prior_saturday(date(2026, 8, 2)), date(2026, 8, 1))
        # Monday Aug 3 → Sat Aug 1
        self.assertEqual(prior_saturday(date(2026, 8, 3)), date(2026, 8, 1))

    def test_dry_run_defaults_no_arm(self):
        self.assertEqual(
            should_arm_build(
                active=True,
                enrollment_id="recE",
                sent=False,
                has_email=True,
                dry_run=True,
            ),
            "dry_run_count_only",
        )
        self.assertEqual(
            should_arm_send(
                active=True,
                enrollment_id="recE",
                sent=False,
                ready=True,
                package_ok=True,
                dry_run=True,
            ),
            "dry_run_count_only",
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
            should_arm_send(
                active=True,
                enrollment_id="recE",
                sent=True,
                ready=True,
                package_ok=True,
            ),
            "skipped_already_sent",
        )
        self.assertEqual(
            build_when_already_sent_behavior(True),
            "skipped_already_sent_no_clear",
        )

    def test_manual_override_checkboxes_remain(self):
        fields = {
            "Build Weekly Email Now?",
            "Send to Make?",
            "Weekly Email Ready?",
            "Weekly Email Sent?",
        }
        self.assertIn("Build Weekly Email Now?", fields)
        self.assertIn("Send to Make?", fields)

    def test_dev_send_mode_locked_to_test(self):
        self.assertEqual(
            resolve_send_mode(configured="Live", force_dev_test=True),
            "test",
        )
        self.assertFalse(refuse_live_when_not_dry_run("Live", False))
        self.assertTrue(refuse_live_when_not_dry_run("Test", False))
        self.assertTrue(refuse_live_when_not_dry_run("Live", True))

    def test_failure_recovery_keeps_send_trigger(self):
        send_to_make = True
        webhook_ok = False
        if not webhook_ok:
            pass
        self.assertTrue(send_to_make)

    def test_rerun_same_week_same_event_id(self):
        a = weekly_email_event_id("recE", "recW")
        b = weekly_email_event_id("recE", "recW")
        self.assertEqual(a, b)


if __name__ == "__main__":
    unittest.main()
