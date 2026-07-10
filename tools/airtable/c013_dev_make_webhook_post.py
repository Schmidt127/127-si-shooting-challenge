#!/usr/bin/env python3
"""POST 070b v4.1 JSON to DEV Make Upload Engine webhook (manual Run once test).

070b stays OFF — simulates what automation 070b will send to Make.

Usage:
  # Make scenario → Run once, then:
  python c013_dev_make_webhook_post.py recthL2wrTha5nWHL

  # Optional metadata for artifact:
  python c013_dev_make_webhook_post.py recthL2wrTha5nWHL \\
    --scenario-id recTqAXWshNR3b0c1 --submission-id recW6YsJNnY1qXJOX

Env (never commit):
  MAKE_DEV_UPLOAD_WEBHOOK_URL=<from Make module 1 Custom webhook>
  AIRTABLE_TOKEN or AIRTABLE_API_TOKEN — fetch Video Feedback link for targetRecordId
"""

from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

import requests
from dotenv import load_dotenv

HERE = Path(__file__).parent
DEV_BASE = "appTetnuCZlCZdTCT"
TABLE = "Submission Assets"


def load_env() -> None:
    load_dotenv(HERE / ".env", override=True)


def token() -> str:
    t = os.getenv("AIRTABLE_TOKEN") or os.getenv("AIRTABLE_API_TOKEN") or ""
    if not t:
        raise SystemExit("ERROR: missing AIRTABLE_TOKEN in tools/airtable/.env")
    return t


def api_url(record_id: str | None = None) -> str:
    path = quote(TABLE, safe="")
    if record_id:
        return f"https://api.airtable.com/v0/{DEV_BASE}/{path}/{record_id}"
    return f"https://api.airtable.com/v0/{DEV_BASE}/{path}"


def fetch_asset(tok: str, asset_id: str) -> dict:
    r = requests.get(
        api_url(asset_id),
        headers={"Authorization": f"Bearer {tok}"},
        timeout=120,
    )
    if not r.ok:
        raise SystemExit(f"GET Submission Assets/{asset_id} -> {r.status_code}: {r.text[:500]}")
    return r.json()


def build_payload(
    asset_id: str,
    *,
    target_record_id: str | None,
    submission_id: str | None,
) -> dict:
    return {
        "sourceName": "Airtable Upload Engine",
        "automationNumber": "070b",
        "sentAtIso": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        "routeKey": "video_feedback",
        "uploadDestination": "Video Feedback",
        "sourceTable": TABLE,
        "submissionAssetRecordId": asset_id,
        "targetTable": "Video Feedback",
        "targetRecordId": target_record_id or "",
        **({"submissionId": submission_id} if submission_id else {}),
    }


def post_webhook(url: str, payload: dict) -> tuple[int, str]:
    r = requests.post(
        url,
        headers={"Content-Type": "application/json"},
        json=payload,
        timeout=180,
    )
    return r.status_code, r.text[:2000]


def main() -> None:
    parser = argparse.ArgumentParser(description="POST 070b v4.1 payload to DEV Make webhook")
    parser.add_argument("asset_id", help="Submission Assets record id")
    parser.add_argument("--webhook-url", default=None, help="Override MAKE_DEV_UPLOAD_WEBHOOK_URL")
    parser.add_argument("--target-record-id", default=None, help="Video Feedback record id")
    parser.add_argument("--scenario-id", default=None, help="C-020 scenario id (artifact metadata)")
    parser.add_argument("--submission-id", default=None, help="Submission id (artifact metadata)")
    parser.add_argument(
        "--out",
        default=None,
        help="Save result JSON (default _preview/c013-dev-make-webhook-<assetId>.json)",
    )
    args = parser.parse_args()

    load_env()
    webhook_url = (args.webhook_url or os.getenv("MAKE_DEV_UPLOAD_WEBHOOK_URL") or "").strip()
    if not webhook_url:
        raise SystemExit(
            "ERROR: set MAKE_DEV_UPLOAD_WEBHOOK_URL in tools/airtable/.env "
            "or pass --webhook-url (copy from Make module 1 while Run once is waiting)"
        )

    tok = token()
    asset = fetch_asset(tok, args.asset_id)
    fields = asset.get("fields") or {}

    upload_status = fields.get("Upload Status")
    if upload_status not in {"Pending Link", "Processing", "Uploaded"}:
        print(f"WARNING: Upload Status={upload_status!r} (expected Pending Link for first upload)")

    vf_links = fields.get("Video Feedback") or []
    target_id = args.target_record_id or (vf_links[0] if vf_links else "")
    if not target_id:
        raise SystemExit(
            "ERROR: no Video Feedback link on asset — pass --target-record-id or wait for 013 chain"
        )

    submission_links = fields.get("Submission - Linked") or []
    submission_id = args.submission_id or (submission_links[0] if submission_links else None)

    payload = build_payload(
        args.asset_id,
        target_record_id=target_id,
        submission_id=submission_id,
    )

    status_code, response_text = post_webhook(webhook_url, payload)

    result = {
        "script": "c013_dev_make_webhook_post.py",
        "probedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "baseId": DEV_BASE,
        "scenarioId": args.scenario_id,
        "submissionId": submission_id,
        "assetId": args.asset_id,
        "targetRecordId": target_id,
        "preflight": {
            "uploadStatus": upload_status,
            "attachmentPresent": bool(fields.get("Airtable Attachment")),
        },
        "webhookPayload": payload,
        "makeResponse": {
            "statusCode": status_code,
            "bodyPreview": response_text,
        },
        "pass": 200 <= status_code < 300,
    }

    out = args.out or f"_preview/c013-dev-make-webhook-{args.asset_id}.json"
    out_path = HERE / out
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")

    print(json.dumps({k: v for k, v in result.items() if k != "webhookPayload"}, indent=2))
    print(f"\nwritten={out_path}")
    if not result["pass"]:
        raise SystemExit(f"ERROR: Make webhook returned HTTP {status_code}")


if __name__ == "__main__":
    main()
