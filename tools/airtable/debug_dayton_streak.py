#!/usr/bin/env python3
"""Debug streak dates for Dayton Fox (and compare Riley)."""

from __future__ import annotations

import os
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path

import requests
from dotenv import load_dotenv

BASE_ID = "appn84sqPw03zEbTT"
DAYTON = "recAHTFTFc2q4y59i"
RILEY = "recNe84xp4corSBmm"


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


def parse_date(value) -> datetime.date | None:
    if not value:
        return None
    raw = str(value)[:10]
    try:
        return datetime.strptime(raw, "%Y-%m-%d").date()
    except ValueError:
        return None


def list_all_submissions(session: requests.Session) -> list[dict]:
    url = f"https://api.airtable.com/v0/{BASE_ID}/Submissions"
    fields = [
        "Enrollment",
        "Activity Date",
        "Activity Date Key",
        "Count This Submission?",
        "Total Shots Counted",
        "Duplicate Review Status",
        "Week",
    ]
    records: list[dict] = []
    offset: str | None = None
    while True:
        params: dict = {"pageSize": 100}
        for i, name in enumerate(fields):
            params[f"fields[{i}]"] = name
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


def first_enrollment_id(value) -> str:
    if isinstance(value, list) and value:
        item = value[0]
        return item if isinstance(item, str) else str(item.get("id") or "")
    return ""


def list_streak_occurrences(session: requests.Session, enrollment_id: str) -> list[dict]:
    url = f"https://api.airtable.com/v0/{BASE_ID}/Streak%20Occurrences"
    fields = [
        "Enrollment",
        "Streak Days",
        "Streak Start Date",
        "Streak End Date",
        "Gate Eligible Streak Days",
        "Active?",
        "Source Status",
        "Achievement",
    ]
    records: list[dict] = []
    offset: str | None = None
    while True:
        params: dict = {"pageSize": 100}
        for i, name in enumerate(fields):
            params[f"fields[{i}]"] = name
        if offset:
            params["offset"] = offset
        resp = session.get(url, params=params, timeout=120)
        resp.raise_for_status()
        data = resp.json()
        records.extend(data.get("records", []))
        offset = data.get("offset")
        if not offset:
            break
    return [
        r
        for r in records
        if first_enrollment_id(r.get("fields", {}).get("Enrollment")) == enrollment_id
    ]


def enrollment_fields(session: requests.Session, enrollment_id: str) -> dict:
    url = f"https://api.airtable.com/v0/{BASE_ID}/Enrollments"
    formula = f"RECORD_ID() = '{enrollment_id}'"
    fields = ["Full Athlete Name", "Longest Streak Days"]
    params = {"filterByFormula": formula, "maxRecords": 1}
    for i, f in enumerate(fields):
        params[f"fields[{i}]"] = f
    resp = session.get(url, params=params, timeout=60)
    resp.raise_for_status()
    records = resp.json().get("records", [])
    return records[0].get("fields", {}) if records else {}


def all_runs(dates: set[datetime.date]) -> list[tuple[int, datetime.date, datetime.date]]:
    if not dates:
        return []
    sorted_dates = sorted(dates)
    runs: list[tuple[int, datetime.date, datetime.date]] = []
    cur_start = sorted_dates[0]
    cur_len = 1
    for i in range(1, len(sorted_dates)):
        gap = (sorted_dates[i] - sorted_dates[i - 1]).days
        if gap == 1:
            cur_len += 1
        else:
            runs.append((cur_len, cur_start, sorted_dates[i - 1]))
            cur_start = sorted_dates[i]
            cur_len = 1
    runs.append((cur_len, cur_start, sorted_dates[-1]))
    runs.sort(key=lambda r: (-r[0], r[1]))
    return runs


def analyze(name: str, enrollment_id: str, session: requests.Session, all_subs: list[dict]) -> None:
    print("=" * 72)
    print(name, enrollment_id)
    print("Enrollment:", enrollment_fields(session, enrollment_id))
    subs = [
        s
        for s in all_subs
        if first_enrollment_id(s.get("fields", {}).get("Enrollment")) == enrollment_id
    ]
    print(f"Submissions linked: {len(subs)}")

    by_key: dict[str, list[dict]] = defaultdict(list)
    for sub in subs:
        f = sub.get("fields", {})
        key = f.get("Activity Date Key") or str(f.get("Activity Date", ""))[:10]
        by_key[key].append(f)

    counted_keys = sorted(
        k for k, rows in by_key.items() if any(r.get("Count This Submission?") == 1 for r in rows)
    )
    counted_dates = {parse_date(k) for k in counted_keys if parse_date(k)}

    print(f"Unique counted Activity Date Keys: {len(counted_keys)}")
    print("First 15 counted keys:")
    for k in counted_keys[:15]:
        rows = by_key[k]
        counted = sum(1 for r in rows if r.get("Count This Submission?") == 1)
        print(
            f"  {k}  subs={len(rows)} counted={counted}  "
            f"shots_counted={rows[0].get('Total Shots Counted')}"
        )

    april = [k for k in counted_keys if k.startswith("2026-04")]
    print("All April counted keys:", april)

    # gap check around late April
    if counted_dates:
        start = min(counted_dates)
        end = max(counted_dates)
        missing = []
        d = start
        while d <= end:
            if d not in counted_dates:
                missing.append(d.isoformat())
            d += timedelta(days=1)
        print(f"Calendar span {start} -> {end}: missing {len(missing)} days")
        if missing[:30]:
            print("  First missing:", missing[:30])
        if len(missing) > 30:
            print("  ...")
            print("  Last missing:", missing[-10:])

    runs = all_runs(counted_dates)
    print("Top 5 consecutive runs (all counted days):")
    for run in runs[:5]:
        print(f"  {run[0]} days  {run[1]} -> {run[2]}")

    # 053-style: Count This Submission? = 1 AND Total Shots Counted > 0, use Activity Date
    valid_053_dates = set()
    for sub in subs:
        f = sub.get("fields", {})
        if f.get("Count This Submission?") != 1:
            continue
        shots = f.get("Total Shots Counted") or 0
        if shots <= 0:
            continue
        d = parse_date(f.get("Activity Date"))
        if d:
            valid_053_dates.add(d)
    if valid_053_dates:
        runs_053 = all_runs(valid_053_dates)
        print(f"053-style valid dates (Activity Date + shots>0): {len(valid_053_dates)}")
        print("Top 3 runs (053-style):")
        for run in runs_053[:3]:
            print(f"  {run[0]} days  {run[1]} -> {run[2]}")

    streaks = list_streak_occurrences(session, enrollment_id)
    active = [
        s for s in streaks if s.get("fields", {}).get("Active?") is True
    ]
    print(f"Streak Occurrences: {len(streaks)} total, {len(active)} active")
    top_streaks = sorted(
        active,
        key=lambda s: int(float(s.get("fields", {}).get("Streak Days") or 0)),
        reverse=True,
    )[:8]
    for s in top_streaks:
        f = s.get("fields", {})
        print(
            f"  {f.get('Streak Days')} days  {str(f.get('Streak Start Date',''))[:10]} -> "
            f"{str(f.get('Streak End Date',''))[:10]}  status={f.get('Source Status')}"
        )
    print()


def main() -> None:
    session = requests.Session()
    session.headers["Authorization"] = f"Bearer {load_token()}"
    all_subs = list_all_submissions(session)
    analyze("Dayton Fox", DAYTON, session, all_subs)
    analyze("Riley Geraghty", RILEY, session, all_subs)


if __name__ == "__main__":
    main()
