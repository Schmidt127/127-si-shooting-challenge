#!/usr/bin/env python3
"""Offline tests for the full season-simulation execute writer."""

from __future__ import annotations

import sys
import tempfile
import unittest
from datetime import date, datetime, timedelta
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
from season_simulation.execute import (  # noqa: E402
    build_intended_writes,
    run_execute,
    summarize_intended_write_readiness,
)
from season_simulation.clock_override import (  # noqa: E402
    activity_date_is_future_gated,
    activity_date_write_value,
)
from season_simulation.memory_client import MemoryAirtableClient  # noqa: E402
from season_simulation.recipient_safety import assert_safe_recipient  # noqa: E402
from season_simulation.run_registry import (  # noqa: E402
    load_registry,
    new_run_id,
    run_marker,
    save_registry,
)
from season_simulation.scenarios import (  # noqa: E402
    MISS_DAYS,
    VIDEO_FEEDBACK_DAYS,
    build_athlete1_scenario,
)
from season_simulation.simulation_clock import SimulationClock  # noqa: E402
from season_simulation.writer import (  # noqa: E402
    NEVER_WRITE_FIELDS,
    SIM_REVIEWER_ACCESS_TOKEN,
    SeasonSimWriter,
    build_execute_context_from_reference,
    build_week_date_index,
    filter_writable_fields,
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
            {
                "record_id": f"recHW{i:02d}",
                "slot": "HW1" if i % 2 else "HW2",
                "library_id": f"recLIB{i:02d}",
            }
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
            video_feedback_field_names={
                "Enrollment",
                "Submission",
                "Active?",
                "Award Status",
                "Video Feedback Key",
                "Coach Feedback",
                "Feedback Posted?",
                "Parent Feedback Ready?",
                "Parent Feedback Sent?",
                "Ready for XP Automation?",
                "Grade Band",
            },
            zoom_meeting_field_names={
                "Meeting Name",
                "Week",
                "Start Time",
                "Meeting Status",
                "Attendees",
                "Program Instance",
                "Create XP Events",
            },
            zoom_attendance_field_names={
                "Enrollment",
                "Zoom Meeting",
                "Attendance Method",
                "Live Attendance Confirmed?",
                "Recording Quiz Satisfactory?",
                "Recording Quiz Review Status",
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
        self.assertEqual(len(subs), 58)  # 61 - 3 misses
        sample = subs[0]["fields"]
        self.assertEqual(sample["Duplicate Review Status"], "Count It")
        # Date-only write — no evening timezone that shifts UTC calendar day.
        self.assertRegex(str(sample["Activity Date"]), r"^2027-\d{2}-\d{2}$")
        self.assertNotIn("T", str(sample["Activity Date"]))
        self.assertTrue(sample.get("Season Sim Test Record?"))
        self.assertIn("SEASON-SIM|", sample.get("Video Upload Note", ""))
        self.assertEqual(sample["Enrollment"], [result.registry.enrollment_id])
        self.assertTrue(sample.get("Week"))
        clock_now = str(sample.get("Season Sim Clock Now") or "")
        self.assertRegex(clock_now, r"^2027-\d{2}-\d{2}$")

        was = list(self.client.tables.get("Weekly Athlete Summary", {}).values())
        self.assertGreaterEqual(len(was), 8)
        self.assertEqual(was[0]["fields"]["Goal Record"], ["recGOAL12000"])
        for row in was:
            self.assertEqual(
                row["fields"].get("Grade Band"),
                ["recBAND12"],
                row["id"],
            )

        hc = list(self.client.tables.get("Homework Completions", {}).values())
        self.assertEqual(len(hc), 18)
        pha_ids = set()
        for row in hc:
            fields = row["fields"]
            self.assertTrue(fields.get("Program Homework Assignment"), row["id"])
            self.assertTrue(fields.get("Homework"), row["id"])
            self.assertEqual(len(fields["Homework"]), 1)
            self.assertRegex(str(fields.get("Submission Date") or ""), r"^2027-\d{2}-\d{2}$")
            self.assertNotIn("T", str(fields.get("Submission Date") or ""))
            self.assertTrue(fields.get("Enrollment"))
            self.assertTrue(fields.get("Week"))
            self.assertTrue(fields.get("Submissions - Linked"))
            self.assertIn(fields.get("Item Slot"), ("HW1", "HW2"), row["id"])
            self.assertTrue(fields.get("Submission Assets"), row["id"])
            self.assertIs(fields.get("Parent Feedback Sent?"), False)
            # Writer must not falsely mark Awarded.
            self.assertNotEqual(fields.get("Award Status"), "Awarded", row["id"])
            pha_ids.update(fields["Program Homework Assignment"])
        self.assertEqual(len(pha_ids), 18)

        vf = list(self.client.tables.get("Video Feedback", {}).values())
        self.assertEqual(len(vf), 4)  # VIDEO_FEEDBACK_DAYS
        for row in vf:
            self.assertTrue(row["fields"].get("Feedback Posted?"), row["id"])
            self.assertTrue(row["fields"].get("Parent Feedback Ready?"), row["id"])
            self.assertIs(row["fields"].get("Parent Feedback Sent?"), False)
            self.assertTrue(row["fields"].get("Coach Feedback"))
            self.assertEqual(row["fields"].get("Grade Band"), ["recBAND12"])
            # Ready for XP is owned by Automation 113 after Base XP — not pre-set.
            self.assertFalse(row["fields"].get("Ready for XP Automation?"))
        # Four create + four Feedback Posted? arm updates tracked in registry.
        vf_arms = [
            r
            for r in result.created
            if r.get("table") == "Video Feedback" and r.get("op") == "update_feedback_posted"
        ]
        self.assertEqual(len(vf_arms), 4)

        assets = list(self.client.tables.get("Submission Assets", {}).values())
        self.assertTrue(any(a["fields"].get("Asset Purpose") == "Video For Feedback" for a in assets))
        hw_assets = [
            a for a in assets if a["fields"].get("Asset Purpose") == "Homework 1"
        ]
        self.assertTrue(hw_assets)
        for a in hw_assets:
            self.assertEqual(
                a["fields"].get("Reviewer Access Token"), SIM_REVIEWER_ACCESS_TOKEN
            )
            self.assertNotIn("Reviewer File URL", a["fields"])

    def test_all_submissions_countable_under_gate(self):
        result = self._writer().run()
        self.assertEqual(result.status, "complete")
        for sub in self.client.tables.get("Submissions", {}).values():
            f = sub["fields"]
            activity = date.fromisoformat(str(f["Activity Date"])[:10])
            clock_now = date.fromisoformat(str(f["Season Sim Clock Now"])[:10])
            decision = activity_date_is_future_gated(
                activity,
                wall_now=datetime(2026, 9, 2, 12, 0, 0),
                season_sim_test_record=True,
                video_upload_note=f.get("Video Upload Note"),
                season_sim_clock_now=clock_now,
            )
            self.assertTrue(
                decision.counts_for_submission,
                f"{sub['id']} activity={activity} clock={clock_now} future={decision.is_future}",
            )
            self.assertFalse(decision.is_future)

    def test_intended_writes_readiness(self):
        writes = build_intended_writes(self.scenario, self.clock, ctx=self.ctx)
        readiness = summarize_intended_write_readiness(writes)
        self.assertEqual(readiness["submission_creates"], 58)
        self.assertTrue(readiness["all_submissions_countable"])
        self.assertEqual(readiness["homework_completions"], 18)
        self.assertTrue(readiness["all_homework_dual_linked"])
        self.assertTrue(readiness["video_update_triggers_planned"])
        self.assertEqual(readiness["video_feedback_creates"], 4)
        for w in writes:
            if w.get("table") == "Submissions" and w.get("op") == "create":
                self.assertEqual(
                    w["fields"]["Activity Date"],
                    activity_date_write_value(
                        date.fromisoformat(w["fields"]["Activity Date"])
                    ),
                )

    def test_live_versus_recorded_zoom(self):
        result = self._writer().run()
        self.assertEqual(result.status, "complete")
        live_id = result.registry.meta.get("zoom_live_meeting_id")
        rec_id = result.registry.meta.get("zoom_recorded_meeting_id")
        self.assertTrue(live_id and live_id.startswith("rec"))
        self.assertTrue(rec_id and rec_id.startswith("rec"))
        self.assertNotEqual(live_id, rec_id)

        za = list(self.client.tables.get("Zoom Attendance", {}).values())
        methods = {z["fields"].get("Attendance Method") for z in za}
        self.assertIn("Live", methods)
        self.assertIn("Recording Quiz", methods)
        recorded = [
            z for z in za if z["fields"].get("Attendance Method") == "Recording Quiz"
        ]
        self.assertEqual(len(recorded), 1)
        self.assertTrue(recorded[0]["fields"].get("Recording Quiz Satisfactory?"))
        self.assertEqual(
            recorded[0]["fields"].get("Recording Quiz Review Status"), "Satisfactory"
        )
        self.assertEqual(recorded[0]["fields"].get("Zoom Meeting"), [rec_id])
        # Expected 101 SC-147 source key pattern (automation creates XP; harness does not).
        expected_key = f"ZOOM_RECORDING_CREDIT|{result.registry.enrollment_id}|{rec_id}"
        self.assertRegex(expected_key, r"^ZOOM_RECORDING_CREDIT\|rec.+\|rec.+$")

        live_meeting = self.client.get_record("Zoom Meetings", live_id)
        lf = live_meeting["fields"]
        self.assertEqual(lf.get("Meeting Status"), "Completed")
        self.assertTrue(str(lf.get("Start Time") or "").startswith("2027-"))
        self.assertTrue(lf.get("Week"))
        self.assertIn(
            result.registry.enrollment_id,
            lf.get("Attendees") or [],
        )
        self.assertTrue(lf.get("Create XP Events"), "live Create XP Events must be armed for 101")
        # Recorded meeting must NOT gain Attendees via live path
        rec_meeting = self.client.get_record("Zoom Meetings", rec_id)
        rf = rec_meeting["fields"]
        self.assertEqual(rf.get("Meeting Status"), "Completed")
        self.assertTrue(str(rf.get("Start Time") or "").startswith("2027-"))
        self.assertNotIn(
            result.registry.enrollment_id,
            rf.get("Attendees") or [],
        )
        self.assertFalse(rf.get("Create XP Events"))
        live_za = [
            z for z in za if z["fields"].get("Attendance Method") == "Live"
        ]
        self.assertEqual(len(live_za), 1)
        self.assertTrue(live_za[0]["fields"].get("Live Attendance Confirmed?"))
        create_xp_arms = [
            r
            for r in result.created
            if r.get("op") == "arm_create_xp_events"
        ]
        self.assertEqual(len(create_xp_arms), 1)
        # Registry-scoped for cleanup
        reg_zoom = result.registry.ids_by_table().get("Zoom Meetings") or []
        self.assertIn(live_id, reg_zoom)
        self.assertIn(rec_id, reg_zoom)

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
                "Zoom Meetings",
                "Weekly Athlete Summary",
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
        live_id = result.registry.meta.get("zoom_live_meeting_id")
        rec_id = result.registry.meta.get("zoom_recorded_meeting_id")
        # Seed an unrelated athlete + VERIFY-style meeting that must not be cleaned
        self.client.seed("Athletes", "recREALATHLETE", {"First Name": "Real"})
        self.client.seed(
            "Zoom Meetings",
            "recVERIFYZOOM",
            {"Meeting Name": "VERIFY 2026", "Attendees": [result.registry.enrollment_id]},
        )
        plan = build_cleanup_plan(run_id=self.run_id, registry_dir=self.registry_dir)
        all_ids = {rid for ids in plan.targets.values() for rid in ids}
        self.assertIn(result.registry.athlete_id, all_ids)
        self.assertNotIn("recREALATHLETE", all_ids)
        self.assertIn(live_id, plan.targets.get("Zoom Meetings") or [])
        self.assertIn(rec_id, plan.targets.get("Zoom Meetings") or [])
        self.assertNotIn("recVERIFYZOOM", plan.targets.get("Zoom Meetings") or [])
        # Sim-created meetings: Attendees reverse skipped (delete instead)
        self.assertFalse(plan.attendees_patches)

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
        self.assertIn("Zoom Meetings", cleanup.deleted)
        self.assertIn(live_id, cleanup.deleted["Zoom Meetings"])
        self.assertIn(rec_id, cleanup.deleted["Zoom Meetings"])
        # Real athlete + VERIFY meeting remain
        self.assertIn("recREALATHLETE", self.client.tables["Athletes"])
        self.assertIn("recVERIFYZOOM", self.client.tables["Zoom Meetings"])
        self.assertNotIn(live_id, self.client.tables.get("Zoom Meetings") or {})
        self.assertNotIn(rec_id, self.client.tables.get("Zoom Meetings") or {})

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

    def test_streak_post_create_and_daily_email_arm(self):
        result = self._writer().run()
        self.assertEqual(result.status, "complete")
        post_arms = [
            r
            for r in result.created
            if r.get("op") == "submission_post_create_arm"
        ]
        streak_arms = [
            r for r in result.created if r.get("op") == "submission_streak_arm"
        ]
        self.assertEqual(len(post_arms), 58)
        self.assertEqual(len(streak_arms), 58)
        for sub in self.client.tables.get("Submissions", {}).values():
            f = sub["fields"]
            self.assertNotIn("Submission Stat Mode", f)
            self.assertTrue(f.get("Shot Total"))
            self.assertTrue(f.get("Build Daily Email Now?"), sub["id"])
            self.assertTrue(f.get("Enrollment"), sub["id"])
            self.assertEqual(f.get("Count This Submission?"), 1, sub["id"])
            self.assertTrue(f.get("Total Shots Counted"), sub["id"])
            self.assertTrue(f.get("Activity Date"))
            self.assertTrue(f.get("Week"))
        # Idempotent: second run reuses post-create + streak arms
        reg = load_registry(self.registry_dir, self.run_id)
        r2 = self._writer(reg=reg).run()
        self.assertEqual(r2.status, "complete")
        reused_post = [
            r
            for r in r2.reused
            if "SUB_POST_CREATE" in str(r.get("dedupe_key") or "")
        ]
        reused_streak = [
            r
            for r in r2.reused
            if "SUB_STREAK_ARM" in str(r.get("dedupe_key") or "")
        ]
        self.assertEqual(len(reused_post), 58)
        self.assertEqual(len(reused_streak), 58)

    def test_streak_arm_waits_for_formulas_then_relinks_enrollment(self):
        """053 requires a real Enrollment change after Count This / shots settle."""
        result = self._writer().run()
        self.assertEqual(result.status, "complete")
        enroll_id = result.registry.enrollment_id
        # Simulate what 053 would create once triggered: one occurrence → gate days.
        achievement_id = "recACHStreak10"
        self.client.seed(
            "Streak Occurrences",
            "recSTREAKOCC1",
            {
                "Active?": True,
                "Enrollment": [enroll_id],
                "Achievement": [achievement_id],
                "Streak Days": 10,
                "Source Status": "Ready for XP",
                "Gate Eligible Streak Days": 10,
            },
        )
        occ = self.client.get_record("Streak Occurrences", "recSTREAKOCC1")
        self.assertEqual(occ["fields"]["Gate Eligible Streak Days"], 10)
        self.assertEqual(occ["fields"]["Enrollment"], [enroll_id])
        # Writer left every submission with Enrollment restored (not cleared).
        for sub in self.client.tables.get("Submissions", {}).values():
            self.assertEqual(sub["fields"].get("Enrollment"), [enroll_id])

    def test_perfect_week_requeue_after_submissions(self):
        result = self._writer().run()
        self.assertEqual(result.status, "complete")
        requeues = [r for r in result.created if r.get("op") == "was_pw_requeue"]
        self.assertGreaterEqual(len(requeues), 10)
        for was in self.client.tables.get("Weekly Athlete Summary", {}).values():
            status = was["fields"].get("Perfect Week Automation Status")
            # Airtable REST requires plain option names (not Scripting {name:…}).
            self.assertIsInstance(status, str, was["id"])
            self.assertEqual(status, "Pending")
        for rec in result.registry.records:
            if rec.dedupe_key and "WAS_PW_REQUEUE" in rec.dedupe_key:
                snap = rec.fields_snapshot or {}
                self.assertEqual(snap.get("Perfect Week Automation Status"), "Pending")
                self.assertIsInstance(snap.get("Perfect Week Automation Status"), str)

    def test_never_writes_computed_submission_stat_mode(self):
        writes = build_intended_writes(self.scenario, self.clock, ctx=self.ctx)
        for w in writes:
            fields = w.get("fields") or {}
            self.assertNotIn(
                "Submission Stat Mode",
                fields,
                f"computed field in {w.get('table')} {w.get('op')} {w.get('dedupe_key')}",
            )
            self.assertNotIn("Reviewer File URL", fields)
            for banned in NEVER_WRITE_FIELDS:
                self.assertNotIn(banned, fields, banned)
        result = self._writer().run()
        self.assertEqual(result.status, "complete")
        for sub in self.client.tables.get("Submissions", {}).values():
            self.assertNotIn("Submission Stat Mode", sub["fields"])
        for asset in self.client.tables.get("Submission Assets", {}).values():
            self.assertNotIn("Reviewer File URL", asset["fields"])

    def test_filter_writable_fields_strips_computed(self):
        cleaned = filter_writable_fields(
            {
                "Shot Total": 100,
                "Submission Stat Mode": "Simple Total",
                "Reviewer File URL": "https://example.com",
                "Build Daily Email Now?": True,
            }
        )
        self.assertEqual(cleaned.get("Shot Total"), 100)
        self.assertTrue(cleaned.get("Build Daily Email Now?"))
        self.assertNotIn("Submission Stat Mode", cleaned)
        self.assertNotIn("Reviewer File URL", cleaned)

    def test_resume_after_zoom_meetings_before_submissions(self):
        """Mirrors paused run …T202049Z: athlete/enrollment/WAS/zoom exist; day loop pending."""
        class FailOnFirstSubmission(MemoryAirtableClient):
            def __init__(self, *a, **k):
                super().__init__(*a, **k)
                self._failed = False

            def create_records(self, table, records):
                if table == "Submissions" and not self._failed:
                    # Detect legacy computed-field write if present.
                    for fields in records:
                        if "Submission Stat Mode" in fields:
                            self._failed = True
                            raise RuntimeError(
                                'Field "Submission Stat Mode" cannot accept a value '
                                "because the field is computed"
                            )
                    # Also fail once to force a pause before any submission exists.
                    self._failed = True
                    raise RuntimeError("simulated pause before first submission")
                return super().create_records(table, records)

        flaky = FailOnFirstSubmission(allow_writes=True)
        self.client = flaky
        paused = self._writer().run()
        self.assertEqual(paused.status, "paused")
        reg = load_registry(self.registry_dir, self.run_id)
        self.assertEqual(reg.status, "paused")
        self.assertTrue(reg.athlete_id)
        self.assertTrue(reg.enrollment_id)
        self.assertTrue(reg.meta.get("zoom_live_meeting_id"))
        self.assertTrue(reg.meta.get("zoom_recorded_meeting_id"))
        self.assertEqual(len(self.client.tables.get("Submissions", {})), 0)
        before = {
            t: len(self.client.tables.get(t, {}))
            for t in (
                "Athletes",
                "Enrollments",
                "Weekly Athlete Summary",
                "Zoom Meetings",
            )
        }
        # Resume with a clean client wrapping the same in-memory tables.
        healthy = MemoryAirtableClient(allow_writes=True)
        healthy.tables = flaky.tables
        self.client = healthy
        resumed = self._writer(reg=reg).run()
        self.assertEqual(resumed.status, "complete", resumed.errors)
        self.assertEqual(len(self.client.tables.get("Submissions", {})), 58)
        for t, n in before.items():
            self.assertEqual(len(self.client.tables.get(t, {})), n, t)
        # Recorded path present; Create XP only on live.
        live_id = resumed.registry.meta["zoom_live_meeting_id"]
        rec_id = resumed.registry.meta["zoom_recorded_meeting_id"]
        self.assertTrue(
            self.client.get_record("Zoom Meetings", live_id)["fields"].get(
                "Create XP Events"
            )
        )
        self.assertFalse(
            self.client.get_record("Zoom Meetings", rec_id)["fields"].get(
                "Create XP Events"
            )
        )
        za = list(self.client.tables.get("Zoom Attendance", {}).values())
        self.assertEqual(len(za), 2)
        self.assertTrue(
            any(z["fields"].get("Attendance Method") == "Recording Quiz" for z in za)
        )
        # Registry remains valid and second resume is no-op.
        reg2 = load_registry(self.registry_dir, self.run_id)
        self.assertEqual(reg2.status, "complete")
        again = self._writer(reg=reg2).run()
        self.assertEqual(again.status, "complete")
        self.assertEqual(len(self.client.tables.get("Submissions", {})), 58)
        self.assertGreater(len(again.reused), 0)

    def test_weekly_email_arm_when_delivery_enabled(self):
        result = self._writer(enable_email=True).run()
        self.assertEqual(result.status, "complete")
        armed = 0
        for row in self.client.tables.get("Weekly Athlete Summary", {}).values():
            f = row["fields"]
            if f.get("Build Weekly Email Now?"):
                armed += 1
                self.assertIs(f.get("Weekly Email Sent?"), False)
                self.assertIs(f.get("Send to Make?"), False)
        self.assertGreaterEqual(armed, 1)
        for ev in result.registry.email_events:
            self.assertEqual(ev["recipient"], SAFE_EMAIL_RECIPIENT)

    def test_homework_email_eligibility_and_needs_revision_pending(self):
        result = self._writer().run()
        self.assertEqual(result.status, "complete")
        satisfactory = 0
        needs_rev = 0
        for row in self.client.tables.get("Homework Completions", {}).values():
            f = row["fields"]
            self.assertIn(f.get("Item Slot"), ("HW1", "HW2"))
            self.assertTrue(f.get("Submission Assets"))
            self.assertTrue(f.get("Review Complete"))
            self.assertIs(f.get("Parent Feedback Sent?"), False)
            self.assertNotEqual(f.get("Award Status"), "Awarded")
            if f.get("Completion Status") == "Needs Revision":
                needs_rev += 1
                self.assertFalse(f.get("Satisfactory?"))
            elif f.get("Satisfactory?"):
                satisfactory += 1
        self.assertGreater(satisfactory, 0)
        self.assertGreater(needs_rev, 0)

    def test_perfect_week_negative_scenario_preserved(self):
        """Misses + sparse videos + Needs Revision HW → no forced Perfect Week."""
        result = self._writer().run()
        self.assertEqual(result.status, "complete")
        # Missed days produce no submissions
        activity_days = {
            date.fromisoformat(str(s["fields"]["Activity Date"])[:10]).toordinal()
            - date(2027, 5, 1).toordinal()
            + 1
            for s in self.client.tables.get("Submissions", {}).values()
        }
        for miss in MISS_DAYS:
            self.assertNotIn(miss, activity_days)
        # Fewer than 3 videos in any single week (one video day per spaced week)
        self.assertEqual(len(VIDEO_FEEDBACK_DAYS), 4)
        vf_weeks = set()
        for n in VIDEO_FEEDBACK_DAYS:
            ad = date(2027, 5, 1) + timedelta(days=n - 1)
            vf_weeks.add(self.ctx.week_for(ad))
        self.assertEqual(len(vf_weeks), len(VIDEO_FEEDBACK_DAYS))
        # At least one Needs Revision homework remains incomplete for PW gate
        needs = [
            h
            for h in self.client.tables.get("Homework Completions", {}).values()
            if h["fields"].get("Completion Status") == "Needs Revision"
        ]
        self.assertGreater(len(needs), 0)
        # Scenario meta documents negative Perfect Week expectation
        notes = " ".join(str(d.notes or "") for d in self.scenario.days)
        self.assertNotIn("FORCE_PERFECT_WEEK", notes)

    def test_intended_writes_arms_and_paths(self):
        writes = build_intended_writes(self.scenario, self.clock, ctx=self.ctx)
        readiness = summarize_intended_write_readiness(writes)
        self.assertTrue(readiness["streak_post_create_planned"])
        self.assertTrue(readiness["streak_arm_planned"])
        self.assertTrue(readiness["perfect_week_requeue_planned"])
        self.assertEqual(readiness["submission_streak_arms"], readiness["submission_creates"])
        self.assertGreaterEqual(readiness["perfect_week_requeues"], 10)
        self.assertTrue(readiness["daily_email_arm_planned"])
        self.assertTrue(readiness["live_xp_path_planned"])
        self.assertTrue(readiness["recorded_xp_path_planned"])
        self.assertEqual(readiness["video_parent_feedback_ready_arms"], 4)
        self.assertGreaterEqual(readiness["weekly_email_arms"], 1)
        self.assertGreater(readiness["homework_needs_revision"], 0)
        self.assertEqual(readiness["homework_071_structural"], 18)
        live_confirmed = [
            w
            for w in writes
            if w.get("zoom_mode") == "live"
            and (w.get("fields") or {}).get("Live Attendance Confirmed?") is True
        ]
        self.assertEqual(len(live_confirmed), 1)


class TestConfirmationTokens(unittest.TestCase):
    def test_tokens_present(self):
        self.assertEqual(CONFIRM_TOKEN, "SEASON-SIMULATION-2027")
        self.assertEqual(CONFIRM_DISPOSABLE_TOKEN, "CONFIRM-DISPOSABLE-SEASON-SIM")
        self.assertEqual(CONFIRM_CLEANUP_TOKEN, "CONFIRM-CLEANUP-SEASON-SIM")


if __name__ == "__main__":
    unittest.main()
