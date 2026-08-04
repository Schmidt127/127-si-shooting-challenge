#!/usr/bin/env python3
"""
Schmidt live tests for Automation 067 Option B after v2.0 paste.

Creates quiz → waits for automation → verifies HC / assets / XP.
Does NOT paste automation scripts (Airtable API cannot).
Does NOT modify 020/064/065 script bodies.
"""
from __future__ import annotations

import argparse
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
EVIDENCE = Path(__file__).resolve().parent
BASE = "appn84sqPw03zEbTT"
SCHMIDT = "recgP9qZYjAhE7NXm"
HW17_ID = "rec8oexrgOV5OWCRw"
HW17_WEEK = "recrTwxqXz31fNZ7e"


def load_tok() -> str:
    env: dict[str, str] = {}
    for rel in ("tools/airtable/.env", ".env.local", "web/.env.local"):
        p = ROOT / rel
        if not p.exists():
            continue
        for line in p.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    tok = env.get("AIRTABLE_API_TOKEN") or env.get("AIRTABLE_TOKEN") or ""
    if not tok:
        raise SystemExit("Missing AIRTABLE_API_TOKEN")
    return tok


def api(tok: str, method: str, url: str, body: dict | None = None) -> dict:
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {tok}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            raw = r.read()
            return json.loads(raw.decode("utf-8")) if raw else {}
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        raise SystemExit(f"HTTP {e.code} {url}: {detail}") from e


def get_record(tok: str, table: str, rid: str, fields: list[str] | None = None) -> dict:
    q = ""
    if fields:
        q = "?" + "&".join("fields[]=" + urllib.parse.quote(f) for f in fields)
    return api(
        tok,
        "GET",
        f"https://api.airtable.com/v0/{BASE}/{urllib.parse.quote(table)}/{rid}{q}",
    )


def create_record(tok: str, table: str, fields: dict) -> dict:
    return api(
        tok,
        "POST",
        f"https://api.airtable.com/v0/{BASE}/{urllib.parse.quote(table)}",
        {"fields": fields, "typecast": True},
    )


def update_record(tok: str, table: str, rid: str, fields: dict) -> dict:
    return api(
        tok,
        "PATCH",
        f"https://api.airtable.com/v0/{BASE}/{urllib.parse.quote(table)}/{rid}",
        {"fields": fields, "typecast": True},
    )


def list_records(tok: str, table: str, formula: str, fields: list[str], max_records: int = 50) -> list[dict]:
    q = [
        f"maxRecords={max_records}",
        "filterByFormula=" + urllib.parse.quote(formula),
    ]
    for f in fields:
        q.append("fields[]=" + urllib.parse.quote(f))
    url = f"https://api.airtable.com/v0/{BASE}/{urllib.parse.quote(table)}?" + "&".join(q)
    data = api(tok, "GET", url)
    return data.get("records", [])


def wait_for(predicate, timeout_s: int = 90, interval_s: float = 3.0, label: str = "condition"):
    deadline = time.time() + timeout_s
    last = None
    while time.time() < deadline:
        last = predicate()
        if last:
            return last
        time.sleep(interval_s)
    raise SystemExit(f"TIMEOUT waiting for {label}: last={last!r}")


def save(name: str, payload: dict) -> Path:
    path = EVIDENCE / name
    path.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
    print("wrote", path.name)
    return path


def cmd_t1(tok: str) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    fields = {
        "Enrollment": [SCHMIDT],
        "Submitted At": now,
        "Processing Status": "Pending",
        "Score": 18,
        "Target Score Met?": True,
        "Quiz Version": "Cursor Option B T1 2026-08-04",
    }
    created = create_record(tok, "Final Reflection Quiz Submissions", fields)
    quiz_id = created["id"]
    print("created quiz", quiz_id)

    def linked():
        rec = get_record(
            tok,
            "Final Reflection Quiz Submissions",
            quiz_id,
            [
                "Enrollment",
                "Homework Completion",
                "Processing Status",
                "Processing Error",
            ],
        )
        hc_ids = rec.get("fields", {}).get("Homework Completion") or []
        return rec if hc_ids else None

    quiz_after = wait_for(linked, timeout_s=120, label="067 link Homework Completion")
    hc_id = quiz_after["fields"]["Homework Completion"][0]
    hc = get_record(
        tok,
        "Homework Completions",
        hc_id,
        [
            "Enrollment",
            "Homework",
            "Week",
            "Item Type",
            "Item Slot",
            "Asset Slot",
            "Completion Status",
            "Review Status",
            "Source System",
            "Submission Assets",
            "XP Events",
            "Satisfactory?",
            "Review Complete",
            "Final Reflection Quiz Submissions",
        ],
    )
    assets = list_records(
        tok,
        "Submission Assets",
        formula=f"FIND('{hc_id}', ARRAYJOIN({{Homework Completions}}&''))",
        fields=["Homework Completions", "Asset Purpose", "Upload Status"],
        max_records=20,
    )
    result = {
        "phase": "T1",
        "at": now,
        "quiz_id": quiz_id,
        "quiz_after": quiz_after,
        "homework_completion_id": hc_id,
        "homework_completion": hc,
        "submission_assets": assets,
        "checks": {},
    }
    f = hc.get("fields", {})
    result["checks"] = {
        "enrollment_schmidt": (f.get("Enrollment") or [None])[0] == SCHMIDT,
        "homework_hw17": (f.get("Homework") or [None])[0] == HW17_ID,
        "week_expected": (f.get("Week") or [None])[0] == HW17_WEEK,
        "item_type_homework": f.get("Item Type") == "Homework",
        "asset_slot_hw1": f.get("Asset Slot") in (None, "HW1") and f.get("Asset Slot") == "HW1",
        "item_slot_hw1": f.get("Item Slot") == "HW1",
        "completion_submitted": f.get("Completion Status") == "Submitted",
        "review_ready": f.get("Review Status") == "Ready for Review",
        "source_fillout": f.get("Source System") == "Fillout",
        "zero_assets_on_hc": not (f.get("Submission Assets") or []),
        "zero_asset_rows": len(assets) == 0,
        "zero_xp_from_067": not (f.get("XP Events") or []),
        "quiz_processed": quiz_after.get("fields", {}).get("Processing Status") == "Processed",
        "quiz_links_hc": True,
    }
    # v2.0 marker: Item Slot / Asset Slot HW1
    result["checks"]["looks_like_v2_slots"] = (
        result["checks"]["item_slot_hw1"] and result["checks"]["asset_slot_hw1"]
    )
    result["pass"] = all(
        [
            result["checks"]["enrollment_schmidt"],
            result["checks"]["homework_hw17"],
            result["checks"]["week_expected"],
            result["checks"]["completion_submitted"],
            result["checks"]["review_ready"],
            result["checks"]["zero_asset_rows"],
            result["checks"]["zero_xp_from_067"],
            result["checks"]["quiz_processed"],
            result["checks"]["looks_like_v2_slots"],
        ]
    )
    save("067-T1-RESULT.json", result)
    print(json.dumps({"pass": result["pass"], "checks": result["checks"]}, indent=2))
    return result


def cmd_t2(tok: str, quiz_id: str) -> dict:
    before = get_record(
        tok,
        "Final Reflection Quiz Submissions",
        quiz_id,
        ["Homework Completion", "Processing Status"],
    )
    hc_before = (before.get("fields", {}).get("Homework Completion") or [None])[0]
    hc_count_before = len(
        list_records(
            tok,
            "Homework Completions",
            formula=f"AND(FIND('{SCHMIDT}', ARRAYJOIN({{Enrollment}}&'')), FIND('{HW17_ID}', ARRAYJOIN({{Homework}}&'')))",
            fields=["Enrollment", "Homework"],
            max_records=20,
        )
    )
    # Re-trigger: set Pending again (common 067 trigger path)
    update_record(
        tok,
        "Final Reflection Quiz Submissions",
        quiz_id,
        {"Processing Status": "Pending", "Processing Error": "T2 retrigger"},
    )
    time.sleep(8)
    after = get_record(
        tok,
        "Final Reflection Quiz Submissions",
        quiz_id,
        ["Homework Completion", "Processing Status", "Processing Error"],
    )
    hc_after = (after.get("fields", {}).get("Homework Completion") or [None])[0]
    hc_count_after = len(
        list_records(
            tok,
            "Homework Completions",
            formula=f"AND(FIND('{SCHMIDT}', ARRAYJOIN({{Enrollment}}&'')), FIND('{HW17_ID}', ARRAYJOIN({{Homework}}&'')))",
            fields=["Enrollment", "Homework", "XP Events", "Submission Assets"],
            max_records=20,
        )
    )
    hc = get_record(
        tok,
        "Homework Completions",
        hc_after,
        ["XP Events", "Submission Assets", "Enrollment", "Homework"],
    ) if hc_after else {}
    assets = list_records(
        tok,
        "Submission Assets",
        formula=f"FIND('{hc_after}', ARRAYJOIN({{Homework Completions}}&''))" if hc_after else "FALSE()",
        fields=["Homework Completions"],
        max_records=20,
    )
    result = {
        "phase": "T2",
        "quiz_id": quiz_id,
        "hc_before": hc_before,
        "hc_after": hc_after,
        "hc_count_before": hc_count_before,
        "hc_count_after": hc_count_after,
        "quiz_after": after,
        "homework_completion": hc,
        "submission_assets": assets,
        "checks": {
            "same_hc": hc_before == hc_after and bool(hc_after),
            "no_extra_hc": hc_count_after == hc_count_before,
            "zero_assets": len(assets) == 0,
            "zero_new_xp": not ((hc.get("fields") or {}).get("XP Events") or []),
        },
    }
    result["pass"] = all(result["checks"].values())
    save("067-T2-RESULT.json", result)
    print(json.dumps({"pass": result["pass"], "checks": result["checks"]}, indent=2))
    return result


def cmd_xp(tok: str, hc_id: str) -> dict:
    before = get_record(tok, "Homework Completions", hc_id, ["XP Events", "Satisfactory?", "Review Complete", "Total Homework XP Awarded", "Award Status"])
    xp_before = before.get("fields", {}).get("XP Events") or []
    update_record(
        tok,
        "Homework Completions",
        hc_id,
        {
            "Satisfactory?": True,
            "Review Complete": True,
        },
    )

    def has_xp():
        rec = get_record(tok, "Homework Completions", hc_id, ["XP Events", "Award Status", "Total Homework XP Awarded"])
        ids = rec.get("fields", {}).get("XP Events") or []
        return rec if ids and ids != xp_before else None

    after = wait_for(has_xp, timeout_s=180, interval_s=4.0, label="064/065 XP Event")
    xp_ids = after["fields"]["XP Events"]
    xp_id = xp_ids[0]
    xp = get_record(
        tok,
        "XP Events",
        xp_id,
        ["Source Key", "XP Points", "XP Source", "Enrollment", "Homework Completions"],
    )
    # duplicate guard: toggle review fields again / wait
    time.sleep(10)
    after2 = get_record(tok, "Homework Completions", hc_id, ["XP Events"])
    xp_ids_2 = after2.get("fields", {}).get("XP Events") or []
    result = {
        "phase": "XP",
        "homework_completion_id": hc_id,
        "xp_before": xp_before,
        "xp_event_id": xp_id,
        "xp_event": xp,
        "xp_ids_after_wait": xp_ids_2,
        "checks": {
            "one_xp": len(xp_ids) == 1 or (len(xp_ids) == len(xp_before) + 1),
            "no_duplicate_after_wait": len(xp_ids_2) == len(xp_ids),
            "source_key_homework": str((xp.get("fields") or {}).get("Source Key") or "").startswith("HOMEWORK_XP|"),
        },
    }
    result["pass"] = all(result["checks"].values())
    save("067-XP-RESULT.json", result)
    print(json.dumps({"pass": result["pass"], "checks": result["checks"], "xp_id": xp_id}, indent=2))
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["t1", "t2", "xp", "all"])
    parser.add_argument("--quiz-id")
    parser.add_argument("--hc-id")
    args = parser.parse_args()
    tok = load_tok()
    if args.command == "t1":
        cmd_t1(tok)
    elif args.command == "t2":
        if not args.quiz_id:
            raise SystemExit("--quiz-id required")
        cmd_t2(tok, args.quiz_id)
    elif args.command == "xp":
        if not args.hc_id:
            raise SystemExit("--hc-id required")
        cmd_xp(tok, args.hc_id)
    else:
        t1 = cmd_t1(tok)
        if not t1["pass"]:
            raise SystemExit("T1 failed")
        t2 = cmd_t2(tok, t1["quiz_id"])
        if not t2["pass"]:
            raise SystemExit("T2 failed")
        xp = cmd_xp(tok, t1["homework_completion_id"])
        if not xp["pass"]:
            raise SystemExit("XP failed")
        save(
            "067-LIVE-SUITE-SUMMARY.json",
            {"t1": t1, "t2": t2, "xp": xp, "all_pass": True},
        )


if __name__ == "__main__":
    main()
