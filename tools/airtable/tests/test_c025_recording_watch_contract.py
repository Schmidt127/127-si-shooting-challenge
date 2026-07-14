#!/usr/bin/env python3
"""C-025 — offline contract: recording credit + configuration-driven values."""

from __future__ import annotations

from datetime import date, timedelta
import unittest


# --- config helpers ---


def cfg_number(config: dict, key: str, fallback: float | int) -> float | int:
    value = config.get(key)
    if value is None or value == "":
        return fallback
    return value


def cfg_bool(config: dict, key: str, fallback: bool) -> bool:
    if key not in config or config.get(key) is None:
        return fallback
    return bool(config[key])


def cfg_select(config: dict, key: str, fallback: str) -> str:
    value = config.get(key)
    if not value:
        return fallback
    return str(value)


def resolve_number_with_override(
    *,
    meeting_override,
    config: dict,
    config_key: str,
    fallback: int,
) -> int:
    if meeting_override is not None and meeting_override != "":
        return int(meeting_override)
    return int(cfg_number(config, config_key, fallback))


def recording_xp_amount(live_base_xp: int, config: dict | None = None) -> int:
    """Recording XP from Config percent (default 50). Never assume hardcoded-only path."""
    if live_base_xp < 0:
        raise ValueError("live_base_xp must be >= 0")
    pct = int(cfg_number(config or {}, "Zoom Recording XP Percent of Live", 50))
    if pct < 0 or pct > 100:
        raise ValueError("percent out of range")
    return (live_base_xp * pct) // 100


def compute_recording_deadline(
    *,
    available_on: date,
    week_end: date,
    config: dict,
    meeting_days_override=None,
    meeting_mode_override=None,
) -> date:
    days = resolve_number_with_override(
        meeting_override=meeting_days_override,
        config=config,
        config_key="Zoom Recording Makeup Window Days",
        fallback=7,
    )
    mode = meeting_mode_override or cfg_select(
        config, "Zoom Recording Deadline Mode", "Later of Both"
    )
    days_deadline = available_on + timedelta(days=days)
    if mode == "Days After Recording Available":
        return days_deadline
    if mode == "End of Program Week":
        return week_end
    if mode == "Earlier of Both":
        return min(days_deadline, week_end)
    # Later of Both (default)
    return max(days_deadline, week_end)


def recording_counts_for_perfect_week(config: dict) -> bool:
    return cfg_bool(config, "Recording Makeup Counts for Perfect Week?", True)


def recording_requires_coach_approval(config: dict) -> bool:
    return cfg_bool(config, "Recording Quiz Requires Coach Approval?", True)


def recording_gives_full_gate_credit(config: dict) -> bool:
    return cfg_bool(config, "Recording Gives Full Zoom Gate Credit?", True)


def should_send_recording_approval_email(
    *,
    config: dict,
    quiz_status: str,
) -> tuple[bool, str]:
    # Safe fallback: missing enabled → do not send
    if "Recording Approval Email Enabled?" not in config or config.get(
        "Recording Approval Email Enabled?"
    ) is None:
        return False, "skipped_config_missing_email_enabled"
    if not config.get("Recording Approval Email Enabled?"):
        return False, "skipped_email_disabled"
    timing = cfg_select(config, "Recording Approval Email Timing", "On Satisfactory")
    if timing != "On Satisfactory":
        return False, "skipped_timing_unsupported"
    if quiz_status != "Satisfactory":
        return False, "skipped_not_satisfactory"
    template = (config.get("Recording Approval Email Template Key") or "").strip()
    if not template:
        return False, "skipped_missing_template_key"
    return True, "ok"


def can_award_recording_credit(
    *,
    meeting_id: str,
    enrollment_id: str,
    xp_rows: list[dict],
    progress_processing_enabled: bool,
    config: dict,
    quiz_status: str,
    meeting_key_to_id: dict[str, str] | None = None,
) -> tuple[bool, str]:
    if not progress_processing_enabled:
        return False, "skipped_progress_disabled"
    if recording_requires_coach_approval(config) and quiz_status != "Satisfactory":
        return False, "skipped_awaiting_coach_approval"
    target = (meeting_id, enrollment_id)
    live, recording = active_zoom_pairs(xp_rows, meeting_key_to_id=meeting_key_to_id)
    if target in recording:
        return False, "skipped_already_awarded"
    if target in live:
        return False, "skipped_live_exists"
    return True, "ok"


def zoom_live_source_key(meeting_id: str, enrollment_id: str) -> str:
    return f"ZOOM_LIVE|{meeting_id}|{enrollment_id}"


def zoom_recording_source_key(meeting_id: str, enrollment_id: str) -> str:
    return f"ZOOM_RECORDING|{meeting_id}|{enrollment_id}"


def legacy_live_source_key(meeting_key: str, enrollment_id: str) -> str:
    return f"ZOOM_ATTEND_BASE|{meeting_key}|{enrollment_id}"


def meeting_enrollment_from_key(
    source_key: str,
    *,
    meeting_key_to_id: dict[str, str] | None = None,
) -> tuple[str, str] | None:
    parts = source_key.split("|")
    if len(parts) < 3:
        return None
    prefix, mid, enrollment_id = parts[0], parts[1], parts[2]
    if prefix in ("ZOOM_LIVE", "ZOOM_RECORDING"):
        return mid, enrollment_id
    if prefix == "ZOOM_ATTEND_BASE":
        meeting_id = (meeting_key_to_id or {}).get(mid)
        if not meeting_id:
            return None
        return meeting_id, enrollment_id
    return None


def is_live_family_key(source_key: str) -> bool:
    return source_key.startswith("ZOOM_LIVE|") or source_key.startswith("ZOOM_ATTEND_BASE|")


def is_recording_family_key(source_key: str) -> bool:
    return source_key.startswith("ZOOM_RECORDING|")


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


def distinct_zoom_meeting_credit(
    *,
    live_meeting_ids: set[str],
    recording_meeting_ids: set[str],
    config: dict,
) -> int:
    if not recording_gives_full_gate_credit(config):
        return len(live_meeting_ids)
    return len(live_meeting_ids | recording_meeting_ids)


class TestC025ConfigDrivenXpAndDeadline(unittest.TestCase):
    def test_default_percent_is_fifty_when_config_missing(self):
        self.assertEqual(recording_xp_amount(40, {}), 20)

    def test_changing_percent_changes_xp(self):
        cfg = {"Zoom Recording XP Percent of Live": 40}
        self.assertEqual(recording_xp_amount(50, cfg), 20)
        cfg["Zoom Recording XP Percent of Live"] = 25
        self.assertEqual(recording_xp_amount(50, cfg), 12)

    def test_makeup_days_config_changes_deadline(self):
        available = date(2026, 7, 1)
        week_end = date(2026, 7, 5)
        d7 = compute_recording_deadline(
            available_on=available,
            week_end=week_end,
            config={
                "Zoom Recording Makeup Window Days": 7,
                "Zoom Recording Deadline Mode": "Days After Recording Available",
            },
        )
        d10 = compute_recording_deadline(
            available_on=available,
            week_end=week_end,
            config={
                "Zoom Recording Makeup Window Days": 10,
                "Zoom Recording Deadline Mode": "Days After Recording Available",
            },
        )
        self.assertEqual(d7, date(2026, 7, 8))
        self.assertEqual(d10, date(2026, 7, 11))

    def test_later_of_both_default_mode(self):
        available = date(2026, 7, 1)
        week_end = date(2026, 7, 20)
        deadline = compute_recording_deadline(
            available_on=available,
            week_end=week_end,
            config={"Zoom Recording Makeup Window Days": 7},
        )
        self.assertEqual(deadline, date(2026, 7, 20))

    def test_meeting_override_wins_over_config_days(self):
        deadline = compute_recording_deadline(
            available_on=date(2026, 7, 1),
            week_end=date(2026, 7, 3),
            config={
                "Zoom Recording Makeup Window Days": 7,
                "Zoom Recording Deadline Mode": "Days After Recording Available",
            },
            meeting_days_override=3,
        )
        self.assertEqual(deadline, date(2026, 7, 4))

    def test_missing_makeup_days_falls_back_to_seven(self):
        deadline = compute_recording_deadline(
            available_on=date(2026, 7, 1),
            week_end=date(2026, 7, 2),
            config={"Zoom Recording Deadline Mode": "Days After Recording Available"},
        )
        self.assertEqual(deadline, date(2026, 7, 8))


class TestC025PerfectWeekAndGateToggles(unittest.TestCase):
    def test_disabling_perfect_week_credit(self):
        self.assertFalse(
            recording_counts_for_perfect_week(
                {"Recording Makeup Counts for Perfect Week?": False}
            )
        )
        self.assertTrue(recording_counts_for_perfect_week({}))

    def test_gate_credit_toggle(self):
        cfg_off = {"Recording Gives Full Zoom Gate Credit?": False}
        self.assertEqual(
            distinct_zoom_meeting_credit(
                live_meeting_ids={"recM1"},
                recording_meeting_ids={"recM2"},
                config=cfg_off,
            ),
            1,
        )
        cfg_on = {"Recording Gives Full Zoom Gate Credit?": True}
        self.assertEqual(
            distinct_zoom_meeting_credit(
                live_meeting_ids={"recM1"},
                recording_meeting_ids={"recM2"},
                config=cfg_on,
            ),
            2,
        )


class TestC025ApprovalEmailAndAwardGates(unittest.TestCase):
    def test_parent_email_only_after_satisfactory(self):
        cfg = {
            "Recording Approval Email Enabled?": True,
            "Recording Approval Email Timing": "On Satisfactory",
            "Recording Approval Email Template Key": "ZOOM_RECORDING_APPROVED",
        }
        ok, reason = should_send_recording_approval_email(
            config=cfg, quiz_status="Needs Review"
        )
        self.assertFalse(ok)
        self.assertEqual(reason, "skipped_not_satisfactory")
        ok2, _ = should_send_recording_approval_email(
            config=cfg, quiz_status="Satisfactory"
        )
        self.assertTrue(ok2)

    def test_disabling_parent_email_prevents_send(self):
        cfg = {
            "Recording Approval Email Enabled?": False,
            "Recording Approval Email Template Key": "ZOOM_RECORDING_APPROVED",
        }
        ok, reason = should_send_recording_approval_email(
            config=cfg, quiz_status="Satisfactory"
        )
        self.assertFalse(ok)
        self.assertEqual(reason, "skipped_email_disabled")

    def test_missing_email_enabled_does_not_send(self):
        ok, reason = should_send_recording_approval_email(
            config={}, quiz_status="Satisfactory"
        )
        self.assertFalse(ok)
        self.assertEqual(reason, "skipped_config_missing_email_enabled")

    def test_award_requires_satisfactory_when_config_requires_approval(self):
        ok, reason = can_award_recording_credit(
            meeting_id="recM1",
            enrollment_id="recE1",
            xp_rows=[],
            progress_processing_enabled=True,
            config={"Recording Quiz Requires Coach Approval?": True},
            quiz_status="Needs Review",
        )
        self.assertFalse(ok)
        self.assertEqual(reason, "skipped_awaiting_coach_approval")


class TestC025DedupeAcrossConfigs(unittest.TestCase):
    def test_conflict_live_and_recording(self):
        rows = [
            {"id": "1", "sourceKey": "ZOOM_LIVE|recM1|recE1", "active": True},
            {"id": "2", "sourceKey": "ZOOM_RECORDING|recM1|recE1", "active": True},
        ]
        self.assertTrue(zoom_live_recording_conflict(rows))

    def test_legacy_live_blocks_recording_under_any_percent(self):
        mapping = {"MEET-1": "recM1"}
        rows = [
            {
                "id": "1",
                "sourceKey": legacy_live_source_key("MEET-1", "recE1"),
                "active": True,
            }
        ]
        for pct in (25, 50, 100):
            ok, reason = can_award_recording_credit(
                meeting_id="recM1",
                enrollment_id="recE1",
                xp_rows=rows,
                progress_processing_enabled=True,
                config={
                    "Zoom Recording XP Percent of Live": pct,
                    "Recording Quiz Requires Coach Approval?": True,
                },
                quiz_status="Satisfactory",
                meeting_key_to_id=mapping,
            )
            self.assertFalse(ok)
            self.assertEqual(reason, "skipped_live_exists")

    def test_source_key_builders_stable(self):
        self.assertEqual(
            zoom_recording_source_key("recM1", "recE1"),
            "ZOOM_RECORDING|recM1|recE1",
        )


if __name__ == "__main__":
    unittest.main()
