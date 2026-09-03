"""Arm Send to Make? on Ready weekly packages for one sim run (119 substitute)."""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from season_simulation.airtable_client import AirtableClient, fields_of  # noqa: E402

RUN = "SEASON-SIM-2027-20260902T213135Z-athlete1"
ENROLL = "recLlFgEVhhiCWSRY"
SAFE = "schmidt@fairfieldbasketballclub.com"
ROOT = Path(__file__).resolve().parent


def main() -> int:
    reg = json.loads((ROOT / "run_registries" / f"{RUN}.json").read_text(encoding="utf-8"))
    was_ids = [
        r["record_id"]
        for r in reg["records"]
        if r["table"] == "Weekly Athlete Summary"
        and "WAS_EMAIL_ARM" in (r.get("dedupe_key") or "")
    ]
    c = AirtableClient(allow_writes=True)
    armed = []
    for wid in was_ids:
        f = fields_of(c.get_record("Weekly Athlete Summary", wid))
        enroll = f.get("Enrollment")
        recip = str(f.get("Weekly Email Recipients") or "").lower()
        if ENROLL not in str(enroll):
            print("SKIP foreign", wid)
            continue
        if SAFE not in recip:
            print("SKIP unsafe recip", wid, recip)
            continue
        if f.get("Weekly Email Ready?") is not True:
            print("SKIP not ready", wid)
            continue
        if f.get("Weekly Email Sent?") is True:
            print("SKIP already sent", wid)
            continue
        c.update_records(
            "Weekly Athlete Summary",
            [{"id": wid, "fields": {"Send to Make?": False}}],
        )
        c.update_records(
            "Weekly Athlete Summary",
            [{"id": wid, "fields": {"Send to Make?": True}}],
        )
        armed.append(wid)
        print("ARMED", wid)
    print(json.dumps({"armed": armed, "count": len(armed)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
