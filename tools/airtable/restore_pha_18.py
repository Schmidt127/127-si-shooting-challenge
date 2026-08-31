#!/usr/bin/env python3
"""Restore the 18 seasonal Program Homework Assignments deleted by FUT-030."""
from __future__ import annotations

import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

sys.path.insert(0, str(Path(__file__).parent))
from airtable_read import BASE_ID, f, session  # noqa: E402

EVIDENCE = (
    Path(__file__).resolve().parents[2]
    / "docs"
    / "testing"
    / "evidence"
    / "transactional-reset-2026-08-31"
)

PHA_TABLE = "Program Homework Assignments"
PI = "rec5mEM0YPqPqq0hZ"
DUE = "2027-06-29"

# Active grade bands only (all five per 2026-08-30 audit)
GRADE_BANDS = [
    "recK7BDVSpHy2ipCS",  # K-2
    "reclWDQZzKbVBtdhG",  # 3-4
    "recv9aWnHanY2sRgk",  # 5-6
    "rec2VQFfGJa1ofA06",  # 7-8
    "rec75ruo3XT5nSvaK",  # 9-12
]

# Full Library titles from deleted PHA primary names (FUT-030 manifest)
INVENTORY = [
    ("recBrZ1sV8byWEHZU", "HW1", "SA - Personal Game Plan - Shot Tracker Usage"),
    ("recBrZ1sV8byWEHZU", "HW2", "SA - Personal Game Plan - Website Exploration"),
    ("rec2Rewxt21z7dI9f", "HW1", "MTFYA - Self Awareness - The Meditation Workout"),
    ("rec2Rewxt21z7dI9f", "HW2", "MTFYA - Resilience Technique - Train Rough"),
    ("rec7RpUMVLbcrmn4h", "HW1", "MTFYA - Relationships - Your Ride or Die and You - Family Culture"),
    ("rec7RpUMVLbcrmn4h", "HW2", "MTFYA - Personal Game Plan - Learn to Play Small"),
    ("recCCpyqPKA580sdk", "HW1", "MTFYA - Mastery - Writing Down Your Goals"),
    ("recCCpyqPKA580sdk", "HW2", "MTFYA - Mastery - The Visualization Workout"),
    ("recEapVpi6u0oxuPy", "HW1", "MTFYA - Growth Mindset - Watch the Pros! Not the Joes"),
    ("recEapVpi6u0oxuPy", "HW2", "MTFYA - Growth Mindset - The Cooldown"),
    ("recKJMGYbEzGHyXfd", "HW1", "MTFYA - Growth Mindset - Practice Slower"),
    ("recKJMGYbEzGHyXfd", "HW2", "MTFYA - Growth Mindset - How to Strengthen Your Subconscious Mind"),
    ("recRp4y42EpLvtwk5", "HW1", "P.I.B. - Self Awareness - Identity, Job, Approach"),
    ("recRp4y42EpLvtwk5", "HW2", "P.I.B. - Resilience Technique - Get Your Head (Back) in the Game"),
    ("recW3irij491AIPrl", "HW1", "P.I.B. - Personal Game Plan - Don't Beat Yourself"),
    ("recW3irij491AIPrl", "HW2", "P.I.B. - Play Grounded - What's Your Sports Credo?"),
    ("recfu3dpVJAnVBvCB", "HW1", "P.I.B. - Confidence Equation - Act Like a Champion"),
    ("recfu3dpVJAnVBvCB", "HW2", 'P.I.B. - "Say It, Believe It, Be It!" - Performance Affirmations'),
]


def list_all(sess, table: str) -> list[dict]:
    url = f"https://api.airtable.com/v0/{BASE_ID}/{quote(table)}"
    rows: list[dict] = []
    offset = None
    while True:
        params: dict = {"pageSize": 100}
        if offset:
            params["offset"] = offset
        time.sleep(0.22)
        resp = sess.get(url, params=params, timeout=180)
        resp.raise_for_status()
        data = resp.json()
        rows.extend(data.get("records", []))
        offset = data.get("offset")
        if not offset:
            return rows


def library_title(fields: dict) -> str:
    return str(
        fields.get("Assignment Full Name")
        or fields.get("Assignment Full Name - Display")
        or fields.get("Assignment Title")
        or ""
    )


def match_library(libs: list[dict], needle: str) -> dict:
    needle_l = needle.lower().strip()
    exact = []
    contains = []
    for rec in libs:
        title = library_title(f(rec))
        tl = title.lower()
        if tl == needle_l or tl.endswith(needle_l):
            exact.append((rec, title))
        elif needle_l in tl:
            contains.append((rec, title))
    hits = exact or contains
    if len(hits) == 1:
        return hits[0][0]
    raise RuntimeError(
        f"Library match failed for {needle!r}: {[(h[0]['id'], h[1]) for h in hits]}"
    )


def create_batch(sess, records: list[dict]) -> list[dict]:
    url = f"https://api.airtable.com/v0/{BASE_ID}/{quote(PHA_TABLE)}"
    created = []
    for i in range(0, len(records), 10):
        batch = records[i : i + 10]
        time.sleep(0.25)
        resp = sess.post(url, json={"records": batch, "typecast": True}, timeout=180)
        if not resp.ok:
            raise RuntimeError(f"CREATE failed: {resp.status_code} {resp.text[:600]}")
        created.extend(resp.json().get("records", []))
    return created


def main() -> int:
    confirm = len(sys.argv) > 1 and sys.argv[1] == "CONFIRM_CREATE"
    sess = session()
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

    existing = list_all(sess, PHA_TABLE)
    print(f"Existing PHA: {len(existing)}")
    if existing:
        print("ABORT: PHA table is not empty — refusing to duplicate.")
        for r in existing[:5]:
            print(" ", r["id"], library_title(f(r)) or f(r))
        return 2

    libs = list_all(sess, "Homework Library")
    print(f"Homework Library: {len(libs)}")
    # show title keys
    if libs:
        print("Sample library keys:", sorted(f(libs[0]).keys())[:20])

    plan = []
    for week_id, slot, title_needle in INVENTORY:
        lib = match_library(libs, title_needle)
        lib_title = library_title(f(lib))
        plan.append(
            {
                "week": week_id,
                "slot": slot,
                "needle": title_needle,
                "library_id": lib["id"],
                "library_title": lib_title,
                "fields": {
                    "Homework Assignment": [lib["id"]],
                    "Program Instance": [PI],
                    "Week": [week_id],
                    "Grade Band": GRADE_BANDS,
                    "Homework Slot": slot,
                    "Active?": True,
                    "Due Date": DUE,
                },
            }
        )
        print(f"  {slot} {title_needle} -> {lib['id']} | {lib_title}")

    out = EVIDENCE / f"10-pha-restore-plan-{stamp}.json"
    out.write_text(json.dumps({"plan": plan, "count": len(plan)}, indent=2), encoding="utf-8")
    print(f"Plan written: {out}")
    print(f"Planned creates: {len(plan)}")

    if not confirm:
        print("Dry run only. Re-run with CONFIRM_CREATE to create records.")
        return 0

    payload = [{"fields": p["fields"]} for p in plan]
    created = create_batch(sess, payload)
    report = {
        "created_at": stamp,
        "count": len(created),
        "records": [
            {
                "id": r["id"],
                "primary": f(r).get("Program Homework Assignment"),
                "fields": f(r),
            }
            for r in created
        ],
    }
    rout = EVIDENCE / f"11-pha-restore-created-{stamp}.json"
    rout.write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")
    print(f"Created {len(created)} PHA records -> {rout}")

    # verify
    after = list_all(sess, PHA_TABLE)
    active = [r for r in after if f(r).get("Active?")]
    print(f"PHA after: {len(after)} total, {len(active)} active")
    return 0 if len(active) == 18 else 1


if __name__ == "__main__":
    raise SystemExit(main())
