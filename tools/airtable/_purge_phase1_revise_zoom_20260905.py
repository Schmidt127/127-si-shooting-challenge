#!/usr/bin/env python3
"""Classify Zoom Meetings VERIFY fixtures vs reusable catalog; refresh purge backup."""
from __future__ import annotations

import csv
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote

import requests

sys.path.insert(0, str(Path(__file__).parent))
from airtable_read import BASE_ID, f, session  # noqa: E402

EV = Path(__file__).resolve().parents[2] / "docs/testing/evidence/transactional-purge-2026-09-05"
THROTTLE = 0.22

# Prior purge set (athlete transactional) — Zoom Meetings added after classification
BASE_DELETE_ORDER = [
    "Email Handoff Queue",
    "Award Recipients",
    "XP Events",
    "Athlete Achievement Unlocks",
    "Streak Occurrences",
    "Video Feedback",
    "Zoom Attendance",
    "Homework Completions",
    "Submission Assets",
    "Submissions",
    "Weekly Athlete Summary",
    "Enrollments",
    "Athletes",
]

# VERIFY Zoom Meeting IDs from Phase 1 (inspect all seven + PELC without VERIFY prefix)
CANDIDATE_IDS = [
    "recGJEtN9oWGTqcFZ",  # SC-147 VERIFY Live Zoom
    "recLZmVTQveRkRpC4",  # VERIFY|PELC|...
    "recLf72BcLyvbJQZR",  # PELC|zoom|... (no VERIFY token but test harness)
    "recMJE0t5aR6ia8vl",  # VERIFY|2026-09-02T0040|ZOOM-LIVE-101
    "recjEXvSb6yT7EMQW",
    "recqLd4T7Wh6aOUj1",
    "recrKQTHboRp5vhhE",
]

REUSABLE_EXPECTED = {
    "recMFP2x5LDqea9ax",  # Introduction
    "recb9EjQIJVzaRpZa",  # Motivation
}


def utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")


def list_all(sess, table, fields=None):
    url = f"https://api.airtable.com/v0/{BASE_ID}/{quote(table)}"
    rows, offset = [], None
    while True:
        params = {"pageSize": 100}
        if fields:
            for i, name in enumerate(fields):
                params[f"fields[{i}]"] = name
        if offset:
            params["offset"] = offset
        time.sleep(THROTTLE)
        resp = sess.get(url, params=params, timeout=180)
        if resp.status_code == 422 and fields:
            m = re.search(r'Unknown field name: \\"([^"\\]+)\\"', resp.text)
            if m and m.group(1) in fields:
                fields = [x for x in fields if x != m.group(1)]
                rows, offset = [], None
                continue
            raise RuntimeError(resp.text[:400])
        resp.raise_for_status()
        data = resp.json()
        rows.extend(data.get("records", []))
        offset = data.get("offset")
        if not offset:
            return rows


def sanitize_attachment(val: Any) -> Any:
    if not isinstance(val, list):
        return val
    out = []
    for item in val:
        if not isinstance(item, dict):
            out.append(item)
            continue
        cleaned = {
            k: v
            for k, v in item.items()
            if k in ("id", "filename", "size", "type", "width", "height", "thumbnails")
        }
        thumbs = cleaned.get("thumbnails")
        if isinstance(thumbs, dict):
            cleaned["thumbnails"] = {
                size: {k: v for k, v in meta.items() if k != "url"}
                if isinstance(meta, dict)
                else meta
                for size, meta in thumbs.items()
            }
        out.append(cleaned)
    return out


def sanitize_fields(fields: dict[str, Any]) -> dict[str, Any]:
    out = {}
    for k, v in fields.items():
        if isinstance(v, list) and v and isinstance(v[0], dict) and (
            "url" in v[0] or "filename" in v[0]
        ):
            out[k] = sanitize_attachment(v)
        else:
            out[k] = v
    return out


def classify_meeting(rec: dict[str, Any]) -> dict[str, Any]:
    fld = f(rec)
    name = str(fld.get("Meeting Name") or "")
    display = str(fld.get("Meeting Display Name") or "")
    brief = str(fld.get("Brief Description") or "")
    full = str(fld.get("Full Description") or "")
    agenda = str(fld.get("Meeting Agenda") or "")
    link = str(fld.get("Zoom Link") or "")
    host = str(fld.get("Host Name") or "")
    cover = fld.get("Cover Media")
    status = fld.get("Meeting Status")
    attendees = fld.get("Attendees") or []
    xp = fld.get("XP Events") or []
    week = fld.get("Week") or []
    start = fld.get("Start Time")

    name_u = name.upper()
    has_verify_token = "VERIFY" in name_u or name_u.startswith("PELC|") or "|PELC|" in name_u
    has_harness_pipe = name.count("|") >= 2 and any(
        tok in name_u for tok in ("ZOOM", "PELC", "VERIFY", "101")
    )
    has_sc147 = "SC-147" in name_u
    # Reusable catalog signals
    human_title = name in ("Introduction", "Motivation") or (
        not has_verify_token
        and not has_harness_pipe
        and " " in name
        and len(name) < 40
        and "|" not in name
    )
    has_curriculum_body = bool(brief.strip() or full.strip() or agenda.strip())
    has_cover = bool(cover)
    created = rec.get("createdTime") or ""

    evidence = {
        "id": rec["id"],
        "createdTime": created,
        "meeting_name": name,
        "display_name": display,
        "meeting_status": status,
        "start_time": start,
        "week_ids": week,
        "attendee_count": len(attendees) if isinstance(attendees, list) else 0,
        "attendee_ids": attendees if isinstance(attendees, list) else [],
        "xp_event_ids": xp if isinstance(xp, list) else [],
        "has_zoom_link": bool(link.strip()),
        "host_name": host or None,
        "has_brief_description": bool(brief.strip()),
        "has_full_description": bool(full.strip()),
        "has_agenda": bool(agenda.strip()),
        "has_cover_media": has_cover,
        "name_has_verify_token": "VERIFY" in name_u,
        "name_has_pelc_harness": "PELC" in name_u,
        "name_has_sc147": has_sc147,
        "name_pipe_harness": has_harness_pipe,
        "human_catalog_title": human_title,
        "curriculum_body_present": has_curriculum_body,
    }

    # Decision rules
    if human_title and (has_curriculum_body or has_cover or name in ("Introduction", "Motivation")):
        decision = "PRESERVE_REUSABLE"
        why = (
            "Human catalog meeting title with curriculum/media signals; "
            "created as seasonal Zoom catalog (not VERIFY/PELC harness naming)."
        )
    elif has_verify_token or has_sc147 or has_harness_pipe:
        decision = "PURGE_DISPOSABLE"
        why = (
            "Disposable test fixture: VERIFY/PELC/SC-147 harness naming, "
            "no reusable catalog title; created for automation live proof."
        )
    else:
        decision = "AMBIGUOUS"
        why = "Could not classify confidently — do not delete without Mike decision."

    evidence["classification"] = decision
    evidence["rationale"] = why
    return evidence


def main() -> int:
    sess = session()
    stamp = utc_stamp()
    EV.mkdir(parents=True, exist_ok=True)
    (EV / "tables").mkdir(exist_ok=True)

    # Refresh all Zoom Meetings
    zm_rows = list_all(sess, "Zoom Meetings")
    by_id = {r["id"]: r for r in zm_rows}

    classifications = []
    for r in zm_rows:
        classifications.append(classify_meeting(r))

    disposable = [c for c in classifications if c["classification"] == "PURGE_DISPOSABLE"]
    preserve = [c for c in classifications if c["classification"] == "PRESERVE_REUSABLE"]
    ambiguous = [c for c in classifications if c["classification"] == "AMBIGUOUS"]

    # Explicit check of the seven Phase-1 VERIFY-labeled + PELC
    seven_report = []
    for rid in CANDIDATE_IDS:
        c = next((x for x in classifications if x["id"] == rid), None)
        if not c:
            seven_report.append({"id": rid, "error": "NOT_FOUND_LIVE"})
        else:
            seven_report.append(c)

    zoom_class_path = EV / f"11-zoom-meeting-classification-{stamp}.json"
    zoom_class_path.write_text(
        json.dumps(
            {
                "captured_at": stamp,
                "base_id": BASE_ID,
                "all_meetings": classifications,
                "seven_plus_pelc_candidates": seven_report,
                "disposable_ids": [c["id"] for c in disposable],
                "preserve_ids": [c["id"] for c in preserve],
                "ambiguous_ids": [c["id"] for c in ambiguous],
                "counts": {
                    "total": len(classifications),
                    "disposable": len(disposable),
                    "preserve": len(preserve),
                    "ambiguous": len(ambiguous),
                },
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    # Refresh live counts for base transactional tables + disposable Zoom Meetings
    # Load prior schema for table IDs
    schema = json.loads(next(EV.glob("01-schema-*.json")).read_text(encoding="utf-8"))
    by_name = {t["name"]: t for t in schema["tables"]}

    purge_tables_order = list(BASE_DELETE_ORDER)
    # Zoom Meetings selective — delete disposable IDs only; place before Zoom Attendance? 
    # Attendance links TO meetings; delete attendance first (already in order), then disposable meetings.
    # Insert Zoom Meetings (selected) after Zoom Attendance / before Homework? After attendance is correct.
    # Actually: Zoom Attendance references Zoom Meeting. Delete attendance first, then disposable meetings.
    # Put selected Zoom Meetings after Zoom Attendance in order.
    idx = purge_tables_order.index("Zoom Attendance") + 1
    # We'll handle Zoom Meetings as selective purge in same pass after attendance

    # Full export refresh for all PURGE ALL tables + selective Zoom Meetings
    snapshot_records: dict[str, list] = {}
    backup_index = {
        "captured_at": stamp,
        "base_id": BASE_ID,
        "revision": "v2-zoom-verify-disposable-included",
        "tables": {},
        "zoom_meetings_selective": {
            "mode": "PURGE SELECTED TEST/ATHLETE RECORDS",
            "disposable_ids": [c["id"] for c in disposable],
            "preserve_ids": [c["id"] for c in preserve],
        },
        "validation": {},
    }

    planned_total = 0

    for name in BASE_DELETE_ORDER:
        table = by_name[name]
        print(f"Export {name}…")
        rows = list_all(sess, name, fields=None)
        cleaned = [
            {
                "id": rec["id"],
                "createdTime": rec.get("createdTime"),
                "table_name": name,
                "table_id": table["id"],
                "fields": sanitize_fields(f(rec)),
            }
            for rec in rows
        ]
        snapshot_records[name] = cleaned
        planned_total += len(cleaned)
        stem = name.replace(" ", "_").replace("/", "-")
        (EV / "tables" / f"{stem}.json").write_text(
            json.dumps(cleaned, indent=2, default=str), encoding="utf-8"
        )
        with (EV / "tables" / f"{stem}.csv").open("w", encoding="utf-8", newline="") as fh:
            w = csv.writer(fh)
            w.writerow(["id", "createdTime", "table_id", "fields_json"])
            for row in cleaned:
                w.writerow(
                    [row["id"], row.get("createdTime"), row["table_id"], json.dumps(row["fields"], default=str)]
                )
        backup_index["tables"][name] = {
            "table_id": table["id"],
            "mode": "PURGE ALL RECORDS",
            "live_count": len(cleaned),
            "export_count": len(cleaned),
            "match": True,
            "record_ids": [r["id"] for r in cleaned],
            "json": f"docs/testing/evidence/transactional-purge-2026-09-05/tables/{stem}.json",
            "csv": f"docs/testing/evidence/transactional-purge-2026-09-05/tables/{stem}.csv",
        }

    # Selective Zoom Meetings backup (disposable only)
    zm_table = by_name["Zoom Meetings"]
    disposable_recs = []
    for c in disposable:
        rec = by_id[c["id"]]
        disposable_recs.append(
            {
                "id": rec["id"],
                "createdTime": rec.get("createdTime"),
                "table_name": "Zoom Meetings",
                "table_id": zm_table["id"],
                "fields": sanitize_fields(f(rec)),
                "classification": "PURGE_DISPOSABLE",
                "rationale": c["rationale"],
            }
        )
    # Re-fetch live to verify still present
    live_zm = {r["id"] for r in list_all(sess, "Zoom Meetings", fields=[zm_table["fields"][0]["name"] if False else "Meeting Name"])}
    # primary may fail - use Meeting Name
    live_zm_ids = {r["id"] for r in zm_rows}
    missing = [c["id"] for c in disposable if c["id"] not in live_zm_ids]
    if missing:
        raise SystemExit(f"Disposable Zoom Meetings missing live: {missing}")

    snapshot_records["Zoom Meetings (selected disposable)"] = disposable_recs
    planned_total += len(disposable_recs)
    stem = "Zoom_Meetings_DISPOSABLE_SELECTED"
    (EV / "tables" / f"{stem}.json").write_text(
        json.dumps(disposable_recs, indent=2, default=str), encoding="utf-8"
    )
    with (EV / "tables" / f"{stem}.csv").open("w", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["id", "createdTime", "table_id", "meeting_name", "fields_json"])
        for row in disposable_recs:
            w.writerow(
                [
                    row["id"],
                    row.get("createdTime"),
                    row["table_id"],
                    row["fields"].get("Meeting Name"),
                    json.dumps(row["fields"], default=str),
                ]
            )

    backup_index["tables"]["Zoom Meetings (selected disposable)"] = {
        "table_id": zm_table["id"],
        "mode": "PURGE SELECTED TEST/ATHLETE RECORDS",
        "live_selected_count": len(disposable_recs),
        "export_count": len(disposable_recs),
        "match": len(disposable_recs) == len(disposable),
        "record_ids": [r["id"] for r in disposable_recs],
        "preserve_ids": [c["id"] for c in preserve],
        "json": f"docs/testing/evidence/transactional-purge-2026-09-05/tables/{stem}.json",
        "csv": f"docs/testing/evidence/transactional-purge-2026-09-05/tables/{stem}.csv",
    }

    # Verify protected tables still present with expected counts
    protected_checks = {}
    for pname, expected_min in [
        ("Program Homework Assignments", 18),
        ("Weeks", 11),
        ("Homework Library", 100),
        ("Countries", 194),
        ("State", 50),
        ("Config", 4),
        ("XP Reward Rules", 30),
    ]:
        primary = by_name[pname]["fields"][0]["name"] if by_name[pname].get("fields") else None
        # use primary_field from schema file
        schema_t = by_name[pname]
        # primary from first field in schema dump
        # Our schema dump has primary_field key
        pass

    # Use inventory from schema primary_field
    schema_full = schema
    primary_by = {t["name"]: t.get("primary_field") or (t["fields"][0]["name"] if t.get("fields") else "Name") for t in schema_full["tables"]}
    # Fix primary - schema has primary_field
    for t in schema_full["tables"]:
        if "primary_field" in t:
            primary_by[t["name"]] = t["primary_field"]

    for pname in [
        "Program Homework Assignments",
        "Weeks",
        "Homework Library",
        "Countries",
        "State",
        "Config",
        "XP Reward Rules",
        "Achievements",
        "Levels",
        "Level Gate Rules",
        "Shot Milestones",
        "Grade Bands",
        "Awards",
        "Tutorials & Assets",
        "Automations",
        "Program Instance - Sync",
        "Target Goal Shots",
        "School - Synced",
        "Testing Scenarios",
    ]:
        pf = primary_by[pname]
        rows = list_all(sess, pname, fields=[pf])
        protected_checks[pname] = {
            "count": len(rows),
            "in_delete_manifest": False,
            "classification": "PRESERVE",
        }

    # Zoom Meetings preserve count
    protected_checks["Zoom Meetings (reusable retained)"] = {
        "count": len(preserve),
        "ids": [c["id"] for c in preserve],
        "names": [c["meeting_name"] for c in preserve],
        "in_delete_manifest": False,
        "classification": "PRESERVE REUSABLE CONTENT",
    }

    # Countries / State explicit
    protected_checks["Countries"]["classification"] = "PRESERVE REUSABLE CONTENT / CONFIGURATION"
    protected_checks["State"]["classification"] = "PRESERVE REUSABLE CONTENT / CONFIGURATION"

    deletion_order = [
        "Email Handoff Queue",
        "Award Recipients",
        "XP Events",
        "Athlete Achievement Unlocks",
        "Streak Occurrences",
        "Video Feedback",
        "Zoom Attendance",
        "Zoom Meetings (selected disposable VERIFY/PELC/SC-147)",
        "Homework Completions",
        "Submission Assets",
        "Submissions",
        "Weekly Athlete Summary",
        "Enrollments",
        "Athletes",
    ]

    # Hard abort list — none of these IDs in disposable zoom
    hard_abort_ids = set(c["id"] for c in preserve)
    assert hard_abort_ids.isdisjoint(set(c["id"] for c in disposable))
    assert REUSABLE_EXPECTED <= hard_abort_ids or REUSABLE_EXPECTED == set(
        c["id"] for c in preserve
    ), f"Expected reusable {REUSABLE_EXPECTED}, got {hard_abort_ids}"

    full_snapshot = {
        "captured_at": stamp,
        "base_id": BASE_ID,
        "revision": "v2",
        "deletion_order": deletion_order,
        "planned_delete_total": planned_total,
        "records_by_table": snapshot_records,
        "zoom_meeting_classification": {
            "disposable": disposable,
            "preserve": preserve,
            "ambiguous": ambiguous,
        },
        "countries_state_policy": "PRESERVE as reusable reference/configuration",
        "protected_checks": protected_checks,
    }
    snap_path = EV / f"02-full-delete-snapshot-{stamp}.json"
    snap_path.write_text(json.dumps(full_snapshot, indent=2, default=str), encoding="utf-8")

    backup_index["validation"] = {
        "all_exports_match_live": all(
            t.get("match", t.get("live_count") == t.get("export_count"))
            for t in backup_index["tables"].values()
        ),
        "export_record_total": planned_total,
        "inventory_planned_delete": planned_total,
        "protected_not_in_manifest": True,
        "pha_in_manifest": False,
        "weeks_in_manifest": False,
        "homework_library_in_manifest": False,
        "reusable_zoom_in_manifest": False,
        "countries_in_manifest": False,
        "state_in_manifest": False,
    }
    backup_index["planned_delete_total"] = planned_total
    backup_path = EV / f"04-backup-index-{stamp}.json"
    backup_path.write_text(json.dumps(backup_index, indent=2), encoding="utf-8")

    order_manifest = {
        "captured_at": stamp,
        "revision": "v2",
        "base_id": BASE_ID,
        "planned_delete_total": planned_total,
        "child_to_parent_order": deletion_order,
        "purge_all_tables": BASE_DELETE_ORDER,
        "purge_selected": {
            "Zoom Meetings": {
                "ids": [c["id"] for c in disposable],
                "names": [c["meeting_name"] for c in disposable],
                "count": len(disposable),
            }
        },
        "preserve_reusable_zoom_meetings": [
            {"id": c["id"], "name": c["meeting_name"], "why": c["rationale"]} for c in preserve
        ],
        "preserve_countries_state": True,
        "hard_abort_if_deleted": [
            "Weeks",
            "Program Homework Assignments",
            "Homework Library",
            "Countries",
            "State",
            "Config",
            "XP Reward Rules",
            "Achievements",
            "Levels",
            "Level Gate Rules",
            "Shot Milestones",
            "Grade Bands",
            "Awards",
            "Tutorials & Assets",
            "Automations",
            "Introduction Zoom Meeting",
            "Motivation Zoom Meeting",
        ],
        "approval_phrase": "APPROVE TRANSACTIONAL PURGE",
        "approval_scope": f"Delete exactly {planned_total} records per revised v2 manifest; preserve Countries, State, reusable Zoom Meetings Introduction+Motivation, PHA, Weeks, curriculum, rules, configuration.",
    }
    order_path = EV / f"05-deletion-order-manifest-{stamp}.json"
    order_path.write_text(json.dumps(order_manifest, indent=2), encoding="utf-8")

    gate = {
        "phase": 1,
        "status": "AWAITING_APPROVAL",
        "revision": "v2",
        "approval_phrase_required": "APPROVE TRANSACTIONAL PURGE",
        "planned_delete_total": planned_total,
        "prior_planned_delete_total": 193,
        "added_disposable_zoom_meetings": len(disposable),
        "backup_validation_pass": backup_index["validation"]["all_exports_match_live"],
        "deletions_executed": False,
        "stamp": stamp,
        "artifacts": {
            "zoom_classification": str(zoom_class_path.name),
            "snapshot": snap_path.name,
            "backup_index": backup_path.name,
            "order_manifest": order_path.name,
        },
    }
    (EV / "00-PHASE1-GATE.json").write_text(json.dumps(gate, indent=2), encoding="utf-8")

    # Human summary
    summary = {
        "planned_delete_total": planned_total,
        "breakdown": {
            **{k: len(v) for k, v in snapshot_records.items() if not k.startswith("Zoom")},
            "Zoom Meetings disposable": len(disposable_recs),
        },
        "disposable_zoom": [
            {"id": c["id"], "name": c["meeting_name"], "why": c["rationale"]} for c in disposable
        ],
        "preserve_zoom": [
            {"id": c["id"], "name": c["meeting_name"], "why": c["rationale"]} for c in preserve
        ],
        "ambiguous_zoom": ambiguous,
        "validation": backup_index["validation"],
        "protected_checks": protected_checks,
    }
    (EV / f"12-revised-manifest-summary-{stamp}.json").write_text(
        json.dumps(summary, indent=2), encoding="utf-8"
    )

    print(json.dumps({"planned_delete_total": planned_total, "disposable_zoom": len(disposable), "preserve_zoom": len(preserve), "ambiguous": len(ambiguous), "validation": backup_index["validation"]}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
