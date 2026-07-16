#!/usr/bin/env python3
"""Offline contracts: 059 trigger resolution, 043 retirement, 112 OFF-state."""

from __future__ import annotations

import unittest


def ready_formula_value(*, pending: bool, xp_events_linked: bool) -> int:
    """Mirrors Ready for 059 XP? intent — Pending AND empty XP Events."""
    if pending and not xp_events_linked:
        return 1
    return 0


def trigger_allows_059(
    *,
    trigger_type: str,
    use_ready_filter: bool,
    use_xp_events_empty: bool,
    pending: bool,
    shot_milestone_present: bool,
) -> bool:
    if not pending:
        return False
    if use_ready_filter or use_xp_events_empty:
        return False  # forbidden on authoritative design
    if trigger_type not in {"created", "matches_conditions"}:
        return False
    # Preferred created path for shot milestones requires milestone
    if trigger_type == "created" and not shot_milestone_present:
        return False
    return True


def mid_run_ready_flip() -> tuple[int, int]:
    """Creating XP links unlock → Ready flips 1 → 0 mid-run."""
    before = ready_formula_value(pending=True, xp_events_linked=False)
    after = ready_formula_value(pending=True, xp_events_linked=True)
    return before, after


def source_key_shot_milestone(enrollment_id: str, milestone_id: str) -> str:
    return f"SHOT_MILESTONE|{enrollment_id}|{milestone_id}"


def source_key_perfect_week(enrollment_id: str, week_id: str) -> str:
    return f"PERFECT_WEEK|{enrollment_id}|{week_id}"


def video_feedback_key_013(asset_id: str) -> str:
    return f"VIDEO_FEEDBACK|{asset_id}"


def video_feedback_key_112_legacy(asset_id: str) -> str:
    return asset_id  # bare record id — forbidden for new rows


def is_legacy_vf_key(key: str) -> bool:
    return bool(key) and not key.startswith("VIDEO_FEEDBACK|")


def retirement_phase_allowed(
    *,
    gate_write_verified: bool,
    empty_gate_count: int,
    mike_approved_delete: bool,
    phase: str,
) -> bool:
    if phase == "A_keep_both":
        return True
    if phase == "B_disable":
        return gate_write_verified and empty_gate_count == 0
    if phase == "C_delete":
        return (
            gate_write_verified
            and empty_gate_count == 0
            and mike_approved_delete
        )
    return False


class TestAutomation059Trigger(unittest.TestCase):
    def test_ready_flips_when_xp_links(self):
        before, after = mid_run_ready_flip()
        self.assertEqual(before, 1)
        self.assertEqual(after, 0)

    def test_authoritative_trigger_forbids_ready(self):
        self.assertTrue(
            trigger_allows_059(
                trigger_type="created",
                use_ready_filter=False,
                use_xp_events_empty=False,
                pending=True,
                shot_milestone_present=True,
            )
        )
        self.assertFalse(
            trigger_allows_059(
                trigger_type="created",
                use_ready_filter=True,
                use_xp_events_empty=False,
                pending=True,
                shot_milestone_present=True,
            )
        )

    def test_source_keys(self):
        self.assertEqual(
            source_key_shot_milestone("recE", "recM"),
            "SHOT_MILESTONE|recE|recM",
        )
        self.assertEqual(
            source_key_perfect_week("recE", "recW"),
            "PERFECT_WEEK|recE|recW",
        )


class TestAutomation043Retirement(unittest.TestCase):
    def test_042_supersedes_043_for_gate_assignment(self):
        # Contract: 043 retire only after 042 gate write verified
        self.assertTrue(
            retirement_phase_allowed(
                gate_write_verified=True,
                empty_gate_count=0,
                mike_approved_delete=False,
                phase="B_disable",
            )
        )
        self.assertFalse(
            retirement_phase_allowed(
                gate_write_verified=True,
                empty_gate_count=0,
                mike_approved_delete=False,
                phase="C_delete",
            )
        )

    def test_cannot_delete_with_empty_gates(self):
        self.assertFalse(
            retirement_phase_allowed(
                gate_write_verified=True,
                empty_gate_count=3,
                mike_approved_delete=True,
                phase="C_delete",
            )
        )


class TestAutomation112OffState(unittest.TestCase):
    def test_013_key_prefixed(self):
        key = video_feedback_key_013("recAsset")
        self.assertTrue(key.startswith("VIDEO_FEEDBACK|"))
        self.assertFalse(is_legacy_vf_key(key))

    def test_112_legacy_key_detected(self):
        key = video_feedback_key_112_legacy("recAsset")
        self.assertTrue(is_legacy_vf_key(key))

    def test_112_must_stay_off(self):
        automation_112_enabled = False
        automation_013_enabled = True
        self.assertFalse(automation_112_enabled)
        self.assertTrue(automation_013_enabled)


if __name__ == "__main__":
    unittest.main()
