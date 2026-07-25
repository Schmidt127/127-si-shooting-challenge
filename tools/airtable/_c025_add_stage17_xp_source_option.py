#!/usr/bin/env python3
"""DEV-only: add XP Source option 'Zoom Meeting Recording Quiz' if missing."""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
DEV = "appTetnuCZlCZdTCT"
PROD = "appn84sqPw03zEbTT"
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
            payload = {"raw": raw[:800]}
        return e.code, payload


def main() -> None:
    env = load_env(HERE / ".env")
    token = env.get("AIRTABLE_API_TOKEN") or env.get("AIRTABLE_TOKEN")
    base = env.get("AIRTABLE_BASE_ID")
    assert base == DEV and base != PROD, f"Refuse non-DEV base: {base}"

    code, meta = api("GET", f"https://api.airtable.com/v0/meta/bases/{base}/tables", token)
    assert code == 200, meta
    tables = {t["name"]: t for t in meta["tables"]}
    xp = tables["XP Events"]
    field = next(f for f in xp["fields"] if f["name"] == "XP Source")
    choices = (field.get("options") or {}).get("choices") or []
    names = [c.get("name") for c in choices]
    report = {
        "base_id": base,
        "table": "XP Events",
        "table_id": xp["id"],
        "field": "XP Source",
        "field_id": field["id"],
        "before_choices": names,
        "option": OPTION,
    }
    if OPTION in names:
        report["action"] = "already_present"
        report["after_choices"] = names
        print(json.dumps(report, indent=2))
        return

    # Preserve existing choices; append new option only.
    new_choices = [{"name": c["name"]} for c in choices if c.get("name")]
    new_choices.append({"name": OPTION})
    patch_body = {
        "options": {
            "choices": new_choices,
        }
    }
    # Meta API: PATCH field — keep type singleSelect
    url = f"https://api.airtable.com/v0/meta/bases/{base}/tables/{xp['id']}/fields/{field['id']}"
    code, body = api("PATCH", url, token, patch_body)
    report["patch_status"] = code
    report["patch_body"] = body if code != 200 else {"name": body.get("name"), "type": body.get("type")}
    if code != 200:
        print(json.dumps(report, indent=2))
        raise SystemExit(f"PATCH failed: {code}")

    after = [c.get("name") for c in ((body.get("options") or {}).get("choices") or [])]
    report["action"] = "added"
    report["after_choices"] = after
    report["option_present"] = OPTION in after
    # Ensure we did not remove existing options
    missing_old = [n for n in names if n not in after]
    report["missing_old_options"] = missing_old
    if missing_old:
        raise SystemExit(f"STOP: patch removed options: {missing_old}")
    forbidden = ["Zoom Recording", "Zoom"]  # legacy S16 labels as XP Source/Bucket confusion
    # "Zoom" alone as source shouldn't appear; bucket is separate
    report["legacy_zoom_recording_present"] = "Zoom Recording" in after
    out = HERE / "_preview" / "c025_stage17_xp_source_option.json"
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    print("WROTE", out)


if __name__ == "__main__":
    main()
