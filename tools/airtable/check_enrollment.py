#!/usr/bin/env python3
"""Quick enrollment lookup by record ID."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv

BASE_ID = "appn84sqPw03zEbTT"
DEFAULT_ID = "recbJ71DHseETAQRP"  # Jackson Elders

GATE_FIELDS = [
    "Full Athlete Name",
    "Current Level - Public Facing Display",
    "Next Level",
    "Level Status",
    "Level Gate Rule",
    "Lifetime XP Total",
    "XP Needed for Next Level",
    "Total Submissions",
    "Total Homework Completions",
    "Total Video Submissions",
    "Total Zoom Attendances",
    "Longest Streak Days",
    "Gate Passes",
    "Gate Enabled Status",
    "Gate Debug Summary",
    "Public Missing Submissions",
    "Public Missing Homework",
    "Public Missing Videos",
    "Public Missing Zoom",
    "Public Missing Streak",
    "Gate Minimum: Submissions",
    "Gate Minimum: Homework",
    "Gate Minimum: Videos",
    "Gate Minimum: Zoom Meetings",
    "Gate Minimum: Streak Days",
    "Meets Gate: Submissions",
    "Meets Gate: Homework",
    "Meets Gate: Videos",
    "Meets Gate: Zoom Meetings",
    "Meets Gate: Streak",
    "Level Recalc Needed?",
]


def load_token() -> str:
    tools_env = Path(__file__).with_name(".env")
    web_env = Path(__file__).resolve().parents[2] / "web" / ".env.local"
    if tools_env.exists():
        load_dotenv(tools_env, override=True)
    if web_env.exists():
        load_dotenv(web_env, override=True)
    return os.getenv("AIRTABLE_TOKEN") or os.getenv("AIRTABLE_API_TOKEN") or ""


def txt(value) -> str:
    if value is None:
        return ""
    if isinstance(value, list):
        parts = []
        for item in value:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict):
                parts.append(str(item.get("name") or item.get("id") or item))
            else:
                parts.append(str(item))
        return ", ".join(parts)
    return str(value)


def main() -> None:
    enrollment_id = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_ID
    session = requests.Session()
    session.headers["Authorization"] = f"Bearer {load_token()}"
    resp = session.get(
        f"https://api.airtable.com/v0/{BASE_ID}/Enrollments/{enrollment_id}",
        timeout=60,
    )
    resp.raise_for_status()
    fields_out = resp.json().get("fields", {})
    if not fields_out:
        raise SystemExit(f"Enrollment not found: {enrollment_id}")

    print(f"Enrollment ID: {enrollment_id}\n")
    for name in GATE_FIELDS:
        if name in fields_out:
            print(f"{name}: {txt(fields_out.get(name))}")

    print("\n--- Other gate-ish fields on record ---")
    for key in sorted(fields_out):
        lower = key.lower()
        if any(token in lower for token in ("gate", "missing", "level", "homework", "next")):
            if key not in GATE_FIELDS:
                print(f"{key}: {txt(fields_out.get(key))}")

    if "--json" in sys.argv:
        print("\n--- JSON ---")
        print(json.dumps({k: fields_out.get(k) for k in GATE_FIELDS if k in fields_out}, indent=2))


if __name__ == "__main__":
    main()
