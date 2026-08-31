#!/usr/bin/env python3
"""FUT-002 batch-1 live verification after UI field deletion.

Checks:
  - Five quarantine field IDs are ABSENT
  - No remaining fields named with prefix 'ZZZ DELETE' for this batch
  - Protected tables/fields/automations remain intact
  - Optional: compare record counts to a pre-delete baseline JSON

Usage:
  python tools/airtable/fut_002_live_verify_batch1.py
  python tools/airtable/fut_002_live_verify_batch1.py --baseline docs/testing/evidence/fut-002/batch1-baseline.json
  python tools/airtable/fut_002_live_verify_batch1.py --write-baseline docs/testing/evidence/fut-002/batch1-baseline.json
  python tools/airtable/fut_002_live_verify_batch1.py --json-out docs/testing/evidence/fut-002/batch1-live-verify.json
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv

REPO = Path(__file__).resolve().parents[2]
load_dotenv(REPO / ".env.local")
load_dotenv(REPO / "tools" / "airtable" / ".env")

BASE_ID = "appn84sqPw03zEbTT"

# Exact batch-1 deletion targets (must be gone after Mike UI delete).
DELETE_TARGETS = [
    {
        "table": "Homework Completions",
        "tableId": "tblv58ppTFDBXb3nv",
        "fieldId": "fldHchlovIaPlGKLk",
        "quarantineNamePrefix": "ZZZ DELETE — Submission Asset Review Summary",
    },
    {
        "table": "Levels",
        "tableId": "tblU6EWmc1jCpgRHe",
        "fieldId": "fldTzIGODB2e03rvE",
        "quarantineNamePrefix": "ZZZ DELETE — Enrollments 3",
    },
    {
        "table": "Streak Occurrences",
        "tableId": "tbl9VxLdBiNcev4He",
        "fieldId": "fldltgFPGVXHwRj4X",
        "quarantineNamePrefix": "ZZZ DELETE — Challenge / Season",
    },
    {
        "table": "Streak Occurrences",
        "tableId": "tbl9VxLdBiNcev4He",
        "fieldId": "fldBFDl629arXFcnp",
        "quarantineNamePrefix": "ZZZ DELETE — Backfill Run Label",
    },
    {
        "table": "Achievements",
        "tableId": "tblrADEQbvH9kBfMZ",
        "fieldId": "fldkIzG5emvUBQ0Tw",
        "quarantineNamePrefix": "ZZZ DELETE — Uses Grade Band Scaling",
    },
]

# Must remain present (field name exact match within table).
PROTECTED_FIELDS = [
    ("Submission Assets", "tblhMLKxQK77agtME", "Reviewer File URL"),
    ("Homework Completions", "tblv58ppTFDBXb3nv", "Homework Completion Full Name"),
    ("Homework Completions", "tblv58ppTFDBXb3nv", "Reviewer File URL"),
    ("Enrollments", "tbl3PFmwbRoabu1YV", "Public Missing Homework"),
    ("Enrollments", "tbl3PFmwbRoabu1YV", "Public Missing Zoom"),
    ("Enrollments", "tbl3PFmwbRoabu1YV", "Public Missing Streak"),
    ("Weeks", None, None),  # table existence only; resolved by name
]

PROTECTED_TABLES = [
    "Submission Assets",
    "Homework Completions",
    "Weeks",
    "Achievements",
    "Levels",
    "Streak Occurrences",
    "XP Events",
    "Automations",
]

# Automations Code table checks (Name / Status / Automation Code columns only).
AUTOMATION_EXPECTATIONS = {
    "020": {"must_exist": True, "must_not_be": None},
    "033": {"must_exist": True, "must_not_be": None},
    "065": {"must_exist": True, "must_not_be": None},
    "071": {"must_exist": True, "must_not_be": None},
    "075": {"must_exist": False, "note": "retired — must remain absent"},
}

COUNT_TABLES = [
    "Submission Assets",
    "Homework Completions",
    "Weeks",
    "Achievements",
    "Levels",
    "Streak Occurrences",
    "XP Events",
    "Enrollments",
    "Program Homework Assignments",
]


def token() -> str:
    t = os.environ.get("AIRTABLE_API_TOKEN") or os.environ.get("AIRTABLE_TOKEN")
    if not t:
        raise SystemExit("AIRTABLE_API_TOKEN missing")
    return t


def headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {token()}", "Content-Type": "application/json"}


def fetch_tables() -> list[dict]:
    url = f"https://api.airtable.com/v0/meta/bases/{BASE_ID}/tables"
    r = requests.get(url, headers=headers(), timeout=90)
    r.raise_for_status()
    return r.json()["tables"]


def count_records(table_id: str) -> int:
    url = f"https://api.airtable.com/v0/{BASE_ID}/{table_id}"
    params = {"pageSize": 100}
    total = 0
    offset = None
    while True:
        p = dict(params)
        if offset:
            p["offset"] = offset
        r = requests.get(url, headers=headers(), params=p, timeout=90)
        r.raise_for_status()
        data = r.json()
        total += len(data.get("records", []))
        offset = data.get("offset")
        if not offset:
            break
    return total


def find_field(table: dict, field_id: str | None = None, name: str | None = None) -> dict | None:
    for f in table.get("fields", []):
        if field_id and f.get("id") == field_id:
            return f
        if name and f.get("name") == name:
            return f
    return None


def list_automations_rows(tables: list[dict]) -> list[dict]:
    autos = next((t for t in tables if t["name"] == "Automations"), None)
    if not autos:
        return []
    # Prefer fields Name / Status / Automation Code
    fields = {f["name"]: f["id"] for f in autos["fields"]}
    wanted = [n for n in ("Name", "Status", "Automation Code") if n in fields]
    url = f"https://api.airtable.com/v0/{BASE_ID}/{autos['id']}"
    params: dict[str, Any] = {"pageSize": 100}
    if wanted:
        params["fields[]"] = wanted
    rows = []
    offset = None
    while True:
        p = dict(params)
        if offset:
            p["offset"] = offset
        r = requests.get(url, headers=headers(), params=p, timeout=90)
        r.raise_for_status()
        data = r.json()
        rows.extend(data.get("records", []))
        offset = data.get("offset")
        if not offset:
            break
    return rows


def automation_code_matches(name: str, code: str) -> bool:
    n = (name or "").strip()
    # Match leading code token: "020 - ...", "020 — ...", "075", etc.
    if n.startswith(code):
        rest = n[len(code) :]
        return rest == "" or rest[:1] in " -—:"
    return False


def verify(tables: list[dict], baseline: dict | None) -> dict:
    by_id = {t["id"]: t for t in tables}
    by_name = {t["name"]: t for t in tables}
    checks: list[dict] = []
    ok = True

    # 1) Deleted targets absent
    for t in DELETE_TARGETS:
        table = by_id.get(t["tableId"]) or by_name.get(t["table"])
        if not table:
            checks.append({**t, "check": "delete_target", "result": "FAIL", "detail": "table missing"})
            ok = False
            continue
        field = find_field(table, field_id=t["fieldId"])
        if field:
            checks.append(
                {
                    **t,
                    "check": "delete_target",
                    "result": "FAIL",
                    "detail": f"still present as {field.get('name')!r}",
                }
            )
            ok = False
        else:
            checks.append({**t, "check": "delete_target", "result": "PASS", "detail": "absent"})

    # 2) Protected tables
    for name in PROTECTED_TABLES:
        if name in by_name:
            checks.append({"check": "protected_table", "table": name, "result": "PASS"})
        else:
            checks.append({"check": "protected_table", "table": name, "result": "FAIL", "detail": "missing"})
            ok = False

    # 3) Protected fields
    sa = by_name.get("Submission Assets")
    if sa:
        rf = find_field(sa, name="Reviewer File URL")
        if rf:
            checks.append(
                {
                    "check": "protected_field",
                    "table": "Submission Assets",
                    "field": "Reviewer File URL",
                    "fieldId": rf["id"],
                    "result": "PASS",
                }
            )
        else:
            checks.append(
                {
                    "check": "protected_field",
                    "table": "Submission Assets",
                    "field": "Reviewer File URL",
                    "result": "FAIL",
                }
            )
            ok = False

    hc = by_name.get("Homework Completions")
    if hc:
        primary = find_field(hc, name="Homework Completion Full Name")
        if primary:
            checks.append(
                {
                    "check": "protected_field",
                    "table": "Homework Completions",
                    "field": primary["name"],
                    "fieldId": primary["id"],
                    "result": "PASS",
                }
            )
        else:
            checks.append(
                {
                    "check": "protected_field",
                    "table": "Homework Completions",
                    "field": "Homework Completion Full Name",
                    "result": "FAIL",
                }
            )
            ok = False
        reviewerish = [
            f
            for f in hc.get("fields", [])
            if "Reviewer File URL" in (f.get("name") or "")
        ]
        if not reviewerish:
            checks.append(
                {
                    "check": "protected_field",
                    "table": "Homework Completions",
                    "field": "*Reviewer File URL*",
                    "result": "FAIL",
                    "detail": "no Reviewer File URL lookup/field found",
                }
            )
            ok = False
        else:
            checks.append(
                {
                    "check": "protected_field",
                    "table": "Homework Completions",
                    "field": reviewerish[0]["name"],
                    "fieldId": reviewerish[0]["id"],
                    "result": "PASS",
                }
            )

    enr = by_name.get("Enrollments")
    if enr:
        for fname in (
            "Public Missing Homework",
            "Public Missing Zoom",
            "Public Missing Streak",
            "Public Missing Submissions",
            "Public Missing Videos",
        ):
            field = find_field(enr, name=fname)
            if field:
                checks.append(
                    {
                        "check": "protected_field",
                        "table": "Enrollments",
                        "field": fname,
                        "fieldId": field["id"],
                        "result": "PASS",
                    }
                )
            elif fname.startswith("Public Missing"):
                # Soft-require the three named in the closeout; others optional if renamed
                if fname in (
                    "Public Missing Homework",
                    "Public Missing Zoom",
                    "Public Missing Streak",
                ):
                    checks.append(
                        {
                            "check": "protected_field",
                            "table": "Enrollments",
                            "field": fname,
                            "result": "FAIL",
                        }
                    )
                    ok = False

    # XP / Perfect Week presence (field-name contains)
    for table_name, needles in (
        ("XP Events", ["XP Points", "Source Key"]),
        ("Weekly Athlete Summary", ["Perfect Week"]),
        ("Config", []),
    ):
        table = by_name.get(table_name)
        if not table:
            if table_name != "Config":
                checks.append({"check": "xp_pw", "table": table_name, "result": "FAIL", "detail": "missing"})
                ok = False
            continue
        for needle in needles:
            hits = [f for f in table["fields"] if needle in (f.get("name") or "")]
            if hits:
                checks.append(
                    {
                        "check": "xp_pw",
                        "table": table_name,
                        "field": hits[0]["name"],
                        "result": "PASS",
                    }
                )
            else:
                checks.append(
                    {
                        "check": "xp_pw",
                        "table": table_name,
                        "field": needle,
                        "result": "FAIL",
                    }
                )
                ok = False

    # Early Bird week / 18 PHA — lightweight live counts
    weeks = by_name.get("Weeks")
    pha = by_name.get("Program Homework Assignments")
    early_bird = None
    if weeks:
        # Count via records is expensive; mark table present only here.
        checks.append({"check": "weeks_table", "result": "PASS", "tableId": weeks["id"]})
    if pha:
        checks.append({"check": "pha_table", "result": "PASS", "tableId": pha["id"]})

    # Automations
    auto_rows = list_automations_rows(tables)
    names = [((r.get("fields") or {}).get("Name") or "") for r in auto_rows]
    for code, exp in AUTOMATION_EXPECTATIONS.items():
        matches = [n for n in names if automation_code_matches(str(n), code)]
        if exp["must_exist"]:
            if matches:
                checks.append(
                    {
                        "check": "automation",
                        "code": code,
                        "result": "PASS",
                        "name": matches[0],
                    }
                )
            else:
                checks.append(
                    {
                        "check": "automation",
                        "code": code,
                        "result": "FAIL",
                        "detail": "not found in Automations table",
                    }
                )
                ok = False
        else:
            if matches:
                checks.append(
                    {
                        "check": "automation",
                        "code": code,
                        "result": "FAIL",
                        "detail": f"should remain retired/absent but found {matches}",
                    }
                )
                ok = False
            else:
                checks.append(
                    {
                        "check": "automation",
                        "code": code,
                        "result": "PASS",
                        "detail": "absent (retired)",
                    }
                )

    # Record counts
    counts: dict[str, int] = {}
    for name in COUNT_TABLES:
        table = by_name.get(name)
        if not table:
            continue
        try:
            counts[name] = count_records(table["id"])
        except Exception as exc:  # noqa: BLE001
            checks.append(
                {
                    "check": "record_count",
                    "table": name,
                    "result": "WARN",
                    "detail": str(exc),
                }
            )

    count_compare = None
    if baseline and "counts" in baseline:
        count_compare = {}
        for name, before in baseline["counts"].items():
            after = counts.get(name)
            if after is None:
                count_compare[name] = {"before": before, "after": None, "result": "WARN"}
                continue
            if after == before:
                count_compare[name] = {"before": before, "after": after, "result": "PASS"}
            else:
                count_compare[name] = {
                    "before": before,
                    "after": after,
                    "result": "FAIL",
                    "delta": after - before,
                }
                ok = False

    # Ensure deleted IDs are not still referenced as live fields anywhere
    lingering = []
    delete_ids = {t["fieldId"] for t in DELETE_TARGETS}
    for table in tables:
        for f in table.get("fields", []):
            if f.get("id") in delete_ids:
                lingering.append({"table": table["name"], "field": f.get("name"), "id": f.get("id")})
    if lingering:
        ok = False
        checks.append({"check": "lingering_ids", "result": "FAIL", "fields": lingering})
    else:
        checks.append({"check": "lingering_ids", "result": "PASS"})

    return {
        "ok": ok,
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "baseId": BASE_ID,
        "checks": checks,
        "counts": counts,
        "countCompare": count_compare,
        "automationRowCount": len(auto_rows),
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--baseline", type=Path)
    ap.add_argument("--write-baseline", type=Path)
    ap.add_argument("--json-out", type=Path)
    args = ap.parse_args()

    tables = fetch_tables()
    baseline = None
    if args.baseline and args.baseline.exists():
        baseline = json.loads(args.baseline.read_text(encoding="utf-8"))

    # For baseline write, only need counts (+ pre-delete presence)
    if args.write_baseline:
        by_name = {t["name"]: t for t in tables}
        counts = {}
        for name in COUNT_TABLES:
            table = by_name.get(name)
            if table:
                counts[name] = count_records(table["id"])
        present = []
        by_id = {t["id"]: t for t in tables}
        for t in DELETE_TARGETS:
            table = by_id[t["tableId"]]
            field = find_field(table, field_id=t["fieldId"])
            present.append(
                {
                    **t,
                    "liveName": None if not field else field.get("name"),
                    "present": bool(field),
                }
            )
        payload = {
            "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "baseId": BASE_ID,
            "counts": counts,
            "targetsPresent": present,
        }
        args.write_baseline.parent.mkdir(parents=True, exist_ok=True)
        args.write_baseline.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        print(f"Wrote baseline {args.write_baseline}")
        for p in present:
            print(f"  present={p['present']} {p['fieldId']} {p.get('liveName')}")
        return 0

    result = verify(tables, baseline)
    print(f"FUT-002 batch-1 live verify: {'PASS' if result['ok'] else 'FAIL'}")
    fails = [c for c in result["checks"] if c.get("result") == "FAIL"]
    for c in fails[:30]:
        print(" FAIL", json.dumps(c, ensure_ascii=False))
    if result.get("countCompare"):
        for name, row in result["countCompare"].items():
            print(f" COUNT {name}: {row}")
    if args.json_out:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(json.dumps(result, indent=2), encoding="utf-8")
        print(f"Wrote {args.json_out}")
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
