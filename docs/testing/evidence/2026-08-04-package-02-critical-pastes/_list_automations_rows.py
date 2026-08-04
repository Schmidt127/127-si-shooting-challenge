#!/usr/bin/env python3
from __future__ import annotations

import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
BASE = "appn84sqPw03zEbTT"


def load_tok() -> str:
    env: dict[str, str] = {}
    for rel in ("tools/airtable/.env", ".env.local"):
        p = ROOT / rel
        if not p.exists():
            continue
        for line in p.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env.get("AIRTABLE_API_TOKEN") or env.get("AIRTABLE_TOKEN") or ""


def main() -> None:
    tok = load_tok()
    h = {"Authorization": f"Bearer {tok}"}
    url = f"https://api.airtable.com/v0/{BASE}/Automations?maxRecords=100"
    req = urllib.request.Request(url, headers=h)
    with urllib.request.urlopen(req, timeout=60) as r:
        records = json.load(r)["records"]
    rows = []
    for rec in records:
        f = rec.get("fields", {})
        name = str(f.get("Name") or "")
        code = str(f.get("Automation Code") or "")
        status = f.get("Status")
        trigger_table = f.get("Trigger table")
        rows.append(
            {
                "id": rec["id"],
                "Name": name,
                "Automation Code": code,
                "Status": status,
                "Trigger table": trigger_table,
                "Trigger type": f.get("Trigger type"),
                "Conditions": f.get("Conditions"),
            }
        )
    # find 067-ish
    hits = [
        r
        for r in rows
        if "067" in r["Name"]
        or "067" in r["Automation Code"]
        or "reflection" in r["Name"].lower()
        or "quiz" in r["Name"].lower()
        or "Final Reflection" in str(r.get("Trigger table"))
    ]
    Path(__file__).with_name("067-AUTOMATIONS-ROWS.json").write_text(
        json.dumps({"all": rows, "hits": hits}, indent=2, default=str),
        encoding="utf-8",
    )
    print("total", len(rows), "hits", len(hits))
    for hrow in hits:
        print(json.dumps(hrow, indent=2, default=str))
    # also print codes 060-075
    for r in rows:
        code = r["Automation Code"]
        if str(code).startswith("06") or str(code).startswith("067") or "06" in str(code)[:3]:
            print("CODE", code, "|", r["Name"][:80], "|", r["Status"])


if __name__ == "__main__":
    main()
