"""Unit tests for live write-contract validation (schema-driven)."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

TOOLS = Path(__file__).resolve().parents[2]
if str(TOOLS) not in sys.path:
    sys.path.insert(0, str(TOOLS))

from season_simulation.constants import (  # noqa: E402
    DEFAULT_BASE_ID,
    SAFE_EMAIL_RECIPIENT,
)
from season_simulation.live_write_contract import (  # noqa: E402
    CANONICAL_PRODUCTION_ZOOM_MEETING_IDS,
    EXPECTED_PERFECT_SEASON_XP,
    LiveWriteContractError,
    assert_live_write_contract_pass,
    classify_zoom_meetings,
    load_oracle_expectations,
    run_live_write_contract_validation,
    validate_attachment_value,
    validate_field_value,
    validate_intended_writes,
    validate_oracle_zoom_model,
    validate_structural_assumptions,
    validate_write_payload,
    validate_zoom_contract,
)
from season_simulation.video_feedback_contract import (  # noqa: E402
    SIM_VIDEO_PLACEHOLDER_URL,
    build_video_asset_create_fields,
)


def _field(name: str, ftype: str, **opts) -> dict:
    entry: dict = {"id": f"fld{name[:12].replace(' ', '')}", "name": name, "type": ftype}
    if opts:
        entry["options"] = opts
    return entry


def _select(name: str, *choices: str) -> dict:
    return _field(
        name,
        "singleSelect",
        choices=[{"id": f"sel{i}", "name": c} for i, c in enumerate(choices)],
    )


def _link(name: str, linked_table_id: str = "") -> dict:
    if linked_table_id:
        return _field(name, "multipleRecordLinks", linkedTableId=linked_table_id)
    return _field(name, "multipleRecordLinks")


def production_like_meta() -> list[dict]:
    """Minimal Meta shaped like Production for contract unit tests."""
    tables = {
        "Athletes": [
            _field("First Name", "singleLineText"),
            _field("Last Name", "singleLineText"),
            _field("Parent Email", "email"),
            _field("Active?", "checkbox"),
        ],
        "Enrollments": [
            _link("Athlete", "tblAthletes000001"),
            _field("Athlete First Name", "singleLineText"),
            _field("Athlete Last Name", "singleLineText"),
            _field("Parent Email", "email"),
            _field("Parent Email - Cleaned", "formula", formula="LOWER({Parent Email})"),
            _field("Athlete Email", "email"),
            _field("Athlete Email - Cleaned", "formula", formula="LOWER({Athlete Email})"),
            _select("School Year", "2025-2026", "2026-2027", "2027-2028"),
            _select("Grade", "8", "10", "12"),
            _link("Grade Band", "tblGradeBands0001"),
            _link("Program Instance", "tblProgramInst001"),
            _field("Active?", "checkbox"),
            _field("Record Id", "formula", formula="RECORD_ID()"),
        ],
        "Weekly Athlete Summary": [
            _link("Enrollment"),
            _link("Week"),
            _link("Goal Record"),
            _link("Grade Band"),
            _field("Weekly Email Sent?", "checkbox"),
            _field("Send to Make?", "checkbox"),
            _field("Build Weekly Email Now?", "checkbox"),
            _select("Perfect Week Automation Status", "Pending", "Complete", "Skipped"),
        ],
        "Zoom Meetings": [
            _field("Meeting Name", "singleLineText"),
            _select("Meeting Status", "Scheduled", "Completed", "Cancelled"),
            _field("Start Time", "dateTime"),
            _link("Week"),
            _link("Attendees"),
            _field("Create XP Events", "checkbox"),
        ],
        "Submissions": [
            _link("Enrollment"),
            _link("Athlete"),
            _link("Week"),
            _field("Activity Date", "date"),
            _field("Shot Total", "number"),
            _select("Duplicate Review Status", "Count It", "Do Not Count"),
            _field("Video Upload", "multipleAttachments"),
            _field("Video Upload Note", "multilineText"),
            _field("Daily Email Subject", "singleLineText"),
            _field("Season Sim Test Record?", "checkbox"),
            _field("Season Sim Clock Now", "dateTime"),
            _field("Season Sim Test Submitted At", "dateTime"),
            _field("Perfect Week Manual Exception?", "checkbox"),
            _link("Homework Name 1"),
            _link("Homework Name 2"),
            _link("Weekly Athlete Summary"),
            _field("Build Daily Email Now?", "checkbox"),
            _field("Activity Date Is Future?", "formula", formula="IF(1,1,0)"),
            _field("Count This Submission?", "formula", formula="1"),
            _field("Submitted Same Day?", "formula", formula="1"),
            _field("Perfect Week Grace Eligible?", "formula", formula="1"),
        ],
        "Submission Assets": [
            _field("Asset Label", "singleLineText"),
            _select("Asset Purpose", "Video For Feedback", "Homework 1", "Homework 2"),
            _select("Asset Slot", "VIDEO", "HW1", "HW2"),
            _select("Asset Type", "Video", "Image"),
            _field("Original File Name", "singleLineText"),
            _field("Source Attachment ID", "singleLineText"),
            _link("Submission - Linked"),
            _link("Enrollment - Linked"),
            _link("Video Feedback"),
            _field("Airtable Attachment", "multipleAttachments"),
            _select("Upload Status", "Uploaded", "Pending", "Failed"),
            _field("Send to Make Trigger", "checkbox"),
            _field("Reviewer Access Token", "singleLineText"),
            _field("Is True Video Feedback Asset?", "formula", formula="1"),
            _field("Reviewer File URL", "formula", formula="''"),
        ],
        "Homework Completions": [
            _link("Enrollment"),
            _link("Week"),
            _link("Program Homework Assignment"),
            _link("Homework"),
            _select("Completion Status", "Submitted", "Satisfactory", "Needs Revision"),
            _field("Satisfactory?", "checkbox"),
            _field("Review Complete", "checkbox"),
            _field("Notes", "multilineText"),
            _field("Coach Feedback", "multilineText"),
            _link("Submissions - Linked"),
            _field("Submission Date", "date"),
            _field("Item Slot", "singleLineText"),
            _link("Submission Assets"),
            _field("Parent Feedback Sent?", "checkbox"),
        ],
        "Video Feedback": [
            _link("Enrollment"),
            _link("Submission"),
            _link("Submission Asset"),
            _field("Active?", "checkbox"),
            _select("Award Status", "Pending", "Awarded"),
            _field("Video Feedback Key", "singleLineText"),
            _field("Coach Feedback", "multilineText"),
            _field("Feedback Posted?", "checkbox"),
            _field("Parent Feedback Ready?", "checkbox"),
            _field("Parent Feedback Sent?", "checkbox"),
            _field("Video URL or Drive Link", "url"),
            _link("Grade Band"),
            _field("Do Not Award XP?", "checkbox"),
        ],
        "Zoom Attendance": [
            _link("Enrollment"),
            _link("Zoom Meeting"),
            _select("Attendance Method", "Live", "Recording Quiz"),
            _field("Recording Quiz Satisfactory?", "checkbox"),
            _select("Recording Quiz Review Status", "Satisfactory", "Not Satisfactory"),
        ],
        "Email Handoff Queue": [
            _field("Handoff Key", "singleLineText"),
            _field("Recipient", "email"),
        ],
        "XP Events": [_field("Active?", "checkbox")],
        "Athlete Achievement Unlocks": [_field("Active?", "checkbox")],
        "Streak Occurrences": [_field("Active?", "checkbox")],
        "Program Homework Assignments": [_field("Name", "singleLineText")],
        "Weeks": [_field("Week Name", "singleLineText")],
    }
    out = []
    for i, (name, fields) in enumerate(tables.items()):
        out.append({"id": f"tbl{i:014d}"[:17], "name": name, "fields": fields})
    # Fix Athletes / Grade Bands ids for link target checks
    for t in out:
        if t["name"] == "Athletes":
            t["id"] = "tblAthletes000001"
        if t["name"] == "Enrollments":
            pass
    out.append(
        {
            "id": "tblGradeBands0001",
            "name": "Grade Bands",
            "fields": [_field("Grade Band Name", "singleLineText")],
        }
    )
    out.append(
        {
            "id": "tblProgramInst001",
            "name": "Program Instances",
            "fields": [_field("Name", "singleLineText")],
        }
    )
    return out


class TestLiveWriteContractCore(unittest.TestCase):
    def setUp(self):
        self.meta = production_like_meta()
        self.schema = {
            t["name"]: {f["name"]: f for f in t["fields"]} for t in self.meta
        }

    def test_computed_field_create_fails(self):
        v = validate_write_payload(
            table="Enrollments",
            op="create",
            fields={"Parent Email - Cleaned": SAFE_EMAIL_RECIPIENT},
            schema=self.schema,
        )
        self.assertTrue(v)
        self.assertIn("computed", v[0].reason.lower())

    def test_computed_field_update_fails(self):
        v = validate_write_payload(
            table="Submissions",
            op="update",
            fields={"Count This Submission?": 1},
            schema=self.schema,
        )
        self.assertTrue(v)
        self.assertIn("computed", v[0].reason.lower())

    def test_missing_field_fails(self):
        v = validate_write_payload(
            table="Enrollments",
            op="create",
            fields={"Totally Fake Field": "x"},
            schema=self.schema,
        )
        self.assertTrue(v)
        self.assertIn("does not exist", v[0].reason)

    def test_wrong_scalar_list_shape_fails(self):
        v = validate_field_value(
            table="Enrollments",
            field_name="Active?",
            value="yes",
            field_meta=self.schema["Enrollments"]["Active?"],
            op="create",
            dedupe_key="t",
        )
        self.assertTrue(v)
        self.assertIn("bool", v[0].reason)

        v2 = validate_field_value(
            table="Enrollments",
            field_name="Athlete",
            value="recABCDEFGHIJKLMN",
            field_meta=self.schema["Enrollments"]["Athlete"],
            op="create",
            dedupe_key="t",
        )
        self.assertTrue(v2)
        self.assertIn("list", v2[0].reason)

    def test_invalid_single_select_fails(self):
        v = validate_field_value(
            table="Enrollments",
            field_name="School Year",
            value="1999-2000",
            field_meta=self.schema["Enrollments"]["School Year"],
            op="create",
            dedupe_key="t",
        )
        self.assertTrue(v)
        self.assertIn("invalid singleSelect", v[0].reason)

    def test_invalid_link_shape_fails(self):
        v = validate_field_value(
            table="Enrollments",
            field_name="Athlete",
            value=["not-a-rec-id"],
            field_meta=self.schema["Enrollments"]["Athlete"],
            op="create",
            dedupe_key="t",
        )
        self.assertTrue(v)
        self.assertIn("invalid linked record", v[0].reason)

    def test_invalid_attachment_id_fails(self):
        v = validate_attachment_value(
            [
                {
                    "id": "SEASON-SIM|SA|VIDEO|D01",
                    "url": "https://cdn.example.org/real.mp4",
                    "filename": "x.mp4",
                }
            ],
            table="Submissions",
            field_name="Video Upload",
            op="create",
            dedupe_key="t",
        )
        self.assertTrue(v)
        self.assertTrue(any("synthetic attachment id" in x.reason for x in v))

    def test_invalid_example_attachment_url_fails(self):
        v = validate_attachment_value(
            [{"url": SIM_VIDEO_PLACEHOLDER_URL, "filename": "x.mp4"}],
            table="Submission Assets",
            field_name="Airtable Attachment",
            op="create",
            dedupe_key="t",
        )
        self.assertTrue(v)
        self.assertTrue(any("invalid.example" in x.reason for x in v))

    def test_legal_attachment_shape_passes(self):
        v = validate_attachment_value(
            [
                {
                    "url": "https://cdn.fairfieldbasketballclub.com/sim/video.mp4",
                    "filename": "video.mp4",
                }
            ],
            table="Submissions",
            field_name="Video Upload",
            op="create",
            dedupe_key="t",
        )
        self.assertEqual(v, [])

    def test_current_enrollment_payload_passes(self):
        fields = {
            "Athlete": ["recmqSM3317Q6eDuY"],
            "Athlete First Name": "Sim",
            "Athlete Last Name": "Perfect",
            "Parent Email": SAFE_EMAIL_RECIPIENT,
            "Athlete Email": SAFE_EMAIL_RECIPIENT,
            "School Year": "2026-2027",
            "Grade": "12",
            "Grade Band": ["rec75ruo3XT5nSvaK"],
            "Program Instance": ["rec5mEM0YPqPqq0hZ"],
            "Active?": True,
        }
        v = validate_write_payload(
            table="Enrollments",
            op="create",
            fields=fields,
            schema=self.schema,
            table_ids={t["name"]: t["id"] for t in self.meta},
        )
        self.assertEqual(v, [], [x.reason for x in v])

    def test_current_d01_video_submission_payload_passes(self):
        fields = {
            "Enrollment": ["rec9pIjQFyKwgAJLG"],
            "Athlete": ["recmqSM3317Q6eDuY"],
            "Week": ["rec2Rewxt21z7dI9f"],
            "Activity Date": "2027-04-25",
            "Shot Total": 100,
            "Duplicate Review Status": "Count It",
            "Daily Email Subject": "SEASON-SIM|D01",
            "Video Upload Note": "SEASON-SIM|run",
            "Season Sim Test Record?": True,
            "Season Sim Clock Now": "2027-04-25",
            "Season Sim Test Submitted At": "2027-04-25T18:00:00-06:00",
        }
        v = validate_write_payload(
            table="Submissions", op="create", fields=fields, schema=self.schema
        )
        self.assertEqual(v, [], [x.reason for x in v])
        self.assertNotIn("Video Upload", fields)

    def test_current_video_asset_payload_passes(self):
        fields = build_video_asset_create_fields(
            marker="SEASON-SIM|run",
            day_number=1,
            submission_id="recSubD0100000001",
            enrollment_id="rec9pIjQFyKwgAJLG",
            source_attachment_id="SEASON-SIM|run|SA|VIDEO|D01",
            filename="season-sim-video-d01.mp4",
            include_synthetic_attachments=False,
        )
        v = validate_write_payload(
            table="Submission Assets", op="create", fields=fields, schema=self.schema
        )
        self.assertEqual(v, [], [x.reason for x in v])
        self.assertNotIn("Airtable Attachment", fields)

    def test_current_homework_payload_passes(self):
        fields = {
            "Enrollment": ["rec9pIjQFyKwgAJLG"],
            "Week": ["rec2Rewxt21z7dI9f"],
            "Program Homework Assignment": ["recPHA00000000001"],
            "Homework": ["recLIB00000000001"],
            "Completion Status": "Satisfactory",
            "Satisfactory?": True,
            "Review Complete": True,
            "Notes": "SEASON-SIM|run",
            "Coach Feedback": "ok",
            "Submissions - Linked": ["recSubD0100000001"],
            "Submission Date": "2027-04-25",
            "Item Slot": "HW1",
            "Submission Assets": ["recAsset000000001"],
            "Parent Feedback Sent?": False,
        }
        v = validate_write_payload(
            table="Homework Completions", op="create", fields=fields, schema=self.schema
        )
        self.assertEqual(v, [], [x.reason for x in v])

    def test_current_zoom_live_and_recording_payloads_pass(self):
        live = {
            "Meeting Name": "SEASON-SIM|run|LIVE|D12",
            "Meeting Status": "Completed",
            "Start Time": "2027-05-06T12:00:00-06:00",
            "Week": ["rec2Rewxt21z7dI9f"],
            "Attendees": [],
            "Create XP Events": False,
        }
        rec = {
            "Meeting Name": "SEASON-SIM|run|REC|D53",
            "Meeting Status": "Completed",
            "Start Time": "2027-06-16T12:00:00-06:00",
            "Week": ["recW3irij491AIPrl"],
            "Attendees": [],
            "Create XP Events": False,
        }
        for fields in (live, rec):
            v = validate_write_payload(
                table="Zoom Meetings", op="create", fields=fields, schema=self.schema
            )
            self.assertEqual(v, [], [x.reason for x in v])

    def test_full_intended_plan_passes_against_fixture_schema(self):
        writes = [
            {
                "table": "Athletes",
                "op": "create",
                "dedupe_key": "a",
                "fields": {
                    "First Name": "Sim",
                    "Last Name": "Perfect",
                    "Parent Email": SAFE_EMAIL_RECIPIENT,
                    "Active?": True,
                },
            },
            {
                "table": "Enrollments",
                "op": "create",
                "dedupe_key": "e",
                "fields": {
                    "Athlete": ["recmqSM3317Q6eDuY"],
                    "Athlete First Name": "Sim",
                    "Athlete Last Name": "Perfect",
                    "Parent Email": SAFE_EMAIL_RECIPIENT,
                    "Athlete Email": SAFE_EMAIL_RECIPIENT,
                    "School Year": "2026-2027",
                    "Grade": "12",
                    "Grade Band": ["rec75ruo3XT5nSvaK"],
                    "Program Instance": ["rec5mEM0YPqPqq0hZ"],
                    "Active?": True,
                },
            },
            {
                "table": "Submissions",
                "op": "create",
                "dedupe_key": "s",
                "fields": {
                    "Enrollment": ["rec9pIjQFyKwgAJLG"],
                    "Activity Date": "2027-04-25",
                    "Shot Total": 50,
                    "Duplicate Review Status": "Count It",
                    "Season Sim Test Record?": True,
                    "Video Upload Note": "SEASON-SIM|x",
                    "Season Sim Clock Now": "2027-04-25",
                    "Season Sim Test Submitted At": "2027-04-25T12:00:00-06:00",
                },
            },
            {
                "table": "Email Handoff Queue",
                "op": "expect_pipeline",
                "event": {},
            },
        ]
        report = validate_intended_writes(
            writes, self.meta, base_id=DEFAULT_BASE_ID
        )
        self.assertTrue(report.ok, [v.reason for v in report.violations])

    def test_assert_raises_on_fail(self):
        report = run_live_write_contract_validation(
            meta_tables=self.meta,
            writes=[
                {
                    "table": "Enrollments",
                    "op": "create",
                    "fields": {"Parent Email - Cleaned": "x"},
                }
            ],
            base_id=DEFAULT_BASE_ID,
            include_structural=False,
        )
        self.assertFalse(report.ok)
        with self.assertRaises(LiveWriteContractError):
            assert_live_write_contract_pass(report)

    def test_oracle_constant(self):
        self.assertEqual(EXPECTED_PERFECT_SEASON_XP, 4910)


class TestZoomContract(unittest.TestCase):
    CANONICAL = [
        {
            "record_id": "recMFP2x5LDqea9ax",
            "meeting_name": "Introduction to the Challenge",
            "display": "Introduction to the Challenge",
        },
        {
            "record_id": "recb9EjQIJVzaRpZa",
            "meeting_name": "Motivation for a Strong Finish",
            "display": "Motivation for a Strong Finish",
        },
    ]
    RUN = "SEASON-SIM-2027-20260912T222521Z-threeathlete"
    LIVE = "rec62iDXyEARc2TzQ"
    REC = "reckvN8KtOIh6dQxs"

    def _disposable(self):
        return [
            {
                "record_id": self.LIVE,
                "meeting_name": f"SEASON-SIM|{self.RUN}__athlete1-perfect|LIVE|D12",
                "display": "Sim LIVE",
            },
            {
                "record_id": self.REC,
                "meeting_name": f"SEASON-SIM|{self.RUN}__athlete1-perfect|REC|D53",
                "display": "Sim REC",
            },
        ]

    def test_pass_canonical_plus_registry_disposable(self):
        meetings = self.CANONICAL + self._disposable()
        classified = classify_zoom_meetings(
            live_meetings=meetings,
            registry_sim_ids={self.LIVE, self.REC},
            shared_run_id=self.RUN,
        )
        self.assertTrue(classified["ok"], classified)
        self.assertEqual(len(classified["canonical_present_ids"]), 2)
        self.assertEqual(len(classified["current_run_disposable_ids"]), 2)
        self.assertEqual(len(classified["unexpected"]), 0)
        self.assertIn("canonical=2", classified["summary"])
        self.assertIn("current-run disposable=2", classified["summary"])
        self.assertIn("unexpected=0", classified["summary"])

        detail, violations = validate_zoom_contract(
            live_meetings=meetings,
            registry_sim_ids={self.LIVE, self.REC},
            shared_run_id=self.RUN,
        )
        self.assertEqual(violations, [])
        self.assertTrue(detail["ok"])
        self.assertEqual(
            detail["summary"],
            "Zoom contract: PASS — canonical=2, current-run disposable=2, unexpected=0",
        )

    def test_fail_wrong_canonical_rid(self):
        meetings = [
            {
                "record_id": "recWRONGCANONICAL01",
                "meeting_name": "Introduction to the Challenge",
            },
            self.CANONICAL[1],
        ] + self._disposable()
        classified = classify_zoom_meetings(
            live_meetings=meetings,
            registry_sim_ids={self.LIVE, self.REC},
            shared_run_id=self.RUN,
        )
        self.assertFalse(classified["ok"])
        self.assertIn("recMFP2x5LDqea9ax", classified["canonical_missing_ids"])
        _, violations = validate_zoom_contract(
            live_meetings=meetings,
            registry_sim_ids={self.LIVE, self.REC},
            shared_run_id=self.RUN,
        )
        self.assertTrue(any("canonical" in v.field for v in violations))

    def test_fail_unregistered_current_run_sim(self):
        meetings = self.CANONICAL + self._disposable() + [
            {
                "record_id": "recUNREGISTEREDZOOM1",
                "meeting_name": f"SEASON-SIM|{self.RUN}__athlete1-perfect|EXTRA|D99",
            }
        ]
        classified = classify_zoom_meetings(
            live_meetings=meetings,
            registry_sim_ids={self.LIVE, self.REC},
            shared_run_id=self.RUN,
        )
        self.assertFalse(classified["ok"])
        self.assertEqual(len(classified["unexpected"]), 1)
        self.assertIn("unregistered", classified["unexpected"][0]["reason"])

    def test_fail_registry_mismatch(self):
        meetings = self.CANONICAL + self._disposable()
        classified = classify_zoom_meetings(
            live_meetings=meetings,
            registry_sim_ids={self.LIVE, "recNOTINLIVEZOOM01"},
            shared_run_id=self.RUN,
        )
        self.assertFalse(classified["ok"])
        self.assertIn("recNOTINLIVEZOOM01", classified["registry_missing_live_ids"])

    def test_other_run_sim_does_not_fail(self):
        meetings = self.CANONICAL + self._disposable() + [
            {
                "record_id": "recOTHERRUNZOOM001",
                "meeting_name": "SEASON-SIM|SEASON-SIM-2027-OTHER-threeathlete|LIVE|D12",
            }
        ]
        classified = classify_zoom_meetings(
            live_meetings=meetings,
            registry_sim_ids={self.LIVE, self.REC},
            shared_run_id=self.RUN,
        )
        self.assertTrue(classified["ok"], classified)
        self.assertEqual(classified["other_run_sim_ids"], ["recOTHERRUNZOOM001"])

    def test_fail_unexpected_third_production_meeting(self):
        meetings = self.CANONICAL + [
            {
                "record_id": "recEXTRAProductionZ",
                "meeting_name": "Extra Program Zoom",
            }
        ] + self._disposable()
        classified = classify_zoom_meetings(
            live_meetings=meetings,
            registry_sim_ids={self.LIVE, self.REC},
            shared_run_id=self.RUN,
        )
        self.assertFalse(classified["ok"])
        self.assertTrue(
            any("unexpected non-canonical" in u["reason"] for u in classified["unexpected"])
        )

    def test_canonical_ids_are_authoritative(self):
        self.assertEqual(
            CANONICAL_PRODUCTION_ZOOM_MEETING_IDS,
            frozenset({"recMFP2x5LDqea9ax", "recb9EjQIJVzaRpZa"}),
        )

    def test_oracle_zoom_model(self):
        oracle = load_oracle_expectations()
        detail, violations = validate_oracle_zoom_model(oracle)
        self.assertEqual(violations, [], detail)
        self.assertEqual(detail["live_xp"], 60)
        self.assertEqual(detail["recording_xp"], 30)
        self.assertEqual(detail["bonus_2_xp"], 0)
        self.assertEqual(detail["bonus_3_xp"], 0)
        self.assertEqual(detail["zoom_total_xp"], 90)
        self.assertEqual(detail["season_xp"], 4910)

    def test_structural_uses_classification_not_loose_count(self):
        # Four total meetings would pass old >=2 gate; wrong canonical must still fail.
        meetings = [
            {"record_id": "recFAKE1", "meeting_name": "A"},
            {"record_id": "recFAKE2", "meeting_name": "B"},
            {"record_id": self.LIVE, "meeting_name": f"SEASON-SIM|{self.RUN}|LIVE"},
            {"record_id": self.REC, "meeting_name": f"SEASON-SIM|{self.RUN}|REC"},
        ]
        structural, violations = validate_structural_assumptions(
            zoom_count=4,
            pha_count=18,
            weeks_count=10,
            live_zoom_meetings=meetings,
            registry_zoom_ids={self.LIVE, self.REC},
            shared_run_id=self.RUN,
        )
        self.assertTrue(any("canonical" in v.field for v in violations))
        self.assertFalse((structural.get("zoom_contract") or {}).get("ok"))


if __name__ == "__main__":
    unittest.main()
