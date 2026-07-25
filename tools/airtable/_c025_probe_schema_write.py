#!/usr/bin/env python3
"""Probe schema write using tools/airtable/.env only (ignore web/.env.local)."""

from __future__ import annotations

import json
import os
from pathlib import Path

import requests
from dotenv import dotenv_values

HERE = Path(__file__).resolve().parent
DEV = "appTetnuCZlCZdTCT"
META = f"https://api.airtable.com/v0/meta/bases/{DEV}"
ZA = "tblfwbt6aCDCM5gUz"
ZM = "tblWcSHEm8vNNIxyB"

tv = dotenv_values(HERE / ".env")
token = tv.get("AIRTABLE_TOKEN") or tv.get("AIRTABLE_API_TOKEN") or ""
if not token:
    raise SystemExit("no tools token")

# Force tools token for subsequent imports
os.environ["AIRTABLE_TOKEN"] = token
os.environ["AIRTABLE_API_TOKEN"] = token

H = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

print("whoami", requests.get("https://api.airtable.com/v0/meta/whoami", headers=H, timeout=30).text[:200])

# Formula patch probe
formula = (
    'IF(\n'
    '  OR(\n'
    '    {Enrollment RID} = BLANK(),\n'
    '    {Zoom Meeting RID} = BLANK()\n'
    '  ),\n'
    '  BLANK(),\n'
    '  "ZOOM_CREDIT|" & {Enrollment RID} & "|" & {Zoom Meeting RID}\n'
    ')'
)
r = requests.patch(
    f"{META}/tables/{ZA}/fields/fldhaYb9gaCndiQvx",
    headers=H,
    json={"options": {"formula": formula}},
    timeout=120,
)
print("formula_patch", r.status_code, r.text[:500])

# Rollup create probe (idempotent name)
payload = {
    "name": "Approved Preconflict Pair Tags",
    "type": "rollup",
    "description": "C-025 — ARRAYJOIN of Zoom Attendance Preconflict Pair Tag for exclusivity",
    "options": {
        "isValid": True,
        "recordLinkFieldId": "fldELpIe5BwPhXaTA",
        "fieldIdInLinkedTable": "fldQJiAeb7K9G3cEl",
        "referencedFieldIds": [],
        "formula": "ARRAYJOIN(values)",
        "result": {"type": "singleLineText"},
    },
}
r2 = requests.post(f"{META}/tables/{ZM}/fields", headers=H, json=payload, timeout=120)
print("rollup_create", r2.status_code, r2.text[:800])
if r2.ok:
    Path(HERE / "_preview" / "c025_rollup_created.json").write_text(
        json.dumps(r2.json(), indent=2), encoding="utf-8"
    )
