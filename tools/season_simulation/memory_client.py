"""In-memory Airtable client for offline execute-writer tests."""

from __future__ import annotations

from typing import Any
from uuid import uuid4

from .airtable_client import WriteBlockedError


def _new_rec_id() -> str:
    return "rec" + uuid4().hex[:14]


class MemoryAirtableClient:
    """Minimal create/update/get/list compatible with SeasonSimWriter."""

    def __init__(self, *, allow_writes: bool = True) -> None:
        self.allow_writes = allow_writes
        self.base_id = "appMEMORYTEST00001"
        self.tables: dict[str, dict[str, dict[str, Any]]] = {}
        # table -> record_id -> {id, fields}

    def _require_writes(self, table: str) -> None:
        if not self.allow_writes:
            raise WriteBlockedError(f"Write blocked for table {table!r}")

    def meta_tables(self) -> list[dict]:
        return [
            {
                "name": name,
                "fields": [{"name": f} for f in self._known_fields(name)],
            }
            for name in sorted(self.tables.keys() | set(self._schema_defaults()))
        ]

    def _schema_defaults(self) -> dict[str, set[str]]:
        return {
            "Athletes": {"First Name", "Last Name", "Parent Email", "Active?"},
            "Enrollments": {
                "Athlete",
                "Athlete First Name",
                "Athlete Last Name",
                "Parent Email",
                "Athlete Email",
                "School Year",
                "Grade",
                "Grade Band",
                "Program Instance",
                "Active?",
            },
            "Submissions": {
                "Enrollment",
                "Athlete",
                "Week",
                "Activity Date",
                "Shot Total",
                "Duplicate Review Status",
                "Video Upload Note",
                "Daily Email Subject",
                "Season Sim Test Record?",
                "Season Sim Clock Now",
                "Season Sim Test Submitted At",
                "Perfect Week Manual Exception?",
                "Homework Name 1",
                "Homework Name 2",
                "Weekly Athlete Summary",
                "Build Daily Email Now?",
            },
            "Submission Assets": {
                "Asset Label",
                "Asset Purpose",
                "Asset Slot",
                "Asset Type",
                "Original File Name",
                "Source Attachment ID",
                "Submission - Linked",
                "Enrollment - Linked",
                "Send to Make Trigger",
                "Reviewer Access Token",
            },
            "Homework Completions": {
                "Enrollment",
                "Week",
                "Program Homework Assignment",
                "Homework",
                "Completion Status",
                "Satisfactory?",
                "Review Complete",
                "Notes",
                "Coach Feedback",
                "Submissions - Linked",
                "Submission Date",
                "Item Slot",
                "Submission Assets",
                "Parent Feedback Sent?",
                "Parent Feedback Ready?",
                "Award Status",
                "Base XP Awarded",
            },
            "Video Feedback": {
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
                "Do Not Award XP?",
                "Grade Band",
            },
            "Zoom Attendance": {
                "Enrollment",
                "Zoom Meeting",
                "Attendance Method",
                "Live Attendance Confirmed?",
                "Recording Quiz Satisfactory?",
                "Recording Quiz Review Status",
            },
            "Zoom Meetings": {
                "Attendees",
                "Meeting Name",
                "Week",
                "Start Time",
                "Meeting Status",
                "Program Instance",
                "Create XP Events",
            },
            "Weekly Athlete Summary": {
                "Enrollment",
                "Week",
                "Goal Record",
                "Grade Band",
                "Build Weekly Email Now?",
                "Send to Make?",
                "Weekly Email Sent?",
                "Perfect Week Automation Status",
            },
            "Streak Occurrences": {
                "Active?",
                "Enrollment",
                "Achievement",
                "Streak Days",
                "Streak Start Date",
                "Streak End Date",
                "Source Status",
                "Gate Eligible Streak Days",
            },
            "Weeks": {"Week Name", "Start Date", "End Date", "Program Instance"},
        }

    def _known_fields(self, table: str) -> set[str]:
        defaults = self._schema_defaults().get(table, set())
        seen: set[str] = set(defaults)
        for rec in (self.tables.get(table) or {}).values():
            seen.update((rec.get("fields") or {}).keys())
        return seen

    def list_records(
        self,
        table: str,
        *,
        fields: list[str] | None = None,
        formula: str | None = None,
        page_size: int = 100,
        max_records: int | None = None,
    ) -> list[dict]:
        rows = list((self.tables.get(table) or {}).values())
        if max_records is not None:
            rows = rows[:max_records]
        return rows

    def get_record(self, table: str, record_id: str) -> dict:
        rec = (self.tables.get(table) or {}).get(record_id)
        if not rec:
            raise RuntimeError(f"Missing {table}/{record_id}")
        return rec

    def create_records(self, table: str, records: list[dict[str, Any]]) -> list[dict]:
        self._require_writes(table)
        self.tables.setdefault(table, {})
        out: list[dict] = []
        for fields in records:
            rid = _new_rec_id()
            merged = dict(fields)
            self._apply_submission_formula_sim(table, merged)
            rec = {"id": rid, "fields": merged}
            self.tables[table][rid] = rec
            out.append(rec)
        return out

    def update_records(self, table: str, updates: list[dict[str, Any]]) -> list[dict]:
        self._require_writes(table)
        self.tables.setdefault(table, {})
        out: list[dict] = []
        for u in updates:
            rid = u["id"]
            if rid not in self.tables[table]:
                self.tables[table][rid] = {"id": rid, "fields": {}}
            self.tables[table][rid]["fields"].update(u["fields"])
            self._apply_submission_formula_sim(
                table, self.tables[table][rid]["fields"]
            )
            out.append(self.tables[table][rid])
        return out

    def _apply_submission_formula_sim(self, table: str, fields: dict[str, Any]) -> None:
        """Offline stand-in for Count This / Total Shots Counted after create."""
        if table != "Submissions":
            return
        enrollment = fields.get("Enrollment") or []
        activity = fields.get("Activity Date")
        shot_total = fields.get("Shot Total")
        dup = fields.get("Duplicate Review Status")
        if enrollment and activity and shot_total and dup == "Count It":
            fields["Count This Submission?"] = 1
            fields["Total Shots Counted"] = shot_total
        elif not enrollment:
            # Cleared Enrollment during 053 re-arm — formulas fail closed.
            fields["Count This Submission?"] = 0
            fields["Total Shots Counted"] = 0

    def delete_records(self, table: str, record_ids: list[str]) -> list[dict]:
        self._require_writes(table)
        deleted: list[dict] = []
        bucket = self.tables.setdefault(table, {})
        for rid in record_ids:
            if rid in bucket:
                del bucket[rid]
                deleted.append({"id": rid, "deleted": True})
        return deleted

    def seed(self, table: str, record_id: str, fields: dict[str, Any]) -> None:
        self.tables.setdefault(table, {})
        self.tables[table][record_id] = {"id": record_id, "fields": dict(fields)}
