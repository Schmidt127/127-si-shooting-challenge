#!/usr/bin/env python3
"""Read-only: deep inspect rollup link wiring + all ZA for meeting."""
from __future__ import annotations

import json
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROD = "appn84sqPw03zEbTT"
MEETING = "reczeUT0AJUWMmEOb"
ENROLL = "recgP9qZYjAhE7NXm"


def load_token() -> str:
    env: dict[str, str] = {}
    for line in (HERE / ".env").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env.get("AIRTABLE_API_TOKEN") or env["AIRTABLE_TOKEN"]


def get(url: str, token: str):
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req, timeout=90) as resp:
        return json.loads(resp.read().decode("utf-8"))


def list_all(table: str, token: str, formula: str, fields: list[str]):
    records = []
    offset = None
    while True:
        params = ["filterByFormula=" + urllib.parse.quote(formula)]
        for f in fields:
            params.append("fields[]=" + urllib.parse.quote(f))
        if offset:
            params.append(f"offset={offset}")
        url = (
            f"https://api.airtable.com/v0/{PROD}/{urllib.parse.quote(table)}?"
            + "&".join(params)
        )
        body = get(url, token)
        records.extend(body.get("records") or [])
        offset = body.get("offset")
        if not offset:
            break
    return records


def main() -> None:
    token = load_token()
    meta = get(f"https://api.airtable.com/v0/meta/bases/{PROD}/tables", token)
    tables = {t["name"]: t for t in meta["tables"]}
    zm = {f["name"]: f for f in tables["Zoom Meetings"]["fields"]}
    za = {f["name"]: f for f in tables["Zoom Attendance"]["fields"]}
    zm_by_id = {f["id"]: f for f in tables["Zoom Meetings"]["fields"]}
    za_by_id = {f["id"]: f for f in tables["Zoom Attendance"]["fields"]}

    rollup = zm["Approved Preconflict Pair Tags"]
    opts = rollup.get("options") or {}
    link_field = zm_by_id[opts["recordLinkFieldId"]]
    source_field = za_by_id[opts["fieldIdInLinkedTable"]]

    # Inverse / link options on Zoom Meetings.Zoom Attendance
    link_opts = link_field.get("options") or {}
    print("ROLLUP FIELD")
    print(
        json.dumps(
            {
                "rollup": rollup["name"],
                "type": rollup["type"],
                "options": opts,
                "link_field_name": link_field["name"],
                "link_field_id": link_field["id"],
                "link_field_type": link_field["type"],
                "link_options": link_opts,
                "source_field_name": source_field["name"],
                "source_field_type": source_field["type"],
                "source_formula": (source_field.get("options") or {}).get("formula"),
            },
            indent=2,
        )
    )

    # ZA.Zoom Meeting link options
    zm_link = za["Zoom Meeting"]
    print("\nZA.Zoom Meeting link options")
    print(json.dumps({"id": zm_link["id"], "options": zm_link.get("options")}, indent=2))

    meeting = get(
        f"https://api.airtable.com/v0/{PROD}/{urllib.parse.quote('Zoom Meetings')}/{MEETING}",
        token,
    )
    mf = meeting.get("fields") or {}
    print("\nMEETING rollup value + inverse link IDs")
    print(
        json.dumps(
            {
                "Approved Preconflict Pair Tags": mf.get("Approved Preconflict Pair Tags"),
                "Zoom Attendance": mf.get("Zoom Attendance"),
            },
            indent=2,
        )
    )

    # All ZA claiming this meeting via RID or link
    by_rid = list_all(
        "Zoom Attendance",
        token,
        f"{{Zoom Meeting RID}}='{MEETING}'",
        [
            "Attendance Method",
            "Preconflict Pair Tag",
            "Enrollment RID",
            "Zoom Meeting",
            "Live Attendance Confirmed?",
            "Zoom Credit Pre-Approved?",
        ],
    )
    by_enroll = list_all(
        "Zoom Attendance",
        token,
        f"AND({{Enrollment RID}}='{ENROLL}', FIND('{MEETING}', ARRAYJOIN({{Zoom Meeting}})&''))",
        [
            "Attendance Method",
            "Preconflict Pair Tag",
            "Enrollment RID",
            "Zoom Meeting",
            "Live Attendance Confirmed?",
            "Zoom Credit Pre-Approved?",
        ],
    )
    # Also FIND on RID for enroll
    by_pair = list_all(
        "Zoom Attendance",
        token,
        f"AND({{Enrollment RID}}='{ENROLL}', {{Zoom Meeting RID}}='{MEETING}')",
        [
            "Attendance Method",
            "Preconflict Pair Tag",
            "Enrollment RID",
            "Zoom Meeting",
            "Live Attendance Confirmed?",
            "Zoom Credit Pre-Approved?",
        ],
    )

    def summarize(rows):
        out = []
        for r in rows:
            f = r.get("fields") or {}
            out.append(
                {
                    "id": r["id"],
                    "method": f.get("Attendance Method"),
                    "tag": f.get("Preconflict Pair Tag"),
                    "zoom_meeting_link": f.get("Zoom Meeting"),
                    "live_confirmed": f.get("Live Attendance Confirmed?"),
                    "pre_approved": f.get("Zoom Credit Pre-Approved?"),
                    "in_meeting_inverse": r["id"] in (mf.get("Zoom Attendance") or []),
                }
            )
        return out

    print("\nZA by Zoom Meeting RID")
    print(json.dumps(summarize(by_rid), indent=2))
    print("\nZA by Enrollment+Meeting RID pair")
    print(json.dumps(summarize(by_pair), indent=2))
    print("\nZA by Enrollment with meeting in Zoom Meeting link")
    print(json.dumps(summarize(by_enroll), indent=2))

    # Search any LIVE tags containing this enrollment
    live_tags = list_all(
        "Zoom Attendance",
        token,
        f"{{Preconflict Pair Tag}}='{ENROLL}|LIVE'",
        ["Attendance Method", "Preconflict Pair Tag", "Zoom Meeting", "Zoom Meeting RID"],
    )
    print("\nAny ZA with Preconflict Pair Tag = enrollment|LIVE")
    print(json.dumps(summarize(live_tags), indent=2))


if __name__ == "__main__":
    main()
