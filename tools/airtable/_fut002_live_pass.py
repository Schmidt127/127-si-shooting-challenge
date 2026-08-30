#!/usr/bin/env python3
"""FUT-002 live schema pass: verify fixes, classify fields, write inventory pack."""
from __future__ import annotations

import csv
import json
import os
import re
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import requests
from dotenv import load_dotenv

REPO = Path(__file__).resolve().parents[2]
BASE_ID = "appn84sqPw03zEbTT"
OUT = REPO / "docs" / "audits" / "field-inventory"
RAW = OUT / "_raw"

EXPECTED_ABSENT = {
    "fldFZLzDjiEbENCGl",
    "fld71v6s6wYaJ2Umk",
    "fldgGoh56Ck4fTQIE",
}
HC_REVIEW_SUMMARY = "fldHchlovIaPlGKLk"
SA_ASSET_KEY = "fldy8UuxWmHT7WFFJ"


def load_token() -> str:
    load_dotenv(REPO / "web" / ".env.local")
    load_dotenv(REPO / "tools" / "airtable" / ".env")
    tok = os.getenv("AIRTABLE_API_TOKEN") or os.getenv("AIRTABLE_TOKEN") or ""
    if not tok:
        raise SystemExit("Missing AIRTABLE_API_TOKEN")
    return tok


def api_get(url: str, headers: dict, params: dict | None = None) -> dict:
    time.sleep(0.22)
    resp = requests.get(url, headers=headers, params=params, timeout=90)
    resp.raise_for_status()
    return resp.json()


def list_records(base_id: str, table_id: str, headers: dict) -> list[dict]:
    records: list[dict] = []
    offset = None
    while True:
        params: dict = {"pageSize": 100, "returnFieldsByFieldId": "true"}
        if offset:
            params["offset"] = offset
        data = api_get(f"https://api.airtable.com/v0/{base_id}/{table_id}", headers, params)
        records.extend(data.get("records") or [])
        offset = data.get("offset")
        if not offset:
            break
    return records


def populated_count(records: list[dict], field_id: str) -> int:
    count = 0
    for rec in records:
        val = (rec.get("fields") or {}).get(field_id)
        if val is None or val == "" or val == [] or val == {}:
            continue
        count += 1
    return count


def repo_hits(name: str, field_id: str, limit: int = 6) -> list[str]:
    roots = [
        REPO / "airtable" / "automations",
        REPO / "web",
        REPO / "tools",
        REPO / "make",
        REPO / "lib",
        REPO / "tests",
    ]
    hits: list[str] = []
    exts = {".js", ".ts", ".tsx", ".py", ".mjs", ".cjs", ".json"}
    for root in roots:
        if not root.exists():
            continue
        for path in root.rglob("*"):
            if not path.is_file() or path.suffix.lower() not in exts:
                continue
            if any(p in path.parts for p in ("node_modules", ".next", "__pycache__", "snapshots")):
                continue
            if "field-inventory" in path.parts or path.name.startswith("_fut002"):
                continue
            try:
                text = path.read_text(encoding="utf-8", errors="ignore")
            except OSError:
                continue
            if field_id in text or (len(name) >= 8 and name in text):
                hits.append(str(path.relative_to(REPO)).replace("\\", "/"))
                if len(hits) >= limit:
                    return hits
    return hits


def classify(
    *,
    name: str,
    ftype: str,
    is_valid: bool | None,
    records: int,
    populated: int,
    formula_deps: list,
    repo: list[str],
) -> tuple[str, str]:
    pct = (100.0 * populated / records) if records else 0.0
    lname = name.lower()
    if name.startswith("ZZZ DELETE"):
        return "QUARANTINED FOR DELETE", "renamed for Mike UI delete; Meta API field DELETE returns 404"
    if ftype == "formula" and is_valid is False:
        return "INVALID FORMULA", "broken formula — fix or quarantine"
    if formula_deps:
        return "HAS DEPENDENTS", f"referenced by {len(formula_deps)} field(s)"
    if repo:
        return "REPO REFERENCED", f"repo hits: {', '.join(repo[:3])}"
    if records == 0:
        return "EMPTY TABLE — STRUCTURAL?", "zero records; may still be form/quiz structure"
    empty_types = {
        "singleLineText",
        "multilineText",
        "richText",
        "checkbox",
        "date",
        "dateTime",
        "number",
        "email",
        "url",
        "phoneNumber",
        "singleSelect",
        "multipleSelects",
        "multipleAttachments",
    }
    if populated == 0 and ftype in empty_types:
        if re.search(r"\b(old|legacy|delete|zzz|temp|tmp|copy|test)\b", lname):
            return "SAFE DELETE CANDIDATE", "empty + legacy-named + no deps"
        if re.search(r"\benrollments?\s*3\b", lname) or lname.endswith(" 3"):
            return "SAFE DELETE CANDIDATE", "empty accidental duplicate-style name + no deps"
        return "EMPTY — REVIEW", "empty with no verified deps; confirm product intent"
    skip_nearly = {
        "formula",
        "rollup",
        "count",
        "multipleLookupValues",
        "multipleRecordLinks",
        "autoNumber",
        "createdTime",
        "lastModifiedTime",
        "createdBy",
        "lastModifiedBy",
        "button",
    }
    if pct < 5 and ftype not in skip_nearly:
        return "NEARLY EMPTY — REVIEW", f"{pct:.2f}% populated; no formula deps"
    return "ACTIVE / KEEP", f"{pct:.2f}% populated"


def write_md_table(subset: list[dict], title: str, path: Path, generated: str) -> None:
    lines = [
        f"# {title}",
        "",
        f"**Snapshot:** {generated}",
        "",
        f"Count: **{len(subset)}**",
        "",
        "| Table | Field | Field ID | Type | Records | Populated | Pct | Class | Evidence |",
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for row in subset:
        lines.append(
            f"| {row['table']} | {row['field']} | {row['fieldId']} | {row['type']} | "
            f"{row['records']} | {row['populated']} | {row['pct']} | "
            f"{row['classification']} | {row['evidence']} |"
        )
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    headers = {"Authorization": f"Bearer {load_token()}"}
    generated = datetime.now(timezone.utc).isoformat()
    meta = api_get(f"https://api.airtable.com/v0/meta/bases/{BASE_ID}/tables", headers)
    tables = meta["tables"]

    OUT.mkdir(parents=True, exist_ok=True)
    RAW.mkdir(parents=True, exist_ok=True)
    (RAW / "meta_tables.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")

    formula_refs: dict[str, list[tuple[str, str, str]]] = defaultdict(list)
    by_id: dict[str, tuple[str, dict]] = {}
    for table in tables:
        for field in table["fields"]:
            by_id[field["id"]] = (table["name"], field)
            opts = field.get("options") or {}
            for ref_id in opts.get("referencedFieldIds") or []:
                formula_refs[ref_id].append((table["name"], field["name"], field["id"]))
            linked_field = opts.get("fieldIdInLinkedTable")
            if linked_field:
                formula_refs[linked_field].append((table["name"], field["name"], field["id"]))
            link_field = opts.get("recordLinkFieldId")
            if link_field:
                formula_refs[link_field].append((table["name"], field["name"], field["id"]))

    sa_asset = by_id.get(SA_ASSET_KEY, (None, {}))[1]
    hc_review = by_id.get(HC_REVIEW_SUMMARY, (None, {}))[1]
    checks = {
        "HC Drive batch fields absent": all(fid not in by_id for fid in EXPECTED_ABSENT),
        "HC Review Summary still present (quarantined pending UI delete)": HC_REVIEW_SUMMARY in by_id,
        "HC Review Summary formula valid BLANK()": (
            (hc_review.get("options") or {}).get("isValid") is True
            and (hc_review.get("options") or {}).get("formula") == "BLANK()"
        ),
        "SA Asset Key present": SA_ASSET_KEY in by_id,
        "SA Asset Key formula valid": (sa_asset.get("options") or {}).get("isValid") is True,
    }

    rows: list[dict] = []
    record_counts: dict[str, int] = {}
    for table in tables:
        table_id = table["id"]
        table_name = table["name"]
        print(f"population: {table_name} ...", flush=True)
        try:
            records = list_records(BASE_ID, table_id, headers)
        except Exception as exc:  # noqa: BLE001
            print(f"  SKIP population ({exc})")
            records = []
        record_counts[table_name] = len(records)
        for field in table["fields"]:
            field_id = field["id"]
            opts = field.get("options") or {}
            is_valid = opts.get("isValid") if field["type"] == "formula" else None
            pop = populated_count(records, field_id) if records else 0
            deps = formula_refs.get(field_id, [])
            hits = repo_hits(field["name"], field_id)
            classification, evidence = classify(
                name=field["name"],
                ftype=field["type"],
                is_valid=is_valid,
                records=len(records),
                populated=pop,
                formula_deps=deps,
                repo=hits,
            )
            rows.append(
                {
                    "table": table_name,
                    "tableId": table_id,
                    "field": field["name"],
                    "fieldId": field_id,
                    "type": field["type"],
                    "records": len(records),
                    "populated": pop,
                    "pct": round((100.0 * pop / len(records)), 2) if records else None,
                    "isValid": is_valid,
                    "classification": classification,
                    "evidence": evidence,
                    "formulaDeps": [f"{a}.{b}" for a, b, _ in deps[:8]],
                    "repoHits": hits,
                    "description": (field.get("description") or "")[:240],
                }
            )

    (RAW / "record_counts.json").write_text(json.dumps(record_counts, indent=2), encoding="utf-8")
    inventory = {
        "generatedAt": generated,
        "baseId": BASE_ID,
        "tableCount": len(tables),
        "fieldCount": len(rows),
        "integrityChecks": checks,
        "fields": rows,
    }
    (OUT / "field-inventory.json").write_text(json.dumps(inventory, indent=2), encoding="utf-8")

    with (OUT / "field-inventory.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "table",
                "field",
                "fieldId",
                "type",
                "records",
                "populated",
                "pct",
                "classification",
                "evidence",
            ],
        )
        writer.writeheader()
        for row in rows:
            writer.writerow({key: row.get(key) for key in writer.fieldnames})

    empty = [r for r in rows if r["populated"] == 0 and r["records"] > 0]
    nearly = [r for r in rows if r["pct"] is not None and 0 < r["pct"] < 5]
    invalid = [r for r in rows if r["classification"] == "INVALID FORMULA"]
    safe = [r for r in rows if r["classification"] == "SAFE DELETE CANDIDATE"]
    quarantined = [r for r in rows if r["classification"] == "QUARANTINED FOR DELETE"]
    review = [r for r in rows if "REVIEW" in r["classification"]]

    write_md_table(empty, "Empty fields (populated=0, table has records)", OUT / "empty-fields.md", generated)
    write_md_table(nearly, "Nearly empty fields (<5% populated)", OUT / "nearly-empty-fields.md", generated)
    write_md_table(invalid, "Invalid formulas", OUT / "invalid-formulas.md", generated)
    write_md_table(safe, "Safe delete candidates", OUT / "safe-delete-candidates.md", generated)
    write_md_table(quarantined, "Quarantined for Mike UI delete", OUT / "quarantined-for-delete.md", generated)

    sa_formula = (sa_asset.get("options") or {}).get("formula", "")
    hc_name = hc_review.get("name", HC_REVIEW_SUMMARY)
    safe_rows = "\n".join(
        f"| {r['table']} | {r['field']} | {r['fieldId']} | {r['evidence']} |" for r in safe
    ) or "| - | - | - | none |"
    review_rows = "\n".join(
        f"| {r['table']} | {r['field']} | {r['fieldId']} | {r['classification']} | {r['evidence']} |"
        for r in review[:100]
    ) or "| - | - | - | - | none |"
    check_lines = "\n".join(f"- {'PASS' if v else 'FAIL'} — {k}" for k, v in checks.items())

    queue = f"""# Cleanup queue (FUT-002)

**Snapshot:** {generated}

## Hard stops

- Do not restore Automation 075.
- Do not restore the six deleted welcome-email fields.
- Do not delete Weeks / Early Bird / 18 homework assignments / assignment identity / XP / Perfect Week / Streaks / Levels core / Email handoff / Public Missing* / FUT-010 fields.
- Airtable Meta API cannot DELETE fields with current PAT (DELETE returns 404). Quarantine via rename + BLANK() + description, then Mike UI trash.

## Integrity checks

{check_lines}

## Completed this session

| Action | Field | ID | Notes |
| --- | --- | --- | --- |
| Quarantined (API cannot delete) | Homework Completions / `{hc_name}` | `{HC_REVIEW_SUMMARY}` | Was invalid Drive formula; set to BLANK(); Mike UI delete required |
| Formula retarget | Submission Assets / Asset Key | `{SA_ASSET_KEY}` | `{sa_formula}` |
| Prior Mike UI deletes (earlier 2026-08-30) | HC Submitted File Review Summary + Submitted Asset File Links/IDs | `fldFZLzDjiEbENCGl`, `fld71v6s6wYaJ2Umk`, `fldgGoh56Ck4fTQIE` | Confirmed absent |

## Mike UI delete now (exact)

1. Open Production base -> Homework Completions.
2. Find field `{hc_name}` (`{HC_REVIEW_SUMMARY}`).
3. Delete/trash the field. Do not restore.
4. Re-run `python tools/airtable/_fut002_live_pass.py` after delete.

## Safe delete candidates ({len(safe)})

| Table | Field | Field ID | Evidence |
| --- | --- | --- | --- |
{safe_rows}

## Needs review ({len(review)}) — leave unless clearly obsolete

| Table | Field | Field ID | Class | Evidence |
| --- | --- | --- | --- | --- |
{review_rows}
"""
    (OUT / "cleanup-queue.md").write_text(queue, encoding="utf-8")

    readme = f"""# Live field inventory (FUT-002)

**Generated:** {generated}
**Base:** `{BASE_ID}`
**Tables:** {len(tables)} · **Fields:** {len(rows)}

## Integrity

{check_lines}

## Pack

| File | Purpose |
| --- | --- |
| field-inventory.json / .csv | Full classification |
| cleanup-queue.md | Ordered actions |
| empty-fields.md | Populated=0 |
| nearly-empty-fields.md | <5% |
| invalid-formulas.md | Broken formulas |
| safe-delete-candidates.md | Empty + legacy-named + no deps |
| quarantined-for-delete.md | Renamed awaiting Mike UI trash |
| _raw/ | Meta + counts |

## Regenerate

```bash
python tools/airtable/_fut002_live_pass.py
```
"""
    (OUT / "README.md").write_text(readme, encoding="utf-8")

    print(
        json.dumps(
            {
                "generatedAt": generated,
                "fields": len(rows),
                "checks": checks,
                "safe": len(safe),
                "invalid": len(invalid),
                "quarantined": len(quarantined),
                "empty": len(empty),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
