#!/usr/bin/env python3
"""Supplemental Phase 1 probes — write-only (no console unicode)."""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path
from urllib.parse import quote

import requests

sys.path.insert(0, str(Path(__file__).parent))
from airtable_read import BASE_ID, f, session  # noqa: E402

EV = Path(__file__).resolve().parents[2] / "docs/testing/evidence/transactional-purge-2026-09-05"


def list_all(sess, table, fields=None):
    url = f"https://api.airtable.com/v0/{BASE_ID}/{quote(table)}"
    rows, offset = [], None
    while True:
        params = {"pageSize": 100}
        if fields:
            for i, name in enumerate(fields):
                params[f"fields[{i}]"] = name
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


def compact(fld: dict) -> dict:
    out = {}
    for k, v in fld.items():
        if v in (None, "", []):
            continue
        if isinstance(v, str) and len(v) > 200:
            out[k] = v[:200] + "…"
        elif isinstance(v, list) and v and isinstance(v[0], dict):
            continue  # skip attachments
        else:
            out[k] = v
    return out


def main():
    sess = session()
    out = {"base_id": BASE_ID}

    # Zoom Meetings
    zm_rows = list_all(sess, "Zoom Meetings")
    out["zoom_meetings"] = []
    for r in zm_rows:
        fld = f(r)
        name = fld.get("Meeting Name") or fld.get("Meeting Display Name")
        looks_test = any(
            tok in str(name).upper()
            for tok in ("VERIFY", "PELC", "SC-147", "TEST", "SIM", "ATHWF", "DISPOSABLE")
        )
        out["zoom_meetings"].append(
            {
                "id": r["id"],
                "createdTime": r.get("createdTime"),
                "meeting_name": name,
                "looks_like_test_fixture": looks_test,
                "week": fld.get("Week"),
                "attendees": fld.get("Attendees"),
                "xp_events": fld.get("XP Events"),
                "meeting_status": fld.get("Meeting Status"),
                "start_time": fld.get("Start Time"),
            }
        )

    # Weeks
    out["weeks"] = []
    for r in list_all(sess, "Weeks"):
        fld = f(r)
        out["weeks"].append(
            {
                "id": r["id"],
                "createdTime": r.get("createdTime"),
                "preview": compact(fld),
            }
        )

    # Season sim gone?
    checks = {}
    for table, rid in [
        ("Athletes", "recMuAvqA0zH1eGFj"),
        ("Enrollments", "recmImoXTlKb5NWSY"),
    ]:
        url = f"https://api.airtable.com/v0/{BASE_ID}/{quote(table)}/{rid}"
        time.sleep(0.22)
        resp = sess.get(url, timeout=60)
        checks[f"{table}/{rid}"] = resp.status_code
    out["season_sim_T122531Z_ids"] = checks

    # Countries / State primary samples
    out["countries_sample"] = [
        {"id": r["id"], "fields": f(r)}
        for r in list_all(sess, "Countries", fields=["Country Name"])[:2]
    ]
    # State primary
    schema = json.loads(next(EV.glob("01-schema-*.json")).read_text(encoding="utf-8"))
    state_primary = next(t for t in schema["tables"] if t["name"] == "State")["primary_field"]
    out["state_sample"] = [
        {"id": r["id"], "fields": f(r)}
        for r in list_all(sess, "State", fields=[state_primary])[:3]
    ]
    out["state_primary"] = state_primary
    out["countries_count"] = 194
    out["state_count"] = 50

    # Handoffs
    eh = json.loads((EV / "tables" / "Email_Handoff_Queue.json").read_text(encoding="utf-8"))
    templates = {}
    emails = set()
    for r in eh:
        fld = r["fields"]
        tk = fld.get("Template Key") or "unknown"
        templates[tk] = templates.get(tk, 0) + 1
        for k, v in fld.items():
            if isinstance(v, str) and "@" in v:
                emails.add(v.lower())
            if isinstance(v, list):
                for item in v:
                    if isinstance(item, str) and "@" in item:
                        emails.add(item.lower())
    out["handoff_template_counts"] = templates
    out["handoff_emails"] = sorted(emails)
    out["handoff_count"] = len(eh)

    # Athletes summary
    ath = json.loads((EV / "tables" / "Athletes.json").read_text(encoding="utf-8"))
    out["athletes"] = [
        {
            "id": r["id"],
            "full_name": r["fields"].get("Full Name"),
            "parent_email": r["fields"].get("Parent Email"),
            "match_key": r["fields"].get("Athlete Match Key"),
            "enrollments": r["fields"].get("Enrollments"),
        }
        for r in ath
    ]

    # Enrollment IDs
    enr = json.loads((EV / "tables" / "Enrollments.json").read_text(encoding="utf-8"))
    out["enrollment_ids"] = [r["id"] for r in enr]

    # PHA count confirm (primary field, not Name)
    pha_primary = next(t for t in schema["tables"] if t["name"] == "Program Homework Assignments")[
        "primary_field"
    ]
    out["pha_primary"] = pha_primary
    out["pha_count_live"] = len(
        list_all(sess, "Program Homework Assignments", fields=[pha_primary])
    )

    # Testing Scenarios
    out["testing_scenarios"] = [
        {"id": r["id"], "fields": compact(f(r))} for r in list_all(sess, "Testing Scenarios")
    ]

    path = EV / "08-supplemental-probes.json"
    path.write_text(json.dumps(out, indent=2, default=str), encoding="utf-8")
    print(f"Wrote {path}")
    print(f"zoom_meetings={len(out['zoom_meetings'])} testish={sum(1 for z in out['zoom_meetings'] if z['looks_like_test_fixture'])}")
    print(f"weeks={len(out['weeks'])} season_sim_checks={checks}")
    print(f"handoff_emails={sorted(emails)}")


if __name__ == "__main__":
    main()
