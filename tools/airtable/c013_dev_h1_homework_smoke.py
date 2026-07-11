#!/usr/bin/env python3
"""DEV H1 homework Make/Lambda smoke orchestrator (070a OFF).

Modes:
  preflight     — check local env keys (no network secrets printed)
  lambda-url    — POST homework payload to LAMBDA_FUNCTION_URL
  make-webhook  — POST homework payload to MAKE_DEV_UPLOAD_WEBHOOK_URL
  prepare       — create Pending Link homework asset via C-020 Testing Scenarios
                  (requires --confirm-write)

Does not enable Airtable 070a. Does not touch PROD.
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

HERE = Path(__file__).parent
REPO = HERE.parents[1]
DEV_BASE = "appTetnuCZlCZdTCT"
SCHMIDT = "recgP9qZYjAhE7NXm"
HW_TEMPLATE = "rec14HLmrN5suEyWs"
H1_ACTIVITY_DATE = "2026-06-30"
DENVER = ZoneInfo("America/Denver")
PROD_BASE = "appn84sqPw03zEbTT"

REQUIRED_ENV_PREFLIGHT = (
    "AIRTABLE_TOKEN",
    "MAKE_DEV_UPLOAD_WEBHOOK_URL",
    "UPLOAD_WEBHOOK_SECRET",
    "LAMBDA_FUNCTION_URL",
)


def load_env() -> None:
    load_dotenv(HERE / ".env", override=True)
    web_env = REPO / "web" / ".env.local"
    if web_env.exists():
        load_dotenv(web_env, override=True)


def tok() -> str:
    t = os.getenv("AIRTABLE_TOKEN") or os.getenv("AIRTABLE_API_TOKEN") or ""
    if not t:
        raise SystemExit("ERROR: missing AIRTABLE_TOKEN")
    return t


def api(table: str, record_id: str | None = None) -> str:
    path = quote(table, safe="")
    if record_id:
        return f"https://api.airtable.com/v0/{DEV_BASE}/{path}/{record_id}"
    return f"https://api.airtable.com/v0/{DEV_BASE}/{path}"


def get_rec(table: str, record_id: str) -> dict:
    r = requests.get(
        api(table, record_id),
        headers={"Authorization": f"Bearer {tok()}"},
        timeout=120,
    )
    if not r.ok:
        raise SystemExit(f"GET {table}/{record_id} -> {r.status_code}: {r.text[:500]}")
    return r.json()


def assert_dev_only() -> None:
    base = os.getenv("AIRTABLE_BASE_ID") or os.getenv("BASE_ID") or DEV_BASE
    if base == PROD_BASE:
        raise SystemExit("ERROR: refusing PROD base — this smoke is DEV only")


def preflight_env() -> dict:
    """Report which required env keys are present (values never printed)."""
    load_env()
    present = {}
    for key in REQUIRED_ENV_PREFLIGHT:
        if key == "AIRTABLE_TOKEN":
            present[key] = bool(os.getenv("AIRTABLE_TOKEN") or os.getenv("AIRTABLE_API_TOKEN"))
        else:
            present[key] = bool((os.getenv(key) or "").strip())
    all_ok = all(present.values())
    return {
        "script": "c013_dev_h1_homework_smoke.py",
        "mode": "preflight",
        "baseIdExpected": DEV_BASE,
        "envPresent": present,
        "allRequiredPresent": all_ok,
        "hardStops": [
            "070a OFF",
            "PROD untouched",
            "no secrets in GitHub",
        ],
    }


def poll_homework_asset(scenario_id: str, *, timeout_sec: int = 600) -> str:
    deadline = time.time() + timeout_sec
    while time.time() < deadline:
        sc = get_rec("Testing Scenarios", scenario_id)
        linked = (sc.get("fields", {}).get("Linked Submission") or [None])[0]
        if linked:
            formula = f"AND({{Submission - Linked}} = '{linked}')"
            r = requests.get(
                api("Submission Assets"),
                headers={"Authorization": f"Bearer {tok()}"},
                params={"filterByFormula": formula, "pageSize": 10},
                timeout=120,
            )
            r.raise_for_status()
            for rec in r.json().get("records", []):
                af = rec.get("fields", {})
                dest = af.get("Upload Destination")
                if af.get("Airtable Attachment") and dest in {
                    "Homework Completions",
                    "Homework",
                }:
                    status = af.get("Upload Status")
                    if status in {"Pending Link", "Processing", "Uploaded"}:
                        return rec["id"]
        time.sleep(5)
    raise SystemExit(f"homework asset poll timeout for scenario {scenario_id}")


def prepare_homework_asset(*, confirm: bool) -> dict:
    """Clone HW template Testing Scenario and return Pending Link asset id."""
    if not confirm:
        raise SystemExit("ERROR: prepare requires --confirm-write (DEV Airtable writes)")
    assert_dev_only()
    tg = get_rec("Testing Scenarios", HW_TEMPLATE).get("fields", {})
    attachments = tg.get("Intake Attachments") or []
    if not attachments:
        raise SystemExit("ERROR: homework template has no Intake Attachments")
    run_label = datetime.now(DENVER).strftime("%Y-%m-%d-%H%M")
    scenario_fields = {
        "Test Intake Name": f"C-013 H1 homework Make/Lambda {run_label}",
        "Scenario Type": "Homework",
        "Related Enrollment": [SCHMIDT],
        "Submission Date": tg.get("Submission Date") or H1_ACTIVITY_DATE,
        "Homework Assignment": tg.get("Homework Assignment"),
        "Intake Attachments": [
            {
                "url": attachments[0]["url"],
                "filename": attachments[0].get("filename") or "h1-homework.png",
            }
        ],
        "Dry Run?": False,
        "Run Test?": False,
        "Test Status": "Queued",
    }
    r = requests.post(
        api("Testing Scenarios"),
        headers={"Authorization": f"Bearer {tok()}", "Content-Type": "application/json"},
        json={"fields": scenario_fields, "typecast": True},
        timeout=120,
    )
    if not r.ok:
        raise SystemExit(f"create Testing Scenario failed: {r.status_code} {r.text[:400]}")
    scenario_id = r.json()["id"]
    patch = requests.patch(
        api("Testing Scenarios", scenario_id),
        headers={"Authorization": f"Bearer {tok()}", "Content-Type": "application/json"},
        json={"fields": {"Run Test?": True}, "typecast": True},
        timeout=120,
    )
    if not patch.ok:
        raise SystemExit(f"set Run Test? failed: {patch.status_code} {patch.text[:400]}")
    asset_id = poll_homework_asset(scenario_id)
    asset = get_rec("Submission Assets", asset_id)
    fields = asset.get("fields") or {}
    hc = (fields.get("Homework Completions") or [None])[0]
    return {
        "scenarioId": scenario_id,
        "assetId": asset_id,
        "targetRecordId": hc,
        "uploadStatus": fields.get("Upload Status"),
        "uploadDestination": fields.get("Upload Destination"),
    }


def run_probe(asset_id: str, out_path: Path) -> dict:
    cmd = [
        sys.executable,
        str(HERE / "_probe_c013_asset_storage_fields.py"),
        "--record-id",
        asset_id,
        "--out",
        str(out_path),
    ]
    subprocess.run(cmd, check=True, cwd=str(HERE))
    return json.loads(out_path.read_text(encoding="utf-8"))


def run_make_webhook(asset_id: str, *, target_record_id: str | None, out_path: Path) -> dict:
    cmd = [
        sys.executable,
        str(HERE / "c013_dev_make_homework_webhook_post.py"),
        asset_id,
        "--out",
        str(out_path),
    ]
    if target_record_id:
        cmd.extend(["--target-record-id", target_record_id])
    subprocess.run(cmd, check=True, cwd=str(HERE))
    return json.loads(out_path.read_text(encoding="utf-8"))


def run_lambda_url(asset_id: str, *, target_record_id: str, out_path: Path) -> dict:
    url = (os.getenv("LAMBDA_FUNCTION_URL") or "").strip()
    if not url:
        raise SystemExit("ERROR: LAMBDA_FUNCTION_URL required for lambda-url mode")
    cmd = [
        sys.executable,
        str(HERE / "c013_dev_lambda_invoke.py"),
        asset_id,
        "--target-record-id",
        target_record_id,
        "--function-url",
        url,
        "--out",
        str(out_path),
    ]
    subprocess.run(cmd, check=True, cwd=str(HERE))
    return json.loads(out_path.read_text(encoding="utf-8"))


def summarize_probe(probe: dict) -> dict:
    sa = probe.get("submissionAsset") or probe.get("recordProbe") or {}
    wb = sa.get("writebackVerification") or {}
    fields = sa.get("fields") or {}
    return {
        "allPass": bool(wb.get("allPass")),
        "uploadStatus": fields.get("Upload Status"),
        "canonicalUrlPopulated": bool(fields.get("Canonical File URL")),
        "storageKey": fields.get("Storage Key"),
        "fileContentHash": fields.get("File Content Hash"),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="DEV H1 homework Make/Lambda smoke")
    parser.add_argument(
        "mode",
        choices=["preflight", "prepare", "make-webhook", "lambda-url", "all"],
        help="Smoke mode",
    )
    parser.add_argument("--asset-id", default=None, help="Existing Pending Link homework asset")
    parser.add_argument("--target-record-id", default=None, help="Homework Completions rec id")
    parser.add_argument(
        "--confirm-write",
        action="store_true",
        help="Required for prepare (DEV Airtable writes)",
    )
    parser.add_argument("--out-dir", default="_preview", help="Artifact directory under tools/airtable")
    args = parser.parse_args()

    load_env()
    assert_dev_only()
    out_dir = HERE / args.out_dir
    out_dir.mkdir(parents=True, exist_ok=True)

    if args.mode == "preflight":
        result = preflight_env()
        out = out_dir / "c013-dev-h1-homework-preflight.json"
        out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(result, indent=2))
        print(f"\nwritten={out}")
        if not result["allRequiredPresent"]:
            raise SystemExit("ERROR: missing required DEV env keys — see envPresent")
        return

    prepared = None
    asset_id = args.asset_id
    target_id = args.target_record_id

    if args.mode in {"prepare", "all"}:
        prepared = prepare_homework_asset(confirm=args.confirm_write)
        asset_id = prepared["assetId"]
        target_id = prepared.get("targetRecordId") or target_id
        prep_out = out_dir / f"c013-dev-h1-homework-prepare-{asset_id}.json"
        prep_out.write_text(json.dumps(prepared, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({"prepare": prepared}, indent=2))
        if args.mode == "prepare":
            print(f"\nwritten={prep_out}")
            return

    if not asset_id:
        raise SystemExit("ERROR: --asset-id required (or use prepare / all --confirm-write)")

    if not target_id:
        fields = get_rec("Submission Assets", asset_id).get("fields") or {}
        links = fields.get("Homework Completions") or []
        target_id = links[0] if links else None
    if not target_id:
        raise SystemExit("ERROR: missing Homework Completions targetRecordId")

    stamp = datetime.now(DENVER).strftime("%Y%m%d-%H%M%S")
    summary: dict = {
        "script": "c013_dev_h1_homework_smoke.py",
        "mode": args.mode,
        "baseId": DEV_BASE,
        "assetId": asset_id,
        "targetRecordId": target_id,
        "prepared": prepared,
        "automation070a": "OFF (must remain OFF)",
        "prodModified": False,
    }

    if args.mode in {"make-webhook", "all"}:
        make_out = out_dir / f"c013-dev-h1-make-homework-{asset_id}-{stamp}.json"
        summary["makeWebhook"] = run_make_webhook(asset_id, target_record_id=target_id, out_path=make_out)

    if args.mode in {"lambda-url", "all"}:
        lam_out = out_dir / f"c013-dev-h1-lambda-homework-{asset_id}-{stamp}.json"
        summary["lambdaUrl"] = run_lambda_url(asset_id, target_record_id=target_id, out_path=lam_out)

    probe_out = out_dir / f"c013-dev-h1-homework-probe-{asset_id}-{stamp}.json"
    probe = run_probe(asset_id, probe_out)
    summary["probe"] = summarize_probe(probe)
    summary["pass"] = bool(summary["probe"].get("allPass"))

    final_out = out_dir / f"c013-dev-h1-homework-smoke-{asset_id}-{stamp}.json"
    final_out.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2))
    print(f"\nwritten={final_out}")
    if not summary["pass"]:
        raise SystemExit("ERROR: probe allPass=false")


if __name__ == "__main__":
    main()
