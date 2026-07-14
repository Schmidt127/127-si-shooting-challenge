#!/usr/bin/env python3
"""C-025 — offline contract mirroring Zoom Attendance formula repair logic."""

from __future__ import annotations

from datetime import date, timedelta
import unittest


def blank(value) -> bool:
    return value is None or value == ""


def cfg_number(value, fallback: int) -> int:
    if blank(value):
        return fallback
    return int(value)


def cfg_bool_default_true(value) -> bool:
    if blank(value):
        return True
    return bool(value)


def cfg_bool_default_false(value) -> bool:
    if blank(value):
        return False
    return bool(value)


def zoom_credit_key(enrollment_rid: str | None, meeting_rid: str | None) -> str:
    if blank(enrollment_rid) or blank(meeting_rid):
        return ""
    return f"ZOOM_CREDIT|{enrollment_rid}|{meeting_rid}"


def recording_deadline(
    *,
    attendance_method: str,
    available_at: date | None,
    week_end: date | None,
    makeup_days,
    mode,
) -> date | None:
    if attendance_method != "Recording Quiz" or available_at is None:
        return None
    days = cfg_number(makeup_days, 7)
    resolved_mode = mode if not blank(mode) else "Later of Both"
    days_deadline = available_at + timedelta(days=days)
    if resolved_mode == "Days After Recording Available":
        return days_deadline
    if resolved_mode == "End of Program Week":
        return week_end
    if resolved_mode == "Earlier of Both":
        if days_deadline is None:
            return week_end
        if week_end is None:
            return days_deadline
        return min(days_deadline, week_end)
    # Later of Both
    if days_deadline is None:
        return week_end
    if week_end is None:
        return days_deadline
    return max(days_deadline, week_end)


def pre_approved(
    *,
    attendance_method: str,
    live_confirmed: bool,
    review_status: str | None,
    recording_path_enabled,
    requires_coach_approval,
) -> bool:
    if attendance_method == "Live":
        return bool(live_confirmed)
    if attendance_method != "Recording Quiz":
        return False
    if not cfg_bool_default_true(recording_path_enabled):
        return False
    # blank coach-approval config => required (safe)
    needs_coach = True if blank(requires_coach_approval) else bool(requires_coach_approval)
    if needs_coach:
        return review_status == "Satisfactory"
    return review_status in ("Satisfactory", "Needs Review")


def pair_tags_conflict(enrollment_rid: str, tags: str) -> bool:
    if blank(enrollment_rid) or blank(tags):
        return False
    return (f"{enrollment_rid}|LIVE" in tags) and (f"{enrollment_rid}|REC" in tags)


def credit_approved(*, preapproved: bool, conflict: bool) -> bool:
    return preapproved and not conflict


def xp_percentage(
    *,
    attendance_method: str,
    preapproved: bool,
    conflict: bool,
    effective_recording_pct,
) -> int:
    if conflict or not preapproved:
        return 0
    if attendance_method == "Live":
        return 100
    if attendance_method == "Recording Quiz":
        return cfg_number(effective_recording_pct, 50)
    return 0


def xp_amount(*, normal_live_xp, pct: int, approved: bool, conflict: bool) -> int:
    if conflict or not approved:
        return 0
    if blank(normal_live_xp):
        return 0
    return (int(normal_live_xp) * pct) // 100


def gate_credit(
    *,
    attendance_method: str,
    approved: bool,
    conflict: bool,
    effective_full_gate,
) -> bool:
    if conflict or not approved:
        return False
    if attendance_method == "Live":
        return True
    if attendance_method == "Recording Quiz":
        return cfg_bool_default_true(effective_full_gate)
    return False


def should_send_recording_approval_email(
    *,
    email_enabled,
    quiz_status: str,
    template_key: str | None,
) -> tuple[bool, str]:
    # Missing enabled (None) => do not send (catalog safe fallback)
    if email_enabled is None:
        return False, "skipped_config_missing_email_enabled"
    if not email_enabled:
        return False, "skipped_email_disabled"
    if quiz_status != "Satisfactory":
        return False, "skipped_not_satisfactory"
    if blank(template_key):
        return False, "skipped_missing_template_key"
    return True, "ok"


class TestC025FormulaRepairCreditKey(unittest.TestCase):
    def test_key_is_enrollment_plus_meeting_rid(self):
        self.assertEqual(
            zoom_credit_key("recE1", "recM1"),
            "ZOOM_CREDIT|recE1|recM1",
        )

    def test_key_identical_for_live_and_recording(self):
        live = zoom_credit_key("recE1", "recM1")
        rec = zoom_credit_key("recE1", "recM1")
        self.assertEqual(live, rec)
        self.assertNotIn("LIVE", live)
        self.assertNotIn("REC", live)
        self.assertNotIn("Recording", live)

    def test_missing_rid_returns_blank(self):
        self.assertEqual(zoom_credit_key(None, "recM1"), "")
        self.assertEqual(zoom_credit_key("recE1", ""), "")


class TestC025FormulaRepairXpAndGate(unittest.TestCase):
    def test_live_approval_gives_100_percent(self):
        pre = pre_approved(
            attendance_method="Live",
            live_confirmed=True,
            review_status=None,
            recording_path_enabled=True,
            requires_coach_approval=True,
        )
        pct = xp_percentage(
            attendance_method="Live",
            preapproved=pre,
            conflict=False,
            effective_recording_pct=50,
        )
        self.assertEqual(pct, 100)
        self.assertEqual(
            xp_amount(normal_live_xp=40, pct=pct, approved=True, conflict=False),
            40,
        )

    def test_approved_recording_uses_configured_percentage(self):
        pre = pre_approved(
            attendance_method="Recording Quiz",
            live_confirmed=False,
            review_status="Satisfactory",
            recording_path_enabled=True,
            requires_coach_approval=True,
        )
        pct = xp_percentage(
            attendance_method="Recording Quiz",
            preapproved=pre,
            conflict=False,
            effective_recording_pct=40,
        )
        self.assertEqual(pct, 40)
        self.assertEqual(
            xp_amount(normal_live_xp=50, pct=pct, approved=True, conflict=False),
            20,
        )

    def test_config_percentage_change_changes_xp(self):
        for pct_cfg, expect in ((25, 10), (50, 20), (100, 40)):
            pct = xp_percentage(
                attendance_method="Recording Quiz",
                preapproved=True,
                conflict=False,
                effective_recording_pct=pct_cfg,
            )
            self.assertEqual(
                xp_amount(normal_live_xp=40, pct=pct, approved=True, conflict=False),
                expect,
            )

    def test_recording_full_gate_when_enabled(self):
        self.assertTrue(
            gate_credit(
                attendance_method="Recording Quiz",
                approved=True,
                conflict=False,
                effective_full_gate=True,
            )
        )
        self.assertFalse(
            gate_credit(
                attendance_method="Recording Quiz",
                approved=True,
                conflict=False,
                effective_full_gate=False,
            )
        )

    def test_blank_gate_config_defaults_true(self):
        self.assertTrue(
            gate_credit(
                attendance_method="Recording Quiz",
                approved=True,
                conflict=False,
                effective_full_gate=None,
            )
        )


class TestC025FormulaRepairConflict(unittest.TestCase):
    def test_live_plus_recording_creates_conflict(self):
        tags = "recE1|LIVE,recE1|REC"
        self.assertTrue(pair_tags_conflict("recE1", tags))

    def test_conflict_forces_xp_amount_zero(self):
        pct = xp_percentage(
            attendance_method="Live",
            preapproved=True,
            conflict=True,
            effective_recording_pct=50,
        )
        self.assertEqual(pct, 0)
        self.assertEqual(
            xp_amount(normal_live_xp=40, pct=100, approved=False, conflict=True),
            0,
        )
        self.assertFalse(
            credit_approved(preapproved=True, conflict=True)
        )
        self.assertFalse(
            gate_credit(
                attendance_method="Live",
                approved=False,
                conflict=True,
                effective_full_gate=True,
            )
        )


class TestC025FormulaRepairDeadlineAndEmail(unittest.TestCase):
    def test_config_makeup_days_changes_deadline(self):
        available = date(2026, 7, 1)
        d7 = recording_deadline(
            attendance_method="Recording Quiz",
            available_at=available,
            week_end=date(2026, 7, 3),
            makeup_days=7,
            mode="Days After Recording Available",
        )
        d10 = recording_deadline(
            attendance_method="Recording Quiz",
            available_at=available,
            week_end=date(2026, 7, 3),
            makeup_days=10,
            mode="Days After Recording Available",
        )
        self.assertEqual(d7, date(2026, 7, 8))
        self.assertEqual(d10, date(2026, 7, 11))

    def test_missing_days_falls_back_to_seven(self):
        d = recording_deadline(
            attendance_method="Recording Quiz",
            available_at=date(2026, 7, 1),
            week_end=None,
            makeup_days=None,
            mode="Days After Recording Available",
        )
        self.assertEqual(d, date(2026, 7, 8))

    def test_missing_email_config_defaults_to_no_send(self):
        ok, reason = should_send_recording_approval_email(
            email_enabled=None,
            quiz_status="Satisfactory",
            template_key="ZOOM_RECORDING_APPROVED",
        )
        self.assertFalse(ok)
        self.assertEqual(reason, "skipped_config_missing_email_enabled")

    def test_recording_requires_satisfactory_when_coach_required(self):
        self.assertFalse(
            pre_approved(
                attendance_method="Recording Quiz",
                live_confirmed=False,
                review_status="Needs Review",
                recording_path_enabled=True,
                requires_coach_approval=True,
            )
        )
        self.assertTrue(
            pre_approved(
                attendance_method="Recording Quiz",
                live_confirmed=False,
                review_status="Satisfactory",
                recording_path_enabled=True,
                requires_coach_approval=True,
            )
        )


if __name__ == "__main__":
    unittest.main()
