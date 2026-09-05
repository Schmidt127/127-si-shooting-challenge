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

from .clock_override import (
    activity_date_write_value,
    assess_clock_override_readiness,
    sim_submission_counts_under_gate,
    sim_submission_override_fields,
)
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
                    "Grade Band": [scenario.grade_band_id],
                    "Weekly Email Sent?": False,
                    "Send to Make?": False,
                },
            }
        )

    # Disposable Zoom Meetings created by the writer (aligned Start Time + Week).
    day12 = next((d for d in scenario.days if d.day_number == 12), None)
    day40 = next((d for d in scenario.days if d.day_number == 40), None)
    planned_live_id = "__SIM_ZOOM_LIVE__"
    planned_rec_id = "__SIM_ZOOM_REC__"
    if day12 and ctx:
        week_live = ctx.week_for(day12.activity_date)
        writes.append(
            {
                "table": "Zoom Meetings",
                "op": "create",
                "dedupe_key": f"{marker}|ZOOM_MEETING|LIVE",
                "zoom_mode": "live",
                "fields": {
                    "Meeting Name": f"{marker}|LIVE|D12",
                    "Meeting Status": "Completed",
                    "Start Time": f"{day12.activity_date.isoformat()}T12:00:00-06:00",
                    "Week": [week_live] if week_live else [],
                    "Attendees": [],
                    "Create XP Events": False,
                },
                "notes": (
                    "Disposable sim meeting — Create XP Events armed after Attendees patch"
                ),
            }
        )
    if day40 and ctx:
        week_rec = ctx.week_for(day40.activity_date)
        writes.append(
            {
                "table": "Zoom Meetings",
                "op": "create",
                "dedupe_key": f"{marker}|ZOOM_MEETING|REC",
                "zoom_mode": "recorded",
                "fields": {
                    "Meeting Name": f"{marker}|REC|D40",
                    "Meeting Status": "Completed",
                    "Start Time": f"{day40.activity_date.isoformat()}T12:00:00-06:00",
                    "Week": [week_rec] if week_rec else [],
                    "Attendees": [],
                    "Create XP Events": False,
                },
                "notes": "Disposable sim meeting — never patch Attendees; Create XP stays off",
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
                # Date-only — evening Denver datetimes shift +1 UTC day on Airtable date fields.
                "Activity Date": activity_date_write_value(day.activity_date),
                "Shot Total": day.shot_total,
                "Duplicate Review Status": "Count It",
                # Submission Stat Mode is computed from Shot Total — never write it.
                "Daily Email Subject": f"{marker}|D{day.day_number:02d}",
                **override,
            }
        counts = sim_submission_counts_under_gate(
            activity_date=day.activity_date,
            season_sim_clock_now=write_clock_date,
            run_marker=marker,
        )
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
                "expected_countable": counts,
            }
        )
        writes.append(
            {
                "table": "Submissions",
                "op": "update",
                "day_number": day.day_number,
                "dedupe_key": f"{marker}|SUB_POST_CREATE|D{day.day_number:02d}",
                "fields": {"Build Daily Email Now?": True},
                "notes": "076 arm — Build Daily Email Now? (not watched by 053)",
            }
        )
        writes.append(
            {
                "table": "Submissions",
                "op": "update",
                "day_number": day.day_number,
                "dedupe_key": f"{marker}|SUB_STREAK_ARM|D{day.day_number:02d}",
                "fields": {
                    "Enrollment": ["<enrollment_id>"],
                    "Activity Date": activity_date_write_value(day.activity_date),
                },
                "notes": (
                    "053 arm after Count This=1 and Total Shots Counted>0: "
                    "clear Enrollment then restore Enrollment+Activity Date "
                    "(053 watches those; identical rewrite after create does not fire)"
                ),
            }
        )
        for hw in day.homework:
            library_id = str(hw.get("library_id") or "").strip()
            slot = str(hw.get("slot") or "HW1")
            satisfactory = hw.get("outcome") == "Satisfactory"
            hc_fields: dict[str, Any] = {
                "Program Homework Assignment": [hw["pha_record_id"]],
                "Completion Status": hw["outcome"],
                "Satisfactory?": satisfactory,
                "Review Complete": True,
                "Notes": marker,
                "asset_count_intended": hw["asset_count"],
                "Submission Date": activity_date_write_value(day.activity_date),
                "Item Slot": slot,
                "Parent Feedback Sent?": False,
            }
            if library_id:
                hc_fields["Homework"] = [library_id]
            writes.append(
                {
                    "table": "Homework Completions",
                    "op": "create",
                    "day_number": day.day_number,
                    "dedupe_key": hw["dedupe_key"],
                    "fields": hc_fields,
                    "notes": (
                        "071 structural fields; do not force Awarded — Needs Revision stays pending"
                    ),
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
                            "Asset Slot": slot,
                            "Asset Label": f"{marker}|HW|D{day.day_number:02d}|{i+1}",
                            "Reviewer Access Token": "season-sim-reviewer-token",
                        },
                    }
                )
        # Zoom attendance uses writer-created meetings (day 12 live / day 40 recorded).
        zoom_plan: list[tuple[str, str]] = []
        if day.day_number == 12:
            zoom_plan.append((planned_live_id, "live"))
        elif day.day_number == 40:
            zoom_plan.append((planned_rec_id, "recorded"))
        for zid, mode in zoom_plan:
            za_fields: dict[str, Any] = {
                "Zoom Meeting": [zid],
                "Attendance Method": "Live" if mode == "live" else "Recording Quiz",
            }
            if mode == "recorded":
                za_fields["Recording Quiz Satisfactory?"] = True
                za_fields["Recording Quiz Review Status"] = "Satisfactory"
            else:
                za_fields["Live Attendance Confirmed?"] = True
            writes.append(
                {
                    "table": "Zoom Attendance",
                    "op": "create",
                    "day_number": day.day_number,
                    "zoom_mode": mode,
                    "dedupe_key": f"{marker}|ZOOM|{mode}|{zid}|D{day.day_number:02d}",
                    "fields": za_fields,
                    "notes": (
                        "Recording: never Attendees; source key "
                        "ZOOM_RECORDING_CREDIT|{Enrollment}|{Meeting}"
                        if mode == "recorded"
                        else "Live: Attendees patched then Create XP Events armed"
                    ),
                }
            )
            if mode == "live":
                writes.append(
                    {
                        "table": "Zoom Meetings",
                        "op": "attendees_patch",
                        "day_number": day.day_number,
                        "dedupe_key": f"{marker}|ZOOM_ATTENDEES|{zid}",
                        "notes": (
                            "Add Enrollment to Attendees (live only); "
                            "sim meeting is registry-deleted on cleanup"
                        ),
                    }
                )
                writes.append(
                    {
                        "table": "Zoom Meetings",
                        "op": "update",
                        "day_number": day.day_number,
                        "dedupe_key": f"{marker}|ZOOM_CREATE_XP|{zid}",
                        "fields": {"Create XP Events": True},
                        "notes": "Arm 101 live XP after Attendees; recorded stays Create=false",
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
            vf_create_fields: dict[str, Any] = {
                "Active?": True,
                "Award Status": "Pending",
                "Video Feedback Key": f"{marker}|VF|D{day.day_number:02d}",
                "Coach Feedback": f"{marker}|video review",
            }
            if scenario.grade_band_id:
                vf_create_fields["Grade Band"] = [scenario.grade_band_id]
            writes.append(
                {
                    "table": "Video Feedback",
                    "op": "create",
                    "day_number": day.day_number,
                    "dedupe_key": f"{marker}|VF|D{day.day_number:02d}",
                    "fields": vf_create_fields,
                }
            )
            writes.append(
                {
                    "table": "Video Feedback",
                    "op": "update",
                    "day_number": day.day_number,
                    "dedupe_key": f"{marker}|VF_ARM_POSTED|D{day.day_number:02d}",
                    "fields": {
                        "Feedback Posted?": True,
                        "Parent Feedback Ready?": True,
                        "Parent Feedback Sent?": False,
                    },
                    "notes": (
                        "Arms 113/114/073; does not create XP Events; "
                        "does not set Ready for XP Automation?"
                    ),
                }
            )

    # Perfect Week requeue for every WAS week (submissions linked after empty create).
    if ctx:
        was_weeks: set[str] = set()
        for day in scenario.days:
            if day.action != "submit":
                continue
            wid = ctx.week_for(day.activity_date)
            if wid:
                was_weeks.add(wid)
        for wid in sorted(was_weeks):
            writes.append(
                {
                    "table": "Weekly Athlete Summary",
                    "op": "update",
                    "dedupe_key": f"{marker}|WAS_PW_REQUEUE|{wid}",
                    "fields": {
                        "Perfect Week Automation Status": "Pending",
                    },
                    "notes": (
                        "After submissions linked: Skipped→Pending so 057 re-runs "
                        "(empty early Ready calc otherwise sticks)"
                    ),
                }
            )

    for day in scenario.days:
        if day.action != "submit" or day.activity_date.weekday() != 5:
            continue
        if not ctx:
            continue
        wid = ctx.week_for(day.activity_date)
        if not wid:
            continue
        writes.append(
            {
                "table": "Weekly Athlete Summary",
                "op": "update",
                "day_number": day.day_number,
                "dedupe_key": f"{marker}|WAS_EMAIL_ARM|{wid}",
                "fields": {
                    "Build Weekly Email Now?": True,
                    "Weekly Email Sent?": False,
                    "Send to Make?": False,
                },
                "notes": (
                    "072 arm false→true after day loop; Production 072 recordId "
                    "must be trigger WAS ($ref), not a hardcoded test id. "
                    "SC-168: does not arm Send to Make? — use weekly-email-stage "
                    "for 119 substitute; cron 118/119 not driven by sim clock"
                ),
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


def summarize_intended_write_readiness(
    writes: list[dict[str, Any]],
) -> dict[str, Any]:
    """Offline readiness summary for dry-run / no-write validation."""
    submissions = [w for w in writes if w.get("table") == "Submissions" and w.get("op") == "create"]
    sub_post = [
        w
        for w in writes
        if w.get("table") == "Submissions"
        and w.get("op") == "update"
        and "SUB_POST_CREATE" in str(w.get("dedupe_key") or "")
    ]
    sub_streak = [
        w
        for w in writes
        if w.get("table") == "Submissions"
        and w.get("op") == "update"
        and "SUB_STREAK_ARM" in str(w.get("dedupe_key") or "")
    ]
    pw_requeues = [
        w
        for w in writes
        if w.get("table") == "Weekly Athlete Summary"
        and w.get("op") == "update"
        and "WAS_PW_REQUEUE" in str(w.get("dedupe_key") or "")
    ]
    homework = [
        w for w in writes if w.get("table") == "Homework Completions" and w.get("op") == "create"
    ]
    vf_creates = [
        w for w in writes if w.get("table") == "Video Feedback" and w.get("op") == "create"
    ]
    vf_arms = [
        w for w in writes if w.get("table") == "Video Feedback" and w.get("op") == "update"
    ]
    live_za = [
        w
        for w in writes
        if w.get("table") == "Zoom Attendance"
        and w.get("zoom_mode") == "live"
        and w.get("op") == "create"
    ]
    rec_za = [
        w
        for w in writes
        if w.get("table") == "Zoom Attendance"
        and w.get("zoom_mode") == "recorded"
        and w.get("op") == "create"
    ]
    create_xp_arms = [
        w
        for w in writes
        if w.get("table") == "Zoom Meetings"
        and w.get("op") == "update"
        and (w.get("fields") or {}).get("Create XP Events") is True
    ]
    weekly_arms = [
        w
        for w in writes
        if w.get("table") == "Weekly Athlete Summary"
        and w.get("op") == "update"
        and (w.get("fields") or {}).get("Build Weekly Email Now?") is True
    ]
    countable = [w for w in submissions if w.get("expected_countable") is True]
    uncountable = [w for w in submissions if w.get("expected_countable") is not True]
    hw_with_both = [
        w
        for w in homework
        if (w.get("fields") or {}).get("Program Homework Assignment")
        and (w.get("fields") or {}).get("Homework")
    ]
    hw_with_071 = [
        w
        for w in homework
        if (w.get("fields") or {}).get("Item Slot")
        and (w.get("fields") or {}).get("Parent Feedback Sent?") is False
    ]
    hw_needs_revision = [
        w
        for w in homework
        if (w.get("fields") or {}).get("Completion Status") == "Needs Revision"
    ]
    vf_parent_ready = [
        w
        for w in vf_arms
        if (w.get("fields") or {}).get("Parent Feedback Ready?") is True
        and (w.get("fields") or {}).get("Feedback Posted?") is True
    ]
    return {
        "submission_creates": len(submissions),
        "submission_post_create_arms": len(sub_post),
        "submission_streak_arms": len(sub_streak),
        "submission_countable": len(countable),
        "submission_uncountable": len(uncountable),
        "uncountable_day_numbers": [w.get("day_number") for w in uncountable],
        "homework_completions": len(homework),
        "homework_with_pha_and_library": len(hw_with_both),
        "homework_071_structural": len(hw_with_071),
        "homework_needs_revision": len(hw_needs_revision),
        "video_feedback_creates": len(vf_creates),
        "video_feedback_update_arms": len(vf_arms),
        "video_parent_feedback_ready_arms": len(vf_parent_ready),
        "live_zoom_attendance": len(live_za),
        "recorded_zoom_attendance": len(rec_za),
        "live_create_xp_event_arms": len(create_xp_arms),
        "weekly_email_arms": len(weekly_arms),
        "weekly_hub_handoffs_expected_from_execute_alone": False,
        "weekly_hub_handoffs_require_stage": "weekly-email-stage",
        "perfect_week_requeues": len(pw_requeues),
        "all_submissions_countable": len(submissions) > 0
        and len(uncountable) == 0,
        "all_homework_dual_linked": len(homework) > 0
        and len(hw_with_both) == len(homework),
        "streak_post_create_planned": len(sub_post) == len(submissions)
        and len(submissions) > 0,
        "streak_arm_planned": len(sub_streak) == len(submissions) and len(submissions) > 0,
        "daily_email_arm_planned": len(sub_post) == len(submissions) and len(submissions) > 0,
        "perfect_week_requeue_planned": len(pw_requeues) > 0,
        "video_update_triggers_planned": len(vf_arms) == len(vf_creates)
        and len(vf_creates) > 0,
        "live_xp_path_planned": len(live_za) == 1 and len(create_xp_arms) == 1,
        "recorded_xp_path_planned": len(rec_za) == 1,
    }


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
    readiness = summarize_intended_write_readiness(intended)
    payload: dict[str, Any] = {
        "mode": "execute" if execute else "dry-run-execute-path",
        "run_id": scenario.run_id,
        "simulation_id": simulation_id or scenario.run_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "enable_email_delivery": enable_email_delivery,
        "intended_write_count": len(intended),
        "intended_writes": intended,
        "write_readiness": readiness,
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
    "summarize_intended_write_readiness",
    "assert_execute_clock_ready",
    "run_execute",
    "build_execute_context_from_reference",
    "build_week_date_index",
    "assert_weeks_do_not_overlap",
]
