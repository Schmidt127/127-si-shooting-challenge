"""Probe Automations Meta API and confirm DEV base for Stage 17 paste."""
from __future__ import annotations

import json
import urllib.error
import urllib.request
from pathlib import Path

ENV = Path(__file__).resolve().parent / ".env"
OUT = Path(__file__).resolve().parent / "_preview" / "c025_stage17_automations_probe.json"


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for line in ENV.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def api(method: str, url: str, token: str) -> tuple[int, object]:
    req = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method=method,
    )
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            body = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            body = {"raw": raw[:500]}
        return e.code, body


def main() -> None:
    env = load_env()
    base = env["AIRTABLE_BASE_ID"]
    token = env["AIRTABLE_API_TOKEN"]
    assert base == "appTetnuCZlCZdTCT", base
    status, body = api("GET", f"https://api.airtable.com/v0/meta/bases/{base}/automations", token)
    result = {
        "base_id": base,
        "automations_list_status": status,
        "automations_body": body,
        "can_paste_via_api": status == 200,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2)[:2000])
    print(f"WROTE {OUT}")


if __name__ == "__main__":
    main()
