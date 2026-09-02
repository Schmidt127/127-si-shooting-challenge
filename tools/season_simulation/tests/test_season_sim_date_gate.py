#!/usr/bin/env python3
"""Unit tests for SC-SEASON-SIM-002 automation date gate contract."""

from __future__ import annotations

import sys
import unittest
from datetime import date
from pathlib import Path

PACKAGE_PARENT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PACKAGE_PARENT))

from season_simulation.season_sim_date_gate import (  # noqa: E402
    SEASON_SIM_MARKER,
    activity_date_is_future,
    effective_today,
    gate_contract_summary,
    is_season_sim_record,
)


class SeasonSimDateGateTests(unittest.TestCase):
    def test_gate_requires_both_checkbox_and_marker(self):
        self.assertFalse(
            is_season_sim_record(
                season_sim_test_record=False,
                video_upload_note=f"{SEASON_SIM_MARKER}run-1",
            )
        )
        self.assertFalse(
            is_season_sim_record(
                season_sim_test_record=True,
                video_upload_note="no marker here",
            )
        )
        self.assertTrue(
            is_season_sim_record(
                season_sim_test_record=True,
                video_upload_note=f"note {SEASON_SIM_MARKER}SEASON-SIM-2027",
            )
        )

    def test_ordinary_uses_wall_today(self):
        wall = date(2026, 9, 2)
        self.assertEqual(
            effective_today(
                wall_today=wall,
                season_sim_test_record=False,
                video_upload_note=f"{SEASON_SIM_MARKER}x",
                season_sim_clock_now=date(2027, 5, 15),
            ),
            wall,
        )

    def test_gated_uses_clock_now(self):
        wall = date(2026, 9, 2)
        clock = date(2027, 5, 15)
        self.assertEqual(
            effective_today(
                wall_today=wall,
                season_sim_test_record=True,
                video_upload_note=f"{SEASON_SIM_MARKER}run",
                season_sim_clock_now=clock,
            ),
            clock,
        )

    def test_gated_empty_clock_falls_back_to_wall(self):
        wall = date(2026, 9, 2)
        self.assertEqual(
            effective_today(
                wall_today=wall,
                season_sim_test_record=True,
                video_upload_note=f"{SEASON_SIM_MARKER}run",
                season_sim_clock_now=None,
            ),
            wall,
        )

    def test_future_blocked_for_ordinary_2027_activity(self):
        wall = date(2026, 9, 2)
        self.assertTrue(
            activity_date_is_future(
                date(2027, 5, 1),
                wall_today=wall,
                season_sim_test_record=False,
                video_upload_note="",
                season_sim_clock_now=None,
            )
        )

    def test_sim_gated_allows_activity_on_or_before_clock(self):
        wall = date(2026, 9, 2)
        clock = date(2027, 5, 15)
        self.assertFalse(
            activity_date_is_future(
                date(2027, 5, 15),
                wall_today=wall,
                season_sim_test_record=True,
                video_upload_note=f"{SEASON_SIM_MARKER}run",
                season_sim_clock_now=clock,
            )
        )
        self.assertTrue(
            activity_date_is_future(
                date(2027, 5, 16),
                wall_today=wall,
                season_sim_test_record=True,
                video_upload_note=f"{SEASON_SIM_MARKER}run",
                season_sim_clock_now=clock,
            )
        )

    def test_partial_gate_does_not_weaken_ordinary_protection(self):
        wall = date(2026, 9, 2)
        # Checkbox only — still wall-clock.
        self.assertTrue(
            activity_date_is_future(
                date(2027, 5, 1),
                wall_today=wall,
                season_sim_test_record=True,
                video_upload_note="missing marker",
                season_sim_clock_now=date(2027, 6, 1),
            )
        )
        # Marker only — still wall-clock.
        self.assertTrue(
            activity_date_is_future(
                date(2027, 5, 1),
                wall_today=wall,
                season_sim_test_record=False,
                video_upload_note=f"{SEASON_SIM_MARKER}run",
                season_sim_clock_now=date(2027, 6, 1),
            )
        )

    def test_contract_summary_lists_scripts(self):
        summary = gate_contract_summary()
        self.assertEqual(summary["backlog"], "SC-SEASON-SIM-002")
        self.assertIn("010", summary["scripts"])
        self.assertIn("114", summary["scripts"])
        self.assertIn("073", summary["scripts"])


if __name__ == "__main__":
    unittest.main()
