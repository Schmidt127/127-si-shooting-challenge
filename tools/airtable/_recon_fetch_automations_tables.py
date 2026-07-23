"""Read-only fetch of DEV + PROD Automations inventory tables for reconciliation."""
from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

DEV = "appTetnuCZlCZdTCT"
PROD = "appn84sqPw03zEbTT"
OUT = Path(__file__).resolve().parents[2] / "docs" / "foundation-reset"


def load_tok() -> str:
    env: dict[str, str] = {}
    for line in Path(__file__).with_name(".env").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env.get("AIRTABLE_TOKEN") or env.get("AIRTABLE_API_TOKEN") or ""


def get_json(tok: str, url: str):
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {tok}"})
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.load(r)


def list_all(tok: str, base: str, table: str):
    out = []
    offset = None
    while True:
        q = {"pageSize": 100}
        if offset:
            q["offset"] = offset
        url = (
            f"https://api.airtable.com/v0/{base}/"
            + urllib.parse.quote(table)
            + "?"
            + urllib.parse.urlencode(q)
        )
        data = get_json(tok, url)
        out.extend(data.get("records", []))
        offset = data.get("offset")
        if not offset:
            break
    return out


def main():
    tok = load_tok()
    if not tok:
        raise SystemExit("Missing AIRTABLE token in tools/airtable/.env")
    OUT.mkdir(parents=True, exist_ok=True)
    summary = {}
    for label, base in [("DEV", DEV), ("PROD", PROD)]:
        try:
            meta = get_json(tok, f"https://api.airtable.com/v0/meta/bases/{base}/tables")
            tables = [t["name"] for t in meta["tables"]]
            has = "Automations" in tables
            print(f"{label}: tables={len(tables)} Automations={has}")
            if not has:
                summary[label] = {"error": "no Automations table", "tables": tables[:30]}
                continue
            recs = list_all(tok, base, "Automations")
            path = OUT / f"{label.lower()}-automations-table-raw.json"
            path.write_text(
                json.dumps({"base": base, "count": len(recs), "records": recs}, indent=2),
                encoding="utf-8",
            )
            print(f"{label}: wrote {path} count={len(recs)}")
            if recs:
                print("field keys:", sorted(recs[0].get("fields", {}).keys()))
            for r in recs:
                f = r.get("fields", {})
                name = (
                    f.get("Name")
                    or f.get("Automation Name")
                    or f.get("Automation")
                    or f.get("Title")
                    or ""
                )
                status = (
                    f.get("Status")
                    or f.get("Enabled?")
                    or f.get("ON/OFF")
                    or f.get("State")
                    or f.get("Live?")
                )
                print(f"  {name} | {status}")
            summary[label] = {"count": len(recs), "path": str(path)}
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")[:500]
            print(f"{label}: HTTP {e.code} {body}")
            summary[label] = {"error": f"HTTP {e.code}", "body": body}
    (OUT / "dev-prod-automations-fetch-summary.json").write_text(
        json.dumps(summary, indent=2), encoding="utf-8"
    )


if __name__ == "__main__":
    main()
