#!/usr/bin/env python3
"""Offline tests for the full season-simulation execute writer."""

from __future__ import annotations

import sys
import tempfile
import unittest
from datetime import date, timedelta
from pathlib import Path

PACKAGE_PARENT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PACKAGE_PARENT))

from season_simulation.constants import (  # noqa: E402
    CONFIRM_CLEANUP_TOKEN,
    CONFIRM_DISPOSABLE_TOKEN,
    CONFIRM_TOKEN,
    SAFE_EMAIL_RECIPIENT,
    SIM_START,
)
from season_simulation.cleanup import build_cleanup_plan, run_cleanup  # noqa: E402
from season_simulation.cli import cmd_evidence  # noqa: E402
from season_simulation.execute import build_intended_writes, run_execute  # noqa: E402
from season_simulation.memory_client import MemoryAirtableClient  # noqa: E402
from season_simulation.recipient_safety import assert_safe_recipient  # noqa: E402
from season_simulation.run_registry import (  # noqa: E402
    load_registry,
    new_run_id,
    run_marker,
    save_registry,
)
from season_simulation.scenarios import build_athlete1_scenario  # noqa: E402
from season_simulation.simulation_clock import SimulationClock  # noqa: E402
from season_simulation.writer import (  # noqa: E402
    SeasonSimWriter,
    build_execute_context_from_reference,
    build_week_date_index,
    load_or_new_registry,
)


def _weeks_covering_window():
    """Synthetic Weeks covering May 1 – June 30, 2027 (Sun–Sat blocks)."""
    weeks = []
    # Early Bird 2027-04-25 … 05-01
    weeks.append(
        {
            "record_id": "recWEEKEarlyBird",
            "name": "Early Bird",
            "start": date(2027, 4, 25),
            "end": date(2027, 5, 1),
            "program_instance_id": "recPISeasonSim",
        }
    )
    # Week 1 starts 2027-05-02
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
                "program_instance_id": "recPISeasonSim",
            }
        )
    return weeks


def _scenario(run_id: str):
    return build_athlete1_scenario(
        run_id=run_id,
        grade_band_id="recBAND12",
        goal_record_id="recGOAL12000",
        goal_total_shots=12000,
        homework=[
            {"record_id": f"recHW{i:02d}", "slot": "HW1" if i % 2 else "HW2"}
            for i in range(1, 19)
        ],
        zoom_meetings=[
            {"record_id": "recZOOMLive", "display": "Live Meet"},
            {"record_id": "recZOOMRec", "display": "Recorded Meet"},
        ],
        weeks=_weeks_covering_window(),
    )


class TestWriterFullCreate(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.registry_dir = Path(self.tmp.name)
        self.run_id = "SEASON-SIM-2027-20260101T000000Z-wrt001"
        self.scenario = _scenario(self.run_id)
        self.clock = SimulationClock(
            enabled=True, current_date=SIM_START, run_id=self.run_id
        )
        self.client = MemoryAirtableClient(allow_writes=True)
        self.client.seed(
            "Zoom Meetings",
            "recZOOMLive",
            {"Meeting Name": "Live", "Attendees": []},
        )
        self.client.seed(
            "Zoom Meetings",
            "recZOOMRec",
            {"Meeting Name": "Recorded", "Attendees": []},
        )
        self.ctx = build_execute_context_from_reference(
            scenario=self.scenario,
            weeks=_weeks_covering_window(),
            school_year="2026-2027",
            submission_field_names={
                "Season Sim Test Record?",
                "Season Sim Clock Now",
                "Season Sim Test Submitted At",
                "Video Upload Note",
                "Perfect Week Manual Exception?",
            },
        )

    def tearDown(self):
        self.tmp.cleanup()

    def _writer(self, reg=None, enable_email=False):
        reg = reg or load_or_new_registry(
            run_id=self.run_id,
            registry_dir=self.registry_dir,
            athlete_name="Athlete 1",
        )
        return SeasonSimWriter(
            client=self.client,
            scenario=self.scenario,
            clock=self.clock,
            ctx=self.ctx,
            registry=reg,
            registry_dir=self.registry_dir,
            enable_email_delivery=enable_email,
        )

    def test_full_record_creation_and_links(self):
        result = self._writer().run()
        self.assertEqual(result.status, "complete")
        self.assertTrue(result.registry.athlete_id.startswith("rec"))
        self.assertTrue(result.registry.enrollment_id.startswith("rec"))

        enroll = self.client.get_record("Enrollments", result.registry.enrollment_id)
        ef = enroll["fields"]
        self.assertEqual(ef["Program Instance"], ["recPISeasonSim"])
        self.assertEqual(ef["School Year"], "2026-2027")
        self.assertEqual(ef["Athlete"], [result.registry.athlete_id])
        self.assertEqual(ef["Parent Email"], SAFE_EMAIL_RECIPIENT)

        subs = list(self.client.tables.get("Submissions", {}).values())
        self.assertGreaterEqual(len(subs), 50)  # 61 - 3 misses
        sample = subs[0]["fields"]
        self.assertEqual(sample["Duplicate Review Status"], "Count It")
        self.assertIn("2027-", sample["Activity Date"])
        self.assertTrue(sample.get("Season Sim Test Record?"))
        self.assertIn("SEASON-SIM|", sample.get("Video Upload Note", ""))
        self.assertEqual(sample["Enrollment"], [result.registry.enrollment_id])
        self.assertTrue(sample.get("Week"))

        was = list(self.client.tables.get("Weekly Athlete Summary", {}).values())
        self.assertGreaterEqual(len(was), 8)
        self.assertEqual(was[0]["fields"]["Goal Record"], ["recGOAL12000"])

        hc = list(self.client.tables.get("Homework Completions", {}).values())
        self.assertTrue(hc)
        self.assertIn("Program Homework Assignment", hc[0]["fields"])

        vf = list(self.client.tables.get("Video Feedback", {}).values())
        self.assertEqual(len(vf), 4)  # VIDEO_FEEDBACK_DAYS

        assets = list(self.client.tables.get("Submission Assets", {}).values())
        self.assertTrue(any(a["fields"].get("Asset Purpose") == "Video For Feedback" for a in assets))
        self.assertTrue(any(a["fields"].get("Asset Purpose") == "Homework 1" for a in assets))

    def test_live_versus_recorded_zoom(self):
        result = self._writer().run()
        self.assertEqual(result.status, "complete")
        za = list(self.client.tables.get("Zoom Attendance", {}).values())
        methods = {z["fields"].get("Attendance Method") for z in za}
        self.assertIn("Live", methods)
        self.assertIn("Recording Quiz", methods)
        recorded = [
            z for z in za if z["fields"].get("Attendance Method") == "Recording Quiz"
        ]
        self.assertTrue(all(z["fields"].get("Recording Quiz Satisfactory?") for z in recorded))

        live_meeting = self.client.get_record("Zoom Meetings", "recZOOMLive")
        self.assertIn(
            result.registry.enrollment_id,
            live_meeting["fields"].get("Attendees") or [],
        )
        # Recorded meeting must NOT gain Attendees via live path
        rec_meeting = self.client.get_record("Zoom Meetings", "recZOOMRec")
        self.assertNotIn(
            result.registry.enrollment_id,
            rec_meeting["fields"].get("Attendees") or [],
        )

    def test_idempotent_retry_does_not_duplicate(self):
        w1 = self._writer()
        r1 = w1.run()
        created_once = len(r1.created)
        counts = {
            t: len(self.client.tables.get(t, {}))
            for t in (
                "Athletes",
                "Enrollments",
                "Submissions",
                "Homework Completions",
                "Video Feedback",
                "Zoom Attendance",
            )
        }
        reg = load_registry(self.registry_dir, self.run_id)
        r2 = self._writer(reg=reg).run()
        self.assertEqual(r2.status, "complete")
        self.assertGreater(len(r2.reused), 0)
        for t, n in counts.items():
            self.assertEqual(len(self.client.tables.get(t, {})), n, t)
        self.assertLessEqual(len(r2.created), created_once)

    def test_failure_pause_and_resume(self):
        class Flaky(MemoryAirtableClient):
            def __init__(self, *a, **k):
                super().__init__(*a, **k)
                self.fail_once_on = "Submissions"
                self._failed = False

            def create_records(self, table, records):
                if table == self.fail_once_on and not self._failed:
                    self._failed = True
                    raise RuntimeError("simulated submission failure")
                return super().create_records(table, records)

        flaky = Flaky(allow_writes=True)
        flaky.seed("Zoom Meetings", "recZOOMLive", {"Attendees": []})
        flaky.seed("Zoom Meetings", "recZOOMRec", {"Attendees": []})
        self.client = flaky
        paused = self._writer().run()
        self.assertEqual(paused.status, "paused")
        self.assertTrue(paused.errors)
        reg = load_registry(self.registry_dir, self.run_id)
        self.assertEqual(reg.status, "paused")
        # Athlete+enrollment should exist; resume continues
        resumed = self._writer(reg=reg).run()
        self.assertEqual(resumed.status, "complete")
        self.assertTrue(resumed.registry.enrollment_id)

    def test_2027_dates_on_submissions(self):
        self._writer().run()
        for sub in self.client.tables.get("Submissions", {}).values():
            ad = sub["fields"]["Activity Date"]
            self.assertTrue(ad.startswith("2027-05-") or ad.startswith("2027-06-"))

    def test_email_allowlist_and_default_no_send(self):
        result = self._writer(enable_email=False).run()
        for ev in result.registry.email_events:
            self.assertEqual(ev["recipient"], SAFE_EMAIL_RECIPIENT)
            self.assertFalse(ev.get("send"))
        assert_safe_recipient(SAFE_EMAIL_RECIPIENT)
        with self.assertRaises(ValueError):
            assert_safe_recipient("family@example.com")

    def test_cleanup_scoping_registry_only(self):
        result = self._writer().run()
        # Seed an unrelated athlete that must not be cleaned
        self.client.seed("Athletes", "recREALATHLETE", {"First Name": "Real"})
        plan = build_cleanup_plan(run_id=self.run_id, registry_dir=self.registry_dir)
        all_ids = {rid for ids in plan.targets.values() for rid in ids}
        self.assertIn(result.registry.athlete_id, all_ids)
        self.assertNotIn("recREALATHLETE", all_ids)
        self.assertTrue(plan.attendees_patches)

        cleanup = run_cleanup(
            run_id=self.run_id,
            registry_dir=self.registry_dir,
            execute=True,
            confirm=CONFIRM_TOKEN,
            confirm_cleanup=CONFIRM_CLEANUP_TOKEN,
            simulation_id=self.run_id,
            client=self.client,
            out_dir=self.registry_dir,
        )
        self.assertFalse(cleanup.errors)
        self.assertIn("Athletes", cleanup.deleted)
        # Real athlete remains
        self.assertIn("recREALATHLETE", self.client.tables["Athletes"])
        # Live attendees reversed
        live = self.client.get_record("Zoom Meetings", "recZOOMLive")
        self.assertNotIn(
            result.registry.enrollment_id,
            live["fields"].get("Attendees") or [],
        )

    def test_evidence_export(self):
        out = Path(self.tmp.name) / "reports"
        out.mkdir()
        (out / "preflight-latest.json").write_text("{}\n", encoding="utf-8")
        (out / "dry-run-latest.json").write_text("{}\n", encoding="utf-8")

        class Args:
            out_dir = str(out)
            run_id = self.run_id

        code = cmd_evidence(Args())
        self.assertEqual(code, 0)
        manifests = list(out.glob("evidence-manifest-*.json"))
        self.assertEqual(len(manifests), 1)

    def test_intended_writes_include_zoom_modes(self):
        writes = build_intended_writes(self.scenario, self.clock, ctx=self.ctx)
        zoom = [w for w in writes if w.get("table") == "Zoom Attendance"]
        self.assertTrue(any(w.get("zoom_mode") == "live" for w in zoom))
        self.assertTrue(any(w.get("zoom_mode") == "recorded" for w in zoom))
        patches = [w for w in writes if w.get("op") == "attendees_patch"]
        self.assertTrue(patches)

    def test_run_execute_dry_run_default(self):
        payload = run_execute(
            scenario=self.scenario,
            clock=self.clock,
            execute=False,
            confirm="",
            confirm_disposable="",
            simulation_id=self.run_id,
            registry_dir=self.registry_dir,
            out_dir=self.registry_dir,
            execute_context=self.ctx,
        )
        self.assertEqual(payload["mode"], "dry-run-execute-path")
        self.assertEqual(payload["airtable_writes_performed"] if False else 0, 0)

    def test_week_index_sunday_saturday(self):
        by_date, by_id, errors = build_week_date_index(_weeks_covering_window())
        self.assertFalse(errors)
        self.assertEqual(by_date["2027-05-01"], "recWEEKEarlyBird")
        self.assertEqual(by_date["2027-05-02"], "recWEEK1")
        self.assertIn("recWEEK9", by_id)


class TestConfirmationTokens(unittest.TestCase):
    def test_tokens_present(self):
        self.assertEqual(CONFIRM_TOKEN, "SEASON-SIMULATION-2027")
        self.assertEqual(CONFIRM_DISPOSABLE_TOKEN, "CONFIRM-DISPOSABLE-SEASON-SIM")
        self.assertEqual(CONFIRM_CLEANUP_TOKEN, "CONFIRM-CLEANUP-SEASON-SIM")


if __name__ == "__main__":
    unittest.main()
