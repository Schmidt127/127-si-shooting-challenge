"""Probe 074→079 weekly send path on one disposable WAS."""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from season_simulation.airtable_client import AirtableClient, fields_of  # noqa: E402

WAS = "rec6jdIPEkloW1rNK"
ENROLL = "recekm0ke1bihWAc3"
WEEK = "recBrZ1sV8byWEHZU"
SAFE = "schmidt@fairfieldbasketballclub.com"
HANDOFF_KEY = f"WEEKLY_ATHLETE_SUMMARY|WEEKLY_ATHLETE_SUMMARY|{WAS}"
OTHERS = [
    "recZE2SgkrnwG7Ogw",
    "recbV3HSCK4WIUtN7",
    "recbHmeL956uvdeg1",
    "recdTXtMj1ri2Qh7J",
    "rechG2pRijDPax314",
]


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


def was_snap(c: AirtableClient, wid: str) -> dict:
    f = fields_of(c.get_record("Weekly Athlete Summary", wid))
    keys = [
        "Build Weekly Email Now?",
        "Weekly Email Ready?",
        "Send to Make?",
        "Weekly Email Sent?",
        "Weekly Email Subject",
        "Weekly Email Recipients",
        "Weekly Email Error",
        "Weekly Email Last Built At",
        "Weekly Email HTML",
        "Email Handoff Queue",
        "Total Shots This Week",
        "XP Earned This Week",
    ]
    return {
        "id": wid,
        "enrollment": _linked(f, "Enrollment"),
        "week": _linked(f, "Week"),
        "fields": {k: f.get(k) for k in keys},
        "html_len": len(str(f.get("Weekly Email HTML") or "")),
    }


def find_handoffs(c: AirtableClient) -> list[dict]:
    rows = c.list_records(
        "Email Handoff Queue",
        formula=f"{{Handoff Key}}='{HANDOFF_KEY}'",
        max_records=20,
    )
    out = []
    for r in rows:
        f = fields_of(r)
        out.append(
            {
                "id": r["id"],
                "Handoff Key": f.get("Handoff Key"),
                "Event Type": f.get("Event Type"),
                "Status": f.get("Status"),
                "Recipients JSON": f.get("Recipients JSON"),
                "Source Record ID": f.get("Source Record ID"),
                "Enrollment Record ID": f.get("Enrollment Record ID"),
                "Hub Event ID": f.get("Hub Event ID"),
                "Hub Response JSON": f.get("Hub Response JSON"),
                "Last Error": f.get("Last Error"),
                "Attempt Count": f.get("Attempt Count"),
                "Accepted At": f.get("Accepted At"),
                "Test Mode?": f.get("Test Mode?"),
            }
        )
    return out


def recipients_ok(raw) -> tuple[bool, list[str]]:
    emails: list[str] = []
    if isinstance(raw, str) and raw.strip().startswith("["):
        try:
            parsed = json.loads(raw)
            for item in parsed:
                if isinstance(item, dict) and item.get("email"):
                    emails.append(str(item["email"]).strip().lower())
        except json.JSONDecodeError:
            pass
    elif isinstance(raw, str):
        emails = [p.strip().lower() for p in raw.replace(";", ",").split(",") if p.strip()]
    bad = [e for e in emails if e and e != SAFE]
    return (not bad and bool(emails)), emails


def main() -> int:
    mode = (sys.argv[1] if len(sys.argv) > 1 else "before").strip()
    allow_writes = mode in {"trigger", "replay"}
    c = AirtableClient(allow_writes=allow_writes)
    report: dict = {
        "mode": mode,
        "was": WAS,
        "enrollment": ENROLL,
        "week": WEEK,
        "handoff_key": HANDOFF_KEY,
    }

    enr = fields_of(c.get_record("Enrollments", ENROLL))
    parent = str(enr.get("Parent Email") or "").strip().lower()
    athlete = str(enr.get("Athlete Email") or "").strip().lower()
    report["enrollment_emails"] = {"Parent Email": parent, "Athlete Email": athlete}
    if parent != SAFE or athlete != SAFE:
        report["stop"] = f"Unsafe enrollment email parent={parent!r} athlete={athlete!r}"
        print(json.dumps(report, indent=2, default=str))
        return 2

    snap = was_snap(c, WAS)
    report["snapshot"] = snap
    report["handoffs"] = find_handoffs(c)
    report["other_saturday_was"] = [was_snap(c, wid) for wid in OTHERS]

    if mode in {"trigger", "replay"}:
        if snap["enrollment"] != [ENROLL] or snap["week"] != [WEEK]:
            report["stop"] = "Enrollment/Week mismatch — abort"
            print(json.dumps(report, indent=2, default=str))
            return 2
        if snap["fields"].get("Weekly Email Ready?") is not True:
            report["stop"] = "Weekly Email Ready? is not true — abort"
            print(json.dumps(report, indent=2, default=str))
            return 2
        if snap["fields"].get("Build Weekly Email Now?") is True:
            report["stop"] = "Build Weekly Email Now? still pending — abort"
            print(json.dumps(report, indent=2, default=str))
            return 2
        if snap["fields"].get("Weekly Email Sent?") is True:
            report["stop"] = "Weekly Email Sent? already true — abort"
            print(json.dumps(report, indent=2, default=str))
            return 2
        recip = str(snap["fields"].get("Weekly Email Recipients") or "").strip().lower()
        ok, emails = recipients_ok(recip)
        if not ok or SAFE not in emails:
            report["stop"] = f"Unsafe WAS recipients {recip!r}"
            print(json.dumps(report, indent=2, default=str))
            return 2
        if mode == "trigger" and report["handoffs"]:
            report["stop"] = "WEEKLY handoff already exists — abort first create probe"
            print(json.dumps(report, indent=2, default=str))
            return 2

        # Smallest safe arm: Send to Make? false→true (simulates 119 for one record)
        c.update_records(
            "Weekly Athlete Summary",
            [{"id": WAS, "fields": {"Send to Make?": False}}],
        )
        c.update_records(
            "Weekly Athlete Summary",
            [{"id": WAS, "fields": {"Send to Make?": True}}],
        )
        report["trigger"] = "Send to Make? false→true on single Ready WAS only"
        report["snapshot_after_arm"] = was_snap(c, WAS)

    if mode == "after":
        for h in report["handoffs"]:
            ok, emails = recipients_ok(h.get("Recipients JSON"))
            h["recipient_check"] = {"ok": ok, "emails": emails}
            if emails and not ok:
                report["stop"] = "Non-allowlisted handoff recipient"
                print(json.dumps(report, indent=2, default=str))
                return 2

    out = Path(__file__).resolve().parent / "reports" / f"probe-074-079-{mode}-{WAS}.json"
    out.write_text(json.dumps(report, indent=2, default=str) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, default=str))
    print(f"Wrote {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
