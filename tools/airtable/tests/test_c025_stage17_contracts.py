"""Stage 17 Zoom Attendance source-key and exclusivity contracts."""

from __future__ import annotations

import unittest


SOURCE_PREFIX = "ZOOM_CREDIT"
LIVE_PREFIX = "ZOOM_ATTEND_BASE"
XP_BUCKET = "Zoom Attendance"
XP_SOURCE = "Zoom Meeting Recording Quiz"
DATE_FIELD = "XP Activity Date"


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
        from pathlib import Path

        root = Path(__file__).resolve().parents[3] / "airtable" / "automations" / "shooting-challenge"
        for name in [
            "117a-zoom-recording-normalize-recording-quiz-submission.js",
            "117c-zoom-recording-create-zoom-xp-event.js",
        ]:
            text = (root / name).read_text(encoding="utf-8")
            self.assertNotIn('homeworkCompletions: "Homework Completions"', text)
            self.assertIn("Zoom Attendance", text)
            self.assertNotIn("ZOOM_RECORDING|", text)


if __name__ == "__main__":
    unittest.main()
