#!/usr/bin/env python3
"""C-013 PROD Lambda deployment smoke runner (Schmidt Testing only)."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import secrets
import sys
import time
import urllib.error
import urllib.request
from datetime import date
from pathlib import Path
from urllib.parse import quote

import requests
from dotenv import load_dotenv

REPO = Path(__file__).resolve().parents[2]
HERE = Path(__file__).parent
PROD = "appn84sqPw03zEbTT"
ENR = "recgP9qZYjAhE7NXm"
FIXTURE_LABEL = "C-013 PROD Lambda Smoke Test"
ATTACHMENT_URL = (
    "https://raw.githubusercontent.com/Schmidt127/127-si-shooting-challenge/"
    "master/web/public/brand/logo-circle-blue-orange.png"
)
ATTACHMENT_NAME = "BlueOrangeCircleLogo.png"
FUNCTION_NAME = "127si-upload-asset"
REGION = "us-east-2"


def load_prod_env() -> None:
    load_dotenv(HERE / ".env", override=False)
    load_dotenv(REPO / "web" / ".env.local", override=True)
    session_path = HERE / "_preview" / "c013-prod-deploy-session.local.json"
    if session_path.exists():
        session = json.loads(session_path.read_text(encoding="utf-8"))
        if session.get("UPLOAD_WEBHOOK_SECRET_PROD"):
            os.environ["UPLOAD_WEBHOOK_SECRET_PROD"] = session["UPLOAD_WEBHOOK_SECRET_PROD"]
        if session.get("LAMBDA_FUNCTION_URL_PROD"):
            os.environ["LAMBDA_FUNCTION_URL_PROD"] = session["LAMBDA_FUNCTION_URL_PROD"]
    prod_token = os.getenv("AIRTABLE_PROD_TOKEN") or os.getenv("AIRTABLE_API_TOKEN") or os.getenv("AIRTABLE_TOKEN")
    if prod_token:
        os.environ["AIRTABLE_PROD_TOKEN"] = prod_token
    if not os.getenv("UPLOAD_WEBHOOK_SECRET_PROD"):
        os.environ["UPLOAD_WEBHOOK_SECRET_PROD"] = secrets.token_urlsafe(32)


def token() -> str:
    t = os.getenv("AIRTABLE_PROD_TOKEN") or os.getenv("AIRTABLE_API_TOKEN") or os.getenv("AIRTABLE_TOKEN") or ""
    if not t:
        raise SystemExit("Missing PROD Airtable token (AIRTABLE_PROD_TOKEN or web/.env.local)")
    return t


def api(table: str, rid: str | None = None) -> str:
    p = quote(table, safe="")
    base = f"https://api.airtable.com/v0/{PROD}/{p}"
    return f"{base}/{rid}" if rid else base


def headers(tok: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


def get_rec(tok: str, table: str, rid: str) -> dict:
    r = requests.get(api(table, rid), headers=headers(tok), timeout=120)
    r.raise_for_status()
    return r.json()


def create_rec(tok: str, table: str, fields: dict) -> dict:
    r = requests.post(
        api(table),
        headers=headers(tok),
        json={"fields": fields, "typecast": True},
        timeout=120,
    )
    if not r.ok:
        raise SystemExit(f"create {table} failed: {r.status_code} {r.text[:800]}")
    return r.json()


def patch_rec(tok: str, table: str, rid: str, fields: dict) -> dict:
    r = requests.patch(
        api(table, rid),
        headers=headers(tok),
        json={"fields": fields, "typecast": True},
        timeout=120,
    )
    if not r.ok:
        raise SystemExit(f"patch {table}/{rid} failed: {r.status_code} {r.text[:800]}")
    return r.json()


def pick_week_id(tok: str) -> str:
    r = requests.get(api("Weeks"), headers=headers(tok), params={"pageSize": 100}, timeout=120)
    r.raise_for_status()
    recs = r.json().get("records") or []
    if not recs:
        raise SystemExit("no Weeks on PROD")
    best_id = recs[0]["id"]
    best_start = ""
    for rec in recs:
        start = str((rec.get("fields") or {}).get("Start Date") or "")
        if start >= best_start:
            best_start = start
            best_id = rec["id"]
    return best_id


def create_fixture(tok: str) -> dict:
    week_id = pick_week_id(tok)
    sub = create_rec(
        tok,
        "Submissions",
        {"Enrollment": [ENR], "Week": [week_id], "Activity Date": date.today().isoformat()},
    )
    sub_id = sub["id"]
    vf = create_rec(
        tok,
        "Video Feedback",
        {
            "Enrollment": [ENR],
            "Submission": [sub_id],
            "Video Feedback Key": "C013-PROD-LAMBDA-SMOKE",
            "Do Not Award XP?": True,
            "Feedback Posted?": False,
        },
    )
    vf_id = vf["id"]
    asset = create_rec(
        tok,
        "Submission Assets",
        {
            "Asset Label": FIXTURE_LABEL,
            "Submission - Linked": [sub_id],
            "Enrollment - Linked": [ENR],
            "Video Feedback": [vf_id],
            "Asset Purpose": "Video For Feedback",
            "Asset Type": "Video Feedback",
            "Asset Slot": "VIDEO",
            "Airtable Attachment": [{"url": ATTACHMENT_URL, "filename": ATTACHMENT_NAME}],
            "Send to Make Trigger": False,
        },
    )
    asset_id = asset["id"]
    patch_rec(tok, "Video Feedback", vf_id, {"Submission Asset": [asset_id]})
    # Upload Status / Upload Destination are formula-driven on PROD; wait for Pending Link.
    deadline = time.time() + 60
    upload_status = ""
    upload_destination = ""
    while time.time() < deadline:
        fields = get_rec(tok, "Submission Assets", asset_id)["fields"]
        upload_status = fields.get("Upload Status") or ""
        upload_destination = fields.get("Upload Destination") or ""
        if upload_status == "Pending Link" and upload_destination == "Video Feedback":
            break
        time.sleep(2)
    if upload_status != "Pending Link":
        patch_rec(tok, "Submission Assets", asset_id, {"Upload Status": "Pending Link"})
        time.sleep(2)
        fields = get_rec(tok, "Submission Assets", asset_id)["fields"]
        upload_status = fields.get("Upload Status") or ""
        upload_destination = fields.get("Upload Destination") or ""
    if upload_status != "Pending Link":
        raise SystemExit(
            f"fixture not Pending Link after create (status={upload_status!r}, destination={upload_destination!r})"
        )
    return {
        "submissionId": sub_id,
        "videoFeedbackId": vf_id,
        "submissionAssetId": asset_id,
        "enrollmentId": ENR,
        "fixtureLabel": FIXTURE_LABEL,
    }


def fetch_function_url() -> str:
    url = os.getenv("LAMBDA_FUNCTION_URL_PROD") or os.getenv("LAMBDA_FUNCTION_URL") or ""
    if url:
        return url.rstrip("/") + "/"
    import subprocess

    env = os.environ.copy()
    env.pop("AWS_PROFILE", None)
    out = subprocess.check_output(
        [
            "aws",
            "lambda",
            "get-function-url-config",
            "--function-name",
            FUNCTION_NAME,
            "--region",
            REGION,
            "--query",
            "FunctionUrl",
            "--output",
            "text",
        ],
        text=True,
        env=env,
    ).strip()
    if not out:
        raise SystemExit("Function URL not found")
    return out.rstrip("/") + "/"


def invoke_url(function_url: str, payload: dict, secret: str | None) -> dict:
    hdrs = {"Content-Type": "application/json"}
    if secret:
        hdrs["X-Upload-Secret"] = secret
    req = urllib.request.Request(
        function_url,
        data=json.dumps(payload).encode("utf-8"),
        headers=hdrs,
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            text = resp.read().decode("utf-8")
            body = json.loads(text) if text else {}
            return {"statusCode": resp.status, "body": body}
    except urllib.error.HTTPError as exc:
        text = exc.read().decode("utf-8")
        try:
            body = json.loads(text)
        except json.JSONDecodeError:
            body = {"errorOut": text}
        return {"statusCode": exc.code, "body": body}


def build_payload(asset_id: str, vf_id: str) -> dict:
    return {
        "sourceName": "Airtable Upload Engine",
        "automationNumber": "070b",
        "sentAtIso": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
        "routeKey": "video_feedback",
        "uploadDestination": "Video Feedback",
        "sourceTable": "Submission Assets",
        "submissionAssetRecordId": asset_id,
        "targetTable": "Video Feedback",
        "targetRecordId": vf_id,
    }


def redact_result(result: dict) -> dict:
    return json.loads(json.dumps(result))


def verify_asset_fields(fields: dict) -> dict[str, bool]:
    hash_val = str(fields.get("File Content Hash") or "")
    return {
        "uploadStatusUploaded": fields.get("Upload Status") == "Uploaded",
        "storageKeyPresent": bool(fields.get("Storage Key")),
        "canonicalUrlPresent": bool(fields.get("Canonical File URL")),
        "hashPresent": len(hash_val) == 64,
        "hashAlgorithm": fields.get("File Hash Algorithm") == "SHA-256",
        "sizePresent": isinstance(fields.get("File Size Bytes"), (int, float)) and fields.get("File Size Bytes", 0) > 0,
        "mimePresent": bool(fields.get("File MIME Type")),
        "uploadedAtPresent": bool(fields.get("Uploaded At")),
        "uploadErrorBlank": not str(fields.get("Upload Error") or "").strip(),
        "claimRunIdPresent": bool(fields.get("Upload Claim Run ID")),
        "processingStartedPresent": bool(fields.get("Processing Started At")),
        "seasonPrefix": str(fields.get("Storage Key") or "").startswith(
            "shooting-challenge/2025-2026/shooting-challenge/schmidt-testing/"
        ),
        "notDevSeasonPrefix": "2026-2027" not in str(fields.get("Storage Key") or ""),
    }


def cmd_create_fixture(args: argparse.Namespace) -> None:
    load_prod_env()
    tok = token()
    fixture = create_fixture(tok)
    out = Path(args.out) if args.out else HERE / "_preview" / "c013-prod-smoke-fixture.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(fixture, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(fixture, indent=2))


def cmd_rejection_tests(args: argparse.Namespace) -> None:
    load_prod_env()
    function_url = fetch_function_url()
    secret = os.getenv("UPLOAD_WEBHOOK_SECRET_PROD") or ""
    if not secret:
        raise SystemExit("UPLOAD_WEBHOOK_SECRET_PROD missing")
    payload = {
        "submissionAssetRecordId": "recTest00000000001",
        "routeKey": "video_feedback",
        "automationNumber": "070b",
    }
    missing = invoke_url(function_url, payload, None)
    wrong = invoke_url(function_url, payload, "invalid-secret-value")
    bad_route = invoke_url(
        function_url,
        {**payload, "routeKey": "not_a_route"},
        secret,
    )
    result = {
        "missingSecret": {
            "statusCode": missing["statusCode"],
            "actionOut": (missing.get("body") or {}).get("actionOut"),
            "pass": missing["statusCode"] == 401
            and (missing.get("body") or {}).get("actionOut") == "error_unauthorized",
        },
        "wrongSecret": {
            "statusCode": wrong["statusCode"],
            "actionOut": (wrong.get("body") or {}).get("actionOut"),
            "pass": wrong["statusCode"] == 401
            and (wrong.get("body") or {}).get("actionOut") == "error_unauthorized",
        },
        "unsupportedRoute": {
            "statusCode": bad_route["statusCode"],
            "actionOut": (bad_route.get("body") or {}).get("actionOut"),
            "pass": bad_route["statusCode"] == 400,
        },
    }
    out = Path(args.out) if args.out else HERE / "_preview" / "c013-prod-smoke-T0-rejection.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))


def cmd_upload_smoke(args: argparse.Namespace) -> None:
    load_prod_env()
    tok = token()
    fixture_path = Path(args.fixture)
    fixture = json.loads(fixture_path.read_text(encoding="utf-8"))
    asset_id = fixture["submissionAssetId"]
    vf_id = fixture["videoFeedbackId"]
    function_url = fetch_function_url()
    secret = os.getenv("UPLOAD_WEBHOOK_SECRET_PROD") or ""
    payload = build_payload(asset_id, vf_id)
    upload = invoke_url(function_url, payload, secret)
    time.sleep(2)
    asset_fields = get_rec(tok, "Submission Assets", asset_id)["fields"]
    checks = verify_asset_fields(asset_fields)
    body = upload.get("body") or {}
    if isinstance(body, dict) and "body" in body and isinstance(body["body"], str):
        try:
            body = json.loads(body["body"])
        except json.JSONDecodeError:
            pass
    storage_key = asset_fields.get("Storage Key") or ""
    s3_ok = False
    s3_meta: dict = {}
    if storage_key:
        import subprocess

        env = os.environ.copy()
        env.pop("AWS_PROFILE", None)
        try:
            meta = subprocess.check_output(
                [
                    "aws",
                    "s3api",
                    "head-object",
                    "--bucket",
                    "shooting-challenge-assets",
                    "--key",
                    storage_key,
                    "--region",
                    REGION,
                    "--output",
                    "json",
                ],
                text=True,
                env=env,
            )
            s3_meta = json.loads(meta)
            s3_ok = True
        except Exception as exc:
            s3_meta = {"error": type(exc).__name__}
    result = {
        "phase": "upload",
        "submissionAssetId": asset_id,
        "videoFeedbackId": vf_id,
        "lambdaStatusCode": upload.get("statusCode"),
        "actionOut": body.get("actionOut"),
        "statusOut": body.get("statusOut"),
        "allPass": (body.get("writebackVerification") or {}).get("allPass"),
        "environment": body.get("environment"),
        "baseId": body.get("baseId"),
        "storageKey": storage_key,
        "checks": checks,
        "pass": upload.get("statusCode") == 200
        and body.get("actionOut") == "uploaded"
        and (body.get("writebackVerification") or {}).get("allPass") is True
        and all(checks.values())
        and s3_ok,
        "s3HeadOk": s3_ok,
        "s3ContentLength": s3_meta.get("ContentLength"),
        "s3ContentType": s3_meta.get("ContentType"),
    }
    out = Path(args.out) if args.out else HERE / "_preview" / "c013-prod-smoke-T1-upload.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))


def cmd_idempotency(args: argparse.Namespace) -> None:
    load_prod_env()
    tok = token()
    fixture = json.loads(Path(args.fixture).read_text(encoding="utf-8"))
    asset_id = fixture["submissionAssetId"]
    vf_id = fixture["videoFeedbackId"]
    before = get_rec(tok, "Submission Assets", asset_id)["fields"]
    storage_key_before = before.get("Storage Key") or ""
    hash_before = before.get("File Content Hash") or ""
    function_url = fetch_function_url()
    secret = os.getenv("UPLOAD_WEBHOOK_SECRET_PROD") or ""
    retry = invoke_url(function_url, build_payload(asset_id, vf_id), secret)
    time.sleep(1)
    after = get_rec(tok, "Submission Assets", asset_id)["fields"]
    body = retry.get("body") or {}
    result = {
        "phase": "idempotency",
        "lambdaStatusCode": retry.get("statusCode"),
        "actionOut": body.get("actionOut"),
        "storageKeyUnchanged": (after.get("Storage Key") or "") == storage_key_before,
        "hashUnchanged": (after.get("File Content Hash") or "") == hash_before,
        "uploadStatusUploaded": after.get("Upload Status") == "Uploaded",
        "pass": retry.get("statusCode") == 200 and body.get("actionOut") == "skipped_already_uploaded",
    }
    out = Path(args.out) if args.out else HERE / "_preview" / "c013-prod-smoke-T2-idempotency.json"
    out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))


def cmd_error_writeback(args: argparse.Namespace) -> None:
    load_prod_env()
    tok = token()
    fixture = json.loads(Path(args.fixture).read_text(encoding="utf-8"))
    asset_id = fixture["submissionAssetId"]
    patch_rec(
        tok,
        "Submission Assets",
        asset_id,
        {
            "Upload Status": "Pending Link",
            "Airtable Attachment": None,
            "Canonical File URL": None,
            "Storage Key": None,
            "File Content Hash": None,
            "Upload Error": None,
        },
    )
    function_url = fetch_function_url()
    secret = os.getenv("UPLOAD_WEBHOOK_SECRET_PROD") or ""
    resp = invoke_url(
        function_url,
        build_payload(asset_id, fixture["videoFeedbackId"]),
        secret,
    )
    time.sleep(1)
    fields = get_rec(tok, "Submission Assets", asset_id)["fields"]
    body = resp.get("body") or {}
    result = {
        "phase": "error_writeback",
        "lambdaStatusCode": resp.get("statusCode"),
        "actionOut": body.get("actionOut"),
        "uploadStatus": fields.get("Upload Status"),
        "uploadErrorPresent": bool(str(fields.get("Upload Error") or "").strip()),
        "pass": fields.get("Upload Status") == "Error" and bool(str(fields.get("Upload Error") or "").strip()),
    }
    out = Path(args.out) if args.out else HERE / "_preview" / "c013-prod-smoke-T3-error.json"
    out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser(description="C-013 PROD Lambda smoke runner")
    sub = parser.add_subparsers(dest="cmd", required=True)
    p1 = sub.add_parser("create-fixture")
    p1.add_argument("--out", default=None)
    p1.set_defaults(func=cmd_create_fixture)
    p2 = sub.add_parser("rejection-tests")
    p2.add_argument("--out", default=None)
    p2.set_defaults(func=cmd_rejection_tests)
    p3 = sub.add_parser("upload-smoke")
    p3.add_argument("--fixture", required=True)
    p3.add_argument("--out", default=None)
    p3.set_defaults(func=cmd_upload_smoke)
    p4 = sub.add_parser("idempotency")
    p4.add_argument("--fixture", required=True)
    p4.add_argument("--out", default=None)
    p4.set_defaults(func=cmd_idempotency)
    p5 = sub.add_parser("error-writeback")
    p5.add_argument("--fixture", required=True)
    p5.add_argument("--out", default=None)
    p5.set_defaults(func=cmd_error_writeback)
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
