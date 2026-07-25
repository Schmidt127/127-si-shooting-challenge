#!/usr/bin/env python3
"""Diagnose blank select/text draft formulas on Zoom Meetings (DEV)."""

from __future__ import annotations

import json
import time

import requests

from _c025_config_linkage_apply import (
    DATA,
    H,
    PREVIEW,
    ZM_ID,
    create_field,
    field_by_name,
    patch_field,
    tables,
)

MID = "rech5YbJNUzBRY6LQ"

PROBES = [
    ("C025 Select Probe AJ Prog", "ARRAYJOIN({Program Config: Deadline Mode})"),
    ("C025 Select Probe Raw Prog", "{Program Config: Deadline Mode}"),
    (
        "C025 Select Probe OverrideBlank",
        'IF({Deadline Mode — Meeting Override}!=BLANK(),"HAS","BLANK")',
    ),
    (
        "C025 Select Probe Nested",
        'IF(ARRAYJOIN({Program Config: Deadline Mode})!=BLANK(),ARRAYJOIN({Program Config: Deadline Mode}),"FALL")',
    ),
    (
        "C025 Select Probe AJ Glob",
        "ARRAYJOIN({Global Config: Deadline Mode})",
    ),
]


def main():
    ts = tables()
    schema = {}
    for n in [
        "Program Config: Deadline Mode",
        "Global Config: Deadline Mode",
        "Deadline Mode — Meeting Override",
        "Effective Recording Deadline Mode (Config formula draft)",
    ]:
        f = field_by_name(ZM_ID, n, ts)
        schema[n] = {
            "id": f["id"] if f else None,
            "type": f.get("type") if f else None,
            "options": f.get("options") if f else None,
        }

    applied = []
    for name, formula in PROBES:
        existing = field_by_name(ZM_ID, name, ts)
        if existing:
            res = patch_field(ZM_ID, existing["id"], {"options": {"formula": formula}})
            applied.append({"name": name, "id": existing["id"], "status": res.get("status"), "body": res.get("body")})
        else:
            res = create_field(
                ZM_ID,
                {"name": name, "type": "formula", "options": {"formula": formula}},
            )
            fid = (res.get("field") or {}).get("id")
            applied.append({"name": name, "id": fid, "status": res.get("status"), "body": res.get("body")})
        time.sleep(0.3)

    time.sleep(3)
    ts = tables()
    r = requests.get(
        f"{DATA}/{ZM_ID}/{MID}",
        headers=H,
        params={"returnFieldsByFieldId": "true"},
        timeout=60,
    )
    r.raise_for_status()
    by_id = r.json().get("fields") or {}
    values = {}
    for name, _formula in PROBES:
        f = field_by_name(ZM_ID, name, ts)
        values[name] = by_id.get(f["id"]) if f else None
    draft = field_by_name(ZM_ID, "Effective Recording Deadline Mode (Config formula draft)", ts)
    values["draft"] = by_id.get(draft["id"]) if draft else None
    values["Program Config: Deadline Mode"] = by_id.get(schema["Program Config: Deadline Mode"]["id"])
    values["Global Config: Deadline Mode"] = by_id.get(schema["Global Config: Deadline Mode"]["id"])

    out = {
        "schema": schema,
        "applied": applied,
        "values": values,
        "draft_formula": (draft or {}).get("options", {}).get("formula") if draft else None,
    }
    path = PREVIEW / "c025_select_draft_blank_diag.json"
    path.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(json.dumps({"wrote": str(path), "values": values, "applied_status": [a["status"] for a in applied]}, indent=2))


if __name__ == "__main__":
    main()
