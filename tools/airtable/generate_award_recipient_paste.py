#!/usr/bin/env python3
"""Top 3 per grade band — paste rows for Award Recipients (name + parent email)."""

from __future__ import annotations

import csv
import os
from collections import defaultdict
from pathlib import Path

import requests
from dotenv import load_dotenv

BASE_ID = "appn84sqPw03zEbTT"
BANDS = ["K-2", "3-4", "5-6", "7-8", "9-12"]
RANK_LABELS = {1: "1st Place (Champ)", 2: "2nd Place", 3: "3rd Place"}
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


def list_enrollments(session: requests.Session) -> list[dict]:
    fields = [
        "Athlete First Name",
        "Athlete Last Name",
        "Full Athlete Name",
        "Grade Band Label",
        "Parent Email - Cleaned",
        "School Year",
        "Lifetime XP Total",
        "Total Shots Counted",
        "Active?",
    ]
    url = f"https://api.airtable.com/v0/{BASE_ID}/Enrollments"
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


def display_name(fields: dict) -> str:
    last = txt(fields.get("Athlete Last Name"))
    first = txt(fields.get("Athlete First Name"))
    year = txt(fields.get("School Year")) or "2025-2026"
    if last and first:
        return f"{last}, {first} - {year}"
    full = txt(fields.get("Full Athlete Name"))
    if full:
        parts = full.split()
        if len(parts) >= 2:
            return f"{parts[-1]}, {' '.join(parts[:-1])} - {year}"
        return f"{full} - {year}"
    return f"Unknown - {year}"


def main() -> None:
    session = requests.Session()
    session.headers["Authorization"] = f"Bearer {load_token()}"

    by_band: dict[str, list[dict]] = defaultdict(list)
    for record in list_enrollments(session):
        fields = record.get("fields", {})
        if fields.get("Active?") is not True:
            continue
        band = txt(fields.get("Grade Band Label"))
        if band not in BANDS:
            continue
        by_band[band].append(
            {
                "enrollment_id": record["id"],
                "display_name": display_name(fields),
                "parent_email": txt(fields.get("Parent Email - Cleaned")),
                "xp": num(fields.get("Lifetime XP Total")),
                "shots": num(fields.get("Total Shots Counted")),
            }
        )

    all_rows: list[dict] = []
    for band in BANDS:
        athletes = sorted(
            by_band[band],
            key=lambda x: (-x["xp"], -x["shots"], x["display_name"].lower()),
        )
        for rank in (1, 2, 3):
            if rank - 1 >= len(athletes):
                continue
            athlete = athletes[rank - 1]
            all_rows.append(
                {
                    "Place": RANK_LABELS[rank],
                    "Rank": rank,
                    "Grade Band": band,
                    "Award Recipient Display Name": athlete["display_name"],
                    "Parent Email - Cleaned": athlete["parent_email"],
                    "Enrollment ID": athlete["enrollment_id"],
                }
            )

    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

    combined_cols = [
        "Place",
        "Grade Band",
        "Award Recipient Display Name",
        "Parent Email - Cleaned",
        "Enrollment ID",
    ]
    paste_cols = [
        "Grade Band",
        "Award Recipient Display Name",
        "Parent Email - Cleaned",
        "Enrollment ID",
    ]

    combined_path = PREVIEW_DIR / "award-recipients-top3-paste-all.tsv"
    with combined_path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=combined_cols, delimiter="\t", extrasaction="ignore")
        writer.writeheader()
        writer.writerows(all_rows)

    tier_files = {
        3: PREVIEW_DIR / "award-recipients-3rd-place.tsv",
        2: PREVIEW_DIR / "award-recipients-2nd-place.tsv",
        1: PREVIEW_DIR / "award-recipients-1st-champ.tsv",
    }
    for rank, path in tier_files.items():
        tier_rows = [row for row in all_rows if row["Rank"] == rank]
        with path.open("w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(fh, fieldnames=paste_cols, delimiter="\t", extrasaction="ignore")
            writer.writeheader()
            writer.writerows(tier_rows)

    print(f"Wrote {combined_path}")
    for path in tier_files.values():
        print(f"Wrote {path}")

    for rank in (3, 2, 1):
        print(f"\n=== {RANK_LABELS[rank]} ===")
        print("Grade Band\tAward Recipient Display Name\tParent Email - Cleaned")
        for row in all_rows:
            if row["Rank"] != rank:
                continue
            print(
                f"{row['Grade Band']}\t{row['Award Recipient Display Name']}\t{row['Parent Email - Cleaned']}"
            )


if __name__ == "__main__":
    main()
