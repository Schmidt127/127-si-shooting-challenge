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
  python c013_prod_make_smoke_run.py reset-live-trigger --asset-id recGQ8EjAMz3bEBiW
  python c013_prod_make_smoke_run.py prepare-live-trigger --asset-id recGQ8EjAMz3bEBiW
  python c013_prod_make_smoke_run.py verify-live-trigger --asset-id recGQ8EjAMz3bEBiW
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
    # typecast=True is required for setting valid single-select names (e.g. Upload Status).
    # Never pass "" to clear a single-select — use null or omit the field; typecast would
    # create a blank select option (observed on File Hash Algorithm).
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
    "File Hash Algorithm": None,
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


ALLOWED_LIVE_ASSET = "recGQ8EjAMz3bEBiW"
EXPECTED_VIDEO_FEEDBACK = "recrvEzk8GxXfy3EE"
LIVE_PREP_OUT = "c013-prod-live-trigger-prep.json"

# Genuine Airtable → 070b → Make → Lambda live test prep: hold outside trigger
# (Upload Status=Error, Send to Make Trigger unchecked). Clears prior writeback
# so Lambda must perform a fresh upload on the next trigger. Does not call Make.
RESET_LIVE_TRIGGER_FIELDS = {
    "Upload Status": "Error",
    "Upload Error": "",
    "Send to Make Trigger": False,
    "Upload Claim Run ID": "",
    "Processing Started At": None,
    "Canonical File URL": "",
    "Storage Key": "",
    "File Content Hash": "",
    "File Hash Algorithm": None,
    "File Size Bytes": None,
    "File MIME Type": "",
    "Uploaded At": None,
    "Google Drive File URL": "",
    "Google Drive File ID": "",
}

RESET_LIVE_TRIGGER_PRESERVED = (
    "Airtable Attachment",
    "Enrollment - Linked",
    "Submission - Linked",
    "Video Feedback",
    "Upload Destination",
)

RESET_LIVE_TRIGGER_CLEARED = (
    "Canonical File URL",
    "Storage Key",
    "File Content Hash",
    "File Hash Algorithm",
    "File Size Bytes",
    "File MIME Type",
    "Uploaded At",
    "Google Drive File URL",
    "Google Drive File ID",
)

# Live 070b trigger test prep: hold the record OUTSIDE the trigger state
# (Upload Status=Error) with Send to Make Trigger pre-checked, so Mike's single
# edit (Error -> Pending Link) makes the record ENTER the matching condition
# and fire exactly one run. Drive fields must be blank or 070b skips before Make.
LIVE_TRIGGER_PREP_FIELDS = {
    "Google Drive File URL": "",
    "Google Drive File ID": "",
    "Upload Status": "Error",
    "Send to Make Trigger": True,
    "Upload Error": "",
    "Upload Claim Run ID": "",
    "Processing Started At": None,
}

LIVE_TRIGGER_PRESERVED_FIELDS = (
    "Airtable Attachment",
    "Enrollment - Linked",
    "Submission - Linked",
    "Video Feedback",
    "Upload Destination",
    "Canonical File URL",
    "Storage Key",
    "File Content Hash",
    "File Hash Algorithm",
    "Uploaded At",
)


def _attachment_ids(value) -> list:
    if not isinstance(value, list):
        return []
    return [a.get("id") for a in value if isinstance(a, dict)]


def _field_snapshot(fields: dict) -> dict:
    """Redacted-safe before/after snapshot of prep-relevant fields."""
    snap = {}
    for key in sorted(set(LIVE_TRIGGER_PRESERVED_FIELDS) | set(LIVE_TRIGGER_PREP_FIELDS)):
        value = fields.get(key)
        if key == "Airtable Attachment":
            ids = _attachment_ids(value)
            value = {"count": len(ids), "ids": ids}
        snap[key] = value
    return snap


def _parse_airtable_ts(value) -> datetime | None:
    if not value or not isinstance(value, str):
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def check_live_trigger_prep(before: dict, after: dict) -> dict:
    """Pure check logic for prepare-live-trigger (unit-testable)."""
    preserved = {}
    for key in LIVE_TRIGGER_PRESERVED_FIELDS:
        if key == "Airtable Attachment":
            preserved[key] = _attachment_ids(before.get(key)) == _attachment_ids(after.get(key)) and bool(
                _attachment_ids(after.get(key))
            )
        else:
            preserved[key] = before.get(key) == after.get(key)
    return {
        "uploadStatusError": after.get("Upload Status") == "Error",
        "sendToMakeTriggerChecked": after.get("Send to Make Trigger") is True,
        "googleDriveUrlBlank": not (after.get("Google Drive File URL") or "").strip(),
        "googleDriveIdBlank": not (after.get("Google Drive File ID") or "").strip(),
        "uploadErrorBlank": not (after.get("Upload Error") or "").strip(),
        "uploadClaimRunIdBlank": not (after.get("Upload Claim Run ID") or "").strip(),
        "processingStartedAtBlank": not after.get("Processing Started At"),
        "preserved": preserved,
        "allPreserved": all(preserved.values()),
    }


def evaluate_live_trigger_result(prep: dict, record_fields: dict, probe_snapshot: dict) -> dict:
    """Pure PASS contract for the live Airtable-triggered 070b test (unit-testable).

    A manually corrected record cannot pass: Uploaded At must be newer than the
    pre-test value (only the Lambda writeback advances it), the trigger must have
    been cleared by 070b itself, and the probe's independent allPass must hold.
    """
    pre_ts = _parse_airtable_ts(prep.get("preTestUploadedAt"))
    post_ts = _parse_airtable_ts(record_fields.get("Uploaded At"))
    checks = {
        "recordIdMatches": prep.get("assetId") == ALLOWED_LIVE_ASSET,
        "probeAllPass": probe_snapshot.get("allPass") is True,
        "uploadStatusUploaded": record_fields.get("Upload Status") == "Uploaded",
        "canonicalUrlPopulated": bool((record_fields.get("Canonical File URL") or "").strip()),
        "storageKeyPopulated": bool((record_fields.get("Storage Key") or "").strip()),
        "fileContentHashPopulated": bool((record_fields.get("File Content Hash") or "").strip()),
        "fileHashAlgorithmSha256": record_fields.get("File Hash Algorithm") == "SHA-256",
        "uploadErrorBlank": not (record_fields.get("Upload Error") or "").strip(),
        "writebackComplete": record_fields.get("Writeback Complete?") in (1, True, "1"),
        "sendToMakeTriggerCleared": not record_fields.get("Send to Make Trigger"),
        "uploadedAtAdvanced": bool(pre_ts and post_ts and post_ts > pre_ts),
        "videoFeedbackLinked": EXPECTED_VIDEO_FEEDBACK in (record_fields.get("Video Feedback") or []),
        "noDriveSkip": not (record_fields.get("Google Drive File URL") or "").strip()
        and not (record_fields.get("Google Drive File ID") or "").strip(),
        "attachmentRetained": bool(_attachment_ids(record_fields.get("Airtable Attachment"))),
    }
    return {
        "checks": checks,
        "preTestUploadedAt": prep.get("preTestUploadedAt"),
        "postTestUploadedAt": record_fields.get("Uploaded At"),
        "pass": all(checks.values()),
    }


def cmd_prepare_live_trigger(args: argparse.Namespace) -> None:
    load_env()
    tok = token()
    asset_id = args.asset_id
    if asset_id != ALLOWED_LIVE_ASSET:
        raise SystemExit(f"Refusing: live-trigger prep is only allowed on {ALLOWED_LIVE_ASSET}, got {asset_id}")
    before = get_asset(tok, asset_id)["fields"]
    enr = before.get("Enrollment - Linked") or []
    if enr != [ENR]:
        raise SystemExit(f"Refusing: asset must be linked exclusively to Schmidt Testing enrollment {ENR}")
    patch_asset(tok, asset_id, LIVE_TRIGGER_PREP_FIELDS)
    after = get_asset(tok, asset_id)["fields"]
    checks = check_live_trigger_prep(before, after)
    result = {
        "phase": "prepare_live_trigger",
        "probedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "assetId": asset_id,
        "enrollmentId": ENR,
        "preTestUploadedAt": after.get("Uploaded At"),
        "before": _field_snapshot(before),
        "after": _field_snapshot(after),
        "checks": checks,
        "pass": all(v for k, v in checks.items() if k != "preserved"),
        "nextStep": (
            "With Make scenario ON and 070b ON, change Upload Status from Error to "
            "Pending Link on this record only. No other field edits."
        ),
    }
    out = HERE / "_preview" / LIVE_PREP_OUT
    out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))
    if not result["pass"]:
        raise SystemExit(1)


def cmd_verify_live_trigger(args: argparse.Namespace) -> None:
    load_env()
    tok = token()
    asset_id = args.asset_id
    if asset_id != ALLOWED_LIVE_ASSET:
        raise SystemExit(f"Refusing: live-trigger verify is only allowed on {ALLOWED_LIVE_ASSET}, got {asset_id}")
    prep_path = HERE / "_preview" / LIVE_PREP_OUT
    if not prep_path.exists():
        raise SystemExit(f"Missing prep artifact {prep_path} — run prepare-live-trigger first")
    prep = json.loads(prep_path.read_text(encoding="utf-8"))
    record_fields = get_asset(tok, asset_id)["fields"]
    probe_snapshot = parse_probe_snapshot(probe_asset(asset_id))
    evaluation = evaluate_live_trigger_result(prep, record_fields, probe_snapshot)
    result = {
        "phase": "verify_live_trigger",
        "probedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "assetId": asset_id,
        "probe": {"allPass": probe_snapshot.get("allPass"), "checks": probe_snapshot.get("checks")},
        **evaluation,
    }
    out = HERE / "_preview" / "c013-prod-070b-live-trigger-result.json"
    out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))
    if not result["pass"]:
        raise SystemExit(1)


def _reset_live_snapshot(fields: dict) -> dict:
    """Before/after snapshot for reset-live-trigger."""
    keys = sorted(
        set(RESET_LIVE_TRIGGER_PRESERVED)
        | set(RESET_LIVE_TRIGGER_FIELDS)
        | set(RESET_LIVE_TRIGGER_CLEARED)
    )
    snap = {}
    for key in keys:
        value = fields.get(key)
        if key == "Airtable Attachment":
            ids = _attachment_ids(value)
            value = {"count": len(ids), "ids": ids}
        snap[key] = value
    return snap


def validate_reset_live_trigger_target(asset_id: str) -> None:
    if asset_id != ALLOWED_LIVE_ASSET:
        raise SystemExit(
            f"Refusing: reset-live-trigger is only allowed on {ALLOWED_LIVE_ASSET}, got {asset_id}"
        )


def validate_reset_live_trigger_fixture(fields: dict) -> None:
    """Fail before patch if required links/attachment are missing."""
    enr = fields.get("Enrollment - Linked") or []
    if enr != [ENR]:
        raise SystemExit(
            f"Refusing: asset must be linked exclusively to Schmidt Testing enrollment {ENR}"
        )
    if not _attachment_ids(fields.get("Airtable Attachment")):
        raise SystemExit("Refusing: missing Airtable Attachment")
    if not fields.get("Submission - Linked"):
        raise SystemExit("Refusing: missing Submission - Linked")
    if EXPECTED_VIDEO_FEEDBACK not in (fields.get("Video Feedback") or []):
        raise SystemExit(f"Refusing: missing Video Feedback link to {EXPECTED_VIDEO_FEEDBACK}")
    if fields.get("Upload Destination") != "Video Feedback":
        raise SystemExit('Refusing: Upload Destination must be "Video Feedback"')


def check_reset_live_trigger(before: dict, after: dict) -> dict:
    """Pure check logic for reset-live-trigger (unit-testable)."""
    preserved = {}
    for key in RESET_LIVE_TRIGGER_PRESERVED:
        if key == "Airtable Attachment":
            preserved[key] = _attachment_ids(before.get(key)) == _attachment_ids(after.get(key)) and bool(
                _attachment_ids(after.get(key))
            )
        else:
            preserved[key] = before.get(key) == after.get(key)
    cleared = {}
    for key in RESET_LIVE_TRIGGER_CLEARED:
        value = after.get(key)
        if key in ("File Size Bytes", "Uploaded At", "Processing Started At", "File Hash Algorithm"):
            cleared[f"{key}Blank"] = value is None or value == ""
        else:
            cleared[f"{key}Blank"] = not (value or "").strip() if isinstance(value, str) else not value
    return {
        "uploadStatusError": after.get("Upload Status") == "Error",
        "notPendingLink": after.get("Upload Status") != "Pending Link",
        "sendToMakeTriggerUnchecked": not after.get("Send to Make Trigger"),
        "uploadErrorBlank": not (after.get("Upload Error") or "").strip(),
        "uploadClaimRunIdBlank": not (after.get("Upload Claim Run ID") or "").strip(),
        "processingStartedAtBlank": not after.get("Processing Started At"),
        "cleared": cleared,
        "allCleared": all(cleared.values()),
        "preserved": preserved,
        "allPreserved": all(preserved.values()),
    }


def reset_live_trigger(tok: str, asset_id: str) -> dict:
    validate_reset_live_trigger_target(asset_id)
    before = get_asset(tok, asset_id)["fields"]
    validate_reset_live_trigger_fixture(before)
    patch_asset(tok, asset_id, RESET_LIVE_TRIGGER_FIELDS)
    after = get_asset(tok, asset_id)["fields"]
    checks = check_reset_live_trigger(before, after)
    return {
        "assetId": asset_id,
        "enrollmentId": ENR,
        "before": _reset_live_snapshot(before),
        "after": _reset_live_snapshot(after),
        "checks": checks,
    }


def cmd_reset_live_trigger(args: argparse.Namespace) -> None:
    load_env()
    reset = reset_live_trigger(token(), args.asset_id)
    checks = reset["checks"]
    result = {
        "phase": "reset_live_trigger",
        "probedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        **reset,
        "pass": (
            checks["uploadStatusError"]
            and checks["notPendingLink"]
            and checks["sendToMakeTriggerUnchecked"]
            and checks["uploadErrorBlank"]
            and checks["uploadClaimRunIdBlank"]
            and checks["processingStartedAtBlank"]
            and checks["allCleared"]
            and checks["allPreserved"]
        ),
    }
    out = HERE / "_preview" / "c013-prod-reset-live-trigger.json"
    out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))
    if not result["pass"]:
        raise SystemExit(1)


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
        "scriptVersionOk": 'version: "v4.4"' in script_text,
        "automation070bState": "OFF (manual confirmation required)",
        "makeScenario": {
            "name": "Shooting Challenge - GAME - Upload Engine - Lambda - v1",
            "expectedState": "OFF",
            "built": (os.getenv("MAKE_UPLOAD_WEBHOOK_URL_PROD") or "").strip() != "",
        },
        "pass": ENR in enr and fields.get("Upload Destination") == "Video Feedback" and 'version: "v4.4"' in script_text,
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

    p_reset_live = sub.add_parser("reset-live-trigger")
    p_reset_live.add_argument("--asset-id", required=True, help="Must be recGQ8EjAMz3bEBiW")
    p_reset_live.set_defaults(func=cmd_reset_live_trigger)

    p_prep = sub.add_parser("prepare-live-trigger")
    p_prep.add_argument("--asset-id", required=True, help="Must be the approved Schmidt live-test asset")
    p_prep.set_defaults(func=cmd_prepare_live_trigger)

    p_verify = sub.add_parser("verify-live-trigger")
    p_verify.add_argument("--asset-id", required=True, help="Must be the approved Schmidt live-test asset")
    p_verify.set_defaults(func=cmd_verify_live_trigger)

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
