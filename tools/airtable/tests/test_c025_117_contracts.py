#!/usr/bin/env python3
"""C-025 S18 — offline contract tests for 117a–f package decisions."""

from __future__ import annotations

import unittest
from dataclasses import dataclass, field


@dataclass
class ZaRow:
    id: str
    method: str
    enroll_rid: str
    meeting_rid: str
    review_status: str = ""
    satisfactory: bool = False
    approved: bool = False
    conflict: bool = False
    gate_earned: bool = False
    pw_flag: bool = False
    email_enabled: bool | None = None
    template: str = ""
    send_key: str = ""
    gate_applied: bool = False
    pw_applied: bool = False
    writes: dict = field(default_factory=dict)


def zoom_credit_key(enroll: str, meeting: str) -> str:
    return f"ZOOM_CREDIT|{enroll}|{meeting}"


def email_send_key(enroll: str, meeting: str) -> str:
    return f"ZOOM_REC_EMAIL|{enroll}|{meeting}"


def normalize_117a(row: ZaRow, siblings: list[ZaRow]):
    if row.method != "Recording Quiz":
        return "skipped_not_recording_quiz", {}
    if not row.enroll_rid or not row.meeting_rid:
        return "skipped_missing_links", {}
    for s in siblings:
        if s.id != row.id and s.enroll_rid == row.enroll_rid and s.meeting_rid == row.meeting_rid and s.review_status:
            return "skipped_duplicate_pair", {}
    if row.review_status:
        return "skipped_already_normalized", {}
    return "normalized", {"Recording Quiz Review Status": "Needs Review"}


def coach_review_117b(row: ZaRow):
    if row.method != "Recording Quiz":
        return "skipped_not_recording_quiz", {}
    if row.review_status == "Satisfactory" and not row.satisfactory:
        return "marked_satisfactory", {"Recording Quiz Satisfactory?": True}
    if row.review_status == "Needs Correction" and row.satisfactory:
        return "marked_needs_correction", {"Recording Quiz Satisfactory?": False}
    return "skipped_unchanged", {}


def xp_create_117c(*, approved: bool, conflict: bool, amount: float, key: str, existing: set[str]):
    if not key:
        return "error_blank_key"
    if not approved or conflict or amount <= 0:
        return "deactivated_on_conflict" if key in existing else "skipped_not_approved"
    if key in existing:
        return "skipped_exists"
    return "created"


def gate_credit_117d(row: ZaRow):
    if row.method != "Recording Quiz":
        return "skipped_not_recording_quiz"
    if row.conflict:
        return "skipped_conflict"
    if not row.gate_earned:
        return "skipped_no_gate_credit"
    if row.gate_applied:
        return "skipped_already_applied"
    return "linked_attendee_for_gate"


def perfect_week_117e(row: ZaRow):
    if row.method != "Recording Quiz":
        return "skipped_not_recording_quiz"
    if row.conflict:
        return "skipped_conflict"
    if not row.approved or not row.pw_flag:
        return "skipped_flag_off"
    if row.pw_applied:
        return "skipped_already_applied"
    return "linked_attendee_for_perfect_week"


def approval_email_117f(row: ZaRow, webhook: str):
    if row.method != "Recording Quiz":
        return "skipped_not_recording_quiz"
    if not row.satisfactory:
        return "skipped_not_satisfactory"
    if row.email_enabled is None:
        return "skipped_config_missing"
    if row.email_enabled is False:
        return "skipped_disabled"
    if not row.template:
        return "skipped_missing_template_key"
    sk = email_send_key(row.enroll_rid, row.meeting_rid)
    if row.send_key == sk:
        return "skipped_already_sent"
    if not webhook:
        return "skipped_no_webhook"
    return "sent"


class Test117a(unittest.TestCase):
    def test_normalize_first(self):
        row = ZaRow("recA", "Recording Quiz", "recE", "recM")
        action, writes = normalize_117a(row, [])
        self.assertEqual(action, "normalized")
        self.assertEqual(writes["Recording Quiz Review Status"], "Needs Review")

    def test_duplicate_pair(self):
        row = ZaRow("recB", "Recording Quiz", "recE", "recM")
        older = ZaRow("recA", "Recording Quiz", "recE", "recM", review_status="Needs Review")
        action, _ = normalize_117a(row, [older])
        self.assertEqual(action, "skipped_duplicate_pair")


class Test117b(unittest.TestCase):
    def test_satisfactory(self):
        row = ZaRow("recA", "Recording Quiz", "recE", "recM", review_status="Satisfactory", satisfactory=False)
        action, writes = coach_review_117b(row)
        self.assertEqual(action, "marked_satisfactory")
        self.assertTrue(writes["Recording Quiz Satisfactory?"])


class Test117c(unittest.TestCase):
    def test_key_shape(self):
        self.assertEqual(zoom_credit_key("recE", "recM"), "ZOOM_CREDIT|recE|recM")

    def test_idempotent(self):
        key = zoom_credit_key("recE", "recM")
        self.assertEqual(xp_create_117c(approved=True, conflict=False, amount=20, key=key, existing={key}), "skipped_exists")


class Test117d117e(unittest.TestCase):
    def test_gate(self):
        row = ZaRow("recA", "Recording Quiz", "recE", "recM", gate_earned=True)
        self.assertEqual(gate_credit_117d(row), "linked_attendee_for_gate")

    def test_pw_off(self):
        row = ZaRow("recA", "Recording Quiz", "recE", "recM", approved=True, pw_flag=False)
        self.assertEqual(perfect_week_117e(row), "skipped_flag_off")


class Test117f(unittest.TestCase):
    def test_safe_default(self):
        row = ZaRow("recA", "Recording Quiz", "recE", "recM", satisfactory=True, email_enabled=None, template="T")
        self.assertEqual(approval_email_117f(row, "https://example.com"), "skipped_config_missing")

    def test_no_webhook_dev_safe(self):
        row = ZaRow(
            "recA",
            "Recording Quiz",
            "recE",
            "recM",
            satisfactory=True,
            email_enabled=True,
            template="ZOOM_RECORDING_APPROVED",
        )
        self.assertEqual(approval_email_117f(row, ""), "skipped_no_webhook")


if __name__ == "__main__":
    unittest.main()
