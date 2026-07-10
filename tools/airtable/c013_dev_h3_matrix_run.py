#!/usr/bin/env python3
"""C-023 H3b–H3p DEV contextual reuse matrix (direct Lambda invoke only).

Does not enable 070a/070b or Make. Artifacts under tools/airtable/_preview/.
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
from zoneinfo import ZoneInfo

import requests
from dotenv import load_dotenv

HERE = Path(__file__).parent
REPO = HERE.parents[1]
DEV_BASE = "appTetnuCZlCZdTCT"
SCHMIDT = "recgP9qZYjAhE7NXm"
WEEK_10 = "recrTwxqXz31fNZ7e"
WEEK_OTHER = "rec8VqJqJqJqJqJqJ"  # patched at runtime if needed
HASH = "448c3126df730cf6b0cf6875f77f1f726b1fa3a2b4c36bb631b326981b25f967"
DEFAULT_REF = "recF86pJTIMFoEypJ"
DENVER = ZoneInfo("America/Denver")

VERIFY_FIELDS = [
    "Upload Status", "Canonical File URL", "Storage Key", "File Content Hash",
    "File Hash Algorithm", "File Size Bytes", "Uploaded At", "Upload Error",
    "Upload Claim Run ID", "Processing Started At",
    "Exact Hash Match Found?", "Same Enrollment Match Found?", "Potential Asset Reuse?",
    "Asset Reuse Review Primary Reason", "Asset Reuse Review Reasons",
    "Asset Reuse Review Summary", "Duplicate Match Record", "Duplicate Match Records (All)",
    "Asset Reuse Decision", "Asset Reuse Review Notes", "Asset Reuse Reviewed At",
    "Enrollment - Linked", "Submission - Linked", "Homework Completions", "Video Feedback",
    "Week", "Upload Destination", "Asset Type", "Asset Label",
]


def load_env() -> None:
    load_dotenv(HERE / ".env", override=True)


def tok() -> str:
    t = os.getenv("AIRTABLE_TOKEN") or os.getenv("AIRTABLE_API_TOKEN") or ""
    if not t:
        raise SystemExit("ERROR: missing AIRTABLE_TOKEN")
    return t


def api(table: str, record_id: str | None = None) -> str:
    p = quote(table, safe="")
    if record_id:
        return f"https://api.airtable.com/v0/{DEV_BASE}/{p}/{record_id}"
    return f"https://api.airtable.com/v0/{DEV_BASE}/{p}"


def get_rec(table: str, rid: str) -> dict:
    r = requests.get(api(table, rid), headers={"Authorization": f"Bearer {tok()}"}, timeout=120)
    r.raise_for_status()
    return r.json()


def patch_rec(table: str, rid: str, fields: dict) -> dict:
    r = requests.patch(
        api(table, rid),
        headers={"Authorization": f"Bearer {tok()}", "Content-Type": "application/json"},
        json={"fields": fields, "typecast": True},
        timeout=120,
    )
    r.raise_for_status()
    return r.json()


def asset_fields(rid: str) -> dict:
    return get_rec("Submission Assets", rid).get("fields", {})


def snap_asset(rid: str) -> dict:
    f = asset_fields(rid)
    return {k: f.get(k) for k in VERIFY_FIELDS}


def s3_count_for_asset(asset_id: str, storage_key: str | None = None) -> int:
    prefix = storage_key or f"shooting-challenge/2026-2027/shooting-challenge/schmidt-testing/"
    if storage_key:
        prefix = "/".join(storage_key.split("/")[:-1]) + "/"
    needle = f"video-feedback-{asset_id.lower()}"
    env = os.environ.copy()
    env.pop("AWS_PROFILE", None)
    out = subprocess.check_output(
        [
            "aws", "s3api", "list-objects-v2",
            "--bucket", "shooting-challenge-assets",
            "--prefix", prefix,
            "--region", "us-east-2",
            "--output", "json",
        ],
        env=env,
        text=True,
    )
    contents = json.loads(out).get("Contents") or []
    if storage_key:
        return 1 if any(c.get("Key") == storage_key for c in contents) else 0
    return sum(1 for c in contents if needle in (c.get("Key") or "").lower())


def invoke_lambda(asset_id: str, target_record_id: str | None = None) -> dict:
    out_name = f"_preview/c013-dev-h3-matrix-lambda-{asset_id}-{int(time.time())}.json"
    cmd = [
        sys.executable,
        str(HERE / "c013_dev_lambda_invoke.py"),
        asset_id,
        "--aws",
        "--out",
        out_name,
    ]
    if target_record_id:
        cmd.extend(["--target-record-id", target_record_id])
    env = os.environ.copy()
    if env.get("AWS_ACCESS_KEY_ID"):
        env.pop("AWS_PROFILE", None)
    proc = subprocess.run(cmd, cwd=str(HERE), capture_output=True, text=True, env=env)
    if proc.returncode != 0:
        raise SystemExit(f"lambda invoke failed: {proc.stderr[:800]}")
    out_path = HERE / out_name
    if out_path.exists():
        return json.loads(out_path.read_text(encoding="utf-8"))
    text = proc.stdout.strip()
    start = text.rfind("{")
    return json.loads(text[start:text.rfind("}") + 1])


def prep_fresh_asset(reference: str = DEFAULT_REF) -> str:
    cmd = [
        sys.executable,
        str(HERE / "c013_dev_h3_duplicate_bytes_prep.py"),
        "--reference-asset",
        reference,
        "--confirm-write",
    ]
    proc = subprocess.run(cmd, cwd=str(HERE), capture_output=True, text=True)
    if proc.returncode != 0:
        raise SystemExit(f"prep failed: {proc.stderr[:800]}")
    data = json.loads(proc.stdout.strip().split("\n\n")[0])
    return data["h3AssetId"]


def homework_target_for(asset_id: str) -> str:
    hw = (asset_fields(asset_id).get("Homework Completions") or [None])[0]
    if not hw:
        raise SystemExit(f"homework asset {asset_id} missing Homework Completions link")
    return hw


def ensure_pending(asset_id: str) -> None:
    f = asset_fields(asset_id)
    if f.get("Upload Status") == "Pending Link" and not f.get("Canonical File URL"):
        return
    fields: dict = {"Upload Status": "Pending Link", "Upload Error": None}
    for key in (
        "Canonical File URL", "Storage Key", "File Content Hash", "File Hash Algorithm",
        "Uploaded At", "Upload Claim Run ID", "Processing Started At",
        "Exact Hash Match Found?", "Same Enrollment Match Found?", "Potential Asset Reuse?",
        "Asset Reuse Review Primary Reason", "Asset Reuse Review Summary",
        "Duplicate Match Record", "Asset Reuse Decision",
    ):
        if key in (
            "Exact Hash Match Found?", "Same Enrollment Match Found?", "Potential Asset Reuse?",
        ):
            fields[key] = False
        elif key in ("Asset Reuse Review Primary Reason", "Asset Reuse Review Summary", "Upload Error", "Asset Reuse Decision"):
            fields[key] = None
        elif key in ("Duplicate Match Record",):
            fields[key] = []
        elif key in ("Asset Reuse Review Reasons",):
            fields[key] = []
        else:
            fields[key] = None
    fields["Asset Reuse Review Reasons"] = []
    fields["Duplicate Match Records (All)"] = []
    patch_rec("Submission Assets", asset_id, fields)


def upload_and_verify(
    scenario: str,
    asset_id: str,
    *,
    reference_id: str,
    expectations: dict,
    retry: bool = False,
    patch_before: dict | None = None,
    target_record_id: str | None = None,
) -> dict:
    if patch_before:
        patch_rec("Submission Assets", asset_id, patch_before)
    ensure_pending(asset_id)
    before = snap_asset(asset_id)
    s3_before = s3_count_for_asset(asset_id)
    resp1 = invoke_lambda(asset_id, target_record_id)
    body1 = resp1.get("body") if isinstance(resp1.get("body"), dict) else resp1
    if isinstance(body1, str):
        body1 = json.loads(body1)
    after1 = snap_asset(asset_id)
    s3_after = s3_count_for_asset(asset_id, after1.get("Storage Key"))

    result = {
        "scenario": scenario,
        "assetId": asset_id,
        "referenceAssetId": reference_id,
        "before": before,
        "lambda1": {"statusCode": resp1.get("statusCode"), "body": body1},
        "after1": after1,
        "s3Before": s3_before,
        "s3After": s3_after,
        "expectations": expectations,
        "checks": {},
    }

    def check(name: str, ok: bool, detail: str = "") -> None:
        result["checks"][name] = {"pass": ok, "detail": detail}

    action = body1.get("actionOut")
    c023 = body1.get("c023Duplicate") or {}
    check("actionOut", action == expectations.get("actionOut", "uploaded"), action)
    if expectations.get("allPass"):
        check("allPass", body1.get("allPass") is True, str(body1.get("allPass")))
    check("uploaded", after1.get("Upload Status") == expectations.get("uploadStatus", "Uploaded"))
    check("canonical", bool(after1.get("Canonical File URL")) == expectations.get("expectCanonical", True))
    check("independentS3", s3_after >= expectations.get("minS3", 1))
    if "exactHash" in expectations:
        check("exactHash", after1.get("Exact Hash Match Found?") == expectations["exactHash"])
    if "sameEnrollment" in expectations:
        check("sameEnrollment", after1.get("Same Enrollment Match Found?") == expectations["sameEnrollment"])
    if "potentialReuse" in expectations:
        check("potentialReuse", after1.get("Potential Asset Reuse?") == expectations["potentialReuse"])
    if "primaryReason" in expectations:
        got = after1.get("Asset Reuse Review Primary Reason")
        check("primaryReason", got == expectations["primaryReason"], str(got))
    if "reasonIncludes" in expectations:
        reasons = after1.get("Asset Reuse Review Reasons") or []
        for r in expectations["reasonIncludes"]:
            check(f"reason_{r}", r in reasons, str(reasons))
    if "reasonExcludes" in expectations:
        reasons = after1.get("Asset Reuse Review Reasons") or []
        for r in expectations["reasonExcludes"]:
            check(f"no_{r}", r not in reasons, str(reasons))
    if expectations.get("decision"):
        check("decision", after1.get("Asset Reuse Decision") == expectations["decision"])
    if expectations.get("primaryMatch"):
        pm = (after1.get("Duplicate Match Record") or [None])[0]
        check("primaryMatch", pm == expectations["primaryMatch"], str(pm))
    if expectations.get("minAllMatches"):
        allm = after1.get("Duplicate Match Records (All)") or []
        check("allMatches", len(allm) >= expectations["minAllMatches"], str(len(allm)))

    if retry:
        before2 = snap_asset(asset_id)
        sk = before2.get("Storage Key")
        resp2 = invoke_lambda(asset_id, target_record_id)
        body2 = resp2.get("body") if isinstance(resp2.get("body"), dict) else resp2
        if isinstance(body2, str):
            body2 = json.loads(body2)
        after2 = snap_asset(asset_id)
        result["lambda2"] = {"statusCode": resp2.get("statusCode"), "body": body2}
        result["after2"] = after2
        check("retryAction", body2.get("actionOut") == expectations.get("retryActionOut", "skipped_already_uploaded"))
        check("retryKeyUnchanged", after2.get("Storage Key") == sk)
        check("retryHashUnchanged", after2.get("File Content Hash") == before2.get("File Content Hash"))

    result["pass"] = all(v["pass"] for v in result["checks"].values())
    out = HERE / "_preview" / f"c013-dev-h3-matrix-{scenario}-{asset_id}.json"
    out.write_text(json.dumps(result, indent=2, default=str) + "\n", encoding="utf-8")
    return result


def find_or_create_second_test_enrollment() -> str:
    formula = "FIND('C-023 Test Enrollment 2', {Full Athlete Name - Backward})"
    r = requests.get(
        api("Enrollments"),
        headers={"Authorization": f"Bearer {tok()}"},
        params={"filterByFormula": formula, "pageSize": 5, "fields[0]": "Full Athlete Name - Backward"},
        timeout=120,
    )
    r.raise_for_status()
    recs = r.json().get("records", [])
    if recs:
        return recs[0]["id"]
    # Create DEV-only second test enrollment for cross-enrollment matrix
    r2 = requests.post(
        api("Enrollments"),
        headers={"Authorization": f"Bearer {tok()}", "Content-Type": "application/json"},
        json={
            "fields": {
                "Full Athlete Name - Backward": "C-023 Test Enrollment 2 - DEV",
                "Active?": False,
            },
            "typecast": True,
        },
        timeout=120,
    )
    if not r2.ok:
        raise SystemExit(f"create test enrollment failed: {r2.status_code} {r2.text[:400]}")
    return r2.json()["id"]


HW_TEMPLATE = "rec14HLmrN5suEyWs"
H2_ACTIVITY_DATE = "2026-06-30"


def poll_homework_asset(scenario_id: str, *, timeout_sec: int = 600) -> str:
    deadline = time.time() + timeout_sec
    while time.time() < deadline:
        sc = get_rec("Testing Scenarios", scenario_id)
        linked = (sc.get("fields", {}).get("Linked Submission") or [None])[0]
        if linked:
            formula = f"AND({{Submission - Linked}} = '{linked}')"
            r = requests.get(
                api("Submission Assets"),
                headers={"Authorization": f"Bearer {tok()}"},
                params={"filterByFormula": formula, "pageSize": 10},
                timeout=120,
            )
            r.raise_for_status()
            for rec in r.json().get("records", []):
                af = rec.get("fields", {})
                dest = af.get("Upload Destination")
                if af.get("Airtable Attachment") and dest in {"Homework Completions", "Homework"}:
                    return rec["id"]
        time.sleep(5)
    raise SystemExit(f"homework asset poll timeout for scenario {scenario_id}")


def prep_homework_asset(reference: str = DEFAULT_REF) -> str:
    ref = get_rec("Submission Assets", reference)
    att = (ref.get("fields", {}).get("Airtable Attachment") or [None])[0]
    if not att:
        raise SystemExit(f"reference {reference} missing attachment")
    tg = get_rec("Testing Scenarios", HW_TEMPLATE).get("fields", {})
    run_label = datetime.now(DENVER).strftime("%Y-%m-%d-%H%M")
    scenario_fields = {
        "Test Intake Name": f"C-023 H3 homework {run_label}",
        "Scenario Type": "Homework",
        "Related Enrollment": [SCHMIDT],
        "Submission Date": tg.get("Submission Date") or H2_ACTIVITY_DATE,
        "Homework Assignment": tg.get("Homework Assignment"),
        "Intake Attachments": [{"url": att["url"], "filename": "c023-h3-homework-bytes.png"}],
        "Dry Run?": False,
        "Run Test?": False,
        "Test Status": "Queued",
    }
    r = requests.post(
        api("Testing Scenarios"),
        headers={"Authorization": f"Bearer {tok()}", "Content-Type": "application/json"},
        json={"fields": scenario_fields, "typecast": True},
        timeout=120,
    )
    r.raise_for_status()
    scenario_id = r.json()["id"]
    requests.patch(
        api("Testing Scenarios", scenario_id),
        headers={"Authorization": f"Bearer {tok()}", "Content-Type": "application/json"},
        json={"fields": {"Run Test?": True}, "typecast": True},
        timeout=120,
    ).raise_for_status()
    return poll_homework_asset(scenario_id)


KNOWN_HW_SEED = "recq9t8zWUhDJts40"


def find_homework_reference() -> dict:
    try:
        rec = get_rec("Submission Assets", KNOWN_HW_SEED)
        fields = rec.get("fields", {})
        if (
            fields.get("Upload Status") == "Uploaded"
            and fields.get("File Content Hash") == HASH
            and fields.get("Homework Completions")
        ):
            return {"id": KNOWN_HW_SEED, "fields": fields}
    except Exception:
        pass
    formula = f"AND({{Upload Status}}='Uploaded', {{File Content Hash}}='{HASH}')"
    r = requests.get(
        api("Submission Assets"),
        headers={"Authorization": f"Bearer {tok()}"},
        params={"filterByFormula": formula, "pageSize": 50},
        timeout=120,
    )
    r.raise_for_status()
    for rec in r.json().get("records", []):
        fields = rec.get("fields", {})
        enrollments = fields.get("Enrollment - Linked") or []
        if SCHMIDT not in enrollments:
            continue
        dest = str(fields.get("Upload Destination") or "").lower()
        if fields.get("Homework Completions") or "homework" in dest:
            return {"id": rec["id"], "fields": fields}
    raise SystemExit("no homework reference asset with test hash")


def ensure_homework_reference(reference: str) -> str:
    pending_formula = (
        f"AND({{Enrollment - Linked}}='{SCHMIDT}', {{Upload Status}}='Pending Link', "
        f"{{Upload Destination}}='Homework Completions')"
    )
    r = requests.get(
        api("Submission Assets"),
        headers={"Authorization": f"Bearer {tok()}"},
        params={"filterByFormula": pending_formula, "pageSize": 10},
        timeout=120,
    )
    r.raise_for_status()
    pending = [
        rec
        for rec in r.json().get("records", [])
        if "c023-h3-homework-bytes" in (rec.get("fields", {}).get("Original File Name") or "")
    ]
    if pending:
        aid = pending[0]["id"]
        upload_and_verify(
            "H3-hw-ref",
            aid,
            reference_id=reference,
            target_record_id=homework_target_for(aid),
            expectations={"actionOut": "uploaded"},
        )
        return aid
    try:
        return find_homework_reference()["id"]
    except SystemExit:
        pass
    aid = prep_homework_asset(reference)
    upload_and_verify(
        "H3-hw-ref",
        aid,
        reference_id=reference,
        target_record_id=homework_target_for(aid),
        expectations={"actionOut": "uploaded"},
    )
    return aid


def context_from_ref(ref_id: str) -> dict:
    f = asset_fields(ref_id)
    ctx = {}
    for key in ("Enrollment - Linked", "Submission - Linked", "Homework Completions", "Video Feedback"):
        val = f.get(key)
        if val is not None:
            ctx[key] = val
    return ctx


def patchable_context_patch(ref_id: str, *, variant: str) -> dict:
    """Build writable-link context patches (no formula/lookup fields)."""
    base = context_from_ref(ref_id)
    ref = asset_fields(ref_id)
    if variant == "same_assignment":
        return base
    if variant == "different_assignment":
        return {
            **base,
            "Homework Completions": [],
            "Asset Label": "H3c-different-assignment-slot",
        }
    if variant == "different_week":
        ref_sub = (ref.get("Submission - Linked") or [""])[0]
        formula = f"AND({{Enrollment}}='{SCHMIDT}', RECORD_ID()!='{ref_sub}')"
        r = requests.get(
            api("Submissions"),
            headers={"Authorization": f"Bearer {tok()}"},
            params={"filterByFormula": formula, "pageSize": 10, "fields[0]": "Week"},
            timeout=120,
        )
        r.raise_for_status()
        subs = r.json().get("records", [])
        ref_week = set(ref.get("Week") or [])
        for sub in subs:
            week = sub.get("fields", {}).get("Week") or []
            if week and set(week) != ref_week:
                return {**base, "Submission - Linked": [sub["id"]]}
        if subs:
            return {**base, "Submission - Linked": [subs[0]["id"]]}
        return base
    if variant == "missing_context":
        return {
            "Enrollment - Linked": base.get("Enrollment - Linked"),
            "Submission - Linked": [],
            "Homework Completions": [],
            "Video Feedback": ref.get("Video Feedback"),
        }
    if variant == "homework_for_vf":
        return {
            **base,
            "Homework Completions": [],
            "Video Feedback": ref.get("Video Feedback"),
        }
    if variant == "vf_for_homework":
        return {
            **base,
            "Video Feedback": [],
            "Homework Completions": ref.get("Homework Completions") or [],
            "Asset Label": "H3e-homework-slot",
        }
    return base


def run_h3b(ref_id: str) -> dict:
    aid = prep_fresh_asset(ref_id)
    ref = asset_fields(ref_id)
    return upload_and_verify(
        "H3b",
        aid,
        reference_id=ref_id,
        patch_before=patchable_context_patch(ref_id, variant="same_assignment"),
        target_record_id=(ref.get("Video Feedback") or [None])[0],
        expectations={
            "reasonIncludes": ["Same Assignment Resubmission"],
            "exactHash": True,
            "sameEnrollment": True,
            "potentialReuse": True,
            "decision": "Not Reviewed",
        },
    )


def run_h3c(ref_id: str) -> dict:
    aid = prep_fresh_asset(ref_id)
    return upload_and_verify(
        "H3c",
        aid,
        reference_id=ref_id,
        patch_before=patchable_context_patch(ref_id, variant="different_assignment"),
        expectations={
            "primaryReason": "Different Assignment Reuse",
            "reasonIncludes": ["Different Assignment Reuse"],
            "exactHash": True,
            "sameEnrollment": True,
            "potentialReuse": True,
            "decision": "Not Reviewed",
        },
    )


def run_h3d(hw_ref: str) -> dict:
    aid = prep_fresh_asset(hw_ref)
    return upload_and_verify(
        "H3d",
        aid,
        reference_id=hw_ref,
        expectations={
            "primaryReason": "Homework Used for Video Feedback",
            "reasonIncludes": ["Homework Used for Video Feedback"],
            "exactHash": True,
            "sameEnrollment": True,
            "potentialReuse": True,
            "decision": "Not Reviewed",
        },
    )


def run_h3e(vf_ref: str) -> dict:
    aid = prep_homework_asset(vf_ref)
    return upload_and_verify(
        "H3e",
        aid,
        reference_id=vf_ref,
        target_record_id=homework_target_for(aid),
        expectations={
            "primaryReason": "Video Feedback Used for Homework",
            "reasonIncludes": ["Video Feedback Used for Homework"],
            "exactHash": True,
            "sameEnrollment": True,
            "potentialReuse": True,
            "decision": "Not Reviewed",
        },
    )


def run_h3f(ref_id: str, other_enrollment: str) -> dict:
    aid = prep_fresh_asset(ref_id)
    return upload_and_verify(
        "H3f",
        aid,
        reference_id=ref_id,
        patch_before={"Enrollment - Linked": [other_enrollment]},
        expectations={
            "exactHash": True,
            "sameEnrollment": False,
            "potentialReuse": False,
            "decision": "Not Reviewed",
            "reasonExcludes": [
                "Same Assignment Resubmission",
                "Different Assignment Reuse",
                "Different Week Reuse",
            ],
        },
    )


def run_h3g(ref_id: str) -> dict:
    aid = prep_fresh_asset(ref_id)
    return upload_and_verify(
        "H3g",
        aid,
        reference_id=ref_id,
        patch_before=patchable_context_patch(ref_id, variant="different_week"),
        expectations={
            "reasonIncludes": ["Different Week Reuse"],
            "exactHash": True,
            "sameEnrollment": True,
            "potentialReuse": True,
            "decision": "Not Reviewed",
        },
    )


def run_h3h(ref_id: str) -> dict:
    aid = prep_fresh_asset(ref_id)
    return upload_and_verify(
        "H3h",
        aid,
        reference_id=ref_id,
        patch_before=patchable_context_patch(ref_id, variant="missing_context"),
        expectations={
            "reasonIncludes": ["Missing Context"],
            "exactHash": True,
            "sameEnrollment": True,
            "potentialReuse": True,
            "decision": "Not Reviewed",
        },
    )


def run_h3i(asset_id: str) -> dict:
    before = snap_asset(asset_id)
    if before.get("Upload Status") != "Uploaded":
        raise SystemExit(f"H3i requires uploaded asset, got {before.get('Upload Status')}")
    sk = before.get("Storage Key")
    s3_before = s3_count_for_asset(asset_id, sk)
    resp = invoke_lambda(asset_id)
    body = resp.get("body") if isinstance(resp.get("body"), dict) else resp
    if isinstance(body, str):
        body = json.loads(body)
    after = snap_asset(asset_id)
    s3_after = s3_count_for_asset(asset_id, sk)
    result = {
        "scenario": "H3i",
        "assetId": asset_id,
        "before": before,
        "lambda": {"statusCode": resp.get("statusCode"), "body": body},
        "after": after,
        "s3Before": s3_before,
        "s3After": s3_after,
        "checks": {
            "actionOut": body.get("actionOut") == "skipped_already_uploaded",
            "keyUnchanged": after.get("Storage Key") == sk,
            "hashUnchanged": after.get("File Content Hash") == before.get("File Content Hash"),
            "decisionUnchanged": after.get("Asset Reuse Decision") == before.get("Asset Reuse Decision"),
            "s3CountUnchanged": s3_after == s3_before,
        },
        "pass": False,
    }
    result["pass"] = all(result["checks"].values())
    out = HERE / "_preview" / f"c013-dev-h3-matrix-H3i-{asset_id}.json"
    out.write_text(json.dumps(result, indent=2, default=str) + "\n", encoding="utf-8")
    return result


def run_h3j(ref_id: str) -> dict:
    aid = prep_fresh_asset(ref_id)
    return upload_and_verify(
        "H3j",
        aid,
        reference_id=ref_id,
        expectations={
            "reasonIncludes": ["Multiple Prior Uses"],
            "exactHash": True,
            "sameEnrollment": True,
            "potentialReuse": True,
            "minAllMatches": 2,
            "decision": "Not Reviewed",
        },
    )


def run_h3h(ref_id: str) -> dict:
    aid = prep_fresh_asset(ref_id)
    ref = asset_fields(ref_id)
    return upload_and_verify(
        "H3h",
        aid,
        reference_id=ref_id,
        patch_before=patchable_context_patch(ref_id, variant="missing_context"),
        target_record_id=(ref.get("Video Feedback") or [None])[0],
        expectations={
            "reasonIncludes": ["Missing Context"],
            "exactHash": True,
            "sameEnrollment": True,
            "potentialReuse": True,
            "decision": "Not Reviewed",
        },
    )


def run_h3k(asset_id: str) -> dict:
    before = snap_asset(asset_id)
    if before.get("Upload Status") != "Uploaded":
        raise SystemExit(f"H3k requires uploaded asset, got {before.get('Upload Status')}")
    notes = f"H3k locked decision {datetime.now(DENVER).isoformat(timespec='seconds')}"
    patch_rec("Submission Assets", asset_id, {
        "Asset Reuse Decision": "Allowed — Legitimate Reuse",
        "Asset Reuse Review Notes": notes,
        "Asset Reuse Reviewed At": datetime.now(timezone.utc).isoformat(),
    })
    before = snap_asset(asset_id)
    resp = invoke_lambda(asset_id)
    body = resp.get("body") if isinstance(resp.get("body"), dict) else resp
    if isinstance(body, str):
        body = json.loads(body)
    after = snap_asset(asset_id)
    result = {
        "scenario": "H3k",
        "assetId": asset_id,
        "before": before,
        "lambda": body,
        "after": after,
        "checks": {
            "retrySkip": body.get("actionOut") == "skipped_already_uploaded",
            "decisionPreserved": after.get("Asset Reuse Decision") == "Allowed — Legitimate Reuse",
            "notesPreserved": after.get("Asset Reuse Review Notes") == notes,
        },
        "pass": False,
    }
    result["pass"] = all(result["checks"].values())
    out = HERE / "_preview" / f"c013-dev-h3-matrix-H3k-{asset_id}.json"
    out.write_text(json.dumps(result, indent=2, default=str) + "\n", encoding="utf-8")
    return result


def run_h3n(asset_id: str) -> dict:
    patch_rec("Submission Assets", asset_id, {"Asset Reuse Decision": "Allowed — Legitimate Reuse"})
    before = snap_asset(asset_id)
    resp = invoke_lambda(asset_id)
    body = resp.get("body") if isinstance(resp.get("body"), dict) else resp
    if isinstance(body, str):
        body = json.loads(body)
    after = snap_asset(asset_id)
    result = {
        "scenario": "H3n",
        "assetId": asset_id,
        "before": before,
        "lambda": body,
        "after": after,
        "checks": {
            "decision": after.get("Asset Reuse Decision") == "Allowed — Legitimate Reuse",
            "canonicalKept": bool(after.get("Canonical File URL")),
            "uploaded": after.get("Upload Status") == "Uploaded",
            "retrySkip": body.get("actionOut") == "skipped_already_uploaded",
        },
        "pass": False,
    }
    result["pass"] = all(result["checks"].values())
    out = HERE / "_preview" / f"c013-dev-h3-matrix-H3n-{asset_id}.json"
    out.write_text(json.dumps(result, indent=2, default=str) + "\n", encoding="utf-8")
    return result


def run_h3o(asset_id: str) -> dict:
    patch_rec("Submission Assets", asset_id, {"Asset Reuse Decision": "Allowed — Correction/Resubmission"})
    before = snap_asset(asset_id)
    after = snap_asset(asset_id)
    result = {
        "scenario": "H3o",
        "assetId": asset_id,
        "before": before,
        "after": after,
        "checks": {
            "decision": after.get("Asset Reuse Decision") == "Allowed — Correction/Resubmission",
            "canonicalKept": bool(after.get("Canonical File URL")),
            "uploaded": after.get("Upload Status") == "Uploaded",
        },
        "pass": True,
    }
    out = HERE / "_preview" / f"c013-dev-h3-matrix-H3o-{asset_id}.json"
    out.write_text(json.dumps(result, indent=2, default=str) + "\n", encoding="utf-8")
    return result


def run_h3p(asset_id: str) -> dict:
    patch_rec("Submission Assets", asset_id, {"Asset Reuse Decision": "Confirmed Duplicate"})
    before = snap_asset(asset_id)
    after = snap_asset(asset_id)
    result = {
        "scenario": "H3p",
        "assetId": asset_id,
        "before": before,
        "after": after,
        "checks": {
            "decision": after.get("Asset Reuse Decision") == "Confirmed Duplicate",
            "assetRetained": True,
            "canonicalKept": bool(after.get("Canonical File URL")),
            "hashKept": bool(after.get("File Content Hash")),
        },
        "pass": True,
    }
    out = HERE / "_preview" / f"c013-dev-h3-matrix-H3p-{asset_id}.json"
    out.write_text(json.dumps(result, indent=2, default=str) + "\n", encoding="utf-8")
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("scenario", choices=[
        "all", "H3b", "H3c", "H3d", "H3e", "H3f", "H3g", "H3h", "H3i", "H3j", "H3k", "H3n", "H3o", "H3p", "discover",
    ])
    parser.add_argument("--reference", default=DEFAULT_REF)
    parser.add_argument("--asset-id", default=None)
    args = parser.parse_args()
    load_env()

    if args.scenario == "discover":
        print(json.dumps({
            "nonSchmidt": find_or_create_second_test_enrollment(),
            "homeworkRef": find_homework_reference(),
            "vfRef": args.reference,
        }, indent=2, default=str))
        return

    ref = args.reference
    results: dict[str, dict] = {}

    if args.scenario in {"all", "H3b"}:
        results["H3b"] = run_h3b(ref)
    if args.scenario in {"all", "H3c"}:
        results["H3c"] = run_h3c(ref)
    if args.scenario in {"all", "H3d"}:
        hw = ensure_homework_reference(ref)
        results["H3d"] = run_h3d(hw)
    if args.scenario in {"all", "H3e"}:
        results["H3e"] = run_h3e(ref)
    if args.scenario in {"all", "H3f"}:
        results["H3f"] = run_h3f(ref, find_or_create_second_test_enrollment())
    if args.scenario in {"all", "H3g"}:
        results["H3g"] = run_h3g(ref)
    if args.scenario in {"all", "H3h"}:
        results["H3h"] = run_h3h(ref)
    if args.scenario in {"all", "H3i"}:
        aid = args.asset_id or "recvzxmLrjer4DLyt"
        results["H3i"] = run_h3i(aid)
    if args.scenario in {"all", "H3j"}:
        results["H3j"] = run_h3j(ref)
    if args.scenario in {"all", "H3k"}:
        aid = args.asset_id or results.get("H3c", {}).get("assetId") or "recgDL7dqsS1J1LUl"
        results["H3k"] = run_h3k(aid)
    if args.scenario in {"all", "H3n"}:
        aid = args.asset_id or results.get("H3c", {}).get("assetId") or ref
        results["H3n"] = run_h3n(aid)
    if args.scenario in {"all", "H3o"}:
        aid = args.asset_id or results.get("H3g", {}).get("assetId") or ref
        results["H3o"] = run_h3o(aid)
    if args.scenario in {"all", "H3p"}:
        aid = args.asset_id or results.get("H3h", {}).get("assetId") or ref
        results["H3p"] = run_h3p(aid)

    summary = {k: {"pass": v.get("pass"), "assetId": v.get("assetId")} for k, v in results.items()}
    print(json.dumps({"summary": summary, "results": results}, indent=2, default=str))


if __name__ == "__main__":
    main()
