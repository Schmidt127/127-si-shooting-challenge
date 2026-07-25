#!/usr/bin/env python3
"""Verify Stage 17 UI prep tasks + probe Automations API for paste capability."""
from __future__ import annotations

import json
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROD = "appn84sqPw03zEbTT"
ACTIVE_CONFIG = "recq14M5hEv3TIGEj"
OUT = HERE / "_preview" / "c025_stage17_prod_automation_prep_verify.json"


def load_token() -> str:
    env = {}
    for line in (HERE / ".env").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env.get("AIRTABLE_API_TOKEN") or env["AIRTABLE_TOKEN"]


def api(method: str, url: str, token: str, body=None):
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            return e.code, json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            return e.code, {"raw": raw[:3000]}


def main() -> None:
    token = load_token()
    report: dict = {
        "base_id": PROD,
        "active_config_id": ACTIVE_CONFIG,
        "115": "not installed / not touched",
        "101": "not modified",
        "automations_enabled": False,
    }

    st, body = api("GET", f"https://api.airtable.com/v0/meta/bases/{PROD}/tables", token)
    if st != 200:
        raise SystemExit(f"tables failed: {st}")
    tables = {t["name"]: t for t in body["tables"]}

    # 1) XP Source
    src = next(f for f in tables["XP Events"]["fields"] if f["name"] == "XP Source")
    names = [c.get("name") for c in ((src.get("options") or {}).get("choices") or [])]
    report["xp_source"] = {
        "has_zoom_meeting_recording_quiz": "Zoom Meeting Recording Quiz" in names,
        "choice_count": len(names),
        "complete": "Zoom Meeting Recording Quiz" in names,
    }

    # 2-3) prefersSingle
    za = {f["name"]: f for f in tables["Zoom Attendance"]["fields"]}
    report["prefers_single"] = {}
    for n in ("Enrollment", "Zoom Meeting"):
        opts = za[n].get("options") or {}
        have = opts.get("prefersSingleRecordLink")
        report["prefers_single"][n] = {
            "id": za[n]["id"],
            "prefersSingleRecordLink": have,
            "complete": have is True,
        }

    # 4) test meeting Global Config link
    zm = tables["Zoom Meetings"]
    st2, meet = api(
        "GET",
        f"https://api.airtable.com/v0/{PROD}/{zm['id']}?pageSize=100",
        token,
    )
    meetings = []
    linked_ok = []
    for r in meet.get("records") or []:
        f = r.get("fields") or {}
        g = f.get("Global Config") or []
        p = f.get("Program Config") or []
        entry = {
            "id": r["id"],
            "global_config": g,
            "program_config": p,
            "global_links_active_config": ACTIVE_CONFIG in g,
            "name_fields": {
                k: f.get(k)
                for k in f
                if any(
                    x in k.lower()
                    for x in ("name", "key", "title", "meeting", "start", "week")
                )
            },
        }
        meetings.append(entry)
        if entry["global_links_active_config"]:
            linked_ok.append(r["id"])
    report["meetings"] = {
        "count": len(meetings),
        "meetings": meetings,
        "any_linked_to_active_config": bool(linked_ok),
        "linked_meeting_ids": linked_ok,
        "complete": bool(linked_ok),
    }

    # Automations API probe — paste capability
    auto_urls = [
        f"https://api.airtable.com/v0/meta/bases/{PROD}/automations",
    ]
    auto = {}
    for url in auto_urls:
        st3, b3 = api("GET", url, token)
        auto["list_status"] = st3
        auto["list_body_preview"] = b3 if st3 != 200 else {
            "count": len((b3 or {}).get("automations") or []),
            "names": [
                {
                    "id": a.get("id"),
                    "name": a.get("name"),
                    "isEnabled": a.get("isEnabled"),
                }
                for a in ((b3 or {}).get("automations") or [])
            ],
        }
    report["automations_api"] = auto
    report["can_paste_via_api"] = auto.get("list_status") == 200

    # Expected paste checklist (for UI verification after Mike pastes)
    report["expected_after_paste"] = {
        "117": {
            "name": "117 - Zoom Recording Credit - Orchestrator",
            "version": "v1.1.1",
            "paste_file": "docs/deploy-checklists/C-025-stage17-117-orchestrator-v1.1.1-PASTE.txt",
            "state": "OFF",
            "trigger_table": "Zoom Attendance",
            "trigger_conditions": [
                "Attendance Method is Recording Quiz",
                "Enrollment is not empty",
                "Zoom Meeting is not empty",
            ],
            "inputs": {
                "recordId": "Airtable record ID of trigger Zoom Attendance record (required)",
                "webhookUrl": "optional — leave blank",
                "dryRun": "optional — truthy = no writes",
            },
            "do_not_use_trigger": "Recording Quiz Submitted At is one week from now",
        },
        "057": {
            "name": "contains 057 / Perfect Week",
            "version": "1.3",
            "paste_file": "docs/deploy-checklists/C-025-stage17-057-perfect-week-v1.3-PASTE.txt",
            "state": "OFF",
            "trigger_table": "Weekly Athlete Summary",
            "trigger_conditions": ["Perfect Week Calculation Queue? = 1"],
            "inputs": {"recordId": "WAS record ID from trigger"},
        },
        "042": {
            "name": "contains 042 / Level",
            "version": "3.1",
            "paste_file": "docs/deploy-checklists/C-025-stage17-042-level-gates-v3.1-PASTE.txt",
            "state": "OFF",
            "trigger_table": "Enrollments",
            "trigger_type": "when record enters view",
            "trigger_view": "042 - Needs Level Assignment",
            "trigger_conditions": ["Level Recalc Needed? checked (view filter)"],
            "inputs": {"recordId": "Enrollment record ID from trigger"},
        },
    }

    ui = report["xp_source"]["complete"] and all(
        v["complete"] for v in report["prefers_single"].values()
    ) and report["meetings"]["complete"]
    report["ui_tasks_complete"] = ui
    report["paste_performed"] = False
    report["paste_blocker"] = None
    if not report["can_paste_via_api"]:
        report["paste_blocker"] = (
            "Airtable Automations Meta API returned "
            f"{auto.get('list_status')} — scripts cannot be pasted or triggers verified via API. "
            "Mike must paste in Airtable UI while OFF."
        )

    OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(f"WROTE {OUT}")


if __name__ == "__main__":
    main()
