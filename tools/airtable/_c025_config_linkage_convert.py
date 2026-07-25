#!/usr/bin/env python3
"""C-025 DEV: convert Effective* via rename+create+rewire ZA lookups (API cannot change type in place)."""

from __future__ import annotations

import json
import time
from pathlib import Path

import requests
from dotenv import dotenv_values

HERE = Path(__file__).resolve().parent
PREVIEW = HERE / "_preview"
TOKEN = dotenv_values(HERE / ".env").get("AIRTABLE_TOKEN") or dotenv_values(HERE / ".env").get(
    "AIRTABLE_API_TOKEN"
)
H = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}
DEV = "appTetnuCZlCZdTCT"
META = f"https://api.airtable.com/v0/meta/bases/{DEV}"
DATA = f"https://api.airtable.com/v0/{DEV}"
ZM = "tblWcSHEm8vNNIxyB"
ZA = "tblfwbt6aCDCM5gUz"

# Import setting defs from apply module
from _c025_config_linkage_apply import SETTINGS, build_effective_formula, tables, field_by_name  # noqa: E402


def patch_field(table_id, field_id, body):
    r = requests.patch(f"{META}/tables/{table_id}/fields/{field_id}", headers=H, json=body, timeout=60)
    return r.status_code, r.text[:1000], (r.json() if r.ok else None)


def create_field(table_id, body):
    r = requests.post(f"{META}/tables/{table_id}/fields", headers=H, json=body, timeout=60)
    return r.status_code, r.text[:1000], (r.json() if r.ok else None)


def main():
    out = []
    ts = tables()
    for s in SETTINGS:
        legacy_name = f"{s['effective']} — Pre-Config Manual"
        existing = field_by_name(ZM, s["effective"], ts)
        already_formula = existing and existing.get("type") == "formula"
        if already_formula:
            out.append({"effective": s["effective"], "status": "already_formula", "id": existing["id"]})
            continue

        # If renamed already and formula exists
        formula_existing = field_by_name(ZM, s["effective"], ts)
        manual = field_by_name(ZM, legacy_name, ts)
        if formula_existing and formula_existing.get("type") == "formula":
            out.append({"effective": s["effective"], "status": "already_done", "id": formula_existing["id"]})
            continue

        old = existing
        if not old:
            out.append({"effective": s["effective"], "status": "missing_source"})
            continue

        # 1) rename old editable field
        code, text, _ = patch_field(ZM, old["id"], {"name": legacy_name})
        if code != 200:
            out.append({"effective": s["effective"], "status": "rename_failed", "code": code, "body": text})
            break
        time.sleep(0.25)

        # 2) create formula with original name
        formula = build_effective_formula(s)
        code, text, created = create_field(
            ZM,
            {
                "name": s["effective"],
                "type": "formula",
                "description": "C-025 — 4-tier precedence (override → program → global → fallback)",
                "options": {"formula": formula},
            },
        )
        if code != 200:
            # try restore name
            patch_field(ZM, old["id"], {"name": s["effective"]})
            out.append({"effective": s["effective"], "status": "create_failed", "code": code, "body": text})
            break
        new_id = created["id"]
        time.sleep(0.35)

        # 3) rewire ZA lookup of same name to new field ID
        ts = tables()
        za_f = field_by_name(ZA, s["effective"], ts)
        if not za_f:
            out.append({"effective": s["effective"], "status": "za_lookup_missing", "new_id": new_id})
            continue
        opts = za_f.get("options") or {}
        code, text, patched = patch_field(
            ZA,
            za_f["id"],
            {
                "options": {
                    "recordLinkFieldId": opts.get("recordLinkFieldId"),
                    "fieldIdInLinkedTable": new_id,
                }
            },
        )
        out.append(
            {
                "effective": s["effective"],
                "status": "converted" if code == 200 else "za_rewire_failed",
                "old_id": old["id"],
                "legacy_name": legacy_name,
                "new_id": new_id,
                "za_lookup_id": za_f["id"],
                "za_rewire_code": code,
                "za_body": text if code != 200 else None,
                "result_type": ((created.get("options") or {}).get("result") or {}).get("type"),
                "formula": formula,
            }
        )
        if code != 200:
            break
        time.sleep(0.25)
        ts = tables()

    path = PREVIEW / "c025_config_linkage_convert.json"
    path.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(json.dumps({"wrote": str(path), "items": [(x["effective"], x["status"]) for x in out]}, indent=2))


if __name__ == "__main__":
    main()
