#!/usr/bin/env python3
"""FUT-002 batch 2 — candidate queue builder (audit only, no deletes).

Reads committed inventory JSON + schema snapshot; re-greps repo per candidate.
Outputs machine-readable quarantine-ready subset and summary stats.

Usage:
  python tools/airtable/fut_002_batch2_candidates.py
  python tools/airtable/fut_002_batch2_candidates.py --json-out docs/audits/fut-002-batch2-candidates.json
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REPO = Path(__file__).resolve().parents[2]
DEFAULT_INVENTORY = REPO / "docs/audits/fut-002-unused-field-inventory.json"
DEFAULT_SNAPSHOT = (
    REPO
    / "airtable/schema/snapshots/prod-20260831-fut002-batch1"
    / "schema_doc_appn84sqPw03zEbTT_20260831_070120.md"
)
DEFAULT_JSON_OUT = REPO / "docs/audits/fut-002-batch2-candidates.json"

# Batch 1 hard stops — never quarantine/delete via this batch
PROTECTED_TABLES = frozenset({"Email Handoff Queue", "Config"})
PROTECTED_FIELD_NAMES = frozenset(
    {
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
        "Root Google Drive Folder ID",
        "Root Google Drive Folder Link",
    }
)
DELETED_FIELD_IDS = frozenset({"fldwOklyDaW3nN2Kz", "fld5Emwipb3UjAMz9"})  # SA XP text stubs

TEXT_STUB_NAMES = frozenset(
    {
        "XP Events copy",
        "DELETE MAYBE - XP Events copy",
        "XP Events",  # only if singleLineText on non-SA table
    }
)
WEEKS_TEXT_STUB_NAMES = frozenset({"Video Feedback", "Submission Assets", "Homework 2"})

GREP_DIRS = [
    "airtable/automations",
    "airtable/extension-scripts",
    "web",
    "tools/airtable",
    "tools/testing",
    "lib",
    "lambda",
    "tests",
]

SKIP_GREP_PATHS = (
    "node_modules",
    ".next",
    "_preview",
    "fut-002",
    "fut_002",
    "make/blueprints",
    "docs/audits",
    "docs/testing/evidence",
)


def rg_hits(pattern: str, field_id: str | None = None) -> dict[str, list[str]]:
    """Return {category: [paths]} for field name and optional field id."""
    hits: dict[str, set[str]] = defaultdict(set)

    for term, category in ((pattern, "name"), (field_id, "id") if field_id else (None, None)):
        if not term:
            continue
        try:
            proc = subprocess.run(
                ["rg", "-l", "--glob", "!node_modules/**", re.escape(term), *GREP_DIRS],
                cwd=REPO,
                capture_output=True,
                text=True,
                timeout=120,
            )
        except (subprocess.TimeoutExpired, FileNotFoundError):
            continue
        for line in proc.stdout.splitlines():
            rel = line.strip()
            if not rel or any(skip in rel for skip in SKIP_GREP_PATHS):
                continue
            if category == "name" and rel.endswith(".js"):
                # Require non-comment context for automations
                try:
                    content = (REPO / rel).read_text(encoding="utf-8", errors="replace")
                    if not any(
                        term in ln and not ln.strip().startswith(("*", "//", "/*", "#"))
                        for ln in content.splitlines()
                    ):
                        continue
                except OSError:
                    continue
            hits[category].add(rel)

    return {k: sorted(v) for k, v in hits.items()}


def batch2_classification(
    table: str,
    name: str,
    field_type: str,
    inv_class: str,
) -> str:
    nl = name.lower()
    if "google drive" in nl or name in {
        "Create Google Drive File Name",
        "Submitted Asset File Links",
        "Submitted Asset File IDs",
        "Submission Asset: Google Drive File URL (lookup)",
        "Submission Asset: Google Drive File ID (lookup)",
    }:
        return "drive_legacy"
    if name in TEXT_STUB_NAMES and field_type == "singleLineText":
        return "text_stub"
    if table == "Weeks" and name in WEEKS_TEXT_STUB_NAMES and field_type == "singleLineText":
        return "text_stub"
    if inv_class in {"legacy", "duplicate"}:
        return "drive_legacy"
    if inv_class == "active" or name in PROTECTED_FIELD_NAMES or table in PROTECTED_TABLES:
        return "keep"
    return "unknown"


def dependency_summary(evidence: dict[str, list[str]], depended_by: list[str]) -> str:
    parts: list[str] = []
    for group in ("automation", "web", "tools", "lambda"):
        paths = evidence.get(group, [])
        if paths:
            parts.append(f"{group}: {len(paths)}")
    if depended_by:
        parts.append(f"schema-dep: {', '.join(depended_by[:4])}")
    legacy = evidence.get("make_legacy", [])
    if legacy:
        parts.append(f"make_legacy: {len(legacy)}")
    docs = evidence.get("docs", [])
    if docs:
        parts.append(f"docs: {len(docs)}")
    return "; ".join(parts) if parts else "none"


def has_active_repo_dependency(
    table: str,
    name: str,
    field_id: str,
    active_hits: dict[str, list[str]],
) -> bool:
    """Field ID hits are authoritative; ambiguous names need ID confirmation."""
    if active_hits.get("id"):
        return True
    ambiguous_names = {"Video Feedback", "Submission Assets", "XP Events", "Homework 2"}
    if name in ambiguous_names:
        return False
    return bool(active_hits.get("name"))


def recommend_action(
    classification: str,
    table: str,
    name: str,
    field_id: str,
    field_type: str,
    active_hits: dict[str, list[str]],
    depended_by: list[str],
) -> tuple[str, str]:
    if field_id in DELETED_FIELD_IDS:
        return "keep", "low"
    if table in PROTECTED_TABLES or name in PROTECTED_FIELD_NAMES:
        return "keep", "low"
    if table == "Weeks" and name in {"Start Date", "End Date", "Week Name", "Week Key", "Program Instance"}:
        return "keep", "high"
    if depended_by:
        return "defer", "high"
    has_active = has_active_repo_dependency(table, name, field_id, active_hits)
    if classification == "text_stub" and not has_active and field_type == "singleLineText":
        return "quarantine UI delete", "low"
    if classification == "drive_legacy":
        if table == "Config":
            return "defer", "high"  # Config Drive roots — batch 1 hard stop
        if has_active:
            return "defer", "medium"
        # No schema dependents and no active code — folder/download/name-only legacy
        if name in {
            "Google Drive Folder Name",
            "Google Drive Folder ID",
            "Google Drive Folder URL",
            "Google Drive Download URL",
            "Create Google Drive File Name",
            "Google Drive View URL",
            "Google Drive File URL",
            "Google Drive File ID",
            "Submission Asset: Google Drive File ID (lookup)",
            "Submitted Asset File IDs",
        } and not depended_by:
            # Still defer if part of blocked HC chain unless standalone on VF/SA
            if table == "Homework Completions" and name in {
                "Google Drive File ID",
                "Google Drive File URL",
                "Google Drive View URL",
                "Submission Asset: Google Drive File URL (lookup)",
                "Submitted Asset File Links",
            }:
                return "defer", "high"
            if table == "Submission Assets" and name == "Google Drive File ID":
                return "defer", "high"  # Asset Key formula chain
            return "quarantine UI delete", "medium"
        return "defer", "high"
    if classification == "unknown":
        return "defer", "medium"
    return "keep", "low"


def load_inventory(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def build_candidates(inv: dict[str, Any], snapshot_path: Path) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    all_rows: list[dict[str, Any]] = []
    quarantine_ready: list[dict[str, Any]] = []

    for entry in inv.get("flaggedFields", []):
        table = entry["table"]
        name = entry["field"]
        field_id = entry.get("fieldId", "")
        field_type = entry.get("type", "")
        inv_class = entry.get("classification", "unknown")

        if field_id in DELETED_FIELD_IDS:
            continue

        classification = batch2_classification(table, name, field_type, inv_class)
        evidence = entry.get("evidence", {})
        depended_by = entry.get("dependedBy", [])

        active_hits = rg_hits(name, field_id)
        dep_hits = dependency_summary(evidence, depended_by)
        action, risk = recommend_action(
            classification, table, name, field_id, field_type, active_hits, depended_by
        )

        row = {
            "table": table,
            "field": name,
            "fieldId": field_id,
            "type": field_type,
            "classification": classification,
            "inventoryClassification": inv_class,
            "dependencyHits": dep_hits,
            "repoGrepActive": active_hits,
            "recommendedAction": action,
            "riskLevel": risk,
            "dependsOn": entry.get("dependsOn", []),
            "dependedBy": depended_by,
            "notes": entry.get("notes", []),
        }
        all_rows.append(row)
        if action == "quarantine UI delete":
            quarantine_ready.append(row)

    # Explicit batch-2 scope: Weeks text stubs may be active-classified but are text stubs
    weeks_stubs = [
        ("Weeks", "Video Feedback", "fld8tdkjgyYmrs4Eq"),
        ("Weeks", "Submission Assets", "fldo906P9t7nj9xmn"),
    ]
    existing = {(r["table"], r["fieldId"]) for r in all_rows}
    for table, name, fid in weeks_stubs:
        if (table, fid) in existing:
            continue
        active_hits = rg_hits(name, fid)
        action, risk = recommend_action(
            "text_stub", table, name, fid, "singleLineText", active_hits, []
        )
        row = {
            "table": table,
            "field": name,
            "fieldId": fid,
            "type": "singleLineText",
            "classification": "text_stub",
            "inventoryClassification": "active",
            "dependencyHits": dependency_summary({}, []),
            "repoGrepActive": active_hits,
            "recommendedAction": action,
            "riskLevel": risk,
            "dependsOn": [],
            "dependedBy": [],
            "notes": ["Weeks calendar text stub — real links exist on same table"],
        }
        all_rows.append(row)
        if action == "quarantine UI delete":
            quarantine_ready.append(row)

    # Drive legacy: Config roots remain in post-batch-1 snapshot (most SA/HC/VF Drive fields already removed)
    seen_ids = {r["fieldId"] for r in all_rows}
    for item in inv.get("safeToDeleteLater", []):
        fid = item.get("fieldId", "")
        if fid in seen_ids or fid in DELETED_FIELD_IDS:
            continue
        table = item["table"]
        name = item["field"]
        classification = "drive_legacy"
        active_hits = rg_hits(name, fid)
        action, risk = recommend_action(
            classification, table, name, fid, item.get("type", ""), active_hits, []
        )
        row = {
            "table": table,
            "field": name,
            "fieldId": fid,
            "type": item.get("type", ""),
            "classification": classification,
            "inventoryClassification": item.get("classification", "legacy"),
            "dependencyHits": "safeToDeleteLater; Config Drive root hard stop",
            "repoGrepActive": active_hits,
            "recommendedAction": action,
            "riskLevel": risk,
            "dependsOn": [],
            "dependedBy": [],
            "notes": ["Remaining Google Drive legacy in post-batch-1 snapshot"],
        }
        all_rows.append(row)
        seen_ids.add(fid)
        if action == "quarantine UI delete":
            quarantine_ready.append(row)

    all_rows.sort(key=lambda r: (r["table"], r["field"]))
    quarantine_ready.sort(key=lambda r: (r["table"], r["field"]))
    return all_rows, quarantine_ready


def render_markdown(
    all_rows: list[dict[str, Any]],
    quarantine_ready: list[dict[str, Any]],
    snapshot_date: str,
    inv_path: str,
    schema_path: str,
) -> str:
    lines = [
        "# FUT-002 batch 2 — candidate queue (audit only)",
        "",
        f"**SNAPSHOT DATE:** {snapshot_date} (committed inventory + schema snapshot; no live Meta API in agent run)  ",
        f"**Generated:** {datetime.now(timezone.utc).strftime('%Y-%m-%d')}  ",
        "**Base:** `appn84sqPw03zEbTT`  ",
        "**Status:** Audit ready — **no field deletes** performed  ",
        "",
        "## Data sources",
        "",
        f"| Source | Path |",
        f"|--------|------|",
        f"| Inventory JSON | `{inv_path}` |",
        f"| Schema snapshot | `{schema_path}` |",
        f"| Tool | `tools/airtable/fut_002_batch2_candidates.py` |",
        f"| Live reference (post SA stubs) | **1363** fields / **35** tables (2026-08-31 evidence) |",
        "",
        "## Summary",
        "",
        f"| Metric | Count |",
        f"|--------|------:|",
        f"| Batch 2 candidates reviewed | **{len(all_rows)}** |",
        f"| Quarantine-ready (UI delete after rename) | **{len(quarantine_ready)}** |",
        "",
        "## Hard stops (unchanged from batch 1)",
        "",
        "- Do **not** restore Automation **075**.",
        "- Do **not** delete **Weeks** configuration fields (dates, Week Key, Program Instance, real link fields).",
        "- Do **not** delete **Config** Drive roots, **Email Handoff** fields, Tremendous, or Synced School fields.",
        "- Do **not** delete S3 objects, payment records, or protected evidence.",
        "- Field hard-delete remains **UI-only** (Meta API DELETE → 404).",
        "",
        "## Quarantine-ready — Phase A (text stubs + standalone Drive legacy)",
        "",
        "Rename to `ZZZ DELETE — …` then Mike UI delete (mirror batch 1).",
        "",
        "| Table | Field | Field ID | Classification | Dependency hits | Recommended action | Risk |",
        "|-------|-------|----------|----------------|-----------------|-------------------|------|",
    ]

    for row in quarantine_ready:
        lines.append(
            f"| {row['table']} | {row['field']} | `{row['fieldId']}` | {row['classification']} | "
            f"{row['dependencyHits']} | **{row['recommendedAction']}** | {row['riskLevel']} |"
        )

    lines.extend(
        [
            "",
            "## Deferred — Drive legacy (formula retarget required)",
            "",
            "Per [`google-drive-field-removal-prep-2026-08-17.md`](./google-drive-field-removal-prep-2026-08-17.md). "
            "Complete §B retargets before any HC/SA Drive field delete.",
            "",
            "| Table | Field | Field ID | Blocker | Recommended action | Risk |",
            "|-------|-------|----------|---------|-------------------|------|",
        ]
    )

    drive_defer = [
        r
        for r in all_rows
        if r["classification"] == "drive_legacy" and r["recommendedAction"] != "quarantine UI delete"
    ]
    for row in sorted(drive_defer, key=lambda r: (r["table"], r["field"])):
        blocker = row["dependencyHits"]
        if row["dependedBy"]:
            blocker = f"dependedBy: {', '.join(row['dependedBy'][:3])}"
        elif row["table"] == "Config":
            blocker = "Config Drive root — batch hard stop"
        lines.append(
            f"| {row['table']} | {row['field']} | `{row['fieldId']}` | {blocker} | defer | {row['riskLevel']} |"
        )

    lines.extend(
        [
            "",
            "## Deferred — unknown / interface review",
            "",
            f"**{sum(1 for r in all_rows if r['classification'] == 'unknown')}** fields classified `unknown` "
            "(no active automation/web/tools hit; may still appear in Airtable interfaces/views). "
            "OMNI review before quarantine. See full inventory `flaggedFields` in "
            f"[`fut-002-unused-field-inventory.json`](./fut-002-unused-field-inventory.json).",
            "",
            "### Notable unknown clusters (defer)",
            "",
            "| Table | Unknown count | Notes |",
            "|-------|--------------:|-------|",
        ]
    )

    unknown_by_table: dict[str, int] = defaultdict(int)
    for row in all_rows:
        if row["classification"] == "unknown":
            unknown_by_table[row["table"]] += 1
    for table, count in sorted(unknown_by_table.items(), key=lambda x: -x[1])[:12]:
        lines.append(f"| {table} | {count} | No active repo dependency |")

    lines.extend(
        [
            "",
            "## Keep — do not batch-2 delete",
            "",
            "| Item | Reason |",
            "|------|--------|",
            "| Weeks real link fields (`XP Events`, `Homework Completions`, etc.) | Live challenge calendar |",
            "| Config `Root Google Drive Folder ID/Link` | Hard stop — legacy Make root only |",
            "| SA `Asset Key`, `Storage Key`, `Canonical File URL`, `Reviewer File URL` | Upload + email path |",
            "| HC blocked Drive chain fields | Formula/lookup dependents — retarget first |",
            "| Submission Assets `XP Events` / `XP Events copy` text | **Already deleted 2026-08-31** |",
            "",
            "## Operator packet",
            "",
            "Mike UI delete steps: [`docs/deploy-checklists/FUT-002-batch2-quarantined-field-delete.md`](../deploy-checklists/FUT-002-batch2-quarantined-field-delete.md)",
            "",
            "## Machine-readable quarantine subset",
            "",
            "[`fut-002-batch2-candidates.json`](./fut-002-batch2-candidates.json) — quarantine-ready rows only.",
            "",
        ]
    )
    return "\n".join(lines) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description="FUT-002 batch 2 candidate queue")
    parser.add_argument("--inventory", type=Path, default=DEFAULT_INVENTORY)
    parser.add_argument("--snapshot", type=Path, default=DEFAULT_SNAPSHOT)
    parser.add_argument("--json-out", type=Path, default=DEFAULT_JSON_OUT)
    parser.add_argument(
        "--md-out",
        type=Path,
        default=REPO / "docs/audits/FUT-002-batch2-candidate-queue.md",
    )
    args = parser.parse_args()

    inv = load_inventory(args.inventory)
    all_rows, quarantine_ready = build_candidates(inv, args.snapshot)

    snapshot_date = "2026-08-31"
    if inv.get("generatedAt"):
        snapshot_date = inv["generatedAt"][:10]

    by_action: dict[str, int] = defaultdict(int)
    by_class: dict[str, int] = defaultdict(int)
    for row in all_rows:
        by_action[row["recommendedAction"]] += 1
        by_class[row["classification"]] += 1

    payload = {
        "auditId": "FUT-002-batch2",
        "backlogId": "FUT-002",
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "dataSource": {
            "type": "SNAPSHOT",
            "snapshotDate": snapshot_date,
            "inventoryJson": args.inventory.relative_to(REPO).as_posix(),
            "schemaSnapshot": args.snapshot.relative_to(REPO).as_posix(),
            "liveMetaApi": False,
            "note": (
                "Post-batch-1 inventory (1350 fields) + SA XP stub delete evidence (1363 live). "
                "No live Meta API token in agent environment."
            ),
        },
        "candidateCount": len(all_rows),
        "quarantineReadyCount": len(quarantine_ready),
        "summaryByClassification": dict(sorted(by_class.items())),
        "summaryByRecommendedAction": dict(sorted(by_action.items())),
        "quarantineReady": quarantine_ready,
    }

    args.json_out.parent.mkdir(parents=True, exist_ok=True)
    args.json_out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    md = render_markdown(
        all_rows,
        quarantine_ready,
        snapshot_date,
        args.inventory.relative_to(REPO).as_posix(),
        args.snapshot.relative_to(REPO).as_posix(),
    )
    args.md_out.parent.mkdir(parents=True, exist_ok=True)
    args.md_out.write_text(md, encoding="utf-8")

    print(
        json.dumps(
            {
                "candidateCount": len(all_rows),
                "quarantineReadyCount": len(quarantine_ready),
                "summaryByRecommendedAction": dict(sorted(by_action.items())),
                "writtenJson": args.json_out.as_posix(),
                "writtenMd": args.md_out.as_posix(),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
