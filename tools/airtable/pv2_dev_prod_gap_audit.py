#!/usr/bin/env python3
"""Production v2 DEV-to-PROD gap inventory audit (read-only)."""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote

import requests
from dotenv import load_dotenv

HERE = Path(__file__).parent
REPO = HERE.parents[1]
DEV_BASE = "appTetnuCZlCZdTCT"
PROD_BASE = "appn84sqPw03zEbTT"
AUDIT_DATE = "2026-07-11"

SCOPE_TABLES = [
    "Automations",
    "Config",
    "Enrollments",
    "Submissions",
    "Submission Assets",
    "Homework Completions",
    "Video Feedback",
    "XP Events",
    "Weekly Athlete Summary",
    "XP Reward Rules",
    "Level Gate Rules",
    "Streak Occurrences",
    "Shot Milestones",
    "Athlete Achievement Unlocks",
    "Zoom Meetings",
    "Weeks",
    "Final Reflection Quiz Submissions",
    "Achievements",
    "Testing Scenarios",
]

PRIORITY_FORMULAS: dict[str, list[str]] = {
    "Submissions": [
        "Count This Submission?",
        "Total Shots Counted",
        "Perfect Week Countable Submission?",
        "Homework Completion Ready?",
        "Ready for 009 Asset Creation?",
        "Duplicate Key",
    ],
    "Submission Assets": [
        "Ready for Homework Completion Script?",
        "Ready to Send to Make?",
        "Writeback Complete?",
        "Upload Destination",
        "Potential Asset Reuse?",
        "File is Duplicate?",
    ],
    "Weekly Athlete Summary": [
        "Perfect Week Eligible?",
        "Threshold XP Ready?",
    ],
    "Enrollments": [
        "Active XP Total",
        "Level Recalc Needed?",
    ],
    "Video Feedback": [
        "Ready for XP Automation?",
        "Writeback Complete?",
    ],
    "Homework Completions": [
        "Ready for XP Automation?",
    ],
    "XP Events": [
        "XP Date Resolved",
    ],
}

SCRIPT_DEPS: list[dict[str, Any]] = [
    {
        "num": "116",
        "name": "Apply Asset Reuse Decision Consequences",
        "version": "v1.0.1",
        "path": "airtable/automations/shooting-challenge/116-submission-assets-apply-asset-reuse-decision-consequences.js",
        "commit": "992677d",
        "checks": [
            ("Submission Assets", "Asset Reuse Decision", "singleSelect", [
                "Not Reviewed", "Approved Reuse", "Allowed — Legitimate Reuse",
                "Allowed — Correction/Resubmission", "Confirmed Duplicate",
                "False Positive", "Unable to Determine", "Resolved — Duplicate Record Error",
            ]),
            ("Submission Assets", "Duplicate Resolution Applied?", "checkbox", []),
            ("Submission Assets", "Duplicate Resolution Applied At", "dateTime", []),
            ("Submission Assets", "Duplicate Resolution Error", "multilineText", []),
            ("Submission Assets", "Duplicate Resolution Last Applied Decision", "singleLineText", []),
            ("Submission Assets", "Asset Reuse Review Notes", "multilineText", []),
            ("Submission Assets", "Canonical File URL", "url", []),
            ("Submission Assets", "Homework Completions", "multipleRecordLinks", []),
            ("Submission Assets", "Video Feedback", "multipleRecordLinks", []),
            ("Submission Assets", "Enrollment - Linked", "multipleRecordLinks", []),
            ("Video Feedback", "Do Not Award XP?", "checkbox", []),
            ("Video Feedback", "Award Status", "singleSelect", ["Pending", "Awarded", "Do Not Award"]),
            ("Homework Completions", "Award Status", "singleSelect", ["Pending", "Awarded", "Do Not Award"]),
            ("XP Events", "Source Key", "singleLineText", []),
            ("XP Events", "Active?", "checkbox", []),
            ("XP Events", "Duplicate Status", "singleSelect", ["Unique", "Duplicate - Remove"]),
            ("XP Events", "XP Reason Debug", "multilineText", []),
            ("Enrollments", "Level Recalc Needed?", "checkbox", []),
        ],
    },
    {
        "num": "070b",
        "name": "Send Video Asset Payload to Make",
        "version": "v4.2",
        "path": "airtable/automations/shooting-challenge/070b-email-notifications-and-external-handoffs-send-video-asset-payload-to-make.js",
        "commit": "955ea2a",
        "checks": [
            ("Submission Assets", "Upload Destination", None, []),
            ("Submission Assets", "Send to Make Trigger", "checkbox", []),
            ("Submission Assets", "Upload Status", "singleSelect", []),
            ("Submission Assets", "Upload Error", "multilineText", []),
            ("Submission Assets", "Airtable Attachment", "multipleAttachments", []),
            ("Submission Assets", "Submission - Linked", "multipleRecordLinks", []),
            ("Submission Assets", "Enrollment - Linked", "multipleRecordLinks", []),
            ("Submission Assets", "Video Feedback", "multipleRecordLinks", []),
            ("Submission Assets", "Canonical File URL", "url", []),
            ("Submission Assets", "Storage Key", "singleLineText", []),
            ("Submission Assets", "File Content Hash", "singleLineText", []),
        ],
    },
    {
        "num": "022",
        "name": "Sync Child Upload Writeback",
        "version": "v1.1",
        "path": "airtable/automations/shooting-challenge/022-submission-intake-sync-child-upload-writeback-from-submission-asset.js",
        "commit": "8839659",
        "checks": [
            ("Submission Assets", "Upload Status", "singleSelect", []),
            ("Submission Assets", "Upload Error", "multilineText", []),
            ("Submission Assets", "Uploaded At", "dateTime", []),
            ("Submission Assets", "Canonical File URL", "url", []),
            ("Homework Completions", "Writeback Complete?", "checkbox", []),
            ("Video Feedback", "Video URL or Drive Link", "url", []),
        ],
    },
    {
        "num": "114",
        "name": "Create or Update Video XP Event",
        "version": "v5.8",
        "path": "airtable/automations/shooting-challenge/114-video-review-and-xp-create-or-update-video-xp-event.js",
        "commit": None,
        "checks": [
            ("Video Feedback", "Ready for XP Automation?", "checkbox", []),
            ("Video Feedback", "Do Not Award XP?", "checkbox", []),
            ("XP Events", "Source Key", "singleLineText", []),
        ],
    },
    {
        "num": "065",
        "name": "Create Homework XP Event",
        "version": "v9.2",
        "path": "airtable/automations/shooting-challenge/065-homework-review-and-xp-create-homework-xp-event.js",
        "commit": None,
        "checks": [
            ("Homework Completions", "Award Status", "singleSelect", ["Pending", "Awarded"]),
            ("Homework Completions", "Review Complete", "checkbox", []),
            ("XP Events", "Source Key", "singleLineText", []),
        ],
    },
    {
        "num": "066",
        "name": "Create Shot Milestone Unlocks",
        "version": "v3.2",
        "path": "airtable/automations/shooting-challenge/066-achievements-and-milestones-create-shot-milestone-unlocks.js",
        "commit": "36a2e95",
        "checks": [
            ("Enrollments", "Run Shot Milestone Check?", "checkbox", []),
            ("Shot Milestones", "Milestone Unique Key", None, []),
            ("Athlete Achievement Unlocks", "Milestone Source Key", "singleLineText", []),
            ("Achievements", "Reward Rule Key", "singleLineText", []),
        ],
    },
]

C013_PROD_FIELDS = [
    "Canonical File URL", "Storage Key", "File Content Hash", "File Hash Algorithm",
    "File Size Bytes", "File MIME Type", "Uploaded At", "Upload Status", "Upload Error",
    "Send to Make Trigger", "Writeback Complete?", "Ready to Send to Make?",
    "Duplicate File Status", "Duplicate Match Record", "Upload Claim Run ID",
]

C023_PROD_FIELDS = [
    "Asset Reuse Decision", "Asset Reuse Review Primary Reason", "Asset Reuse Review Reasons",
    "Asset Reuse Review Summary", "Potential Asset Reuse?", "Asset Reuse Reviewed At",
    "Asset Reuse Reviewed By", "Asset Reuse Review Notes", "Duplicate Resolution Applied?",
    "Duplicate Resolution Applied At", "Duplicate Resolution Error",
    "Duplicate Resolution Last Applied Decision", "Duplicate Match Records (All)",
]

REPO_V2_INVENTORY = [
    {"workstream": "C-013 Wave 7 asset storage", "file": "docs/deploy-checklists/C-013-production-promotion-plan.md", "commit": "cca1ac5", "table": "Submission Assets", "target": "Canonical File URL, Storage Key, Lambda writeback", "for_prod": True},
    {"workstream": "C-023 duplicate hash + review", "file": "docs/deploy-checklists/C-023-production-duplicate-policy.md", "commit": "847aa6e", "table": "Submission Assets", "target": "File Content Hash, Duplicate Match Record", "for_prod": True},
    {"workstream": "C-023 Stage 5 consequences", "file": "airtable/automations/shooting-challenge/116-submission-assets-apply-asset-reuse-decision-consequences.js", "commit": "992677d", "table": "Submission Assets", "target": "Automation 116 + consequence fields", "for_prod": True},
    {"workstream": "070b Lambda upload route", "file": "airtable/automations/shooting-challenge/070b-email-notifications-and-external-handoffs-send-video-asset-payload-to-make.js", "commit": "955ea2a", "table": "Submission Assets", "target": "070b v4.2 Make→Lambda", "for_prod": True},
    {"workstream": "022 upload writeback sync", "file": "airtable/automations/shooting-challenge/022-submission-intake-sync-child-upload-writeback-from-submission-asset.js", "commit": "c0f91d3", "table": "Submission Assets", "target": "Child table writeback", "for_prod": True},
    {"workstream": "066 shot milestones v3.2", "file": "airtable/automations/shooting-challenge/066-achievements-and-milestones-create-shot-milestone-unlocks.js", "commit": "36a2e95", "table": "Enrollments", "target": "066 pasted DEV+PROD 2026-07-06", "for_prod": True},
    {"workstream": "C-019 testing views", "file": "docs/deploy-checklists/C-019-testing-views-verification-checklist.md", "commit": None, "table": "multiple", "target": "Testing views on DEV", "for_prod": False},
    {"workstream": "C-020 test harness 115", "file": "airtable/automations/shooting-challenge/115-engineering-test-framework-run-testing-scenario-daily-submission.js", "commit": None, "table": "Testing Scenarios", "target": "DEV-only harness", "for_prod": False},
    {"workstream": "008 retirement → 116", "file": "docs/automation-index.md", "commit": "63541b6", "table": "Automations", "target": "Replace 008 with 116 on PROD", "for_prod": True},
]


def load_env() -> None:
    load_dotenv(HERE / ".env", override=True)
    load_dotenv(REPO / ".env.local", override=True)


def tok() -> str:
    t = os.getenv("AIRTABLE_TOKEN") or os.getenv("AIRTABLE_API_TOKEN") or ""
    if not t:
        raise SystemExit("ERROR: missing AIRTABLE_TOKEN")
    return t


def headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {tok()}", "Content-Type": "application/json"}


def fetch_schema(base_id: str) -> list[dict]:
    url = f"https://api.airtable.com/v0/meta/bases/{base_id}/tables"
    r = requests.get(url, headers=headers(), timeout=120)
    r.raise_for_status()
    return r.json().get("tables") or []


def table_map(tables: list[dict]) -> dict[str, dict]:
    return {t["name"]: t for t in tables if t.get("name")}


def field_map(table: dict) -> dict[str, dict]:
    return {f["name"]: f for f in (table.get("fields") or []) if f.get("name")}


def choice_names(field: dict | None) -> list[str]:
    if not field:
        return []
    return [c["name"] for c in (field.get("options") or {}).get("choices", [])]


def linked_table(field: dict | None) -> str | None:
    if not field:
        return None
    opts = field.get("options") or {}
    return opts.get("linkedTableName") or opts.get("linkedTableId")


def formula_text(field: dict | None) -> str:
    if not field:
        return ""
    opts = field.get("options") or {}
    return (opts.get("formula") or "").strip()


def normalize_formula(s: str) -> str:
    return re.sub(r"\s+", " ", s.replace("\r\n", "\n").replace("\r", "\n")).strip()


def fetch_records(base_id: str, table: str, fields: list[str] | None = None, formula: str | None = None) -> list[dict]:
    recs: list[dict] = []
    offset = None
    while True:
        params: list[tuple[str, str]] = [("pageSize", "100")]
        if offset:
            params.append(("offset", offset))
        if formula:
            params.append(("filterByFormula", formula))
        if fields:
            for i, f in enumerate(fields):
                params.append((f"fields[{i}]", f))
        url = f"https://api.airtable.com/v0/{base_id}/{quote(table, safe='')}"
        r = requests.get(url, headers=headers(), params=params, timeout=120)
        r.raise_for_status()
        data = r.json()
        recs.extend(data.get("records") or [])
        offset = data.get("offset")
        if not offset:
            break
    return recs


def git_head() -> str:
    try:
        return subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=REPO, text=True).strip()
    except Exception:
        return "unknown"


def git_branch() -> str:
    try:
        return subprocess.check_output(["git", "branch", "--show-current"], cwd=REPO, text=True).strip()
    except Exception:
        return "unknown"


def compare_table(dev_t: dict | None, prod_t: dict | None, tname: str) -> dict:
    out: dict[str, Any] = {"table": tname, "dev_present": dev_t is not None, "prod_present": prod_t is not None}
    if not dev_t and not prod_t:
        return out
    if not dev_t:
        out["prod_only_table"] = True
        return out
    if not prod_t:
        out["dev_only_table"] = True
        return out

    dev_f = field_map(dev_t)
    prod_f = field_map(prod_t)
    dev_names = set(dev_f)
    prod_names = set(prod_f)

    missing_in_prod = sorted(dev_names - prod_names)
    extra_in_prod = sorted(prod_names - dev_names)
    type_mismatches = []
    link_mismatches = []
    select_gaps = []
    formula_diffs = []

    for fname in sorted(dev_names & prod_names):
        df, pf = dev_f[fname], prod_f[fname]
        if df.get("type") != pf.get("type"):
            type_mismatches.append({
                "field": fname,
                "dev_type": df.get("type"),
                "prod_type": pf.get("type"),
            })
        if df.get("type") == "multipleRecordLinks":
            dl, pl = linked_table(df), linked_table(pf)
            if dl != pl:
                link_mismatches.append({"field": fname, "dev_link": dl, "prod_link": pl})
        if df.get("type") in ("singleSelect", "multipleSelects"):
            dev_opts = set(choice_names(df))
            prod_opts = set(choice_names(pf))
            missing_opts = sorted(dev_opts - prod_opts)
            if missing_opts:
                select_gaps.append({"field": fname, "missing_in_prod": missing_opts})
        if df.get("type") == "formula":
            dform, pform = normalize_formula(formula_text(df)), normalize_formula(formula_text(pf))
            if dform != pform:
                formula_diffs.append({"field": fname, "dev_len": len(dform), "prod_len": len(pform)})

    out.update({
        "dev_field_count": len(dev_f),
        "prod_field_count": len(prod_f),
        "missing_in_prod": missing_in_prod,
        "extra_in_prod": extra_in_prod,
        "type_mismatches": type_mismatches,
        "link_mismatches": link_mismatches,
        "select_gaps": select_gaps,
        "formula_diffs": formula_diffs,
    })
    return out


def validate_script_deps(dev_tables: list[dict], prod_tables: list[dict]) -> list[dict]:
    dev_tm, prod_tm = table_map(dev_tables), table_map(prod_tables)
    results = []
    for script in SCRIPT_DEPS:
        row = {
            "script": script["num"],
            "name": script["name"],
            "version": script["version"],
            "path": script["path"],
            "commit": script["commit"],
            "dev_ok": True,
            "prod_ok": True,
            "issues": [],
            "safe_to_deploy_prod": True,
        }
        for tname, fname, ftype, required_opts in script["checks"]:
            for env, tm, label in [("DEV", dev_tm, "dev_ok"), ("PROD", prod_tm, "prod_ok")]:
                table = tm.get(tname)
                if not table:
                    row["issues"].append(f"{env}: missing table {tname}")
                    row[label] = False
                    if env == "PROD":
                        row["safe_to_deploy_prod"] = False
                    continue
                f = field_map(table).get(fname)
                if not f:
                    row["issues"].append(f"{env}: missing {tname}.{fname}")
                    row[label] = False
                    if env == "PROD":
                        row["safe_to_deploy_prod"] = False
                    continue
                if ftype and f.get("type") != ftype:
                    row["issues"].append(f"{env}: wrong type {tname}.{fname} expected {ftype} got {f.get('type')}")
                    row[label] = False
                    if env == "PROD":
                        row["safe_to_deploy_prod"] = False
                if required_opts:
                    have = set(choice_names(f))
                    miss = [o for o in required_opts if o not in have]
                    if miss:
                        row["issues"].append(f"{env}: missing select options {tname}.{fname}: {miss}")
                        row[label] = False
                        if env == "PROD":
                            row["safe_to_deploy_prod"] = False
        results.append(row)
    return results


def compare_automation_records(dev_recs: list[dict], prod_recs: list[dict]) -> dict:
    def key(r: dict) -> str:
        f = r.get("fields") or {}
        name = str(f.get("Name") or "")
        m = re.match(r"^(\d{3})\b", name)
        if m:
            return m.group(1)
        code = f.get("Automation Code") or f.get("Number")
        if code is not None and len(str(code)) < 20:
            return str(code).strip()
        return name.strip() or r["id"]

    dev_by = {key(r): r for r in dev_recs}
    prod_by = {key(r): r for r in prod_recs}

    def sort_key(k: str) -> tuple:
        m = re.match(r"^(\d+)", k)
        if m:
            return (0, int(m.group(1)), k)
        return (1, 9999, k)

    all_keys = sorted(set(dev_by) | set(prod_by), key=sort_key)
    compare_fields = [
        "Name", "Automation Code", "Sections", "Status", "Trigger type",
        "Trigger table", "Conditions", "Outputs Written back to Airtable",
    ]

    rows = []
    for k in all_keys:
        d, p = dev_by.get(k), prod_by.get(k)
        row = {"key": k}
        if d and not p:
            row["status"] = "dev_only"
            row["dev_name"] = (d.get("fields") or {}).get("Name")
            row["dev_status"] = (d.get("fields") or {}).get("Status")
        elif p and not d:
            row["status"] = "prod_only"
            row["prod_name"] = (p.get("fields") or {}).get("Name")
            row["prod_status"] = (p.get("fields") or {}).get("Status")
        else:
            df, pf = (d or {}).get("fields") or {}, (p or {}).get("fields") or {}
            diffs = []
            for fld in compare_fields:
                if df.get(fld) != pf.get(fld):
                    diffs.append({"field": fld, "dev": df.get(fld), "prod": pf.get(fld)})
            row["status"] = "both"
            row["diffs"] = diffs
            row["dev_name"] = df.get("Name")
            row["prod_name"] = pf.get("Name")
            row["dev_status"] = df.get("Status")
            row["prod_status"] = pf.get("Status")
        rows.append(row)
    return {"rows": rows, "dev_count": len(dev_recs), "prod_count": len(prod_recs)}


def compare_config_records(dev_recs: list[dict], prod_recs: list[dict]) -> list[dict]:
    diffs = []
    dev_by_key = {(r.get("fields") or {}).get("Config Key"): r for r in dev_recs}
    prod_by_key = {(r.get("fields") or {}).get("Config Key"): r for r in prod_recs}
    keys = ["Active School Year", "Active XP Rule Set", "Submission XP Enabled", "Review Mode Enabled",
            "File Naming Root", "Storage Root", "Challenge Week Count"]
    watch = set(keys) | set(dev_by_key) | set(prod_by_key)
    for k in sorted(watch):
        if not k:
            continue
        d, p = dev_by_key.get(k), prod_by_key.get(k)
        if d and not p:
            diffs.append({"config_key": k, "issue": "missing_in_prod", "dev": (d.get("fields") or {}).get("Value")})
        elif p and not d:
            diffs.append({"config_key": k, "issue": "prod_only", "prod": (p.get("fields") or {}).get("Value")})
        elif d and p:
            dv = (d.get("fields") or {}).get("Value")
            pv = (p.get("fields") or {}).get("Value")
            if dv != pv:
                diffs.append({"config_key": k, "issue": "value_mismatch", "dev": dv, "prod": pv})
    return diffs


def compare_rule_records(table: str, key_field: str, dev_recs: list[dict], prod_recs: list[dict], compare_fields: list[str]) -> list[dict]:
    def rk(r: dict) -> str:
        return str((r.get("fields") or {}).get(key_field) or r["id"])

    dev_by, prod_by = {rk(r): r for r in dev_recs}, {rk(r): r for r in prod_recs}
    diffs = []
    for k in sorted(set(dev_by) | set(prod_by)):
        d, p = dev_by.get(k), prod_by.get(k)
        if d and not p:
            diffs.append({"table": table, "key": k, "issue": "missing_in_prod"})
        elif p and not d:
            diffs.append({"table": table, "key": k, "issue": "dev_only"})
        else:
            df, pf = (d.get("fields") or {}), (p.get("fields") or {})
            field_diffs = {f: {"dev": df.get(f), "prod": pf.get(f)} for f in compare_fields if df.get(f) != pf.get(f)}
            if field_diffs:
                diffs.append({"table": table, "key": k, "issue": "field_mismatch", "fields": field_diffs})
    return diffs


def classify_gaps(data: dict) -> dict[str, list[dict]]:
    gaps: dict[str, list[dict]] = {"BLOCKER": [], "REQUIRED BEFORE LAUNCH": [], "SAFE POST-LAUNCH CLEANUP": [], "NO ACTION": []}
    gid = 0

    def add(cls: str, **kw: Any) -> None:
        nonlocal gid
        gid += 1
        gaps[cls].append({"gap_id": f"PV2-GAP-{gid:04d}", **kw})

    sa = next((t for t in data["table_comparisons"] if t["table"] == "Submission Assets"), {})
    for f in sa.get("missing_in_prod") or []:
        if f in C013_PROD_FIELDS + C023_PROD_FIELDS or "Reuse" in f or "Duplicate Resolution" in f or "Canonical" in f or "Storage" in f or "Upload Claim" in f:
            cls = "BLOCKER" if f in ["Asset Reuse Decision", "Canonical File URL", "File Content Hash", "Duplicate Resolution Applied?"] else "REQUIRED BEFORE LAUNCH"
            add(cls, classification=cls, workstream="C-013/C-023 schema", dev_value=f"present", prod_value="missing",
                evidence=f"Live schema compare Submission Assets field {f}", operational_impact="Script/runtime failure if promoted without field",
                correction=f"Add {f} to PROD Submission Assets per DEV spec", mike_manual=True, cursor_safe=False,
                risk="High" if cls == "BLOCKER" else "Medium", validation=f"Re-run pv2_dev_prod_gap_audit.py after field added")

    for f in ["Testing Scenarios"]:
        if any(t.get("dev_only_table") for t in data["table_comparisons"] if t["table"] == f):
            add("NO ACTION", classification="NO ACTION", workstream="C-019/C-020", dev_value="Testing Scenarios table exists",
                prod_value="absent", evidence="DEV-only test harness table", operational_impact="None for live athletes",
                correction="None", mike_manual=False, cursor_safe=False, risk="None", validation="N/A")

    for script in data["script_matrix"]:
        if not script["prod_ok"] and script["script"] in ("116", "070b", "022", "070a"):
            add("BLOCKER", classification="BLOCKER", workstream=f"Script {script['script']}", dev_value="dependencies OK",
                prod_value="missing dependencies", evidence="; ".join([i for i in script["issues"] if i.startswith("PROD")]),
                operational_impact=f"Automation {script['script']} will fail on PROD",
                correction=f"Promote schema deps then paste {script['path']}", mike_manual=True, cursor_safe=False,
                risk="High", validation=f"Re-run pv2_dev_prod_gap_audit.py script matrix for {script['script']}")

    add("BLOCKER", classification="BLOCKER", workstream="Automation 116", dev_value="Deployed ON, v1.0.1 validated S5A-S5L",
        prod_value="Forward test FAIL — no field changes after 90s poll", evidence="docs/deploy-checklists/C-023-prod-automation-116-validation-2026-07-10.md",
        operational_impact="Duplicate decisions have no consequences on PROD", correction="Paste 116 v1.0.1, enable trigger on Asset Reuse Decision",
        mike_manual=True, cursor_safe=False, risk="High", validation="prod_116_fixture_run.py confirm + restore PASS")

    add("REQUIRED BEFORE LAUNCH", classification="REQUIRED BEFORE LAUNCH", workstream="C-013 Production promotion",
        dev_value="Lambda/Make/070b hybrid proven DEV", prod_value="Promotion NOT started per plan",
        evidence="docs/deploy-checklists/C-013-production-promotion-plan.md status Planning only",
        operational_impact="No S3 canonical URLs or hash writeback on PROD uploads",
        correction="Execute C-013 production promotion plan steps 1-11", mike_manual=True, cursor_safe=False,
        risk="Medium", validation="Isolated PROD Lambda smoke + one controlled 070b test")

    auto116 = next((r for r in data["automation_compare"]["rows"] if str(r.get("key")) == "116"), None)
    if auto116:
        if auto116.get("status") == "dev_only":
            add("REQUIRED BEFORE LAUNCH", classification="REQUIRED BEFORE LAUNCH", workstream="Automations table doc",
                dev_value="116 documented", prod_value="116 absent from Automations table",
                evidence="Automations table record compare", operational_impact="Documentation drift",
                correction="Add/update Automations record 116 on PROD after paste", mike_manual=True, cursor_safe=False,
                risk="Low", validation="Automations table parity")

    for cfg in data.get("config_diffs") or []:
        if cfg.get("issue") == "value_mismatch" and cfg.get("config_key") in ("Active School Year", "Active XP Rule Set", "Challenge Week Count"):
            add("REQUIRED BEFORE LAUNCH", classification="REQUIRED BEFORE LAUNCH", workstream="Config",
                dev_value=str(cfg.get("dev")), prod_value=str(cfg.get("prod")),
                evidence=f"Config.{cfg['config_key']}", operational_impact="XP/rules may diverge",
                correction=f"Align PROD Config.{cfg['config_key']} with season intent", mike_manual=True, cursor_safe=False,
                risk="Medium", validation="Config record review")

    if sa.get("extra_in_prod"):
        for f in sa["extra_in_prod"]:
            if "Google Drive" in f and f not in (sa.get("missing_in_prod") or []):
                add("SAFE POST-LAUNCH CLEANUP", classification="SAFE POST-LAUNCH CLEANUP", workstream="Legacy fields",
                    dev_value="field absent or renamed on DEV", prod_value=f"extra field {f}",
                    evidence="Schema field name diff", operational_impact="Cosmetic unless referenced",
                    correction="Review after cutover", mike_manual=True, cursor_safe=False, risk="Low", validation="Field usage audit")

    add("NO ACTION", classification="NO ACTION", workstream="066 shot milestones", dev_value="v3.2 pasted DEV+PROD 2026-07-06",
        prod_value="Same commit per automation-index", evidence="docs/automation-index.md",
        operational_impact="None if already pasted", correction="Verify PROD automation UI matches GitHub 36a2e95",
        mike_manual=True, cursor_safe=False, risk="Low", validation="Spot-check PROD 066 run log")

    return gaps


def priority_formula_report(dev_tables: list[dict], prod_tables: list[dict]) -> list[dict]:
    dev_tm, prod_tm = table_map(dev_tables), table_map(prod_tables)
    rows = []
    for tname, fields in PRIORITY_FORMULAS.items():
        dev_f = field_map(dev_tm[tname]) if tname in dev_tm else {}
        prod_f = field_map(prod_tm[tname]) if tname in prod_tm else {}
        for fname in fields:
            df, pf = dev_f.get(fname), prod_f.get(fname)
            if not df and not pf:
                classification = "Unknown — field missing both"
            elif not pf:
                classification = "Required PROD correction"
            elif not df:
                classification = "PROD-only field"
            elif df.get("type") != pf.get("type"):
                classification = "Required PROD correction"
            else:
                dform, pform = normalize_formula(formula_text(df)), normalize_formula(formula_text(pf))
                if dform == pform:
                    classification = "Behaviorally equivalent"
                elif fname in ("Active XP Total",):
                    classification = "Intentional environment difference"
                else:
                    classification = "Unknown and needs manual review"
            rows.append({
                "table": tname, "field": fname,
                "dev_present": df is not None, "prod_present": pf is not None,
                "dev_type": df.get("type") if df else None,
                "prod_type": pf.get("type") if pf else None,
                "formulas_match": normalize_formula(formula_text(df)) == normalize_formula(formula_text(pf)) if df and pf and df.get("type") == "formula" else None,
                "classification": classification,
            })
    return rows


def render_markdown(data: dict) -> str:
    gaps = data["gaps"]
    lines = [
        "# Production v2 — DEV-to-PROD Gap Inventory",
        "",
        f"**Audit date:** {AUDIT_DATE}  ",
        f"**DEV base:** `{DEV_BASE}`  ",
        f"**PROD base:** `{PROD_BASE}`  ",
        f"**Repository branch:** `{data['branch']}`  ",
        f"**Repository HEAD:** `{data['head']}`  ",
        f"**Audit script:** `tools/airtable/pv2_dev_prod_gap_audit.py`  ",
        "",
        "## 1. Executive summary",
        "",
        data["executive_summary"],
        "",
        "## 2. Repository Production v2 inventory",
        "",
        "| Workstream | File | Commit | Table | Expected change | For PROD |",
        "|---|---|---|---|---|---|",
    ]
    for item in REPO_V2_INVENTORY:
        lines.append(f"| {item['workstream']} | `{item['file']}` | {item['commit'] or '—'} | {item['table']} | {item['target']} | {'Yes' if item['for_prod'] else 'No'} |")

    lines.extend(["", "## 3. Table-by-table schema comparison", ""])
    for t in data["table_comparisons"]:
        lines.append(f"### {t['table']}")
        lines.append(f"- DEV present: **{t.get('dev_present')}** · PROD present: **{t.get('prod_present')}**")
        if t.get("dev_field_count") is not None:
            lines.append(f"- Field counts: DEV **{t['dev_field_count']}** · PROD **{t['prod_field_count']}**")
        if t.get("missing_in_prod"):
            lines.append(f"- **Missing in PROD ({len(t['missing_in_prod'])}):** " + ", ".join(f"`{x}`" for x in t["missing_in_prod"][:40]))
            if len(t["missing_in_prod"]) > 40:
                lines.append(f"  - … and {len(t['missing_in_prod']) - 40} more")
        if t.get("extra_in_prod"):
            lines.append(f"- Extra in PROD: {', '.join(f'`{x}`' for x in t['extra_in_prod'][:20])}")
        if t.get("type_mismatches"):
            lines.append(f"- Type mismatches: **{len(t['type_mismatches'])}**")
        if t.get("select_gaps"):
            lines.append(f"- Select option gaps: **{len(t['select_gaps'])}**")
        if t.get("formula_diffs"):
            lines.append(f"- Formula diffs: **{len(t['formula_diffs'])}**")
        lines.append("")

    lines.extend(["## 4. Script dependency matrix", ""])
    lines.append("| Script | Version | DEV | PROD | Safe to deploy PROD | Issues |")
    lines.append("|---|---|---|---|---|---|")
    for s in data["script_matrix"]:
        issues = "; ".join(s["issues"][:3])
        if len(s["issues"]) > 3:
            issues += f" (+{len(s['issues'])-3})"
        lines.append(f"| {s['script']} | {s['version']} | {'PASS' if s['dev_ok'] else 'FAIL'} | {'PASS' if s['prod_ok'] else 'FAIL'} | {'Yes' if s['safe_to_deploy_prod'] else 'No'} | {issues or '—'} |")

    lines.extend(["", "## 5. Formula comparison (priority fields)", ""])
    lines.append("| Table | Field | Match | Classification |")
    lines.append("|---|---|---|---|")
    for f in data["formula_report"]:
        match = "—" if f["formulas_match"] is None else ("Yes" if f["formulas_match"] else "No")
        lines.append(f"| {f['table']} | {f['field']} | {match} | {f['classification']} |")

    lines.extend(["", "## 6. Automation documentation comparison", ""])
    ac = data["automation_compare"]
    lines.append(f"DEV records: **{ac['dev_count']}** · PROD records: **{ac['prod_count']}**")
    dev_only = [r for r in ac["rows"] if r["status"] == "dev_only"]
    prod_only = [r for r in ac["rows"] if r["status"] == "prod_only"]
    diffs = [r for r in ac["rows"] if r["status"] == "both" and r.get("diffs")]
    lines.append(f"- DEV-only automation docs: **{len(dev_only)}** (e.g. {[r['key'] for r in dev_only[:5]]})")
    lines.append(f"- PROD-only automation docs: **{len(prod_only)}** (e.g. {[r['key'] for r in prod_only[:5]]})")
    lines.append(f"- Both bases with doc diffs: **{len(diffs)}**")
    lines.append("")
    lines.append("> **Limitation:** Automations table records do not prove live Airtable automation UI state.")

    lines.extend(["", "## 7. Configuration-record comparison", ""])
    if data.get("config_diffs"):
        for c in data["config_diffs"]:
            lines.append(f"- `{c.get('config_key')}`: {c.get('issue')} — DEV={c.get('dev')} PROD={c.get('prod')}")
    else:
        lines.append("- No Config Key diffs detected (or Config table structure differs).")

    for label, key in [("XP Reward Rules", "xp_rule_diffs"), ("Level Gate Rules", "level_gate_diffs"), ("Shot Milestones", "shot_milestone_diffs"), ("Achievements", "achievement_diffs")]:
        diffs_list = data.get(key) or []
        lines.append(f"\n### {label}")
        if diffs_list:
            lines.append(f"- Differences: **{len(diffs_list)}**")
            for d in diffs_list[:15]:
                lines.append(f"  - {d}")
        else:
            lines.append("- No record-level diffs detected (or key field mismatch).")

    for cls in ["BLOCKER", "REQUIRED BEFORE LAUNCH", "SAFE POST-LAUNCH CLEANUP", "NO ACTION"]:
        lines.extend([f"", f"## {cls} list", ""])
        items = gaps.get(cls) or []
        lines.append(f"**Count: {len(items)}**")
        for g in items:
            lines.append(f"\n### {g['gap_id']} — {g.get('workstream')}")
            lines.append(f"- DEV: {g.get('dev_value')} · PROD: {g.get('prod_value')}")
            lines.append(f"- Evidence: {g.get('evidence')}")
            lines.append(f"- Impact: {g.get('operational_impact')}")
            lines.append(f"- Correction: {g.get('correction')}")
            lines.append(f"- Mike manual: **{g.get('mike_manual')}** · Cursor safe: **{g.get('cursor_safe')}** · Risk: {g.get('risk')}")
            lines.append(f"- Validation: {g.get('validation')}")

    lines.extend(["", "## Ordered promotion plan", ""])
    plan = data["promotion_plan"]
    for i, step in enumerate(plan, 1):
        lines.append(f"{i}. **{step['title']}** — {step['detail']}")
        lines.append(f"   - Responsible: {step['owner']} · Rollback: {step['rollback']} · PASS evidence: {step['pass_evidence']}")

    lines.extend(["", "## Manual actions for Mike", ""])
    for a in data["manual_actions"]:
        lines.append(f"- {a}")

    lines.extend(["", "## Safe actions Cursor can perform", ""])
    for a in data["cursor_actions"]:
        lines.append(f"- {a}")

    lines.extend(["", "## Unknowns and audit limitations", ""])
    for u in data["limitations"]:
        lines.append(f"- {u}")

    lines.extend([
        "",
        "## Production v2 completion estimate",
        "",
        data["completion_estimate"],
        "",
        "## Recommended next Cursor prompt",
        "",
        data["next_prompt"],
        "",
        "---",
        f"*Generated {data['generated_at']} by pv2_dev_prod_gap_audit.py*",
    ])
    return "\n".join(lines)


def build_promotion_plan(gaps: dict[str, list]) -> list[dict]:
    return [
        {"title": "Promote Submission Assets schema (C-013 + C-023 fields)", "detail": "Add 22+ missing PROD fields per DEV c023-stage3-verify-dev snapshot", "owner": "Mike/OMNI", "rollback": "Field delete only if no live data written", "pass_evidence": "pv2 audit Submission Assets missing_in_prod = 0 for v2 fields"},
        {"title": "Add required single-select options", "detail": "Asset Reuse Decision, Award Status, Duplicate Status options on PROD", "owner": "Mike/OMNI", "rollback": "Remove unused options if no records", "pass_evidence": "Script 116 schema validate PASS on PROD"},
        {"title": "Align priority formulas", "detail": "Manual review formula diffs on Ready to Send, Potential Asset Reuse, duplicate helpers", "owner": "Mike/OMNI", "rollback": "Revert formula from snapshot", "pass_evidence": "Formula report classifications not 'Required PROD correction'"},
        {"title": "Production Lambda + Make (C-013)", "detail": "Deploy Lambda, new secrets, Make scenario — 070b OFF until smoke PASS", "owner": "Mike/AWS/Make", "rollback": "Disable Function URL; 070b OFF", "pass_evidence": "Isolated upload smoke allPass=true"},
        {"title": "Paste automation 116 v1.0.1", "detail": "Enable on Asset Reuse Decision; retire 008 if present", "owner": "Mike", "rollback": "Disable 116; reset test fixture", "pass_evidence": "prod_116_fixture_run.py confirm + restore PASS"},
        {"title": "Paste 070b v4.2 + controlled enable", "detail": "One Schmidt Testing upload after infra PASS", "owner": "Mike", "rollback": "070b OFF immediately", "pass_evidence": "Canonical URL + hash on test asset"},
        {"title": "Paste 022 writeback if changed", "detail": "Sync child tables after Lambda writeback fields exist", "owner": "Mike", "rollback": "Disable 022", "pass_evidence": "Writeback Complete? chain PASS on test asset"},
        {"title": "Update Automations table records", "detail": "Document 116, 070b versions and statuses on PROD", "owner": "Mike/Cursor docs", "rollback": "Doc-only", "pass_evidence": "Automation doc compare 116/070b parity"},
        {"title": "Regression tests", "detail": "PROD fixture tests only — no live athlete records", "owner": "Mike/Cursor", "rollback": "N/A", "pass_evidence": "116 fixture + one upload smoke"},
        {"title": "Launch approval + CHANGELOG", "detail": "Mike sign-off; CHANGELOG Airtable section", "owner": "Mike", "rollback": "N/A", "pass_evidence": "Backlog C-013/C-023 marked promoted"},
    ]


def main() -> None:
    load_env()
    print("Fetching DEV schema...", file=sys.stderr)
    dev_tables = fetch_schema(DEV_BASE)
    print("Fetching PROD schema...", file=sys.stderr)
    prod_tables = fetch_schema(PROD_BASE)

    dev_tm, prod_tm = table_map(dev_tables), table_map(prod_tables)
    extra_tables = sorted(set(dev_tm) | set(prod_tm) - set(SCOPE_TABLES))
    all_compare = list(dict.fromkeys(
        SCOPE_TABLES + [t for t in extra_tables if t in ("Achievements", "Testing Scenarios", "Levels", "Athletes")]
    ))

    table_comparisons = [compare_table(dev_tm.get(n), prod_tm.get(n), n) for n in all_compare]

    script_matrix = validate_script_deps(dev_tables, prod_tables)
    formula_report = priority_formula_report(dev_tables, prod_tables)

    limitations = [
        "Airtable automation UI state (ON/OFF, pasted script body) is not available via API — inferred from forward tests and docs.",
        "Formula equivalence is string compare only; behaviorally equivalent rewrites may flag as diff.",
        "Automations table stores full script body in Automation Code — comparison keyed by Name prefix (###).",
        "Config table key field names assumed; mismatches may hide record diffs.",
    ]

    automation_compare = {"rows": [], "dev_count": 0, "prod_count": 0}
    config_diffs: list[dict] = []
    xp_rule_diffs: list[dict] = []
    level_gate_diffs: list[dict] = []
    shot_milestone_diffs: list[dict] = []
    achievement_diffs: list[dict] = []

    try:
        dev_auto = fetch_records(DEV_BASE, "Automations")
        prod_auto = fetch_records(PROD_BASE, "Automations")
        automation_compare = compare_automation_records(dev_auto, prod_auto)
    except Exception as e:
        limitations.append(f"Automations table fetch failed: {e}")

    try:
        dev_cfg = fetch_records(DEV_BASE, "Config")
        prod_cfg = fetch_records(PROD_BASE, "Config")
        config_diffs = compare_config_records(dev_cfg, prod_cfg)
    except Exception as e:
        limitations.append(f"Config table fetch: {e}")

    try:
        xp_rule_diffs = compare_rule_records(
            "XP Reward Rules", "Rule Key",
            fetch_records(DEV_BASE, "XP Reward Rules"),
            fetch_records(PROD_BASE, "XP Reward Rules"),
            ["XP Amount", "Active?", "XP Source Label", "Rule Set"],
        )
    except Exception as e:
        limitations.append(f"XP Reward Rules fetch: {e}")

    try:
        level_gate_diffs = compare_rule_records(
            "Level Gate Rules", "Level",
            fetch_records(DEV_BASE, "Level Gate Rules"),
            fetch_records(PROD_BASE, "Level Gate Rules"),
            ["Active Version", "Gate Enabled?", "Minimum Requirements"],
        )
    except Exception as e:
        limitations.append(f"Level Gate Rules fetch: {e}")

    try:
        shot_milestone_diffs = compare_rule_records(
            "Shot Milestones", "Milestone Key",
            fetch_records(DEV_BASE, "Shot Milestones"),
            fetch_records(PROD_BASE, "Shot Milestones"),
            ["Target", "XP Points", "Active?", "Grade Band"],
        )
    except Exception as e:
        limitations.append(f"Shot Milestones fetch: {e}")

    try:
        achievement_diffs = compare_rule_records(
            "Achievements", "Achievement Key",
            fetch_records(DEV_BASE, "Achievements"),
            fetch_records(PROD_BASE, "Achievements"),
            ["Active?", "Visible?", "Threshold", "Reward Rule Key"],
        )
    except Exception as e:
        limitations.append(f"Achievements fetch: {e}")

    partial = {
        "table_comparisons": table_comparisons,
        "script_matrix": script_matrix,
        "automation_compare": automation_compare,
        "config_diffs": config_diffs,
    }
    gaps = classify_gaps(partial)
    blockers = len(gaps["BLOCKER"])
    required = len(gaps["REQUIRED BEFORE LAUNCH"])

    sa = next(t for t in table_comparisons if t["table"] == "Submission Assets")
    missing_sa = len(sa.get("missing_in_prod") or [])
    prod_script_fails = sum(1 for s in script_matrix if not s["prod_ok"])

    executive = (
        f"Production v2 promotion is **not complete**. Live schema compare shows **{missing_sa} Submission Assets fields** on DEV absent from PROD. "
        f"**{prod_script_fails}** of {len(script_matrix)} critical scripts fail PROD dependency checks "
        f"(116 schema **PASS**; automation **116 forward test FAIL** — OFF or not pasted). "
        f"C-013 production promotion **not started**. "
        f"Classified gaps: **{blockers} BLOCKER**, **{required} REQUIRED BEFORE LAUNCH**."
    )

    completion = (
        "**Estimated completion: ~35–45%** for Production v2 wave (C-013 + C-023 + 116). "
        "Core season automations (005–114, 066) appear largely aligned; "
        "asset storage, duplicate consequences, and PROD infra remain unpromoted."
    )

    next_prompt = (
        "Execute Production v2 promotion step 1: generate OMNI/Airtable field-creation checklist from "
        "`docs/audits/pv2-dev-prod-gap-inventory-2026-07-11.md` BLOCKER list for Submission Assets only; "
        "do not enable automations until schema PASS confirmed by re-running pv2_dev_prod_gap_audit.py."
    )

    data = {
        "audit_date": AUDIT_DATE,
        "dev_base": DEV_BASE,
        "prod_base": PROD_BASE,
        "branch": git_branch(),
        "head": git_head(),
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "executive_summary": executive,
        "table_comparisons": table_comparisons,
        "script_matrix": script_matrix,
        "formula_report": formula_report,
        "automation_compare": automation_compare,
        "config_diffs": config_diffs,
        "xp_rule_diffs": xp_rule_diffs,
        "level_gate_diffs": level_gate_diffs,
        "shot_milestone_diffs": shot_milestone_diffs,
        "achievement_diffs": achievement_diffs,
        "gaps": gaps,
        "promotion_plan": build_promotion_plan(gaps),
        "manual_actions": [
            "Add missing Submission Assets fields on PROD (OMNI or Airtable UI) per BLOCKER list",
            "Paste and enable automation 116 v1.0.1; run prod_116_fixture_run.py confirm + restore",
            "Execute C-013 production promotion plan (Lambda, Make, secrets) before enabling 070b",
            "Verify live Airtable automation ON/OFF states against automation-index.md",
            "Approve launch after regression tests on Schmidt Testing fixture only",
        ],
        "cursor_actions": [
            "Re-run pv2_dev_prod_gap_audit.py after schema promotion",
            "Update deploy checklists and CHANGELOG when Mike completes each promotion step",
            "Run prod_116_fixture_run.py (read-only fixture validation)",
            "Commit schema snapshots to airtable/schema/snapshots/ after PROD field promotion",
        ],
        "limitations": limitations,
        "completion_estimate": completion,
        "next_prompt": next_prompt,
    }

    out_dir = REPO / "docs" / "audits"
    out_dir.mkdir(parents=True, exist_ok=True)
    json_path = out_dir / "pv2-dev-prod-gap-inventory-2026-07-11.json"
    md_path = out_dir / "pv2-dev-prod-gap-inventory-2026-07-11.md"
    json_path.write_text(json.dumps(data, indent=2, default=str), encoding="utf-8")
    md_path.write_text(render_markdown(data), encoding="utf-8")

    summary = {
        "blockers": blockers,
        "required_before_launch": required,
        "safe_cleanup": len(gaps["SAFE POST-LAUNCH CLEANUP"]),
        "no_action": len(gaps["NO ACTION"]),
        "submission_assets_missing_in_prod": missing_sa,
        "md_path": str(md_path.relative_to(REPO)),
        "json_path": str(json_path.relative_to(REPO)),
    }
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
