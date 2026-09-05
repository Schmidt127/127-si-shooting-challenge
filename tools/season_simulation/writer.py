"""Full season-simulation execute writer with idempotent resume.

Creates disposable Athlete 1 transactional records only. Never writes Weeks,
schema, or real-athlete rows. Dry-run / confirmation gates live in ``execute.py``.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Protocol

from .clock_override import (
    SEASON_SIM_CLOCK_NOW_FIELD as FIELD_SEASON_SIM_CLOCK_NOW,
    SEASON_SIM_TEST_RECORD_FIELD as FIELD_SEASON_SIM_TEST_RECORD,
    SEASON_SIM_TEST_SUBMITTED_AT_FIELD as FIELD_SEASON_SIM_TEST_SUBMITTED_AT,
    VIDEO_UPLOAD_NOTE_FIELD as FIELD_VIDEO_UPLOAD_NOTE,
    activity_date_write_value,
    sim_submission_override_fields,
)
from .constants import SAFE_EMAIL_RECIPIENT, SIM_START
from .reference_data import parse_date_value
from .run_registry import RunRegistry, load_registry, run_marker, save_registry
from .scenarios import Athlete1Scenario
from .season_policy import week_label_for_activity_date
from .simulation_clock import SimulationClock, sunday_of

# Preflight / readiness: writer always stamps Season Sim gate fields on sim Submissions.
EXECUTE_SETS_SEASON_SIM_GATES = True
SCHOOL_YEAR_2026_2027 = "2026-2027"
# Writable input for Submission Assets.Reviewer File URL formula (token → Lambda URL).
# Never write the formula field Reviewer File URL itself.
SIM_REVIEWER_ACCESS_TOKEN = "season-sim-reviewer-token"
# Live-schema computed / read-only fields — strip from every create/update payload.
NEVER_WRITE_FIELDS = frozenset(
    {
        "Submission Stat Mode",  # formula from Shot Total / detailed stats
        "Reviewer File URL",  # formula from Reviewer Access Token
        "Count This Submission?",
        "Total Shots Counted",
        "Total Shots Canonical",
        "Activity Date Is Future?",
        "Submitted Same Day?",
        "Perfect Week Grace Eligible?",
        "Perfect Week Countable Submission?",
        "Enrollment Record ID",
        "Enrollment Record ID Lookup",
        "Base XP Awarded",
        "Total Homework XP Awarded",
        "Total Video XP Awarded",
        "Ready for XP Automation?",
        "Zoom Credit Approved?",
        "Zoom Credit Pre-Approved?",
        "Created Time",
        "Last Modified Time",
        "Perfect Week Calculation Queue?",
        "Longest Streak Days",
        "Gate Eligible Streak Days",
    }
)

# Production 053 watches recordUpdated on these Submissions fields (live field IDs):
# Activity Date, Enrollment, Count This Submission? (formula), Total Shots Counted (formula).
# Build Daily Email Now? is NOT watched — rewriting identical Activity Date/Enrollment alone
# does not fire 053 after create. Wait for formulas, then Enrollment clear→restore.
FORMULA_WAIT_TIMEOUT_S = 60.0
FORMULA_WAIT_POLL_S = 1.0
# 055 (recordMatchesConditions) updates Current Shooting Streak independently of 053.
# Gate Longest Streak Days is a rollup of Streak Occurrences.Gate Eligible Streak Days.


class WriterClient(Protocol):
    allow_writes: bool
    base_id: str

    def meta_tables(self) -> list[dict]: ...
    def create_records(self, table: str, records: list[dict[str, Any]]) -> list[dict]: ...
    def update_records(self, table: str, updates: list[dict[str, Any]]) -> list[dict]: ...
    def get_record(self, table: str, record_id: str) -> dict: ...
    def list_records(self, table: str, **kwargs: Any) -> list[dict]: ...


class WriterPaused(RuntimeError):
    """Raised when the writer stops after a failed step (registry saved)."""


@dataclass
class ExecuteContext:
    """Resolved live configuration required before transactional writes."""

    program_instance_id: str
    school_year: str
    goal_record_id: str
    grade_band_id: str
    weeks_by_id: dict[str, dict[str, Any]] = field(default_factory=dict)
    # activity_date iso -> week record id
    week_id_by_date: dict[str, str] = field(default_factory=dict)
    submission_field_names: set[str] = field(default_factory=set)
    video_feedback_field_names: set[str] = field(default_factory=set)
    zoom_meeting_field_names: set[str] = field(default_factory=set)
    zoom_attendance_field_names: set[str] = field(default_factory=set)
    zoom_live_meeting_id: str = ""
    zoom_recorded_meeting_id: str = ""

    def week_for(self, activity_date: date) -> str:
        return self.week_id_by_date.get(activity_date.isoformat(), "")


def _coerce_week_bound(value: Any) -> date | None:
    """Normalize Week start/end to an America/Denver calendar date."""
    if isinstance(value, datetime):
        return parse_date_value(value)
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        return parse_date_value(value)
    return parse_date_value(value)


def build_week_date_index(weeks: list[Any]) -> tuple[dict[str, str], dict[str, dict[str, Any]], list[str]]:
    """Map each Denver calendar date to a covering Week record id.

    Start/End values may be ``date``, ISO date-only strings, or Airtable UTC
    dateTime strings — all are normalized via ``parse_date_value``.
    """
    by_date: dict[str, str] = {}
    by_id: dict[str, dict[str, Any]] = {}
    errors: list[str] = []
    for w in weeks:
        if isinstance(w, dict):
            rid = w.get("record_id") or w.get("id") or ""
            start = w.get("start")
            end = w.get("end")
            name = w.get("name") or w.get("display") or ""
            pi = w.get("program_instance_id") or ""
        else:
            rid = getattr(w, "record_id", "")
            start = getattr(w, "start", None)
            end = getattr(w, "end", None)
            name = getattr(w, "name", "")
            pi = getattr(w, "program_instance_id", "")
        start = _coerce_week_bound(start)
        end = _coerce_week_bound(end)
        if not rid or not start or not end:
            continue
        by_id[rid] = {
            "record_id": rid,
            "name": name,
            "start": start,
            "end": end,
            "program_instance_id": pi,
        }
        cur = start
        while cur <= end:
            key = cur.isoformat()
            if key in by_date and by_date[key] != rid:
                errors.append(f"Overlapping Weeks for {key}: {by_date[key]} vs {rid}")
            by_date[key] = rid
            cur = cur + timedelta(days=1)
    return by_date, by_id, errors


def assert_weeks_do_not_overlap(weeks: list[Any]) -> None:
    """Raise if Denver-normalized Week ranges claim the same calendar date."""
    _by_date, _by_id, overlap_errors = build_week_date_index(weeks)
    if overlap_errors:
        raise AssertionError("; ".join(overlap_errors[:5]))


def resolve_program_instance_id(
    *,
    weeks: list[Any],
    goal_program_instance_ids: list[str] | None = None,
) -> str:
    """Prefer a single Program Instance shared by covering Weeks."""
    pis: list[str] = []
    for w in weeks:
        if isinstance(w, dict):
            pi = w.get("program_instance_id") or ""
        else:
            pi = getattr(w, "program_instance_id", "") or ""
        if pi:
            pis.append(pi)
    unique = sorted(set(pis))
    if len(unique) == 1:
        return unique[0]
    if len(unique) > 1:
        # Prefer PI also linked on the selected goal when available.
        for gid in goal_program_instance_ids or []:
            if gid in unique:
                return gid
        raise ValueError(
            "Multiple Program Instance values on Weeks covering the simulation window: "
            + ", ".join(unique)
        )
    goal_pis = [g for g in (goal_program_instance_ids or []) if g]
    if len(set(goal_pis)) == 1:
        return goal_pis[0]
    raise ValueError(
        "Could not resolve Program Instance from Weeks / Target Goal Shots — "
        "required before Enrollment create"
    )


def field_names_for_table(client: WriterClient, table: str) -> set[str]:
    try:
        for t in client.meta_tables():
            if t.get("name") == table:
                return {str(f.get("name") or "") for f in (t.get("fields") or [])}
    except Exception:  # noqa: BLE001
        return set()
    return set()


@dataclass
class WriterResult:
    status: str
    created: list[dict[str, Any]]
    reused: list[dict[str, Any]]
    skipped: list[dict[str, Any]]
    errors: list[str]
    registry: RunRegistry
    paused_at_step: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "status": self.status,
            "created": self.created,
            "reused": self.reused,
            "skipped": self.skipped,
            "errors": self.errors,
            "paused_at_step": self.paused_at_step,
            "registry": self.registry.to_dict(),
        }


def filter_writable_fields(fields: dict[str, Any]) -> dict[str, Any]:
    """Drop known computed/read-only Airtable fields from write payloads."""
    return {k: v for k, v in fields.items() if k not in NEVER_WRITE_FIELDS}


class SeasonSimWriter:
    """Idempotent, resumable writer keyed by run registry dedupe keys."""

    def __init__(
        self,
        *,
        client: WriterClient,
        scenario: Athlete1Scenario,
        clock: SimulationClock,
        ctx: ExecuteContext,
        registry: RunRegistry,
        registry_dir: Path,
        enable_email_delivery: bool = False,
    ) -> None:
        self.client = client
        self.scenario = scenario
        self.clock = clock
        self.ctx = ctx
        self.reg = registry
        self.registry_dir = registry_dir
        self.enable_email_delivery = enable_email_delivery
        self.marker = run_marker(scenario.run_id)
        self.created: list[dict[str, Any]] = []
        self.reused: list[dict[str, Any]] = []
        self.skipped: list[dict[str, Any]] = []
        self.errors: list[str] = []

    def _save(self) -> None:
        save_registry(self.reg, self.registry_dir)

    def _ensure(
        self,
        *,
        table: str,
        dedupe_key: str,
        fields: dict[str, Any],
        step: str,
    ) -> str:
        existing = self.reg.find_by_dedupe_key(dedupe_key)
        if existing:
            self.reused.append({"table": table, "id": existing, "dedupe_key": dedupe_key, "step": step})
            return existing
        writable = filter_writable_fields(fields)
        rows = self.client.create_records(table, [writable])
        rid = rows[0]["id"]
        self.reg.add(table, rid, dedupe_key=dedupe_key, fields_snapshot=writable)
        self.created.append({"table": table, "id": rid, "dedupe_key": dedupe_key, "step": step})
        self.reg.last_completed_step = step
        self._save()
        return rid

    def _update_records(
        self, table: str, updates: list[dict[str, Any]]
    ) -> list[dict]:
        cleaned: list[dict[str, Any]] = []
        for u in updates:
            cleaned.append(
                {
                    "id": u["id"],
                    "fields": filter_writable_fields(u.get("fields") or {}),
                }
            )
        return self.client.update_records(table, cleaned)

    def _pause(self, step: str, exc: Exception) -> WriterResult:
        self.reg.status = "paused"
        self.reg.pause_reason = f"{step}: {exc}"
        self.errors.append(self.reg.pause_reason)
        self._save()
        return WriterResult(
            status="paused",
            created=self.created,
            reused=self.reused,
            skipped=self.skipped,
            errors=self.errors,
            registry=self.reg,
            paused_at_step=step,
        )

    def run(self) -> WriterResult:
        self.reg.status = "running"
        self.reg.pause_reason = ""
        self._save()

        try:
            athlete_id = self._create_athlete()
            enrollment_id = self._create_enrollment(athlete_id)
            self._create_weekly_summaries(enrollment_id)
            self._ensure_sim_zoom_meetings()
            self._create_day_loop(athlete_id, enrollment_id)
            self._requeue_perfect_week_calculations()
            self._apply_zoom_live_attendees(enrollment_id)
            self._arm_live_zoom_create_xp_events()
            self._register_email_intents()
            if self.enable_email_delivery:
                self._arm_was_email_flags(enrollment_id)
        except Exception as exc:  # noqa: BLE001 — pause + persist
            return self._pause(self.reg.last_completed_step or "unknown", exc)

        self.reg.status = "complete"
        self.reg.last_completed_step = "complete"
        self._save()
        return WriterResult(
            status="complete",
            created=self.created,
            reused=self.reused,
            skipped=self.skipped,
            errors=self.errors,
            registry=self.reg,
        )

    def _create_athlete(self) -> str:
        step = "athlete"
        fields = {
            "First Name": self.scenario.athlete["first_name"],
            "Last Name": self.scenario.athlete["last_name"],
            "Parent Email": SAFE_EMAIL_RECIPIENT,
            "Active?": True,
        }
        rid = self._ensure(
            table="Athletes",
            dedupe_key=f"{self.marker}|ATHLETE",
            fields=fields,
            step=step,
        )
        self.reg.athlete_id = rid
        self._save()
        return rid

    def _create_enrollment(self, athlete_id: str) -> str:
        step = "enrollment"
        fields = {
            "Athlete": [athlete_id],
            "Athlete First Name": self.scenario.athlete["first_name"],
            "Athlete Last Name": self.scenario.athlete["last_name"],
            "Parent Email": SAFE_EMAIL_RECIPIENT,
            "Athlete Email": SAFE_EMAIL_RECIPIENT,
            "School Year": self.ctx.school_year,
            "Grade": self.scenario.athlete["grade"],
            "Grade Band": [self.ctx.grade_band_id],
            "Program Instance": [self.ctx.program_instance_id],
            "Active?": True,
        }
        rid = self._ensure(
            table="Enrollments",
            dedupe_key=f"{self.marker}|ENROLLMENT",
            fields=fields,
            step=step,
        )
        self.reg.enrollment_id = rid
        self._save()
        return rid

    def _create_weekly_summaries(self, enrollment_id: str) -> None:
        """Create one WAS per distinct Week covering submit days (031-compatible)."""
        week_ids: set[str] = set()
        for day in self.scenario.days:
            if day.action != "submit":
                continue
            wid = self.ctx.week_for(day.activity_date)
            if wid:
                week_ids.add(wid)
        for wid in sorted(week_ids):
            step = f"was|{wid}"
            fields: dict[str, Any] = {
                "Enrollment": [enrollment_id],
                "Week": [wid],
                "Goal Record": [self.ctx.goal_record_id],
                # Do not rely on Automation 030 — set Grade Band at create time.
                "Grade Band": [self.ctx.grade_band_id],
                # Explicit unchecked so 072 "already sent" / blank-checkbox traps do not apply.
                "Weekly Email Sent?": False,
                "Send to Make?": False,
            }
            self._ensure(
                table="Weekly Athlete Summary",
                dedupe_key=f"{self.marker}|WAS|{wid}",
                fields=fields,
                step=step,
            )

    def _denver_midday_iso(self, activity_date: date) -> str:
        """Stable America/Denver midday for Zoom Start Time (no UTC date roll)."""
        return f"{activity_date.isoformat()}T12:00:00-06:00"

    def _ensure_sim_zoom_meetings(self) -> None:
        """Create disposable Zoom Meetings aligned to sim weeks (not VERIFY 2026 rows).

        Live → day 12 week; Recording → day 40 week. Both registered for cleanup.
        """
        day12 = next((d for d in self.scenario.days if d.day_number == 12), None)
        day40 = next((d for d in self.scenario.days if d.day_number == 40), None)
        if not day12 or not day40:
            raise RuntimeError("Scenario missing day 12 / day 40 for Zoom meeting create")
        week_live = self.ctx.week_for(day12.activity_date)
        week_rec = self.ctx.week_for(day40.activity_date)
        if not week_live or not week_rec:
            raise RuntimeError(
                f"No Week covering Zoom days "
                f"(live={day12.activity_date}, rec={day40.activity_date})"
            )

        zm_fields = self.ctx.zoom_meeting_field_names or field_names_for_table(
            self.client, "Zoom Meetings"
        )

        def _meeting_fields(
            *,
            name: str,
            activity: date,
            week_id: str,
            create_xp_events: bool | None = None,
        ) -> dict[str, Any]:
            fields: dict[str, Any] = {
                "Meeting Name": name,
                "Week": [week_id],
                "Start Time": self._denver_midday_iso(activity),
                "Meeting Status": "Completed",
                "Attendees": [],
            }
            # Live: Create XP Events armed AFTER Attendees patch (see
            # _arm_live_zoom_create_xp_events). Recorded: leave unchecked —
            # SC-147 recording credit does not require Create XP Events.
            if create_xp_events is False and "Create XP Events" in zm_fields:
                fields["Create XP Events"] = False
            # Optional Program Instance link when present on the table.
            if "Program Instance" in zm_fields and self.ctx.program_instance_id:
                fields["Program Instance"] = [self.ctx.program_instance_id]
            return fields

        live_id = self._ensure(
            table="Zoom Meetings",
            dedupe_key=f"{self.marker}|ZOOM_MEETING|LIVE",
            fields=_meeting_fields(
                name=f"{self.marker}|LIVE|D12",
                activity=day12.activity_date,
                week_id=week_live,
                create_xp_events=False,
            ),
            step="zoom_meeting|live",
        )
        rec_id = self._ensure(
            table="Zoom Meetings",
            dedupe_key=f"{self.marker}|ZOOM_MEETING|REC",
            fields=_meeting_fields(
                name=f"{self.marker}|REC|D40",
                activity=day40.activity_date,
                week_id=week_rec,
                create_xp_events=False,
            ),
            step="zoom_meeting|recorded",
        )
        self.ctx.zoom_live_meeting_id = live_id
        self.ctx.zoom_recorded_meeting_id = rec_id
        self.reg.meta["zoom_live_meeting_id"] = live_id
        self.reg.meta["zoom_recorded_meeting_id"] = rec_id
        self._save()

    def _zoom_ids_for_day(self, day: Any) -> list[tuple[str, str]]:
        """Return (meeting_id, mode) pairs for this sim day — always uses created meetings."""
        if day.day_number == 12 and self.ctx.zoom_live_meeting_id:
            return [(self.ctx.zoom_live_meeting_id, "live")]
        if day.day_number == 40 and self.ctx.zoom_recorded_meeting_id:
            return [(self.ctx.zoom_recorded_meeting_id, "recorded")]
        return []

    def _create_day_loop(self, athlete_id: str, enrollment_id: str) -> None:
        for day in self.scenario.days:
            if day.action != "submit":
                self.skipped.append(
                    {
                        "day_number": day.day_number,
                        "reason": "missed day",
                        "dedupe_key": day.dedupe_key,
                    }
                )
                continue
            self._create_submission_bundle(athlete_id, enrollment_id, day)

    def _create_submission_bundle(
        self,
        athlete_id: str,
        enrollment_id: str,
        day: Any,
    ) -> None:
        write_clock_date = date.fromordinal(
            SIM_START.toordinal() + day.write_on_day_number - 1
        )
        week_id = self.ctx.week_for(day.activity_date)
        if not week_id:
            raise RuntimeError(
                f"No Week covering Activity Date {day.activity_date} "
                f"(day {day.day_number})"
            )

        submitted_surrogate = (
            day.activity_date
            if getattr(day, "timing", "") != "backdated"
            else write_clock_date
        )
        override = sim_submission_override_fields(
            run_marker=self.marker,
            simulated_now=write_clock_date,
            activity_date=day.activity_date,
            test_submitted_at=submitted_surrogate,
            perfect_week_manual_exception="PW_MANUAL_EXCEPTION" in (day.notes or ""),
            available_fields=self.ctx.submission_field_names or None,
        )
        sub_fields: dict[str, Any] = {
            "Enrollment": [enrollment_id],
            "Athlete": [athlete_id],
            "Week": [week_id],
            # Date-only — evening Denver datetimes shift +1 UTC day on Airtable date fields.
            "Activity Date": activity_date_write_value(day.activity_date),
            "Shot Total": day.shot_total,
            "Duplicate Review Status": "Count It",
            # Submission Stat Mode is a formula (Simple Total when Shot Total is set).
            "Daily Email Subject": f"{self.marker}|D{day.day_number:02d}",
            **override,
        }
        # Link homework PHAs on Homework Name 1 / 2 when present (Fillout-like shape).
        if day.homework:
            sub_fields["Homework Name 1"] = [day.homework[0]["pha_record_id"]]
            if len(day.homework) > 1:
                sub_fields["Homework Name 2"] = [day.homework[1]["pha_record_id"]]

        was_id = self.reg.find_by_dedupe_key(f"{self.marker}|WAS|{week_id}")
        if was_id:
            sub_fields["Weekly Athlete Summary"] = [was_id]

        submission_id = self._ensure(
            table="Submissions",
            dedupe_key=day.dedupe_key,
            fields=sub_fields,
            step=f"submission|D{day.day_number:02d}",
        )
        # 053 watches recordUpdated (Activity Date / Enrollment), not create.
        # 076 needs Build Daily Email Now? armed (031 may skip when WAS is pre-created).
        self._arm_submission_post_create(
            submission_id,
            enrollment_id=enrollment_id,
            activity_date=day.activity_date,
            day_number=day.day_number,
        )

        for hw in day.homework:
            self._create_homework_bundle(
                enrollment_id=enrollment_id,
                week_id=week_id,
                submission_id=submission_id,
                day=day,
                hw=hw,
            )

        if day.video_feedback:
            self._create_video_bundle(
                enrollment_id=enrollment_id,
                submission_id=submission_id,
                day=day,
            )

        for zid, mode in self._zoom_ids_for_day(day):
            self._create_zoom_attendance(
                enrollment_id=enrollment_id,
                zoom_meeting_id=zid,
                day_number=day.day_number,
                mode=mode,
            )

    def _create_homework_bundle(
        self,
        *,
        enrollment_id: str,
        week_id: str,
        submission_id: str,
        day: Any,
        hw: dict[str, Any],
    ) -> None:
        asset_count = int(hw.get("asset_count") or 1)
        asset_ids: list[str] = []
        for i in range(asset_count):
            pha_short = str(hw.get("pha_record_id") or "pha")[-8:]
            asset_fields = {
                "Asset Label": f"{self.marker}|HW|D{day.day_number:02d}|{pha_short}|{i+1}",
                "Asset Purpose": "Homework 1",
                "Asset Slot": hw.get("slot") or "HW1",
                "Asset Type": "Image",
                "Original File Name": f"season-sim-hw-d{day.day_number:02d}-{pha_short}-{i+1}.jpg",
                "Source Attachment ID": f"{self.marker}|SA|HW|D{day.day_number:02d}|{pha_short}|{i+1}",
                "Submission - Linked": [submission_id],
                "Enrollment - Linked": [enrollment_id],
                "Send to Make Trigger": False,
                # Writable input for formula Reviewer File URL (never write the formula).
                "Reviewer Access Token": SIM_REVIEWER_ACCESS_TOKEN,
            }
            aid = self._ensure(
                table="Submission Assets",
                dedupe_key=f"{hw['dedupe_key']}|ASSET|{i+1}",
                fields=asset_fields,
                step=f"submission_asset|hw|D{day.day_number:02d}|{pha_short}|{i+1}",
            )
            asset_ids.append(aid)

        satisfactory = hw.get("outcome") == "Satisfactory" and hw.get("credit_eligible", True)
        library_id = str(hw.get("library_id") or "").strip()
        if not library_id:
            raise RuntimeError(
                f"Homework Completion for PHA {hw.get('pha_record_id')} missing "
                "library_id (Homework Library link required for Automation 064)"
            )
        slot = str(hw.get("slot") or "HW1").strip() or "HW1"
        hc_fields: dict[str, Any] = {
            "Enrollment": [enrollment_id],
            "Week": [week_id],
            "Program Homework Assignment": [hw["pha_record_id"]],
            # Automation 064 requires Homework (library) + PHA; PHA alone is insufficient.
            "Homework": [library_id],
            "Completion Status": hw.get("outcome") or "Submitted",
            "Satisfactory?": bool(satisfactory),
            "Review Complete": True,
            "Notes": self.marker,
            "Coach Feedback": f"{self.marker}|HW review",
            "Submissions - Linked": [submission_id],
            # Date-only — same Activity Date as linked Submission (064 timing).
            "Submission Date": activity_date_write_value(day.activity_date),
            # 071 structural gates (do NOT force Award Status=Awarded — 064 owns that).
            "Item Slot": slot,
            "Submission Assets": asset_ids,
            "Parent Feedback Sent?": False,
        }
        # Needs Revision stays pending / not Ready; 078 arms Ready when Satisfactory.
        if not satisfactory:
            hc_fields["Satisfactory?"] = False
        self._ensure(
            table="Homework Completions",
            dedupe_key=hw["dedupe_key"],
            fields=hc_fields,
            step=f"homework|D{day.day_number:02d}|{hw.get('pha_record_id')}",
        )

    def _create_video_bundle(
        self,
        *,
        enrollment_id: str,
        submission_id: str,
        day: Any,
    ) -> None:
        asset_fields = {
            "Asset Label": f"{self.marker}|VIDEO|D{day.day_number:02d}",
            "Asset Purpose": "Video For Feedback",
            "Asset Slot": "VIDEO",
            "Asset Type": "Video",
            "Original File Name": f"season-sim-video-d{day.day_number:02d}.mp4",
            "Source Attachment ID": f"{self.marker}|SA|VIDEO|D{day.day_number:02d}",
            "Submission - Linked": [submission_id],
            "Enrollment - Linked": [enrollment_id],
            "Send to Make Trigger": False,
        }
        asset_id = self._ensure(
            table="Submission Assets",
            dedupe_key=f"{self.marker}|SA|VIDEO|D{day.day_number:02d}",
            fields=asset_fields,
            step=f"submission_asset|video|D{day.day_number:02d}",
        )
        vf_fields: dict[str, Any] = {
            "Enrollment": [enrollment_id],
            "Submission": [submission_id],
            "Active?": True,
            "Award Status": "Pending",
            "Video Feedback Key": f"{self.marker}|VF|D{day.day_number:02d}|{asset_id}",
            "Coach Feedback": f"{self.marker}|video review",
            # Feedback Posted? is armed in a separate update so 113/114
            # recordUpdated triggers fire (create-only does not).
        }
        vf_names = self.ctx.video_feedback_field_names or field_names_for_table(
            self.client, "Video Feedback"
        )
        if "Grade Band" in vf_names and self.ctx.grade_band_id:
            vf_fields["Grade Band"] = [self.ctx.grade_band_id]
        vf_id = self._ensure(
            table="Video Feedback",
            dedupe_key=f"{self.marker}|VF|D{day.day_number:02d}",
            fields=vf_fields,
            step=f"video_feedback|D{day.day_number:02d}",
        )
        self._arm_video_feedback_update_trigger(vf_id, day_number=day.day_number)

    def _arm_video_feedback_update_trigger(
        self, vf_id: str, *, day_number: int
    ) -> None:
        """Post-create update so Automations 113/114/073 (recordUpdated) can run.

        113 requires Feedback Posted?=true (and Coach Feedback, Active?, links).
        113 then sets Base XP + Ready for XP Automation? so 114 can create the
        XP Event. 073 requires Parent Feedback Ready?=true when coach feedback is
        complete. This harness never creates XP Events itself.
        """
        dedupe = f"{self.marker}|VF_ARM_POSTED|D{day_number:02d}"
        done = set(self.reg.meta.get("completed_dedupe_keys") or [])
        if dedupe in done or self.reg.has_dedupe_key(dedupe):
            self.reused.append(
                {
                    "table": "Video Feedback",
                    "id": vf_id,
                    "dedupe_key": dedupe,
                    "step": f"video_feedback_arm|D{day_number:02d}",
                }
            )
            return
        arm_fields: dict[str, Any] = {
            "Feedback Posted?": True,
            # Simulated coach feedback is complete — arm 073 handoff gate.
            "Parent Feedback Ready?": True,
            "Parent Feedback Sent?": False,
            # Do not set Ready for XP Automation? — 113 owns that after Base XP.
        }
        self._update_records(
            "Video Feedback",
            [{"id": vf_id, "fields": arm_fields}],
        )
        self.reg.add(
            "Video Feedback",
            vf_id,
            dedupe_key=dedupe,
            notes="arm_feedback_posted_and_parent_ready_for_113_114_073",
            fields_snapshot=dict(arm_fields),
        )
        self.reg.meta.setdefault("completed_dedupe_keys", [])
        if dedupe not in self.reg.meta["completed_dedupe_keys"]:
            self.reg.meta["completed_dedupe_keys"].append(dedupe)
        self.created.append(
            {
                "table": "Video Feedback",
                "id": vf_id,
                "dedupe_key": dedupe,
                "step": f"video_feedback_arm|D{day_number:02d}",
                "op": "update_feedback_posted",
            }
        )
        self.reg.last_completed_step = f"video_feedback_arm|D{day_number:02d}"
        self._save()

    def _create_zoom_attendance(
        self,
        *,
        enrollment_id: str,
        zoom_meeting_id: str,
        day_number: int,
        mode: str,
    ) -> None:
        za_names = self.ctx.zoom_attendance_field_names or field_names_for_table(
            self.client, "Zoom Attendance"
        )
        if mode == "live":
            # Live credit path uses Zoom Meetings.Attendees (patched later).
            # Still create a Live Zoom Attendance row for traceability + gate formulas.
            fields: dict[str, Any] = {
                "Enrollment": [enrollment_id],
                "Zoom Meeting": [zoom_meeting_id],
                "Attendance Method": "Live",
            }
            if "Live Attendance Confirmed?" in za_names:
                fields["Live Attendance Confirmed?"] = True
        else:
            # Recording half-XP (101 SC-147): never add enrollment to Attendees.
            # Stamp writable review fields so formula Zoom Credit Approved? /
            # Pre-Approved evaluate true when EffectiveCoachApproval is required.
            # (Approved / Pre-Approved themselves are formulas — never write them.)
            fields = {
                "Enrollment": [enrollment_id],
                "Zoom Meeting": [zoom_meeting_id],
                "Attendance Method": "Recording Quiz",
                "Recording Quiz Satisfactory?": True,
            }
            if "Recording Quiz Review Status" in za_names:
                fields["Recording Quiz Review Status"] = "Satisfactory"
        self._ensure(
            table="Zoom Attendance",
            dedupe_key=f"{self.marker}|ZOOM|{mode}|{zoom_meeting_id}|D{day_number:02d}",
            fields=fields,
            step=f"zoom_attendance|{mode}|D{day_number:02d}",
        )

    def _apply_zoom_live_attendees(self, enrollment_id: str) -> None:
        """Live meetings only: add Enrollment to Zoom Meetings.Attendees."""
        live_id = self.ctx.zoom_live_meeting_id
        if not live_id:
            return
        step = f"zoom_attendees|{live_id}"
        dedupe = f"{self.marker}|ZOOM_ATTENDEES|{live_id}"
        done = set(self.reg.meta.get("completed_dedupe_keys") or [])
        if dedupe in done or self.reg.has_dedupe_key(dedupe):
            self.reused.append(
                {"table": "Zoom Meetings", "id": live_id, "dedupe_key": dedupe, "step": step}
            )
            return
        # Merge Attendees — fetch current if possible.
        current: list[str] = []
        try:
            rec = self.client.get_record("Zoom Meetings", live_id)
            raw = (rec.get("fields") or {}).get("Attendees") or []
            if isinstance(raw, list):
                for item in raw:
                    if isinstance(item, str):
                        current.append(item)
                    elif isinstance(item, dict) and item.get("id"):
                        current.append(str(item["id"]))
        except Exception:  # noqa: BLE001
            current = []
        if enrollment_id not in current:
            current.append(enrollment_id)
        self._update_records(
            "Zoom Meetings",
            [{"id": live_id, "fields": {"Attendees": current}}],
        )
        # Meeting itself is already registry-scoped via _ensure_sim_zoom_meetings.
        self.reg.meta.setdefault("zoom_attendees_patches", []).append(
            {
                "meeting_id": live_id,
                "enrollment_id": enrollment_id,
                "attendees": current,
                "dedupe_key": dedupe,
                "sim_created": True,
            }
        )
        self.reg.meta.setdefault("completed_dedupe_keys", [])
        if dedupe not in self.reg.meta["completed_dedupe_keys"]:
            self.reg.meta["completed_dedupe_keys"].append(dedupe)
        self.created.append(
            {
                "table": "Zoom Meetings",
                "id": live_id,
                "dedupe_key": dedupe,
                "step": step,
                "op": "attendees_patch",
            }
        )
        self.reg.last_completed_step = step
        self._save()

    def _arm_live_zoom_create_xp_events(self) -> None:
        """After live Attendees patch: arm Create XP Events so 101 awards full live XP.

        Recorded meetings stay Create XP Events=false (SC-147 recording path).
        Never add recorded viewers to Attendees.
        """
        live_id = self.ctx.zoom_live_meeting_id
        if not live_id:
            return
        zm_fields = self.ctx.zoom_meeting_field_names or field_names_for_table(
            self.client, "Zoom Meetings"
        )
        if "Create XP Events" not in zm_fields:
            return
        step = f"zoom_create_xp|{live_id}"
        dedupe = f"{self.marker}|ZOOM_CREATE_XP|{live_id}"
        done = set(self.reg.meta.get("completed_dedupe_keys") or [])
        if dedupe in done or self.reg.has_dedupe_key(dedupe):
            self.reused.append(
                {"table": "Zoom Meetings", "id": live_id, "dedupe_key": dedupe, "step": step}
            )
            return
        self._update_records(
            "Zoom Meetings",
            [{"id": live_id, "fields": {"Create XP Events": True}}],
        )
        self.reg.add(
            "Zoom Meetings",
            live_id,
            dedupe_key=dedupe,
            notes="arm_create_xp_events_after_attendees_for_101",
            fields_snapshot={"Create XP Events": True},
        )
        self.reg.meta.setdefault("completed_dedupe_keys", [])
        if dedupe not in self.reg.meta["completed_dedupe_keys"]:
            self.reg.meta["completed_dedupe_keys"].append(dedupe)
        self.created.append(
            {
                "table": "Zoom Meetings",
                "id": live_id,
                "dedupe_key": dedupe,
                "step": step,
                "op": "arm_create_xp_events",
            }
        )
        self.reg.last_completed_step = step
        self._save()

    def _wait_submission_formulas_ready(self, submission_id: str) -> None:
        """Block until Count This / Total Shots Counted are populated (053 prerequisites)."""
        deadline = time.monotonic() + FORMULA_WAIT_TIMEOUT_S
        last: dict[str, Any] = {}
        while True:
            rec = self.client.get_record("Submissions", submission_id)
            fields = rec.get("fields") or {}
            count_raw = fields.get("Count This Submission?")
            shots_raw = fields.get("Total Shots Counted")
            try:
                count_ok = int(float(count_raw)) == 1 if count_raw not in (None, "") else False
            except (TypeError, ValueError):
                count_ok = count_raw is True
            try:
                shots_ok = float(shots_raw) > 0 if shots_raw not in (None, "") else False
            except (TypeError, ValueError):
                shots_ok = False
            last = {"Count This Submission?": count_raw, "Total Shots Counted": shots_raw}
            if count_ok and shots_ok:
                return
            if time.monotonic() >= deadline:
                raise RuntimeError(
                    f"Timed out waiting for countable formulas on {submission_id}: {last}"
                )
            time.sleep(FORMULA_WAIT_POLL_S)

    def _arm_submission_post_create(
        self,
        submission_id: str,
        *,
        enrollment_id: str,
        activity_date: date,
        day_number: int,
    ) -> None:
        """Post-create: arm 076 (Build Daily), then force 053 after formulas settle.

        Production 053 is recordUpdated watching Activity Date, Enrollment,
        Count This Submission?, and Total Shots Counted. Create settles formulas
        without a separate watched-field change; rewriting the same Activity Date /
        Enrollment values does not fire. Build Daily Email Now? is not watched.

        Sequence:
        1) Build Daily Email Now?=true (076)
        2) Wait until Count This=1 and Total Shots Counted>0
        3) Clear Enrollment, then restore Enrollment + Activity Date (053 fire)
        """
        daily_dedupe = f"{self.marker}|SUB_POST_CREATE|D{day_number:02d}"
        streak_dedupe = f"{self.marker}|SUB_STREAK_ARM|D{day_number:02d}"
        daily_step = f"submission_post_create|D{day_number:02d}"
        streak_step = f"submission_streak_arm|D{day_number:02d}"
        done = set(self.reg.meta.get("completed_dedupe_keys") or [])

        if daily_dedupe not in done and not self.reg.has_dedupe_key(daily_dedupe):
            daily_fields = {"Build Daily Email Now?": True}
            self._update_records(
                "Submissions",
                [{"id": submission_id, "fields": daily_fields}],
            )
            self.reg.add(
                "Submissions",
                submission_id,
                dedupe_key=daily_dedupe,
                notes="arm_076_build_daily_email_now",
                fields_snapshot=dict(daily_fields),
            )
            self.reg.meta.setdefault("completed_dedupe_keys", [])
            self.reg.meta["completed_dedupe_keys"].append(daily_dedupe)
            self.created.append(
                {
                    "table": "Submissions",
                    "id": submission_id,
                    "dedupe_key": daily_dedupe,
                    "step": daily_step,
                    "op": "submission_post_create_arm",
                }
            )
            self.reg.last_completed_step = daily_step
            self._save()
        else:
            self.reused.append(
                {
                    "table": "Submissions",
                    "id": submission_id,
                    "dedupe_key": daily_dedupe,
                    "step": daily_step,
                }
            )

        if streak_dedupe in done or self.reg.has_dedupe_key(streak_dedupe):
            self.reused.append(
                {
                    "table": "Submissions",
                    "id": submission_id,
                    "dedupe_key": streak_dedupe,
                    "step": streak_step,
                }
            )
            return

        self._wait_submission_formulas_ready(submission_id)
        # Watched-field delta that actually changes after create.
        self._update_records(
            "Submissions",
            [{"id": submission_id, "fields": {"Enrollment": []}}],
        )
        restore_fields = {
            "Enrollment": [enrollment_id],
            "Activity Date": activity_date_write_value(activity_date),
        }
        self._update_records(
            "Submissions",
            [{"id": submission_id, "fields": restore_fields}],
        )
        self.reg.add(
            "Submissions",
            submission_id,
            dedupe_key=streak_dedupe,
            notes="arm_053_enrollment_clear_restore_after_formulas",
            fields_snapshot=dict(restore_fields),
        )
        self.reg.meta.setdefault("completed_dedupe_keys", [])
        if streak_dedupe not in self.reg.meta["completed_dedupe_keys"]:
            self.reg.meta["completed_dedupe_keys"].append(streak_dedupe)
        self.created.append(
            {
                "table": "Submissions",
                "id": submission_id,
                "dedupe_key": streak_dedupe,
                "step": streak_step,
                "op": "submission_streak_arm",
            }
        )
        self.reg.last_completed_step = streak_step
        self._save()

    def _requeue_perfect_week_calculations(self) -> None:
        """Re-enter 057 after submissions are linked (WAS was created empty first).

        Perfect Week Calculation Queue? = 1 when Status is Pending or Ready.
        Creating WAS early lets 057 run with zero linked submissions and stay Ready,
        which does not re-fire when Submissions arrive. Toggle Ready/blank → Skipped
        (queue 0) → Pending (queue 1) so 057 recalculates with live links.
        Does not force Eligible?=1.
        """
        was_ids = sorted(
            {
                r.record_id
                for r in self.reg.records
                if r.table == "Weekly Athlete Summary"
                and r.record_id
                and r.dedupe_key.startswith(f"{self.marker}|WAS|")
            }
        )
        for was_id in was_ids:
            dedupe = f"{self.marker}|WAS_PW_REQUEUE|{was_id}"
            step = f"was_pw_requeue|{was_id}"
            if self.reg.has_dedupe_key(dedupe) or dedupe in set(
                self.reg.meta.get("completed_dedupe_keys") or []
            ):
                self.reused.append(
                    {
                        "table": "Weekly Athlete Summary",
                        "id": was_id,
                        "dedupe_key": dedupe,
                        "step": step,
                    }
                )
                continue
            # REST API expects select option names as strings (not Scripting {name:…}).
            self._update_records(
                "Weekly Athlete Summary",
                [
                    {
                        "id": was_id,
                        "fields": {"Perfect Week Automation Status": "Skipped"},
                    }
                ],
            )
            self._update_records(
                "Weekly Athlete Summary",
                [
                    {
                        "id": was_id,
                        "fields": {"Perfect Week Automation Status": "Pending"},
                    }
                ],
            )
            self.reg.add(
                "Weekly Athlete Summary",
                was_id,
                dedupe_key=dedupe,
                notes="requeue_057_after_submissions_linked",
                fields_snapshot={"Perfect Week Automation Status": "Pending"},
            )
            self.reg.meta.setdefault("completed_dedupe_keys", [])
            if dedupe not in self.reg.meta["completed_dedupe_keys"]:
                self.reg.meta["completed_dedupe_keys"].append(dedupe)
            self.created.append(
                {
                    "table": "Weekly Athlete Summary",
                    "id": was_id,
                    "dedupe_key": dedupe,
                    "step": step,
                    "op": "was_pw_requeue",
                }
            )
            self.reg.last_completed_step = step
            self._save()

    def _register_email_intents(self) -> None:
        for ev in self.scenario.intended_emails:
            event = {
                **ev,
                "send": bool(self.enable_email_delivery),
                "recipient": SAFE_EMAIL_RECIPIENT,
            }
            self.reg.email_events.append(event)
        self._save()

    def _arm_was_email_flags(self, enrollment_id: str) -> None:
        """Arm Build Weekly Email Now? on Saturday WAS rows (072 package path).

        Runs after the full day loop so Submission→WAS links and XP settlement
        have a chance to land. 072 clears Build Weekly only on success or
        skipBuild; throws leave Build true — do not manually clear.

        Production prerequisite (OMNI, not writer): 072 ``recordId`` input must be
        the trigger WAS id (``$ref: trigger → id``), not a hardcoded test record.
        A static recordId leaves Build=true with no package/handoff.

        SC-168: This does **not** arm Send to Make? (119 / Sunday 10:00 Denver).
        The simulation clock does not fire Airtable cron. WEEKLY Hub handoffs
        require the opt-in ``weekly-email-stage`` command after packages are Ready.
        """
        _ = enrollment_id  # reserved for future recipient checks
        for day in self.scenario.days:
            if day.action != "submit":
                continue
            if day.activity_date.weekday() != 5:  # Saturday
                continue
            week_id = self.ctx.week_for(day.activity_date)
            was_id = self.reg.find_by_dedupe_key(f"{self.marker}|WAS|{week_id}")
            if not was_id:
                continue
            dedupe = f"{self.marker}|WAS_EMAIL_ARM|{was_id}"
            if self.reg.has_dedupe_key(dedupe):
                continue
            # false→true so recordMatchesConditions re-enters if already checked.
            self._update_records(
                "Weekly Athlete Summary",
                [
                    {
                        "id": was_id,
                        "fields": {
                            "Build Weekly Email Now?": False,
                            "Weekly Email Sent?": False,
                            "Send to Make?": False,
                        },
                    }
                ],
            )
            self._update_records(
                "Weekly Athlete Summary",
                [
                    {
                        "id": was_id,
                        "fields": {
                            "Build Weekly Email Now?": True,
                            "Weekly Email Sent?": False,
                            "Send to Make?": False,
                        },
                    }
                ],
            )
            self.reg.add(
                "Weekly Athlete Summary",
                was_id,
                dedupe_key=dedupe,
                notes="email_arm_build_weekly_for_072_false_then_true",
            )
            self._save()


def load_or_new_registry(
    *,
    run_id: str,
    registry_dir: Path,
    athlete_name: str,
    meta: dict[str, Any] | None = None,
) -> RunRegistry:
    try:
        reg = load_registry(registry_dir, run_id)
        if meta:
            reg.meta.update(meta)
        return reg
    except FileNotFoundError:
        return RunRegistry(
            run_id=run_id,
            created_at=datetime.now(timezone.utc).isoformat(),
            athlete_name=athlete_name,
            meta=meta or {},
        )


def build_execute_context_from_reference(
    *,
    scenario: Athlete1Scenario,
    weeks: list[Any],
    school_year: str,
    program_instance_id: str | None = None,
    goal_program_instance_ids: list[str] | None = None,
    submission_field_names: set[str] | None = None,
    video_feedback_field_names: set[str] | None = None,
    zoom_meeting_field_names: set[str] | None = None,
    zoom_attendance_field_names: set[str] | None = None,
) -> ExecuteContext:
    assert_weeks_do_not_overlap(weeks)
    by_date, by_id, overlap_errors = build_week_date_index(weeks)
    if overlap_errors:
        raise ValueError("; ".join(overlap_errors[:5]))
    pi = program_instance_id or resolve_program_instance_id(
        weeks=weeks,
        goal_program_instance_ids=goal_program_instance_ids,
    )
    # Zoom meeting IDs are filled by SeasonSimWriter._ensure_sim_zoom_meetings
    # (disposable creates). Do not reuse misaligned VERIFY / reference meetings.
    return ExecuteContext(
        program_instance_id=pi,
        school_year=school_year or "2026-2027",
        goal_record_id=scenario.goal_record_id,
        grade_band_id=scenario.grade_band_id,
        weeks_by_id=by_id,
        week_id_by_date=by_date,
        submission_field_names=submission_field_names or set(),
        video_feedback_field_names=video_feedback_field_names or set(),
        zoom_meeting_field_names=zoom_meeting_field_names or set(),
        zoom_attendance_field_names=zoom_attendance_field_names or set(),
        zoom_live_meeting_id="",
        zoom_recorded_meeting_id="",
    )
