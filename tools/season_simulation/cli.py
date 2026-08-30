#!/usr/bin/env python3
"""CLI for Athlete 1 season simulation infrastructure (SC-SEASON-SIM-002).

Default mode is dry-run. Execute and cleanup require:
  --execute --confirm SEASON-SIMULATION-2027

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
from .confirmation import is_confirmed
from .constants import (
    CONFIRM_TOKEN,
    SAFE_EMAIL_RECIPIENT,
    SIM_START,
)
from .execute import build_intended_writes
from .preflight import run_preflight, write_preflight_reports
from .reference_data import load_reference_snapshot
from .reports import write_dry_run_report
from .run_registry import new_run_id
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
        choices=["preflight", "dry-run", "execute", "cleanup", "plan"],
        help="preflight=read-only checks; dry-run=default plan; execute/cleanup require confirm",
    )
    p.add_argument("--run-id", default="", help="Run ID (generated if omitted)")
    p.add_argument(
        "--execute",
        action="store_true",
        help="Allow writes/deletes (still requires --confirm)",
    )
    p.add_argument(
        "--confirm",
        default="",
        help=f'Must equal "{CONFIRM_TOKEN}" with --execute',
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
            for i in range(1, 5)
        ],
        zoom_objs=[
            {"record_id": "recOFFLINEZOOM1", "display": "Zoom A", "meeting_name": "Zoom A"},
            {"record_id": "recOFFLINEZOOM2", "display": "Zoom B", "meeting_name": "Zoom B"},
        ],
        week_objs=[],
    )


def cmd_dry_run(args: argparse.Namespace) -> int:
    run_id = args.run_id or new_run_id()
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
    if not is_confirmed(execute=args.execute, confirm=args.confirm):
        print(
            f"Execute refused. Provide --execute --confirm \"{CONFIRM_TOKEN}\"",
            file=sys.stderr,
        )
        return 2

    print(
        "ERROR: Execute mode is intentionally not run during infrastructure sessions.\n"
        "Re-run later only after Weeks coverage + simulation-clock override are approved.\n"
        "This invocation is aborted before any Airtable writes.",
        file=sys.stderr,
    )
    return 3


def cmd_cleanup(args: argparse.Namespace) -> int:
    if not args.run_id:
        print("cleanup requires --run-id", file=sys.stderr)
        return 2

    client = None
    try:
        client = _client(args, allow_writes=False)
    except SystemExit:
        print("No Airtable token — building cleanup plan from local registry only")

    if args.execute and is_confirmed(execute=True, confirm=args.confirm):
        print(
            "ERROR: Cleanup execute is disabled during infrastructure sessions.\n"
            "Dry-run cleanup plan only.",
            file=sys.stderr,
        )

    result = run_cleanup(
        run_id=args.run_id,
        registry_dir=Path(args.registry_dir),
        execute=False,
        confirm="",
        client=client,
        out_dir=Path(args.out_dir),
    )
    print(json.dumps(result.to_dict(), indent=2))
    return 1 if result.errors else 0


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
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
