#!/usr/bin/env python3
"""
Create 5 simple-total shooting submissions per Newcomer boy (Jun 26–30, 2026).

Lincoln: 60 shots/day. Jackson: 80 shots/day.
Requires CONFIRM_WRITE=true in env or --write flag.
"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import requests
from dotenv import load_dotenv

BASE_ID = "appn84sqPw03zEbTT"
DENVER = ZoneInfo("America/Denver")

ATHLETES = {
    "Lincoln Newcomer": {
        "enrollment_id": "rec8Z5KzsNif6mtpG",
        "shots_per_day": 60,
    },
    "Jackson Newcomer": {
        "enrollment_id": "recmhY61iU2AwEiMI",
        "shots_per_day": 80,
    },
}
DATES = ["2026-06-26", "2026-06-27", "2026-06-28", "2026-06-29", "2026-06-30"]


def load_token() -> str:
    tools_env = Path(__file__).with_name(".env")
    web_env = Path(__file__).resolve().parents[2] / "web" / ".env.local"
    if tools_env.exists():
        load_dotenv(tools_env, override=True)
    if web_env.exists():
        load_dotenv(web_env, override=True)
    token = os.getenv("AIRTABLE_TOKEN") or os.getenv("AIRTABLE_API_TOKEN") or ""
    if not token:
        raise SystemExit("Missing PAT")
    return token


def get_record(session: requests.Session, table: str, record_id: str) -> dict:
    url = f"https://api.airtable.com/v0/{BASE_ID}/{requests.utils.quote(table)}/{record_id}"
    resp = session.get(url, timeout=60)
    resp.raise_for_status()
    return resp.json()


def list_weeks(session: requests.Session) -> list[dict]:
    url = f"https://api.airtable.com/v0/{BASE_ID}/Weeks"
    records: list[dict] = []
    offset: str | None = None
    while True:
        params: dict = {"pageSize": 100}
        if offset:
            params["offset"] = offset
        resp = session.get(url, params=params, timeout=120)
        resp.raise_for_status()
        data = resp.json()
        records.extend(data.get("records", []))
        offset = data.get("offset")
        if not offset:
            break
    return records


def parse_date(value) -> datetime.date | None:
    if not value:
        return None
    raw = str(value)[:10]
    try:
        return datetime.strptime(raw, "%Y-%m-%d").date()
    except ValueError:
        return None


def week_for_date(weeks: list[dict], date_key: str) -> str | None:
    target = datetime.strptime(date_key, "%Y-%m-%d").date()
    for week in weeks:
        f = week.get("fields", {})
        start = parse_date(f.get("Start Date"))
        end = parse_date(f.get("End Date"))
        if start and end and start <= target <= end:
            return week["id"]
    return None


def existing_dates(session: requests.Session, enrollment_id: str) -> set[str]:
    url = f"https://api.airtable.com/v0/{BASE_ID}/Submissions"
    found: set[str] = set()
    offset: str | None = None
    while True:
        params: dict = {"pageSize": 100}
        if offset:
            params["offset"] = offset
        data = session.get(url, params=params, timeout=120).json()
        for rec in data.get("records", []):
            f = rec.get("fields", {})
            enr = f.get("Enrollment") or []
            if not enr or enr[0] != enrollment_id:
                continue
            ad = str(f.get("Activity Date", ""))[:10]
            if ad in DATES:
                found.add(ad)
        offset = data.get("offset")
        if not offset:
            break
    return found


def activity_date_iso(date_key: str) -> str:
    # Noon Denver — matches challenge date handling patterns
    dt = datetime.strptime(date_key, "%Y-%m-%d").replace(
        hour=12, minute=0, second=0, tzinfo=DENVER
    )
    return dt.isoformat()


def build_plans(session: requests.Session) -> list[dict]:
    weeks = list_weeks(session)
    plans: list[dict] = []
    for label, cfg in ATHLETES.items():
        enr = get_record(session, "Enrollments", cfg["enrollment_id"])
        ef = enr.get("fields", {})
        athlete_ids = ef.get("Athlete") or []
        if not athlete_ids:
            raise SystemExit(f"No Athlete link on enrollment for {label}")
        athlete_id = athlete_ids[0]
        taken = existing_dates(session, cfg["enrollment_id"])
        for date_key in DATES:
            if date_key in taken:
                print(f"SKIP (exists): {label} {date_key}")
                continue
            week_id = week_for_date(weeks, date_key)
            if not week_id:
                raise SystemExit(f"No Week record contains {date_key} for {label}")
            plans.append(
                {
                    "label": label,
                    "enrollment_id": cfg["enrollment_id"],
                    "athlete_id": athlete_id,
                    "date": date_key,
                    "shots": cfg["shots_per_day"],
                    "week_id": week_id,
                    "fields": {
                        "Enrollment": [cfg["enrollment_id"]],
                        "Athlete": [athlete_id],
                        "Week": [week_id],
                        "Activity Date": activity_date_iso(date_key),
                        "Shot Total": cfg["shots_per_day"],
                        "Duplicate Review Status": "Count It",
                    },
                }
            )
    return plans


def create_records(session: requests.Session, plans: list[dict]) -> list[dict]:
    url = f"https://api.airtable.com/v0/{BASE_ID}/Submissions"
    created: list[dict] = []
    for i in range(0, len(plans), 10):
        chunk = plans[i : i + 10]
        payload = {
            "records": [{"fields": p["fields"]} for p in chunk],
            "typecast": True,
        }
        resp = session.post(url, json=payload, timeout=120)
        if not resp.ok:
            raise SystemExit(f"Create failed {resp.status_code}: {resp.text[:800]}")
        for plan, rec in zip(chunk, resp.json().get("records", [])):
            created.append({**plan, "id": rec["id"], "created_fields": rec.get("fields", {})})
    return created


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true", help="Actually create Airtable records")
    args = parser.parse_args()
    confirm = args.write or os.getenv("CONFIRM_WRITE", "").lower() in {"1", "true", "yes"}

    session = requests.Session()
    session.headers["Authorization"] = f"Bearer {load_token()}"
    session.headers["Content-Type"] = "application/json"

    plans = build_plans(session)
    print(f"Planned creates: {len(plans)}")
    for p in plans:
        print(
            f"  {p['label']}  {p['date']}  {p['shots']} shots  "
            f"week={p['week_id']}"
        )

    if not plans:
        print("Nothing to create.")
        return

    if not confirm:
        print("\nDry run only. Re-run with --write to create records.")
        return

    created = create_records(session, plans)
    print(f"\nCreated {len(created)} submissions:")
    for row in created:
        cf = row["created_fields"]
        print(
            f"  {row['id']}  {row['label']}  {row['date']}  "
            f"shots={cf.get('Shot Total')}  counted={cf.get('Count This Submission?')}  "
            f"shots_counted={cf.get('Total Shots Counted')}"
        )
    print(
        "\nNext: allow automations (007/010/031/041/053) to process, "
        "or run level/XP audits for these enrollments."
    )


if __name__ == "__main__":
    main()
