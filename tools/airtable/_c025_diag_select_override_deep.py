#!/usr/bin/env python3
"""Deep-check Deadline Mode override + draft formula state."""

from __future__ import annotations

import json
import time

import requests

from _c025_config_linkage_apply import (
    DATA,
    H,
    META,
    PREVIEW,
    ZM_ID,
    field_by_name,
    patch_field,
    tables,
)

MID = "rech5YbJNUzBRY6LQ"


def main():
    ts = tables()
    names = [
        "Deadline Mode — Meeting Override",
        "Effective Recording Deadline Mode",
        "Effective Recording Deadline Mode (Config formula draft)",
        "Program Config: Deadline Mode",
    ]
    schema = {}
    for n in names:
        f = field_by_name(ZM_ID, n, ts)
        schema[n] = f

    # Force draft to simple ARRAYJOIN only
    draft = schema["Effective Recording Deadline Mode (Config formula draft)"]
    simple = "ARRAYJOIN({Program Config: Deadline Mode})"
    res1 = patch_field(ZM_ID, draft["id"], {"options": {"formula": simple}})
    time.sleep(2)
    r = requests.get(
        f"{DATA}/{ZM_ID}/{MID}",
        headers=H,
        params={"returnFieldsByFieldId": "true"},
        timeout=60,
    ).json()
    by_id = r.get("fields") or {}

    # Read named values too
    rn = requests.get(f"{DATA}/{ZM_ID}/{MID}", headers=H, timeout=60).json()

    # Also try returning override explicitly via probe patch
    override_probe_formula = '{Deadline Mode — Meeting Override}&""'
    # create/patch
    op = field_by_name(ZM_ID, "C025 Select Probe OverrideRaw", ts)
    if op:
        patch_field(ZM_ID, op["id"], {"options": {"formula": override_probe_formula}})
        opid = op["id"]
    else:
        from _c025_config_linkage_apply import create_field

        cres = create_field(
            ZM_ID,
            {
                "name": "C025 Select Probe OverrideRaw",
                "type": "formula",
                "options": {"formula": override_probe_formula},
            },
        )
        opid = (cres.get("field") or {}).get("id")

    time.sleep(2)
    r2 = requests.get(
        f"{DATA}/{ZM_ID}/{MID}",
        headers=H,
        params={"returnFieldsByFieldId": "true"},
        timeout=60,
    ).json()
    by_id2 = r2.get("fields") or {}

    out = {
        "override_field": {
            "id": schema["Deadline Mode — Meeting Override"]["id"],
            "type": schema["Deadline Mode — Meeting Override"]["type"],
            "options": schema["Deadline Mode — Meeting Override"].get("options"),
            "data_by_id": by_id.get(schema["Deadline Mode — Meeting Override"]["id"], "<absent>"),
            "data_by_name": rn.get("fields", {}).get("Deadline Mode — Meeting Override", "<absent>"),
        },
        "draft_force_simple": {
            "patch": res1.get("status"),
            "value": by_id.get(draft["id"]),
            "formula_now": (field_by_name(ZM_ID, draft["name"], tables()) or {}).get("options", {}).get("formula"),
        },
        "override_raw_probe": by_id2.get(opid) if opid else None,
        "effective_value": rn.get("fields", {}).get("Effective Recording Deadline Mode"),
        "all_override_like": {
            k: v
            for k, v in rn.get("fields", {}).items()
            if "Override" in k and ("Deadline" in k or "Email" in k or "Template" in k)
        },
    }
    path = PREVIEW / "c025_select_override_deep.json"
    path.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
