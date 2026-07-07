#!/usr/bin/env python3
"""One-off probe: C-019 Testing views — list views, filter metadata, Schmidt row counts.

Read-only. Uses tools/airtable/.env (never print token).
DEV base default: appTetnuCZlCZdTCT
"""
from __future__ import annotations

import json
import os
import sys
import urllib.parse
import urllib.request
from pathlib import Path

from dotenv import load_dotenv

REPO = Path(__file__).resolve().parents[2]
load_dotenv(Path(__file__).with_name(".env"), override=True)
web_env = REPO / "web" / ".env.local"
if web_env.exists():
    load_dotenv(web_env, override=True)

API = "https://api.airtable.com/v0"
DEV_BASE = "appTetnuCZlCZdTCT"
SCHMIDT_ENROLLMENT = "recgP9qZYjAhE7NXm"

TABLES = [
    ("Submissions", "Enrollment"),
    ("Submission Assets", "Enrollment - Linked"),
    ("Homework Completions", "Enrollment"),
    ("Video Feedback", "Enrollment"),
    ("XP Events", "Enrollment"),
    ("Weekly Athlete Summary", "Enrollment"),
    ("Streak Occurrences", "Enrollment"),
    ("Athlete Achievement Unlocks", "Enrollment"),
]

FORBIDDEN_FILTER_FIELDS = {
    "Is Test Record?",
    "Active?",
    "Activity Date",
    "Submitted At",
    "Upload Status",
    "XP Award Status",
    "Completion Status",
}


def token() -> str:
    t = os.getenv("AIRTABLE_TOKEN") or os.getenv("AIRTABLE_API_TOKEN") or ""
    if not t:
        print("ERROR: missing AIRTABLE_TOKEN in tools/airtable/.env")
        sys.exit(2)
    return t


def get(url: str) -> tuple[int, dict | list | str]:
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token()}"})
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            body = resp.read().decode()
            return resp.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        try:
            parsed = json.loads(body)
        except json.JSONDecodeError:
            parsed = body[:500]
        return e.code, parsed


def count_records(base_id: str, table: str, field: str) -> tuple[int, bool, str | None]:
    formula = f"{{{field}}} = '{SCHMIDT_ENROLLMENT}'"
    url = (
        f"{API}/{base_id}/{urllib.parse.quote(table)}"
        f"?pageSize=100&filterByFormula={urllib.parse.quote(formula)}"
    )
    total = 0
    pages = 0
    offset = None
    err = None
    while pages < 100:
        page_url = url if not offset else f"{url}&offset={offset}"
        status, data = get(page_url)
        if status != 200:
            err = f"HTTP {status}: {data}"
            return 0, False, err
        records = data.get("records", []) if isinstance(data, dict) else []
        total += len(records)
        offset = data.get("offset") if isinstance(data, dict) else None
        pages += 1
        if not offset:
            break
    return total, bool(offset), err


def summarize_filters(meta: dict) -> dict:
    out = {"hasFiltersKey": "filters" in meta, "filterSummary": None, "forbiddenMentioned": []}
    filters = meta.get("filters")
    if filters is None:
        return out
    out["filterSummary"] = json.dumps(filters)[:2000]
    blob = json.dumps(filters).lower()
    for name in FORBIDDEN_FILTER_FIELDS:
        if name.lower() in blob:
            out["forbiddenMentioned"].append(name)
    if SCHMIDT_ENROLLMENT in json.dumps(filters):
        out["schmidtRecordIdInFilters"] = True
    return out


def main() -> None:
    base_id = os.getenv("DEV_BASE_ID") or DEV_BASE
    print(f"base_id={base_id}")

    status, views_payload = get(f"{API}/meta/bases/{base_id}/views")
    print(f"list_views_status={status}")
    if status != 200:
        print(json.dumps(views_payload, indent=2)[:800])
        sys.exit(1)

    views = views_payload.get("views", [])
    print(f"view_count={len(views)}")
    if views:
        print(f"view_list_keys={sorted(views[0].keys())}")

    status, schema = get(f"{API}/meta/bases/{base_id}/tables")
    if status != 200:
        print(f"schema_error HTTP {status}")
        sys.exit(1)
    table_by_id = {t["id"]: t["name"] for t in schema.get("tables", [])}

    testing_views = [v for v in views if v.get("name") == "Testing"]
    print(f"testing_named_views={len(testing_views)}")

    results = []
    for table, field in TABLES:
        row = {
            "table": table,
            "enrollmentField": field,
            "testingViewExists": False,
            "testingViewId": None,
            "viewMetaStatus": None,
            "filterProbe": None,
            "schmidtRecordCount": None,
            "countError": None,
        }
        matches = [
            v
            for v in testing_views
            if table_by_id.get(v.get("tableId")) == table
        ]
        if matches:
            row["testingViewExists"] = True
            row["testingViewId"] = matches[0].get("id")
            vid = matches[0]["id"]
            vstatus, meta = get(f"{API}/meta/bases/{base_id}/views/{vid}")
            row["viewMetaStatus"] = vstatus
            if vstatus == 200 and isinstance(meta, dict):
                row["filterProbe"] = summarize_filters(meta)
                row["viewMetaKeys"] = sorted(meta.keys())

        count, truncated, err = count_records(base_id, table, field)
        row["schmidtRecordCount"] = count
        row["countTruncated"] = truncated
        row["countError"] = err
        results.append(row)

    print("\n=== TABLE RESULTS (JSON) ===")
    print(json.dumps(results, indent=2))

    # API create probe — document only, do not call write endpoints
    print("\n=== CAPABILITY SUMMARY ===")
    print("can_list_views=yes")
    print("can_read_view_basic_metadata=yes")
    has_any_filters = any(
        (r.get("filterProbe") or {}).get("hasFiltersKey") for r in results if r.get("filterProbe")
    )
    print(f"view_metadata_includes_filters_key={has_any_filters}")
    print("can_create_or_update_views_via_public_api=no (no POST/PATCH view endpoint documented)")


if __name__ == "__main__":
    main()
