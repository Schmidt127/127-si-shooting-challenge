#!/usr/bin/env python3
"""C-024 Stage 3 — offline mirror tests for audit-dedupe-key-coverage check logic."""

from __future__ import annotations

import unittest


def find_duplicate_active_xp(xp_rows: list[dict]) -> list[str]:
    by_key: dict[str, list[str]] = {}
    for row in xp_rows:
        if not row.get("active"):
            continue
        key = row.get("sourceKey", "")
        if not key:
            continue
        by_key.setdefault(key, []).append(row["id"])
    return [ids[0] for ids in by_key.values() if len(ids) > 1]


def find_hc_composite_duplicates(rows: list[dict]) -> list[str]:
    by_key: dict[str, list[str]] = {}
    for row in rows:
        key = f"{row['enrollment']}|{row['homework']}|{row['week']}"
        by_key.setdefault(key, []).append(row["id"])
    return [ids[0] for ids in by_key.values() if len(ids) > 1]


def find_identical_submission_keys(rows: list[dict]) -> list[str]:
    by_key: dict[str, list[str]] = {}
    for row in rows:
        dk = row.get("duplicateKey", "")
        if not dk:
            continue
        by_key.setdefault(dk, []).append(row["id"])
    return [ids[0] for ids in by_key.values() if len(ids) > 1]


def zoom_keys_conflict(rows: list[dict]) -> bool:
    live = set()
    recording = set()
    for row in rows:
        if not row.get("active"):
            continue
        key = row.get("sourceKey", "")
        if key.startswith("ZOOM_LIVE|"):
            live.add("|".join(key.split("|")[1:3]))
        if key.startswith("ZOOM_RECORDING|"):
            recording.add("|".join(key.split("|")[1:3]))
    return bool(live & recording)


class TestC024DedupeAuditLogic(unittest.TestCase):
    def test_dk01_duplicate_active_xp_source_key(self):
        rows = [
            {"id": "recXP1", "sourceKey": "HOMEWORK_XP|recHC1", "active": True},
            {"id": "recXP2", "sourceKey": "HOMEWORK_XP|recHC1", "active": True},
            {"id": "recXP3", "sourceKey": "SUBMISSION|recS1", "active": True},
        ]
        self.assertEqual(find_duplicate_active_xp(rows), ["recXP1"])

    def test_dk03_multiple_hc_same_composite(self):
        rows = [
            {"id": "recHC1", "enrollment": "recE1", "homework": "recH1", "week": "recW1"},
            {"id": "recHC2", "enrollment": "recE1", "homework": "recH1", "week": "recW1"},
        ]
        self.assertEqual(find_hc_composite_duplicates(rows), ["recHC1"])

    def test_dk04_identical_submission_duplicate_key(self):
        rows = [
            {"id": "recS1", "duplicateKey": "enroll|2026-07-01|10|5"},
            {"id": "recS2", "duplicateKey": "enroll|2026-07-01|10|5"},
        ]
        self.assertEqual(find_identical_submission_keys(rows), ["recS1"])

    def test_dk08_zoom_live_and_recording_conflict(self):
        rows = [
            {"id": "recXP1", "sourceKey": "ZOOM_LIVE|recM1|recE1", "active": True},
            {"id": "recXP2", "sourceKey": "ZOOM_RECORDING|recM1|recE1", "active": True},
        ]
        self.assertTrue(zoom_keys_conflict(rows))

    def test_dk08_no_conflict_when_only_live(self):
        rows = [{"id": "recXP1", "sourceKey": "ZOOM_LIVE|recM1|recE1", "active": True}]
        self.assertFalse(zoom_keys_conflict(rows))


if __name__ == "__main__":
    unittest.main()
