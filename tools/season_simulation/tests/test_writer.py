#!/usr/bin/env python3
"""Offline tests for season-simulation submission writer gate fields."""

from __future__ import annotations

import sys
import unittest
from datetime import date, timedelta
from pathlib import Path

PACKAGE_PARENT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PACKAGE_PARENT))

from season_simulation.cleanup import DELETE_ORDER, build_cleanup_plan  # noqa: E402
from season_simulation.constants import SIM_START  # noqa: E402
from season_simulation.execute import build_intended_writes  # noqa: E402
from season_simulation.run_registry import (  # noqa: E402
    RunRegistry,
    filter_records_for_run,
    run_marker,
    save_registry,
)
from season_simulation.scenarios import (  # noqa: E402
    BACKDATE_ACTIVITY_DAY,
    BACKDATE_WRITE_DAY,
    SAME_DAY_SUBMIT_DAY,
    build_athlete1_scenario,
)
from season_simulation.simulation_clock import SimulationClock  # noqa: E402
from season_simulation.writer import (  # noqa: E402
    EXECUTE_SETS_SEASON_SIM_GATES,
    FIELD_SEASON_SIM_CLOCK_NOW,
    FIELD_SEASON_SIM_TEST_RECORD,
    FIELD_SEASON_SIM_TEST_SUBMITTED_AT,
    FIELD_VIDEO_UPLOAD_NOTE,
    build_simulation_submission_fields,
    plan_idempotent_creates,
    production_submission_fields_unscoped,
    simulation_date_for_day_number,
)


RUN_ID = "SEASON-SIM-2027-20260902T120000Z-writer"


def _scenario():
    return build_athlete1_scenario(
        run_id=RUN_ID,
        grade_band_id="recBAND",
        goal_record_id="recGOAL",
        goal_total_shots=12000,
        homework=[{"record_id": "recHW1", "slot": "HW1"}],
        zoom_meetings=[{"record_id": "recZ1", "display": "Z1"}],
    )


class TestWriterSeasonSimGates(unittest.TestCase):
    def setUp(self):
        self.clock = SimulationClock(enabled=True, current_date=SIM_START, run_id=RUN_ID)
        self.scenario = _scenario()
        self.writes = build_intended_writes(self.scenario, self.clock)
        self.subs = [
            w for w in self.writes if w.get("table") == "Submissions" and w.get("op") == "create"
        ]

    def test_flag_enabled_for_preflight(self):
        self.assertTrue(EXECUTE_SETS_SEASON_SIM_GATES)

    def test_every_submission_has_all_three_gate_fields(self):
        self.assertGreater(len(self.subs), 50)
        marker = run_marker(RUN_ID)
        for w in self.subs:
            f = w["fields"]
            self.assertIs(f[FIELD_SEASON_SIM_TEST_RECORD], True)
            self.assertIn(FIELD_SEASON_SIM_CLOCK_NOW, f)
            self.assertIn(FIELD_SEASON_SIM_TEST_SUBMITTED_AT, f)
            self.assertEqual(f[FIELD_VIDEO_UPLOAD_NOTE], marker)
            self.assertTrue(str(f[FIELD_VIDEO_UPLOAD_NOTE]).startswith("SEASON-SIM|"))

    def test_clock_now_matches_write_day(self):
        for w in self.subs:
            write_day = simulation_date_for_day_number(w["write_on_day_number"])
            expected = self.clock.activity_datetime_iso(write_day, hour=20, minute=0)
            self.assertEqual(w["fields"][FIELD_SEASON_SIM_CLOCK_NOW], expected)

    def test_same_day_submitted_at_matches_activity_date(self):
        same = next(w for w in self.subs if w["day_number"] == SAME_DAY_SUBMIT_DAY)
        activity = SIM_START + timedelta(days=SAME_DAY_SUBMIT_DAY - 1)
        expected = self.clock.activity_datetime_iso(activity, hour=19, minute=0)
        self.assertEqual(same["timing"], "same_day")
        self.assertEqual(same["fields"][FIELD_SEASON_SIM_TEST_SUBMITTED_AT], expected)
        self.assertTrue(same["fields"]["Activity Date"].startswith(activity.isoformat()))

    def test_backdated_submitted_at_uses_write_day(self):
        back = next(w for w in self.subs if w["day_number"] == BACKDATE_ACTIVITY_DAY)
        activity = SIM_START + timedelta(days=BACKDATE_ACTIVITY_DAY - 1)
        write_day = SIM_START + timedelta(days=BACKDATE_WRITE_DAY - 1)
        self.assertEqual(back["timing"], "backdated")
        self.assertEqual(back["write_on_day_number"], BACKDATE_WRITE_DAY)
        self.assertTrue(back["fields"]["Activity Date"].startswith(activity.isoformat()))
        expected_sub = self.clock.activity_datetime_iso(write_day, hour=19, minute=0)
        expected_clock = self.clock.activity_datetime_iso(write_day, hour=20, minute=0)
        self.assertEqual(back["fields"][FIELD_SEASON_SIM_TEST_SUBMITTED_AT], expected_sub)
        self.assertEqual(back["fields"][FIELD_SEASON_SIM_CLOCK_NOW], expected_clock)
        # Countable under gated formula: Activity Date is not after Clock Now.
        self.assertLessEqual(activity, write_day)

    def test_production_helper_omits_season_sim_gates(self):
        fields = production_submission_fields_unscoped(
            activity_date_iso="2026-09-01T18:00:00-06:00",
            shot_total=25,
            video_upload_note="parent note",
        )
        self.assertNotIn(FIELD_SEASON_SIM_TEST_RECORD, fields)
        self.assertNotIn(FIELD_SEASON_SIM_CLOCK_NOW, fields)
        self.assertNotIn(FIELD_SEASON_SIM_TEST_SUBMITTED_AT, fields)
        self.assertEqual(fields[FIELD_VIDEO_UPLOAD_NOTE], "parent note")

    def test_retry_skips_existing_dedupe_keys(self):
        reg = RunRegistry(run_id=RUN_ID, created_at="t0")
        first = self.subs[0]
        reg.add("Submissions", "recEXISTING001", dedupe_key=first["dedupe_key"])
        plan = plan_idempotent_creates(self.writes, reg)
        self.assertEqual(plan["skip_count"], 1)
        self.assertEqual(plan["skipped_existing"][0]["existing_record_id"], "recEXISTING001")
        create_keys = {w["dedupe_key"] for w in plan["to_create"] if w.get("table") == "Submissions"}
        self.assertNotIn(first["dedupe_key"], create_keys)
        # Second retry with same registry still skips — no duplicate create planned.
        plan2 = plan_idempotent_creates(self.writes, reg)
        self.assertEqual(plan2["skip_count"], 1)
        self.assertEqual(plan2["create_count"], plan["create_count"])

    def test_cleanup_scoped_to_simulation_id(self):
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            reg = RunRegistry(run_id=RUN_ID, created_at="t0", athlete_name="Athlete 1")
            reg.add("Submissions", "recSIMSUB001", dedupe_key=self.subs[0]["dedupe_key"])
            reg.add("Athletes", "recSIMATH001", dedupe_key=f"{run_marker(RUN_ID)}|ATHLETE")
            save_registry(reg, base)
            plan = build_cleanup_plan(run_id=RUN_ID, registry_dir=base, client=None)
            self.assertEqual(plan.targets["Submissions"], ["recSIMSUB001"])
            self.assertEqual(plan.targets["Athletes"], ["recSIMATH001"])
            self.assertIn("Submissions", DELETE_ORDER)
            # Marker filter does not pull foreign run IDs.
            foreign = [
                {
                    "id": "recOTHER",
                    "fields": {"Video Upload Note": "SEASON-SIM|SEASON-SIM-2027-20990101T000000Z-other"},
                },
                {
                    "id": "recOURS",
                    "fields": {"Video Upload Note": run_marker(RUN_ID)},
                },
            ]
            kept = filter_records_for_run(
                foreign, RUN_ID, text_fields=["Video Upload Note"]
            )
            self.assertEqual([r["id"] for r in kept], ["recOURS"])

    def test_direct_builder_clock_values(self):
        fields = build_simulation_submission_fields(
            run_id=RUN_ID,
            clock=self.clock,
            activity_date=date(2027, 5, 8),
            write_on_day_number=8,
            shot_total=200,
            timing="same_day",
        )
        self.assertEqual(
            fields[FIELD_SEASON_SIM_CLOCK_NOW],
            self.clock.activity_datetime_iso(date(2027, 5, 8), hour=20),
        )
        self.assertEqual(
            fields[FIELD_SEASON_SIM_TEST_SUBMITTED_AT],
            self.clock.activity_datetime_iso(date(2027, 5, 8), hour=19),
        )


if __name__ == "__main__":
    unittest.main()
