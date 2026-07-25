#!/usr/bin/env python3
"""Probe Week End Date lookup coercion variants for C-025 deadline formula."""

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

# Scalarize lookup date for use in MAX/MIN/return (design uses bare {Week End Date})
WED = "DATETIME_PARSE(ARRAYJOIN({Week End Date}), 'YYYY-MM-DD')"

FORMULA = f"""IF(
  OR(
    {{Recording Available At}} = BLANK(),
    {{Attendance Method}} != "Recording Quiz"
  ),
  BLANK(),
  SWITCH(
    IF({{Effective Recording Deadline Mode}} = BLANK(), "Later of Both", {{Effective Recording Deadline Mode}}),
    "Days After Recording Available",
      DATEADD(
        {{Recording Available At}},
        IF({{Effective Recording Makeup Window Days}} = BLANK(), 7, {{Effective Recording Makeup Window Days}}),
        'days'
      ),
    "End of Program Week",
      IF({{Week End Date}} = BLANK(), BLANK(), {WED}),
    "Earlier of Both",
      IF(
        OR({{Week End Date}} = BLANK(), {{Recording Available At}} = BLANK()),
        IF({{Week End Date}} = BLANK(),
          DATEADD({{Recording Available At}}, IF({{Effective Recording Makeup Window Days}} = BLANK(), 7, {{Effective Recording Makeup Window Days}}), 'days'),
          {WED}
        ),
        MIN(
          DATEADD({{Recording Available At}}, IF({{Effective Recording Makeup Window Days}} = BLANK(), 7, {{Effective Recording Makeup Window Days}}), 'days'),
          {WED}
        )
      ),
      IF(
        OR({{Week End Date}} = BLANK(), {{Recording Available At}} = BLANK()),
        IF({{Week End Date}} = BLANK(),
          DATEADD({{Recording Available At}}, IF({{Effective Recording Makeup Window Days}} = BLANK(), 7, {{Effective Recording Makeup Window Days}}), 'days'),
          {WED}
        ),
        MAX(
          DATEADD({{Recording Available At}}, IF({{Effective Recording Makeup Window Days}} = BLANK(), 7, {{Effective Recording Makeup Window Days}}), 'days'),
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
            "description": "C-025 deadline — true date; Week End Date via DATETIME_PARSE(ARRAYJOIN())",
            "options": {"formula": FORMULA},
        },
        timeout=60,
    )
    print("patch", r.status_code)
    body = r.json()
    opts = body.get("options") or {}
    print("valid", opts.get("isValid"), "result", opts.get("result"))
    if r.status_code != 200:
        print(r.text[:1000])
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
        out[key] = f.get("Calculated Recording Quiz Deadline")
        print(key, "->", out[key])

    Path(HERE / "_preview" / "c025_deadline_coerce_modes.json").write_text(
        json.dumps({"formula": FORMULA, "modes": out}, indent=2), encoding="utf-8"
    )


if __name__ == "__main__":
    main()
