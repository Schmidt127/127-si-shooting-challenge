#!/usr/bin/env python3
"""C-025 S20 — offline contracts for a single 117 Zoom Recording Credit orchestrator.

Context: DEV Airtable is at the automation-slot limit, so S20 may collapse 117a–f into
one (or at most two) orchestrator script(s). These tests lock the *behavior* that any
orchestrator must preserve — they do not require the JS file to exist yet.

When Agent A lands `117-*-orchestrator*.js` (or equivalent), re-run this suite and
extend with static source assertions (SCRIPT name, section order) against that file.

Expected step order (stage17 design, capacity-safe coalesce):
  1 normalize (117a) → 2 coach (117b) → 3 XP (117c) → 4 gate (117d) → 5 PW (117e) → 6 email (117f)

Hard rules encoded here:
  - XP is Recording Quiz only (Live stays 101)
  - Conflict deactivates existing ZOOM_CREDIT XP Event
  - Gate / Perfect Week use independent applied flags (idempotent)
  - Email: skipped_no_webhook (DEV-safe blank) and skipped_not_approved (conflict/!approved)
  - No PROD webhook defaults; never invent a Make URL
"""

from __future__ import annotations

import unittest
from dataclasses import dataclass, field
from typing import Any


ORCHESTRATOR_STEP_ORDER = (
    "normalize",
    "coach_review",
    "xp",
    "gate_credit",
    "perfect_week",
    "approval_email",
)


@dataclass
class OrchState:
    """Minimal Zoom Attendance row + side effects for orchestrator simulation."""

    id: str = "recZA"
    method: str = "Recording Quiz"
    enroll_rid: str = "recE"
    meeting_rid: str = "recM"
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
    # Side tables
    existing_xp_keys: set[str] = field(default_factory=set)
    xp_active: dict[str, bool] = field(default_factory=dict)
    attendees: set[str] = field(default_factory=set)
    siblings: list[OrchState] = field(default_factory=list)
    # Trace
    steps_run: list[str] = field(default_factory=list)
    actions: dict[str, str] = field(default_factory=dict)
    writes: dict[str, Any] = field(default_factory=dict)


def zoom_credit_key(enroll: str, meeting: str) -> str:
    return f"ZOOM_CREDIT|{enroll}|{meeting}"


def email_send_key(enroll: str, meeting: str) -> str:
    return f"ZOOM_REC_EMAIL|{enroll}|{meeting}"


def step_normalize(s: OrchState) -> str:
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
    s.writes["Recording Quiz Review Status"] = "Needs Review"
    return "normalized"


def step_coach(s: OrchState) -> str:
    if s.method != "Recording Quiz":
        return "skipped_not_recording_quiz"
    if s.review_status == "Satisfactory" and not s.satisfactory:
        s.satisfactory = True
        s.writes["Recording Quiz Satisfactory?"] = True
        return "marked_satisfactory"
    if s.review_status == "Needs Correction" and s.satisfactory:
        s.satisfactory = False
        s.writes["Recording Quiz Satisfactory?"] = False
        return "marked_needs_correction"
    return "skipped_unchanged"


def step_xp(s: OrchState) -> str:
    if s.method != "Recording Quiz":
        return "skipped_not_recording_quiz"
    key = zoom_credit_key(s.enroll_rid, s.meeting_rid)
    if not key.startswith("ZOOM_CREDIT|"):
        return "error_blank_key"
    exists = key in s.existing_xp_keys
    if not s.approved or s.conflict or s.xp_amount <= 0:
        if exists and s.xp_active.get(key, True):
            s.xp_active[key] = False
            return "deactivated_on_conflict"
        return "skipped_not_approved" if (not s.approved or s.conflict) else "skipped_zero_amount"
    if exists:
        if not s.xp_active.get(key, True):
            s.xp_active[key] = True
            return "updated"
        return "skipped_exists"
    s.existing_xp_keys.add(key)
    s.xp_active[key] = True
    return "created"


def step_gate(s: OrchState) -> str:
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
    s.writes["Gate Credit Applied?"] = True
    return "linked_attendee_for_gate"


def step_perfect_week(s: OrchState) -> str:
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
    s.writes["Perfect Week Credit Applied?"] = True
    return "linked_attendee_for_perfect_week"


def step_email(s: OrchState) -> str:
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
    # Orchestrator MUST NOT invent a PROD webhook
    if "hook.us1.make.com" in s.webhook and "prod" in s.webhook.lower():
        return "error_prod_webhook_blocked"
    s.send_key = sk
    s.writes["Recording Approval Email Send Key"] = sk
    return "sent"


STEP_FNS = {
    "normalize": step_normalize,
    "coach_review": step_coach,
    "xp": step_xp,
    "gate_credit": step_gate,
    "perfect_week": step_perfect_week,
    "approval_email": step_email,
}


def run_orchestrator(s: OrchState, *, stop_on_hard_skip: bool = False) -> OrchState:
    """Run all credit steps in locked order.

    `stop_on_hard_skip`: if True, abort remaining steps after duplicate-pair /
    not-recording-quiz on normalize (slot-safe early exit). Soft skips
    (e.g. skipped_no_webhook) still allow prior steps to complete.
    """
    hard_normalize_skips = {
        "skipped_not_recording_quiz",
        "skipped_missing_links",
        "skipped_duplicate_pair",
    }
    for name in ORCHESTRATOR_STEP_ORDER:
        action = STEP_FNS[name](s)
        s.steps_run.append(name)
        s.actions[name] = action
        if stop_on_hard_skip and name == "normalize" and action in hard_normalize_skips:
            break
    return s


class TestOrchestratorStepOrder(unittest.TestCase):
    def test_canonical_order_locked(self):
        self.assertEqual(
            ORCHESTRATOR_STEP_ORDER,
            (
                "normalize",
                "coach_review",
                "xp",
                "gate_credit",
                "perfect_week",
                "approval_email",
            ),
        )

    def test_happy_path_runs_all_six_steps_in_order(self):
        s = OrchState(
            review_status="Satisfactory",
            satisfactory=False,
            approved=True,
            gate_earned=True,
            pw_flag=True,
            webhook="https://hook.us1.make.com/dev-test-only",
        )
        run_orchestrator(s)
        self.assertEqual(s.steps_run, list(ORCHESTRATOR_STEP_ORDER))
        self.assertEqual(s.actions["normalize"], "skipped_already_normalized")
        self.assertEqual(s.actions["coach_review"], "marked_satisfactory")
        self.assertEqual(s.actions["xp"], "created")
        self.assertEqual(s.actions["gate_credit"], "linked_attendee_for_gate")
        self.assertEqual(s.actions["perfect_week"], "linked_attendee_for_perfect_week")
        self.assertEqual(s.actions["approval_email"], "sent")
        self.assertTrue(s.gate_applied)
        self.assertTrue(s.pw_applied)
        self.assertIn(s.enroll_rid, s.attendees)


class TestOrchestratorXpSafeguards(unittest.TestCase):
    def test_live_method_skips_xp(self):
        s = OrchState(method="Live", approved=True, review_status="Satisfactory")
        run_orchestrator(s, stop_on_hard_skip=True)
        self.assertEqual(s.actions.get("normalize"), "skipped_not_recording_quiz")
        self.assertNotIn("xp", s.actions)

    def test_recording_quiz_only_xp_when_continued(self):
        s = OrchState(method="Live", approved=True, xp_amount=20)
        # Force XP step in isolation (orchestrator step still guards)
        self.assertEqual(step_xp(s), "skipped_not_recording_quiz")

    def test_conflict_deactivates_existing_xp(self):
        key = zoom_credit_key("recE", "recM")
        s = OrchState(
            method="Recording Quiz",
            review_status="Satisfactory",
            satisfactory=True,
            approved=False,
            conflict=True,
            existing_xp_keys={key},
            xp_active={key: True},
        )
        run_orchestrator(s)
        self.assertEqual(s.actions["xp"], "deactivated_on_conflict")
        self.assertFalse(s.xp_active[key])

    def test_idempotent_xp_create(self):
        key = zoom_credit_key("recE", "recM")
        s = OrchState(
            review_status="Satisfactory",
            satisfactory=True,
            approved=True,
            existing_xp_keys={key},
            xp_active={key: True},
        )
        run_orchestrator(s)
        self.assertEqual(s.actions["xp"], "skipped_exists")


class TestOrchestratorGateAndPwFlags(unittest.TestCase):
    def test_gate_and_pw_flags_independent(self):
        s = OrchState(
            review_status="Satisfactory",
            satisfactory=True,
            approved=True,
            gate_earned=True,
            pw_flag=False,
        )
        run_orchestrator(s)
        self.assertEqual(s.actions["gate_credit"], "linked_attendee_for_gate")
        self.assertEqual(s.actions["perfect_week"], "skipped_flag_off")
        self.assertTrue(s.gate_applied)
        self.assertFalse(s.pw_applied)

    def test_gate_idempotent_on_rerun(self):
        s = OrchState(
            review_status="Satisfactory",
            satisfactory=True,
            approved=True,
            gate_earned=True,
            gate_applied=True,
        )
        self.assertEqual(step_gate(s), "skipped_already_applied")

    def test_pw_idempotent_on_rerun(self):
        s = OrchState(
            review_status="Satisfactory",
            satisfactory=True,
            approved=True,
            pw_flag=True,
            pw_applied=True,
        )
        self.assertEqual(step_perfect_week(s), "skipped_already_applied")

    def test_conflict_blocks_gate_and_pw(self):
        s = OrchState(
            review_status="Satisfactory",
            satisfactory=True,
            approved=True,
            conflict=True,
            gate_earned=True,
            pw_flag=True,
        )
        run_orchestrator(s)
        self.assertEqual(s.actions["gate_credit"], "skipped_conflict")
        self.assertEqual(s.actions["perfect_week"], "skipped_conflict")


class TestOrchestratorEmailSkipPaths(unittest.TestCase):
    def test_skipped_no_webhook_is_dev_safe(self):
        s = OrchState(
            review_status="Satisfactory",
            satisfactory=True,
            approved=True,
            webhook="",
        )
        run_orchestrator(s)
        self.assertEqual(s.actions["approval_email"], "skipped_no_webhook")
        self.assertEqual(s.send_key, "")

    def test_skipped_not_approved_on_conflict(self):
        s = OrchState(
            review_status="Satisfactory",
            satisfactory=True,
            approved=True,
            conflict=True,
            webhook="https://hook.us1.make.com/dev-test-only",
        )
        run_orchestrator(s)
        self.assertEqual(s.actions["approval_email"], "skipped_not_approved")

    def test_skipped_not_approved_when_not_approved(self):
        s = OrchState(
            review_status="Satisfactory",
            satisfactory=True,
            approved=False,
            webhook="https://hook.us1.make.com/dev-test-only",
        )
        self.assertEqual(step_email(s), "skipped_not_approved")

    def test_blank_webhook_does_not_block_prior_credit_steps(self):
        s = OrchState(
            review_status="Satisfactory",
            satisfactory=False,
            approved=True,
            gate_earned=True,
            pw_flag=True,
            webhook="",
        )
        run_orchestrator(s)
        self.assertEqual(s.actions["xp"], "created")
        self.assertEqual(s.actions["gate_credit"], "linked_attendee_for_gate")
        self.assertEqual(s.actions["perfect_week"], "linked_attendee_for_perfect_week")
        self.assertEqual(s.actions["approval_email"], "skipped_no_webhook")


class TestOrchestratorNoProdConcerns(unittest.TestCase):
    def test_default_webhook_empty(self):
        s = OrchState(review_status="Satisfactory", satisfactory=True, approved=True)
        self.assertEqual(s.webhook, "")
        run_orchestrator(s)
        self.assertEqual(s.actions["approval_email"], "skipped_no_webhook")

    def test_key_shapes_locked(self):
        self.assertEqual(zoom_credit_key("recE", "recM"), "ZOOM_CREDIT|recE|recM")
        self.assertEqual(email_send_key("recE", "recM"), "ZOOM_REC_EMAIL|recE|recM")


class TestOrchestratorSourcePresenceOptional(unittest.TestCase):
    """When Agent A lands the JS orchestrator, pin filename + safeguards if present."""

    def test_detect_orchestrator_js_if_present(self):
        from pathlib import Path

        root = Path(__file__).resolve().parents[3]
        auto = root / "airtable" / "automations" / "shooting-challenge"
        candidates = sorted(auto.glob("117*orchestrat*.js")) + sorted(
            auto.glob("117-zoom-recording-credit*.js")
        )
        # Prefer the explicit orchestrator filename if present
        preferred = auto / "117-zoom-recording-credit-orchestrator.js"
        if preferred.is_file():
            candidates = [preferred] + [c for c in candidates if c != preferred]
        if not candidates:
            self.skipTest("Orchestrator JS not present yet (Agent A deliverable)")
        text = candidates[0].read_text(encoding="utf-8")
        self.assertIn("Recording Quiz", text)
        self.assertIn("skipped_no_webhook", text)
        self.assertIn("skipped_not_approved", text)
        self.assertIn("deactivated_on_conflict", text)
        # Credit key comes from formula field (not a hardcoded ZOOM_CREDIT| literal)
        self.assertIn("Zoom Credit Key", text)
        self.assertIn("ZOOM_REC_EMAIL|", text)
        self.assertIn("Gate Credit Applied?", text)
        self.assertIn("Perfect Week Credit Applied?", text)
        # Locked A→F call order in main
        for marker in ("stepA(", "stepB(", "stepC(", "stepD(", "stepE(", "stepF("):
            self.assertIn(marker, text)
        pos = [text.find(m) for m in ("stepA(", "stepB(", "stepC(", "stepD(", "stepE(", "stepF(")]
        # main() calls appear after function defs; ensure ascending first-occurrence of async defs
        def_pos = [text.find(f"async function {name}") for name in ("stepA", "stepB", "stepC", "stepD", "stepE", "stepF")]
        self.assertTrue(all(p >= 0 for p in def_pos))
        self.assertEqual(def_pos, sorted(def_pos))
        self.assertNotRegex(text, r"https://hook\.[^\s\"']+", "no hardcoded Make webhook URL")


if __name__ == "__main__":
    unittest.main()
