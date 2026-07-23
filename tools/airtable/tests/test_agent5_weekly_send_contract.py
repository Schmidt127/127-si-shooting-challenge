#!/usr/bin/env python3
"""Agent 5 — weekly email send contract (SC-039/SC-040/SC-041, 074 v2.1).

Mocks the 074 validation order, Make handoff, failure writeback, and retry
model, plus the 118/119 v1.2 Schmidt inclusion override. No network, no email.
"""

from __future__ import annotations

import unittest

SCHMIDT_ENROLLMENT_ID = "recgP9qZYjAhE7NXm"


class SendOutcome:
    def __init__(self):
        self.posted = 0
        self.record = {}
        self.error = ""


def send_to_make(package: dict, *, webhook_ok: bool = True,
                 test_recipient: str = "") -> SendOutcome:
    """Mirror 074: validation order, then POST, then writeback rules."""
    out = SendOutcome()
    out.record = dict(package)

    if not package.get("ready"):
        raise ValueError("Weekly Email Ready? is not checked. Handoff stopped.")
    if package.get("sent"):
        raise ValueError("Weekly Email Sent? is already checked. Duplicate send blocked.")
    if not package.get("send_to_make"):
        raise ValueError("Send to Make? is not checked. Handoff stopped.")
    if not package.get("enrollment_id"):
        raise ValueError("Weekly Athlete Summary is missing Enrollment.")
    if not package.get("week_id"):
        raise ValueError("Weekly Athlete Summary is missing Week.")
    if not package.get("subject"):
        raise ValueError("Weekly Email Subject is blank.")
    if not package.get("recipients"):
        raise ValueError("Weekly Email Recipients is blank.")
    if not package.get("html"):
        raise ValueError("Weekly Email HTML is blank.")
    send_mode = package.get("send_mode", "test")
    if send_mode not in ("test", "live"):
        raise ValueError(f"Invalid send mode after normalization: {send_mode}")
    if send_mode == "test" and not test_recipient:
        raise ValueError("Missing testRecipientEmail for test mode.")

    event_id = f"WEEKLY_EMAIL|{package['enrollment_id']}|{package['week_id']}"
    to_email = test_recipient if send_mode == "test" else package["recipients"]

    if not webhook_ok:
        # Failure writeback: record error, KEEP Send to Make? for retry,
        # never touch Sent?.
        out.record["error"] = "Webhook failed with status 500"
        out.error = out.record["error"]
        assert out.record["send_to_make"] is True
        raise ConnectionError(out.record["error"])

    out.posted += 1
    out.record["posted_event_id"] = event_id
    out.record["posted_to"] = to_email
    # Success writeback: clear trigger + error; Make owns Sent?/Sent At.
    out.record["send_to_make"] = False
    out.record["error"] = ""
    assert "sent" in out.record and out.record["sent"] is False
    return out


def good_package(**overrides):
    package = {
        "ready": True,
        "sent": False,
        "send_to_make": True,
        "enrollment_id": SCHMIDT_ENROLLMENT_ID,
        "week_id": "recVDKiYATgzsfpmE",
        "subject": "127 Sports Intensity Weekly Summary | Testing Schmidt | Wk",
        "recipients": "mschmidt@fairfield.k12.mt.us",
        "html": "<html>ok</html>",
        "send_mode": "test",
    }
    package.update(overrides)
    return package


def scheduler_excludes(enrollment_id: str, *, include_schmidt: bool) -> bool:
    """118/119 v1.2: Schmidt excluded unless includeSchmidt=true."""
    return enrollment_id == SCHMIDT_ENROLLMENT_ID and not include_schmidt


class TestSuccessfulSend(unittest.TestCase):
    def test_posts_once_with_event_id_and_clears_trigger(self):
        out = send_to_make(good_package(), test_recipient="test@x.com")
        self.assertEqual(out.posted, 1)
        self.assertEqual(
            out.record["posted_event_id"],
            f"WEEKLY_EMAIL|{SCHMIDT_ENROLLMENT_ID}|recVDKiYATgzsfpmE",
        )
        self.assertFalse(out.record["send_to_make"])
        self.assertFalse(out.record["sent"])  # Make owns Sent?
        self.assertEqual(out.record["error"], "")

    def test_test_mode_routes_to_test_recipient_only(self):
        out = send_to_make(good_package(), test_recipient="controlled@test.local")
        self.assertEqual(out.record["posted_to"], "controlled@test.local")

    def test_live_mode_routes_to_real_recipients(self):
        out = send_to_make(good_package(send_mode="live"))
        self.assertEqual(out.record["posted_to"], "mschmidt@fairfield.k12.mt.us")


class TestValidationBlocks(unittest.TestCase):
    def test_missing_recipient_blocks(self):
        with self.assertRaisesRegex(ValueError, "Recipients is blank"):
            send_to_make(good_package(recipients=""), test_recipient="t@x.com")

    def test_missing_subject_blocks(self):
        with self.assertRaisesRegex(ValueError, "Subject is blank"):
            send_to_make(good_package(subject=""), test_recipient="t@x.com")

    def test_missing_body_blocks(self):
        with self.assertRaisesRegex(ValueError, "HTML is blank"):
            send_to_make(good_package(html=""), test_recipient="t@x.com")

    def test_already_sent_blocks_duplicate(self):
        with self.assertRaisesRegex(ValueError, "Duplicate send blocked"):
            send_to_make(good_package(sent=True), test_recipient="t@x.com")

    def test_not_ready_blocks(self):
        with self.assertRaisesRegex(ValueError, "Ready\\? is not checked"):
            send_to_make(good_package(ready=False), test_recipient="t@x.com")

    def test_test_mode_without_test_recipient_blocks(self):
        with self.assertRaisesRegex(ValueError, "testRecipientEmail"):
            send_to_make(good_package())


class TestFailureAndRetry(unittest.TestCase):
    def test_transient_error_keeps_trigger_and_records_error(self):
        package = good_package()
        with self.assertRaises(ConnectionError):
            send_to_make(package, webhook_ok=False, test_recipient="t@x.com")
        # Retry: the same package still validates and can be re-posted.
        out = send_to_make(package, webhook_ok=True, test_recipient="t@x.com")
        self.assertEqual(out.posted, 1)

    def test_duplicate_trigger_after_sent_is_blocked(self):
        # Simulate Make writeback: Sent? = true, then a stray re-trigger.
        with self.assertRaisesRegex(ValueError, "Duplicate send blocked"):
            send_to_make(good_package(sent=True, send_to_make=True),
                         test_recipient="t@x.com")

    def test_rerun_produces_same_event_id_for_make_dedupe(self):
        a = send_to_make(good_package(), test_recipient="t@x.com")
        b = send_to_make(good_package(), test_recipient="t@x.com")
        self.assertEqual(a.record["posted_event_id"], b.record["posted_event_id"])


class TestSchmidtAuthorization(unittest.TestCase):
    def test_schmidt_excluded_by_default(self):
        self.assertTrue(
            scheduler_excludes(SCHMIDT_ENROLLMENT_ID, include_schmidt=False)
        )

    def test_schmidt_included_only_with_explicit_override(self):
        self.assertFalse(
            scheduler_excludes(SCHMIDT_ENROLLMENT_ID, include_schmidt=True)
        )

    def test_other_enrollments_never_hit_schmidt_gate(self):
        self.assertFalse(scheduler_excludes("recSomeoneElse01", include_schmidt=False))

    def test_schmidt_live_send_targets_schmidt_controlled_address_only(self):
        out = send_to_make(good_package(send_mode="live"))
        self.assertIn("mschmidt@fairfield.k12.mt.us", out.record["posted_to"])


if __name__ == "__main__":
    unittest.main()
