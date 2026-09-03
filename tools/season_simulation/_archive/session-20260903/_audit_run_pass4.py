"""Pass 4: weekly/daily email presence + homework error detail."""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from season_simulation.airtable_client import AirtableClient, fields_of  # noqa: E402

RUN = "SEASON-SIM-2027-20260902T202049Z-athlete1"
ENROLL = "recekm0ke1bihWAc3"
ROOT = Path(__file__).resolve().parent


def main() -> int:
    c = AirtableClient(allow_writes=False)
    deep = json.loads((ROOT / "reports" / f"audit-deep-{RUN}.json").read_text(encoding="utf-8"))

    for et in (
        "WEEKLY",
        "DAILY",
        "SUBMISSION",
        "COACH",
        "INACTIVITY",
        "WELCOME",
        "ZOOM",
        "HOMEWORK",
        "VIDEO",
    ):
        rows = c.list_records(
            "Email Handoff Queue",
            formula=f"FIND('{et}', {{Event Type}} & '')",
            max_records=100,
        )
        ours = [r for r in rows if ENROLL in json.dumps(fields_of(r))]
        print(et, "total", len(rows), "ours", len(ours))
        for r in ours[:5]:
            f = fields_of(r)
            print(
                " ",
                f.get("Event Type"),
                f.get("Status"),
                (f.get("Last Error") or "")[:140],
            )

    hw_ids = [
        h["id"]
        for h in deep["sections"]["homework_details"]
        if h.get("Award Status") == "Error"
    ][:5]
    if hw_ids:
        formula = "OR(" + ",".join(f"RECORD_ID()='{i}'" for i in hw_ids) + ")"
        rows = c.list_records("Homework Completions", formula=formula, max_records=10)
        for r in rows:
            f = fields_of(r)
            errish = {
                k: f[k]
                for k in f
                if any(
                    x in k.lower()
                    for x in ("error", "award", "status", "xp", "ready", "debug", "note", "queue")
                )
            }
            print("HW", r["id"], errish)

    # Build Weekly Email Now counts
    was = deep["sections"]["was_details"]
    build_true = 0
    # re-fetch Build Weekly Email Now?
    was_ids = [w["id"] for w in was]
    formula = "OR(" + ",".join(f"RECORD_ID()='{rid}'" for rid in was_ids) + ")"
    rows = c.list_records("Weekly Athlete Summary", formula=formula, max_records=50)
    build = 0
    for r in rows:
        f = fields_of(r)
        if f.get("Build Weekly Email Now?"):
            build += 1
    print("WAS Build Weekly Email Now? true:", build, "/", len(rows))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
