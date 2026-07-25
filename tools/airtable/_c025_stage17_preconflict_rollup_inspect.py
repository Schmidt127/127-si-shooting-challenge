#!/usr/bin/env python3
"""Read-only: inspect Zoom Meetings.Approved Preconflict Pair Tags rollup config."""
from __future__ import annotations

import json
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROD = "appn84sqPw03zEbTT"
MEETING = "reczeUT0AJUWMmEOb"
OUT = HERE / "_preview" / "c025_stage17_preconflict_rollup_inspect.json"


def load_token() -> str:
    env: dict[str, str] = {}
    for line in (HERE / ".env").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env.get("AIRTABLE_API_TOKEN") or env["AIRTABLE_TOKEN"]


def get(url: str, token: str):
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req, timeout=90) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main() -> None:
    token = load_token()
    meta = get(f"https://api.airtable.com/v0/meta/bases/{PROD}/tables", token)
    tables = {t["name"]: t for t in meta["tables"]}
    zm_fields = {f["name"]: f for f in tables["Zoom Meetings"]["fields"]}
    za_fields = {f["name"]: f for f in tables["Zoom Attendance"]["fields"]}
    zm_by_id = {f["id"]: f for f in tables["Zoom Meetings"]["fields"]}
    za_by_id = {f["id"]: f for f in tables["Zoom Attendance"]["fields"]}

    rollup = zm_fields["Approved Preconflict Pair Tags"]
    opts = dict(rollup.get("options") or {})

    link_name = (zm_by_id.get(opts.get("recordLinkFieldId")) or {}).get("name")
    linked_field = (za_by_id.get(opts.get("fieldIdInLinkedTable")) or {}).get("name")
    linked_field_meta = za_by_id.get(opts.get("fieldIdInLinkedTable")) or {}

    meeting = get(
        f"https://api.airtable.com/v0/{PROD}/{urllib.parse.quote('Zoom Meetings')}/{MEETING}",
        token,
    )
    mf = meeting.get("fields") or {}

    # Prefer inverse link if present on meeting
    za_link_ids = list(mf.get("Zoom Attendance") or [])
    za_rows = []
    if za_link_ids:
        for zid in za_link_ids:
            r = get(
                f"https://api.airtable.com/v0/{PROD}/{urllib.parse.quote('Zoom Attendance')}/{zid}",
                token,
            )
            f = r.get("fields") or {}
            za_rows.append(
                {
                    "id": zid,
                    "Attendance Method": f.get("Attendance Method"),
                    "Preconflict Pair Tag": f.get("Preconflict Pair Tag"),
                    "Enrollment RID": f.get("Enrollment RID"),
                }
            )
    else:
        formula = urllib.parse.quote(f"{{Zoom Meeting RID}}='{MEETING}'")
        body = get(
            f"https://api.airtable.com/v0/{PROD}/{urllib.parse.quote('Zoom Attendance')}"
            f"?filterByFormula={formula}"
            f"&fields[]={urllib.parse.quote('Attendance Method')}"
            f"&fields[]={urllib.parse.quote('Preconflict Pair Tag')}"
            f"&fields[]={urllib.parse.quote('Enrollment RID')}",
            token,
        )
        for r in body.get("records") or []:
            f = r.get("fields") or {}
            za_rows.append(
                {
                    "id": r["id"],
                    "Attendance Method": f.get("Attendance Method"),
                    "Preconflict Pair Tag": f.get("Preconflict Pair Tag"),
                    "Enrollment RID": f.get("Enrollment RID"),
                }
            )

    # Airtable rollup aggregationFunction values typically:
    # values, concatenateValues, arrayJoin, etc. Dump raw.
    agg = opts.get("aggregationFunction")
    # Some APIs put formula under options differently
    report = {
        "mode": "read_only",
        "field": {
            "name": rollup["name"],
            "id": rollup["id"],
            "type": rollup["type"],
            "description": rollup.get("description"),
            "options_raw": opts,
            "recordLinkFieldName": link_name,
            "fieldInLinkedTableName": linked_field,
            "fieldInLinkedTableType": linked_field_meta.get("type"),
            "aggregationFunction": agg,
        },
        "meeting": {
            "id": MEETING,
            "Approved Preconflict Pair Tags": mf.get("Approved Preconflict Pair Tags"),
            "Zoom Attendance link count": len(za_link_ids),
        },
        "linked_za_tags": za_rows,
        "diagnosis": None,
        "corrected_configuration": None,
    }

    tags = [r.get("Preconflict Pair Tag") for r in za_rows if r.get("Preconflict Pair Tag")]
    unique_tags = sorted(set(tags))
    meeting_val = mf.get("Approved Preconflict Pair Tags")

    # Interpret current aggregation
    # Known Airtable Meta: aggregationFunction can be null when UI uses "Array join" /
    # or "Concatenate values" stored differently. Also "values" returns array that may
    # collapse in some clients. Docs intended ARRAYJOIN(values).
    if agg in (None, ""):
        current_formula_desc = (
            "aggregationFunction is null/unset in Meta API "
            "(UI may show a default that does not preserve multiple distinct strings)."
        )
    else:
        current_formula_desc = f"aggregationFunction = {agg!r}"

    # Correct config per Stage 17 design
    corrected = {
        "field_type": "rollup",
        "link_field": "Zoom Attendance",
        "rollup_field": "Preconflict Pair Tag",
        "aggregation_formula_ui": "ARRAYJOIN(values, \"\\n\")",
        "aggregation_formula_alt_acceptable": "ARRAYJOIN(ARRAYUNIQUE(values), \"\\n\")",
        "why": (
            "Need both unique tags (…|LIVE and …|REC) retained as searchable text for "
            "FIND() in Zoom Credit Conflict?. A bare/default aggregation that returns a "
            "single value or collapses the array will drop one tag."
        ),
        "meta_api_hint": {
            "aggregationFunction": "arrayJoin",
            "note": (
                "If Meta rejects storing the formula, set aggregation in Airtable UI to "
                "Array join / ARRAYJOIN(values) with newline (or comma) separator; "
                "prefer ARRAYJOIN(ARRAYUNIQUE(values), \"\\n\") so duplicates collapse "
                "but LIVE+REC both remain."
            ),
        },
    }

    report["diagnosis"] = {
        "linked_tag_count": len(tags),
        "unique_tags": unique_tags,
        "meeting_shows": meeting_val,
        "current_aggregation": current_formula_desc,
        "problem": (
            f"Meeting currently shows {meeting_val!r} while linked ZA tags are {unique_tags}. "
            f"Current Meta aggregationFunction={agg!r}."
        ),
    }
    report["corrected_configuration"] = corrected

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
