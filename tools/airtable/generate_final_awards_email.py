#!/usr/bin/env python3
"""
Generate end-of-season final awards email HTML from Award Recipients
where Award Status = In Amazon Cart (read-only).

  python generate_final_awards_email.py
  python generate_final_awards_email.py --force   # write HTML even if totals mismatch
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

from airtable_read import athlete_label, f, first_id, is_active, list_table, session, txt

PREVIEW_DIR = Path(__file__).resolve().parent / "_preview"
BANDS = ["K-2", "3-4", "5-6", "7-8", "9-12"]
CART_STATUS = "In Amazon Cart"
EXPECTED_TOTAL_CARDS = 70
EXPECTED_TOTAL_VALUE = 595.0

BRAND = {
    "blue": "#0034B7",
    "orange": "#FF8B00",
    "bg": "#F2F2F2",
    "text": "#262626",
    "card": "#FFFFFF",
    "border": "#D9DDE8",
    "muted": "#5E667A",
    "width": "720px",
}

AWARD_SECTIONS: list[dict] = [
    {
        "key": "conquered_goal",
        "title": "Conquered Goal Award",
        "amount": 5,
        "expected_count": 3,
        "expected_total": 15,
        "patterns": ["conquered goal"],
        "description": "Awarded to athletes who reached or exceeded their grade-band shooting goal.",
        "gift_line": "$5 Amazon Gift Card",
    },
    {
        "key": "grade_band_champion",
        "title": "Grade Band Champion Award",
        "amount": 20,
        "expected_count": 5,
        "expected_total": 100,
        "patterns": ["grade band champion"],
        "description": "Awarded to the top finisher in each grade band.",
        "gift_line": "$20 Amazon Gift Card",
    },
    {
        "key": "grade_band_runner_up",
        "title": "Grade Band Runner-Up Award",
        "amount": 15,
        "expected_count": 5,
        "expected_total": 75,
        "patterns": ["grade band runner", "grade band second", "grade band 2nd"],
        "description": "Awarded to the second-place finisher in each grade band.",
        "gift_line": "$15 Amazon Gift Card",
    },
    {
        "key": "grade_band_third",
        "title": "Grade Band Third Place Award",
        "amount": 10,
        "expected_count": 5,
        "expected_total": 50,
        "patterns": ["grade band third", "grade band 3rd"],
        "description": "Awarded to the third-place finisher in each grade band.",
        "gift_line": "$10 Amazon Gift Card",
    },
    {
        "key": "daily_shot",
        "title": "Daily Shot Submission Award",
        "amount": 12,
        "expected_count": 3,
        "expected_total": 36,
        "patterns": ["daily shot submission"],
        "description": "Awarded to athletes who showed outstanding consistency logging shots throughout the challenge.",
        "gift_line": "$12 Amazon Gift Card",
    },
    {
        "key": "keep_shooting",
        "title": "Keep Shooting Incentive Award",
        "amount": 7,
        "expected_count": 15,
        "expected_total": 105,
        "patterns": ["keep shooting"],
        "description": "Awarded to athletes who kept working, logging shots, and building better habits throughout the challenge.",
        "gift_line": "$7 Amazon Gift Card",
    },
    {
        "key": "random_drawing",
        "title": "Random Drawing Incentive Award",
        "amount": 7,
        "expected_count": 22,
        "expected_total": 154,
        "patterns": ["random drawing"],
        "description": "Awarded through a post-challenge drawing to recognize participation and effort.",
        "gift_line": "$7 Amazon Gift Card",
    },
    {
        "key": "thanks_for_playing",
        "title": "Thanks for Playing Award — Every Bit Counts",
        "amount": 5,
        "expected_count": 12,
        "expected_total": 60,
        "patterns": ["thanks for playing", "every bit counts", "participation award"],
        "description": (
            "Awarded to athletes who logged at least 20 shots, participated in the challenge, "
            "and were not already receiving another final award."
        ),
        "gift_line": "$5 Amazon Gift Card",
    },
]


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", str(s or "").strip().lower())


def flat_field(value) -> str:
    if value is None:
        return ""
    if isinstance(value, list):
        return ", ".join(flat_field(item) for item in value if item)
    if isinstance(value, dict):
        return str(value.get("name") or value.get("id") or "").strip()
    return str(value).strip()


def normalize_band(label) -> str:
    raw = flat_field(label).strip("[]").strip("'\"")
    raw = norm(raw).replace("–", "-").replace("—", "-")
    for band in BANDS:
        if norm(band) == raw:
            return band
    return raw.upper() if raw else ""


def num(value, default: float = 0.0) -> float:
    try:
        return float(str(value or "0").replace(",", "").replace("$", ""))
    except ValueError:
        return default


def esc(value) -> str:
    return html.escape(str(value or ""), quote=True)


def classify_award(name: str) -> str | None:
    n = norm(name)
    for section in AWARD_SECTIONS:
        for pat in section["patterns"]:
            if pat in n:
                return section["key"]
    return None


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
        raw = sf.get("Activity Date")
        if raw:
            days[eid].add(str(raw)[:10])
    return {k: len(v) for k, v in days.items()}


def load_enrollments(sess, submissions: list[dict]) -> dict[str, dict]:
    shot_days = shot_days_by_enrollment(submissions)
    fields = [
        "Full Athlete Name",
        "Athlete First Name",
        "Athlete Last Name",
        "Grade Band Label",
        "Grade",
        "School Name Lookup",
        "Active?",
        "Current Level - Public Facing Display",
        "Lifetime XP Total",
        "Total Shots Counted",
        "Longest Streak Days",
        "Target Goal Shots",
        "Goal Met?",
    ]
    index: dict[str, dict] = {}
    for row in list_table(sess, "Enrollments", fields):
        ef = f(row)
        eid = row["id"]
        shots = num(ef.get("Total Shots Counted"))
        target = num(ef.get("Target Goal Shots"))
        index[eid] = {
            "enrollment_id": eid,
            "name": athlete_label(ef, eid),
            "grade_band": normalize_band(ef.get("Grade Band Label")),
            "grade": flat_field(ef.get("Grade")),
            "school": flat_field(ef.get("School Name Lookup")),
            "level": flat_field(ef.get("Current Level - Public Facing Display")),
            "xp": int(num(ef.get("Lifetime XP Total"))),
            "shots": int(shots),
            "target_goal": int(target),
            "goal_met": is_active(ef.get("Goal Met?")) or (target > 0 and shots >= target),
            "longest_streak": int(num(ef.get("Longest Streak Days"))),
            "shot_days": shot_days.get(eid, 0),
            "active": is_active(ef.get("Active?")),
        }
    return index


def load_awards_catalog(sess) -> dict[str, dict]:
    catalog: dict[str, dict] = {}
    for row in list_table(
        sess,
        "Awards",
        ["Award Name", "Prize Value", "Email Display Name", "Email Display Short Name"],
    ):
        rf = f(row)
        name = txt(rf.get("Award Name"))
        display = (
            txt(rf.get("Email Display Name"))
            or txt(rf.get("Email Display Short Name"))
            or name
        )
        catalog[row["id"]] = {
            "award_name": name,
            "display_name": display,
            "prize_value": num(rf.get("Prize Value")),
            "class_key": classify_award(name) or classify_award(display),
        }
    return catalog


def load_cart_recipients(sess, awards_catalog: dict[str, dict]) -> list[dict]:
    fields = [
        "Enrollment",
        "Award",
        "Award Status",
        "Award Amount",
        "Athlete Name - Display",
        "Enrollment Name Lookup",
        "Award Scope",
        "Week",
    ]
    rows: list[dict] = []
    for row in list_table(sess, "Award Recipients", fields):
        rf = f(row)
        status = flat_field(rf.get("Award Status"))
        if norm(status) != norm(CART_STATUS):
            continue
        award_id = first_id(rf.get("Award"))
        meta = awards_catalog.get(award_id, {})
        award_name = meta.get("award_name") or ""
        display = meta.get("display_name") or award_name
        class_key = meta.get("class_key") or classify_award(award_name) or classify_award(display)
        amount = num(rf.get("Award Amount")) or meta.get("prize_value", 0)
        rows.append(
            {
                "recipient_id": row["id"],
                "enrollment_id": first_id(rf.get("Enrollment")),
                "award_id": award_id,
                "award_name": award_name,
                "award_display": display,
                "class_key": class_key,
                "amount": amount,
                "athlete_name": flat_field(rf.get("Athlete Name - Display"))
                or flat_field(rf.get("Enrollment Name Lookup")),
            }
        )
    return rows


def stat_highlight(class_key: str, enr: dict) -> str:
    if not enr:
        return ""
    if class_key == "conquered_goal":
        if enr.get("target_goal"):
            return f"{enr['shots']:,} shots (goal {enr['target_goal']:,})"
        return f"{enr['shots']:,} shots — goal met"
    if class_key in {"grade_band_champion", "grade_band_runner_up", "grade_band_third"}:
        band = enr.get("grade_band", "")
        return f"{band} · {enr['xp']:,} XP · {enr.get('level', '')}".strip(" ·")
    if class_key == "daily_shot":
        return f"{enr['shot_days']} shot days · {enr['longest_streak']}-day streak"
    if class_key == "keep_shooting":
        return f"{enr['shot_days']} shot days · {enr['shots']:,} shots"
    if class_key == "random_drawing":
        return f"{enr['shots']:,} shots logged"
    if class_key == "thanks_for_playing":
        return f"{enr['shots']:,} shots"
    return f"{enr['shots']:,} shots"


def sort_winners(class_key: str, winners: list[dict]) -> list[dict]:
    if class_key.startswith("grade_band_"):
        return sorted(
            winners,
            key=lambda w: (
                BANDS.index(w["grade_band"]) if w["grade_band"] in BANDS else 99,
                w["athlete"].lower(),
            ),
        )
    return sorted(winners, key=lambda w: w["athlete"].lower())


def enrich_winners(cart_rows: list[dict], enrollments: dict[str, dict]) -> list[dict]:
    winners: list[dict] = []
    for row in cart_rows:
        enr = enrollments.get(row["enrollment_id"], {})
        winners.append(
            {
                "recipient_id": row["recipient_id"],
                "enrollment_id": row["enrollment_id"],
                "award_id": row["award_id"],
                "class_key": row["class_key"],
                "award_display": row["award_display"],
                "amount": row["amount"],
                "athlete": enr.get("name") or row["athlete_name"] or "(unknown)",
                "grade": enr.get("grade", ""),
                "school": enr.get("school", ""),
                "grade_band": enr.get("grade_band", ""),
                "stat": stat_highlight(row["class_key"] or "", enr),
            }
        )
    return winners


def validate(cart_rows: list[dict], winners: list[dict]) -> dict:
    warnings: list[str] = []
    by_key: dict[str, list[dict]] = defaultdict(list)
    unknown_awards: list[str] = []
    dup_pairs: list[str] = []

    for row in cart_rows:
        key = row["class_key"]
        if not key:
            unknown_awards.append(row["award_display"] or row["award_name"] or row["recipient_id"])
        else:
            by_key[key].append(row)

    seen_enrollment_award: dict[tuple[str, str], list[str]] = defaultdict(list)
    for w in winners:
        if not w["athlete"] or w["athlete"] == "(unknown)":
            warnings.append(f"Missing athlete name for recipient {w['recipient_id']}")
        if not w["grade"]:
            warnings.append(f"Missing grade: {w['athlete']}")
        if not w["school"]:
            warnings.append(f"Missing school: {w['athlete']}")
        if not w["stat"]:
            warnings.append(f"Missing stat highlight: {w['athlete']}")
        pair = (w["enrollment_id"], w["class_key"] or w["award_display"])
        seen_enrollment_award[pair].append(w["recipient_id"])

    for pair, ids in seen_enrollment_award.items():
        if len(ids) > 1:
            dup_pairs.append(f"Duplicate athlete+award in cart: {pair[0]} / {pair[1]} ({len(ids)} rows)")

    total_cards = len(cart_rows)
    total_value = sum(r["amount"] for r in cart_rows)

    count_by_key = {k: len(v) for k, v in by_key.items()}
    total_by_key = {k: sum(r["amount"] for r in v) for k, v in by_key.items()}

    section_checks: list[dict] = []
    for section in AWARD_SECTIONS:
        key = section["key"]
        actual_count = count_by_key.get(key, 0)
        actual_total = total_by_key.get(key, 0.0)
        ok = actual_count == section["expected_count"] and abs(actual_total - section["expected_total"]) < 0.01
        if not ok:
            warnings.append(
                f"{section['title']}: expected {section['expected_count']} × ${section['amount']} = "
                f"${section['expected_total']}, got {actual_count} = ${actual_total:.2f}"
            )
        section_checks.append(
            {
                "key": key,
                "title": section["title"],
                "amount": section["amount"],
                "expected_count": section["expected_count"],
                "expected_total": section["expected_total"],
                "actual_count": actual_count,
                "actual_total": actual_total,
                "ok": ok,
            }
        )

    totals_ok = total_cards == EXPECTED_TOTAL_CARDS and abs(total_value - EXPECTED_TOTAL_VALUE) < 0.01
    if not totals_ok:
        warnings.append(
            f"Grand total mismatch: expected {EXPECTED_TOTAL_CARDS} cards / ${EXPECTED_TOTAL_VALUE:.2f}, "
            f"got {total_cards} / ${total_value:.2f}"
        )

    if unknown_awards:
        warnings.append(f"Unexpected award names (not in 8 final categories): {', '.join(sorted(set(unknown_awards)))}")

    warnings.extend(dup_pairs)

    return {
        "ok": totals_ok and not unknown_awards,
        "total_cards": total_cards,
        "total_value": total_value,
        "count_by_key": count_by_key,
        "total_by_key": total_by_key,
        "section_checks": section_checks,
        "warnings": warnings,
        "unknown_awards": unknown_awards,
    }


def render_table(headers: list[str], rows: list[list[str]], header_bg: str = BRAND["blue"]) -> str:
    head = "".join(
        f'<th style="padding:8px 10px;text-align:left;font-size:11px;color:#fff;background:{header_bg};border:1px solid {BRAND["border"]};">{esc(h)}</th>'
        for h in headers
    )
    body_rows = []
    for row in rows:
        cells = "".join(
            f'<td style="padding:7px 10px;font-size:11px;border:1px solid {BRAND["border"]};vertical-align:top;">{esc(c)}</td>'
            for c in row
        )
        body_rows.append(f"<tr>{cells}</tr>")
    return f"""
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin:0 0 16px 0;">
      <thead><tr>{head}</tr></thead>
      <tbody>{"".join(body_rows)}</tbody>
    </table>"""


def build_html(
    grouped_winners: dict[str, list[dict]],
    validation: dict,
    registered_athletes: int,
    total_shots: int,
    validation_failed: bool,
) -> str:
    shots_summary = f"More than {total_shots // 1000 * 1000:,}" if total_shots >= 1000 else f"{total_shots:,}"

    summary_rows = [
        ["Registered athletes", str(registered_athletes)],
        ["Counted shots", shots_summary],
        ["Grade range", "Kindergarten through 12th grade"],
        ["Award cards being sent", f"{validation['total_cards']} total Amazon gift cards"],
        ["Total award value", f"${validation['total_value']:,.0f}"],
        [
            "Main focus",
            "Daily practice habits, honest shot tracking, consistency, homework, video work, Zoom participation, and long-term growth",
        ],
    ]

    parts: list[str] = [
        "<!doctype html>",
        "<html><head>",
        '<meta charset="utf-8" />',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
        "<title>127 Sports Intensity — 2025–2026 Shooting Challenge End-of-Season Summary</title>",
        "</head>",
        f'<body style="margin:0;padding:0;background:{BRAND["bg"]};font-family:Arial,Helvetica,sans-serif;color:{BRAND["text"]};">',
        f'<div style="background:{BRAND["bg"]};padding:16px 10px;">',
        f'<div style="max-width:{BRAND["width"]};margin:0 auto;">',
        f'<div style="background:{BRAND["blue"]};border-radius:12px;padding:18px 20px;margin:0 0 12px 0;color:#fff;">',
        '<div style="font-size:11px;letter-spacing:.35px;text-transform:uppercase;opacity:.95;">127 Sports Intensity</div>',
        '<div style="font-size:20px;line-height:1.2;font-weight:800;margin-top:6px;">2025–2026 Shooting Challenge End-of-Season Summary</div>',
        "</div>",
    ]

    if validation_failed:
        parts.append(
            f'<div style="background:#FDECEC;border:1px solid #B3261E;border-radius:8px;padding:12px 14px;margin:0 0 12px 0;font-size:11px;color:#7A1111;">'
            f"<strong>Validation warning:</strong> Cart totals do not match the expected 70 cards / $595. "
            f"Review validation output before sending. Generated for preview only."
            f"</div>"
        )

    parts.extend(
        [
            f'<div style="background:{BRAND["card"]};border:1px solid {BRAND["border"]};border-radius:10px;padding:14px 16px;margin:0 0 12px 0;font-size:11px;line-height:1.55;">',
            "<p style='margin:0 0 10px 0;'>The 2025–2026 Shooting Challenge has officially wrapped up. This year's challenge included athletes from elementary school through high school, representing schools and communities across Montana and beyond.</p>",
            "<p style='margin:0;'>The Shooting Challenge is about more than shot totals. It is designed to help athletes build discipline, accountability, confidence, and better practice habits over time.</p>",
            "</div>",
            f'<div style="font-size:13px;font-weight:800;color:{BRAND["orange"]};margin:0 0 8px 0;">Challenge Summary</div>',
            render_table(["Category", "Summary"], summary_rows),
        ]
    )

    for section in AWARD_SECTIONS:
        key = section["key"]
        winners = grouped_winners.get(key, [])
        parts.append(f'<div style="margin:0 0 18px 0;">')
        parts.append(
            f'<div style="font-size:14px;font-weight:800;color:{BRAND["blue"]};margin:0 0 4px 0;">{esc(section["title"])} — {esc(section["gift_line"])}</div>'
        )
        parts.append(f'<p style="margin:0 0 8px 0;font-size:11px;line-height:1.45;color:{BRAND["muted"]};">{esc(section["description"])}</p>')
        if winners:
            table_rows = [[w["athlete"], w["grade"], w["school"], w["stat"]] for w in winners]
            parts.append(render_table(["Athlete", "Grade", "School", "Stat Highlight"], table_rows))
        else:
            parts.append(f'<p style="font-size:11px;color:{BRAND["muted"]};">No recipients in Amazon cart for this award.</p>')
        parts.append("</div>")

    footer_rows: list[list[str]] = []
    for section in AWARD_SECTIONS:
        key = section["key"]
        check = next(c for c in validation["section_checks"] if c["key"] == key)
        footer_rows.append(
            [
                section["title"],
                f"${section['amount']}",
                str(check["actual_count"]),
                f"${check['actual_total']:,.0f}",
            ]
        )
    footer_rows.append(["Total", "", f"{validation['total_cards']} cards", f"${validation['total_value']:,.0f}"])

    parts.extend(
        [
            f'<div style="font-size:13px;font-weight:800;color:{BRAND["orange"]};margin:8px 0 8px 0;">Final Award Summary</div>',
            render_table(
                ["Award Category", "Amount", "Number of Cards", "Total"],
                footer_rows,
                header_bg=BRAND["orange"],
            ),
            f'<div style="background:{BRAND["card"]};border:1px solid {BRAND["border"]};border-radius:10px;padding:14px 16px;margin:12px 0;font-size:11px;line-height:1.55;">',
            "<p style='margin:0 0 10px 0;'>Congratulations to every athlete who participated in this year's Shooting Challenge. Whether an athlete earned an award, reached a personal goal, completed homework, submitted videos, attended Zoom sessions, or simply kept showing up and tracking shots, each participant took meaningful steps forward.</p>",
            "<p style='margin:0 0 10px 0;'>Thank you to all athletes, parents, coaches, and supporters who helped make this year's challenge a success.</p>",
            "<p style='margin:0 0 10px 0;'>Keep shooting, keep improving, and keep building the habits that lead to long-term success.</p>",
            f"<p style='margin:0;font-weight:700;color:{BRAND['blue']};'>127 Sports Intensity</p>",
            "</div>",
            "</div></div></body></html>",
        ]
    )
    return "\n".join(parts)


def print_validation_summary(validation: dict) -> None:
    print("===== FINAL AWARDS EMAIL — VALIDATION =====")
    print(f"Award Status filter: {CART_STATUS}")
    print(f"Total cards: {validation['total_cards']} (expected {EXPECTED_TOTAL_CARDS})")
    print(f"Total value: ${validation['total_value']:,.2f} (expected ${EXPECTED_TOTAL_VALUE:,.2f})")
    print()
    print("Count by award:")
    for check in validation["section_checks"]:
        flag = "OK" if check["ok"] else "MISMATCH"
        print(
            f"  [{flag}] {check['title']}: {check['actual_count']} × ${check['amount']} "
            f"= ${check['actual_total']:,.2f} (expected {check['expected_count']} = ${check['expected_total']})"
        )
    print()
    if validation["warnings"]:
        print("Warnings:")
        for w in validation["warnings"]:
            print(f"  - {w}")
    else:
        print("Warnings: none")
    print()
    print(f"Validation passed: {validation['ok']}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--out",
        default=str(PREVIEW_DIR / "final-awards-end-of-season-email.html"),
        help="HTML output path",
    )
    parser.add_argument(
        "--validation-out",
        default=str(PREVIEW_DIR / "final-awards-email-validation.json"),
        help="JSON validation summary path",
    )
    parser.add_argument("--force", action="store_true", help="Write HTML even if validation fails")
    args = parser.parse_args()

    sess = session()
    awards_catalog = load_awards_catalog(sess)
    submissions = list_table(
        sess,
        "Submissions",
        ["Enrollment", "Count This Submission?", "Activity Date", "Total Shots Counted"],
    )
    enrollments = load_enrollments(sess, submissions)
    cart_rows = load_cart_recipients(sess, awards_catalog)
    winners = enrich_winners(cart_rows, enrollments)
    validation = validate(cart_rows, winners)

    grouped: dict[str, list[dict]] = defaultdict(list)
    for w in winners:
        if w["class_key"]:
            grouped[w["class_key"]].append(w)
    for key in grouped:
        grouped[key] = sort_winners(key, grouped[key])

    registered = sum(1 for e in enrollments.values() if e["active"])
    total_shots = sum(e["shots"] for e in enrollments.values() if e["active"])

    validation_path = Path(args.validation_out)
    validation_path.parent.mkdir(parents=True, exist_ok=True)
    validation_path.write_text(json.dumps(validation, indent=2), encoding="utf-8")

    print_validation_summary(validation)
    print(f"Wrote {validation_path}")

    if not validation["ok"] and not args.force:
        print("\nHTML not written — totals do not match expected 70 / $595. Re-run with --force to preview anyway.")
        sys.exit(1)

    html_out = build_html(
        grouped,
        validation,
        registered_athletes=registered,
        total_shots=total_shots,
        validation_failed=not validation["ok"],
    )
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(html_out, encoding="utf-8")
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
