#!/usr/bin/env python3
"""DEV-only: add XP Source option preserving existing choice ids."""

from __future__ import annotations

import json
import urllib.error
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
    opts = field.get("options") or {}
    choices = opts.get("choices") or []
    names = [c.get("name") for c in choices]
    print("BEFORE", json.dumps(names, indent=2))
    print("FIELD_OPTIONS_KEYS", list(opts.keys()))
    print("SAMPLE_CHOICE", json.dumps(choices[0] if choices else {}, indent=2))

    if OPTION in names:
        print(json.dumps({"action": "already_present", "option": OPTION}, indent=2))
        return

    # Preserve id+name+color for existing; append new with color only
    rebuilt = []
    for c in choices:
        item = {"id": c["id"], "name": c["name"]}
        if c.get("color"):
            item["color"] = c["color"]
        rebuilt.append(item)
    rebuilt.append({"name": OPTION, "color": "cyanBright"})

    attempts = [
        {"options": {"choices": rebuilt}},
        {
            "type": "singleSelect",
            "options": {
                "choices": rebuilt,
            },
        },
        {
            "options": {
                "choices": [{"name": c["name"], "color": c.get("color") or "grayBright"} for c in choices]
                + [{"name": OPTION, "color": "cyanBright"}]
            }
        },
    ]

    url = f"https://api.airtable.com/v0/meta/bases/{base}/tables/{xp['id']}/fields/{field['id']}"
    results = []
    for i, body in enumerate(attempts):
        code, resp = api("PATCH", url, token, body)
        results.append({"attempt": i, "status": code, "resp": resp if code != 200 else {
            "name": resp.get("name"),
            "choices": [c.get("name") for c in ((resp.get("options") or {}).get("choices") or [])],
        }})
        print("ATTEMPT", i, "STATUS", code)
        if code == 200:
            after = [c.get("name") for c in ((resp.get("options") or {}).get("choices") or [])]
            missing = [n for n in names if n not in after]
            out = {
                "action": "added",
                "attempt": i,
                "option": OPTION,
                "option_present": OPTION in after,
                "missing_old_options": missing,
                "after_choices": after,
            }
            path = HERE / "_preview" / "c025_stage17_xp_source_option.json"
            path.write_text(json.dumps(out, indent=2), encoding="utf-8")
            print(json.dumps(out, indent=2))
            if missing:
                raise SystemExit("removed options")
            return

    path = HERE / "_preview" / "c025_stage17_xp_source_option_fail.json"
    path.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(json.dumps(results, indent=2))
    raise SystemExit("all attempts failed")


if __name__ == "__main__":
    main()
