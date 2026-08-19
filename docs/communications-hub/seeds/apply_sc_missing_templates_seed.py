#!/usr/bin/env python3
"""Dry-run / optional write for Hub Templates catalog seed (metadata only).

Default: dry-run. Never enables auto-send fields. Does not touch Welcome/Daily/Weekly/TST.

Usage:
  python docs/communications-hub/seeds/apply_sc_missing_templates_seed.py
  python docs/communications-hub/seeds/apply_sc_missing_templates_seed.py --confirm-write

Requires AIRTABLE_PROD_TOKEN (or AIRTABLE_TOKEN) with access to Hub base appYG1t5DBRimHBCT.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv

SEED_PATH = Path(__file__).with_name("sc-missing-templates-seed.json")
REPO = Path(__file__).resolve().parents[3]


def token() -> str:
    load_dotenv(REPO / "tools" / "airtable" / ".env", override=False)
    load_dotenv(REPO / "web" / ".env.local", override=False)
    t = (
        os.getenv("AIRTABLE_PROD_TOKEN")
        or os.getenv("AIRTABLE_API_TOKEN")
        or os.getenv("AIRTABLE_TOKEN")
        or ""
    ).strip()
    if not t:
        raise SystemExit("Missing AIRTABLE_PROD_TOKEN / AIRTABLE_TOKEN")
    return t


def list_names(tok: str, base_id: str, table_id: str) -> set[str]:
    url = f"https://api.airtable.com/v0/{base_id}/{table_id}"
    headers = {"Authorization": f"Bearer {tok}"}
    names: set[str] = set()
    offset = None
    while True:
        params = {"pageSize": 100, "fields[]": ["Name"]}
        if offset:
            params["offset"] = offset
        r = requests.get(url, headers=headers, params=params, timeout=60)
        r.raise_for_status()
        data = r.json()
        for rec in data.get("records") or []:
            name = str((rec.get("fields") or {}).get("Name") or "").strip()
            if name:
                names.add(name)
        offset = data.get("offset")
        if not offset:
            break
    return names


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--confirm-write",
        action="store_true",
        help="Create missing Templates rows. Default is dry-run.",
    )
    args = parser.parse_args()
    seed = json.loads(SEED_PATH.read_text(encoding="utf-8"))
    base_id = seed["baseId"]
    table_id = seed["tableId"]
    tok = token()
    existing = list_names(tok, base_id, table_id)

    protected = set(seed.get("doNotModifyNames") or [])
    plan = []
    for row in seed["records"]:
        name = row["Name"]
        if name in existing:
            plan.append({"name": name, "action": "skip_exists"})
        elif name in protected:
            plan.append({"name": name, "action": "error_protected"})
        else:
            plan.append({"name": name, "action": "create", "fields": row})

    print(json.dumps({"dryRun": not args.confirm_write, "plan": plan}, indent=2))

    if any(p["action"] == "error_protected" for p in plan):
        raise SystemExit("Refusing to touch protected template names")

    creates = [p for p in plan if p["action"] == "create"]
    if not args.confirm_write:
        print("dry-run only; pass --confirm-write to create", file=sys.stderr)
        return

    if not creates:
        print("nothing to create")
        return

    url = f"https://api.airtable.com/v0/{base_id}/{table_id}"
    headers = {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}
    payload = {"records": [{"fields": c["fields"]} for c in creates], "typecast": True}
    r = requests.post(url, headers=headers, json=payload, timeout=60)
    if not r.ok:
        raise SystemExit(f"create failed: {r.status_code} {r.text[:800]}")
    created = [rec.get("id") for rec in (r.json().get("records") or [])]
    print(json.dumps({"createdIds": created}, indent=2))


if __name__ == "__main__":
    main()
