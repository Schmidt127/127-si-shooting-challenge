#!/usr/bin/env python3
"""Run Final 090 pre-close audits (090A–090G) via Airtable REST API — read-only."""

from __future__ import annotations

import json
import os
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import requests
from dotenv import load_dotenv

BASE_ID = "appn84sqPw03zEbTT"
SCHEMA_SNAPSHOT = "20260629_045741"
SAMPLE_LIMIT = 25
TOLERANCE = 0

PROBLEM_G_CATEGORIES = [
    "should_have_sent_never_built",
    "package_built_not_sent",
    "missing_recipient",
    "missing_enrollment_or_week",
    "error_blocked",
    "needs_manual_review",
]

F090_ISSUE_KEYS = [
    "missing_enrollment",
    "missing_achievement",
    "empty_week",
    "missing_xp",
    "duplicate_xp",
    "xp_points_mismatch",
    "duplicate_unlock_key_source_key",
    "duplicate_unlock_key_enrollment_achievement_week",
]


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


def list_table(session: requests.Session, table: str, fields: list[str] | None = None) -> list[dict]:
    if not fields:
        return _fetch_records(session, table, None)
    remaining = list(fields)
    while remaining:
        try:
            return _fetch_records(session, table, remaining)
        except RuntimeError as exc:
            msg = str(exc)
            if "UNKNOWN_FIELD_NAME" not in msg:
                raise
            match = re.search(r'Unknown field name: \\?"([^"\\]+)\\?"', msg)
            if not match or match.group(1) not in remaining:
                raise
            remaining.remove(match.group(1))
    return _fetch_records(session, table, None)


def _fetch_records(session: requests.Session, table: str, fields: list[str] | None) -> list[dict]:
    url = f"https://api.airtable.com/v0/{BASE_ID}/{requests.utils.quote(table)}"
    records: list[dict] = []
    offset: str | None = None
    while True:
        params: dict = {"pageSize": 100}
        for i, name in enumerate(fields):
            params[f"fields[{i}]"] = name
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


def fields_of(rec: dict) -> dict:
    return rec.get("fields", {})


def txt(value) -> str:
    if value is None:
        return ""
    if isinstance(value, dict) and "name" in value:
        return str(value["name"]).strip()
    if isinstance(value, list):
        return ", ".join(txt(x) for x in value if x is not None)
    return str(value).strip()


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


def num(value) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(str(value or "0").replace(",", ""))
    except ValueError:
        return 0.0


def is_active(value) -> bool:
    return value is True or value == 1 or str(value).lower() == "true"


def select_name(value) -> str:
    if isinstance(value, dict) and value.get("name"):
        return str(value["name"]).strip()
    return txt(value)


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


def bump(counts: dict, key: str, n: int = 1) -> None:
    counts[key] = counts.get(key, 0) + n


def issue_total(counts: dict, exclude: set[str]) -> int:
    return sum(v for k, v in counts.items() if k not in exclude)


def index_by_id(records: list[dict]) -> dict[str, dict]:
    return {r["id"]: r for r in records}


class AuditContext:
    def __init__(self, session: requests.Session) -> None:
        self.session = session
        self.active_ids: set[str] = set()
        self.enrollments: list[dict] = []
        self.submissions: list[dict] = []
        self.xp_events: list[dict] = []
        self.homework: list[dict] = []
        self.unlocks: list[dict] = []
        self.streaks: list[dict] = []
        self.video: list[dict] = []
        self.zoom: list[dict] = []
        self.was: list[dict] = []
        self.weeks: list[dict] = []
        self.quiz: list[dict] = []

    def load(self) -> None:
        print("Loading Airtable data...")
        self.enrollments = list_table(
            self.session,
            "Enrollments",
            ["Active?", "Lifetime XP Earned", "XP Events", "Parent Email - Cleaned", "Athlete Email - Cleaned"],
        )
        self.active_ids = {
            r["id"] for r in self.enrollments if is_active(fields_of(r).get("Active?"))
        }

        self.submissions = list_table(
            self.session,
            "Submissions",
            ["Enrollment", "Week", "Count This Submission?", "XP Award Status", "XP Events", "Weekly Athlete Summary"],
        )
        self.xp_events = list_table(
            self.session,
            "XP Events",
            [
                "Source Key",
                "Submission",
                "Enrollment",
                "Week",
                "XP Points",
                "XP Source",
                "XP Bucket",
                "Active?",
                "Homework Completion",
                "Weekly Athlete Summary",
                "Achievement Unlock",
                "Streak Occurrence",
                "Video Feedback",
                "Zoom Meeting",
                "XP Dedupe Key Normalized",
            ],
        )
        self.homework = list_table(
            self.session,
            "Homework Completions",
            [
                "Enrollment",
                "Homework",
                "Week",
                "Weekly Athlete Summary Link",
                "Satisfactory?",
                "Review Complete",
                "Coach Feedback",
                "Total Homework XP Awarded",
                "Award Status",
                "XP Events",
                "Homework Completion Key",
                "Submission Date",
                "Final Reflection Quiz Submissions",
            ],
        )
        self.unlocks = list_table(
            self.session,
            "Athlete Achievement Unlocks",
            [
                "Enrollment",
                "Achievement",
                "Week",
                "Shot Milestone",
                "Milestone Source Key",
                "XP Award Status",
                "XP Awarded",
                "XP Events",
                "Milestone Activity Date",
            ],
        )
        self.streaks = list_table(
            self.session,
            "Streak Occurrences",
            [
                "Enrollment",
                "Achievement",
                "Week",
                "Streak End Date",
                "Source Status",
                "XP Events",
                "Streak Occurrence Key",
            ],
        )
        self.video = list_table(
            self.session,
            "Video Feedback",
            [
                "Submission",
                "Enrollment",
                "Total Video XP Awarded",
                "Do Not Award XP?",
                "Award Status",
                "Feedback Posted?",
                "Active?",
                "Ready for XP Automation?",
                "XP Events",
                "Upload Status",
            ],
        )
        self.zoom = list_table(
            self.session,
            "Zoom Meetings",
            ["Attendees", "Week", "Meeting Status", "Zoom Meeting Key", "Start Time", "Start Date", "Meeting Date", "Date"],
        )
        self.was = list_table(
            self.session,
            "Weekly Athlete Summary",
            [
                "Enrollment",
                "Week",
                "Build Weekly Email Now?",
                "Weekly Email Ready?",
                "Weekly Email Sent?",
                "Send to Make?",
                "Weekly Email Subject",
                "Weekly Email Recipients",
                "Weekly Email HTML",
                "Weekly Email Error",
            ],
        )
        self.weeks = list_table(
            self.session,
            "Weeks",
            ["End Date", "Week End Date", "Ends On", "Week Ending", "End"],
        )
        try:
            self.quiz = list_table(
                self.session,
                "Final Reflection Quiz Submissions",
                ["Enrollment", "Homework Completion"],
            )
        except RuntimeError:
            self.quiz = []
        print(f"  Active enrollments: {len(self.active_ids)}")


def audit_090a(ctx: AuditContext) -> dict:
    xp_by_key: dict[str, list[str]] = defaultdict(list)
    xp_by_id = index_by_id(ctx.xp_events)
    for xp in ctx.xp_events:
        sk = txt(fields_of(xp).get("Source Key"))
        if sk:
            xp_by_key[sk].append(xp["id"])

    def is_sub_base(xp: dict, submission_id: str) -> bool:
        f = fields_of(xp)
        sk = txt(f.get("Source Key"))
        expected = f"SUBMISSION_XP|{submission_id}"
        return (
            sk == expected
            or sk.startswith("SUBMISSION_XP|")
            or select_name(f.get("XP Source")) == "Submission Base"
            or select_name(f.get("XP Bucket")) == "Shooting Base"
        )

    def get_sub_xp_ids(submission_id: str) -> list[str]:
        expected = f"SUBMISSION_XP|{submission_id}"
        ids = set(xp_by_key.get(expected, []))
        for xp in ctx.xp_events:
            if submission_id not in linked_ids(fields_of(xp).get("Submission")):
                continue
            if is_sub_base(xp, submission_id):
                ids.add(xp["id"])
        return list(ids)

    counts: dict[str, int] = {}
    scoped = 0
    samples: list[dict] = []

    for sub in ctx.submissions:
        f = fields_of(sub)
        eid = first_id(f.get("Enrollment"))
        if not eid or eid not in ctx.active_ids:
            continue
        if num(f.get("Count This Submission?")) != 1:
            continue
        scoped += 1
        sid = sub["id"]
        expected = f"SUBMISSION_XP|{sid}"
        by_key = xp_by_key.get(expected, [])
        xp_ids = get_sub_xp_ids(sid)
        status = select_name(f.get("XP Award Status"))
        issue = None
        if not xp_ids:
            issue = "missing_submission_xp"
        elif len(xp_ids) > 1 or len(by_key) > 1:
            issue = "duplicate_submission_base_xp"
        elif not by_key and xp_ids:
            issue = "legacy_source_key_or_missing_prefix"
        elif status != "Awarded":
            issue = "xp_award_status_not_awarded"
        if issue:
            bump(counts, issue)
            if len(samples) < SAMPLE_LIMIT:
                samples.append({"submissionId": sid, "enrollmentId": eid, "issue": issue})
        else:
            bump(counts, "clean")

    total = issue_total(counts, {"clean"})
    return {
        "id": "090A",
        "name": "Submission Base XP",
        "pass": total == 0,
        "issueTotal": total,
        "issueCounts": counts,
        "scoped": scoped,
        "samples": samples,
    }


def audit_090b(ctx: AuditContext) -> dict:
    xp_by_key: dict[str, list[str]] = defaultdict(list)
    xp_by_id = index_by_id(ctx.xp_events)
    for xp in ctx.xp_events:
        sk = txt(fields_of(xp).get("Source Key"))
        if sk:
            xp_by_key[sk].append(xp["id"])

    summary_index: dict[str, str] = {}
    for s in ctx.was:
        f = fields_of(s)
        eid = first_id(f.get("Enrollment"))
        wid = first_id(f.get("Week"))
        if eid and wid:
            summary_index[f"{eid}|{wid}"] = s["id"]

    quiz_by_hw: dict[str, str] = {}
    for q in ctx.quiz:
        hw = first_id(fields_of(q).get("Homework Completion"))
        if hw:
            quiz_by_hw[hw] = q["id"]

    def hw_keys(hw_id: str) -> list[str]:
        return [f"HOMEWORK_XP|{hw_id}", f"HOMEWORK_COMPLETION|{hw_id}"]

    def belongs(xp: dict, hw_id: str) -> bool:
        f = fields_of(xp)
        sk = txt(f.get("Source Key"))
        return sk in hw_keys(hw_id) or hw_id in linked_ids(f.get("Homework Completion"))

    def get_hw_xp(hw_id: str, linked: list[str]) -> list[str]:
        ids = set()
        for xid in linked:
            xp = xp_by_id.get(xid)
            if xp and belongs(xp, hw_id):
                ids.add(xid)
        for sk in hw_keys(hw_id):
            for xid in xp_by_key.get(sk, []):
                ids.add(xid)
        return list(ids)

    def is_hw17(rec: dict) -> bool:
        f = fields_of(rec)
        combined = f"{rec['id']} {txt(f.get('Homework'))} {txt(f.get('Homework Completion Key'))}".lower()
        return any(h in combined for h in ("hw17", "homework 17", "final reflection"))

    def readiness(f: dict) -> bool:
        if not linked_ids(f.get("Enrollment")):
            return False
        if not linked_ids(f.get("Homework")):
            return False
        if not linked_ids(f.get("Week")):
            return False
        if not txt(f.get("Coach Feedback")):
            return False
        if not is_active(f.get("Satisfactory?")):
            return False
        if not is_active(f.get("Review Complete")):
            return False
        if num(f.get("Total Homework XP Awarded")) <= 0:
            return False
        if not (f.get("Submission Date")):
            return False
        return True

    counts: dict[str, int] = {}
    samples: list[dict] = []
    scoped = 0

    for hw in ctx.homework:
        f = fields_of(hw)
        eid = first_id(f.get("Enrollment"))
        if not eid or eid not in ctx.active_ids:
            continue
        scoped += 1
        hw_id = hw["id"]
        if not readiness(f):
            bump(counts, "excluded_not_ready")
            continue
        if is_hw17(hw):
            quiz_links = linked_ids(f.get("Final Reflection Quiz Submissions"))
            if not quiz_links and hw_id not in quiz_by_hw:
                bump(counts, "hw17_missing_quiz_link")
                if len(samples) < SAMPLE_LIMIT:
                    samples.append({"homeworkId": hw_id, "issue": "hw17_missing_quiz_link"})
        linked_xp = linked_ids(f.get("XP Events"))
        xp_ids = get_hw_xp(hw_id, linked_xp)
        expected_key = f"HOMEWORK_XP|{hw_id}"
        total_xp = num(f.get("Total Homework XP Awarded"))
        week_id = first_id(f.get("Week"))
        award = select_name(f.get("Award Status"))
        issue = None
        if not xp_ids:
            issue = "missing_xp_event"
        elif len(xp_ids) > 1:
            issue = "duplicate_xp_event"
        else:
            xp = xp_by_id[xp_ids[0]]
            xf = fields_of(xp)
            psk = txt(xf.get("Source Key"))
            pts = num(xf.get("XP Points"))
            pwas = first_id(xf.get("Weekly Athlete Summary"))
            expected_was = first_id(f.get("Weekly Athlete Summary Link")) or summary_index.get(f"{eid}|{week_id}", "")
            if psk and psk != expected_key:
                issue = "source_key_mismatch"
            elif pts != total_xp:
                issue = "xp_points_mismatch"
            elif award != "Awarded":
                issue = "award_status_gap"
            elif expected_was and not pwas:
                issue = "missing_weekly_summary_on_xp"
        if issue:
            bump(counts, issue)
            if len(samples) < SAMPLE_LIMIT:
                samples.append({"homeworkId": hw_id, "enrollmentId": eid, "issue": issue})
        else:
            bump(counts, "clean")

    for xp in ctx.xp_events:
        f = fields_of(xp)
        eid = first_id(f.get("Enrollment"))
        if not eid or eid not in ctx.active_ids:
            continue
        sk = txt(f.get("Source Key"))
        if not (sk.startswith("HOMEWORK_XP|") or sk.startswith("HOMEWORK_COMPLETION|")):
            continue
        if not linked_ids(f.get("Homework Completion")):
            bump(counts, "orphan_homework_xp")

    total = issue_total(counts, {"clean", "excluded_not_ready"})
    return {
        "id": "090B",
        "name": "Homework XP",
        "pass": total == 0,
        "issueTotal": total,
        "issueCounts": counts,
        "scoped": scoped,
        "samples": samples,
    }


def audit_090c(ctx: AuditContext) -> dict:
    xp_by_key: dict[str, list[str]] = defaultdict(list)
    xp_by_id = index_by_id(ctx.xp_events)
    for xp in ctx.xp_events:
        sk = txt(fields_of(xp).get("Source Key"))
        if sk:
            xp_by_key[sk].append(xp["id"])

    def unlock_key(rec: dict) -> str:
        f = fields_of(rec)
        stored = txt(f.get("Milestone Source Key"))
        if stored:
            return stored
        eid = first_id(f.get("Enrollment"))
        sm = first_id(f.get("Shot Milestone"))
        wid = first_id(f.get("Week"))
        if eid and sm:
            return f"SHOT_MILESTONE|{eid}|{sm}"
        if eid and wid:
            return f"PERFECT_WEEK|{eid}|{wid}"
        return ""

    def streak_key(rec: dict) -> str:
        f = fields_of(rec)
        eid = first_id(f.get("Enrollment"))
        aid = first_id(f.get("Achievement"))
        dk = to_date_key(f.get("Streak End Date"))
        if eid and aid and dk:
            return f"STREAK_XP|{eid}|{aid}|{dk}"
        return ""

    counts: dict[str, int] = {}
    samples: list[dict] = []
    unlocks_checked = streaks_checked = 0

    for u in ctx.unlocks:
        f = fields_of(u)
        eid = first_id(f.get("Enrollment"))
        if not eid or eid not in ctx.active_ids:
            continue
        unlocks_checked += 1
        uid = u["id"]
        status = select_name(f.get("XP Award Status"))
        exp_key = unlock_key(u)
        linked = linked_ids(f.get("XP Events"))
        key_ids = xp_by_key.get(exp_key, []) if exp_key else []
        xp_ids = list(
            {
                xid
                for xid in set(linked + key_ids)
                if (xp := xp_by_id.get(xid))
                and (
                    txt(fields_of(xp).get("Source Key")) == exp_key
                    or uid in linked_ids(fields_of(xp).get("Achievement Unlock"))
                )
            }
        )
        expected_xp = num(f.get("XP Awarded"))
        issue = None
        if status == "Pending" and xp_ids:
            issue = "unlock_pending_with_xp"
        elif status != "Awarded":
            bump(counts, "excluded_not_ready")
            continue
        elif not first_id(f.get("Week")) and not first_id(f.get("Shot Milestone")):
            issue = "unlock_empty_week"
        elif not xp_ids:
            issue = "unlock_missing_xp"
        elif len(xp_ids) > 1:
            issue = "unlock_duplicate_xp"
        else:
            xp = xp_by_id[xp_ids[0]]
            xf = fields_of(xp)
            if exp_key and txt(xf.get("Source Key")) != exp_key:
                issue = "unlock_source_key_mismatch"
            elif expected_xp > 0 and num(xf.get("XP Points")) != expected_xp:
                issue = "unlock_xp_points_mismatch"
        if issue:
            bump(counts, issue)
            if len(samples) < SAMPLE_LIMIT:
                samples.append({"unlockId": uid, "enrollmentId": eid, "issue": issue})
        else:
            bump(counts, "clean")

    for s in ctx.streaks:
        f = fields_of(s)
        eid = first_id(f.get("Enrollment"))
        if not eid or eid not in ctx.active_ids:
            continue
        streaks_checked += 1
        oid = s["id"]
        status = select_name(f.get("Source Status"))
        exp_key = streak_key(s)
        linked = linked_ids(f.get("XP Events"))
        key_ids = xp_by_key.get(exp_key, []) if exp_key else []
        xp_ids = list(
            {
                xid
                for xid in set(linked + key_ids)
                if (xp := xp_by_id.get(xid))
                and (
                    txt(fields_of(xp).get("Source Key")) == exp_key
                    or oid in linked_ids(fields_of(xp).get("Streak Occurrence"))
                )
            }
        )
        issue = None
        if status != "Awarded":
            bump(counts, "excluded_not_ready")
            continue
        elif not xp_ids:
            issue = "streak_missing_xp"
        elif len(xp_ids) > 1:
            issue = "streak_duplicate_xp"
        else:
            xp = xp_by_id[xp_ids[0]]
            if exp_key and txt(fields_of(xp).get("Source Key")) != exp_key:
                issue = "streak_source_key_mismatch"
        if issue:
            bump(counts, issue)
            if len(samples) < SAMPLE_LIMIT:
                samples.append({"streakId": oid, "enrollmentId": eid, "issue": issue})
        else:
            bump(counts, "clean")

    total = issue_total(counts, {"clean", "excluded_not_ready"})
    return {
        "id": "090C",
        "name": "Streaks / Milestones / Perfect Week XP",
        "pass": total == 0,
        "issueTotal": total,
        "issueCounts": counts,
        "unlocksChecked": unlocks_checked,
        "streaksChecked": streaks_checked,
        "samples": samples,
    }


def audit_090d(ctx: AuditContext) -> dict:
    xp_by_key: dict[str, list[str]] = defaultdict(list)
    xp_by_id = index_by_id(ctx.xp_events)
    sub_by_id = index_by_id(ctx.submissions)
    for xp in ctx.xp_events:
        sk = txt(fields_of(xp).get("Source Key"))
        if sk:
            xp_by_key[sk].append(xp["id"])

    summary_index: dict[str, list[str]] = defaultdict(list)
    for s in ctx.was:
        f = fields_of(s)
        eid = first_id(f.get("Enrollment"))
        wid = first_id(f.get("Week"))
        if eid and wid:
            summary_index[f"{eid}|{wid}"].append(s["id"])

    def video_key(vid: str) -> str:
        return f"VIDEO_SUBMISSION|{vid}"

    def belongs_video(xp: dict, vid: str) -> bool:
        f = fields_of(xp)
        sk = txt(f.get("Source Key"))
        dk = txt(f.get("XP Dedupe Key Normalized"))
        exp = video_key(vid)
        if sk == exp or dk == exp:
            return True
        if sk.lower().startswith("video_submission|") and sk.split("|", 1)[-1] == vid:
            return True
        return vid in linked_ids(f.get("Video Feedback"))

    def video_readiness(f: dict) -> tuple[bool, list[str]]:
        missing: list[str] = []
        award = select_name(f.get("Award Status"))
        total = num(f.get("Total Video XP Awarded"))
        do_not = is_active(f.get("Do Not Award XP?"))
        has_sub = bool(linked_ids(f.get("Submission")))
        has_enr = bool(linked_ids(f.get("Enrollment")))
        if do_not or award == "Do Not Award":
            missing.append("do_not_award_xp")
        if "Active?" in f and not is_active(f.get("Active?")):
            missing.append("inactive")
        if award == "Awarded" and total > 0 and not do_not:
            if not has_sub:
                missing.append("submission")
            if not has_enr:
                missing.append("enrollment")
            return len(missing) == 0, missing
        if "Feedback Posted?" in f and not is_active(f.get("Feedback Posted?")):
            missing.append("feedback_not_posted")
        if "Ready for XP Automation?" in f and not is_active(f.get("Ready for XP Automation?")):
            missing.append("not_ready_for_xp_automation")
        if not has_sub:
            missing.append("submission")
        if not has_enr:
            missing.append("enrollment")
        if total <= 0:
            missing.append("zero_xp")
        return len(missing) == 0, missing

    video_counts: dict[str, int] = {}
    zoom_counts: dict[str, int] = {}
    video_samples: list[dict] = []
    zoom_samples: list[dict] = []
    video_scoped = 0

    for v in ctx.video:
        f = fields_of(v)
        eid = first_id(f.get("Enrollment"))
        if not eid or eid not in ctx.active_ids:
            continue
        video_scoped += 1
        vid = v["id"]
        ready, missing = video_readiness(f)
        if not ready:
            bump(video_counts, "video_not_ready_for_xp")
            continue
        linked = linked_ids(f.get("XP Events"))
        xp_ids = list({xid for xid in linked if (xp := xp_by_id.get(xid)) and belongs_video(xp, vid)})
        for xid in xp_by_key.get(video_key(vid), []):
            if xid not in xp_ids:
                xp_ids.append(xid)
        exp_key = video_key(vid)
        total = num(f.get("Total Video XP Awarded"))
        award = select_name(f.get("Award Status"))
        sub_id = first_id(f.get("Submission"))
        sub = sub_by_id.get(sub_id)
        week_id = first_id(fields_of(sub).get("Week")) if sub else ""
        sub_was = linked_ids(fields_of(sub).get("Weekly Athlete Summary")) if sub else []
        was_matches = summary_index.get(f"{eid}|{week_id}", [])
        was_id = sub_was[0] if len(sub_was) == 1 else (was_matches[0] if len(was_matches) == 1 else "")
        has_issue = False
        if not xp_ids:
            bump(video_counts, "video_missing_xp_event")
            has_issue = True
        else:
            if len(xp_ids) > 1:
                bump(video_counts, "video_duplicate_xp_event")
                has_issue = True
            primary = xp_by_id[xp_ids[0]]
            pf = fields_of(primary)
            psk = txt(pf.get("Source Key"))
            pts = num(pf.get("XP Points"))
            pwas = first_id(pf.get("Weekly Athlete Summary"))
            if psk != exp_key:
                bump(video_counts, "video_source_key_mismatch")
                has_issue = True
            if pts != total:
                bump(video_counts, "video_xp_points_mismatch")
                has_issue = True
            if award != "Awarded":
                bump(video_counts, "video_award_status_gap")
                has_issue = True
            if was_id and not pwas:
                bump(video_counts, "video_missing_weekly_summary_on_xp")
                has_issue = True
        if not has_issue:
            bump(video_counts, "video_ok")

    zoom_start_fields = ["Start Time", "Start Date", "Meeting Date", "Date"]
    zoom_by_id = index_by_id(ctx.zoom)
    zoom_rows = 0

    def meeting_date_key(rec: dict) -> str:
        f = fields_of(rec)
        for field in zoom_start_fields:
            if field in f:
                dk = to_date_key(f.get(field))
                if dk:
                    return dk
        return ""

    for zm in ctx.zoom:
        zf = fields_of(zm)
        attendees = [a for a in linked_ids(zf.get("Attendees")) if a in ctx.active_ids]
        if not attendees:
            continue
        status = select_name(zf.get("Meeting Status")) or txt(zf.get("Meeting Status"))
        completed = status.lower() == "completed"
        mkey = txt(zf.get("Zoom Meeting Key"))
        mdate = meeting_date_key(zm)
        for eid in attendees:
            zoom_rows += 1
            has_issue = False
            base_key = f"ZOOM_ATTEND_BASE|{mkey}|{eid}" if mkey else ""
            base_ids = xp_by_key.get(base_key, []) if base_key else []
            if completed:
                if not mkey or not base_ids:
                    bump(zoom_counts, "zoom_missing_base_xp")
                    has_issue = True
                elif len(base_ids) > 1:
                    bump(zoom_counts, "zoom_duplicate_base_xp")
                    has_issue = True
            if completed and mdate:
                qualifying: set[str] = set()
                for hist in ctx.zoom:
                    hf = fields_of(hist)
                    hstatus = select_name(hf.get("Meeting Status")) or txt(hf.get("Meeting Status"))
                    if hstatus.lower() != "completed":
                        continue
                    if eid not in linked_ids(hf.get("Attendees")):
                        continue
                    hkey = txt(hf.get("Zoom Meeting Key"))
                    if not hkey:
                        continue
                    hdate = meeting_date_key(hist)
                    if not hdate or hdate > mdate:
                        continue
                    qualifying.add(hkey)
                count = len(qualifying)
                if count == 2:
                    b2 = f"ZOOM_ATTEND_BONUS_2|{eid}"
                    ids2 = xp_by_key.get(b2, [])
                    if not ids2:
                        bump(zoom_counts, "zoom_missing_bonus_2_xp")
                        has_issue = True
                    elif len(ids2) > 1:
                        bump(zoom_counts, "zoom_duplicate_bonus_2_xp")
                        has_issue = True
                if count == 3:
                    b3 = f"ZOOM_ATTEND_BONUS_3|{eid}"
                    ids3 = xp_by_key.get(b3, [])
                    if not ids3:
                        bump(zoom_counts, "zoom_missing_bonus_3_xp")
                        has_issue = True
                    elif len(ids3) > 1:
                        bump(zoom_counts, "zoom_duplicate_bonus_3_xp")
                        has_issue = True
            if not has_issue:
                bump(zoom_counts, "zoom_ok")

    v_total = issue_total(video_counts, {"video_ok", "video_not_ready_for_xp"})
    z_total = issue_total(zoom_counts, {"zoom_ok"})
    return {
        "id": "090D",
        "name": "Video + Zoom XP",
        "pass": v_total == 0 and z_total == 0,
        "video": {"issueTotal": v_total, "issueCounts": video_counts, "checked": video_scoped},
        "zoom": {"issueTotal": z_total, "issueCounts": zoom_counts, "checkedRows": zoom_rows},
        "samples": {"video": video_samples, "zoom": zoom_samples},
    }


def audit_090f(ctx: AuditContext) -> dict:
    xp_by_id = index_by_id(ctx.xp_events)
    counts: dict[str, int] = {}
    samples: list[dict] = []
    by_source: dict[str, list[str]] = defaultdict(list)
    by_combo: dict[str, list[str]] = defaultdict(list)
    scoped = 0

    def norm(s: str) -> str:
        return s.strip().lower()

    for u in ctx.unlocks:
        f = fields_of(u)
        uid = u["id"]
        eid = first_id(f.get("Enrollment"))
        aid = first_id(f.get("Achievement"))
        wid = first_id(f.get("Week"))
        sm = first_id(f.get("Shot Milestone"))
        source_key = txt(f.get("Milestone Source Key"))
        xp_status = txt(f.get("XP Award Status"))
        linked = linked_ids(f.get("XP Events"))
        ach_name = txt(f.get("Achievement"))

        if eid and eid not in ctx.active_ids:
            continue
        scoped += 1

        if not eid:
            bump(counts, "missing_enrollment")
        if not aid:
            bump(counts, "missing_achievement")
        if not wid:
            bump(counts, "empty_week")
            if sm:
                bump(counts, "empty_week_shot_milestone")
            elif "perfect week" in norm(ach_name) or "perfect_week" in norm(source_key):
                bump(counts, "empty_week_perfect_week")
            else:
                bump(counts, "empty_week_other")

        awarded = norm(xp_status) == "awarded"
        if awarded and not linked:
            bump(counts, "missing_xp")
            if len(samples) < SAMPLE_LIMIT:
                samples.append({"unlockId": uid, "issue": "missing_xp"})
        if awarded and len(linked) > 1:
            bump(counts, "duplicate_xp")
            pts = {num(fields_of(xp_by_id[x]).get("XP Points")) for x in linked if x in xp_by_id}
            if len(pts) > 1:
                bump(counts, "xp_points_mismatch")

        if source_key:
            by_source[source_key].append(uid)
        if eid and aid and not sm:
            by_combo[f"{eid}|{aid}|{wid or 'NONE'}"].append(uid)

    for sk, ids in by_source.items():
        if len(ids) > 1:
            bump(counts, "duplicate_unlock_key_source_key")
    for ck, ids in by_combo.items():
        if len(ids) > 1:
            bump(counts, "duplicate_unlock_key_enrollment_achievement_week")

    total = sum(counts.get(k, 0) for k in F090_ISSUE_KEYS)
    return {
        "id": "090F",
        "name": "Achievement Unlocks Workflow",
        "pass": total == 0,
        "issueTotal": total,
        "issueCounts": counts,
        "scoped": scoped,
        "samples": samples,
    }


def audit_090g(ctx: AuditContext) -> dict:
    enroll_by_id = {r["id"]: fields_of(r) for r in ctx.enrollments}
    week_by_id = index_by_id(ctx.weeks)
    week_end_fields = ["End Date", "Week End Date", "Ends On", "Week Ending", "End"]
    now = datetime.now(timezone.utc)
    categories: dict[str, int] = {k: 0 for k in [
        "clean_and_sent", "should_have_sent_never_built", "package_built_not_sent",
        "missing_recipient", "missing_enrollment_or_week", "not_eligible",
        "error_blocked", "needs_manual_review",
    ]}
    samples: dict[str, list] = defaultdict(list)
    scoped = skipped = 0
    t072 = t074 = 0

    def week_eligible(week_id: str) -> tuple[bool, str]:
        w = week_by_id.get(week_id)
        if not w:
            return False, "week_lookup_unavailable"
        wf = fields_of(w)
        end = None
        for field in week_end_fields:
            if field in wf and wf[field]:
                raw = wf[field]
                try:
                    if isinstance(raw, str):
                        end = datetime.fromisoformat(raw.replace("Z", "+00:00"))
                    break
                except ValueError:
                    pass
        if not end:
            return False, "week_end_date_missing"
        eligible = end.timestamp() <= now.timestamp()
        return eligible, "week_ended" if eligible else "week_not_ended"

    for was in ctx.was:
        f = fields_of(was)
        eid = first_id(f.get("Enrollment"))
        wid = first_id(f.get("Week"))
        if eid:
            enr = enroll_by_id.get(eid)
            if enr and not is_active(enr.get("Active?")):
                skipped += 1
                continue
        scoped += 1
        email_sent = is_active(f.get("Weekly Email Sent?"))
        email_ready = is_active(f.get("Weekly Email Ready?"))
        build_now = is_active(f.get("Build Weekly Email Now?"))
        send_make = is_active(f.get("Send to Make?"))
        subject = txt(f.get("Weekly Email Subject"))
        recipients = txt(f.get("Weekly Email Recipients"))
        html = txt(f.get("Weekly Email HTML"))
        err = txt(f.get("Weekly Email Error"))
        has_pkg = bool(subject and recipients and html)
        enr = enroll_by_id.get(eid) if eid else None
        has_email = bool(enr and (txt(enr.get("Parent Email - Cleaned")) or txt(enr.get("Athlete Email - Cleaned"))))
        eligible, _ = week_eligible(wid) if wid else (False, "week_lookup_unavailable")

        if build_now and not email_sent and eid and wid:
            t072 += 1
        if email_ready and not email_sent and send_make and has_pkg:
            t074 += 1

        if not eid or not wid:
            cat = "missing_enrollment_or_week"
        elif err:
            cat = "error_blocked"
        elif not has_email:
            cat = "missing_recipient"
        elif email_sent:
            cat = "clean_and_sent"
        elif email_ready and not email_sent and has_pkg:
            cat = "package_built_not_sent"
        elif eligible and not html:
            cat = "should_have_sent_never_built"
        elif not eligible:
            cat = "not_eligible"
        else:
            cat = "needs_manual_review"
        categories[cat] += 1
        if len(samples[cat]) < 15:
            samples[cat].append({"wasId": was["id"], "enrollmentId": eid, "weekId": wid})

    problems = sum(categories.get(k, 0) for k in PROBLEM_G_CATEGORIES)
    return {
        "id": "090G",
        "name": "Weekly Summary Email Workflow",
        "pass": problems == 0,
        "problemCount": problems,
        "sendStatusCategoryCounts": categories,
        "scoped": scoped,
        "skippedInactive": skipped,
        "trigger072Eligible": t072,
        "trigger074Eligible": t074,
        "samples": dict(samples),
    }


def audit_090e(ctx: AuditContext) -> dict:
    xp_by_id = index_by_id(ctx.xp_events)
    active = [r for r in ctx.enrollments if r["id"] in ctx.active_ids]
    linked_sets = {r["id"]: set(linked_ids(fields_of(r).get("XP Events"))) for r in active}

    xp_by_enrollment: dict[str, list[dict]] = defaultdict(list)
    dup_map: dict[str, list[str]] = defaultdict(list)
    orphan_ids: set[str] = set()
    orphan_samples: list[dict] = []

    for xp in ctx.xp_events:
        f = fields_of(xp)
        eid = first_id(f.get("Enrollment"))
        if not eid or eid not in ctx.active_ids:
            continue
        xp_by_enrollment[eid].append(xp)
        sk = txt(f.get("Source Key"))
        if sk:
            dup_map[sk].append(xp["id"])
        if xp["id"] not in linked_sets.get(eid, set()):
            orphan_ids.add(xp["id"])
            if len(orphan_samples) < SAMPLE_LIMIT:
                orphan_samples.append({"xpEventId": xp["id"], "enrollmentId": eid, "sourceKey": sk})

    counts: dict[str, int] = {}
    mismatch_samples: list[dict] = []
    for rec in active:
        eid = rec["id"]
        f = fields_of(rec)
        rollup = num(f.get("Lifetime XP Earned"))
        computed = 0.0
        for xp in xp_by_enrollment.get(eid, []):
            xf = fields_of(xp)
            if "Active?" in xf and not is_active(xf.get("Active?")):
                continue
            computed += num(xf.get("XP Points"))
        if abs(computed - rollup) > TOLERANCE:
            bump(counts, "lifetime_xp_mismatch")
            if len(mismatch_samples) < SAMPLE_LIMIT:
                mismatch_samples.append({
                    "enrollmentId": eid,
                    "rollup": rollup,
                    "computed": computed,
                    "delta": computed - rollup,
                })
        else:
            bump(counts, "clean")

    dup_events = sum(len(ids) for ids in dup_map.values() if len(ids) > 1)
    counts["orphan_xp_not_linked_on_enrollment"] = len(orphan_ids)
    counts["duplicate_source_key_events"] = dup_events
    counts["duplicate_source_keys"] = sum(1 for ids in dup_map.values() if len(ids) > 1)

    total = (
        counts.get("lifetime_xp_mismatch", 0)
        + counts.get("orphan_xp_not_linked_on_enrollment", 0)
        + counts.get("duplicate_source_key_events", 0)
    )
    return {
        "id": "090E",
        "name": "XP Events Enrollment Totals",
        "pass": total == 0,
        "issueTotal": total,
        "issueCounts": counts,
        "samples": {"mismatches": mismatch_samples, "orphans": orphan_samples},
    }


def print_report(results: list[dict]) -> None:
    print("\n" + "=" * 70)
    print("FINAL 090 PRE-CLOSE AUDIT PASS")
    print(f"Schema: {SCHEMA_SNAPSHOT}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} local")
    print("=" * 70)

    all_pass = True
    for r in results:
        status = "PASS" if r["pass"] else "FAIL"
        if not r["pass"]:
            all_pass = False
        print(f"\n--- {r['id']} {r['name']}: {status} ---")
        if r["id"] == "090D":
            print(f"  Video issueTotal: {r['video']['issueTotal']}")
            for k, v in sorted(r["video"]["issueCounts"].items()):
                if v and k not in ("video_ok",):
                    print(f"    video.{k}: {v}")
            print(f"  Zoom issueTotal: {r['zoom']['issueTotal']}")
            for k, v in sorted(r["zoom"]["issueCounts"].items()):
                if v and k not in ("zoom_ok",):
                    print(f"    zoom.{k}: {v}")
        elif r["id"] == "090G":
            print(f"  problemCount: {r['problemCount']}")
            for k, v in sorted(r["sendStatusCategoryCounts"].items()):
                if v:
                    print(f"    {k}: {v}")
            print(f"  trigger072Eligible: {r['trigger072Eligible']}")
            print(f"  trigger074Eligible: {r['trigger074Eligible']}")
        else:
            print(f"  issueTotal: {r.get('issueTotal', 'n/a')}")
            for k, v in sorted(r.get("issueCounts", {}).items()):
                if v and k not in ("clean", "excluded_not_ready"):
                    print(f"    {k}: {v}")
            if r.get("samples"):
                if isinstance(r["samples"], dict):
                    for cat, rows in r["samples"].items():
                        if rows and cat in ("mismatches", "orphans") or (cat in PROBLEM_G_CATEGORIES and rows):
                            print(f"  sample {cat}:")
                            for row in rows[:5]:
                                print(f"    {row}")
                elif r["samples"]:
                    print("  samples:")
                    for row in r["samples"][:8]:
                        print(f"    {row}")

    print("\n" + "=" * 70)
    print(f"OVERALL: {'ALL PASS' if all_pass else 'ISSUES FOUND — review above'}")
    print("=" * 70)


def main() -> None:
    token = load_token()
    session = requests.Session()
    session.headers["Authorization"] = f"Bearer {token}"

    ctx = AuditContext(session)
    ctx.load()

    order = [
        audit_090a,
        audit_090b,
        audit_090c,
        audit_090d,
        audit_090f,
        audit_090g,
        audit_090e,
    ]
    results = [fn(ctx) for fn in order]
    print_report(results)

    out_dir = Path(__file__).resolve().parent / "_preview"
    out_dir.mkdir(exist_ok=True)
    out_path = out_dir / "final-090-audit-results.json"
    out_path.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(f"\nFull JSON: {out_path}")

    if not all(r["pass"] for r in results):
        sys.exit(1)


if __name__ == "__main__":
    main()
