#!/usr/bin/env python3
"""Offline tests for season-simulation execute orchestration + same-day readiness."""

from __future__ import annotations

import sys
import tempfile
import unittest
from datetime import date, timedelta
from pathlib import Path

PACKAGE_PARENT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PACKAGE_PARENT))

from season_simulation.cleanup import build_cleanup_plan  # noqa: E402
from season_simulation.clock_override import GATED_ACTIVITY_DATE_IS_FUTURE_FORMULA  # noqa: E402
from season_simulation.constants import (  # noqa: E402
    CONFIRM_DISPOSABLE_TOKEN,
    CONFIRM_TOKEN,
    SAFE_EMAIL_RECIPIENT,
    SIM_START,
)
from season_simulation.execute import (  # noqa: E402
    build_intended_writes,
    run_execute,
    summarize_intended_write_readiness,
)
from season_simulation.memory_client import MemoryAirtableClient  # noqa: E402
from season_simulation.recipient_safety import assert_safe_recipient  # noqa: E402
from season_simulation.run_registry import load_registry, run_marker  # noqa: E402
from season_simulation.scenarios import (  # noqa: E402
    GATE_BLOCK_PROBE_DAY,
    MISS_DAYS,
    VIDEO_FEEDBACK_DAYS,
    build_athlete1_scenario,
)
from season_simulation.simulation_clock import SimulationClock  # noqa: E402
from season_simulation.writer import (  # noqa: E402
    FIELD_SEASON_SIM_CLOCK_NOW,
    FIELD_SEASON_SIM_TEST_RECORD,
    FIELD_SEASON_SIM_TEST_SUBMITTED_AT,
    FIELD_VIDEO_UPLOAD_NOTE,
    SCHOOL_YEAR_2026_2027,
    build_execute_context_from_reference,
)


RUN_ID = "SEASON-SIM-2027-20260902T150000Z-orch"


def _weeks_covering_window():
    weeks = [
        {
            "record_id": "recWEEKEarlyBird",
            "name": "Early Bird",
            "start": date(2027, 4, 25),
            "end": date(2027, 5, 1),
            "program_instance_id": "recPI20262027",
        }
    ]
    start = date(2027, 5, 2)
    for n in range(1, 10):
        sun = start + timedelta(days=(n - 1) * 7)
        sat = sun + timedelta(days=6)
        weeks.append(
            {
                "record_id": f"recWEEK{n}",
                "name": f"Week {n}",
                "start": sun,
                "end": sat,
                "program_instance_id": "recPI20262027",
            }
        )
    return weeks


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
        weeks=_weeks_covering_window(),
    )


class TestScenarioCoverage(unittest.TestCase):
    def test_61_days_goal_coverage_and_week9_zero_hw(self):
        s = _full_scenario()
        self.assertEqual(s.intended_writes_summary["simulation_days"], 61)
        self.assertGreaterEqual(s.intended_writes_summary["total_planned_shots"], 12000)
        self.assertEqual(s.intended_writes_summary["miss_days"], len(MISS_DAYS))
        self.assertEqual(s.intended_writes_summary["video_feedback_days"], len(VIDEO_FEEDBACK_DAYS))
        self.assertEqual(s.intended_writes_summary["homework_completions"], 18)
        probe = next(d for d in s.days if d.day_number == GATE_BLOCK_PROBE_DAY)
        # Gate pressure uses Needs Revision — PHA is still completed (18/18).
        if probe.homework:
            self.assertEqual(probe.homework[0]["outcome"], "Needs Revision")
        live = next(d for d in s.days if d.day_number == 12)
        rec = next(d for d in s.days if d.day_number == 40)
        self.assertEqual(live.zoom_modes, ["live"])
        self.assertEqual(rec.zoom_modes, ["recording"])
        self.assertTrue(s.meta.get("early_bird_in_window"))
        self.assertEqual(s.meta.get("early_bird_handling"), "last_early_bird_day_in_window")
        self.assertTrue(s.meta.get("week9_zero_homework"))
        bounds = s.meta.get("week9_bounds")
        self.assertIsNotNone(bounds)
        w9_start = date.fromisoformat(bounds[0])
        w9_end = date.fromisoformat(bounds[1])
        for d in s.days:
            if w9_start <= d.activity_date <= w9_end:
                for hw in d.homework:
                    self.assertNotEqual(
                        hw.get("week_label"),
                        "Week 9",
                        f"week9 day {d.day_number} has Week 9 PHA",
                    )


class TestExecuteOrchestration(unittest.TestCase):
    def setUp(self):
        self.scenario = _full_scenario()
        self.clock = SimulationClock(enabled=True, current_date=SIM_START, run_id=RUN_ID)
        self.weeks = _weeks_covering_window()
        self.ctx = build_execute_context_from_reference(
            scenario=self.scenario,
            weeks=self.weeks,
            school_year=SCHOOL_YEAR_2026_2027,
            submission_field_names={
                FIELD_SEASON_SIM_TEST_RECORD,
                FIELD_SEASON_SIM_CLOCK_NOW,
                FIELD_SEASON_SIM_TEST_SUBMITTED_AT,
                FIELD_VIDEO_UPLOAD_NOTE,
                "Perfect Week Manual Exception?",
            },
        )

    def _seed_zoom(self, client: MemoryAirtableClient) -> None:
        # Writer creates disposable Zoom Meetings — no VERIFY seed required.
        return

    def _run(self, client, registry_dir, *, enable_email=False, confirm=CONFIRM_TOKEN):
        return run_execute(
            scenario=self.scenario,
            clock=self.clock,
            execute=True,
            confirm=confirm,
            confirm_disposable=CONFIRM_DISPOSABLE_TOKEN,
            simulation_id=RUN_ID,
            registry_dir=registry_dir,
            out_dir=registry_dir / "out",
            client=client,
            enable_email_delivery=enable_email,
            acknowledge_clock_override=True,
            execute_context=self.ctx,
            weeks=self.weeks,
            formula_text=GATED_ACTIVITY_DATE_IS_FUTURE_FORMULA,
            submission_field_names=self.ctx.submission_field_names,
        )

    def test_full_execute_email_off_no_abort_after_athlete(self):
        client = MemoryAirtableClient(allow_writes=True)
        self._seed_zoom(client)
        with tempfile.TemporaryDirectory() as tmp:
            payload = self._run(client, Path(tmp), enable_email=False)
        self.assertEqual(payload.get("writer_status"), "complete", payload.get("errors"))
        self.assertFalse(payload.get("errors"))
        subs = client.list_records("Submissions")
        self.assertGreaterEqual(len(subs), 50)
        self.assertEqual(len(client.list_records("Athletes")), 1)
        self.assertEqual(len(client.list_records("Enrollments")), 1)
        self.assertGreaterEqual(len(client.list_records("Homework Completions")), 1)
        self.assertGreaterEqual(len(client.list_records("Weekly Athlete Summary")), 8)
        self.assertGreaterEqual(len(client.list_records("Video Feedback")), len(VIDEO_FEEDBACK_DAYS))
        self.assertGreater(len(client.list_records("Submission Assets")), 0)
        self.assertFalse(any("Athlete create stub" in str(e) for e in payload.get("errors") or []))

    def test_submission_gate_fields_written(self):
        client = MemoryAirtableClient(allow_writes=True)
        self._seed_zoom(client)
        with tempfile.TemporaryDirectory() as tmp:
            self._run(client, Path(tmp))
        marker = run_marker(RUN_ID)
        for rec in client.list_records("Submissions"):
            f = rec["fields"]
            self.assertIs(f[FIELD_SEASON_SIM_TEST_RECORD], True)
            self.assertIn(FIELD_SEASON_SIM_CLOCK_NOW, f)
            self.assertIn(FIELD_SEASON_SIM_TEST_SUBMITTED_AT, f)
            self.assertIn("SEASON-SIM|", f.get(FIELD_VIDEO_UPLOAD_NOTE, ""))
            self.assertEqual(f["Duplicate Review Status"], "Count It")

    def test_enrollment_program_instance_and_school_year(self):
        client = MemoryAirtableClient(allow_writes=True)
        self._seed_zoom(client)
        with tempfile.TemporaryDirectory() as tmp:
            self._run(client, Path(tmp))
        enr = client.list_records("Enrollments")[0]["fields"]
        self.assertEqual(enr["School Year"], "2026-2027")
        self.assertEqual(enr["Program Instance"], ["recPI20262027"])
        self.assertEqual(enr["Grade Band"], ["recBAND912"])
        self.assertEqual(enr["Parent Email"], SAFE_EMAIL_RECIPIENT)

    def test_live_vs_recording_zoom(self):
        client = MemoryAirtableClient(allow_writes=True)
        self._seed_zoom(client)
        with tempfile.TemporaryDirectory() as tmp:
            payload = self._run(client, Path(tmp))
        self.assertEqual(payload.get("writer_status"), "complete", payload.get("errors"))
        attend = client.list_records("Zoom Attendance")
        methods = {a["fields"].get("Attendance Method") for a in attend}
        self.assertIn("Live", methods)
        self.assertIn("Recording Quiz", methods)
        meetings = client.list_records("Zoom Meetings")
        self.assertEqual(len(meetings), 2)
        live = next(m for m in meetings if "|LIVE|" in (m["fields"].get("Meeting Name") or ""))
        rec = next(m for m in meetings if "|REC|" in (m["fields"].get("Meeting Name") or ""))
        self.assertEqual(live["fields"].get("Meeting Status"), "Completed")
        self.assertEqual(rec["fields"].get("Meeting Status"), "Completed")
        self.assertTrue(str(live["fields"].get("Start Time") or "").startswith("2027-"))
        self.assertTrue(str(rec["fields"].get("Start Time") or "").startswith("2027-"))
        # Live gets Attendees + Create XP Events; recording does not
        self.assertTrue(live["fields"].get("Attendees"))
        self.assertTrue(live["fields"].get("Create XP Events"))
        self.assertFalse(rec["fields"].get("Attendees"))
        self.assertFalse(rec["fields"].get("Create XP Events"))
        recorded_za = [
            a for a in attend if a["fields"].get("Attendance Method") == "Recording Quiz"
        ]
        self.assertEqual(len(recorded_za), 1)
        self.assertTrue(recorded_za[0]["fields"].get("Recording Quiz Satisfactory?"))
        self.assertEqual(
            recorded_za[0]["fields"].get("Recording Quiz Review Status"), "Satisfactory"
        )
        self.assertEqual(recorded_za[0]["fields"].get("Zoom Meeting"), [rec["id"]])
        live_za = [a for a in attend if a["fields"].get("Attendance Method") == "Live"]
        self.assertEqual(len(live_za), 1)
        self.assertTrue(live_za[0]["fields"].get("Live Attendance Confirmed?"))

    def test_homework_submission_date_and_was_grade_band(self):
        client = MemoryAirtableClient(allow_writes=True)
        with tempfile.TemporaryDirectory() as tmp:
            self._run(client, Path(tmp))
        hc = client.list_records("Homework Completions")
        self.assertEqual(len(hc), 18)
        for row in hc:
            self.assertRegex(str(row["fields"].get("Submission Date") or ""), r"^2027-\d{2}-\d{2}$")
            self.assertEqual(len(row["fields"].get("Homework") or []), 1)
        was = client.list_records("Weekly Athlete Summary")
        for row in was:
            self.assertEqual(row["fields"].get("Grade Band"), ["recBAND912"])
        vf = client.list_records("Video Feedback")
        self.assertEqual(len(vf), len(VIDEO_FEEDBACK_DAYS))
        for row in vf:
            self.assertTrue(row["fields"].get("Feedback Posted?"))
            self.assertTrue(row["fields"].get("Parent Feedback Ready?"))
            self.assertEqual(row["fields"].get("Grade Band"), ["recBAND912"])
            self.assertFalse(row["fields"].get("Ready for XP Automation?"))

    def test_same_day_and_backdated_submission_timestamps(self):
        from season_simulation.scenarios import BACKDATE_ACTIVITY_DAY, SAME_DAY_SUBMIT_DAY
        from season_simulation.same_day_contracts import simulated_same_day_result

        client = MemoryAirtableClient(allow_writes=True)
        self._seed_zoom(client)
        with tempfile.TemporaryDirectory() as tmp:
            self._run(client, Path(tmp))
        by_day = {}
        for rec in client.list_records("Submissions"):
            act = (rec["fields"].get("Activity Date") or "")[:10]
            sub_at = (rec["fields"].get(FIELD_SEASON_SIM_TEST_SUBMITTED_AT) or "")[:10]
            note = rec["fields"].get(FIELD_VIDEO_UPLOAD_NOTE) or ""
            by_day[act] = (sub_at, note, rec["fields"].get(FIELD_SEASON_SIM_TEST_RECORD))
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
        with self.assertRaises(ValueError):
            assert_safe_recipient("parent@example.com")
        client = MemoryAirtableClient(allow_writes=True)
        self._seed_zoom(client)
        with tempfile.TemporaryDirectory() as tmp:
            payload = self._run(client, Path(tmp), enable_email=False)
        self.assertEqual(payload.get("writer_status"), "complete")
        self.assertFalse(payload.get("enable_email_delivery"))

    def test_retry_resume_no_duplicates(self):
        client = MemoryAirtableClient(allow_writes=True)
        self._seed_zoom(client)
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            first = self._run(client, base)
            self.assertEqual(first.get("writer_status"), "complete")
            sub_count_1 = len(client.list_records("Submissions"))
            second = self._run(client, base)
            self.assertEqual(second.get("writer_status"), "complete")
            self.assertGreater(len(second.get("reused_records") or []), 20)
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
        self._seed_zoom(client)
        with tempfile.TemporaryDirectory() as tmp:
            payload = self._run(client, Path(tmp))
            self.assertEqual(payload.get("writer_status"), "paused")
            self.assertTrue(payload.get("errors"))
            reg = load_registry(Path(tmp), RUN_ID)
            self.assertGreaterEqual(len(reg.records), 1)
            self.assertTrue(reg.athlete_id)

    def test_cleanup_scoped_to_run(self):
        client = MemoryAirtableClient(allow_writes=True)
        self._seed_zoom(client)
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            self._run(client, base)
            plan = build_cleanup_plan(run_id=RUN_ID, registry_dir=base, client=None)
            self.assertGreater(plan.total_records(), 20)
            self.assertEqual(len(plan.targets["Athletes"]), 1)
            self.assertEqual(len(plan.targets.get("Zoom Meetings") or []), 2)

    def test_intended_writes_include_gates_and_zoom_modes(self):
        writes = build_intended_writes(self.scenario, self.clock, ctx=self.ctx)
        subs = [
            w
            for w in writes
            if w.get("table") == "Submissions" and w.get("op") == "create"
        ]
        self.assertEqual(len(subs), 58)
        for w in subs:
            self.assertTrue(w.get("expected_countable"), w.get("day_number"))
            self.assertRegex(str(w["fields"]["Activity Date"]), r"^2027-\d{2}-\d{2}$")
            self.assertEqual(w["fields"].get("Submission Stat Mode"), "Simple Total")
        sub_post = [
            w
            for w in writes
            if w.get("table") == "Submissions" and w.get("op") == "update"
        ]
        self.assertEqual(len(sub_post), 58)
        self.assertTrue(
            all((w.get("fields") or {}).get("Build Daily Email Now?") for w in sub_post)
        )
        readiness = summarize_intended_write_readiness(writes)
        self.assertTrue(readiness["all_submissions_countable"])
        self.assertEqual(readiness["homework_completions"], 18)
        self.assertTrue(readiness["all_homework_dual_linked"])
        self.assertTrue(readiness["video_update_triggers_planned"])
        self.assertTrue(readiness["live_xp_path_planned"])
        self.assertTrue(readiness["recorded_xp_path_planned"])
        hw = [w for w in writes if w.get("table") == "Homework Completions"]
        self.assertTrue(all((w.get("fields") or {}).get("Submission Date") for w in hw))
        self.assertTrue(all((w.get("fields") or {}).get("Item Slot") for w in hw))
        was = [
            w
            for w in writes
            if w.get("table") == "Weekly Athlete Summary" and w.get("op") == "create"
        ]
        self.assertTrue(all((w.get("fields") or {}).get("Grade Band") for w in was))
        zm_creates = [
            w
            for w in writes
            if w.get("table") == "Zoom Meetings" and w.get("op") == "create"
        ]
        self.assertEqual(len(zm_creates), 2)
        zoom = [w for w in writes if w.get("table") == "Zoom Attendance"]
        self.assertEqual(len(zoom), 2)
        modes = {w.get("zoom_mode") for w in zoom}
        self.assertTrue(modes & {"live", "recording", "recorded"})
        recorded = [w for w in zoom if w.get("zoom_mode") == "recorded"]
        self.assertEqual(
            recorded[0]["fields"].get("Recording Quiz Review Status"), "Satisfactory"
        )
        live = [w for w in zoom if w.get("zoom_mode") == "live"]
        self.assertTrue(live[0]["fields"].get("Live Attendance Confirmed?"))
        vf_arms = [
            w
            for w in writes
            if w.get("table") == "Video Feedback" and w.get("op") == "update"
        ]
        self.assertEqual(len(vf_arms), len(VIDEO_FEEDBACK_DAYS))
        self.assertTrue(all(w["fields"].get("Feedback Posted?") is True for w in vf_arms))
        self.assertTrue(
            all(w["fields"].get("Parent Feedback Ready?") is True for w in vf_arms)
        )
        vf_creates = [
            w
            for w in writes
            if w.get("table") == "Video Feedback" and w.get("op") == "create"
        ]
        self.assertTrue(all((w.get("fields") or {}).get("Grade Band") for w in vf_creates))

    def test_streak_achievement_level_plan_signals(self):
        s = self.scenario
        self.assertTrue(MISS_DAYS)
        self.assertGreaterEqual(s.goal_total_shots, 12000)
        self.assertGreaterEqual(s.intended_writes_summary["total_planned_shots"], s.goal_total_shots)
        client = MemoryAirtableClient(allow_writes=True)
        self._seed_zoom(client)
        with tempfile.TemporaryDirectory() as tmp:
            payload = self._run(client, Path(tmp))
        self.assertEqual(payload.get("writer_status"), "complete")
        self.assertNotIn("XP Events", client.tables)
        self.assertNotIn("Athlete Achievement Unlocks", client.tables)


if __name__ == "__main__":
    unittest.main()
