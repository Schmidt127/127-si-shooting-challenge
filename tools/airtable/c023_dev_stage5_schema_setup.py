#!/usr/bin/env python3
"""DEV schema helpers for C-023 Stage 5 (verify / patch Submission Assets field)."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from urllib.parse import quote

import requests
from dotenv import load_dotenv

HERE = Path(__file__).parent
DEV_BASE = "appTetnuCZlCZdTCT"
META = f"https://api.airtable.com/v0/meta/bases/{DEV_BASE}/tables"


def load_env() -> None:
    load_dotenv(HERE / ".env", override=True)


def tok() -> str:
    t = os.getenv("AIRTABLE_TOKEN") or os.getenv("AIRTABLE_API_TOKEN") or ""
    if not t:
        raise SystemExit("ERROR: missing AIRTABLE_TOKEN")
    return t


def headers() -> dict:
    return {"Authorization": f"Bearer {tok()}", "Content-Type": "application/json"}


def fetch_schema() -> list[dict]:
    r = requests.get(META, headers=headers(), timeout=120)
    r.raise_for_status()
    return r.json().get("tables") or []


def table_fields(tables: list[dict], name: str) -> list[dict]:
    for t in tables:
        if t.get("name") == name:
            return t.get("fields") or []
    return []


def field_names(fields: list[dict]) -> set[str]:
    return {f.get("name") for f in fields if f.get("name")}


def ensure_submission_asset_text_field(field_name: str, description: str) -> dict:
    tables = fetch_schema()
    sa_fields = table_fields(tables, "Submission Assets")
    if field_name in field_names(sa_fields):
        return {"status": "exists", "field": field_name}

    table_id = next(t["id"] for t in tables if t.get("name") == "Submission Assets")
    r = requests.post(
        f"https://api.airtable.com/v0/meta/bases/{DEV_BASE}/tables/{table_id}/fields",
        headers=headers(),
        json={"name": field_name, "type": "singleLineText", "description": description},
        timeout=120,
    )
    if r.status_code == 403:
        return {
            "status": "manual_required",
            "field": field_name,
            "reason": "Token lacks schema write scope — add field in DEV manually",
        }
    r.raise_for_status()
    return {"status": "created", "field": field_name, "response": r.json()}


def verify_stage5_fields() -> dict:
    tables = fetch_schema()
    sa = field_names(table_fields(tables, "Submission Assets"))
    hc = field_names(table_fields(tables, "Homework Completions"))
    vf = field_names(table_fields(tables, "Video Feedback"))

    required_sa = {
        "Asset Reuse Decision",
        "Duplicate Resolution Applied?",
        "Duplicate Resolution Applied At",
        "Duplicate Resolution Error",
        "Duplicate Resolution Last Applied Decision",
    }
    optional_display = {
        "Linked Asset Reuse Decision",
        "Activity XP Display Label",
    }

    return {
        "submissionAssets": {
            "missing": sorted(required_sa - sa),
            "present": sorted(required_sa & sa),
        },
        "homeworkCompletions": {
            "displayFieldsMissing": sorted(optional_display - hc),
            "displayFieldsPresent": sorted(optional_display & hc),
        },
        "videoFeedback": {
            "displayFieldsMissing": sorted(optional_display - vf),
            "displayFieldsPresent": sorted(optional_display & vf),
        },
    }


def main() -> None:
    load_env()
    cmd = sys.argv[1] if len(sys.argv) > 1 else "verify"
    if cmd == "verify":
        print(json.dumps(verify_stage5_fields(), indent=2))
        return
    if cmd == "ensure":
        out = ensure_submission_asset_text_field(
            "Duplicate Resolution Last Applied Decision",
            "C-023 Stage 5 — last consequence decision applied by automation 116",
        )
        out["verify"] = verify_stage5_fields()
        print(json.dumps(out, indent=2, default=str))
        return
    raise SystemExit(f"unknown command: {cmd}")


if __name__ == "__main__":
    main()
