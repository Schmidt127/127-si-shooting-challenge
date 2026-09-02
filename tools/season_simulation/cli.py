#!/usr/bin/env python3
"""CLI for Athlete 1 season simulation infrastructure (SC-SEASON-SIM-002).

Default mode is dry-run. Execute and cleanup require explicit multi-gate flags.

Run from repo ``tools/`` directory:

  python -m season_simulation preflight
  python -m season_simulation dry-run
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from .airtable_client import AirtableClient
from .cleanup import run_cleanup
from .confirmation import is_execute_fully_gated
from .constants import (
    CONFIRM_CLEANUP_TOKEN,
    CONFIRM_DISPOSABLE_TOKEN,
    CONFIRM_TOKEN,
    SAFE_EMAIL_RECIPIENT,
    SIM_START,
)
from .execute import ExecuteAborted, build_intended_writes, run_execute
from .preflight import run_preflight, write_preflight_reports
from .reference_data import load_reference_snapshot
from .reports import write_dry_run_report
from .run_registry import new_run_id, validate_run_id
from .scenarios import scenario_from_reference
from .simulation_clock import SimulationClock

PACKAGE_DIR = Path(__file__).resolve().parent
REPORTS_DIR = PACKAGE_DIR / "reports"
REGISTRY_DIR = PACKAGE_DIR / "run_registries"


def _parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Athlete 1 season simulation (May 1 – June 30, 2027)"
    )
    p.add_argument(
        "command",
        choices=["preflight", "dry-run", "execute", "cleanup", "plan", "evidence"],
        help=(
            "preflight=read-only checks; dry-run=default plan; "
            "execute/cleanup require confirm gates; evidence=export latest reports"
        ),
    )
    p.add_argument(
        "--run-id",
        "--simulation-id",
        dest="run_id",
        default="",
        help="Simulation / run ID (generated if omitted for dry-run; required for cleanup)",
    )
    p.add_argument(
        "--execute",
        action="store_true",
        help="Allow writes/deletes (still requires confirm tokens)",
    )
    p.add_argument(
        "--confirm",
        default="",
        help=f'Must equal "{CONFIRM_TOKEN}" with --execute',
    )
    p.add_argument(
        "--confirm-disposable",
        default="",
        help=f'Must equal "{CONFIRM_DISPOSABLE_TOKEN}" for execute writes',
    )
    p.add_argument(
        "--confirm-cleanup",
        default="",
        help=f'Must equal "{CONFIRM_CLEANUP_TOKEN}" for cleanup deletes',
    )
    p.add_argument(
        "--acknowledge-clock-override",
        action="store_true",
        help=(
            "Operator affirms gated Activity Date Is Future? formula is live "
            "(required for early execute when formula text is not auto-detected)"
        ),
    )
    p.add_argument(
        "--enable-email-delivery",
        action="store_true",
        help="Authorized runs only; still restricted to "
        f"{SAFE_EMAIL_RECIPIENT}",
    )
    p.add_argument(
        "--base-id",
        default="",
        help="Override Airtable base id (default env / production id)",
    )
    p.add_argument(
        "--out-dir",
        default=str(REPORTS_DIR),
        help="Report output directory",
    )
    p.add_argument(
        "--registry-dir",
        default=str(REGISTRY_DIR),
        help="Local run registry directory",
    )
    p.add_argument(
        "--offline-fixture",
        action="store_true",
        help="dry-run/plan without Airtable (synthetic reference IDs for offline tests only)",
    )
    return p


def _client(args: argparse.Namespace, *, allow_writes: bool) -> AirtableClient:
    kwargs: dict = {"allow_writes": allow_writes}
    if args.base_id:
        kwargs["base_id"] = args.base_id
    return AirtableClient(**kwargs)


def cmd_preflight(args: argparse.Namespace) -> int:
    client = _client(args, allow_writes=False)
    report = run_preflight(client)
    paths = write_preflight_reports(report, Path(args.out_dir))
    print(report.summary_text())
    print(f"Wrote {paths['json']}")
    print(f"Wrote {paths['md']}")
    return 0 if report.ok else 2


def _offline_scenario(run_id: str):
    return scenario_from_reference(
        run_id=run_id,
        grade_band_id="recOFFLINEGRADE12BAND",
        goal_record_id="recOFFLINEGOALHIGHEST",
        goal_total_shots=12000,
        homework_objs=[
            {
                "record_id": f"recOFFLINEHW{i:02d}",
                "slot": "HW1" if i % 2 else "HW2",
                "display": f"HW{i}",
            }
            for i in range(1, 19)
        ],
        zoom_objs=[
            {"record_id": "recOFFLINEZOOM1", "display": "Zoom A", "meeting_name": "Zoom A"},
            {"record_id": "recOFFLINEZOOM2", "display": "Zoom B", "meeting_name": "Zoom B"},
        ],
        week_objs=[],
    )


def cmd_dry_run(args: argparse.Namespace) -> int:
    run_id = args.run_id or new_run_id()
    validate_run_id(run_id)
    clock = SimulationClock(enabled=True, current_date=SIM_START, run_id=run_id)

    if args.offline_fixture:
        scenario = _offline_scenario(run_id)
        ref_meta = {"mode": "offline_fixture", "warning": "synthetic IDs — not for execute"}
    else:
        client = _client(args, allow_writes=False)
        snap = load_reference_snapshot(client)
        if snap.errors:
            print("Reference errors:")
            for e in snap.errors:
                print(f"  - {e}")
            print("Continuing dry-run plan where possible; fix errors before execute.")
        if not snap.grade_band or not snap.highest_goal:
            print(
                "FATAL: cannot build scenario without Grade Band + highest goal",
                file=sys.stderr,
            )
            return 2
        scenario = scenario_from_reference(
            run_id=run_id,
            grade_band_id=snap.grade_band.record_id,
            goal_record_id=snap.highest_goal.record_id,
            goal_total_shots=int(snap.highest_goal.total_shot_target or 0),
            homework_objs=snap.homework,
            zoom_objs=snap.zoom_meetings,
            week_objs=snap.weeks_covering_window,
        )
        ref_meta = {
            "homework_count": len(snap.homework),
            "zoom_count": len(snap.zoom_meetings),
            "weeks_count": len(snap.weeks_covering_window),
            "warnings": snap.warnings,
            "ambiguous": snap.ambiguous,
        }

    intended = build_intended_writes(scenario, clock)
    payload = {
        **scenario.to_dict(),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "simulation_clock": clock.as_dict(),
        "reference_meta": ref_meta,
        "intended_writes": intended,
        "airtable_writes_performed": 0,
        "emails_sent": 0,
        "safety": {
            "dry_run": True,
            "confirm_token_required": CONFIRM_TOKEN,
            "confirm_disposable_required": CONFIRM_DISPOSABLE_TOKEN,
            "confirm_cleanup_required": CONFIRM_CLEANUP_TOKEN,
            "recipient_allowlist": SAFE_EMAIL_RECIPIENT,
        },
    }
    paths = write_dry_run_report(Path(args.out_dir), payload)
    print(f"Dry-run complete for run_id={run_id}")
    print(f"Days planned: {scenario.intended_writes_summary.get('simulation_days')}")
    print(f"Total planned shots: {scenario.intended_writes_summary.get('total_planned_shots')}")
    print(f"Goal (Airtable): {scenario.goal_total_shots}")
    print(f"Email events (not sent): {len(scenario.intended_emails)}")
    print(f"Wrote {paths['json']}")
    print(f"Wrote {paths['md']}")
    return 0


def cmd_execute(args: argparse.Namespace) -> int:
    if not is_execute_fully_gated(
        execute=args.execute,
        confirm=args.confirm,
        confirm_disposable=args.confirm_disposable,
        simulation_id=args.run_id or None,
    ):
        print(
            "Execute refused. Provide all of:\n"
            f'  --execute --simulation-id SEASON-SIM-2027-… '
            f'--confirm "{CONFIRM_TOKEN}" '
            f'--confirm-disposable "{CONFIRM_DISPOSABLE_TOKEN}"\n'
            "Plus --acknowledge-clock-override after OMNI gated formula paste "
            "(when wall date is before 2027-05-01).\n"
            "Email stays off unless --enable-email-delivery.",
            file=sys.stderr,
        )
        return 2

    run_id = args.run_id
    validate_run_id(run_id)
    clock = SimulationClock(enabled=True, current_date=SIM_START, run_id=run_id)

    client = _client(args, allow_writes=False)
    snap = load_reference_snapshot(client)
    if snap.errors or not snap.grade_band or not snap.highest_goal:
        print("FATAL: reference resolution failed; fix preflight errors first", file=sys.stderr)
        for e in snap.errors:
            print(f"  - {e}", file=sys.stderr)
        return 2

    scenario = scenario_from_reference(
        run_id=run_id,
        grade_band_id=snap.grade_band.record_id,
        goal_record_id=snap.highest_goal.record_id,
        goal_total_shots=int(snap.highest_goal.total_shot_target or 0),
        homework_objs=snap.homework,
        zoom_objs=snap.zoom_meetings,
        week_objs=snap.weeks_covering_window,
    )

    sub_fields: set[str] = set()
    formula_text = ""
    try:
        for t in client.meta_tables():
            if t.get("name") == "Submissions":
                for f in t.get("fields") or []:
                    sub_fields.add(str(f.get("name") or ""))
                    if f.get("name") == "Activity Date Is Future?":
                        formula_text = str((f.get("options") or {}).get("formula") or "")
    except Exception as exc:  # noqa: BLE001
        print(f"Warning: could not load Submissions schema: {exc}", file=sys.stderr)

    school_year = "2026-2027"
    if snap.config_rows:
        school_year = snap.config_rows[0].get("active_school_year") or school_year

    goal_pis = list(snap.highest_goal.program_instance_ids or [])

    from .writer import build_execute_context_from_reference

    try:
        ctx = build_execute_context_from_reference(
            scenario=scenario,
            weeks=snap.weeks_covering_window,
            school_year=school_year,
            goal_program_instance_ids=goal_pis,
            submission_field_names=sub_fields or None,
        )
    except ValueError as exc:
        print(f"FATAL: {exc}", file=sys.stderr)
        return 2

    try:
        result = run_execute(
            scenario=scenario,
            clock=clock,
            execute=True,
            confirm=args.confirm,
            confirm_disposable=args.confirm_disposable,
            simulation_id=run_id,
            registry_dir=Path(args.registry_dir),
            out_dir=Path(args.out_dir),
            client=_client(args, allow_writes=True),
            enable_email_delivery=args.enable_email_delivery,
            acknowledge_clock_override=args.acknowledge_clock_override,
            submission_field_names=sub_fields or None,
            formula_text=formula_text or None,
            execute_context=ctx,
        )
    except ExecuteAborted as exc:
        print(f"Execute aborted: {exc}", file=sys.stderr)
        return 3

    print(json.dumps({k: result[k] for k in result if k != "intended_writes"}, indent=2, default=str))
    if result.get("errors") or result.get("writer_status") not in {None, "complete"}:
        return 3
    return 0


def cmd_cleanup(args: argparse.Namespace) -> int:
    if not args.run_id:
        print("cleanup requires --run-id / --simulation-id", file=sys.stderr)
        return 2

    client = None
    try:
        client = _client(args, allow_writes=bool(args.execute))
    except SystemExit:
        print("No Airtable token — building cleanup plan from local registry only")

    result = run_cleanup(
        run_id=args.run_id,
        registry_dir=Path(args.registry_dir),
        execute=bool(args.execute),
        confirm=args.confirm,
        confirm_cleanup=args.confirm_cleanup,
        simulation_id=args.run_id,
        client=client,
        out_dir=Path(args.out_dir),
    )
    print(json.dumps(result.to_dict(), indent=2))
    return 1 if result.errors else 0


def cmd_evidence(args: argparse.Namespace) -> int:
    """Bundle latest preflight/dry-run reports into an evidence manifest."""
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    latest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "simulation_id": args.run_id or "",
        "files": {},
    }
    for name in (
        "preflight-latest.json",
        "preflight-latest.md",
        "dry-run-latest.json",
        "dry-run-latest.md",
    ):
        path = out_dir / name
        if path.exists():
            latest["files"][name] = str(path)
    manifest = out_dir / f"evidence-manifest-{stamp}.json"
    manifest.write_text(json.dumps(latest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(latest, indent=2))
    print(f"Wrote {manifest}")
    return 0 if latest["files"] else 1


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    Path(args.out_dir).mkdir(parents=True, exist_ok=True)
    Path(args.registry_dir).mkdir(parents=True, exist_ok=True)

    if args.command == "preflight":
        return cmd_preflight(args)
    if args.command in {"dry-run", "plan"}:
        return cmd_dry_run(args)
    if args.command == "execute":
        return cmd_execute(args)
    if args.command == "cleanup":
        return cmd_cleanup(args)
    if args.command == "evidence":
        return cmd_evidence(args)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
