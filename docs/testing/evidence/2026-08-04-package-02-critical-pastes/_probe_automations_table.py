#!/usr/bin/env python3
from __future__ import annotations

import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
BASE = "appn84sqPw03zEbTT"


def load_tok() -> str:
    env: dict[str, str] = {}
    for rel in ("tools/airtable/.env", ".env.local", "web/.env.local"):
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
    req = urllib.request.Request(
        f"https://api.airtable.com/v0/meta/bases/{BASE}/tables", headers=h
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        tables = {t["name"]: t for t in json.load(r)["tables"]}
    at = tables["Automations"]
    fields = [{"name": f["name"], "type": f["type"]} for f in at["fields"]]
    url = f"https://api.airtable.com/v0/{BASE}/Automations?maxRecords=100"
    req = urllib.request.Request(url, headers=h)
    with urllib.request.urlopen(req, timeout=60) as r:
        records = json.load(r)["records"]
    hits = []
    for rec in records:
        blob = " ".join(str(v) for v in rec.get("fields", {}).values())
        if "067" in blob or "Reflection" in blob:
            hits.append({"id": rec["id"], "fields": rec.get("fields", {})})
    out = {
        "automations_fields": fields,
        "total_rows": len(records),
        "hits_067_or_reflection": hits,
    }
    Path(__file__).with_name("067-AUTOMATIONS-TABLE.json").write_text(
        json.dumps(out, indent=2, default=str), encoding="utf-8"
    )
    print(json.dumps({"total_rows": len(records), "hits": len(hits), "field_names": [f["name"] for f in fields]}, indent=2))
    for hit in hits:
        print(json.dumps(hit, indent=2, default=str)[:800])


if __name__ == "__main__":
    main()
