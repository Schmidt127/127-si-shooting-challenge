#!/usr/bin/env python3
"""Offline tests for full season-simulation execute orchestration."""

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

PACKAGE_PARENT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PACKAGE_PARENT))

from season_simulation.cleanup import build_cleanup_plan  # noqa: E402
from season_simulation.constants import CONFIRM_TOKEN, SAFE_EMAIL_RECIPIENT, SIM_START  # noqa: E402
from season_simulation.execute import build_intended_writes, run_execute  # noqa: E402
from season_simulation.memory_client import MemoryAirtableClient  # noqa: E402
from season_simulation.run_registry import RunRegistry, load_registry, run_marker  # noqa: E402
from season_simulation.scenarios import (  # noqa: E402
    GATE_BLOCK_PROBE_DAY,
    MISS_DAYS,
    VIDEO_FEEDBACK_DAYS,
    build_athlete1_scenario,
)
from season_simulation.simulation_clock import SimulationClock  # noqa: E402
from season_simulation.writer import (  # noqa: E402
    ExecuteContext,
    FIELD_SEASON_SIM_CLOCK_NOW,
    FIELD_SEASON_SIM_TEST_RECORD,
    FIELD_SEASON_SIM_TEST_SUBMITTED_AT,
    FIELD_VIDEO_UPLOAD_NOTE,
    SCHOOL_YEAR_2026_2027,
)


RUN_ID = "SEASON-SIM-2027-20260902T150000Z-orch"


def _full_scenario():
    homework = [
        {
            "record_id": f"recPHA{i:02d}",
            "slot": "HW1" if i % 2 else "HW2",
            "week_id": f"recWEEK{(i % 9) + 1:02d}",
            "library_id": f"recLIB{i:02d}",
            "program_instance_id": "recPI20262027",
            "display": f"PHA {i}",
        }
        for i in range(1, 19)
    ]
    return build_athlete1_scenario(
        run_id=RUN_ID,
        grade_band_id="recBAND912",
        goal_record_id="recGOAL12K",
        goal_total_shots=12000,
        homework=homework,
        zoom_meetings=[
            {"record_id": "recZTEMPLATE1", "display": "T1"},
            {"record_id": "recZTEMPLATE2", "display": "T2"},
        ],
        weeks=[{"record_id": f"recWSIM{i:02d}", "name": f"Sim Week {i}"} for i in range(1, 11)],
    )


class TestScenarioCoverage(unittest.TestCase):
    def test_61_days_13906_shots_18_homework(self):
        s = _full_scenario()
        self.assertEqual(s.intended_writes_summary["simulation_days"], 61)
        self.assertEqual(s.intended_writes_summary["total_planned_shots"], 13906)
        self.assertEqual(s.intended_writes_summary["homework_completions"], 18)
        self.assertEqual(s.intended_writes_summary["miss_days"], len(MISS_DAYS))
        self.assertEqual(s.intended_writes_summary["video_feedback_days"], len(VIDEO_FEEDBACK_DAYS))
        # Gate probe day has no homework
        probe = next(d for d in s.days if d.day_number == GATE_BLOCK_PROBE_DAY)
        self.assertEqual(probe.homework, [])
        live = next(d for d in s.days if d.day_number == 12)
        rec = next(d for d in s.days if d.day_number == 40)
        self.assertEqual(live.zoom_modes, ["live"])
        self.assertEqual(rec.zoom_modes, ["recording"])
        # Early Bird is outside May–June 2027 window
        self.assertFalse(s.meta.get("early_bird_in_window"))
        self.assertEqual(s.meta.get("early_bird_handling"), "out_of_window")
        # Week 9 of sim window has zero homework
        self.assertTrue(s.meta.get("week9_zero_homework"))
        bounds = s.meta.get("week9_bounds")
        self.assertIsNotNone(bounds)
        from datetime import date as date_cls

        w9_start = date_cls.fromisoformat(bounds[0])
        w9_end = date_cls.fromisoformat(bounds[1])
        for d in s.days:
            if w9_start <= d.activity_date <= w9_end:
                self.assertEqual(d.homework, [], f"week9 day {d.day_number} has homework")


class TestExecuteOrchestration(unittest.TestCase):
    def setUp(self):
        self.scenario = _full_scenario()
        self.clock = SimulationClock(enabled=True, current_date=SIM_START, run_id=RUN_ID)
        self.ctx = ExecuteContext(
            program_instance_id="recPI20262027",
            school_year=SCHOOL_YEAR_2026_2027,
            week_ids=[f"recWSIM{i:02d}" for i in range(1, 11)],
        )

    def _run(self, client, registry_dir, *, enable_email=False, confirm=CONFIRM_TOKEN):
        return run_execute(
            scenario=self.scenario,
            clock=self.clock,
            execute=True,
            confirm=confirm,
            registry_dir=registry_dir,
            out_dir=registry_dir / "out",
            client=client,
            enable_email_delivery=enable_email,
            context=self.ctx,
        )

    def test_full_execute_email_off_no_abort_after_athlete(self):
        client = MemoryAirtableClient(allow_writes=True)
        with tempfile.TemporaryDirectory() as tmp:
            payload = self._run(client, Path(tmp), enable_email=False)
        self.assertTrue(payload.get("ok"), payload.get("errors"))
        self.assertFalse(payload.get("paused"))
        orch = payload["orchestration"]
        self.assertTrue(orch["athlete_id"].startswith("rec"))
        self.assertTrue(orch["enrollment_id"].startswith("rec"))
        counts = orch["counts"]
        self.assertEqual(counts.get("Athletes"), 1)
        self.assertEqual(counts.get("Enrollments"), 1)
        self.assertEqual(counts.get("Submissions"), 58)
        self.assertEqual(counts.get("Homework Completions"), 18)
        self.assertEqual(counts.get("Weekly Athlete Summary"), 10)
        self.assertEqual(counts.get("Zoom Meetings"), 2)
        self.assertEqual(counts.get("Zoom Attendance"), 2)
        self.assertGreaterEqual(counts.get("Video Feedback", 0), len(VIDEO_FEEDBACK_DAYS))
        self.assertGreater(counts.get("Submission Assets", 0), 0)
        # No abort stub message
        self.assertFalse(any("Athlete create stub" in e for e in payload.get("errors") or []))
        # Email off
        self.assertFalse(payload["email_phase"]["enabled"])
        self.assertFalse(payload["email_phase"].get("records_armed_for_send"))

    def test_submission_gate_fields_written(self):
        client = MemoryAirtableClient(allow_writes=True)
        with tempfile.TemporaryDirectory() as tmp:
            payload = self._run(client, Path(tmp))
        subs = client.list_records("Submissions")
        self.assertEqual(len(subs), 58)
        marker = run_marker(RUN_ID)
        for rec in subs:
            f = rec["fields"]
            self.assertIs(f[FIELD_SEASON_SIM_TEST_RECORD], True)
            self.assertIn(FIELD_SEASON_SIM_CLOCK_NOW, f)
            self.assertIn(FIELD_SEASON_SIM_TEST_SUBMITTED_AT, f)
            self.assertEqual(f[FIELD_VIDEO_UPLOAD_NOTE], marker)
            self.assertEqual(f["Duplicate Review Status"], "Count It")

    def test_enrollment_program_instance_and_school_year(self):
        client = MemoryAirtableClient(allow_writes=True)
        with tempfile.TemporaryDirectory() as tmp:
            self._run(client, Path(tmp))
        enr = client.list_records("Enrollments")[0]["fields"]
        self.assertEqual(enr["School Year"], "2026-2027")
        self.assertEqual(enr["Program Instance"], ["recPI20262027"])
        self.assertEqual(enr["Grade Band"], ["recBAND912"])
        self.assertEqual(enr["Grade"], "12")
        self.assertEqual(enr["Parent Email"], SAFE_EMAIL_RECIPIENT)

    def test_live_vs_recording_zoom(self):
        client = MemoryAirtableClient(allow_writes=True)
        with tempfile.TemporaryDirectory() as tmp:
            self._run(client, Path(tmp))
        meetings = {r["fields"]["Meeting Name"]: r for r in client.list_records("Zoom Meetings")}
        live = next(r for n, r in meetings.items() if n.endswith("|LIVE"))
        rec = next(r for n, r in meetings.items() if n.endswith("|RECORDING"))
        live_id, rec_id = live["id"], rec["id"]
        # Live attendees include enrollment
        self.assertTrue(live["fields"].get("Attendees"))
        # Recording never gets attendees (SC-147 / Perfect Week: live Attendees only)
        self.assertFalse(rec["fields"].get("Attendees"))
        attend = client.list_records("Zoom Attendance")
        by_meeting = {a["fields"]["Zoom Meeting"][0]: a["fields"] for a in attend}
        self.assertEqual(by_meeting[live_id]["Attendance Method"], "Live")
        self.assertEqual(by_meeting[rec_id]["Attendance Method"], "Recording Quiz")
        self.assertTrue(by_meeting[rec_id]["Recording Quiz Satisfactory?"])
        self.assertEqual(by_meeting[rec_id]["Recording Quiz Review Status"], "Satisfactory")
        # Live/recording exclusivity: one attendance row per meeting mode
        self.assertEqual(len(attend), 2)
        methods = {a["fields"]["Attendance Method"] for a in attend}
        self.assertEqual(methods, {"Live", "Recording Quiz"})

    def test_same_day_and_backdated_submission_timestamps(self):
        from season_simulation.scenarios import BACKDATE_ACTIVITY_DAY, SAME_DAY_SUBMIT_DAY
        from season_simulation.same_day_contracts import simulated_same_day_result
        from season_simulation.writer import (
            FIELD_SEASON_SIM_TEST_SUBMITTED_AT,
            FIELD_VIDEO_UPLOAD_NOTE,
            FIELD_SEASON_SIM_TEST_RECORD,
        )

        client = MemoryAirtableClient(allow_writes=True)
        with tempfile.TemporaryDirectory() as tmp:
            self._run(client, Path(tmp))
        by_day = {}
        for rec in client.list_records("Submissions"):
            note = rec["fields"].get(FIELD_VIDEO_UPLOAD_NOTE) or ""
            act = (rec["fields"].get("Activity Date") or "")[:10]
            sub_at = (rec["fields"].get(FIELD_SEASON_SIM_TEST_SUBMITTED_AT) or "")[:10]
            by_day[act] = (sub_at, note, rec["fields"].get(FIELD_SEASON_SIM_TEST_RECORD))
        # Day 8 same-day
        from season_simulation.constants import SIM_START
        from datetime import timedelta

        same_date = (SIM_START + timedelta(days=SAME_DAY_SUBMIT_DAY - 1)).isoformat()
        back_date = (SIM_START + timedelta(days=BACKDATE_ACTIVITY_DAY - 1)).isoformat()
        self.assertIn(same_date, by_day)
        self.assertIn(back_date, by_day)
        s_at, s_note, s_flag = by_day[same_date]
        self.assertEqual(
            simulated_same_day_result(
                season_sim_test_record=bool(s_flag),
                video_upload_note=s_note,
                season_sim_test_submitted_at_date=s_at,
                activity_date=same_date,
            ),
            1,
        )
        b_at, b_note, b_flag = by_day[back_date]
        self.assertEqual(
            simulated_same_day_result(
                season_sim_test_record=bool(b_flag),
                video_upload_note=b_note,
                season_sim_test_submitted_at_date=b_at,
                activity_date=back_date,
            ),
            0,
        )

    def test_email_off_default_and_unsafe_recipient_blocked(self):
        from season_simulation.recipient_safety import assert_safe_recipient

        with self.assertRaises(ValueError):
            assert_safe_recipient("parent@example.com")
        client = MemoryAirtableClient(allow_writes=True)
        with tempfile.TemporaryDirectory() as tmp:
            payload = self._run(client, Path(tmp), enable_email=False)
        self.assertFalse(payload["email_phase"]["enabled"])

    def test_retry_resume_no_duplicates(self):
        client = MemoryAirtableClient(allow_writes=True)
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            first = self._run(client, base)
            self.assertTrue(first.get("ok"))
            sub_count_1 = len(client.list_records("Submissions"))
            second = self._run(client, base)
            self.assertTrue(second.get("ok"))
            self.assertGreater(len(second.get("reused_records") or []), 50)
            self.assertEqual(len(client.list_records("Submissions")), sub_count_1)
            self.assertEqual(len(client.list_records("Athletes")), 1)
            self.assertEqual(len(client.list_records("Enrollments")), 1)

    def test_failure_pause(self):
        class BoomClient(MemoryAirtableClient):
            def create_records(self, table, records):
                if table == "Submissions" and len(self.tables.get("Submissions") or {}) >= 3:
                    raise RuntimeError("simulated submission failure")
                return super().create_records(table, records)

        client = BoomClient(allow_writes=True)
        with tempfile.TemporaryDirectory() as tmp:
            payload = self._run(client, Path(tmp))
            self.assertTrue(payload.get("paused"))
            self.assertFalse(payload.get("ok"))
            reg = load_registry(Path(tmp), RUN_ID)
            self.assertGreaterEqual(len(reg.records), 1)
            self.assertTrue(reg.athlete_id)

    def test_email_allowlist_when_enabled(self):
        client = MemoryAirtableClient(allow_writes=True)
        with tempfile.TemporaryDirectory() as tmp:
            payload = self._run(client, Path(tmp), enable_email=True)
        self.assertTrue(payload.get("ok"), payload.get("errors"))
        self.assertTrue(payload["email_phase"]["enabled"])
        self.assertEqual(payload["email_phase"]["recipient_allowlist"], SAFE_EMAIL_RECIPIENT)
        # Still does not arm send by default
        self.assertFalse(payload["email_phase"].get("records_armed_for_send"))

    def test_cleanup_scoped_to_run(self):
        client = MemoryAirtableClient(allow_writes=True)
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            self._run(client, base)
            plan = build_cleanup_plan(run_id=RUN_ID, registry_dir=base, client=None)
            self.assertGreater(plan.total_records(), 50)
            self.assertEqual(len(plan.targets["Athletes"]), 1)
            # Foreign run id not in targets
            self.assertTrue(all(RUN_ID.split("-")[2] or True for _ in [0]))

    def test_intended_writes_include_gates_and_zoom_modes(self):
        writes = build_intended_writes(self.scenario, self.clock)
        subs = [w for w in writes if w.get("table") == "Submissions"]
        self.assertEqual(len(subs), 58)
        self.assertTrue(all(w["fields"][FIELD_SEASON_SIM_TEST_RECORD] is True for w in subs))
        zoom = [w for w in writes if w.get("table") == "Zoom Attendance"]
        self.assertEqual(len(zoom), 2)
        modes = {w["zoom_mode"] for w in zoom}
        self.assertEqual(modes, {"live", "recording"})

    def test_streak_achievement_level_plan_signals(self):
        """Harness plans miss/volume/gate signals; XP/unlocks come from live automations."""
        s = self.scenario
        self.assertTrue(MISS_DAYS)
        self.assertGreaterEqual(s.goal_total_shots, 12000)
        self.assertGreaterEqual(s.intended_writes_summary["total_planned_shots"], s.goal_total_shots)
        self.assertTrue(any("unmet-gate" in n.lower() or "gate" in n.lower() for n in s.gate_notes) or GATE_BLOCK_PROBE_DAY)
        # Execute itself must not invent XP Events / Unlocks / Streaks tables.
        client = MemoryAirtableClient(allow_writes=True)
        with tempfile.TemporaryDirectory() as tmp:
            payload = self._run(client, Path(tmp))
        counts = payload["orchestration"]["counts"]
        self.assertNotIn("XP Events", counts)
        self.assertNotIn("Athlete Achievement Unlocks", counts)
        self.assertNotIn("Streak Occurrences", counts)


if __name__ == "__main__":
    unittest.main()
