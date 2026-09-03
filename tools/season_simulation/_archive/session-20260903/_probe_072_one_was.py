"""One-record 072 probe helpers — read-only capture + post-check."""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from season_simulation.airtable_client import AirtableClient, fields_of  # noqa: E402

WAS = "rec6jdIPEkloW1rNK"
ENROLL = "recekm0ke1bihWAc3"
SAFE = "schmidt@fairfieldbasketballclub.com"
MARKER = "SEASON-SIM|SEASON-SIM-2027-20260902T202049Z-athlete1"


def _linked(fields: dict, name: str) -> list[str]:
    raw = fields.get(name)
    if not isinstance(raw, list):
        return []
    out: list[str] = []
    for item in raw:
        if isinstance(item, str) and item.startswith("rec"):
            out.append(item)
        elif isinstance(item, dict) and item.get("id"):
            out.append(str(item["id"]))
    return out


def snapshot(c: AirtableClient, was_id: str) -> dict:
    row = c.get_record("Weekly Athlete Summary", was_id)
    f = fields_of(row)
    keys = [
        "Build Weekly Email Now?",
        "Weekly Email Sent?",
        "Send to Make?",
        "Weekly Email Ready?",
        "Enrollment",
        "Week",
        "Email Subject",
        "Weekly Email Subject",
        "Weekly Email Error",
        "Weekly Email Last Built At",
        "Weekly Email HTML",
        "Weekly Email Text",
        "Weekly Email Recipients",
        "Weekly Email Payload JSON",
        "Combined Recipient Emails",
        "Parent Email - Cleaned",
        "Athlete Email - Cleaned",
        "Email Handoff Queue",
        "Total Shots This Week",
        "XP Earned This Week",
        "Weekly Athlete Summary - Display",
    ]
    return {
        "id": was_id,
        "enrollment_links": _linked(f, "Enrollment"),
        "week_links": _linked(f, "Week"),
        "fields": {k: f.get(k) for k in keys},
    }


def list_weekly_handoffs(c: AirtableClient) -> list[dict]:
    out: list[dict] = []
    try:
        rows = c.list_records(
            "Email Handoff Queue",
            formula="OR({Event Type}='WEEKLY', FIND('WEEKLY', {Handoff Key}&'')>0)",
            max_records=200,
        )
    except Exception as exc:  # noqa: BLE001
        return [{"error": str(exc)}]
    for r in rows:
        f = fields_of(r)
        hk = str(f.get("Handoff Key") or "")
        was_links = _linked(f, "Weekly Athlete Summary") + _linked(f, "Source Record")
        enroll_links = _linked(f, "Enrollment")
        blob = json.dumps(f, default=str)
        if WAS in hk or WAS in was_links or WAS in blob or ENROLL in hk or ENROLL in enroll_links:
            out.append(
                {
                    "id": r["id"],
                    "Event Type": f.get("Event Type"),
                    "Status": f.get("Status"),
                    "Handoff Key": hk,
                    "Recipients": f.get("Recipients") or f.get("Recipient"),
                    "Weekly Athlete Summary": was_links,
                    "Enrollment": enroll_links,
                    "Last Error": f.get("Last Error"),
                }
            )
    return out


def recipients_ok(value) -> tuple[bool, list[str]]:
    emails: list[str] = []
    if isinstance(value, str):
        emails = [p.strip().lower() for p in value.replace(";", ",").split(",") if p.strip()]
    elif isinstance(value, list):
        for item in value:
            if isinstance(item, dict):
                e = str(item.get("email") or "").strip().lower()
                if e:
                    emails.append(e)
            elif isinstance(item, str) and "@" in item:
                emails.append(item.strip().lower())
    bad = [e for e in emails if e and e != SAFE]
    return (not bad and bool(emails)), emails


def main() -> int:
    mode = (sys.argv[1] if len(sys.argv) > 1 else "before").strip()
    allow_writes = mode == "trigger"
    c = AirtableClient(allow_writes=allow_writes)
    report: dict = {"mode": mode, "was": WAS, "enrollment": ENROLL, "marker": MARKER}

    enr = fields_of(c.get_record("Enrollments", ENROLL))
    parent = str(enr.get("Parent Email") or "").strip().lower()
    athlete = str(enr.get("Athlete Email") or "").strip().lower()
    report["enrollment_emails"] = {"Parent Email": parent, "Athlete Email": athlete}
    if parent != SAFE or athlete != SAFE:
        report["stop"] = f"Unsafe enrollment email parent={parent!r} athlete={athlete!r}"
        print(json.dumps(report, indent=2, default=str))
        return 2

    snap = snapshot(c, WAS)
    report["snapshot"] = snap
    report["weekly_handoffs"] = list_weekly_handoffs(c)

    if mode == "trigger":
        sent = snap["fields"].get("Weekly Email Sent?")
        if sent is True:
            report["stop"] = "Weekly Email Sent? already true — abort"
            print(json.dumps(report, indent=2, default=str))
            return 2
        if snap["enrollment_links"] != [ENROLL]:
            report["stop"] = f"Enrollment mismatch {snap['enrollment_links']} — abort"
            print(json.dumps(report, indent=2, default=str))
            return 2
        c.update_records(
            "Weekly Athlete Summary",
            [{"id": WAS, "fields": {"Build Weekly Email Now?": False}}],
        )
        c.update_records(
            "Weekly Athlete Summary",
            [
                {
                    "id": WAS,
                    "fields": {
                        "Build Weekly Email Now?": True,
                        "Weekly Email Sent?": False,
                        "Send to Make?": False,
                    },
                }
            ],
        )
        report["trigger"] = "Build Weekly Email Now? false→true on single WAS only"
        report["snapshot_after_trigger"] = snapshot(c, WAS)

    if mode == "after":
        recips = snap["fields"].get("Weekly Email Recipients")
        ok, emails = recipients_ok(recips)
        report["recipient_check"] = {"ok": ok, "emails": emails, "raw": recips}
        if emails and not ok:
            report["stop"] = "Non-allowlisted recipient detected"
            print(json.dumps(report, indent=2, default=str))
            return 2

    out = Path(__file__).resolve().parent / "reports" / f"probe-072-{mode}-{WAS}.json"
    out.write_text(json.dumps(report, indent=2, default=str) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, default=str))
    print(f"Wrote {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
