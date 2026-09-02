"""Report writers for dry-run / audit outputs."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def write_json(path: Path, payload: dict[str, Any]) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, default=str) + "\n", encoding="utf-8")
    return path


def write_markdown(path: Path, text: str) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text if text.endswith("\n") else text + "\n", encoding="utf-8")
    return path


def dry_run_markdown(payload: dict[str, Any]) -> str:
    summary = payload.get("intended_writes_summary") or {}
    readiness = payload.get("write_readiness") or {}
    lines = [
        "# Season simulation dry-run",
        "",
        f"- Run ID: `{payload.get('run_id')}`",
        f"- Generated: `{payload.get('generated_at')}`",
        f"- Mode: **dry-run** (no Airtable writes, no email sends)",
        f"- Goal shots (from Airtable): **{payload.get('goal_total_shots')}**",
        f"- Grade band: `{payload.get('grade_band_id')}`",
        f"- Goal record: `{payload.get('goal_record_id')}`",
        "",
        "## Intended writes summary",
        "",
    ]
    for k, v in summary.items():
        lines.append(f"- {k}: {v}")
    lines.extend(["", "## Write readiness (post date/HW/VF fixes)", ""])
    for k, v in readiness.items():
        lines.append(f"- {k}: `{v}`")
    lines.extend(["", "## Simulation clock", ""])
    clock = payload.get("simulation_clock") or {}
    for k, v in clock.items():
        lines.append(f"- {k}: `{v}`")
    lines.extend(["", "## Email events (not sent)", ""])
    emails = payload.get("intended_emails") or []
    lines.append(f"Count: {len(emails)}")
    # sample first 5
    for ev in emails[:5]:
        lines.append(
            f"- day {ev.get('day_number')}: {ev.get('event_type')} → {ev.get('recipient')}"
        )
    if len(emails) > 5:
        lines.append(f"- … {len(emails) - 5} more")
    lines.extend(["", "## Cleanup scope (if executed later)", ""])
    for t in payload.get("cleanup_scope") or []:
        lines.append(f"- {t}")
    lines.extend(["", "## Safety", ""])
    lines.append("- Default mode performs **no writes** and **no sends**.")
    lines.append(
        "- Execute requires `--execute --simulation-id … "
        "--confirm SEASON-SIMULATION-2027 "
        "--confirm-disposable CONFIRM-DISPOSABLE-SEASON-SIM`."
    )
    lines.append(
        "- Cleanup deletes require a separate `--confirm-cleanup CONFIRM-CLEANUP-SEASON-SIM`."
    )
    return "\n".join(lines) + "\n"


def write_dry_run_report(out_dir: Path, payload: dict[str, Any]) -> dict[str, Path]:
    ts = stamp()
    run_id = str(payload.get("run_id") or "unknown")
    json_path = out_dir / f"dry-run-{run_id}-{ts}.json"
    md_path = out_dir / f"dry-run-{run_id}-{ts}.md"
    write_json(json_path, payload)
    write_markdown(md_path, dry_run_markdown(payload))
    write_json(out_dir / "dry-run-latest.json", payload)
    write_markdown(out_dir / "dry-run-latest.md", dry_run_markdown(payload))
    return {"json": json_path, "md": md_path}
