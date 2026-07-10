#!/usr/bin/env python3
"""C-023 Stage 5 — apply Asset Reuse Decision consequences on DEV (116 mirror).

Direct Airtable API writes for DEV matrix testing. Does not enable 070a/070b/Make.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

import requests
from dotenv import load_dotenv

HERE = Path(__file__).parent
DEV_BASE = "appTetnuCZlCZdTCT"
AUDIT_MARKER = "[C-023-S5]"
LAST_PREFIX = "[C-023-S5-LAST] "
FIELD_LAST_APPLIED = "Duplicate Resolution Last Applied Decision"


_schema_cache: dict[str, set[str]] = {}


def _schema_fields(table: str) -> set[str]:
    if table in _schema_cache:
        return _schema_cache[table]
    try:
        from c023_dev_stage5_schema_setup import fetch_schema, field_names, table_fields

        tables = fetch_schema()
        names = field_names(table_fields(tables, table))
        _schema_cache[table] = names
        return names
    except Exception:
        return set()


def get_last_applied(fields: dict) -> str:
    explicit = (fields.get(FIELD_LAST_APPLIED) or "").strip()
    if explicit:
        return explicit
    notes = fields.get("Asset Reuse Review Notes") or ""
    for line in str(notes).split("\n"):
        if line.startswith(LAST_PREFIX):
            return line[len(LAST_PREFIX) :].strip()
    return ""


def set_last_applied_patch(notes: str | None, value: str) -> dict:
    cleaned = []
    for line in str(notes or "").split("\n"):
        if not line.startswith(LAST_PREFIX):
            cleaned.append(line)
    cleaned = [ln for ln in cleaned if ln.strip()]
    cleaned.append(f"{LAST_PREFIX}{value}")
    out: dict = {"Asset Reuse Review Notes": "\n".join(cleaned)}
    if FIELD_LAST_APPLIED in _schema_fields("Submission Assets"):
        out[FIELD_LAST_APPLIED] = value
    return out

DECISIONS_NOT_REVIEWED = {"Not Reviewed"}
DECISIONS_APPROVED = {
    "Approved Reuse",
    "Allowed — Legitimate Reuse",
    "Allowed — Correction/Resubmission",
}
DECISIONS_CONFIRMED = {"Confirmed Duplicate"}
DECISIONS_FALSE_POSITIVE = {
    "False Positive",
    "Unable to Determine",
    "Resolved — Duplicate Record Error",
}

SOURCE_VIDEO = "VIDEO_SUBMISSION|"
SOURCE_HOMEWORK = "HOMEWORK_XP|"


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


def headers() -> dict:
    return {"Authorization": f"Bearer {tok()}", "Content-Type": "application/json"}


def get_rec(table: str, rid: str, fields: list[str] | None = None) -> dict:
    params = {}
    if fields:
        for i, f in enumerate(fields):
            params[f"fields[{i}]"] = f
    r = requests.get(api(table, rid), headers=headers(), params=params, timeout=120)
    r.raise_for_status()
    return r.json()


def patch_rec(table: str, rid: str, fields: dict) -> dict:
    r = requests.patch(
        api(table, rid),
        headers=headers(),
        json={"fields": fields, "typecast": True},
        timeout=120,
    )
    if not r.ok:
        raise SystemExit(f"patch {table}/{rid} failed: {r.status_code} {r.text[:500]}")
    return r.json()


def list_xp_by_source_key(source_key: str) -> dict | None:
    formula = f'{{Source Key}}="{source_key}"'
    r = requests.get(
        api("XP Events"),
        headers=headers(),
        params={"filterByFormula": formula, "pageSize": 5},
        timeout=120,
    )
    r.raise_for_status()
    recs = r.json().get("records") or []
    return recs[0] if recs else None


def categorize(decision: str) -> str:
    d = (decision or "").strip()
    if not d:
        return "empty"
    if d in DECISIONS_NOT_REVIEWED:
        return "not_reviewed"
    if d in DECISIONS_CONFIRMED:
        return "confirmed"
    if d in DECISIONS_APPROVED:
        return "approved"
    if d in DECISIONS_FALSE_POSITIVE:
        return "false_positive"
    return "unknown"


def select_name(value) -> str:
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, dict) and value.get("name"):
        return str(value["name"]).strip()
    return ""


def first_link(value) -> str | None:
    if isinstance(value, list) and value:
        v = value[0]
        return v if isinstance(v, str) else v.get("id")
    return None


def append_note(existing: str | None, line: str) -> str:
    base = (existing or "").strip()
    return f"{base}\n{line}" if base else line


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def resolve_target(asset_fields: dict) -> dict | None:
    dest = select_name(asset_fields.get("Upload Destination"))
    vf = first_link(asset_fields.get("Video Feedback"))
    hw = first_link(asset_fields.get("Homework Completions"))
    if dest == "Video Feedback" or vf:
        return {"route": "video", "id": vf, "source_key": f"{SOURCE_VIDEO}{vf}"} if vf else None
    if dest == "Homework Completions" or hw:
        return {"route": "homework", "id": hw, "source_key": f"{SOURCE_HOMEWORK}{hw}"} if hw else None
    return None


def apply_confirmed(asset_id: str, asset: dict, target: dict, enrollment_id: str | None) -> dict:
    fields = asset.get("fields") or {}
    if fields.get("Duplicate Resolution Applied?") and get_last_applied(fields) == "Confirmed Duplicate":
        return {"actionOut": "skipped_idempotent_same_decision", "idempotent": True}

    ts = now_iso()
    audit = f"{AUDIT_MARKER} Confirmed Duplicate applied {ts}"

    if target["route"] == "video":
        patch_rec("Video Feedback", target["id"], {"Do Not Award XP?": True})
    else:
        patch_rec("Homework Completions", target["id"], {"Award Status": "Do Not Award"})

    xp = list_xp_by_source_key(target["source_key"])
    xp_id = None
    if xp:
        xp_id = xp["id"]
        xf = xp.get("fields") or {}
        patch_rec(
            "XP Events",
            xp_id,
            {
                "Active?": False,
                "Duplicate Status": "Duplicate - Remove",
                "XP Reason Debug": append_note(
                    xf.get("XP Reason Debug"),
                    f"{AUDIT_MARKER} Confirmed duplicate — XP deactivated {ts}",
                ),
            },
        )

    notes_with_audit = append_note(fields.get("Asset Reuse Review Notes"), audit)
    patch_fields = {
        "Duplicate Resolution Applied?": True,
        "Duplicate Resolution Applied At": ts,
        "Duplicate Resolution Error": None,
    }
    patch_fields.update(set_last_applied_patch(notes_with_audit, "Confirmed Duplicate"))
    patch_rec("Submission Assets", asset_id, patch_fields)

    if enrollment_id:
        patch_rec("Enrollments", enrollment_id, {"Level Recalc Needed?": True})

    return {"actionOut": "applied_confirmed_duplicate", "xpEventId": xp_id, "idempotent": False}


def restore_eligibility(
    asset_id: str,
    asset: dict,
    target: dict,
    enrollment_id: str | None,
    *,
    decision_label: str,
) -> dict:
    fields = asset.get("fields") or {}
    if get_last_applied(fields) != "Confirmed Duplicate":
        return {"actionOut": "skipped_nothing_to_restore", "restored": False}

    ts = now_iso()
    audit = f"{AUDIT_MARKER} Restored after {decision_label} {ts}"

    activity = get_rec(
        "Video Feedback" if target["route"] == "video" else "Homework Completions",
        target["id"],
    ).get("fields") or {}

    if target["route"] == "video":
        patch_rec("Video Feedback", target["id"], {"Do Not Award XP?": False})
    elif select_name(activity.get("Award Status")) == "Do Not Award":
        xp = list_xp_by_source_key(target["source_key"])
        restore_status = "Awarded" if xp and AUDIT_MARKER in (xp.get("fields") or {}).get("XP Reason Debug", "") else "Pending"
        patch_rec("Homework Completions", target["id"], {"Award Status": restore_status})

    xp = list_xp_by_source_key(target["source_key"])
    xp_id = None
    if xp:
        xf = xp.get("fields") or {}
        if AUDIT_MARKER in (xf.get("XP Reason Debug") or ""):
            xp_id = xp["id"]
            patch_rec(
                "XP Events",
                xp_id,
                {
                    "Active?": True,
                    "Duplicate Status": "Unique",
                    "XP Reason Debug": append_note(
                        xf.get("XP Reason Debug"),
                        f"{AUDIT_MARKER} Restored — decision reversed {ts}",
                    ),
                },
            )

    notes_with_audit = append_note(fields.get("Asset Reuse Review Notes"), audit)
    patch_fields = {
        "Duplicate Resolution Applied?": False,
        "Duplicate Resolution Applied At": ts,
        "Duplicate Resolution Error": None,
    }
    patch_fields.update(set_last_applied_patch(notes_with_audit, decision_label))
    patch_rec("Submission Assets", asset_id, patch_fields)

    if enrollment_id:
        patch_rec("Enrollments", enrollment_id, {"Level Recalc Needed?": True})

    return {"actionOut": f"restored_{decision_label.lower().replace(' ', '_')}", "xpEventId": xp_id, "restored": True}


def apply_decision(asset_id: str, decision: str | None = None) -> dict:
    """Mirror automation 116 for one Submission Asset."""
    load_env()
    asset = get_rec("Submission Assets", asset_id)
    fields = asset.get("fields") or {}
    decision = decision or select_name(fields.get("Asset Reuse Decision"))
    category = categorize(decision)
    target = resolve_target(fields)
    enrollment_id = first_link(fields.get("Enrollment - Linked"))

    result = {
        "assetId": asset_id,
        "decision": decision,
        "category": category,
        "target": target,
    }

    if category in {"empty", "unknown", "not_reviewed"}:
        result["actionOut"] = "skipped_not_reviewed" if category == "not_reviewed" else "skipped_unknown"
        result["statusOut"] = "skipped"
        return result

    if not target:
        result["actionOut"] = "skipped_no_activity_target"
        result["statusOut"] = "skipped"
        return result

    if not enrollment_id:
        act = get_rec(
            "Video Feedback" if target["route"] == "video" else "Homework Completions",
            target["id"],
            ["Enrollment"],
        )
        enrollment_id = first_link((act.get("fields") or {}).get("Enrollment"))

    if category == "confirmed":
        out = apply_confirmed(asset_id, asset, target, enrollment_id)
    else:
        label = "Approved Reuse" if category == "approved" else "False Positive"
        out = restore_eligibility(asset_id, asset, target, enrollment_id, decision_label=label)

    result.update(out)
    result["statusOut"] = "skipped" if out.get("idempotent") or out.get("restored") is False else "success"
    if out.get("restored") is False and category != "confirmed":
        result["statusOut"] = "skipped"
    return result


def snap_asset(asset_id: str) -> dict:
    load_env()
    return get_rec("Submission Assets", asset_id).get("fields") or {}


def snap_activity(route: str, rid: str) -> dict:
    load_env()
    table = "Video Feedback" if route == "video" else "Homework Completions"
    return get_rec(table, rid).get("fields") or {}


def snap_xp(source_key: str) -> dict | None:
    load_env()
    rec = list_xp_by_source_key(source_key)
    return rec.get("fields") if rec else None


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("asset_id")
    parser.add_argument("--decision", default=None)
    args = parser.parse_args()
    print(json.dumps(apply_decision(args.asset_id, args.decision), indent=2, default=str))
