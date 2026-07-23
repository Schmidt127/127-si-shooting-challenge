"""Create PROD Testing Scenarios table (minimum 115 fields) if missing."""
from __future__ import annotations

import json
import urllib.error
import urllib.request
from pathlib import Path

PROD = "appn84sqPw03zEbTT"
ENROLLMENTS = "tbl3PFmwbRoabu1YV"
SUBMISSIONS = "tblEVjVpGGlPTsYSt"
HOMEWORK_COMPLETIONS = "tblv58ppTFDBXb3nv"
FBC = "tblUuxwYlX4EQ9MKE"


def load_tok() -> str:
    env: dict[str, str] = {}
    for line in Path(__file__).with_name(".env").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env.get("AIRTABLE_TOKEN") or env.get("AIRTABLE_API_TOKEN") or ""


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
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.status, json.load(r)
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(raw)
        except Exception:
            payload = {"raw": raw[:800]}
        return e.code, payload


def choices(names: list[str]) -> list[dict]:
    colors = [
        "blueLight2",
        "cyanLight2",
        "tealLight2",
        "greenLight2",
        "yellowLight2",
        "orangeLight2",
        "redLight2",
        "pinkLight2",
        "purpleLight2",
        "grayLight2",
        "blueLight1",
    ]
    out = []
    for i, name in enumerate(names):
        out.append({"name": name, "color": colors[i % len(colors)]})
    return out


def main():
    tok = load_tok()
    status, meta = api(tok, f"https://api.airtable.com/v0/meta/bases/{PROD}/tables")
    assert status == 200, meta
    existing = next((t for t in meta["tables"] if t["name"] == "Testing Scenarios"), None)
    if existing:
        print("EXISTS", existing["id"], "fields", len(existing.get("fields", [])))
        Path("docs/foundation-reset/prod-testing-scenarios-created.json").write_text(
            json.dumps({"status": "exists", "table": existing}, indent=2, default=str),
            encoding="utf-8",
        )
        return

    # Minimum fields for 115 Daily Submission path + operator metadata.
    # Linked fields created without inverse names first (Airtable assigns defaults).
    description = (
        "Engineering Test Framework (SC-001). Orchestration only — not a second XP/"
        "homework/email path. Framework fields stay on this table."
    )
    payload = {
        "name": "Testing Scenarios",
        "description": description,
        "fields": [
            {"name": "Test Intake Name", "type": "singleLineText"},
            {
                "name": "Run Test?",
                "type": "checkbox",
                "options": {"icon": "thumbsUp", "color": "greenBright"},
            },
            {
                "name": "Dry Run?",
                "type": "checkbox",
                "options": {"icon": "thumbsUp", "color": "yellowBright"},
            },
            {
                "name": "Scenario Type",
                "type": "singleSelect",
                "options": {
                    "choices": choices(
                        [
                            "Daily Submission",
                            "Homework",
                            "Homework + Video",
                            "Three Video Upload",
                            "Milestone Crossing",
                            "Perfect Week",
                            "Backdated Submission",
                            "Parent Feedback",
                            "Weekly Summary",
                            "Award Generation",
                            "Other",
                            "Video",
                        ]
                    )
                },
            },
            {
                "name": "Test Status",
                "type": "singleSelect",
                "options": {
                    "choices": choices(
                        [
                            "Not Started",
                            "Queued",
                            "In Progress",
                            "Blocked",
                            "Completed",
                            "Rejected",
                        ]
                    )
                },
            },
            {
                "name": "Last Run Status",
                "type": "singleSelect",
                "options": {
                    "choices": choices(["Not Run", "Pass", "Fail", "Blocked", "Error"])
                },
            },
            {"name": "Expected Result", "type": "multilineText"},
            {"name": "Actual Result", "type": "multilineText"},
            {"name": "Pass/Fail Notes", "type": "multilineText"},
            {"name": "Operator Feedback", "type": "multilineText"},
            {"name": "Test Notes", "type": "multilineText"},
            {"name": "Scenario Requirements", "type": "multilineText"},
            {"name": "Last Error", "type": "multilineText"},
            {"name": "Submission Date", "type": "date", "options": {"dateFormat": {"name": "local"}}},
            {
                "name": "Shot Total",
                "type": "number",
                "options": {"precision": 0},
            },
            {
                "name": "Last Run At",
                "type": "dateTime",
                "options": {
                    "dateFormat": {"name": "local"},
                    "timeFormat": {"name": "24hour"},
                    "timeZone": "America/Denver",
                },
            },
            {
                "name": "Video Feedback Focus",
                "type": "singleSelect",
                "options": {
                    "choices": choices(
                        [
                            "Form",
                            "Footwork",
                            "Release",
                            "Follow Through",
                            "Other",
                        ]
                    )
                },
            },
            {"name": "Video Feedback Question", "type": "multilineText"},
            {"name": "Intake Attachments", "type": "multipleAttachments"},
            {
                "name": "Related Enrollment",
                "type": "multipleRecordLinks",
                "options": {"linkedTableId": ENROLLMENTS},
            },
            {
                "name": "Linked Submission",
                "type": "multipleRecordLinks",
                "options": {"linkedTableId": SUBMISSIONS},
            },
            {
                "name": "Relevant Homework Completion",
                "type": "multipleRecordLinks",
                "options": {"linkedTableId": HOMEWORK_COMPLETIONS},
            },
            {
                "name": "Homework Assignment",
                "type": "multipleRecordLinks",
                "options": {"linkedTableId": FBC},
            },
        ],
    }

    status, created = api(
        tok,
        f"https://api.airtable.com/v0/meta/bases/{PROD}/tables",
        method="POST",
        body=payload,
    )
    print("CREATE_STATUS", status)
    Path("docs/foundation-reset/prod-testing-scenarios-created.json").write_text(
        json.dumps({"status": status, "response": created}, indent=2, default=str),
        encoding="utf-8",
    )
    if status not in (200, 201):
        raise SystemExit(f"Create failed: {status} {created}")

    table_id = created.get("id")
    print("CREATED", table_id)

    # Add RECORD_ID formula if possible
    status2, formula = api(
        tok,
        f"https://api.airtable.com/v0/meta/bases/{PROD}/tables/{table_id}/fields",
        method="POST",
        body={
            "name": "RecordId - Testing Scenarios",
            "type": "formula",
            "options": {"formula": "RECORD_ID()"},
        },
    )
    print("FORMULA_STATUS", status2)
    Path("docs/foundation-reset/prod-testing-scenarios-formula.json").write_text(
        json.dumps({"status": status2, "response": formula}, indent=2, default=str),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
