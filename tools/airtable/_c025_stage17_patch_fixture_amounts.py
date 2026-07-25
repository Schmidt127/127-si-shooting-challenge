"""Patch Stage 17 fixtures so Zoom XP Amount formula resolves to 30 (60 * 50%)."""
from __future__ import annotations

import json
import urllib.error
import urllib.request
from pathlib import Path

ENV = Path(__file__).resolve().parent / ".env"
FIX = Path(__file__).resolve().parent / "_preview" / "c025_stage17_orchestrator_fixtures.json"


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for line in ENV.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def api(method: str, url: str, token: str, body: dict | None = None) -> tuple[int, object]:
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
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
            parsed = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            parsed = {"raw": raw[:500]}
        return e.code, parsed


def main() -> None:
    env = load_env()
    base = env["AIRTABLE_BASE_ID"]
    token = env["AIRTABLE_API_TOKEN"]
    data = json.loads(FIX.read_text(encoding="utf-8"))
    ids = []
    for key in [
        "eligible_approved",
        "missing_approval",
        "needs_correction",
        "recording_with_live_conflict",
    ]:
        rid = (data.get("created") or {}).get(key, {}).get("id")
        if rid:
            ids.append((key, rid))

    patches = {}
    for key, rid in ids:
        st, body = api(
            "PATCH",
            f"https://api.airtable.com/v0/{base}/Zoom%20Attendance/{rid}",
            token,
            {"fields": {"Normal Live Zoom XP": 60}, "typecast": True},
        )
        # re-read amount
        st2, got = api("GET", f"https://api.airtable.com/v0/{base}/Zoom%20Attendance/{rid}", token)
        fields = got.get("fields") if st2 == 200 else {}
        patches[key] = {
            "patch_status": st,
            "id": rid,
            "amount": fields.get("Zoom XP Amount"),
            "pct": fields.get("Zoom XP Percentage") or fields.get("Effective Recording XP Percentage"),
            "approved": fields.get("Zoom Credit Approved?"),
            "conflict": fields.get("Zoom Credit Conflict?"),
            "key": fields.get("Zoom Credit Key"),
            "gate": fields.get("Zoom Gate Credit Earned?"),
            "pw": fields.get("Effective Recording Counts for Perfect Week?"),
        }
        print(key, patches[key])

    data["amount_patches"] = patches
    FIX.write_text(json.dumps(data, indent=2), encoding="utf-8")
    print("WROTE", FIX)


if __name__ == "__main__":
    main()
