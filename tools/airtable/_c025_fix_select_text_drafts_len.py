#!/usr/bin/env python3
"""Confirm empty singleSelect BLANK behavior; install select/text draft formulas that work."""

from __future__ import annotations

import json
import time

import requests

from _c025_config_linkage_apply import (
    DATA,
    H,
    PREVIEW,
    SETTINGS,
    ZM_ID,
    create_field,
    field_by_name,
    patch_field,
    tables,
)

MID = "rech5YbJNUzBRY6LQ"


def select_text_formula(s: dict) -> str:
    o = s["override"]
    p = f"Program Config: {s['rollup_label']}"
    g = f"Global Config: {s['rollup_label']}"
    if s["fallback"] == "":
        fb = "BLANK()"
    else:
        fb = json.dumps(s["fallback"])

    # Empty Meeting Override singleSelect/text can fail `!= BLANK()` checks and short-circuit
    # to a blank value. Use LEN(TRIM(x&"")) so only real text overrides win.
    return f"""IF(
  LEN(TRIM({{{o}}} & "")) > 0,
  {{{o}}} & "",
  IF(
    LEN(TRIM(ARRAYJOIN({{{p}}}) & "")) > 0,
    ARRAYJOIN({{{p}}}),
    IF(
      LEN(TRIM(ARRAYJOIN({{{g}}}) & "")) > 0,
      ARRAYJOIN({{{g}}}),
      {fb}
    )
  )
)"""


def main():
    ts = tables()

    # Diagnostic probes
    probes = [
        (
            "C025 Select Probe BlankCmp",
            'IF({Deadline Mode — Meeting Override}=BLANK(),"IS_BLANK","NOT_BLANK")',
        ),
        (
            "C025 Select Probe Len",
            'LEN(TRIM({Deadline Mode — Meeting Override}&""))',
        ),
        (
            "C025 Select Probe LenPath",
            'IF(LEN(TRIM({Deadline Mode — Meeting Override}&""))>0,"HAS_TEXT","NO_TEXT")',
        ),
    ]
    for name, formula in probes:
        existing = field_by_name(ZM_ID, name, ts)
        if existing:
            patch_field(ZM_ID, existing["id"], {"options": {"formula": formula}})
        else:
            create_field(ZM_ID, {"name": name, "type": "formula", "options": {"formula": formula}})
        time.sleep(0.25)

    report = []
    for s in SETTINGS:
        if s["kind"] not in ("select", "text"):
            continue
        draft_name = f"{s['effective']} (Config formula draft)"
        draft = field_by_name(ZM_ID, draft_name, ts)
        formula = select_text_formula(s)
        res = patch_field(
            ZM_ID,
            draft["id"],
            {
                "description": "C-025 — LEN/TRIM + ARRAYJOIN select/text draft (empty override safe)",
                "options": {"formula": formula},
            },
        )
        report.append(
            {
                "key": s["key"],
                "draft_id": draft["id"],
                "status": res.get("status"),
                "error": res.get("body"),
                "formula": formula,
            }
        )
        time.sleep(0.35)

    time.sleep(3)
    ts = tables()
    r = requests.get(
        f"{DATA}/{ZM_ID}/{MID}",
        headers=H,
        params={"returnFieldsByFieldId": "true"},
        timeout=60,
    ).json()
    by_id = r.get("fields") or {}
    rn = requests.get(f"{DATA}/{ZM_ID}/{MID}", headers=H, timeout=60).json().get("fields") or {}

    values = {}
    for name, _f in probes:
        f = field_by_name(ZM_ID, name, ts)
        values[name] = by_id.get(f["id"]) if f else None
    for row in report:
        row["sample_after"] = by_id.get(row["draft_id"])
        dn = next(s for s in SETTINGS if s["key"] == row["key"])
        values[dn["effective"] + " draft"] = rn.get(f"{dn['effective']} (Config formula draft)")
        values[dn["effective"] + " editable"] = rn.get(dn["effective"])

    out = {"probes": values, "report": report}
    path = PREVIEW / "c025_select_text_draft_len_fix.json"
    path.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(json.dumps({"wrote": str(path), "probes": values, "samples": [(r["key"], r["sample_after"], r["status"]) for r in report]}, indent=2))


if __name__ == "__main__":
    main()
