"""Foundation Reset Pack — PROD probe (no secrets printed)."""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

PROD = "appn84sqPw03zEbTT"
DEV = "appTetnuCZlCZdTCT"


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for line in Path(__file__).with_name(".env").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def api(tok: str, url: str, method: str = "GET", body: dict | None = None):
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {tok}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            return r.status, json.load(r)
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(raw)
        except Exception:
            payload = {"raw": raw[:500]}
        return e.code, payload


def list_records(tok: str, base: str, table: str, formula: str | None = None, fields=None, max_records=100):
    params = {"pageSize": "100"}
    if formula:
        params["filterByFormula"] = formula
    if fields:
        for i, f in enumerate(fields):
            params[f"fields[{i}]"] = f
    url = f"https://api.airtable.com/v0/{base}/{urllib.parse.quote(table)}?{urllib.parse.urlencode(params)}"
    status, data = api(tok, url)
    if status != 200:
        return status, data
    recs = data.get("records", [])
    return status, recs[:max_records]


def main():
    env = load_env()
    tok = env.get("AIRTABLE_TOKEN") or env.get("AIRTABLE_API_TOKEN")
    assert tok

    # Meta tables
    status, meta = api(tok, f"https://api.airtable.com/v0/meta/bases/{PROD}/tables")
    print("prod_meta", status)
    tables = {t["name"]: t for t in meta.get("tables", [])} if status == 200 else {}

    # Enrollment exclusion-ish fields
    enr = tables.get("Enrollments", {})
    interesting = []
    for f in enr.get("fields", []):
        name = f.get("name", "")
        low = name.lower()
        if any(
            x in low
            for x in [
                "active",
                "leaderboard",
                "public",
                "stand",
                "display",
                "exclude",
                "hide",
                "softr",
                "publish",
                "test",
                "visible",
                "processing",
                "email",
                "grade",
                "program",
                "year",
                "season",
                "athlete",
                "parent",
            ]
        ):
            interesting.append(
                {
                    "id": f.get("id"),
                    "name": name,
                    "type": f.get("type"),
                    "options": (
                        [o.get("name") for o in (f.get("options") or {}).get("choices", [])]
                        if f.get("type") == "singleSelect"
                        else None
                    ),
                }
            )
    print("enrollment_interesting_fields", json.dumps(interesting, indent=2)[:8000])

    # Search Schmidt-like athletes/enrollments in PROD
    for label, table, formula in [
        ("athletes_schmidt", "Athletes", "OR(FIND('Schmidt', {Name}&''), FIND('schmidt', LOWER({Name}&'')))"),
        ("enrollments_schmidt", "Enrollments", "OR(FIND('Schmidt', {Name}&''), FIND('Testing', {Name}&''))"),
        ("athletes_all", "Athletes", None),
        ("enrollments_count", "Enrollments", None),
        ("weeks_count", "Weeks", None),
        ("program_instances", "Program Instance - Synced", None),
        ("automations_table", "Automations", None),
        ("grade_bands", "Grade Bands", None),
    ]:
        st, recs = list_records(tok, PROD, table, formula=formula, max_records=20)
        if st != 200:
            print(label, "FAIL", st, str(recs)[:300])
            continue
        print(label, "count_sample", len(recs))
        for r in recs[:10]:
            fields = r.get("fields", {})
            # print only non-PII-ish keys + ids
            keys = sorted(fields.keys())
            summary = {k: fields[k] for k in keys if k.lower() in {
                "name", "active?", "grade", "grade band", "grade band - linked",
                "program instance", "program year", "season", "enrollment year",
                "athlete", "status", "script name", "version", "enabled?", "folder",
                "automation number", "trigger", "last updated", "week number",
                "week start date", "week end date", "week label", "start date", "end date",
            } or "active" in k.lower() or "leaderboard" in k.lower() or "public" in k.lower() or "exclude" in k.lower() or "version" in k.lower() or "script" in k.lower() or "enabled" in k.lower()}
            print(" ", r["id"], json.dumps(summary)[:400])

    # DEV Testing Scenarios field inventory for clone plan
    st, dmeta = api(tok, f"https://api.airtable.com/v0/meta/bases/{DEV}/tables")
    print("dev_meta", st)
    if st == 200:
        ts = next((t for t in dmeta.get("tables", []) if t["name"] == "Testing Scenarios"), None)
        if ts:
            print("dev_testing_scenarios_id", ts["id"])
            fields_out = []
            for f in ts.get("fields", []):
                fields_out.append(
                    {
                        "name": f.get("name"),
                        "type": f.get("type"),
                        "id": f.get("id"),
                        "options": f.get("options"),
                    }
                )
            Path("docs/foundation-reset").mkdir(parents=True, exist_ok=True)
            out = Path("docs/foundation-reset/dev-testing-scenarios-schema.json")
            out.write_text(json.dumps({"tableId": ts["id"], "fields": fields_out}, indent=2), encoding="utf-8")
            print("wrote", out)
            print("dev_ts_field_count", len(fields_out))
            for f in fields_out:
                print("  TS", f["type"], "|", f["name"])

    # Known old Schmidt IDs still present?
    for rid, table in [
        ("recgP9qZYjAhE7NXm", "Enrollments"),
        ("recgqVstObQRzgXJF", "Athletes"),
    ]:
        st, data = api(tok, f"https://api.airtable.com/v0/{PROD}/{urllib.parse.quote(table)}/{rid}")
        print("old_id", table, rid, st, "exists" if st == 200 else "missing")


if __name__ == "__main__":
    main()
