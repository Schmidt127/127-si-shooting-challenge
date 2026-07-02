#!/usr/bin/env python3
"""
Final awards audit — 2025–2026 Shooting Challenge (read-only).

Reads live Airtable data and writes a markdown report. Does not create or update records.

  python audit_final_awards.py
  python audit_final_awards.py --out _preview/final-awards-audit-report.md
"""

from __future__ import annotations

import argparse
import re
from collections import defaultdict
from datetime import datetime
from pathlib import Path

from airtable_read import (
    BASE_ID,
    athlete_label,
    f,
    first_id,
    is_active,
    linked_ids,
    list_table,
    session,
    txt,
)

PREVIEW_DIR = Path(__file__).resolve().parent / "_preview"
BANDS = ["K-2", "3-4", "5-6", "7-8", "9-12"]
RANK_TO_OVERALL_AWARD_KEY = {
    1: "grade_band_champion",
    2: "grade_band_runner_up",
    3: "grade_band_third",
}

# Match live Award Name / Email Display Name (case-insensitive substring).
AWARD_PATTERNS: list[tuple[str, str, list[str]]] = [
    ("conquered_goal", "Conquered Goal Award", ["conquered goal"]),
    ("grade_band_champion", "Grade Band Champion Award", ["grade band champion"]),
    ("grade_band_runner_up", "Grade Band Runner-Up Award", ["grade band runner", "grade band second", "grade band 2nd"]),
    ("grade_band_third", "Grade Band Third Place Award", ["grade band third", "grade band 3rd"]),
    ("daily_shot", "Daily Shot Submission Award", ["daily shot submission"]),
    ("keep_shooting", "Keep Shooting Incentive Award", ["keep shooting"]),
    ("random_drawing", "Random Drawing Incentive Award", ["random drawing"]),
    ("thanks_for_playing", "Thanks for Playing Award — Every Bit Counts", ["thanks for playing", "every bit counts"]),
]

KEEP_SHOOTING_RULES = {
    "max_level_sort": 5,
    "max_xp_percentile": 0.75,
    "max_shots_percentile": 0.55,
    "min_shot_days": 8,
    "min_submissions": 8,
}

THANKS_MIN_SHOTS = 20


def num(value, default: float = 0.0) -> float:
    try:
        return float(str(value or "0").replace(",", "").replace("$", ""))
    except ValueError:
        return default


def parse_date(value) -> datetime | None:
    if not value:
        return None
    raw = str(value)[:10]
    try:
        return datetime.strptime(raw, "%Y-%m-%d")
    except ValueError:
        return None


def display_name(fields: dict) -> str:
    last = txt(fields.get("Athlete Last Name"))
    first = txt(fields.get("Athlete First Name"))
    year = txt(fields.get("School Year")) or "2025-2026"
    if last and first:
        return f"{last}, {first} - {year}"
    full = txt(fields.get("Full Athlete Name"))
    if full:
        return f"{full} - {year}" if year not in full else full
    return athlete_label(fields)


def classify_award_name(name: str) -> str | None:
    n = norm(name)
    for key, _, patterns in AWARD_PATTERNS:
        for pat in patterns:
            if pat in n:
                # Avoid classifying unrelated "Participation Award" via substring "playing"
                if key == "thanks_for_playing" and "thanks for playing" not in n and "every bit counts" not in n:
                    continue
                return key
    return None


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", str(s or "").strip().lower())


def flat_field(value) -> str:
    if value is None:
        return ""
    if isinstance(value, list):
        parts = [flat_field(item) for item in value]
        return ", ".join(p for p in parts if p)
    if isinstance(value, dict):
        return str(value.get("name") or value.get("id") or "").strip()
    return str(value).strip()


def normalize_band(label) -> str:
    raw = flat_field(label)
    raw = raw.strip().strip("[]").strip("'\"")
    raw = norm(raw).replace("–", "-").replace("—", "-")
    for band in BANDS:
        if norm(band) == raw:
            return band
    return raw.upper() if raw else ""


def money(value) -> str:
    return f"${num(value):,.2f}"


def md_table(headers: list[str], rows: list[list[str]]) -> str:
    if not rows:
        return "_No rows._\n"
    lines = [
        "| " + " | ".join(headers) + " |",
        "| " + " | ".join(["---"] * len(headers)) + " |",
    ]
    for row in rows:
        lines.append("| " + " | ".join(str(c).replace("|", "\\|") for c in row) + " |")
    return "\n".join(lines) + "\n"


def load_awards_catalog(sess) -> dict[str, dict]:
    catalog: dict[str, dict] = {}
    for row in list_table(
        sess,
        "Awards",
        [
            "Award Name",
            "Prize Value",
            "Award Scope",
            "Award Category",
            "Prize Type",
            "Email Display Name",
            "Email Display Short Name",
            "Active?",
            "Gift Card Award?",
        ],
    ):
        rf = f(row)
        name = txt(rf.get("Award Name"))
        display = txt(rf.get("Email Display Name")) or txt(rf.get("Email Display Short Name")) or name
        catalog[row["id"]] = {
            "id": row["id"],
            "award_name": name,
            "display_name": display,
            "prize_value": num(rf.get("Prize Value")),
            "award_scope": txt(rf.get("Award Scope")),
            "award_category": txt(rf.get("Award Category")),
            "prize_type": txt(rf.get("Prize Type")),
            "active": is_active(rf.get("Active?")),
            "gift_card": is_active(rf.get("Gift Card Award?")),
            "class_key": classify_award_name(name) or classify_award_name(display),
        }
    return catalog


def load_week_names(sess) -> dict[str, str]:
    return {w["id"]: txt(f(w).get("Week Name")) for w in list_table(sess, "Weeks", ["Week Name"])}


def shot_days_by_enrollment(submissions: list[dict]) -> dict[str, int]:
    days: dict[str, set] = defaultdict(set)
    for sub in submissions:
        sf = f(sub)
        if not is_active(sf.get("Count This Submission?")):
            continue
        if num(sf.get("Total Shots Counted")) <= 0:
            continue
        eid = first_id(sf.get("Enrollment"))
        if not eid:
            continue
        d = parse_date(sf.get("Activity Date"))
        if d:
            days[eid].add(d.date())
    return {k: len(v) for k, v in days.items()}


def motivation_score(row: dict) -> float:
    return (
        row["shot_days"] * 4.0
        + row["homework"] * 6.0
        + row["longest_streak"] * 3.0
        + row["submissions"] * 1.5
        + row["videos"] * 2.5
        + row["zooms"] * 3.0
    )


def build_enrollment_index(sess, submissions: list[dict]) -> dict[str, dict]:
    shot_days = shot_days_by_enrollment(submissions)
    index: dict[str, dict] = {}
    fields = [
        "Full Athlete Name",
        "Athlete First Name",
        "Athlete Last Name",
        "Grade Band Label",
        "Grade",
        "School Name Lookup",
        "School Year",
        "Parent Email - Cleaned",
        "Active?",
        "Current Level - Public Facing Display",
        "Level Sort Order - For Softr",
        "Lifetime XP Total",
        "Total Shots Counted",
        "Total Submissions",
        "Total Homework Completions",
        "Total Video Submissions",
        "Total Zoom Attendances",
        "Longest Streak Days",
        "Target Goal Shots",
        "Goal Met?",
        "Award Recipients",
    ]
    for row in list_table(sess, "Enrollments", fields):
        ef = f(row)
        eid = row["id"]
        index[eid] = {
            "enrollment_id": eid,
            "name": athlete_label(ef, eid),
            "display_name": display_name(ef),
            "grade_band": normalize_band(ef.get("Grade Band Label")),
            "grade": txt(ef.get("Grade")),
            "school": flat_field(ef.get("School Name Lookup")),
            "parent_email": txt(ef.get("Parent Email - Cleaned")).lower(),
            "active": is_active(ef.get("Active?")),
            "level": txt(ef.get("Current Level - Public Facing Display")),
            "level_sort": int(num(ef.get("Level Sort Order - For Softr"))),
            "xp": num(ef.get("Lifetime XP Total")),
            "shots": num(ef.get("Total Shots Counted")),
            "submissions": int(num(ef.get("Total Submissions"))),
            "homework": int(num(ef.get("Total Homework Completions"))),
            "videos": int(num(ef.get("Total Video Submissions"))),
            "zooms": int(num(ef.get("Total Zoom Attendances"))),
            "longest_streak": int(num(ef.get("Longest Streak Days"))),
            "shot_days": shot_days.get(eid, 0),
            "target_goal": num(ef.get("Target Goal Shots")),
            "goal_met": is_active(ef.get("Goal Met?")) or (
                num(ef.get("Target Goal Shots")) > 0
                and num(ef.get("Total Shots Counted")) >= num(ef.get("Target Goal Shots"))
            ),
            "goal_delta": num(ef.get("Total Shots Counted")) - num(ef.get("Target Goal Shots")),
        }
    return index


def load_award_recipients(sess, awards_catalog: dict, week_names: dict) -> list[dict]:
    rows: list[dict] = []
    fields = [
        "Enrollment",
        "Award",
        "Week",
        "Award Scope",
        "Award Status",
        "Date Awarded",
        "Award Amount",
        "Parent Email",
        "Athlete Name - Display",
        "Enrollment Name Lookup",
        "Award Recipient Display",
        "Award Recipient Unique Key",
        "Gift Card Needed?",
        "Prize Type Lookup",
    ]
    for row in list_table(sess, "Award Recipients", fields):
        rf = f(row)
        status = txt(rf.get("Award Status"))
        if norm(status) == "cancelled":
            continue
        award_id = first_id(rf.get("Award"))
        award_meta = awards_catalog.get(award_id, {})
        award_name = award_meta.get("award_name") or "(unknown award)"
        display_name_award = award_meta.get("display_name") or award_name
        class_key = award_meta.get("class_key") or classify_award_name(award_name) or classify_award_name(display_name_award)
        enrollment_id = first_id(rf.get("Enrollment"))
        week_id = first_id(rf.get("Week"))
        amount = num(rf.get("Award Amount")) or award_meta.get("prize_value", 0)
        rows.append(
            {
                "recipient_id": row["id"],
                "enrollment_id": enrollment_id,
                "award_id": award_id,
                "award_name": award_name,
                "award_display": display_name_award,
                "class_key": class_key,
                "amount": amount,
                "status": status or "(empty)",
                "scope": txt(rf.get("Award Scope")) or award_meta.get("award_scope", ""),
                "week_id": week_id,
                "week_label": week_names.get(week_id, ""),
                "date_awarded": flat_field(rf.get("Date Awarded"))[:10],
                "parent_email": flat_field(rf.get("Parent Email")).lower(),
                "athlete_name": flat_field(rf.get("Athlete Name - Display")) or flat_field(rf.get("Enrollment Name Lookup")),
                "unique_key": txt(rf.get("Award Recipient Unique Key")),
                "gift_card_needed": is_active(rf.get("Gift Card Needed?")),
                "prize_type": txt(rf.get("Prize Type Lookup")),
                "display": txt(rf.get("Award Recipient Display")),
            }
        )
    return rows


def rank_enrollments_in_band(enrollments: dict[str, dict], band: str) -> list[dict]:
    pool = [e for e in enrollments.values() if e["active"] and e["grade_band"] == band]
    # Primary close-out ranking (matches generate_award_recipient_paste.py): XP, shots, name.
    # Level sort is reported for context but not primary unless tied on XP/shots.
    return sorted(
        pool,
        key=lambda e: (-e["xp"], -e["shots"], -e["level_sort"], e["name"].lower()),
    )


def rank_enrollments_xp_only(enrollments: dict[str, dict], band: str) -> list[dict]:
    pool = [e for e in enrollments.values() if e["active"] and e["grade_band"] == band]
    return sorted(pool, key=lambda e: (-e["xp"], -e["shots"], e["name"].lower()))


def overall_recipients_by_band(recipients: list[dict], class_key: str) -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = defaultdict(list)
    for r in recipients:
        if r["class_key"] != class_key:
            continue
        if norm(r["scope"]) not in {"overall", "both"} and norm(r["week_label"]) not in {"post challenge", "overall"}:
            # Season-final overall awards should be Overall scope or Post Challenge week.
            if norm(r["scope"]) == "weekly":
                continue
        out["__all__"].append(r)
    return out


def enrollment_has_award_class(recipients: list[dict], enrollment_id: str, class_key: str, overall_only: bool = False) -> bool:
    for r in recipients:
        if r["enrollment_id"] != enrollment_id or r["class_key"] != class_key:
            continue
        if overall_only and norm(r["scope"]) == "weekly":
            continue
        return True
    return False


def enrollment_award_classes(recipients: list[dict], enrollment_id: str) -> set[str]:
    keys = set()
    for r in recipients:
        if r["enrollment_id"] == enrollment_id and r["class_key"]:
            keys.add(r["class_key"])
    return keys


def compute_keep_shooting_candidates(enrollments: dict[str, dict], top3_ids: set[str]) -> list[dict]:
    active_xps = sorted(e["xp"] for e in enrollments.values() if e["active"])
    active_shots = sorted(e["shots"] for e in enrollments.values() if e["active"])
    xp_cap = active_xps[int(len(active_xps) * KEEP_SHOOTING_RULES["max_xp_percentile"])] if active_xps else 0
    shots_cap = active_shots[int(len(active_shots) * KEEP_SHOOTING_RULES["max_shots_percentile"])] if active_shots else 0

    candidates: list[dict] = []
    for e in enrollments.values():
        if not e["active"] or e["enrollment_id"] in top3_ids:
            continue
        if e["level_sort"] > KEEP_SHOOTING_RULES["max_level_sort"]:
            continue
        if e["xp"] > xp_cap:
            continue
        if e["shots"] > shots_cap:
            continue
        if e["shot_days"] < KEEP_SHOOTING_RULES["min_shot_days"] and e["submissions"] < KEEP_SHOOTING_RULES["min_submissions"]:
            continue
        row = dict(e)
        row["motivation_score"] = round(motivation_score(e), 1)
        row["why"] = (
            f"Motivation score {row['motivation_score']}; {e['shot_days']} shot days; "
            f"{e['homework']} HW; level {e['level']} (sort {e['level_sort']})"
        )
        candidates.append(row)
    candidates.sort(
        key=lambda r: (
            BANDS.index(r["grade_band"]) if r["grade_band"] in BANDS else 99,
            -r["motivation_score"],
            r["name"].lower(),
        )
    )
    return candidates


def compute_daily_shot_candidate(enrollments: dict[str, dict]) -> dict | None:
    active = [e for e in enrollments.values() if e["active"] and (e["shot_days"] > 0 or e["submissions"] > 0)]
    if not active:
        return None
    ranked = sorted(
        active,
        key=lambda e: (-e["shot_days"], -e["submissions"], -e["longest_streak"], -e["shots"], e["name"].lower()),
    )
    top = ranked[0]
    top["why"] = (
        f"Highest consistency: {top['shot_days']} distinct shot days, {top['submissions']} submissions, "
        f"{top['longest_streak']}-day longest streak"
    )
    return top


def audit_recipients(recipients: list[dict], enrollments: dict[str, dict]) -> tuple[list[str], list[dict]]:
    warnings: list[str] = []
    issues: list[dict] = []

    by_enrollment_award: dict[tuple[str, str], list[dict]] = defaultdict(list)
    by_email_award: dict[tuple[str, str], list[dict]] = defaultdict(list)
    amounts_by_award: dict[str, set[float]] = defaultdict(set)

    for r in recipients:
        if not r["class_key"]:
            continue
        eid = r["enrollment_id"]
        if not eid:
            warnings.append(f"Missing enrollment on recipient {r['recipient_id']} ({r['award_display']})")
        if not r["athlete_name"]:
            warnings.append(f"Missing athlete name on recipient {r['recipient_id']}")
        if not r["parent_email"]:
            warnings.append(f"Missing parent email: {r['athlete_name'] or r['display']} — {r['award_display']}")
        enr = enrollments.get(eid, {})
        if eid and not enr:
            warnings.append(f"Enrollment not found: {eid} on recipient {r['recipient_id']}")

        key = (eid, r["award_id"])
        by_enrollment_award[key].append(r)
        if r["parent_email"]:
            by_email_award[(r["parent_email"], r["award_id"])].append(r)
        amounts_by_award[r["award_id"]].add(r["amount"])

        if r["class_key"] in RANK_TO_OVERALL_AWARD_KEY.values() and norm(r["scope"]) == "weekly":
            issues.append(
                {
                    "type": "scope_weekly_for_overall_award",
                    "recipient_id": r["recipient_id"],
                    "athlete": r["athlete_name"],
                    "award": r["award_display"],
                    "scope": r["scope"],
                    "week": r["week_label"],
                }
            )

    for key, group in by_enrollment_award.items():
        if len(group) > 1:
            eid, aid = key
            warnings.append(
                f"Duplicate enrollment+award: {group[0]['athlete_name']} — {group[0]['award_display']} "
                f"({len(group)} rows: {', '.join(g['recipient_id'] for g in group)})"
            )

    for key, group in by_email_award.items():
        if len(group) > 1:
            email, aid = key
            names = {g["athlete_name"] for g in group}
            if len(names) > 1:
                warnings.append(
                    f"Same email+award ({group[0]['award_display']}): {email} — "
                    f"{len(group)} rows ({'; '.join(sorted(names))}) — review siblings"
                )

    for aid, amounts in amounts_by_award.items():
        if len(amounts) > 1:
            sample = next(r for r in recipients if r["award_id"] == aid)
            warnings.append(f"Amount mismatch for award {sample['award_display']}: {sorted(amounts)}")

    return warnings, issues


def build_report(sess) -> str:
    awards_catalog = load_awards_catalog(sess)
    week_names = load_week_names(sess)
    submissions = list_table(
        sess,
        "Submissions",
        ["Enrollment", "Count This Submission?", "Activity Date", "Total Shots Counted"],
    )
    enrollments = build_enrollment_index(sess, submissions)
    recipients = load_award_recipients(sess, awards_catalog, week_names)

    target_keys = {p[0] for p in AWARD_PATTERNS}
    final_recipients = [r for r in recipients if r["class_key"] in target_keys]
    warnings, scope_issues = audit_recipients(final_recipients, enrollments)

    # Grade band top 3 from live data
    band_rankings: dict[str, list[dict]] = {}
    band_rankings_xp: dict[str, list[dict]] = {}
    top3_by_band: dict[str, dict[int, dict]] = {}
    top3_ids: set[str] = set()
    for band in BANDS:
        ranked = rank_enrollments_in_band(enrollments, band)
        ranked_xp = rank_enrollments_xp_only(enrollments, band)
        band_rankings[band] = ranked
        band_rankings_xp[band] = ranked_xp
        top3_by_band[band] = {}
        for rank in (1, 2, 3):
            if rank - 1 < len(ranked):
                top3_by_band[band][rank] = ranked[rank - 1]
                top3_ids.add(ranked[rank - 1]["enrollment_id"])

    possible_adds: list[dict] = []
    do_not_remove: list[dict] = []

    # Grade band overall award cross-check
    rank_labels = {1: "Champion", 2: "Runner-Up", 3: "Third Place"}
    for band in BANDS:
        for rank, class_key in RANK_TO_OVERALL_AWARD_KEY.items():
            if rank not in top3_by_band[band]:
                continue
            data_athlete = top3_by_band[band][rank]
            eid = data_athlete["enrollment_id"]
            award_label = f"Grade Band {rank_labels[rank]} Award"
            has_overall = enrollment_has_award_class(final_recipients, eid, class_key, overall_only=True)
            current_holders = [
                r
                for r in final_recipients
                if r["class_key"] == class_key
                and norm(r["scope"]) in {"overall", "both"}
                and enrollments.get(r["enrollment_id"], {}).get("grade_band") == band
            ]
            if not has_overall:
                possible_adds.append(
                    {
                        "athlete": data_athlete["name"],
                        "enrollment_id": eid,
                        "suggested_award": award_label,
                        "reason": (
                            f"Rank #{rank} in {band} by XP ({int(data_athlete['xp'])}), "
                            f"shots ({int(data_athlete['shots'])}), level {data_athlete['level']}"
                        ),
                        "support": f"Level {data_athlete['level']}, XP {int(data_athlete['xp'])}, shots {int(data_athlete['shots'])}",
                        "already_has": "No",
                    }
                )
            for holder in current_holders:
                if holder["enrollment_id"] != eid:
                    do_not_remove.append(
                        {
                            "athlete": holder["athlete_name"],
                            "enrollment_id": holder["enrollment_id"],
                            "award": holder["award_display"],
                            "note": (
                                f"Already in current Award Recipients for {band} {rank_labels[rank]}; "
                                f"data now shows {data_athlete['name']} — do not remove without manual review"
                            ),
                        }
                    )
                    possible_adds.append(
                        {
                            "athlete": data_athlete["name"],
                            "enrollment_id": eid,
                            "suggested_award": award_label,
                            "reason": f"Possible Add — data now shows this athlete qualifies for {band} {rank_labels[rank]}",
                            "support": f"Level {data_athlete['level']}, XP {int(data_athlete['xp'])}, shots {int(data_athlete['shots'])}",
                            "already_has": "No",
                        }
                    )

            # XP-only ranking divergence
            xp_ranked = band_rankings_xp[band]
            if rank - 1 < len(xp_ranked):
                xp_pick = xp_ranked[rank - 1]
                if xp_pick["enrollment_id"] != eid:
                    warnings.append(
                        f"{band} rank #{rank}: level-first pick {data_athlete['name']} differs from "
                        f"XP-only pick {xp_pick['name']} (XP {int(xp_pick['xp'])})"
                    )

    # Conquered Goal
    for e in enrollments.values():
        if not e["active"] or not e["goal_met"]:
            continue
        if not enrollment_has_award_class(final_recipients, e["enrollment_id"], "conquered_goal"):
            possible_adds.append(
                {
                    "athlete": e["name"],
                    "enrollment_id": e["enrollment_id"],
                    "suggested_award": "Conquered Goal Award",
                    "reason": "Possible Add — reached goal based on current data",
                    "support": (
                        f"Goal {int(e['target_goal'])}, shots {int(e['shots'])}, "
                        f"+{int(e['goal_delta'])} above goal"
                    ),
                    "already_has": "No",
                }
            )

    # Daily Shot Submission
    daily_pick = compute_daily_shot_candidate(enrollments)
    if daily_pick and not enrollment_has_award_class(
        final_recipients, daily_pick["enrollment_id"], "daily_shot", overall_only=True
    ):
        possible_adds.append(
            {
                "athlete": daily_pick["name"],
                "enrollment_id": daily_pick["enrollment_id"],
                "suggested_award": "Daily Shot Submission Award",
                "reason": "Possible Add — consistency data supports award",
                "support": daily_pick["why"],
                "already_has": "No",
            }
        )

    # Keep Shooting
    keep_candidates = compute_keep_shooting_candidates(enrollments, top3_ids)
    current_keep_ids = {r["enrollment_id"] for r in final_recipients if r["class_key"] == "keep_shooting"}
    for c in keep_candidates:
        if c["enrollment_id"] not in current_keep_ids:
            possible_adds.append(
                {
                    "athlete": c["name"],
                    "enrollment_id": c["enrollment_id"],
                    "suggested_award": "Keep Shooting Incentive Award",
                    "reason": "Possible Add — motivation/effort criteria met",
                    "support": c["why"],
                    "already_has": "No",
                }
            )

    # Thanks for Playing — possible additions
    final_award_holders = {r["enrollment_id"] for r in final_recipients if r["class_key"]}
    thanks_current = [r for r in final_recipients if r["class_key"] == "thanks_for_playing"]
    for e in enrollments.values():
        if not e["active"]:
            continue
        if e["shots"] < THANKS_MIN_SHOTS:
            continue
        if e["enrollment_id"] in final_award_holders:
            continue
        if enrollment_has_award_class(final_recipients, e["enrollment_id"], "thanks_for_playing"):
            continue
        possible_adds.append(
            {
                "athlete": e["name"],
                "enrollment_id": e["enrollment_id"],
                "suggested_award": "Thanks for Playing Award — Every Bit Counts",
                "reason": "Possible Add — participated with 20+ counted shots, no other final award",
                "support": f"{int(e['shots'])} shots, {e['shot_days']} shot days",
                "already_has": "No",
            }
        )

    # Summaries by award class
    grouped: dict[str, list[dict]] = {k: [] for k, _, _ in AWARD_PATTERNS}
    for r in final_recipients:
        if r["class_key"]:
            grouped[r["class_key"]].append(r)

    summary_rows: list[list[str]] = []
    total_dollars = 0.0
    total_recipients = len(final_recipients)
    for key, label, _ in AWARD_PATTERNS:
        rows = grouped.get(key, [])
        amounts = [r["amount"] for r in rows if r["amount"] > 0]
        per = amounts[0] if amounts else 0
        if amounts and len(set(amounts)) > 1:
            per_note = "mixed"
        else:
            per_note = money(per) if per else "—"
        subtotal = sum(r["amount"] for r in rows)
        total_dollars += subtotal
        notes: list[str] = []
        if not rows:
            notes.append("no recipients in base")
        if key == "random_drawing":
            notes.append("audit-only; not re-randomized")
        summary_rows.append(
            [
                label,
                str(len(rows)),
                per_note,
                money(subtotal) if subtotal else "—",
                "live data",
                "; ".join(notes) if notes else "",
            ]
        )

    # Dedupe possible_adds by enrollment+award
    seen_adds: set[tuple[str, str]] = set()
    deduped_adds: list[dict] = []
    for row in possible_adds:
        sig = (row["enrollment_id"], row["suggested_award"])
        if sig in seen_adds:
            continue
        seen_adds.add(sig)
        deduped_adds.append(row)

    # Dedupe do_not_remove
    seen_dnr: set[tuple[str, str]] = set()
    deduped_dnr: list[dict] = []
    for row in do_not_remove:
        sig = (row["enrollment_id"], row["award"])
        if sig in seen_dnr:
            continue
        seen_dnr.add(sig)
        deduped_dnr.append(row)

    generated = datetime.now().strftime("%Y-%m-%d %H:%M")
    lines: list[str] = [
        "# Final Awards Audit — 2025–2026 Shooting Challenge",
        "",
        f"_Generated {generated} from live Airtable base `{BASE_ID}` (read-only)._",
        "",
        "## 1. Executive Summary",
        "",
        f"- **Current final award recipient rows (8 award types):** {total_recipients}",
        f"- **Estimated gift card total (Prize Value / Award Amount on those rows):** {money(total_dollars)}",
        f"- **Possible additions flagged:** {len(deduped_adds)}",
        f"- **Warnings / data quality issues:** {len(warnings) + len(scope_issues)}",
        "",
        "**Ranking rule used for grade-band standings:** `Lifetime XP Total` (desc), then `Total Shots Counted` (desc), then `Level Sort Order - For Softr` (desc), then name — matches `generate_award_recipient_paste.py`.",
        "",
        "**Policy:** Current Award Recipients are the minimum list. This report may suggest additions; it does not recommend removals.",
        "",
        "## 2. Current Award Recipient Summary Table",
        "",
        md_table(
            ["Award", "Count", "Amount (each)", "Total", "Status", "Notes"],
            summary_rows,
        ),
        "",
        "## 3. Current Award Recipient Lists",
        "",
    ]

    for key, label, _ in AWARD_PATTERNS:
        rows = grouped.get(key, [])
        lines.append(f"### {label}")
        lines.append("")
        if not rows:
            lines.append("_No recipients in base for this award type._\n")
            continue
        detail_rows = []
        for r in sorted(rows, key=lambda x: (x["award_display"], x["athlete_name"])):
            enr = enrollments.get(r["enrollment_id"], {})
            stat = ""
            if key == "conquered_goal":
                stat = f"Goal {int(enr.get('target_goal', 0))}, shots {int(enr.get('shots', 0))}"
            elif key in RANK_TO_OVERALL_AWARD_KEY.values():
                stat = f"XP {int(enr.get('xp', 0))}, shots {int(enr.get('shots', 0))}, level {enr.get('level', '')}"
            elif key == "daily_shot":
                stat = f"{enr.get('shot_days', 0)} shot days, streak {enr.get('longest_streak', 0)}"
            elif key == "keep_shooting":
                stat = f"Motivation {motivation_score(enr):.1f}, {enr.get('shot_days', 0)} shot days" if enr else ""
            elif key == "thanks_for_playing":
                stat = f"{int(enr.get('shots', 0))} shots"
            detail_rows.append(
                [
                    r["award_display"],
                    money(r["amount"]) if r["amount"] else "—",
                    r["athlete_name"] or enr.get("name", ""),
                    enr.get("grade", ""),
                    enr.get("school", ""),
                    r["parent_email"] or enr.get("parent_email", ""),
                    r["enrollment_id"],
                    stat,
                    f"{r['scope']} / {r['week_label'] or '—'} / {r['status']}",
                ]
            )
        lines.append(
            md_table(
                [
                    "Award",
                    "Amount",
                    "Athlete",
                    "Grade",
                    "School",
                    "Parent email",
                    "Enrollment",
                    "Key stat",
                    "Scope / Week / Status",
                ],
                detail_rows,
            )
        )
        lines.append("")

    lines.extend(["## 4. Data-Driven Audit Findings", ""])
    if scope_issues:
        lines.append("### Scope / workflow issues")
        lines.append("")
        lines.append(md_table(["Type", "Athlete", "Award", "Scope", "Week"], [
            [i["type"], i["athlete"], i["award"], i["scope"], i["week"]] for i in scope_issues
        ]))
        lines.append("")

    lines.extend(["## 5. Grade Band Top 3 From Current Data", ""])
    for band in BANDS:
        lines.append(f"### {band}")
        lines.append("")
        rank_rows = []
        for rank in (1, 2, 3):
            if rank not in top3_by_band[band]:
                continue
            e = top3_by_band[band][rank]
            class_key = RANK_TO_OVERALL_AWARD_KEY[rank]
            has_award = "Yes" if enrollment_has_award_class(final_recipients, e["enrollment_id"], class_key, overall_only=True) else "No"
            rank_rows.append(
                [
                    str(rank),
                    e["name"],
                    e["grade"],
                    e["school"],
                    e["level"],
                    str(int(e["xp"])),
                    str(int(e["shots"])),
                    f"Level sort {e['level_sort']}, XP, shots",
                    has_award,
                ]
            )
        lines.append(
            md_table(
                ["Rank", "Athlete", "Grade", "School", "Level", "XP", "Shots", "Why ranked", "Already has overall award?"],
                rank_rows,
            )
        )
        lines.append("")

    lines.extend(["## 6. Possible Added Awards", ""])
    if deduped_adds:
        lines.append(
            md_table(
                ["Athlete", "Suggested Award", "Reason", "Current Data Support", "Already in Award Recipients?"],
                [[a["athlete"], a["suggested_award"], a["reason"], a["support"], a["already_has"]] for a in deduped_adds],
            )
        )
    else:
        lines.append("_No possible additions identified._\n")

    lines.extend(["", "## 7. Do Not Remove List", ""])
    if deduped_dnr:
        lines.append(
            md_table(
                ["Athlete", "Enrollment", "Current Award", "Note"],
                [[d["athlete"], d["enrollment_id"], d["award"], d["note"]] for d in deduped_dnr],
            )
        )
    else:
        lines.append("_No grade-band conflicts between current recipients and refreshed rankings._\n")

    lines.extend(["", "## 8. Warnings / Data Quality Issues", ""])
    if warnings:
        for w in sorted(set(warnings)):
            lines.append(f"- {w}")
    else:
        lines.append("- None")
    lines.append("")

    lines.extend(["### Assumptions", ""])
    lines.extend(
        [
            "- Award type matching uses live `Awards.Award Name` and email display names (substring match).",
            "- Cancelled `Award Status` rows are excluded.",
            "- Grade-band season prizes are compared on `Overall` scope (or Post Challenge week).",
            "- Daily Shot Submission: top athlete by distinct shot days, then submissions, then longest streak.",
            "- Keep Shooting: same percentile/motivation rules as `generate_keep_shooting_awards.py`, with top-3 per band derived from live data (not hardcoded).",
            "- Random Drawing: current recipients only; no re-draw.",
            "- Thanks for Playing additions: active, 20+ shots, no row in the 8 final award types.",
            "",
        ]
    )

    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--out",
        default=str(PREVIEW_DIR / "final-awards-audit-report.md"),
        help="Markdown output path",
    )
    args = parser.parse_args()

    sess = session()
    report = build_report(sess)
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(report, encoding="utf-8")
    print(f"Wrote {out_path}")
    print(f"Length: {len(report):,} chars")


if __name__ == "__main__":
    main()
