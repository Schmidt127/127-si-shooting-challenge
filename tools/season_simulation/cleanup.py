"""Cleanup tool — deletes only records created by a simulation run ID."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .airtable_client import AirtableClient, WriteBlockedError
from .confirmation import ConfirmationError  # noqa: F401 — re-exported for callers
from .constants import REFERENCE_TABLES, TRANSACTIONAL_TABLES
from .run_registry import load_registry, run_marker

# Delete order: dependents before parents.
DELETE_ORDER = [
    "Email Handoff Queue",
    "XP Events",
    "Athlete Achievement Unlocks",
    "Streak Occurrences",
    "Video Feedback",
    "Homework Completions",
    "Submission Assets",
    "Zoom Attendance",
    "Weekly Athlete Summary",
    "Submissions",
    "Enrollments",
    "Athletes",
]


@dataclass
class CleanupPlan:
    run_id: str
    dry_run: bool
    targets: dict[str, list[str]]
    skipped_reference_tables: list[str]
    attendees_patches: list[dict[str, Any]] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def total_records(self) -> int:
        return sum(len(v) for v in self.targets.values())

    def to_dict(self) -> dict[str, Any]:
        return {
            **asdict(self),
            "total_records": self.total_records(),
        }


@dataclass
class CleanupResult:
    run_id: str
    dry_run: bool
    deleted: dict[str, list[str]]
    plan: dict[str, Any]
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def build_cleanup_plan(
    *,
    run_id: str,
    registry_dir: Path,
    client: AirtableClient | None = None,
) -> CleanupPlan:
    """Identify deletion targets from local registry (primary) + marker scan notes."""
    errors: list[str] = []
    warnings: list[str] = []
    targets: dict[str, list[str]] = {t: [] for t in DELETE_ORDER}

    try:
        reg = load_registry(registry_dir, run_id)
    except FileNotFoundError as exc:
        errors.append(str(exc))
        return CleanupPlan(
            run_id=run_id,
            dry_run=True,
            targets={},
            skipped_reference_tables=list(REFERENCE_TABLES),
            errors=errors,
        )

    for table, ids in reg.ids_by_table().items():
        if table in REFERENCE_TABLES:
            warnings.append(
                f"Registry references {table!r} — skipping (never deleted by cleanup)"
            )
            continue
        if table not in TRANSACTIONAL_TABLES:
            warnings.append(f"Unexpected transactional table in registry: {table}")
        targets.setdefault(table, [])
        for rid in ids:
            if not rid.startswith("rec"):
                errors.append(f"Invalid record id in registry: {rid}")
                continue
            if rid not in targets[table]:
                targets[table].append(rid)

    # Safety: never include empty enrollment that isn't ours — registry only.
    if not reg.enrollment_id and targets.get("Enrollments"):
        warnings.append("Registry has enrollment rows but enrollment_id meta is empty")

    marker = run_marker(run_id)
    warnings.append(
        f"Primary targeting uses local registry; marker {marker!r} is secondary evidence"
    )

    # Note attendees patches that cleanup should reverse (not delete meetings).
    patches = list((reg.meta or {}).get("zoom_attendees_patches") or [])
    if patches:
        warnings.append(
            f"{len(patches)} Zoom Meetings.Attendees patch(es) recorded — "
            "cleanup will reverse enrollment from Attendees, not delete meetings"
        )

    # Optional live verification that registry IDs still exist (read-only).
    if client is not None and not errors:
        for table, ids in list(targets.items()):
            verified: list[str] = []
            for rid in ids:
                try:
                    client.get_record(table, rid)
                    verified.append(rid)
                except Exception as exc:  # noqa: BLE001
                    warnings.append(f"Registry id {rid} on {table} not fetchable: {exc}")
            targets[table] = verified

    # Drop empty tables
    targets = {k: v for k, v in targets.items() if v}

    return CleanupPlan(
        run_id=run_id,
        dry_run=True,
        targets=targets,
        skipped_reference_tables=list(REFERENCE_TABLES),
        attendees_patches=patches,
        errors=errors,
        warnings=warnings,
    )


def run_cleanup(
    *,
    run_id: str,
    registry_dir: Path,
    execute: bool = False,
    confirm: str | None = None,
    confirm_cleanup: str | None = None,
    simulation_id: str | None = None,
    client: AirtableClient | None = None,
    out_dir: Path | None = None,
) -> CleanupResult:
    """Dry-run by default. Deletes only with full cleanup gates."""
    from .confirmation import ConfirmationError, require_cleanup_gates

    plan = build_cleanup_plan(run_id=run_id, registry_dir=registry_dir, client=client)
    if plan.errors:
        result = CleanupResult(
            run_id=run_id,
            dry_run=True,
            deleted={},
            plan=plan.to_dict(),
            errors=plan.errors,
        )
        _write_cleanup_report(result, out_dir)
        return result

    if not execute:
        result = CleanupResult(
            run_id=run_id,
            dry_run=True,
            deleted={},
            plan=plan.to_dict(),
            errors=[],
        )
        _write_cleanup_report(result, out_dir)
        return result

    try:
        require_cleanup_gates(
            execute=execute,
            confirm=confirm,
            confirm_cleanup=confirm_cleanup,
            simulation_id=simulation_id or run_id,
        )
    except ConfirmationError as exc:
        result = CleanupResult(
            run_id=run_id,
            dry_run=True,
            deleted={},
            plan=plan.to_dict(),
            errors=[str(exc)],
        )
        _write_cleanup_report(result, out_dir)
        return result

    # Extra safety: only delete IDs present in the local registry for this run.
    if not plan.targets and not plan.attendees_patches:
        result = CleanupResult(
            run_id=run_id,
            dry_run=True,
            deleted={},
            plan=plan.to_dict(),
            errors=["Cleanup refused: registry has no deletable targets"],
        )
        _write_cleanup_report(result, out_dir)
        return result

    if client is None:
        client = AirtableClient(allow_writes=True)
    else:
        client.allow_writes = True

    deleted: dict[str, list[str]] = {}
    errors: list[str] = []

    # Reverse live Attendees patches before deleting enrollment.
    for patch in plan.attendees_patches:
        meeting_id = patch.get("meeting_id") or ""
        enrollment_id = patch.get("enrollment_id") or ""
        if not meeting_id or not enrollment_id:
            continue
        try:
            rec = client.get_record("Zoom Meetings", meeting_id)
            raw = (rec.get("fields") or {}).get("Attendees") or []
            current: list[str] = []
            if isinstance(raw, list):
                for item in raw:
                    if isinstance(item, str):
                        current.append(item)
                    elif isinstance(item, dict) and item.get("id"):
                        current.append(str(item["id"]))
            next_ids = [x for x in current if x != enrollment_id]
            client.update_records(
                "Zoom Meetings",
                [{"id": meeting_id, "fields": {"Attendees": next_ids}}],
            )
        except Exception as exc:  # noqa: BLE001
            errors.append(f"Failed to reverse Attendees on {meeting_id}: {exc}")

    for table in DELETE_ORDER:
        ids = plan.targets.get(table) or []
        if not ids:
            continue
        if table in REFERENCE_TABLES:
            errors.append(f"Refusing to delete reference table {table}")
            continue
        try:
            client.delete_records(table, ids)
            deleted[table] = list(ids)
        except WriteBlockedError as exc:
            errors.append(str(exc))
            break
        except Exception as exc:  # noqa: BLE001
            errors.append(f"Delete failed for {table}: {exc}")
            break

    result = CleanupResult(
        run_id=run_id,
        dry_run=False,
        deleted=deleted,
        plan=plan.to_dict(),
        errors=errors,
    )
    _write_cleanup_report(result, out_dir)
    return result


def _write_cleanup_report(result: CleanupResult, out_dir: Path | None) -> None:
    if out_dir is None:
        return
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    path = out_dir / f"cleanup-{result.run_id}-{stamp}.json"
    path.write_text(json.dumps(result.to_dict(), indent=2) + "\n", encoding="utf-8")
