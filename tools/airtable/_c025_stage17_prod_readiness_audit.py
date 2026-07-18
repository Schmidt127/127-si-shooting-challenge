#!/usr/bin/env python3
"""Read-only C-025 Stage 17 DEV vs PROD schema readiness audit.

READ-ONLY: meta schema + filtered record reads only.
Never creates/updates/deletes tables, fields, views, records, or automations.
"""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
# Prefer local .env; fall back to primary checkout tools/airtable/.env
ENV_CANDIDATES = [
    HERE / ".env",
    HERE.parents[2] / "127-si-shooting-challenge" / "tools" / "airtable" / ".env",
    Path(r"C:\Users\mschmidt_fairfield\Documents\GitHub\127-si-shooting-challenge\tools\airtable\.env"),
]

DEV = "appTetnuCZlCZdTCT"
PROD = "appn84sqPw03zEbTT"

FOCUS_TABLES = [
    "Zoom Attendance",
    "Zoom Meetings",
    "XP Events",
    "XP Reward Rules",
    "Weekly Athlete Summary",
    "Enrollments",
    "Engineering Test Framework",
    "Testing Scenarios",
    "Config",
    "Homework Completions",
    "Level Gate Rules",
    "Levels",
    "Submissions",
    "Video Feedback",
    "Weeks",
]

SIMILAR_NAME_NEEDLES = (
    "zoom",
    "attend",
    "recording",
    "credit",
    "quiz",
)

# Stage 17 Zoom Attendance required fields (117 / 057 / 042)
ZA_REQUIRED = {
    "Attendance Method": {"type": "singleSelect", "choices": ["Live", "Recording Quiz"]},
    "Enrollment": {"type": "multipleRecordLinks"},
    "Zoom Meeting": {"type": "multipleRecordLinks"},
    "Enrollment RID": {"types_any": ["multipleLookupValues", "formula", "singleLineText"]},
    "Zoom Meeting RID": {"types_any": ["multipleLookupValues", "formula", "singleLineText"]},
    "Recording Quiz Review Status": {
        "type": "singleSelect",
        "choices": ["Needs Review", "Satisfactory", "Needs Correction"],
    },
    "Recording Quiz Satisfactory?": {"type": "checkbox"},
    "Recording Quiz Submitted At": {"types_any": ["dateTime", "date"]},
    "Recording Quiz Correction Count": {"type": "number"},
    "Recording Quiz Reviewed At": {"types_any": ["dateTime", "date"]},
    "Recording Quiz Needs Correction At": {"types_any": ["dateTime", "date"]},
    "Zoom Credit Key": {"type": "formula"},
    "Zoom Credit Approved?": {"types_any": ["formula", "checkbox"]},
    "Zoom Credit Conflict?": {"types_any": ["formula", "checkbox"]},
    "Zoom XP Amount": {"types_any": ["formula", "number"]},
    "Zoom Credit Debug": {"types_any": ["formula", "singleLineText", "multilineText"]},
    "Zoom Gate Credit Earned?": {"types_any": ["formula", "checkbox"]},
    "Gate Credit Applied?": {"type": "checkbox"},
    "Perfect Week Credit Applied?": {"type": "checkbox"},
    "Effective Recording Counts for Perfect Week?": {
        "types_any": ["multipleLookupValues", "formula", "checkbox"]
    },
    "Recording Approval Email Send Key": {"types_any": ["singleLineText", "formula"]},
    "Recording Approval Email Sent At": {"types_any": ["dateTime", "date"]},
}

# User-facing aliases sometimes used in design docs
ZA_ALIAS_FIELDS = [
    "Attendance Type",  # may map to Attendance Method
    "Credit Status",
    "Source Key",
    "Activity Date",
    "XP Event",
]

ZM_REQUIRED = {
    "Attendees": {"type": "multipleRecordLinks"},
    "Start Time": {"types_any": ["dateTime", "date"]},
    "Week": {"type": "multipleRecordLinks"},
    "Zoom Meeting Key": {"types_any": ["formula", "singleLineText"]},
    "Meeting Status": {"types_any": ["singleSelect", "formula"]},
    "Create XP Events": {"type": "checkbox"},
    "XP Award Status": {"types_any": ["singleSelect", "formula"]},
    "Recording Available At": {"types_any": ["dateTime", "date"]},
}

XP_REQUIRED = {
    "Source Key": {"types_any": ["singleLineText", "formula"]},
    "Enrollment": {"type": "multipleRecordLinks"},
    "XP Points": {"type": "number"},
    "XP Bucket": {"type": "singleSelect", "choices": ["Zoom Attendance"]},
    "XP Source": {"type": "singleSelect", "choices": ["Zoom Meeting Recording Quiz"]},
    "Active?": {"type": "checkbox"},
    "XP Reason Public": {"types_any": ["singleLineText", "multilineText"]},
    "XP Reason Debug": {"types_any": ["singleLineText", "multilineText"]},
    "XP Activity Date": {"types_any": ["date", "dateTime"]},
    "Zoom Meeting": {"type": "multipleRecordLinks"},
    "Zoom Attendance": {"type": "multipleRecordLinks"},  # optional in DEV historically
    "Week": {"type": "multipleRecordLinks"},
    "Awarded By": {"types_any": ["singleLineText", "singleSelect"]},
    "Weekly Athlete Summary": {"type": "multipleRecordLinks"},
}

WAS_REQUIRED = {
    "Enrollment": {"type": "multipleRecordLinks"},
    "Week": {"type": "multipleRecordLinks"},
    "Perfect Week Zoom Meeting Count": {"types_any": ["number", "formula"]},
    "Perfect Week Zoom Attendance Count": {"types_any": ["number", "formula"]},
    "Perfect Week Automation Status": {"types_any": ["singleSelect", "singleLineText"]},
}

ENROLL_REQUIRED = {
    "Total Zoom Attendances": {"types_any": ["count", "number", "formula"]},
    "Level Recalc Needed?": {"type": "checkbox"},
    "Level Status": {"types_any": ["singleSelect", "singleLineText"]},
    "Level Gate Rule": {"type": "multipleRecordLinks"},
    "Current Level": {"type": "multipleRecordLinks"},
    "Next Level": {"type": "multipleRecordLinks"},
    "Lifetime XP Total": {"types_any": ["number", "formula", "rollup"]},
}

CONFIG_REQUIRED = {
    # recording % / email toggles — names vary; probe common Stage 17 keys
}

AUTOMATION_REQUIREMENTS = {
    "117_v1.1.1": {
        "tables": ["Zoom Attendance", "Zoom Meetings", "XP Events"],
        "za_fields": list(ZA_REQUIRED.keys()),
        "xp_fields": [
            "Source Key",
            "Enrollment",
            "XP Points",
            "XP Bucket",
            "XP Source",
            "Active?",
            "XP Reason Public",
            "XP Reason Debug",
            "XP Activity Date",
            "Zoom Meeting",
            "Awarded By",
        ],
        "select_options": {
            ("XP Events", "XP Bucket"): ["Zoom Attendance"],
            ("XP Events", "XP Source"): ["Zoom Meeting Recording Quiz"],
            ("Zoom Attendance", "Attendance Method"): ["Recording Quiz"],
            ("Zoom Attendance", "Recording Quiz Review Status"): [
                "Needs Review",
                "Satisfactory",
                "Needs Correction",
            ],
        },
        "trigger": "Zoom Attendance · Attendance Method=Recording Quiz · Enrollment+Meeting present",
        "never_write": ["Zoom Meetings.Attendees"],
    },
    "057_v1.3": {
        "tables": [
            "Weekly Athlete Summary",
            "Submissions",
            "Homework Completions",
            "Video Feedback",
            "Zoom Meetings",
            "Zoom Attendance",
            "Weeks",
        ],
        "za_fields": [
            "Attendance Method",
            "Enrollment",
            "Zoom Meeting",
            "Zoom Credit Approved?",
            "Zoom Credit Conflict?",
            "Effective Recording Counts for Perfect Week?",
            "Perfect Week Credit Applied?",
            "Recording Quiz Review Status",
        ],
        "was_fields": list(WAS_REQUIRED.keys()),
        "never_write": ["Zoom Meetings.Attendees"],
    },
    "042_v3.1": {
        "tables": [
            "Enrollments",
            "Levels",
            "Level Gate Rules",
            "Zoom Meetings",
            "Zoom Attendance",
        ],
        "za_fields": [
            "Attendance Method",
            "Enrollment",
            "Zoom Meeting",
            "Zoom Credit Approved?",
            "Zoom Credit Conflict?",
            "Zoom Gate Credit Earned?",
            "Gate Credit Applied?",
            "Recording Quiz Review Status",
        ],
        "enroll_fields": list(ENROLL_REQUIRED.keys()),
        "never_write": ["Zoom Meetings.Attendees"],
    },
}


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for path in ENV_CANDIDATES:
        if not path.is_file():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
        if env.get("AIRTABLE_API_TOKEN") or env.get("AIRTABLE_TOKEN"):
            env["_env_path"] = str(path)
            return env
    raise SystemExit("No AIRTABLE_API_TOKEN found in .env candidates")


def api_json(url: str, token: str, retries: int = 4):
    last = None
    for attempt in range(retries):
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                return r.status, json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            raw = e.read().decode("utf-8", errors="replace")
            try:
                payload = json.loads(raw)
            except Exception:
                payload = {"raw": raw[:800]}
            if e.code == 429 and attempt < retries - 1:
                time.sleep(1.5 * (attempt + 1))
                last = (e.code, payload)
                continue
            return e.code, payload
        except Exception as e:  # noqa: BLE001
            last = (0, {"error": str(e)})
            time.sleep(0.5)
    return last or (0, {"error": "unknown"})


def field_map(table: dict) -> dict:
    return {f["name"]: f for f in table.get("fields") or []}


def summarize_field(f: dict | None) -> dict | None:
    if not f:
        return None
    info = {
        "id": f.get("id"),
        "name": f.get("name"),
        "type": f.get("type"),
    }
    choices = (f.get("options") or {}).get("choices")
    if choices is not None:
        info["choices"] = [c.get("name") for c in choices]
    linked = (f.get("options") or {}).get("linkedTableId")
    if linked:
        info["linkedTableId"] = linked
    return info


def check_field_reqs(fmap: dict, reqs: dict) -> dict:
    missing = []
    incompatible = []
    present = []
    for name, spec in reqs.items():
        f = fmap.get(name)
        if not f:
            missing.append({"name": name, "expected": spec})
            continue
        actual_type = f.get("type")
        allowed = []
        if "type" in spec:
            allowed.append(spec["type"])
        if "types_any" in spec:
            allowed.extend(spec["types_any"])
        type_ok = (not allowed) or (actual_type in allowed)
        choice_missing = []
        if "choices" in spec and actual_type == "singleSelect":
            have = {c.get("name") for c in ((f.get("options") or {}).get("choices") or [])}
            choice_missing = [c for c in spec["choices"] if c not in have]
        row = {
            "name": name,
            "type": actual_type,
            "id": f.get("id"),
            "type_ok": type_ok,
            "missing_choices": choice_missing,
        }
        if choices := (f.get("options") or {}).get("choices"):
            row["choices"] = [c.get("name") for c in choices]
        present.append(row)
        if not type_ok or choice_missing:
            incompatible.append(row)
    return {"present": present, "missing": missing, "incompatible": incompatible}


def list_similar_tables(tables: dict) -> list[str]:
    out = []
    for name in tables:
        low = name.lower()
        if any(n in low for n in SIMILAR_NAME_NEEDLES):
            out.append(name)
    return sorted(out)


def fetch_base_schema(base_id: str, token: str) -> dict:
    code, meta = api_json(f"https://api.airtable.com/v0/meta/bases/{base_id}/tables", token)
    if code != 200:
        return {"ok": False, "status": code, "error": meta}
    tables = {t["name"]: t for t in meta.get("tables") or []}
    # views are included in meta tables response
    view_index = {}
    for tname, t in tables.items():
        view_index[tname] = [
            {"id": v.get("id"), "name": v.get("name"), "type": v.get("type")}
            for v in (t.get("views") or [])
        ]
    return {
        "ok": True,
        "status": code,
        "table_names": sorted(tables.keys()),
        "table_count": len(tables),
        "tables": tables,
        "views": view_index,
        "similar_tables": list_similar_tables(tables),
    }


def fetch_zoom_rules(base_id: str, token: str) -> dict:
    q = urllib.parse.urlencode(
        {
            "filterByFormula": "OR(FIND('ZOOM', UPPER({Rule Key}&'')), FIND('Zoom', {Rule Key}&''))",
            "maxRecords": 100,
        }
    )
    code, body = api_json(
        f"https://api.airtable.com/v0/{base_id}/{urllib.parse.quote('XP Reward Rules')}?{q}",
        token,
    )
    rows = []
    if code == 200:
        for rec in body.get("records") or []:
            f = rec.get("fields") or {}
            rows.append(
                {
                    "id": rec["id"],
                    "Rule Key": f.get("Rule Key"),
                    "XP Amount": f.get("XP Amount"),
                    "Active?": f.get("Active?"),
                    "XP Source Label": f.get("XP Source Label"),
                    "XP Bucket Label": f.get("XP Bucket Label"),
                    "Recording Percentage": f.get("Recording Percentage")
                    or f.get("Recording %")
                    or f.get("Recording Percent"),
                }
            )
    return {"status": code, "rules": rows}


def sample_source_keys(base_id: str, token: str, prefix: str, limit: int = 5) -> dict:
    formula = f"FIND('{prefix}', {{Source Key}}&'')"
    q = urllib.parse.urlencode(
        {
            "filterByFormula": formula,
            "maxRecords": limit,
            "fields[]": ["Source Key", "Active?", "XP Points", "XP Bucket", "XP Source"],
        }
    )
    code, body = api_json(
        f"https://api.airtable.com/v0/{base_id}/{urllib.parse.quote('XP Events')}?{q}",
        token,
    )
    samples = []
    if code == 200:
        for rec in body.get("records") or []:
            f = rec.get("fields") or {}
            samples.append({"id": rec["id"], **{k: f.get(k) for k in f}})
    return {"status": code, "sample_count": len(samples), "samples": samples}


def analyze_base(label: str, base_id: str, token: str) -> dict:
    schema = fetch_base_schema(base_id, token)
    report: dict = {
        "label": label,
        "base_id": base_id,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "schema_ok": schema.get("ok"),
        "schema_status": schema.get("status"),
    }
    if not schema.get("ok"):
        report["error"] = schema.get("error")
        return report

    tables = schema["tables"]
    report["table_count"] = schema["table_count"]
    report["table_names"] = schema["table_names"]
    report["similar_tables"] = schema["similar_tables"]
    report["focus_tables_present"] = {n: n in tables for n in FOCUS_TABLES}

    # field inventories for focus tables
    inventories = {}
    for tname in FOCUS_TABLES:
        if tname not in tables:
            inventories[tname] = None
            continue
        fmap = field_map(tables[tname])
        inventories[tname] = {
            name: summarize_field(f) for name, f in sorted(fmap.items(), key=lambda x: x[0])
        }
    report["field_inventories"] = inventories
    report["views_focus"] = {
        n: schema["views"].get(n, []) for n in FOCUS_TABLES if n in tables
    }

    # requirement checks
    def fmap_or_empty(tname: str) -> dict:
        return field_map(tables[tname]) if tname in tables else {}

    report["za_check"] = (
        check_field_reqs(fmap_or_empty("Zoom Attendance"), ZA_REQUIRED)
        if "Zoom Attendance" in tables
        else {"table_missing": True, "missing": [{"name": n} for n in ZA_REQUIRED], "incompatible": [], "present": []}
    )
    report["za_alias_probe"] = {
        n: summarize_field(fmap_or_empty("Zoom Attendance").get(n))
        for n in ZA_ALIAS_FIELDS
    } if "Zoom Attendance" in tables else {"table_missing": True}

    report["zm_check"] = (
        check_field_reqs(fmap_or_empty("Zoom Meetings"), ZM_REQUIRED)
        if "Zoom Meetings" in tables
        else {"table_missing": True, "missing": [{"name": n} for n in ZM_REQUIRED], "incompatible": [], "present": []}
    )
    report["xp_check"] = (
        check_field_reqs(fmap_or_empty("XP Events"), XP_REQUIRED)
        if "XP Events" in tables
        else {"table_missing": True, "missing": [{"name": n} for n in XP_REQUIRED], "incompatible": [], "present": []}
    )
    report["was_check"] = (
        check_field_reqs(fmap_or_empty("Weekly Athlete Summary"), WAS_REQUIRED)
        if "Weekly Athlete Summary" in tables
        else {"table_missing": True, "missing": [{"name": n} for n in WAS_REQUIRED], "incompatible": [], "present": []}
    )
    report["enroll_check"] = (
        check_field_reqs(fmap_or_empty("Enrollments"), ENROLL_REQUIRED)
        if "Enrollments" in tables
        else {"table_missing": True, "missing": [{"name": n} for n in ENROLL_REQUIRED], "incompatible": [], "present": []}
    )

    # select option details for XP
    if "XP Events" in tables:
        xp = fmap_or_empty("XP Events")
        report["xp_bucket_choices"] = [
            c.get("name")
            for c in ((xp.get("XP Bucket") or {}).get("options") or {}).get("choices") or []
        ]
        report["xp_source_choices"] = [
            c.get("name")
            for c in ((xp.get("XP Source") or {}).get("options") or {}).get("choices") or []
        ]

    # Config field names (probe)
    if "Config" in tables:
        report["config_field_names"] = sorted(fmap_or_empty("Config").keys())

    # ETF / Testing Scenarios presence
    for tname in ("Engineering Test Framework", "Testing Scenarios"):
        if tname in tables:
            report[f"{tname}_field_names"] = sorted(fmap_or_empty(tname).keys())

    report["zoom_xp_rules"] = fetch_zoom_rules(base_id, token)
    report["sample_live_keys"] = sample_source_keys(base_id, token, "ZOOM_ATTEND_BASE|")
    report["sample_recording_keys"] = sample_source_keys(base_id, token, "ZOOM_CREDIT|")

    # Homework Completions zoom-ish fields (S16 residue)
    if "Homework Completions" in tables:
        hc = fmap_or_empty("Homework Completions")
        report["homework_completions_zoomish_fields"] = sorted(
            n for n in hc if any(x in n.lower() for x in ("zoom", "recording", "attend"))
        )

    return report


def compare(dev: dict, prod: dict) -> dict:
    """Build gap summary."""
    gaps = {
        "zoom_attendance_in_prod": bool(prod.get("focus_tables_present", {}).get("Zoom Attendance")),
        "zoom_attendance_in_dev": bool(dev.get("focus_tables_present", {}).get("Zoom Attendance")),
        "table_presence": {},
        "missing_tables_in_prod": [],
        "extra_or_similar_in_prod": prod.get("similar_tables") or [],
        "field_gaps": {},
        "select_option_gaps": {},
        "reward_rule_gaps": [],
        "counts": {
            "missing_schema_items": 0,
            "incompatible_items": 0,
        },
    }

    for tname in FOCUS_TABLES:
        d = bool(dev.get("focus_tables_present", {}).get(tname))
        p = bool(prod.get("focus_tables_present", {}).get(tname))
        gaps["table_presence"][tname] = {"dev": d, "prod": p}
        if d and not p:
            gaps["missing_tables_in_prod"].append(tname)

    # Field-level: for shared tables, compare names present in DEV inventory vs PROD
    for tname in FOCUS_TABLES:
        dinv = (dev.get("field_inventories") or {}).get(tname)
        pinv = (prod.get("field_inventories") or {}).get(tname)
        if dinv is None and pinv is None:
            continue
        if dinv is None:
            gaps["field_gaps"][tname] = {"note": "missing_in_dev"}
            continue
        if pinv is None:
            gaps["field_gaps"][tname] = {
                "table_missing_in_prod": True,
                "dev_field_count": len(dinv),
                "all_dev_fields_missing_in_prod": sorted(dinv.keys()),
            }
            gaps["counts"]["missing_schema_items"] += len(dinv)
            continue
        missing = sorted(set(dinv) - set(pinv))
        extra = sorted(set(pinv) - set(dinv))
        type_mismatches = []
        for name in sorted(set(dinv) & set(pinv)):
            dt = (dinv[name] or {}).get("type")
            pt = (pinv[name] or {}).get("type")
            if dt != pt:
                type_mismatches.append({"field": name, "dev_type": dt, "prod_type": pt})
            # choice diffs for selects
            dc = set((dinv[name] or {}).get("choices") or [])
            pc = set((pinv[name] or {}).get("choices") or [])
            if dc or pc:
                only_dev = sorted(dc - pc)
                only_prod = sorted(pc - dc)
                if only_dev or only_prod:
                    gaps["select_option_gaps"].setdefault(tname, {})[name] = {
                        "only_in_dev": only_dev,
                        "only_in_prod": only_prod,
                    }
        gaps["field_gaps"][tname] = {
            "missing_in_prod": missing,
            "extra_in_prod": extra,
            "type_mismatches": type_mismatches,
            "dev_field_count": len(dinv),
            "prod_field_count": len(pinv),
        }
        gaps["counts"]["missing_schema_items"] += len(missing)
        gaps["counts"]["incompatible_items"] += len(type_mismatches)
        # count missing select options as missing schema items
        for fname, diff in (gaps["select_option_gaps"].get(tname) or {}).items():
            gaps["counts"]["missing_schema_items"] += len(diff.get("only_in_dev") or [])

    # Stage 17 required checks on PROD
    for key in ("za_check", "zm_check", "xp_check", "was_check", "enroll_check"):
        chk = prod.get(key) or {}
        gaps["counts"]["missing_schema_items"] += len(chk.get("missing") or [])
        gaps["counts"]["incompatible_items"] += len(chk.get("incompatible") or [])

    # Reward rules
    def rule_map(report: dict) -> dict:
        out = {}
        for r in (report.get("zoom_xp_rules") or {}).get("rules") or []:
            k = r.get("Rule Key")
            if k:
                out[str(k)] = r
        return out

    dr = rule_map(dev)
    pr = rule_map(prod)
    base_key = "ZOOM_ATTEND_BASE"
    expected = {"XP Amount": 60}
    for side, rules in (("dev", dr), ("prod", pr)):
        row = rules.get(base_key)
        gaps.setdefault("reward_rule_detail", {})[side] = row
    if base_key not in pr:
        gaps["reward_rule_gaps"].append(
            {"issue": "missing_rule", "rule": base_key, "expected_xp": 60}
        )
        gaps["counts"]["missing_schema_items"] += 1
    else:
        amt = pr[base_key].get("XP Amount")
        if amt != 60:
            gaps["reward_rule_gaps"].append(
                {
                    "issue": "amount_mismatch",
                    "rule": base_key,
                    "prod_amount": amt,
                    "expected": 60,
                }
            )
            gaps["counts"]["incompatible_items"] += 1
        if not pr[base_key].get("Active?"):
            gaps["reward_rule_gaps"].append({"issue": "inactive", "rule": base_key})
            gaps["counts"]["incompatible_items"] += 1

    # Recording percent is typically on Config / ZA formula, not the rule row —
    # document as unknown if not on rule.
    gaps["expected_recording"] = {
        "base_rule": "ZOOM_ATTEND_BASE",
        "base_xp": 60,
        "recording_percent": "50%",
        "expected_recording_xp": 30,
        "note": "Recording XP usually comes from Zoom Attendance formula × Config %, not a separate rule row.",
    }

    # Automation readiness (PROD)
    auto = {}
    for auto_id, req in AUTOMATION_REQUIREMENTS.items():
        missing_tables = [t for t in req["tables"] if not prod.get("focus_tables_present", {}).get(t)]
        missing_fields = []
        for tname, field_list_key, check_key in (
            ("Zoom Attendance", "za_fields", "za_check"),
            ("XP Events", "xp_fields", "xp_check"),
            ("Weekly Athlete Summary", "was_fields", "was_check"),
            ("Enrollments", "enroll_fields", "enroll_check"),
        ):
            names = req.get(field_list_key) or []
            if not names:
                continue
            if not prod.get("focus_tables_present", {}).get(tname):
                missing_fields.extend(f"{tname}.{n}" for n in names)
                continue
            present_names = {r["name"] for r in (prod.get(check_key) or {}).get("present") or []}
            # For xp optional Zoom Attendance link, still list if missing
            inv = ((prod.get("field_inventories") or {}).get(tname) or {})
            for n in names:
                if n not in inv:
                    missing_fields.append(f"{tname}.{n}")
        select_gaps = []
        for (tname, fname), needed in (req.get("select_options") or {}).items():
            inv = ((prod.get("field_inventories") or {}).get(tname) or {}).get(fname)
            if not inv:
                select_gaps.append({"table": tname, "field": fname, "missing_field": True, "needed": needed})
                continue
            have = set(inv.get("choices") or [])
            miss = [c for c in needed if c not in have]
            if miss:
                select_gaps.append({"table": tname, "field": fname, "missing_choices": miss})
        auto[auto_id] = {
            "missing_tables": missing_tables,
            "missing_fields": missing_fields,
            "select_gaps": select_gaps,
            "never_write": req.get("never_write"),
            "trigger": req.get("trigger"),
            "ready": not missing_tables and not missing_fields and not select_gaps,
        }
    gaps["automation_readiness_prod"] = auto

    return gaps


def main() -> None:
    env = load_env()
    token = env.get("AIRTABLE_API_TOKEN") or env.get("AIRTABLE_TOKEN")
    assert token
    # Safety: do not require AIRTABLE_BASE_ID to equal DEV — we explicitly read both.
    # Never write.

    print("READ-ONLY audit starting…")
    print("env:", env.get("_env_path"))
    print("DEV", DEV, "PROD", PROD)

    dev = analyze_base("DEV", DEV, token)
    time.sleep(0.3)
    prod = analyze_base("PROD", PROD, token)
    gaps = compare(dev, prod)

    # Strip bulky raw table objects before write (keep inventories)
    for side in (dev, prod):
        side.pop("tables", None)

    out = {
        "audit": "C-025 Stage 17 PROD schema readiness",
        "mode": "read-only",
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "dev_base": DEV,
        "prod_base": PROD,
        "dev": dev,
        "prod": prod,
        "gaps": gaps,
        "safety": {
            "writes": False,
            "schema_mutations": False,
            "automation_changes": False,
            "make_gmail_softr_bracket": False,
        },
    }

    preview = HERE / "_preview"
    preview.mkdir(parents=True, exist_ok=True)
    out_path = preview / "c025_stage17_prod_readiness_audit.json"
    out_path.write_text(json.dumps(out, indent=2), encoding="utf-8")

    # Compact summary for stdout
    summary = {
        "zoom_attendance_prod": gaps["zoom_attendance_in_prod"],
        "missing_tables_in_prod": gaps["missing_tables_in_prod"],
        "missing_schema_items": gaps["counts"]["missing_schema_items"],
        "incompatible_items": gaps["counts"]["incompatible_items"],
        "automation_ready": {
            k: v.get("ready") for k, v in gaps["automation_readiness_prod"].items()
        },
        "prod_similar_tables": gaps["extra_or_similar_in_prod"],
        "wrote": str(out_path),
    }
    print(json.dumps(summary, indent=2))
    print("WROTE", out_path)


if __name__ == "__main__":
    main()
