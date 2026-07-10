#!/usr/bin/env python3
"""C-023 H3 — prepare fresh DEV Submission Asset with same bytes as reference (renamed filename).

Uses reference asset attachment URL (not the writable target record).
Does not enable 070a/070b. Requires --confirm-write for Airtable writes.
"""

from __future__ import annotations

import argparse
import json
import os
import time
from datetime import datetime
from pathlib import Path
from urllib.parse import quote
from zoneinfo import ZoneInfo

import requests
from dotenv import load_dotenv

HERE = Path(__file__).parent
DEV_BASE = "appTetnuCZlCZdTCT"
SCHMIDT_ENROLLMENT = "recgP9qZYjAhE7NXm"
WEEK_10 = "recrTwxqXz31fNZ7e"
H2_ACTIVITY_DATE = "2026-06-30"
DEFAULT_REFERENCE = "recF86pJTIMFoEypJ"
H3_FILENAME = "c023-h3-renamed-dup-bytes-test.png"
DENVER = ZoneInfo("America/Denver")


def load_env() -> None:
    load_dotenv(HERE / ".env", override=True)


def token() -> str:
    t = os.getenv("AIRTABLE_TOKEN") or os.getenv("AIRTABLE_API_TOKEN") or ""
    if not t:
        raise SystemExit("ERROR: missing AIRTABLE_TOKEN in tools/airtable/.env")
    return t


def api(table: str, record_id: str | None = None) -> str:
    path = quote(table, safe="")
    if record_id:
        return f"https://api.airtable.com/v0/{DEV_BASE}/{path}/{record_id}"
    return f"https://api.airtable.com/v0/{DEV_BASE}/{path}"


def get_record(tok: str, table: str, record_id: str) -> dict:
    r = requests.get(api(table, record_id), headers={"Authorization": f"Bearer {tok}"}, timeout=120)
    if not r.ok:
        raise SystemExit(f"GET {table}/{record_id} -> {r.status_code}: {r.text[:500]}")
    return r.json()


def poll_pending_link_asset(tok: str, scenario_id: str, *, timeout_sec: int = 360) -> tuple[str, str]:
    submission_id = ""
    asset_id = ""
    deadline = time.time() + timeout_sec
    while time.time() < deadline:
        scenario = get_record(tok, "Testing Scenarios", scenario_id)
        fields = scenario.get("fields", {})
        linked = fields.get("Linked Submission") or []
        if linked:
            submission_id = linked[0]
            sub = get_record(tok, "Submissions", submission_id)
            if not sub.get("fields", {}).get("Week"):
                requests.patch(
                    api("Submissions", submission_id),
                    headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json"},
                    json={
                        "fields": {"Week": [WEEK_10], "Activity Date": H2_ACTIVITY_DATE},
                        "typecast": True,
                    },
                    timeout=120,
                )
            asset_ids = sub.get("fields", {}).get("Submission Assets") or []
            if asset_ids:
                asset_id = asset_ids[0]
            else:
                formula = (
                    f"AND({{Submission - Linked}} = '{submission_id}', "
                    f"{{Upload Destination}} = 'Video Feedback')"
                )
                r = requests.get(
                    api("Submission Assets"),
                    headers={"Authorization": f"Bearer {tok}"},
                    params={"filterByFormula": formula, "pageSize": 5},
                    timeout=120,
                )
                if r.ok:
                    recs = r.json().get("records", [])
                    if recs:
                        asset_id = recs[0]["id"]
            if asset_id:
                asset = get_record(tok, "Submission Assets", asset_id)
                af = asset.get("fields", {})
                if af.get("Airtable Attachment") and af.get("Upload Status") == "Pending Link":
                    return submission_id, asset_id
        time.sleep(5)
    raise SystemExit(f"ERROR: poll timeout after {timeout_sec}s for scenario {scenario_id}")


def main() -> None:
    parser = argparse.ArgumentParser(description="C-023 H3 duplicate-bytes DEV asset prep")
    parser.add_argument(
        "--reference-asset",
        default=DEFAULT_REFERENCE,
        help=f"Reference Submission Assets id with known hash (default {DEFAULT_REFERENCE})",
    )
    parser.add_argument("--confirm-write", action="store_true", help="Create scenario and trigger Run Test?")
    parser.add_argument("--out", default=None, help="Artifact JSON path")
    args = parser.parse_args()

    if args.reference_asset == "recIYFnfmsPcy7iop":
        raise SystemExit("ERROR: recIYFnfmsPcy7iop is prohibited as reference/target")

    load_env()
    tok = token()
    ref = get_record(tok, "Submission Assets", args.reference_asset)
    rf = ref.get("fields", {})
    attachments = rf.get("Airtable Attachment") or []
    if not attachments:
        raise SystemExit(f"ERROR: reference {args.reference_asset} has no Airtable Attachment")

    ref_att = attachments[0]
    ref_hash = rf.get("File Content Hash")
    ref_key = rf.get("Storage Key")

    run_label = datetime.now(DENVER).strftime("%Y-%m-%d-%H%M")
    scenario_fields = {
        "Test Intake Name": f"C-023 H3 dup-bytes {run_label}",
        "Scenario Type": "Video",
        "Related Enrollment": [SCHMIDT_ENROLLMENT],
        "Submission Date": H2_ACTIVITY_DATE,
        "Intake Attachments": [{"url": ref_att["url"], "filename": H3_FILENAME}],
        "Video Feedback Focus": "Shooting",
        "Video Feedback Question": f"C-023 H3 duplicate bytes {run_label}",
        "Dry Run?": False,
        "Run Test?": False,
        "Test Status": "Queued",
    }

    if not args.confirm_write:
        print(
            json.dumps(
                {
                    "mode": "dry_run",
                    "referenceAssetId": args.reference_asset,
                    "referenceHash": ref_hash,
                    "referenceStorageKey": ref_key,
                    "h3Filename": H3_FILENAME,
                    "wouldCreateScenario": scenario_fields,
                },
                indent=2,
            )
        )
        raise SystemExit("Dry run only — pass --confirm-write to create scenario")

    r = requests.post(
        api("Testing Scenarios"),
        headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json"},
        json={"fields": scenario_fields, "typecast": True},
        timeout=120,
    )
    if not r.ok:
        raise SystemExit(f"POST Testing Scenarios -> {r.status_code}: {r.text[:800]}")
    scenario_id = r.json()["id"]

    r2 = requests.patch(
        api("Testing Scenarios", scenario_id),
        headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json"},
        json={"fields": {"Run Test?": True}, "typecast": True},
        timeout=120,
    )
    if not r2.ok:
        raise SystemExit(f"PATCH Run Test? -> {r2.status_code}: {r2.text[:800]}")

    submission_id, asset_id = poll_pending_link_asset(tok, scenario_id)
    asset = get_record(tok, "Submission Assets", asset_id)
    af = asset.get("fields", {})
    att_name = (af.get("Airtable Attachment") or [{}])[0].get("filename")

    result = {
        "script": "c013_dev_h3_duplicate_bytes_prep.py",
        "probedAt": datetime.now(DENVER).isoformat(timespec="seconds"),
        "baseId": DEV_BASE,
        "referenceAssetId": args.reference_asset,
        "referenceHash": ref_hash,
        "referenceStorageKey": ref_key,
        "scenarioId": scenario_id,
        "submissionId": submission_id,
        "h3AssetId": asset_id,
        "h3Filename": att_name,
        "uploadStatus": af.get("Upload Status"),
        "videoFeedback": af.get("Video Feedback"),
        "readyToSend": af.get("Ready to Send to Make?"),
    }

    out = args.out or f"_preview/c013-dev-h3-prep-{asset_id}.json"
    out_path = HERE / out
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))
    print(f"\nwritten={out_path}")


if __name__ == "__main__":
    main()
