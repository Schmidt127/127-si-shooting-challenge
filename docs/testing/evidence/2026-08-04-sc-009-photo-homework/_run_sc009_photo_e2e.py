#!/usr/bin/env python3
"""
SC-009 live PROD photo homework E2E (Schmidt testing enrollment only).

Proves: Submission → 009 asset → 020 HC → Make/Lambda homework_completion →
S3 writeback → reviewer URL → coach review → one XP → email-ready path.

Does not send parent email outside Schmidt recipients (Enrollment Parent Email
is mschmidt@fairfield.k12.mt.us). Prefer sendMode=test when invoking 071 manually.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

REPO = Path(__file__).resolve().parents[4]
EVIDENCE = Path(__file__).resolve().parent
TOOLS = REPO / "tools" / "airtable"
BASE = "appn84sqPw03zEbTT"
SCHMIDT = "recgP9qZYjAhE7NXm"
# Distinct homework identities so PNG / JPG / negative paths do not collide
HW_PNG = {"id": "rechVLOeyEVIqmy2v", "week": "recnMGC2JBHjO0ay6", "label": "HW1"}  # Shot Tracker Usage
HW_JPG = {"id": "rechZeLk7iNQMGZAs", "week": "recaX4EyJ7BWWKfSq", "label": "HW4"}  # Shooting Form
HW_BLANK = {"id": "reck6ahIq4ArLuNeH", "week": "recaX4EyJ7BWWKfSq", "label": "HW3"}  # Choice is Yours
FUNCTION_URL_DEFAULT = "https://qzfaiyaq7a2cugh6alpov7iyfu0nrwbf.lambda-url.us-east-2.on.aws/"

# Public controlled images (no participant data)
PNG_URL = (
    "https://raw.githubusercontent.com/Schmidt127/127-si-shooting-challenge/"
    "master/web/public/brand/logo-circle-blue-orange.png"
)
PNG_NAME = "sc009-controlled-logo.png"
JPG_URL = "https://www.w3.org/People/mimasa/test/imgformat/img/w3c_home.jpg"
JPG_NAME = "sc009-controlled-w3c.jpg"


def load_env() -> None:
    load_dotenv(TOOLS / ".env", override=False)
    load_dotenv(REPO / ".env.local", override=False)
    load_dotenv(REPO / "web" / ".env.local", override=True)
    session = TOOLS / "_preview" / "c013-prod-deploy-session.local.json"
    if session.exists():
        data = json.loads(session.read_text(encoding="utf-8"))
        for k in ("UPLOAD_WEBHOOK_SECRET_PROD", "LAMBDA_FUNCTION_URL_PROD", "MAKE_UPLOAD_WEBHOOK_URL_PROD"):
            if data.get(k):
                os.environ[k] = data[k]


def tok() -> str:
    t = os.getenv("AIRTABLE_API_TOKEN") or os.getenv("AIRTABLE_TOKEN") or ""
    if not t:
        raise SystemExit("Missing AIRTABLE_API_TOKEN")
    return t


def api(method: str, url: str, body: dict | None = None) -> dict:
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={"Authorization": f"Bearer {tok()}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            raw = r.read()
            return json.loads(raw.decode("utf-8")) if raw else {}
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        raise SystemExit(f"HTTP {e.code} {method} {url}: {detail[:1000]}") from e


def get_rec(table: str, rid: str) -> dict:
    return api("GET", f"https://api.airtable.com/v0/{BASE}/{urllib.parse.quote(table)}/{rid}")


def create_rec(table: str, fields: dict) -> dict:
    return api(
        "POST",
        f"https://api.airtable.com/v0/{BASE}/{urllib.parse.quote(table)}",
        {"fields": fields, "typecast": True},
    )


def patch_rec(table: str, rid: str, fields: dict) -> dict:
    return api(
        "PATCH",
        f"https://api.airtable.com/v0/{BASE}/{urllib.parse.quote(table)}/{rid}",
        {"fields": fields, "typecast": True},
    )


def list_recs(table: str, formula: str, fields: list[str], max_records: int = 50) -> list[dict]:
    q = [f"maxRecords={max_records}", "filterByFormula=" + urllib.parse.quote(formula)]
    for f in fields:
        q.append("fields[]=" + urllib.parse.quote(f))
    out = api("GET", f"https://api.airtable.com/v0/{BASE}/{urllib.parse.quote(table)}?{'&'.join(q)}")
    return out.get("records") or []


def delete_rec(table: str, rid: str) -> None:
    api("DELETE", f"https://api.airtable.com/v0/{BASE}/{urllib.parse.quote(table)}/{rid}")


def save(name: str, payload: dict) -> Path:
    path = EVIDENCE / name
    path.write_text(json.dumps(payload, indent=2, default=str) + "\n", encoding="utf-8")
    return path


def wait_until(label: str, fn, timeout_s: int = 180, interval_s: float = 3.0):
    deadline = time.time() + timeout_s
    last = None
    while time.time() < deadline:
        last = fn()
        if last:
            return last
        time.sleep(interval_s)
    raise SystemExit(f"TIMEOUT waiting for {label}: last={last!r}")


def function_url() -> str:
    raw = (
        os.getenv("LAMBDA_FUNCTION_URL_PROD")
        or os.getenv("LAMBDA_FUNCTION_URL")
        or FUNCTION_URL_DEFAULT
    )
    return raw.lstrip("/").rstrip("/") + "/"


def upload_secret() -> str:
    s = os.getenv("UPLOAD_WEBHOOK_SECRET_PROD") or os.getenv("UPLOAD_WEBHOOK_SECRET") or ""
    if not s:
        raise SystemExit("Missing UPLOAD_WEBHOOK_SECRET_PROD")
    return s


def make_webhook() -> str:
    u = os.getenv("MAKE_UPLOAD_WEBHOOK_URL_PROD") or ""
    if not u:
        raise SystemExit("Missing MAKE_UPLOAD_WEBHOOK_URL_PROD")
    return u


def post_json(url: str, payload: dict, headers: dict | None = None) -> dict:
    hdrs = {"Content-Type": "application/json"}
    if headers:
        hdrs.update(headers)
    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=hdrs, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            text = resp.read().decode("utf-8")
            try:
                body = json.loads(text) if text else {}
            except json.JSONDecodeError:
                body = {"raw": text}
            return {"statusCode": resp.status, "body": body, "raw": text}
    except urllib.error.HTTPError as e:
        text = e.read().decode("utf-8", errors="replace")
        try:
            body = json.loads(text)
        except json.JSONDecodeError:
            body = {"raw": text}
        return {"statusCode": e.code, "body": body, "raw": text}


def get_bytes_status(url: str) -> dict:
    req = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = resp.read(64)
            return {
                "statusCode": resp.status,
                "contentType": resp.headers.get("Content-Type"),
                "bytesSampleLen": len(data),
                "ok": True,
            }
    except urllib.error.HTTPError as e:
        return {"statusCode": e.code, "ok": False, "error": e.reason}
    except Exception as e:  # noqa: BLE001
        return {"statusCode": None, "ok": False, "error": str(e)}


def asset_snapshot(fields: dict) -> dict:
    return {
        "Upload Status": fields.get("Upload Status"),
        "Upload Error": fields.get("Upload Error"),
        "Canonical File URL": fields.get("Canonical File URL"),
        "Storage Key": fields.get("Storage Key"),
        "Uploaded At": fields.get("Uploaded At"),
        "File Content Hash": fields.get("File Content Hash"),
        "File MIME Type": fields.get("File MIME Type"),
        "Reviewer Access Token": fields.get("Reviewer Access Token"),
        "Reviewer File URL": fields.get("Reviewer File URL"),
        "Send to Make Trigger": fields.get("Send to Make Trigger"),
        "Writeback Complete?": fields.get("Writeback Complete?"),
        "Homework Completions": fields.get("Homework Completions"),
        "Asset Type": fields.get("Asset Type"),
        "Asset Slot": fields.get("Asset Slot"),
        "Ready to Send to Make?": fields.get("Ready to Send to Make?"),
    }


def verify_upload_fields(fields: dict) -> dict[str, bool]:
    mime = str(fields.get("File MIME Type") or "").lower()
    return {
        "uploadStatusUploaded": fields.get("Upload Status") == "Uploaded",
        "uploadErrorBlank": not str(fields.get("Upload Error") or "").strip(),
        "canonicalPresent": bool(fields.get("Canonical File URL")),
        "storageKeyPresent": bool(fields.get("Storage Key")),
        "uploadedAtPresent": bool(fields.get("Uploaded At")),
        "sha256Present": len(str(fields.get("File Content Hash") or "")) == 64,
        "mimeIsImage": mime.startswith("image/"),
        "reviewerTokenPresent": bool(fields.get("Reviewer Access Token")),
        "reviewerUrlPresent": bool(fields.get("Reviewer File URL")),
        "writebackComplete": fields.get("Writeback Complete?") in (1, True, "1"),
    }


def create_photo_submission(*, filename: str, file_url: str, label: str, hw: dict) -> dict:
    today = date.today().isoformat()
    sub = create_rec(
        "Submissions",
        {
            "Enrollment": [SCHMIDT],
            "Week": [hw["week"]],
            "Activity Date": today,
            "Homework Name 1": [hw["id"]],
            "HW Sub 1": [{"url": file_url, "filename": filename}],
        },
    )
    return {
        "submissionId": sub["id"],
        "label": label,
        "filename": filename,
        "fileUrl": file_url,
        "homeworkId": hw["id"],
        "weekId": hw["week"],
    }


def wait_for_asset(submission_id: str) -> dict:
    def _find():
        sub = get_rec("Submissions", submission_id)
        asset_ids = sub.get("fields", {}).get("Submission Assets") or []
        if not asset_ids:
            return None
        asset = get_rec("Submission Assets", asset_ids[0])
        return asset

    return wait_until("009 Submission Asset", _find, timeout_s=180)


def wait_for_hc_on_asset(asset_id: str) -> dict:
    def _ready():
        fields = get_rec("Submission Assets", asset_id)["fields"]
        hcs = fields.get("Homework Completions") or []
        status = fields.get("Upload Status")
        ready = fields.get("Ready to Send to Make?")
        if hcs and (status == "Pending Link" or ready == "READY_TO_SEND" or fields.get("Send to Make Trigger")):
            return {"asset": fields, "homeworkCompletionId": hcs[0]}
        if hcs:
            return {"asset": fields, "homeworkCompletionId": hcs[0]}
        return None

    return wait_until("020 Homework Completion link", _ready, timeout_s=180)


def ensure_pending_and_trigger(asset_id: str) -> dict:
    fields = get_rec("Submission Assets", asset_id)["fields"]
    patch: dict = {}
    if fields.get("Upload Status") != "Pending Link" and fields.get("Upload Status") != "Uploaded":
        patch["Upload Status"] = "Pending Link"
    if not fields.get("Send to Make Trigger"):
        patch["Send to Make Trigger"] = True
    if patch:
        patch_rec("Submission Assets", asset_id, patch)
        time.sleep(2)
    return get_rec("Submission Assets", asset_id)["fields"]


def post_070a_make_payload(asset_id: str, hc_id: str) -> dict:
    payload = {
        "sourceName": "Airtable Upload Engine",
        "automationNumber": "070a",
        "sentAtIso": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        "routeKey": "homework_completion",
        "uploadDestination": "Homework Completions",
        "sourceTable": "Submission Assets",
        "submissionAssetRecordId": asset_id,
        "targetTable": "Homework Completions",
        "targetRecordId": hc_id,
    }
    result = post_json(make_webhook(), payload)
    return {"payload": payload, "response": result}


def invoke_lambda_direct(asset_id: str, hc_id: str) -> dict:
    payload = {
        "sourceName": "Airtable Upload Engine",
        "automationNumber": "070a",
        "sentAtIso": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        "routeKey": "homework_completion",
        "uploadDestination": "Homework Completions",
        "sourceTable": "Submission Assets",
        "submissionAssetRecordId": asset_id,
        "targetTable": "Homework Completions",
        "targetRecordId": hc_id,
    }
    result = post_json(function_url(), payload, {"X-Upload-Secret": upload_secret()})
    return {"payload": payload, "response": result}


def wait_uploaded(asset_id: str, timeout_s: int = 240) -> dict:
    def _up():
        fields = get_rec("Submission Assets", asset_id)["fields"]
        if fields.get("Upload Status") == "Uploaded" and fields.get("Canonical File URL"):
            return fields
        return None

    return wait_until("Lambda Uploaded writeback", _up, timeout_s=timeout_s)


def coach_review(hc_id: str) -> dict:
    return patch_rec(
        "Homework Completions",
        hc_id,
        {
            "Satisfactory?": True,
            "Review Complete": True,
            "Coach Feedback": "SC-009 controlled photo homework review — Schmidt test only.",
            "Review Status": "Reviewed",
            "Reviewed By": "Mike Schmidt",
        },
    )


def wait_xp(hc_id: str) -> dict:
    def _xp():
        rows = list_recs(
            "XP Events",
            f"AND({{Source Key}} = 'HOMEWORK_XP|{hc_id}', {{Active?}} = 1)",
            ["Source Key", "XP Points", "Homework Completion", "Enrollment", "Week", "Active?"],
        )
        return rows[0] if rows else None

    return wait_until("065 Homework XP Event", _xp, timeout_s=180)


def count_xp(hc_id: str) -> int:
    rows = list_recs(
        "XP Events",
        f"{{Source Key}} = 'HOMEWORK_XP|{hc_id}'",
        ["Source Key", "Active?"],
        max_records=20,
    )
    return len(rows)


def count_hc(enrollment: str, homework: str, week: str) -> int:
    rows = list_recs(
        "Homework Completions",
        (
            f"AND("
            f"{{Enrollment}} = '{enrollment}',"
            f"{{Homework}} = '{homework}',"
            f"{{Week}} = '{week}'"
            f")"
        ),
        ["Enrollment", "Homework", "Week"],
        max_records=20,
    )
    return len(rows)


def run_happy_path(image: str) -> dict:
    load_env()
    if image == "jpg":
        filename, file_url, label, hw = JPG_NAME, JPG_URL, "jpg", HW_JPG
    else:
        filename, file_url, label, hw = PNG_NAME, PNG_URL, "png", HW_PNG

    evidence: dict = {
        "startedAt": datetime.now(timezone.utc).isoformat(),
        "image": label,
        "enrollmentId": SCHMIDT,
        "homeworkId": hw["id"],
        "weekId": hw["week"],
        "homeworkLabel": hw["label"],
        "steps": {},
    }

    created = create_photo_submission(filename=filename, file_url=file_url, label=label, hw=hw)
    evidence["steps"]["submission"] = created
    sub_id = created["submissionId"]

    asset_row = wait_for_asset(sub_id)
    asset_id = asset_row["id"]
    evidence["steps"]["assetCreated"] = {"assetId": asset_id, "fields": asset_snapshot(asset_row.get("fields") or {})}

    linked = wait_for_hc_on_asset(asset_id)
    hc_id = linked["homeworkCompletionId"]
    evidence["steps"]["homeworkCompletion"] = {
        "homeworkCompletionId": hc_id,
        "hcCountForIdentity": count_hc(SCHMIDT, hw["id"], hw["week"]),
        "assetAfter020": asset_snapshot(get_rec("Submission Assets", asset_id)["fields"]),
    }

    # Prefer natural 070a if trigger already checked; otherwise set trigger + post Make payload (070a contract)
    before_upload = ensure_pending_and_trigger(asset_id)
    evidence["steps"]["preUpload"] = asset_snapshot(before_upload)

    make_result = None
    lambda_fallback = None
    try:
        # Give live 070a a short window if ON
        try:
            uploaded = wait_uploaded(asset_id, timeout_s=45)
            evidence["steps"]["uploadPath"] = "automation_070a_or_prior"
        except SystemExit:
            make_result = post_070a_make_payload(asset_id, hc_id)
            evidence["steps"]["makeWebhook"] = {
                "statusCode": make_result["response"]["statusCode"],
                "body": make_result["response"]["body"],
                "payloadRouteKey": make_result["payload"]["routeKey"],
                "payloadAutomationNumber": make_result["payload"]["automationNumber"],
            }
            try:
                uploaded = wait_uploaded(asset_id, timeout_s=120)
                evidence["steps"]["uploadPath"] = "make_webhook_070a_payload"
            except SystemExit:
                lambda_fallback = invoke_lambda_direct(asset_id, hc_id)
                evidence["steps"]["lambdaDirect"] = {
                    "statusCode": lambda_fallback["response"]["statusCode"],
                    "body": lambda_fallback["response"]["body"],
                }
                uploaded = wait_uploaded(asset_id, timeout_s=120)
                evidence["steps"]["uploadPath"] = "lambda_direct_fallback"
    except Exception as e:  # noqa: BLE001
        evidence["error"] = str(e)
        save(f"SC-009-{label}-FAILED.json", evidence)
        raise

    checks = verify_upload_fields(uploaded)
    evidence["steps"]["uploadWriteback"] = {"fields": asset_snapshot(uploaded), "checks": checks}

    reviewer_url = uploaded.get("Reviewer File URL") or ""
    canonical_url = uploaded.get("Canonical File URL") or ""
    evidence["steps"]["reviewerLink"] = get_bytes_status(reviewer_url) if reviewer_url else {"ok": False}
    evidence["steps"]["canonicalAnonymous"] = get_bytes_status(canonical_url) if canonical_url else {"ok": False}

    # Invalid reviewer token
    if reviewer_url and "token=" in reviewer_url:
        bad = reviewer_url.split("token=")[0] + "token=INVALID_SC009_TOKEN"
        evidence["steps"]["invalidReviewerToken"] = get_bytes_status(bad)

    # Retry same asset (idempotent)
    retry = invoke_lambda_direct(asset_id, hc_id)
    after_retry = get_rec("Submission Assets", asset_id)["fields"]
    evidence["steps"]["retryUpload"] = {
        "lambda": {
            "statusCode": retry["response"]["statusCode"],
            "actionOut": (retry["response"].get("body") or {}).get("actionOut"),
        },
        "fields": asset_snapshot(after_retry),
        "hashUnchanged": after_retry.get("File Content Hash") == uploaded.get("File Content Hash"),
        "storageKeyUnchanged": after_retry.get("Storage Key") == uploaded.get("Storage Key"),
    }

    # Coach review → XP
    coach_review(hc_id)
    xp = wait_xp(hc_id)
    xp_count_1 = count_xp(hc_id)
    evidence["steps"]["xpFirst"] = {
        "xpEventId": xp["id"],
        "fields": xp.get("fields"),
        "xpCount": xp_count_1,
    }

    # Duplicate review attempt
    coach_review(hc_id)
    time.sleep(8)
    xp_count_2 = count_xp(hc_id)
    hc_count = count_hc(SCHMIDT, hw["id"], hw["week"])
    asset_count = len(get_rec("Submissions", sub_id).get("fields", {}).get("Submission Assets") or [])
    evidence["steps"]["idempotency"] = {
        "xpCountAfterDuplicateReview": xp_count_2,
        "homeworkCompletionCount": hc_count,
        "assetCountForSubmission": asset_count,
        "pass": xp_count_2 == 1 and hc_count == 1 and asset_count == 1,
    }

    hc_fields = get_rec("Homework Completions", hc_id)["fields"]
    evidence["steps"]["emailReadyPath"] = {
        "Upload Ready?": hc_fields.get("Upload Ready?"),
        "Parent Feedback Ready?": hc_fields.get("Parent Feedback Ready?"),
        "Award Status": hc_fields.get("Award Status"),
        "Base XP Awarded": hc_fields.get("Base XP Awarded"),
        "Total Homework XP Awarded": hc_fields.get("Total Homework XP Awarded"),
        "Satisfactory?": hc_fields.get("Satisfactory?"),
        "parentEmailOnEnrollment": get_rec("Enrollments", SCHMIDT)["fields"].get("Parent Email"),
        "note": "071 fires when Parent Feedback Ready? is set by 065; Schmidt-only recipient.",
    }

    evidence["pass"] = (
        all(checks.values())
        and evidence["steps"]["reviewerLink"].get("ok") is True
        and evidence["steps"]["canonicalAnonymous"].get("ok") is False
        and evidence["steps"]["idempotency"]["pass"] is True
        and xp_count_1 == 1
    )
    evidence["finishedAt"] = datetime.now(timezone.utc).isoformat()
    save(f"SC-009-{label}-E2E.json", evidence)
    print(json.dumps({"pass": evidence["pass"], "assetId": asset_id, "hcId": hc_id, "xpId": xp["id"]}, indent=2))
    return evidence


def run_blank_attachment_failure() -> dict:
    load_env()
    hw = HW_BLANK
    sub = create_rec(
        "Submissions",
        {
            "Enrollment": [SCHMIDT],
            "Week": [hw["week"]],
            "Activity Date": date.today().isoformat(),
            "Homework Name 1": [hw["id"]],
        },
    )
    asset = create_rec(
        "Submission Assets",
        {
            "Asset Label": "SC-009 blank attachment failure",
            "Submission - Linked": [sub["id"]],
            "Enrollment - Linked": [SCHMIDT],
            "Asset Purpose": "Homework 1",
            "Asset Type": "Homework Image",
            "Asset Slot": "HW1",
            "Send to Make Trigger": False,
        },
    )
    result = {
        "submissionId": sub["id"],
        "assetId": asset["id"],
        "homeworkId": hw["id"],
        "weekId": hw["week"],
        "fields": asset_snapshot(get_rec("Submission Assets", asset["id"])["fields"]),
    }
    hc = create_rec(
        "Homework Completions",
        {
            "Enrollment": [SCHMIDT],
            "Week": [hw["week"]],
            "Homework": [hw["id"]],
            "Submission Assets": [asset["id"]],
            "Source System": "Manual Upload",
            "Completion Status": "Submitted",
            "Review Status": "Ready for Review",
            "Item Type": "Homework",
            "Item Slot": "HW1",
            "Asset Type": "Homework Image",
        },
    )
    patch_rec("Submission Assets", asset["id"], {"Homework Completions": [hc["id"]], "Upload Status": "Pending Link"})
    invoke = invoke_lambda_direct(asset["id"], hc["id"])
    result["homeworkCompletionId"] = hc["id"]
    result["lambda"] = {
        "statusCode": invoke["response"]["statusCode"],
        "actionOut": (invoke["response"].get("body") or {}).get("actionOut"),
        "errorOut": (invoke["response"].get("body") or {}).get("errorOut"),
    }
    after = get_rec("Submission Assets", asset["id"])["fields"]
    result["afterFields"] = asset_snapshot(after)
    result["pass"] = (
        result["lambda"]["statusCode"] >= 400
        or str(result["lambda"].get("actionOut") or "").startswith("error")
        or after.get("Upload Status") == "Error"
        or bool(after.get("Upload Error"))
    )
    save("SC-009-blank-attachment-failure.json", result)
    print(json.dumps({"pass": result["pass"], "actionOut": result["lambda"].get("actionOut")}, indent=2))
    return result


def cleanup(ids: dict) -> None:
    """Best-effort delete of controlled test rows (XP first, then HC, assets, submission)."""
    load_env()
    for table, key in (
        ("XP Events", "xpEventId"),
        ("Homework Completions", "homeworkCompletionId"),
        ("Submission Assets", "assetId"),
        ("Submissions", "submissionId"),
    ):
        rid = ids.get(key)
        if not rid:
            continue
        try:
            delete_rec(table, rid)
            print("deleted", table, rid)
        except SystemExit as e:
            print("skip delete", table, rid, e)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["png", "jpg", "blank-attachment", "all"])
    args = parser.parse_args()
    load_env()
    if args.command == "png":
        run_happy_path("png")
    elif args.command == "jpg":
        run_happy_path("jpg")
    elif args.command == "blank-attachment":
        run_blank_attachment_failure()
    else:
        png = run_happy_path("png")
        # blank attachment as negative path (uses same HW — may create extra HC; run after primary)
        blank = run_blank_attachment_failure()
        summary = {
            "pngPass": png.get("pass"),
            "blankPass": blank.get("pass"),
            "pngAsset": (png.get("steps") or {}).get("assetCreated", {}).get("assetId"),
            "pngHc": (png.get("steps") or {}).get("homeworkCompletion", {}).get("homeworkCompletionId"),
            "pngXp": (png.get("steps") or {}).get("xpFirst", {}).get("xpEventId"),
        }
        save("SC-009-SUMMARY.json", summary)
        print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
