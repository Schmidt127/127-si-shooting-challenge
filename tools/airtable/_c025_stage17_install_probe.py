"""Stage 17 install prep: automations API probe + reward/config amount check."""
from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ENV_PATH = Path(__file__).resolve().parent / ".env"
OUT = Path(__file__).resolve().parent / "_preview" / "c025_stage17_install_probe.json"


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def api(method: str, url: str, token: str, body: dict | None = None) -> tuple[int, object]:
    data = None
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            parsed = {"raw": raw[:800]}
        return e.code, parsed


def main() -> None:
    env = load_env()
    base = env["AIRTABLE_BASE_ID"]
    token = env["AIRTABLE_API_TOKEN"]
    assert base == "appTetnuCZlCZdTCT", f"Wrong base: {base}"

    result: dict = {"base_id": base, "automations": {}, "config": {}, "reward": {}, "preflight_gate": {}}

    # Automations Meta API
    for label, path in [
        ("list", f"https://api.airtable.com/v0/meta/bases/{base}/automations"),
    ]:
        status, body = api("GET", path, token)
        result["automations"][label] = {
            "status": status,
            "body_keys": list(body.keys()) if isinstance(body, dict) else type(body).__name__,
            "snippet": body if status != 200 else {
                "count": len(body.get("automations", [])) if isinstance(body, dict) else None,
                "names": [
                    a.get("name")
                    for a in (body.get("automations") or [])[:50]
                ]
                if isinstance(body, dict)
                else None,
            },
        }

    # Schema: find XP Source option + Zoom XP Amount formula
    status, schema = api("GET", f"https://api.airtable.com/v0/meta/bases/{base}/tables", token)
    result["schema_status"] = status
    tables = {t["name"]: t for t in (schema.get("tables") or [])} if status == 200 else {}

    xp = tables.get("XP Events") or {}
    xp_fields = {f["name"]: f for f in xp.get("fields") or []}
    xp_source = xp_fields.get("XP Source") or {}
    choices = [
        c.get("name")
        for c in ((xp_source.get("options") or {}).get("choices") or [])
    ]
    result["preflight_gate"]["xp_source_option"] = "Zoom Meeting Recording Quiz" in choices
    result["preflight_gate"]["xp_source_option_exact"] = (
        "Zoom Meeting Recording Quiz"
        if "Zoom Meeting Recording Quiz" in choices
        else None
    )

    za = tables.get("Zoom Attendance") or {}
    za_fields = {f["name"]: f for f in za.get("fields") or []}
    result["preflight_gate"]["za_required_present_count"] = sum(
        1
        for name in [
            "Attendance Method",
            "Enrollment",
            "Zoom Meeting",
            "Enrollment RID",
            "Zoom Meeting RID",
            "Recording Quiz Review Status",
            "Recording Quiz Satisfactory?",
            "Recording Quiz Submitted At",
            "Recording Quiz Correction Count",
            "Recording Quiz Reviewed At",
            "Recording Quiz Needs Correction At",
            "Zoom Credit Key",
            "Zoom Credit Approved?",
            "Zoom Credit Conflict?",
            "Zoom XP Amount",
            "Zoom Credit Debug",
            "Zoom Gate Credit Earned?",
            "Gate Credit Applied?",
            "Perfect Week Credit Applied?",
            "Effective Recording Counts for Perfect Week?",
            "Recording Approval Email Send Key",
            "Recording Approval Email Sent At",
        ]
        if name in za_fields
    )
    amt = za_fields.get("Zoom XP Amount") or {}
    result["zoom_xp_amount_formula"] = (amt.get("options") or {}).get("formula")

    # Reward rules
    status, rules = api(
        "GET",
        f"https://api.airtable.com/v0/{base}/XP%20Reward%20Rules"
        f"?fields%5B%5D=Rule%20Key&fields%5B%5D=XP%20Amount&fields%5B%5D=Active%3F&fields%5B%5D=XP%20Source%20Label",
        token,
    )
    result["reward"]["status"] = status
    rows = [
        r
        for r in ((rules.get("records") if isinstance(rules, dict) else None) or [])
        if str((r.get("fields") or {}).get("Rule Key") or "").startswith("ZOOM")
    ]
    result["reward"]["zoom_rows"] = [
        {"id": r["id"], **(r.get("fields") or {})} for r in rows
    ]
    base_rules = [
        r
        for r in result["reward"]["zoom_rows"]
        if (r.get("Rule Key") == "ZOOM_ATTEND_BASE" and r.get("Active?"))
    ]
    result["preflight_gate"]["zoom_attend_base_active_count"] = len(base_rules)
    result["preflight_gate"]["zoom_attend_base_amount"] = (
        base_rules[0].get("XP Amount") if base_rules else None
    )

    # Config percent
    status, cfg = api(
        "GET",
        f"https://api.airtable.com/v0/{base}/Config"
        f"?fields%5B%5D=Zoom%20Recording%20XP%20Percent%20of%20Live"
        f"&fields%5B%5D=Name&fields%5B%5D=Config%20Key",
        token,
    )
    result["config"]["status"] = status
    if status == 200:
        result["config"]["records"] = [
            {"id": r["id"], **(r.get("fields") or {})} for r in cfg.get("records") or []
        ]
    else:
        # try listing field names from schema
        cfg_table = tables.get("Config") or {}
        result["config"]["fields"] = [f["name"] for f in cfg_table.get("fields") or []]
        pct_fields = [
            n
            for n in result["config"]["fields"]
            if "Recording" in n and ("Percent" in n or "%" in n or "XP" in n)
        ]
        result["config"]["recording_related_fields"] = pct_fields
        if pct_fields:
            q = "&".join(f"fields%5B%5D={urllib.parse.quote(n)}" for n in pct_fields[:5])
            status2, cfg2 = api("GET", f"https://api.airtable.com/v0/{base}/Config?{q}", token)
            result["config"]["retry_status"] = status2
            result["config"]["records"] = [
                {"id": r["id"], **(r.get("fields") or {})} for r in (cfg2.get("records") or [])
            ]

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2)[:12000])
    print(f"WROTE {OUT}")


if __name__ == "__main__":
    main()
