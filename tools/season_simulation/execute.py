"""Execute mode — full disposable season orchestration (SC-SEASON-SIM-002).

Creates Athlete 1 transactional records when explicitly confirmed. Live
automations are expected to process XP, streaks, achievements, and levels
after Submissions / WAS / Zoom Attendance exist.

Email delivery remains OFF by default and is never required to execute.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .airtable_client import AirtableClient, WriteBlockedError
from .confirmation import ConfirmationError, require_confirmation
from .constants import SAFE_EMAIL_RECIPIENT
from .recipient_safety import assert_safe_recipient
from .run_registry import RunRegistry, load_registry, run_marker, save_registry
from .scenarios import Athlete1Scenario
from .simulation_clock import SimulationClock
from .writer import (
    ExecuteContext,
    SeasonSimOrchestrator,
    SCHOOL_YEAR_2026_2027,
    build_simulation_submission_fields_for_day,
    resolve_execute_context,
)


class ExecuteAborted(RuntimeError):
    pass


def build_intended_writes(scenario: Athlete1Scenario, clock: SimulationClock) -> list[dict[str, Any]]:
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
    writes.append(
        {
            "table": "Enrollments",
            "op": "create",
            "dedupe_key": f"{marker}|ENROLLMENT",
            "fields": {
                "Athlete First Name": scenario.athlete["first_name"],
                "Athlete Last Name": scenario.athlete["last_name"],
                "Grade": scenario.athlete["grade"],
                "Parent Email": SAFE_EMAIL_RECIPIENT,
                "Active?": True,
                "Grade Band": [scenario.grade_band_id],
                "School Year": SCHOOL_YEAR_2026_2027,
            },
            "notes": "Program Instance + School Year resolved at execute from context",
        }
    )

    for mode, label, day_n in (("live", "LIVE", 12), ("recording", "RECORDING", 40)):
        writes.append(
            {
                "table": "Zoom Meetings",
                "op": "create",
                "dedupe_key": f"{marker}|ZOOM-MEETING|{label}",
                "zoom_mode": mode,
                "fields": {
                    "Meeting Name": f"{marker}|{label}",
                    "Meeting Status": "Completed",
                    "Create XP Events": True,
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
        writes.append(
            {
                "table": "Submissions",
                "op": "create",
                "day_number": day.day_number,
                "write_on_day_number": day.write_on_day_number,
                "timing": day.timing,
                "dedupe_key": day.dedupe_key,
                "fields": {
                    **build_simulation_submission_fields_for_day(
                        run_id=scenario.run_id,
                        clock=clock,
                        day=day,
                    ),
                    "Duplicate Review Status": "Count It",
                },
            }
        )
        if day.video_feedback:
            writes.append(
                {
                    "table": "Submission Assets",
                    "op": "create",
                    "day_number": day.day_number,
                    "dedupe_key": f"{marker}|ASSET|VIDEO|D{day.day_number:02d}",
                    "fields": {"Asset Purpose": "Video For Feedback", "Asset Slot": "VIDEO"},
                }
            )
            writes.append(
                {
                    "table": "Video Feedback",
                    "op": "create",
                    "day_number": day.day_number,
                    "dedupe_key": f"{marker}|VF|D{day.day_number:02d}",
                }
            )
        for hw in day.homework:
            for i in range(int(hw.get("asset_count") or 1)):
                writes.append(
                    {
                        "table": "Submission Assets",
                        "op": "create",
                        "day_number": day.day_number,
                        "dedupe_key": f"{hw['dedupe_key']}|ASSET|{i+1}",
                    }
                )
            writes.append(
                {
                    "table": "Homework Completions",
                    "op": "create",
                    "day_number": day.day_number,
                    "dedupe_key": hw["dedupe_key"],
                    "fields": {
                        "Program Homework Assignment": [hw["pha_record_id"]],
                        "Completion Status": hw["outcome"],
                        "Notes": marker,
                        "asset_count_intended": hw["asset_count"],
                    },
                }
            )
        for zid, mode in zip(day.zoom_meeting_ids or [], day.zoom_modes or []):
            writes.append(
                {
                    "table": "Zoom Attendance",
                    "op": "create",
                    "day_number": day.day_number,
                    "zoom_mode": mode,
                    "dedupe_key": f"{marker}|ZOOM|{mode.upper()}|D{day.day_number:02d}|{zid}",
                    "fields": {
                        "Zoom Meeting": [zid],
                        "Attendance Method": "Live" if mode == "live" else "Recording Quiz",
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
            }
        )
    return writes


def run_execute(
    *,
    scenario: Athlete1Scenario,
    clock: SimulationClock,
    execute: bool,
    confirm: str | None,
    registry_dir: Path,
    out_dir: Path,
    client: AirtableClient | None = None,
    enable_email_delivery: bool = False,
    context: ExecuteContext | None = None,
) -> dict[str, Any]:
    """Run full orchestration when confirmed. Email delivery is optional and off by default."""
    intended = build_intended_writes(scenario, clock)
    payload: dict[str, Any] = {
        "mode": "execute" if execute else "dry-run-execute-path",
        "run_id": scenario.run_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "enable_email_delivery": enable_email_delivery,
        "intended_write_count": len(intended),
        "intended_writes": intended,
        "created_records": [],
        "reused_records": [],
        "errors": [],
        "warnings": [],
        "orchestration": {},
        "email_phase": {
            "enabled": enable_email_delivery,
            "required_for_execute": False,
            "recipient_allowlist": SAFE_EMAIL_RECIPIENT,
        },
    }

    if not execute:
        out_dir.mkdir(parents=True, exist_ok=True)
        path = out_dir / f"execute-preview-{scenario.run_id}.json"
        path.write_text(json.dumps(payload, indent=2, default=str) + "\n", encoding="utf-8")
        payload["report_path"] = str(path)
        return payload

    try:
        require_confirmation(execute=True, confirm=confirm, action="season simulation execute")
    except ConfirmationError as exc:
        payload["errors"].append(str(exc))
        return payload

    assert_safe_recipient(scenario.athlete.get("parent_email") or SAFE_EMAIL_RECIPIENT)
    if enable_email_delivery:
        assert_safe_recipient(SAFE_EMAIL_RECIPIENT)
        payload["warnings"].append(
            "Email delivery enabled (allowlist only). Send-arming remains a separate "
            "optional phase — execute does not require email to complete the graph."
        )
    else:
        payload["warnings"].append(
            "Email delivery OFF (default). Full graph execute proceeds without sending."
        )

    if client is None:
        client = AirtableClient(allow_writes=True)
    else:
        client.allow_writes = True

    try:
        reg = load_registry(registry_dir, scenario.run_id)
        payload["warnings"].append(f"Resuming from existing registry for {scenario.run_id}")
    except FileNotFoundError:
        reg = RunRegistry(
            run_id=scenario.run_id,
            created_at=datetime.now(timezone.utc).isoformat(),
            athlete_name=scenario.athlete["display_name"],
            meta={"goal_record_id": scenario.goal_record_id},
        )

    ctx = context or resolve_execute_context(
        program_instance_id=(
            next(
                (
                    str(h.get("program_instance_id"))
                    for h in scenario.homework_selected
                    if h.get("program_instance_id")
                ),
                "",
            )
            or None
        ),
        school_year=SCHOOL_YEAR_2026_2027,
        week_ids=[
            str(w.get("record_id"))
            for w in (scenario.meta.get("weeks") or [])
            if w.get("record_id")
        ],
        scenario=scenario,
    )
    if not ctx.program_instance_id:
        payload["errors"].append(
            "Execute requires program_instance_id (Shooting Challenge | 2026-2027)."
        )
        save_registry(reg, registry_dir)
        return payload

    orchestrator = SeasonSimOrchestrator(
        client=client,
        scenario=scenario,
        clock=clock,
        registry=reg,
        context=ctx,
        enable_email_delivery=enable_email_delivery,
    )
    try:
        result = orchestrator.run()
    except WriteBlockedError as exc:
        payload["errors"].append(str(exc))
        save_registry(reg, registry_dir)
        return payload

    payload["orchestration"] = result.to_dict()
    payload["created_records"] = result.created
    payload["reused_records"] = result.reused
    payload["errors"].extend(result.errors)
    payload["warnings"].extend(result.warnings)
    payload["email_phase"] = result.email_phase
    payload["paused"] = result.paused
    payload["ok"] = result.ok and not result.paused
    payload["registry_path"] = str(save_registry(reg, registry_dir))

    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"execute-{scenario.run_id}.json"
    path.write_text(json.dumps(payload, indent=2, default=str) + "\n", encoding="utf-8")
    payload["report_path"] = str(path)
    return payload
