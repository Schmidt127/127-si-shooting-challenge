#!/usr/bin/env python3
"""Read-only: dump Stage 17 schema detail for PROD implementation manifest.

READ-ONLY Meta schema (+ optional filtered reward-rule/config probes).
Never creates/updates/deletes anything in Airtable.
"""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
ENV_PATH = HERE / ".env"
DEV = "appTetnuCZlCZdTCT"
PROD = "appn84sqPw03zEbTT"
OUT = HERE / "_preview" / "c025_stage17_prod_schema_manifest_source.json"

FOCUS = [
    "Zoom Attendance",
    "Zoom Meetings",
    "Config",
    "Enrollments",
    "Weekly Athlete Summary",
    "XP Events",
    "XP Reward Rules",
    "Weeks",
    "Homework Completions",
    "Level Gate Rules",
    "Levels",
    "Submissions",
    "Video Feedback",
    "Athletes",
]


def load_token() -> str:
    env: dict[str, str] = {}
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    tok = env.get("AIRTABLE_API_TOKEN") or env.get("AIRTABLE_TOKEN")
    if not tok:
        raise SystemExit("No AIRTABLE_API_TOKEN")
    return tok


def api_json(url: str, token: str):
    for attempt in range(5):
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return r.status, json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            raw = e.read().decode("utf-8", errors="replace")
            if e.code == 429 and attempt < 4:
                time.sleep(1.5 * (attempt + 1))
                continue
            try:
                return e.code, json.loads(raw)
            except Exception:
                return e.code, {"raw": raw[:500]}
    return 0, {"error": "failed"}


def summarize_field(f: dict) -> dict:
    opts = f.get("options") or {}
    out = {
        "id": f.get("id"),
        "name": f.get("name"),
        "type": f.get("type"),
        "description": f.get("description") or "",
    }
    t = f.get("type")
    if t == "singleSelect":
        choices = opts.get("choices") or []
        out["choices"] = [c.get("name") for c in choices if isinstance(c, dict)]
        out["choicesDetailed"] = [
            {"id": c.get("id"), "name": c.get("name"), "color": c.get("color")}
            for c in choices
            if isinstance(c, dict)
        ]
    elif t == "multipleRecordLinks":
        out["linkedTableId"] = opts.get("linkedTableId")
        out["prefersSingleRecordLink"] = opts.get("prefersSingleRecordLink")
        out["inverseLinkFieldId"] = opts.get("inverseLinkFieldId")
    elif t == "formula":
        out["formula"] = opts.get("formula")
        out["isValid"] = opts.get("isValid")
        result = opts.get("result") or {}
        out["resultType"] = result.get("type")
        out["referencedFieldIds"] = opts.get("referencedFieldIds")
    elif t in ("rollup", "count", "multipleLookupValues"):
        out["recordLinkFieldId"] = opts.get("recordLinkFieldId")
        out["fieldIdInLinkedTable"] = opts.get("fieldIdInLinkedTable")
        if t == "rollup":
            out["formula"] = opts.get("formula")
        result = opts.get("result") or {}
        out["resultType"] = result.get("type")
    elif t == "number":
        out["precision"] = opts.get("precision")
    elif t in ("date", "dateTime"):
        out["dateFormat"] = opts.get("dateFormat")
        out["timeFormat"] = opts.get("timeFormat")
        out["timeZone"] = opts.get("timeZone")
    elif t == "checkbox":
        out["color"] = opts.get("color")
        out["icon"] = opts.get("icon")
    elif t == "percent":
        out["precision"] = opts.get("precision")
    return out


def dump_base(token: str, base_id: str) -> dict:
    code, payload = api_json(
        f"https://api.airtable.com/v0/meta/bases/{base_id}/tables", token
    )
    if code != 200:
        return {"ok": False, "status": code, "error": payload}
    tables = {}
    name_to_id = {}
    for t in payload.get("tables") or []:
        name_to_id[t["name"]] = t["id"]
        if t["name"] not in FOCUS:
            continue
        fields = [summarize_field(f) for f in (t.get("fields") or [])]
        views = [
            {"id": v.get("id"), "name": v.get("name"), "type": v.get("type")}
            for v in (t.get("views") or [])
        ]
        tables[t["name"]] = {
            "id": t["id"],
            "primaryFieldId": t.get("primaryFieldId"),
            "fieldCount": len(fields),
            "fields": {f["name"]: f for f in fields},
            "views": views,
        }
    # Resolve linked table names
    id_to_name = {v: k for k, v in name_to_id.items()}
    for tname, tinfo in tables.items():
        for fname, finfo in tinfo["fields"].items():
            lid = finfo.get("linkedTableId")
            if lid:
                finfo["linkedTableName"] = id_to_name.get(lid, lid)
    return {
        "ok": True,
        "baseId": base_id,
        "allTableNames": sorted(name_to_id.keys()),
        "allTableCount": len(name_to_id),
        "tableIds": name_to_id,
        "tables": tables,
    }


def list_reward_rules(token: str, base_id: str, table_id: str | None) -> list:
    if not table_id:
        return []
    # Prefer filter by Rule Key if field exists — unfiltered limited page
    url = (
        f"https://api.airtable.com/v0/{base_id}/{urllib.parse.quote(table_id)}"
        f"?maxRecords=100&pageSize=100"
    )
    code, payload = api_json(url, token)
    if code != 200:
        return [{"error": code, "payload": str(payload)[:300]}]
    out = []
    for r in payload.get("records") or []:
        f = r.get("fields") or {}
        # Normalize common key names without assuming exact
        out.append({"id": r["id"], "fields": f})
    return out


def list_config(token: str, base_id: str, table_id: str | None) -> list:
    if not table_id:
        return []
    url = (
        f"https://api.airtable.com/v0/{base_id}/{urllib.parse.quote(table_id)}"
        f"?maxRecords=50&pageSize=50"
    )
    code, payload = api_json(url, token)
    if code != 200:
        return [{"error": code, "payload": str(payload)[:300]}]
    return [{"id": r["id"], "fields": r.get("fields") or {}} for r in payload.get("records") or []]


def main():
    token = load_token()
    # Never print token
    print("Dumping DEV schema (read-only)...")
    dev = dump_base(token, DEV)
    print("Dumping PROD schema (read-only)...")
    prod = dump_base(token, PROD)

    dev_tables = dev.get("tableIds") or {}
    prod_tables = prod.get("tableIds") or {}

    print("Probing XP Reward Rules / Config records (read-only)...")
    reward = {
        "dev": list_reward_rules(token, DEV, (dev.get("tables") or {}).get("XP Reward Rules", {}).get("id")),
        "prod": list_reward_rules(token, PROD, (prod.get("tables") or {}).get("XP Reward Rules", {}).get("id")),
    }
    config = {
        "dev": list_config(token, DEV, (dev.get("tables") or {}).get("Config", {}).get("id")),
        "prod": list_config(token, PROD, (prod.get("tables") or {}).get("Config", {}).get("id")),
    }

    payload = {
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "mode": "read_only_meta_plus_filtered_records",
        "dev": dev,
        "prod": prod,
        "hasZoomAttendance": {
            "dev": "Zoom Attendance" in (dev.get("tableIds") or {}),
            "prod": "Zoom Attendance" in (prod.get("tableIds") or {}),
        },
        "rewardRulesSample": reward,
        "configSample": config,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"WROTE {OUT}")
    print(
        "ZA_DEV=%s ZA_PROD=%s DEV_tables=%s PROD_tables=%s"
        % (
            payload["hasZoomAttendance"]["dev"],
            payload["hasZoomAttendance"]["prod"],
            (dev.get("allTableCount")),
            (prod.get("allTableCount")),
        )
    )


if __name__ == "__main__":
    main()
