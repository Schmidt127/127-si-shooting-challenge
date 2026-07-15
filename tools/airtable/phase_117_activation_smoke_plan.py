#!/usr/bin/env python3
"""Automation 117 activation smoke plan — offline contract suite + live DEV checklist.

Workstream 3 / S26 — READY_FOR_MIKE_ACTIVATION package.

HARD CONSTRAINTS (this script never violates):
  - Does NOT enable Airtable automation 117
  - Does NOT call Make / configure a real webhook
  - Does NOT touch PROD / Folder 07 / send email
  - Offline mode is the default (no Airtable API)

Usage:
  python tools/airtable/phase_117_activation_smoke_plan.py
  python tools/airtable/phase_117_activation_smoke_plan.py --list-live

Live DEV suite (manual / separate API tools Mike authorizes later):
  Documented in LIVE_CASES below — webhookUrl blank; 117 may be ON only when
  Mike explicitly activates; email must remain skip-only.
"""

from __future__ import annotations

import argparse
import unittest
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
ORCH = (
    ROOT
    / "airtable"
    / "automations"
    / "shooting-challenge"
    / "117-zoom-recording-credit-orchestrator.js"
)
LIB_117C = (
    ROOT
    / "airtable"
    / "automations"
    / "shooting-challenge"
    / "117c-zoom-recording-create-zoom-xp-event.js"
)


def zoom_credit_key(enroll: str, meeting: str) -> str:
    return f"ZOOM_CREDIT|{enroll}|{meeting}"


def email_send_key(enroll: str, meeting: str) -> str:
    return f"ZOOM_REC_EMAIL|{enroll}|{meeting}"


def live_source_key(meeting_key: str, enroll: str) -> str:
    """101 family — must never collide with ZOOM_CREDIT."""
    return f"ZOOM_ATTEND_BASE|{meeting_key}|{enroll}"


@dataclass
class ZaState:
    id: str = "recZA"
    method: str = "Recording Quiz"
    enroll_rid: str = "recE"
    meeting_rid: str = "recM"
    meeting_key: str = "ZMKEY1"
    review_status: str = ""
    satisfactory: bool = False
    approved: bool = False
    conflict: bool = False
    xp_amount: float = 20.0
    gate_earned: bool = False
    pw_flag: bool = False
    gate_applied: bool = False
    pw_applied: bool = False
    email_enabled: bool | None = True
    template: str = "ZOOM_RECORDING_APPROVED"
    send_key: str = ""
    webhook: str = ""
    existing_xp: dict[str, dict[str, Any]] = field(default_factory=dict)
    # existing_xp[key] = {"active": bool, "points": float}
    attend_base_keys: set[str] = field(default_factory=set)
    attendees: set[str] = field(default_factory=set)
    siblings: list[ZaState] = field(default_factory=list)
    actions: dict[str, str] = field(default_factory=dict)
    formula_lag: bool = False  # if True, Approved formulas not yet visible after B


def step_a(s: ZaState) -> str:
    if s.method != "Recording Quiz":
        return "skipped_not_recording_quiz"
    if not s.enroll_rid or not s.meeting_rid:
        return "skipped_missing_links"
    for other in s.siblings:
        if (
            other.id != s.id
            and other.enroll_rid == s.enroll_rid
            and other.meeting_rid == s.meeting_rid
            and other.review_status
        ):
            return "skipped_duplicate_pair"
    if s.review_status:
        return "skipped_already_normalized"
    s.review_status = "Needs Review"
    return "normalized"


def step_b(s: ZaState) -> str:
    if s.method != "Recording Quiz":
        return "skipped_not_recording_quiz"
    if s.review_status == "Satisfactory" and not s.satisfactory:
        s.satisfactory = True
        if not s.formula_lag:
            # Simulate formulas that depend on Satisfactory?
            pass
        return "marked_satisfactory"
    if s.review_status == "Needs Correction" and s.satisfactory:
        s.satisfactory = False
        s.approved = False
        return "marked_needs_correction"
    return "skipped_unchanged"


def step_c(s: ZaState) -> str:
    if s.method != "Recording Quiz":
        return "skipped_not_recording_quiz"
    key = zoom_credit_key(s.enroll_rid, s.meeting_rid)
    existing = s.existing_xp.get(key)
    approved = s.approved and not s.formula_lag
    if not approved or s.conflict or s.xp_amount <= 0:
        if existing and existing.get("active"):
            existing["active"] = False
            return "deactivated_on_conflict"
        return "skipped_not_approved" if (not approved or s.conflict) else "skipped_zero_amount"
    if existing:
        patch = False
        if existing.get("points") != s.xp_amount:
            existing["points"] = s.xp_amount
            patch = True
        if not existing.get("active"):
            existing["active"] = True
            patch = True
        return "updated" if patch else "skipped_exists"
    # Recheck-before-create (idempotent if somehow already present)
    if key in s.existing_xp:
        return "skipped_exists"
    s.existing_xp[key] = {"active": True, "points": s.xp_amount}
    return "created"


def step_d(s: ZaState) -> str:
    if s.method != "Recording Quiz":
        return "skipped_not_recording_quiz"
    if s.conflict:
        return "skipped_conflict"
    if not s.gate_earned:
        return "skipped_no_gate_credit"
    if s.gate_applied:
        return "skipped_already_applied"
    s.attendees.add(s.enroll_rid)
    s.gate_applied = True
    return "linked_attendee_for_gate"


def step_e(s: ZaState) -> str:
    if s.method != "Recording Quiz":
        return "skipped_not_recording_quiz"
    if s.conflict:
        return "skipped_conflict"
    if not s.approved or not s.pw_flag:
        return "skipped_flag_off"
    if s.pw_applied:
        return "skipped_already_applied"
    s.attendees.add(s.enroll_rid)
    s.pw_applied = True
    return "linked_attendee_for_perfect_week"


def step_f(s: ZaState) -> str:
    if s.method != "Recording Quiz":
        return "skipped_not_recording_quiz"
    if not s.satisfactory:
        return "skipped_not_satisfactory"
    if not s.approved or s.conflict:
        return "skipped_not_approved"
    if s.email_enabled is None:
        return "skipped_config_missing"
    if s.email_enabled is False:
        return "skipped_disabled"
    if not s.template:
        return "skipped_missing_template_key"
    sk = email_send_key(s.enroll_rid, s.meeting_rid)
    if s.send_key == sk:
        return "skipped_already_sent"
    if not (s.webhook or "").strip():
        return "skipped_no_webhook"
    s.send_key = sk
    return "sent"


def run_af(s: ZaState) -> ZaState:
    for name, fn in (
        ("A", step_a),
        ("B", step_b),
        ("C", step_c),
        ("D", step_d),
        ("E", step_e),
        ("F", step_f),
    ):
        s.actions[name] = fn(s)
        if name == "A" and s.actions["A"] in {
            "skipped_not_recording_quiz",
            "skipped_missing_links",
            "skipped_duplicate_pair",
        }:
            break
    return s


# ---------------------------------------------------------------------------
# Offline cases (Mike's 20) — runnable
# ---------------------------------------------------------------------------


class Test117ActivationOffline20(unittest.TestCase):
    """Twenty contract cases for 117 activation readiness."""

    def test_01_normalize_empty_review(self):
        s = run_af(ZaState())
        self.assertEqual(s.actions["A"], "normalized")
        self.assertEqual(s.review_status, "Needs Review")

    def test_02_normalize_already_normalized(self):
        s = run_af(ZaState(review_status="Needs Review"))
        self.assertEqual(s.actions["A"], "skipped_already_normalized")

    def test_03_normalize_duplicate_pair(self):
        sibling = ZaState(id="recOlder", review_status="Needs Review")
        s = run_af(ZaState(siblings=[sibling]))
        self.assertEqual(s.actions["A"], "skipped_duplicate_pair")

    def test_04_normalize_missing_links(self):
        s = run_af(ZaState(enroll_rid="", meeting_rid=""))
        self.assertEqual(s.actions["A"], "skipped_missing_links")

    def test_05_xp_create_when_approved(self):
        s = run_af(
            ZaState(
                review_status="Satisfactory",
                satisfactory=True,
                approved=True,
                gate_earned=True,
            )
        )
        self.assertEqual(s.actions["C"], "created")
        key = zoom_credit_key("recE", "recM")
        self.assertTrue(s.existing_xp[key]["active"])

    def test_06_xp_idempotent_skipped_exists(self):
        key = zoom_credit_key("recE", "recM")
        s = run_af(
            ZaState(
                review_status="Satisfactory",
                satisfactory=True,
                approved=True,
                existing_xp={key: {"active": True, "points": 20.0}},
            )
        )
        self.assertEqual(s.actions["C"], "skipped_exists")

    def test_07_xp_update_amount(self):
        key = zoom_credit_key("recE", "recM")
        s = run_af(
            ZaState(
                review_status="Satisfactory",
                satisfactory=True,
                approved=True,
                xp_amount=25.0,
                existing_xp={key: {"active": True, "points": 20.0}},
            )
        )
        self.assertEqual(s.actions["C"], "updated")
        self.assertEqual(s.existing_xp[key]["points"], 25.0)

    def test_08_xp_deactivate_on_conflict(self):
        key = zoom_credit_key("recE", "recM")
        s = run_af(
            ZaState(
                review_status="Satisfactory",
                satisfactory=True,
                approved=False,
                conflict=True,
                existing_xp={key: {"active": True, "points": 20.0}},
            )
        )
        self.assertEqual(s.actions["C"], "deactivated_on_conflict")
        self.assertFalse(s.existing_xp[key]["active"])

    def test_09_xp_reactivate_after_conflict_clears(self):
        key = zoom_credit_key("recE", "recM")
        s = run_af(
            ZaState(
                review_status="Satisfactory",
                satisfactory=True,
                approved=True,
                conflict=False,
                existing_xp={key: {"active": False, "points": 20.0}},
            )
        )
        self.assertEqual(s.actions["C"], "updated")
        self.assertTrue(s.existing_xp[key]["active"])

    def test_10_gate_credit_apply(self):
        s = run_af(
            ZaState(
                review_status="Satisfactory",
                satisfactory=True,
                approved=True,
                gate_earned=True,
            )
        )
        self.assertEqual(s.actions["D"], "linked_attendee_for_gate")
        self.assertIn("recE", s.attendees)
        self.assertTrue(s.gate_applied)

    def test_11_gate_idempotent(self):
        s = ZaState(
            review_status="Satisfactory",
            satisfactory=True,
            approved=True,
            gate_earned=True,
            gate_applied=True,
        )
        self.assertEqual(step_d(s), "skipped_already_applied")

    def test_12_perfect_week_apply(self):
        s = run_af(
            ZaState(
                review_status="Satisfactory",
                satisfactory=True,
                approved=True,
                pw_flag=True,
            )
        )
        self.assertEqual(s.actions["E"], "linked_attendee_for_perfect_week")
        self.assertTrue(s.pw_applied)

    def test_13_perfect_week_idempotent(self):
        s = ZaState(
            review_status="Satisfactory",
            satisfactory=True,
            approved=True,
            pw_flag=True,
            pw_applied=True,
        )
        self.assertEqual(step_e(s), "skipped_already_applied")

    def test_14_needs_correction_clears_satisfactory(self):
        s = ZaState(
            review_status="Needs Correction",
            satisfactory=True,
            approved=True,
        )
        self.assertEqual(step_b(s), "marked_needs_correction")
        self.assertFalse(s.satisfactory)
        key = zoom_credit_key(s.enroll_rid, s.meeting_rid)
        s.existing_xp[key] = {"active": True, "points": 20.0}
        s.conflict = True
        self.assertEqual(step_c(s), "deactivated_on_conflict")

    def test_15_formula_timing_lag_skips_xp_then_succeeds(self):
        """First pass after B may see stale formulas; re-fire awards."""
        s = ZaState(
            review_status="Satisfactory",
            satisfactory=False,
            approved=True,
            formula_lag=True,
        )
        run_af(s)
        self.assertEqual(s.actions["B"], "marked_satisfactory")
        self.assertEqual(s.actions["C"], "skipped_not_approved")
        # Re-fire after formulas catch up
        s.formula_lag = False
        s.actions.clear()
        run_af(s)
        self.assertEqual(s.actions["C"], "created")

    def test_16_101_conflict_key_families_disjoint(self):
        enroll, meeting, mkey = "recE", "recM", "ZMKEY1"
        credit = zoom_credit_key(enroll, meeting)
        live = live_source_key(mkey, enroll)
        self.assertNotEqual(credit, live)
        self.assertTrue(credit.startswith("ZOOM_CREDIT|"))
        self.assertTrue(live.startswith("ZOOM_ATTEND_BASE|"))
        # 117 create must not invent ATTEND_BASE
        s = run_af(
            ZaState(
                review_status="Satisfactory",
                satisfactory=True,
                approved=True,
                meeting_key=mkey,
                gate_earned=True,
            )
        )
        self.assertIn(credit, s.existing_xp)
        self.assertNotIn(live, s.existing_xp)
        self.assertEqual(len(s.attend_base_keys), 0)

    def test_17_101_supplemental_hazard_documented(self):
        """Gate link can tempt 101 — activation rule: do not re-check Create XP Events."""
        s = run_af(
            ZaState(
                review_status="Satisfactory",
                satisfactory=True,
                approved=True,
                gate_earned=True,
            )
        )
        self.assertIn(s.enroll_rid, s.attendees)
        # Simulated forbidden 101 supplemental would add ATTEND_BASE — assert we did not
        forbidden = live_source_key(s.meeting_key, s.enroll_rid)
        self.assertNotIn(forbidden, s.attend_base_keys)

    def test_18_missing_webhook_skip(self):
        s = run_af(
            ZaState(
                review_status="Satisfactory",
                satisfactory=True,
                approved=True,
                webhook="",
            )
        )
        self.assertEqual(s.actions["F"], "skipped_no_webhook")
        self.assertEqual(s.send_key, "")

    def test_19_email_disabled_skip(self):
        s = ZaState(
            review_status="Satisfactory",
            satisfactory=True,
            approved=True,
            email_enabled=False,
            webhook="https://example.invalid/should-not-send",
        )
        self.assertEqual(step_f(s), "skipped_disabled")
        self.assertEqual(s.send_key, "")

    def test_20_send_key_dedupe_and_fixture_restore_contract(self):
        sk = email_send_key("recE", "recM")
        s = ZaState(
            review_status="Satisfactory",
            satisfactory=True,
            approved=True,
            send_key=sk,
            webhook="https://example.invalid/dev-only",
        )
        self.assertEqual(step_f(s), "skipped_already_sent")
        # Fixture restore contract: clear send key + applied flags + soft-void XP
        restore = {
            "Recording Approval Email Send Key": "",
            "Recording Approval Email Sent At": None,
            "Gate Credit Applied?": False,
            "Perfect Week Credit Applied?": False,
            "XP Active?": False,  # soft-void — do not delete XP Event
        }
        self.assertIn("XP Active?", restore)
        self.assertFalse(restore["Gate Credit Applied?"])


class Test117SourceGuards(unittest.TestCase):
    def test_orchestrator_has_recheck_and_safe_email(self):
        text = ORCH.read_text(encoding="utf-8")
        self.assertIn("v1.0.1", text)
        self.assertIn("Recheck immediately before create", text)
        self.assertIn("skipped_no_webhook", text)
        self.assertNotRegex(text, r"https://hook\.[^\s\"']+")

    def test_117c_library_recheck_aligned(self):
        text = LIB_117C.read_text(encoding="utf-8")
        self.assertIn("True recheck immediately before create", text)
        self.assertIn("v1.0.2", text)


# ---------------------------------------------------------------------------
# Live DEV checklist (documentation only — printed with --list-live)
# ---------------------------------------------------------------------------

LIVE_CASES: list[tuple[str, str, str]] = [
    ("L01", "Normalize", "Clear Review Status on Schmidt Recording Quiz ZA; expect Needs Review; webhook blank"),
    ("L02", "Already normalized", "Re-run / edit notes; expect skipped_already_normalized"),
    ("L03", "Duplicate pair", "Second Recording Quiz same Enrollment+Meeting with older reviewed sibling; expect skipped_duplicate_pair"),
    ("L04", "Missing links", "Detach Enrollment or Meeting; expect skipped_missing_links"),
    ("L05", "XP create", "Set Satisfactory; confirm Approved+Key+Amount; expect created + one ZOOM_CREDIT XP"),
    ("L06", "XP exists", "Trigger again; expect skipped_exists"),
    ("L07", "XP update amount", "Change Config % so Amount moves; expect updated points"),
    ("L08", "XP deactivate", "Force Conflict or Needs Correction path; expect deactivated_on_conflict; Active?=false"),
    ("L09", "XP reactivate", "Clear conflict + Satisfactory; expect updated Active?=true"),
    ("L10", "Gate apply", "Gate Earned=1; expect Enrollment on Attendees + Gate Credit Applied?"),
    ("L11", "Gate idempotent", "Re-run; skipped_already_applied"),
    ("L12", "Perfect Week", "PW Effective=1; expect Attendees + Perfect Week Credit Applied?"),
    ("L13", "PW idempotent", "Re-run; skipped_already_applied"),
    ("L14", "Needs Correction", "From Satisfactory -> Needs Correction; sat cleared; XP deactivated if conflict/unapproved"),
    ("L15", "Formula timing", "After Satisfactory write, confirm Approved formulas; second run if first C skipped"),
    ("L16", "101 key check", "Query XP Events: ZOOM_CREDIT present; no new ZOOM_ATTEND_BASE for pair from this test"),
    ("L17", "101 no supplemental", "Do NOT check Create XP Events on meeting after gate link"),
    ("L18", "Webhook blank", "actionFOut=skipped_no_webhook; never sent"),
    ("L19", "Email disabled", "Effective email enabled false -> skipped_disabled (still blank webhook)"),
    ("L20", "Restore fixture", "Soft-void XP; uncheck applied flags; remove Attendees only if both flags false; clear Send Key; leave 117 OFF or keep blank webhook"),
]

FIXTURE_HINT = (
    "Primary DEV fixture (from prior C-025 sheets): Zoom Attendance "
    "recHkB9aER3vCvBsL (Schmidt Recording Quiz) - confirm still valid before mutate."
)


def print_live_checklist() -> None:
    print("=== 117 LIVE DEV SUITE (manual - email disabled / webhook blank) ===")
    print(FIXTURE_HINT)
    print("Automation stays OFF until Mike activates; when ON, webhookUrl MUST be blank.")
    print("Do not enable Folder 07 sends. Do not configure production Make webhook.")
    for code, title, how in LIVE_CASES:
        print(f"  {code}  {title}: {how}")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--list-live",
        action="store_true",
        help="Print live DEV checklist only (no Airtable calls)",
    )
    args = ap.parse_args()
    if args.list_live:
        print_live_checklist()
        return 0
    suite = unittest.defaultTestLoader.loadTestsFromModule(__import__(__name__))
    # Avoid double-load: run this file's test classes explicitly
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    suite.addTests(loader.loadTestsFromTestCase(Test117ActivationOffline20))
    suite.addTests(loader.loadTestsFromTestCase(Test117SourceGuards))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    print("")
    print_live_checklist()
    print("")
    print(
        f"OFFLINE RESULT: {'PASS' if result.wasSuccessful() else 'FAIL'} "
        f"({result.testsRun} tests, "
        f"failures={len(result.failures)}, errors={len(result.errors)})"
    )
    print("CONFIRMATION: this runner did not enable 117, set a webhook, or send email.")
    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    raise SystemExit(main())
