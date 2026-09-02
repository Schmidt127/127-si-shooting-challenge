"""Gated season-simulation execute — full disposable writer + dry-run planning.

Writes require:
  --execute --simulation-id … --confirm SEASON-SIMULATION-2027
  --confirm-disposable CONFIRM-DISPOSABLE-SEASON-SIM

Email delivery stays off unless --enable-email-delivery (allowlist only).
Clock-override readiness is required when wall date is before 2027-05-01.
"""

from __future__ import annotations

import json
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

from .clock_override import assess_clock_override_readiness, sim_submission_override_fields
from .confirmation import ConfirmationError, require_execute_gates
from .constants import SAFE_EMAIL_RECIPIENT, SIM_START
from .recipient_safety import assert_safe_recipient
from .run_registry import run_marker
from .scenarios import Athlete1Scenario
from .season_policy import week_label_for_activity_date
from .simulation_clock import SimulationClock
from .writer import (
    ExecuteContext,
    SeasonSimWriter,
    assert_weeks_do_not_overlap,
    build_execute_context_from_reference,
    build_week_date_index,
    load_or_new_registry,
)


class ExecuteAborted(RuntimeError):
    pass


def build_intended_writes(
    scenario: Athlete1Scenario,
    clock: SimulationClock,
    *,
    ctx: ExecuteContext | None = None,
) -> list[dict[str, Any]]:
    """Materialize intended Airtable write payloads (no network)."""
    marker = run_marker(scenario.run_id)
    writes: list[dict[str, Any]] = []

    writes.append(
        {
            "table": "Athletes",
            "op": "create",
            "dedupe_key": f"{marker}|ATHLETE",
            "fields": {
                "First Name": scenario.athlete["first_name"],
                "Last Name": scenario.athlete["last_name"],
                "Parent Email": SAFE_EMAIL_RECIPIENT,
                "Active?": True,
            },
        }
    )
    enrollment_fields: dict[str, Any] = {
        "Athlete First Name": scenario.athlete["first_name"],
        "Athlete Last Name": scenario.athlete["last_name"],
        "Grade": scenario.athlete["grade"],
        "Parent Email": SAFE_EMAIL_RECIPIENT,
        "Athlete Email": SAFE_EMAIL_RECIPIENT,
        "Active?": True,
        "Grade Band": [scenario.grade_band_id],
    }
    if ctx:
        enrollment_fields["Program Instance"] = [ctx.program_instance_id]
        enrollment_fields["School Year"] = ctx.school_year
    writes.append(
        {
            "table": "Enrollments",
            "op": "create",
            "dedupe_key": f"{marker}|ENROLLMENT",
            "fields": enrollment_fields,
            "notes": "Athlete link filled at execute; Program Instance required",
        }
    )

    # Planned WAS rows (one per covering week)
    planned_weeks: set[str] = set()
    for day in scenario.days:
        if day.action != "submit":
            continue
        if ctx:
            wid = ctx.week_for(day.activity_date)
            if wid:
                planned_weeks.add(wid)
    for wid in sorted(planned_weeks):
        writes.append(
            {
                "table": "Weekly Athlete Summary",
                "op": "create",
                "dedupe_key": f"{marker}|WAS|{wid}",
                "fields": {
                    "Week": [wid],
                    "Goal Record": [scenario.goal_record_id],
                },
            }
        )

    for day in scenario.days:
        if day.action != "submit":
            writes.append(
                {
                    "table": "(none)",
                    "op": "skip",
                    "day_number": day.day_number,
                    "reason": "missed day",
                    "dedupe_key": day.dedupe_key,
                }
            )
            continue

        write_clock_date = date.fromordinal(
            SIM_START.toordinal() + day.write_on_day_number - 1
        )
        week_label = week_label_for_activity_date(day.activity_date)
        perfect_week_exception = "PW_MANUAL_EXCEPTION" in (day.notes or "")
        # Same-day: submitted-at surrogate matches Activity Date.
        # Backdated: surrogate is the write-day clock so same-day formulas return 0.
        submitted_surrogate = (
            day.activity_date
            if getattr(day, "timing", "") != "backdated"
            else write_clock_date
        )
        override = sim_submission_override_fields(
            run_marker=marker,
            simulated_now=write_clock_date,
            activity_date=day.activity_date,
            test_submitted_at=submitted_surrogate,
            perfect_week_manual_exception=perfect_week_exception,
            available_fields=(ctx.submission_field_names if ctx else None),
        )
        fields: dict[str, Any] = {
            "Activity Date": clock.activity_datetime_iso(day.activity_date),
            "Shot Total": day.shot_total,
            "Duplicate Review Status": "Count It",
            "Daily Email Subject": f"{marker}|D{day.day_number:02d}",
            **override,
        }
        if ctx:
            wid = ctx.week_for(day.activity_date)
            if wid:
                fields["Week"] = [wid]
        writes.append(
            {
                "table": "Submissions",
                "op": "create",
                "day_number": day.day_number,
                "write_on_day_number": day.write_on_day_number,
                "timing": day.timing,
                "week_label_planned": week_label,
                "dedupe_key": day.dedupe_key,
                "fields": fields,
            }
        )
        for hw in day.homework:
            writes.append(
                {
                    "table": "Homework Completions",
                    "op": "create",
                    "day_number": day.day_number,
                    "dedupe_key": hw["dedupe_key"],
                    "fields": {
                        "Program Homework Assignment": [hw["pha_record_id"]],
                        "Completion Status": hw["outcome"],
                        "Satisfactory?": hw.get("outcome") == "Satisfactory",
                        "Review Complete": True,
                        "Notes": marker,
                        "asset_count_intended": hw["asset_count"],
                    },
                }
            )
            for i in range(int(hw.get("asset_count") or 1)):
                writes.append(
                    {
                        "table": "Submission Assets",
                        "op": "create",
                        "dedupe_key": f"{hw['dedupe_key']}|ASSET|{i+1}",
                        "fields": {
                            "Asset Purpose": "Homework 1",
                            "Asset Label": f"{marker}|HW|D{day.day_number:02d}|{i+1}",
                        },
                    }
                )
        for idx, zid in enumerate(day.zoom_meeting_ids):
            if day.day_number == 12 or (
                ctx and zid == ctx.zoom_live_meeting_id and day.day_number != 40
            ):
                mode = "live"
            elif day.day_number == 40 or (ctx and zid == ctx.zoom_recorded_meeting_id):
                mode = "recorded"
            else:
                mode = "live" if idx == 0 else "recorded"
            writes.append(
                {
                    "table": "Zoom Attendance",
                    "op": "create",
                    "day_number": day.day_number,
                    "zoom_mode": mode,
                    "dedupe_key": f"{marker}|ZOOM|{mode}|{zid}|D{day.day_number:02d}",
                    "fields": {
                        "Zoom Meeting": [zid],
                        "Attendance Method": "Live" if mode == "live" else "Recording Quiz",
                        **(
                            {"Recording Quiz Satisfactory?": True}
                            if mode == "recorded"
                            else {}
                        ),
                    },
                }
            )
            if mode == "live":
                writes.append(
                    {
                        "table": "Zoom Meetings",
                        "op": "attendees_patch",
                        "day_number": day.day_number,
                        "dedupe_key": f"{marker}|ZOOM_ATTENDEES|{zid}",
                        "notes": "Add Enrollment to Attendees (live only); never delete meeting",
                    }
                )
        if day.video_feedback:
            writes.append(
                {
                    "table": "Submission Assets",
                    "op": "create",
                    "day_number": day.day_number,
                    "dedupe_key": f"{marker}|SA|VIDEO|D{day.day_number:02d}",
                    "fields": {"Asset Purpose": "Video"},
                }
            )
            writes.append(
                {
                    "table": "Video Feedback",
                    "op": "create",
                    "day_number": day.day_number,
                    "dedupe_key": f"{marker}|VF|D{day.day_number:02d}",
                    "fields": {
                        "Active?": True,
                        "Award Status": "Pending",
                        "Video Feedback Key": f"{marker}|VF|D{day.day_number:02d}",
                    },
                }
            )

    for ev in scenario.intended_emails:
        writes.append(
            {
                "table": "Email Handoff Queue",
                "op": "expect_pipeline",
                "event": ev,
                "recipient_enforced": SAFE_EMAIL_RECIPIENT,
                "send_default": False,
            }
        )
    return writes


def assert_execute_clock_ready(
    *,
    wall_date: date | None = None,
    submission_field_names: set[str] | None = None,
    formula_text: str | None = None,
    acknowledge_clock_override: bool = False,
) -> dict[str, Any]:
    readiness = assess_clock_override_readiness(
        wall_date=wall_date or datetime.now(timezone.utc).date(),
        submission_field_names=submission_field_names,
        formula_text_activity_date_is_future=formula_text,
        formula_override_acknowledged=acknowledge_clock_override,
    )
    if not readiness.ready_for_early_execute:
        raise ExecuteAborted(
            "Clock override not ready for early execute:\n  - "
            + "\n  - ".join(readiness.blockers)
        )
    return readiness.to_dict()


def run_execute(
    *,
    scenario: Athlete1Scenario,
    clock: SimulationClock,
    execute: bool,
    confirm: str | None,
    confirm_disposable: str | None,
    simulation_id: str | None,
    registry_dir: Path,
    out_dir: Path,
    client: Any | None = None,
    enable_email_delivery: bool = False,
    acknowledge_clock_override: bool = False,
    submission_field_names: set[str] | None = None,
    formula_text: str | None = None,
    execute_context: ExecuteContext | None = None,
    weeks: list[Any] | None = None,
    school_year: str = "2026-2027",
    goal_program_instance_ids: list[str] | None = None,
) -> dict[str, Any]:
    """Execute is blocked unless all confirmation gates match."""
    ctx = execute_context
    if ctx is None and weeks is not None:
        ctx = build_execute_context_from_reference(
            scenario=scenario,
            weeks=weeks,
            school_year=school_year,
            goal_program_instance_ids=goal_program_instance_ids,
            submission_field_names=submission_field_names,
        )

    intended = build_intended_writes(scenario, clock, ctx=ctx)
    payload: dict[str, Any] = {
        "mode": "execute" if execute else "dry-run-execute-path",
        "run_id": scenario.run_id,
        "simulation_id": simulation_id or scenario.run_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "enable_email_delivery": enable_email_delivery,
        "intended_write_count": len(intended),
        "intended_writes": intended,
        "created_records": [],
        "reused_records": [],
        "errors": [],
        "clock_override": None,
        "writer_status": None,
    }

    if not execute:
        out_dir.mkdir(parents=True, exist_ok=True)
        path = out_dir / f"execute-preview-{scenario.run_id}.json"
        path.write_text(json.dumps(payload, indent=2, default=str) + "\n", encoding="utf-8")
        payload["report_path"] = str(path)
        return payload

    try:
        require_execute_gates(
            execute=True,
            confirm=confirm,
            confirm_disposable=confirm_disposable,
            simulation_id=simulation_id or scenario.run_id,
        )
    except ConfirmationError as exc:
        payload["errors"].append(str(exc))
        return payload

    try:
        payload["clock_override"] = assert_execute_clock_ready(
            acknowledge_clock_override=acknowledge_clock_override,
            submission_field_names=submission_field_names,
            formula_text=formula_text,
        )
    except ExecuteAborted as exc:
        payload["errors"].append(str(exc))
        return payload

    assert_safe_recipient(scenario.athlete.get("parent_email"))
    if enable_email_delivery:
        assert_safe_recipient(SAFE_EMAIL_RECIPIENT)

    if ctx is None:
        payload["errors"].append(
            "ExecuteContext missing — provide weeks / Program Instance resolution before write"
        )
        return payload

    if client is None:
        from .airtable_client import AirtableClient

        client = AirtableClient(allow_writes=True)
    else:
        client.allow_writes = True

    if not submission_field_names:
        try:
            for t in client.meta_tables():
                if t.get("name") == "Submissions":
                    submission_field_names = {
                        str(f.get("name") or "") for f in (t.get("fields") or [])
                    }
                    ctx.submission_field_names = submission_field_names
        except Exception:  # noqa: BLE001
            pass

    reg = load_or_new_registry(
        run_id=scenario.run_id,
        registry_dir=registry_dir,
        athlete_name=scenario.athlete["display_name"],
        meta={
            "goal_record_id": scenario.goal_record_id,
            "simulation_id": simulation_id or scenario.run_id,
            "program_instance_id": ctx.program_instance_id,
            "school_year": ctx.school_year,
            "clock_override": payload["clock_override"],
            "enable_email_delivery": enable_email_delivery,
        },
    )

    writer = SeasonSimWriter(
        client=client,
        scenario=scenario,
        clock=clock,
        ctx=ctx,
        registry=reg,
        registry_dir=registry_dir,
        enable_email_delivery=enable_email_delivery,
    )
    result = writer.run()
    payload["writer_status"] = result.status
    payload["created_records"] = result.created
    payload["reused_records"] = result.reused
    payload["skipped"] = result.skipped
    payload["errors"].extend(result.errors)
    payload["registry_path"] = str(registry_dir / f"{scenario.run_id.replace(':', '_')}.json")
    # Prefer actual save path
    from .run_registry import registry_path

    payload["registry_path"] = str(registry_path(registry_dir, scenario.run_id))

    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"execute-{scenario.run_id}.json"
    path.write_text(json.dumps(payload, indent=2, default=str) + "\n", encoding="utf-8")
    payload["report_path"] = str(path)
    return payload


# Re-export helpers used by tests / CLI
__all__ = [
    "ExecuteAborted",
    "build_intended_writes",
    "assert_execute_clock_ready",
    "run_execute",
    "build_execute_context_from_reference",
    "build_week_date_index",
    "assert_weeks_do_not_overlap",
]
