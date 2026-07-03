#!/usr/bin/env python3
"""Generate a local Final Challenge Summary HTML preview from live Airtable data."""

from __future__ import annotations

import html
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests
from dotenv import load_dotenv

BASE_ID = "appn84sqPw03zEbTT"
DEFAULT_ENROLLMENT_ID = "rec83ku1pTHmPNwRo"  # Lyle Kimm
TIME_ZONE = "America/Denver"
PREVIEW_DIR = Path(__file__).resolve().parent / "_preview"

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


def list_records(session: requests.Session, table: str) -> list[dict]:
    url = f"https://api.airtable.com/v0/{BASE_ID}/{requests.utils.quote(table)}"
    params: dict = {"pageSize": 100}
    records: list[dict] = []
    offset: str | None = None
    while True:
        if offset:
            params["offset"] = offset
        resp = session.get(url, params=params, timeout=120)
        if not resp.ok:
            raise RuntimeError(f"GET {table} -> {resp.status_code}: {resp.text[:400]}")
        data = resp.json()
        records.extend(data.get("records", []))
        offset = data.get("offset")
        if not offset:
            break
    return records


def get_record(session: requests.Session, table: str, record_id: str) -> dict:
    url = f"https://api.airtable.com/v0/{BASE_ID}/{requests.utils.quote(table)}/{record_id}"
    resp = session.get(url, timeout=60)
    resp.raise_for_status()
    return resp.json()


def first_id(value) -> str:
    if isinstance(value, list) and value:
        item = value[0]
        if isinstance(item, str):
            return item
        if isinstance(item, dict):
            return str(item.get("id") or "")
    return ""


def all_ids(value) -> list[str]:
    if not isinstance(value, list):
        return []
    out = []
    for item in value:
        if isinstance(item, str):
            out.append(item)
        elif isinstance(item, dict) and item.get("id"):
            out.append(item["id"])
    return out


def text_field(fields: dict, name: str) -> str:
    val = fields.get(name)
    if val is None:
        return ""
    if isinstance(val, list):
        return ", ".join(str(x) for x in val if x is not None)
    return str(val).strip()


def num_field(fields: dict, name: str, default: float = 0) -> float:
    val = fields.get(name)
    if isinstance(val, (int, float)):
        return float(val)
    try:
        return float(str(val or "").replace(",", ""))
    except ValueError:
        return default


def is_true(fields: dict, name: str) -> bool:
    val = fields.get(name)
    return val is True or val == 1 or str(val).lower() == "true"


def fmt_num(n: float) -> str:
    return f"{int(round(n)):,}"


def fmt_ratio(actual: float, expected: float) -> str:
    if not expected:
        return fmt_num(actual)
    return f"{fmt_num(actual)}/{fmt_num(expected)}"


def parse_date_key(value) -> str | None:
    if not value:
        return None
    if isinstance(value, str) and len(value) >= 10:
        return value[:10]
    return None


def week_sort_key(week_fields: dict) -> float:
    end = parse_date_key(week_fields.get("End Date"))
    start = parse_date_key(week_fields.get("Start Date"))
    if end:
        return datetime.fromisoformat(end.replace("Z", "+00:00")).timestamp()
    if start:
        return datetime.fromisoformat(start.replace("Z", "+00:00")).timestamp()
    return num_field(week_fields, "Week Number", 0)


def build_challenge_date_keys(weeks: list[dict]) -> set[str]:
    keys: set[str] = set()
    for week in weeks:
        start_raw = week.get("fields", {}).get("Start Date")
        end_raw = week.get("fields", {}).get("End Date")
        start_s = parse_date_key(start_raw)
        end_s = parse_date_key(end_raw)
        if not start_s or not end_s:
            continue
        start = datetime.fromisoformat(start_s)
        end = datetime.fromisoformat(end_s)
        d = start
        while d.date() <= end.date():
            keys.add(d.strftime("%Y-%m-%d"))
            d += timedelta(days=1)
    return keys


def longest_consecutive_run_from_date_keys(date_keys: set[str]) -> tuple[int, str, str]:
    """Longest calendar run of consecutive counted submission days (not XP milestone length)."""
    if not date_keys:
        return 0, "", ""
    keys = sorted(k for k in date_keys if k)
    if not keys:
        return 0, "", ""

    best_len = 1
    best_start = keys[0]
    best_end = keys[0]
    cur_start = keys[0]
    cur_len = 1

    for i in range(1, len(keys)):
        prev = datetime.fromisoformat(keys[i - 1]).date()
        cur = datetime.fromisoformat(keys[i]).date()
        if (cur - prev).days == 1:
            cur_len += 1
        else:
            if cur_len > best_len:
                best_len = cur_len
                best_start = cur_start
                best_end = keys[i - 1]
            cur_start = keys[i]
            cur_len = 1

    if cur_len > best_len:
        best_len = cur_len
        best_start = cur_start
        best_end = keys[-1]

    return best_len, best_start, best_end


def esc(value) -> str:
    return html.escape(str(value or ""))


def render_card(title: str, body: str) -> str:
    return f"""
    <div style="background:{BRAND['card']};border:1px solid {BRAND['border']};border-radius:10px;padding:10px 12px;margin:0 0 8px 0;">
      <div style="font-size:12px;line-height:1.2;font-weight:800;color:{BRAND['orange']};margin:0 0 6px 0;">{esc(title)}</div>
      <div style="font-size:9px;line-height:1.35;color:{BRAND['text']};">{body}</div>
    </div>"""


def render_stat_grid(stats: list[dict]) -> str:
    cells = []
    width = 100 / max(len(stats), 1)
    for stat in stats:
        cells.append(
            f"""
          <td style="width:{width}%;padding:4px;vertical-align:top;">
            <div style="background:#F7F9FC;border:1px solid {BRAND['border']};border-radius:8px;padding:6px 7px;text-align:center;">
              <div style="font-size:7px;color:{BRAND['muted']};text-transform:uppercase;letter-spacing:.25px;">{esc(stat['label'])}</div>
              <div style="font-size:12px;font-weight:800;color:{BRAND['blue']};margin-top:2px;">{esc(stat['value'])}</div>
            </div>
          </td>"""
        )
    return f"""
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
      <tr>{''.join(cells)}</tr>
    </table>"""


def render_requirements(rows: list[dict]) -> str:
    if not rows:
        return f"<div style='color:{BRAND['muted']};'>No requirement counters available.</div>"
    body = []
    for row in rows:
        color = BRAND["done"] if row.get("met", True) else BRAND["missed"]
        body.append(
            f"""
        <tr>
          <td style="padding:3px 6px 3px 0;font-size:9px;color:{BRAND['text']};">{esc(row['label'])}</td>
          <td style="padding:3px 0;font-size:9px;font-weight:700;color:{color};text-align:right;white-space:nowrap;">{esc(row['value'])}</td>
        </tr>"""
        )
    return f"""
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
      {''.join(body)}
    </table>"""


def render_two_col(left_title, left_items, right_title, right_items) -> str:
    def render_list(items, empty, color):
        if not items:
            return f"<div style='color:{BRAND['muted']};font-size:9px;'>{esc(empty)}</div>"
        lis = "".join(
            f"<li style='margin:0 0 3px 0;font-size:9px;color:{color};line-height:1.3;'>{esc(i)}</li>"
            for i in items
        )
        return f"<ul style='margin:0;padding-left:14px;'>{lis}</ul>"

    return f"""
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
      <tr>
        <td style="width:50%;vertical-align:top;padding-right:6px;">
          <div style="font-size:9px;font-weight:700;color:{BRAND['done']};margin:0 0 4px 0;">{esc(left_title)}</div>
          {render_list(left_items, "None", BRAND['done'])}
        </td>
        <td style="width:50%;vertical-align:top;padding-left:6px;">
          <div style="font-size:9px;font-weight:700;color:{BRAND['missed']};margin:0 0 4px 0;">{esc(right_title)}</div>
          {render_list(right_items, "None", BRAND['missed'])}
        </td>
      </tr>
    </table>"""


def render_bullets(items: list[str], empty: str) -> str:
    if not items:
        return f"<div style='color:{BRAND['muted']};font-size:9px;'>{esc(empty)}</div>"
    lis = "".join(
        f"<li style='margin:0 0 3px 0;font-size:9px;line-height:1.3;'>{esc(i)}</li>" for i in items
    )
    return f"<ul style='margin:0;padding-left:14px;'>{lis}</ul>"


def build_html(ctx: dict) -> tuple[str, str]:
    subject = f"Final Shooting Challenge Summary — {ctx['athleteName']}"
    greeting = ctx.get("firstName") or ctx["athleteName"]
    stats = [
        {"label": "Days in Challenge", "value": fmt_num(ctx["challengeDayCount"])},
        {"label": "Days Shot", "value": fmt_num(ctx["daysShot"])},
        {"label": "Days Missed", "value": fmt_num(ctx["daysMissed"])},
        {"label": "Lifetime XP", "value": fmt_num(ctx["lifetimeXp"])},
    ]
    gate = ctx.get("gateNote") or ""
    intro = f"""
    <p style="margin:0 0 6px 0;font-size:9px;">Hi {esc(greeting)},</p>
    <p style="margin:0;font-size:9px;">
      Here is your <strong>{esc(ctx['seasonLabel'])}</strong> final summary.
      Current level: <strong>{esc(ctx.get('currentLevel') or 'Unknown')}</strong>.
      {f'Next-level note: {esc(gate)}.' if gate else ''}
    </p>"""

    html_out = f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:{BRAND['bg']};font-family:Arial,Helvetica,sans-serif;color:{BRAND['text']};">
  <div style="background:{BRAND['bg']};padding:12px 8px;">
    <div style="max-width:{BRAND['width']};margin:0 auto;">
      <div style="background:{BRAND['blue']};border-radius:12px;padding:14px 16px;margin:0 0 8px 0;color:#FFFFFF;">
        <div style="font-size:8px;letter-spacing:.4px;text-transform:uppercase;opacity:.95;margin:0 0 3px 0;">Final Challenge Summary</div>
        <div style="font-size:18px;line-height:1.15;font-weight:800;margin:0 0 4px 0;">{esc(ctx['athleteName'])}</div>
        <div style="font-size:10px;line-height:1.35;opacity:.95;">{esc(ctx['seasonLabel'])} • Level {esc(ctx.get('currentLevel') or '—')}</div>
      </div>
      <div style="background:{BRAND['card']};border:1px solid {BRAND['border']};border-radius:10px;padding:10px 12px;margin:0 0 8px 0;">
        {render_stat_grid(stats)}
      </div>
      {render_card('Season Requirements', render_requirements(ctx['requirementRows']))}
      {render_card('Welcome', intro)}
      {render_card('Homework', render_two_col(f"Completed ({len(ctx['homeworkDone'])})", ctx['homeworkDone'], f"Not Completed ({len(ctx['homeworkMissed'])})", ctx['homeworkMissed']))}
      {render_card('Streaks Earned', render_bullets(ctx['streakLines'], 'No streak awards recorded.'))}
      {render_card('Milestones & Achievements', render_bullets(ctx['milestoneLines'], 'No milestones recorded.'))}
      {render_card('Video Feedback', render_two_col(f"Submitted ({len(ctx['videoSubmitted'])})", ctx['videoSubmitted'], f"Not Submitted ({len(ctx['videoMissed'])})", ctx['videoMissed']))}
      {render_card('Zoom Meetings', render_two_col(f"Attended ({len(ctx['zoomAttended'])})", ctx['zoomAttended'], f"Missed ({len(ctx['zoomMissed'])})", ctx['zoomMissed']))}
      {render_card('Awards Won', render_bullets(ctx['awardLines'], 'No awards recorded for this season.'))}
      <div style="background:{BRAND['blue']};border-radius:10px;padding:10px 12px;color:#FFFFFF;">
        <div style="font-size:9px;font-weight:700;margin:0 0 2px 0;">{esc(BRAND['brandName'])}</div>
        <div style="font-size:8px;line-height:1.35;opacity:.95;">Final Challenge Summary • Review your season and celebrate the work you put in.</div>
      </div>
    </div>
  </div>
</body>
</html>"""

    text_out = "\n".join(
        [
            "Final Challenge Summary",
            ctx["athleteName"],
            ctx["seasonLabel"],
            f"Level: {ctx.get('currentLevel') or 'Unknown'}",
            f"Days in Challenge: {ctx['challengeDayCount']}",
            f"Days Shot: {ctx['daysShot']}",
            f"Days Missed: {ctx['daysMissed']}",
            f"Lifetime XP: {ctx['lifetimeXp']}",
            "",
            "Homework completed:",
            *[f"  + {x}" for x in ctx["homeworkDone"]],
            "Homework not completed:",
            *[f"  - {x}" for x in ctx["homeworkMissed"]],
        ]
    )
    return subject, html_out, text_out


def build_context(session: requests.Session, enrollment_id: str) -> dict:
    enrollment = get_record(session, "Enrollments", enrollment_id)
    ef = enrollment.get("fields", {})

    tables = {
        "weeks": list_records(session, "Weeks"),
        "submissions": list_records(session, "Submissions"),
        "homework": list_records(session, "Homework Completions"),
        "curriculum": list_records(session, "FBC Curriculum - SYNC"),
        "streaks": list_records(session, "Streak Occurrences"),
        "unlocks": list_records(session, "Athlete Achievement Unlocks"),
        "achievements": list_records(session, "Achievements"),
        "milestones": list_records(session, "Shot Milestones"),
        "videos": list_records(session, "Video Feedback"),
        "award_recipients": list_records(session, "Award Recipients"),
        "awards": list_records(session, "Awards"),
        "zoom": list_records(session, "Zoom Meetings"),
        "config": list_records(session, "Config"),
    }

    achievement_name = {
        r["id"]: text_field(r.get("fields", {}), "Achievement Name") for r in tables["achievements"]
    }
    milestone_label = {
        r["id"]: text_field(r.get("fields", {}), "Milestone Label") for r in tables["milestones"]
    }
    award_display = {}
    for r in tables["awards"]:
        f = r.get("fields", {})
        award_display[r["id"]] = (
            text_field(f, "Email Display Name")
            or text_field(f, "Email Display Short Name")
            or text_field(f, "Award Name")
        )

    week_records = sorted(tables["weeks"], key=lambda w: week_sort_key(w.get("fields", {})))
    challenge_week_count = 0
    if tables["config"]:
        challenge_week_count = int(num_field(tables["config"][0].get("fields", {}), "Challenge Week Count", 0))
    challenge_weeks = week_records[:challenge_week_count] if challenge_week_count else week_records
    challenge_week_ids = {w["id"] for w in challenge_weeks}
    week_name_by_id = {w["id"]: text_field(w.get("fields", {}), "Week Name") for w in week_records}
    challenge_date_keys = build_challenge_date_keys(challenge_weeks)
    season_label = (
        f"{text_field(challenge_weeks[0].get('fields', {}), 'Week Name')} – {text_field(challenge_weeks[-1].get('fields', {}), 'Week Name')}"
        if challenge_weeks
        else "2025–26 Shooting Challenge"
    )

    grade_band_id = first_id(ef.get("Grade Band"))
    athlete_name = text_field(ef, "Full Athlete Name") or text_field(ef, "Full Athlete Name - Backward") or enrollment_id
    first_name = text_field(ef, "Athlete First Name")
    current_level = (
        text_field(ef, "Current Level - Public Facing Display")
        or text_field(ef, "DELETE PROBABLY - Level Name with Color (from Current Level)")
        or text_field(ef, "Level Status")
    )
    lifetime_xp = num_field(ef, "Lifetime XP Total", 0)
    gate_note = text_field(ef, "Public Gate Missing Reason")

    shot_date_keys: set[str] = set()
    submission_week_by_id: dict[str, str] = {}
    for sub in tables["submissions"]:
        sf = sub.get("fields", {})
        if first_id(sf.get("Enrollment")) != enrollment_id:
            continue
        week_id = first_id(sf.get("Week"))
        if week_id:
            submission_week_by_id[sub["id"]] = week_id
        if not is_true(sf, "Count This Submission?"):
            continue
        date_key = text_field(sf, "Activity Date Key")[:10]
        if not date_key:
            continue
        if challenge_date_keys and date_key not in challenge_date_keys:
            continue
        shot_date_keys.add(date_key)

    challenge_day_count = len(challenge_date_keys)
    days_shot = len(shot_date_keys)
    days_missed = max(0, challenge_day_count - days_shot)

    enrollment_homework = [
        h for h in tables["homework"] if first_id(h.get("fields", {}).get("Enrollment")) == enrollment_id
    ]

    def hw_satisfactory(hf: dict) -> bool:
        if is_true(hf, "Satisfactory?"):
            return True
        return text_field(hf, "Completion Status").lower() == "satisfactory"

    def curriculum_ok(cf: dict) -> bool:
        if "Active?" in cf and not is_true(cf, "Active?"):
            return False
        if "Published?" in cf and not is_true(cf, "Published?"):
            return False
        week_id = first_id(cf.get("Week"))
        if challenge_week_ids and week_id not in challenge_week_ids:
            return False
        if grade_band_id:
            bands = all_ids(cf.get("Grade Band"))
            if bands and grade_band_id not in bands:
                return False
        return True

    expected_hw = []
    for c in tables["curriculum"]:
        cf = c.get("fields", {})
        if not curriculum_ok(cf):
            continue
        week_id = first_id(cf.get("Week"))
        title = (
            text_field(cf, "Assignment Full Name - Display")
            or text_field(cf, "Assignment Title")
            or text_field(cf, "Assignment Full Name")
        )
        week_label = week_name_by_id.get(week_id, "")
        expected_hw.append(
            {
                "id": c["id"],
                "title": title,
                "week_label": week_label,
                "sort": num_field(cf, "Assignment Number", 999),
            }
        )
    expected_hw.sort(key=lambda x: x["sort"])

    homework_done = []
    homework_missed = []
    for exp in expected_hw:
        label = f"{exp['week_label']} — {exp['title']}" if exp["week_label"] else exp["title"]
        matched = False
        for h in enrollment_homework:
            hf = h.get("fields", {})
            if first_id(hf.get("Homework")) != exp["id"]:
                continue
            if hw_satisfactory(hf):
                homework_done.append(label)
                matched = True
                break
        if not matched:
            homework_missed.append(label)

    streak_lines = []
    for s in tables["streaks"]:
        sf = s.get("fields", {})
        if first_id(sf.get("Enrollment")) != enrollment_id:
            continue
        if "Active?" in sf and not is_true(sf, "Active?"):
            continue
        ach_id = first_id(sf.get("Achievement"))
        name = achievement_name.get(ach_id, "Streak")
        days = int(num_field(sf, "Streak Days", 0))
        end = text_field(sf, "Streak End Date")
        streak_lines.append(f"{name} ({days} days, ended {end})" if end else f"{name} ({days} days)")
    streak_lines.sort(reverse=True)

    longest_streak, streak_run_start, streak_run_end = longest_consecutive_run_from_date_keys(shot_date_keys)
    if longest_streak > 0 and streak_run_start and streak_run_end:
        streak_lines.insert(
            0,
            f"Longest consecutive shooting run — {longest_streak} days ({streak_run_start} – {streak_run_end})",
        )

    milestone_lines = []
    for u in tables["unlocks"]:
        uf = u.get("fields", {})
        if first_id(uf.get("Enrollment")) != enrollment_id:
            continue
        if "Active?" in uf and not is_true(uf, "Active?"):
            continue
        ach_id = first_id(uf.get("Achievement"))
        ms_id = first_id(uf.get("Shot Milestone"))
        week_id = first_id(uf.get("Week"))
        label = milestone_label.get(ms_id) or achievement_name.get(ach_id, "Achievement")
        parts = [label]
        if week_name_by_id.get(week_id):
            parts.append(week_name_by_id[week_id])
        date_label = text_field(uf, "Milestone Activity Date") or text_field(uf, "Date Unlocked")
        if date_label:
            parts.append(date_label)
        milestone_lines.append(" • ".join(parts))
    milestone_lines.sort()

    video_submitted = []
    video_weeks_hit: set[str] = set()
    for v in tables["videos"]:
        vf = v.get("fields", {})
        if first_id(vf.get("Enrollment")) != enrollment_id:
            continue
        sub_id = first_id(vf.get("Submission"))
        week_id = submission_week_by_id.get(sub_id, "")
        week_label = week_name_by_id.get(week_id, "Video")
        status = text_field(vf, "Award Status") or "Submitted"
        video_submitted.append(f"{week_label} ({status})")
        if week_label:
            video_weeks_hit.add(week_label.lower())
    video_missed = [
        week_name_by_id[w["id"]]
        for w in challenge_weeks
        if text_field(w.get("fields", {}), "Week Name")
        and text_field(w.get("fields", {}), "Week Name").lower() not in video_weeks_hit
    ]

    zoom_attended = []
    zoom_missed = []
    for z in tables["zoom"]:
        zf = z.get("fields", {})
        week_id = first_id(zf.get("Week"))
        if challenge_week_ids and week_id and week_id not in challenge_week_ids:
            continue
        week_label = week_name_by_id.get(week_id, "")
        title = text_field(zf, "Meeting Name") or week_label or "Zoom Meeting"
        line = f"{week_label} — {title}" if week_label else title
        attendees = all_ids(zf.get("Attendees"))
        if enrollment_id in attendees:
            zoom_attended.append(line)
        else:
            zoom_missed.append(line)

    award_lines = []
    for ar in tables["award_recipients"]:
        af = ar.get("fields", {})
        if first_id(af.get("Enrollment")) != enrollment_id:
            continue
        if text_field(af, "Award Status").lower() == "cancelled":
            continue
        award_id = first_id(af.get("Award"))
        name = award_display.get(award_id, "Award")
        week_id = first_id(af.get("Week"))
        parts = [name]
        scope = text_field(af, "Award Scope")
        if scope:
            parts.append(scope)
        if week_name_by_id.get(week_id):
            parts.append(week_name_by_id[week_id])
        date_awarded = text_field(af, "Date Awarded")
        if date_awarded:
            parts.append(date_awarded)
        award_lines.append(" • ".join(parts))
    award_lines.sort()

    total_shots = num_field(ef, "Total Shots Counted", 0)
    target_shots = num_field(ef, "Target Goal Shots", 0)
    if isinstance(ef.get("Target Goal Shots"), list) and ef.get("Target Goal Shots"):
        target_shots = num_field({"Target Goal Shots": ef["Target Goal Shots"][0]}, "Target Goal Shots", target_shots)
    total_subs = num_field(ef, "Total Submissions", 0)
    total_hw = num_field(ef, "Total Homework Completions", 0)
    total_vid = num_field(ef, "Total Video Submissions", 0)
    total_zoom = num_field(ef, "Total Zoom Attendances", 0)
    gate_min_hw = num_field(ef, "Gate Minimum: Homework", 0)
    gate_min_subs = num_field(ef, "Gate Minimum: Submissions", 0)
    gate_min_vid = num_field(ef, "Gate Minimum: Videos", 0)
    gate_min_zoom = num_field(ef, "Gate Minimum: Zoom Meetings", 0)
    gate_min_streak = num_field(ef, "Gate Minimum: Streak Days", 0)

    expected_vid = len(challenge_weeks)
    expected_zoom = sum(
        1
        for z in tables["zoom"]
        if not challenge_week_ids or first_id(z.get("fields", {}).get("Week")) in challenge_week_ids
    )

    requirement_rows = [
        {"label": "Homework (season)", "value": fmt_ratio(len(homework_done), len(expected_hw)), "met": len(homework_done) >= len(expected_hw)},
        {"label": "Homework (Pro gate)", "value": fmt_ratio(total_hw, gate_min_hw), "met": not gate_min_hw or total_hw >= gate_min_hw},
        {"label": "Submissions", "value": fmt_ratio(total_subs, gate_min_subs), "met": not gate_min_subs or total_subs >= gate_min_subs},
        {"label": "Videos", "value": fmt_ratio(total_vid, expected_vid or gate_min_vid), "met": total_vid >= (expected_vid or gate_min_vid)},
        {"label": "Zoom meetings", "value": fmt_ratio(total_zoom, expected_zoom or gate_min_zoom), "met": total_zoom >= (expected_zoom or gate_min_zoom)},
        {"label": "Longest streak (days)", "value": fmt_ratio(longest_streak, gate_min_streak), "met": not gate_min_streak or longest_streak >= gate_min_streak},
        {"label": "Shots counted", "value": fmt_ratio(total_shots, target_shots), "met": not target_shots or total_shots >= target_shots},
        {"label": "Shooting days", "value": fmt_ratio(days_shot, challenge_day_count), "met": challenge_day_count > 0 and days_shot >= challenge_day_count},
    ]

    return {
        "athleteName": athlete_name,
        "firstName": first_name,
        "currentLevel": current_level,
        "lifetimeXp": lifetime_xp,
        "challengeDayCount": challenge_day_count,
        "daysShot": days_shot,
        "daysMissed": days_missed,
        "requirementRows": requirement_rows,
        "homeworkDone": homework_done,
        "homeworkMissed": homework_missed,
        "streakLines": streak_lines,
        "milestoneLines": milestone_lines,
        "videoSubmitted": video_submitted,
        "videoMissed": video_missed,
        "awardLines": award_lines,
        "zoomAttended": zoom_attended,
        "zoomMissed": zoom_missed,
        "gateNote": gate_note,
        "seasonLabel": season_label,
    }


def main() -> None:
    enrollment_id = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_ENROLLMENT_ID
    token = load_token()
    session = requests.Session()
    session.headers["Authorization"] = f"Bearer {token}"

    ctx = build_context(session, enrollment_id)
    subject, html_out, text_out = build_html(ctx)

    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    safe_name = "".join(c if c.isalnum() else "-" for c in ctx["athleteName"]).strip("-").lower()
    html_path = PREVIEW_DIR / f"final-challenge-summary-{safe_name}.html"
    txt_path = PREVIEW_DIR / f"final-challenge-summary-{safe_name}.txt"
    meta_path = PREVIEW_DIR / f"final-challenge-summary-{safe_name}-meta.json"

    html_path.write_text(html_out, encoding="utf-8")
    txt_path.write_text(text_out, encoding="utf-8")
    meta_path.write_text(
        json.dumps({"enrollmentId": enrollment_id, "subject": subject, "htmlPath": str(html_path)}, indent=2),
        encoding="utf-8",
    )

    print("Final Challenge Summary preview generated.")
    print(f"Enrollment: {enrollment_id}")
    print(f"Athlete: {ctx['athleteName']}")
    print(f"Subject: {subject}")
    print(f"HTML file: {html_path}")
    print(f"Text file: {txt_path}")
    print("")
    print("Open the HTML file in your browser (double-click or drag into Chrome/Edge).")


if __name__ == "__main__":
    main()
