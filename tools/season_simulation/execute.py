"""Execute mode scaffolding — gated; not run during infrastructure build.

Creates Athlete 1 transactional records when explicitly confirmed. Live
automations are expected to process Activity Date, WAS, XP, email handoff, etc.
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
from .run_registry import RunRegistry, run_marker, save_registry
from .scenarios import Athlete1Scenario
from .simulation_clock import SimulationClock


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
                # School Year / Program Instance resolved at execute time from Config
            },
            "notes": "Program Instance + School Year must be set from live Config before create",
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
                    "Activity Date": clock.activity_datetime_iso(day.activity_date),
                    "Shot Total": day.shot_total,
                    "Video Upload Note": marker,
                    # Enrollment link filled at execute time
                },
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
                        "Notes": marker,
                        "asset_count_intended": hw["asset_count"],
                    },
                }
            )
        for zid in day.zoom_meeting_ids:
            writes.append(
                {
                    "table": "Zoom Attendance",
                    "op": "create",
                    "day_number": day.day_number,
                    "dedupe_key": f"{marker}|ZOOM|{zid}|D{day.day_number:02d}",
                    "fields": {
                        "Zoom Meeting": [zid],
                        # Enrollment filled at execute
                    },
                }
            )
        if day.video_feedback:
            writes.append(
                {
                    "table": "Video Feedback",
                    "op": "create_or_trigger",
                    "day_number": day.day_number,
                    "dedupe_key": f"{marker}|VF|D{day.day_number:02d}",
                    "notes": "Prefer live 013 path from Submission Assets when available",
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
) -> dict[str, Any]:
    """Execute is blocked unless confirmation matches. Infrastructure build must not call with execute=True."""
    intended = build_intended_writes(scenario, clock)
    payload: dict[str, Any] = {
        "mode": "execute" if execute else "dry-run-execute-path",
        "run_id": scenario.run_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "enable_email_delivery": enable_email_delivery,
        "intended_write_count": len(intended),
        "intended_writes": intended,
        "created_records": [],
        "errors": [],
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

    assert_safe_recipient(scenario.athlete.get("parent_email"))
    if enable_email_delivery:
        # Still only allowlisted address; live-looking subjects (no [TEST] labels).
        assert_safe_recipient(SAFE_EMAIL_RECIPIENT)
    else:
        payload["errors"].append(
            "execute confirmed but enable_email_delivery=False — "
            "refusing full run until email delivery flag is explicitly enabled for an authorized session"
        )
        # Still allow record writes without arming email if caller wants — for now abort.
        raise ExecuteAborted(
            "Refusing execute: pass enable_email_delivery only during an authorized live run; "
            "infrastructure sessions must not execute."
        )

    if client is None:
        client = AirtableClient(allow_writes=True)
    else:
        client.allow_writes = True

    reg = RunRegistry(
        run_id=scenario.run_id,
        created_at=datetime.now(timezone.utc).isoformat(),
        athlete_name=scenario.athlete["display_name"],
        meta={"goal_record_id": scenario.goal_record_id},
    )

    # Minimal create path (athlete + enrollment). Full day loop is intentional
    # follow-on once Weeks + simulation-clock override are ready.
    try:
        athletes = client.create_records(
            "Athletes",
            [
                {
                    "First Name": scenario.athlete["first_name"],
                    "Last Name": scenario.athlete["last_name"],
                    "Parent Email": SAFE_EMAIL_RECIPIENT,
                    "Active?": True,
                }
            ],
        )
        athlete_id = athletes[0]["id"]
        reg.athlete_id = athlete_id
        reg.add("Athletes", athlete_id, dedupe_key=f"{run_marker(scenario.run_id)}|ATHLETE")
        payload["created_records"].append({"table": "Athletes", "id": athlete_id})
    except WriteBlockedError as exc:
        payload["errors"].append(str(exc))
        return payload
    except Exception as exc:  # noqa: BLE001
        payload["errors"].append(f"Athlete create failed: {exc}")
        save_registry(reg, registry_dir)
        return payload

    save_registry(reg, registry_dir)
    payload["registry_path"] = str(save_registry(reg, registry_dir))
    payload["errors"].append(
        "Execute scaffolding stopped after Athlete create stub — "
        "full 61-day writer awaits simulation-clock override + Weeks coverage sign-off."
    )
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"execute-{scenario.run_id}.json"
    path.write_text(json.dumps(payload, indent=2, default=str) + "\n", encoding="utf-8")
    payload["report_path"] = str(path)
    return payload
