"""Read-only Production readiness checks for SC-SEASON-SIM-001 clean rerun.

Used after Mike publishes Automation 042 v4.1.3 — must PASS before cleanup/execute.
"""

from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .clock_override import formula_text_has_season_sim_gate
from .constants import (
    DEFAULT_BASE_ID,
    SAFE_EMAIL_RECIPIENT,
    SC001_ATHLETES,
)
from .formula_lifecycle import MONITORED_FORMULA_FIELDS, verify_formula_state
from .run_registry import run_marker

# Pin set for post-042 clean rerun (read-only Automations table verify).
RERUN_REQUIRED_AUTOMATION_VERSIONS: dict[str, str] = {
    "042": "4.1.3",
    "053": "5.6",
    "076": "8.15",
    "101": "6.9",
}

PRESERVED_FAILED_RUN_ID = "SEASON-SIM-2027-20260913T010724Z-threeathlete"

EFFECTIVE_ZOOM_FIELD = "Effective Zoom Gate Meetings"
ZOOM_GATE_FORMULA_FIELDS = (
    "Meets Gate: Zoom Meetings",
    "Gate Debug Summary",
    "Public Missing Zoom",
)

AUTOMATIONS_TABLE = "Automations"


def _extract_version(code: str) -> str:
    if not code:
        return ""
    if "File too large" in code and "version" in code.lower():
        m = re.search(r"version\s+([\d.]+)", code, re.I)
        return m.group(1) if m else ""
    for pat in (
        r'const CONFIG[\s\S]*?version:\s*["\']v?([\d.]+)["\']',
        r'version:\s*["\']([\d.]+)["\']',
        r'\*\s*Version:\s*([\d.]+)',
        r'Version:\s*([\d.]+)',
        r'Last GitHub Update:.*\(v([\d.]+)',
    ):
        m = re.search(pat, code)
        if m:
            return m.group(1).lstrip("v")
    return ""


def fetch_production_automation_versions(client: Any) -> dict[str, str]:
    """Read Automations table Name + Automation Code; return {042: '4.1.2', ...}."""
    list_records = getattr(client, "list_records", None)
    if not callable(list_records):
        return {}

    table_id = AUTOMATIONS_TABLE
    meta = getattr(client, "meta_tables", None)
    if callable(meta):
        for t in meta() or []:
            if t.get("name") == AUTOMATIONS_TABLE:
                table_id = str(t.get("id") or AUTOMATIONS_TABLE)
                break

    try:
        rows = list_records(table_id, fields=["Name", "Automation Code", "Status"])
    except Exception:
        rows = list_records(AUTOMATIONS_TABLE, fields=["Name", "Automation Code", "Status"])

    out: dict[str, str] = {}
    for row in rows or []:
        name = str((row.get("fields") or {}).get("Name") or "")
        code = str((row.get("fields") or {}).get("Automation Code") or "")
        m = re.match(r"^(\d{3})\b", name.strip())
        if not m:
            continue
        num = m.group(1)
        ver = _extract_version(code)
        if ver:
            out[num] = ver
    return out


def _field_by_name(meta_tables: list[dict[str, Any]], table: str, name: str) -> dict[str, Any] | None:
    for t in meta_tables:
        if t.get("name") != table:
            continue
        for f in t.get("fields") or []:
            if f.get("name") == name:
                return f
    return None


def verify_effective_zoom_gate_schema(meta_tables: list[dict[str, Any]]) -> dict[str, Any]:
    """Confirm Effective Zoom Gate Meetings + three gate formulas reference it."""
    errors: list[str] = []
    eff = _field_by_name(meta_tables, "Enrollments", EFFECTIVE_ZOOM_FIELD)
    eff_id = ""
    if eff is None:
        errors.append(f"Missing Enrollments.{EFFECTIVE_ZOOM_FIELD}")
    else:
        eff_id = str(eff.get("id") or "")
        if eff.get("type") != "number":
            errors.append(f"{EFFECTIVE_ZOOM_FIELD} must be number, got {eff.get('type')}")
        prec = (eff.get("options") or {}).get("precision")
        if prec not in (0, "0", None):
            errors.append(f"{EFFECTIVE_ZOOM_FIELD} precision must be 0, got {prec!r}")

    for fname in ZOOM_GATE_FORMULA_FIELDS:
        f = _field_by_name(meta_tables, "Enrollments", fname)
        if f is None:
            errors.append(f"Missing Enrollments.{fname}")
            continue
        formula = str((f.get("options") or {}).get("formula") or "")
        has_eff = EFFECTIVE_ZOOM_FIELD in formula or (eff_id and eff_id in formula)
        if not has_eff:
            errors.append(f"{fname} does not reference {EFFECTIVE_ZOOM_FIELD}")

    total = _field_by_name(meta_tables, "Enrollments", "Total Zoom Attendances")
    if total is None:
        errors.append("Missing Enrollments.Total Zoom Attendances")

    return {
        "ok": not errors,
        "effective_field_id": eff_id,
        "errors": errors,
    }


def verify_submission_formulas_production_normal(meta_tables: list[dict[str, Any]]) -> dict[str, Any]:
    """Season Sim temporary gates must NOT be active before cleanup/install."""
    verify = verify_formula_state(
        meta_tables,
        expect_production_normal=True,
        expect_gated=False,
    )
    gated: list[str] = []
    for table, field in MONITORED_FORMULA_FIELDS:
        f = _field_by_name(meta_tables, table, field)
        if f is None:
            continue
        formula = str((f.get("options") or {}).get("formula") or "")
        if formula_text_has_season_sim_gate(formula):
            gated.append(f"{table}.{field}")
    ok = verify.production_normal and not gated and verify.ok
    errors = list(verify.errors)
    if gated:
        errors.append(f"Season Sim temporary gates still active: {gated}")
    return {"ok": ok, "gated_fields": gated, "errors": errors, "verify": verify.to_dict()}


def verify_automation_pins(version_map: dict[str, str]) -> dict[str, Any]:
    mismatches: list[str] = []
    observed: dict[str, str] = {}
    for num, want in RERUN_REQUIRED_AUTOMATION_VERSIONS.items():
        got = version_map.get(num) or ""
        observed[num] = got
        if got != want:
            mismatches.append(f"{num}: got {got!r} want {want!r}")
    return {
        "ok": not mismatches,
        "observed": observed,
        "required": dict(RERUN_REQUIRED_AUTOMATION_VERSIONS),
        "mismatches": mismatches,
    }


def verify_preserved_run_intact(
    client: Any,
    *,
    run_id: str = PRESERVED_FAILED_RUN_ID,
) -> dict[str, Any]:
    """Read-only: preserved failed run enrollment(s) still present."""
    list_records = getattr(client, "list_records", None)
    if not callable(list_records):
        return {"ok": False, "errors": ["No list_records client"], "enrollments": []}

    sim_names = {f"{a['first_name']} {a['last_name']}" for a in SC001_ATHLETES}
    found: list[dict[str, Any]] = []
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
        except Exception as exc:  # noqa: BLE001
            return {"ok": False, "errors": [str(exc)], "enrollments": found}
        for row in rows or []:
            found.append({"id": row.get("id"), "name": f"{first} {last}"})

    # At least one sim enrollment from the preserved run must exist (Perfect executed).
    ok = len(found) >= 1
    errors: list[str] = []
    if not ok:
        errors.append(f"No sim enrollments found for preserved run {run_id!r}")

    # Marker-bearing submissions for this run (read-only count)
    sub_count = 0
    try:
        subs = list_records(
            "Submissions",
            fields=["Video Upload Note"],
            formula=f'FIND("{marker}", {{Video Upload Note}} & "")',
            max_records=500,
        )
        sub_count = len(subs or [])
    except Exception:  # noqa: BLE001
        pass

    return {
        "ok": ok,
        "errors": errors,
        "sim_athlete_names": sorted(sim_names),
        "enrollments_found": found,
        "submissions_with_run_marker": sub_count,
        "run_id": run_id,
    }


def scan_older_run_residue(client: Any, *, exclude_run_id: str) -> dict[str, Any]:
    """Count SEASON-SIM markers for runs other than exclude_run_id (expect 0)."""
    list_records = getattr(client, "list_records", None)
    if not callable(list_records):
        return {"ok": True, "warnings": ["No client — skipped"], "other_runs": {}}

    other: dict[str, int] = {}
    try:
        rows = list_records(
            "Submissions",
            fields=["Video Upload Note"],
            formula='FIND("SEASON-SIM|", {Video Upload Note} & "")',
            max_records=500,
        )
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "errors": [str(exc)], "other_runs": other}

    for row in rows or []:
        note = str((row.get("fields") or {}).get("Video Upload Note") or "")
        m = re.search(r"SEASON-SIM\|([^|\s]+)", note)
        if not m:
            continue
        rid = m.group(1)
        if exclude_run_id in note or rid == exclude_run_id:
            continue
        other[rid] = other.get(rid, 0) + 1

    ok = sum(other.values()) == 0
    return {"ok": ok, "other_runs": other, "total_other_markers": sum(other.values())}


@dataclass
class Post042VerificationReport:
    ok: bool
    generated_at: str
    base_id: str
    preserved_run_id: str
    automation_versions: dict[str, str]
    automation_pins: dict[str, Any]
    zoom_gate_schema: dict[str, Any]
    submission_formulas: dict[str, Any]
    preserved_run: dict[str, Any]
    older_run_residue: dict[str, Any]
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    def summary_text(self) -> str:
        lines = [
            f"Post-042 verification — {'PASS' if self.ok else 'FAIL'}",
            f"Base: {self.base_id}",
            f"Preserved run: {self.preserved_run_id}",
            "",
            "Automation versions:",
        ]
        for num, ver in sorted(self.automation_versions.items()):
            if num in RERUN_REQUIRED_AUTOMATION_VERSIONS:
                want = RERUN_REQUIRED_AUTOMATION_VERSIONS[num]
                mark = "OK" if ver == want else f"WANT {want}"
                lines.append(f"  {num}: {ver} ({mark})")
        lines.append("")
        if self.errors:
            lines.append("Errors:")
            lines.extend(f"  - {e}" for e in self.errors)
        return "\n".join(lines) + "\n"


def run_post_042_verification(
    client: Any,
    *,
    preserved_run_id: str = PRESERVED_FAILED_RUN_ID,
    base_id: str | None = None,
) -> Post042VerificationReport:
    """Single read-only gate — PASS required before cleanup of preserved run."""
    errors: list[str] = []
    warnings: list[str] = []
    bid = base_id or getattr(client, "base_id", None) or DEFAULT_BASE_ID

    meta_tables: list[dict[str, Any]] = []
    getter = getattr(client, "meta_tables", None)
    if callable(getter):
        try:
            meta_tables = list(getter() or [])
        except Exception as exc:  # noqa: BLE001
            errors.append(f"meta_tables failed: {exc}")

    versions = fetch_production_automation_versions(client)
    pins = verify_automation_pins(versions)
    if not pins["ok"]:
        errors.extend(pins["mismatches"])

    zoom = verify_effective_zoom_gate_schema(meta_tables) if meta_tables else {"ok": False, "errors": ["no meta"]}
    if not zoom.get("ok"):
        errors.extend(zoom.get("errors") or [])

    subs = (
        verify_submission_formulas_production_normal(meta_tables)
        if meta_tables
        else {"ok": False, "errors": ["no meta"]}
    )
    if not subs.get("ok"):
        errors.extend(subs.get("errors") or [])

    preserved = verify_preserved_run_intact(client, run_id=preserved_run_id)
    if not preserved.get("ok"):
        errors.extend(preserved.get("errors") or [])

    residue = scan_older_run_residue(client, exclude_run_id=preserved_run_id)
    if not residue.get("ok"):
        errors.append(f"Older run residue detected: {residue.get('other_runs')}")

    ok = not errors
    return Post042VerificationReport(
        ok=ok,
        generated_at=datetime.now(timezone.utc).isoformat(),
        base_id=bid,
        preserved_run_id=preserved_run_id,
        automation_versions=versions,
        automation_pins=pins,
        zoom_gate_schema=zoom,
        submission_formulas=subs,
        preserved_run=preserved,
        older_run_residue=residue,
        errors=errors,
        warnings=warnings,
    )


def write_post_042_verification_report(
    report: Post042VerificationReport,
    out_dir: Path,
) -> dict[str, str]:
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    json_path = out_dir / f"post-042-verification-{stamp}.json"
    md_path = out_dir / f"post-042-verification-{stamp}.md"
    latest_json = out_dir / "post-042-verification-latest.json"
    latest_md = out_dir / "post-042-verification-latest.md"
    json_path.write_text(json.dumps(report.to_dict(), indent=2) + "\n", encoding="utf-8")
    latest_json.write_text(json_path.read_text(encoding="utf-8"), encoding="utf-8")
    md_path.write_text(report.summary_text(), encoding="utf-8")
    latest_md.write_text(md_path.read_text(encoding="utf-8"), encoding="utf-8")
    return {"json": str(json_path), "md": str(md_path), "latest_json": str(latest_json), "latest_md": str(latest_md)}


__all__ = [
    "PRESERVED_FAILED_RUN_ID",
    "RERUN_REQUIRED_AUTOMATION_VERSIONS",
    "Post042VerificationReport",
    "fetch_production_automation_versions",
    "run_post_042_verification",
    "write_post_042_verification_report",
]
