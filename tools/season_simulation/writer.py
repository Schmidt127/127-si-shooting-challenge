"""Full season-simulation execute writer with idempotent resume.

Creates disposable Athlete 1 transactional records only. Never writes Weeks,
schema, or real-athlete rows. Dry-run / confirmation gates live in ``execute.py``.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Protocol

from .clock_override import (
    SEASON_SIM_CLOCK_NOW_FIELD as FIELD_SEASON_SIM_CLOCK_NOW,
    SEASON_SIM_TEST_RECORD_FIELD as FIELD_SEASON_SIM_TEST_RECORD,
    SEASON_SIM_TEST_SUBMITTED_AT_FIELD as FIELD_SEASON_SIM_TEST_SUBMITTED_AT,
    VIDEO_UPLOAD_NOTE_FIELD as FIELD_VIDEO_UPLOAD_NOTE,
    sim_submission_override_fields,
)

# Preflight / readiness: writer always stamps Season Sim gate fields on sim Submissions.
EXECUTE_SETS_SEASON_SIM_GATES = True
SCHOOL_YEAR_2026_2027 = "2026-2027"
from .constants import SAFE_EMAIL_RECIPIENT, SIM_START
from .run_registry import RunRegistry, load_registry, run_marker, save_registry
from .scenarios import Athlete1Scenario
from .season_policy import week_label_for_activity_date
from .simulation_clock import SimulationClock, sunday_of


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
    zoom_live_meeting_id: str = ""
    zoom_recorded_meeting_id: str = ""

    def week_for(self, activity_date: date) -> str:
        return self.week_id_by_date.get(activity_date.isoformat(), "")


def build_week_date_index(weeks: list[Any]) -> tuple[dict[str, str], dict[str, dict[str, Any]], list[str]]:
    """Map each calendar date to a covering Week record id."""
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
        if not rid or not start or not end:
            continue
        if isinstance(start, str):
            start = date.fromisoformat(start[:10])
        if isinstance(end, str):
            end = date.fromisoformat(end[:10])
        by_id[rid] = {
            "record_id": rid,
            "name": name,
            "start": start,
            "end": end,
            "program_instance_id": pi,
        }
        cur = start
        from datetime import timedelta

        while cur <= end:
            key = cur.isoformat()
            if key in by_date and by_date[key] != rid:
                errors.append(f"Overlapping Weeks for {key}: {by_date[key]} vs {rid}")
            by_date[key] = rid
            cur = cur + timedelta(days=1)
    return by_date, by_id, errors


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
        rows = self.client.create_records(table, [fields])
        rid = rows[0]["id"]
        self.reg.add(table, rid, dedupe_key=dedupe_key, fields_snapshot=fields)
        self.created.append({"table": table, "id": rid, "dedupe_key": dedupe_key, "step": step})
        self.reg.last_completed_step = step
        self._save()
        return rid

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
            self._create_day_loop(athlete_id, enrollment_id)
            self._apply_zoom_live_attendees(enrollment_id)
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
            fields = {
                "Enrollment": [enrollment_id],
                "Week": [wid],
                "Goal Record": [self.ctx.goal_record_id],
            }
            self._ensure(
                table="Weekly Athlete Summary",
                dedupe_key=f"{self.marker}|WAS|{wid}",
                fields=fields,
                step=step,
            )

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
            "Activity Date": self.clock.activity_datetime_iso(day.activity_date),
            "Shot Total": day.shot_total,
            "Duplicate Review Status": "Count It",
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

        for zid in day.zoom_meeting_ids:
            mode = (day.meta.get("zoom_mode") if hasattr(day, "meta") else None) or ""
            # DayPlan has no meta — encode mode via scenario zoom placement rules.
            mode = self._zoom_mode_for_day(day.day_number, zid)
            self._create_zoom_attendance(
                enrollment_id=enrollment_id,
                zoom_meeting_id=zid,
                day_number=day.day_number,
                mode=mode,
            )

    def _zoom_mode_for_day(self, day_number: int, zoom_meeting_id: str) -> str:
        if day_number == 12 or zoom_meeting_id == self.ctx.zoom_live_meeting_id:
            return "live"
        if day_number == 40 or zoom_meeting_id == self.ctx.zoom_recorded_meeting_id:
            return "recorded"
        # Default: first selected meeting live, second recorded.
        if zoom_meeting_id == self.ctx.zoom_live_meeting_id:
            return "live"
        return "recorded"

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
            }
            aid = self._ensure(
                table="Submission Assets",
                dedupe_key=f"{hw['dedupe_key']}|ASSET|{i+1}",
                fields=asset_fields,
                step=f"submission_asset|hw|D{day.day_number:02d}|{pha_short}|{i+1}",
            )
            asset_ids.append(aid)

        satisfactory = hw.get("outcome") == "Satisfactory" and hw.get("credit_eligible", True)
        hc_fields: dict[str, Any] = {
            "Enrollment": [enrollment_id],
            "Week": [week_id],
            "Program Homework Assignment": [hw["pha_record_id"]],
            "Completion Status": hw.get("outcome") or "Submitted",
            "Satisfactory?": bool(satisfactory),
            "Review Complete": True,
            "Notes": self.marker,
            "Coach Feedback": f"{self.marker}|HW review",
            "Submissions - Linked": [submission_id],
        }
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
        vf_fields = {
            "Enrollment": [enrollment_id],
            "Submission": [submission_id],
            "Active?": True,
            "Award Status": "Pending",
            "Video Feedback Key": f"{self.marker}|VF|D{day.day_number:02d}|{asset_id}",
            "Coach Feedback": f"{self.marker}|video review",
        }
        self._ensure(
            table="Video Feedback",
            dedupe_key=f"{self.marker}|VF|D{day.day_number:02d}",
            fields=vf_fields,
            step=f"video_feedback|D{day.day_number:02d}",
        )

    def _create_zoom_attendance(
        self,
        *,
        enrollment_id: str,
        zoom_meeting_id: str,
        day_number: int,
        mode: str,
    ) -> None:
        if mode == "live":
            # Live credit path uses Zoom Meetings.Attendees (patched later).
            # Still create a Live Zoom Attendance row for traceability.
            fields = {
                "Enrollment": [enrollment_id],
                "Zoom Meeting": [zoom_meeting_id],
                "Attendance Method": "Live",
            }
        else:
            fields = {
                "Enrollment": [enrollment_id],
                "Zoom Meeting": [zoom_meeting_id],
                "Attendance Method": "Recording Quiz",
                "Recording Quiz Satisfactory?": True,
            }
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
        self.client.update_records(
            "Zoom Meetings",
            [{"id": live_id, "fields": {"Attendees": current}}],
        )
        # Do not register Zoom Meetings for cleanup — reference/config table.
        self.reg.meta.setdefault("zoom_attendees_patches", []).append(
            {
                "meeting_id": live_id,
                "enrollment_id": enrollment_id,
                "attendees": current,
                "dedupe_key": dedupe,
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
        """Authorized only: arm Build Weekly Email Now? on WAS rows for Saturday weeks."""
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
            self.client.update_records(
                "Weekly Athlete Summary",
                [
                    {
                        "id": was_id,
                        "fields": {
                            "Build Weekly Email Now?": True,
                            # Do not set Send to Make? unless operator separately confirms;
                            # Build alone prepares 072 package for review.
                        },
                    }
                ],
            )
            self.reg.add(
                "Weekly Athlete Summary",
                was_id,
                dedupe_key=dedupe,
                notes="email_arm_build_only",
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
) -> ExecuteContext:
    by_date, by_id, overlap_errors = build_week_date_index(weeks)
    if overlap_errors:
        raise ValueError("; ".join(overlap_errors[:5]))
    pi = program_instance_id or resolve_program_instance_id(
        weeks=weeks,
        goal_program_instance_ids=goal_program_instance_ids,
    )
    zoom_live = ""
    zoom_rec = ""
    if scenario.zoom_selected:
        zoom_live = scenario.zoom_selected[0]["record_id"]
        if len(scenario.zoom_selected) > 1:
            zoom_rec = scenario.zoom_selected[1]["record_id"]
        else:
            zoom_rec = zoom_live
    return ExecuteContext(
        program_instance_id=pi,
        school_year=school_year or "2026-2027",
        goal_record_id=scenario.goal_record_id,
        grade_band_id=scenario.grade_band_id,
        weeks_by_id=by_id,
        week_id_by_date=by_date,
        submission_field_names=submission_field_names or set(),
        zoom_live_meeting_id=zoom_live,
        zoom_recorded_meeting_id=zoom_rec,
    )
