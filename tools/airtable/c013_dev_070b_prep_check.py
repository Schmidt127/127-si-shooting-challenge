#!/usr/bin/env python3
"""C-013 — DEV 070b hybrid prep check (read-only asset gate + artifact).

Validates a Submission Asset is ready for 070b enable test.
Does not enable 070b, POST webhooks, or write Airtable.

Usage:
  python c013_dev_070b_prep_check.py recF86pJTIMFoEypJ
  python c013_dev_070b_prep_check.py recF86pJTIMFoEypJ --scenario-id rec7IdiHF1jDeI8OW
"""

from __future__ import annotations

import argparse
import json
import os
import sys
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
        raise SystemExit("ERROR: missing AIRTABLE_TOKEN")
    return t


def get_record(tok: str, record_id: str) -> dict:
    url = f"https://api.airtable.com/v0/{DEV_BASE}/{quote(TABLE)}/{record_id}"
    r = requests.get(url, headers={"Authorization": f"Bearer {tok}"}, timeout=120)
    if not r.ok:
        raise SystemExit(f"GET {record_id} -> {r.status_code}: {r.text[:500]}")
    return r.json()


def check(fields: dict) -> dict:
    upload_status = fields.get("Upload Status")
    upload_dest = fields.get("Upload Destination")
    if isinstance(upload_dest, dict):
        upload_dest = upload_dest.get("name", upload_dest)
    ready = fields.get("Ready to Send to Make?")
    send_trigger = bool(fields.get("Send to Make Trigger"))
    attachment = fields.get("Airtable Attachment") or []
    vf = fields.get("Video Feedback") or []
    enrollment = fields.get("Enrollment - Linked") or []
    submission = fields.get("Submission - Linked") or []
    canonical = (fields.get("Canonical File URL") or "").strip()
    drive_url = (fields.get("Google Drive File URL") or "").strip()

    checks = {
        "uploadStatusPendingLink": upload_status == "Pending Link",
        "uploadDestinationVideoFeedback": upload_dest == "Video Feedback",
        "readyToSendMake": ready == "READY_TO_SEND",
        "sendToMakeTriggerChecked": send_trigger,
        "attachmentPresent": len(attachment) > 0,
        "videoFeedbackLinked": len(vf) > 0,
        "enrollmentLinked": len(enrollment) > 0,
        "submissionLinked": len(submission) > 0,
        "canonicalUrlBlank": not canonical,
        "driveUrlBlank": not drive_url,
    }
    return {
        "checks": checks,
        "allPass": all(checks.values()),
        "snapshot": {
            "Upload Status": upload_status,
            "Upload Destination": upload_dest,
            "Ready to Send to Make?": ready,
            "Send to Make Trigger": send_trigger,
            "Video Feedback": vf[:1],
            "Enrollment - Linked": enrollment[:1],
            "Submission - Linked": submission[:1],
            "Why Not Ready for Make?": fields.get("Why Not Ready for Make?"),
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="070b hybrid prep check (DEV read-only)")
    parser.add_argument("asset_id", help="Submission Assets record id")
    parser.add_argument("--scenario-id", default=None)
    parser.add_argument("--submission-id", default=None)
    parser.add_argument("--out", default=None)
    args = parser.parse_args()

    load_env()
    tok = token()
    rec = get_record(tok, args.asset_id)
    fields = rec.get("fields") or {}
    result = check(fields)

    artifact = {
        "script": "c013_dev_070b_prep_check.py",
        "probedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "baseId": DEV_BASE,
        "phase": "070b_hybrid_prep",
        "automation070b": "OFF (must remain until explicit approval)",
        "makeScenario": "Shooting Challenge - DEV - Upload Engine - Lambda - v1",
        "scenarioId": args.scenario_id,
        "submissionId": args.submission_id or (fields.get("Submission - Linked") or [None])[0],
        "assetId": args.asset_id,
        "targetRecordId": (fields.get("Video Feedback") or [None])[0],
        "writebackVerification": result,
        "mikeAirtableUi": {
            "step": "Paste DEV Make webhook URL into 070b automation input makeWebhookUrl",
            "automationState": "OFF — save input only",
            "verifyTriggerConditions": "See docs/deploy-checklists/C-013-dev-070b-hybrid-prep.md §3",
            "doNotEnableUntil": "Explicit approval after step 8 saved",
        },
    }

    out = args.out or f"_preview/c013-dev-070b-prep-{args.asset_id}.json"
    out_path = HERE / out
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(artifact, indent=2) + "\n", encoding="utf-8")

    print(json.dumps({k: v for k, v in artifact.items() if k != "mikeAirtableUi"}, indent=2))
    print(f"\n070bReady={result['allPass']}")
    print(f"written={out_path}")
    if not result["allPass"]:
        failed = [k for k, v in result["checks"].items() if not v]
        print(f"failedChecks={failed}", file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
