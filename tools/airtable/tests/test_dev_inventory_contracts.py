#!/usr/bin/env python3
"""Contracts locked from DEV schema snapshot 2026-07-06 + inventory decisions."""

from __future__ import annotations

import json
import re
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
SCHEMA_RAW = (
    REPO
    / "airtable/schema/snapshots/dev-20260706/schema_raw_appTetnuCZlCZdTCT_20260706_161606.json"
)
SCRIPT_067 = (
    REPO
    / "airtable/automations/shooting-challenge/067-homework-link-or-create-completion-from-reflection-quiz.js"
)
SCRIPT_072 = (
    REPO
    / "airtable/automations/shooting-challenge/072-email-notifications-and-external-handoffs-build-weekly-summary-email-package.js"
)
SCRIPT_118 = (
    REPO
    / "airtable/automations/shooting-challenge/118-email-notifications-and-external-handoffs-schedule-weekly-summary-email-build.js"
)
SCRIPT_119 = (
    REPO
    / "airtable/automations/shooting-challenge/119-email-notifications-and-external-handoffs-schedule-weekly-summary-email-send.js"
)


def load_tables() -> dict[str, dict]:
    data = json.loads(SCHEMA_RAW.read_text(encoding="utf-8"))
    return {t["name"]: t for t in data.get("tables", [])}


def field_names(table: dict) -> set[str]:
    return {f["name"] for f in table.get("fields", [])}


def choices(table: dict, field_name: str) -> list[str]:
    for f in table.get("fields", []):
        if f["name"] == field_name:
            opts = (f.get("options") or {}).get("choices") or []
            return [c.get("name") for c in opts]
    return []


class TestDevInventorySnapshot(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tables = load_tables()

    def test_schema_snapshot_present(self):
        self.assertTrue(SCHEMA_RAW.exists())

    def test_quiz_has_no_attachment_field(self):
        quiz = self.tables["Final Reflection Quiz Submissions"]
        atts = [f["name"] for f in quiz["fields"] if f["type"] == "multipleAttachments"]
        self.assertEqual(atts, [])

    def test_ppe_absent_active_present(self):
        enr = self.tables["Enrollments"]
        names = field_names(enr)
        self.assertIn("Active?", names)
        self.assertNotIn("Progress Processing Enabled?", names)

    def test_asset_option_labels(self):
        assets = self.tables["Submission Assets"]
        self.assertEqual(
            choices(assets, "Asset Purpose"),
            [
                "Homework 1",
                "Homework 2",
                "Video For Feedback",
                "Registration Headshot",
                "Other",
            ],
        )
        self.assertIn("HW1", choices(assets, "Asset Slot"))
        self.assertIn("Homework PDF", choices(assets, "Asset Type"))
        self.assertIn("Pending Link", choices(assets, "Upload Status"))

    def test_weekly_email_fields_present(self):
        was = self.tables["Weekly Athlete Summary"]
        names = field_names(was)
        for required in (
            "Build Weekly Email Now?",
            "Send to Make?",
            "Weekly Email Ready?",
            "Weekly Email Sent?",
            "sendMode",
        ):
            self.assertIn(required, names)

    def test_testing_view_only_on_unlocks(self):
        testing = []
        for name, table in self.tables.items():
            for v in table.get("views") or []:
                if v.get("name") == "Testing":
                    testing.append(name)
        self.assertEqual(testing, ["Athlete Achievement Unlocks"])

    def test_042_needs_level_view_exists(self):
        enr = self.tables["Enrollments"]
        names = [v.get("name") for v in enr.get("views") or []]
        self.assertIn("042 - Needs Level Assignment", names)


class TestRepoScriptsFromInventory(unittest.TestCase):
    def test_067_is_v2(self):
        text = SCRIPT_067.read_text(encoding="utf-8")
        self.assertIn('version: "v2.0"', text)
        self.assertIn("Quiz Result PDF", text)
        self.assertIn("Submission Assets", text)
        self.assertIn("no_attachment_field", text)

    def test_072_is_v38_with_active_guard(self):
        text = SCRIPT_072.read_text(encoding="utf-8")
        self.assertIn('version: "v3.8"', text)
        self.assertIn('active: "Active?"', text)
        self.assertIn("skipped_inactive", text)
        self.assertIn("skipped_already_sent", text)
        self.assertIn("recgP9qZYjAhE7NXm", text)
        self.assertIn("WEEKLY_EMAIL|${enrollmentId}|${weekId}", text)
        self.assertIn("eventId", text)

    def test_118_119_exist_and_default_dry_run(self):
        t118 = SCRIPT_118.read_text(encoding="utf-8")
        t119 = SCRIPT_119.read_text(encoding="utf-8")
        self.assertIn('version: "v1.1"', t118)
        self.assertIn('version: "v1.1"', t119)
        self.assertIn("parseBool(inputConfig.dryRun, true)", t118)
        self.assertIn("parseBool(inputConfig.dryRun, true)", t119)
        self.assertIn("WEEKLY_EMAIL|", t119)
        self.assertIn("priorSaturdayKeyDenver", t118)
        self.assertIn("priorSaturdayKeyDenver", t119)
        self.assertNotIn("yesterdayKeyDenver", t118)
        self.assertNotIn("yesterdayKeyDenver", t119)
        # refuse Live when not dry-run
        self.assertTrue(re.search(r"sendMode=Live", t118))

    def test_067_hw1_only_and_send_to_make_false(self):
        text = SCRIPT_067.read_text(encoding="utf-8")
        self.assertIn('slotHw1: "HW1"', text)
        self.assertIn('purposeHomework1: "Homework 1"', text)
        self.assertNotIn('purposeHomework2', text)
        self.assertNotIn('slotHw2', text)
        self.assertIn("setCheckbox(fields, assetsTable, CONFIG.assets.sendToMakeTrigger, false)", text)


if __name__ == "__main__":
    unittest.main()
