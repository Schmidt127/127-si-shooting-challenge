#!/usr/bin/env python3
"""Keep Shooting Award — all eligible non-winners (lower level, real effort, no cap per household)."""

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
AWARD_NAME = "Keep Shooting Award"

# Already receiving awards today — grade-band top 3 (Lifetime XP)
EXCLUDED_ENROLLMENT_IDS = {
    "rechgOSWWFsOivzhX",  # Benny Brady K-2 1st
    "recKlYEzTwrMaau6B",  # Tracen Heidema K-2 2nd
    "recVWVlDZMqhsUNhy",  # Monroe Mailey K-2 3rd
    "recAHTFTFc2q4y59i",  # Dayton Fox 3-4 1st (+ streak)
    "recbJ71DHseETAQRP",  # Jackson Elders 3-4 2nd (+ streak)
    "recZZ4Op05Hg0FpQq",  # Koen Kimm 3-4 3rd
    "rec83ku1pTHmPNwRo",  # Lyle Kimm 5-6 1st
    "recLt8puScXPL3sjF",  # Kinsley Heidema 5-6 2nd
    "recOSUwW9lXQx6nWL",  # Allie Heidema 5-6 3rd
    "recNe84xp4corSBmm",  # Riley Geraghty 7-8 1st (+ streak)
    "recRMktT2fGDup8sm",  # Camden Clark 7-8 2nd
    "recvY4UwL5udPp0CW",  # Blake Hubers 7-8 3rd
    "recnu4CWGYrotdywM",  # William Buresh 9-12 1st
    "reck0urggYN376kXO",  # Colton Dahl 9-12 2nd
    "recOLIVrnOS57dH04",  # Jamesy Helvik 9-12 3rd
}

MAX_LEVEL_SORT = 5
MAX_XP_PERCENTILE = 0.75
MAX_SHOTS_PERCENTILE = 0.55
MIN_SHOT_DAYS = 8
MIN_SUBMISSIONS = 8


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


def shot_days_by_enrollment(submissions: list[dict]) -> dict[str, int]:
    days: dict[str, set[datetime.date]] = defaultdict(set)
    for submission in submissions:
        fields = submission.get("fields", {})
        if fields.get("Count This Submission?") != 1:
            continue
        if (fields.get("Total Shots Counted") or 0) <= 0:
            continue
        enrollment_id = first_enrollment_id(fields.get("Enrollment"))
        if not enrollment_id:
            continue
        d = parse_date(fields.get("Activity Date"))
        if d:
            days[enrollment_id].add(d)
    return {k: len(v) for k, v in days.items()}


def motivation_score(row: dict) -> float:
    return (
        row["Shot Days"] * 4.0
        + row["Total Homework Completions"] * 6.0
        + row["Longest Streak Days"] * 3.0
        + row["Total Submissions"] * 1.5
        + row["Total Video Submissions"] * 2.5
        + row["Total Zoom Attendances"] * 3.0
    )


def sort_key(row: dict) -> tuple:
    band_index = BANDS.index(row["Grade Band"]) if row["Grade Band"] in BANDS else 99
    return (
        band_index,
        -row["Motivation Score"],
        -row["Total Homework Completions"],
        -row["Shot Days"],
        row["Athlete Name"].lower(),
    )


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
        "Level Sort Order - For Softr",
        "Lifetime XP Total",
        "Total Shots Counted",
        "Total Submissions",
        "Total Homework Completions",
        "Total Video Submissions",
        "Total Zoom Attendances",
        "Longest Streak Days",
    ]
    enrollments = list_table(session, "Enrollments", enrollment_fields)
    submissions = list_table(
        session,
        "Submissions",
        ["Enrollment", "Count This Submission?", "Activity Date", "Total Shots Counted"],
    )
    shot_days = shot_days_by_enrollment(submissions)

    active_xps: list[float] = []
    active_shots: list[float] = []
    rows: list[dict] = []
    for record in enrollments:
        ef = record.get("fields", {})
        if ef.get("Active?") is not True:
            continue
        enrollment_id = record["id"]
        xp = num(ef.get("Lifetime XP Total"))
        shots = num(ef.get("Total Shots Counted"))
        active_xps.append(xp)
        active_shots.append(shots)
        subs = int(num(ef.get("Total Submissions")))
        days = shot_days.get(enrollment_id, 0)
        rows.append(
            {
                "Enrollment ID": enrollment_id,
                "Athlete Name": txt(ef.get("Full Athlete Name")),
                "Display Name": display_name(ef),
                "Grade Band": txt(ef.get("Grade Band Label")),
                "Grade": txt(ef.get("Grade")),
                "School": txt(ef.get("School Name Lookup")),
                "Gender": txt(ef.get("Gender")),
                "Level": txt(ef.get("Current Level - Public Facing Display")),
                "Level Sort": int(num(ef.get("Level Sort Order - For Softr"))),
                "Lifetime XP Total": int(xp),
                "Total Shots Counted": int(shots),
                "Total Submissions": subs,
                "Shot Days": days,
                "Total Homework Completions": int(num(ef.get("Total Homework Completions"))),
                "Total Video Submissions": int(num(ef.get("Total Video Submissions"))),
                "Total Zoom Attendances": int(num(ef.get("Total Zoom Attendances"))),
                "Longest Streak Days": int(num(ef.get("Longest Streak Days"))),
                "Parent Email - Cleaned": txt(ef.get("Parent Email - Cleaned")),
                "Already Won Today": enrollment_id in EXCLUDED_ENROLLMENT_IDS,
            }
        )

    active_xps.sort()
    active_shots.sort()
    xp_cap = active_xps[int(len(active_xps) * MAX_XP_PERCENTILE)] if active_xps else 0
    shots_cap = active_shots[int(len(active_shots) * MAX_SHOTS_PERCENTILE)] if active_shots else 0

    recipients: list[dict] = []
    for row in rows:
        if row["Already Won Today"]:
            continue
        if row["Level Sort"] > MAX_LEVEL_SORT:
            continue
        if row["Lifetime XP Total"] > xp_cap:
            continue
        if row["Total Shots Counted"] > shots_cap:
            continue
        if row["Shot Days"] < MIN_SHOT_DAYS and row["Total Submissions"] < MIN_SUBMISSIONS:
            continue
        recipient = dict(row)
        recipient["Award Name"] = AWARD_NAME
        recipient["Motivation Score"] = round(motivation_score(recipient), 1)
        recipients.append(recipient)

    recipients.sort(key=sort_key)
    for i, row in enumerate(recipients, start=1):
        row["Rank"] = i

    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    out_full = PREVIEW_DIR / "keep-shooting-award-recipients-full.tsv"
    out_paste = PREVIEW_DIR / "keep-shooting-award-recipients-paste.tsv"

    cols = [
        "Rank",
        "Award Name",
        "Display Name",
        "Athlete Name",
        "Grade Band",
        "Grade",
        "School",
        "Level",
        "Lifetime XP Total",
        "Total Shots Counted",
        "Shot Days",
        "Total Submissions",
        "Total Homework Completions",
        "Longest Streak Days",
        "Motivation Score",
        "Parent Email - Cleaned",
        "Enrollment ID",
    ]
    with out_full.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=cols, delimiter="\t", extrasaction="ignore")
        writer.writeheader()
        writer.writerows(recipients)

    paste_cols = ["Rank", "Award Name", "Display Name", "Parent Email - Cleaned", "Enrollment ID"]
    with out_paste.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=paste_cols, delimiter="\t")
        writer.writeheader()
        for row in recipients:
            writer.writerow({k: row.get(k, "") for k in paste_cols})

    print(f"{AWARD_NAME}: {len(recipients)} recipients")
    print(f"Excluded today's other award winners: {len(EXCLUDED_ENROLLMENT_IDS)}")
    print(f"Wrote {out_full}")
    print(f"Wrote {out_paste}\n")
    for row in recipients:
        print(
            f"#{row['Rank']}  {row['Display Name']}  ({row['Grade Band']}, Grade {row['Grade']})  "
            f"|  {row['Level']}  |  {row['Shot Days']} shot days  |  HW {row['Total Homework Completions']}"
        )
        print(f"    Parent: {row['Parent Email - Cleaned']}")
        print()


if __name__ == "__main__":
    main()
