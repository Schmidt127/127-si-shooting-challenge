#!/usr/bin/env python3
"""C-020 H2 — Video 1-file harness prep + SDK upload orchestration (DEV only).

Clones Test F template (recvuvDdglwY2I7nu) with one intake file + new date,
sets Run Test? to trigger automation 115, polls for Pending Link Submission Asset,
then runs c013_dev_s3_upload_proof.py --confirm-write.

Requires CONFIRM_WRITE=true or --confirm-write for Airtable writes.
Does not enable 070a/070b.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from urllib.parse import quote
from zoneinfo import ZoneInfo

import requests
from dotenv import load_dotenv

REPO = Path(__file__).resolve().parents[2]
HERE = Path(__file__).parent
DEV_BASE = "appTetnuCZlCZdTCT"
SCHMIDT_ENROLLMENT = "recgP9qZYjAhE7NXm"
TEMPLATE_SCENARIO = "recvuvDdglwY2I7nu"
H2_ACTIVITY_DATE = "2026-06-30"  # Week 10 on DEV — 005 can assign Week
WEEK_10 = "recrTwxqXz31fNZ7e"
DENVER = ZoneInfo("America/Denver")


def load_env() -> None:
    load_dotenv(HERE / ".env", override=True)
    web_env = REPO / "web" / ".env.local"
    if web_env.exists():
        load_dotenv(web_env, override=True)


def token() -> str:
    t = os.getenv("AIRTABLE_TOKEN") or os.getenv("AIRTABLE_API_TOKEN") or ""
    if not t:
        raise SystemExit("ERROR: missing AIRTABLE_TOKEN")
    return t


def api(base_id: str, table: str, record_id: str | None = None) -> str:
    path = quote(table, safe="")
    if record_id:
        return f"https://api.airtable.com/v0/{base_id}/{path}/{record_id}"
    return f"https://api.airtable.com/v0/{base_id}/{path}"


def get_record(tok: str, table: str, record_id: str) -> dict:
    r = requests.get(api(DEV_BASE, table, record_id), headers={"Authorization": f"Bearer {tok}"}, timeout=120)
    if not r.ok:
        raise SystemExit(f"GET {table}/{record_id} -> {r.status_code}: {r.text[:500]}")
    return r.json()


def list_records(tok: str, table: str, formula: str, fields: list[str] | None = None) -> list[dict]:
    url = api(DEV_BASE, table)
    params: dict = {"filterByFormula": formula, "pageSize": 100}
    if fields:
        for i, name in enumerate(fields):
            params[f"fields[{i}]"] = name
    records: list[dict] = []
    offset = None
    while True:
        if offset:
            params["offset"] = offset
        r = requests.get(url, headers={"Authorization": f"Bearer {tok}"}, params=params, timeout=120)
        if not r.ok:
            raise SystemExit(f"LIST {table} -> {r.status_code}: {r.text[:500]}")
        data = r.json()
        records.extend(data.get("records", []))
        offset = data.get("offset")
        if not offset:
            break
    return records


def create_h2_scenario(tok: str, *, confirm: bool) -> dict:
    template = get_record(tok, "Testing Scenarios", TEMPLATE_SCENARIO)
    tf = template.get("fields", {})
    attachments = tf.get("Intake Attachments") or []
    if not attachments:
        raise SystemExit("ERROR: template scenario has no Intake Attachments")
    one_file = [attachments[0]]
    run_label = datetime.now(DENVER).strftime("%Y-%m-%d")
    name = f"C-020 H2 Video 1-file SDK {run_label}"

    fields = {
        "Test Intake Name": name,
        "Scenario Type": "Video",
        "Related Enrollment": [SCHMIDT_ENROLLMENT],
        "Submission Date": H2_ACTIVITY_DATE,
        "Intake Attachments": [{"url": one_file[0]["url"], "filename": one_file[0].get("filename", "test.png")}],
        "Video Feedback Focus": tf.get("Video Feedback Focus") or "Shooting",
        "Video Feedback Question": f"C-020 H2 SDK proof {run_label} — 1 file",
        "Dry Run?": False,
        "Run Test?": False,
        "Test Status": "Queued",
    }
    if not confirm:
        return {"mode": "dry_run", "wouldCreate": fields}

    r = requests.post(
        api(DEV_BASE, "Testing Scenarios"),
        headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json"},
        json={"fields": fields, "typecast": True},
        timeout=120,
    )
    if not r.ok:
        raise SystemExit(f"POST Testing Scenarios -> {r.status_code}: {r.text[:800]}")
    created = r.json()
    scenario_id = created["id"]

    r2 = requests.patch(
        api(DEV_BASE, "Testing Scenarios", scenario_id),
        headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json"},
        json={"fields": {"Run Test?": True}, "typecast": True},
        timeout=120,
    )
    if not r2.ok:
        raise SystemExit(f"PATCH Run Test? -> {r2.status_code}: {r2.text[:800]}")
    return {"mode": "live", "scenarioId": scenario_id, "fields": fields}


def ensure_submission_week(tok: str, submission_id: str) -> None:
    """Assign Week 10 when 005 has not linked a week yet (DEV H2 harness)."""
    sub = get_record(tok, "Submissions", submission_id)
    fields = sub.get("fields", {})
    if fields.get("Week"):
        return
    r = requests.patch(
        api(DEV_BASE, "Submissions", submission_id),
        headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json"},
        json={
            "fields": {"Week": [WEEK_10], "Activity Date": H2_ACTIVITY_DATE},
            "typecast": True,
        },
        timeout=120,
    )
    if not r.ok:
        raise SystemExit(f"PATCH submission week -> {r.status_code}: {r.text[:500]}")


def poll_h2_asset(tok: str, scenario_id: str, *, timeout_sec: int = 360) -> dict | None:
    deadline = time.time() + timeout_sec
    while time.time() < deadline:
        sc = get_record(tok, "Testing Scenarios", scenario_id)
        sf = sc.get("fields", {})
        linked = sf.get("Linked Submission") or []
        submission_id = linked[0] if linked else None
        if submission_id:
            ensure_submission_week(tok, submission_id)
            sub = get_record(tok, "Submissions", submission_id)
            asset_ids = sub.get("fields", {}).get("Submission Assets") or []
            if asset_ids:
                asset_id = asset_ids[0]
                asset = get_record(tok, "Submission Assets", asset_id)
                af = asset.get("fields", {})
                att = af.get("Airtable Attachment")
                if isinstance(att, list) and att:
                    return {
                        "submissionId": submission_id,
                        "assetId": asset_id,
                        "uploadStatus": af.get("Upload Status"),
                    }
            assets = list_records(
                tok,
                "Submission Assets",
                f"AND({{Submission - Linked}} = '{submission_id}', {{Upload Destination}} = 'Video Feedback')",
                ["Upload Status", "Airtable Attachment", "Upload Destination"],
            )
            for asset in assets:
                af = asset.get("fields", {})
                att = af.get("Airtable Attachment")
                if isinstance(att, list) and att:
                    return {
                        "submissionId": submission_id,
                        "assetId": asset["id"],
                        "uploadStatus": af.get("Upload Status"),
                    }
        time.sleep(5)
    return None


def run_sdk(asset_id: str, out_proof: Path, out_verify: Path) -> int:
    proof_cmd = [
        sys.executable,
        str(HERE / "c013_dev_s3_upload_proof.py"),
        asset_id,
        "--athlete-slug",
        "schmidt-mike",
        "--confirm-write",
        "--out",
        str(out_proof.relative_to(HERE) if out_proof.is_relative_to(HERE) else out_proof),
    ]
    env = os.environ.copy()
    if env.get("AWS_ACCESS_KEY_ID"):
        env.pop("AWS_PROFILE", None)
    subprocess.run(proof_cmd, cwd=str(HERE), check=True, env=env)
    verify_cmd = [
        sys.executable,
        str(HERE / "_probe_c013_asset_storage_fields.py"),
        "--record-id",
        asset_id,
        "--out",
        f"tools/airtable/_preview/c013-dev-h2-sdk-proof-{asset_id}-verify.json",
    ]
    subprocess.run(verify_cmd, cwd=str(HERE), check=True)
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="C-020 H2 video 1-file + SDK upload")
    parser.add_argument("--confirm-write", action="store_true")
    parser.add_argument("--prepare-only", action="store_true", help="Create scenario + trigger 115 only")
    parser.add_argument("--asset-id", default=None, help="Skip harness; SDK-process this asset")
    parser.add_argument("--scenario-id", default=None, help="Use existing scenario (poll asset)")
    parser.add_argument("--poll-timeout", type=int, default=360)
    args = parser.parse_args()

    load_env()
    tok = token()
    confirm = args.confirm_write or os.getenv("CONFIRM_WRITE", "").lower() in {"1", "true", "yes"}

    result: dict = {"script": "c013_dev_h2_video_run.py", "probedAt": datetime.now(DENVER).isoformat(timespec="seconds")}

    if args.asset_id:
        asset_id = args.asset_id
        result["assetId"] = asset_id
        result["harness"] = "skipped_existing_asset"
    else:
        if args.scenario_id:
            scenario_id = args.scenario_id
            result["scenarioId"] = scenario_id
        else:
            prep = create_h2_scenario(tok, confirm=confirm)
            result["scenarioPrep"] = prep
            if not confirm:
                print(json.dumps(result, indent=2))
                print("\nDRY-RUN — re-run with --confirm-write to create scenario and run SDK.")
                return
            scenario_id = prep["scenarioId"]
            result["scenarioId"] = scenario_id
            if args.prepare_only:
                print(json.dumps(result, indent=2))
                print(f"\nScenario {scenario_id} created — Run Test? set. Poll asset then re-run with --scenario-id.")
                return

        polled = poll_h2_asset(tok, scenario_id, timeout_sec=args.poll_timeout)
        result["pollResult"] = polled
        if not polled:
            print(json.dumps(result, indent=2))
            raise SystemExit("ERROR: timed out waiting for H2 Submission Asset from 115")
        asset_id = polled["assetId"]
        result["assetId"] = asset_id
        result["submissionId"] = polled.get("submissionId")

    if not confirm:
        result["next"] = f"python c013_dev_s3_upload_proof.py {asset_id} --athlete-slug schmidt-mike --confirm-write"
        print(json.dumps(result, indent=2))
        return

    out_proof = HERE / "_preview" / f"c013-dev-h2-sdk-proof-{asset_id}.json"
    out_verify = HERE / "_preview" / f"c013-dev-h2-sdk-proof-{asset_id}-verify.json"
    run_sdk(asset_id, out_proof, out_verify)
    result["proofArtifact"] = str(out_proof)
    result["verifyArtifact"] = str(out_verify)
    if out_verify.exists():
        result["verify"] = json.loads(out_verify.read_text(encoding="utf-8"))
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
