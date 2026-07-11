#!/usr/bin/env python3
"""Read Automations table doc record for 116 on PROD."""
from __future__ import annotations

import json
import os

import requests
from dotenv import load_dotenv

load_dotenv(".env")
H = {"Authorization": f"Bearer {os.environ['AIRTABLE_API_TOKEN']}"}
B = "appn84sqPw03zEbTT"
r = requests.get(
    f"https://api.airtable.com/v0/{B}/Automations",
    headers=H,
    params={"pageSize": 100},
    timeout=120,
)
r.raise_for_status()
rows = []
for rec in r.json().get("records") or []:
    f = rec.get("fields") or {}
    name = str(f.get("Name") or "")
    if name.startswith("116"):
        rows.append(
            {
                "id": rec["id"],
                "name": name,
                "status": f.get("Status"),
                "triggerType": f.get("Trigger type"),
                "triggerTable": f.get("Trigger table"),
                "conditions": f.get("Conditions"),
                "outputs": f.get("Outputs Written back to Airtable"),
                "codePrefix": (f.get("Automation Code") or "")[:120],
            }
        )
print(json.dumps(rows, indent=2))
