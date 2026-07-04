#!/usr/bin/env python3
"""Build a newspaper packet folder from athlete city_town values."""

from __future__ import annotations

import argparse
import csv
import io
import json
import re
import zipfile
from pathlib import Path

import requests

from airtable_read import f, list_table, session
from media_paths import NEWSPAPER_PREP, newspaper_packets

BASE = NEWSPAPER_PREP
PASTE = "PASTE FINAL TEXT FROM CHATGPT HERE"


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", str(s or "").strip())


def parse_name(full: str) -> tuple[str, str]:
    parts = norm(full).split()
    if len(parts) < 2:
        return parts[0] if parts else "Unknown", "Unknown"
    return parts[-1], parts[0]


def school_slug(school: str) -> str:
    return school.replace("'", "").replace("&", "and").replace(" ", "-")


def esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def paragraph(text: str) -> str:
    if not text:
        return "<w:p/>"
    return f'<w:p><w:r><w:t xml:space="preserve">{esc(text)}</w:t></w:r></w:p>'


def build_docx(lines: list[str]) -> bytes:
    paras = "\n".join(paragraph(line) for line in lines)
    content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>"""
    rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""
    document = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>{paras}</w:body>
</w:document>"""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", content_types)
        zf.writestr("_rels/.rels", rels)
        zf.writestr("word/document.xml", document)
    return buf.getvalue()


def head_url(value) -> str:
    if not value:
        return ""
    for item in value if isinstance(value, list) else [value]:
        if isinstance(item, dict) and item.get("url"):
            return str(item["url"])
    return ""


def build_packet(
    folder: str,
    zip_name: str,
    towns: list[str],
    coverage_label: str,
    primary_outlet: str,
    also_serves: str,
    notes: list[str] | None = None,
) -> dict:
    packet = BASE / "final-packets" / folder
    photos = packet / "Photos"
    photos.mkdir(parents=True, exist_ok=True)

    town_set = {norm(t).lower() for t in towns}
    athletes = [
        row
        for row in csv.DictReader(open(BASE / "athlete-master-export.csv", newline="", encoding="utf-8"))
        if norm(row.get("city_town", "")).lower() in town_set
    ]
    athletes.sort(key=lambda a: (-int(a["total_shots_counted"]), norm(a["athlete_name"]).lower()))

    enrollment_ids = {a["enrollment_id"] for a in athletes}
    fresh_urls = {
        row["id"]: head_url(f(row).get("Athlete Headshot"))
        for row in list_table(session(), "Enrollments", ["Athlete Headshot"])
        if row["id"] in enrollment_ids
    }

    inventory = {
        row["enrollment_id"]: row
        for row in csv.DictReader(open(BASE / "headshot-inventory.csv", newline="", encoding="utf-8"))
        if row["enrollment_id"] in enrollment_ids
    }

    photo_rows = []
    for athlete in athletes:
        eid = athlete["enrollment_id"]
        name = norm(athlete["athlete_name"])
        last, first = parse_name(name)
        new_name = f"{last}_{first}_{school_slug(athlete['school_name'])}_Grade-{athlete['grade']}.jpg"
        inv = inventory.get(eid, {})
        url = fresh_urls.get(eid) or inv.get("headshot_url", "")
        dest = photos / new_name
        status, err, size = "failed", "", 0
        if url:
            try:
                response = requests.get(url, timeout=120)
                response.raise_for_status()
                dest.write_bytes(response.content)
                size = dest.stat().st_size
                status = "success"
            except Exception as exc:  # noqa: BLE001
                err = str(exc)
        else:
            err = "no headshot URL"
        photo_rows.append(
            {
                "Athlete Name": name,
                "Grade": athlete["grade"],
                "School": athlete["school_name"],
                "Town": athlete.get("city_town", ""),
                "Original Airtable filename": inv.get("headshot_filename", ""),
                "New saved filename": new_name,
                "Download status": status,
                "File size": size,
                "Any error": err,
            }
        )

    with open(photos / "photo-download-checklist.csv", "w", newline="", encoding="utf-8") as fh:
        cols = [
            "Athlete Name",
            "Grade",
            "School",
            "Town",
            "Original Airtable filename",
            "New saved filename",
            "Download status",
            "File size",
            "Any error",
        ]
        writer = csv.DictWriter(fh, fieldnames=cols)
        writer.writeheader()
        writer.writerows(sorted(photo_rows, key=lambda r: r["Athlete Name"].lower()))

    paste_docx = build_docx([PASTE])
    for filename in [
        "01 Article - Main Version.docx",
        "02 Article - Short Version.docx",
        "03 Editor Email.docx",
        "04 Photo Captions.docx",
    ]:
        (packet / filename).write_bytes(paste_docx)
    (packet / "03 Editor Email.txt").write_text(PASTE + "\n", encoding="utf-8")

    headshot_check = [
        f"Headshot checklist — {folder}",
        f"Primary outlet: {primary_outlet}",
        f"Also serves: {also_serves}",
        f"Coverage: {coverage_label}",
        f"Athletes: {len(athletes)}",
        "",
    ]
    if notes:
        headshot_check.extend([""] + notes + [""])
    for row in sorted(photo_rows, key=lambda x: x["Athlete Name"].lower()):
        headshot_check.append(
            f"- {row['Athlete Name']} ({row['School']}, {row['Town']}) — {row['New saved filename']} — {row['Download status']}"
        )

    review = [
        f"Manual review checklist — {coverage_label}",
        "",
        "[ ] Paste final article text from ChatGPT into 01, 02, 03, and 04",
        "[ ] Rebuild SEND-READY zip after pasting final text",
        f"[ ] Verify all {len(athletes)} headshots match correct athletes",
        f"[ ] Confirm {primary_outlet} editor contact before emailing",
        "[ ] Do not use internal program terms in published copy",
        "[ ] Level-first language; shot totals second",
    ]

    (packet / "05 Headshot Checklist.docx").write_bytes(build_docx(headshot_check))
    (packet / "06 Manual Review Checklist.docx").write_bytes(build_docx(review))

    zip_path = BASE / "final-packets" / zip_name
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for filename in [
            "01 Article - Main Version.docx",
            "02 Article - Short Version.docx",
            "04 Photo Captions.docx",
        ]:
            zf.write(packet / filename, arcname=filename)
        for photo in sorted(photos.glob("*.jpg")):
            zf.write(photo, arcname=f"Photos/{photo.name}")

    return {
        "working_folder": str(packet.resolve()),
        "send_ready_zip": str(zip_path.resolve()),
        "athletes": [
            f"{norm(a['athlete_name'])} ({a['school_name']}, {a.get('city_town', '')})"
            for a in athletes
        ],
        "towns_requested": towns,
        "towns_with_athletes": sorted({norm(a.get("city_town", "")) for a in athletes}),
        "photos_downloaded": sum(1 for row in photo_rows if row["Download status"] == "success"),
        "missing_photos": [row["Athlete Name"] for row in photo_rows if row["Download status"] != "success"],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--folder", required=True)
    parser.add_argument("--zip", required=True)
    parser.add_argument("--towns", required=True, help="Comma-separated city_town values")
    parser.add_argument("--coverage", required=True)
    parser.add_argument("--outlet", required=True)
    parser.add_argument("--also", default="")
    parser.add_argument("--note", action="append", default=[])
    args = parser.parse_args()
    report = build_packet(
        folder=args.folder,
        zip_name=args.zip,
        towns=[t.strip() for t in args.towns.split(",") if t.strip()],
        coverage_label=args.coverage,
        primary_outlet=args.outlet,
        also_serves=args.also,
        notes=args.note or None,
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
