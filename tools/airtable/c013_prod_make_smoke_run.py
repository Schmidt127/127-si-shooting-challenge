#!/usr/bin/env python3
"""C-013 PROD Make webhook smoke orchestrator (Schmidt Testing only).

Runs manual Make webhook tests when MAKE_UPLOAD_WEBHOOK_URL_PROD is configured.
070b stays OFF.

Usage:
  python c013_prod_make_smoke_run.py preflight
  python c013_prod_make_smoke_run.py upload --asset-id recGQ8EjAMz3bEBiW
  python c013_prod_make_smoke_run.py idempotency --asset-id recGQ8EjAMz3bEBiW
  python c013_prod_make_smoke_run.py invalid-route --asset-id recGQ8EjAMz3bEBiW
  python c013_prod_make_smoke_run.py all --asset-id recGQ8EjAMz3bEBiW
  python c013_prod_make_smoke_run.py reset-trigger --asset-id recGQ8EjAMz3bEBiW
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

import requests
from dotenv import load_dotenv

REPO = Path(__file__).resolve().parents[2]
HERE = Path(__file__).parent
PROD = "appn84sqPw03zEbTT"
ENR = "recgP9qZYjAhE7NXm"
DEFAULT_ASSET = "recGQ8EjAMz3bEBiW"
TABLE = "Submission Assets"


def load_env() -> dict[str, str]:
    load_dotenv(HERE / ".env", override=False)
    load_dotenv(REPO / "web" / ".env.local", override=True)
    session_path = HERE / "_preview" / "c013-prod-deploy-session.local.json"
    status: dict[str, str] = {}
    if session_path.exists():
        session = json.loads(session_path.read_text(encoding="utf-8"))
        for key in ("UPLOAD_WEBHOOK_SECRET_PROD", "LAMBDA_FUNCTION_URL_PROD", "MAKE_UPLOAD_WEBHOOK_URL_PROD"):
            if session.get(key):
                os.environ[key] = session[key]
    for key in ("LAMBDA_FUNCTION_URL_PROD", "UPLOAD_WEBHOOK_SECRET_PROD", "MAKE_UPLOAD_WEBHOOK_URL_PROD"):
        status[key] = "CONFIGURED" if (os.getenv(key) or "").strip() else "MISSING"
    return status


def token() -> str:
    t = os.getenv("AIRTABLE_PROD_TOKEN") or os.getenv("AIRTABLE_API_TOKEN") or os.getenv("AIRTABLE_TOKEN") or ""
    if not t:
        raise SystemExit("Missing PROD Airtable token")
    return t


def api(rid: str) -> str:
    return f"https://api.airtable.com/v0/{PROD}/{quote(TABLE, safe='')}/{rid}"


def get_asset(tok: str, asset_id: str) -> dict:
    r = requests.get(api(asset_id), headers={"Authorization": f"Bearer {tok}"}, timeout=120)
    r.raise_for_status()
    return r.json()


def patch_asset(tok: str, asset_id: str, fields: dict) -> None:
    r = requests.patch(
        api(asset_id),
        headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json"},
        json={"fields": fields, "typecast": True},
        timeout=120,
    )
    if not r.ok:
        raise SystemExit(f"patch failed: {r.status_code} {r.text[:500]}")


def parse_probe_snapshot(probe: dict | None) -> dict:
    """Normalize _probe_c013_asset_storage_fields.py JSON for smoke-runner checks.

    The probe writes `submissionAsset` (not `recordProbe`). Accept both keys for
    backward compatibility with older smoke artifacts.
    """
    if not probe:
        return {
            "allPass": None,
            "storageKey": "",
            "fileContentHash": "",
            "uploadStatus": "",
            "checks": None,
            "summary": None,
            "error": "empty_probe",
        }

    if probe.get("error"):
        return {
            "allPass": False,
            "storageKey": "",
            "fileContentHash": "",
            "uploadStatus": "",
            "checks": None,
            "summary": probe,
            "error": probe.get("error"),
        }

    node = probe.get("submissionAsset") or probe.get("recordProbe") or {}
    fields = node.get("fields") or {}
    verification = node.get("writebackVerification") or {}
    return {
        "allPass": verification.get("allPass"),
        "storageKey": fields.get("Storage Key") or "",
        "fileContentHash": fields.get("File Content Hash") or "",
        "uploadStatus": fields.get("Upload Status") or "",
        "checks": verification.get("checks"),
        "summary": node,
        "error": None,
    }


def probe_asset(asset_id: str) -> dict:
    env = os.environ.copy()
    env["WAVE7_PROBE_BASE"] = PROD
    out = HERE / "_preview" / f"c013-prod-make-probe-{asset_id}.json"
    proc = subprocess.run(
        [sys.executable, str(HERE / "_probe_c013_asset_storage_fields.py"), "--record-id", asset_id, "--out", str(out)],
        cwd=str(HERE),
        env=env,
        capture_output=True,
        text=True,
    )
    if out.exists():
        return json.loads(out.read_text(encoding="utf-8"))
    return {
        "error": "probe_output_missing",
        "stderr": proc.stderr[:500],
        "exitCode": proc.returncode,
    }


def run_webhook_post(asset_id: str, *, route_key: str = "video_feedback", out_suffix: str) -> dict:
    webhook = (os.getenv("MAKE_UPLOAD_WEBHOOK_URL_PROD") or "").strip()
    if not webhook:
        return {"pass": False, "blocked": True, "reason": "MAKE_UPLOAD_WEBHOOK_URL_PROD missing"}
    out = HERE / "_preview" / f"c013-prod-make-{out_suffix}-{asset_id}.json"
    cmd = [
        sys.executable,
        str(HERE / "c013_prod_make_webhook_post.py"),
        asset_id,
        "--route-key",
        route_key,
        "--out",
        str(out.relative_to(REPO)).replace("\\", "/"),
    ]
    proc = subprocess.run(cmd, cwd=str(HERE), capture_output=True, text=True)
    if out.exists():
        data = json.loads(out.read_text(encoding="utf-8"))
        data["exitCode"] = proc.returncode
        return data
    return {"pass": False, "exitCode": proc.returncode, "stderr": proc.stderr[:800]}


TRIGGER_RESET_FIELDS = {
    "Upload Status": "Pending Link",
    "Send to Make Trigger": False,
    "Upload Error": "",
    "Upload Claim Run ID": "",
    "Processing Started At": None,
}

FULL_UPLOAD_RESET_FIELDS = {
    **TRIGGER_RESET_FIELDS,
    "Canonical File URL": "",
    "Storage Key": "",
    "File Content Hash": "",
    "File Hash Algorithm": "",
    "File Size Bytes": None,
    "File MIME Type": "",
    "Uploaded At": None,
}


def reset_for_trigger(tok: str, asset_id: str) -> dict:
    """Reset Schmidt fixture for 070b Airtable trigger test; preserve canonical/hash."""
    before = get_asset(tok, asset_id)["fields"]
    patch_asset(tok, asset_id, TRIGGER_RESET_FIELDS)
    after = get_asset(tok, asset_id)["fields"]
    return {
        "mode": "trigger_only",
        "assetId": asset_id,
        "uploadStatus": after.get("Upload Status"),
        "sendToMakeTrigger": after.get("Send to Make Trigger"),
        "uploadErrorBlank": not (after.get("Upload Error") or "").strip(),
        "canonicalPreserved": (before.get("Canonical File URL") or "") == (after.get("Canonical File URL") or ""),
        "storageKeyPreserved": (before.get("Storage Key") or "") == (after.get("Storage Key") or ""),
        "hashPreserved": (before.get("File Content Hash") or "") == (after.get("File Content Hash") or ""),
        "googleDriveBlank": not (after.get("Google Drive File URL") or "").strip()
        and not (after.get("Google Drive File ID") or "").strip(),
    }


def reset_for_make_upload(tok: str, asset_id: str) -> dict:
    """Reset Schmidt fixture to Pending Link for primary Make upload test."""
    patch_asset(tok, asset_id, FULL_UPLOAD_RESET_FIELDS)
    after = get_asset(tok, asset_id)["fields"]
    return {
        "mode": "full_upload",
        "uploadStatus": after.get("Upload Status"),
        "sendToMakeTrigger": after.get("Send to Make Trigger"),
        "storageKeyBlank": not (after.get("Storage Key") or "").strip(),
    }


def cmd_reset_trigger(args: argparse.Namespace) -> None:
    load_env()
    result = {
        "phase": "reset_trigger",
        "probedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        **reset_for_trigger(token(), args.asset_id),
    }
    result["pass"] = (
        result["uploadStatus"] == "Pending Link"
        and result["sendToMakeTrigger"] is False
        and result["uploadErrorBlank"]
        and result["canonicalPreserved"]
        and result["storageKeyPreserved"]
        and result["hashPreserved"]
        and result["googleDriveBlank"]
    )
    out = HERE / "_preview" / "c013-prod-reset-trigger.json"
    out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))
    if not result["pass"]:
        raise SystemExit(1)


def cmd_preflight(args: argparse.Namespace) -> None:
    load_env()
    tok = token()
    asset_id = args.asset_id
    asset = get_asset(tok, asset_id)
    fields = asset.get("fields") or {}
    enr = fields.get("Enrollment - Linked") or []
    script_path = REPO / "airtable/automations/shooting-challenge/070b-email-notifications-and-external-handoffs-send-video-asset-payload-to-make.js"
    script_text = script_path.read_text(encoding="utf-8")
    result = {
        "phase": "preflight",
        "probedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "secureVariables": load_env(),
        "assetId": asset_id,
        "enrollmentOk": ENR in enr,
        "uploadStatus": fields.get("Upload Status"),
        "uploadDestination": fields.get("Upload Destination"),
        "sendToMakeTrigger": fields.get("Send to Make Trigger"),
        "videoFeedbackLinked": bool(fields.get("Video Feedback")),
        "attachmentPresent": bool(fields.get("Airtable Attachment")),
        "scriptVersionOk": 'version: "v4.2"' in script_text,
        "automation070bState": "OFF (manual confirmation required)",
        "makeScenario": {
            "name": "Shooting Challenge - GAME - Upload Engine - Lambda - v1",
            "expectedState": "OFF",
            "built": (os.getenv("MAKE_UPLOAD_WEBHOOK_URL_PROD") or "").strip() != "",
        },
        "pass": ENR in enr and fields.get("Upload Destination") == "Video Feedback" and 'version: "v4.2"' in script_text,
    }
    out = HERE / "_preview" / "c013-prod-make-preflight.json"
    out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))


def cmd_upload(args: argparse.Namespace) -> None:
    load_env()
    tok = token()
    asset_id = args.asset_id
    if args.reset:
        reset_for_make_upload(tok, asset_id)
        time.sleep(1)
    webhook_result = run_webhook_post(asset_id, out_suffix="upload")
    time.sleep(2)
    probe_raw = probe_asset(asset_id)
    probe = parse_probe_snapshot(probe_raw)
    lambda_val = (webhook_result.get("makeResponse") or {}).get("lambdaValidation") or {}
    result = {
        "phase": "make_upload",
        "assetId": asset_id,
        "webhook": webhook_result,
        "probe": probe,
        "lambdaAllPass": lambda_val.get("allPass"),
        "pass": (
            webhook_result.get("pass") is True
            and probe.get("allPass") is True
            and lambda_val.get("actionOut") == "uploaded"
            and lambda_val.get("allPass") is True
        ),
    }
    _write_audit(result, "upload")


def cmd_idempotency(args: argparse.Namespace) -> None:
    load_env()
    asset_id = args.asset_id
    before = parse_probe_snapshot(probe_asset(asset_id))
    webhook_result = run_webhook_post(asset_id, out_suffix="idempotency")
    time.sleep(1)
    after = parse_probe_snapshot(probe_asset(asset_id))
    sk_before = before.get("storageKey") or ""
    sk_after = after.get("storageKey") or ""
    hash_before = before.get("fileContentHash") or ""
    hash_after = after.get("fileContentHash") or ""
    lambda_val = (webhook_result.get("makeResponse") or {}).get("lambdaValidation") or {}
    result = {
        "phase": "make_idempotency",
        "assetId": asset_id,
        "webhook": webhook_result,
        "probeBefore": {"storageKey": sk_before, "fileContentHash": hash_before},
        "probeAfter": {"storageKey": sk_after, "fileContentHash": hash_after},
        "storageKeyUnchanged": sk_before == sk_after and bool(sk_before),
        "hashUnchanged": hash_before == hash_after and bool(hash_before),
        "actionOut": lambda_val.get("actionOut"),
        "pass": webhook_result.get("pass") is True and lambda_val.get("actionOut") == "skipped_already_uploaded",
    }
    _write_audit(result, "idempotency")


def cmd_invalid_route(args: argparse.Namespace) -> None:
    load_env()
    tok = token()
    asset_id = args.asset_id
    before_fields = get_asset(tok, asset_id)["fields"]
    sk_before = before_fields.get("Storage Key") or ""
    status_before = before_fields.get("Upload Status")
    webhook_result = run_webhook_post(asset_id, route_key="not_a_route", out_suffix="invalid-route")
    time.sleep(1)
    after_fields = get_asset(tok, asset_id)["fields"]
    sk_after = after_fields.get("Storage Key") or ""
    status_after = after_fields.get("Upload Status")
    lambda_val = (webhook_result.get("makeResponse") or {}).get("lambdaValidation") or {}
    action_out = lambda_val.get("actionOut")
    # Lambda process_with_error_writeback sets Upload Status=Error on UploadError.
    upload_status_error_writeback_expected = action_out == "error_invalid_route" and status_after == "Error"
    result = {
        "phase": "make_invalid_route",
        "assetId": asset_id,
        "webhook": webhook_result,
        "storageKeyUnchanged": sk_before == sk_after,
        "uploadStatusBefore": status_before,
        "uploadStatusAfter": status_after,
        "uploadStatusUnchanged": status_before == status_after,
        "uploadStatusErrorWritebackExpected": upload_status_error_writeback_expected,
        "actionOut": action_out,
        "pass": sk_before == sk_after and action_out not in ("uploaded", None),
        "note": (
            "Upload Status may change to Error — expected Lambda error writeback on invalid route; "
            "canonical/hash fields must remain unchanged."
        ),
    }
    _write_audit(result, "invalid-route")


def _write_audit(result: dict, suffix: str) -> None:
    out = HERE / "_preview" / f"c013-prod-make-smoke-{suffix}.json"
    out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))


def cmd_all(args: argparse.Namespace) -> None:
    load_env()
    vars_status = load_env()
    blocked = vars_status.get("MAKE_UPLOAD_WEBHOOK_URL_PROD") == "MISSING"
    cmd_preflight(args)
    summary = {
        "phase": "all",
        "probedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "secureVariables": vars_status,
        "blocked": blocked,
        "upload": None,
        "idempotency": None,
        "invalidRoute": None,
        "overallPass": False,
    }
    if blocked:
        summary["reason"] = "MAKE_UPLOAD_WEBHOOK_URL_PROD missing — build Make scenario first"
        out = REPO / "docs/audits/C-013-prod-make-smoke-result-2026-07-11.json"
        out.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(summary, indent=2))
        raise SystemExit(2)
    if args.reset:
        reset_for_make_upload(token(), args.asset_id)
        time.sleep(1)
    for name, fn in (("upload", cmd_upload), ("idempotency", cmd_idempotency), ("invalidRoute", cmd_invalid_route)):
        try:
            fn(args)
            p = HERE / "_preview" / f"c013-prod-make-smoke-{name.replace('Route', '-route') if name != 'invalidRoute' else 'invalid-route'}.json"
            if name == "upload":
                p = HERE / "_preview" / "c013-prod-make-smoke-upload.json"
            elif name == "idempotency":
                p = HERE / "_preview" / "c013-prod-make-smoke-idempotency.json"
            else:
                p = HERE / "_preview" / "c013-prod-make-smoke-invalid-route.json"
            if p.exists():
                summary[name] = json.loads(p.read_text(encoding="utf-8"))
        except SystemExit:
            summary[name] = {"pass": False}
    summary["overallPass"] = all((summary.get(k) or {}).get("pass") for k in ("upload", "idempotency", "invalidRoute"))
    out = REPO / "docs/audits/C-013-prod-make-smoke-result-2026-07-11.json"
    out.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2))
    if not summary["overallPass"]:
        raise SystemExit(1)


def main() -> None:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="cmd", required=True)
    p_reset = sub.add_parser("reset-trigger")
    p_reset.add_argument("--asset-id", default=DEFAULT_ASSET)
    p_reset.set_defaults(func=cmd_reset_trigger)

    for name in ("preflight", "upload", "idempotency", "invalid-route", "all"):
        p = sub.add_parser(name.replace("-", "_") if name == "invalid-route" else name)
        p.add_argument("--asset-id", default=DEFAULT_ASSET)
        p.add_argument(
            "--reset",
            action="store_true",
            help="Full upload reset (clears canonical/hash) before Make webhook upload test",
        )
        p.set_defaults(func=globals()[f"cmd_{name.replace('-', '_')}"])
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
