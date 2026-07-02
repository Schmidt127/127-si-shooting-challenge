#!/usr/bin/env python3
"""
Read-only audit: Awards catalog, Award Recipients connections, Enrollment Goal Met.

Does not create, update, or delete Airtable records.

  python audit_awards_catalog_and_connections.py
  python audit_awards_catalog_and_connections.py --out _preview/awards-catalog-audit-report.md
"""

from __future__ import annotations

import argparse
import re
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

from airtable_read import athlete_label, f, first_id, is_active, linked_ids, list_table, session, txt

PREVIEW_DIR = Path(__file__).resolve().parent / "_preview"

AWARD_CLASS_PATTERNS: list[tuple[str, list[str]]] = [
    ("conquered_goal", ["conquered goal"]),
    ("grade_band_champion", ["grade band champion"]),
    ("grade_band_runner_up", ["grade band runner", "grade band second", "grade band 2nd"]),
    ("grade_band_third", ["grade band third", "grade band 3rd"]),
    ("daily_shot", ["daily shot submission"]),
    ("keep_shooting", ["keep shooting"]),
    ("random_drawing", ["random drawing"]),
    ("thanks_for_playing", ["thanks for playing", "every bit counts", "participation award"]),
    ("level_leader", ["level leader"]),
    ("homework_recognition", ["homework recognition"]),
    ("video_submission", ["video submission recognition"]),
]

FINAL_CLASS_KEYS = {
    "conquered_goal",
    "grade_band_champion",
    "grade_band_runner_up",
    "grade_band_third",
    "daily_shot",
    "keep_shooting",
    "random_drawing",
    "thanks_for_playing",
}

KNOWN_STATUSES = {
    "pending",
    "approved",
    "sent",
    "delivered",
    "cancelled",
    "in amazon cart",
}


def norm(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip().lower())


def flat_field(value) -> str:
    if value is None:
        return ""
    if isinstance(value, list):
        return ", ".join(flat_field(item) for item in value if item not in (None, ""))
    if isinstance(value, dict):
        return str(value.get("name") or value.get("id") or "").strip()
    return str(value).strip()


def num(value, default: float = 0.0) -> float:
    if isinstance(value, list):
        return num(value[0], default) if value else default
    try:
        return float(str(value or "0").replace(",", "").replace("$", ""))
    except (TypeError, ValueError):
        return default


def parse_dates(value) -> list[str]:
    if not value:
        return []
    if isinstance(value, list):
        out: list[str] = []
        for item in value:
            out.extend(parse_dates(item))
        return out
    return [flat_field(value)[:19]]


def classify_award(name: str) -> str | None:
    n = norm(name)
    for key, patterns in AWARD_CLASS_PATTERNS:
        for pat in patterns:
            if pat in n:
                if key == "thanks_for_playing" and "participation award" not in n and "thanks for playing" not in n and "every bit counts" not in n:
                    continue
                return key
    return None


def goal_met_from_fields(shots: float, target: float) -> bool:
    return target > 0 and shots > 0 and shots >= target


def goal_met_field_truthy(value) -> bool:
    text = flat_field(value)
    return bool(text) and norm(text) not in {"false", "0", "no"}


def md_table(headers: list[str], rows: list[list[str]], limit: int | None = 200) -> str:
    if not rows:
        return "_No rows._\n"
    shown = rows[:limit] if limit else rows
    lines = [
        "| " + " | ".join(headers) + " |",
        "| " + " | ".join(["---"] * len(headers)) + " |",
    ]
    for row in shown:
        lines.append("| " + " | ".join(str(c).replace("|", "\\|") for c in row) + " |")
    if limit and len(rows) > limit:
        lines.append(f"\n_…and {len(rows) - limit} more rows._\n")
    return "\n".join(lines) + "\n"


def load_table_merged(sess, table: str, field_groups: list[list[str]]) -> list[dict]:
    merged: dict[str, dict] = {}
    for fields in field_groups:
        for row in list_table(sess, table, fields):
            rid = row["id"]
            if rid not in merged:
                merged[rid] = {"id": rid, "fields": {}}
            merged[rid]["fields"].update(f(row))
    return [{"id": rid, "fields": data["fields"]} for rid, data in merged.items()]


def load_awards(sess) -> dict[str, dict]:
    field_groups = [
        [
            "Award Name",
            "Award Code",
            "Prize Value",
            "Award Scope",
            "Award Category",
            "Award Type",
            "Prize Type",
            "Email Display Name",
            "Email Display Short Name",
            "Default Email Label",
        ],
        [
            "Active?",
            "Gift Card Award?",
            "Recurring Award?",
            "Eligible for Weekly Summary?",
            "Eligible for Overall Summary?",
            "Include in Weekly Awards Section?",
            "Include in Overall Awards Section?",
            "Summary Section Group",
            "Current Challenge Eligible?",
            "Challenge Active?",
            "Award Recipients",
            "Award Recipients Count",
            "Sort Order",
            "Email Sort Order",
        ],
    ]
    catalog: dict[str, dict] = {}
    for row in load_table_merged(sess, "Awards", field_groups):
        rf = f(row)
        name = txt(rf.get("Award Name"))
        email_name = txt(rf.get("Email Display Name"))
        short_name = txt(rf.get("Email Display Short Name"))
        display = email_name or short_name or txt(rf.get("Default Email Label")) or name
        linked = linked_ids(rf.get("Award Recipients"))
        count_field = rf.get("Award Recipients Count")
        catalog[row["id"]] = {
            "id": row["id"],
            "award_name": name,
            "award_code": txt(rf.get("Award Code")),
            "email_display": email_name,
            "email_short": short_name,
            "display": display,
            "prize_value": num(rf.get("Prize Value")),
            "award_scope": txt(rf.get("Award Scope")),
            "award_category": txt(rf.get("Award Category")),
            "award_type": txt(rf.get("Award Type")),
            "prize_type": txt(rf.get("Prize Type")),
            "active": is_active(rf.get("Active?")),
            "gift_card": is_active(rf.get("Gift Card Award?")),
            "recurring": is_active(rf.get("Recurring Award?")),
            "weekly_summary": is_active(rf.get("Eligible for Weekly Summary?")),
            "overall_summary": is_active(rf.get("Eligible for Overall Summary?")),
            "include_weekly": is_active(rf.get("Include in Weekly Awards Section?")),
            "include_overall": is_active(rf.get("Include in Overall Awards Section?")),
            "summary_group": txt(rf.get("Summary Section Group")),
            "challenge_eligible": is_active(rf.get("Current Challenge Eligible?")),
            "challenge_active": is_active(rf.get("Challenge Active?")),
            "linked_recipient_ids": linked,
            "recipient_count_field": int(num(count_field)),
            "class_key": classify_award(name) or classify_award(display),
            "norm_name": norm(name),
            "norm_display": norm(display),
        }
    return catalog


def load_weeks(sess) -> dict[str, str]:
    return {w["id"]: txt(f(w).get("Week Name")) for w in list_table(sess, "Weeks", ["Week Name"])}


def load_enrollments(sess) -> dict[str, dict]:
    fields = [
        "Full Athlete Name",
        "Athlete First Name",
        "Athlete Last Name",
        "Active?",
        "Total Shots Counted",
        "Target Goal Shots",
        "Goal Met?",
        "Goal Met Date",
        "Award Recipients",
        "Grade Band Label",
    ]
    out: dict[str, dict] = {}
    for row in list_table(sess, "Enrollments", fields):
        ef = f(row)
        shots = num(ef.get("Total Shots Counted"))
        target = num(ef.get("Target Goal Shots"))
        out[row["id"]] = {
            "id": row["id"],
            "name": athlete_label(ef, row["id"]),
            "active": is_active(ef.get("Active?")),
            "shots": shots,
            "target": target,
            "goal_met_field": flat_field(ef.get("Goal Met?")),
            "goal_met_truthy": goal_met_field_truthy(ef.get("Goal Met?")),
            "goal_met_computed": goal_met_from_fields(shots, target),
            "goal_met_dates": parse_dates(ef.get("Goal Met Date")),
            "linked_recipient_ids": linked_ids(ef.get("Award Recipients")),
            "grade_band": flat_field(ef.get("Grade Band Label")).strip("[]'\""),
        }
    return out


def load_recipients(sess) -> list[dict]:
    fields = [
        "Enrollment",
        "Award",
        "Week",
        "Award Scope",
        "Award Status",
        "Date Awarded",
        "Award Amount",
        "Award Recipient Display",
        "Award Recipient Unique Key",
        "Athlete Name - Display",
        "Enrollment Name Lookup",
        "Award Category Lookup",
        "Prize Type Lookup",
        "Gift Card Needed?",
    ]
    rows: list[dict] = []
    for row in list_table(sess, "Award Recipients", fields):
        rf = f(row)
        rows.append(
            {
                "id": row["id"],
                "enrollment_id": first_id(rf.get("Enrollment")),
                "award_id": first_id(rf.get("Award")),
                "week_id": first_id(rf.get("Week")),
                "scope": txt(rf.get("Award Scope")),
                "status": txt(rf.get("Award Status")) or "(empty)",
                "date_awarded": flat_field(rf.get("Date Awarded"))[:19],
                "amount": num(rf.get("Award Amount")),
                "display": txt(rf.get("Award Recipient Display")),
                "unique_key": txt(rf.get("Award Recipient Unique Key")),
                "athlete_display": flat_field(rf.get("Athlete Name - Display")),
                "enrollment_lookup": flat_field(rf.get("Enrollment Name Lookup")),
                "award_category": flat_field(rf.get("Award Category Lookup")),
                "prize_type": flat_field(rf.get("Prize Type Lookup")),
                "gift_card_needed": is_active(rf.get("Gift Card Needed?")),
            }
        )
    return rows


def audit_awards_catalog(catalog: dict[str, dict]) -> dict:
    issues: list[dict] = []
    by_norm_name: dict[str, list[str]] = defaultdict(list)
    by_class: dict[str, list[str]] = defaultdict(list)
    inventory_rows: list[list[str]] = []

    for aid, aw in sorted(catalog.items(), key=lambda x: (x[1]["award_name"] or "", x[0])):
        inventory_rows.append(
            [
                aw["award_name"] or "(blank)",
                aw["display"],
                aw["award_scope"] or "—",
                f"${aw['prize_value']:.0f}" if aw["prize_value"] else "—",
                aw["prize_type"] or "—",
                "Y" if aw["active"] else "N",
                "Y" if aw["challenge_eligible"] else "N",
                str(len(aw["linked_recipient_ids"])),
                aid[:12],
            ]
        )
        if not aw["award_name"]:
            issues.append({"code": "award_missing_name", "award_id": aid, "detail": "Award Name is blank"})
        if aw["norm_name"]:
            by_norm_name[aw["norm_name"]].append(aid)
        if aw["class_key"]:
            by_class[aw["class_key"]].append(aid)
        if aw["email_display"] and aw["award_name"]:
            display_class = classify_award(aw["email_display"])
            name_class = classify_award(aw["award_name"])
            if display_class and name_class and display_class != name_class:
                issues.append(
                    {
                        "code": "award_name_display_class_mismatch",
                        "award_id": aid,
                        "detail": f"Award Name class `{name_class}` vs Email Display class `{display_class}` (`{aw['award_name']}` / `{aw['email_display']}`)",
                    }
                )
        if not aw["email_display"] and aw["linked_recipient_ids"]:
            issues.append(
                {
                    "code": "award_missing_email_display",
                    "award_id": aid,
                    "detail": f"`{aw['award_name']}` has recipients but no Email Display Name",
                }
            )
        if aw["gift_card"] and norm(aw["prize_type"]) != "amazon gift card":
            issues.append(
                {
                    "code": "award_gift_card_flag_prize_type_mismatch",
                    "award_id": aid,
                    "detail": f"Gift Card Award?=true but Prize Type=`{aw['prize_type'] or '(empty)'}`",
                }
            )
        if aw["gift_card"] and aw["prize_value"] <= 0:
            issues.append(
                {
                    "code": "award_gift_card_zero_value",
                    "award_id": aid,
                    "detail": f"Gift Card Award?=true but Prize Value={aw['prize_value']}",
                }
            )
        if aw["award_scope"] == "Weekly" and aw["include_overall"] and not aw["include_weekly"]:
            issues.append(
                {
                    "code": "award_scope_flag_conflict",
                    "award_id": aid,
                    "detail": "Award Scope=Weekly but only Include in Overall Awards Section",
                }
            )
        if aw["award_scope"] == "Overall" and aw["include_weekly"] and not aw["include_overall"]:
            issues.append(
                {
                    "code": "award_scope_flag_conflict",
                    "award_id": aid,
                    "detail": "Award Scope=Overall but only Include in Weekly Awards Section",
                }
            )
        if not aw["active"] and aw["linked_recipient_ids"]:
            issues.append(
                {
                    "code": "award_inactive_has_recipients",
                    "award_id": aid,
                    "detail": f"Inactive award has {len(aw['linked_recipient_ids'])} linked recipients",
                }
            )
        if aw["recipient_count_field"] != len(aw["linked_recipient_ids"]):
            issues.append(
                {
                    "code": "award_recipient_count_mismatch",
                    "award_id": aid,
                    "detail": f"Count field={aw['recipient_count_field']} vs linked={len(aw['linked_recipient_ids'])}",
                }
            )

    for norm_name, aids in by_norm_name.items():
        if len(aids) > 1:
            names = [catalog[aid]["award_name"] for aid in aids]
            issues.append(
                {
                    "code": "award_duplicate_norm_name",
                    "award_id": ", ".join(aids),
                    "detail": f"Duplicate normalized Award Name `{norm_name}` -> {names}",
                }
            )

    for class_key, aids in by_class.items():
        if len(aids) > 1:
            names = [f"{catalog[aid]['award_name']} ({aid[:12]})" for aid in aids]
            issues.append(
                {
                    "code": "award_duplicate_class_bucket",
                    "award_id": ", ".join(aids),
                    "detail": f"Multiple awards in class `{class_key}`: {'; '.join(names)}",
                }
            )

    unclassified = [aw for aw in catalog.values() if not aw["class_key"] and aw["linked_recipient_ids"]]
    for aw in unclassified:
        issues.append(
            {
                "code": "award_unclassified_with_recipients",
                "award_id": aw["id"],
                "detail": f"Could not classify `{aw['award_name']}` ({len(aw['linked_recipient_ids'])} recipients)",
            }
        )

    return {
        "inventory_rows": inventory_rows,
        "issues": issues,
        "by_class": by_class,
    }


def audit_recipients(
    recipients: list[dict],
    catalog: dict[str, dict],
    enrollments: dict[str, dict],
    weeks: dict[str, str],
) -> dict:
    issues: list[dict] = []
    status_counts: Counter[str] = Counter()
    dup_unique: dict[str, list[str]] = defaultdict(list)
    dup_eaw: dict[tuple, list[str]] = defaultdict(list)

    for r in recipients:
        status_counts[norm(r["status"])] += 1
        if r["unique_key"]:
            dup_unique[r["unique_key"]].append(r["id"])
        dup_eaw[(r["enrollment_id"], r["award_id"], r["week_id"])].append(r["id"])

        if not r["enrollment_id"]:
            issues.append({"code": "recipient_missing_enrollment", "recipient_id": r["id"], "detail": r["display"] or r["id"]})
        elif r["enrollment_id"] not in enrollments:
            issues.append({"code": "recipient_broken_enrollment_link", "recipient_id": r["id"], "detail": r["enrollment_id"]})

        if not r["award_id"]:
            issues.append({"code": "recipient_missing_award", "recipient_id": r["id"], "detail": r["display"] or r["id"]})
        elif r["award_id"] not in catalog:
            issues.append({"code": "recipient_broken_award_link", "recipient_id": r["id"], "detail": r["award_id"]})

        if r["week_id"] and r["week_id"] not in weeks:
            issues.append({"code": "recipient_broken_week_link", "recipient_id": r["id"], "detail": r["week_id"]})

        aw = catalog.get(r["award_id"], {})
        week_label = weeks.get(r["week_id"], "")
        week_norm = norm(week_label)

        if norm(r["status"]) not in KNOWN_STATUSES:
            issues.append(
                {
                    "code": "recipient_unknown_status",
                    "recipient_id": r["id"],
                    "detail": f"status=`{r['status']}` award=`{aw.get('award_name', '?')}` athlete=`{r['athlete_display']}`",
                }
            )

        if norm(r["scope"]) == "weekly" and not r["week_id"]:
            issues.append(
                {
                    "code": "recipient_weekly_missing_week",
                    "recipient_id": r["id"],
                    "detail": f"{r['athlete_display']} | {aw.get('award_name', '?')} | scope=Weekly",
                }
            )

        if norm(r["scope"]) == "overall" and r["week_id"] and week_norm not in {"post challenge", "overall"}:
            issues.append(
                {
                    "code": "recipient_overall_has_challenge_week",
                    "recipient_id": r["id"],
                    "detail": f"{r['athlete_display']} | {aw.get('award_name', '?')} | week={week_label}",
                }
            )

        if aw and r["scope"] and aw.get("award_scope"):
            cat_scope = norm(aw["award_scope"])
            rec_scope = norm(r["scope"])
            if cat_scope in {"weekly", "overall"} and rec_scope and cat_scope != rec_scope:
                issues.append(
                    {
                        "code": "recipient_scope_vs_catalog_scope",
                        "recipient_id": r["id"],
                        "detail": f"{aw['award_name']}: catalog={aw['award_scope']} recipient={r['scope']} | {r['athlete_display']} | {week_label}",
                    }
                )

        if r["enrollment_id"] in enrollments:
            en = enrollments[r["enrollment_id"]]
            if r["id"] not in en["linked_recipient_ids"]:
                issues.append(
                    {
                        "code": "recipient_missing_enrollment_backlink",
                        "recipient_id": r["id"],
                        "detail": f"{en['name']} enrollment link missing back to recipient",
                    }
                )
            if r["athlete_display"] and en["name"] and norm(r["athlete_display"]) != norm(en["name"]):
                if norm(r["athlete_display"]) not in norm(en["name"]) and norm(en["name"]) not in norm(r["athlete_display"]):
                    issues.append(
                        {
                            "code": "recipient_athlete_name_drift",
                            "recipient_id": r["id"],
                            "detail": f"lookup=`{r['athlete_display']}` enrollment=`{en['name']}`",
                        }
                    )

        if aw and r["id"] not in aw["linked_recipient_ids"]:
            issues.append(
                {
                    "code": "recipient_missing_award_backlink",
                    "recipient_id": r["id"],
                    "detail": f"Award `{aw['award_name']}` missing backlink to recipient",
                }
            )

        if aw and r["amount"] and aw["prize_value"] and abs(r["amount"] - aw["prize_value"]) > 0.01:
            issues.append(
                {
                    "code": "recipient_amount_vs_catalog_value",
                    "recipient_id": r["id"],
                    "detail": f"{aw['award_name']}: lookup ${r['amount']:.2f} vs catalog ${aw['prize_value']:.2f}",
                }
            )

    for key, ids in dup_unique.items():
        if len(ids) > 1:
            issues.append({"code": "recipient_duplicate_unique_key", "recipient_id": ", ".join(ids), "detail": key})

    for key, ids in dup_eaw.items():
        if len(ids) > 1 and key[0] and key[1]:
            en_name = enrollments.get(key[0], {}).get("name", key[0])
            aw_name = catalog.get(key[1], {}).get("award_name", key[1])
            week_label = weeks.get(key[2], "OVERALL")
            issues.append(
                {
                    "code": "recipient_duplicate_enrollment_award_week",
                    "recipient_id": ", ".join(ids),
                    "detail": f"{en_name} | {aw_name} | {week_label} ({len(ids)} rows)",
                }
            )

    # Enrollment -> recipients backlink orphans
    for eid, en in enrollments.items():
        for rid in en["linked_recipient_ids"]:
            if not any(r["id"] == rid for r in recipients):
                issues.append(
                    {
                        "code": "enrollment_orphan_recipient_link",
                        "recipient_id": rid,
                        "detail": f"{en['name']} links missing recipient record",
                    }
                )

    return {"issues": issues, "status_counts": status_counts}


def audit_goal_met(
    enrollments: dict[str, dict],
    recipients: list[dict],
    catalog: dict[str, dict],
) -> dict:
    issues: list[dict] = []
    summary = {
        "active_enrollments": 0,
        "computed_goal_met": 0,
        "field_goal_met": 0,
        "field_vs_computed_mismatch": 0,
        "goal_met_no_conquered_award": 0,
        "conquered_award_no_goal_met": 0,
        "goal_met_date_polluted": 0,
        "missing_target_goal": 0,
    }

    conquered_award_ids = {aid for aid, aw in catalog.items() if aw.get("class_key") == "conquered_goal"}

    recipients_by_enrollment: dict[str, list[dict]] = defaultdict(list)
    for r in recipients:
        if r["enrollment_id"]:
            recipients_by_enrollment[r["enrollment_id"]].append(r)

    goal_met_rows: list[list[str]] = []

    for eid, en in enrollments.items():
        if not en["active"]:
            continue
        summary["active_enrollments"] += 1
        if en["goal_met_computed"]:
            summary["computed_goal_met"] += 1
        if en["goal_met_truthy"]:
            summary["field_goal_met"] += 1
        if en["goal_met_computed"] != en["goal_met_truthy"]:
            summary["field_vs_computed_mismatch"] += 1
            issues.append(
                {
                    "code": "goal_met_field_formula_mismatch",
                    "enrollment_id": eid,
                    "detail": (
                        f"{en['name']}: Goal Met?=`{en['goal_met_field'] or '(blank)'}` "
                        f"but shots={int(en['shots'])} target={int(en['target'])}"
                    ),
                }
            )

        if en["target"] <= 0:
            summary["missing_target_goal"] += 1
            if en["shots"] > 0:
                issues.append(
                    {
                        "code": "goal_met_missing_target",
                        "enrollment_id": eid,
                        "detail": f"{en['name']}: shots={int(en['shots'])} but Target Goal Shots empty/zero",
                    }
                )

        en_recipients = recipients_by_enrollment.get(eid, [])
        conquered_rows = [
            r
            for r in en_recipients
            if r["award_id"] in conquered_award_ids and norm(r["status"]) != "cancelled"
        ]
        conquered_dates = sorted({r["date_awarded"][:10] for r in conquered_rows if r["date_awarded"]})

        if en["goal_met_computed"] and not conquered_rows:
            summary["goal_met_no_conquered_award"] += 1
            issues.append(
                {
                    "code": "goal_met_no_conquered_award_row",
                    "enrollment_id": eid,
                    "detail": f"{en['name']}: shots {int(en['shots'])}/{int(en['target'])} but no Conquered Goal recipient",
                }
            )

        if conquered_rows and not en["goal_met_computed"]:
            summary["conquered_award_no_goal_met"] += 1
            issues.append(
                {
                    "code": "conquered_award_without_goal_met",
                    "enrollment_id": eid,
                    "detail": f"{en['name']}: has Conquered Goal recipient but shots {int(en['shots'])}/{int(en['target'])}",
                }
            )

        non_conquered_dates = sorted(
            {
                r["date_awarded"][:10]
                for r in en_recipients
                if r["award_id"] not in conquered_award_ids
                and r["date_awarded"]
                and norm(r["status"]) != "cancelled"
            }
        )
        goal_met_dates = sorted({d[:10] for d in en["goal_met_dates"] if d})
        if goal_met_dates and non_conquered_dates:
            polluted = [d for d in goal_met_dates if d in non_conquered_dates]
            if polluted or len(goal_met_dates) > len(conquered_dates):
                summary["goal_met_date_polluted"] += 1
                issues.append(
                    {
                        "code": "goal_met_date_lookup_polluted",
                        "enrollment_id": eid,
                        "detail": (
                            f"{en['name']}: Goal Met Date pulls all award dates "
                            f"(goal_met_dates={goal_met_dates}, conquered_dates={conquered_dates}, "
                            f"other_award_dates={non_conquered_dates[:5]})"
                        ),
                    }
                )

        if en["goal_met_computed"] or conquered_rows:
            goal_met_rows.append(
                [
                    en["name"],
                    "Y" if en["goal_met_truthy"] else "N",
                    "Y" if en["goal_met_computed"] else "N",
                    str(int(en["shots"])),
                    str(int(en["target"])),
                    str(len(conquered_rows)),
                    ", ".join(conquered_dates) or "—",
                    ", ".join(goal_met_dates[:3]) + ("…" if len(goal_met_dates) > 3 else "") or "—",
                ]
            )

    return {"issues": issues, "summary": summary, "goal_met_rows": goal_met_rows}


def build_report(
    catalog_audit: dict,
    recipient_audit: dict,
    goal_met_audit: dict,
    catalog: dict[str, dict],
    recipients: list[dict],
) -> str:
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    all_issues = catalog_audit["issues"] + recipient_audit["issues"] + goal_met_audit["issues"]
    by_code: Counter[str] = Counter(i["code"] for i in all_issues)

    lines = [
        "# Awards Catalog & Connections Audit",
        "",
        f"_Generated {now} — read-only, no Airtable writes._",
        "",
        "## Executive summary",
        "",
        f"- **Awards catalog records:** {len(catalog)}",
        f"- **Award Recipient records:** {len(recipients)}",
        f"- **Total findings:** {len(all_issues)}",
        "",
        "### Findings by code",
        "",
        md_table(["Code", "Count"], [[code, str(count)] for code, count in by_code.most_common()]),
        "",
        "### Goal Met summary (active enrollments)",
        "",
    ]
    gs = goal_met_audit["summary"]
    lines.extend(
        [
            f"- Active enrollments: **{gs['active_enrollments']}**",
            f"- Computed goal met (shots ≥ target): **{gs['computed_goal_met']}**",
            f"- Goal Met? field truthy: **{gs['field_goal_met']}**",
            f"- Goal Met? vs computed mismatch: **{gs['field_vs_computed_mismatch']}**",
            f"- Goal met but no Conquered Goal recipient: **{gs['goal_met_no_conquered_award']}**",
            f"- Conquered Goal recipient but not goal met: **{gs['conquered_award_no_goal_met']}**",
            f"- Goal Met Date polluted by non-Conquered awards: **{gs['goal_met_date_polluted']}**",
            f"- Active enrollments missing target goal: **{gs['missing_target_goal']}**",
            "",
            "> **Goal Met?** is a formula: `Total Shots Counted >= Target Goal Shots`.",
            "> **Goal Met Date** is a lookup from **all** linked Award Recipients → Date Awarded (not Conquered Goal only).",
            "",
            "## Awards catalog inventory",
            "",
            md_table(
                ["Award Name", "Email Display", "Scope", "Prize", "Prize Type", "Active", "Challenge Eligible", "Recipients", "Award ID"],
                catalog_audit["inventory_rows"],
            ),
            "",
            "## Award class buckets (catalog)",
            "",
        ]
    )

    class_rows = []
    for class_key, aids in sorted(catalog_audit["by_class"].items()):
        names = [catalog[aid]["award_name"] for aid in aids]
        class_rows.append([class_key, str(len(aids)), "; ".join(names)])
    lines.append(md_table(["Class", "Count", "Award Names"], class_rows))
    lines.append("")

    def section(title: str, code: str, limit: int = 100) -> None:
        rows = [i for i in all_issues if i["code"] == code]
        if not rows:
            return
        lines.extend([f"## {title}", "", md_table(["Record", "Detail"], [[i.get("award_id") or i.get("recipient_id") or i.get("enrollment_id", ""), i["detail"]] for i in rows], limit=limit), ""])

    section("Duplicate / ambiguous award names", "award_duplicate_norm_name")
    section("Duplicate award class buckets", "award_duplicate_class_bucket")
    section("Award name vs email display class mismatch", "award_name_display_class_mismatch")
    section("Awards missing email display name", "award_missing_email_display")
    section("Unclassified awards with recipients", "award_unclassified_with_recipients")
    section("Award configuration issues", "award_scope_flag_conflict", limit=50)
    section("Gift card / prize configuration", "award_gift_card_flag_prize_type_mismatch", limit=50)
    section("Recipient scope / week inconsistencies", "recipient_scope_vs_catalog_scope", limit=150)
    section("Recipient weekly scope missing week", "recipient_weekly_missing_week", limit=50)
    section("Recipient overall scope with challenge week", "recipient_overall_has_challenge_week", limit=50)
    section("Duplicate recipient rows (same enrollment + award + week)", "recipient_duplicate_enrollment_award_week", limit=100)
    section("Unknown award statuses", "recipient_unknown_status", limit=50)
    section("Broken or missing links", "recipient_missing_enrollment", limit=50)
    section("Goal Met field vs computed mismatch", "goal_met_field_formula_mismatch", limit=100)
    section("Goal met without Conquered Goal recipient", "goal_met_no_conquered_award_row", limit=50)
    section("Conquered Goal recipient without goal met", "conquered_award_without_goal_met", limit=50)
    section("Goal Met Date lookup polluted", "goal_met_date_lookup_polluted", limit=100)

    lines.extend(
        [
            "## Goal Met detail (active enrollments with goal met or Conquered Goal award)",
            "",
            md_table(
                ["Athlete", "Goal Met?", "Computed", "Shots", "Target", "Conquered Rows", "Conquered Dates", "Goal Met Date lookup"],
                goal_met_audit["goal_met_rows"],
                limit=100,
            ),
            "",
            "## Award Recipient status inventory",
            "",
            md_table(
                ["Status", "Count"],
                [[status, str(count)] for status, count in recipient_audit["status_counts"].most_common()],
            ),
            "",
            "## Notes",
            "",
            "- This audit is intended to diagnose **award naming**, **catalog duplication**, **recipient linkage**, and **Goal Met** consistency before close-out emails or cart fulfillment.",
            "- `Participation Award` in the catalog maps to the family-facing **Thanks for Playing** award in email tooling.",
            "- `In Amazon Cart` is treated as a valid production status even if absent from older schema snapshots.",
            "- Review duplicate class buckets first — they usually explain 'messed up' award names.",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=str(PREVIEW_DIR / "awards-catalog-audit-report.md"))
    args = parser.parse_args()

    sess = session()
    catalog = load_awards(sess)
    weeks = load_weeks(sess)
    enrollments = load_enrollments(sess)
    recipients = load_recipients(sess)

    catalog_audit = audit_awards_catalog(catalog)
    recipient_audit = audit_recipients(recipients, catalog, enrollments, weeks)
    goal_met_audit = audit_goal_met(enrollments, recipients, catalog)

    report = build_report(catalog_audit, recipient_audit, goal_met_audit, catalog, recipients)
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(report, encoding="utf-8")

    total_issues = len(catalog_audit["issues"]) + len(recipient_audit["issues"]) + len(goal_met_audit["issues"])
    print(f"Wrote {out_path}")
    print(f"Awards: {len(catalog)} | Recipients: {len(recipients)} | Findings: {total_issues}")
    print(f"Goal Met computed: {goal_met_audit['summary']['computed_goal_met']} | field: {goal_met_audit['summary']['field_goal_met']}")


if __name__ == "__main__":
    main()
