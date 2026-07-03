#!/usr/bin/env python3
"""Preview personalized final challenge summary email HTML for one enrollment."""

from __future__ import annotations

import argparse
import html
import json
import re
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import requests

from airtable_read import BASE_ID, athlete_label, f, first_id, is_active, linked_ids, list_table, session, txt

DENVER = ZoneInfo("America/Denver")
PREVIEW_DIR = Path(__file__).resolve().parent / "_preview"
FINAL_EMAILS_DIR = PREVIEW_DIR / "final-emails"
DEFAULT_ENROLLMENT = "recNe84xp4corSBmm"  # Riley Geraghty
OFFICIAL_CHALLENGE_DAYS = 61
MIN_SHOTS_FOR_FINAL_EMAIL = 50  # skip final email when Total Shots Counted is not > 50
FINAL_EMAIL_REVISION = "final-summary-2026-07-03-v2"

JUNK_FEEDBACK_PHRASES = (
    "test email",
    "please disregard",
    "pelase disregard",
)

FEEDBACK_TYPO_FIXES: list[tuple[str, str]] = [
    (r"\bpelase\b", "please"),
    (r"\bPerefect\b", "Perfect"),
    (r"\biti\b", "it"),
    (r"\bsumbmissions\b", "submissions"),
    (r"\bhomeowrk\b", "homework"),
    (r"\bfeecdback\b", "feedback"),
    (r"\bYOu\b", "You"),
    (r"\bgest\b", "gets"),
    (r"\battened\b", "attended"),
    (r"\bachie3ve\b", "achieve"),
    (r"\byourvcoaches\b", "your coaches"),
    (r"\bwhqat\b", "what"),
    (r"\bYouare\b", "You are"),
    (r"\bcorreclty\b", "correctly"),
    (r"\bactiviites\b", "activities"),
    (r"\bimaginattion\b", "imagination"),
    (r"\bAccomplisment\b", "Accomplishment"),
]

CORRECTION_NOTE = "If anything in this final summary looks incorrect, please let me know and I will review it."

_TABLE_CACHE: dict[tuple[str, tuple[str, ...]], list[dict]] = {}


def clear_table_cache() -> None:
    _TABLE_CACHE.clear()


def get_table(sess: requests.Session, table: str, fields: list[str]) -> list[dict]:
    key = (table, tuple(fields))
    if key not in _TABLE_CACHE:
        _TABLE_CACHE[key] = list_table(sess, table, fields)
    return _TABLE_CACHE[key]

BRAND = {
    "brandName": "127 Sports Intensity",
    "blue": "#0034B7",
    "orange": "#FF8B00",
    "bg": "#F2F2F2",
    "text": "#262626",
    "card": "#FFFFFF",
    "border": "#D9DDE8",
    "muted": "#5E667A",
    "done": "#1B7F3A",
    "missed": "#B3261E",
    "width": "720px",
}

FINAL_AWARD_PATTERNS = [
    "conquered goal",
    "grade band champion",
    "grade band runner",
    "grade band second",
    "grade band 2nd",
    "grade band third",
    "grade band 3rd",
    "daily shot submission",
    "keep shooting",
    "random drawing",
    "thanks for playing",
    "every bit counts",
    "participation award",
]

MILESTONE_SORT = [25, 50, 75, 100, 120, 125, 150, 175, 200]


def esc(value) -> str:
    return html.escape(plain_text(value), quote=True)


def plain_text(value) -> str:
    s = flat_field(value)
    s = re.sub(r"<[^>]+>", " ", s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"\1", s)
    s = re.sub(r"\*([^*]+)\*", r"\1", s)
    s = re.sub(r"_([^_]+)_", r"\1", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def flat_field(value) -> str:
    if value is None:
        return ""
    if isinstance(value, list):
        parts = [flat_field(item) for item in value if item not in (None, "")]
        return ", ".join(part for part in parts if part)
    if isinstance(value, dict):
        return str(value.get("name") or value.get("id") or "").strip()
    return str(value).strip()


def norm(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip().lower())


def is_junk_feedback(text: str) -> bool:
    n = norm(text)
    return any(phrase in n for phrase in JUNK_FEEDBACK_PHRASES)


def clean_coach_feedback(text: str) -> str:
    if not text:
        return ""
    out = text
    for pattern, replacement in FEEDBACK_TYPO_FIXES:
        flags = re.I if pattern.startswith(r"\b") and pattern[2].islower() else 0
        out = re.sub(pattern, replacement, out, flags=flags)
    return re.sub(r"\s+", " ", out).strip()


def prepare_coach_feedback(text: str) -> str | None:
    """Return cleaned feedback, or None if the row should be excluded."""
    cleaned = clean_coach_feedback(plain_text(text))
    if not cleaned:
        return ""
    if is_junk_feedback(cleaned):
        return None
    return cleaned


def format_logged_shooting_days(days_shot: int, challenge_days: int = OFFICIAL_CHALLENGE_DAYS) -> str:
    n = int(days_shot)
    if n > challenge_days:
        return f"{fmt_num(n)} logged shooting dates"
    return f"{fmt_num(n)} logged shooting days"


def format_shooting_days_requirement_result(days_shot: int, challenge_days: int = OFFICIAL_CHALLENGE_DAYS) -> str:
    n = int(days_shot)
    if n > challenge_days:
        return f"{fmt_num(n)} logged shooting dates"
    return f"{fmt_num(n)} logged shooting days"


def format_shooting_days_requirement_goal(days_shot: int, challenge_days: int = OFFICIAL_CHALLENGE_DAYS) -> str:
    n = int(days_shot)
    if n > challenge_days:
        return f"{challenge_days}-day challenge window ({fmt_num(n)} unique dates)"
    return f"{challenge_days} challenge days"


def fmt_num(value) -> str:
    try:
        return f"{int(round(float(value))):,}"
    except (TypeError, ValueError):
        return "0"


def fmt_money(value) -> str:
    if value is None or value == "":
        return "—"
    try:
        amount = float(value)
    except (TypeError, ValueError):
        return "—"
    if amount <= 0:
        return "—"
    if amount == int(amount):
        return f"${int(amount)}"
    return f"${amount:.2f}"


def parse_amount(raw) -> float | None:
    if raw is None:
        return None
    if isinstance(raw, list):
        return parse_amount(raw[0]) if raw else None
    try:
        return float(raw)
    except (TypeError, ValueError):
        return None


def fmt_date(value) -> str:
    if not value:
        return "—"
    if isinstance(value, str):
        try:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
            return dt.astimezone(DENVER).strftime("%-m/%-d/%Y") if hasattr(dt, "astimezone") else value[:10]
        except ValueError:
            return value[:10]
    return str(value)[:10]


def fmt_date_safe(value) -> str:
    text = fmt_date(value)
    if text == "—":
        return text
    # Windows-friendly date formatting
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return dt.astimezone(DENVER).strftime("%m/%d/%Y").lstrip("0").replace("/0", "/")
    except (TypeError, ValueError):
        return text


def num_field(fields: dict, name: str, default: float = 0) -> float:
    raw = fields.get(name)
    if isinstance(raw, (int, float)):
        return float(raw)
    try:
        return float(str(raw or "").replace(",", ""))
    except ValueError:
        return default


def enrollment_total_shots(enrollment_fields: dict) -> int:
    return int(num_field(enrollment_fields, "Total Shots Counted", 0))


def qualifies_for_final_email(enrollment_fields: dict) -> bool:
    return enrollment_total_shots(enrollment_fields) > MIN_SHOTS_FOR_FINAL_EMAIL


def boolish(fields: dict, name: str) -> bool:
    raw = fields.get(name)
    return raw is True or raw == 1 or str(raw).lower() == "true"


def to_denver_date_key(value) -> str:
    if not value:
        return ""
    if isinstance(value, str):
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    else:
        dt = value
    return dt.astimezone(DENVER).strftime("%Y-%m-%d")


def parse_date_only(value) -> date | None:
    if not value:
        return None
    if isinstance(value, str):
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    else:
        dt = value
    return dt.date()


def week_sort_ts(fields: dict) -> float:
    end = parse_date_only(fields.get("End Date"))
    if end:
        return datetime.combine(end, datetime.min.time(), tzinfo=timezone.utc).timestamp()
    start = parse_date_only(fields.get("Start Date"))
    if start:
        return datetime.combine(start, datetime.min.time(), tzinfo=timezone.utc).timestamp()
    return num_field(fields, "Week Number")


def week_number_from_label(label: str) -> int:
    match = re.search(r"week\s*(\d+)", norm(label))
    return int(match.group(1)) if match else 999


def build_challenge_date_keys(weeks: list[dict]) -> set[str]:
    keys: set[str] = set()
    for week in weeks:
        wf = f(week)
        start = parse_date_only(wf.get("Start Date"))
        end = parse_date_only(wf.get("End Date"))
        if not start or not end:
            continue
        d = start
        while d <= end:
            keys.add(d.strftime("%Y-%m-%d"))
            d += timedelta(days=1)
    return keys


def longest_consecutive_run_from_date_keys(date_keys: set[str]) -> tuple[int, date | None, date | None]:
    """Longest calendar run of consecutive counted submission days (not XP milestone length)."""
    if not date_keys:
        return 0, None, None
    dates = sorted(datetime.strptime(key, "%Y-%m-%d").date() for key in date_keys if key)
    if not dates:
        return 0, None, None

    best_len = 1
    best_start = dates[0]
    best_end = dates[0]
    cur_start = dates[0]
    cur_len = 1

    for i in range(1, len(dates)):
        if (dates[i] - dates[i - 1]).days == 1:
            cur_len += 1
        else:
            if cur_len > best_len:
                best_len = cur_len
                best_start = cur_start
                best_end = dates[i - 1]
            cur_start = dates[i]
            cur_len = 1

    if cur_len > best_len:
        best_len = cur_len
        best_start = cur_start
        best_end = dates[-1]

    return best_len, best_start, best_end


def records_for_enrollment(sess: requests.Session, table: str, fields: list[str], enrollment_id: str) -> list[dict]:
    return [row for row in get_table(sess, table, fields) if first_id(f(row).get("Enrollment")) == enrollment_id]


def is_final_award_type(name: str) -> bool:
    n = norm(name)
    return any(pattern in n for pattern in FINAL_AWARD_PATTERNS)


def is_post_challenge_week(week_name: str) -> bool:
    return norm(week_name) in {"post challenge", "post-challenge"}


def classify_award_bucket(status: str, scope: str, week_name: str, award_name: str) -> str | None:
    if norm(status) == "cancelled":
        return None
    if norm(status) == "in amazon cart":
        return "entire"
    if norm(scope) == "overall":
        return "entire"
    if is_post_challenge_week(week_name):
        return "entire"
    if is_final_award_type(award_name):
        if norm(scope) == "weekly" and week_name and not is_post_challenge_week(week_name):
            return "weekly"
        return "entire"
    return "weekly"


def dedupe_award_rows(rows: list[dict]) -> tuple[list[dict], int]:
    """Drop exact duplicate recipient rows (same award, week, date, amount)."""
    seen: set[tuple] = set()
    out: list[dict] = []
    removed = 0
    for row in rows:
        key = (row.get("award_id", ""), row.get("week", ""), row.get("date", ""), row.get("amount", ""))
        if key in seen:
            removed += 1
            continue
        seen.add(key)
        out.append(row)
    return out, removed


def collapse_weekly_award_rows(rows: list[dict]) -> tuple[list[dict], int]:
    """One email line per award type; combine weeks when the same weekly award was won multiple times."""
    groups: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        groups[row.get("award_id") or row["award"]].append(row)

    collapsed: list[dict] = []
    merged_count = 0
    for items in groups.values():
        items.sort(key=lambda r: (r["weekSort"], r["dateSort"], r["award"]))
        if len(items) == 1:
            collapsed.append(items[0])
            continue
        merged_count += len(items) - 1
        week_nums = []
        for it in items:
            w = it.get("week", "")
            match = re.search(r"\d+", w)
            week_nums.append(match.group(0) if match else w)
        week_label = f"Weeks {', '.join(week_nums)}" if len(items) > 1 else items[0]["week"]
        dates = [it["date"] for it in items if it.get("date") and it["date"] != "—"]
        if len(dates) == 1:
            date_label = dates[0]
        elif dates:
            date_label = f"{dates[0]} – {dates[-1]}"
        else:
            date_label = "—"
        amounts = [it["amount"] for it in items if it.get("amount") and it["amount"] != "—"]
        if amounts and len(set(amounts)) == 1:
            per = amounts[0]
            amount_label = f"{per} each × {len(items)}" if len(items) > 1 else per
        else:
            amount_label = items[0]["amount"]
        collapsed.append(
            {
                **items[0],
                "week": week_label,
                "date": date_label,
                "amount": amount_label,
            }
        )
    collapsed.sort(key=lambda r: (r["weekSort"], r["award"]))
    return collapsed, merged_count


def family_milestone_label(percent: float, band: str = "") -> str:
    pct = int(round(percent or 0))
    if pct <= 0:
        return "Milestone reached"
    if band:
        return f"{pct}% of {band} shooting goal"
    return f"{pct}% of shooting goal"


def milestone_sort_key(percent: float) -> tuple[int, float]:
    pct = int(round(percent or 0))
    if pct in MILESTONE_SORT:
        return (MILESTONE_SORT.index(pct), pct)
    for idx, target in enumerate(MILESTONE_SORT):
        if pct < target:
            return (idx, pct)
    return (len(MILESTONE_SORT), pct)


def render_section_title(title: str) -> str:
    return f'<div style="font-size:13px;font-weight:800;color:{BRAND["orange"]};margin:0 0 8px 0;">{esc(title)}</div>'


def render_table(headers: list[str], rows: list[list[str]], right_align_cols: set[int] | None = None) -> str:
    right_align_cols = right_align_cols or set()
    week_cols = {i for i, h in enumerate(headers) if h.strip().lower() == "week"}
    week_col_style = "white-space:nowrap;width:1%;min-width:128px;"
    head = "".join(
        f'<th style="padding:8px 10px;text-align:{"right" if i in right_align_cols else "left"};font-size:11px;color:#fff;background:{BRAND["blue"]};border:1px solid {BRAND["border"]};{week_col_style if i in week_cols else ""}">{esc(h)}</th>'
        for i, h in enumerate(headers)
    )
    body_rows = []
    for row in rows:
        cells = []
        for i, cell in enumerate(row):
            align = "right" if i in right_align_cols else "left"
            cells.append(
                f'<td style="padding:7px 10px;font-size:11px;border:1px solid {BRAND["border"]};vertical-align:top;text-align:{align};{week_col_style if i in week_cols else ""}">{esc(cell)}</td>'
            )
        body_rows.append(f"<tr>{''.join(cells)}</tr>")
    if not body_rows:
        body_rows.append(
            f'<tr><td colspan="{len(headers)}" style="padding:7px 10px;font-size:11px;border:1px solid {BRAND["border"]};color:{BRAND["muted"]};">No records to show.</td></tr>'
        )
    return f"""
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin:0 0 16px 0;">
      <thead><tr>{head}</tr></thead>
      <tbody>{''.join(body_rows)}</tbody>
    </table>"""


def render_kv_table(rows: list[tuple[str, str]]) -> str:
    body = []
    for label, value in rows:
        body.append(
            f'<tr><td style="padding:7px 10px;font-size:11px;border:1px solid {BRAND["border"]};vertical-align:top;width:42%;">{esc(label)}</td>'
            f'<td style="padding:7px 10px;font-size:11px;border:1px solid {BRAND["border"]};vertical-align:top;">{esc(value)}</td></tr>'
        )
    return render_table(["Category", "Summary"], [[a, b] for a, b in rows])


def build_html(ctx: dict) -> tuple[str, str]:
    athlete_name = ctx["athleteName"]
    subject = f"Final Shooting Challenge Summary — {athlete_name}"
    shooting_days_summary = format_logged_shooting_days(ctx["daysShot"])
    snapshot_rows = [
        ("Official challenge window", f"{OFFICIAL_CHALLENGE_DAYS} days"),
        ("Logged shooting days", shooting_days_summary),
        ("Shots counted", fmt_num(ctx["totalShots"])),
        ("Lifetime XP", fmt_num(ctx["lifetimeXp"])),
        ("Final level", ctx.get("currentLevel") or "—"),
        ("Longest streak", f"{fmt_num(ctx['longestStreak'])} days"),
        ("Homework completed", f"{ctx['homeworkDoneCount']} assignments"),
        ("Video work", f"{ctx['videoReviewedCount']} reviewed"),
        ("Zoom meetings attended", fmt_num(ctx["zoomAttendedCount"])),
        ("Awards won", fmt_num(ctx["awardsWonCount"])),
    ]

    req_rows = [
        [r["requirement"], r["result"], r["goal"], r["status"]]
        for r in ctx["requirementRows"]
    ]
    hw_rows = []
    for row in ctx["homeworkRows"]:
        if row.get("complete", True):
            hw_rows.append([row["week"], row["assignment"], row["feedback"]])
        else:
            hw_rows.append([row["week"], row["assignment"], row.get("status", "Not completed")])
    hw_headers = ["Week", "Assignment", "Feedback"]
    streak_milestone_rows = [[s, m] for s, m in zip(ctx["streakLines"], ctx["milestoneLines"], strict=False)]
    if len(ctx["streakLines"]) > len(ctx["milestoneLines"]):
        for s in ctx["streakLines"][len(ctx["milestoneLines"]) :]:
            streak_milestone_rows.append([s, ""])
    elif len(ctx["milestoneLines"]) > len(ctx["streakLines"]):
        for m in ctx["milestoneLines"][len(ctx["streakLines"]) :]:
            streak_milestone_rows.append(["", m])
    video_rows = [[r["week"], r["feedback"]] for r in ctx["videoRows"]]
    zoom_rows = [[r["week"], r["meeting"], r["covered"]] for r in ctx["zoomRows"]]
    weekly_award_rows = [[r["award"], r["week"], r["date"], r["amount"]] for r in ctx["weeklyAwards"]]
    entire_award_rows = [[r["award"], r["period"], r["date"], r["amount"]] for r in ctx["entireAwards"]]

    html_out = f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:{BRAND['bg']};font-family:Arial,Helvetica,sans-serif;color:{BRAND['text']};">
  <div style="background:{BRAND['bg']};padding:16px 10px;">
    <div style="max-width:{BRAND['width']};margin:0 auto;">
      <div style="background:{BRAND['blue']};border-radius:12px;padding:18px 20px;margin:0 0 12px 0;color:#FFFFFF;">
        <div style="font-size:20px;line-height:1.2;font-weight:800;margin:0 0 4px 0;">{esc(athlete_name)}</div>
        <div style="font-size:11px;letter-spacing:.35px;text-transform:uppercase;opacity:.95;margin:0 0 6px 0;">Final Challenge Summary</div>
        <div style="font-size:13px;line-height:1.35;opacity:.95;">Final level: <strong>{esc(ctx.get('currentLevel') or '—')}</strong></div>
      </div>

      <div style="background:{BRAND['card']};border:1px solid {BRAND['border']};border-radius:10px;padding:14px 16px;margin:0 0 12px 0;font-size:11px;line-height:1.55;">
        <p style="margin:0 0 8px 0;">Here is your final 2025–2026 Shooting Challenge summary.</p>
        <p style="margin:8px 0 0 0;">{esc(CORRECTION_NOTE)}</p>
      </div>

      {render_section_title("Snapshot")}
      {render_kv_table(snapshot_rows)}

      {render_section_title("Challenge Requirements")}
      {render_table(["Requirement", "Result", "Goal / Requirement", "Status"], req_rows)}

      {render_section_title("Homework")}
      {render_table(hw_headers, hw_rows)}

      {render_section_title("Streaks and Milestones")}
      {render_table(["Streaks Earned", "Milestones Earned"], streak_milestone_rows)}

      {render_section_title("Video Feedback")}
      {render_table(["Week", "Feedback"], video_rows)}

      {render_section_title("Zoom Meetings")}
      {render_table(["Week", "Meeting", "What It Covered"], zoom_rows)}

      {render_section_title("Awards Won")}
      <div style="font-size:12px;font-weight:700;color:{BRAND['blue']};margin:0 0 6px 0;">Weekly Awards</div>
      {render_table(["Award", "Week", "Date", "Amount"], weekly_award_rows, right_align_cols={3})}
      <div style="font-size:12px;font-weight:700;color:{BRAND['blue']};margin:12px 0 6px 0;">Entire Challenge Awards</div>
      {render_table(["Award", "Period", "Date", "Amount"], entire_award_rows, right_align_cols={3})}

      <div style="background:{BRAND['card']};border:1px solid {BRAND['border']};border-radius:10px;padding:14px 16px;margin:12px 0 0 0;font-size:11px;line-height:1.55;">
        <p style="margin:0 0 8px 0;">Congratulations on finishing the 2025–2026 Shooting Challenge. The work you put in this season — showing up, tracking shots, learning, and improving — matters.</p>
        <p style="margin:0;">Keep shooting, keep building good habits, and keep pushing yourself forward.</p>
        <p style="margin:10px 0 0 0;font-weight:700;color:{BRAND['blue']};">{esc(BRAND['brandName'])}</p>
      </div>
    </div>
  </div>
</body>
</html>"""
    return subject, html_out.strip()


def build_preview(sess: requests.Session, enrollment_id: str) -> dict:
    validation_notes: list[str] = []
    missing_feedback: list[str] = []

    url = f"https://api.airtable.com/v0/{BASE_ID}/Enrollments/{enrollment_id}"
    enroll = sess.get(url, timeout=60).json()
    ef = f(enroll)

    weeks = sorted(get_table(sess, "Weeks", ["Week Name", "Start Date", "End Date", "Week Number"]), key=lambda w: week_sort_ts(f(w)))
    config_rows = get_table(sess, "Config", ["Challenge Week Count"])
    challenge_week_count = int(num_field(f(config_rows[0]) if config_rows else {}, "Challenge Week Count", 12) or 12)
    challenge_weeks = weeks[:challenge_week_count] if challenge_week_count else weeks
    challenge_week_ids = {w["id"] for w in challenge_weeks}
    week_name_by_id = {w["id"]: txt(f(w).get("Week Name")) for w in weeks}
    challenge_date_keys = build_challenge_date_keys(challenge_weeks)

    grade_band_id = first_id(ef.get("Grade Band"))
    grade_band_label = plain_text(ef.get("Grade Band Label"))
    if not grade_band_label and grade_band_id:
        for band in get_table(sess, "Grade Bands", ["Grade Band Name"]):
            if band["id"] == grade_band_id:
                grade_band_label = plain_text(txt(f(band).get("Grade Band Name")))
                break

    athlete_name = txt(ef.get("Full Athlete Name")) or txt(ef.get("Athlete First Name")) or enroll.get("id", "")
    current_level = txt(ef.get("Current Level - Public Facing Display")) or txt(ef.get("Level Status"))
    lifetime_xp = num_field(ef, "Lifetime XP Total")
    total_shots = num_field(ef, "Total Shots Counted")
    target_shots = num_field(ef, "Target Goal Shots") or parse_amount(ef.get("Target Goal Shots")) or 0
    total_subs = num_field(ef, "Total Submissions")
    total_vid = num_field(ef, "Total Video Submissions")
    total_zoom = num_field(ef, "Total Zoom Attendances")
    enrollment_streak_rollup = num_field(ef, "Longest Streak Days")

    submissions = records_for_enrollment(
        sess,
        "Submissions",
        ["Enrollment", "Week", "Count This Submission?", "Activity Date Key", "Activity Date"],
        enrollment_id,
    )
    shot_date_keys: set[str] = set()
    submission_week_by_id: dict[str, str] = {}
    for sub in submissions:
        sf = f(sub)
        week_id = first_id(sf.get("Week"))
        if week_id:
            submission_week_by_id[sub["id"]] = week_id
        if not boolish(sf, "Count This Submission?"):
            continue
        date_key = txt(sf.get("Activity Date Key")) or to_denver_date_key(sf.get("Activity Date"))
        if date_key and challenge_date_keys and date_key not in challenge_date_keys:
            continue
        if date_key:
            shot_date_keys.add(date_key)

    days_shot = len(shot_date_keys)
    days_missed = max(0, OFFICIAL_CHALLENGE_DAYS - days_shot)
    longest_streak, streak_run_start, streak_run_end = longest_consecutive_run_from_date_keys(shot_date_keys)
    if enrollment_streak_rollup and int(enrollment_streak_rollup) != int(longest_streak):
        validation_notes.append(
            f"Longest streak: using {int(longest_streak)} consecutive shooting day(s) from submissions "
            f"(enrollment rollup was {int(enrollment_streak_rollup)})"
        )

    curriculum = get_table(
        sess,
        "FBC Curriculum - SYNC",
        ["Week", "Grade Band", "Assignment Title", "Assignment Full Name", "Assignment Full Name - Display", "Assignment Number", "Order", "Active?", "Published?"],
    )
    expected_hw = []
    for row in curriculum:
        cf = f(row)
        week_id = first_id(cf.get("Week"))
        if challenge_week_ids and week_id not in challenge_week_ids:
            continue
        band_ids = linked_ids(cf.get("Grade Band"))
        if grade_band_id and band_ids and grade_band_id not in band_ids:
            continue
        if "Active?" in cf and not boolish(cf, "Active?"):
            continue
        if "Published?" in cf and not boolish(cf, "Published?"):
            continue
        title = txt(cf.get("Assignment Full Name - Display")) or txt(cf.get("Assignment Title")) or txt(cf.get("Assignment Full Name"))
        week_label = week_name_by_id.get(week_id, "")
        expected_hw.append(
            {
                "id": row["id"],
                "title": title,
                "weekLabel": week_label,
                "weekSort": week_number_from_label(week_label),
                "assignmentNumber": num_field(cf, "Assignment Number", 999),
                "order": num_field(cf, "Order", 999),
            }
        )
    expected_hw.sort(key=lambda x: (x["weekSort"], x["assignmentNumber"], x["order"]))

    homework = records_for_enrollment(
        sess,
        "Homework Completions",
        ["Enrollment", "Homework", "Week", "Satisfactory?", "Completion Status", "Coach Feedback"],
        enrollment_id,
    )
    hw_by_curriculum: dict[str, dict] = {}
    for hw in homework:
        hf = f(hw)
        hw_id = first_id(hf.get("Homework"))
        if not hw_id:
            continue
        ok = boolish(hf, "Satisfactory?") or norm(txt(hf.get("Completion Status"))) in {"satisfactory", "completed", "complete"}
        if ok:
            hw_by_curriculum[hw_id] = hw

    homework_rows = []
    homework_done_count = 0
    for exp in expected_hw:
        completion = hw_by_curriculum.get(exp["id"])
        if not completion:
            homework_rows.append(
                {
                    "week": exp["weekLabel"],
                    "assignment": exp["title"],
                    "feedback": "",
                    "status": "Not completed",
                    "complete": False,
                    "weekSort": exp["weekSort"],
                }
            )
            continue
        hf = f(completion)
        feedback = prepare_coach_feedback(txt(hf.get("Coach Feedback")))
        if feedback is None:
            validation_notes.append(f"Excluded junk homework feedback: {exp['weekLabel']} — {exp['title']}")
            homework_done_count += 1
            continue
        if not feedback:
            missing_feedback.append(f"Homework {exp['weekLabel']} — {exp['title']}")
            feedback = "—"
        homework_done_count += 1
        homework_rows.append(
            {
                "week": exp["weekLabel"],
                "assignment": exp["title"],
                "feedback": feedback,
                "status": "",
                "complete": True,
                "weekSort": exp["weekSort"],
            }
        )
    homework_rows.sort(key=lambda r: (r["weekSort"], r["assignment"]))

    achievements = {a["id"]: txt(f(a).get("Achievement Name")) for a in get_table(sess, "Achievements", ["Achievement Name"])}
    shot_milestones = {
        m["id"]: {
            "label": txt(f(m).get("Milestone Label")),
            "percent": num_field(f(m), "Milestone Percent"),
        }
        for m in get_table(sess, "Shot Milestones", ["Milestone Label", "Milestone Percent"])
    }

    streaks = records_for_enrollment(
        sess,
        "Streak Occurrences",
        ["Enrollment", "Achievement", "Streak Days", "Streak End Date", "Active?", "Source Status"],
        enrollment_id,
    )
    streak_lines = []
    for st in sorted(streaks, key=lambda r: num_field(f(r), "Streak Days"), reverse=True):
        sf = f(st)
        if "Active?" in sf and not boolish(sf, "Active?"):
            continue
        ach_id = first_id(sf.get("Achievement"))
        name = achievements.get(ach_id, "Streak")
        days = int(num_field(sf, "Streak Days"))
        end_date = fmt_date_safe(sf.get("Streak End Date"))
        streak_lines.append(f"{name} — {days} days (ended {end_date})" if end_date != "—" else f"{name} — {days} days")

    if longest_streak > 0 and streak_run_start and streak_run_end:
        run_label = (
            f"Longest consecutive shooting run — {int(longest_streak)} days "
            f"({fmt_date_safe(streak_run_start.isoformat())} – {fmt_date_safe(streak_run_end.isoformat())})"
        )
        streak_lines.insert(0, run_label)

    unlocks = records_for_enrollment(
        sess,
        "Athlete Achievement Unlocks",
        ["Enrollment", "Achievement", "Week", "Shot Milestone", "Date Unlocked", "Milestone Activity Date", "Active?"],
        enrollment_id,
    )
    milestone_items = []
    for ul in unlocks:
        uf = f(ul)
        if "Active?" in uf and not boolish(uf, "Active?"):
            continue
        sm_id = first_id(uf.get("Shot Milestone"))
        sm = shot_milestones.get(sm_id, {})
        percent = sm.get("percent", 0)
        if percent:
            label = family_milestone_label(percent, grade_band_label)
        else:
            ach_id = first_id(uf.get("Achievement"))
            label = achievements.get(ach_id, "Achievement unlocked")
        milestone_items.append((milestone_sort_key(percent), label))
    milestone_items.sort(key=lambda x: x[0])
    milestone_lines = [label for _, label in milestone_items]

    videos = records_for_enrollment(
        sess,
        "Video Feedback",
        ["Enrollment", "Submission", "Feedback Posted?", "Award Status", "Coach Feedback", "Video Feedback Name"],
        enrollment_id,
    )
    video_rows = []
    seen_video_keys: set[str] = set()
    for vid in videos:
        vf = f(vid)
        feedback_raw = plain_text(txt(vf.get("Coach Feedback")))
        posted = boolish(vf, "Feedback Posted?") or norm(txt(vf.get("Award Status"))) in {"awarded", "reviewed", "complete"}
        if not posted and not feedback_raw:
            continue
        sub_id = first_id(vf.get("Submission"))
        week_id = submission_week_by_id.get(sub_id, "")
        week_label = week_name_by_id.get(week_id, "")
        if not week_label:
            match = re.search(r"Week\s*\d+", txt(vf.get("Video Feedback Name")), re.I)
            week_label = match.group(0) if match else "Video"
        feedback = prepare_coach_feedback(feedback_raw)
        if feedback is None:
            validation_notes.append(f"Excluded junk video feedback: {week_label}")
            continue
        if not feedback:
            missing_feedback.append(f"Video {week_label}")
            feedback = "—"
        dedupe_key = f"{week_label}|{feedback[:40]}"
        if dedupe_key in seen_video_keys:
            continue
        seen_video_keys.add(dedupe_key)
        video_rows.append(
            {
                "week": week_label,
                "feedback": feedback,
                "weekSort": week_number_from_label(week_label),
            }
        )
    video_rows.sort(key=lambda r: (r["weekSort"], r["feedback"]))

    zoom_meetings = get_table(sess, "Zoom Meetings", ["Meeting Name", "Week", "Attendees", "Brief Description", "Meeting Summary", "Meeting Agenda"])
    zoom_rows = []
    for meeting in zoom_meetings:
        mf = f(meeting)
        week_id = first_id(mf.get("Week"))
        if challenge_week_ids and week_id and week_id not in challenge_week_ids:
            continue
        attendees = linked_ids(mf.get("Attendees"))
        if enrollment_id not in attendees:
            continue
        week_label = week_name_by_id.get(week_id, "")
        title = txt(mf.get("Meeting Name")) or week_label or "Zoom Meeting"
        covered = plain_text(txt(mf.get("Brief Description")) or txt(mf.get("Meeting Summary")) or txt(mf.get("Meeting Agenda")))
        if not covered:
            covered = "Challenge Zoom session"
            validation_notes.append(f"Zoom '{title}' missing description — used generic text")
        zoom_rows.append(
            {
                "week": week_label,
                "meeting": title,
                "covered": covered,
                "weekSort": week_number_from_label(week_label),
            }
        )
    zoom_rows.sort(key=lambda r: (r["weekSort"], r["meeting"]))

    awards_meta = get_table(sess, "Awards", ["Award Name", "Email Display Name", "Email Display Short Name", "Prize Value"])
    award_display = {}
    for aw in awards_meta:
        af = f(aw)
        award_display[aw["id"]] = (
            txt(af.get("Email Display Name"))
            or txt(af.get("Email Display Short Name"))
            or txt(af.get("Award Name"))
        )
    award_rows_raw = records_for_enrollment(
        sess,
        "Award Recipients",
        ["Enrollment", "Award", "Week", "Award Status", "Date Awarded", "Award Scope", "Award Amount"],
        enrollment_id,
    )
    weekly_awards = []
    entire_awards = []
    for ar in award_rows_raw:
        rf = f(ar)
        status = txt(rf.get("Award Status"))
        bucket = classify_award_bucket(status, txt(rf.get("Award Scope")), week_name_by_id.get(first_id(rf.get("Week")), ""), award_display.get(first_id(rf.get("Award")), ""))
        if not bucket:
            continue
        award_id = first_id(rf.get("Award"))
        award_name = award_display.get(award_id, "Award")
        week_name = week_name_by_id.get(first_id(rf.get("Week")), "")
        date_awarded = fmt_date_safe(rf.get("Date Awarded"))
        amount = fmt_money(parse_amount(rf.get("Award Amount")))
        row = {
            "award_id": award_id,
            "award": award_name,
            "date": date_awarded,
            "amount": amount,
            "weekSort": week_number_from_label(week_name),
            "dateSort": txt(rf.get("Date Awarded")),
        }
        if bucket == "weekly":
            row["week"] = week_name or "—"
            weekly_awards.append(row)
        else:
            row["period"] = "Entire Challenge"
            entire_awards.append(row)
    weekly_awards.sort(key=lambda r: (r["weekSort"], r["dateSort"], r["award"]))
    entire_awards.sort(key=lambda r: (r["dateSort"], r["award"]))

    weekly_raw = len(weekly_awards)
    weekly_awards, weekly_dupes_removed = dedupe_award_rows(weekly_awards)
    weekly_awards, weekly_merged = collapse_weekly_award_rows(weekly_awards)
    entire_awards, entire_dupes_removed = dedupe_award_rows(entire_awards)
    if weekly_dupes_removed or weekly_merged or entire_dupes_removed:
        validation_notes.append(
            f"Awards display: removed {weekly_dupes_removed + entire_dupes_removed} exact duplicate row(s); "
            f"collapsed {weekly_merged} repeated weekly award(s) ({weekly_raw} raw weekly -> {len(weekly_awards)} shown)"
        )

    expected_vid = len(challenge_weeks)
    expected_zoom = sum(
        1 for meeting in zoom_meetings if not challenge_week_ids or first_id(f(meeting).get("Week")) in challenge_week_ids
    )

    def status_label(met: bool) -> str:
        return "Met" if met else "Not met"

    requirement_rows = [
        {
            "requirement": "Logged shooting days",
            "result": format_shooting_days_requirement_result(days_shot),
            "goal": format_shooting_days_requirement_goal(days_shot),
            "status": status_label(days_shot >= OFFICIAL_CHALLENGE_DAYS),
        },
        {
            "requirement": "Shots counted",
            "result": fmt_num(total_shots),
            "goal": f"{fmt_num(target_shots)} season goal" if target_shots else "Track honest shot totals",
            "status": status_label(not target_shots or total_shots >= target_shots),
        },
        {
            "requirement": "Homework completed",
            "result": f"{homework_done_count} of {len(expected_hw)}",
            "goal": "Complete season homework",
            "status": status_label(homework_done_count >= len(expected_hw)),
        },
        {
            "requirement": "Video work",
            "result": f"{len(video_rows)} reviewed",
            "goal": f"{expected_vid} weekly video opportunities",
            "status": status_label(len(video_rows) >= expected_vid),
        },
        {
            "requirement": "Zoom meetings attended",
            "result": f"{len(zoom_rows)} of {expected_zoom}",
            "goal": "Attend challenge Zoom sessions",
            "status": status_label(len(zoom_rows) >= expected_zoom),
        },
        {
            "requirement": "Longest streak",
            "result": f"{fmt_num(longest_streak)} days",
            "goal": "Build a consistent shooting streak",
            "status": status_label(longest_streak > 0),
        },
        {
            "requirement": "Lifetime XP",
            "result": fmt_num(lifetime_xp),
            "goal": "Earn XP through challenge participation",
            "status": status_label(lifetime_xp > 0),
        },
    ]

    awards_won_count = len(weekly_awards) + len(entire_awards)
    ctx = {
        "athleteName": athlete_name,
        "currentLevel": current_level,
        "lifetimeXp": lifetime_xp,
        "daysShot": days_shot,
        "daysMissed": days_missed,
        "totalShots": total_shots,
        "longestStreak": longest_streak,
        "homeworkDoneCount": homework_done_count,
        "videoReviewedCount": len(video_rows),
        "zoomAttendedCount": len(zoom_rows),
        "awardsWonCount": awards_won_count,
        "requirementRows": requirement_rows,
        "homeworkRows": homework_rows,
        "streakLines": streak_lines,
        "milestoneLines": milestone_lines,
        "videoRows": video_rows,
        "zoomRows": zoom_rows,
        "weeklyAwards": weekly_awards,
        "entireAwards": entire_awards,
    }
    subject, html_out = build_html(ctx)

    validation = {
        "previewAthlete": athlete_name,
        "enrollmentId": enrollment_id,
        "weeklyAwardsShown": len(weekly_awards),
        "entireChallengeAwardsShown": len(entire_awards),
        "officialChallengeWindowDays": OFFICIAL_CHALLENGE_DAYS,
        "shootingDaysLogged": days_shot,
        "longestConsecutiveStreakDays": int(longest_streak),
        "enrollmentStreakRollupDays": int(enrollment_streak_rollup),
        "missingOrUnclearFeedback": missing_feedback,
        "notes": validation_notes,
        "uncertainFields": [],
    }
    if days_missed > 0:
        validation["notes"].append(f"{days_missed} challenge days without a logged shot (not shown as a separate section)")
    if not grade_band_label:
        validation["uncertainFields"].append("Grade band label for milestone wording")

    return {
        "enrollmentId": enrollment_id,
        "enrollmentName": athlete_name,
        "subject": subject,
        "htmlOut": html_out,
        "validation": validation,
        "counts": {
            "daysShot": days_shot,
            "daysMissed": days_missed,
            "homeworkDone": homework_done_count,
            "homeworkExpected": len(expected_hw),
            "videoReviewed": len(video_rows),
            "zoomAttended": len(zoom_rows),
            "weeklyAwards": len(weekly_awards),
            "entireAwards": len(entire_awards),
            "lifetimeXp": lifetime_xp,
        },
    }


def safe_filename(athlete_name: str, enrollment_id: str) -> str:
    slug = re.sub(r"[^\w\s-]", "", athlete_name.lower())
    slug = re.sub(r"[\s_]+", "-", slug).strip("-")[:48] or "athlete"
    return f"{slug}-{enrollment_id[-6:]}.html"


def html_to_text(html_body: str) -> str:
    text = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", html_body, flags=re.I | re.S)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"</p>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    return re.sub(r"[ \t]+\n", "\n", re.sub(r"\n{3,}", "\n\n", re.sub(r"[ \t]{2,}", " ", text))).strip()


def list_active_enrollments(sess: requests.Session) -> list[dict]:
    rows = get_table(
        sess,
        "Enrollments",
        [
            "Active?",
            "Full Athlete Name",
            "Full Athlete Name - Backward",
            "Athlete First Name",
            "Parent Email - Cleaned",
            "Athlete Email - Cleaned",
            "Total Shots Counted",
        ],
    )
    return [row for row in rows if is_active(f(row).get("Active?"))]


def build_all_previews(sess: requests.Session, out_dir: Path) -> dict:
    clear_table_cache()
    out_dir.mkdir(parents=True, exist_ok=True)
    enrollments = list_active_enrollments(sess)
    manifest: dict = {
        "revision": FINAL_EMAIL_REVISION,
        "generatedAt": datetime.now(DENVER).isoformat(),
        "activeEnrollmentCount": len(enrollments),
        "builtCount": 0,
        "skippedCount": 0,
        "errorCount": 0,
        "packages": [],
        "skipped": [],
        "errors": [],
    }

    for index, enrollment in enumerate(sorted(enrollments, key=lambda r: athlete_label(f(r), r["id"]).lower()), 1):
        enrollment_id = enrollment["id"]
        athlete_name = athlete_label(f(enrollment), enrollment_id)
        ef = f(enrollment)
        if not qualifies_for_final_email(ef):
            manifest["skippedCount"] += 1
            manifest["skipped"].append(
                {
                    "enrollmentId": enrollment_id,
                    "athleteName": athlete_name,
                    "reason": "shots_at_or_below_minimum",
                    "totalShotsCounted": enrollment_total_shots(ef),
                    "minimumRequired": MIN_SHOTS_FOR_FINAL_EMAIL,
                }
            )
            print(
                f"[{index}/{len(enrollments)}] SKIP {athlete_name} "
                f"({enrollment_total_shots(ef)} shots, need > {MIN_SHOTS_FOR_FINAL_EMAIL})"
            )
            continue
        try:
            preview = build_preview(sess, enrollment_id)
            filename = safe_filename(preview["enrollmentName"], enrollment_id)
            html_path = out_dir / filename
            html_path.write_text(preview["htmlOut"], encoding="utf-8")
            validation_path = out_dir / filename.replace(".html", ".validation.json")
            validation_path.write_text(json.dumps(preview["validation"], indent=2), encoding="utf-8")
            manifest["packages"].append(
                {
                    "enrollmentId": enrollment_id,
                    "athleteName": preview["enrollmentName"],
                    "subject": preview["subject"],
                    "htmlFile": filename,
                    "counts": preview["counts"],
                    "missingFeedback": preview["validation"].get("missingOrUnclearFeedback", []),
                    "notes": preview["validation"].get("notes", []),
                }
            )
            manifest["builtCount"] += 1
            print(f"[{index}/{len(enrollments)}] {preview['enrollmentName']} -> {filename}")
        except Exception as exc:
            manifest["errorCount"] += 1
            manifest["errors"].append({"enrollmentId": enrollment_id, "athleteName": athlete_name, "error": str(exc)})
            print(f"[{index}/{len(enrollments)}] ERROR {athlete_name}: {exc}")

    manifest_path = out_dir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    index_lines = [
        "<!doctype html><html><head><meta charset='utf-8'><title>Final Email Packages</title>",
        "<style>body{font-family:Arial,sans-serif;margin:24px;} table{border-collapse:collapse;width:100%;}",
        "th,td{border:1px solid #ccc;padding:8px;text-align:left;font-size:13px;} th{background:#0034B7;color:#fff;}</style>",
        "</head><body>",
        f"<h1>Final Challenge Summary Emails ({manifest['builtCount']})</h1>",
        "<table><thead><tr><th>Athlete</th><th>Subject</th><th>HTML</th><th>Flags</th></tr></thead><tbody>",
    ]
    for pkg in manifest["packages"]:
        flags = []
        if pkg["missingFeedback"]:
            flags.append(f"missing feedback ({len(pkg['missingFeedback'])})")
        if pkg["notes"]:
            flags.append(f"notes ({len(pkg['notes'])})")
        flag_text = "; ".join(flags) if flags else "—"
        index_lines.append(
            f"<tr><td>{html.escape(pkg['athleteName'])}</td>"
            f"<td>{html.escape(pkg['subject'])}</td>"
            f'<td><a href="{html.escape(pkg["htmlFile"])}">open</a></td>'
            f"<td>{html.escape(flag_text)}</td></tr>"
        )
    index_lines.append("</tbody></table></body></html>")
    (out_dir / "index.html").write_text("".join(index_lines), encoding="utf-8")
    return manifest


def print_validation_summary(validation: dict) -> None:
    print("===== INDIVIDUAL FINAL SUMMARY — VALIDATION =====")
    print(f"Preview athlete: {validation['previewAthlete']}")
    print(f"Weekly awards shown: {validation['weeklyAwardsShown']}")
    print(f"Entire challenge awards shown: {validation['entireChallengeAwardsShown']}")
    print(f"Official challenge window: {validation['officialChallengeWindowDays']} days")
    print(f"Shooting days logged: {validation['shootingDaysLogged']}")
    if validation["missingOrUnclearFeedback"]:
        print("Missing or unclear feedback:")
        for item in validation["missingOrUnclearFeedback"]:
            print(f"  - {item}")
    else:
        print("Missing or unclear feedback: none")
    if validation["notes"]:
        print("Notes:")
        for note in validation["notes"]:
            print(f"  - {note}")
    if validation["uncertainFields"]:
        print("Uncertain fields:")
        for item in validation["uncertainFields"]:
            print(f"  - {item}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Preview personalized final challenge summary email for one athlete.")
    parser.add_argument("enrollment_id", nargs="?", default=DEFAULT_ENROLLMENT)
    parser.add_argument("--all", action="store_true", help="Build HTML packages for every Active? enrollment.")
    parser.add_argument("--html-out", default=str(PREVIEW_DIR / "geraghty-final-email.html"))
    parser.add_argument("--json-out", default=str(PREVIEW_DIR / "geraghty-final-email-validation.json"))
    parser.add_argument("--out-dir", default=str(FINAL_EMAILS_DIR), help="Output folder for --all.")
    args = parser.parse_args()

    sess = session()
    if args.all:
        manifest = build_all_previews(sess, Path(args.out_dir))
        print("===== BATCH FINAL EMAIL BUILD =====")
        print(f"Active enrollments: {manifest['activeEnrollmentCount']}")
        print(f"Built: {manifest['builtCount']}")
        print(f"Skipped: {manifest['skippedCount']} (need > {MIN_SHOTS_FOR_FINAL_EMAIL} shots counted)")
        print(f"Errors: {manifest['errorCount']}")
        print(f"Manifest: {Path(args.out_dir) / 'manifest.json'}")
        print(f"Index: {Path(args.out_dir) / 'index.html'}")
        return

    preview = build_preview(sess, args.enrollment_id)
    print_validation_summary(preview["validation"])

    html_path = Path(args.html_out)
    html_path.parent.mkdir(parents=True, exist_ok=True)
    html_path.write_text(preview["htmlOut"], encoding="utf-8")
    print(f"Wrote {html_path}")

    if args.json_out:
        json_path = Path(args.json_out)
        json_path.write_text(json.dumps(preview["validation"], indent=2), encoding="utf-8")
        print(f"Wrote {json_path}")


if __name__ == "__main__":
    main()
