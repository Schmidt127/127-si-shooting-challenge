#!/usr/bin/env python3
"""FUT-002 batch-1: verify + delete five ZZZ DELETE — quarantined fields.

Dry-run by default. Pass --delete to attempt Meta API field deletion.
Only deletes fields whose live name starts with 'ZZZ DELETE'.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv

REPO = Path(__file__).resolve().parents[2]
load_dotenv(REPO / ".env.local")
load_dotenv(REPO / "tools" / "airtable" / ".env")

BASE_ID = "appn84sqPw03zEbTT"
TARGETS = [
    {
        "table": "Homework Completions",
        "tableId": "tblv58ppTFDBXb3nv",
        "fieldId": "fldHchlovIaPlGKLk",
        "expectedHint": "Submission Asset Review Summary",
    },
    {
        "table": "Levels",
        "tableId": "tblU6EWmc1jCpgRHe",
        "fieldId": "fldTzIGODB2e03rvE",
        "expectedHint": "Enrollments 3",
    },
    {
        "table": "Streak Occurrences",
        "tableId": "tbl9VxLdBiNcev4He",
        "fieldId": "fldltgFPGVXHwRj4X",
        "expectedHint": "Challenge / Season",
    },
    {
        "table": "Streak Occurrences",
        "tableId": "tbl9VxLdBiNcev4He",
        "fieldId": "fldBFDl629arXFcnp",
        "expectedHint": "Backfill Run Label",
    },
    {
        "table": "Achievements",
        "tableId": "tblrADEQbvH9kBfMZ",
        "fieldId": "fldkIzG5emvUBQ0Tw",
        "expectedHint": "Uses Grade Band Scaling",
    },
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
    r = requests.get(url, headers=headers(), timeout=60)
    r.raise_for_status()
    return r.json()["tables"]


def verify(tables: list[dict]) -> list[dict]:
    by_id = {t["id"]: t for t in tables}
    results = []
    for t in TARGETS:
        table = by_id.get(t["tableId"])
        if not table:
            results.append({**t, "status": "TABLE_MISSING", "liveName": None})
            continue
        field = next((f for f in table["fields"] if f["id"] == t["fieldId"]), None)
        if not field:
            results.append({**t, "status": "ALREADY_ABSENT", "liveName": None})
            continue
        name = field.get("name") or ""
        if not name.startswith("ZZZ DELETE"):
            results.append(
                {
                    **t,
                    "status": "NAME_MISMATCH_STOP",
                    "liveName": name,
                    "type": field.get("type"),
                }
            )
            continue
        results.append(
            {
                **t,
                "status": "QUARANTINED_OK",
                "liveName": name,
                "type": field.get("type"),
                "description": field.get("description"),
            }
        )
    return results


def delete_field(table_id: str, field_id: str) -> tuple[int, str]:
    url = (
        f"https://api.airtable.com/v0/meta/bases/{BASE_ID}/tables/"
        f"{table_id}/fields/{field_id}"
    )
    r = requests.delete(url, headers=headers(), timeout=60)
    return r.status_code, r.text[:800]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--delete", action="store_true")
    ap.add_argument("--json-out", type=Path)
    args = ap.parse_args()

    tables = fetch_tables()
    results = verify(tables)
    stops = [r for r in results if r["status"] == "NAME_MISMATCH_STOP"]
    if stops:
        print(json.dumps({"ok": False, "stops": stops}, indent=2))
        return 2

    print("VERIFY:")
    for r in results:
        print(f"  {r['status']:18} {r['fieldId']}  {r.get('liveName')}")

    delete_results = []
    if args.delete:
        for r in results:
            if r["status"] != "QUARANTINED_OK":
                delete_results.append({**r, "http": None, "body": None})
                continue
            code, body = delete_field(r["tableId"], r["fieldId"])
            delete_results.append({**r, "http": code, "body": body})
            print(f"DELETE {r['fieldId']} -> {code}")
            if code not in (200, 204):
                print(f"  body: {body}")

        # re-verify
        tables2 = fetch_tables()
        after = verify(tables2)
        print("AFTER:")
        for r in after:
            print(f"  {r['status']:18} {r['fieldId']}  {r.get('liveName')}")
        payload = {"verify": results, "delete": delete_results, "after": after}
    else:
        payload = {"verify": results}

    if args.json_out:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        print(f"Wrote {args.json_out}")

    if args.delete:
        remaining = [r for r in payload["after"] if r["status"] == "QUARANTINED_OK"]
        api_fail = [r for r in delete_results if r.get("http") not in (200, 204, None)]
        if remaining or api_fail:
            return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
