#!/usr/bin/env python3
"""Prepare Schmidt live-only credit fixture + run deadline/credit verification."""

from __future__ import annotations

import json
import time
from pathlib import Path

import requests
from dotenv import dotenv_values

HERE = Path(__file__).resolve().parent
TOKEN = dotenv_values(HERE / ".env").get("AIRTABLE_TOKEN") or dotenv_values(HERE / ".env").get(
    "AIRTABLE_API_TOKEN"
)
H = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}
DATA = "https://api.airtable.com/v0/appTetnuCZlCZdTCT"
ZA = "tblfwbt6aCDCM5gUz"
ZM = "tblWcSHEm8vNNIxyB"
SCHMIDT = "recgP9qZYjAhE7NXm"

LIVE = "rec9EEtEf3AS5GYCf"
REC = "recHkB9aER3vCvBsL"
CONFLICT_REC = "rec2GKdH8UURJIy09"
BLANK = "recqddsE2Okt8gdQP"
MEETING_REC = "reczeUT0AJUWMmEOb"


def get(table, rid):
    r = requests.get(f"{DATA}/{table}/{rid}", headers=H, timeout=60)
    r.raise_for_status()
    return r.json()


def patch(table, rid, fields):
    r = requests.patch(
        f"{DATA}/{table}/{rid}",
        headers=H,
        json={"fields": fields, "typecast": True},
        timeout=60,
    )
    if not r.ok:
        raise SystemExit(f"patch {rid} {r.status_code} {r.text[:400]}")
    return r.json()


def main():
    # Keep conflict pair intact (LIVE + CONFLICT_REC). Create/find separate Live-only row
    # for live_approved_full on a meeting without a competing Recording Quiz sibling.
    ff = (
        f"AND("
        f"FIND('{SCHMIDT}', ARRAYJOIN({{Enrollment}}&'')),"
        f"{{Attendance Method}}='Live'"
        f")"
    )
    r = requests.get(
        f"{DATA}/{ZA}",
        headers=H,
        params={
            "filterByFormula": ff,
            "maxRecords": 50,
            "fields[]": [
                "Attendance Method",
                "Zoom Credit Conflict?",
                "Zoom Credit Pre-Approved?",
                "Zoom Credit Approved?",
                "Zoom XP Percentage",
                "Zoom Credit Key",
                "Zoom Meeting",
                "Enrollment",
            ],
        },
        timeout=60,
    )
    r.raise_for_status()
    lives = r.json().get("records") or []
    print("live_count", len(lives))
    non_conf = []
    for rec in lives:
        f = rec.get("fields") or {}
        if rec["id"] in (LIVE, CONFLICT_REC):
            continue
        if f.get("Zoom Credit Conflict?") in (1, True, "1"):
            continue
        non_conf.append(rec)
        print(
            "candidate",
            rec["id"],
            {
                "pre": f.get("Zoom Credit Pre-Approved?"),
                "approved": f.get("Zoom Credit Approved?"),
                "pct": f.get("Zoom XP Percentage"),
                "meeting": f.get("Zoom Meeting"),
                "key": f.get("Zoom Credit Key"),
            },
        )

    live_only_id = None
    if non_conf:
        # Prefer one already pre-approved and approved
        for rec in non_conf:
            f = rec.get("fields") or {}
            if f.get("Zoom Credit Pre-Approved?") in (1, True) and f.get("Zoom Credit Approved?") in (
                1,
                True,
            ):
                live_only_id = rec["id"]
                break
        if not live_only_id:
            live_only_id = non_conf[0]["id"]
            patch(ZA, live_only_id, {"Zoom Credit Pre-Approved?": True, "Attendance Method": "Live"})
            time.sleep(2)
    else:
        # Create a Live-only row on meeting MEETING_REC? That meeting also has REC —
        # would create new conflict. Find a different meeting or create temporary meeting.
        # Use MEETING without recording sibling: fetch a meeting Schmidt isn't on with recording.
        # Safer: unlink is heavy. Create new meeting-less? Credit key needs meeting RID.
        # Create attendance linked to a meeting that only has this live row.
        # Pick Zoom Meeting from LIVE, clone isn't easy. Create new ZA on a fresh meeting.
        meetings = requests.get(
            f"{DATA}/{ZM}",
            headers=H,
            params={"maxRecords": 5, "fields[]": ["Name", "Attendance Method", "Week"]},
            timeout=60,
        ).json()["records"]
        # Use first meeting that isn't LIVE's or CONFLICT's meeting
        live_f = get(ZA, LIVE)["fields"]
        conflict_meeting = (live_f.get("Zoom Meeting") or [None])[0]
        pick = None
        for m in meetings:
            if m["id"] != conflict_meeting and m["id"] != MEETING_REC:
                pick = m["id"]
                break
        if not pick:
            pick = meetings[0]["id"]
        created = requests.post(
            f"{DATA}/{ZA}",
            headers=H,
            json={
                "fields": {
                    "Enrollment": [SCHMIDT],
                    "Zoom Meeting": [pick],
                    "Attendance Method": "Live",
                    "Zoom Credit Pre-Approved?": True,
                },
                "typecast": True,
            },
            timeout=60,
        )
        print("create", created.status_code, created.text[:300])
        created.raise_for_status()
        live_only_id = created.json()["id"]
        time.sleep(3)

    live_snap = get(ZA, live_only_id)
    print("live_only", live_only_id, live_snap.get("fields", {}).get("Zoom Credit Approved?"), live_snap.get("fields", {}).get("Zoom Credit Conflict?"), live_snap.get("fields", {}).get("Zoom XP Percentage"), live_snap.get("fields", {}).get("Zoom Credit Key"))

    # Deadline fixture: Days After past for ZA REC meeting
    patch(
        ZM,
        MEETING_REC,
        {
            "Recording Available At": "2026-06-01T18:00:00.000Z",
            "Attendance Method": "Recording Quiz",
            "Effective Recording Deadline Mode": "Days After Recording Available",
            "Effective Recording Makeup Window Days": 7,
        },
    )
    time.sleep(3)
    m = get(ZM, MEETING_REC)
    a = get(ZA, REC)
    print(
        "deadline",
        {
            "zm": m["fields"].get("Calculated Recording Quiz Deadline"),
            "za": a["fields"].get("Calculated Recording Quiz Deadline"),
            "week_end": m["fields"].get("Week End Date"),
        },
    )

    Path(HERE / "_preview" / "c025_live_only_fixture.json").write_text(
        json.dumps(
            {
                "live_only_id": live_only_id,
                "live_fields": {
                    k: (live_snap.get("fields") or {}).get(k)
                    for k in [
                        "Attendance Method",
                        "Zoom Credit Pre-Approved?",
                        "Zoom Credit Conflict?",
                        "Zoom Credit Approved?",
                        "Zoom XP Percentage",
                        "Zoom Gate Credit Earned?",
                        "Zoom Credit Key",
                        "Zoom Meeting",
                    ]
                },
                "deadline": {
                    "zm": m["fields"].get("Calculated Recording Quiz Deadline"),
                    "za": a["fields"].get("Calculated Recording Quiz Deadline"),
                },
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print("LIVE_ONLY_ID", live_only_id)


if __name__ == "__main__":
    main()
