#!/usr/bin/env python3
"""POST 070b v4.2 JSON to PROD Make Upload Engine webhook (manual Run once test).

070b stays OFF — simulates what automation 070b will send to Make.

Usage:
  python c013_prod_make_webhook_post.py recGQ8EjAMz3bEBiW

Env (never commit):
  MAKE_UPLOAD_WEBHOOK_URL_PROD=<from Make module 1 Custom webhook>
  AIRTABLE_PROD_TOKEN or web/.env.local PROD token
"""

from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path

import requests
from dotenv import load_dotenv

REPO = Path(__file__).resolve().parents[2]
HERE = Path(__file__).parent
PROD_BASE = "appn84sqPw03zEbTT"
TABLE = "Submission Assets"
SCHMIDT_ENR = "recgP9qZYjAhE7NXm"


def load_env() -> None:
    load_dotenv(HERE / ".env", override=False)
    load_dotenv(REPO / "web" / ".env.local", override=True)
    session = HERE / "_preview" / "c013-prod-deploy-session.local.json"
    if session.exists():
        data = json.loads(session.read_text(encoding="utf-8"))
        if data.get("MAKE_UPLOAD_WEBHOOK_URL_PROD"):
            os.environ["MAKE_UPLOAD_WEBHOOK_URL_PROD"] = data["MAKE_UPLOAD_WEBHOOK_URL_PROD"]


def token() -> str:
    t = (
        os.getenv("AIRTABLE_PROD_TOKEN")
        or os.getenv("AIRTABLE_API_TOKEN")
        or os.getenv("AIRTABLE_TOKEN")
        or ""
    )
    if not t:
        raise SystemExit("ERROR: missing PROD Airtable token (AIRTABLE_PROD_TOKEN or web/.env.local)")
    return t


def fetch_asset(tok: str, asset_id: str) -> dict:
    r = requests.get(
        f"https://api.airtable.com/v0/{PROD_BASE}/{TABLE.replace(' ', '%20')}/{asset_id}",
        headers={"Authorization": f"Bearer {tok}"},
        timeout=120,
    )
    if not r.ok:
        raise SystemExit(f"GET Submission Assets/{asset_id} -> {r.status_code}: {r.text[:500]}")
    return r.json()


def build_payload(
    asset_id: str,
    *,
    target_record_id: str,
    automation_number: str = "070b",
    route_key: str = "video_feedback",
    upload_destination: str = "Video Feedback",
    target_table: str = "Video Feedback",
) -> dict:
    return {
        "sourceName": "Airtable Upload Engine",
        "automationNumber": automation_number,
        "sentAtIso": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        "routeKey": route_key,
        "uploadDestination": upload_destination,
        "sourceTable": TABLE,
        "submissionAssetRecordId": asset_id,
        "targetTable": target_table,
        "targetRecordId": target_record_id,
    }


def validate_lambda_json(body_text: str) -> dict:
    """Return validation summary without logging secrets."""
    raw = (body_text or "").strip()
    if not raw:
        return {"ok": False, "reason": "blank_body"}
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return {"ok": False, "reason": "malformed_json", "preview": raw[:120]}
    if isinstance(parsed, dict) and "body" in parsed and isinstance(parsed["body"], str):
        try:
            parsed = json.loads(parsed["body"])
        except json.JSONDecodeError:
            return {"ok": False, "reason": "malformed_inner_json"}
    if not isinstance(parsed, dict):
        return {"ok": False, "reason": "not_object"}
    generic = raw.strip() in {"Accepted", "Success", "OK", "ok"}
    return {
        "ok": bool(parsed.get("actionOut")),
        "reason": "generic_text" if generic else None,
        "statusOut": parsed.get("statusOut"),
        "actionOut": parsed.get("actionOut"),
        "allPass": (parsed.get("writebackVerification") or {}).get("allPass"),
        "submissionAssetRecordId": parsed.get("submissionAssetRecordId"),
        "completeLambdaJson": not generic and bool(parsed.get("actionOut")),
    }


def post_webhook(url: str, payload: dict, *, timeout: int = 180) -> tuple[int, str]:
    r = requests.post(url, headers={"Content-Type": "application/json"}, json=payload, timeout=timeout)
    return r.status_code, r.text[:8000]


def main() -> None:
    parser = argparse.ArgumentParser(description="POST 070b payload to PROD Make webhook")
    parser.add_argument("asset_id", help="Submission Assets record id (Schmidt Testing only)")
    parser.add_argument("--webhook-url", default=None)
    parser.add_argument("--target-record-id", default=None)
    parser.add_argument("--route-key", default="video_feedback")
    parser.add_argument("--automation-number", default="070b")
    parser.add_argument("--out", default=None)
    args = parser.parse_args()

    load_env()
    webhook_url = (args.webhook_url or os.getenv("MAKE_UPLOAD_WEBHOOK_URL_PROD") or "").strip()
    if not webhook_url:
        raise SystemExit(
            "ERROR: MAKE_UPLOAD_WEBHOOK_URL_PROD missing — build Make scenario first, "
            "copy module 1 webhook URL to tools/airtable/.env or session file"
        )

    tok = token()
    asset = fetch_asset(tok, args.asset_id)
    fields = asset.get("fields") or {}
    enr = fields.get("Enrollment - Linked") or []
    if SCHMIDT_ENR not in enr:
        raise SystemExit(f"ERROR: asset {args.asset_id} is not linked to Schmidt Testing {SCHMIDT_ENR}")

    vf_links = fields.get("Video Feedback") or []
    target_id = args.target_record_id or (vf_links[0] if vf_links else "")
    if not target_id:
        raise SystemExit("ERROR: no Video Feedback link — pass --target-record-id")

    payload = build_payload(
        args.asset_id,
        target_record_id=target_id,
        route_key=args.route_key,
        automation_number=args.automation_number,
        upload_destination="Video Feedback" if args.route_key == "video_feedback" else "Homework Completions",
        target_table="Video Feedback" if args.route_key == "video_feedback" else "Homework Completions",
    )

    status_code, response_text = post_webhook(webhook_url, payload)
    lambda_check = validate_lambda_json(response_text)

    result = {
        "script": "c013_prod_make_webhook_post.py",
        "probedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "baseId": PROD_BASE,
        "assetId": args.asset_id,
        "targetRecordId": target_id,
        "enrollmentId": SCHMIDT_ENR,
        "preflight": {
            "uploadStatus": fields.get("Upload Status"),
            "uploadDestination": fields.get("Upload Destination"),
            "sendToMakeTrigger": fields.get("Send to Make Trigger"),
            "attachmentPresent": bool(fields.get("Airtable Attachment")),
        },
        "makeResponse": {
            "statusCode": status_code,
            "bodyLength": len(response_text or ""),
            "lambdaValidation": lambda_check,
        },
        "pass": 200 <= status_code < 300 and lambda_check.get("completeLambdaJson") is True,
    }

    out = args.out or f"_preview/c013-prod-make-webhook-{args.asset_id}.json"
    out_path = HERE / out if not str(out).startswith("tools/") else REPO / out
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")

    safe = {k: v for k, v in result.items()}
    print(json.dumps(safe, indent=2))
    print(f"\nwritten={out_path}")
    if not result["pass"]:
        raise SystemExit(f"ERROR: Make webhook smoke failed HTTP {status_code}")


if __name__ == "__main__":
    main()
