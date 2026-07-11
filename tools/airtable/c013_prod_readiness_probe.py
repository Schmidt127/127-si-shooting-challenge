#!/usr/bin/env python3
"""Read-only PROD probe for C-013 readiness (Automations + Config). No writes."""
from __future__ import annotations

import argparse
import json
import os
import urllib.parse
import urllib.request
from pathlib import Path

from dotenv import load_dotenv

PROD_BASE = "appn84sqPw03zEbTT"
HERE = Path(__file__).resolve().parent


def load_token() -> str:
    load_dotenv(HERE / ".env", override=True)
    token = os.getenv("AIRTABLE_API_TOKEN") or os.getenv("AIRTABLE_TOKEN") or ""
    if not token:
        raise SystemExit("Missing AIRTABLE token in tools/airtable/.env")
    return token


def get(token: str, table: str, params: dict | None = None) -> dict:
    q = urllib.parse.urlencode(params or {})
    url = f"https://api.airtable.com/v0/{PROD_BASE}/{urllib.parse.quote(table)}"
    if q:
        url = f"{url}?{q}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read())


def main() -> None:
    parser = argparse.ArgumentParser(description="Read-only PROD C-013 readiness probe")
    parser.add_argument("--out", type=Path, help="Optional JSON output path")
    args = parser.parse_args()

    token = load_token()
    auto = get(token, "Automations", {"maxRecords": 100})
    rows = []
    for rec in auto.get("records", []):
        f = rec.get("fields") or {}
        name = str(f.get("Automation Name") or f.get("Name") or "")
        num = f.get("Automation Number") or f.get("Number")
        text = f"{name} {num}".lower()
        if any(x in text for x in ("070b", "070a", "116", "upload", "make")):
            rows.append(
                {
                    "id": rec["id"],
                    "automationNumber": num,
                    "name": name or None,
                    "active": f.get("Active?"),
                    "scriptVersion": f.get("Script Version"),
                    "status": f.get("Status"),
                }
            )

    cfg = get(token, "Config")
    cfg_keys = []
    for rec in cfg.get("records", []):
        f = rec.get("fields") or {}
        key = f.get("Key") or f.get("Config Key") or ""
        if any(x in str(key).lower() for x in ("upload", "make", "lambda", "webhook", "asset")):
            cfg_keys.append(str(key))

    out = {
        "prodBase": PROD_BASE,
        "automationsMatchingUpload": rows,
        "configKeysMatchingUpload": sorted(set(cfg_keys)),
    }
    text = json.dumps(out, indent=2) + "\n"
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(text, encoding="utf-8")
    print(text)


if __name__ == "__main__":
    main()
