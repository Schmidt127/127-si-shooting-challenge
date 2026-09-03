"""Pass 3: homework award statuses, WAS shot totals, streak fields, daily email."""

from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from season_simulation.airtable_client import AirtableClient, fields_of, linked_ids, txt  # noqa: E402

RUN = "SEASON-SIM-2027-20260902T202049Z-athlete1"
ENROLL = "recekm0ke1bihWAc3"
ROOT = Path(__file__).resolve().parent


def main() -> int:
    c = AirtableClient(allow_writes=False)
    reg = json.loads((ROOT / "run_registries" / f"{RUN}.json").read_text(encoding="utf-8"))
    deep = json.loads((ROOT / "reports" / f"audit-deep-{RUN}.json").read_text(encoding="utf-8"))

    # Homework award status distribution
    hw = deep["sections"]["homework_details"]
    award = Counter(str(h.get("Award Status")) for h in hw)
    completion = Counter(str(h.get("Completion Status")) for h in hw)
    xp_awarded = Counter(str(h.get("Total Homework XP Awarded")) for h in hw)
    errors = [h for h in hw if str(h.get("Award Status")) == "Error"]
    print("HW award", dict(award))
    print("HW completion", dict(completion))
    print("HW xp awarded", dict(xp_awarded))
    print("HW error count", len(errors))
    for h in errors[:5]:
        print("  err", h["id"], {k: h.get(k) for k in ("Award Status", "Completion Status", "Total Homework XP Awarded")})

    # WAS: get more shot/email fields
    was_ids = [w["id"] for w in deep["sections"]["was_details"]]
    formula = "OR(" + ",".join(f"RECORD_ID()='{rid}'" for rid in was_ids) + ")"
    rows = c.list_records("Weekly Athlete Summary", formula=formula, max_records=50)
    print("\nWAS field keys sample:")
    keys = set()
    for r in rows:
        keys |= set(fields_of(r))
    for k in sorted(keys):
        if any(
            x in k.lower()
            for x in (
                "shot",
                "email",
                "perfect",
                "xp",
                "submission",
                "goal",
                "week",
                "grade",
                "enrollment",
                "build",
                "ready",
                "send",
                "queue",
                "threshold",
            )
        ):
            print(" ", k)

    print("\nWAS per-row shots/emails:")
    for r in rows:
        f = fields_of(r)
        interesting = {
            k: f.get(k)
            for k in sorted(f)
            if any(
                x in k.lower()
                for x in (
                    "shot",
                    "email",
                    "build",
                    "ready",
                    "send",
                    "threshold",
                    "submission count",
                    "counted",
                    "goal %",
                    "percent",
                    "week name",
                    "week label",
                    "name",
                )
            )
        }
        print(r["id"], {k: interesting[k] for k in list(interesting)[:20]})

    # Streak Occurrences schema + any for enrollment via other fields
    tables = c.meta_tables()
    st = next(t for t in tables if t["name"] == "Streak Occurrences")
    print("\nStreak Occurrences fields:", [f["name"] for f in st["fields"]])
    # try enrollment formula variants
    for formula in (
        f"FIND('{ENROLL}', ARRAYJOIN({{Enrollment}}))",
        f"FIND('{ENROLL}', {{Enrollment Record ID}} & '')",
        f"FIND('{ENROLL}', {{Source Key}})",
        f"FIND('{ENROLL}', ARRAYJOIN({{Enrollment Record ID}}))",
    ):
        try:
            rr = c.list_records("Streak Occurrences", formula=formula, max_records=100)
            print("streak formula", formula[:70], "->", len(rr))
            if rr:
                print(" sample", fields_of(rr[0]))
        except Exception as exc:  # noqa: BLE001
            print("streak fail", formula[:50], str(exc)[:120])

    # Email handoff: only this enrollment
    rows = c.list_records(
        "Email Handoff Queue",
        formula=f"OR(FIND('{ENROLL}', {{Enrollment Record ID}} & ''), FIND('{ENROLL}', {{Payload JSON}}), FIND('{ENROLL}', {{Source Record ID}} & ''), FIND('{ENROLL}', {{Handoff Key}}))",
        max_records=200,
    )
    print("\nEmail for THIS enrollment:", len(rows))
    for r in rows:
        f = fields_of(r)
        print(
            r["id"],
            f.get("Event Type"),
            f.get("Status"),
            f.get("Last Error"),
            "recipients",
            f.get("Recipients JSON"),
        )

    # Broader: any handoff with our submission ids as source?
    sub_ids = [r["record_id"] for r in reg["records"] if r["table"] == "Submissions"]
    was_reg = [r["record_id"] for r in reg["records"] if r["table"] == "Weekly Athlete Summary"]
    found = []
    for rid in sub_ids[:5] + was_reg + [ENROLL]:
        rr = c.list_records(
            "Email Handoff Queue",
            formula=f"OR(FIND('{rid}', {{Source Record ID}} & ''), FIND('{rid}', {{Handoff Key}}), FIND('{rid}', {{Payload JSON}}))",
            max_records=20,
        )
        found.extend(rr)
    uniq = {r["id"]: r for r in found}
    print("\nEmail linked to sample subs/WAS/enroll:", len(uniq))
    for r in uniq.values():
        f = fields_of(r)
        print(r["id"], f.get("Event Type"), f.get("Status"), f.get("Source Record ID"))

    # Submission XP Award Status + linked XP Events count on a few
    sample_subs = sub_ids[:3]
    formula = "OR(" + ",".join(f"RECORD_ID()='{rid}'" for rid in sample_subs) + ")"
    rows = c.list_records("Submissions", formula=formula, max_records=10)
    print("\nSample submission XP fields:")
    for r in rows:
        f = fields_of(r)
        print(
            r["id"],
            {
                k: f.get(k)
                for k in (
                    "XP Award Ready?",
                    "XP Award Status",
                    "XP Total Points",
                    "XP Events",
                    "Last Reconciled Signature",
                    "Current Reconciliation Signature",
                    "Reconciliation Needed?",
                )
                if k in f or True
            },
        )

    # Count all submission XP Award Status
    statuses = Counter()
    xp_linked = 0
    for i in range(0, len(sub_ids), 20):
        part = sub_ids[i : i + 20]
        formula = "OR(" + ",".join(f"RECORD_ID()='{rid}'" for rid in part) + ")"
        rows = c.list_records("Submissions", formula=formula, max_records=100)
        for r in rows:
            f = fields_of(r)
            statuses[str(f.get("XP Award Status"))] += 1
            if linked_ids(f.get("XP Events")):
                xp_linked += 1
    print("All sub XP Award Status", dict(statuses), "with linked XP Events", xp_linked)

    # Current level name
    level_id = linked_ids(deep["sections"]["enrollment"].get("Current Level"))
    if level_id:
        lv = c.get_record("Levels", level_id[0])
        print("Level name", fields_of(lv).get("Name") or fields_of(lv).get("Level Name") or fields_of(lv))

    # Confirm registry emails only SAFE
    emails = reg.get("email_events") or []
    bad = [e for e in emails if (e.get("recipient") or "").lower() != "schmidt@fairfieldbasketballclub.com"]
    print("registry bad recipients", bad)

    # Aggregate Perfect Week
    pw = Counter()
    for w in deep["sections"]["was_details"]:
        pw[f"eligible={w.get('Perfect Week Eligible?')}"] += 1
        pw[f"daily={w.get('Perfect Week Daily Check Status')}"] += 1
        pw[f"auto={w.get('Perfect Week Automation Status')}"] += 1
    print("PW summary", dict(pw))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
