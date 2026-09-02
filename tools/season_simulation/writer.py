"""Submission field builder + execute orchestration for season simulation.

Simulation-created Submissions always carry the Season Sim gate fields so the
temporary gated ``Activity Date Is Future?`` formula can count May–June 2027
Activity Dates. Non-simulation / Production creates must not use these helpers.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import date, timedelta
from typing import Any

from .constants import SAFE_EMAIL_RECIPIENT, SIM_START
from .run_registry import RunRegistry, run_marker
from .scenarios import Athlete1Scenario, DayPlan
from .simulation_clock import SimulationClock, SubmissionTiming

# Preflight reads this flag — must stay True once gate fields are on every
# simulation Submission payload.
EXECUTE_SETS_SEASON_SIM_GATES = True

FIELD_SEASON_SIM_TEST_RECORD = "Season Sim Test Record?"
FIELD_SEASON_SIM_CLOCK_NOW = "Season Sim Clock Now"
FIELD_SEASON_SIM_TEST_SUBMITTED_AT = "Season Sim Test Submitted At"
FIELD_VIDEO_UPLOAD_NOTE = "Video Upload Note"


def simulation_date_for_day_number(day_number: int, *, start: date = SIM_START) -> date:
    if day_number < 1:
        raise ValueError(f"day_number must be >= 1, got {day_number}")
    return start + timedelta(days=day_number - 1)


def build_simulation_submission_fields(
    *,
    run_id: str,
    clock: SimulationClock,
    activity_date: date,
    write_on_day_number: int,
    shot_total: int,
    timing: str,
) -> dict[str, Any]:
    """Build Submissions create fields for one disposable season-sim row.

    - ``Season Sim Test Record?`` always True (sim-only helper).
    - ``Season Sim Clock Now`` = simulated wall clock on the write day.
    - ``Season Sim Test Submitted At`` = simulated submit time (same Denver day
      as Activity Date for same_day; write-day for backdated).
    - ``Video Upload Note`` retains ``SEASON-SIM|<run_id>``.
    """
    marker = run_marker(run_id)
    write_date = simulation_date_for_day_number(write_on_day_number, start=clock.start)

    # Simulated "now" when the harness writes this row (must be >= Activity Date
    # so gated Activity Date Is Future? stays 0).
    clock_now = clock.activity_datetime_iso(write_date, hour=20, minute=0)

    if timing == SubmissionTiming.SAME_DAY.value:
        submitted_at = clock.activity_datetime_iso(activity_date, hour=19, minute=0)
    elif timing == SubmissionTiming.BACKDATED.value:
        submitted_at = clock.activity_datetime_iso(write_date, hour=19, minute=0)
    else:
        # Missed / unexpected — still stamp write-day surrogate for cleanup tagging.
        submitted_at = clock.activity_datetime_iso(write_date, hour=19, minute=0)

    return {
        "Activity Date": clock.activity_datetime_iso(activity_date, hour=18, minute=0),
        "Shot Total": shot_total,
        FIELD_VIDEO_UPLOAD_NOTE: marker,
        FIELD_SEASON_SIM_TEST_RECORD: True,
        FIELD_SEASON_SIM_CLOCK_NOW: clock_now,
        FIELD_SEASON_SIM_TEST_SUBMITTED_AT: submitted_at,
    }


def build_simulation_submission_fields_for_day(
    *,
    run_id: str,
    clock: SimulationClock,
    day: DayPlan,
) -> dict[str, Any]:
    return build_simulation_submission_fields(
        run_id=run_id,
        clock=clock,
        activity_date=day.activity_date,
        write_on_day_number=day.write_on_day_number,
        shot_total=day.shot_total,
        timing=day.timing,
    )


def production_submission_fields_unscoped(
    *,
    activity_date_iso: str,
    shot_total: int,
    video_upload_note: str = "",
) -> dict[str, Any]:
    """Control helper: Production / non-sim payloads must omit Season Sim gates."""
    fields: dict[str, Any] = {
        "Activity Date": activity_date_iso,
        "Shot Total": shot_total,
    }
    if video_upload_note:
        fields[FIELD_VIDEO_UPLOAD_NOTE] = video_upload_note
    return fields


def registry_has_dedupe(registry: RunRegistry, dedupe_key: str) -> bool:
    if not dedupe_key:
        return False
    return any(r.dedupe_key == dedupe_key for r in registry.records)


def find_registry_record_id(registry: RunRegistry, dedupe_key: str) -> str | None:
    for row in registry.records:
        if row.dedupe_key == dedupe_key:
            return row.record_id
    return None


def plan_idempotent_creates(
    intended_writes: list[dict[str, Any]],
    registry: RunRegistry,
) -> dict[str, Any]:
    """Split intended creates into skip-existing vs still-needed (retry-safe).

    Does not touch Airtable — used by execute retry and offline tests.
    """
    to_create: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []
    for item in intended_writes:
        if item.get("op") != "create":
            continue
        key = str(item.get("dedupe_key") or "")
        existing = find_registry_record_id(registry, key) if key else None
        if existing:
            skipped.append({**item, "existing_record_id": existing, "action": "skip_existing"})
        else:
            to_create.append(item)
    return {
        "to_create": to_create,
        "skipped_existing": skipped,
        "create_count": len(to_create),
        "skip_count": len(skipped),
    }


# ---------------------------------------------------------------------------
# Full execute orchestration (idempotent create-or-reuse)
# ---------------------------------------------------------------------------

SCHOOL_YEAR_2026_2027 = "2026-2027"
FORMULA_RESTORE_NOTE = (
    "After the authorized season-sim run, restore Submissions.`Activity Date Is Future?` "
    "to the Production NOW()-only formula. Temporary Season Sim gate fields may remain "
    "unchecked for normal athletes."
)


@dataclass
class ExecuteContext:
    """Resolved live configuration required for enrollment + week linkage."""

    program_instance_id: str
    school_year: str = SCHOOL_YEAR_2026_2027
    week_ids: list[str] = field(default_factory=list)
    create_zoom_meetings: bool = True


@dataclass
class OrchestrationResult:
    ok: bool
    paused: bool
    athlete_id: str = ""
    enrollment_id: str = ""
    created: list[dict[str, Any]] = field(default_factory=list)
    reused: list[dict[str, Any]] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    counts: dict[str, int] = field(default_factory=dict)
    email_phase: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class SeasonSimOrchestrator:
    """Create the disposable season graph with registry-scoped idempotency."""

    def __init__(
        self,
        *,
        client: Any,
        scenario: Athlete1Scenario,
        clock: SimulationClock,
        registry: RunRegistry,
        context: ExecuteContext,
        enable_email_delivery: bool = False,
    ) -> None:
        self.client = client
        self.scenario = scenario
        self.clock = clock
        self.registry = registry
        self.context = context
        self.enable_email_delivery = enable_email_delivery
        self.marker = run_marker(scenario.run_id)
        self.created: list[dict[str, Any]] = []
        self.reused: list[dict[str, Any]] = []
        self.errors: list[str] = []
        self.warnings: list[str] = []
        self.paused = False
        self._zoom_meeting_ids: dict[str, str] = {}  # mode -> record id

    def run(self) -> OrchestrationResult:
        self.warnings.append(FORMULA_RESTORE_NOTE)
        try:
            athlete_id = self._ensure_athlete()
            enrollment_id = self._ensure_enrollment(athlete_id)
            self.registry.athlete_id = athlete_id
            self.registry.enrollment_id = enrollment_id
            self._ensure_zoom_meetings()
            self._ensure_weekly_summaries(enrollment_id)
            self._run_day_loop(athlete_id, enrollment_id)
        except Exception as exc:  # noqa: BLE001
            self.paused = True
            self.errors.append(f"Paused on failure: {exc}")

        counts = self._count_registry()
        email_phase = {
            "enabled": self.enable_email_delivery,
            "recipient_allowlist": SAFE_EMAIL_RECIPIENT,
            "records_armed_for_send": False,
            "note": (
                "Email delivery is a separate optional phase. Default execute does not "
                "arm Build Daily Email Now? / Send Daily Email fields."
                if not self.enable_email_delivery
                else "Email delivery enabled — allowlist enforced; send fields still left off "
                "unless a future email phase arms them."
            ),
        }
        return OrchestrationResult(
            ok=not self.errors,
            paused=self.paused,
            athlete_id=self.registry.athlete_id,
            enrollment_id=self.registry.enrollment_id,
            created=self.created,
            reused=self.reused,
            errors=self.errors,
            warnings=self.warnings,
            counts=counts,
            email_phase=email_phase,
        )

    def _count_registry(self) -> dict[str, int]:
        out: dict[str, int] = {}
        for row in self.registry.records:
            out[row.table] = out.get(row.table, 0) + 1
        return out

    def _create_or_reuse(
        self,
        *,
        table: str,
        dedupe_key: str,
        fields: dict[str, Any],
        notes: str = "",
    ) -> str:
        existing = find_registry_record_id(self.registry, dedupe_key)
        if existing:
            self.reused.append({"table": table, "id": existing, "dedupe_key": dedupe_key})
            return existing
        created = self.client.create_records(table, [fields])
        rid = created[0]["id"]
        self.registry.add(
            table,
            rid,
            dedupe_key=dedupe_key,
            notes=notes,
            fields_snapshot={k: fields[k] for k in list(fields)[:12]},
        )
        self.created.append({"table": table, "id": rid, "dedupe_key": dedupe_key})
        return rid

    def _ensure_athlete(self) -> str:
        a = self.scenario.athlete
        return self._create_or_reuse(
            table="Athletes",
            dedupe_key=f"{self.marker}|ATHLETE",
            fields={
                "First Name": a["first_name"],
                "Last Name": a["last_name"],
                "Parent Email": SAFE_EMAIL_RECIPIENT,
                "Active?": True,
            },
        )

    def _ensure_enrollment(self, athlete_id: str) -> str:
        a = self.scenario.athlete
        fields: dict[str, Any] = {
            "Athlete": [athlete_id],
            "Athlete First Name": a["first_name"],
            "Athlete Last Name": a["last_name"],
            "Grade": str(a["grade"]),
            "Parent Email": SAFE_EMAIL_RECIPIENT,
            "Active?": True,
            "Grade Band": [self.scenario.grade_band_id],
            "School Year": self.context.school_year,
            "Program Instance": [self.context.program_instance_id],
        }
        return self._create_or_reuse(
            table="Enrollments",
            dedupe_key=f"{self.marker}|ENROLLMENT",
            fields=fields,
            notes=f"PI={self.context.program_instance_id}|SY={self.context.school_year}",
        )

    def _ensure_zoom_meetings(self) -> None:
        """Create disposable Live + Recording Zoom Meetings for this run.

        Existing scenario zoom_selected IDs are treated as templates for week
        linkage only when create_zoom_meetings is True we still create new
        meetings tagged with the run marker so cleanup stays run-scoped.
        """
        weeks = list(self.context.week_ids)
        week_live = weeks[min(1, len(weeks) - 1)] if weeks else ""
        week_rec = weeks[min(4, len(weeks) - 1)] if weeks else ""
        specs = [
            ("live", "LIVE", week_live, 12),
            ("recording", "RECORDING", week_rec, 40),
        ]
        for mode, label, week_id, day_n in specs:
            dedupe = f"{self.marker}|ZOOM-MEETING|{label}"
            fields: dict[str, Any] = {
                "Meeting Name": f"{self.marker}|{label}",
                "Meeting Status": "Completed",
                "Start Time": self.clock.activity_datetime_iso(
                    simulation_date_for_day_number(day_n, start=self.clock.start),
                    hour=18,
                ),
                "Create XP Events": True,
            }
            if week_id:
                fields["Week"] = [week_id]
            if mode == "recording":
                fields["Attendance Method"] = "Recording Quiz"
            rid = self._create_or_reuse(
                table="Zoom Meetings",
                dedupe_key=dedupe,
                fields=fields,
            )
            self._zoom_meeting_ids[mode] = rid

    def _ensure_weekly_summaries(self, enrollment_id: str) -> None:
        for week_id in self.context.week_ids:
            if not week_id:
                continue
            fields: dict[str, Any] = {
                "Enrollment": [enrollment_id],
                "Week": [week_id],
                "Grade Band": [self.scenario.grade_band_id],
                "Goal Record": [self.scenario.goal_record_id],
                "Summary Calculation Status": "Complete",
            }
            self._create_or_reuse(
                table="Weekly Athlete Summary",
                dedupe_key=f"{self.marker}|WAS|{week_id}",
                fields=fields,
            )

    def _run_day_loop(self, athlete_id: str, enrollment_id: str) -> None:
        # Process in write-clock order so backdated day 20 lands on day 22.
        ordered = sorted(
            [d for d in self.scenario.days if d.action == "submit"],
            key=lambda d: (d.write_on_day_number, d.day_number),
        )
        for day in ordered:
            self.clock.advance_to(
                simulation_date_for_day_number(day.write_on_day_number, start=self.clock.start)
            )
            sub_id = self._create_submission(day, athlete_id, enrollment_id)
            if day.video_feedback:
                asset_id = self._create_video_asset(day, sub_id, enrollment_id)
                self._create_video_feedback(day, sub_id, enrollment_id, asset_id)
            for hw in day.homework:
                asset_ids = self._create_homework_assets(day, sub_id, enrollment_id, hw)
                self._create_homework_completion(day, sub_id, enrollment_id, hw, asset_ids)
            for zid, mode in zip(day.zoom_meeting_ids or [], day.zoom_modes or []):
                meeting_id = self._zoom_meeting_ids.get(mode) or zid
                self._create_zoom_attendance(day, enrollment_id, meeting_id, mode)

    def _create_submission(self, day: DayPlan, athlete_id: str, enrollment_id: str) -> str:
        fields = build_simulation_submission_fields_for_day(
            run_id=self.scenario.run_id,
            clock=self.clock,
            day=day,
        )
        fields["Enrollment"] = [enrollment_id]
        fields["Athlete"] = [athlete_id]
        fields["Duplicate Review Status"] = "Count It"
        if self.enable_email_delivery:
            # Optional email phase only — still allowlisted recipient.
            fields["Daily Email To"] = SAFE_EMAIL_RECIPIENT
        return self._create_or_reuse(
            table="Submissions",
            dedupe_key=day.dedupe_key,
            fields=fields,
        )

    def _create_video_asset(self, day: DayPlan, submission_id: str, enrollment_id: str) -> str:
        dedupe = f"{self.marker}|ASSET|VIDEO|D{day.day_number:02d}"
        return self._create_or_reuse(
            table="Submission Assets",
            dedupe_key=dedupe,
            fields={
                "Submission - Linked": [submission_id],
                "Enrollment - Linked": [enrollment_id],
                "Asset Purpose": "Video For Feedback",
                "Asset Slot": "VIDEO",
                "Original File Name": f"{self.marker}-D{day.day_number:02d}-video.mp4",
                "Upload Status": "Uploaded",
            },
        )

    def _create_video_feedback(
        self,
        day: DayPlan,
        submission_id: str,
        enrollment_id: str,
        asset_id: str,
    ) -> str:
        dedupe = f"{self.marker}|VF|D{day.day_number:02d}"
        return self._create_or_reuse(
            table="Video Feedback",
            dedupe_key=dedupe,
            fields={
                "Submission": [submission_id],
                "Enrollment": [enrollment_id],
                "Submission Asset": [asset_id],
                "Grade Band": [self.scenario.grade_band_id],
                "Active?": True,
                "Coach Feedback": f"{self.marker} video feedback day {day.day_number}",
                "Video Asset File Name": f"{self.marker}-D{day.day_number:02d}-video.mp4",
                "Award Status": "Pending",
            },
        )

    def _create_homework_assets(
        self,
        day: DayPlan,
        submission_id: str,
        enrollment_id: str,
        hw: dict[str, Any],
    ) -> list[str]:
        ids: list[str] = []
        slot = str(hw.get("slot") or "HW1").upper()
        purpose = "Homework 1" if "1" in slot else "Homework 2"
        asset_slot = "HW1" if "1" in slot else "HW2"
        count = int(hw.get("asset_count") or 1)
        for i in range(count):
            dedupe = f"{hw['dedupe_key']}|ASSET|{i+1}"
            rid = self._create_or_reuse(
                table="Submission Assets",
                dedupe_key=dedupe,
                fields={
                    "Submission - Linked": [submission_id],
                    "Enrollment - Linked": [enrollment_id],
                    "Asset Purpose": purpose,
                    "Asset Slot": asset_slot,
                    "Original File Name": f"{self.marker}-D{day.day_number:02d}-{asset_slot}-{i+1}.jpg",
                    "Upload Status": "Uploaded",
                },
            )
            ids.append(rid)
        return ids

    def _create_homework_completion(
        self,
        day: DayPlan,
        submission_id: str,
        enrollment_id: str,
        hw: dict[str, Any],
        asset_ids: list[str],
    ) -> str:
        fields: dict[str, Any] = {
            "Enrollment": [enrollment_id],
            "Program Homework Assignment": [hw["pha_record_id"]],
            "Completion Status": hw.get("outcome") or "Satisfactory",
            "Notes": self.marker,
            "Submissions - Linked": [submission_id],
            "Grade Band": [self.scenario.grade_band_id],
            "Satisfactory?": hw.get("outcome") == "Satisfactory",
        }
        if hw.get("week_id"):
            fields["Week"] = [hw["week_id"]]
        if hw.get("library_id"):
            fields["Homework"] = [hw["library_id"]]
        if asset_ids:
            fields["Submission Assets"] = asset_ids
        return self._create_or_reuse(
            table="Homework Completions",
            dedupe_key=hw["dedupe_key"],
            fields=fields,
        )

    def _create_zoom_attendance(
        self,
        day: DayPlan,
        enrollment_id: str,
        meeting_id: str,
        mode: str,
    ) -> str:
        dedupe = f"{self.marker}|ZOOM|{mode.upper()}|D{day.day_number:02d}|{meeting_id}"
        if mode == "live":
            fields = {
                "Enrollment": [enrollment_id],
                "Zoom Meeting": [meeting_id],
                "Attendance Method": "Live",
                "Live Attendance Confirmed?": True,
            }
            rid = self._create_or_reuse(
                table="Zoom Attendance",
                dedupe_key=dedupe,
                fields=fields,
            )
            self._patch_live_attendees(meeting_id, enrollment_id)
            return rid
        # Recording Quiz — never write Zoom Meetings.Attendees
        fields = {
            "Enrollment": [enrollment_id],
            "Zoom Meeting": [meeting_id],
            "Attendance Method": "Recording Quiz",
            "Recording Quiz Satisfactory?": True,
            "Recording Quiz Review Status": "Satisfactory",
            "Recording Quiz Response": f"{self.marker} recording quiz response",
            "Recording Quiz Attempt Number": 1,
        }
        return self._create_or_reuse(
            table="Zoom Attendance",
            dedupe_key=dedupe,
            fields=fields,
        )

    def _patch_live_attendees(self, meeting_id: str, enrollment_id: str) -> None:
        """Add enrollment to Zoom Meetings.Attendees (live path only)."""
        dedupe = f"{self.marker}|ZOOM-ATTENDEES|{meeting_id}"
        if dedupe in (self.registry.meta.get("attendees_patches") or []):
            return
        if find_registry_record_id(self.registry, dedupe):
            return
        try:
            meeting = self.client.get_record("Zoom Meetings", meeting_id)
        except Exception:
            # Memory client / missing get — write attendees directly.
            meeting = {"id": meeting_id, "fields": {}}
        existing = list((meeting.get("fields") or {}).get("Attendees") or [])
        ids = []
        for item in existing:
            if isinstance(item, str):
                ids.append(item)
            elif isinstance(item, dict) and item.get("id"):
                ids.append(item["id"])
        if enrollment_id not in ids:
            ids.append(enrollment_id)
        self.client.update_records(
            "Zoom Meetings",
            [{"id": meeting_id, "fields": {"Attendees": ids}}],
        )
        # Do not re-register the meeting id (already in registry from create).
        self.created.append(
            {"table": "Zoom Meetings", "id": meeting_id, "dedupe_key": dedupe, "op": "attendees_patch"}
        )
        # Marker-only registry note for resume so we skip re-patching.
        if not find_registry_record_id(self.registry, dedupe):
            self.registry.meta.setdefault("attendees_patches", []).append(dedupe)


def resolve_execute_context(
    *,
    program_instance_id: str | None = None,
    school_year: str = SCHOOL_YEAR_2026_2027,
    week_ids: list[str] | None = None,
    scenario: Athlete1Scenario | None = None,
) -> ExecuteContext:
    pi = program_instance_id or ""
    if not pi and scenario:
        for h in scenario.homework_selected:
            if h.get("program_instance_id"):
                pi = str(h["program_instance_id"])
                break
    weeks = list(week_ids or [])
    if not weeks and scenario:
        weeks = [
            str(w.get("record_id") or w.get("id") or "")
            for w in (scenario.meta.get("weeks") or [])
            if (w.get("record_id") or w.get("id"))
        ]
    return ExecuteContext(
        program_instance_id=pi,
        school_year=school_year,
        week_ids=[w for w in weeks if w],
        create_zoom_meetings=True,
    )

