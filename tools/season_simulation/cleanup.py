"""Cleanup tool — deletes only records created by a simulation run ID."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .airtable_client import AirtableClient, WriteBlockedError
from .confirmation import ConfirmationError  # noqa: F401 — re-exported for callers
from .constants import (
    REFERENCE_TABLES,
    REGISTRY_DELETABLE_REFERENCE_TABLES,
    TRANSACTIONAL_TABLES,
)
from .constants import THREE_ATHLETE_RUN_SUFFIX
from .run_registry import RunRegistry, load_registry, registry_path, run_marker

# Tables that must never appear in delete targets (Weeks, PHA, curriculum, etc.).
PROTECTED_NEVER_DELETE: frozenset[str] = frozenset(REFERENCE_TABLES) | frozenset(
    {
        "Countries",
        "States",
        "Automations",
        "Communications Hub",
    }
)

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
    "Zoom Meetings",  # disposable sim-created meetings only (registry-scoped)
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


def assert_no_protected_delete_targets(targets: dict[str, list[str]]) -> list[str]:
    """Return errors if any protected table appears in delete targets."""
    errors: list[str] = []
    for table in targets:
        if table in PROTECTED_NEVER_DELETE and table not in REGISTRY_DELETABLE_REFERENCE_TABLES:
            errors.append(
                f"Protected table {table!r} must never be in cleanup delete set"
            )
    return errors


def enrollment_ids_from_registry(reg: RunRegistry) -> list[str]:
    """Collect enrollment IDs for single- or three-athlete runs."""
    ids: list[str] = []
    if reg.enrollment_id:
        ids.append(reg.enrollment_id)
    profiles = (reg.meta or {}).get("profiles") or {}
    if isinstance(profiles, dict):
        for pdata in profiles.values():
            if isinstance(pdata, dict):
                eid = str(pdata.get("enrollment_id") or "").strip()
                if eid.startswith("rec") and eid not in ids:
                    ids.append(eid)
    for rid in reg.ids_by_table().get("Enrollments") or []:
        if rid not in ids:
            ids.append(rid)
    return ids


def discover_automation_descendants(
    client: Any,
    *,
    run_id: str,
    enrollment_ids: list[str],
) -> tuple[dict[str, list[str]], list[str]]:
    """Discover XP / unlocks / streaks / email handoffs not in writer registry.

    Returns (targets_by_table, warnings). Read-only — uses list_records only.
    """
    targets: dict[str, list[str]] = {}
    warnings: list[str] = []
    marker = run_marker(run_id)
    list_records = getattr(client, "list_records", None)
    if not callable(list_records):
        warnings.append("No list_records on client — descendant scan skipped")
        return targets, warnings

    for enrollment_id in enrollment_ids:
        # SC-169 unlock cascade
        try:
            from .unlock_cascade_query import list_unlocks_for_enrollment

            unlock_rows = list_unlocks_for_enrollment(list_records, enrollment_id)
            for row in unlock_rows:
                uid = str(row.get("id") or "")
                if uid:
                    targets.setdefault("Athlete Achievement Unlocks", []).append(uid)
        except Exception as exc:  # noqa: BLE001
            warnings.append(f"Unlock scan for {enrollment_id}: {exc}")

        # XP Events — Source Key / debug marker
        for formula in (
            f"FIND('{enrollment_id}', {{Source Key}} & '')",
            f"FIND('{marker}', {{XP Reason Debug}} & '')",
        ):
            try:
                rows = list_records(
                    "XP Events",
                    fields=["Source Key", "XP Reason Debug", "Active?"],
                    formula=formula,
                    max_records=300,
                )
            except Exception as exc:  # noqa: BLE001
                warnings.append(f"XP scan {formula[:40]}…: {exc}")
                continue
            for row in rows or []:
                rid = str(row.get("id") or "")
                if rid:
                    targets.setdefault("XP Events", []).append(rid)

        # Streak Occurrences
        for formula in (
            f"FIND('{enrollment_id}', {{Enrollment Record ID}} & '')",
            f"FIND('{marker}', {{Notes}} & '')",
        ):
            try:
                rows = list_records(
                    "Streak Occurrences",
                    fields=["Notes", "Enrollment Record ID"],
                    formula=formula,
                    max_records=200,
                )
            except Exception as exc:  # noqa: BLE001
                warnings.append(f"Streak scan: {exc}")
                continue
            for row in rows or []:
                rid = str(row.get("id") or "")
                if rid:
                    targets.setdefault("Streak Occurrences", []).append(rid)

        # Email Handoff Queue
        for formula in (
            f"FIND('{enrollment_id}', {{Enrollment Record ID}} & '')",
            f"FIND('{marker}', {{Handoff Key}} & '')",
        ):
            try:
                rows = list_records(
                    "Email Handoff Queue",
                    fields=["Handoff Key", "Enrollment Record ID"],
                    formula=formula,
                    max_records=200,
                )
            except Exception as exc:  # noqa: BLE001
                warnings.append(f"Email handoff scan: {exc}")
                continue
            for row in rows or []:
                rid = str(row.get("id") or "")
                if rid:
                    targets.setdefault("Email Handoff Queue", []).append(rid)

    # Dedupe per table
    for table, ids in list(targets.items()):
        seen: list[str] = []
        for rid in ids:
            if rid not in seen:
                seen.append(rid)
        targets[table] = seen

    return targets, warnings


def merge_descendants_into_plan(plan: CleanupPlan, descendants: dict[str, list[str]]) -> None:
    """Merge automation descendant IDs into an existing plan (registry wins first)."""
    for table, ids in descendants.items():
        plan.targets.setdefault(table, [])
        for rid in ids:
            if rid not in plan.targets[table]:
                plan.targets[table].append(rid)


def validate_three_athlete_run_id(run_id: str) -> None:
    if THREE_ATHLETE_RUN_SUFFIX not in (run_id or ""):
        raise ValueError(
            f"Three-athlete cleanup requires run_id containing "
            f"{THREE_ATHLETE_RUN_SUFFIX!r}: got {run_id!r}"
        )


def three_athlete_registry_run_ids(shared_run_id: str) -> list[str]:
    """Shared run_id plus per-profile registry keys from execute-three."""
    validate_three_athlete_run_id(shared_run_id)
    profile_suffixes = (
        "athlete1-perfect",
        "athlete2-recovery",
        "athlete3-edge",
    )
    return [shared_run_id] + [f"{shared_run_id}__{suffix}" for suffix in profile_suffixes]


def stage_h_cleanup_preview_hook(
    *,
    run_id: str,
    registry_dir: Path,
    client: Any | None = None,
    profile: str | None = None,
) -> dict[str, Any]:
    """Stage H hook — read-only cleanup preview for shared + profile registries."""
    preview = cleanup_preview_three(
        run_id=run_id,
        registry_dir=registry_dir,
        client=client,
    )
    return {
        "stage": "H_cleanup_hooks",
        "profile": profile,
        "status": "ok" if not preview.errors else "failed",
        "writes": False,
        "dry_run": True,
        "plan_total": preview.plan.get("total_records", 0),
        "errors": list(preview.errors),
    }


def build_three_athlete_cleanup_plan(
    *,
    run_id: str,
    registry_dir: Path,
    client: AirtableClient | None = None,
    discover_descendants: bool = True,
) -> CleanupPlan:
    """Registry-scoped cleanup plan for SC-SEASON-SIM-001 three-athlete runs."""
    validate_three_athlete_run_id(run_id)
    sub_plans: list[CleanupPlan] = []
    for reg_id in three_athlete_registry_run_ids(run_id):
        sub = build_cleanup_plan(
            run_id=reg_id,
            registry_dir=registry_dir,
            client=None,
        )
        if sub.total_records() > 0 or not sub.errors:
            sub_plans.append(sub)

    if not sub_plans:
        return build_cleanup_plan(
            run_id=run_id,
            registry_dir=registry_dir,
            client=client,
        )

    merged_targets: dict[str, list[str]] = {t: [] for t in DELETE_ORDER}
    errors: list[str] = []
    warnings: list[str] = []
    attendees_patches: list[dict[str, Any]] = []
    enrollment_ids: list[str] = []

    for sub in sub_plans:
        errors.extend(sub.errors)
        warnings.extend(sub.warnings)
        attendees_patches.extend(sub.attendees_patches)
        for table, ids in sub.targets.items():
            merged_targets.setdefault(table, [])
            for rid in ids:
                if rid not in merged_targets[table]:
                    merged_targets[table].append(rid)
        try:
            reg = load_registry(registry_dir, sub.run_id)
            for eid in enrollment_ids_from_registry(reg):
                if eid not in enrollment_ids:
                    enrollment_ids.append(eid)
        except FileNotFoundError:
            pass

    merged_targets = {k: v for k, v in merged_targets.items() if v}

    if client is not None and enrollment_ids:
        descendants, desc_warnings = discover_automation_descendants(
            client,
            run_id=run_id,
            enrollment_ids=enrollment_ids,
        )
        for table, ids in descendants.items():
            merged_targets.setdefault(table, [])
            for rid in ids:
                if rid not in merged_targets[table]:
                    merged_targets[table].append(rid)
        warnings.extend(desc_warnings)

    protected_errors = assert_no_protected_delete_targets(merged_targets)
    errors.extend(protected_errors)

    profile_count = sum(
        1
        for reg_id in three_athlete_registry_run_ids(run_id)[1:]
        if registry_path(registry_dir, reg_id).exists()
    )
    if profile_count and profile_count != 3:
        warnings.append(
            f"Expected 3 profile registries; found {profile_count} under {run_id}"
        )

    return CleanupPlan(
        run_id=run_id,
        dry_run=True,
        targets=merged_targets,
        skipped_reference_tables=list(REFERENCE_TABLES),
        attendees_patches=attendees_patches,
        errors=errors,
        warnings=warnings,
    )


def cleanup_preview_three(
    *,
    run_id: str,
    registry_dir: Path,
    client: AirtableClient | None = None,
) -> CleanupResult:
    """Read-only cleanup preview for three-athlete run (never deletes)."""
    plan = build_three_athlete_cleanup_plan(
        run_id=run_id,
        registry_dir=registry_dir,
        client=client,
        discover_descendants=True,
    )
    audit = assert_no_protected_delete_targets(plan.targets)
    errors = list(plan.errors) + audit
    return CleanupResult(
        run_id=run_id,
        dry_run=True,
        deleted={},
        plan=plan.to_dict(),
        errors=errors,
    )


def run_three_athlete_cleanup(
    *,
    run_id: str,
    registry_dir: Path,
    execute: bool = False,
    confirm: str | None = None,
    confirm_cleanup: str | None = None,
    client: AirtableClient | None = None,
    out_dir: Path | None = None,
) -> CleanupResult:
    """Three-athlete cleanup — dry-run by default; deletes only with full gates."""
    from .confirmation import ConfirmationError, require_cleanup_gates

    validate_three_athlete_run_id(run_id)
    plan = build_three_athlete_cleanup_plan(
        run_id=run_id,
        registry_dir=registry_dir,
        client=client,
        discover_descendants=True,
    )
    # Ignore missing shared (non-profile) registry — profile registries are enough.
    plan.errors = [
        e
        for e in plan.errors
        if f"No local registry for run_id={run_id}" not in e
    ]

    if not execute:
        result = CleanupResult(
            run_id=run_id,
            dry_run=True,
            deleted={},
            plan=plan.to_dict(),
            errors=list(plan.errors),
        )
        _write_cleanup_report(result, out_dir)
        return result

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

    try:
        require_cleanup_gates(
            execute=True,
            confirm=confirm,
            confirm_cleanup=confirm_cleanup,
            simulation_id=run_id,
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

    if not plan.targets and not plan.attendees_patches:
        result = CleanupResult(
            run_id=run_id,
            dry_run=True,
            deleted={},
            plan=plan.to_dict(),
            errors=["Cleanup refused: merged profile registries have no deletable targets"],
        )
        _write_cleanup_report(result, out_dir)
        return result

    if client is None:
        client = AirtableClient(allow_writes=True)
    else:
        client.allow_writes = True

    deleted: dict[str, list[str]] = {}
    errors: list[str] = []

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
        if (
            table in REFERENCE_TABLES
            and table not in REGISTRY_DELETABLE_REFERENCE_TABLES
        ):
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
        if table in REFERENCE_TABLES and table not in REGISTRY_DELETABLE_REFERENCE_TABLES:
            warnings.append(
                f"Registry references {table!r} — skipping (never deleted by cleanup)"
            )
            continue
        if table in REGISTRY_DELETABLE_REFERENCE_TABLES:
            warnings.append(
                f"Registry lists {len(ids)} sim-created {table!r} "
                "record(s) — cleanup will delete only those IDs"
            )
        elif table not in TRANSACTIONAL_TABLES:
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

    # SC-169: Automation 066/058 unlocks are not writer-registry rows. After
    # Enrollment delete they orphan with empty Enrollment links but retain
    # Milestone Source Key SHOT_MILESTONE|{enr}|… / PERFECT_WEEK|{enr}|….
    # Do not query Unlocks via Enrollment Record ID (field does not exist).
    if client is not None and reg.enrollment_id:
        try:
            from .unlock_cascade_query import list_unlocks_for_enrollment

            unlock_rows = list_unlocks_for_enrollment(
                client.list_records,
                reg.enrollment_id,
            )
            unlock_ids = [str(r.get("id") or "") for r in unlock_rows if r.get("id")]
            if unlock_ids:
                targets.setdefault("Athlete Achievement Unlocks", [])
                for uid in unlock_ids:
                    if uid not in targets["Athlete Achievement Unlocks"]:
                        targets["Athlete Achievement Unlocks"].append(uid)
                warnings.append(
                    f"SC-169: added {len(unlock_ids)} unlock(s) via Milestone Source Key "
                    f"for enrollment {reg.enrollment_id} (automation-created, not registry)"
                )
        except Exception as exc:  # noqa: BLE001
            warnings.append(f"SC-169 unlock Source Key scan skipped: {exc}")

    marker = run_marker(run_id)
    warnings.append(
        f"Primary targeting uses local registry; marker {marker!r} is secondary evidence"
    )

    # Attendees patches: reverse only when the meeting is *not* also deleted
    # (sim-created meetings in registry are deleted wholesale).
    patches_raw = list((reg.meta or {}).get("zoom_attendees_patches") or [])
    sim_meeting_ids = set(targets.get("Zoom Meetings") or [])
    patches = [
        p
        for p in patches_raw
        if (p.get("meeting_id") or "") not in sim_meeting_ids
    ]
    if patches:
        warnings.append(
            f"{len(patches)} Zoom Meetings.Attendees patch(es) on non-sim meetings — "
            "cleanup will reverse enrollment from Attendees"
        )
    skipped_sim_patches = len(patches_raw) - len(patches)
    if skipped_sim_patches:
        warnings.append(
            f"{skipped_sim_patches} Attendees patch(es) skipped — "
            "sim-created Zoom Meetings will be deleted instead"
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

    # Automation descendants (XP / streaks / email) for all enrollments on run.
    enrollment_ids = enrollment_ids_from_registry(reg) if not errors else []
    if client is not None and enrollment_ids:
        descendants, desc_warnings = discover_automation_descendants(
            client,
            run_id=run_id,
            enrollment_ids=enrollment_ids,
        )
        for table, ids in descendants.items():
            targets.setdefault(table, [])
            for rid in ids:
                if rid not in targets[table]:
                    targets[table].append(rid)
        warnings.extend(desc_warnings)

    protected_errors = assert_no_protected_delete_targets(targets)
    errors.extend(protected_errors)

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
        if (
            table in REFERENCE_TABLES
            and table not in REGISTRY_DELETABLE_REFERENCE_TABLES
        ):
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
