"""Offline contracts for Phase D combined 072 (weekly email BUILD + optional Make SEND)."""

from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
COMBINED = (
    ROOT
    / "airtable/automations/shooting-challenge"
    / "072-email-notifications-and-external-handoffs-build-weekly-summary-email-package.js"
)
LEGACY_074 = (
    ROOT
    / "airtable/automations/shooting-challenge"
    / "074-email-notifications-and-external-handoffs-send-weekly-summary-email-package-to-make.js"
)
ROLLBACK_DIR = (
    ROOT
    / "airtable/automations/shooting-challenge/_rollback/phase-d-072-074-2026-07-14"
)


def decide_phase_d_actions(
    *,
    build_requested: bool,
    send_armed: bool,
    email_ready: bool,
    email_sent: bool,
    auto_send_after_build: bool = False,
    webhook_url: str = "",
    send_enabled: bool = True,
    subject: str = "",
    html: str = "",
    recipients: str = "",
) -> dict:
    """Mirror of decidePhaseDActions in combined 072 v4.0.0."""
    webhook_present = bool(str(webhook_url or "").strip())

    if email_sent and not build_requested:
        return {
            "do_build": False,
            "do_send": False,
            "action_out": "skipped_already_sent",
            "status_out": "skipped",
            "send_skip": "",
        }

    if not build_requested and not (send_armed and email_ready):
        return {
            "do_build": False,
            "do_send": False,
            "action_out": "skipped_nothing_to_do",
            "status_out": "skipped",
            "send_skip": "",
        }

    want_send_after_build = build_requested and (send_armed or auto_send_after_build)
    want_send_only = (not build_requested) and send_armed and email_ready
    do_send = want_send_after_build or want_send_only

    if do_send and email_sent:
        return {
            "do_build": build_requested,
            "do_send": False,
            "action_out": "built" if build_requested else "skipped_already_sent",
            "status_out": "success" if build_requested else "skipped",
            "send_skip": "skipped_already_sent",
        }

    if do_send and not send_enabled:
        return {
            "do_build": build_requested,
            "do_send": False,
            "action_out": "built" if build_requested else "skipped_send_disabled",
            "status_out": "success" if build_requested else "skipped",
            "send_skip": "skipped_send_disabled",
        }

    if do_send and not webhook_present:
        return {
            "do_build": build_requested,
            "do_send": False,
            "action_out": "built" if build_requested else "skipped_no_webhook",
            "status_out": "success" if build_requested else "skipped",
            "send_skip": "skipped_no_webhook",
        }

    if do_send and not want_send_after_build:
        if not subject.strip() or not html.strip():
            return {
                "do_build": False,
                "do_send": False,
                "action_out": "skipped_missing_package",
                "status_out": "skipped",
                "send_skip": "skipped_missing_package",
            }
        if not recipients.strip():
            return {
                "do_build": False,
                "do_send": False,
                "action_out": "skipped_missing_recipient",
                "status_out": "skipped",
                "send_skip": "skipped_missing_recipient",
            }

    return {
        "do_build": build_requested,
        "do_send": do_send,
        "action_out": (
            "built_and_sent"
            if build_requested and do_send
            else "built"
            if build_requested
            else "sent"
        ),
        "status_out": "success",
        "send_skip": "",
    }


def build_send_key(enrollment_id: str, week_id: str, revision: str) -> str:
    return f"WEEKLY_SUMMARY|{enrollment_id}|{week_id}|{revision}"


def mock_make_handoff(*, webhook_ok: bool, sent_already: bool = False) -> dict:
    """Unit-level Make success/fail + already-sent contract."""
    if sent_already:
        return {"ok": False, "action": "skipped_already_sent", "clear_send_flag": False}
    if not webhook_ok:
        return {
            "ok": False,
            "action": "error",
            "clear_send_flag": False,  # retryable — do not clear Send to Make?
            "write_error": True,
        }
    return {
        "ok": True,
        "action": "sent",
        "clear_send_flag": True,
        "write_sent": False,  # Make owns Weekly Email Sent?
    }


def week_boundary_includes(date_key: str, week_start: str, week_end: str) -> bool:
    """072 contract: inclusive Week Start/End Keys (America/Denver date keys)."""
    if not date_key or not week_start or not week_end:
        return True  # 072 allows through when keys missing
    return week_start <= date_key <= week_end


class TestPhaseDCombined(unittest.TestCase):
    def test_combined_version_and_helpers(self):
        text = COMBINED.read_text(encoding="utf-8")
        self.assertIn("v4.0.0", text)
        self.assertIn("decidePhaseDActions", text)
        self.assertIn("sendWeeklyPackageToMake", text)
        self.assertIn("SECTION 22B", text)
        self.assertIn("phaseDAbsorbed", text)
        self.assertIn("WEEKLY_SUMMARY|", text)
        self.assertIn("skipped_no_webhook", text)
        self.assertIn("Do not uncheck Send to Make?", text)

    def test_rollback_present(self):
        self.assertTrue(
            (
                ROLLBACK_DIR
                / "072-email-notifications-and-external-handoffs-build-weekly-summary-email-package.js"
            ).is_file()
        )
        self.assertTrue(
            (
                ROLLBACK_DIR
                / "074-email-notifications-and-external-handoffs-send-weekly-summary-email-package-to-make.js"
            ).is_file()
        )
        self.assertTrue((ROLLBACK_DIR / "README.md").is_file())
        rb072 = (
            ROLLBACK_DIR
            / "072-email-notifications-and-external-handoffs-build-weekly-summary-email-package.js"
        ).read_text(encoding="utf-8")
        self.assertIn("v3.7", rb072)
        self.assertNotIn("v4.0.0", rb072)
        self.assertNotIn("LIBRARY ONLY", rb072)

    def test_074_is_library_stub(self):
        body = LEGACY_074.read_text(encoding="utf-8")
        self.assertIn("LIBRARY ONLY", body)
        self.assertIn("throw new Error", body)
        self.assertIn("072-email-notifications", body)

    def test_build_only(self):
        r = decide_phase_d_actions(
            build_requested=True,
            send_armed=False,
            email_ready=False,
            email_sent=False,
            webhook_url="",
        )
        self.assertTrue(r["do_build"])
        self.assertFalse(r["do_send"])
        self.assertEqual(r["action_out"], "built")

    def test_package_exists_send_ready(self):
        r = decide_phase_d_actions(
            build_requested=False,
            send_armed=True,
            email_ready=True,
            email_sent=False,
            webhook_url="https://hook.example/test",
            subject="Weekly Summary",
            html="<p>hi</p>",
            recipients="parent@example.com",
        )
        self.assertFalse(r["do_build"])
        self.assertTrue(r["do_send"])
        self.assertEqual(r["action_out"], "sent")

    def test_send_disabled(self):
        r = decide_phase_d_actions(
            build_requested=False,
            send_armed=True,
            email_ready=True,
            email_sent=False,
            webhook_url="https://hook.example/test",
            send_enabled=False,
            subject="S",
            html="<p>x</p>",
            recipients="a@b.c",
        )
        self.assertFalse(r["do_send"])
        self.assertEqual(r["action_out"], "skipped_send_disabled")

    def test_webhook_blank_safe_no_send(self):
        r = decide_phase_d_actions(
            build_requested=False,
            send_armed=True,
            email_ready=True,
            email_sent=False,
            webhook_url="   ",
            subject="S",
            html="<p>x</p>",
            recipients="a@b.c",
        )
        self.assertFalse(r["do_send"])
        self.assertEqual(r["action_out"], "skipped_no_webhook")

    def test_build_with_blank_webhook_still_builds(self):
        r = decide_phase_d_actions(
            build_requested=True,
            send_armed=True,
            email_ready=False,
            email_sent=False,
            webhook_url="",
            auto_send_after_build=True,
        )
        self.assertTrue(r["do_build"])
        self.assertFalse(r["do_send"])
        self.assertEqual(r["send_skip"], "skipped_no_webhook")
        self.assertEqual(r["action_out"], "built")

    def test_send_ready_with_auto_after_build(self):
        r = decide_phase_d_actions(
            build_requested=True,
            send_armed=False,
            email_ready=False,
            email_sent=False,
            auto_send_after_build=True,
            webhook_url="https://hook.example/test",
        )
        self.assertTrue(r["do_build"])
        self.assertTrue(r["do_send"])
        self.assertEqual(r["action_out"], "built_and_sent")

    def test_mocked_make_success(self):
        r = mock_make_handoff(webhook_ok=True)
        self.assertTrue(r["ok"])
        self.assertTrue(r["clear_send_flag"])
        self.assertFalse(r["write_sent"])

    def test_mocked_make_fail_retryable(self):
        r = mock_make_handoff(webhook_ok=False)
        self.assertFalse(r["ok"])
        self.assertFalse(r["clear_send_flag"])
        self.assertTrue(r["write_error"])

    def test_retry_preserves_send_arm_contract(self):
        """Webhook failure must leave Send to Make? armed (074 design rule)."""
        fail = mock_make_handoff(webhook_ok=False)
        self.assertFalse(fail["clear_send_flag"])
        retry = mock_make_handoff(webhook_ok=True)
        self.assertTrue(retry["clear_send_flag"])

    def test_already_sent(self):
        r = decide_phase_d_actions(
            build_requested=False,
            send_armed=True,
            email_ready=True,
            email_sent=True,
            webhook_url="https://hook.example/test",
            subject="S",
            html="<p>x</p>",
            recipients="a@b.c",
        )
        self.assertEqual(r["action_out"], "skipped_already_sent")
        self.assertFalse(r["do_send"])

    def test_duplicate_trigger_nothing_to_do(self):
        r = decide_phase_d_actions(
            build_requested=False,
            send_armed=False,
            email_ready=True,
            email_sent=False,
        )
        self.assertEqual(r["action_out"], "skipped_nothing_to_do")

    def test_missing_recipient(self):
        r = decide_phase_d_actions(
            build_requested=False,
            send_armed=True,
            email_ready=True,
            email_sent=False,
            webhook_url="https://hook.example/test",
            subject="S",
            html="<p>x</p>",
            recipients="",
        )
        self.assertEqual(r["action_out"], "skipped_missing_recipient")

    def test_missing_template_fields(self):
        r = decide_phase_d_actions(
            build_requested=False,
            send_armed=True,
            email_ready=True,
            email_sent=False,
            webhook_url="https://hook.example/test",
            subject="",
            html="",
            recipients="a@b.c",
        )
        self.assertEqual(r["action_out"], "skipped_missing_package")

    def test_send_key_idempotent_shape(self):
        key = build_send_key("recEnroll", "recWeek", "v4.0.0")
        self.assertEqual(key, "WEEKLY_SUMMARY|recEnroll|recWeek|v4.0.0")
        text = COMBINED.read_text(encoding="utf-8")
        self.assertIn("buildWeeklySendKey", text)

    def test_weekly_timing_boundary_inclusive(self):
        # Saturday inside Fri–Thu week? depends on keys — contract is inclusive compare
        self.assertTrue(week_boundary_includes("2026-07-11", "2026-07-06", "2026-07-12"))
        self.assertTrue(week_boundary_includes("2026-07-06", "2026-07-06", "2026-07-12"))
        self.assertTrue(week_boundary_includes("2026-07-12", "2026-07-06", "2026-07-12"))
        self.assertFalse(week_boundary_includes("2026-07-05", "2026-07-06", "2026-07-12"))
        self.assertFalse(week_boundary_includes("2026-07-13", "2026-07-06", "2026-07-12"))

    def test_weekly_timing_missing_keys_passthrough(self):
        self.assertTrue(week_boundary_includes("2026-07-11", "", "2026-07-12"))
        self.assertTrue(week_boundary_includes("", "2026-07-06", "2026-07-12"))

    def test_combined_documents_ready_for_authorization(self):
        text = COMBINED.read_text(encoding="utf-8")
        self.assertIn("READY_FOR_AUTHORIZATION", text)
        plan = (
            ROOT / "docs/deploy-checklists/PHASE-D-072-074-bootstrap-plan.md"
        ).read_text(encoding="utf-8")
        self.assertIn("READY_FOR_AUTHORIZATION", plan)
        decision = (
            ROOT / "docs/overnight-runs/results/S26-phase-d-decision.md"
        ).read_text(encoding="utf-8")
        self.assertIn("safe_with_conditions", decision)


if __name__ == "__main__":
    unittest.main()
