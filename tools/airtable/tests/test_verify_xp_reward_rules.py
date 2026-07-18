#!/usr/bin/env python3
"""Offline tests for verify_xp_reward_rules (no Airtable)."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from tools.airtable.verify_xp_reward_rules import (
    REFERENCE_STREAK_LADDER_DOCUMENTED,
    analyze,
    load_rules_from_fixture,
)


class TestVerifyXpRewardRules(unittest.TestCase):
    def test_detects_duplicates_and_families(self):
        records = [
            {"id": "rec1", "fields": {"Rule Key": "STREAK_3DAY", "XP Amount": 10, "Active?": True}},
            {"id": "rec2", "fields": {"Rule Key": "STREAK_3DAY", "XP Amount": 12, "Active?": True}},
            {"id": "rec3", "fields": {"Rule Key": "PERFECT_WEEK", "XP Amount": 25, "Active?": True}},
            {"id": "rec4", "fields": {"Rule Key": "HOMEWORK_BASE", "XP Amount": 15, "Active?": True}},
            {"id": "rec5", "fields": {"Rule Key": "ZOOM_ATTEND_BASE", "XP Amount": 40, "Active?": True}},
            {"id": "rec6", "fields": {"Rule Key": "VIDEO_REVIEW", "XP Amount": 20, "Active?": False}},
        ]
        report = analyze(records)
        self.assertIn("STREAK_3DAY", report["duplicate_rule_keys"])
        self.assertIn("STREAK_3DAY", report["active_duplicate_rule_keys"])
        self.assertEqual(report["perfect_week_amount"], 25)
        self.assertTrue(any(r["rule_key"] == "HOMEWORK_BASE" for r in report["homework_rules"]))
        self.assertTrue(any(r["rule_key"] == "ZOOM_ATTEND_BASE" for r in report["zoom_rules"]))
        self.assertTrue(any(r["rule_key"] == "VIDEO_REVIEW" for r in report["video_rules"]))
        self.assertEqual(report["mode"], "read_only")

    def test_discrepancy_vs_documented_is_informational(self):
        records = [
            {"id": "rec1", "fields": {"Rule Key": "STREAK_3DAY", "XP Amount": 99, "Active?": True}},
        ]
        report = analyze(records)
        mismatch = [
            d
            for d in report["streak_ladder_discrepancy_vs_documented"]
            if d["rule_key"] == "STREAK_3DAY" and d["status"] == "amount_mismatch"
        ]
        self.assertEqual(len(mismatch), 1)
        self.assertEqual(mismatch[0]["documented_amount"], REFERENCE_STREAK_LADDER_DOCUMENTED["STREAK_3DAY"])
        self.assertEqual(mismatch[0]["configured_amount"], 99.0)
        self.assertIn("authoritative", report["authority_note"].lower())

    def test_fixture_loader(self):
        payload = {
            "records": [
                {"id": "recA", "fields": {"Rule Key": "PERFECT_WEEK", "XP Amount": 30, "Active?": True}},
            ]
        }
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "rules.json"
            path.write_text(json.dumps(payload), encoding="utf-8")
            rules = load_rules_from_fixture(path)
            report = analyze(rules)
            self.assertEqual(report["perfect_week_amount"], 30)


if __name__ == "__main__":
    unittest.main()
