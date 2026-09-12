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
        """Return schema stubs; formula fields include Production-shaped options."""
        from .clock_override import PRODUCTION_ACTIVITY_DATE_IS_FUTURE_FORMULA
        from .same_day_contracts import (
            PERFECT_WEEK_GRACE_ROLLBACK,
            SUBMITTED_SAME_DAY_ROLLBACK,
        )

        formula_by_field = {
            "Activity Date Is Future?": PRODUCTION_ACTIVITY_DATE_IS_FUTURE_FORMULA,
            "Submitted Same Day?": SUBMITTED_SAME_DAY_ROLLBACK,
            "Perfect Week Grace Eligible?": PERFECT_WEEK_GRACE_ROLLBACK,
        }
        out: list[dict] = []
        for name in sorted(self.tables.keys() | set(self._schema_defaults())):
            fields = []
            for fname in sorted(self._known_fields(name)):
                entry: dict[str, Any] = {"name": fname}
                if fname in formula_by_field:
                    entry["type"] = "formula"
                    entry["options"] = {"formula": formula_by_field[fname]}
                fields.append(entry)
            out.append({"name": name, "fields": fields})
        return out

    def _schema_defaults(self) -> dict[str, set[str]]:
        return {
            "Athletes": {"First Name", "Last Name", "Parent Email", "Active?"},
            "Enrollments": {
                "Athlete",
                "Athlete First Name",
                "Athlete Last Name",
                "Parent Email",
                "Parent Email - Cleaned",
                "Athlete Email",
                "School Year",
                "Grade",
                "Grade Band",
                "Program Instance",
                "Active?",
                "Level Recalc Needed?",
            },
            "Submissions": {
                "Enrollment",
                "Athlete",
                "Week",
                "Activity Date",
                "Shot Total",
                "Duplicate Review Status",
                "Video Upload",
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
                "Count This Submission?",
                "Activity Date Is Future?",
                "Submitted Same Day?",
                "Perfect Week Grace Eligible?",
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
                "Video Feedback",
                "Airtable Attachment",
                "Upload Status",
                "Send to Make Trigger",
                "Reviewer Access Token",
                "Is True Video Feedback Asset?",
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
                "Submission Asset",
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
                "Week",
                "Video URL or Drive Link",
                "Upload Status",
                "Video Asset File Name",
                "Base XP Awarded",
                "Total Video XP Awarded",
                "XP Events",
            },
            "XP Events": {
                "Enrollment",
                "Submission",
                "Week",
                "Video Feedback",
                "XP Points",
                "Active?",
                "Source Key",
                "XP Source Date",
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
            self._apply_formula_sim(table, merged)
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
            self._apply_formula_sim(table, self.tables[table][rid]["fields"])
            out.append(self.tables[table][rid])
        return out

    def _apply_formula_sim(self, table: str, fields: dict[str, Any]) -> None:
        """Offline stand-in for computed fields after create/update."""
        if table == "Submissions":
            enrollment = fields.get("Enrollment") or []
            activity = fields.get("Activity Date")
            shot_total = fields.get("Shot Total")
            dup = fields.get("Duplicate Review Status")
            if enrollment and activity and shot_total and dup == "Count It":
                fields["Count This Submission?"] = 1
                fields["Total Shots Counted"] = shot_total
            elif not enrollment:
                fields["Count This Submission?"] = 0
                fields["Total Shots Counted"] = 0
            clock = fields.get("Season Sim Clock Now")
            if activity and clock:
                try:
                    act_day = str(activity)[:10]
                    clock_day = str(clock)[:10]
                    fields["Activity Date Is Future?"] = 1 if act_day > clock_day else 0
                except (TypeError, ValueError):
                    fields["Activity Date Is Future?"] = 0
        if table == "Submission Assets":
            slot = fields.get("Asset Slot")
            purpose = fields.get("Asset Purpose")
            if slot == "VIDEO" and purpose == "Video For Feedback":
                fields["Is True Video Feedback Asset?"] = 1
            else:
                fields["Is True Video Feedback Asset?"] = 0
        if table == "Video Feedback":
            week = fields.get("Week")
            if not week and fields.get("Submission"):
                # Week lookup from linked Submission when present in store.
                sub_ids = fields.get("Submission") or []
                if sub_ids and "Submissions" in self.tables:
                    sub_id = sub_ids[0] if isinstance(sub_ids[0], str) else sub_ids[0].get("id")
                    sub = self.tables["Submissions"].get(sub_id)
                    if sub:
                        sub_week = (sub.get("fields") or {}).get("Week")
                        if sub_week:
                            fields["Week"] = sub_week

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
