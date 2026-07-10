#!/usr/bin/env python3
"""Create and validate isolated PROD fixture for automation 116 (Schmidt Testing)."""

from __future__ import annotations

import json
import sys
import time
from datetime import date
from pathlib import Path
from urllib.parse import quote

import requests
from dotenv import load_dotenv

HERE = Path(__file__).parent
load_dotenv(HERE / ".env", override=True)
load_dotenv(HERE.parent.parent / ".env.local", override=True)

PROD = "appn84sqPw03zEbTT"
ENR = "recgP9qZYjAhE7NXm"
TEST_VF_KEY = "PROD-V2-A116-TEST"
SCRIPT_VERSION = "1.0.1"
REF_COMMIT = "992677d"
AUDIT_MARKER = "[C-023-S5]"

import os

TOKEN = os.getenv("AIRTABLE_TOKEN") or os.getenv("AIRTABLE_API_TOKEN")
if not TOKEN:
    raise SystemExit("missing AIRTABLE_TOKEN")

H = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}


def api(table: str, rid: str | None = None) -> str:
    p = quote(table, safe="")
    base = f"https://api.airtable.com/v0/{PROD}/{p}"
    return f"{base}/{rid}" if rid else base


def get_rec(table: str, rid: str) -> dict:
    r = requests.get(api(table, rid), headers=H, timeout=120)
    r.raise_for_status()
    return r.json()


def create_rec(table: str, fields: dict) -> dict:
    r = requests.post(
        api(table),
        headers=H,
        json={"fields": fields, "typecast": True},
        timeout=120,
    )
    if not r.ok:
        raise SystemExit(f"create {table} failed: {r.status_code} {r.text[:800]}")
    return r.json()


def patch_rec(table: str, rid: str, fields: dict) -> dict:
    r = requests.patch(
        api(table, rid),
        headers=H,
        json={"fields": fields, "typecast": True},
        timeout=120,
    )
    if not r.ok:
        raise SystemExit(f"patch {table}/{rid} failed: {r.status_code} {r.text[:800]}")
    return r.json()


def list_xp_by_source(source_key: str) -> list[dict]:
    recs: list[dict] = []
    offset = None
    while True:
        params: list[tuple[str, str]] = [
            ("pageSize", "100"),
            ("filterByFormula", f'{{Source Key}}="{source_key}"'),
        ]
        if offset:
            params.append(("offset", offset))
        r = requests.get(api("XP Events"), headers=H, params=params, timeout=120)
        r.raise_for_status()
        j = r.json()
        recs.extend(j.get("records") or [])
        offset = j.get("offset")
        if not offset:
            break
    return recs


def pick_week_id() -> str:
    r = requests.get(api("Weeks"), headers=H, params={"pageSize": 100}, timeout=120)
    r.raise_for_status()
    recs = r.json().get("records") or []
    if not recs:
        raise SystemExit("no Weeks records on PROD")
    best_id = recs[0]["id"]
    best_start = ""
    for rec in recs:
        start = str((rec.get("fields") or {}).get("Start Date") or "")
        if start >= best_start:
            best_start = start
            best_id = rec["id"]
    return best_id


def wait_for(predicate, label: str, timeout_s: int = 90, interval_s: int = 3) -> bool:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        if predicate():
            return True
        time.sleep(interval_s)
    print(f"timeout waiting for {label}", file=sys.stderr)
    return False


def verify_confirm_state(asset_id: str, vf_id: str, xp_id: str) -> tuple[bool, dict]:
    asset = get_rec("Submission Assets", asset_id)["fields"]
    vf = get_rec("Video Feedback", vf_id)["fields"]
    xp = get_rec("XP Events", xp_id)["fields"]
    xp_count = len(list_xp_by_source(f"VIDEO_SUBMISSION|{vf_id}"))
    checks = {
        "vf_do_not_award": vf.get("Do Not Award XP?") is True,
        "xp_active_false": xp.get("Active?") is False,
        "xp_dup_remove": xp.get("Duplicate Status") == "Duplicate - Remove",
        "xp_audit_confirm": "Confirmed duplicate — XP deactivated" in str(xp.get("XP Reason Debug") or ""),
        "asset_resolution_applied": asset.get("Duplicate Resolution Applied?") is True,
        "asset_last_applied": asset.get("Duplicate Resolution Last Applied Decision") == "Confirmed Duplicate",
        "asset_applied_at": bool(asset.get("Duplicate Resolution Applied At")),
        "asset_error_blank": not (asset.get("Duplicate Resolution Error") or "").strip(),
        "xp_count_one": xp_count == 1,
    }
    return all(checks.values()), checks


def verify_restore_state(asset_id: str, vf_id: str, xp_id: str) -> tuple[bool, dict]:
    asset = get_rec("Submission Assets", asset_id)["fields"]
    vf = get_rec("Video Feedback", vf_id)["fields"]
    xp = get_rec("XP Events", xp_id)["fields"]
    xp_count = len(list_xp_by_source(f"VIDEO_SUBMISSION|{vf_id}"))
    checks = {
        "vf_do_not_award_clear": vf.get("Do Not Award XP?") is not True,
        "xp_active_true": xp.get("Active?") is True,
        "xp_dup_unique": xp.get("Duplicate Status") == "Unique",
        "xp_audit_restore": "Restored — decision reversed" in str(xp.get("XP Reason Debug") or ""),
        "asset_last_applied": asset.get("Duplicate Resolution Last Applied Decision") == "Approved Reuse",
        "asset_error_blank": not (asset.get("Duplicate Resolution Error") or "").strip(),
        "xp_count_one": xp_count == 1,
        "same_xp_id": xp_id == xp_id,
    }
    return all(checks.values()), checks


def main() -> None:
    cmd = sys.argv[1] if len(sys.argv) > 1 else "all"
    out_path = HERE / "_preview" / "prod-116-fixture-audit.json"

    if cmd == "create":
        week_id = pick_week_id()
        sub = create_rec(
            "Submissions",
            {
                "Enrollment": [ENR],
                "Week": [week_id],
                "Activity Date": date.today().isoformat(),
            },
        )
        sub_id = sub["id"]

        vf = create_rec(
            "Video Feedback",
            {
                "Enrollment": [ENR],
                "Submission": [sub_id],
                "Video Feedback Key": TEST_VF_KEY,
                "Award Status": "Awarded",
                "Do Not Award XP?": False,
                "Feedback Posted?": True,
            },
        )
        vf_id = vf["id"]

        asset = create_rec(
            "Submission Assets",
            {
                "Asset Label": "PROD V2 Test - Duplicate Reuse",
                "Submission - Linked": [sub_id],
                "Enrollment - Linked": [ENR],
                "Video Feedback": [vf_id],
                "Asset Purpose": "Video For Feedback",
                "Asset Type": "Video Feedback",
                "Asset Slot": "VIDEO",
            },
        )
        asset_id = asset["id"]

        patch_rec("Video Feedback", vf_id, {"Submission Asset": [asset_id]})

        source_key = f"VIDEO_SUBMISSION|{vf_id}"
        xp = create_rec(
            "XP Events",
            {
                "Source Key": source_key,
                "Enrollment": [ENR],
                "Submission": [sub_id],
                "Video Feedback": [vf_id],
                "XP Source": "Video Submission",
                "XP Bucket": "Video Feedback",
                "XP Points": 1,
                "Active?": True,
                "Duplicate Status": "Unique",
                "Processed": True,
                "XP Reason Debug": (
                    f"PROD V2 Test fixture for automation 116 ({TEST_VF_KEY}). "
                    f"Reference commit {REF_COMMIT}."
                ),
            },
        )
        xp_id = xp["id"]

        result = {
            "phase": "create",
            "submissionId": sub_id,
            "assetId": asset_id,
            "videoFeedbackId": vf_id,
            "xpEventId": xp_id,
            "sourceKey": source_key,
            "weekId": week_id,
        }
        out_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
        print(json.dumps(result, indent=2))
        return

    if cmd == "pretest":
        data = json.loads(out_path.read_text(encoding="utf-8"))
        asset_id = data["assetId"]
        vf_id = data["videoFeedbackId"]
        xp_id = data["xpEventId"]
        asset = get_rec("Submission Assets", asset_id)["fields"]
        vf = get_rec("Video Feedback", vf_id)["fields"]
        xp = get_rec("XP Events", xp_id)["fields"]
        enr_links = set(asset.get("Enrollment - Linked") or []) | set(vf.get("Enrollment") or []) | set(xp.get("Enrollment") or [])
        result = {
            "phase": "pretest",
            "pass": ENR in enr_links and vf_id in (asset.get("Video Feedback") or []) and xp.get("Active?") is True,
            "recordIds": data,
            "assetDecision": asset.get("Asset Reuse Decision"),
            "vfDoNotAward": vf.get("Do Not Award XP?"),
            "xpActive": xp.get("Active?"),
            "xpDuplicateStatus": xp.get("Duplicate Status"),
            "xpCountForSource": len(list_xp_by_source(data["sourceKey"])),
        }
        print(json.dumps(result, indent=2))
        return

    if cmd == "confirm":
        data = json.loads(out_path.read_text(encoding="utf-8"))
        asset_id = data["assetId"]
        xp_before = len(list_xp_by_source(data["sourceKey"]))
        patch_rec("Submission Assets", asset_id, {"Asset Reuse Decision": "Confirmed Duplicate"})
        ok = wait_for(
            lambda: verify_confirm_state(asset_id, data["videoFeedbackId"], data["xpEventId"])[0],
            "confirmed duplicate effects",
        )
        passed, checks = verify_confirm_state(asset_id, data["videoFeedbackId"], data["xpEventId"])
        result = {
            "phase": "confirm",
            "pass": passed and ok,
            "automationEvidence": "field-state" if passed else "missing-or-automation-off",
            "checks": checks,
            "xpCountBefore": xp_before,
            "xpCountAfter": len(list_xp_by_source(data["sourceKey"])),
        }
        data["confirm"] = result
        out_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
        print(json.dumps(result, indent=2))
        return

    if cmd == "restore":
        data = json.loads(out_path.read_text(encoding="utf-8"))
        asset_id = data["assetId"]
        xp_before = len(list_xp_by_source(data["sourceKey"]))
        patch_rec("Submission Assets", asset_id, {"Asset Reuse Decision": "Approved Reuse"})
        ok = wait_for(
            lambda: verify_restore_state(asset_id, data["videoFeedbackId"], data["xpEventId"])[0],
            "approved reuse restore",
        )
        passed, checks = verify_restore_state(asset_id, data["videoFeedbackId"], data["xpEventId"])
        result = {
            "phase": "restore",
            "pass": passed and ok,
            "automationEvidence": "field-state" if passed else "missing-or-automation-off",
            "checks": checks,
            "xpCountBefore": xp_before,
            "xpCountAfter": len(list_xp_by_source(data["sourceKey"])),
        }
        data["restore"] = result
        data["finalPass"] = bool(data.get("confirm", {}).get("pass")) and passed and ok
        out_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
        print(json.dumps(result, indent=2))
        return

    if cmd == "reset-decision":
        data = json.loads(out_path.read_text(encoding="utf-8"))
        patch_rec("Submission Assets", data["assetId"], {"Asset Reuse Decision": "Not Reviewed"})
        print(json.dumps({"phase": "reset-decision", "assetId": data["assetId"]}, indent=2))
        return

    if cmd == "all":
        for step in ("create", "pretest", "confirm", "restore"):
            print(f"\n=== {step} ===", file=sys.stderr)
            main_argv = [sys.argv[0], step]
            old = sys.argv
            sys.argv = main_argv
            try:
                main()
            finally:
                sys.argv = old
        return

    raise SystemExit(f"unknown command: {cmd}")


if __name__ == "__main__":
    main()
