#!/usr/bin/env python3
"""POST 070a homework_completion JSON to DEV Make Upload Engine webhook.

070a stays OFF — simulates what automation 070a will send to Make.

Usage:
  # Make scenario → Run once, then:
  python c013_dev_make_homework_webhook_post.py recXXXXXXXXXXXXXX

Env (never commit):
  MAKE_DEV_UPLOAD_WEBHOOK_URL=<from Make module 1 Custom webhook>
  AIRTABLE_TOKEN or AIRTABLE_API_TOKEN — fetch Homework Completions link
"""

from __future__ import annotations

import argparse
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

import requests
from dotenv import load_dotenv

HERE = Path(__file__).parent
DEV_BASE = "appTetnuCZlCZdTCT"
TABLE = "Submission Assets"
ROUTE_KEY = "homework_completion"
AUTOMATION_NUMBER = "070a"
UPLOAD_DESTINATION = "Homework Completions"
TARGET_TABLE = "Homework Completions"
TARGET_LINK_FIELD = "Homework Completions"


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


def build_homework_payload(
    asset_id: str,
    *,
    target_record_id: str | None,
    submission_id: str | None = None,
    sent_at_iso: str | None = None,
) -> dict:
    """Build 070a v4.1 minimal webhook payload (pure — safe for unit tests)."""
    payload = {
        "sourceName": "Airtable Upload Engine",
        "automationNumber": AUTOMATION_NUMBER,
        "sentAtIso": sent_at_iso
        or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        "routeKey": ROUTE_KEY,
        "uploadDestination": UPLOAD_DESTINATION,
        "sourceTable": TABLE,
        "submissionAssetRecordId": asset_id,
        "targetTable": TARGET_TABLE,
        "targetRecordId": target_record_id or "",
    }
    if submission_id:
        payload["submissionId"] = submission_id
    return payload


def post_webhook(url: str, payload: dict) -> "requests.Response":
    return requests.post(
        url,
        headers={"Content-Type": "application/json"},
        json=payload,
        timeout=180,
    )


def body_preview(text: str, *, limit: int = 2000) -> str:
    raw = text or ""
    if len(raw) <= limit:
        return raw
    return raw[:limit] + f"...[truncated {len(raw) - limit} chars]"


def _salvage_truncated_json(text: str) -> dict:
    """Best-effort extract of key fields when body was cut mid-JSON."""
    salvaged: dict = {"rawText": text[:500], "_salvaged": True}
    for key in ("actionOut", "routeKey", "automationNumber", "statusOut", "environment"):
        m = re.search(rf'"{key}"\s*:\s*"([^"]+)"', text)
        if m:
            salvaged[key] = m.group(1)
    if re.search(r'"ok"\s*:\s*true', text, flags=re.IGNORECASE):
        salvaged["ok"] = True
    elif re.search(r'"ok"\s*:\s*false', text, flags=re.IGNORECASE):
        salvaged["ok"] = False
    return salvaged


def parse_response_body(response: "requests.Response") -> dict:
    """Parse Make/Lambda body from a full requests.Response (never pre-truncate)."""
    text = (response.text or "").strip()
    if not text:
        return {}

    # 1) Prefer requests JSON decode
    try:
        data = response.json()
        if isinstance(data, dict):
            if isinstance(data.get("body"), str):
                try:
                    inner = json.loads(data["body"])
                    if isinstance(inner, dict):
                        return inner
                except json.JSONDecodeError:
                    pass
            return data
        if isinstance(data, str):
            text = data.strip()
    except ValueError:
        pass

    # 2) json.loads on full text
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return _salvage_truncated_json(text)

    # 3) One-level double-decode (API Gateway / Make wrapper)
    if isinstance(data, dict) and isinstance(data.get("body"), str):
        try:
            inner = json.loads(data["body"])
            if isinstance(inner, dict):
                return inner
        except json.JSONDecodeError:
            pass
    if isinstance(data, dict):
        return data
    if isinstance(data, str):
        try:
            inner = json.loads(data)
            if isinstance(inner, dict):
                return inner
        except json.JSONDecodeError:
            return {"rawText": data[:500]}
    return {"rawText": text[:500]}


def parse_make_body(body_text: str) -> dict:
    """Parse body text (unit-test helper; production path uses parse_response_body)."""
    text = (body_text or "").strip()
    if not text:
        return {}
    if text == "Accepted":
        return {"rawText": "Accepted"}
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return _salvage_truncated_json(text)
    if isinstance(data, dict) and isinstance(data.get("body"), str):
        try:
            inner = json.loads(data["body"])
            if isinstance(inner, dict):
                return inner
        except json.JSONDecodeError:
            pass
    return data if isinstance(data, dict) else {"rawText": text[:500]}


UPLOAD_OK_ACTIONS = frozenset(
    {
        "uploaded",
        "skipped_already_uploaded",
        "already_uploaded",  # alias tolerated if Lambda/Make ever emit it
    }
)
SUCCESS_STATUS = frozenset({"success", "skipped"})


def evaluate_make_response(status_code: int, body_text: str, *, parsed: dict | None = None) -> dict:
    text = (body_text or "").strip()
    ok_http = 200 <= status_code < 300
    accepted_async = ok_http and text == "Accepted"
    parsed_body = parsed if parsed is not None else parse_make_body(text)

    if accepted_async:
        return {
            "httpOk": ok_http,
            "acceptedAsync": True,
            "ok": None,
            "statusOut": None,
            "actionOut": None,
            "routeKey": None,
            "automationNumber": None,
            "parsedBody": parsed_body,
            "pass": True,
            "note": "Make returned plain Accepted — verify Airtable writeback separately",
        }

    action = str(parsed_body.get("actionOut") or "")
    route = str(parsed_body.get("routeKey") or "")
    automation = str(parsed_body.get("automationNumber") or "")
    status_out = str(parsed_body.get("statusOut") or "")
    ok_flag = parsed_body.get("ok")
    upload_ok = action in UPLOAD_OK_ACTIONS
    status_ok = status_out in SUCCESS_STATUS
    # Require exact route/automation on sync Lambda JSON (no silent defaults).
    route_ok = route == ROUTE_KEY
    auto_ok = automation == AUTOMATION_NUMBER
    ok_ok = ok_flag is True or (ok_flag is None and upload_ok and status_ok)
    sync_pass = ok_http and ok_ok and status_ok and upload_ok and route_ok and auto_ok
    return {
        "httpOk": ok_http,
        "acceptedAsync": False,
        "ok": ok_flag if isinstance(ok_flag, bool) else None,
        "statusOut": status_out or None,
        "actionOut": action or None,
        "routeKey": route or None,
        "automationNumber": automation or None,
        "parsedBody": parsed_body,
        "pass": sync_pass,
        "note": None,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="POST 070a homework payload to DEV Make webhook")
    parser.add_argument("asset_id", help="Submission Assets record id")
    parser.add_argument("--webhook-url", default=None, help="Override MAKE_DEV_UPLOAD_WEBHOOK_URL")
    parser.add_argument("--target-record-id", default=None, help="Homework Completions record id")
    parser.add_argument("--scenario-id", default=None, help="C-020 scenario id (artifact metadata)")
    parser.add_argument("--submission-id", default=None, help="Submission id (artifact metadata)")
    parser.add_argument(
        "--out",
        default=None,
        help="Save result JSON (default _preview/c013-dev-make-homework-webhook-<assetId>.json)",
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
    destination = fields.get("Upload Destination")
    if destination not in {UPLOAD_DESTINATION, "Homework"}:
        print(
            f"WARNING: Upload Destination={destination!r} "
            f"(expected {UPLOAD_DESTINATION!r} for homework route)"
        )
    if upload_status not in {"Pending Link", "Processing", "Uploaded"}:
        print(f"WARNING: Upload Status={upload_status!r} (expected Pending Link for first upload)")

    hc_links = fields.get(TARGET_LINK_FIELD) or []
    target_id = args.target_record_id or (hc_links[0] if hc_links else "")
    if not target_id:
        raise SystemExit(
            "ERROR: no Homework Completions link on asset — pass --target-record-id "
            "or wait for 020 chain"
        )

    submission_links = fields.get("Submission - Linked") or []
    submission_id = args.submission_id or (submission_links[0] if submission_links else None)

    payload = build_homework_payload(
        args.asset_id,
        target_record_id=target_id,
        submission_id=submission_id,
    )

    status_resp = post_webhook(webhook_url, payload)
    response_text = status_resp.text or ""
    parsed = parse_response_body(status_resp)
    evaluation = evaluate_make_response(status_resp.status_code, response_text, parsed=parsed)

    result = {
        "script": "c013_dev_make_homework_webhook_post.py",
        "probedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "baseId": DEV_BASE,
        "scenarioId": args.scenario_id,
        "submissionId": submission_id,
        "assetId": args.asset_id,
        "targetRecordId": target_id,
        "routeKey": ROUTE_KEY,
        "automationNumber": AUTOMATION_NUMBER,
        "preflight": {
            "uploadStatus": upload_status,
            "uploadDestination": destination,
            "attachmentPresent": bool(fields.get("Airtable Attachment")),
            "homeworkCompletionsLink": target_id,
        },
        "webhookPayload": payload,
        "makeResponse": {
            "statusCode": status_resp.status_code,
            "bodyPreview": body_preview(response_text),
            "evaluation": evaluation,
        },
        "pass": evaluation["pass"],
    }

    out = args.out or f"_preview/c013-dev-make-homework-webhook-{args.asset_id}.json"
    out_path = HERE / out
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")

    printable = {k: v for k, v in result.items() if k != "webhookPayload"}
    print(json.dumps(printable, indent=2))
    print(f"\nwritten={out_path}")
    if not result["pass"]:
        raise SystemExit(f"ERROR: Make homework webhook failed HTTP {status_resp.status_code}")


if __name__ == "__main__":
    main()
