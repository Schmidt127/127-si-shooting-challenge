#!/usr/bin/env python3
"""
Repair stuck Newcomer submissions and other Final-090 gaps (read-only by default).

Fixes:
  1. Missing SUBMISSION_XP events (090A) — Awarded/counted submissions with no XP Event
  2. Empty Week on shot-milestone unlocks (090F) — derive Week from Milestone Activity Date

Usage:
  python fix_post_audit_repairs.py              # dry-run plan
  python fix_post_audit_repairs.py --write      # apply fixes (CONFIRM_WRITE=true also works)
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from datetime import datetime
from pathlib import Path

import requests
from dotenv import load_dotenv

BASE_ID = "appn84sqPw03zEbTT"

NEWCOMER_ENROLLMENT_IDS = {
    "rec8Z5KzsNif6mtpG",  # Lincoln
    "recmhY61iU2AwEiMI",  # Jackson
}

CONFIG = {
    "rule_key": "SHOOTING_BASE",
    "xp_points_fallback": 20,
    "source_key_prefix": "SUBMISSION_XP|",
    "xp_source": "Submission Base",
    "xp_bucket": "Shooting Base",
    "public_reason": "Shooting submission completed.",
    "xp_date_source": "Submission Activity Date",
}


def load_token() -> str:
    tools_env = Path(__file__).with_name(".env")
    web_env = Path(__file__).resolve().parents[2] / "web" / ".env.local"
    if tools_env.exists():
        load_dotenv(tools_env, override=True)
    if web_env.exists():
        load_dotenv(web_env, override=True)
    token = os.getenv("AIRTABLE_TOKEN") or os.getenv("AIRTABLE_API_TOKEN") or ""
    if not token:
        raise SystemExit("Missing PAT in tools/airtable/.env or web/.env.local")
    return token


def list_table(session: requests.Session, table: str, fields: list[str]) -> list[dict]:
    url = f"https://api.airtable.com/v0/{BASE_ID}/{requests.utils.quote(table)}"
    remaining = list(fields)
    while remaining:
        records: list[dict] = []
        offset: str | None = None
        while True:
            params: dict = {"pageSize": 100}
            for i, name in enumerate(remaining):
                params[f"fields[{i}]"] = name
            if offset:
                params["offset"] = offset
            resp = session.get(url, params=params, timeout=120)
            if resp.status_code == 422 and "UNKNOWN_FIELD_NAME" in resp.text:
                match = re.search(r'Unknown field name: \\?"([^"\\]+)\\?"', resp.text)
                if match and match.group(1) in remaining:
                    remaining.remove(match.group(1))
                    break
                raise RuntimeError(f"GET {table} -> {resp.text[:400]}")
            if not resp.ok:
                raise RuntimeError(f"GET {table} -> {resp.status_code}: {resp.text[:400]}")
            data = resp.json()
            records.extend(data.get("records", []))
            offset = data.get("offset")
            if not offset:
                return records
        if not remaining:
            break
    # fallback: all fields
    records = []
    offset = None
    while True:
        params: dict = {"pageSize": 100}
        if offset:
            params["offset"] = offset
        resp = session.get(url, params=params, timeout=120)
        resp.raise_for_status()
        data = resp.json()
        records.extend(data.get("records", []))
        offset = data.get("offset")
        if not offset:
            return records


def fields_of(rec: dict) -> dict:
    return rec.get("fields", {})


def linked_ids(value) -> list[str]:
    if not isinstance(value, list):
        return []
    out: list[str] = []
    for item in value:
        if isinstance(item, str):
            out.append(item)
        elif isinstance(item, dict) and item.get("id"):
            out.append(str(item["id"]))
    return out


def first_id(value) -> str:
    return linked_ids(value)[0] if linked_ids(value) else ""


def txt(value) -> str:
    if value is None:
        return ""
    if isinstance(value, dict) and value.get("name"):
        return str(value["name"]).strip()
    return str(value).strip()


def num(value) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(str(value or "0").replace(",", ""))
    except ValueError:
        return 0.0


def is_active(value) -> bool:
    return value is True or value == 1 or str(value).lower() == "true"


def to_date_key(value) -> str:
    if not value:
        return ""
    raw = str(value).strip()
    if re.match(r"^\d{4}-\d{2}-\d{2}", raw):
        return raw[:10]
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00")).date().isoformat()
    except ValueError:
        return ""


def get_shooting_base_xp(session: requests.Session) -> float:
    rules = list_table(session, "XP Reward Rules", ["Rule Key", "XP Amount", "Active?"])
    matches = [
        r
        for r in rules
        if txt(fields_of(r).get("Rule Key")) == CONFIG["rule_key"]
        and is_active(fields_of(r).get("Active?"))
    ]
    if len(matches) != 1:
        print(f"WARN: expected 1 active {CONFIG['rule_key']} rule, found {len(matches)}; using fallback")
        return float(CONFIG["xp_points_fallback"])
    pts = num(fields_of(matches[0]).get("XP Amount"))
    if pts <= 0:
        return float(CONFIG["xp_points_fallback"])
    return pts


def build_summary_index(was_records: list[dict]) -> dict[str, str]:
    index: dict[str, str] = {}
    for rec in was_records:
        f = fields_of(rec)
        eid = first_id(f.get("Enrollment"))
        wid = first_id(f.get("Week"))
        if eid and wid:
            key = f"{eid}|{wid}"
            if key not in index:
                index[key] = rec["id"]
    return index


def find_existing_submission_xp(
    submission_id: str,
    xp_records: list[dict],
    linked_xp_ids: list[str],
) -> str | None:
    expected = f"{CONFIG['source_key_prefix']}{submission_id}"
    for xp in xp_records:
        f = fields_of(xp)
        sk = txt(f.get("Source Key"))
        if sk == expected:
            return xp["id"]
        if submission_id in linked_ids(f.get("Submission")):
            src = select_name(f.get("XP Source"))
            bucket = select_name(f.get("XP Bucket"))
            if sk.startswith(CONFIG["source_key_prefix"]) or src == CONFIG["xp_source"] or bucket == CONFIG["xp_bucket"]:
                return xp["id"]
    for xid in linked_xp_ids:
        xp = next((x for x in xp_records if x["id"] == xid), None)
        if xp and submission_id in linked_ids(fields_of(xp).get("Submission")):
            return xp["id"]
    return None


def select_name(value) -> str:
    if isinstance(value, dict) and value.get("name"):
        return str(value["name"]).strip()
    return txt(value)


def validate_submission(sub: dict) -> tuple[bool, str, dict]:
    f = fields_of(sub)
    if num(f.get("Count This Submission?")) != 1:
        return False, "not_counted", {}
    shots = num(f.get("Total Shots Counted"))
    if shots <= 0:
        return False, "zero_shots", {}
    eid = first_id(f.get("Enrollment"))
    wid = first_id(f.get("Week"))
    if not eid:
        return False, "missing_enrollment", {}
    if not wid:
        return False, "missing_week", {}
    if not txt(f.get("Submission Key")):
        return False, "missing_submission_key", {}
    if not f.get("Activity Date"):
        return False, "missing_activity_date", {}
    return True, "ok", {
        "enrollment_id": eid,
        "week_id": wid,
        "submission_key": txt(f.get("Submission Key")),
        "activity_date": f.get("Activity Date"),
        "linked_xp_ids": linked_ids(f.get("XP Events")),
        "award_status": select_name(f.get("XP Award Status")),
    }


def scan_missing_submission_xp(
    session: requests.Session,
    *,
    newcomer_only: bool = False,
) -> list[dict]:
    enrollments = list_table(session, "Enrollments", ["Active?"])
    active_ids = {r["id"] for r in enrollments if is_active(fields_of(r).get("Active?"))}

    submissions = list_table(
        session,
        "Submissions",
        [
            "Enrollment",
            "Week",
            "Weekly Athlete Summary",
            "Submission Key",
            "Activity Date",
            "Total Shots Counted",
            "Count This Submission?",
            "XP Award Status",
            "XP Events",
        ],
    )
    xp_records = list_table(
        session,
        "XP Events",
        ["Source Key", "Submission", "Enrollment", "Week", "XP Source", "XP Bucket", "XP Points"],
    )
    was_records = list_table(session, "Weekly Athlete Summary", ["Enrollment", "Week"])
    summary_index = build_summary_index(was_records)

    plans: list[dict] = []
    for sub in submissions:
        f = fields_of(sub)
        eid = first_id(f.get("Enrollment"))
        if not eid or eid not in active_ids:
            continue
        if newcomer_only and eid not in NEWCOMER_ENROLLMENT_IDS:
            continue

        ok, reason, meta = validate_submission(sub)
        if not ok:
            continue

        sid = sub["id"]
        existing = find_existing_submission_xp(sid, xp_records, meta["linked_xp_ids"])
        if existing:
            continue

        wid = meta["week_id"]
        was_id = first_id(f.get("Weekly Athlete Summary")) or summary_index.get(f"{eid}|{wid}", "")

        plans.append(
            {
                "action": "create_submission_xp",
                "submission_id": sid,
                "enrollment_id": eid,
                "week_id": wid,
                "weekly_summary_id": was_id,
                "source_key": f"{CONFIG['source_key_prefix']}{sid}",
                "xp_points": None,  # filled later
                "activity_date": meta["activity_date"],
                "submission_key": meta["submission_key"],
                "award_status": meta["award_status"],
                "newcomer": eid in NEWCOMER_ENROLLMENT_IDS,
            }
        )
    return plans


def find_week_for_date(weeks: list[dict], date_key: str) -> str | None:
    if not date_key:
        return None
    try:
        target = datetime.strptime(date_key, "%Y-%m-%d").date()
    except ValueError:
        return None
    for week in weeks:
        f = fields_of(week)
        start = to_date_key(f.get("Start Date"))
        end = to_date_key(f.get("End Date"))
        if not start or not end:
            continue
        try:
            s = datetime.strptime(start, "%Y-%m-%d").date()
            e = datetime.strptime(end, "%Y-%m-%d").date()
        except ValueError:
            continue
        if s <= target <= e:
            return week["id"]
    return None


def scan_empty_unlock_weeks(session: requests.Session) -> list[dict]:
    enrollments = list_table(session, "Enrollments", ["Active?"])
    active_ids = {r["id"] for r in enrollments if is_active(fields_of(r).get("Active?"))}

    unlocks = list_table(
        session,
        "Athlete Achievement Unlocks",
        ["Enrollment", "Week", "Shot Milestone", "Milestone Activity Date", "XP Award Status"],
    )
    weeks = list_table(session, "Weeks", ["Start Date", "End Date"])

    plans: list[dict] = []
    for unlock in unlocks:
        f = fields_of(unlock)
        eid = first_id(f.get("Enrollment"))
        if not eid or eid not in active_ids:
            continue
        if first_id(f.get("Week")):
            continue
        if not first_id(f.get("Shot Milestone")):
            continue
        date_key = to_date_key(f.get("Milestone Activity Date"))
        if not date_key:
            continue
        week_id = find_week_for_date(weeks, date_key)
        if not week_id:
            continue
        plans.append(
            {
                "action": "set_unlock_week",
                "unlock_id": unlock["id"],
                "enrollment_id": eid,
                "week_id": week_id,
                "milestone_activity_date": date_key,
            }
        )
    return plans


def create_xp_records(session: requests.Session, plans: list[dict], xp_points: float) -> list[dict]:
    url = f"https://api.airtable.com/v0/{BASE_ID}/XP%20Events"
    applied: list[dict] = []
    for i in range(0, len(plans), 10):
        chunk = plans[i : i + 10]
        records = []
        for plan in chunk:
            fields: dict = {
                "Enrollment": [plan["enrollment_id"]],
                "Submission": [plan["submission_id"]],
                "Week": [plan["week_id"]],
                "XP Source": CONFIG["xp_source"],
                "XP Bucket": CONFIG["xp_bucket"],
                "XP Points": xp_points,
                "XP Reason Public": CONFIG["public_reason"],
                "XP Reason Debug": (
                    f"Repair: fix_post_audit_repairs.py — submission {plan['submission_id']} "
                    f"key {plan['submission_key']}"
                ),
                "Active?": True,
                "Source Key": plan["source_key"],
            }
            if plan.get("weekly_summary_id"):
                fields["Weekly Athlete Summary"] = [plan["weekly_summary_id"]]
            records.append({"fields": fields})
        resp = session.post(url, json={"records": records, "typecast": True}, timeout=120)
        if not resp.ok:
            raise RuntimeError(f"XP create failed {resp.status_code}: {resp.text[:800]}")
        for plan, rec in zip(chunk, resp.json().get("records", [])):
            applied.append({**plan, "xp_event_id": rec["id"]})
    return applied


def patch_submissions(session: requests.Session, applied: list[dict]) -> None:
    url = f"https://api.airtable.com/v0/{BASE_ID}/Submissions"
    for i in range(0, len(applied), 10):
        chunk = applied[i : i + 10]
        records = []
        for row in chunk:
            records.append(
                {
                    "id": row["submission_id"],
                    "fields": {
                        "XP Events": [row["xp_event_id"]],
                        "XP Award Status": "Awarded",
                    },
                }
            )
        resp = session.patch(url, json={"records": records, "typecast": True}, timeout=120)
        if not resp.ok:
            raise RuntimeError(f"Submission patch failed {resp.status_code}: {resp.text[:800]}")


def patch_enrollments_milestone_check(session: requests.Session, enrollment_ids: set[str]) -> None:
    url = f"https://api.airtable.com/v0/{BASE_ID}/Enrollments"
    ids = sorted(enrollment_ids)
    for i in range(0, len(ids), 10):
        chunk = ids[i : i + 10]
        records = [{"id": eid, "fields": {"Run Shot Milestone Check?": True}} for eid in chunk]
        resp = session.patch(url, json={"records": records, "typecast": True}, timeout=120)
        if not resp.ok:
            raise RuntimeError(f"Enrollment patch failed {resp.status_code}: {resp.text[:800]}")


def patch_unlock_weeks(session: requests.Session, plans: list[dict]) -> None:
    url = f"https://api.airtable.com/v0/{BASE_ID}/Athlete%20Achievement%20Unlocks"
    for i in range(0, len(plans), 10):
        chunk = plans[i : i + 10]
        records = [
            {"id": p["unlock_id"], "fields": {"Week": [p["week_id"]]}} for p in chunk
        ]
        resp = session.patch(url, json={"records": records, "typecast": True}, timeout=120)
        if not resp.ok:
            raise RuntimeError(f"Unlock patch failed {resp.status_code}: {resp.text[:800]}")


def print_plan(xp_plans: list[dict], unlock_plans: list[dict], xp_points: float) -> None:
    print("\n=== Missing submission XP (090A) ===")
    if not xp_plans:
        print("  None found.")
    else:
        print(f"  {len(xp_plans)} submission(s) @ {xp_points} XP each")
        for p in xp_plans:
            tag = " [Newcomer]" if p.get("newcomer") else ""
            print(
                f"    {p['submission_id']}  enrollment={p['enrollment_id']}  "
                f"status={p['award_status'] or '(blank)'}{tag}"
            )

    print("\n=== Empty unlock Week (090F) ===")
    if not unlock_plans:
        print("  None found.")
    else:
        print(f"  {len(unlock_plans)} unlock(s)")
        for p in unlock_plans:
            print(
                f"    {p['unlock_id']}  enrollment={p['enrollment_id']}  "
                f"-> week {p['week_id']} (from {p['milestone_activity_date']})"
            )


def main() -> None:
    parser = argparse.ArgumentParser(description="Repair post-audit stuck records")
    parser.add_argument("--write", action="store_true", help="Apply writes to Airtable")
    parser.add_argument(
        "--newcomer-only",
        action="store_true",
        help="Only scan Newcomer enrollments for missing submission XP",
    )
    parser.add_argument(
        "--skip-unlock-week",
        action="store_true",
        help="Skip 090F empty-week unlock repairs",
    )
    args = parser.parse_args()
    confirm = args.write or os.getenv("CONFIRM_WRITE", "").lower() in {"1", "true", "yes"}

    session = requests.Session()
    session.headers["Authorization"] = f"Bearer {load_token()}"
    session.headers["Content-Type"] = "application/json"

    xp_points = get_shooting_base_xp(session)
    xp_plans = scan_missing_submission_xp(session, newcomer_only=args.newcomer_only)
    for p in xp_plans:
        p["xp_points"] = xp_points

    unlock_plans: list[dict] = []
    if not args.skip_unlock_week:
        unlock_plans = scan_empty_unlock_weeks(session)

    print("=" * 60)
    print("POST-AUDIT REPAIR PLAN (dry-run unless --write)")
    print(f"XP rule {CONFIG['rule_key']}: {xp_points} points per submission")
    print("=" * 60)
    print_plan(xp_plans, unlock_plans, xp_points)

    if not xp_plans and not unlock_plans:
        print("\nNothing to repair.")
        return

    if not confirm:
        print("\nDry run only. Re-run with --write to apply.")
        return

    if xp_plans:
        print(f"\nCreating {len(xp_plans)} XP Events...")
        applied = create_xp_records(session, xp_plans, xp_points)
        print("Linking XP to submissions...")
        patch_submissions(session, applied)
        enrollment_ids = {p["enrollment_id"] for p in applied}
        print(f"Setting Run Shot Milestone Check? on {len(enrollment_ids)} enrollment(s)...")
        patch_enrollments_milestone_check(session, enrollment_ids)
        for row in applied:
            print(f"  OK {row['submission_id']} -> {row['xp_event_id']}")

    if unlock_plans:
        print(f"\nSetting Week on {len(unlock_plans)} unlock(s)...")
        patch_unlock_weeks(session, unlock_plans)
        for p in unlock_plans:
            print(f"  OK {p['unlock_id']} -> week {p['week_id']}")

    print("\nDone. Re-run: python tools/airtable/run_final_090_audits.py")


if __name__ == "__main__":
    main()
