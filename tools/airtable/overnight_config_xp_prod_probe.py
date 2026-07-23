#!/usr/bin/env python3
"""
Overnight Agent 2 — READ-ONLY PROD configuration + Schmidt state probe.

Dumps the configuration tables that drive XP, levels, gates, achievements,
streaks, milestones, and Perfect Week, plus the Schmidt controlled-test
records, to a JSON evidence file. Never writes to Airtable.

Usage:
  python tools/airtable/overnight_config_xp_prod_probe.py \
      --json-out docs/overnight/config-xp/prod-config-snapshot.json

Exit codes:
  0 = probe completed
  2 = unable to authenticate / fetch
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

PROD_BASE_ID = "appn84sqPw03zEbTT"
SCHMIDT_ENROLLMENT_ID = "recgP9qZYjAhE7NXm"
SCHMIDT_SUBMISSION_ID = "recuuTBgstSTGg2E3"
TESTING_SCENARIO_ID = "recPdyfYRFgDtpzQ8"

CONFIG_TABLES = {
    "XP Reward Rules": ["Reward Rule", "Rule Key", "XP Amount", "Active?", "XP Source Label", "Rule Set", "Grade Band"],
    "Levels": ["Level Name", "XP Required (Cumulative)", "Active?", "Rank", "Sort Order", "Level Gate Rules"],
    "Level Gate Rules": [
        "Level Gate Rule Name", "Level", "Level Name (Lookup)", "School Year / Rule Set",
        "Version Active?", "Gate Enabled?", "Minimum Submissions", "Minimum Homework",
        "Minimum Videos", "Minimum Zoom Meetings", "Minimum Streak Days",
    ],
    "Achievements": [
        "Achievement Name", "Active?", "Trigger Type", "Trigger Threshold",
        "Reward Rule Key", "Repeatable?", "One-Time Unlock?", "Category",
    ],
    "Shot Milestones": [
        "Milestone Label", "Grade Band", "Milestone Percent", "Milestone Shot Count",
        "Points Awarded", "Active", "Milestone Unique Key",
    ],
    "Grade Bands": ["Grade Band Name", "Min Grade", "Max Grade", "Active?", "Total Shot Target", "Sort Order"],
    "Target Goal Shots": ["Name", "Grade Band", "Total Shot Target"],
    "Config": [],  # all fields
    "Weeks": ["Week Name", "Start Date", "End Date", "Active Week?"],
}

SCHMIDT_QUERIES = [
    # (table, filterByFormula description fields)
    ("Enrollments", None, SCHMIDT_ENROLLMENT_ID),
    ("Submissions", None, SCHMIDT_SUBMISSION_ID),
]


def _load_dotenv() -> None:
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    tools_env = Path(__file__).with_name(".env")
    if tools_env.exists():
        load_dotenv(tools_env, override=True)


def get_token() -> str:
    _load_dotenv()
    token = os.getenv("AIRTABLE_TOKEN") or os.getenv("AIRTABLE_API_TOKEN") or ""
    if not token:
        raise SystemExit("Missing AIRTABLE_TOKEN / AIRTABLE_API_TOKEN")
    return token


def fetch_table(session, base_id: str, table: str, fields: list[str]) -> list[dict]:
    import requests

    url = f"https://api.airtable.com/v0/{base_id}/{requests.utils.quote(table)}"
    records: list[dict] = []
    offset = None
    while True:
        params: dict = {"pageSize": 100}
        for i, name in enumerate(fields or []):
            params[f"fields[{i}]"] = name
        if offset:
            params["offset"] = offset
        resp = session.get(url, params=params, timeout=120)
        if not resp.ok:
            return [{"_error": f"{resp.status_code} {resp.text[:300]}"}]
        payload = resp.json()
        records.extend(payload.get("records", []))
        offset = payload.get("offset")
        if not offset:
            break
    return records


def fetch_record(session, base_id: str, table: str, record_id: str) -> dict:
    import requests

    url = f"https://api.airtable.com/v0/{base_id}/{requests.utils.quote(table)}/{record_id}"
    resp = session.get(url, timeout=120)
    if not resp.ok:
        return {"_error": f"{resp.status_code} {resp.text[:300]}"}
    return resp.json()


def fetch_filtered(session, base_id: str, table: str, formula: str, fields: list[str] | None = None) -> list[dict]:
    import requests

    url = f"https://api.airtable.com/v0/{base_id}/{requests.utils.quote(table)}"
    records: list[dict] = []
    offset = None
    while True:
        params: dict = {"pageSize": 100, "filterByFormula": formula}
        for i, name in enumerate(fields or []):
            params[f"fields[{i}]"] = name
        if offset:
            params["offset"] = offset
        resp = session.get(url, params=params, timeout=120)
        if not resp.ok:
            return [{"_error": f"{resp.status_code} {resp.text[:300]}"}]
        payload = resp.json()
        records.extend(payload.get("records", []))
        offset = payload.get("offset")
        if not offset:
            break
    return records


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-id", default=PROD_BASE_ID)
    parser.add_argument("--json-out", type=Path, required=True)
    args = parser.parse_args(argv)

    import requests

    session = requests.Session()
    session.headers["Authorization"] = f"Bearer {get_token()}"

    out: dict = {
        "mode": "read_only",
        "base_id": args.base_id,
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "config_tables": {},
        "schmidt": {},
    }

    for table, fields in CONFIG_TABLES.items():
        out["config_tables"][table] = fetch_table(session, args.base_id, table, fields)
        print(f"{table}: {len(out['config_tables'][table])} records")

    out["schmidt"]["enrollment"] = fetch_record(session, args.base_id, "Enrollments", SCHMIDT_ENROLLMENT_ID)
    out["schmidt"]["live_submission"] = fetch_record(session, args.base_id, "Submissions", SCHMIDT_SUBMISSION_ID)
    out["schmidt"]["testing_scenario"] = fetch_record(session, args.base_id, "Testing Scenarios", TESTING_SCENARIO_ID)

    # All XP Events / unlocks / streak occurrences for the Schmidt enrollment.
    enrollment_name = ""
    enrollment_fields = out["schmidt"]["enrollment"].get("fields", {})
    for key in ("Enrollment Key", "Enrollment Name", "Name"):
        if enrollment_fields.get(key):
            enrollment_name = str(enrollment_fields[key])
            break

    out["schmidt"]["xp_events"] = fetch_filtered(
        session, args.base_id, "XP Events",
        formula="NOT({Enrollment} = '')",
    )
    out["schmidt"]["achievement_unlocks"] = fetch_table(session, args.base_id, "Athlete Achievement Unlocks", [])
    out["schmidt"]["streak_occurrences"] = fetch_table(session, args.base_id, "Streak Occurrences", [])
    out["schmidt"]["weekly_athlete_summaries"] = fetch_table(session, args.base_id, "Weekly Athlete Summary", [])
    out["schmidt"]["enrollment_name_used"] = enrollment_name

    args.json_out.parent.mkdir(parents=True, exist_ok=True)
    args.json_out.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(f"Wrote {args.json_out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
