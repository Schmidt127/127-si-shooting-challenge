"""Full READ-ONLY XP + Perfect Week + multi-athlete forensic for 222521Z."""
from __future__ import annotations

import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parent))
sys.stdout.reconfigure(encoding="utf-8")

from season_simulation.airtable_client import AirtableClient, fields_of

RUN = "SEASON-SIM-2027-20260912T222521Z-threeathlete"
OUT = ROOT / "reports" / f"forensic-full-{RUN}.json"
DRY = json.loads((ROOT / "reports" / "sc001-dry-run-latest.json").read_text(encoding="utf-8"))
ORACLE = json.loads((ROOT / "expected_perfect_season_xp.json").read_text(encoding="utf-8"))
SAFE = {"schmidt@fairfieldbasketballclub.com", "mike@127sportsintensity.com"}
EMAIL_RE = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.I)

PROFILES = {
    "athlete1_perfect": f"{RUN}__athlete1-perfect.json",
    "athlete2_recovery": f"{RUN}__athlete2-recovery.json",
    "athlete3_edge": f"{RUN}__athlete3-edge.json",
}


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
    out = []
    for x in v if isinstance(v, list) else [v]:
        if isinstance(x, dict):
            out.append(str(x.get("id") or ""))
        else:
            out.append(str(x))
    return [x for x in out if x]


def _num(v: Any) -> int:
    if v is None or v == "":
        return 0
    try:
        return int(float(str(v).replace(",", "")))
    except ValueError:
        return 0


def _truthy(v: Any) -> bool:
    if v is True or v == 1:
        return True
    return str(v or "").strip().lower() in {"1", "1.0", "true", "yes", "checked"}


def classify(source: str, source_key: str, bucket_field: str = "", rule_key: str = "") -> str:
    sk = (source_key or "").upper()
    src = (source or "").strip()
    bf = (bucket_field or "").strip()
    rk = (rule_key or "").upper()
    blob = " ".join([src, sk, bf, rk]).upper()

    if "PERFECT_WEEK" in blob or src == "Perfect Week" or bf == "Perfect Week":
        return "Perfect Week"
    if sk.startswith("SUBMISSION_XP") or "SHOOTING_BASE" in blob or src in {"Shooting Base", "Submission Base"} or bf in {"Shooting Base", "Submission Base"}:
        return "Submission Base"
    if sk.startswith("HOMEWORK_XP") or "HOMEWORK" in blob or "Homework" in src or "Homework" in bf:
        return "Homework Completion"
    if "VIDEO" in blob or "Video" in src or "Video" in bf:
        return "Video Feedback"
    if "WEEKLY_THRESHOLD" in blob or "Threshold" in src or "Threshold" in bf:
        return "Weekly Threshold"
    if "SHOT_MILESTONE" in blob or "Milestone" in src or "Milestone" in bf:
        return "Shot Milestone"
    if "ZOOM" in blob or "Recording" in src or "Zoom" in bf:
        return "Zoom Attendance / Recording"
    if "STREAK" in blob or "Streak" in src or "Streak" in bf:
        return "Streak"
    return f"OTHER:{src or bf or sk[:40] or 'unknown'}"


def oracle_expected_buckets() -> dict[str, dict[str, int]]:
    by: dict[str, dict[str, int]] = defaultdict(lambda: {"count": 0, "xp": 0})
    for e in ORACLE["events"]:
        src = str(e.get("source") or e.get("rule_key") or "")
        b = classify(src, "", "", str(e.get("rule_key") or ""))
        if src.startswith("STREAK") or "Streak" in src:
            b = "Streak"
        elif "THRESHOLD" in src.upper():
            b = "Weekly Threshold"
        elif src in {"SHOOTING_BASE", "Shooting Base"}:
            b = "Submission Base"
        elif src in {"HOMEWORK_COMPLETION", "Homework Completion"}:
            b = "Homework Completion"
        elif src in {"VIDEO_SUBMISSION", "Video Submission"}:
            b = "Video Feedback"
        elif src in {"PERFECT_WEEK", "Perfect Week"}:
            b = "Perfect Week"
        elif src in {"SHOT_MILESTONE", "Shot Milestone"}:
            b = "Shot Milestone"
        elif "ZOOM" in src.upper():
            b = "Zoom Attendance / Recording"
        by[b]["count"] += 1
        by[b]["xp"] += int(e["xp"])
    return dict(by)


def fetch_xp(c: AirtableClient, enrollment_id: str) -> list[dict]:
    # Prefer Enrollment Record ID formula (confirmed working)
    rows = c.list_records(
        "XP Events",
        formula=f"{{Enrollment Record ID}} = '{enrollment_id}'",
    )
    out = []
    for r in rows:
        out.append({"id": r["id"], "fields": fields_of(r)})
    return out


def is_active(f: dict) -> bool:
    if _truthy(f.get("Voided?")):
        return False
    status = _text(f.get("XP Award Status") or f.get("Status")).lower()
    if status in {"void", "voided", "inactive", "reversed", "deleted"}:
        return False
    if "Active?" in f and f.get("Active?") is False:
        return False
    # Active XP Points may be 0 when inactive
    return True


def xp_points(f: dict) -> int:
    for k in ("Active XP Points", "XP Points", "XP Amount", "XP"):
        if f.get(k) not in (None, ""):
            return _num(f.get(k))
    return 0


def reconcile_xp(events: list[dict], expected: dict[str, dict[str, int]] | None) -> dict:
    buckets: dict[str, dict] = defaultdict(
        lambda: {"actual_count": 0, "actual_xp": 0, "source_keys": [], "events": [], "by_source": Counter()}
    )
    inactive = 0
    all_keys = []
    for ev in events:
        f = ev["fields"]
        if not is_active(f):
            inactive += 1
            continue
        sk = str(f.get("Source Key") or "")
        src = _text(f.get("XP Source"))
        bf = _text(f.get("XP Bucket"))
        rk = _text(f.get("Rule Key"))
        b = classify(src, sk, bf, rk)
        amt = xp_points(f)
        buckets[b]["actual_count"] += 1
        buckets[b]["actual_xp"] += amt
        buckets[b]["source_keys"].append(sk)
        buckets[b]["by_source"][src or bf or sk.split("|")[0]] += amt
        buckets[b]["events"].append(
            {
                "id": ev["id"],
                "source_key": sk,
                "xp_source": src,
                "xp_bucket": bf,
                "xp": amt,
                "reason": str(f.get("XP Reason Public") or f.get("Reason Debug") or "")[:180],
                "was": _linked(f.get("Weekly Athlete Summary")),
                "week": _linked(f.get("Week")),
                "activity_date": f.get("XP Activity Date") or f.get("XP Date Resolved"),
            }
        )
        all_keys.append(sk)

    key_counts = Counter([k for k in all_keys if k])
    dups = {k: n for k, n in key_counts.items() if n > 1}

    out_buckets = {}
    names = set(buckets) | set(expected or {})
    for name in sorted(names):
        exp = (expected or {}).get(name) or {"count": 0, "xp": 0}
        act = buckets.get(name) or {"actual_count": 0, "actual_xp": 0, "source_keys": [], "events": [], "by_source": Counter()}
        out_buckets[name] = {
            "expected_event_count": exp.get("count", 0),
            "actual_active_event_count": act["actual_count"],
            "expected_xp": exp.get("xp", 0),
            "actual_xp": act["actual_xp"],
            "difference_xp": act["actual_xp"] - int(exp.get("xp", 0)),
            "difference_count": act["actual_count"] - int(exp.get("count", 0)),
            "duplicate_count": sum(1 for k in act["source_keys"] if key_counts.get(k, 0) > 1),
            "duplicate_source_keys": sorted({k for k in act["source_keys"] if key_counts.get(k, 0) > 1}),
            "by_source_xp": dict(act["by_source"]),
            "events": act["events"],
        }

    return {
        "buckets": out_buckets,
        "total_actual_xp": sum(b["actual_xp"] for b in out_buckets.values()),
        "total_expected_xp": sum(b["expected_xp"] for b in out_buckets.values()) if expected else None,
        "inactive_or_voided": inactive,
        "duplicate_source_keys": dups,
        "active_event_count": sum(b["actual_active_event_count"] for b in out_buckets.values()),
    }


def audit_was(c: AirtableClient, was_ids: list[str]) -> list[dict]:
    rows = []
    for rid in was_ids:
        f = fields_of(c.get_record("Weekly Athlete Summary", rid))
        # skip non-week rows if any
        label = _text(f.get("Week Label") or f.get("Week Name") or f.get("Name"))
        row = {
            "was_rid": rid,
            "week_label": label,
            "week_start": f.get("Week Start Date"),
            "week_end": f.get("Week End Date"),
            "days_logged": f.get("Days Logged"),
            "pw_qualifying_days": f.get("Perfect Week Qualifying Days"),
            "weekly_shot_target": f.get("Weekly Shot Target") or f.get("Shot Target") or f.get("Weekly Goal Shots"),
            "actual_shots": f.get("Weekly Shots") or f.get("Shots This Week") or f.get("Counted Shots This Week") or f.get("Total Shots"),
            "scaled_target": f.get("Scaled Weekly Shot Target") or f.get("Scaled Target"),
            "hw_assigned": f.get("Perfect Week Homework Assigned Count"),
            "hw_satisfactory_by_week_end": f.get("Perfect Week Homework Satisfactory Count"),
            "video_count": f.get("Perfect Week Video Count"),
            "zoom_required_hint": f.get("Perfect Week Zoom Meeting Count"),
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
            "unlock_rids": _linked(f.get("Perfect Week Unlock") or f.get("Perfect Week Unlocks")),
        }
        # grab any remaining Perfect Week fields
        extras = {k: v for k, v in f.items() if "Perfect Week" in k and k not in str(row)}
        row["extras"] = extras
        rows.append(row)
    return rows


def enroll_snap(c: AirtableClient, eid: str) -> dict:
    f = fields_of(c.get_record("Enrollments", eid))
    keep = {}
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
                "perfect",
                "email",
                "submission",
                "homework",
                "video",
                "next",
                "current",
            )
        ):
            keep[k] = v
    return keep


def zoom_snap(c: AirtableClient, za_ids: list[str]) -> list[dict]:
    out = []
    for zid in za_ids:
        f = fields_of(c.get_record("Zoom Attendance", zid))
        out.append(
            {
                "id": zid,
                **{
                    k: f.get(k)
                    for k in f
                    if any(
                        x in k.lower()
                        for x in (
                            "name",
                            "mode",
                            "status",
                            "credit",
                            "perfect",
                            "meeting",
                            "enroll",
                            "attend",
                            "record",
                            "type",
                            "xp",
                            "week",
                            "method",
                        )
                    )
                },
            }
        )
    return out


def email_audit(c: AirtableClient, enrollment_id: str) -> dict:
    formulas = [
        f"FIND('{RUN}', {{Dedupe Key}} & '')",
        f"FIND('{enrollment_id}', {{Enrollment Record ID}} & '')",
        f"{{Enrollment Record ID}} = '{enrollment_id}'",
    ]
    rows = []
    errors = []
    for formula in formulas:
        try:
            rows = c.list_records("Email Handoff Queue", formula=formula)
            if rows:
                break
        except Exception as e:
            errors.append(str(e)[:200])
    matched = []
    for r in rows:
        f = fields_of(r)
        blob = json.dumps(f, default=str)
        if enrollment_id in blob or RUN in blob:
            matched.append({"id": r["id"], "fields": f})
    by_type = Counter()
    statuses = Counter()
    recipients = Counter()
    unsafe = []
    dkeys = Counter()
    for m in matched:
        f = m["fields"]
        et = _text(f.get("Event Type") or f.get("Email Type") or f.get("Template") or "unknown")
        by_type[et] += 1
        statuses[_text(f.get("Status") or f.get("Send Status"))] += 1
        for em in EMAIL_RE.findall(json.dumps(f, default=str)):
            recipients[em.lower()] += 1
            if em.lower() not in SAFE and "fairfield" not in em.lower() and "127sports" not in em.lower():
                unsafe.append({"id": m["id"], "email": em.lower(), "type": et})
        dkeys[str(f.get("Dedupe Key") or m["id"])] += 1
    return {
        "matched_count": len(matched),
        "by_type": dict(by_type),
        "statuses": dict(statuses),
        "recipients": dict(recipients),
        "unsafe_recipients": unsafe,
        "duplicate_dedupe_keys": {k: n for k, n in dkeys.items() if n > 1},
        "errors": errors,
        "sample": [
            {
                "id": m["id"],
                "type": _text(m["fields"].get("Event Type") or m["fields"].get("Email Type")),
                "status": _text(m["fields"].get("Status") or m["fields"].get("Send Status")),
                "to": _text(m["fields"].get("To Email") or m["fields"].get("Recipient Email") or m["fields"].get("Recipient")),
            }
            for m in matched[:40]
        ],
    }


def dedupe_audit(c: AirtableClient, reg: dict, enrollment_id: str, xp_rec: dict) -> dict:
    out = {
        "duplicate_xp_source_keys": xp_rec.get("duplicate_source_keys") or {},
        "registry_dupes": {},
    }
    for table in ["Submissions", "Homework Completions", "Video Feedback", "Zoom Attendance"]:
        keys = [
            r.get("dedupe_key")
            for r in (reg.get("records") or [])
            if r.get("table") == table and r.get("dedupe_key")
        ]
        kc = Counter(keys)
        out["registry_dupes"][table] = {k: n for k, n in kc.items() if n > 1}
        out[f"registry_{table}_count"] = len(keys)

    # streak occurrences
    try:
        streaks = c.list_records(
            "Streak Occurrences",
            formula=f"{{Enrollment Record ID}} = '{enrollment_id}'",
        )
    except Exception:
        try:
            streaks = c.list_records(
                "Streak Occurrences",
                formula=f"FIND('{enrollment_id}', {{Enrollment Record ID}} & '')",
            )
        except Exception as e:
            streaks = []
            out["streak_error"] = str(e)[:200]
    skeys = []
    for s in streaks:
        f = fields_of(s)
        skeys.append(str(f.get("Occurrence Key") or f.get("Source Key") or f.get("Streak Occurrence Key") or s["id"]))
    sc = Counter(skeys)
    out["streak_occurrences"] = len(skeys)
    out["duplicate_streak_keys"] = {k: n for k, n in sc.items() if n > 1}

    # PW unlocks
    try:
        unlocks = c.list_records(
            "Athlete Achievement Unlocks",
            formula=f"{{Enrollment Record ID}} = '{enrollment_id}'",
        )
    except Exception:
        try:
            unlocks = c.list_records(
                "Athlete Achievement Unlocks",
                formula=f"FIND('{enrollment_id}', {{Enrollment Record ID}} & '')",
            )
        except Exception as e:
            unlocks = []
            out["unlock_error"] = str(e)[:200]
    pw = []
    for u in unlocks:
        f = fields_of(u)
        name = _text(f.get("Achievement Name") or f.get("Name") or f.get("Achievement"))
        key = str(f.get("Source Key") or f.get("Unlock Key") or "")
        blob = (name + " " + key).upper()
        if "PERFECT" in blob:
            pw.append({"id": u["id"], "name": name, "source_key": key})
    uk = Counter(x["source_key"] or x["id"] for x in pw)
    out["perfect_week_unlocks"] = pw
    out["duplicate_pw_unlock_keys"] = {k: n for k, n in uk.items() if n > 1}
    out["all_unlock_count"] = len(unlocks)
    return out


def failing_reason(row: dict) -> str:
    if _truthy(row.get("eligible")):
        return "none — eligible"
    parts = []
    if row.get("automation_error"):
        parts.append(str(row["automation_error"]))
    if row.get("daily_detail"):
        parts.append(str(row["daily_detail"]))
    if row.get("automation_status"):
        parts.append(f"status={row['automation_status']}")
    for label, key in [
        ("daily", "daily_met"),
        ("homework", "hw_met"),
        ("video", "video_met"),
        ("zoom", "zoom_met"),
    ]:
        v = row.get(key)
        if v is False or str(v).strip() in {"0", "0.0", "false", "False"}:
            parts.append(f"{label}_requirement_not_met")
    return " | ".join(parts) if parts else "unknown — not eligible, no detail"


def main() -> int:
    c = AirtableClient(allow_writes=False)
    expected = oracle_expected_buckets()
    report: dict[str, Any] = {
        "run_id": RUN,
        "mode": "READ_ONLY",
        "oracle_expected_buckets": expected,
        "oracle_total": ORACLE["expected_perfect_season_xp"],
        "profiles": {},
    }

    for profile, reg_name in PROFILES.items():
        print(f"=== {profile} ===", flush=True)
        reg = json.loads((ROOT / "run_registries" / reg_name).read_text(encoding="utf-8"))
        eid = reg["enrollment_id"]
        enr = enroll_snap(c, eid)
        events = fetch_xp(c, eid)
        print(f"  xp events {len(events)}", flush=True)
        exp = expected if profile == "athlete1_perfect" else None
        xp_rec = reconcile_xp(events, exp)

        was_ids = (reg.get("ids_by_table") or {}).get("Weekly Athlete Summary") or []
        # unique preserve order; prefer 10 week rows
        was_ids = list(dict.fromkeys(was_ids))
        was = audit_was(c, was_ids)
        print(f"  was {len(was)}", flush=True)

        # attach PW XP event ids to weeks
        pw_events = (xp_rec["buckets"].get("Perfect Week") or {}).get("events") or []
        for row in was:
            matching = [e for e in pw_events if row["was_rid"] in (e.get("was") or [])]
            # fallback: week label in source key / reason
            if not matching:
                matching = [
                    e
                    for e in pw_events
                    if row["week_label"]
                    and row["week_label"].replace(" ", "") in str(e.get("source_key") or "").replace(" ", "")
                ]
            row["perfect_week_xp_event_rids"] = [e["id"] for e in matching]
            row["exact_failing_reason"] = failing_reason(row)

        za_ids = (reg.get("ids_by_table") or {}).get("Zoom Attendance") or []
        zoom = zoom_snap(c, za_ids)
        emails = email_audit(c, eid)
        dedupe = dedupe_audit(c, reg, eid, xp_rec)
        matrix = ((DRY.get("expectations") or {}).get("matrices") or {}).get(profile) or {}

        # category count compare for recovery/edge
        matrix_cats = matrix.get("expected_xp_by_category") or {}
        cat_compare = {}
        # map matrix keys to forensic buckets
        map_m = {
            "SUBMISSION_XP": "Submission Base",
            "HOMEWORK_XP": "Homework Completion",
            "VIDEO_SUBMISSION": "Video Feedback",
            "STREAK_XP": "Streak",
            "WEEKLY_THRESHOLD": "Weekly Threshold",
            "PERFECT_WEEK": "Perfect Week",
            "SHOT_MILESTONE": "Shot Milestone",
            "ZOOM_ATTEND_BASE": "Zoom Attendance / Recording",
            "ZOOM_RECORDING_CREDIT": "Zoom Attendance / Recording",
            "ZOOM_ATTEND_BONUS_2": "Zoom Attendance / Recording",
            "ZOOM_ATTEND_BONUS_3": "Zoom Attendance / Recording",
        }
        # For non-perfect, compare counts only by summing zoom matrix keys
        if profile != "athlete1_perfect":
            expected_counts = defaultdict(int)
            for mk, bucket in map_m.items():
                expected_counts[bucket] += int(matrix_cats.get(mk) or 0)
            for bucket, exp_count in expected_counts.items():
                act = xp_rec["buckets"].get(bucket) or {}
                cat_compare[bucket] = {
                    "expected_event_count": exp_count,
                    "actual_active_event_count": act.get("actual_active_event_count", 0),
                    "actual_xp": act.get("actual_xp", 0),
                    "difference_count": act.get("actual_active_event_count", 0) - exp_count,
                }

        report["profiles"][profile] = {
            "athlete_name": reg.get("athlete_name"),
            "enrollment_id": eid,
            "athlete_id": reg.get("athlete_id"),
            "registry_status": reg.get("status"),
            "last_step": reg.get("last_completed_step"),
            "enrollment": enr,
            "xp": xp_rec,
            "perfect_week_matrix": was,
            "zoom_attendance": zoom,
            "email": emails,
            "dedupe": dedupe,
            "expectation_matrix_summary": {
                "expected_perfect_weeks": matrix.get("expected_perfect_week_count"),
                "expected_xp_by_category": matrix_cats,
                "expected_goal_met_date": matrix.get("expected_goal_met_date"),
                "expected_level_note": matrix.get("expected_level_note"),
                "weekly_perfect_week": [
                    {
                        "week": r.get("week_label"),
                        "perfect_week": r.get("perfect_week"),
                        "zoom": r.get("zoom_state"),
                        "video": r.get("video_count"),
                    }
                    for r in (matrix.get("weekly_rows") or [])
                ],
                "expected_email_handoffs": matrix.get("expected_email_handoffs"),
            },
            "matrix_count_compare": cat_compare,
            "lifetime_xp_total": enr.get("Lifetime XP Total"),
            "public_level": enr.get("Current Level - Public Facing Display"),
            "level_status": enr.get("Level Status"),
            "gate_debug": enr.get("Gate Debug Summary"),
        }
        print(
            f"  XP={xp_rec['total_actual_xp']} lifetime={enr.get('Lifetime XP Total')} "
            f"level={enr.get('Current Level - Public Facing Display')} gate={enr.get('Level Status')}",
            flush=True,
        )

    OUT.write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")
    print("WROTE", OUT)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
