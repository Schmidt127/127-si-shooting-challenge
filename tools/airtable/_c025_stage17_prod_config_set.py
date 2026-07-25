#!/usr/bin/env python3
"""Set Stage 17 Config values on primary PROD Config row (Active XP Rule Set)."""
from __future__ import annotations

import json
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROD = "appn84sqPw03zEbTT"
PRIMARY = "recq14M5hEv3TIGEj"  # only Config row with Active XP Rule Set / Submission XP
OUT = HERE / "_preview" / "c025_stage17_prod_config_set.json"

CONFIG_TARGET = {
    "Recording Path Enabled?": True,
    "Recording Makeup Enabled?": True,
    "Zoom Recording Makeup Window Days": 7,
    "Zoom Recording Deadline Mode": "Later of Both",
    "Zoom Recording XP Percent of Live": 50,
    "Recording Quiz Requires Coach Approval?": True,
    "Recording Gives Full Zoom Gate Credit?": True,
    "Recording Makeup Counts for Perfect Week?": True,
    "Recording Approval Email Enabled?": True,
    "Recording Approval Email Timing": "On Satisfactory",
    "Recording Approval Email Template Key": "ZOOM_RECORDING_APPROVED",
}


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
    st, tables_body = api("GET", f"https://api.airtable.com/v0/meta/bases/{PROD}/tables", token)
    tables = {t["name"]: t for t in tables_body["tables"]}
    cfg = tables["Config"]
    cfg_fields = {f["name"] for f in cfg["fields"]}
    missing = [k for k in CONFIG_TARGET if k not in cfg_fields]
    fields = {k: v for k, v in CONFIG_TARGET.items() if k in cfg_fields}
    st2, resp = api(
        "PATCH",
        f"https://api.airtable.com/v0/{PROD}/{cfg['id']}/{PRIMARY}",
        token,
        {"fields": fields, "typecast": True},
    )
    st3, after = api("GET", f"https://api.airtable.com/v0/{PROD}/{cfg['id']}/{PRIMARY}", token)
    got = (after.get("fields") or {}) if st3 == 200 else {}
    verify = {}
    for k, want in CONFIG_TARGET.items():
        have = got.get(k)
        if isinstance(want, bool):
            match = (bool(have) if have is not None else False) == want
        else:
            match = have == want
        verify[k] = {"want": want, "have": have, "match": match}

    # Check how many meetings have Global/Program Config linked
    zm = tables["Zoom Meetings"]
    st4, meet = api(
        "GET",
        f"https://api.airtable.com/v0/{PROD}/{zm['id']}?pageSize=100&fields%5B%5D=Global%20Config&fields%5B%5D=Program%20Config",
        token,
    )
    linked_g = linked_p = total = 0
    for r in (meet.get("records") or []):
        total += 1
        f = r.get("fields") or {}
        if f.get("Global Config"):
            linked_g += 1
        if f.get("Program Config"):
            linked_p += 1

    out = {
        "primary_config_id": PRIMARY,
        "selection_reason": "Only PROD Config row with Active XP Rule Set + Submission XP fields",
        "missing_schema_fields": missing,
        "patch_status": st2,
        "patch_error": resp if st2 != 200 else None,
        "verify": verify,
        "all_match": all(v["match"] for v in verify.values()),
        "meetings_sampled": total,
        "meetings_with_global_config": linked_g,
        "meetings_with_program_config": linked_p,
    }
    OUT.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
