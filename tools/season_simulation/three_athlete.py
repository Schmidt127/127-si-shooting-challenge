"""SC-SEASON-SIM-001 — three-athlete run orchestration (dry-run / preflight / gated execute)."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .confirmation import (
    ConfirmationError,
    is_three_athlete_execute_gated,
    require_three_athlete_execute_gates,
)
from .constants import (
    CONFIRM_DISPOSABLE_TOKEN,
    CONFIRM_THREE_ATHLETE_TOKEN,
    CONFIRM_TOKEN,
    THREE_ATHLETE_AUTHORIZATION_PHRASE,
    THREE_ATHLETE_RUN_SUFFIX,
)
from .execute import build_intended_writes, summarize_intended_write_readiness
from .expectations_matrix import (
    build_athlete_expectation_matrix,
    build_three_athlete_expectation_package,
    format_oracle_match_markdown,
    format_weekly_table_markdown,
)
from .reference_data import load_reference_snapshot
from .run_registry import new_run_id, validate_run_id
from .scenario_base import AthleteScenario
from .scenarios_sc001 import build_all_sc001_scenarios
from .constants import SIM_START
from .simulation_clock import SimulationClock


def new_three_athlete_run_id(*, now: datetime | None = None) -> str:
    return new_run_id(now=now, suffix=THREE_ATHLETE_RUN_SUFFIX)


def _offline_reference() -> dict[str, Any]:
    homework = [
        {
            "record_id": f"recOFFLINEHW{i:02d}",
            "slot": "HW1" if i % 2 else "HW2",
            "library_id": f"recOFFLINELIB{i:02d}",
            "display": f"HW{i}",
        }
        for i in range(1, 19)
    ]
    zoom = [
        {"record_id": "recOFFLINEZOOM1", "display": "Zoom Live"},
        {"record_id": "recOFFLINEZOOM2", "display": "Zoom Rec"},
    ]
    return {
        "grade_band_id": "recOFFLINEGRADE12BAND",
        "goal_record_id": "recOFFLINEGOALHIGHEST",
        "goal_total_shots": 12000,
        "homework": homework,
        "zoom_meetings": zoom,
        "weeks": [],
    }


def build_three_athlete_scenarios(
    *,
    run_id: str,
    client: Any | None = None,
    offline_fixture: bool = False,
) -> tuple[dict[str, AthleteScenario], dict[str, Any]]:
    validate_run_id(run_id)
    ref_meta: dict[str, Any] = {"mode": "live" if client and not offline_fixture else "offline_fixture"}

    if offline_fixture or client is None:
        ref = _offline_reference()
        ref_meta["warning"] = "synthetic IDs — not for live execute"
    else:
        snap = load_reference_snapshot(client)
        ref_meta["warnings"] = snap.warnings
        ref_meta["errors"] = snap.errors
        if snap.errors or not snap.grade_band or not snap.highest_goal:
            raise ValueError(
                "Reference resolution failed: "
                + "; ".join(snap.errors or ["missing grade band or goal"])
            )
        weeks_objs = list(snap.weeks_covering_window)
        ref = {
            "grade_band_id": snap.grade_band.record_id,
            "goal_record_id": snap.highest_goal.record_id,
            "goal_total_shots": int(snap.highest_goal.total_shot_target or 0),
            "homework": [
                {
                    "record_id": h.record_id,
                    "slot": h.slot,
                    "library_id": h.library_id,
                    "display": h.display,
                    "week_id": h.week_id,
                }
                for h in snap.homework
            ],
            "zoom_meetings": [
                {"record_id": z.record_id, "display": z.display}
                for z in snap.zoom_meetings
            ],
            "weeks": [
                {
                    "record_id": w.record_id,
                    "name": w.name,
                    "start": w.start.isoformat() if w.start else None,
                    "end": w.end.isoformat() if w.end else None,
                    "program_instance_id": w.program_instance_id,
                }
                for w in weeks_objs
            ],
        }
        ref_meta["homework_count"] = len(snap.homework)
        ref_meta["zoom_count"] = len(snap.zoom_meetings)
        ref_meta["weeks_count"] = len(weeks_objs)
        # Live execute needs WeekInfo objects + goal PI for ExecuteContext.
        ref_meta["weeks_objs"] = weeks_objs
        ref_meta["goal_program_instance_ids"] = list(
            snap.highest_goal.program_instance_ids or []
        )
        ref_meta["school_year"] = "2026-2027"

    scenarios = build_all_sc001_scenarios(run_id=run_id, **ref)
    return scenarios, ref_meta


def run_three_athlete_dry_run(
    *,
    run_id: str | None = None,
    client: Any | None = None,
    offline_fixture: bool = False,
    out_dir: Path,
) -> dict[str, Any]:
    rid = run_id or new_three_athlete_run_id()
    scenarios, ref_meta = build_three_athlete_scenarios(
        run_id=rid,
        client=client,
        offline_fixture=offline_fixture,
    )
    clock = SimulationClock(enabled=True, current_date=SIM_START, run_id=rid)

    intended_by_profile: dict[str, list[dict[str, Any]]] = {}
    readiness_by_profile: dict[str, dict[str, Any]] = {}
    for profile, scenario in scenarios.items():
        intended = build_intended_writes(scenario, clock)
        intended_by_profile[profile] = intended
        readiness_by_profile[profile] = summarize_intended_write_readiness(intended)

    expectation_pkg = build_three_athlete_expectation_package(scenarios)
    matrices_md = "\n".join(
        format_weekly_table_markdown(build_athlete_expectation_matrix(s))
        for s in scenarios.values()
    )
    oracle_md = format_oracle_match_markdown(expectation_pkg.get("oracle_vs_dry_run") or {})

    payload: dict[str, Any] = {
        "backlog_id": "SC-SEASON-SIM-001",
        "run_id": rid,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "status": "READY" if (expectation_pkg.get("oracle_vs_dry_run") or {}).get("match") else "NOT_READY",
        "executed": False,
        "authorization_phrase_required": THREE_ATHLETE_AUTHORIZATION_PHRASE,
        "reference_meta": ref_meta,
        "scenarios": {p: s.to_dict() for p, s in scenarios.items()},
        "expectations": expectation_pkg,
        "intended_writes_by_profile": intended_by_profile,
        "write_readiness_by_profile": readiness_by_profile,
        "safety": {
            "dry_run": True,
            "no_dev_environment": True,
            "production_disposable_only": True,
            "confirm_token": CONFIRM_TOKEN,
            "confirm_three_athlete_token": CONFIRM_THREE_ATHLETE_TOKEN,
            "confirm_disposable": CONFIRM_DISPOSABLE_TOKEN,
        },
    }

    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    json_path = out_dir / f"sc001-dry-run-{rid}-{stamp}.json"
    md_path = out_dir / f"sc001-dry-run-{rid}-{stamp}.md"
    latest_json = out_dir / "sc001-dry-run-latest.json"
    latest_md = out_dir / "sc001-dry-run-latest.md"

    json_path.write_text(json.dumps(payload, indent=2, default=str) + "\n", encoding="utf-8")
    latest_json.write_text(json_path.read_text(encoding="utf-8"), encoding="utf-8")

    md_body = _format_dry_run_markdown(payload, matrices_md, oracle_md)
    md_path.write_text(md_body, encoding="utf-8")
    latest_md.write_text(md_body, encoding="utf-8")

    payload["report_paths"] = {
        "json": str(json_path),
        "md": str(md_path),
        "latest_json": str(latest_json),
        "latest_md": str(latest_md),
    }
    return payload


def _format_dry_run_markdown(payload: dict[str, Any], matrices_md: str, oracle_md: str = "") -> str:
    lines = [
        "# SC-SEASON-SIM-001 — Three-Athlete Dry-Run Report",
        "",
        f"**Run ID:** `{payload.get('run_id')}`",
        f"**Status:** {payload.get('status')} — **NOT EXECUTED**",
        f"**Generated:** {payload.get('generated_at')}",
        "",
        "## Authorization",
        "",
        f"Future live execute requires Mike to say exactly: **`{THREE_ATHLETE_AUTHORIZATION_PHRASE}`**",
        "",
        oracle_md,
        "## Environment",
        "",
        "- **No DEV environment** — Production disposable records only",
        "- Dry-run default; no Airtable writes in this report",
        "",
        "## Weekly expectation matrices",
        "",
        matrices_md,
        "",
        "## Email verification (allowlist only)",
        "",
        "- Daily Submission emails expected per submit day",
        "- Homework Feedback emails when grading/review is exercised",
        "- Weekly summary build arms (Saturdays) + Hub handoffs after SC-168 stage",
        "- Recipient allowlist: `schmidt@fairfieldbasketballclub.com` only",
        "- Verify send status / writeback on Email Handoff Queue at execute",
        "- **No emails sent during dry-run / preparation**",
        "",
        "## Safety controls",
        "",
        "- Run-ID scoped cleanup only",
        "- Allowlist email: `schmidt@fairfieldbasketballclub.com`",
        "- SC-SEASON-SIM-002 historical run T122531Z remains COMPLETE — do not rerun",
        "- Formulas stay Production-normal until Mike authorizes temporary gate paste",
        "",
    ]
    return "\n".join(lines)


def assert_three_athlete_ready_for_execute(
    *,
    execute: bool,
    confirm: str | None,
    confirm_disposable: str | None,
    confirm_three_athlete: str | None,
    authorization_phrase: str | None,
    simulation_id: str | None,
) -> None:
    """Fail closed unless all three-athlete gates pass."""
    require_three_athlete_execute_gates(
        execute=execute,
        confirm=confirm,
        confirm_disposable=confirm_disposable,
        confirm_three_athlete=confirm_three_athlete,
        authorization_phrase=authorization_phrase,
        simulation_id=simulation_id,
    )


def three_athlete_execute_allowed(**kwargs: Any) -> bool:
    try:
        assert_three_athlete_ready_for_execute(**kwargs)
        return True
    except ConfirmationError:
        return False


def run_execute_three(
    *,
    run_id: str | None = None,
    client: Any | None = None,
    offline_fixture: bool = False,
    out_dir: Path,
    registry_dir: Path,
    execute: bool = False,
    confirm: str | None = None,
    confirm_disposable: str | None = None,
    confirm_three_athlete: str | None = None,
    authorization_phrase: str | None = None,
    allow_writes: bool | None = None,
    enable_email_delivery: bool = False,
    acknowledge_clock_override: bool = False,
    execute_context: Any | None = None,
) -> dict[str, Any]:
    """Gated three-athlete execute orchestration (re-exported from execute_three)."""
    from .execute_three import run_execute_three as _run

    rid = run_id or new_three_athlete_run_id()
    effective_allow_writes = False if allow_writes is None and not execute else allow_writes
    if not execute:
        effective_allow_writes = False

    return _run(
        run_id=rid,
        execute=execute,
        confirm=confirm,
        confirm_disposable=confirm_disposable,
        confirm_three_athlete=confirm_three_athlete,
        authorization_phrase=authorization_phrase,
        registry_dir=registry_dir,
        out_dir=out_dir,
        client=client,
        offline_fixture=offline_fixture,
        allow_writes=effective_allow_writes,
        enable_email_delivery=enable_email_delivery,
        acknowledge_clock_override=acknowledge_clock_override,
        execute_context=execute_context,
    )
