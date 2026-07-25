#!/usr/bin/env python3
"""Stage 17 PROD: verify automations OFF + ZM prerequisites; create Calculated Recording Quiz Deadline."""
from __future__ import annotations

import json
import re
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
ENV_PATH = HERE / ".env"
OUT = HERE / "_preview" / "c025_stage17_prod_deadline_create.json"
PROD = "appn84sqPw03zEbTT"
DEV = "appTetnuCZlCZdTCT"

# Exact field-name formula from C-025-stage17-formula-build-order.md §C11
FORMULA_FIELD_NAMES = """IF(
  OR(
    {Recording Available At} = BLANK(),
    {Attendance Method} != "Recording Quiz"
  ),
  BLANK(),
  SWITCH(
    IF({Effective Recording Deadline Mode} = BLANK(), "Later of Both", {Effective Recording Deadline Mode}),
    "Days After Recording Available",
      DATEADD({Recording Available At}, IF({Effective Recording Makeup Window Days} = BLANK(), 7, {Effective Recording Makeup Window Days}), 'days'),
    "End of Program Week",
      IF({Week End Date} = BLANK(), BLANK(), DATETIME_PARSE(ARRAYJOIN({Week End Date}), 'YYYY-MM-DD')),
    "Earlier of Both",
      IF(
        OR({Week End Date} = BLANK(), {Recording Available At} = BLANK()),
        IF({Week End Date} = BLANK(), DATEADD({Recording Available At}, IF({Effective Recording Makeup Window Days} = BLANK(), 7, {Effective Recording Makeup Window Days}), 'days'), DATETIME_PARSE(ARRAYJOIN({Week End Date}), 'YYYY-MM-DD')),
        IF(
          DATETIME_DIFF(DATEADD({Recording Available At}, IF({Effective Recording Makeup Window Days} = BLANK(), 7, {Effective Recording Makeup Window Days}), 'days'), DATETIME_PARSE(ARRAYJOIN({Week End Date}), 'YYYY-MM-DD'), 'seconds') <= 0,
          DATEADD({Recording Available At}, IF({Effective Recording Makeup Window Days} = BLANK(), 7, {Effective Recording Makeup Window Days}), 'days'),
          DATETIME_PARSE(ARRAYJOIN({Week End Date}), 'YYYY-MM-DD')
        )
      ),
      IF(
        OR({Week End Date} = BLANK(), {Recording Available At} = BLANK()),
        IF({Week End Date} = BLANK(), DATEADD({Recording Available At}, IF({Effective Recording Makeup Window Days} = BLANK(), 7, {Effective Recording Makeup Window Days}), 'days'), DATETIME_PARSE(ARRAYJOIN({Week End Date}), 'YYYY-MM-DD')),
        IF(
          DATETIME_DIFF(DATEADD({Recording Available At}, IF({Effective Recording Makeup Window Days} = BLANK(), 7, {Effective Recording Makeup Window Days}), 'days'), DATETIME_PARSE(ARRAYJOIN({Week End Date}), 'YYYY-MM-DD'), 'seconds') >= 0,
          DATEADD({Recording Available At}, IF({Effective Recording Makeup Window Days} = BLANK(), 7, {Effective Recording Makeup Window Days}), 'days'),
          DATETIME_PARSE(ARRAYJOIN({Week End Date}), 'YYYY-MM-DD')
        )
      )
  )
)"""

PREREQS = [
    "RecordId",
    "Week End Date",
    "Attendance Method",
    "Approved Preconflict Pair Tags",
]
FORMULA_DEPS = [
    "Recording Available At",
    "Attendance Method",
    "Effective Recording Deadline Mode",
    "Effective Recording Makeup Window Days",
    "Week End Date",
]
TARGET = "Calculated Recording Quiz Deadline"
WATCH = ["101", "117", "057", "042", "115"]


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def token_from_env(env: dict[str, str]) -> str:
    tok = (
        env.get("AIRTABLE_API_TOKEN")
        or env.get("AIRTABLE_TOKEN")
        or env.get("AIRTABLE_PAT")
    )
    if not tok:
        raise SystemExit("No AIRTABLE_API_TOKEN / AIRTABLE_TOKEN in tools/airtable/.env")
    return tok


def api(method: str, url: str, token: str, body: dict | None = None) -> tuple[int, object]:
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            parsed = {"raw": raw[:2000]}
        return e.code, parsed


def match_automation(name: str) -> list[str]:
    hits = []
    n = name.lower()
    for code in WATCH:
        if re.search(rf"(^|[^0-9]){code}([^0-9]|$)", n) or n.strip().startswith(code):
            hits.append(code)
        # also common patterns like "117 -" or "Automation 117"
        if f" {code} " in f" {n} " or n.startswith(f"{code} ") or n.startswith(f"{code}-"):
            if code not in hits:
                hits.append(code)
    return hits


def main() -> None:
    env = load_env()
    token = token_from_env(env)
    # Prefer explicit PROD override keys if present; otherwise require caller intent via PROD constant.
    base = (
        env.get("AIRTABLE_PROD_BASE_ID")
        or env.get("AIRTABLE_BASE_ID_PROD")
        or PROD
    )
    result: dict = {
        "base_id": base,
        "prod_expected": PROD,
        "dev_forbidden_for_write": DEV,
        "steps": {},
    }
    if base != PROD:
        raise SystemExit(f"Refusing non-PROD base: {base}")

    # --- 1) Automations OFF probe ---
    status, body = api("GET", f"https://api.airtable.com/v0/meta/bases/{base}/automations", token)
    auto_report: dict = {
        "list_status": status,
        "can_list_via_api": status == 200,
        "watched": {},
        "note": None,
    }
    if status == 200 and isinstance(body, dict):
        autos = body.get("automations") or []
        auto_report["total_count"] = len(autos)
        for a in autos:
            name = a.get("name") or ""
            for code in match_automation(name):
                auto_report["watched"].setdefault(code, []).append(
                    {
                        "id": a.get("id"),
                        "name": name,
                        "isEnabled": a.get("isEnabled"),
                        "status": a.get("status"),
                    }
                )
        # Also scan raw for 115 presence
        for a in autos:
            name = (a.get("name") or "").lower()
            if "115" in name and "etf" in name or re.search(r"(^|[^0-9])115([^0-9]|$)", name):
                auto_report.setdefault("115_candidates", []).append(
                    {"name": a.get("name"), "isEnabled": a.get("isEnabled")}
                )
        for code in ["101", "117", "057", "042"]:
            entries = auto_report["watched"].get(code) or []
            if not entries:
                auto_report["watched"][code] = {"found": False, "assumed": "unknown_not_listed"}
            else:
                enabled = [e for e in entries if e.get("isEnabled") is True]
                auto_report["watched"][code] = {
                    "found": True,
                    "count": len(entries),
                    "any_enabled": bool(enabled),
                    "entries": entries,
                    "all_off": not bool(enabled),
                }
        # 115 must not be installed / not enabled
        c115 = auto_report.get("115_candidates") or auto_report["watched"].get("115") or []
        if isinstance(c115, list) and c115:
            auto_report["115"] = {"found": True, "entries": c115, "action": "DO NOT INSTALL / leave alone"}
        else:
            auto_report["115"] = {"found": False, "action": "DO NOT INSTALL"}
    else:
        auto_report["body_preview"] = body
        auto_report["note"] = (
            "Automations Meta API not readable (historically 403). "
            "Cannot confirm OFF via API — Mike UI confirmation required before enablement. "
            "Proceeding with schema verify/create only; will not enable or install automations."
        )
    result["steps"]["automations"] = auto_report

    # Hard stop if any watched automation is enabled via API
    for code in ["101", "117", "057", "042"]:
        w = auto_report.get("watched", {}).get(code)
        if isinstance(w, dict) and w.get("any_enabled"):
            result["steps"]["create"] = {"skipped": True, "reason": f"Automation {code} is ENABLED"}
            OUT.parent.mkdir(parents=True, exist_ok=True)
            OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
            print(json.dumps(result, indent=2)[:4000])
            raise SystemExit(f"STOP: automation {code} is enabled")

    # --- 2) Schema: prerequisites ---
    status, tables_body = api("GET", f"https://api.airtable.com/v0/meta/bases/{base}/tables", token)
    if status != 200:
        result["steps"]["schema"] = {"status": status, "body": tables_body}
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
        raise SystemExit(f"Cannot read PROD tables: {status}")

    tables = {t["name"]: t for t in (tables_body.get("tables") or [])}
    zm = tables.get("Zoom Meetings")
    za = tables.get("Zoom Attendance")
    if not zm:
        raise SystemExit("Zoom Meetings table missing in PROD")

    fields_by_name = {f["name"]: f for f in zm.get("fields") or []}
    prereq_report = {}
    missing_prereqs = []
    for name in PREREQS:
        f = fields_by_name.get(name)
        if f:
            prereq_report[name] = {
                "exists": True,
                "id": f["id"],
                "type": f["type"],
            }
        else:
            prereq_report[name] = {"exists": False}
            missing_prereqs.append(name)

    dep_report = {}
    missing_deps = []
    for name in FORMULA_DEPS:
        f = fields_by_name.get(name)
        if f:
            dep_report[name] = {"exists": True, "id": f["id"], "type": f["type"]}
        else:
            dep_report[name] = {"exists": False}
            missing_deps.append(name)

    existing_target = fields_by_name.get(TARGET)
    result["steps"]["prerequisites"] = {
        "prereqs": prereq_report,
        "missing_prereqs": missing_prereqs,
        "formula_deps": dep_report,
        "missing_formula_deps": missing_deps,
        "target_existing": (
            {
                "exists": True,
                "id": existing_target["id"],
                "type": existing_target["type"],
                "formula": (existing_target.get("options") or {}).get("formula"),
                "isValid": (existing_target.get("options") or {}).get("isValid"),
            }
            if existing_target
            else {"exists": False}
        ),
        "zoom_attendance_table_exists": bool(za),
        "za_deadline_lookup_exists": bool(
            za and any(f.get("name") == TARGET for f in za.get("fields") or [])
        ),
    }

    if missing_prereqs:
        result["steps"]["create"] = {
            "skipped": True,
            "reason": "Missing prerequisite fields",
            "missing": missing_prereqs,
        }
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
        print(json.dumps(result, indent=2))
        raise SystemExit(f"STOP: missing prerequisites: {missing_prereqs}")

    if missing_deps:
        result["steps"]["create"] = {
            "skipped": True,
            "reason": "Formula dependency fields missing — creating now would yield invalid formula",
            "missing": missing_deps,
        }
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
        print(json.dumps(result, indent=2))
        raise SystemExit(f"STOP: missing formula deps: {missing_deps}")

    if existing_target:
        # If already exists as formula, do not recreate; report only.
        result["steps"]["create"] = {
            "skipped": True,
            "reason": "Field already exists — not overwriting",
            "existing": result["steps"]["prerequisites"]["target_existing"],
        }
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
        print(json.dumps(result, indent=2))
        print("Field already exists; no create performed. ZA lookup not created.")
        return

    # --- 3) Create formula field (PROD write) ---
    table_id = zm["id"]
    create_body = {
        "name": TARGET,
        "type": "formula",
        "description": (
            "C-025 — Calculated Recording Quiz Deadline (true date). "
            "Design modes/defaults; Week End Date via DATETIME_PARSE(ARRAYJOIN); "
            "Later/Earlier via DATETIME_DIFF."
        ),
        "options": {
            "formula": FORMULA_FIELD_NAMES,
            "result": {"type": "date", "options": {"dateFormat": {"name": "iso", "format": "YYYY-MM-DD"}}},
        },
    }
    cstatus, cbody = api(
        "POST",
        f"https://api.airtable.com/v0/meta/bases/{base}/tables/{table_id}/fields",
        token,
        create_body,
    )
    result["steps"]["create"] = {
        "status": cstatus,
        "request_name": TARGET,
        "response": cbody if cstatus != 200 else {
            "id": cbody.get("id"),
            "name": cbody.get("name"),
            "type": cbody.get("type"),
            "options": cbody.get("options"),
        },
    }

    # Re-read to confirm; ensure ZA lookup still absent
    status2, tables_body2 = api("GET", f"https://api.airtable.com/v0/meta/bases/{base}/tables", token)
    if status2 == 200:
        tables2 = {t["name"]: t for t in (tables_body2.get("tables") or [])}
        zm2 = tables2.get("Zoom Meetings") or {}
        za2 = tables2.get("Zoom Attendance") or {}
        f2 = next((f for f in zm2.get("fields") or [] if f.get("name") == TARGET), None)
        result["steps"]["verify_after"] = {
            "zm_field": (
                {
                    "id": f2.get("id"),
                    "type": f2.get("type"),
                    "isValid": (f2.get("options") or {}).get("isValid"),
                    "result": (f2.get("options") or {}).get("result"),
                    "formula_preview": ((f2.get("options") or {}).get("formula") or "")[:300],
                }
                if f2
                else None
            ),
            "za_lookup_created": any(
                f.get("name") == TARGET for f in za2.get("fields") or []
            ),
        }

    result["steps"]["115"] = "NOT installed / not touched"
    result["steps"]["za_lookup"] = "NOT created (deferred until ZM source formula exists and is valid)"

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2))
    print(f"WROTE {OUT}")


if __name__ == "__main__":
    main()
