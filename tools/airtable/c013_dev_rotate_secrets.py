#!/usr/bin/env python3
"""C-013-SEC — Rotate DEV Lambda upload secrets (local + AWS).

Rotates UPLOAD_WEBHOOK_SECRET and optionally AIRTABLE_TOKEN.
Updates Lambda env on 127si-upload-asset-dev and tools/airtable/.env.
Never commits secrets.

New Airtable PAT (manual): https://airtable.com/create/tokens
  Scopes: data.records:read, data.records:write, schema.bases:read
  Base: DEV appTetnuCZlCZdTCT
  Paste one line into tools/airtable/.env.new-token (gitignored), then run with --new-token-file.

Usage:
  python c013_dev_rotate_secrets.py --confirm-write
  python c013_dev_rotate_secrets.py --confirm-write --new-token-file .env.new-token
  python c013_dev_rotate_secrets.py --confirm-write --verify-asset rec9Pk14BJjFuNpf7
"""

from __future__ import annotations

import argparse
import json
import os
import re
import secrets
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

from dotenv import dotenv_values, load_dotenv

HERE = Path(__file__).parent
ENV_PATH = HERE / ".env"
FUNCTION_NAME = os.getenv("LAMBDA_FUNCTION_NAME", "127si-upload-asset-dev")
REGION = os.getenv("AWS_REGION", "us-east-2")
DEV_BASE = "appTetnuCZlCZdTCT"


def aws_json(args: list[str]) -> dict:
    os.environ.pop("AWS_PROFILE", None)
    cmd = ["aws", *args, "--region", REGION, "--output", "json"]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f"aws failed: {(r.stderr or r.stdout)[:800]}")
    return json.loads(r.stdout)


def read_new_token(path: Path | None) -> str | None:
    if not path:
        return None
    if not path.exists():
        raise SystemExit(f"ERROR: token file not found: {path}")
    text = path.read_text(encoding="utf-8").strip()
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("pat"):
            return line
        if "=" in line:
            _, val = line.split("=", 1)
            val = val.strip().strip('"')
            if val.startswith("pat"):
                return val
    raise SystemExit(f"ERROR: no pat... token in {path}")


def upsert_env_line(lines: list[str], key: str, value: str) -> list[str]:
    pattern = re.compile(rf"^\s*{re.escape(key)}=")
    out = [ln for ln in lines if not pattern.match(ln)]
    if out and out[-1].strip():
        out.append("")
    out.append(f"{key}={value}")
    return out


def write_env_updates(
    *,
    webhook_secret: str,
    function_url: str | None,
    airtable_token: str | None,
) -> None:
    existing = ENV_PATH.read_text(encoding="utf-8").splitlines() if ENV_PATH.exists() else []
    lines = existing[:]
    lines = upsert_env_line(lines, "UPLOAD_WEBHOOK_SECRET", webhook_secret)
    if function_url:
        lines = upsert_env_line(lines, "LAMBDA_FUNCTION_URL", function_url.rstrip("/"))
    lines = upsert_env_line(lines, "LAMBDA_FUNCTION_NAME", FUNCTION_NAME)
    if airtable_token:
        lines = upsert_env_line(lines, "AIRTABLE_TOKEN", airtable_token)
        lines = upsert_env_line(lines, "AIRTABLE_API_TOKEN", airtable_token)
    ENV_PATH.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def build_lambda_env(token: str, webhook_secret: str) -> dict:
    return {
        "AIRTABLE_BASE_ID": DEV_BASE,
        "AIRTABLE_TOKEN": token,
        "AIRTABLE_API_TOKEN": token,
        "S3_BUCKET": "shooting-challenge-assets",
        "ENVIRONMENT": "DEV",
        "ALLOW_ROUTE_KEYS": "video_feedback",
        "SEASON_SLUG": "2026-2027",
        "CHALLENGE_SLUG": "shooting-challenge",
        "UPLOAD_WEBHOOK_SECRET": webhook_secret,
    }


def update_lambda_env(env_vars: dict) -> None:
    payload = {"Variables": env_vars}
    env_file = HERE / "_preview" / "lambda-env-rotation.json"
    env_file.parent.mkdir(parents=True, exist_ok=True)
    env_file.write_text(json.dumps(payload) + "\n", encoding="utf-8")
    aws_json(
        [
            "lambda",
            "update-function-configuration",
            "--function-name",
            FUNCTION_NAME,
            "--environment",
            f"file://{env_file.as_posix()}",
        ]
    )
    subprocess.run(
        ["aws", "lambda", "wait", "function-updated", "--function-name", FUNCTION_NAME, "--region", REGION],
        check=True,
    )


def function_url() -> str:
    try:
        return aws_json(["lambda", "get-function-url-config", "--function-name", FUNCTION_NAME])["FunctionUrl"]
    except SystemExit:
        raise SystemExit("ERROR: Lambda Function URL not configured")


def verify_http(asset_id: str, webhook_secret: str, url: str) -> dict:
    body_obj = {
        "sourceName": "Airtable Upload Engine",
        "automationNumber": "070b",
        "sentAtIso": "2026-07-09T23:30:00.000Z",
        "routeKey": "video_feedback",
        "uploadDestination": "Video Feedback",
        "sourceTable": "Submission Assets",
        "submissionAssetRecordId": asset_id,
        "targetTable": "Video Feedback",
        "targetRecordId": "",
    }
    body = json.dumps(body_obj).encode()
    post_url = url.rstrip("/") + "/"

    def post(secret: str | None = None, wrong: bool = False) -> tuple[int, dict]:
        headers = {"Content-Type": "application/json"}
        if wrong:
            headers["X-Upload-Secret"] = "wrong-value"
        elif secret:
            headers["X-Upload-Secret"] = secret
        req = urllib.request.Request(post_url, data=body, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=180) as resp:
                txt = resp.read().decode()
                return resp.status, json.loads(txt) if txt else {}
        except urllib.error.HTTPError as exc:
            txt = exc.read().decode()
            try:
                parsed = json.loads(txt)
            except json.JSONDecodeError:
                parsed = {"errorOut": txt[:300]}
            return exc.code, parsed

    missing_code, missing_body = post()
    wrong_code, wrong_body = post(wrong=True)
    ok_code, ok_body = post(secret=webhook_secret)
    return {
        "missing_secret": {
            "statusCode": missing_code,
            "actionOut": missing_body.get("actionOut"),
        },
        "wrong_secret": {
            "statusCode": wrong_code,
            "actionOut": wrong_body.get("actionOut"),
        },
        "correct_secret": {
            "statusCode": ok_code,
            "actionOut": ok_body.get("actionOut"),
            "statusOut": ok_body.get("statusOut"),
        },
        "pass": missing_code == 401 and wrong_code == 401 and ok_code == 200,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Rotate DEV Lambda upload secrets")
    parser.add_argument("--confirm-write", action="store_true", help="Apply rotation (required)")
    parser.add_argument(
        "--new-token-file",
        default=None,
        help="Path to file with new pat... token (default: keep current .env token)",
    )
    parser.add_argument(
        "--verify-asset",
        default="rec9Pk14BJjFuNpf7",
        help="Asset id for post-rotation HTTP check (idempotent skip OK)",
    )
    parser.add_argument("--out", default="_preview/c013-dev-sec-rotation.json")
    args = parser.parse_args()

    if not args.confirm_write:
        raise SystemExit("DRY-RUN — re-run with --confirm-write to rotate secrets")

    load_dotenv(ENV_PATH, override=True)
    current = dotenv_values(ENV_PATH)
    token_path = Path(args.new_token_file) if args.new_token_file else None
    new_token = read_new_token(token_path) if token_path else None
    token = new_token or current.get("AIRTABLE_TOKEN") or current.get("AIRTABLE_API_TOKEN") or ""
    if not token:
        raise SystemExit("ERROR: no AIRTABLE_TOKEN in .env and no --new-token-file provided")

    new_webhook = secrets.token_urlsafe(32)
    url = function_url()

    update_lambda_env(build_lambda_env(token, new_webhook))
    write_env_updates(webhook_secret=new_webhook, function_url=url, airtable_token=new_token)

    verify = verify_http(args.verify_asset, new_webhook, url)
    result = {
        "script": "c013_dev_rotate_secrets.py",
        "functionName": FUNCTION_NAME,
        "region": REGION,
        "airtableTokenRotated": bool(new_token),
        "webhookSecretRotated": True,
        "environmentTypoFixed": True,
        "verifyAssetId": args.verify_asset,
        "verifyHttp": verify,
    }
    out_path = HERE / args.out
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")

    print(json.dumps({k: v for k, v in result.items() if k != "verifyHttp"}, indent=2))
    print(json.dumps({"verifyHttp": verify}, indent=2))
    print(f"written={out_path}")
    if not verify["pass"]:
        raise SystemExit("ERROR: post-rotation HTTP verify failed")
    if not new_token:
        print("\nNOTE: AIRTABLE_TOKEN unchanged — add --new-token-file after creating new PAT in Airtable UI.")


if __name__ == "__main__":
    main()
