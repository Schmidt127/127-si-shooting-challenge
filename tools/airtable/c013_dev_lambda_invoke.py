#!/usr/bin/env python3
"""Invoke upload Lambda locally (handler) or via AWS CLI."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

from dotenv import load_dotenv

REPO = Path(__file__).resolve().parents[2]
LAMBDA_ROOT = REPO / "lambda" / "upload-asset"
HERE = Path(__file__).parent

FUNCTION_NAME = os.getenv("LAMBDA_FUNCTION_NAME", "127si-upload-asset-dev")


def load_env() -> None:
    load_dotenv(HERE / ".env", override=True)
    web_env = REPO / "web" / ".env.local"
    if web_env.exists():
        load_dotenv(web_env, override=True)


def build_payload(
    asset_id: str,
    target_record_id: str | None,
    *,
    upload_destination: str = "Video Feedback",
) -> dict:
    if upload_destination == "Homework Completions":
        return {
            "sourceName": "Airtable Upload Engine",
            "automationNumber": "070a",
            "sentAtIso": "2026-07-08T16:00:00.000Z",
            "routeKey": "homework_completion",
            "uploadDestination": "Homework Completions",
            "sourceTable": "Submission Assets",
            "submissionAssetRecordId": asset_id,
            "targetTable": "Homework Completions",
            "targetRecordId": target_record_id or "",
        }
    return {
        "sourceName": "Airtable Upload Engine",
        "automationNumber": "070b",
        "sentAtIso": "2026-07-08T16:00:00.000Z",
        "routeKey": "video_feedback",
        "uploadDestination": "Video Feedback",
        "sourceTable": "Submission Assets",
        "submissionAssetRecordId": asset_id,
        "targetTable": "Video Feedback",
        "targetRecordId": target_record_id or "",
    }


def fetch_upload_destination(asset_id: str) -> str:
    import requests

    token = os.getenv("AIRTABLE_TOKEN") or os.getenv("AIRTABLE_API_TOKEN") or ""
    if not token:
        return "Video Feedback"
    url = f"https://api.airtable.com/v0/appTetnuCZlCZdTCT/Submission%20Assets/{asset_id}"
    resp = requests.get(url, headers={"Authorization": f"Bearer {token}"}, timeout=120)
    if not resp.ok:
        return "Video Feedback"
    return (resp.json().get("fields") or {}).get("Upload Destination") or "Video Feedback"


def invoke_local(payload: dict) -> dict:
    sys.path.insert(0, str(LAMBDA_ROOT))
    from handler import lambda_handler

    headers: dict[str, str] = {"content-type": "application/json"}
    secret = os.getenv("UPLOAD_WEBHOOK_SECRET")
    if secret:
        headers["X-Upload-Secret"] = secret
    event = {"headers": headers, "body": json.dumps(payload)}
    resp = lambda_handler(event, None)
    body = json.loads(resp["body"])
    return {"statusCode": resp["statusCode"], "body": body}


def invoke_aws(payload: dict) -> dict:
    event_path = HERE / "_preview" / "_lambda_invoke_event.json"
    event_path.parent.mkdir(parents=True, exist_ok=True)
    headers: dict[str, str] = {"content-type": "application/json"}
    secret = os.getenv("UPLOAD_WEBHOOK_SECRET")
    if secret:
        headers["X-Upload-Secret"] = secret
    event_path.write_text(
        json.dumps({"headers": headers, "body": json.dumps(payload)}) + "\n",
        encoding="utf-8",
    )
    out_path = HERE / "_preview" / "_lambda_invoke_response.json"
    cmd = [
        "aws",
        "lambda",
        "invoke",
        "--function-name",
        FUNCTION_NAME,
        "--payload",
        f"file://{event_path.as_posix()}",
        "--cli-binary-format",
        "raw-in-base64-out",
        str(out_path),
    ]
    subprocess.run(cmd, check=True)
    raw = json.loads(out_path.read_text(encoding="utf-8"))
    if "body" in raw and isinstance(raw["body"], str):
        raw["body"] = json.loads(raw["body"])
    return raw


def invoke_function_url(payload: dict, function_url: str, secret: str | None) -> dict:
    headers = {"Content-Type": "application/json"}
    if secret:
        headers["X-Upload-Secret"] = secret
    req = urllib.request.Request(
        function_url.rstrip("/") + "/",
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            body_text = resp.read().decode("utf-8")
            body = json.loads(body_text) if body_text else {}
            return {"statusCode": resp.status, "body": body}
    except urllib.error.HTTPError as exc:
        body_text = exc.read().decode("utf-8")
        try:
            body = json.loads(body_text)
        except json.JSONDecodeError:
            body = {"errorOut": body_text}
        return {"statusCode": exc.code, "body": body}


def main() -> None:
    parser = argparse.ArgumentParser(description="Invoke DEV upload Lambda")
    parser.add_argument("asset_id", help="Submission Assets record id")
    parser.add_argument("--target-record-id", default=None)
    parser.add_argument("--out", default=None, help="Save result JSON")
    parser.add_argument("--aws", action="store_true", help="Invoke deployed Lambda via AWS CLI")
    parser.add_argument(
        "--function-url",
        default=None,
        help="POST to Lambda Function URL (or set LAMBDA_FUNCTION_URL in tools/airtable/.env)",
    )
    args = parser.parse_args()

    load_env()
    os.environ["AIRTABLE_BASE_ID"] = "appTetnuCZlCZdTCT"
    os.environ.setdefault("ENVIRONMENT", "DEV")
    os.environ.setdefault("ALLOW_ROUTE_KEYS", "video_feedback,homework_completion")
    os.environ.setdefault("S3_BUCKET", "shooting-challenge-assets")
    os.environ.setdefault("AWS_REGION", "us-east-2")
    if os.getenv("AWS_ACCESS_KEY_ID"):
        os.environ.pop("AWS_PROFILE", None)
    if not os.getenv("UPLOAD_WEBHOOK_SECRET"):
        raise SystemExit(
            "ERROR: UPLOAD_WEBHOOK_SECRET required in tools/airtable/.env for Lambda invoke (not committed)"
        )

    destination = fetch_upload_destination(args.asset_id)
    if destination == "Homework Completions" and not args.target_record_id:
        raise SystemExit(
            "ERROR: homework asset requires --target-record-id (Homework Completions rec id)"
        )
    payload = build_payload(args.asset_id, args.target_record_id, upload_destination=destination)
    secret = os.getenv("UPLOAD_WEBHOOK_SECRET")
    if args.function_url or os.getenv("LAMBDA_FUNCTION_URL"):
        url = args.function_url or os.getenv("LAMBDA_FUNCTION_URL")
        if not url:
            raise SystemExit("ERROR: --function-url or LAMBDA_FUNCTION_URL required")
        result = invoke_function_url(payload, url, secret)
    elif args.aws:
        result = invoke_aws(payload)
    else:
        result = invoke_local(payload)

    out = args.out or f"_preview/c013-dev-lambda-h2-proof-{args.asset_id}.json"
    out_path = HERE / out if not out.startswith("tools/") else REPO / out
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))
    print(f"\nwritten={out_path}")


if __name__ == "__main__":
    main()
