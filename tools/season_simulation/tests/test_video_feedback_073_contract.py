#!/usr/bin/env python3
"""Offline contract tests — season sim Video Feedback satisfies 073 / 113 paths."""

from __future__ import annotations

import sys
import tempfile
import unittest
from datetime import date, timedelta
from pathlib import Path

PACKAGE_PARENT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PACKAGE_PARENT))

from season_simulation.constants import SAFE_EMAIL_RECIPIENT, SIM_START  # noqa: E402
from season_simulation.memory_client import MemoryAirtableClient  # noqa: E402
from season_simulation.scenarios import VIDEO_FEEDBACK_DAYS, build_athlete1_scenario  # noqa: E402
from season_simulation.simulation_clock import SimulationClock  # noqa: E402
from season_simulation.video_feedback_contract import (  # noqa: E402
    build_073_handoff_payload_preview,
    canonical_video_feedback_key,
    validate_073_eligibility,
    validate_113_readiness,
    video_feedback_handoff_key,
    video_xp_source_key,
)
from season_simulation.writer import (  # noqa: E402
    SeasonSimWriter,
    build_execute_context_from_reference,
    load_or_new_registry,
)
from season_simulation.tests.test_writer import _scenario, _weeks_covering_window  # noqa: E402


def _collect_video_bundles(client: MemoryAirtableClient) -> list[dict]:
    """Return [{vf, submission, asset, enrollment}] for each sim video row."""
    bundles: list[dict] = []
    vf_rows = list((client.tables.get("Video Feedback") or {}).values())
    for vf in vf_rows:
        vf_fields = vf.get("fields") or {}
        sub_ids = vf_fields.get("Submission") or []
        asset_ids = vf_fields.get("Submission Asset") or []
        enr_ids = vf_fields.get("Enrollment") or []
        if not sub_ids or not asset_ids or not enr_ids:
            continue
        sub_id = sub_ids[0] if isinstance(sub_ids[0], str) else sub_ids[0]["id"]
        asset_id = asset_ids[0] if isinstance(asset_ids[0], str) else asset_ids[0]["id"]
        enr_id = enr_ids[0] if isinstance(enr_ids[0], str) else enr_ids[0]["id"]
        bundles.append(
            {
                "vf": vf,
                "submission": client.get_record("Submissions", sub_id),
                "asset": client.get_record("Submission Assets", asset_id),
                "enrollment": client.get_record("Enrollments", enr_id),
            }
        )
    return bundles


class TestVideoFeedback073Contract(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.registry_dir = Path(self.tmp.name)
        self.run_id = "SEASON-SIM-2027-20260101T000000Z-vf073"
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
                "Video Upload",
                "Perfect Week Manual Exception?",
            },
            video_feedback_field_names={
                "Enrollment",
                "Submission",
                "Submission Asset",
                "Active?",
                "Award Status",
                "Video Feedback Key",
                "Coach Feedback",
                "Feedback Posted?",
                "Parent Feedback Ready?",
                "Parent Feedback Sent?",
                "Ready for XP Automation?",
                "Grade Band",
                "Week",
                "Video URL or Drive Link",
                "Upload Status",
                "Video Asset File Name",
                "Base XP Awarded",
                "Total Video XP Awarded",
                "XP Events",
            },
        )
        reg = load_or_new_registry(
            run_id=self.run_id,
            registry_dir=self.registry_dir,
            athlete_name="Athlete 1",
        )
        writer = SeasonSimWriter(
            client=self.client,
            scenario=self.scenario,
            clock=self.clock,
            ctx=self.ctx,
            registry=reg,
            registry_dir=self.registry_dir,
        )
        result = writer.run()
        self.assertEqual(result.status, "complete")
        self.bundles = _collect_video_bundles(self.client)
        self.assertEqual(len(self.bundles), len(VIDEO_FEEDBACK_DAYS))

    def tearDown(self):
        self.tmp.cleanup()

    def test_fixture_structural_fields(self):
        for bundle in self.bundles:
            vf = bundle["vf"]
            sub = bundle["submission"]
            asset = bundle["asset"]
            enr = bundle["enrollment"]
            vf_f = vf["fields"]
            sub_f = sub["fields"]
            asset_f = asset["fields"]
            asset_id = asset["id"]

            self.assertTrue(sub_f.get("Enrollment"))
            self.assertEqual(len(sub_f.get("Week") or []), 1)
            # Live Season Sim omits Video Upload attachment objects.
            self.assertNotIn("Video Upload", sub_f)
            self.assertNotIn("Airtable Attachment", asset_f)
            self.assertTrue(asset_f.get("Source Attachment ID"))
            self.assertEqual(asset_f.get("Asset Purpose"), "Video For Feedback")
            self.assertEqual(asset_f.get("Asset Slot"), "VIDEO")
            self.assertEqual(sub_f.get("Count This Submission?"), 1)
            self.assertEqual(
                vf_f.get("Video Feedback Key"),
                canonical_video_feedback_key(asset_id),
            )
            self.assertIn(asset_id, vf_f.get("Submission Asset") or [])
            self.assertIn(vf["id"], asset_f.get("Video Feedback") or [])
            self.assertEqual(asset_f.get("Is True Video Feedback Asset?"), 1)
            self.assertTrue(vf_f.get("Video URL or Drive Link"))
            self.assertIn("lambda-url.us-east-2.on.aws", vf_f["Video URL or Drive Link"])
            self.assertTrue(vf_f.get("Coach Feedback"))
            self.assertTrue(vf_f.get("Feedback Posted?"))
            self.assertTrue(vf_f.get("Parent Feedback Ready?"))
            self.assertTrue(enr["fields"].get("Active?"))
            # Writable input only — Parent Email - Cleaned is a formula (computed from Parent Email).
            self.assertEqual(
                enr["fields"].get("Parent Email"),
                SAFE_EMAIL_RECIPIENT,
            )
            self.assertNotIn("Parent Email - Cleaned", enr["fields"])
            self.assertTrue(vf_f.get("Week"))

    def test_073_structural_eligibility(self):
        for bundle in self.bundles:
            result = validate_073_eligibility(
                video_feedback=bundle["vf"],
                submission=bundle["submission"],
                submission_asset=bundle["asset"],
                enrollment=bundle["enrollment"],
                require_xp_gates=False,
                wall_today=date(2027, 6, 30),
            )
            self.assertTrue(result.eligible, result.errors)

    def test_073_handoff_payload_preview(self):
        for bundle in self.bundles:
            payload = build_073_handoff_payload_preview(
                video_feedback=bundle["vf"],
                enrollment=bundle["enrollment"],
                test_mode=True,
            )
            vf_id = bundle["vf"]["id"]
            self.assertEqual(payload["eventType"], "VIDEO_FEEDBACK")
            self.assertEqual(payload["handoffKey"], video_feedback_handoff_key(vf_id))
            self.assertEqual(payload["recipient"], SAFE_EMAIL_RECIPIENT)
            self.assertTrue(payload["testMode"])
            self.assertTrue(payload["hasVideoUrl"])
            body = str(payload)
            self.assertNotIn("season-sim-viewer-token", body)

    def test_113_readiness(self):
        for bundle in self.bundles:
            result = validate_113_readiness(
                video_feedback=bundle["vf"],
                submission=bundle["submission"],
            )
            self.assertTrue(result.eligible, result.errors)

    def test_intended_emails_include_video_feedback(self):
        vf_events = [
            e for e in self.scenario.intended_emails if e.get("event_type") == "VIDEO_FEEDBACK"
        ]
        self.assertEqual(len(vf_events), len(VIDEO_FEEDBACK_DAYS))
        for ev in vf_events:
            self.assertEqual(ev["recipient"], SAFE_EMAIL_RECIPIENT)
            self.assertFalse(ev["send"])

    def test_negative_missing_submission_asset(self):
        bundle = dict(self.bundles[0])
        broken_vf = dict(bundle["vf"])
        broken_vf["fields"] = dict(bundle["vf"]["fields"])
        broken_vf["fields"]["Submission Asset"] = []
        result = validate_073_eligibility(
            video_feedback=broken_vf,
            submission=bundle["submission"],
            submission_asset=bundle["asset"],
            enrollment=bundle["enrollment"],
            require_xp_gates=False,
        )
        self.assertFalse(result.eligible)

    def test_negative_bad_key(self):
        bundle = self.bundles[0]
        broken_vf = dict(bundle["vf"])
        broken_vf["fields"] = dict(bundle["vf"]["fields"])
        broken_vf["fields"]["Video Feedback Key"] = "WRONG|KEY"
        result = validate_073_eligibility(
            video_feedback=broken_vf,
            submission=bundle["submission"],
            submission_asset=bundle["asset"],
            enrollment=bundle["enrollment"],
            require_xp_gates=False,
        )
        self.assertFalse(result.eligible)
        self.assertTrue(any("Key mismatch" in e for e in result.errors))

    def test_negative_missing_video_provenance(self):
        """Neither Video Upload nor Source Attachment ID / video purpose → ineligible."""
        bundle = self.bundles[0]
        broken_sub = dict(bundle["submission"])
        broken_sub["fields"] = dict(bundle["submission"]["fields"])
        broken_sub["fields"]["Video Upload"] = []
        broken_asset = dict(bundle["asset"])
        broken_asset["fields"] = dict(bundle["asset"]["fields"])
        broken_asset["fields"]["Source Attachment ID"] = ""
        broken_asset["fields"]["Asset Purpose"] = "Homework 1"
        broken_asset["fields"]["Asset Slot"] = "HW1"
        result = validate_073_eligibility(
            video_feedback=bundle["vf"],
            submission=broken_sub,
            submission_asset=broken_asset,
            enrollment=bundle["enrollment"],
            require_xp_gates=False,
        )
        self.assertFalse(result.eligible)
        self.assertTrue(any("Video Upload" in e or "provenance" in e for e in result.errors))

    def test_negative_missing_lambda_url(self):
        bundle = self.bundles[0]
        broken_vf = dict(bundle["vf"])
        broken_vf["fields"] = dict(bundle["vf"]["fields"])
        broken_vf["fields"]["Video URL or Drive Link"] = ""
        result = validate_073_eligibility(
            video_feedback=broken_vf,
            submission=bundle["submission"],
            submission_asset=bundle["asset"],
            enrollment=bundle["enrollment"],
            require_xp_gates=False,
        )
        self.assertFalse(result.eligible)

    def test_negative_parent_feedback_not_ready(self):
        bundle = self.bundles[0]
        broken_vf = dict(bundle["vf"])
        broken_vf["fields"] = dict(bundle["vf"]["fields"])
        broken_vf["fields"]["Parent Feedback Ready?"] = False
        result = validate_073_eligibility(
            video_feedback=broken_vf,
            submission=bundle["submission"],
            submission_asset=bundle["asset"],
            enrollment=bundle["enrollment"],
            require_xp_gates=False,
        )
        self.assertFalse(result.eligible)

    def test_xp_source_key_shape(self):
        for bundle in self.bundles:
            self.assertEqual(
                video_xp_source_key(bundle["vf"]["id"]),
                f"VIDEO_SUBMISSION|{bundle['vf']['id']}",
            )


if __name__ == "__main__":
    unittest.main()
