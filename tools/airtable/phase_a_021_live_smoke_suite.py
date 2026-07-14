#!/usr/bin/env python3
"""Phase A live DEV smoke suite — 021 combined (006 still ON).

Uses Testing Scenarios + 115 for video/homework intake; API for both/idempotent/Sent.
Does not retire 006 or create 117.
Does not touch Folder 07 OFF automations.
"""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[2]
DEV = "appTetnuCZlCZdTCT"
SCHMIDT = "recgP9qZYjAhE7NXm"
VIDEO_TEMPLATE = "recvuvDdglwY2I7nu"
HW_TEMPLATE = "rec14HLmrN5suEyWs"
WEEK_10 = "recrTwxqXz31fNZ7e"
ACTIVITY_DATE = "2026-06-30"
DENVER = ZoneInfo("America/Denver")
OUT = ROOT / "docs/audits/phase-a-021-live-smoke-2026-07-14.json"


def load_token() -> str:
    for p in (ROOT / ".env.local", ROOT / ".env", ROOT / "web/.env.local"):
        if not p.exists():
            continue
        for line in p.read_text(encoding="utf-8").splitlines():
            if line.startswith(("AIRTABLE_API_TOKEN=", "AIRTABLE_PAT=", "AIRTABLE_TOKEN=")):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    tok = os.environ.get("AIRTABLE_API_TOKEN") or os.environ.get("AIRTABLE_TOKEN")
    if not tok:
        raise SystemExit("Missing AIRTABLE_API_TOKEN")
    return tok


TOK = load_token()


def api(method: str, table: str, rid: str | None = None, body: dict | None = None, params: dict | None = None):
    path = urllib.parse.quote(table, safe="")
    url = f"https://api.airtable.com/v0/{DEV}/{path}"
    if rid:
        url += f"/{rid}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {TOK}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.status, json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")


def get(table: str, rid: str) -> dict:
    st, data = api("GET", table, rid)
    if st != 200:
        raise SystemExit(f"GET {table}/{rid} -> {st}: {data}")
    return data


def create(table: str, fields: dict) -> dict:
    st, data = api("POST", table, body={"fields": fields, "typecast": True})
    if st not in (200, 201):
        raise SystemExit(f"POST {table} -> {st}: {data}")
    return data


def patch(table: str, rid: str, fields: dict) -> dict:
    st, data = api("PATCH", table, rid, body={"fields": fields, "typecast": True})
    if st != 200:
        raise SystemExit(f"PATCH {table}/{rid} -> {st}: {data}")
    return data


def list_filter(table: str, formula: str, page_size: int = 100) -> list[dict]:
    st, data = api("GET", table, params={"filterByFormula": formula, "pageSize": page_size})
    if st != 200:
        raise SystemExit(f"LIST {table} -> {st}: {data}")
    return data.get("records") or []


def att_objs(atts: list, n: int = 1) -> list[dict]:
    out = []
    for a in atts[:n]:
        out.append({"url": a["url"], "filename": a.get("filename") or "file.bin"})
    return out


def att_count(fields: dict, name: str) -> int:
    v = fields.get(name)
    return len(v) if isinstance(v, list) else 0


def ensure_week(sub_id: str) -> None:
    sub = get("Submissions", sub_id)
    if sub.get("fields", {}).get("Week"):
        return
    patch(
        "Submissions",
        sub_id,
        {"Week": [WEEK_10], "Activity Date": ACTIVITY_DATE},
    )


def wait_submission(scenario_id: str, timeout: int = 180) -> str:
    deadline = time.time() + timeout
    while time.time() < deadline:
        sc = get("Testing Scenarios", scenario_id)
        linked = sc.get("fields", {}).get("Linked Submission") or []
        if linked:
            return linked[0]
        time.sleep(4)
    raise SystemExit(f"timeout waiting Linked Submission for {scenario_id}")


def wait_021_ready(sub_id: str, *, expect_status: str | None, expect_video_count: int | None, timeout: int = 120) -> dict:
    deadline = time.time() + timeout
    last = {}
    while time.time() < deadline:
        f = get("Submissions", sub_id).get("fields", {})
        last = {
            "status": f.get("Attachment Upload Status"),
            "video_count": f.get("Video Count"),
            "vid": att_count(f, "Video Upload"),
            "hw1": att_count(f, "HW Sub 1"),
            "hw2": att_count(f, "HW Sub 2"),
            "week": bool(f.get("Week")),
            "enrollment": bool(f.get("Enrollment")),
            "asset_ids": list(f.get("Submission Assets") or []),
        }
        status_ok = expect_status is None or last["status"] == expect_status
        count_ok = True
        if expect_video_count is not None:
            vc = last["video_count"]
            count_ok = vc is not None and int(vc) == expect_video_count
        if status_ok and count_ok:
            return last
        time.sleep(3)
    return last


def count_eq(actual, expected: int) -> bool:
    if actual is None:
        return False
    try:
        return int(actual) == expected
    except Exception:
        return False


def wait_assets(sub_id: str, min_count: int, timeout: int = 180) -> list[dict]:
    deadline = time.time() + timeout
    ensure_week(sub_id)
    last: list[dict] = []
    while time.time() < deadline:
        ensure_week(sub_id)
        rows = list_filter("Submission Assets", f"{{Submission - Linked}}='{sub_id}'")
        last = rows
        if len(rows) >= min_count:
            return rows
        sid_assets = get("Submissions", sub_id).get("fields", {}).get("Submission Assets") or []
        if len(sid_assets) >= min_count:
            out = []
            for aid in sid_assets:
                try:
                    out.append(get("Submission Assets", aid))
                except Exception:
                    out.append({"id": aid})
            return out
        time.sleep(5)
    return last


def count_hc_for_sub(sub_id: str) -> int:
    rows = list_filter("Homework Completions", f"{{Submissions - Linked}}='{sub_id}'")
    return len(rows)


def run_115(scenario_type: str, name: str, intake_atts: list[dict], extra: dict | None = None) -> dict:
    fields = {
        "Test Intake Name": name,
        "Scenario Type": scenario_type,
        "Related Enrollment": [SCHMIDT],
        "Submission Date": ACTIVITY_DATE,
        "Intake Attachments": intake_atts,
        "Dry Run?": False,
        "Run Test?": False,
        "Test Status": "Queued",
    }
    if extra:
        fields.update(extra)
    sc = create("Testing Scenarios", fields)
    sid = sc["id"]
    patch("Testing Scenarios", sid, {"Run Test?": True})
    return {"scenario_id": sid, "name": name, "type": scenario_type}


def main() -> int:
    label = datetime.now(DENVER).strftime("%Y-%m-%d-%H%M%S")
    evidence: dict = {
        "ran_at": datetime.now(DENVER).isoformat(),
        "base": DEV,
        "combined_021_live": True,
        "006_still_on": True,
        "tests": {},
        "critical_pass": True,
        "notes": [],
    }

    video_tpl = get("Testing Scenarios", VIDEO_TEMPLATE).get("fields", {})
    hw_tpl = get("Testing Scenarios", HW_TEMPLATE).get("fields", {})
    video_atts = video_tpl.get("Intake Attachments") or []
    hw_atts = hw_tpl.get("Intake Attachments") or []
    if not video_atts or not hw_atts:
        raise SystemExit("templates missing Intake Attachments")

    # ---- 1 Video-only ----
    print("=== 1 video-only ===")
    v = run_115(
        "Video",
        f"PhaseA smoke Video {label}",
        att_objs(video_atts, 1),
        {
            "Video Feedback Focus": video_tpl.get("Video Feedback Focus") or "Shooting",
            "Video Feedback Question": f"Phase A smoke video {label}",
        },
    )
    v_sub = wait_submission(v["scenario_id"])
    ensure_week(v_sub)
    # clear status to empty so combined 021 can set Processing if 115 left it blank
    # If already Processing, still ok — force count path by clearing count then re-touching video
    vf = get("Submissions", v_sub).get("fields", {})
    evidence["tests"]["1_video_only"] = {"submission_id": v_sub, "scenario_id": v["scenario_id"]}
    # Nudge watched field to ensure 021 runs post-paste
    vatts = vf.get("Video Upload") or []
    if vatts:
        patch(
            "Submissions",
            v_sub,
            {
                "Video Upload": [{"url": vatts[0]["url"], "filename": vatts[0].get("filename") or "v.bin"}],
                "Attachment Upload Status": "No Files",  # managed; forces rewrite to Processing
            },
        )
    ready = wait_021_ready(v_sub, expect_status="Processing", expect_video_count=1, timeout=150)
    assets = wait_assets(v_sub, 1, timeout=180)
    asset_ids = [a.get("id") for a in assets if a.get("id")]
    if not asset_ids:
        asset_ids = list(get("Submissions", v_sub).get("fields", {}).get("Submission Assets") or [])
    ok1 = ready.get("status") == "Processing" and count_eq(ready.get("video_count"), 1) and len(asset_ids) >= 1
    evidence["tests"]["1_video_only"].update(
        {
            "ready": ready,
            "asset_ids": asset_ids,
            "asset_count": len(asset_ids),
            "ok": ok1,
            "critical": True,
        }
    )
    print("video-only", ok1, ready, "assets", len(asset_ids))
    if not ok1:
        evidence["critical_pass"] = False

    # ---- 2 Homework-only ----
    print("=== 2 homework-only ===")
    hw_assign = hw_tpl.get("Homework Assignment")
    h = run_115(
        "Homework",
        f"PhaseA smoke HW {label}",
        att_objs(hw_atts, 1),
        {"Homework Assignment": hw_assign} if hw_assign else None,
    )
    h_sub = wait_submission(h["scenario_id"])
    ensure_week(h_sub)
    hf = get("Submissions", h_sub).get("fields", {})
    hatts = hf.get("HW Sub 1") or []
    if hatts:
        patch(
            "Submissions",
            h_sub,
            {
                "HW Sub 1": [{"url": hatts[0]["url"], "filename": hatts[0].get("filename") or "h.bin"}],
                "Attachment Upload Status": "No Files",
            },
        )
    ready_h = wait_021_ready(h_sub, expect_status="Processing", expect_video_count=0, timeout=150)
    assets_h = wait_assets(h_sub, 1, timeout=180)
    aids_h = [a.get("id") for a in assets_h if a.get("id")] or list(
        get("Submissions", h_sub).get("fields", {}).get("Submission Assets") or []
    )
    ok2 = ready_h.get("status") == "Processing" and count_eq(ready_h.get("video_count"), 0) and len(aids_h) >= 1
    evidence["tests"]["2_homework_only"] = {
        "submission_id": h_sub,
        "scenario_id": h["scenario_id"],
        "ready": ready_h,
        "asset_ids": aids_h,
        "ok": ok2,
        "critical": True,
    }
    print("homework-only", ok2, ready_h, "assets", len(aids_h))
    if not ok2:
        evidence["critical_pass"] = False

    # ---- 3 Both (API-shaped submission; 115 has no HW+Video type) ----
    print("=== 3 both ===")
    both_fields = {
        "Enrollment": [SCHMIDT],
        "Activity Date": ACTIVITY_DATE,
        "Week": [WEEK_10],
        "HW Sub 1": att_objs(hw_atts, 1),
        "Video Upload": att_objs(video_atts, 1),
        "Attachment Upload Status": "No Files",
        "Video Feedback Focus": "Shooting",
        "Video Upload Note": f"Phase A both {label}",
    }
    # Athlete from enrollment if required
    enr = get("Enrollments", SCHMIDT).get("fields", {})
    athlete = enr.get("Athlete")
    if athlete:
        both_fields["Athlete"] = athlete if isinstance(athlete, list) else [athlete]
    if hw_assign:
        both_fields["Homework Name 1"] = hw_assign if isinstance(hw_assign, list) else [hw_assign]
    both_rec = create("Submissions", both_fields)
    both_id = both_rec["id"]
    # re-touch video to fire update trigger
    patch(
        "Submissions",
        both_id,
        {"Video Upload": att_objs(video_atts, 1), "HW Sub 1": att_objs(hw_atts, 1)},
    )
    ready_b = wait_021_ready(both_id, expect_status="Processing", expect_video_count=1, timeout=150)
    assets_b = wait_assets(both_id, 2, timeout=240)
    aids_b = [a.get("id") for a in assets_b if a.get("id")] or list(
        get("Submissions", both_id).get("fields", {}).get("Submission Assets") or []
    )
    ok3 = ready_b.get("status") == "Processing" and count_eq(ready_b.get("video_count"), 1) and len(aids_b) >= 2
    # soft: if 009 creates 1 then later 2, allow >=1 with note
    if not ok3 and len(aids_b) >= 1 and ready_b.get("status") == "Processing":
        evidence["notes"].append(
            f"both: expected >=2 assets, got {len(aids_b)} — treat as soft if destinations still correct"
        )
        # Inspect destinations
        dests = []
        for aid in aids_b:
            af = get("Submission Assets", aid).get("fields", {})
            dests.append(af.get("Upload Destination"))
        evidence["tests"]["3_both_destinations"] = dests
        ok3 = ready_b.get("status") == "Processing" and count_eq(ready_b.get("video_count"), 1) and len(aids_b) >= 1
        if len(aids_b) < 2:
            evidence["notes"].append("CRITICAL: both path asset count < 2")
            evidence["critical_pass"] = False
            ok3 = False
    evidence["tests"]["3_both"] = {
        "submission_id": both_id,
        "ready": ready_b,
        "asset_ids": aids_b,
        "ok": ok3,
        "critical": True,
    }
    print("both", ok3, ready_b, "assets", len(aids_b))
    if not ok3:
        evidence["critical_pass"] = False

    # ---- 4 Idempotent ----
    print("=== 4 idempotent ===")
    before = get("Submissions", v_sub).get("fields", {})
    before_status = before.get("Attachment Upload Status")
    before_count = before.get("Video Count")
    before_assets = list(before.get("Submission Assets") or [])
    vatts = before.get("Video Upload") or []
    if vatts:
        patch(
            "Submissions",
            v_sub,
            {"Video Upload": [{"url": vatts[0]["url"], "filename": vatts[0].get("filename") or "v.bin"}]},
        )
    time.sleep(25)
    after = get("Submissions", v_sub).get("fields", {})
    after_assets = list(after.get("Submission Assets") or [])
    ok4 = (
        after.get("Attachment Upload Status") == before_status
        and after.get("Video Count") == before_count
        and len(after_assets) == len(before_assets)
    )
    evidence["tests"]["4_idempotent"] = {
        "submission_id": v_sub,
        "before": {"status": before_status, "count": before_count, "assets": len(before_assets)},
        "after": {
            "status": after.get("Attachment Upload Status"),
            "count": after.get("Video Count"),
            "assets": len(after_assets),
        },
        "ok": ok4,
        "critical": True,
    }
    print("idempotent", ok4)
    if not ok4:
        evidence["critical_pass"] = False

    # ---- 5 Sent remains Sent ----
    print("=== 5 Sent status ===")
    sent_rows = list_filter(
        "Submissions",
        'AND({Attachment Upload Status}="Sent", LEN(ARRAYJOIN({Video Upload}))>0)',
    )
    if not sent_rows:
        # manufacture: take video_only and set Sent, then clear Video Count, re-touch Video Upload
        patch("Submissions", v_sub, {"Attachment Upload Status": "Sent", "Video Count": None})
        sent_id = v_sub
        evidence["notes"].append("Sent fixture manufactured on video-only submission")
    else:
        sent_id = sent_rows[0]["id"]
        patch("Submissions", sent_id, {"Video Count": None})
    sf = get("Submissions", sent_id).get("fields", {})
    satts = sf.get("Video Upload") or []
    expected_n = len(satts)
    if not satts:
        evidence["tests"]["5_sent_preserved"] = {
            "ok": False,
            "error": "no Video Upload attachments on Sent fixture",
            "critical": True,
        }
        evidence["critical_pass"] = False
    else:
        # Re-touch ALL watched attachments (do not truncate the set)
        reupload = [
            {"url": a["url"], "filename": a.get("filename") or f"v{i}.bin"}
            for i, a in enumerate(satts)
        ]
        patch("Submissions", sent_id, {"Video Upload": reupload})
        deadline = time.time() + 90
        final = {}
        while time.time() < deadline:
            final = get("Submissions", sent_id).get("fields", {})
            if count_eq(final.get("Video Count"), expected_n):
                break
            time.sleep(3)
        ok5 = final.get("Attachment Upload Status") == "Sent" and count_eq(
            final.get("Video Count"), expected_n
        )
        evidence["tests"]["5_sent_preserved"] = {
            "submission_id": sent_id,
            "status": final.get("Attachment Upload Status"),
            "video_count": final.get("Video Count"),
            "expected_count": expected_n,
            "ok": ok5,
            "critical": True,
        }
        print("sent", ok5, final.get("Attachment Upload Status"), final.get("Video Count"))
        if not ok5:
            evidence["critical_pass"] = False

    # Restore manufactured Sent row if we used video-only for smoke continuity
    if evidence.get("notes") and "manufactured" in " ".join(evidence["notes"]):
        patch("Submissions", v_sub, {"Attachment Upload Status": "Processing"})

    # ---- 6/7/8 duplicates + 009 evidence + error inference ----
    print("=== 6-8 assets/dupes ===")
    # Re-check video-only assets didn't duplicate after idempotent
    v_assets_final = list(get("Submissions", v_sub).get("fields", {}).get("Submission Assets") or [])
    # Count VF for video assets
    vf_n = 0
    for aid in v_assets_final:
        af = get("Submission Assets", aid).get("fields", {})
        # VF link field names vary
        for key in ("Video Feedback", "Video Feedbacks"):
            if af.get(key):
                vf_n += len(af[key]) if isinstance(af[key], list) else 1
    # Duplicates: asset count should equal video files for video-only (1), not explode after re-touch
    ok6 = len(v_assets_final) == 1  # video-only one file
    ok8 = ok4 and ok6  # no dupes from idempotent
    evidence["tests"]["6_009_assets_video"] = {
        "asset_ids": v_assets_final,
        "vf_links_seen": vf_n,
        "ok": ok6,
        "critical": True,
    }
    evidence["tests"]["8_no_duplicate_assets"] = {
        "video_only_assets": len(v_assets_final),
        "ok": ok8,
        "critical": True,
    }
    # 021 errors: cannot read automation run history via API (403). Infer from field outcomes.
    err_infer_ok = bool(evidence["critical_pass"])
    evidence["tests"]["7_021_errors_inferred"] = {
        "meta_automations_api": "403 — run history not readable via PAT",
        "inferred_ok": err_infer_ok,
        "mike_confirm": "Spot-check DEV Automations → 021 → Run history for red errors during this window",
        "ok": err_infer_ok,
        "critical": False,
    }
    print("009 assets", ok6, "dupes", ok8)

    if not ok6 or not ok8:
        evidence["critical_pass"] = False

    evidence["summary"] = {
        "critical_pass": evidence["critical_pass"],
        "next": (
            "retire 006 then create 117 OFF"
            if evidence["critical_pass"]
            else "RESTORE rollback — do not retire 006 / do not create 117"
        ),
    }
    OUT.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(evidence["summary"], indent=2))
    print("wrote", OUT)
    return 0 if evidence["critical_pass"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
