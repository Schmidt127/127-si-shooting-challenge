"""Deepen 072 simulation: activity-date week filter, makes, PHA/HW, enrollment links."""

from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from season_simulation.airtable_client import (  # noqa: E402
    AirtableClient,
    fields_of,
    linked_ids,
)

ENROLLMENT = "recekm0ke1bihWAc3"
RUN = "SEASON-SIM-2027-20260902T202049Z-athlete1"
ROOT = Path(__file__).resolve().parent
TZ = ZoneInfo("America/Denver")
SCHMIDT = "recCyFEPeATOVNlr9"

ARMED = {
    "rec6jdIPEkloW1rNK",
    "recZE2SgkrnwG7Ogw",
    "recbV3HSCK4WIUtN7",
    "recbHmeL956uvdeg1",
    "recdTXtMj1ri2Qh7J",
    "rechG2pRijDPax314",
}


def to_date_key(value) -> str | None:
    """Match 072 toSafeDateKey spirit: YYYY-MM-DD in America/Denver."""
    if value is None or value == "":
        return None
    if isinstance(value, str):
        # ISO or M/D/YYYY-ish
        m = re.match(r"^(\d{4})-(\d{2})-(\d{2})", value)
        if m:
            # interpret as UTC instant if has T, else calendar date
            if "T" in value:
                try:
                    dt = datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(TZ)
                    return dt.strftime("%Y-%m-%d")
                except Exception:
                    return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
            return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
        m2 = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})", value)
        if m2:
            return f"{int(m2.group(3)):04d}-{int(m2.group(1)):02d}-{int(m2.group(2)):02d}"
    return None


def in_week(key: str | None, start: str | None, end: str | None) -> bool:
    if not key or not start or not end:
        return False
    return start <= key <= end


def batch_get(c, table, ids, fields=None):
    out = {}
    ids = list(ids)
    for i in range(0, len(ids), 20):
        chunk = ids[i : i + 20]
        formula = "OR(" + ",".join(f"RECORD_ID()='{x}'" for x in chunk) + ")"
        for r in c.list_records(table, formula=formula, fields=fields, max_records=100):
            out[r["id"]] = fields_of(r)
    return out


def main() -> int:
    reg = json.loads((ROOT / "run_registries" / f"{RUN}.json").read_text(encoding="utf-8"))
    was_ids = sorted(
        {
            r["record_id"]
            for r in reg["records"]
            if r["table"] == "Weekly Athlete Summary" and "|WAS|" in (r.get("dedupe_key") or "")
        }
    )
    c = AirtableClient(allow_writes=False)

    enr = fields_of(c.get_record("Enrollments", ENROLLMENT))
    enroll_diag = {
        "id": ENROLLMENT,
        "Active?": enr.get("Active?"),
        "is_schmidt": ENROLLMENT == SCHMIDT,
        "Program Instance": linked_ids(enr.get("Program Instance")),
        "Grade Band": linked_ids(enr.get("Grade Band")),
        "Parent Email - Cleaned": enr.get("Parent Email - Cleaned"),
        "Athlete Email - Cleaned": enr.get("Athlete Email - Cleaned"),
        "Parent Email": enr.get("Parent Email"),
        "Athlete Email": enr.get("Athlete Email"),
        "Full Athlete Name": enr.get("Full Athlete Name"),
        "Athlete First Name": enr.get("Athlete First Name"),
    }

    was_rows = []
    for i in range(0, len(was_ids), 20):
        chunk = was_ids[i : i + 20]
        formula = "OR(" + ",".join(f"RECORD_ID()='{rid}'" for rid in chunk) + ")"
        was_rows.extend(c.list_records("Weekly Athlete Summary", formula=formula, max_records=50))

    week_ids = set()
    sub_ids = set()
    xp_ids = set()
    hw_ids = set()
    for r in was_rows:
        f = fields_of(r)
        week_ids.update(linked_ids(f.get("Week")))
        sub_ids.update(linked_ids(f.get("Submissions")))
        xp_ids.update(linked_ids(f.get("XP Events")))
        hw_ids.update(linked_ids(f.get("Homework Completions Link")))

    weeks = {wid: fields_of(c.get_record("Weeks", wid)) for wid in week_ids}
    subs = batch_get(
        c,
        "Submissions",
        sub_ids,
        [
            "Enrollment",
            "Week",
            "Count This Submission?",
            "Total Shots Counted",
            "Total Makes Counted",
            "Activity Date",
            "Perfect Week Countable Submission?",
            "XP Events",
        ],
    )
    xps = batch_get(
        c,
        "XP Events",
        xp_ids,
        ["Enrollment", "Week", "Active?", "XP Points", "Source Key", "XP Source", "XP Bucket"],
    )
    hws = (
        batch_get(
            c,
            "Homework Completions",
            hw_ids,
            ["Enrollment", "Week", "Homework Assignment", "Satisfactory?", "Completion Status"],
        )
        if hw_ids
        else {}
    )

    # PHA for program+weeks
    program_id = (enroll_diag["Program Instance"] or [None])[0]
    grade_id = (enroll_diag["Grade Band"] or [None])[0]
    pha_by_week: dict[str, list] = {wid: [] for wid in week_ids}
    if program_id and week_ids:
        # pull PHA rows referencing these weeks via OR RECORD_ID on Week is hard; fetch by program
        try:
            pha_rows = c.list_records(
                "Program Homework Assignments",
                formula=f"AND({{Active?}}=1, FIND('{program_id}', {{Program Instance}}&''))",
                max_records=200,
            )
        except Exception:
            pha_rows = []
            # fallback: no formula
            try:
                pha_rows = c.list_records(
                    "Program Homework Assignments",
                    formula="{Active?}=1",
                    max_records=500,
                )
            except Exception as exc:
                pha_rows = []
                enroll_diag["pha_error"] = str(exc)[:200]
        for pr in pha_rows:
            pf = fields_of(pr)
            pweeks = linked_ids(pf.get("Week"))
            pprog = linked_ids(pf.get("Program Instance"))
            pgrade = linked_ids(pf.get("Grade Band"))
            if program_id and program_id not in pprog:
                continue
            if grade_id and pgrade and grade_id not in pgrade:
                continue
            for wid in pweeks:
                if wid in pha_by_week:
                    pha_by_week[wid].append(
                        {
                            "id": pr["id"],
                            "Homework Assignment": linked_ids(pf.get("Homework Assignment")),
                            "Homework Slot": pf.get("Homework Slot"),
                            "Grade Band": pgrade,
                        }
                    )

    # candidate XP from run sources for orphan check
    run_sub = {
        r["record_id"] for r in reg["records"] if r["table"] == "Submissions" and r.get("record_id")
    }
    run_hw = {
        r["record_id"]
        for r in reg["records"]
        if r["table"] == "Homework Completions" and r.get("record_id")
    }
    run_vf = {
        r["record_id"] for r in reg["records"] if r["table"] == "Video Feedback" and r.get("record_id")
    }
    more_xp = set(xp_ids)
    if run_sub:
        sm = batch_get(c, "Submissions", run_sub, ["Enrollment", "Week", "XP Events"])
        for sf in sm.values():
            more_xp.update(linked_ids(sf.get("XP Events")))
    if run_hw:
        hm = batch_get(c, "Homework Completions", run_hw, ["Enrollment", "Week", "XP Events"])
        for hf in hm.values():
            more_xp.update(linked_ids(hf.get("XP Events")))
    if run_vf:
        vm = batch_get(c, "Video Feedback", run_vf, ["Enrollment", "Week", "XP Events"])
        for vf in vm.values():
            more_xp.update(linked_ids(vf.get("XP Events")))
    all_xp = batch_get(
        c,
        "XP Events",
        more_xp,
        ["Enrollment", "Week", "Active?", "XP Points", "Source Key", "XP Source", "XP Bucket"],
    )

    results = []
    for r in was_rows:
        f = fields_of(r)
        rid = r["id"]
        wid = (linked_ids(f.get("Week")) or [None])[0]
        wf = weeks.get(wid) or {}
        start_key = to_date_key(wf.get("Start Date"))
        end_key = to_date_key(wf.get("End Date"))

        linked_subs = linked_ids(f.get("Submissions"))
        linked_xp = linked_ids(f.get("XP Events"))
        linked_hw = linked_ids(f.get("Homework Completions Link"))

        throw_reasons = []
        skip_reasons = []

        # enrollment gates
        if not enr.get("Active?"):
            skip_reasons.append("skipped_inactive")
        if ENROLLMENT == SCHMIDT:
            skip_reasons.append("would_skip_schmidt_unless_allowSchmidtInput")
        if f.get("Weekly Email Sent?"):
            skip_reasons.append("skipped_already_sent")

        if len(linked_ids(f.get("Enrollment"))) != 1:
            throw_reasons.append(f"enrollment_link_count={len(linked_ids(f.get('Enrollment')))}")
        if len(linked_ids(f.get("Week"))) != 1:
            throw_reasons.append(f"week_link_count={len(linked_ids(f.get('Week')))}")
        if not enroll_diag["Program Instance"]:
            throw_reasons.append("missing_program_instance")
        if not enroll_diag["Grade Band"]:
            throw_reasons.append("missing_grade_band")

        countable = []
        missing_activity = []
        wrong_owner = []
        for sid in linked_subs:
            sf = subs.get(sid) or {}
            if ENROLLMENT not in linked_ids(sf.get("Enrollment")) or (
                wid and wid not in linked_ids(sf.get("Week"))
            ):
                wrong_owner.append(sid)
                continue
            if not sf.get("Count This Submission?"):
                continue
            ad = to_date_key(sf.get("Activity Date"))
            if not ad:
                missing_activity.append(sid)
                continue
            if not in_week(ad, start_key, end_key):
                continue
            countable.append(sid)

        if wrong_owner:
            throw_reasons.append(f"submission_wrong_owner={wrong_owner}")
        if missing_activity:
            throw_reasons.append(f"countable_missing_activity_date={missing_activity}")

        scanned_shots = sum(float((subs.get(s) or {}).get("Total Shots Counted") or 0) for s in countable)
        scanned_makes = sum(float((subs.get(s) or {}).get("Total Makes Counted") or 0) for s in countable)
        summary_shots = f.get("Total Shots This Week")
        summary_makes = f.get("Total Makes This Week")
        if summary_shots is not None and abs(float(summary_shots) - scanned_shots) > 0.001:
            throw_reasons.append(
                f"shots_disagreement summary={summary_shots} scanned={scanned_shots} (in_range_countable={len(countable)} linked={len(linked_subs)})"
            )
        if summary_makes is not None and abs(float(summary_makes) - scanned_makes) > 0.001:
            throw_reasons.append(
                f"makes_disagreement summary={summary_makes} scanned={scanned_makes}"
            )

        # XP orphans + disagreement
        was_xp_set = set(linked_xp)
        orphans = []
        for xid, xf in all_xp.items():
            if not xf.get("Active?"):
                continue
            if ENROLLMENT not in linked_ids(xf.get("Enrollment")):
                continue
            if wid and wid not in linked_ids(xf.get("Week")):
                continue
            if xid not in was_xp_set:
                orphans.append(
                    {
                        "id": xid,
                        "pts": float(xf.get("XP Points") or 0),
                        "Source Key": xf.get("Source Key"),
                        "XP Source": xf.get("XP Source"),
                    }
                )
        if orphans:
            throw_reasons.append(
                f"unlinked_xp n={len(orphans)} pts={sum(o['pts'] for o in orphans)} ids={[o['id'] for o in orphans]}"
            )

        linked_active_sum = 0.0
        for xid in linked_xp:
            xf = xps.get(xid) or all_xp.get(xid) or {}
            if not xf:
                throw_reasons.append(f"was_linked_xp_missing={xid}")
                continue
            if xf.get("Active?") and (
                ENROLLMENT not in linked_ids(xf.get("Enrollment"))
                or (wid and wid not in linked_ids(xf.get("Week")))
            ):
                throw_reasons.append(f"xp_wrong_owner={xid}")
            if xf.get("Active?"):
                linked_active_sum += float(xf.get("XP Points") or 0)
        summary_xp = f.get("XP Earned This Week")
        if summary_xp is not None and abs(float(summary_xp) - linked_active_sum) > 0.001:
            throw_reasons.append(
                f"xp_disagreement summary={summary_xp} linked_active={linked_active_sum}"
            )

        # PHA / homework
        pha_rows = pha_by_week.get(wid or "", [])
        pha_hw_ids = set()
        for p in pha_rows:
            ha = p.get("Homework Assignment") or []
            if len(ha) != 1:
                throw_reasons.append(f"pha_bad_hw_link={p['id']} n={len(ha)}")
            pha_hw_ids.update(ha)

        for hid in linked_hw:
            hf = hws.get(hid) or {}
            if not hf:
                throw_reasons.append(f"hw_missing={hid}")
                continue
            if ENROLLMENT not in linked_ids(hf.get("Enrollment")) or (
                wid and wid not in linked_ids(hf.get("Week"))
            ):
                throw_reasons.append(f"hw_wrong_owner={hid}")
            if pha_hw_ids:
                ha = linked_ids(hf.get("Homework Assignment"))
                if not set(ha) & pha_hw_ids:
                    throw_reasons.append(
                        f"hw_not_on_pha_schedule={hid} ha={ha} pha={sorted(pha_hw_ids)}"
                    )

        # recipients
        parent = enr.get("Parent Email - Cleaned") or enr.get("Parent Email")
        athlete = enr.get("Athlete Email - Cleaned") or enr.get("Athlete Email")
        if not parent and not athlete:
            throw_reasons.append("missing_recipient")

        results.append(
            {
                "id": rid,
                "armed": rid in ARMED,
                "week_display": f.get("Week - Display"),
                "week_id": wid,
                "week_start": start_key,
                "week_end": end_key,
                "Build": f.get("Build Weekly Email Now?"),
                "Sent": f.get("Weekly Email Sent?"),
                "Make": f.get("Send to Make?"),
                "Ready": f.get("Weekly Email Ready?"),
                "Error": f.get("Weekly Email Error"),
                "summary_shots": summary_shots,
                "scanned_shots": scanned_shots,
                "summary_makes": summary_makes,
                "scanned_makes": scanned_makes,
                "summary_xp": summary_xp,
                "linked_active_xp": linked_active_sum,
                "linked_subs": len(linked_subs),
                "in_range_countable": len(countable),
                "linked_xp": len(linked_xp),
                "linked_hw": len(linked_hw),
                "pha_count": len(pha_rows),
                "orphans": orphans,
                "skip_reasons": skip_reasons,
                "throw_reasons": throw_reasons,
                "Threshold XP Status": f.get("Threshold XP Status"),
                "Threshold XP Ready?": f.get("Threshold XP Ready?"),
                "Parent Email - Cleaned": f.get("Parent Email - Cleaned"),
                "Combined Recipient Emails": f.get("Combined Recipient Emails"),
                "PW Eligible": f.get("Perfect Week Eligible?"),
                "PW Status": f.get("Perfect Week Automation Status"),
                "PW Error": f.get("Perfect Week Automation Error"),
                "PW Zoom": f.get("Perfect Week Zoom Requirement Status"),
                "PW Video Met": f.get("Perfect Week Video Requirement Met?"),
                "PW HW Met": f.get("Perfect Week Homework Requirement Met?"),
            }
        )

    # Email handoff check
    handoffs = []
    try:
        for wid_was in was_ids:
            rows = c.list_records(
                "Email Handoff Queue",
                formula=f"OR(FIND('{wid_was}', {{Source Record ID}}&''), FIND('{wid_was}', {{Handoff Key}}), FIND('{wid_was}', {{Payload JSON}}))",
                max_records=20,
            )
            for row in rows:
                hf = fields_of(row)
                handoffs.append(
                    {
                        "id": row["id"],
                        "Event Type": hf.get("Event Type") or hf.get("Email Event Type"),
                        "Status": hf.get("Status"),
                        "Source Record ID": hf.get("Source Record ID"),
                        "Handoff Key": hf.get("Handoff Key"),
                    }
                )
    except Exception as exc:
        handoffs = [{"error": str(exc)[:300]}]

    # Also WEEKLY + enrollment
    try:
        rows = c.list_records(
            "Email Handoff Queue",
            formula=f"AND(FIND('WEEKLY', {{Event Type}}&''), FIND('{ENROLLMENT}', {{Enrollment Record ID}}&''))",
            max_records=50,
        )
        weekly_enroll = [{"id": r["id"], **{k: fields_of(r).get(k) for k in ("Event Type", "Status", "Source Record ID", "Handoff Key", "Enrollment Record ID")}} for r in rows]
    except Exception as exc:
        weekly_enroll = [{"error": str(exc)[:300]}]

    out = {
        "enrollment": enroll_diag,
        "handoffs_for_was_ids": handoffs,
        "weekly_handoffs_for_enrollment": weekly_enroll,
        "results": sorted(results, key=lambda x: (not x["armed"], x.get("week_start") or "", x["id"])),
    }
    path = ROOT / "reports" / f"weekly-email-072-deep-{RUN}.json"
    path.write_text(json.dumps(out, indent=2, default=str), encoding="utf-8")
    print(json.dumps({"path": str(path), "enrollment": enroll_diag, "armed_throws": [
        {"id": x["id"], "week": x["week_display"], "throws": x["throw_reasons"], "skips": x["skip_reasons"], "Build": x["Build"]}
        for x in out["results"] if x["armed"]
    ], "handoff_n": len(handoffs), "weekly_enroll_n": len(weekly_enroll) if weekly_enroll and "error" not in weekly_enroll[0] else weekly_enroll}, indent=2, default=str))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
