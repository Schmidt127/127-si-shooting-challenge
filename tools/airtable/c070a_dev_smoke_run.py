#!/usr/bin/env python3
"""070a DEV smoke harness — homework upload path (Worker-C / T3).

Mirrors C-013 video Make/Lambda smoke patterns for homework_completion / 070a.
Default mode is dry-run with fixtures/mocks so the suite runs without waiting for
Worker A (Airtable script) or Worker B (Make/Lambda DEV route).

Usage:
  python tools/airtable/c070a_dev_smoke_run.py preflight
  python tools/airtable/c070a_dev_smoke_run.py contract
  python tools/airtable/c070a_dev_smoke_run.py mock-upload
  python tools/airtable/c070a_dev_smoke_run.py mock-idempotency
  python tools/airtable/c070a_dev_smoke_run.py mock-invalid-route
  python tools/airtable/c070a_dev_smoke_run.py all
  python tools/airtable/c070a_dev_smoke_run.py live-preflight --asset-id recXXXX
  python tools/airtable/c070a_dev_smoke_run.py live-upload --asset-id recXXXX   # requires DEV creds + Worker B

Environment (DEV only — never PROD):
  AIRTABLE_TOKEN / AIRTABLE_API_TOKEN
  MAKE_UPLOAD_WEBHOOK_URL_DEV (or MAKE_HOMEWORK_UPLOAD_WEBHOOK_URL_DEV)
  LAMBDA_FUNCTION_URL_DEV / UPLOAD_WEBHOOK_SECRET
  C070A_ALLOW_LIVE=1 to enable live commands

Hard stops:
  - PROD base appn84sqPw03zEbTT is refused
  - Protected PROD evidence record recGQ8EjAMz3bEBiW is refused
  - No AWS deploy; no Make scenario edits
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote

REPO = Path(__file__).resolve().parents[2]
HERE = Path(__file__).parent
PREVIEW = HERE / "_preview"
DEV_BASE = "appTetnuCZlCZdTCT"
PROD_BASE = "appn84sqPw03zEbTT"
TABLE = "Submission Assets"
PROTECTED_PROD_EVIDENCE = "recGQ8EjAMz3bEBiW"

HOMEWORK_ROUTE = {
    "automationNumber": "070a",
    "routeKey": "homework_completion",
    "uploadDestination": "Homework Completions",
    "targetTable": "Homework Completions",
    "sourceName": "Airtable Upload Engine",
    "sourceTable": "Submission Assets",
}

WORKER_A_RESULT = REPO / "docs/overnight-runs/worker-results/worker-a-t1-070a-airtable.md"
WORKER_B_RESULT = REPO / "docs/overnight-runs/worker-results/worker-b-t2-070a-backend.md"


def load_env() -> dict[str, str]:
    try:
        from dotenv import load_dotenv

        load_dotenv(HERE / ".env", override=False)
        load_dotenv(REPO / "web" / ".env.local", override=True)
    except ImportError:
        pass

    # Prefer Worker B published names; keep Worker-C aliases for compatibility.
    keys = (
        "AIRTABLE_TOKEN",
        "AIRTABLE_API_TOKEN",
        "MAKE_DEV_UPLOAD_WEBHOOK_URL",  # Worker B T2
        "MAKE_UPLOAD_WEBHOOK_URL_DEV",
        "MAKE_HOMEWORK_UPLOAD_WEBHOOK_URL_DEV",
        "LAMBDA_FUNCTION_URL",  # Worker B T2
        "LAMBDA_FUNCTION_URL_DEV",
        "UPLOAD_WEBHOOK_SECRET",
        "C070A_ALLOW_LIVE",
    )
    status: dict[str, str] = {}
    for key in keys:
        raw = (os.getenv(key) or "").strip()
        if key.startswith("AIRTABLE_") and not raw:
            # either token is fine
            continue
        status[key] = "CONFIGURED" if raw else "MISSING"
    tok = (os.getenv("AIRTABLE_TOKEN") or os.getenv("AIRTABLE_API_TOKEN") or "").strip()
    status["AIRTABLE_DEV_TOKEN"] = "CONFIGURED" if tok else "MISSING"
    status["MAKE_WEBHOOK_RESOLVED"] = (
        "CONFIGURED" if resolve_dev_webhook_url() else "MISSING"
    )
    status["LAMBDA_URL_RESOLVED"] = (
        "CONFIGURED" if resolve_lambda_function_url() else "MISSING"
    )
    return status


def resolve_dev_webhook_url() -> str:
    return (
        os.getenv("MAKE_DEV_UPLOAD_WEBHOOK_URL")
        or os.getenv("MAKE_HOMEWORK_UPLOAD_WEBHOOK_URL_DEV")
        or os.getenv("MAKE_UPLOAD_WEBHOOK_URL_DEV")
        or ""
    ).strip()


def resolve_lambda_function_url() -> str:
    return (
        os.getenv("LAMBDA_FUNCTION_URL")
        or os.getenv("LAMBDA_FUNCTION_URL_DEV")
        or ""
    ).strip()


def select_name(value: Any) -> str:
    if value is None or value == "":
        return ""
    if isinstance(value, dict) and "name" in value:
        return str(value.get("name") or "").strip()
    return str(value).strip()


def build_070a_payload(
    asset_id: str,
    target_record_id: str,
    *,
    sent_at_iso: str | None = None,
) -> dict[str, str]:
    if not asset_id.startswith("rec"):
        raise ValueError(f"Invalid asset id: {asset_id}")
    if target_record_id and not target_record_id.startswith("rec"):
        raise ValueError(f"Invalid target id: {target_record_id}")
    return {
        "sourceName": HOMEWORK_ROUTE["sourceName"],
        "automationNumber": "070a",
        "sentAtIso": sent_at_iso or datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "routeKey": HOMEWORK_ROUTE["routeKey"],
        "uploadDestination": HOMEWORK_ROUTE["uploadDestination"],
        "sourceTable": HOMEWORK_ROUTE["sourceTable"],
        "submissionAssetRecordId": asset_id,
        "targetTable": HOMEWORK_ROUTE["targetTable"],
        "targetRecordId": target_record_id,
    }


def evaluate_homework_prep(fields: dict[str, Any]) -> dict[str, Any]:
    upload_status = select_name(fields.get("Upload Status"))
    upload_dest = select_name(fields.get("Upload Destination"))
    ready = select_name(fields.get("Ready to Send to Make?"))
    send_trigger = bool(fields.get("Send to Make Trigger"))
    attachment = fields.get("Airtable Attachment") or []
    hw = fields.get("Homework Completions") or []
    enrollment = fields.get("Enrollment - Linked") or []
    submission = fields.get("Submission - Linked") or []
    canonical = select_name(fields.get("Canonical File URL"))
    drive_url = select_name(fields.get("Google Drive File URL"))
    drive_id = select_name(fields.get("Google Drive File ID"))

    checks = {
        "uploadStatusPendingLink": upload_status == "Pending Link",
        "uploadDestinationHomework": upload_dest == "Homework Completions",
        "readyToSendMake": ready in ("READY_TO_SEND", ""),
        "sendToMakeTriggerChecked": send_trigger,
        "attachmentPresent": isinstance(attachment, list) and len(attachment) > 0,
        "homeworkCompletionLinked": isinstance(hw, list) and len(hw) > 0,
        "enrollmentLinked": isinstance(enrollment, list) and len(enrollment) > 0,
        "submissionLinked": isinstance(submission, list) and len(submission) > 0,
        "canonicalUrlBlank": not canonical,
        "driveUrlBlank": not drive_url,
        "driveIdBlank": not drive_id,
    }
    return {"checks": checks, "allPass": all(checks.values())}


def evaluate_lambda_handoff(body: dict[str, Any]) -> dict[str, Any]:
    action = select_name(body.get("actionOut"))
    status = select_name(body.get("statusOut"))
    all_pass = (body.get("writebackVerification") or {}).get("allPass") is True

    if action == "uploaded" and all_pass:
        return {
            "verified": True,
            "actionOut": "lambda_upload_verified",
            "lambdaActionOut": action,
            "statusOut": status or "success",
        }
    if action == "skipped_already_uploaded":
        return {
            "verified": True,
            "actionOut": "lambda_upload_verified",
            "lambdaActionOut": action,
            "statusOut": status or "skipped",
        }
    if action in ("skipped_concurrent_upload", "stale_claim", "error_claim_conflict"):
        return {
            "verified": False,
            "actionOut": f"error_lambda_{action}",
            "lambdaActionOut": action,
            "statusOut": "error",
        }
    if action == "uploaded" and not all_pass:
        return {
            "verified": False,
            "actionOut": "error_lambda_writeback_incomplete",
            "lambdaActionOut": action,
            "statusOut": "error",
        }
    return {
        "verified": False,
        "actionOut": "error_lambda_response_unverified",
        "lambdaActionOut": action,
        "statusOut": "error",
    }


def evaluate_writeback_fields(fields: dict[str, Any]) -> dict[str, Any]:
    checks = {
        "uploadStatusUploaded": select_name(fields.get("Upload Status")) == "Uploaded",
        "canonicalUrlPopulated": bool(select_name(fields.get("Canonical File URL"))),
        "storageKeyPopulated": bool(select_name(fields.get("Storage Key"))),
        "fileContentHashPopulated": bool(select_name(fields.get("File Content Hash"))),
        "fileHashAlgorithmSha256": select_name(fields.get("File Hash Algorithm")) == "SHA-256",
        "uploadedAtPopulated": fields.get("Uploaded At") not in (None, ""),
        "uploadErrorBlank": not select_name(fields.get("Upload Error")),
    }
    return {"checks": checks, "allPass": all(checks.values())}


def mock_uploaded_response(asset_id: str) -> dict[str, Any]:
    return {
        "ok": True,
        "statusOut": "success",
        "actionOut": "uploaded",
        "routeKey": "homework_completion",
        "automationNumber": "070a",
        "submissionAssetRecordId": asset_id,
        "writebackVerification": {"allPass": True},
        "s3": {
            "storageKey": f"shooting-challenge/2026-2027/homework/{asset_id}.png",
            "bucket": "shooting-challenge-assets-dev-mock",
        },
    }


def mock_idempotent_response(asset_id: str) -> dict[str, Any]:
    return {
        "ok": True,
        "statusOut": "skipped",
        "actionOut": "skipped_already_uploaded",
        "routeKey": "homework_completion",
        "automationNumber": "070a",
        "submissionAssetRecordId": asset_id,
    }


def mock_invalid_route_response() -> dict[str, Any]:
    return {
        "ok": False,
        "statusOut": "error",
        "actionOut": "error_invalid_route",
        "errorOut": "routeKey video_feedback does not match homework asset",
    }


def fixture_ready_fields(asset_id: str = "recHwSmokeAsset01") -> dict[str, Any]:
    return {
        "Upload Status": "Pending Link",
        "Upload Destination": "Homework Completions",
        "Ready to Send to Make?": "READY_TO_SEND",
        "Send to Make Trigger": True,
        "Airtable Attachment": [{"url": "https://example.com/hw.png", "filename": "hw.png"}],
        "Homework Completions": ["recHcSmoke01"],
        "Enrollment - Linked": ["recEnrollSmoke01"],
        "Submission - Linked": ["recSubSmoke01"],
        "Canonical File URL": "",
        "Google Drive File URL": "",
        "Google Drive File ID": "",
        "Storage Key": "",
        "Upload Error": "",
        "_fixtureAssetId": asset_id,
    }


def read_worker_contract_status() -> dict[str, Any]:
    return {
        "workerA": {
            "path": str(WORKER_A_RESULT.relative_to(REPO)),
            "present": WORKER_A_RESULT.exists(),
        },
        "workerB": {
            "path": str(WORKER_B_RESULT.relative_to(REPO)),
            "present": WORKER_B_RESULT.exists(),
        },
        "usingStubs": not (WORKER_A_RESULT.exists() and WORKER_B_RESULT.exists()),
    }


def refuse_prod_targets(asset_id: str | None, base_id: str | None = None) -> None:
    if base_id == PROD_BASE:
        raise SystemExit("REFUSED: PROD base is not allowed for 070a DEV smoke tooling.")
    if asset_id == PROTECTED_PROD_EVIDENCE:
        raise SystemExit(
            f"REFUSED: protected PROD evidence record {PROTECTED_PROD_EVIDENCE} must not be used."
        )


def cmd_preflight(_: argparse.Namespace) -> dict[str, Any]:
    env = load_env()
    contracts = read_worker_contract_status()
    result = {
        "command": "preflight",
        "environment": "DEV",
        "devBaseId": DEV_BASE,
        "env": env,
        "contracts": contracts,
        "liveAllowed": (os.getenv("C070A_ALLOW_LIVE") or "").strip() == "1",
        "pass": True,
        "notes": (
            "Scaffold preflight OK. Live upload remains blocked until Worker B DEV route "
            "and C070A_ALLOW_LIVE=1."
        ),
    }
    return result


def cmd_contract(_: argparse.Namespace) -> dict[str, Any]:
    payload = build_070a_payload("recHwSmokeAsset01", "recHcSmoke01", sent_at_iso="2026-07-11T22:00:00.000Z")
    prep = evaluate_homework_prep(fixture_ready_fields())
    contracts = read_worker_contract_status()
    return {
        "command": "contract",
        "route": HOMEWORK_ROUTE,
        "payload": payload,
        "prep": prep,
        "contracts": contracts,
        "pass": prep["allPass"] is True and payload["routeKey"] == "homework_completion",
    }


def cmd_mock_upload(_: argparse.Namespace) -> dict[str, Any]:
    asset_id = "recHwSmokeAsset01"
    payload = build_070a_payload(asset_id, "recHcSmoke01")
    response = mock_uploaded_response(asset_id)
    handoff = evaluate_lambda_handoff(response)
    writeback = evaluate_writeback_fields(
        {
            "Upload Status": "Uploaded",
            "Canonical File URL": "https://example.com/hw.png",
            "Storage Key": response["s3"]["storageKey"],
            "File Content Hash": "a" * 64,
            "File Hash Algorithm": "SHA-256",
            "Uploaded At": "2026-07-11T22:01:00.000Z",
            "Upload Error": "",
        }
    )
    ok = handoff["verified"] and writeback["allPass"]
    return {
        "command": "mock-upload",
        "mode": "mock",
        "payload": payload,
        "response": response,
        "handoff": handoff,
        "writeback": writeback,
        "pass": ok,
    }


def cmd_mock_idempotency(_: argparse.Namespace) -> dict[str, Any]:
    asset_id = "recHwSmokeAsset01"
    response = mock_idempotent_response(asset_id)
    handoff = evaluate_lambda_handoff(response)
    return {
        "command": "mock-idempotency",
        "mode": "mock",
        "response": response,
        "handoff": handoff,
        "pass": handoff["verified"] is True and handoff["lambdaActionOut"] == "skipped_already_uploaded",
    }


def cmd_mock_invalid_route(_: argparse.Namespace) -> dict[str, Any]:
    response = mock_invalid_route_response()
    # invalid route is an explicit error action — not verified success
    handoff = evaluate_lambda_handoff(response)
    return {
        "command": "mock-invalid-route",
        "mode": "mock",
        "response": response,
        "handoff": handoff,
        "pass": handoff["verified"] is False and response["actionOut"] == "error_invalid_route",
    }


def cmd_all(args: argparse.Namespace) -> dict[str, Any]:
    phases = [
        cmd_preflight(args),
        cmd_contract(args),
        cmd_mock_upload(args),
        cmd_mock_idempotency(args),
        cmd_mock_invalid_route(args),
    ]
    return {
        "command": "all",
        "phases": phases,
        "pass": all(p.get("pass") is True for p in phases),
        "phaseCount": len(phases),
        "passedCount": sum(1 for p in phases if p.get("pass") is True),
    }


def get_dev_token() -> str:
    tok = (os.getenv("AIRTABLE_TOKEN") or os.getenv("AIRTABLE_API_TOKEN") or "").strip()
    if not tok:
        raise SystemExit("MISSING DEV Airtable token (AIRTABLE_TOKEN / AIRTABLE_API_TOKEN)")
    return tok


def live_get_asset(tok: str, asset_id: str) -> dict[str, Any]:
    import requests

    refuse_prod_targets(asset_id, DEV_BASE)
    url = f"https://api.airtable.com/v0/{DEV_BASE}/{quote(TABLE, safe='')}/{asset_id}"
    resp = requests.get(url, headers={"Authorization": f"Bearer {tok}"}, timeout=120)
    if not resp.ok:
        raise SystemExit(f"GET failed: {resp.status_code} {resp.text[:400]}")
    return resp.json()


def cmd_live_preflight(args: argparse.Namespace) -> dict[str, Any]:
    load_env()
    refuse_prod_targets(args.asset_id)
    tok = get_dev_token()
    record = live_get_asset(tok, args.asset_id)
    fields = record.get("fields") or {}
    prep = evaluate_homework_prep(fields)
    return {
        "command": "live-preflight",
        "mode": "live-read",
        "assetId": args.asset_id,
        "baseId": DEV_BASE,
        "prep": prep,
        "pass": prep["allPass"] is True,
        "snapshot": {
            "Upload Status": select_name(fields.get("Upload Status")),
            "Upload Destination": select_name(fields.get("Upload Destination")),
            "Homework Completions": (fields.get("Homework Completions") or [])[:1],
        },
    }


def cmd_live_upload(args: argparse.Namespace) -> dict[str, Any]:
    load_env()
    if (os.getenv("C070A_ALLOW_LIVE") or "").strip() != "1":
        return {
            "command": "live-upload",
            "mode": "blocked",
            "pass": False,
            "blocker": "Set C070A_ALLOW_LIVE=1 after Worker B publishes DEV homework route.",
            "contracts": read_worker_contract_status(),
        }
    refuse_prod_targets(args.asset_id)
    webhook = resolve_dev_webhook_url()
    if not webhook:
        return {
            "command": "live-upload",
            "mode": "blocked",
            "pass": False,
            "blocker": (
                "MISSING MAKE_DEV_UPLOAD_WEBHOOK_URL "
                "(or MAKE_HOMEWORK_UPLOAD_WEBHOOK_URL_DEV / MAKE_UPLOAD_WEBHOOK_URL_DEV)"
            ),
            "contracts": read_worker_contract_status(),
        }

    import requests

    tok = get_dev_token()
    record = live_get_asset(tok, args.asset_id)
    fields = record.get("fields") or {}
    prep = evaluate_homework_prep(fields)
    if not prep["allPass"]:
        return {
            "command": "live-upload",
            "mode": "live",
            "pass": False,
            "blocker": "prep_failed",
            "prep": prep,
        }
    hw = fields.get("Homework Completions") or []
    target_id = hw[0] if hw else ""
    payload = build_070a_payload(args.asset_id, target_id)
    resp = requests.post(webhook, json=payload, timeout=120)
    body_text = resp.text
    try:
        body = resp.json()
    except Exception:
        body = {"raw": body_text}
    handoff = evaluate_lambda_handoff(body if isinstance(body, dict) else {})
    return {
        "command": "live-upload",
        "mode": "live",
        "httpStatus": resp.status_code,
        "payload": payload,
        "response": body,
        "handoff": handoff,
        "pass": resp.ok and handoff.get("verified") is True,
        "note": "DEV only. PROD was not modified.",
    }


def write_artifact(name: str, payload: dict[str, Any]) -> Path:
    PREVIEW.mkdir(parents=True, exist_ok=True)
    path = PREVIEW / name
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return path


def main() -> None:
    parser = argparse.ArgumentParser(description="070a DEV homework upload smoke harness")
    parser.add_argument(
        "command",
        choices=[
            "preflight",
            "contract",
            "mock-upload",
            "mock-idempotency",
            "mock-invalid-route",
            "all",
            "live-preflight",
            "live-upload",
        ],
    )
    parser.add_argument("--asset-id", default=None, help="DEV Submission Asset record id")
    parser.add_argument("--out", default=None, help="Optional artifact path under _preview/")
    args = parser.parse_args()

    if args.command in ("live-preflight", "live-upload") and not args.asset_id:
        raise SystemExit(f"{args.command} requires --asset-id")

    dispatch = {
        "preflight": cmd_preflight,
        "contract": cmd_contract,
        "mock-upload": cmd_mock_upload,
        "mock-idempotency": cmd_mock_idempotency,
        "mock-invalid-route": cmd_mock_invalid_route,
        "all": cmd_all,
        "live-preflight": cmd_live_preflight,
        "live-upload": cmd_live_upload,
    }
    result = dispatch[args.command](args)
    result["generatedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    result["prodModified"] = False

    out_name = args.out or f"c070a-dev-smoke-{args.command}.json"
    artifact = write_artifact(out_name, result)
    print(json.dumps(result, indent=2))
    print(f"\nArtifact: {artifact}", file=sys.stderr)
    raise SystemExit(0 if result.get("pass") else 1)


if __name__ == "__main__":
    main()
