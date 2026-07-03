#!/usr/bin/env python3
"""
Build one copy-paste Airtable extension file for award recipients closeout audit.

  python generate_june29_snapshot_data.py

Output: airtable/extension-scripts/audits/audit-final-award-recipients-closeout.js
"""

from __future__ import annotations

import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CSV_PATH = ROOT / "Award Recipients-Grid view from June 29 FINAL.csv"
SOURCE_PATH = ROOT / "airtable/extension-scripts/audits/audit-final-award-recipients-closeout.source.js"
OUT_PATH = ROOT / "airtable/extension-scripts/audits/audit-final-award-recipients-closeout.js"
INSERT_MARKER = "// --- GENERATOR INSERTS JUNE29_SNAPSHOT_ROWS HERE ---"

SNAPSHOT_AWARD_TO_CATALOG = {
    "Homework - Submitted & Satisfactory": "Homework Recognition Award",
    "Level Leaders": "Level Leader Award",
    "Video Submission - Submitted": "Video Submission Recognition Award",
    "Video Submission - Make the Shout out Page": "Shout-Out Video Award",
    "Zoom - Attendance": "Zoom Attendance/Participation Award",
    "Zoom - Random Drawing Winner": "Zoom Drawing — Winner",
    "Zoom - Random Drawing Runner Up": "Zoom Drawing — Runner-Up",
    "Zoom - Random Drawing Third Place": "Zoom Drawing — Third Place",
    "Shots - Conquered Goal": "Conquered Goal Award",
    "Grade Band Award - Overall Achievement": "Grade Band Achievement Award",
    "Special Awards - Dedication": "Dedication Award",
    "Special Award - Random for Incentive": "Random Drawing Incentive Award",
}


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", str(s or "").strip().lower())


def norm_enroll(s: str) -> str:
    return norm(str(s or "").strip().strip('"'))


def week_num(label: str) -> str:
    m = re.search(r"\d+", label or "")
    return m.group(0) if m else norm(label)


def date_key(s: str) -> str:
    s = str(s or "")
    m = re.search(r"(\d{4})-(\d{2})-(\d{2})", s)
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
    m = re.search(r"(\d{1,2})/(\d{1,2})/(\d{4})", s)
    if m:
        return f"{int(m.group(3)):04d}-{int(m.group(1)):02d}-{int(m.group(2)):02d}"
    return norm(s)[:10]


def load_snapshot_rows() -> list[dict]:
    rows: list[dict] = []
    with CSV_PATH.open(encoding="utf-8-sig", newline="") as fh:
        for r in csv.DictReader(fh):
            if not (r.get("Award") or "").strip():
                continue
            if not (r.get("Enrollment Name Lookup") or "").strip():
                continue
            award = (r.get("Award") or "").strip()
            rows.append(
                {
                    "athlete": (r.get("Athlete Name - Display") or "").strip(),
                    "enrollment": norm_enroll(r.get("Enrollment Name Lookup")),
                    "week": week_num(r.get("Week") or ""),
                    "date": date_key(r.get("Date Awarded") or ""),
                    "snapshotAward": award,
                    "targetAward": SNAPSHOT_AWARD_TO_CATALOG.get(award, award),
                    "status": (r.get("Award Status") or "").strip(),
                }
            )
    return rows


def main() -> None:
    if not CSV_PATH.exists():
        raise SystemExit(f"Missing snapshot CSV: {CSV_PATH}")
    if not SOURCE_PATH.exists():
        raise SystemExit(f"Missing logic source: {SOURCE_PATH}")

    rows = load_snapshot_rows()
    source = SOURCE_PATH.read_text(encoding="utf-8")
    if INSERT_MARKER not in source:
        raise SystemExit(f"Insert marker not found in {SOURCE_PATH}")

    header, tail = source.split(INSERT_MARKER, 1)
    data_block = (
        f"// Embedded June 29 snapshot ({len(rows)} rows) — from repo CSV\n"
        f"const JUNE29_SNAPSHOT_ROWS = {json.dumps(rows, ensure_ascii=False)};\n\n"
    )
    bundled = header + data_block + tail.lstrip("\n")
    bundled = bundled.replace(
        "Paste ALL of audit-final-award-recipients-closeout.js (one file).",
        "Paste ALL of this file into Airtable Scripting (one copy-paste).",
    )
    OUT_PATH.write_text(bundled, encoding="utf-8")
    print(f"Wrote bundled extension script ({len(rows)} snapshot rows) to {OUT_PATH}")


if __name__ == "__main__":
    main()
