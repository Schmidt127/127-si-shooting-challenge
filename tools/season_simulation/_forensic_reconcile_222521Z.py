"""READ-ONLY forensic reconciliation for SEASON-SIM-2027-20260912T222521Z-threeathlete.

DO NOT write, delete, restore formulas, or mutate Production records.
"""
from __future__ import annotations

import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parent))

from season_simulation.airtable_client import AirtableClient, fields_of  # noqa: E402

RUN = "SEASON-SIM-2027-20260912T222521Z-threeathlete"
OUT = ROOT / "reports" / f"forensic-reconcile-{RUN}.json"
DRY_RUN = ROOT / "reports" / "sc001-dry-run-latest.json"
SAFE_EMAILS = {
    "schmidt@fairfieldbasketballclub.com",
    "mike@127sportsintensity.com",
    "mschmidt@fairfieldbasketballclub.com",
}
EMAIL_RE = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.I)

PROFILES = {
    "athlete1_perfect": {
        "registry": f"{RUN}__athlete1-perfect.json",
        "label": "Sim Perfect",
    },
    "athlete2_recovery": {
        "registry": f"{RUN}__athlete2-recovery.json",
        "label": "Sim Recovery",
    },
    "athlete3_edge": {
        "registry": f"{RUN}__athlete3-edge.json",
        "label": "Sim Edge",
    },
}

WEEK_ORDER = [
    "Early Bird",
    "Week 1",
    "Week 2",
    "Week 3",
    "Week 4",
    "Week 5",
    "Week 6",
    "Week 7",
    "Week 8",
    "Week 9",
]

# Map live XP Source / Source Key prefixes to forensic buckets
BUCKET_ALIASES = {
    "Shooting Base": "Submission Base",
    "SHOOTING_BASE": "Submission Base",
    "SUBMISSION_XP": "Submission Base",
    "Homework Completion": "Homework Completion",
    "HOMEWORK_COMPLETION": "Homework Completion",
    "HOMEWORK_XP": "Homework Completion",
    "Video Submission": "Video Feedback",
    "VIDEO_SUBMISSION": "Video Feedback",
    "Perfect Week": "Perfect Week",
    "PERFECT_WEEK": "Perfect Week",
    "Weekly Threshold": "Weekly Threshold",
    "WEEKLY_THRESHOLD": "Weekly Threshold",
    "Shot Milestone": "Shot Milestone",
    "SHOT_MILESTONE": "Shot Milestone",
    "Zoom Attendance": "Zoom Attendance / Recording",
    "ZOOM_ATTEND_BASE": "Zoom Attendance / Recording",
    "ZOOM_ATTEND_BONUS_2": "Zoom Attendance / Recording",
    "ZOOM_ATTEND_BONUS_3": "Zoom Attendance / Recording",
    "ZOOM_RECORDING_CREDIT": "Zoom Attendance / Recording",
    "3-Day Streak": "Streak",
    "5-Day Streak": "Streak",
    "7-Day Streak": "Streak",
    "10-Day Streak": "Streak",
    "20-Day Streak": "Streak",
    "30-Day Streak": "Streak",
    "40-Day Streak": "Streak",
    "50-Day Streak": "Streak",
    "60-Day Streak": "Streak",
}


def _truthy(v: Any) -> bool:
    if v is True or v == 1:
        return True
    s = str(v or "").strip().lower()
    return s in {"1", "1.0", "true", "yes", "checked"}


def _num(v: Any) -> float:
    if v is None or v == "":
        return 0.0
    if isinstance(v, (int, float)):
        return float(v)
    try:
        return float(str(v).replace(",", "").strip())
    except ValueError:
        return 0.0


def _text(v: Any) -> str:
    if v is None:
        return ""
    if isinstance(v, dict):
        return str(v.get("name") or v.get("id") or "")
    if isinstance(v, list):
        if not v:
            return ""
        if isinstance(v[0], dict):
            return str(v[0].get("name") or v[0].get("id") or "")
        return str(v[0])
    return str(v)


def _linked(v: Any) -> list[str]:
    if not v:
        return []
    if isinstance(v, list):
        out = []
        for x in v:
            if isinstance(x, dict):
                out.append(str(x.get("id") or ""))
            else:
                out.append(str(x))
        return [x for x in out if x]
    return [str(v)]


def classify_bucket(source: str, source_key: str, rule_key: str = "") -> str:
    raw = " ".join([source or "", source_key or "", rule_key or ""]).strip()
    sk = (source_key or "").upper()
    rk = (rule_key or "").upper()
    src = (source or "").strip()

    if sk.startswith("SUBMISSION_XP") or rk == "SHOOTING_BASE" or src in {
        "Shooting Base",
        "Submission Base",
    }:
        return "Submission Base"
    if sk.startswith("HOMEWORK_XP") or rk == "HOMEWORK_COMPLETION" or "Homework" in src:
        return "Homework Completion"
    if "VIDEO" in rk or "VIDEO" in sk or "Video" in src:
        return "Video Feedback"
    if "PERFECT_WEEK" in rk or "PERFECT_WEEK" in sk or src == "Perfect Week":
        return "Perfect Week"
    if "WEEKLY_THRESHOLD" in rk or "WEEKLY_THRESHOLD" in sk or "Threshold" in src:
        return "Weekly Threshold"
    if "SHOT_MILESTONE" in rk or "SHOT_MILESTONE" in sk or "Milestone" in src:
        return "Shot Milestone"
    if (
        "ZOOM" in rk
        or sk.startswith("ZOOM_")
        or "Zoom" in src
        or "Recording" in src
    ):
        return "Zoom Attendance / Recording"
    if "STREAK" in rk or "STREAK" in sk or "Streak" in src:
        return "Streak"
    if raw:
        return f"OTHER:{src or rk or sk[:40]}"
    return "OTHER:unknown"


def oracle_buckets() -> dict[str, dict[str, Any]]:
    oracle = json.loads(
        (ROOT / "expected_perfect_season_xp.json").read_text(encoding="utf-8")
    )
    by: dict[str, dict[str, Any]] = defaultdict(
        lambda: {"count": 0, "xp": 0, "source_keys": []}
    )
    for e in oracle["events"]:
        src = e.get("source") or e.get("rule_key") or ""
        bucket = classify_bucket(src, "", e.get("rule_key") or "")
        # refine zoom subtypes from source
        if src in {
            "ZOOM_ATTEND_BASE",
            "ZOOM_RECORDING_CREDIT",
            "ZOOM_ATTEND_BONUS_2",
            "ZOOM_ATTEND_BONUS_3",
        }:
            bucket = "Zoom Attendance / Recording"
        if src.startswith("STREAK") or "Streak" in src:
            bucket = "Streak"
        if src.startswith("WEEKLY_THRESHOLD") or "Threshold" in src:
            bucket = "Weekly Threshold"
        if src in {"SHOOTING_BASE", "Shooting Base"}:
            bucket = "Submission Base"
        if src in {"HOMEWORK_COMPLETION", "Homework Completion"}:
            bucket = "Homework Completion"
        if src in {"VIDEO_SUBMISSION", "Video Submission"}:
            bucket = "Video Feedback"
        if src in {"PERFECT_WEEK", "Perfect Week"}:
            bucket = "Perfect Week"
        if src in {"SHOT_MILESTONE", "Shot Milestone"}:
            bucket = "Shot Milestone"
        detail = str(e.get("detail") or "")
        by[bucket]["count"] += 1
        by[bucket]["xp"] += int(e["xp"])
        by[bucket]["source_keys"].append(
            f"{e.get('date')}|{src}|{detail}|{e.get('xp')}"
        )
    # also expose per_source_table
    per = oracle.get("per_source_table") or []
    return {
        "buckets": dict(by),
        "per_source_table": per,
        "total_xp": int(oracle["expected_perfect_season_xp"]),
        "event_count": len(oracle["events"]),
        "final_level": oracle.get("final_current_level"),
        "raw_by_source": [
            {
                "source": e.get("source"),
                "rule_key": e.get("rule_key"),
                "xp": e.get("xp"),
                "date": e.get("date"),
                "week": e.get("week"),
                "detail": e.get("detail"),
            }
            for e in oracle["events"]
        ],
    }


def load_registry(name: str) -> dict[str, Any]:
    return json.loads((ROOT / "run_registries" / name).read_text(encoding="utf-8"))


def fetch_xp_for_enrollment(c: AirtableClient, enrollment_id: str) -> list[dict]:
    formulas = [
        f"FIND('{enrollment_id}', ARRAYJOIN({{Enrollment}}))",
        f"FIND('{enrollment_id}', {{Enrollment}} & '')",
        f"{{Enrollment}} = '{enrollment_id}'",
    ]
    last_err: Exception | None = None
    rows: list[dict] = []
    for formula in formulas:
        try:
            rows = c.list_records("XP Events", formula=formula)
            break
        except Exception as exc:  # noqa: BLE001
            last_err = exc
            continue
    if not rows and last_err:
        raise last_err
    out = []
    for r in rows:
        f = fields_of(r)
        links = _linked(f.get("Enrollment"))
        if enrollment_id not in links and enrollment_id not in str(f.get("Enrollment") or ""):
            continue
        out.append({"id": r["id"], "fields": f})
    return out


def is_active_xp(f: dict) -> bool:
    if _truthy(f.get("Voided?")):
        return False
    status = _text(f.get("Status")).lower()
    if status in {"void", "voided", "inactive", "reversed", "deleted"}:
        return False
    if "Active?" in f and f.get("Active?") is False:
        return False
    return True


def xp_amount(f: dict) -> int:
    for k in ("XP Amount", "XP", "Amount", "Points"):
        if k in f and f.get(k) not in (None, ""):
            return int(_num(f.get(k)))
    return 0


def reconcile_xp(
    live_events: list[dict],
    expected_buckets: dict[str, dict[str, Any]] | None,
    expected_source_keys: set[str] | None = None,
) -> dict[str, Any]:
    actual_buckets: dict[str, dict[str, Any]] = defaultdict(
        lambda: {
            "actual_count": 0,
            "actual_xp": 0,
            "events": [],
            "source_keys": [],
        }
    )
    all_keys: list[str] = []
    inactive = 0
    for ev in live_events:
        f = ev["fields"]
        sk = str(f.get("Source Key") or "")
        src = _text(f.get("XP Source") or f.get("Source") or "")
        rk = _text(f.get("Rule Key") or "")
        bucket = classify_bucket(src, sk, rk)
        amt = xp_amount(f)
        active = is_active_xp(f)
        if not active:
            inactive += 1
            continue
        actual_buckets[bucket]["actual_count"] += 1
        actual_buckets[bucket]["actual_xp"] += amt
        actual_buckets[bucket]["source_keys"].append(sk)
        actual_buckets[bucket]["events"].append(
            {
                "id": ev["id"],
                "source_key": sk,
                "xp_source": src,
                "rule_key": rk,
                "xp": amt,
                "reason_debug": str(f.get("Reason Debug") or "")[:200],
            }
        )
        all_keys.append(sk)

    key_counts = Counter(all_keys)
    duplicates = {k: n for k, n in key_counts.items() if k and n > 1}

    buckets_out = {}
    all_bucket_names = set(actual_buckets) | set((expected_buckets or {}).keys())
    for name in sorted(all_bucket_names):
        exp = (expected_buckets or {}).get(name) or {"count": 0, "xp": 0, "source_keys": []}
        act = actual_buckets.get(name) or {
            "actual_count": 0,
            "actual_xp": 0,
            "source_keys": [],
            "events": [],
        }
        exp_keys = set(exp.get("source_keys") or [])
        act_keys = set(act.get("source_keys") or [])
        # For perfect athlete oracle keys are synthetic; compare counts/xp primarily
        buckets_out[name] = {
            "expected_event_count": exp.get("count", 0),
            "actual_active_event_count": act["actual_count"],
            "expected_xp": exp.get("xp", 0),
            "actual_xp": act["actual_xp"],
            "difference_xp": act["actual_xp"] - int(exp.get("xp", 0)),
            "difference_count": act["actual_count"] - int(exp.get("count", 0)),
            "duplicate_count": sum(
                1 for k in act.get("source_keys") or [] if key_counts.get(k, 0) > 1
            ),
            "duplicate_source_keys": sorted(
                {k for k in act.get("source_keys") or [] if key_counts.get(k, 0) > 1}
            ),
            "sample_events": (act.get("events") or [])[:8],
            "all_source_keys": act.get("source_keys") or [],
        }

    return {
        "buckets": buckets_out,
        "total_actual_xp": sum(b["actual_xp"] for b in buckets_out.values()),
        "total_expected_xp": sum(b["expected_xp"] for b in buckets_out.values()),
        "inactive_or_voided": inactive,
        "duplicate_source_keys": duplicates,
        "event_count_active": sum(b["actual_active_event_count"] for b in buckets_out.values()),
    }


def was_fields_snapshot(f: dict) -> dict[str, Any]:
    keys = [
        "Week Label",
        "Week Name",
        "Week",
        "Days Logged",
        "Perfect Week Qualifying Days",
        "Weekly Shot Target",
        "Weekly Shots",
        "Shots This Week",
        "Actual Shots",
        "Scaled Target",
        "Scaled Weekly Shot Target",
        "Perfect Week Homework Assigned Count",
        "Perfect Week Homework Satisfactory Count",
        "Perfect Week Video Count",
        "Perfect Week Zoom Meeting Count",
        "Perfect Week Zoom Attendance Count",
        "Perfect Week Daily Requirement Met?",
        "Perfect Week Homework Requirement Met?",
        "Perfect Week Video Requirement Met?",
        "Perfect Week Zoom Requirement Met?",
        "Perfect Week Eligible?",
        "Perfect Week Automation Status",
        "Perfect Week Automation Error",
        "Perfect Week Daily Check Status",
        "Perfect Week Daily Check Detail",
        "Perfect Week Unlock",
        "Week End Date",
        "Week Start Date",
        "Enrollment",
        "Name",
        "Weekly Athlete Summary Name",
    ]
    out = {k: f.get(k) for k in keys if k in f}
    # also capture any Perfect Week* fields
    for k, v in f.items():
        if "Perfect Week" in k or k in {
            "Days Logged",
            "Week End Date",
            "Week Start Date",
            "Week Label",
            "Week Name",
        }:
            out[k] = v
    return out


def audit_perfect_weeks(
    c: AirtableClient, enrollment_id: str, was_ids: list[str]
) -> list[dict[str, Any]]:
    rows = []
    for wid in was_ids:
        rec = c.get_record("Weekly Athlete Summary", wid)
        f = fields_of(rec)
        snap = was_fields_snapshot(f)
        label = (
            _text(f.get("Week Label"))
            or _text(f.get("Week Name"))
            or _text(f.get("Name"))
            or wid
        )
        # Find Perfect Week XP events linked to this WAS or with week in key
        rows.append(
            {
                "was_rid": wid,
                "label_raw": label,
                "snapshot": snap,
                "days_logged": f.get("Days Logged"),
                "pw_qualifying_days": f.get("Perfect Week Qualifying Days"),
                "weekly_shot_target": f.get("Weekly Shot Target")
                or f.get("Shot Target")
                or f.get("Weekly Goal Shots"),
                "actual_shots": f.get("Weekly Shots")
                or f.get("Shots This Week")
                or f.get("Counted Shots"),
                "scaled_target": f.get("Scaled Weekly Shot Target")
                or f.get("Scaled Target"),
                "hw_assigned": f.get("Perfect Week Homework Assigned Count"),
                "hw_satisfactory": f.get("Perfect Week Homework Satisfactory Count"),
                "video_count": f.get("Perfect Week Video Count"),
                "zoom_meeting_count": f.get("Perfect Week Zoom Meeting Count"),
                "zoom_attendance_count": f.get("Perfect Week Zoom Attendance Count"),
                "daily_met": f.get("Perfect Week Daily Requirement Met?"),
                "hw_met": f.get("Perfect Week Homework Requirement Met?"),
                "video_met": f.get("Perfect Week Video Requirement Met?"),
                "zoom_met": f.get("Perfect Week Zoom Requirement Met?"),
                "eligible": f.get("Perfect Week Eligible?"),
                "automation_status": f.get("Perfect Week Automation Status"),
                "automation_error": f.get("Perfect Week Automation Error"),
                "daily_status": f.get("Perfect Week Daily Check Status"),
                "daily_detail": f.get("Perfect Week Daily Check Detail"),
                "week_end": f.get("Week End Date"),
                "week_start": f.get("Week Start Date"),
                "unlock_links": _linked(
                    f.get("Perfect Week Unlock")
                    or f.get("Athlete Achievement Unlock")
                    or f.get("Perfect Week Unlocks")
                ),
            }
        )
    return rows


def enrollment_snapshot(c: AirtableClient, enrollment_id: str) -> dict[str, Any]:
    f = fields_of(c.get_record("Enrollments", enrollment_id))
    interesting = [
        "Lifetime XP Total",
        "Lifetime XP Earned",
        "Current Level",
        "Current Level (Public)",
        "public Current Level",
        "Level Status",
        "Next Level",
        "Longest Streak",
        "Current Shooting Streak",
        "Goal Met?",
        "Goal Met",
        "Total Zoom Attendances",
        "Total Zoom Attendance",
        "Zoom Attendance Count",
        "Parent Email",
        "Athlete Email",
        "Total Shots Counted",
        "Perfect Weeks",
        "Perfect Week Count",
        "Level Gate",
        "Gate Detail",
        "Level Gate Detail",
        "Blocked Gate",
        "Gate Block Reason",
    ]
    out = {k: f.get(k) for k in interesting if k in f}
    # capture all level/xp/zoom/gate related
    for k, v in f.items():
        kl = k.lower()
        if any(
            x in kl
            for x in (
                "level",
                "xp",
                "zoom",
                "gate",
                "streak",
                "goal",
                "perfect week",
                "email",
            )
        ):
            out[k] = v
    return out


def email_audit(c: AirtableClient, enrollment_id: str, athlete_id: str) -> dict[str, Any]:
    formulas = [
        f"OR(FIND('{enrollment_id}', ARRAYJOIN({{Enrollment}})), FIND('{RUN}', {{Notes}} & ''), FIND('{RUN}', {{Dedupe Key}} & ''), FIND('{athlete_id}', ARRAYJOIN({{Athlete}})))",
        f"OR(FIND('{enrollment_id}', {{Enrollment}} & ''), FIND('{RUN}', {{Notes}} & ''), FIND('{RUN}', {{Dedupe Key}} & ''))",
        f"FIND('{RUN}', {{Dedupe Key}} & '')",
    ]
    rows: list[dict] = []
    err = None
    for formula in formulas:
        try:
            rows = c.list_records("Email Handoff Queue", formula=formula)
            if rows:
                break
        except Exception as e:  # noqa: BLE001
            err = e
            continue
    if not rows and err:
        # last resort: search by run id substring across a capped scan
        try:
            rows = c.list_records(
                "Email Handoff Queue",
                formula=f"FIND('{RUN}', {{Dedupe Key}} & '')",
                max_records=5000,
            )
        except Exception as e:  # noqa: BLE001
            return {"error": str(err or e)}
    matched = []
    for r in rows:
        f = fields_of(r)
        blob = json.dumps(f, default=str)
        if enrollment_id in blob or athlete_id in blob or RUN in blob:
            matched.append({"id": r["id"], "fields": f})
    by_type = Counter()
    recipients = Counter()
    statuses = Counter()
    unsafe = []
    duplicates = Counter()
    for m in matched:
        f = m["fields"]
        et = _text(f.get("Event Type") or f.get("Email Type") or f.get("Type") or "unknown")
        by_type[et] += 1
        st = _text(f.get("Status") or f.get("Send Status") or "")
        statuses[st] += 1
        # recipients
        emails = set(EMAIL_RE.findall(json.dumps(f, default=str)))
        for em in emails:
            recipients[em.lower()] += 1
            if em.lower() not in SAFE_EMAILS and "fairfield" not in em.lower() and "127sports" not in em.lower():
                # still flag non-allowlisted
                if em.lower() not in SAFE_EMAILS:
                    unsafe.append({"id": m["id"], "email": em, "event_type": et})
        # dedupe key
        dk = str(f.get("Dedupe Key") or f.get("Idempotency Key") or f.get("Source Key") or m["id"])
        duplicates[dk] += 1
    return {
        "matched_count": len(matched),
        "by_type": dict(by_type),
        "statuses": dict(statuses),
        "recipients": dict(recipients),
        "unsafe_recipients": unsafe,
        "duplicate_dedupe_keys": {k: n for k, n in duplicates.items() if n > 1},
        "sample": [
            {
                "id": m["id"],
                "type": _text(m["fields"].get("Event Type") or m["fields"].get("Email Type")),
                "status": _text(m["fields"].get("Status") or m["fields"].get("Send Status")),
                "to": _text(m["fields"].get("To Email") or m["fields"].get("Recipient")),
            }
            for m in matched[:30]
        ],
    }


def dedupe_audit(c: AirtableClient, reg: dict[str, Any], enrollment_id: str) -> dict[str, Any]:
    out: dict[str, Any] = {}
    # submissions by activity date
    sub_ids = (reg.get("ids_by_table") or {}).get("Submissions") or []
    # Only countable day submissions — filter by Notes containing SUB|D
    day_subs = []
    for rec in reg.get("records") or []:
        if rec.get("table") == "Submissions" and "|SUB|D" in (rec.get("dedupe_key") or ""):
            day_subs.append(rec)
    out["registry_day_submissions"] = len(day_subs)
    out["registry_all_submissions"] = len(sub_ids)

    # homework
    hw_ids = (reg.get("ids_by_table") or {}).get("Homework Completions") or []
    out["homework_completions"] = len(hw_ids)

    # video
    vf_ids = (reg.get("ids_by_table") or {}).get("Video Feedback") or []
    out["video_feedback"] = len(vf_ids)

    # zoom attendance
    za_ids = (reg.get("ids_by_table") or {}).get("Zoom Attendance") or []
    out["zoom_attendance"] = len(za_ids)

    # check live duplicates by Source Key on XP already handled elsewhere
    # streak occurrences
    try:
        streaks = c.list_records(
            "Streak Occurrences",
            formula=f"FIND('{enrollment_id}', ARRAYJOIN({{Enrollment}} & ''))",
        )
    except Exception:
        try:
            streaks = c.list_records(
                "Streak Occurrences",
                formula=f"FIND('{enrollment_id}', {{Enrollment}} & '')",
            )
        except Exception as e:
            streaks = []
            out["streak_error"] = str(e)
    streak_keys = []
    for s in streaks:
        f = fields_of(s)
        if enrollment_id not in _linked(f.get("Enrollment")) and enrollment_id not in str(
            f.get("Enrollment") or ""
        ):
            continue
        streak_keys.append(
            str(f.get("Source Key") or f.get("Occurrence Key") or f.get("Name") or s["id"])
        )
    sc = Counter(streak_keys)
    out["streak_occurrences"] = len(streak_keys)
    out["duplicate_streak_keys"] = {k: n for k, n in sc.items() if n > 1}

    # perfect week unlocks
    try:
        unlocks = c.list_records(
            "Athlete Achievement Unlocks",
            formula=f"FIND('{enrollment_id}', ARRAYJOIN({{Enrollment}} & ''))",
        )
    except Exception:
        try:
            unlocks = c.list_records(
                "Athlete Achievement Unlocks",
                formula=f"FIND('{enrollment_id}', {{Enrollment}} & '')",
            )
        except Exception as e:
            unlocks = []
            out["unlock_error"] = str(e)
    pw_unlocks = []
    for u in unlocks:
        f = fields_of(u)
        if enrollment_id not in _linked(f.get("Enrollment")) and enrollment_id not in str(
            f.get("Enrollment") or ""
        ):
            continue
        name = _text(f.get("Achievement Name") or f.get("Name") or f.get("Achievement"))
        key = str(f.get("Source Key") or f.get("Unlock Key") or "")
        if "PERFECT" in name.upper() or "PERFECT_WEEK" in key.upper() or "Perfect Week" in name:
            pw_unlocks.append({"id": u["id"], "name": name, "source_key": key})
    uk = Counter(x["source_key"] or x["id"] for x in pw_unlocks)
    out["perfect_week_unlocks"] = pw_unlocks
    out["duplicate_pw_unlock_keys"] = {k: n for k, n in uk.items() if n > 1}

    # homework / video / sub dedupe keys from registry
    for table, prefix in [
        ("Submissions", "|SUB|"),
        ("Homework Completions", "|HW|"),
        ("Video Feedback", "|VF|"),
        ("Zoom Attendance", "|ZOOM|"),
    ]:
        keys = [
            r.get("dedupe_key")
            for r in (reg.get("records") or [])
            if r.get("table") == table and r.get("dedupe_key")
        ]
        kc = Counter(keys)
        out[f"registry_dupes_{table}"] = {k: n for k, n in kc.items() if n > 1}

    return out


def zoom_analysis(c: AirtableClient, enrollment_id: str, za_ids: list[str]) -> dict[str, Any]:
    attendances = []
    for zid in za_ids:
        f = fields_of(c.get_record("Zoom Attendance", zid))
        attendances.append(
            {
                "id": zid,
                "name": f.get("Name"),
                "meeting": _linked(f.get("Zoom Meeting") or f.get("Meeting")),
                "mode": _text(f.get("Attendance Mode") or f.get("Mode") or f.get("Type")),
                "status": _text(f.get("Status") or f.get("Attendance Status")),
                "credit_type": _text(f.get("Credit Type") or f.get("XP Credit Type")),
                "counts_for_pw": f.get("Effective Recording Counts for Perfect Week?")
                or f.get("Counts for Perfect Week?"),
                "pw_applied": f.get("Perfect Week Credit Applied?"),
                "enrollment": _linked(f.get("Enrollment")),
                "raw_interesting": {
                    k: v
                    for k, v in f.items()
                    if any(
                        x in k.lower()
                        for x in (
                            "zoom",
                            "attend",
                            "record",
                            "credit",
                            "perfect",
                            "mode",
                            "status",
                            "xp",
                        )
                    )
                },
            }
        )
    enr = enrollment_snapshot(c, enrollment_id)
    return {
        "enrollment_zoom_fields": {
            k: v for k, v in enr.items() if "zoom" in k.lower() or "attend" in k.lower()
        },
        "attendance_records": attendances,
        "attendance_count": len(attendances),
    }


def matrix_summary(profile: str, dry: dict[str, Any]) -> dict[str, Any]:
    matrices = ((dry.get("expectations") or {}).get("matrices") or {})
    m = matrices.get(profile) or {}
    weekly = m.get("weekly_rows") or []
    return {
        "profile": profile,
        "expected_perfect_weeks": m.get("expected_perfect_week_count"),
        "expected_xp_by_category": m.get("expected_xp_by_category"),
        "expected_level_note": m.get("expected_level_note"),
        "expected_goal_met_date": m.get("expected_goal_met_date"),
        "submit_days": m.get("submit_days"),
        "miss_days": m.get("miss_days"),
        "total_planned_shots": m.get("total_planned_shots"),
        "season_goal": m.get("season_goal"),
        "weekly_perfect_week": [
            {
                "week": r.get("week_label"),
                "perfect_week": r.get("perfect_week"),
                "video": r.get("video_count"),
                "zoom": r.get("zoom_state"),
            }
            for r in weekly
        ],
        "expected_email_handoffs": m.get("expected_email_handoffs"),
    }


def main() -> int:
    c = AirtableClient(allow_writes=False)
    dry = json.loads(DRY_RUN.read_text(encoding="utf-8"))
    oracle = oracle_buckets()
    # Remap oracle events into forensic buckets more carefully
    expected_buckets: dict[str, dict[str, Any]] = defaultdict(
        lambda: {"count": 0, "xp": 0, "source_keys": []}
    )
    source_counter: Counter = Counter()
    for e in oracle["raw_by_source"]:
        src = e["source"] or e["rule_key"] or ""
        source_counter[src] += 1
        bucket = classify_bucket(str(src), "", str(e.get("rule_key") or ""))
        if str(src).startswith("STREAK") or "Streak" in str(src):
            bucket = "Streak"
        elif "THRESHOLD" in str(src).upper() or "Threshold" in str(src):
            bucket = "Weekly Threshold"
        elif str(src) in {
            "SHOOTING_BASE",
            "Shooting Base",
        }:
            bucket = "Submission Base"
        elif str(src) in {"HOMEWORK_COMPLETION", "Homework Completion"}:
            bucket = "Homework Completion"
        elif str(src) in {"VIDEO_SUBMISSION", "Video Submission"}:
            bucket = "Video Feedback"
        elif str(src) in {"PERFECT_WEEK", "Perfect Week"}:
            bucket = "Perfect Week"
        elif str(src) in {"SHOT_MILESTONE", "Shot Milestone"}:
            bucket = "Shot Milestone"
        elif "ZOOM" in str(src).upper():
            bucket = "Zoom Attendance / Recording"
        expected_buckets[bucket]["count"] += 1
        expected_buckets[bucket]["xp"] += int(e["xp"])
        expected_buckets[bucket]["source_keys"].append(
            f"{e.get('date')}|{src}|{e.get('detail')}"
        )

    report: dict[str, Any] = {
        "run_id": RUN,
        "mode": "READ_ONLY_FORENSIC",
        "oracle": {
            "total_xp": oracle["total_xp"],
            "event_count": oracle["event_count"],
            "final_level": oracle["final_level"],
            "per_source_table": oracle["per_source_table"],
            "expected_buckets": {k: {"count": v["count"], "xp": v["xp"]} for k, v in expected_buckets.items()},
            "raw_source_counts": dict(source_counter),
        },
        "profiles": {},
    }

    for profile, meta in PROFILES.items():
        reg = load_registry(meta["registry"])
        enrollment_id = reg["enrollment_id"]
        athlete_id = reg["athlete_id"]
        print(f"=== {profile} {enrollment_id} ===", flush=True)

        enr = enrollment_snapshot(c, enrollment_id)
        print("  enrollment XP fields loaded", flush=True)

        xp_events = fetch_xp_for_enrollment(c, enrollment_id)
        print(f"  xp events: {len(xp_events)}", flush=True)

        exp_b = expected_buckets if profile == "athlete1_perfect" else None
        xp_rec = reconcile_xp(xp_events, exp_b)

        was_ids = (reg.get("ids_by_table") or {}).get("Weekly Athlete Summary") or []
        # Prefer records tagged as WAS for challenge weeks
        was_recs = [
            r
            for r in (reg.get("records") or [])
            if r.get("table") == "Weekly Athlete Summary"
        ]
        # unique was ids from registry
        was_ids = list(dict.fromkeys([r["record_id"] for r in was_recs] + was_ids))
        pw_matrix = audit_perfect_weeks(c, enrollment_id, was_ids)
        print(f"  WAS audited: {len(pw_matrix)}", flush=True)

        # Attach Perfect Week XP events
        pw_xp = [
            e
            for e in xp_rec["buckets"].get("Perfect Week", {}).get("sample_events", [])
        ]
        # get ALL perfect week events
        all_pw = []
        for ev in xp_events:
            f = ev["fields"]
            if not is_active_xp(f):
                continue
            bucket = classify_bucket(
                _text(f.get("XP Source") or ""),
                str(f.get("Source Key") or ""),
                _text(f.get("Rule Key") or ""),
            )
            if bucket == "Perfect Week":
                all_pw.append(
                    {
                        "id": ev["id"],
                        "source_key": f.get("Source Key"),
                        "xp": xp_amount(f),
                        "reason": str(f.get("Reason Debug") or f.get("Reason Public") or "")[:300],
                        "was": _linked(f.get("Weekly Athlete Summary")),
                        "week": f.get("Week"),
                    }
                )

        za_ids = (reg.get("ids_by_table") or {}).get("Zoom Attendance") or []
        zoom = zoom_analysis(c, enrollment_id, za_ids)
        emails = email_audit(c, enrollment_id, athlete_id)
        dedupe = dedupe_audit(c, reg, enrollment_id)
        matrix = matrix_summary(profile, dry)

        # For recovery/edge, also bucket actual vs matrix category counts (not XP amounts)
        report["profiles"][profile] = {
            "athlete_name": reg.get("athlete_name"),
            "enrollment_id": enrollment_id,
            "athlete_id": athlete_id,
            "registry_status": reg.get("status"),
            "last_completed_step": reg.get("last_completed_step"),
            "enrollment": enr,
            "xp_reconciliation": xp_rec,
            "perfect_week_xp_events": all_pw,
            "perfect_week_was_matrix": pw_matrix,
            "zoom": zoom,
            "email": emails,
            "dedupe": dedupe,
            "expectation_matrix": matrix,
            "registry_counts": {
                t: len(ids) for t, ids in (reg.get("ids_by_table") or {}).items()
            },
        }
        print(
            f"  actual_xp={xp_rec['total_actual_xp']} enroll_lifetime={enr.get('Lifetime XP Total')}",
            flush=True,
        )

    OUT.write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")
    print(f"WROTE {OUT}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
