#!/usr/bin/env python3
"""Install C-025 deadline formula with DATETIME_DIFF for Later/Earlier modes."""

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
META = "https://api.airtable.com/v0/meta/bases/appTetnuCZlCZdTCT"
DATA = "https://api.airtable.com/v0/appTetnuCZlCZdTCT"
ZM = "tblWcSHEm8vNNIxyB"
FID = "fldbmg5yT9O2TSqwn"
MID = "reczeUT0AJUWMmEOb"

# Design §4 logic + required lookup scalarization:
# - Week End Date lookup must be DATETIME_PARSE(ARRAYJOIN(...))
# - Airtable blanks MAX/MIN of dateTime + parsed date; use DATETIME_DIFF pick instead
WED = "DATETIME_PARSE(ARRAYJOIN({Week End Date}), 'YYYY-MM-DD')"
DAYS = "IF({Effective Recording Makeup Window Days} = BLANK(), 7, {Effective Recording Makeup Window Days})"
AVAIL_PLUS = f"DATEADD({{Recording Available At}}, {DAYS}, 'days')"

FORMULA = f"""IF(
  OR(
    {{Recording Available At}} = BLANK(),
    {{Attendance Method}} != "Recording Quiz"
  ),
  BLANK(),
  SWITCH(
    IF({{Effective Recording Deadline Mode}} = BLANK(), "Later of Both", {{Effective Recording Deadline Mode}}),
    "Days After Recording Available",
      {AVAIL_PLUS},
    "End of Program Week",
      IF({{Week End Date}} = BLANK(), BLANK(), {WED}),
    "Earlier of Both",
      IF(
        OR({{Week End Date}} = BLANK(), {{Recording Available At}} = BLANK()),
        IF({{Week End Date}} = BLANK(), {AVAIL_PLUS}, {WED}),
        IF(
          DATETIME_DIFF({AVAIL_PLUS}, {WED}, 'seconds') <= 0,
          {AVAIL_PLUS},
          {WED}
        )
      ),
      IF(
        OR({{Week End Date}} = BLANK(), {{Recording Available At}} = BLANK()),
        IF({{Week End Date}} = BLANK(), {AVAIL_PLUS}, {WED}),
        IF(
          DATETIME_DIFF({AVAIL_PLUS}, {WED}, 'seconds') >= 0,
          {AVAIL_PLUS},
          {WED}
        )
      )
  )
)"""


def main():
    r = requests.patch(
        f"{META}/tables/{ZM}/fields/{FID}",
        headers=H,
        json={
            "description": (
                "C-025 — Calculated Recording Quiz Deadline (true date). "
                "Design §4 modes/defaults; Week End Date via DATETIME_PARSE(ARRAYJOIN); "
                "Later/Earlier via DATETIME_DIFF (MAX/MIN blanked on lookup date)."
            ),
            "options": {"formula": FORMULA},
        },
        timeout=60,
    )
    print("patch", r.status_code)
    body = r.json()
    opts = body.get("options") or {}
    print("valid", opts.get("isValid"), "result", opts.get("result"))
    if r.status_code != 200:
        print(r.text[:1200])
        raise SystemExit(1)

    requests.patch(
        f"{DATA}/{ZM}/{MID}",
        headers=H,
        json={
            "fields": {
                "Recording Available At": "2026-07-01T18:00:00.000Z",
                "Attendance Method": "Recording Quiz",
                "Effective Recording Makeup Window Days": 7,
            },
            "typecast": True,
        },
        timeout=60,
    )

    out = {}
    for mode in [
        "Later of Both",
        "Earlier of Both",
        "End of Program Week",
        "Days After Recording Available",
        None,
    ]:
        requests.patch(
            f"{DATA}/{ZM}/{MID}",
            headers=H,
            json={"fields": {"Effective Recording Deadline Mode": mode}},
            timeout=60,
        )
        time.sleep(2.5)
        f = requests.get(f"{DATA}/{ZM}/{MID}", headers=H, timeout=60).json()["fields"]
        key = mode or "BLANK"
        # Expected:
        # avail+7 = 2026-07-08T18:00; week end = 2026-05-31
        # Later = Jul 8; Earlier = May 31; End = May 31; Days = Jul 8; Blank mode = Later
        out[key] = {
            "deadline": f.get("Calculated Recording Quiz Deadline"),
            "week_end": f.get("Week End Date"),
            "mode": f.get("Effective Recording Deadline Mode"),
        }
        print(key, "->", out[key]["deadline"])

    Path(HERE / "_preview" / "c025_deadline_diff_modes.json").write_text(
        json.dumps({"formula": FORMULA, "modes": out}, indent=2), encoding="utf-8"
    )
    print("wrote preview")


if __name__ == "__main__":
    main()
