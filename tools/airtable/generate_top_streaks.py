#!/usr/bin/env python3
"""Top longest shooting streaks from counted submissions (one day = one+ counted sub)."""

from __future__ import annotations

import csv
import os
from collections import defaultdict
from datetime import datetime
from pathlib import Path

import requests
from dotenv import load_dotenv

BASE_ID = "appn84sqPw03zEbTT"
PREVIEW_DIR = Path(__file__).resolve().parent / "_preview"


def load_token() -> str:
    tools_env = Path(__file__).with_name(".env")
    web_env = Path(__file__).resolve().parents[2] / "web" / ".env.local"
    if tools_env.exists():
        load_dotenv(tools_env, override=True)
    if web_env.exists():
        load_dotenv(web_env, override=True)
    token = os.getenv("AIRTABLE_TOKEN") or os.getenv("AIRTABLE_API_TOKEN") or ""
    if not token:
        raise SystemExit("Missing PAT in tools/airtable/.env or web/.env.local")
    return token


def list_table(session: requests.Session, table: str, fields: list[str]) -> list[dict]:
    url = f"https://api.airtable.com/v0/{BASE_ID}/{requests.utils.quote(table)}"
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


def txt(value) -> str:
    if value is None:
        return ""
    if isinstance(value, list):
        return ", ".join(str(x) for x in value if x is not None)
    return str(value).strip()


def first_enrollment_id(value) -> str:
    if isinstance(value, list) and value:
        item = value[0]
        return item if isinstance(item, str) else str(item.get("id") or "")
    return ""


def parse_date(value) -> datetime.date | None:
    if not value:
        return None
    raw = str(value)[:10]
    try:
        return datetime.strptime(raw, "%Y-%m-%d").date()
    except ValueError:
        return None


def longest_run(dates: set[datetime.date]) -> tuple[int, datetime.date | None, datetime.date | None]:
    if not dates:
        return 0, None, None
    sorted_dates = sorted(dates)
    best_len = 1
    best_start = sorted_dates[0]
    best_end = sorted_dates[0]
    cur_start = sorted_dates[0]
    cur_len = 1
    for i in range(1, len(sorted_dates)):
        gap = (sorted_dates[i] - sorted_dates[i - 1]).days
        if gap == 1:
            cur_len += 1
        else:
            if cur_len > best_len:
                best_len, best_start, best_end = cur_len, cur_start, sorted_dates[i - 1]
            cur_start = sorted_dates[i]
            cur_len = 1
    if cur_len > best_len:
        best_len, best_start, best_end = cur_len, cur_start, sorted_dates[-1]
    return best_len, best_start, best_end


def main() -> None:
    session = requests.Session()
    session.headers["Authorization"] = f"Bearer {load_token()}"

    enrollment_fields = [
        "Full Athlete Name",
        "Athlete First Name",
        "Athlete Last Name",
        "Grade Band Label",
        "Grade",
        "School Name Lookup",
        "Gender",
        "School Year",
        "Parent Email - Cleaned",
        "Longest Streak Days",
        "Active?",
    ]
    enrollments = {r["id"]: r.get("fields", {}) for r in list_table(session, "Enrollments", enrollment_fields)}

    submission_fields = [
        "Enrollment",
        "Count This Submission?",
        "Activity Date",
        "Total Shots Counted",
    ]
    days_by_enrollment: dict[str, set[datetime.date]] = defaultdict(set)
    for submission in list_table(session, "Submissions", submission_fields):
        fields = submission.get("fields", {})
        if fields.get("Count This Submission?") != 1:
            continue
        if (fields.get("Total Shots Counted") or 0) <= 0:
            continue
        enrollment_id = first_enrollment_id(fields.get("Enrollment"))
        if not enrollment_id:
            continue
        date_key = parse_date(fields.get("Activity Date"))
        if date_key:
            days_by_enrollment[enrollment_id].add(date_key)

    results: list[dict] = []
    for enrollment_id, shot_days in days_by_enrollment.items():
        ef = enrollments.get(enrollment_id, {})
        if ef.get("Active?") is not True:
            continue
        streak_days, start, end = longest_run(shot_days)
        if streak_days <= 0:
            continue
        last = txt(ef.get("Athlete Last Name"))
        first = txt(ef.get("Athlete First Name"))
        year = txt(ef.get("School Year")) or "2025-2026"
        display = f"{last}, {first} - {year}" if last and first else txt(ef.get("Full Athlete Name"))
        results.append(
            {
                "Rank": 0,
                "Streak Days": streak_days,
                "Streak Start": start.isoformat() if start else "",
                "Streak End": end.isoformat() if end else "",
                "Athlete Name": txt(ef.get("Full Athlete Name")),
                "Display Name": display,
                "Grade Band": txt(ef.get("Grade Band Label")),
                "Grade": txt(ef.get("Grade")),
                "School": txt(ef.get("School Name Lookup")),
                "Gender": txt(ef.get("Gender")),
                "Total Shot Days (season)": len(shot_days),
                "Enrollment Longest Streak Rollup": int(float(ef.get("Longest Streak Days") or 0)),
                "Parent Email - Cleaned": txt(ef.get("Parent Email - Cleaned")),
                "Enrollment ID": enrollment_id,
            }
        )

    results.sort(
        key=lambda row: (
            -row["Streak Days"],
            -row["Total Shot Days (season)"],
            row["Athlete Name"].lower(),
        )
    )

    top3: list[dict] = []
    for index, row in enumerate(results[:3], start=1):
        row = dict(row)
        row["Rank"] = index
        top3.append(row)

    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    out_path = PREVIEW_DIR / "top3-longest-shooting-streaks.tsv"
    cols = [
        "Rank",
        "Streak Days",
        "Streak Start",
        "Streak End",
        "Athlete Name",
        "Display Name",
        "Grade Band",
        "Grade",
        "School",
        "Gender",
        "Total Shot Days (season)",
        "Enrollment Longest Streak Rollup",
        "Parent Email - Cleaned",
        "Enrollment ID",
    ]
    with out_path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=cols, delimiter="\t")
        writer.writeheader()
        writer.writerows(top3)

    print("Method: unique Activity Date per enrollment (053 rules)")
    print("  Count This Submission? = 1, Total Shots Counted > 0")
    print("Rule: longest run of consecutive calendar days; one counted sub/day max")
    print(f"Wrote {out_path}\n")
    for row in top3:
        print(
            f"#{row['Rank']}  {row['Streak Days']} days  ({row['Streak Start']} to {row['Streak End']})"
        )
        print(f"    {row['Athlete Name']}  |  {row['Grade Band']}  |  Grade {row['Grade']}  |  {row['School']}")
        print(
            f"    Total shot days: {row['Total Shot Days (season)']}  |  "
            f"Rollup: {row['Enrollment Longest Streak Rollup']}  |  "
            f"Parent: {row['Parent Email - Cleaned']}"
        )
        print()


if __name__ == "__main__":
    main()
