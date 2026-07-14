"""Offline contracts for Phase A combined 021 (attachment status + video count)."""

from __future__ import annotations

import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
COMBINED = (
    ROOT
    / "airtable/automations/shooting-challenge"
    / "021-submission-intake-and-asset-creation-set-attachment-status-and-video-count.js"
)
ROLLBACK_DIR = (
    ROOT
    / "airtable/automations/shooting-challenge/_rollback/phase-a-006-021-2026-07-14"
)


def decide_attachment_status(has_any_files: bool) -> str:
    return "Processing" if has_any_files else "No Files"


def decide_video_count(n: int) -> int:
    return n


def plan_updates(
    *,
    has_hw1: bool,
    has_hw2: bool,
    has_video: bool,
    current_status: str,
    existing_video_count: int | None,
    video_attachment_count: int,
) -> dict:
    has_any = has_hw1 or has_hw2 or has_video
    next_status = decide_attachment_status(has_any)
    next_count = decide_video_count(video_attachment_count)
    updates: dict = {}
    actions: list[str] = []
    managed = {"", "No Files", "Processing"}
    if current_status not in managed:
        actions.append("status_unmanaged_skip")
    elif current_status != next_status:
        updates["Attachment Upload Status"] = next_status
        actions.append("status_updated")
    else:
        actions.append("status_skipped")
    if existing_video_count != next_count:
        updates["Video Count"] = next_count
        actions.append("video_count_updated")
    else:
        actions.append("video_count_skipped")
    return {
        "updates": updates,
        "actions": actions,
        "next_status": next_status,
        "next_count": next_count,
        "has_any": has_any,
        "all_skipped": not updates,
    }


class TestPhaseACombined(unittest.TestCase):
    def test_combined_file_exists_and_orders_steps(self):
        text = COMBINED.read_text(encoding="utf-8")
        self.assertIn("Step A Attachment Upload Status", text)
        self.assertIn("Step B Video Count", text)
        self.assertLess(text.index("Step A"), text.index("Step B"))
        self.assertIn("watch fields", text.lower())
        self.assertIn("atomic write", text.lower())

    def test_rollback_copies_present(self):
        self.assertTrue(
            (ROLLBACK_DIR / "006-submission-intake-and-asset-creation-set-video-count.js").is_file()
        )
        self.assertTrue(
            (
                ROLLBACK_DIR
                / "021-submission-intake-and-asset-creation-set-attachment-upload-status.js"
            ).is_file()
        )
        rb006 = (ROLLBACK_DIR / "006-submission-intake-and-asset-creation-set-video-count.js").read_text(
            encoding="utf-8"
        )
        self.assertIn("Video Count", rb006)
        self.assertNotIn("library-only after Phase A", rb006)

    def test_status_only_path_hw_files(self):
        r = plan_updates(
            has_hw1=True,
            has_hw2=False,
            has_video=False,
            current_status="",
            existing_video_count=None,
            video_attachment_count=0,
        )
        self.assertEqual(r["next_status"], "Processing")
        self.assertEqual(r["next_count"], 0)
        self.assertIn("Attachment Upload Status", r["updates"])
        self.assertIn("Video Count", r["updates"])

    def test_video_only_path(self):
        r = plan_updates(
            has_hw1=False,
            has_hw2=False,
            has_video=True,
            current_status="No Files",
            existing_video_count=None,
            video_attachment_count=2,
        )
        self.assertEqual(r["next_status"], "Processing")
        self.assertEqual(r["next_count"], 2)
        self.assertEqual(r["updates"]["Video Count"], 2)

    def test_both_paths(self):
        r = plan_updates(
            has_hw1=True,
            has_hw2=True,
            has_video=True,
            current_status="",
            existing_video_count=1,
            video_attachment_count=3,
        )
        self.assertEqual(r["next_status"], "Processing")
        self.assertEqual(r["updates"]["Video Count"], 3)

    def test_no_files_sets_no_files(self):
        r = plan_updates(
            has_hw1=False,
            has_hw2=False,
            has_video=False,
            current_status="",
            existing_video_count=0,
            video_attachment_count=0,
        )
        self.assertEqual(r["next_status"], "No Files")
        self.assertTrue(r["all_skipped"] is False)
        self.assertEqual(r["updates"]["Attachment Upload Status"], "No Files")

    def test_idempotent_repeat(self):
        r = plan_updates(
            has_hw1=False,
            has_hw2=False,
            has_video=True,
            current_status="Processing",
            existing_video_count=1,
            video_attachment_count=1,
        )
        self.assertTrue(r["all_skipped"])
        self.assertEqual(r["actions"], ["status_skipped", "video_count_skipped"])

    def test_count_change_while_processing(self):
        r = plan_updates(
            has_hw1=False,
            has_hw2=False,
            has_video=True,
            current_status="Processing",
            existing_video_count=1,
            video_attachment_count=3,
        )
        self.assertEqual(r["updates"], {"Video Count": 3})
        self.assertIn("status_skipped", r["actions"])
        self.assertIn("video_count_updated", r["actions"])

    def test_duplicate_prevention_skips_matching_status(self):
        r = plan_updates(
            has_hw1=True,
            has_hw2=False,
            has_video=False,
            current_status="Processing",
            existing_video_count=0,
            video_attachment_count=0,
        )
        self.assertNotIn("Attachment Upload Status", r["updates"])

    def test_script_outputs_and_trigger_docs(self):
        text = COMBINED.read_text(encoding="utf-8")
        for key in (
            "statusOut",
            "actionOut",
            "videoCountOut",
            "attachmentStatusOut",
            "Match ANY",
            "Supersedes: separate 006",
        ):
            self.assertIn(key, text)

    def test_single_select_id_write_pattern(self):
        text = COMBINED.read_text(encoding="utf-8")
        self.assertIn("return { id: match.id }", text)

    def test_sent_status_not_clobbered(self):
        r = plan_updates(
            has_hw1=False,
            has_hw2=False,
            has_video=True,
            current_status="Sent",
            existing_video_count=None,
            video_attachment_count=2,
        )
        self.assertIn("status_unmanaged_skip", r["actions"])
        self.assertNotIn("Attachment Upload Status", r["updates"])
        self.assertEqual(r["updates"].get("Video Count"), 2)

    def test_never_writes_formula_fields(self):
        text = COMBINED.read_text(encoding="utf-8")
        # mentioned as formula-only context
        self.assertIn('hasVideo: "Has Video?"', text)
        # must not appear as update keys in atomic write block
        write_block = text.split("setDebug(\"6 - Atomic write\")", 1)[1]
        self.assertNotIn("Has Video?", write_block)
        self.assertNotIn("Has Review Assets?", write_block)


if __name__ == "__main__":
    unittest.main()
