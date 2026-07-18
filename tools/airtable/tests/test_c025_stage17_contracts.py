"""Stage 17 Zoom Attendance source-key and exclusivity contracts."""

from __future__ import annotations

import unittest
from pathlib import Path


SOURCE_PREFIX = "ZOOM_CREDIT"
LIVE_PREFIX = "ZOOM_ATTEND_BASE"
XP_BUCKET = "Zoom Attendance"
XP_SOURCE = "Zoom Meeting Recording Quiz"
DATE_FIELD = "XP Activity Date"

ROOT = Path(__file__).resolve().parents[3] / "airtable" / "automations" / "shooting-challenge"


def build_credit_key(enrollment_id: str, meeting_id: str) -> str:
    return f"{SOURCE_PREFIX}|{enrollment_id}|{meeting_id}"


def build_live_key(meeting_key: str, enrollment_id: str) -> str:
    return f"{LIVE_PREFIX}|{meeting_key}|{enrollment_id}"


class TestStage17Contracts(unittest.TestCase):
    def test_keys_disjoint(self):
        credit = build_credit_key("recE", "recM")
        live = build_live_key("recM", "recE")
        self.assertTrue(credit.startswith(SOURCE_PREFIX + "|"))
        self.assertTrue(live.startswith(LIVE_PREFIX + "|"))
        self.assertNotEqual(credit, live)

    def test_canonical_labels_not_s16(self):
        self.assertEqual(XP_BUCKET, "Zoom Attendance")
        self.assertEqual(XP_SOURCE, "Zoom Meeting Recording Quiz")
        self.assertEqual(DATE_FIELD, "XP Activity Date")
        self.assertNotEqual(XP_SOURCE, "Zoom Recording")
        self.assertNotEqual(XP_BUCKET, "Zoom")

    def test_no_homework_completions_in_stage17_filenames(self):
        for name in [
            "117-zoom-recording-credit-orchestrator.js",
            "117a-zoom-recording-normalize-recording-quiz-submission.js",
            "117c-zoom-recording-create-zoom-xp-event.js",
        ]:
            text = (ROOT / name).read_text(encoding="utf-8")
            self.assertNotIn('homeworkCompletions: "Homework Completions"', text)
            self.assertIn("Zoom Attendance", text)
            self.assertNotIn("ZOOM_RECORDING|", text)

    def test_orchestrator_and_modules_never_write_live_attendees(self):
        forbidden_snippets = [
            "linked_attendee_for_gate",
            "linked_attendee_for_perfect_week",
            "attendees.concat(",
        ]
        for name in [
            "117-zoom-recording-credit-orchestrator.js",
            "117d-zoom-recording-apply-zoom-gate-credit.js",
            "117e-zoom-recording-apply-perfect-week-credit.js",
        ]:
            text = (ROOT / name).read_text(encoding="utf-8")
            for snip in forbidden_snippets:
                self.assertNotIn(snip, text, msg=f"{name} contains {snip}")
            self.assertIn("Refuse write to Attendees", text)

    def test_orchestrator_version_and_labels(self):
        text = (ROOT / "117-zoom-recording-credit-orchestrator.js").read_text(encoding="utf-8")
        self.assertIn('version: "v1.1.0"', text)
        self.assertIn('xpSource: "Zoom Meeting Recording Quiz"', text)
        self.assertIn('xpBucket: "Zoom Attendance"', text)
        self.assertIn('xpActivityDate: "XP Activity Date"', text)
        self.assertNotIn('attendees: "Attendees"', text)


if __name__ == "__main__":
    unittest.main()
