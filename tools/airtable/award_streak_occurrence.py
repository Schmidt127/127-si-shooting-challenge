#!/usr/bin/env python3
"""
Award a Streak Occurrence stuck at Source Status = Ready for XP (automation 054 parity).

  python award_streak_occurrence.py recQhYGpNIXlo9cIy           # dry-run
  python award_streak_occurrence.py recQhYGpNIXlo9cIy --write   # create XP + mark Awarded
"""

from __future__ import annotations

import argparse
import os
import sys

import requests

from airtable_read import BASE_ID, f, first_id, is_active, linked_ids, list_table, session, txt

DEFAULT_STREAK_ID = "recQhYGpNIXlo9cIy"  # Lincoln Newcomer — Ready for XP from 090C


def get_record(sess: requests.Session, table: str, record_id: str) -> dict:
    url = f"https://api.airtable.com/v0/{BASE_ID}/{requests.utils.quote(table)}/{record_id}"
    resp = sess.get(url, timeout=60)
    resp.raise_for_status()
    return resp.json()


def find_xp_rule(sess: requests.Session, rule_keys: list[str]) -> tuple[str, float]:
    rules = list_table(sess, "XP Reward Rules", ["Rule Key", "XP Amount", "Active?"])
    for key in rule_keys:
        for rule in rules:
            rf = f(rule)
            if txt(rf.get("Rule Key")) == key and is_active(rf.get("Active?")):
                pts = float(rf.get("XP Amount") or 0)
                if pts > 0:
                    return key, pts
    raise SystemExit(f"No active XP rule for keys: {rule_keys}")


def resolve_was(sess: requests.Session, enrollment_id: str, week_id: str) -> str:
    if not enrollment_id or not week_id:
        return ""
    for row in list_table(sess, "Weekly Athlete Summary", ["Enrollment", "Week"]):
        rf = f(row)
        if first_id(rf.get("Enrollment")) == enrollment_id and first_id(rf.get("Week")) == week_id:
            return row["id"]
    return ""


def to_date_key(value) -> str:
    if not value:
        return ""
    return str(value)[:10]


def plan_award(sess: requests.Session, streak_id: str) -> dict:
    streak = get_record(sess, "Streak Occurrences", streak_id)
    sf = f(streak)
    status = txt(sf.get("Source Status"))
    if status != "Ready for XP":
        raise SystemExit(f"Streak {streak_id} Source Status is '{status}', not 'Ready for XP'")

    enrollment_id = first_id(sf.get("Enrollment"))
    achievement_id = first_id(sf.get("Achievement"))
    week_id = first_id(sf.get("Week"))
    streak_days = int(float(sf.get("Streak Days") or 0))
    end_key = to_date_key(sf.get("Streak End Date"))
    if not enrollment_id or not achievement_id or not end_key or streak_days <= 0:
        raise SystemExit("Missing enrollment, achievement, streak end date, or streak days")

    achievement = get_record(sess, "Achievements", achievement_id)
    af = f(achievement)
    ach_name = txt(af.get("Achievement Name")) or txt(af.get("Name"))
    threshold = int(float(af.get("Trigger Threshold") or 0))
    configured_key = txt(af.get("Reward Rule Key"))
    fallback_key = f"STREAK_{threshold or streak_days}DAY"
    rule_key, xp_amount = find_xp_rule(sess, [k for k in [configured_key, fallback_key] if k])

    source_key = f"STREAK_XP|{enrollment_id}|{achievement_id}|{end_key}"
    existing_xp = None
    for xp in list_table(sess, "XP Events", ["Source Key", "Streak Occurrence", "XP Points"]):
        xf = f(xp)
        if txt(xf.get("Source Key")) == source_key:
            existing_xp = xp["id"]
            break
        if streak_id in linked_ids(xf.get("Streak Occurrence")):
            existing_xp = xp["id"]
            break
    for xid in linked_ids(sf.get("XP Events")):
        existing_xp = xid
        break

    was_id = resolve_was(sess, enrollment_id, week_id)
    reason = f"{ach_name}: {streak_days}-day shooting streak reached on {end_key}."

    return {
        "streak_id": streak_id,
        "enrollment_id": enrollment_id,
        "achievement_id": achievement_id,
        "week_id": week_id,
        "was_id": was_id,
        "source_key": source_key,
        "xp_amount": xp_amount,
        "rule_key": rule_key,
        "achievement_name": ach_name,
        "streak_days": streak_days,
        "streak_end_date": end_key,
        "xp_reason": reason,
        "existing_xp_id": existing_xp,
        "action": "update_xp" if existing_xp else "create_xp",
    }


def apply_award(sess: requests.Session, plan: dict) -> str:
    xp_fields: dict = {
        "Enrollment": [plan["enrollment_id"]],
        "Streak Occurrence": [plan["streak_id"]],
        "XP Source": plan["achievement_name"],
        "XP Bucket": "Streak",
        "XP Points": plan["xp_amount"],
        "XP Reason Public": plan["xp_reason"],
        "Active?": True,
        "Source Key": plan["source_key"],
        "XP Activity Date Source": "Streak End Date",
        "Award Mode": "Automatic",
        "Processed": True,
        "XP Award Status": "Awarded",
    }
    if plan["week_id"]:
        xp_fields["Week"] = [plan["week_id"]]
    if plan["was_id"]:
        xp_fields["Weekly Athlete Summary"] = [plan["was_id"]]
    if plan["streak_end_date"]:
        xp_fields["XP Activity Date"] = plan["streak_end_date"]

    xp_url = f"https://api.airtable.com/v0/{BASE_ID}/XP%20Events"
    if plan["existing_xp_id"]:
        xp_id = plan["existing_xp_id"]
        resp = sess.patch(
            xp_url,
            json={"records": [{"id": xp_id, "fields": xp_fields}], "typecast": True},
            timeout=120,
        )
    else:
        resp = sess.post(xp_url, json={"records": [{"fields": xp_fields}], "typecast": True}, timeout=120)
    if not resp.ok:
        raise RuntimeError(f"XP write failed {resp.status_code}: {resp.text[:800]}")
    xp_id = plan["existing_xp_id"] or resp.json()["records"][0]["id"]

    streak_url = f"https://api.airtable.com/v0/{BASE_ID}/Streak%20Occurrences"
    streak_fields = {
        "XP Events": [xp_id],
        "Source Status": "Awarded",
    }
    resp = sess.patch(
        streak_url,
        json={"records": [{"id": plan["streak_id"], "fields": streak_fields}], "typecast": True},
        timeout=120,
    )
    if not resp.ok:
        raise RuntimeError(f"Streak patch failed {resp.status_code}: {resp.text[:800]}")
    return xp_id


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("streak_id", nargs="?", default=DEFAULT_STREAK_ID)
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    confirm = args.write or os.getenv("CONFIRM_WRITE", "").lower() in {"1", "true", "yes"}

    sess = session()
    sess.headers["Content-Type"] = "application/json"
    plan = plan_award(sess, args.streak_id)

    print("Streak award plan (054 parity):")
    for k, v in plan.items():
        print(f"  {k}: {v}")

    if not confirm:
        print("\nDry run. Re-run with --write to apply.")
        return

    xp_id = apply_award(sess, plan)
    print(f"\nDone. XP Event: {xp_id} | Streak {args.streak_id} -> Awarded")


if __name__ == "__main__":
    main()
