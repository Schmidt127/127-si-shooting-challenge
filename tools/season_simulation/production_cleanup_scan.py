"""Production read-only cleanup inventory for preserved SC-001 failed runs."""

from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .cleanup import (
    DELETE_ORDER,
    CleanupPlan,
    assert_no_protected_delete_targets,
    discover_automation_descendants,
    enrollment_ids_from_registry,
    merge_descendants_into_plan,
)
from .constants import SAFE_EMAIL_RECIPIENT, SC001_ATHLETES, TRANSACTIONAL_TABLES
from .run_registry import load_registry, registry_path, run_marker

PRESERVED_FAILED_RUN_ID = "SEASON-SIM-2027-20260913T010724Z-threeathlete"

CANONICAL_ZOOM_MEETING_IDS = frozenset({"recMFP2x5LDqea9ax", "recb9EjQIJVzaRpZa"})


@dataclass
class CleanupForeignCheck:
    ok: bool
    foreign_count: int
    foreign_records: list[dict[str, Any]] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class ProductionCleanupPreview:
    run_id: str
    dry_run: bool
    targets: dict[str, list[str]]
    counts_by_table: dict[str, int]
    total_records: int
    enrollment_ids: list[str]
    foreign_check: dict[str, Any]
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    expected_total: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {
            **asdict(self),
            "counts_by_table": dict(self.counts_by_table),
        }


def _sim_athlete_name_set() -> frozenset[str]:
    return frozenset(f"{a['first_name']} {a['last_name']}" for a in SC001_ATHLETES)


def find_sim_enrollment_ids(client: Any, *, run_id: str) -> list[str]:
    """Locate disposable sim enrollments by name + allowlist email + run marker."""
    list_records = getattr(client, "list_records", None)
    if not callable(list_records):
        return []

    ids: list[str] = []
    marker = run_marker(run_id)

    for athlete in SC001_ATHLETES:
        first = athlete["first_name"]
        last = athlete["last_name"]
        formula = (
            f"AND({{Athlete First Name}}='{first}', {{Athlete Last Name}}='{last}', "
            f"{{Parent Email}}='{SAFE_EMAIL_RECIPIENT}')"
        )
        try:
            rows = list_records(
                "Enrollments",
                fields=["Athlete First Name", "Athlete Last Name", "Parent Email"],
                formula=formula,
                max_records=5,
            )
        except Exception:  # noqa: BLE001
            continue
        for row in rows or []:
            rid = str(row.get("id") or "")
            if rid.startswith("rec") and rid not in ids:
                ids.append(rid)

    # Submissions with run marker → enrollment link
    try:
        subs = list_records(
            "Submissions",
            fields=["Enrollment", "Video Upload Note"],
            formula=f'FIND("{marker}", {{Video Upload Note}} & "")',
            max_records=500,
        )
    except Exception:
        subs = []

    get_record = getattr(client, "get_record", None)
    for sub in subs or []:
        for eid in _link_ids((sub.get("fields") or {}).get("Enrollment")):
            if eid not in ids:
                ids.append(eid)

    return ids


def _link_ids(value: Any) -> list[str]:
    if not value:
        return []
    if isinstance(value, list):
        out: list[str] = []
        for item in value:
            if isinstance(item, str) and item.startswith("rec"):
                out.append(item)
            elif isinstance(item, dict) and str(item.get("id") or "").startswith("rec"):
                out.append(str(item["id"]))
        return out
    return []


def scan_table_by_enrollment(
    client: Any,
    *,
    table: str,
    enrollment_ids: list[str],
    run_id: str,
) -> list[str]:
    list_records = getattr(client, "list_records", None)
    if not callable(list_records):
        return []

    marker = run_marker(run_id)
    found: list[str] = []

    if table == "Enrollments":
        return list(enrollment_ids)

    if table == "Athletes":
        for eid in enrollment_ids:
            try:
                enr = client.get_record("Enrollments", eid)
            except Exception:  # noqa: BLE001
                continue
            for aid in _link_ids((enr.get("fields") or {}).get("Athlete")):
                if aid not in found:
                    found.append(aid)
        return found

    enrollment_field = "Enrollment"
    if table in ("XP Events", "Weekly Athlete Summary", "Video Feedback", "Streak Occurrences"):
        pass
    elif table == "Homework Completions":
        enrollment_field = "Enrollment"
    elif table == "Submissions":
        enrollment_field = "Enrollment"
    elif table == "Submission Assets":
        enrollment_field = "Submission"
        # resolve via submission enrollment below
    elif table == "Zoom Attendance":
        enrollment_field = "Enrollment"
    elif table == "Email Handoff Queue":
        enrollment_field = "Enrollment Record ID"

    for eid in enrollment_ids:
        formulas: list[str] = []
        if table == "Email Handoff Queue":
            formulas.append(f"FIND('{eid}', {{Enrollment Record ID}} & '')")
            formulas.append(f'FIND("{marker}", {{Handoff Key}} & "")')
        elif table == "Submission Assets":
            formulas.append(f"FIND('{eid}', ARRAYJOIN({{Enrollment}}))")
        elif table == "Submissions":
            formulas.append(f"FIND('{eid}', ARRAYJOIN({{Enrollment}}))")
            formulas.append(f'FIND("{marker}", {{Video Upload Note}} & "")')
        elif table == "XP Events":
            formulas.append(f"FIND('{eid}', ARRAYJOIN({{Enrollment}}))")
            formulas.append(f'FIND("{marker}", {{XP Reason Debug}} & "")')
        else:
            formulas.append(f"FIND('{eid}', ARRAYJOIN({{{enrollment_field}}}))")

        for formula in formulas:
            try:
                rows = list_records(table, formula=formula, max_records=500)
            except Exception:  # noqa: BLE001
                continue
            for row in rows or []:
                rid = str(row.get("id") or "")
                if rid.startswith("rec") and rid not in found:
                    # Submission Assets: confirm enrollment scope via submission
                    if table == "Submission Assets":
                        sub_ids = _link_ids((row.get("fields") or {}).get("Submission"))
                        if sub_ids:
                            try:
                                sub = client.get_record("Submissions", sub_ids[0])
                                if eid not in _link_ids((sub.get("fields") or {}).get("Enrollment")):
                                    continue
                            except Exception:  # noqa: BLE001
                                continue
                    found.append(rid)
    return found


def scan_zoom_meetings_disposable(client: Any, *, run_id: str, enrollment_ids: list[str]) -> list[str]:
    """Only sim-created meetings (never canonical Production zoom)."""
    list_records = getattr(client, "list_records", None)
    if not callable(list_records):
        return []

    marker = run_marker(run_id)
    found: list[str] = []
    try:
        rows = list_records(
            "Zoom Meetings",
            fields=["Meeting Name", "Notes"],
            formula=f'FIND("{marker}", {{Notes}} & "")',
            max_records=50,
        )
    except Exception:
        return []
    for row in rows or []:
        rid = str(row.get("id") or "")
        if rid in CANONICAL_ZOOM_MEETING_IDS:
            continue
        if rid.startswith("rec") and rid not in found:
            found.append(rid)
    return found


def validate_cleanup_foreign_records(
    client: Any,
    *,
    targets: dict[str, list[str]],
    enrollment_ids: list[str],
) -> CleanupForeignCheck:
    """Ensure delete set contains only sim disposable data."""
    foreign: list[dict[str, Any]] = []
    errors: list[str] = []
    sim_names = _sim_athlete_name_set()
    get_record = getattr(client, "get_record", None)

    if not callable(get_record):
        return CleanupForeignCheck(ok=True, foreign_count=0, errors=["no get_record — skipped foreign validation"])

    for eid in enrollment_ids:
        try:
            enr = client.get_record("Enrollments", eid)
        except Exception as exc:  # noqa: BLE001
            errors.append(f"Cannot read enrollment {eid}: {exc}")
            continue
        ef = enr.get("fields") or {}
        email = str(ef.get("Parent Email") or "").strip().lower()
        if email != SAFE_EMAIL_RECIPIENT.lower():
            foreign.append({"table": "Enrollments", "id": eid, "reason": f"email {email!r}"})
        name = f"{ef.get('Athlete First Name', '')} {ef.get('Athlete Last Name', '')}".strip()
        if name not in sim_names:
            foreign.append({"table": "Enrollments", "id": eid, "reason": f"name {name!r}"})

    for rid in targets.get("Zoom Meetings") or []:
        if rid in CANONICAL_ZOOM_MEETING_IDS:
            foreign.append(
                {"table": "Zoom Meetings", "id": rid, "reason": "canonical Production meeting"}
            )

    for table in targets:
        if table not in TRANSACTIONAL_TABLES and table != "Zoom Meetings":
            foreign.append({"table": table, "id": "(table)", "reason": "non-transactional table in targets"})

    ok = not foreign and not errors
    return CleanupForeignCheck(
        ok=ok,
        foreign_count=len(foreign),
        foreign_records=foreign,
        errors=errors,
    )


def build_production_cleanup_preview(
    client: Any,
    *,
    run_id: str,
    registry_dir: Path | None = None,
) -> ProductionCleanupPreview:
    """Read-only deletion inventory from Production + optional local registry."""
    warnings: list[str] = []
    errors: list[str] = []
    targets: dict[str, list[str]] = {t: [] for t in DELETE_ORDER}

    enrollment_ids = find_sim_enrollment_ids(client, run_id=run_id)
    if not enrollment_ids:
        errors.append(f"No sim enrollments found for run {run_id!r}")

    if registry_dir is not None:
        from .cleanup import three_athlete_registry_run_ids

        for reg_id in three_athlete_registry_run_ids(run_id):
            rpath = registry_path(registry_dir, reg_id)
            if not rpath.exists():
                continue
            try:
                reg = load_registry(registry_dir, reg_id)
                for eid in enrollment_ids_from_registry(reg):
                    if eid not in enrollment_ids:
                        enrollment_ids.append(eid)
                for table, ids in reg.ids_by_table().items():
                    targets.setdefault(table, [])
                    for rid in ids:
                        if rid not in targets[table]:
                            targets[table].append(rid)
            except Exception as exc:  # noqa: BLE001
                warnings.append(f"Registry {reg_id}: {exc}")

    submission_ids: list[str] = []
    for table in DELETE_ORDER:
        scanned = scan_table_by_enrollment(
            client, table=table, enrollment_ids=enrollment_ids, run_id=run_id
        )
        targets.setdefault(table, [])
        for rid in scanned:
            if rid not in targets[table]:
                targets[table].append(rid)
            if table == "Submissions" and rid not in submission_ids:
                submission_ids.append(rid)

    # Second pass: descendants keyed off Submission (HC / assets / VF may lack Enrollment link).
    if submission_ids:
        list_records = getattr(client, "list_records", None)
        if callable(list_records):
            for sid in submission_ids:
                for table, field in (
                    ("Homework Completions", "Submissions - Linked"),
                    ("Submission Assets", "Submission"),
                    ("Video Feedback", "Submission"),
                ):
                    try:
                        rows = list_records(
                            table,
                            formula=f"FIND('{sid}', ARRAYJOIN({{{field}}}))",
                            max_records=100,
                        )
                    except Exception:  # noqa: BLE001
                        continue
                    for row in rows or []:
                        rid = str(row.get("id") or "")
                        if rid.startswith("rec"):
                            targets.setdefault(table, [])
                            if rid not in targets[table]:
                                targets[table].append(rid)
                try:
                    was_rows = list_records(
                        "Weekly Athlete Summary",
                        formula=f"FIND('{sid}', ARRAYJOIN({{Submissions}}))",
                        max_records=50,
                    )
                except Exception:  # noqa: BLE001
                    was_rows = []
                for row in was_rows or []:
                    rid = str(row.get("id") or "")
                    if rid.startswith("rec"):
                        targets.setdefault("Weekly Athlete Summary", [])
                        if rid not in targets["Weekly Athlete Summary"]:
                            targets["Weekly Athlete Summary"].append(rid)

    zm = scan_zoom_meetings_disposable(client, run_id=run_id, enrollment_ids=enrollment_ids)
    for rid in zm:
        if rid not in targets.setdefault("Zoom Meetings", []):
            targets["Zoom Meetings"].append(rid)

    if enrollment_ids:
        descendants, desc_warnings = discover_automation_descendants(
            client,
            run_id=run_id,
            enrollment_ids=enrollment_ids,
        )
        plan_stub = CleanupPlan(
            run_id=run_id,
            dry_run=True,
            targets=targets,
            skipped_reference_tables=[],
        )
        merge_descendants_into_plan(plan_stub, descendants)
        targets = plan_stub.targets
        warnings.extend(desc_warnings)

    targets = {k: v for k, v in targets.items() if v}
    protected = assert_no_protected_delete_targets(targets)
    errors.extend(protected)

    foreign = validate_cleanup_foreign_records(
        client, targets=targets, enrollment_ids=enrollment_ids
    )
    if not foreign.ok:
        errors.extend(foreign.errors)
        for fr in foreign.foreign_records:
            errors.append(f"Foreign: {fr}")

    counts = {t: len(targets.get(t) or []) for t in DELETE_ORDER if targets.get(t)}
    total = sum(counts.values())

    return ProductionCleanupPreview(
        run_id=run_id,
        dry_run=True,
        targets=targets,
        counts_by_table=counts,
        total_records=total,
        enrollment_ids=enrollment_ids,
        foreign_check=foreign.to_dict(),
        warnings=warnings,
        errors=errors,
        expected_total=total,
    )


def write_cleanup_preview_report(preview: ProductionCleanupPreview, out_dir: Path) -> dict[str, str]:
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    safe_rid = re.sub(r"[^\w-]", "_", preview.run_id)[:80]
    json_path = out_dir / f"cleanup-preview-{safe_rid}-{stamp}.json"
    json_path.write_text(json.dumps(preview.to_dict(), indent=2) + "\n", encoding="utf-8")
    return {"json": str(json_path)}


__all__ = [
    "PRESERVED_FAILED_RUN_ID",
    "ProductionCleanupPreview",
    "build_production_cleanup_preview",
    "write_cleanup_preview_report",
]
