#!/usr/bin/env python3
"""Compare streak rankings: all counted days vs challenge-calendar-only."""

from __future__ import annotations

import csv
import os
from collections import defaultdict
from datetime import datetime, timedelta
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
        raise SystemExit("Missing PAT")
    return token


def list_table(session: requests.Session, table: str, fields: list[str] | None = None) -> list[dict]:
    url = f"https://api.airtable.com/v0/{BASE_ID}/{requests.utils.quote(table)}"
    records: list[dict] = []
    offset: str | None = None
    while True:
        params: dict = {"pageSize": 100}
        if fields:
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


def parse_date(value) -> datetime.date | None:
    if not value:
        return None
    raw = str(value)[:10]
    try:
        return datetime.strptime(raw, "%Y-%m-%d").date()
    except ValueError:
        return None


def first_enrollment_id(value) -> str:
    if isinstance(value, list) and value:
        item = value[0]
        return item if isinstance(item, str) else str(item.get("id") or "")
    return ""


def build_challenge_dates(week_records: list[dict]) -> set[datetime.date]:
    keys: set[datetime.date] = set()
    for week in week_records:
        f = week.get("fields", {})
        start = parse_date(f.get("Start Date"))
        end = parse_date(f.get("End Date"))
        if not start or not end:
            continue
        d = start
        while d <= end:
            keys.add(d)
            d += timedelta(days=1)
    return keys


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


def challenge_only_longest_run(
    shot_days: set[datetime.date], challenge_days: set[datetime.date]
) -> tuple[int, datetime.date | None, datetime.date | None]:
    """Longest run of consecutive challenge calendar days where athlete had a counted shot."""
    if not challenge_days:
        return longest_run(shot_days)
    sorted_challenge = sorted(challenge_days)
    best_len = 0
    best_start: datetime.date | None = None
    best_end: datetime.date | None = None
    cur_start: datetime.date | None = None
    cur_len = 0
    prev_day: datetime.date | None = None
    for day in sorted_challenge:
        if day in shot_days:
            if cur_len == 0:
                cur_start = day
            cur_len += 1
        else:
            if cur_len > best_len:
                best_len, best_start, best_end = cur_len, cur_start, prev_day
            cur_len = 0
            cur_start = None
        prev_day = day
    if cur_len > best_len:
        best_len, best_start, best_end = cur_len, cur_start, prev_day
    return best_len, best_start, best_end


def txt(value) -> str:
    if value is None:
        return ""
    if isinstance(value, list):
        return ", ".join(str(x) for x in value if x is not None)
    return str(value).strip()


def main() -> None:
    session = requests.Session()
    session.headers["Authorization"] = f"Bearer {load_token()}"

    weeks = list_table(session, "Weeks")
    challenge_days = build_challenge_dates(weeks)
    week1 = min((w for w in weeks if w.get("fields", {}).get("Start Date")), key=lambda w: w["fields"]["Start Date"])
    print(f"Challenge calendar days: {len(challenge_days)}")
    print(
        f"First week: #{week1['fields'].get('Week Number')} "
        f"{str(week1['fields'].get('Start Date',''))[:10]} -> {str(week1['fields'].get('End Date',''))[:10]}"
    )
    print(f"Challenge starts: {min(challenge_days)}  ends: {max(challenge_days)}\n")

    enrollments = {
        r["id"]: r.get("fields", {})
        for r in list_table(
            session,
            "Enrollments",
            [
                "Full Athlete Name",
                "Athlete First Name",
                "Athlete Last Name",
                "Grade Band Label",
                "Grade",
                "School Name Lookup",
                "School Year",
                "Parent Email - Cleaned",
                "Longest Streak Days",
                "Active?",
            ],
        )
    }

    days_by_enrollment: dict[str, set[datetime.date]] = defaultdict(set)
    for submission in list_table(
        session,
        "Submissions",
        ["Enrollment", "Count This Submission?", "Activity Date Key", "Activity Date", "Total Shots Counted"],
    ):
        fields = submission.get("fields", {})
        if fields.get("Count This Submission?") != 1:
            continue
        if (fields.get("Total Shots Counted") or 0) <= 0:
            continue
        enrollment_id = first_enrollment_id(fields.get("Enrollment"))
        if not enrollment_id:
            continue
        date_key = parse_date(fields.get("Activity Date Key")) or parse_date(fields.get("Activity Date"))
        if date_key:
            days_by_enrollment[enrollment_id].add(date_key)

    results: list[dict] = []
    for enrollment_id, shot_days in days_by_enrollment.items():
        ef = enrollments.get(enrollment_id, {})
        if ef.get("Active?") is not True:
            continue
        all_len, all_start, all_end = longest_run(shot_days)
        ch_len, ch_start, ch_end = challenge_only_longest_run(shot_days, challenge_days)
        early_bird_days = sorted(d for d in shot_days if d not in challenge_days)
        results.append(
            {
                "Athlete Name": txt(ef.get("Full Athlete Name")),
                "All Days Streak": all_len,
                "All Start": all_start.isoformat() if all_start else "",
                "All End": all_end.isoformat() if all_end else "",
                "Challenge Streak": ch_len,
                "Challenge Start": ch_start.isoformat() if ch_start else "",
                "Challenge End": ch_end.isoformat() if ch_end else "",
                "Early Bird Shot Days": len(early_bird_days),
                "Early Bird Dates": ", ".join(d.isoformat() for d in early_bird_days[:6]),
                "Rollup Longest Streak": int(float(ef.get("Longest Streak Days") or 0)),
                "Total Shot Days": len(shot_days),
                "Grade Band": txt(ef.get("Grade Band Label")),
                "Enrollment ID": enrollment_id,
            }
        )

    for label, key in [
        ("ALL counted calendar days", "All Days Streak"),
        ("CHALLENGE calendar days only", "Challenge Streak"),
        ("Enrollment rollup (Streak Occurrences)", "Rollup Longest Streak"),
    ]:
        ranked = sorted(results, key=lambda r: (-r[key], r["Athlete Name"].lower()))
        print(f"=== Top 5 by {label} ===")
        for i, row in enumerate(ranked[:5], 1):
            if label.startswith("ALL"):
                print(
                    f"  {i}. {row['Athlete Name']} — {row['All Days Streak']} days "
                    f"({row['All Start']} to {row['All End']})  early_bird={row['Early Bird Shot Days']}"
                )
            elif label.startswith("CHALLENGE"):
                print(
                    f"  {i}. {row['Athlete Name']} — {row['Challenge Streak']} days "
                    f"({row['Challenge Start']} to {row['Challenge End']})  early_bird={row['Early Bird Shot Days']}"
                )
            else:
                print(f"  {i}. {row['Athlete Name']} — {row['Rollup Longest Streak']} days")
        print()

    dayton = next(r for r in results if r["Enrollment ID"] == "recAHTFTFc2q4y59i")
    riley = next(r for r in results if r["Enrollment ID"] == "recNe84xp4corSBmm")
    print("Dayton Fox detail:")
    for k, v in dayton.items():
        print(f"  {k}: {v}")
    print("\nRiley Geraghty detail:")
    for k, v in riley.items():
        print(f"  {k}: {v}")

    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    out = PREVIEW_DIR / "streak-comparison-all-vs-challenge.tsv"
    cols = list(results[0].keys()) if results else []
    with out.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=cols, delimiter="\t")
        writer.writeheader()
        for row in sorted(results, key=lambda r: (-r["All Days Streak"], r["Athlete Name"].lower())):
            writer.writerow(row)
    print(f"\nWrote {out}")


if __name__ == "__main__":
    main()
