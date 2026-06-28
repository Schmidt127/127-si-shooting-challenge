#!/usr/bin/env python3
"""Live read-only audit for Schmidt, Testing Fillout test submission (API mirror of extension script)."""

from __future__ import annotations

import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote

import requests
from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parents[2]
BASE_ID = "appn84sqPw03zEbTT"

PATTERNS = ["schmidt", "testing"]
RECENT_HOURS = 72
EXPECTED = {
    "hw_sub_1": 2,
    "hw_sub_2": 2,
    "video": 3,
    "assets": {"HW1": 2, "HW2": 2, "VIDEO": 3},
    "total_assets": 7,
    "homework_completions": 2,
    "video_feedback": 3,
}


def load_credentials() -> str:
    for env_path in (Path(__file__).with_name(".env"), REPO_ROOT / "web" / ".env.local"):
        if env_path.exists():
            load_dotenv(env_path, override=True)
    token = os.getenv("AIRTABLE_TOKEN") or os.getenv("AIRTABLE_API_TOKEN") or ""
    if not token:
        raise SystemExit("Missing AIRTABLE_TOKEN in tools/airtable/.env or web/.env.local")
    return token


def api_get(token: str, path: str, params: dict | None = None) -> dict:
    url = f"https://api.airtable.com/v0/{BASE_ID}/{quote(path, safe='')}"
    resp = requests.get(url, headers={"Authorization": f"Bearer {token}"}, params=params or {}, timeout=60)
    resp.raise_for_status()
    return resp.json()


def api_get_all(token: str, table: str, params: dict | None = None) -> list[dict]:
    records: list[dict] = []
    offset = None
    base_params = dict(params or {})
    while True:
        if offset:
            base_params["offset"] = offset
        data = api_get(token, table, base_params)
        records.extend(data.get("records", []))
        offset = data.get("offset")
        if not offset:
            break
    return records


def text(fields: dict, key: str) -> str:
    val = fields.get(key)
    if val is None:
        return ""
    if isinstance(val, list) and val and isinstance(val[0], str):
        return ", ".join(str(x) for x in val)
    return str(val).strip()


def link_ids(fields: dict, key: str) -> list[str]:
    val = fields.get(key)
    if not isinstance(val, list):
        return []
    return [item for item in val if isinstance(item, str) and item.startswith("rec")]


def attachment_count(fields: dict, key: str) -> int:
    val = fields.get(key)
    return len(val) if isinstance(val, list) else 0


def select_name(fields: dict, key: str) -> str:
    val = fields.get(key)
    if isinstance(val, dict) and val.get("name"):
        return str(val["name"]).strip()
    return text(fields, key)


def matches_patterns(name: str) -> bool:
    hay = name.lower()
    return bool(hay) and all(p in hay for p in PATTERNS)


def stage(code: str, label: str, status: str, **details):
    return {"stage": code, "label": label, "status": status, **details}


def worst(*statuses: str) -> str:
    if "fail" in statuses:
        return "fail"
    if "wait" in statuses:
        return "wait"
    return "pass"


def main() -> None:
    token = load_credentials()
    cutoff = datetime.now(timezone.utc) - timedelta(hours=RECENT_HOURS)

    enrollments = api_get_all(
        token,
        "Enrollments",
        {"fields[]": ["Full Athlete Name", "Full Athlete Name - Backward", "Submissions"]},
    )
    matching = []
    for rec in enrollments:
        f = rec.get("fields", {})
        names = [text(f, "Full Athlete Name"), text(f, "Full Athlete Name - Backward")]
        if any(matches_patterns(n) for n in names if n):
            matching.append(rec)

    if not matching:
        print(json.dumps({"overallStatus": "fail", "blocker": "no_enrollment_match", "patterns": PATTERNS}, indent=2))
        sys.exit(1)

    submission_candidates: list[tuple[str, str, str]] = []
    for enr in matching:
        for sub_id in link_ids(enr.get("fields", {}), "Submissions"):
            submission_candidates.append((sub_id, enr["id"], text(enr.get("fields", {}), "Full Athlete Name")))

    if not submission_candidates:
        print(
            json.dumps(
                {
                    "overallStatus": "fail",
                    "blocker": "no_submissions_on_enrollment",
                    "enrollments": [{"id": r["id"], "name": text(r.get("fields", {}), "Full Athlete Name")} for r in matching],
                },
                indent=2,
            )
        )
        sys.exit(1)

    subs = api_get_all(
        token,
        "Submissions",
        {
            "fields[]": [
                "Submission Full Name",
                "Enrollment",
                "Week",
                "Activity Date",
                "Count This Submission?",
                "HW Sub 1",
                "HW Sub 2",
                "Video Upload",
                "Attachment Upload Status",
                "Total Shots Canonical",
                "Shot Total",
                "Submission Assets",
            ]
        },
    )
    sub_by_id = {r["id"]: r for r in subs}

    targets = []
    for sub_id, enr_id, enr_name in submission_candidates:
        sub = sub_by_id.get(sub_id)
        if not sub:
            continue
        created = sub.get("createdTime", "")
        try:
            created_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
        except ValueError:
            created_dt = None
        if created_dt and created_dt < cutoff:
            continue
        targets.append((sub, enr_id, enr_name, created))

    targets.sort(key=lambda x: x[3] or "", reverse=True)
    if not targets:
        print(
            json.dumps(
                {
                    "overallStatus": "fail",
                    "blocker": "no_recent_submission",
                    "recentHours": RECENT_HOURS,
                    "linkedSubmissionIds": [x[0] for x in submission_candidates],
                },
                indent=2,
            )
        )
        sys.exit(1)

    sub, enr_id, enr_name, created = targets[0]
    sub_id = sub["id"]
    sf = sub.get("fields", {})

    assets = [
        r
        for r in api_get_all(
            token,
            "Submission Assets",
            {
                "filterByFormula": f"FIND('{sub_id}', {{Submission - Linked}})",
                "fields[]": [
                    "Submission Assets Full Name",
                    "Asset Slot",
                    "Asset Purpose",
                    "Upload Destination",
                    "Upload Status",
                    "Send to Make Trigger",
                    "Google Drive File URL",
                    "Homework Completions",
                    "Video Feedback",
                    "Upload Error",
                    "Writeback Complete?",
                ],
            },
        )
    ]

    hw_rows = [
        r
        for r in api_get_all(
            token,
            "Homework Completions",
            {
                "filterByFormula": f"FIND('{sub_id}', {{Submissions - Linked}})",
                "fields[]": [
                    "Homework Completion Full Name",
                    "Asset Slot",
                    "Submission Assets",
                    "Upload Status",
                    "Google Drive File URL",
                    "Writeback Complete?",
                ],
            },
        )
    ]

    vf_rows = [
        r
        for r in api_get_all(
            token,
            "Video Feedback",
            {
                "filterByFormula": f"FIND('{sub_id}', {{Submission}})",
                "fields[]": [
                    "Video Feedback Name",
                    "Submission Asset",
                    "Upload Status",
                    "Google Drive File URL",
                    "Writeback Complete?",
                ],
            },
        )
    ]

    stages = []
    stages.append(
        stage(
            "A",
            "Find target",
            "pass",
            submissionId=sub_id,
            submissionName=text(sf, "Submission Full Name"),
            enrollmentId=enr_id,
            enrollmentName=enr_name,
            createdTime=created,
        )
    )

    intake_blockers = []
    if not link_ids(sf, "Enrollment"):
        intake_blockers.append("missing_enrollment")
    if not link_ids(sf, "Week"):
        intake_blockers.append("missing_week")
    if not text(sf, "Activity Date"):
        intake_blockers.append("missing_activity_date")
    shots = sf.get("Total Shots Canonical") or sf.get("Shot Total") or 0
    if not shots:
        intake_blockers.append("zero_or_missing_shot_total")
    if sf.get("Count This Submission?") != 1:
        intake_blockers.append("count_this_submission_not_checked")
    stages.append(
        stage(
            "B",
            "Submission intake",
            "fail" if intake_blockers else "pass",
            blockers=intake_blockers,
            shotTotal=shots,
            attachmentUploadStatus=select_name(sf, "Attachment Upload Status"),
        )
    )

    hw1 = attachment_count(sf, "HW Sub 1")
    hw2 = attachment_count(sf, "HW Sub 2")
    vid = attachment_count(sf, "Video Upload")
    att_blockers = []
    for label, actual, exp in [("HW Sub 1", hw1, EXPECTED["hw_sub_1"]), ("HW Sub 2", hw2, EXPECTED["hw_sub_2"]), ("Video Upload", vid, EXPECTED["video"])]:
        if actual != exp:
            att_blockers.append(f"{label}_count_{actual}_expected_{exp}")
    stages.append(
        stage(
            "C",
            "Fillout attachments",
            "fail" if att_blockers else "pass",
            counts={"HW Sub 1": hw1, "HW Sub 2": hw2, "Video Upload": vid},
            blockers=att_blockers,
        )
    )

    by_slot: dict[str, int] = {"HW1": 0, "HW2": 0, "VIDEO": 0, "OTHER": 0}
    asset_blockers = []
    for a in assets:
        slot = select_name(a.get("fields", {}), "Asset Slot") or "OTHER"
        by_slot[slot] = by_slot.get(slot, 0) + 1
    if len(assets) != EXPECTED["total_assets"]:
        asset_blockers.append(f"asset_count_{len(assets)}_expected_{EXPECTED['total_assets']}")
    for slot, exp in EXPECTED["assets"].items():
        if by_slot.get(slot, 0) != exp:
            asset_blockers.append(f"{slot}_asset_count_{by_slot.get(slot, 0)}_expected_{exp}")
    stages.append(
        stage(
            "D",
            "Asset creation (009)",
            "fail" if asset_blockers else "pass",
            totalAssets=len(assets),
            bySlot=by_slot,
            blockers=asset_blockers,
            assetIds=[a["id"] for a in assets],
        )
    )

    child_blockers = []
    if len(hw_rows) != EXPECTED["homework_completions"]:
        child_blockers.append(f"homework_completions_{len(hw_rows)}_expected_{EXPECTED['homework_completions']}")
    if len(vf_rows) != EXPECTED["video_feedback"]:
        child_blockers.append(f"video_feedback_{len(vf_rows)}_expected_{EXPECTED['video_feedback']}")
    for a in assets:
        af = a.get("fields", {})
        slot = select_name(af, "Asset Slot")
        dest = text(af, "Upload Destination") or select_name(af, "Asset Purpose")
        if slot in ("HW1", "HW2") and not link_ids(af, "Homework Completions"):
            child_blockers.append(f"hw_asset_{a['id']}_missing_homework_completion")
        if slot == "VIDEO" and not link_ids(af, "Video Feedback"):
            child_blockers.append(f"video_asset_{a['id']}_missing_video_feedback")
    stages.append(
        stage(
            "E",
            "Child links (020/013)",
            "fail" if child_blockers else "pass",
            homeworkCompletions=len(hw_rows),
            videoFeedback=len(vf_rows),
            blockers=child_blockers,
            homeworkIds=[r["id"] for r in hw_rows],
            videoFeedbackIds=[r["id"] for r in vf_rows],
        )
    )

    make_statuses = []
    make_details = []
    for a in assets:
        af = a.get("fields", {})
        us = select_name(af, "Upload Status")
        send = bool(af.get("Send to Make Trigger"))
        drive = text(af, "Google Drive File URL")
        slot = select_name(af, "Asset Slot")
        st = "pass"
        notes = []
        if us == "Processing" and not drive:
            st = "wait"
            notes.append("processing_wait_for_make")
        elif us == "Pending Link" and send:
            st = "wait"
            notes.append("queued_for_070")
        elif us == "Uploaded" and drive:
            st = "pass"
        elif us in ("Error",):
            st = "fail"
        elif slot in ("HW1", "HW2", "VIDEO") and not send and not drive:
            st = "fail"
            notes.append("send_trigger_off_or_not_uploaded")
        make_statuses.append(st)
        make_details.append(
            {
                "id": a["id"],
                "slot": slot,
                "uploadStatus": us,
                "sendToMakeTrigger": send,
                "hasDriveUrl": bool(drive),
                "status": st,
                "notes": notes,
            }
        )
    stages.append(
        stage(
            "F",
            "Make queue (070a/070b)",
            worst(*make_statuses) if make_statuses else "fail",
            assets=make_details,
        )
    )

    wb_statuses = []
    for a in assets:
        af = a.get("fields", {})
        us = select_name(af, "Upload Status")
        drive = text(af, "Google Drive File URL")
        if us == "Uploaded" and not drive:
            wb_statuses.append("fail")
        elif us == "Uploaded" and drive:
            wb_statuses.append("pass")
        elif us == "Processing":
            wb_statuses.append("wait")
        else:
            wb_statuses.append("wait" if us == "Pending Link" else "fail")
    stages.append(
        stage(
            "G",
            "Make writeback",
            worst(*wb_statuses) if wb_statuses else "fail",
            uploadedAssets=sum(1 for a in assets if select_name(a.get("fields", {}), "Upload Status") == "Uploaded"),
        )
    )

    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "athlete": enr_name,
        "expected": EXPECTED,
        "submissionId": sub_id,
        "submissionName": text(sf, "Submission Full Name"),
        "overallStatus": worst(*(s["status"] for s in stages)),
        "stages": stages,
    }

    print("===== SCHMIDT, TESTING — MAKE UPLOAD AUDIT =====")
    print(json.dumps(report, indent=2))
    print("\n--- Stage rollup ---")
    for s in stages:
        print(f"{s['stage']} {s['label']}: {s['status'].upper()}")


if __name__ == "__main__":
    main()
