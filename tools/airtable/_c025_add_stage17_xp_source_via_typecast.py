#!/usr/bin/env python3
"""Probe Meta PATCH vs Records typecast for adding XP Source option (DEV only)."""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
DEV = "appTetnuCZlCZdTCT"
OPTION = "Zoom Meeting Recording Quiz"


def load_env(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def api(method: str, url: str, token: str, body: dict | None = None):
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(raw)
        except Exception:
            payload = {"raw": raw[:1200]}
        return e.code, payload


def main() -> None:
    env = load_env(HERE / ".env")
    token = env.get("AIRTABLE_API_TOKEN") or env.get("AIRTABLE_TOKEN")
    base = env["AIRTABLE_BASE_ID"]
    assert base == DEV

    code, meta = api("GET", f"https://api.airtable.com/v0/meta/bases/{base}/tables", token)
    assert code == 200
    xp = next(t for t in meta["tables"] if t["name"] == "XP Events")
    field = next(f for f in xp["fields"] if f["name"] == "XP Source")
    url = f"https://api.airtable.com/v0/meta/bases/{base}/tables/{xp['id']}/fields/{field['id']}"

    desc_status, desc_body = api(
        "PATCH",
        url,
        token,
        {"description": (field.get("description") or "XP award source label")},
    )
    print("DESC_PATCH", desc_status, json.dumps(desc_body)[:300])

    # typecast create
    key = f"DEV_TEST_OPTION_PROBE|{int(time.time())}"
    create_url = f"https://api.airtable.com/v0/{base}/{urllib.parse.quote('XP Events')}"
    create_body = {
        "fields": {
            "Source Key": key,
            "XP Source": OPTION,
            "XP Reason Debug": "C-025 DEV option probe — delete me",
            "Active?": False,
        },
        "typecast": True,
    }
    c_status, c_body = api("POST", create_url, token, create_body)
    print("CREATE", c_status, json.dumps(c_body)[:500])

    rec_id = (c_body or {}).get("id") if c_status == 200 else None
    if rec_id:
        d_status, d_body = api("DELETE", f"{create_url}/{rec_id}", token)
        print("DELETE", d_status, json.dumps(d_body)[:200])

    # re-read choices
    code, meta2 = api("GET", f"https://api.airtable.com/v0/meta/bases/{base}/tables", token)
    xp2 = next(t for t in meta2["tables"] if t["name"] == "XP Events")
    field2 = next(f for f in xp2["fields"] if f["name"] == "XP Source")
    names = [c.get("name") for c in ((field2.get("options") or {}).get("choices") or [])]
    out = {
        "desc_patch_status": desc_status,
        "create_status": c_status,
        "deleted_probe": rec_id,
        "option": OPTION,
        "option_present": OPTION in names,
        "after_choices_tail": names[-5:],
        "choice_count": len(names),
    }
    path = HERE / "_preview" / "c025_stage17_xp_source_option.json"
    path.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(json.dumps(out, indent=2))
    print("WROTE", path)
    if OPTION not in names:
        raise SystemExit("option still missing")


if __name__ == "__main__":
    main()
