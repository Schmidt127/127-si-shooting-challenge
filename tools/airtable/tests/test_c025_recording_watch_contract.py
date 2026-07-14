#!/usr/bin/env python3
"""C-025 Stage 12 — offline contract for Zoom recording-watch behavior."""

from __future__ import annotations

import unittest


# --- helpers under test (mirrors design contract; not Airtable runtime) ---


def recording_xp_amount(live_base_xp: int) -> int:
    """Owner rule: recording = 50% of live Zoom XP (integer floor)."""
    if live_base_xp < 0:
        raise ValueError("live_base_xp must be >= 0")
    return live_base_xp // 2


def zoom_live_source_key(meeting_id: str, enrollment_id: str) -> str:
    return f"ZOOM_LIVE|{meeting_id}|{enrollment_id}"


def zoom_recording_source_key(meeting_id: str, enrollment_id: str) -> str:
    return f"ZOOM_RECORDING|{meeting_id}|{enrollment_id}"


def legacy_live_source_key(meeting_key: str, enrollment_id: str) -> str:
    """Current 101 writer format (pre-migration)."""
    return f"ZOOM_ATTEND_BASE|{meeting_key}|{enrollment_id}"


def _parts(source_key: str) -> list[str]:
    return source_key.split("|")


def is_live_family_key(source_key: str) -> bool:
    return source_key.startswith("ZOOM_LIVE|") or source_key.startswith("ZOOM_ATTEND_BASE|")


def is_recording_family_key(source_key: str) -> bool:
    return source_key.startswith("ZOOM_RECORDING|")


def meeting_enrollment_from_key(
    source_key: str,
    *,
    meeting_key_to_id: dict[str, str] | None = None,
) -> tuple[str, str] | None:
    """
    Return (meetingRecordId, enrollmentId) for Zoom XP keys.
    Legacy ZOOM_ATTEND_BASE uses Zoom Meeting Key — map via meeting_key_to_id.
    """
    parts = _parts(source_key)
    if len(parts) < 3:
        return None
    prefix, mid, enrollment_id = parts[0], parts[1], parts[2]
    if prefix == "ZOOM_LIVE" or prefix == "ZOOM_RECORDING":
        return mid, enrollment_id
    if prefix == "ZOOM_ATTEND_BASE":
        mapping = meeting_key_to_id or {}
        meeting_id = mapping.get(mid)
        if not meeting_id:
            return None
        return meeting_id, enrollment_id
    return None


def active_zoom_pairs(
    xp_rows: list[dict],
    *,
    meeting_key_to_id: dict[str, str] | None = None,
) -> tuple[set[tuple[str, str]], set[tuple[str, str]]]:
    live: set[tuple[str, str]] = set()
    recording: set[tuple[str, str]] = set()
    for row in xp_rows:
        if not row.get("active"):
            continue
        key = row.get("sourceKey") or ""
        pair = meeting_enrollment_from_key(key, meeting_key_to_id=meeting_key_to_id)
        if not pair:
            continue
        if is_live_family_key(key):
            live.add(pair)
        if is_recording_family_key(key):
            recording.add(pair)
    return live, recording


def zoom_live_recording_conflict(
    xp_rows: list[dict],
    *,
    meeting_key_to_id: dict[str, str] | None = None,
) -> bool:
    live, recording = active_zoom_pairs(xp_rows, meeting_key_to_id=meeting_key_to_id)
    return bool(live & recording)


def can_award_recording(
    *,
    meeting_id: str,
    enrollment_id: str,
    xp_rows: list[dict],
    progress_processing_enabled: bool,
    meeting_key_to_id: dict[str, str] | None = None,
) -> tuple[bool, str]:
    if not progress_processing_enabled:
        return False, "skipped_progress_disabled"
    target = (meeting_id, enrollment_id)
    live, recording = active_zoom_pairs(xp_rows, meeting_key_to_id=meeting_key_to_id)
    if target in recording:
        return False, "skipped_already_awarded"
    if target in live:
        return False, "skipped_live_exists"
    return True, "ok"


def distinct_zoom_meeting_credit(
    *,
    live_meeting_ids: set[str],
    recording_meeting_ids: set[str],
) -> int:
    """Full gate credit: one credit per distinct meeting (live ∪ recording)."""
    return len(live_meeting_ids | recording_meeting_ids)


class TestC025RecordingWatchContract(unittest.TestCase):
    def test_recording_xp_is_half_floor(self):
        self.assertEqual(recording_xp_amount(40), 20)
        self.assertEqual(recording_xp_amount(25), 12)
        self.assertEqual(recording_xp_amount(0), 0)

    def test_source_key_builders(self):
        self.assertEqual(
            zoom_live_source_key("recM1", "recE1"),
            "ZOOM_LIVE|recM1|recE1",
        )
        self.assertEqual(
            zoom_recording_source_key("recM1", "recE1"),
            "ZOOM_RECORDING|recM1|recE1",
        )

    def test_conflict_live_and_recording_same_meeting(self):
        rows = [
            {"id": "xp1", "sourceKey": "ZOOM_LIVE|recM1|recE1", "active": True},
            {"id": "xp2", "sourceKey": "ZOOM_RECORDING|recM1|recE1", "active": True},
        ]
        self.assertTrue(zoom_live_recording_conflict(rows))

    def test_no_conflict_different_meetings(self):
        rows = [
            {"id": "xp1", "sourceKey": "ZOOM_LIVE|recM1|recE1", "active": True},
            {"id": "xp2", "sourceKey": "ZOOM_RECORDING|recM2|recE1", "active": True},
        ]
        self.assertFalse(zoom_live_recording_conflict(rows))

    def test_legacy_attend_base_counts_as_live_for_conflict(self):
        mapping = {"MEET-2026-01": "recM1"}
        rows = [
            {
                "id": "xp1",
                "sourceKey": legacy_live_source_key("MEET-2026-01", "recE1"),
                "active": True,
            },
            {"id": "xp2", "sourceKey": "ZOOM_RECORDING|recM1|recE1", "active": True},
        ]
        self.assertTrue(
            zoom_live_recording_conflict(rows, meeting_key_to_id=mapping)
        )

    def test_inactive_rows_ignored(self):
        rows = [
            {"id": "xp1", "sourceKey": "ZOOM_LIVE|recM1|recE1", "active": False},
            {"id": "xp2", "sourceKey": "ZOOM_RECORDING|recM1|recE1", "active": True},
        ]
        self.assertFalse(zoom_live_recording_conflict(rows))

    def test_can_award_recording_ok(self):
        ok, reason = can_award_recording(
            meeting_id="recM1",
            enrollment_id="recE1",
            xp_rows=[],
            progress_processing_enabled=True,
        )
        self.assertTrue(ok)
        self.assertEqual(reason, "ok")

    def test_can_award_recording_blocked_by_live(self):
        rows = [{"id": "xp1", "sourceKey": "ZOOM_LIVE|recM1|recE1", "active": True}]
        ok, reason = can_award_recording(
            meeting_id="recM1",
            enrollment_id="recE1",
            xp_rows=rows,
            progress_processing_enabled=True,
        )
        self.assertFalse(ok)
        self.assertEqual(reason, "skipped_live_exists")

    def test_can_award_recording_idempotent(self):
        rows = [
            {"id": "xp1", "sourceKey": "ZOOM_RECORDING|recM1|recE1", "active": True}
        ]
        ok, reason = can_award_recording(
            meeting_id="recM1",
            enrollment_id="recE1",
            xp_rows=rows,
            progress_processing_enabled=True,
        )
        self.assertFalse(ok)
        self.assertEqual(reason, "skipped_already_awarded")

    def test_can_award_recording_progress_disabled(self):
        ok, reason = can_award_recording(
            meeting_id="recM1",
            enrollment_id="recE1",
            xp_rows=[],
            progress_processing_enabled=False,
        )
        self.assertFalse(ok)
        self.assertEqual(reason, "skipped_progress_disabled")

    def test_distinct_meeting_credit_no_double_count(self):
        credit = distinct_zoom_meeting_credit(
            live_meeting_ids={"recM1", "recM2"},
            recording_meeting_ids={"recM1", "recM3"},
        )
        self.assertEqual(credit, 3)

    def test_full_gate_credit_recording_only_meeting(self):
        credit = distinct_zoom_meeting_credit(
            live_meeting_ids=set(),
            recording_meeting_ids={"recM9"},
        )
        self.assertEqual(credit, 1)


if __name__ == "__main__":
    unittest.main()
