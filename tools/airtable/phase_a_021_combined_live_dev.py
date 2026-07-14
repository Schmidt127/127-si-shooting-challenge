#!/usr/bin/env python3
"""Phase A live DEV verification for combined 021 logic (API mirror + read probes).

Does NOT create/retire Airtable automations (Meta automations API unavailable).
Applies the same field decisions the combined script would write, then reads
adjacent intake state. Folder 07 automations are not touched.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEV = "appTetnuCZlCZdTCT"
SCHMIDT_ENROLLMENT = "recgP9qZYjAhE7NXm"
OUT = ROOT / "docs/audits/phase-a-021-combined-live-dev-2026-07-14.json"


def load_token() -> str:
    for p in (ROOT / ".env.local", ROOT / ".env", ROOT / "web/.env.local"):
        if not p.exists():
            continue
        for line in p.read_text(encoding="utf-8").splitlines():
            if line.startswith("AIRTABLE_API_TOKEN=") or line.startswith("AIRTABLE_PAT="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    tok = os.environ.get("AIRTABLE_API_TOKEN") or os.environ.get("AIRTABLE_PAT")
    if not tok:
        raise SystemExit("Missing AIRTABLE_API_TOKEN")
    return tok


TOKEN = load_token()


def api(method: str, path: str, body: dict | None = None):
    url = f"https://api.airtable.com/v0/{DEV}/{path}"
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            return r.status, json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")


def meta_tables():
    req = urllib.request.Request(
        f"https://api.airtable.com/v0/meta/bases/{DEV}/tables",
        headers={"Authorization": f"Bearer {TOKEN}"},
    )
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.loads(r.read().decode("utf-8"))


def decide(has_any: bool, video_n: int, cur_status: str, cur_count):
    next_status = "Processing" if has_any else "No Files"
    updates = {}
    actions = []
    managed = {"", "No Files", "Processing"}
    if (cur_status or "") not in managed:
        actions.append("status_unmanaged_skip")
    elif (cur_status or "") != next_status:
        updates["Attachment Upload Status"] = next_status
        actions.append("status_updated")
    else:
        actions.append("status_skipped")
    if cur_count != video_n:
        updates["Video Count"] = video_n
        actions.append("video_count_updated")
    else:
        actions.append("video_count_skipped")
    return next_status, updates, actions


def att_count(fields: dict, name: str) -> int:
    v = fields.get(name)
    if isinstance(v, list):
        return len(v)
    return 0


def main() -> int:
    tables = meta_tables()["tables"]
    by_name = {t["name"]: t for t in tables}
    sub_tbl = by_name["Submissions"]
    sa_tbl = by_name.get("Submission Assets")
    sub_id = sub_tbl["id"]

    # Find Schmidt submissions (linked enrollment) + a broader sample for variety
    formula = f"FIND('{SCHMIDT_ENROLLMENT}', ARRAYJOIN({{Enrollment}}))"
    records = []
    offset = None
    while len(records) < 80:
        params = {
            "pageSize": 50,
            "filterByFormula": formula,
        }
        if offset:
            params["offset"] = offset
        qs = urllib.parse.urlencode(params)
        st, data = api("GET", f"{urllib.parse.quote('Submissions')}?{qs}")
        if st != 200:
            print("FAIL list submissions", st, data)
            return 1
        records.extend(data.get("records") or [])
        offset = data.get("offset")
        if not offset:
            break

    # If Schmidt set is thin, augment with recent open status rows
    if len(records) < 10:
        qs2 = urllib.parse.urlencode({"pageSize": 50})
        st2, data2 = api("GET", f"{urllib.parse.quote('Submissions')}?{qs2}")
        if st2 == 200:
            for rec in data2.get("records") or []:
                if rec["id"] not in {r["id"] for r in records}:
                    records.append(rec)
    cases = []
    results = []

    # Classify candidates
    for rec in records:
        f = rec.get("fields") or {}
        hw1 = att_count(f, "HW Sub 1")
        hw2 = att_count(f, "HW Sub 2")
        vid = att_count(f, "Video Upload")
        status = str(f.get("Attachment Upload Status") or "")
        vcount = f.get("Video Count")
        kind = None
        if vid > 0 and (hw1 + hw2) == 0:
            kind = "video_only"
        elif (hw1 + hw2) > 0 and vid == 0:
            kind = "hw_only"
        elif vid > 0 and (hw1 + hw2) > 0:
            kind = "both"
        elif vid == 0 and (hw1 + hw2) == 0:
            kind = "no_files"
        if kind:
            cases.append(
                {
                    "id": rec["id"],
                    "kind": kind,
                    "status": status,
                    "video_count": vcount,
                    "hw1": hw1,
                    "hw2": hw2,
                    "vid": vid,
                }
            )

    # Pick one of each kind if available
    picked = {}
    for c in cases:
        picked.setdefault(c["kind"], c)

    evidence = {
        "ran_at": datetime.now(timezone.utc).isoformat(),
        "base": DEV,
        "mode": "API_MIRROR_OF_COMBINED_LOGIC",
        "note": "Does not fire Airtable automations; validates decision+write parity and reads adjacent state",
        "picked": picked,
        "tests": [],
        "adjacent_probe": [],
        "pass": True,
    }

    for kind, c in picked.items():
        rid = c["id"]
        st, live = api("GET", f"{urllib.parse.quote('Submissions')}/{rid}")
        if st != 200:
            evidence["tests"].append({"kind": kind, "id": rid, "ok": False, "error": live})
            evidence["pass"] = False
            continue
        fields = live.get("fields") or {}
        hw1 = att_count(fields, "HW Sub 1")
        hw2 = att_count(fields, "HW Sub 2")
        vid = att_count(fields, "Video Upload")
        has_any = (hw1 + hw2 + vid) > 0
        cur_status = str(fields.get("Attachment Upload Status") or "")
        cur_count = fields.get("Video Count")
        if cur_count is not None:
            try:
                cur_count = int(cur_count)
            except Exception:
                pass
        next_status, updates, actions = decide(has_any, vid, cur_status, cur_count)

        wrote = {}
        if updates:
            # Only write if values would change — real combined script behavior
            body = {"fields": updates}
            wst, wdata = api("PATCH", f"{urllib.parse.quote('Submissions')}/{rid}", body)
            if wst not in (200, 201):
                evidence["tests"].append(
                    {
                        "kind": kind,
                        "id": rid,
                        "ok": False,
                        "error": wdata,
                        "planned_updates": updates,
                    }
                )
                evidence["pass"] = False
                continue
            wrote = (wdata.get("fields") or {}) if isinstance(wdata, dict) else {}

        # Re-read
        st2, live2 = api("GET", f"{urllib.parse.quote('Submissions')}/{rid}")
        f2 = (live2.get("fields") or {}) if st2 == 200 else {}
        final_status = str(f2.get("Attachment Upload Status") or "")
        final_count = f2.get("Video Count")
        unmanaged = "status_unmanaged_skip" in actions
        ok_status = (
            final_status == cur_status
            if unmanaged
            else final_status == next_status
        )
        try:
            final_count_n = None if final_count is None else int(final_count)
        except Exception:
            final_count_n = None
        ok_count = final_count_n == vid

        # Adjacent readiness for 009
        week = f2.get("Week")
        enrollment = f2.get("Enrollment")
        ready_for_009 = final_status == "Processing" and bool(week) and bool(enrollment)

        # Assets count
        asset_count = None
        if sa_tbl:
            af = f"FIND('{rid}', ARRAYJOIN({{Submission}}))"
            # Prefer linked field filter
            aq = urllib.parse.urlencode(
                {
                    "pageSize": 100,
                    "filterByFormula": f"{{Submission}}='{rid}'",
                }
            )
            ast, adata = api("GET", f"{urllib.parse.quote('Submission Assets')}?{aq}")
            if ast == 200:
                asset_count = len(adata.get("records") or [])

        row = {
            "kind": kind,
            "id": rid,
            "actions": actions,
            "planned_updates": updates,
            "before": {"status": cur_status, "video_count": cur_count, "vid": vid},
            "after": {"status": final_status, "video_count": final_count},
            "ok_status": ok_status,
            "ok_count": ok_count,
            "ready_for_009": ready_for_009,
            "week_set": bool(week),
            "enrollment_set": bool(enrollment),
            "submission_asset_count": asset_count,
            "ok": ok_status and ok_count,
        }
        if not row["ok"]:
            evidence["pass"] = False
        evidence["tests"].append(row)

    # Idempotent repeat on first picked
    if picked:
        first = next(iter(picked.values()))
        rid = first["id"]
        st, live = api("GET", f"{urllib.parse.quote('Submissions')}/{rid}")
        f = live.get("fields") or {}
        vid = att_count(f, "Video Upload")
        has_any = (
            att_count(f, "HW Sub 1")
            + att_count(f, "HW Sub 2")
            + vid
        ) > 0
        cur_status = str(f.get("Attachment Upload Status") or "")
        cur_count = f.get("Video Count")
        if cur_count is not None:
            cur_count = int(cur_count)
        _, updates, actions = decide(has_any, vid, cur_status, cur_count)
        evidence["tests"].append(
            {
                "kind": "idempotent_repeat",
                "id": rid,
                "actions": actions,
                "planned_updates": updates,
                "ok": updates == {},
            }
        )
        if updates:
            evidence["pass"] = False

    # Adjacent regression read-only: ensure fields exist for 005/007/009/010/013/020/022/023/116
    sub_fields = {f["name"] for f in sub_tbl["fields"]}
    need = [
        "Activity Date",
        "Week",
        "Duplicate Key",
        "Duplicate Review Status",
        "Attachment Upload Status",
        "Video Count",
        "Video Upload",
        "HW Sub 1",
        "HW Sub 2",
        "Enrollment",
        "Athlete",
        "XP Award Status",
        "Count This Submission?",
    ]
    missing = [n for n in need if n not in sub_fields]
    evidence["adjacent_probe"].append(
        {
            "check": "submissions_schema_for_005_007_009_010_023",
            "missing": missing,
            "ok": not missing,
        }
    )
    if missing:
        evidence["pass"] = False

    if sa_tbl:
        sa_fields = {f["name"] for f in sa_tbl["fields"]}
        sa_need = ["Submission", "Upload Destination", "Upload Status", "Asset Reuse Decision"]
        enough = [n for n in sa_need if n in sa_fields]
        evidence["adjacent_probe"].append(
            {
                "check": "submission_assets_schema_for_013_020_022_116",
                "present": enough,
                "ok": "Submission" in sa_fields,
            }
        )

    # Trigger union documentation evidence
    evidence["recommended_trigger"] = {
        "type": "When record is updated",
        "watch": ["HW Sub 1", "HW Sub 2", "Video Upload"],
        "match_any": [
            "Attachment Upload Status is empty",
            "Attachment Upload Status is No Files",
            "Video Upload is not empty AND Video Count is empty",
        ],
        "covers": "Former 006+021 plus count fix when already Processing (via watch)",
    }

    OUT.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"pass": evidence["pass"], "out": str(OUT), "tests": len(evidence["tests"])}, indent=2))
    return 0 if evidence["pass"] else 2


if __name__ == "__main__":
    sys.exit(main())
