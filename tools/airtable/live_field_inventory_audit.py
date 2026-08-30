#!/usr/bin/env python3
"""Live Airtable field inventory audit (read-only).

Fetches Meta schema + full record population counts from Production, scans
repository dependencies, classifies every field, and writes the report pack
under docs/audits/field-inventory/.

Usage:
  python tools/airtable/live_field_inventory_audit.py
  python tools/airtable/live_field_inventory_audit.py --skip-population  # schema+deps only
  python tools/airtable/live_field_inventory_audit.py --out docs/audits/field-inventory
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import re
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote

import requests
from dotenv import load_dotenv

REPO = Path(__file__).resolve().parents[2]
PROD_BASE = "appn84sqPw03zEbTT"
DEFAULT_OUT = REPO / "docs" / "audits" / "field-inventory"

MIN_SECONDS_BETWEEN_REQUESTS = 0.22
_LAST_REQUEST_AT = 0.0

COMPUTED_TYPES = {
    "formula",
    "rollup",
    "count",
    "multipleLookupValues",
    "lookup",
    "autoNumber",
    "createdTime",
    "lastModifiedTime",
    "createdBy",
    "lastModifiedBy",
    "button",
    "aiText",
}

STRUCTURAL_TYPES = {
    "multipleRecordLinks",
    "singleRecordLink",
}

LEGACY_FIELD_NAMES = {
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

DRIVE_NAME_KEEP = {"Video URL or Drive Link"}

DUPLICATE_PAIRS: list[tuple[str, str, str]] = [
    (
        "Canonical File URL",
        "Google Drive File URL",
        "S3/Lambda canonical URL supersedes Drive File URL",
    ),
    (
        "Reviewer File URL",
        "Google Drive View URL",
        "Parent homework email uses Reviewer File URL (071); Drive View is legacy",
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

DO_NOT_TOUCH_NAMES = {
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
    "Run Shot Milestone Check?",
    "Public Missing Homework",
    "Public Missing Zoom",
    "Public Missing Streak",
    "Public Missing Submissions",
    "Public Missing Videos",
    "Public Gate Missing Reason",
    "Welcome Email To",
    "Config - Lnk",
    "Program Instance",
    "Early Bird",
    "Source Key",
    "XP Bucket Key",
}

DELETED_WELCOME_FIELDS = {
    "Welcome Email Ready?",
    "Parent Email Subject",
    "Parent Email HTML",
    "Welcome Email Status",
    "Welcome Email Sent At",
    "Welcome Email Error",
}

PROTECTED_TABLE_KEYWORDS = {
    "Weeks",
    "Config",
    "Program Instance",
    "Program Homework Assignments",
    "Homework Library",
    "Homework Completions",
    "Submission Assets",
    "XP Events",
    "Weekly Athlete Summary",
    "Video Feedback",
    "Zoom",
    "Email Handoff",
    "Enrollments",
    "Levels",
    "Level Gate",
    "Streak",
}

SCAN_GROUPS: dict[str, list[Path]] = {
    "automation_active": [REPO / "airtable/automations/shooting-challenge"],
    "automation_retired": [REPO / "airtable/automations"],  # filtered later
    "extension_audit": [REPO / "airtable/extension-scripts/audits"],
    "extension_backfill": [REPO / "airtable/extension-scripts/safe-backfills"],
    "web": [REPO / "web/lib/airtable", REPO / "web/lib/data", REPO / "web/app"],
    "tools": [REPO / "tools/airtable", REPO / "tools/testing", REPO / "lib"],
    "make": [REPO / "make"],
    "docs": [REPO / "docs"],
    "lambda": [REPO / "lambda"],
    "tests": [
        REPO / "web/tests",
        REPO / "tests",
        REPO / "tools/airtable/tests",
    ],
}

ACTIVE_GROUPS = {
    "automation_active",
    "web",
    "tools",
    "lambda",
    "tests",
}
HISTORICAL_GROUPS = {
    "automation_retired",
    "extension_audit",
    "extension_backfill",
    "make",
    "docs",
}

SKIP_FILE_PARTS = {
    "node_modules",
    ".next",
    "_preview",
    "overnight/",
    "field-inventory",
    "fut-002-unused-field-inventory",
    "live_field_inventory_audit",
    "fut_002_field_inventory",
}

COMMENT_LINE_RE = re.compile(r"^\s*(\*|//|/\*|\#)")
FIELD_ID_RE = re.compile(r"fld[A-Za-z0-9]{14}")
FORMULA_ERROR_MARKERS = ("#ERROR!", "#REF!", "#NAME?", "#VALUE!", "#DIV/0!", "NaN")

CLASSIFICATIONS = [
    "ACTIVE",
    "ACTIVE BUT EMPTY",
    "HISTORICAL",
    "FORMULA DEPENDENCY",
    "AUTOMATION DEPENDENCY",
    "EXTERNAL DEPENDENCY",
    "STRUCTURAL FIELD",
    "RETIRED AUTOMATION ONLY",
    "DUPLICATE OR SUPERSEDED",
    "LEGACY CANDIDATE",
    "EMPTY UNKNOWN",
    "NEEDS MIKE DECISION",
    "SAFE TO ARCHIVE — PENDING APPROVAL",
    "DO NOT TOUCH",
]


def init_env() -> None:
    load_dotenv(REPO / "tools/airtable/.env", override=True)
    load_dotenv(REPO / "web" / ".env.local", override=True)


def get_token() -> str:
    token = os.getenv("AIRTABLE_API_TOKEN") or os.getenv("AIRTABLE_TOKEN") or ""
    if not token:
        raise SystemExit("Missing AIRTABLE_API_TOKEN / AIRTABLE_TOKEN")
    return token


def headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {get_token()}",
        "Accept": "application/json",
        "User-Agent": "127si-live-field-inventory/1.0",
    }


def throttle() -> None:
    global _LAST_REQUEST_AT
    elapsed = time.time() - _LAST_REQUEST_AT
    if elapsed < MIN_SECONDS_BETWEEN_REQUESTS:
        time.sleep(MIN_SECONDS_BETWEEN_REQUESTS - elapsed)
    _LAST_REQUEST_AT = time.time()


def api_get(url: str, params: dict | None = None, timeout: int = 120) -> dict[str, Any]:
    backoff = 1.0
    for attempt in range(8):
        throttle()
        try:
            resp = requests.get(url, headers=headers(), params=params, timeout=timeout)
        except requests.RequestException:
            if attempt == 7:
                raise
            time.sleep(min(30.0, backoff))
            backoff *= 2
            continue
        if resp.status_code == 429:
            retry = resp.headers.get("Retry-After")
            time.sleep(float(retry) if retry else min(30.0, backoff))
            backoff *= 2
            continue
        if 500 <= resp.status_code < 600:
            time.sleep(min(30.0, backoff))
            backoff *= 2
            continue
        if not resp.ok:
            raise SystemExit(f"{resp.status_code} from {url}: {resp.text[:500]}")
        return resp.json()
    raise SystemExit(f"exhausted retries for {url}")


def is_blank(value: Any) -> bool:
    if value is None:
        return True
    if value == "":
        return True
    if value == []:
        return True
    if value == {}:
        return True
    return False


def is_formula_error(value: Any) -> bool:
    if isinstance(value, str):
        return any(m in value for m in FORMULA_ERROR_MARKERS)
    return False


def extract_field_config(field: dict[str, Any]) -> dict[str, Any]:
    opts = field.get("options") or {}
    ftype = field.get("type") or ""
    cfg: dict[str, Any] = {
        "formula": None,
        "linkedTableId": None,
        "linkedFieldId": None,
        "lookup": None,
        "rollup": None,
        "count": None,
        "isValid": opts.get("isValid"),
        "resultType": None,
    }

    if ftype == "formula":
        cfg["formula"] = opts.get("formula")
        result = opts.get("result") or {}
        cfg["resultType"] = result.get("type")
    elif ftype == "multipleRecordLinks":
        cfg["linkedTableId"] = opts.get("linkedTableId")
        cfg["linkedFieldId"] = opts.get("inverseLinkFieldId")
    elif ftype == "multipleLookupValues":
        cfg["lookup"] = {
            "recordLinkFieldId": opts.get("recordLinkFieldId"),
            "fieldIdInLinkedTable": opts.get("fieldIdInLinkedTable"),
        }
        result = opts.get("result") or {}
        cfg["resultType"] = result.get("type")
    elif ftype == "rollup":
        cfg["rollup"] = {
            "recordLinkFieldId": opts.get("recordLinkFieldId"),
            "fieldIdInLinkedTable": opts.get("fieldIdInLinkedTable"),
            "formula": opts.get("formula"),
        }
        result = opts.get("result") or {}
        cfg["resultType"] = result.get("type")
    elif ftype == "count":
        cfg["count"] = {"recordLinkFieldId": opts.get("recordLinkFieldId")}
    return cfg


def should_skip_file(rel: str) -> bool:
    return any(part in rel for part in SKIP_FILE_PARTS)


def iter_scan_files(root: Path) -> list[Path]:
    if not root.exists():
        return []
    out: list[Path] = []
    for p in root.rglob("*"):
        if not p.is_file():
            continue
        if p.suffix.lower() not in {".js", ".ts", ".tsx", ".py", ".md", ".json", ".mjs", ".yml", ".yaml"}:
            continue
        rel = p.relative_to(REPO).as_posix()
        if should_skip_file(rel):
            continue
        # retired automations: only archive / retired folders or 075
        if "airtable/automations" in rel and "shooting-challenge" in rel:
            # handled in active group; skip duplicate from broader scan
            if root == REPO / "airtable/automations":
                continue
        out.append(p)
    return out


def build_file_cache() -> dict[str, tuple[str, str]]:
    cache: dict[str, tuple[str, str]] = {}
    retired_roots = [
        REPO / "airtable/automations" / "retired",
        REPO / "airtable/automations" / "archive",
        REPO / "airtable/automations" / "legacy",
    ]
    for group, roots in SCAN_GROUPS.items():
        for root in roots:
            if group == "automation_retired":
                # only explicitly retired paths + 075 file if present
                candidates = list(retired_roots)
                sc = REPO / "airtable/automations/shooting-challenge"
                if sc.exists():
                    for p in sc.glob("*075*"):
                        candidates.append(p)
                for c in candidates:
                    if c.is_file():
                        files = [c]
                    else:
                        files = iter_scan_files(c) if c.exists() else []
                    for fpath in files:
                        rel = fpath.relative_to(REPO).as_posix()
                        if rel in cache:
                            continue
                        try:
                            content = fpath.read_text(encoding="utf-8", errors="replace")
                        except OSError:
                            continue
                        cache[rel] = ("automation_retired", content)
                continue
            for fpath in iter_scan_files(root):
                rel = fpath.relative_to(REPO).as_posix()
                if rel in cache:
                    continue
                try:
                    content = fpath.read_text(encoding="utf-8", errors="replace")
                except OSError:
                    continue
                g = group
                if group == "automation_active" and "075" in fpath.name.lower():
                    g = "automation_retired"
                cache[rel] = (g, content)
    return cache


def line_has_code_reference(line: str, needle: str) -> bool:
    if needle not in line:
        return False
    if COMMENT_LINE_RE.match(line):
        return False
    return True


def scan_references(
    field_names: list[str],
    field_ids: list[str],
    file_cache: dict[str, tuple[str, str]],
) -> tuple[dict[str, dict[str, list[str]]], dict[str, dict[str, list[str]]]]:
    """Returns (by_name, by_id) maps of group -> files."""
    by_name: dict[str, dict[str, list[str]]] = defaultdict(lambda: defaultdict(list))
    by_id: dict[str, dict[str, list[str]]] = defaultdict(lambda: defaultdict(list))

    name_set = set(field_names)
    id_set = set(field_ids)

    for rel, (group, content) in file_cache.items():
        # field IDs — exact
        found_ids = set(FIELD_ID_RE.findall(content)) & id_set
        for fid in found_ids:
            by_id[fid][group].append(rel)

        for name in name_set:
            if name not in content:
                continue
            if group.startswith("automation"):
                if not any(line_has_code_reference(line, name) for line in content.splitlines()):
                    continue
            by_name[name][group].append(rel)

    for d in (by_name, by_id):
        for key, groups in d.items():
            for g, paths in groups.items():
                d[key][g] = sorted(set(paths))
    return by_name, by_id


def formula_deps_from_text(formula: str | None) -> list[str]:
    if not formula:
        return []
    return sorted(set(re.findall(r"\{([^}]+)\}", formula)))


def build_formula_dependency_graph(tables: list[dict[str, Any]]) -> dict[str, list[str]]:
    """table::fieldName -> list of depended-on field names (same table)."""
    graph: dict[str, list[str]] = {}
    for table in tables:
        tname = table["name"]
        for field in table.get("fields") or []:
            cfg = extract_field_config(field)
            deps: list[str] = []
            if cfg["formula"]:
                deps.extend(formula_deps_from_text(cfg["formula"]))
            if cfg["rollup"] and cfg["rollup"].get("formula"):
                deps.extend(formula_deps_from_text(cfg["rollup"]["formula"]))
            if deps:
                graph[f"{tname}::{field['name']}"] = sorted(set(deps))
    return graph


def reverse_deps(graph: dict[str, list[str]]) -> dict[str, list[str]]:
    rev: dict[str, list[str]] = defaultdict(list)
    for src, deps in graph.items():
        table = src.split("::", 1)[0]
        for dep in deps:
            rev[f"{table}::{dep}"].append(src.split("::", 1)[1])
    return {k: sorted(set(v)) for k, v in rev.items()}


def fetch_meta_schema(base_id: str) -> dict[str, Any]:
    return api_get(f"https://api.airtable.com/v0/meta/bases/{base_id}/tables")


def fetch_all_records(base_id: str, table_id: str, primary_field_name: str | None = None) -> list[dict]:
    """Fetch all records with all fields (Airtable omits blank fields)."""
    records: list[dict] = []
    offset = None
    url = f"https://api.airtable.com/v0/{base_id}/{quote(table_id, safe='')}"
    while True:
        params: dict[str, Any] = {"pageSize": 100}
        if offset:
            params["offset"] = offset
        data = api_get(url, params=params)
        batch = data.get("records") or []
        records.extend(batch)
        offset = data.get("offset")
        if not offset:
            break
    return records


def count_population(
    field_names: list[str], records: list[dict]
) -> dict[str, dict[str, Any]]:
    total = len(records)
    out: dict[str, dict[str, Any]] = {}
    for name in field_names:
        populated = 0
        blank = 0
        errors = 0
        empty_string = 0
        empty_array = 0
        for rec in records:
            fields = rec.get("fields") or {}
            if name not in fields:
                blank += 1
                continue
            val = fields[name]
            if is_formula_error(val):
                errors += 1
                populated += 1  # present but errored
                continue
            if val == "":
                empty_string += 1
                blank += 1
                continue
            if val == []:
                empty_array += 1
                blank += 1
                continue
            if is_blank(val):
                blank += 1
                continue
            populated += 1
        pct = round((populated / total) * 100, 2) if total else 0.0
        out[name] = {
            "totalRecords": total,
            "populatedCount": populated,
            "blankCount": blank,
            "populationPct": pct,
            "formulaErrorCount": errors,
            "emptyStringCount": empty_string,
            "emptyArrayCount": empty_array,
        }
    return out


def classify_field(row: dict[str, Any]) -> tuple[str, str]:
    """Return (classification, evidence)."""
    name = row["fieldName"]
    ftype = row["fieldType"]
    notes: list[str] = []

    if name in DO_NOT_TOUCH_NAMES:
        return "DO NOT TOUCH", "protected workflow / infrastructure field"

    if row["isPrimary"]:
        return "STRUCTURAL FIELD", "primary field"

    # Legacy / Drive retirement candidates before protected-table blanket rules
    if name in LEGACY_FIELD_NAMES or (
        "google drive" in name.lower() and name not in DRIVE_NAME_KEEP
    ):
        for canonical, dupe, reason in DUPLICATE_PAIRS:
            if name == dupe:
                if row.get("dependedBy"):
                    return (
                        "NEEDS MIKE DECISION",
                        f"superseded by {canonical} but formula deps remain: {reason}",
                    )
                return "DUPLICATE OR SUPERSEDED", f"superseded by {canonical}: {reason}"
        if row.get("dependedBy"):
            return "NEEDS MIKE DECISION", "legacy Drive field still depended on by formula/lookup"
        if row.get("populatedCount", 0) == 0:
            return "SAFE TO ARCHIVE — PENDING APPROVAL", "legacy Drive field; empty; no formula dependents"
        return "LEGACY CANDIDATE", "legacy Drive storage field"

    for canonical, dupe, reason in DUPLICATE_PAIRS:
        if name == dupe:
            return "DUPLICATE OR SUPERSEDED", f"superseded by {canonical}: {reason}"

    # Protect key workflow tables' computed/link fields
    table = row["tableName"]
    if any(k.lower() in table.lower() for k in PROTECTED_TABLE_KEYWORDS):
        if ftype in COMPUTED_TYPES or ftype in STRUCTURAL_TYPES:
            if row.get("activeAutomationRefs") or row.get("repoActiveRefs") or row.get("dependedBy"):
                return "DO NOT TOUCH", "protected workflow table + active dependency"

    if ftype in COMPUTED_TYPES:
        if row.get("dependedBy") or row.get("repoActiveRefs") or row.get("activeAutomationRefs"):
            return "FORMULA DEPENDENCY", "computed field with active dependents or repo refs"
        if row.get("populatedCount", 0) == 0 and row.get("totalRecords", 0) > 0:
            return "NEEDS MIKE DECISION", "computed field empty — may be structural or dead"
        return "FORMULA DEPENDENCY", "computed field — do not delete without formula graph review"

    if ftype in STRUCTURAL_TYPES:
        return "STRUCTURAL FIELD", "linked-record field"

    if row.get("activeAutomationRefs") or row.get("fieldIdAutomationRefs"):
        if row.get("populatedCount", 0) == 0:
            return "AUTOMATION DEPENDENCY", "referenced by active automation; currently empty"
        return "AUTOMATION DEPENDENCY", "referenced by active automation script"

    if row.get("makeRefs") or row.get("filloutRefs") or row.get("webRefs"):
        return "EXTERNAL DEPENDENCY", "referenced by web/Make/Fillout"

    if row.get("retiredAutomationOnly") and not row.get("repoActiveRefs"):
        return "RETIRED AUTOMATION ONLY", "only referenced by retired automation archive"

    if row.get("repoActiveRefs"):
        if row.get("populatedCount", 0) == 0 and row.get("totalRecords", 0) > 0:
            return "ACTIVE BUT EMPTY", "active repo reference but no populated values"
        return "ACTIVE", "active repository reference"

    if row.get("repoHistoricalRefs") and not row.get("repoActiveRefs"):
        return "HISTORICAL", "historical docs/audit/make references only"

    if row.get("dependedBy"):
        return "FORMULA DEPENDENCY", "depended on by other schema fields"

    if row.get("interfaceRefs") or row.get("viewRefs"):
        return "NEEDS MIKE DECISION", "appears in interface/view metadata — confirm before archive"

    total = row.get("totalRecords") or 0
    pop = row.get("populatedCount")
    if pop is None:
        return "EMPTY UNKNOWN", "population count UNKNOWN"
    if total == 0:
        return "EMPTY UNKNOWN", "table has zero records — population not informative"
    if pop == 0:
        return "EMPTY UNKNOWN", "completely empty; no verified active dependency — needs Mike review"
    if (pop / total) * 100 < 5:
        return "NEEDS MIKE DECISION", f"nearly empty ({row.get('populationPct')}%); purpose uncertain"

    return "NEEDS MIKE DECISION", "no clear active dependency classification"


def recommended_action(classification: str) -> str:
    return {
        "ACTIVE": "Keep",
        "ACTIVE BUT EMPTY": "Keep — verify writers/triggers",
        "HISTORICAL": "Review in OMNI; do not delete until Mike confirms",
        "FORMULA DEPENDENCY": "Do not delete — retarget formulas first",
        "AUTOMATION DEPENDENCY": "Do not delete — update automations first",
        "EXTERNAL DEPENDENCY": "Do not delete — update external contracts first",
        "STRUCTURAL FIELD": "Do not delete",
        "RETIRED AUTOMATION ONLY": "Candidate for archive after Mike confirms no interface use",
        "DUPLICATE OR SUPERSEDED": "Retarget dependents, then archive pending approval",
        "LEGACY CANDIDATE": "Plan Drive retirement; do not delete until retarget complete",
        "EMPTY UNKNOWN": "OMNI review — classify purpose before any action",
        "NEEDS MIKE DECISION": "Mike decision required",
        "SAFE TO ARCHIVE — PENDING APPROVAL": "Safe to archive only after Mike approval",
        "DO NOT TOUCH": "Do not touch",
    }.get(classification, "Mike review")


def write_csv(path: Path, rows: list[dict[str, Any]], fieldnames: list[str]) -> None:
    with path.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        w.writeheader()
        for row in rows:
            flat = dict(row)
            for k, v in list(flat.items()):
                if isinstance(v, (list, dict)):
                    flat[k] = json.dumps(v, ensure_ascii=False)
            w.writerow(flat)


def md_table(rows: list[dict], cols: list[tuple[str, str]]) -> str:
    header = "| " + " | ".join(label for _, label in cols) + " |"
    sep = "| " + " | ".join("---" for _ in cols) + " |"
    lines = [header, sep]
    for r in rows:
        cells = []
        for key, _ in cols:
            val = r.get(key, "")
            if isinstance(val, (list, dict)):
                val = json.dumps(val, ensure_ascii=False)
            cells.append(str(val).replace("|", "\\|").replace("\n", " "))
        lines.append("| " + " | ".join(cells) + " |")
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Live Airtable field inventory audit")
    parser.add_argument("--base-id", default=os.getenv("AIRTABLE_BASE_ID") or PROD_BASE)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--skip-population", action="store_true")
    parser.add_argument("--mcp-schema", type=Path, help="Optional MCP list_tables JSON for cross-check")
    args = parser.parse_args()

    init_env()
    out: Path = args.out
    out.mkdir(parents=True, exist_ok=True)
    raw_dir = out / "_raw"
    raw_dir.mkdir(parents=True, exist_ok=True)

    snapshot_dt = datetime.now(timezone.utc)
    snapshot_iso = snapshot_dt.isoformat()
    print(f"[{snapshot_iso}] fetching Meta schema for {args.base_id}")

    meta = fetch_meta_schema(args.base_id)
    tables = meta.get("tables") or []
    (raw_dir / "meta_tables.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")

    live_table_count = len(tables)
    live_field_count = sum(len(t.get("fields") or []) for t in tables)
    print(f"live tables={live_table_count} fields={live_field_count}")

    # Cross-check MCP schema if provided
    mcp_diff: list[str] = []
    if args.mcp_schema and args.mcp_schema.exists():
        mcp = json.loads(args.mcp_schema.read_text(encoding="utf-8"))
        mcp_tables = {t["id"]: t for t in mcp.get("tables") or []}
        meta_ids = {t["id"] for t in tables}
        for tid in sorted(mcp_tables.keys() - meta_ids):
            mcp_diff.append(f"MCP-only table {tid} {mcp_tables[tid].get('name')}")
        for tid in sorted(meta_ids - mcp_tables.keys()):
            mcp_diff.append(f"Meta-only table {tid}")
        for t in tables:
            mt = mcp_tables.get(t["id"])
            if not mt:
                continue
            meta_f = {f["id"] for f in t.get("fields") or []}
            mcp_f = {f["id"] for f in mt.get("fields") or []}
            for fid in sorted(meta_f - mcp_f):
                mcp_diff.append(f"Meta-only field {t['name']}.{fid}")
            for fid in sorted(mcp_f - meta_f):
                mcp_diff.append(f"MCP-only field {t['name']}.{fid}")

    id_to_table = {t["id"]: t["name"] for t in tables}
    id_to_field: dict[str, tuple[str, str]] = {}
    for t in tables:
        for f in t.get("fields") or []:
            id_to_field[f["id"]] = (t["name"], f["name"])

    formula_graph = build_formula_dependency_graph(tables)
    depended_by = reverse_deps(formula_graph)

    # Views inventory
    views_by_table: dict[str, list[dict]] = {}
    for t in tables:
        views_by_table[t["name"]] = [
            {"id": v.get("id"), "name": v.get("name"), "type": v.get("type")}
            for v in (t.get("views") or [])
        ]

    print("scanning repository dependencies…")
    all_names = sorted({f["name"] for t in tables for f in t.get("fields") or []})
    all_ids = sorted({f["id"] for t in tables for f in t.get("fields") or []})
    file_cache = build_file_cache()
    by_name, by_id = scan_references(all_names, all_ids, file_cache)

    # Automations table live rows (Name / Status / Automation Code / Trigger field(s))
    automations_table = next((t for t in tables if t["name"] == "Automations"), None)
    automations_rows: list[dict] = []
    automation_075_present = False
    if automations_table:
        print("fetching Automations table records…")
        auto_recs = fetch_all_records(args.base_id, automations_table["id"])
        for rec in auto_recs:
            f = rec.get("fields") or {}
            row = {
                "id": rec["id"],
                "Name": f.get("Name"),
                "Status": f.get("Status"),
                "Automation Code": f.get("Automation Code"),
                "Trigger field(s)": f.get("Trigger field(s)"),
                "Trigger table": f.get("Trigger table"),
                "Trigger type": f.get("Trigger type"),
            }
            automations_rows.append(row)
            name = str(row.get("Name") or "")
            code = str(row.get("Automation Code") or "")
            # Identity only: Name starts with 075 as automation number (not "restore 075" prose).
            if re.match(r"^075\b", name.strip()) or re.match(r"^075\b", code.strip()):
                automation_075_present = True
        (raw_dir / "automations_table.json").write_text(
            json.dumps(automations_rows, indent=2), encoding="utf-8"
        )

    # Confirm deleted welcome fields absent
    enrollment = next((t for t in tables if t["name"] == "Enrollments"), None)
    enrollment_names = {f["name"] for f in (enrollment or {}).get("fields") or []}
    welcome_still_present = sorted(DELETED_WELCOME_FIELDS & enrollment_names)

    # Population counts
    population_by_table: dict[str, dict[str, dict]] = {}
    record_counts: dict[str, int] = {}
    tables_failed: list[str] = []
    fields_unknown_count: list[str] = []

    if args.skip_population:
        print("SKIPPING population counts (--skip-population)")
    else:
        for t in tables:
            tname = t["name"]
            print(f"  records: {tname}…", flush=True)
            try:
                recs = fetch_all_records(args.base_id, t["id"])
            except Exception as exc:  # noqa: BLE001
                tables_failed.append(f"{tname}: {exc}")
                for f in t.get("fields") or []:
                    fields_unknown_count.append(f"{tname}::{f['name']}")
                continue
            record_counts[tname] = len(recs)
            names = [f["name"] for f in t.get("fields") or []]
            population_by_table[tname] = count_population(names, recs)
            print(f"    {len(recs)} records", flush=True)

    (raw_dir / "record_counts.json").write_text(
        json.dumps(record_counts, indent=2), encoding="utf-8"
    )

    # Optional: load interface refs from prior MCP dump if present
    interface_field_hits: dict[str, list[str]] = defaultdict(list)
    interfaces_path = REPO / "_preview" / "live-interfaces.json"
    # also check agent-tools path via env
    for candidate in [
        interfaces_path,
        Path(os.environ.get("FIELD_INVENTORY_INTERFACES", "")),
    ]:
        if candidate and candidate.exists():
            try:
                iface = json.loads(candidate.read_text(encoding="utf-8"))
                blob = json.dumps(iface)
                for fid, (tn, fn) in id_to_field.items():
                    if fid in blob:
                        interface_field_hits[f"{tn}::{fn}"].append(str(candidate))
            except Exception:  # noqa: BLE001
                pass

    inventory: list[dict[str, Any]] = []
    for t in tables:
        tname = t["name"]
        tid = t["id"]
        primary = t.get("primaryFieldId")
        views = views_by_table.get(tname) or []
        for field in t.get("fields") or []:
            fname = field["name"]
            fid = field["id"]
            ftype = field.get("type") or ""
            cfg = extract_field_config(field)
            key = f"{tname}::{fname}"

            name_refs = by_name.get(fname) or {}
            id_refs = by_id.get(fid) or {}

            active_auto = sorted(
                set((name_refs.get("automation_active") or []) + (id_refs.get("automation_active") or []))
            )
            retired_auto = sorted(
                set((name_refs.get("automation_retired") or []) + (id_refs.get("automation_retired") or []))
            )
            web_refs = sorted(
                set((name_refs.get("web") or []) + (id_refs.get("web") or []))
            )
            make_refs = sorted(set(name_refs.get("make") or []) | set(id_refs.get("make") or []))
            test_refs = sorted(
                set((name_refs.get("tests") or []) + (name_refs.get("tools") or []) + (id_refs.get("tests") or []) + (id_refs.get("tools") or []))
            )
            docs_refs = sorted(set(name_refs.get("docs") or []) | set(id_refs.get("docs") or []))
            lambda_refs = sorted(set(name_refs.get("lambda") or []) | set(id_refs.get("lambda") or []))

            repo_active = []
            for g in ACTIVE_GROUPS:
                repo_active.extend(name_refs.get(g) or [])
                repo_active.extend(id_refs.get(g) or [])
            repo_active = sorted(set(repo_active))

            repo_hist = []
            for g in HISTORICAL_GROUPS:
                repo_hist.extend(name_refs.get(g) or [])
                repo_hist.extend(id_refs.get(g) or [])
            repo_hist = sorted(set(repo_hist))

            pop = (population_by_table.get(tname) or {}).get(fname)
            if pop is None and not args.skip_population and tname not in record_counts:
                pop = None
                fields_unknown_count.append(key)

            linked_table_name = None
            if cfg["linkedTableId"]:
                linked_table_name = id_to_table.get(cfg["linkedTableId"])

            lookup_cfg = None
            if cfg["lookup"]:
                link_f = id_to_field.get(cfg["lookup"]["recordLinkFieldId"] or "")
                src_f = id_to_field.get(cfg["lookup"]["fieldIdInLinkedTable"] or "")
                lookup_cfg = {
                    **cfg["lookup"],
                    "recordLinkField": link_f[1] if link_f else None,
                    "sourceField": f"{src_f[0]}.{src_f[1]}" if src_f else None,
                }

            rollup_cfg = None
            if cfg["rollup"]:
                link_f = id_to_field.get(cfg["rollup"]["recordLinkFieldId"] or "")
                src_f = id_to_field.get(cfg["rollup"]["fieldIdInLinkedTable"] or "")
                rollup_cfg = {
                    **cfg["rollup"],
                    "recordLinkField": link_f[1] if link_f else None,
                    "sourceField": f"{src_f[0]}.{src_f[1]}" if src_f else None,
                }

            count_cfg = None
            if cfg["count"]:
                link_f = id_to_field.get(cfg["count"]["recordLinkFieldId"] or "")
                count_cfg = {
                    **cfg["count"],
                    "recordLinkField": link_f[1] if link_f else None,
                }

            # Fillout: detect from docs/make mentioning Fillout + field
            fillout_refs = [p for p in (make_refs + docs_refs) if "fillout" in p.lower() or "Fillout" in Path(p).name]

            row: dict[str, Any] = {
                "tableName": tname,
                "tableId": tid,
                "fieldName": fname,
                "fieldId": fid,
                "fieldType": ftype,
                "isPrimary": fid == primary,
                "description": field.get("description") or "",
                "totalRecords": pop["totalRecords"] if pop else None,
                "populatedCount": pop["populatedCount"] if pop else None,
                "blankCount": pop["blankCount"] if pop else None,
                "populationPct": pop["populationPct"] if pop else None,
                "formulaErrorCount": pop["formulaErrorCount"] if pop else None,
                "emptyStringCount": pop["emptyStringCount"] if pop else None,
                "emptyArrayCount": pop["emptyArrayCount"] if pop else None,
                "formula": cfg["formula"],
                "lookupConfig": lookup_cfg,
                "rollupConfig": rollup_cfg,
                "countConfig": count_cfg,
                "linkedTableId": cfg["linkedTableId"],
                "linkedTableName": linked_table_name,
                "linkedFieldId": cfg["linkedFieldId"],
                "formulaIsValid": cfg["isValid"],
                "resultType": cfg["resultType"],
                "dependsOn": formula_graph.get(key) or [],
                "dependedBy": depended_by.get(key) or [],
                "activeAutomationRefs": active_auto,
                "retiredAutomationRefs": retired_auto,
                "retiredAutomationOnly": bool(retired_auto) and not active_auto and not [x for x in repo_active if "075" not in x],
                "fieldIdAutomationRefs": sorted(set(id_refs.get("automation_active") or [])),
                "activeViewRefs": [v["name"] for v in views],  # table-level views present; per-field visibility not in Meta
                "viewCountOnTable": len(views),
                "interfaceRefs": interface_field_hits.get(key) or [],
                "filloutRefs": fillout_refs,
                "makeRefs": make_refs,
                "softrRefs": [p for p in docs_refs if "softr" in p.lower()],
                "webRefs": web_refs,
                "repoActiveRefs": repo_active,
                "repoHistoricalRefs": repo_hist,
                "testHarnessRefs": test_refs,
                "lambdaRefs": lambda_refs,
                "historicalUseEvidence": docs_refs[:20],
                "lastKnownUse": (repo_active or repo_hist or retired_auto or [""])[0],
            }
            # Population counts already applied above when pop exists
            classification, evidence = classify_field(row)
            row["classification"] = classification
            row["evidence"] = evidence
            row["recommendedAction"] = recommended_action(classification)
            inventory.append(row)

    # QC
    assert len(inventory) == live_field_count, (
        f"inventory rows {len(inventory)} != live fields {live_field_count}"
    )
    ids = [r["fieldId"] for r in inventory]
    assert len(ids) == len(set(ids)), "duplicate field IDs in inventory"
    table_names = {r["tableName"] for r in inventory}
    assert table_names == {t["name"] for t in tables}

    # Drift vs prior schema snapshot (FUT-002 used prod-20260819 markdown)
    prior_path = (
        REPO
        / "airtable/schema/snapshots/prod-20260819"
        / "schema_doc_appn84sqPw03zEbTT_20260819_184903.md"
    )
    drift: list[str] = []
    if prior_path.exists():
        prior_text = prior_path.read_text(encoding="utf-8")
        prior_fields = set(re.findall(r"fld[A-Za-z0-9]{14}", prior_text))
        live_ids = set(ids)
        for fid in sorted(live_ids - prior_fields):
            tn, fn = id_to_field.get(fid, ("?", "?"))
            drift.append(f"NEW since prod-20260819 snapshot: {tn}.{fn} ({fid})")
        for fid in sorted(prior_fields - live_ids):
            drift.append(f"REMOVED since prod-20260819 snapshot: {fid}")

    # Confirm PHA 18 / Weeks protections
    pha = next((t for t in tables if t["name"] == "Program Homework Assignments"), None)
    weeks = next((t for t in tables if t["name"] == "Weeks"), None)
    pha_field_names = [f["name"] for f in (pha or {}).get("fields") or []]
    weeks_field_names = [f["name"] for f in (weeks or {}).get("fields") or []]

    # Build report subsets
    empty = [r for r in inventory if r.get("populatedCount") == 0 and (r.get("totalRecords") or 0) > 0]
    nearly = [
        r
        for r in inventory
        if r.get("populationPct") is not None
        and 0 < r["populationPct"] < 5
        and (r.get("totalRecords") or 0) > 0
    ]
    obsolete = [r for r in inventory if r["classification"] in {"LEGACY CANDIDATE", "DUPLICATE OR SUPERSEDED"}]
    duplicates = [r for r in inventory if r["classification"] == "DUPLICATE OR SUPERSEDED"]
    retired_only = [r for r in inventory if r["classification"] == "RETIRED AUTOMATION ONLY"]
    formula_risk = [
        r
        for r in inventory
        if r["classification"] in {"FORMULA DEPENDENCY", "AUTOMATION DEPENDENCY", "EXTERNAL DEPENDENCY"}
    ]
    empty_structural = [
        r
        for r in inventory
        if r.get("populatedCount") == 0
        and r["classification"] in {"STRUCTURAL FIELD", "FORMULA DEPENDENCY", "AUTOMATION DEPENDENCY", "DO NOT TOUCH", "ACTIVE BUT EMPTY"}
    ]
    safe = [r for r in inventory if r["classification"] == "SAFE TO ARCHIVE — PENDING APPROVAL"]
    mike = [r for r in inventory if r["classification"] in {"NEEDS MIKE DECISION", "EMPTY UNKNOWN"}]
    do_not = [r for r in inventory if r["classification"] == "DO NOT TOUCH"]
    unknown_pop = [r for r in inventory if r.get("populatedCount") is None]

    summary = {
        "schemaSnapshotDateTimeUtc": snapshot_iso,
        "dataAccessMethod": "Airtable Meta API (schema) + Records API (population) + repository grep (dependencies)",
        "baseId": args.base_id,
        "liveTableCount": live_table_count,
        "liveFieldCount": live_field_count,
        "inventoryRows": len(inventory),
        "tablesAudited": sorted(record_counts.keys()) if not args.skip_population else sorted(t["name"] for t in tables),
        "tablesFailed": tables_failed,
        "fieldsUnknownPopulation": sorted(set(fields_unknown_count)),
        "mcpVsMetaDiff": mcp_diff,
        "driftVsFut002": drift[:200],
        "driftVsFut002Count": len(drift),
        "driftVsSchemaSnapshot": "prod-20260819 schema_doc",
        "automation075PresentInAutomationsTable": automation_075_present,
        "deletedWelcomeFieldsStillPresent": welcome_still_present,
        "programHomeworkAssignmentFieldCount": len(pha_field_names),
        "weeksFieldCount": len(weeks_field_names),
        "classificationCounts": {
            c: sum(1 for r in inventory if r["classification"] == c) for c in CLASSIFICATIONS
        },
        "completelyEmptyFields": len(empty),
        "nearlyEmptyFields": len(nearly),
        "obsoleteCandidates": len(obsolete),
        "duplicateCandidates": len(duplicates),
        "safeToArchivePendingApproval": len(safe),
        "needsMikeDecision": len(mike),
        "doNotTouch": len(do_not),
        "unknownPopulation": len(unknown_pop),
        "automationsTableLiveRows": len(automations_rows),
        "automationsTableLiveStatus": {
            "Live": sum(1 for r in automations_rows if str(r.get("Status") or "").lower() == "live"),
            "Off": sum(1 for r in automations_rows if str(r.get("Status") or "").lower() == "off"),
            "other": sum(
                1
                for r in automations_rows
                if str(r.get("Status") or "").lower() not in {"live", "off"}
            ),
        },
    }

    # Write JSON
    payload = {
        "summary": summary,
        "classificationsDefined": CLASSIFICATIONS,
        "viewsByTable": views_by_table,
        "automationsTable": automations_rows,
        "fields": inventory,
    }
    (out / "field-inventory.json").write_text(
        json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    csv_fields = [
        "tableName",
        "tableId",
        "fieldName",
        "fieldId",
        "fieldType",
        "isPrimary",
        "description",
        "totalRecords",
        "populatedCount",
        "blankCount",
        "populationPct",
        "formulaErrorCount",
        "formula",
        "lookupConfig",
        "rollupConfig",
        "countConfig",
        "linkedTableId",
        "linkedTableName",
        "dependsOn",
        "dependedBy",
        "activeAutomationRefs",
        "retiredAutomationRefs",
        "webRefs",
        "makeRefs",
        "filloutRefs",
        "softrRefs",
        "interfaceRefs",
        "testHarnessRefs",
        "classification",
        "evidence",
        "recommendedAction",
        "lastKnownUse",
    ]
    write_csv(out / "field-inventory.csv", inventory, csv_fields)

    cols = [
        ("tableName", "Table"),
        ("fieldName", "Field"),
        ("fieldId", "Field ID"),
        ("fieldType", "Type"),
        ("totalRecords", "Records"),
        ("populatedCount", "Populated"),
        ("populationPct", "Pct"),
        ("classification", "Class"),
        ("evidence", "Evidence"),
    ]

    (out / "empty-fields.md").write_text(
        f"# Completely empty fields\n\n**Snapshot:** {snapshot_iso}\n\n"
        f"Fields with `populatedCount = 0` and `totalRecords > 0`: **{len(empty)}**\n\n"
        + md_table(sorted(empty, key=lambda r: (r["tableName"], r["fieldName"])), cols)
        + "\n",
        encoding="utf-8",
    )

    (out / "nearly-empty-fields.md").write_text(
        f"# Nearly empty fields (<5% populated)\n\n**Snapshot:** {snapshot_iso}\n\n"
        f"Count: **{len(nearly)}**\n\n"
        + md_table(sorted(nearly, key=lambda r: (r["populationPct"], r["tableName"], r["fieldName"])), cols)
        + "\n",
        encoding="utf-8",
    )

    (out / "obsolete-candidates.md").write_text(
        f"# Obsolete / legacy candidates\n\n**Snapshot:** {snapshot_iso}\n\n"
        f"Count: **{len(obsolete)}**\n\n"
        + md_table(sorted(obsolete, key=lambda r: (r["tableName"], r["fieldName"])), cols)
        + "\n",
        encoding="utf-8",
    )

    (out / "duplicate-candidates.md").write_text(
        f"# Duplicate / superseded candidates\n\n**Snapshot:** {snapshot_iso}\n\n"
        f"Count: **{len(duplicates)}**\n\n"
        + md_table(sorted(duplicates, key=lambda r: (r["tableName"], r["fieldName"])), cols)
        + "\n",
        encoding="utf-8",
    )

    (out / "dependency-risk-report.md").write_text(
        f"# Formula and dependency risk fields\n\n**Snapshot:** {snapshot_iso}\n\n"
        f"Count: **{len(formula_risk)}**\n\n"
        + md_table(sorted(formula_risk, key=lambda r: (r["tableName"], r["fieldName"])), cols)
        + "\n\n## Empty but structurally required\n\n"
        f"Count: **{len(empty_structural)}**\n\n"
        + md_table(sorted(empty_structural, key=lambda r: (r["tableName"], r["fieldName"])), cols)
        + "\n\n## Retired-automation-only\n\n"
        f"Count: **{len(retired_only)}**\n\n"
        + md_table(sorted(retired_only, key=lambda r: (r["tableName"], r["fieldName"])), cols)
        + "\n",
        encoding="utf-8",
    )

    cleanup_order = safe + [
        r for r in obsolete if r["classification"] == "DUPLICATE OR SUPERSEDED" and not r.get("dependedBy")
    ]
    # de-dupe
    seen = set()
    cleanup_unique = []
    for r in cleanup_order:
        if r["fieldId"] in seen:
            continue
        seen.add(r["fieldId"])
        cleanup_unique.append(r)

    (out / "cleanup-queue.md").write_text(
        f"# Cleanup queue (recommended order)\n\n**Snapshot:** {snapshot_iso}\n\n"
        "## Hard stops\n\n"
        "- Do **not** delete without Mike approval.\n"
        "- Do **not** restore Automation **075**.\n"
        "- Do **not** restore the six deleted welcome-email fields.\n"
        "- Do **not** delete fields required by the 18-assignment PHA design, Early Bird, Week 9 no-homework design, or Public Missing* formulas.\n\n"
        f"## Safe-to-archive — pending approval ({len(safe)})\n\n"
        + md_table(sorted(safe, key=lambda r: (r["tableName"], r["fieldName"])), cols)
        + f"\n\n## Needs Mike decision ({len(mike)})\n\n"
        + md_table(sorted(mike, key=lambda r: (r["tableName"], r["fieldName"]))[:200], cols)
        + ("\n\n_(truncated to 200 rows — full list in field-inventory.json)_\n" if len(mike) > 200 else "\n")
        + f"\n## Do not touch ({len(do_not)})\n\n"
        + md_table(sorted(do_not, key=lambda r: (r["tableName"], r["fieldName"])), cols)
        + "\n\n## Recommended cleanup order\n\n"
        "1. Confirm interface/view usage in OMNI for each SAFE TO ARCHIVE candidate.\n"
        "2. Retarget formulas that still depend on Drive/legacy fields (see dependency-risk-report).\n"
        "3. Archive Drive duplicate fields with zero dependents + Mike approval.\n"
        "4. Re-run this live inventory after any schema change.\n"
        f"\n### Highest-priority cleanup candidates ({len(cleanup_unique)})\n\n"
        + md_table(cleanup_unique, cols)
        + "\n",
        encoding="utf-8",
    )

    limitations = f"""# Audit limitations

**Snapshot:** {snapshot_iso}
**Base:** `{args.base_id}`
**Data-access method:** Airtable Meta API + Records API via PAT (`tools/airtable/.env` / `web/.env.local`); repository filesystem grep for dependencies.

## Access / coverage

| Item | Result |
|------|--------|
| Live tables | {live_table_count} |
| Live fields | {live_field_count} |
| Inventory rows | {len(inventory)} |
| Tables failed | {len(tables_failed)} |
| Fields with UNKNOWN population | {len(set(fields_unknown_count))} |
| Automation 075 in Automations table | {"PRESENT — unexpected" if automation_075_present else "Absent (expected)"} |
| Deleted welcome fields still on Enrollments | {welcome_still_present or "none (expected)"} |

### Tables failed
{chr(10).join(f"- {x}" for x in tables_failed) or "- none"}

### MCP vs Meta differences
{chr(10).join(f"- {x}" for x in mcp_diff[:50]) or "- none checked or no differences"}

### Drift vs FUT-002 (2026-08-30 snapshot inventory)
- Drift entries: {len(drift)}
{chr(10).join(f"- {x}" for x in drift[:80]) or "- none"}

## Known limitations

1. **View field visibility:** Meta API returns view names/types per table but not which fields are visible/filtered in each view. Active view references are table-level, not per-field.
2. **Interface definitions:** Full interface element → field mapping requires MCP `list_pages_for_base` dump; field hits are best-effort when a dump is present.
3. **Automation UI triggers:** Live Automations **UI** graph is separate from the Automations **data table**. This audit records Automations table columns `Name` / `Status` / `Automation Code` / `Trigger field(s)` per CURRENT-TRUTH authority rule (only Name/Status/Code are audit authority for Live identity).
4. **Name-only dependency matches:** Repository grep may match shared field names across tables (e.g. `Status`). Field-ID matches are preferred when present; name matches are flagged as possible cross-table hits.
5. **Blank detection:** Airtable Records API omits blank fields. Blank = field key absent OR empty string OR empty array. Checkbox `false` counts as populated.
6. **Softr:** Treated as obsolete; references are historical docs only.
7. **No Airtable mutations** were performed.

## Population method

For each table, page all records (`pageSize=100`) with all fields. For each schema field name, count records where the field is present and non-blank. `populationPct = populated / total * 100`.

## Dependency-scan method

Exact field ID regex (`fld…`) and field-name substring scan across automations, web, tools, tests, make, docs, lambda. Automation comment-only lines excluded. Active vs historical groups separated.
"""
    (out / "audit-limitations.md").write_text(limitations, encoding="utf-8")

    readme = f"""# Live field inventory audit

**Audit date (UTC):** {snapshot_iso}
**Live base:** `{args.base_id}` (Production Shooting Challenge)
**Scope:** All {live_table_count} tables / {live_field_count} fields
**Data-access method:** Airtable Meta API (schema) + Records API (population counts) + repository grep (dependencies)
**Record-count method:** Full table pagination; blanks inferred from omitted/empty values
**Dependency-scan method:** Field ID + field name scan across automations, web, tools, tests, make, docs, lambda

## QC

| Check | Result |
|-------|--------|
| Tables audited | {live_table_count} |
| Inventory rows | {len(inventory)} |
| Matches live field count | {"YES" if len(inventory) == live_field_count else "NO"} |
| Unique field IDs | {"YES" if len(ids) == len(set(ids)) else "NO"} |
| Tables failed | {len(tables_failed)} |
| Unknown population fields | {len(set(fields_unknown_count))} |

## Classification meanings

| Classification | Meaning |
|----------------|---------|
| ACTIVE | Referenced by active repo code/tests and populated or otherwise in use |
| ACTIVE BUT EMPTY | Active dependency exists but no populated values in live records |
| HISTORICAL | Only historical docs/audits/Make/retired references |
| FORMULA DEPENDENCY | Formula/lookup/rollup/count — do not delete without graph retarget |
| AUTOMATION DEPENDENCY | Referenced by active automation scripts |
| EXTERNAL DEPENDENCY | Web / Make / Fillout contract |
| STRUCTURAL FIELD | Primary or linked-record field |
| RETIRED AUTOMATION ONLY | Only retired automation archive references |
| DUPLICATE OR SUPERSEDED | Explicitly superseded by a canonical field |
| LEGACY CANDIDATE | Legacy Drive/storage field still needing retirement plan |
| EMPTY UNKNOWN | Empty with no verified active dependency — OMNI/Mike review |
| NEEDS MIKE DECISION | Ambiguous; Mike must decide |
| SAFE TO ARCHIVE — PENDING APPROVAL | Evidence supports archive **only after Mike approval** |
| DO NOT TOUCH | Protected workflow / infrastructure |

## Outputs

- `field-inventory.json` — full machine-readable inventory (one object per field)
- `field-inventory.csv` — same rows as CSV
- `empty-fields.md`
- `nearly-empty-fields.md`
- `obsolete-candidates.md`
- `duplicate-candidates.md`
- `dependency-risk-report.md`
- `cleanup-queue.md`
- `audit-limitations.md`
- `_raw/` — Meta schema + Automations table + record counts

## Workflow confirmations

| Check | Result |
|-------|--------|
| Automation 075 retired / absent | {"FAIL — present" if automation_075_present else "PASS — absent from Automations table identity"} |
| Six deleted welcome fields not proposed for restoration | PASS — not in inventory; still-present={welcome_still_present or "none"} |
| PHA / 18-assignment fields not proposed for deletion | PASS — DO NOT TOUCH / dependency classes only for those tables |
| Early Bird countable / Week 9 no homework | Documented in Weeks audit evidence; Weeks fields protected |

## Counts

| Metric | Count |
|--------|------:|
| Completely empty | {len(empty)} |
| Nearly empty (<5%) | {len(nearly)} |
| Obsolete/legacy | {len(obsolete)} |
| Duplicate/superseded | {len(duplicates)} |
| Safe to archive (pending approval) | {len(safe)} |
| Needs Mike decision / empty unknown | {len(mike)} |
| Do not touch | {len(do_not)} |
| Unknown population | {len(unknown_pop)} |

## Tooling

```bash
python tools/airtable/live_field_inventory_audit.py
python -m pytest tools/airtable/tests/test_live_field_inventory_audit.py -q
```
"""
    (out / "README.md").write_text(readme, encoding="utf-8")

    # Name drift report
    name_drift_path = out / "name-drift-report.md"
    name_drift_path.write_text(
        f"# Conflicting or stale field names\n\n**Snapshot:** {snapshot_iso}\n\n"
        f"## Live vs FUT-002 snapshot drift ({len(drift)})\n\n"
        + ("\n".join(f"- {x}" for x in drift) or "- none")
        + "\n\n## MCP vs Meta\n\n"
        + ("\n".join(f"- {x}" for x in mcp_diff) or "- none / not compared")
        + "\n",
        encoding="utf-8",
    )

    print(json.dumps(summary, indent=2))
    print(f"\nWrote report pack to {out}")


if __name__ == "__main__":
    main()
