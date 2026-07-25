#!/usr/bin/env python3
"""Follow-up: verify rollup agg, retry XP Source option, inspect Config rows."""
from __future__ import annotations

import json
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROD = "appn84sqPw03zEbTT"
OUT = HERE / "_preview" / "c025_stage17_prod_batch_followup.json"


def load_token() -> str:
    env = {}
    for line in (HERE / ".env").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env.get("AIRTABLE_API_TOKEN") or env["AIRTABLE_TOKEN"]


def api(method, url, token, body=None):
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            return e.code, json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            return e.code, {"raw": raw[:2000]}


def main():
    token = load_token()
    status, body = api("GET", f"https://api.airtable.com/v0/meta/bases/{PROD}/tables", token)
    tables = {t["name"]: t for t in body["tables"]}
    out = {}

    zm = {f["name"]: f for f in tables["Zoom Meetings"]["fields"]}
    roll = zm.get("Approved Preconflict Pair Tags")
    out["approved_preconflict"] = {
        "id": roll and roll["id"],
        "type": roll and roll["type"],
        "options": roll and roll.get("options"),
    }

    # Config full records
    cfg = tables["Config"]
    st, recs = api("GET", f"https://api.airtable.com/v0/{PROD}/{cfg['id']}?pageSize=100", token)
    out["config_list_status"] = st
    out["config_records"] = []
    for r in recs.get("records") or []:
        f = r.get("fields") or {}
        out["config_records"].append(
            {
                "id": r["id"],
                "keys": sorted(f.keys()),
                "recording_fields": {k: f.get(k) for k in f if "Recording" in k or "Zoom Recording" in k},
                "nameish": {k: f.get(k) for k in f if k.lower() in ("name", "config name", "title") or "default" in k.lower() or "scope" in k.lower()},
            }
        )

    # XP Source — try patch preserving color/id
    xpe = tables["XP Events"]
    src = next(f for f in xpe["fields"] if f["name"] == "XP Source")
    choices = (src.get("options") or {}).get("choices") or []
    if not any(c.get("name") == "Zoom Meeting Recording Quiz" for c in choices):
        new_choices = []
        for c in choices:
            item = {"name": c["name"]}
            if c.get("color"):
                item["color"] = c["color"]
            new_choices.append(item)
        new_choices.append({"name": "Zoom Meeting Recording Quiz", "color": "cyanLight2"})
        st2, resp2 = api(
            "PATCH",
            f"https://api.airtable.com/v0/meta/bases/{PROD}/tables/{xpe['id']}/fields/{src['id']}",
            token,
            {"options": {"choices": new_choices}},
        )
        out["xp_source_retry"] = {"status": st2, "resp": resp2 if st2 != 200 else "ok", "choice_count": len(new_choices)}
        # typecast create probe on a throwaway? DO NOT create XP events.
    else:
        out["xp_source_retry"] = {"already": True}

    # Re-read source choices
    status, body = api("GET", f"https://api.airtable.com/v0/meta/bases/{PROD}/tables", token)
    tables = {t["name"]: t for t in body["tables"]}
    src = next(f for f in tables["XP Events"]["fields"] if f["name"] == "XP Source")
    names = [c.get("name") for c in ((src.get("options") or {}).get("choices") or [])]
    out["xp_source_has_recording"] = "Zoom Meeting Recording Quiz" in names

    OUT.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(json.dumps(out, indent=2)[:6000])
    print("WROTE", OUT)


if __name__ == "__main__":
    main()
