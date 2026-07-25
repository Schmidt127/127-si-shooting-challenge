#!/usr/bin/env python3
"""PROD: create Zoom Attendance.Calculated Recording Quiz Deadline lookup only."""
from __future__ import annotations

import json
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "_preview" / "c025_stage17_prod_za_deadline_lookup.json"
PROD = "appn84sqPw03zEbTT"
FIELD_NAME = "Calculated Recording Quiz Deadline"


def load_token() -> str:
    env: dict[str, str] = {}
    for line in (HERE / ".env").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    tok = env.get("AIRTABLE_API_TOKEN") or env.get("AIRTABLE_TOKEN")
    if not tok:
        raise SystemExit("Missing AIRTABLE_API_TOKEN")
    return tok


def api(method: str, url: str, token: str, body: dict | None = None) -> tuple[int, object]:
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            parsed = {"raw": raw[:2000]}
        return e.code, parsed


def get_tables(token: str) -> dict[str, dict]:
    status, body = api("GET", f"https://api.airtable.com/v0/meta/bases/{PROD}/tables", token)
    if status != 200:
        raise SystemExit(f"Cannot read tables: {status} {body}")
    return {t["name"]: t for t in body["tables"]}


def main() -> None:
    token = load_token()
    report: dict = {
        "base_id": PROD,
        "automations": "not enabled (no enable API calls)",
        "115": "not installed / not touched",
        "other_fields_created": False,
    }

    tables = get_tables(token)
    za = tables.get("Zoom Attendance")
    zm = tables.get("Zoom Meetings")
    if not za or not zm:
        raise SystemExit("Missing Zoom Attendance or Zoom Meetings")

    za_fields = {f["name"]: f for f in za["fields"]}
    zm_fields = {f["name"]: f for f in zm["fields"]}

    if "Zoom Meeting" not in za_fields:
        raise SystemExit("Zoom Attendance.Zoom Meeting link missing")
    if FIELD_NAME not in zm_fields:
        raise SystemExit("Zoom Meetings.Calculated Recording Quiz Deadline missing — create source first")
    if zm_fields[FIELD_NAME]["type"] != "formula":
        raise SystemExit(f"ZM source wrong type: {zm_fields[FIELD_NAME]['type']}")

    zm_src = zm_fields[FIELD_NAME]
    report["zm_source"] = {
        "id": zm_src["id"],
        "type": zm_src["type"],
        "isValid": (zm_src.get("options") or {}).get("isValid"),
        "result": (zm_src.get("options") or {}).get("result"),
    }

    if FIELD_NAME in za_fields:
        existing = za_fields[FIELD_NAME]
        report["action"] = "already_exists"
        report["field"] = {
            "id": existing["id"],
            "name": existing["name"],
            "type": existing["type"],
            "isValid": (existing.get("options") or {}).get("isValid"),
            "result": (existing.get("options") or {}).get("result"),
            "recordLinkFieldId": (existing.get("options") or {}).get("recordLinkFieldId"),
            "fieldIdInLinkedTable": (existing.get("options") or {}).get("fieldIdInLinkedTable"),
        }
    else:
        link_id = za_fields["Zoom Meeting"]["id"]
        src_id = zm_src["id"]
        body = {
            "name": FIELD_NAME,
            "type": "multipleLookupValues",
            "description": (
                "C-025 Stage 17 — Lookup through Zoom Meeting to "
                "Zoom Meetings.Calculated Recording Quiz Deadline"
            ),
            "options": {
                "recordLinkFieldId": link_id,
                "fieldIdInLinkedTable": src_id,
            },
        }
        status, resp = api(
            "POST",
            f"https://api.airtable.com/v0/meta/bases/{PROD}/tables/{za['id']}/fields",
            token,
            body,
        )
        report["create_status"] = status
        if status != 200:
            report["create_error"] = resp
            report["manual_steps"] = [
                "Open Zoom Attendance in PROD",
                "Add field: Calculated Recording Quiz Deadline",
                "Type: Lookup",
                "Linked-record field: Zoom Meeting",
                "Source field: Calculated Recording Quiz Deadline",
                "Save",
            ]
            OUT.parent.mkdir(parents=True, exist_ok=True)
            OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
            print(json.dumps(report, indent=2))
            raise SystemExit("STOP: lookup create failed")

        report["action"] = "created"
        report["create_response"] = {
            "id": resp.get("id"),
            "type": resp.get("type"),
            "isValid": (resp.get("options") or {}).get("isValid"),
            "result": (resp.get("options") or {}).get("result"),
        }

        # Re-read validate
        tables = get_tables(token)
        za_fields = {f["name"]: f for f in tables["Zoom Attendance"]["fields"]}
        created = za_fields[FIELD_NAME]
        report["field"] = {
            "id": created["id"],
            "name": created["name"],
            "type": created["type"],
            "isValid": (created.get("options") or {}).get("isValid"),
            "result": (created.get("options") or {}).get("result"),
            "recordLinkFieldId": (created.get("options") or {}).get("recordLinkFieldId"),
            "fieldIdInLinkedTable": (created.get("options") or {}).get("fieldIdInLinkedTable"),
            "expected_link_id": za_fields["Zoom Meeting"]["id"]
            if "Zoom Meeting" in {f["name"]: f for f in tables["Zoom Attendance"]["fields"]}
            else link_id,
            "expected_source_id": src_id,
        }

    # Wiring checks
    f = report["field"]
    tables = get_tables(token)
    za_fields = {f2["name"]: f2 for f2 in tables["Zoom Attendance"]["fields"]}
    link_id = za_fields["Zoom Meeting"]["id"]
    src_id = {f2["name"]: f2 for f2 in tables["Zoom Meetings"]["fields"]}[FIELD_NAME]["id"]
    report["validation"] = {
        "type_is_lookup": f["type"] == "multipleLookupValues",
        "isValid": f.get("isValid") is True,
        "result_type": ((f.get("result") or {}).get("type")),
        "result_is_date_or_datetime": ((f.get("result") or {}).get("type")) in ("date", "dateTime"),
        "link_ok": f.get("recordLinkFieldId") == link_id,
        "source_ok": f.get("fieldIdInLinkedTable") == src_id,
    }
    report["passed"] = all(
        [
            report["validation"]["type_is_lookup"],
            report["validation"]["isValid"],
            report["validation"]["result_is_date_or_datetime"],
            report["validation"]["link_ok"],
            report["validation"]["source_ok"],
        ]
    )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(f"WROTE {OUT}")


if __name__ == "__main__":
    main()
