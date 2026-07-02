#!/usr/bin/env python3
"""List homework completions for an enrollment."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv

BASE_ID = "appn84sqPw03zEbTT"
JACKSON = "recbJ71DHseETAQRP"


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
        return ", ".join(str(x) for x in value if x is not None)
    return str(value).strip()


def main() -> None:
    enrollment_id = sys.argv[1] if len(sys.argv) > 1 else JACKSON
    session = requests.Session()
    session.headers["Authorization"] = f"Bearer {load_token()}"
    fields = [
        "Enrollment",
        "Week",
        "Homework Item",
        "Completion Status",
        "Satisfactory?",
        "Counts Toward Gate?",
        "Counts Toward Homework Total?",
        "Submitted At",
        "Last Updated",
    ]
    url = f"https://api.airtable.com/v0/{BASE_ID}/Homework%20Completions"
    records = []
    offset = None
    while True:
        params: dict = {"pageSize": 100}
        for i, f in enumerate(fields):
            params[f"fields[{i}]"] = f
        if offset:
            params["offset"] = offset
        data = session.get(url, params=params, timeout=120).json()
        records.extend(data.get("records", []))
        offset = data.get("offset")
        if not offset:
            break

    rows = []
    for rec in records:
        f = rec.get("fields", {})
        enr = f.get("Enrollment") or []
        enr_ids = [e if isinstance(e, str) else e.get("id") for e in enr]
        if enrollment_id not in enr_ids:
            continue
        rows.append((rec["id"], f))

    print(f"Homework completion records: {len(rows)}\n")
    for rec_id, f in sorted(rows, key=lambda x: txt(x[1].get("Week"))):
        print(f"  {rec_id}")
        print(f"    Week: {txt(f.get('Week'))}")
        print(f"    Item: {txt(f.get('Homework Item'))}")
        print(f"    Status: {txt(f.get('Completion Status'))}")
        print(f"    Satisfactory?: {f.get('Satisfactory?')}")
        print(f"    Counts Toward Gate?: {f.get('Counts Toward Gate?')}")
        print(f"    Counts Toward Homework Total?: {f.get('Counts Toward Homework Total?')}")
        print()


if __name__ == "__main__":
    main()
