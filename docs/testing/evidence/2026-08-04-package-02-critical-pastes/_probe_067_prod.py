#!/usr/bin/env python3
"""PROD probe for 067 Option B install/test. Does not print secrets."""
from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
BASE = "appn84sqPw03zEbTT"
SCHMIDT = "recgP9qZYjAhE7NXm"


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for rel in ("tools/airtable/.env", ".env.local", "web/.env.local"):
        p = ROOT / rel
        if not p.exists():
            continue
        for line in p.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def api(tok: str, method: str, url: str, body: dict | None = None) -> dict:
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
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.load(r)


def meta_tables(tok: str) -> dict[str, dict]:
    data = api(tok, "GET", f"https://api.airtable.com/v0/meta/bases/{BASE}/tables")
    return {t["name"]: t for t in data["tables"]}


def list_records(
    tok: str,
    table: str,
    formula: str | None = None,
    fields: list[str] | None = None,
    max_records: int = 50,
) -> list[dict]:
    q: list[str] = [f"maxRecords={max_records}"]
    if formula:
        q.append("filterByFormula=" + urllib.parse.quote(formula))
    if fields:
        for f in fields:
            q.append("fields[]=" + urllib.parse.quote(f))
    url = f"https://api.airtable.com/v0/{BASE}/{urllib.parse.quote(table)}?" + "&".join(q)
    out: list[dict] = []
    while url:
        data = api(tok, "GET", url)
        out.extend(data.get("records", []))
        offset = data.get("offset")
        if not offset:
            break
        url = (
            f"https://api.airtable.com/v0/{BASE}/{urllib.parse.quote(table)}?"
            + "&".join(q + [f"offset={urllib.parse.quote(offset)}"])
        )
    return out


def main() -> None:
    env = load_env()
    tok = env.get("AIRTABLE_API_TOKEN") or env.get("AIRTABLE_TOKEN") or ""
    print(json.dumps({"token_ok": bool(tok), "token_len": len(tok)}))
    if not tok:
        raise SystemExit(1)

    tables = meta_tables(tok)
    needed = [
        "Final Reflection Quiz Submissions",
        "Homework Completions",
        "FBC Curriculum - SYNC",
        "Enrollments",
        "XP Events",
        "Submission Assets",
        "Submissions",
    ]
    summary = {
        "tables": {n: tables[n]["id"] if n in tables else None for n in needed},
        "quiz_fields": [],
        "hc_fields": [],
        "hw17": [],
        "schmidt": None,
        "quiz_schmidt": [],
        "hc_schmidt": [],
    }

    qt = tables["Final Reflection Quiz Submissions"]
    summary["quiz_fields"] = [{"name": f["name"], "type": f["type"]} for f in qt["fields"]]
    ht = tables["Homework Completions"]
    summary["hc_fields"] = [{"name": f["name"], "type": f["type"]} for f in ht["fields"]]

    summary["hw17"] = list_records(
        tok,
        "FBC Curriculum - SYNC",
        formula="AND({Homework Number}='HW 17',{Active?})",
        fields=["Homework Number", "Active?", "Week"],
        max_records=10,
    )
    enr = list_records(
        tok,
        "Enrollments",
        formula=f"RECORD_ID()='{SCHMIDT}'",
        fields=["Athlete", "Active?", "Grade Band"],
        max_records=1,
    )
    summary["schmidt"] = enr[0] if enr else None

    summary["quiz_schmidt"] = list_records(
        tok,
        "Final Reflection Quiz Submissions",
        formula=f"FIND('{SCHMIDT}', ARRAYJOIN({{Enrollment}}&''))",
        fields=[
            "Enrollment",
            "Homework Completion",
            "Processing Status",
            "Submitted At",
        ],
        max_records=20,
    )
    summary["hc_schmidt"] = list_records(
        tok,
        "Homework Completions",
        formula=f"FIND('{SCHMIDT}', ARRAYJOIN({{Enrollment}}&''))",
        fields=[
            "Enrollment",
            "Homework",
            "Week",
            "Satisfactory?",
            "Review Complete",
            "XP Events",
            "Item Slot",
            "Asset Slot",
            "Source System",
            "Completion Status",
            "Review Status",
            "Submission Assets",
            "Final Reflection Quiz Submissions",
        ],
        max_records=30,
    )

    out = Path(__file__).with_name("067-PROD-PROBE.json")
    out.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps({
        "wrote": str(out.relative_to(ROOT)),
        "hw17_count": len(summary["hw17"]),
        "quiz_schmidt_count": len(summary["quiz_schmidt"]),
        "hc_schmidt_count": len(summary["hc_schmidt"]),
        "quiz_field_names": [f["name"] for f in summary["quiz_fields"]],
    }, indent=2))


if __name__ == "__main__":
    main()
