#!/usr/bin/env python3
"""Participants with shot submissions who received no awards today."""

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
BANDS = ["K-2", "3-4", "5-6", "7-8", "9-12"]

# Grade-band top 3 (money/awards)
GRADE_BAND_WINNERS = {
    "rechgOSWWFsOivzhX",
    "recKlYEzTwrMaau6B",
    "recVWVlDZMqhsUNhy",
    "recAHTFTFc2q4y59i",
    "recbJ71DHseETAQRP",
    "recZZ4Op05Hg0FpQq",
    "rec83ku1pTHmPNwRo",
    "recLt8puScXPL3sjF",
    "recOSUwW9lXQx6nWL",
    "recNe84xp4corSBmm",
    "recRMktT2fGDup8sm",
    "recvY4UwL5udPp0CW",
    "recnu4CWGYrotdywM",
    "reck0urggYN376kXO",
    "recOLIVrnOS57dH04",
}

# Longest streak top 3 (all overlap grade-band winners; listed for completeness)
STREAK_WINNERS = {
    "recNe84xp4corSBmm",
    "recAHTFTFc2q4y59i",
    "recbJ71DHseETAQRP",
}

KEEP_SHOOTING_WINNERS = {
    "recSie4tYfSbfhwly",
    "reckmWHcaHxhD09yd",
    "recsr9OFwwiECnoOu",
    "reckt5NMDf1YoK28l",
    "rec0BF7hSTCKRlfQk",
    "recBKEOo6MqTWBsv8",
    "recs4r7UjEsHlIjM7",
    "recZ3iTqlI1EfsghD",
    "rec0Mop60efVsJ5sV",
    "rechBG2hMV5qXLSsb",
    "recl3rKx9k2659J4c",
    "recho64Y69r6DvwFL",
    "recSOk6N8RL3j5fzg",
    "reciYiOQh8ytqaKKh",
    "recBfc7Oa5hvWIJd8",
}

ALL_AWARD_RECIPIENTS = GRADE_BAND_WINNERS | STREAK_WINNERS | KEEP_SHOOTING_WINNERS


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


def num(value) -> float:
    try:
        return float(str(value or "0").replace(",", ""))
    except ValueError:
        return 0.0


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


def display_name(fields: dict) -> str:
    last = txt(fields.get("Athlete Last Name"))
    first = txt(fields.get("Athlete First Name"))
    year = txt(fields.get("School Year")) or "2025-2026"
    if last and first:
        return f"{last}, {first} - {year}"
    return txt(fields.get("Full Athlete Name"))


def submission_stats(submissions: list[dict]) -> dict[str, dict]:
    stats: dict[str, dict] = defaultdict(
        lambda: {
            "counted_submissions": 0,
            "total_submissions": 0,
            "shot_days": set(),
            "total_shots_counted": 0,
        }
    )
    for submission in submissions:
        fields = submission.get("fields", {})
        enrollment_id = first_enrollment_id(fields.get("Enrollment"))
        if not enrollment_id:
            continue
        entry = stats[enrollment_id]
        entry["total_submissions"] += 1
        if fields.get("Count This Submission?") == 1 and (fields.get("Total Shots Counted") or 0) > 0:
            entry["counted_submissions"] += 1
            entry["total_shots_counted"] += int(num(fields.get("Total Shots Counted")))
            d = parse_date(fields.get("Activity Date"))
            if d:
                entry["shot_days"].add(d)
    return stats


def awards_for(enrollment_id: str) -> str:
    awards: list[str] = []
    if enrollment_id in GRADE_BAND_WINNERS:
        awards.append("Grade Band Top 3")
    if enrollment_id in STREAK_WINNERS and enrollment_id not in GRADE_BAND_WINNERS:
        awards.append("Streak Top 3")
    if enrollment_id in KEEP_SHOOTING_WINNERS:
        awards.append("Keep Shooting Award")
    return "; ".join(awards)


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
        "Active?",
        "Current Level - Public Facing Display",
        "Lifetime XP Total",
        "Total Shots Counted",
        "Total Submissions",
    ]
    enrollments = list_table(session, "Enrollments", enrollment_fields)
    submissions = list_table(
        session,
        "Submissions",
        ["Enrollment", "Count This Submission?", "Activity Date", "Total Shots Counted"],
    )
    sub_stats = submission_stats(submissions)

    participants: list[dict] = []
    zero_shot_active: list[dict] = []
    awarded_with_shots: list[dict] = []
    unawarded_with_shots: list[dict] = []

    for record in enrollments:
        ef = record.get("fields", {})
        enrollment_id = record["id"]
        active = ef.get("Active?") is True
        stats = sub_stats.get(enrollment_id, {})
        counted_subs = int(stats.get("counted_submissions", 0))
        shot_days = len(stats.get("shot_days", set()))
        has_shots = counted_subs > 0

        row = {
            "Enrollment ID": enrollment_id,
            "Display Name": display_name(ef),
            "Athlete Name": txt(ef.get("Full Athlete Name")),
            "Grade Band": txt(ef.get("Grade Band Label")),
            "Grade": txt(ef.get("Grade")),
            "School": txt(ef.get("School Name Lookup")),
            "Gender": txt(ef.get("Gender")),
            "Level": txt(ef.get("Current Level - Public Facing Display")),
            "Active?": "Yes" if active else "No",
            "Counted Submissions": counted_subs,
            "Shot Days": shot_days,
            "Total Shots Counted": int(num(ef.get("Total Shots Counted"))),
            "Lifetime XP Total": int(num(ef.get("Lifetime XP Total"))),
            "Parent Email - Cleaned": txt(ef.get("Parent Email - Cleaned")),
            "Received Award(s)": awards_for(enrollment_id),
        }
        participants.append(row)

        if active:
            if not has_shots:
                zero_shot_active.append(row)
            elif enrollment_id in ALL_AWARD_RECIPIENTS:
                awarded_with_shots.append(row)
            else:
                unawarded_with_shots.append(row)

    band_index = {b: i for i, b in enumerate(BANDS)}
    unawarded_with_shots.sort(
        key=lambda r: (
            band_index.get(r["Grade Band"], 99),
            r["Athlete Name"].lower(),
        )
    )

    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    out = PREVIEW_DIR / "participants-no-award-with-shots.tsv"
    cols = [
        "Display Name",
        "Athlete Name",
        "Grade Band",
        "Grade",
        "School",
        "Level",
        "Counted Submissions",
        "Shot Days",
        "Total Shots Counted",
        "Lifetime XP Total",
        "Parent Email - Cleaned",
        "Enrollment ID",
    ]
    with out.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=cols, delimiter="\t", extrasaction="ignore")
        writer.writeheader()
        writer.writerows(unawarded_with_shots)

    active_count = sum(1 for r in participants if r["Active?"] == "Yes")
    active_with_shots = active_count - len(zero_shot_active)

    print(f"Active participants: {active_count}")
    print(f"Active with zero counted shot submissions: {len(zero_shot_active)}")
    print(f"Active with shots: {active_with_shots}")
    print(f"Received any award today: {len(awarded_with_shots)}")
    print(f"NO award, with shots: {len(unawarded_with_shots)}")
    print(f"Wrote {out}\n")

    if zero_shot_active:
        print("Excluded (active, zero counted shot submissions):")
        for row in sorted(zero_shot_active, key=lambda r: r["Athlete Name"].lower()):
            print(f"  - {row['Athlete Name']} ({row['Grade Band']})")
        print()

    print("=== No award, has shot submissions ===")
    for row in unawarded_with_shots:
        print(
            f"  {row['Display Name']}  |  {row['Grade Band']}  |  {row['Level']}  |  "
            f"{row['Shot Days']} shot days  |  {row['Total Shots Counted']:,} shots  |  "
            f"XP {row['Lifetime XP Total']}"
        )


if __name__ == "__main__":
    main()
