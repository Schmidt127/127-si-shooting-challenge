#!/usr/bin/env python3
"""FUT-002 read-only Airtable field inventory (schema snapshot + repo grep).

Uses prod schema markdown under airtable/schema/snapshots/ — no live Airtable API.
Outputs JSON summary for docs/audits/fut-002-unused-field-inventory.json.

Usage:
  python tools/airtable/fut_002_field_inventory.py
  python tools/airtable/fut_002_field_inventory.py --out docs/audits/fut-002-unused-field-inventory.json
"""
from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from dataclasses import dataclass, field as dc_field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REPO = Path(__file__).resolve().parents[2]
DEFAULT_SNAPSHOT = (
    REPO
    / "airtable/schema/snapshots/prod-20260819"
    / "schema_doc_appn84sqPw03zEbTT_20260819_184903.md"
)

SCAN_GROUPS: dict[str, list[Path]] = {
    "automation": [REPO / "airtable/automations/shooting-challenge"],
    "extension_audit": [REPO / "airtable/extension-scripts/audits"],
    "extension_backfill": [REPO / "airtable/extension-scripts/safe-backfills"],
    "web": [REPO / "web/lib/airtable", REPO / "web/lib/data"],
    "tools": [REPO / "tools/airtable", REPO / "tools/testing", REPO / "lib"],
    "make_legacy": [REPO / "make"],
    "docs": [REPO / "docs"],
    "lambda": [REPO / "lambda"],
}

ACTIVE_GROUPS = {"automation", "web", "tools", "lambda"}
HISTORICAL_GROUPS = {"extension_audit", "extension_backfill", "make_legacy", "docs"}

SKIP_FILE_PARTS = {
    "node_modules",
    ".next",
    "_preview",
    "overnight/",
    "fut-002-unused-field-inventory.json",
    "fut_002_field_inventory.py",
}

LEGACY_FIELD_NAMES: set[str] = {
    "Google Drive File URL",
    "Google Drive File ID",
    "Google Drive Folder ID",
    "Google Drive Folder URL",
    "Google Drive Folder Name",
    "Google Drive View URL",
    "Google Drive Download URL",
    "Create Google Drive File Name",
    "Root Google Drive Folder ID",
    "Root Google Drive Folder Link",
    "Submission Asset: Google Drive File URL (lookup)",
    "Submission Asset: Google Drive File ID (lookup)",
    "Submitted Asset File Links",
    "Submitted Asset File IDs",
}

DRIVE_NAME_KEEP: set[str] = {"Video URL or Drive Link"}

DUPLICATE_PAIRS: list[tuple[str, str, str]] = [
    (
        "Canonical File URL",
        "Google Drive File URL",
        "S3/Lambda canonical URL supersedes Drive File URL on Submission Assets",
    ),
    (
        "Reviewer File URL",
        "Google Drive View URL",
        "Parent homework email uses Reviewer File URL (071 v4.1); Drive View is legacy lookup",
    ),
    (
        "Storage Key",
        "Google Drive File ID",
        "Storage Key is upload dedupe/writeback identity; Drive File ID is legacy",
    ),
    (
        "Formatted Upload Name",
        "Create Google Drive File Name",
        "C-013 rename target; Create Google Drive File Name is legacy label",
    ),
]

DO_NOT_DELETE_NAMES: set[str] = {
    "Video URL or Drive Link",
    "Reviewer File URL",
    "Canonical File URL",
    "Storage Key",
    "Storage Bucket",
    "Reviewer Access Token",
    "Writeback Complete?",
    "Upload Status",
    "Airtable Attachment",
    "Send to Make Trigger",
    "Source Key",
    "Asset Key",
}

TABLE_HEADER_RE = re.compile(r"^## Table: \*\*(.+?)\*\*")
FIELD_HEADER_RE = re.compile(r"^- \*\*(.+?)\*\*")
FIELD_META_RE = re.compile(r"^  - (id|type|role|primary|desc): `?(.+?)`?$")
DEP_LINE_RE = re.compile(
    r"^- \*\*(.+?)\*\* → \*\*(.+?)\*\* \(`(.+?)`\)(?: depends on: (.+)| uses .+?linkedField=`(.+?)`)?"
)
BACKTICK_FIELD_RE = re.compile(r"`([^`]+)`")
COMMENT_LINE_RE = re.compile(r"^\s*(\*|//|/\*)")


@dataclass
class FieldRecord:
    table: str
    name: str
    field_id: str = ""
    field_type: str = ""
    role: str = ""
    depends_on: list[str] = dc_field(default_factory=list)
    depended_by: list[str] = dc_field(default_factory=list)
    references: dict[str, list[str]] = dc_field(default_factory=dict)
    classification: str = "unknown"
    notes: list[str] = dc_field(default_factory=list)


def should_skip_file(rel: str) -> bool:
    return any(part in rel for part in SKIP_FILE_PARTS)


def parse_schema_doc(path: Path) -> tuple[dict[str, list[FieldRecord]], dict[str, FieldRecord]]:
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()

    tables: dict[str, list[FieldRecord]] = {}
    index: dict[str, FieldRecord] = {}
    current_table: str | None = None
    current_field: FieldRecord | None = None

    for line in lines:
        tm = TABLE_HEADER_RE.match(line)
        if tm:
            current_table = tm.group(1).strip()
            tables.setdefault(current_table, [])
            current_field = None
            continue

        if line.startswith("## Dependencies"):
            current_table = None
            current_field = None
            continue

        if line.startswith("## ") and not line.startswith("## Table:"):
            current_table = None
            current_field = None
            continue

        if current_table is None:
            continue

        fm = FIELD_HEADER_RE.match(line)
        if fm:
            current_field = FieldRecord(table=current_table, name=fm.group(1).strip())
            tables[current_table].append(current_field)
            index[f"{current_table}::{current_field.name}"] = current_field
            continue

        if current_field is not None:
            mm = FIELD_META_RE.match(line)
            if mm:
                key, val = mm.group(1), mm.group(2).strip()
                if key == "id":
                    current_field.field_id = val
                elif key == "type":
                    current_field.field_type = val
                elif key == "role":
                    current_field.role = val

    in_deps = False
    for line in lines:
        if line.startswith("## Dependencies"):
            in_deps = True
            continue
        if in_deps and line.startswith("## ") and not line.startswith("## Dependencies"):
            break
        if not in_deps:
            continue
        dm = DEP_LINE_RE.match(line)
        if not dm:
            continue
        table, fname, _ftype, deps_rest, linked = dm.groups()
        key = f"{table.strip()}::{fname.strip()}"
        rec = index.get(key)
        if not rec:
            continue
        if deps_rest:
            dep_names = BACKTICK_FIELD_RE.findall(deps_rest)
            rec.depends_on.extend(dep_names)
            for dep in dep_names:
                dep_key = f"{table.strip()}::{dep}"
                if dep_key in index:
                    index[dep_key].depended_by.append(fname.strip())
        elif linked:
            rec.depends_on.append(linked.strip())
            dep_key = f"{table.strip()}::{linked.strip()}"
            if dep_key in index:
                index[dep_key].depended_by.append(fname.strip())

    return tables, index


def iter_scan_files(root: Path) -> list[Path]:
    if not root.exists():
        return []
    out: list[Path] = []
    for p in root.rglob("*"):
        if not p.is_file():
            continue
        if p.suffix.lower() not in {".js", ".ts", ".tsx", ".py", ".md", ".json", ".mjs"}:
            continue
        rel = p.relative_to(REPO).as_posix()
        if should_skip_file(rel):
            continue
        out.append(p)
    return out


def line_has_code_reference(line: str, field_name: str) -> bool:
    if field_name not in line:
        return False
    if COMMENT_LINE_RE.match(line):
        return False
    if "Do not" in line and "Google Drive" in field_name:
        return False
    if "legacy" in line.lower() and field_name in LEGACY_FIELD_NAMES:
        return False
    return True


def build_file_cache() -> dict[str, tuple[str, str]]:
    """rel path -> (group, content)"""
    cache: dict[str, tuple[str, str]] = {}
    for group, roots in SCAN_GROUPS.items():
        for root in roots:
            for fpath in iter_scan_files(root):
                rel = fpath.relative_to(REPO).as_posix()
                if rel in cache:
                    continue
                try:
                    content = fpath.read_text(encoding="utf-8", errors="replace")
                except OSError:
                    continue
                cache[rel] = (group, content)
    return cache


def scan_field_references(
    field_names: list[str], file_cache: dict[str, tuple[str, str]]
) -> dict[str, dict[str, list[str]]]:
    refs: dict[str, dict[str, list[str]]] = defaultdict(lambda: defaultdict(list))

    for rel, (group, content) in file_cache.items():
        for name in field_names:
            if name not in content:
                continue
            if group == "automation":
                code_hit = any(
                    line_has_code_reference(line, name)
                    for line in content.splitlines()
                )
                if not code_hit:
                    continue
            refs[name][group].append(rel)

    for name, groups in refs.items():
        for g, paths in groups.items():
            refs[name][g] = sorted(set(paths))

    return refs


def classify_field(rec: FieldRecord, refs: dict[str, list[str]]) -> tuple[str, list[str]]:
    notes: list[str] = []
    name = rec.name

    active_groups = [g for g in refs if g in ACTIVE_GROUPS]
    historical_groups = [g for g in refs if g in HISTORICAL_GROUPS]
    has_active = bool(active_groups)
    has_historical = bool(historical_groups)

    if name in DRIVE_NAME_KEEP or name in DO_NOT_DELETE_NAMES:
        return "active", notes + (["protected infrastructure"] if name in DO_NOT_DELETE_NAMES else [])

    for canonical, dupe, reason in DUPLICATE_PAIRS:
        if name == dupe:
            return "duplicate", notes + [f"Superseded by {canonical}: {reason}"]

    is_drive_legacy = name in LEGACY_FIELD_NAMES or (
        "google drive" in name.lower() and name not in DRIVE_NAME_KEEP
    )

    if is_drive_legacy:
        if has_active:
            notes.append(f"legacy storage field; stale code/doc mention in: {', '.join(active_groups)}")
        if rec.depended_by:
            notes.append(f"schema depended-by: {', '.join(rec.depended_by[:4])}")
        return "legacy", notes

    if has_active:
        return "active", notes + [f"refs: {', '.join(active_groups)}"]

    if rec.field_type in {"formula", "multipleLookupValues", "rollup", "count"} or rec.role in {
        "formula",
        "lookup",
        "rollup",
        "count",
    }:
        if rec.depended_by:
            return "active", notes + ["schema computed field depended on by other fields"]
        if rec.depends_on and not has_historical:
            return "unknown", notes + ["computed field with no repo reference"]

    if rec.field_type == "multipleRecordLinks" or rec.role == "link":
        return "active", notes + ["link field — treat as active until interface audit"]

    if has_historical and not has_active:
        return "unknown", notes + [f"historical refs only: {', '.join(historical_groups)}"]

    if not refs and not rec.depends_on and not rec.depended_by:
        return "unknown", notes + ["no repo or schema dependency hits"]

    return "unknown", notes


def field_summary(rec: FieldRecord) -> dict[str, Any]:
    return {
        "field": rec.name,
        "fieldId": rec.field_id,
        "type": rec.field_type,
        "classification": rec.classification,
        "evidence": rec.references,
        "dependsOn": rec.depends_on,
        "dependedBy": rec.depended_by,
        "notes": rec.notes,
    }


def safe_delete_candidates(records: list[FieldRecord]) -> list[dict[str, Any]]:
    out = []
    for rec in records:
        if rec.name in DO_NOT_DELETE_NAMES:
            continue
        if rec.classification not in {"legacy", "duplicate"}:
            continue
        if rec.depended_by:
            continue
        out.append(
            {
                "table": rec.table,
                "field": rec.name,
                "fieldId": rec.field_id,
                "type": rec.field_type,
                "classification": rec.classification,
            }
        )
    return sorted(out, key=lambda x: (x["table"], x["field"]))


def blocked_delete(records: list[FieldRecord]) -> list[dict[str, Any]]:
    out = []
    seen: set[tuple[str, str]] = set()
    for rec in records:
        key = (rec.table, rec.name)
        if key in seen:
            continue
        if rec.name in DO_NOT_DELETE_NAMES:
            seen.add(key)
            out.append({"table": rec.table, "field": rec.name, "reason": "protected infrastructure"})
        elif rec.name == "Asset Key":
            seen.add(key)
            out.append(
                {
                    "table": rec.table,
                    "field": rec.name,
                    "reason": "identity formula — keep; live formula uses RECORD_ID() after Drive File ID removal (2026-08-30)",
                }
            )
        elif rec.classification in {"legacy", "duplicate"} and rec.depended_by:
            seen.add(key)
            out.append(
                {
                    "table": rec.table,
                    "field": rec.name,
                    "reason": f"depended on by: {', '.join(rec.depended_by[:6])}",
                }
            )
    return sorted(out, key=lambda x: (x["table"], x["field"]))


def google_drive_section(records: list[FieldRecord]) -> list[dict[str, Any]]:
    rows = []
    for rec in records:
        nl = rec.name.lower()
        if "google drive" in nl or (nl.endswith("drive link") and rec.name != "Video URL or Drive Link"):
            rows.append(field_summary(rec))
    return sorted(rows, key=lambda x: (x["field"],))


def run(snapshot: Path, out_path: Path | None) -> dict[str, Any]:
    if not snapshot.exists():
        raise SystemExit(f"Snapshot not found: {snapshot}")

    tables, _index = parse_schema_doc(snapshot)
    all_records = [r for rs in tables.values() for r in rs]
    all_names = [r.name for r in all_records]

    file_cache = build_file_cache()
    ref_map = scan_field_references(all_names, file_cache)

    counts: dict[str, int] = defaultdict(int)
    flagged: list[dict[str, Any]] = []

    for rec in all_records:
        rec.references = {k: v for k, v in ref_map.get(rec.name, {}).items()}
        rec.classification, rec.notes = classify_field(rec, rec.references)
        counts[rec.classification] += 1
        if rec.classification in {"legacy", "duplicate", "unknown"}:
            flagged.append({**field_summary(rec), "table": rec.table})

    per_table_summary: dict[str, Any] = {}
    for table, recs in sorted(tables.items()):
        tc: dict[str, int] = defaultdict(int)
        for r in recs:
            tc[r.classification] += 1
        per_table_summary[table] = {
            "fieldCount": len(recs),
            "classificationCounts": dict(tc),
            "flagged": [
                field_summary(r)
                for r in recs
                if r.classification in {"legacy", "duplicate", "unknown"}
            ],
        }

    result: dict[str, Any] = {
        "auditId": "FUT-002",
        "backlogId": "MRW-H01",
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "schemaSnapshot": snapshot.relative_to(REPO).as_posix(),
        "baseId": "appn84sqPw03zEbTT",
        "tableCount": len(tables),
        "fieldCount": len(all_records),
        "classificationCounts": dict(counts),
        "googleDriveFields": google_drive_section(all_records),
        "safeToDeleteLater": safe_delete_candidates(all_records),
        "doNotDelete": blocked_delete(all_records),
        "flaggedFields": flagged,
        "perTable": per_table_summary,
        "methodology": {
            "schemaSource": snapshot.relative_to(REPO).as_posix(),
            "scanGroups": list(SCAN_GROUPS.keys()),
            "activeGroups": sorted(ACTIVE_GROUPS),
            "historicalGroups": sorted(HISTORICAL_GROUPS),
        },
    }

    if out_path:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")

    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="FUT-002 read-only field inventory")
    parser.add_argument("--snapshot", type=Path, default=DEFAULT_SNAPSHOT)
    parser.add_argument(
        "--out",
        type=Path,
        default=REPO / "docs/audits/fut-002-unused-field-inventory.json",
    )
    args = parser.parse_args()

    result = run(args.snapshot, args.out)
    print(
        json.dumps(
            {
                k: result[k]
                for k in (
                    "auditId",
                    "fieldCount",
                    "classificationCounts",
                    "googleDriveFields",
                    "safeToDeleteLater",
                    "doNotDelete",
                )
            },
            indent=2,
        )
    )
    print(f"\nwritten={args.out.as_posix()}")
    print("READ-ONLY — no Airtable writes")


if __name__ == "__main__":
    main()
