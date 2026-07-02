#!/usr/bin/env python3
"""Audit enrollment stats for Newcomer brothers — compare to saved preview baseline."""

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
TARGETS = {
    "rec8Z5KzsNif6mtpG": "Lincoln Newcomer",
    "recmhY61iU2AwEiMI": "Jackson Newcomer",
}
BASELINE_TSV = PREVIEW_DIR / "participants-no-award-with-shots.tsv"


def load_token() -> str:
    tools_env = Path(__file__).with_name(".env")
    web_env = Path(__file__).resolve().parents[2] / "web" / ".env.local"
    if tools_env.exists():
        load_dotenv(tools_env, override=True)
    if web_env.exists():
        load_dotenv(web_env, override=True)
    return os.getenv("AIRTABLE_TOKEN") or os.getenv("AIRTABLE_API_TOKEN") or ""


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


def load_baseline() -> dict[str, dict]:
    if not BASELINE_TSV.exists():
        return {}
    with BASELINE_TSV.open(encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh, delimiter="\t"))
    return {row["Enrollment ID"]: row for row in rows if row.get("Enrollment ID")}


def submission_rollups(submissions: list[dict], enrollment_id: str) -> dict:
    counted = 0
    total_shots = 0
    days: set[datetime.date] = set()
    rows: list[dict] = []
    for submission in submissions:
        fields = submission.get("fields", {})
        if first_enrollment_id(fields.get("Enrollment")) != enrollment_id:
            continue
        if fields.get("Count This Submission?") != 1:
            continue
        shots = int(num(fields.get("Total Shots Counted")))
        if shots <= 0:
            continue
        counted += 1
        total_shots += shots
        d = parse_date(fields.get("Activity Date"))
        if d:
            days.add(d)
        rows.append(
            {
                "id": submission["id"],
                "date": str(fields.get("Activity Date", ""))[:10],
                "shots": shots,
                "canonical": int(num(fields.get("Total Shots Canonical"))),
                "xp_total": int(num(fields.get("XP Total Points"))),
            }
        )
    rows.sort(key=lambda r: (-r["shots"], r["date"]))
    return {
        "counted_submissions": counted,
        "shot_days": len(days),
        "submission_shots_sum": total_shots,
        "top_submissions": rows[:5],
    }


def band_standings(enrollments: list[dict], band: str) -> list[dict]:
    rows = []
    for record in enrollments:
        ef = record.get("fields", {})
        if ef.get("Active?") is not True:
            continue
        if txt(ef.get("Grade Band Label")) != band:
            continue
        rows.append(
            {
                "name": txt(ef.get("Full Athlete Name")),
                "id": record["id"],
                "xp": int(num(ef.get("Lifetime XP Total"))),
                "shots": int(num(ef.get("Total Shots Counted"))),
                "level": txt(ef.get("Current Level - Public Facing Display")),
            }
        )
    rows.sort(key=lambda r: (-r["xp"], -r["shots"], r["name"].lower()))
    for i, row in enumerate(rows, start=1):
        row["rank"] = i
    return rows


def snapshot_enrollment(record: dict) -> dict:
    ef = record.get("fields", {})
    return {
        "Enrollment ID": record["id"],
        "Athlete Name": txt(ef.get("Full Athlete Name")),
        "Grade Band": txt(ef.get("Grade Band Label")),
        "Grade": txt(ef.get("Grade")),
        "Level": txt(ef.get("Current Level - Public Facing Display")),
        "Level Status": txt(ef.get("Level Status")),
        "Lifetime XP Total": int(num(ef.get("Lifetime XP Total"))),
        "Total Shots Counted": int(num(ef.get("Total Shots Counted"))),
        "Total Submissions": int(num(ef.get("Total Submissions"))),
        "Total Homework Completions": int(num(ef.get("Total Homework Completions"))),
        "Longest Streak Days": int(num(ef.get("Longest Streak Days"))),
        "Gate Passes": txt(ef.get("Gate Passes")),
        "Public Gate Missing Reason": txt(ef.get("Public Gate Missing Reason")),
        "Gate Debug Summary": txt(ef.get("Gate Debug Summary")),
    }


def diff_int(label: str, old, new) -> str | None:
    if old == "" or old is None:
        return None
    try:
        old_i = int(float(str(old).replace(",", "")))
    except ValueError:
        return None
    if old_i == new:
        return None
    return f"{label}: {old_i:,} -> {new:,} ({new - old_i:+,})"


def main() -> None:
    session = requests.Session()
    session.headers["Authorization"] = f"Bearer {load_token()}"
    baseline = load_baseline()

    enrollment_fields = [
        "Full Athlete Name",
        "Grade Band Label",
        "Grade",
        "Active?",
        "Current Level - Public Facing Display",
        "Level Status",
        "Lifetime XP Total",
        "Lifetime XP Earned",
        "Total Shots Counted",
        "Total Submissions",
        "Total Homework Completions",
        "Longest Streak Days",
        "Gate Passes",
        "Public Gate Missing Reason",
        "Gate Debug Summary",
    ]
    enrollments = list_table(session, "Enrollments", enrollment_fields)
    by_id = {r["id"]: r for r in enrollments}

    submission_fields = [
        "Enrollment",
        "Activity Date",
        "Count This Submission?",
        "Total Shots Counted",
        "Total Shots Canonical",
        "XP Total Points",
    ]
    submissions = list_table(session, "Submissions", submission_fields)

    print("=== Newcomer Brothers Audit (live Airtable) ===\n")

    for enrollment_id, label in TARGETS.items():
        record = by_id.get(enrollment_id)
        if not record:
            print(f"MISSING: {label} ({enrollment_id})\n")
            continue

        snap = snapshot_enrollment(record)
        subs = submission_rollups(submissions, enrollment_id)
        band = snap["Grade Band"]
        standings = band_standings(enrollments, band)
        rank_row = next((r for r in standings if r["id"] == enrollment_id), None)

        print(f"--- {snap['Athlete Name']} ({band}, Grade {snap['Grade']}) ---")
        print(f"Enrollment: {enrollment_id}")
        print(f"Level: {snap['Level']}  |  Level Status: {snap['Level Status']}")
        print(f"Lifetime XP: {snap['Lifetime XP Total']:,}")
        print(f"Total Shots Counted (enrollment rollup): {snap['Total Shots Counted']:,}")
        print(f"Total Submissions (count field): {snap['Total Submissions']}")
        print(
            f"Recomputed from submissions: {subs['counted_submissions']} counted subs, "
            f"{subs['shot_days']} shot days, {subs['submission_shots_sum']:,} shots summed"
        )
        if subs["submission_shots_sum"] != snap["Total Shots Counted"]:
            print(
                f"  WARNING: enrollment rollup shots ({snap['Total Shots Counted']:,}) "
                f"!= submission sum ({subs['submission_shots_sum']:,})"
            )
        print(f"Homework: {snap['Total Homework Completions']}  |  Longest streak: {snap['Longest Streak Days']}")
        if snap["Public Gate Missing Reason"]:
            print(f"Gate: {snap['Public Gate Missing Reason']}")
        elif snap["Gate Debug Summary"]:
            print(f"Gate debug: {snap['Gate Debug Summary']}")

        if rank_row:
            print(
                f"Grade-band standing ({band}): #{rank_row['rank']} of {len(standings)} active "
                f"by XP (tiebreaker shots)"
            )
            top3 = standings[:3]
            print("  Current top 3 in band:")
            for row in top3:
                marker = "  <--" if row["id"] == enrollment_id else ""
                print(
                    f"    #{row['rank']} {row['name']}  |  {row['level']}  |  "
                    f"XP {row['xp']:,}  |  Shots {row['shots']:,}{marker}"
                )

        old = baseline.get(enrollment_id, {})
        if old:
            print("Changes vs last saved preview (participants-no-award-with-shots.tsv):")
            changes = [
                diff_int("XP", old.get("Lifetime XP Total"), snap["Lifetime XP Total"]),
                diff_int("Shots", old.get("Total Shots Counted"), snap["Total Shots Counted"]),
                diff_int("Shot days", old.get("Shot Days"), subs["shot_days"]),
                diff_int("Counted subs", old.get("Counted Submissions"), subs["counted_submissions"]),
            ]
            if old.get("Level") and old.get("Level") != snap["Level"]:
                changes.append(f"Level: {old.get('Level')} -> {snap['Level']}")
            printed = [c for c in changes if c]
            if printed:
                for line in printed:
                    print(f"  {line}")
            else:
                print("  No changes detected in saved baseline fields.")
        else:
            print("No saved baseline row for this athlete.")

        print("Highest-shot counted submissions:")
        for row in subs["top_submissions"]:
            print(
                f"  {row['date']}  shots_counted={row['shots']:,}  "
                f"canonical={row['canonical']:,}  xp={row['xp_total']}  id={row['id']}"
            )
        print()

    out = PREVIEW_DIR / "newcomer-brothers-audit.tsv"
    rows_out = []
    for enrollment_id in TARGETS:
        record = by_id.get(enrollment_id)
        if not record:
            continue
        snap = snapshot_enrollment(record)
        subs = submission_rollups(submissions, enrollment_id)
        standings = band_standings(enrollments, snap["Grade Band"])
        rank_row = next((r for r in standings if r["id"] == enrollment_id), None)
        snap["Shot Days"] = subs["shot_days"]
        snap["Counted Submissions (recomputed)"] = subs["counted_submissions"]
        snap["Submission Shots Sum"] = subs["submission_shots_sum"]
        snap["Grade Band Rank (XP)"] = rank_row["rank"] if rank_row else ""
        snap["Grade Band Active Count"] = len(standings)
        rows_out.append(snap)

    if rows_out:
        with out.open("w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(fh, fieldnames=list(rows_out[0].keys()), delimiter="\t")
            writer.writeheader()
            writer.writerows(rows_out)
        print(f"Wrote {out}")


if __name__ == "__main__":
    main()
