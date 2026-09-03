"""Read-only diagnosis of 072 weekly email failures for a season-sim run."""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from season_simulation.airtable_client import AirtableClient, fields_of, linked_ids  # noqa: E402

ENROLLMENT = "recekm0ke1bihWAc3"
RUN = "SEASON-SIM-2027-20260902T202049Z-athlete1"
ROOT = Path(__file__).resolve().parent

WAS_FIELDS = [
    "Enrollment",
    "Week",
    "Week - Display",
    "Build Weekly Email Now?",
    "Weekly Email Sent?",
    "Send to Make?",
    "Weekly Email Ready?",
    "Weekly Email Error",
    "Weekly Email Sent At",
    "Total Shots This Week",
    "Total Makes This Week",
    "XP Earned This Week",
    "Days Logged This Week",
    "Threshold XP Status",
    "Threshold XP Ready?",
    "Submissions",
    "XP Events",
    "Homework Completions Link",
    "Perfect Week Eligible?",
    "Perfect Week Automation Status",
    "Perfect Week Automation Error",
    "Perfect Week Zoom Requirement Met?",
    "Perfect Week Zoom Requirement Status",
    "Perfect Week Video Requirement Met?",
    "Perfect Week Homework Requirement Met?",
    "Parent Email - Cleaned",
    "Combined Recipient Emails",
    "Weekly Email Recipients",
    "Weekly Email Subject",
]

SUB_FIELDS = [
    "Enrollment",
    "Week",
    "Count This Submission?",
    "Total Shots Counted",
    "Total Makes Counted",
    "Activity Date",
    "Perfect Week Countable Submission?",
    "XP Events",
]

XP_FIELDS = [
    "Enrollment",
    "Week",
    "Active?",
    "XP Points",
    "Source Key",
    "XP Source",
    "XP Bucket",
]


def batch_get(c: AirtableClient, table: str, ids: set[str], fields: list[str] | None = None) -> dict[str, dict]:
    out: dict[str, dict] = {}
    id_list = list(ids)
    for i in range(0, len(id_list), 20):
        chunk = id_list[i : i + 20]
        formula = "OR(" + ",".join(f"RECORD_ID()='{x}'" for x in chunk) + ")"
        rows = c.list_records(table, formula=formula, fields=fields, max_records=100)
        for r in rows:
            out[r["id"]] = fields_of(r)
    return out


def xp_points(xf: dict) -> float:
    try:
        return float(xf.get("XP Points") or 0)
    except (TypeError, ValueError):
        return 0.0


def main() -> int:
    reg = json.loads((ROOT / "run_registries" / f"{RUN}.json").read_text(encoding="utf-8"))
    armed = {
        r["record_id"]
        for r in reg["records"]
        if "WAS_EMAIL_ARM" in (r.get("dedupe_key") or "")
    }
    was_create_ids = {
        r["record_id"]
        for r in reg["records"]
        if r["table"] == "Weekly Athlete Summary" and "|WAS|" in (r.get("dedupe_key") or "")
    }

    c = AirtableClient(allow_writes=False)
    out: dict = {
        "base_id": c.base_id,
        "enrollment_id": ENROLLMENT,
        "armed_ids": sorted(armed),
        "registry_was_create_ids": sorted(was_create_ids),
    }

    enr = c.get_record("Enrollments", ENROLLMENT)
    ef = fields_of(enr)
    out["enrollment"] = {
        k: ef.get(k)
        for k in (
            "Name",
            "Active?",
            "Enrollment Active?",
            "Status",
            "Parent Email - Cleaned",
            "Parent Email",
            "Athlete Email - Cleaned",
            "Athlete Email",
            "Combined Recipient Emails",
        )
    }

    # Prefer exact registry WAS create IDs (linked Enrollment formula is unreliable).
    was_ids = sorted(was_create_ids) or sorted(armed)
    was_rows: list[dict] = []
    for i in range(0, len(was_ids), 20):
        chunk = was_ids[i : i + 20]
        formula = "OR(" + ",".join(f"RECORD_ID()='{rid}'" for rid in chunk) + ")"
        was_rows.extend(c.list_records("Weekly Athlete Summary", formula=formula, max_records=50))
    # Dedupe by id
    seen: set[str] = set()
    deduped = []
    for r in was_rows:
        if r["id"] in seen:
            continue
        seen.add(r["id"])
        deduped.append(r)
    was_rows = deduped
    out["was_count"] = len(was_rows)
    out["was_fetch_note"] = f"fetched {len(was_rows)} by registry create ids"

    all_sub_ids: set[str] = set()
    all_xp_ids: set[str] = set()
    week_ids: set[str] = set()
    for r in was_rows:
        f = fields_of(r)
        all_sub_ids.update(linked_ids(f.get("Submissions")))
        all_xp_ids.update(linked_ids(f.get("XP Events")))
        week_ids.update(linked_ids(f.get("Week")))

    weeks: dict[str, dict] = {}
    for wid in week_ids:
        wf = fields_of(c.get_record("Weeks", wid))
        weeks[wid] = {
            "Name": wf.get("Name") or wf.get("Week Name") or wf.get("Week"),
            "Start Date": wf.get("Start Date"),
            "End Date": wf.get("End Date"),
            "Week Number": wf.get("Week Number") or wf.get("Week #"),
        }

    # Also pull run submissions/HW/VF so we can discover XP Events not linked on WAS.
    run_sub_ids = {
        r["record_id"] for r in reg["records"] if r["table"] == "Submissions" and r.get("record_id")
    }
    run_hw_ids = {
        r["record_id"]
        for r in reg["records"]
        if r["table"] == "Homework Completions" and r.get("record_id")
    }
    run_vf_ids = {
        r["record_id"] for r in reg["records"] if r["table"] == "Video Feedback" and r.get("record_id")
    }
    candidate_xp_ids = set(all_xp_ids)
    sub_map = batch_get(c, "Submissions", all_sub_ids | run_sub_ids, SUB_FIELDS) if (all_sub_ids or run_sub_ids) else {}
    for sf in sub_map.values():
        candidate_xp_ids.update(linked_ids(sf.get("XP Events")))

    if run_hw_ids:
        hw_map = batch_get(
            c,
            "Homework Completions",
            run_hw_ids,
            ["Enrollment", "Week", "XP Events", "Total Homework XP Awarded"],
        )
        for hf in hw_map.values():
            candidate_xp_ids.update(linked_ids(hf.get("XP Events")))
    else:
        hw_map = {}

    if run_vf_ids:
        vf_map = batch_get(
            c,
            "Video Feedback",
            run_vf_ids,
            ["Enrollment", "Week", "XP Events", "Total Video XP Awarded"],
        )
        for vf in vf_map.values():
            candidate_xp_ids.update(linked_ids(vf.get("XP Events")))
    else:
        vf_map = {}

    # Athlete-linked XP (ARRAYJOIN on Athlete uses display names; use Athlete record id via &'')
    athlete_id = reg.get("athlete_id") or ""
    athlete_xp_rows: list[dict] = []
    if athlete_id:
        try:
            athlete_xp_rows = c.list_records(
                "XP Events",
                formula=f"AND({{Active?}}=1, FIND('{athlete_id}', {{Athlete}}&''))",
                fields=XP_FIELDS + (["Athlete"] if "Athlete" not in XP_FIELDS else []),
                max_records=500,
            )
        except Exception as exc:
            out["athlete_xp_fetch_error"] = str(exc)[:300]
            try:
                athlete_xp_rows = c.list_records(
                    "XP Events",
                    formula=f"AND({{Active?}}=1, FIND('{athlete_id}', ARRAYJOIN({{Athlete}})))",
                    fields=XP_FIELDS,
                    max_records=500,
                )
            except Exception as exc2:
                out["athlete_xp_fetch_error2"] = str(exc2)[:300]

    for r in athlete_xp_rows:
        candidate_xp_ids.add(r["id"])

    xp_map = batch_get(c, "XP Events", candidate_xp_ids, XP_FIELDS) if candidate_xp_ids else {}
    # Normalize athlete rows into xp_map
    for r in athlete_xp_rows:
        xp_map.setdefault(r["id"], fields_of(r))

    xp_all_rows = [
        {"id": xid, "fields": xf}
        for xid, xf in xp_map.items()
        if xf.get("Active?") and ENROLLMENT in linked_ids(xf.get("Enrollment"))
    ]
    out["active_xp_for_enrollment"] = len(xp_all_rows)
    out["candidate_xp_ids"] = len(candidate_xp_ids)
    out["athlete_xp_rows"] = len(athlete_xp_rows)

    results = []
    for r in was_rows:
        f = fields_of(r)
        rid = r["id"]
        week_link = linked_ids(f.get("Week"))
        wid = week_link[0] if week_link else None
        sub_ids = linked_ids(f.get("Submissions"))
        xp_ids = linked_ids(f.get("XP Events"))

        scanned_shots = 0.0
        countable = 0
        for sid in sub_ids:
            sf = sub_map.get(sid) or {}
            if not sf.get("Count This Submission?"):
                continue
            shots = sf.get("Total Shots Counted")
            try:
                scanned_shots += float(shots or 0)
            except (TypeError, ValueError):
                pass
            countable += 1

        week_xp = 0.0
        linked_active = 0
        for xid in xp_ids:
            xf = xp_map.get(xid) or {}
            if not xf.get("Active?"):
                continue
            week_xp += xp_points(xf)
            linked_active += 1

        orphans = []
        orphan_pts = 0.0
        orphan_detail = []
        for xr in xp_all_rows:
            xf = fields_of(xr)
            xweeks = linked_ids(xf.get("Week"))
            if wid and wid not in xweeks:
                continue
            if xr["id"] in xp_ids:
                continue
            orphans.append(xr["id"])
            pts = xp_points(xf)
            orphan_pts += pts
            orphan_detail.append(
                {
                    "id": xr["id"],
                    "pts": pts,
                    "Source Key": xf.get("Source Key"),
                    "XP Source": xf.get("XP Source"),
                    "XP Bucket": xf.get("XP Bucket"),
                }
            )

        summary_shots = f.get("Total Shots This Week")
        summary_xp = f.get("XP Earned This Week")
        shots_disagree = False
        xp_disagree = False
        try:
            if summary_shots is not None and abs(float(summary_shots) - scanned_shots) > 0.001:
                shots_disagree = True
        except (TypeError, ValueError):
            shots_disagree = True
        try:
            if summary_xp is not None and abs(float(summary_xp) - week_xp) > 0.001:
                xp_disagree = True
        except (TypeError, ValueError):
            xp_disagree = True

        fail_reasons = []
        if shots_disagree:
            fail_reasons.append(
                f"shots_disagreement summary={summary_shots} scanned={scanned_shots}"
            )
        if orphans:
            fail_reasons.append(f"unlinked_xp n={len(orphans)} pts={orphan_pts}")
        if xp_disagree:
            fail_reasons.append(
                f"xp_disagreement summary={summary_xp} linked_active={week_xp}"
            )

        results.append(
            {
                "id": rid,
                "in_registry_create": rid in was_create_ids,
                "armed": rid in armed,
                "week_id": wid,
                "week": weeks.get(wid),
                "week_display": f.get("Week - Display"),
                "Build Weekly Email Now?": f.get("Build Weekly Email Now?"),
                "Weekly Email Sent?": f.get("Weekly Email Sent?"),
                "Send to Make?": f.get("Send to Make?"),
                "Weekly Email Ready?": f.get("Weekly Email Ready?"),
                "Weekly Email Error": f.get("Weekly Email Error"),
                "Total Shots This Week": summary_shots,
                "scanned_shots": scanned_shots,
                "countable_subs": countable,
                "linked_subs": len(sub_ids),
                "XP Earned This Week": summary_xp,
                "linked_active_xp_sum": week_xp,
                "linked_xp": len(xp_ids),
                "linked_active_xp": linked_active,
                "orphan_xp_ids": orphans,
                "orphan_xp_pts": orphan_pts,
                "orphan_detail": orphan_detail,
                "Threshold XP Status": f.get("Threshold XP Status"),
                "Threshold XP Ready?": f.get("Threshold XP Ready?"),
                "Parent Email - Cleaned": f.get("Parent Email - Cleaned"),
                "Combined Recipient Emails": f.get("Combined Recipient Emails"),
                "Perfect Week Eligible?": f.get("Perfect Week Eligible?"),
                "Perfect Week Automation Status": f.get("Perfect Week Automation Status"),
                "Perfect Week Automation Error": f.get("Perfect Week Automation Error"),
                "PW Zoom Met": f.get("Perfect Week Zoom Requirement Met?"),
                "PW Zoom Status": f.get("Perfect Week Zoom Requirement Status"),
                "PW Video Met": f.get("Perfect Week Video Requirement Met?"),
                "PW HW Met": f.get("Perfect Week Homework Requirement Met?"),
                "fail_reasons": fail_reasons,
                "shots_disagree": shots_disagree,
                "xp_disagree": xp_disagree,
                "has_orphans": bool(orphans),
            }
        )

    results.sort(
        key=lambda x: (
            not x["armed"],
            str((x.get("week") or {}).get("Start Date") or ""),
            x["id"],
        )
    )
    out["was"] = results
    out["summary"] = {
        "total_was": len(results),
        "armed": len([x for x in results if x["armed"]]),
        "build_true": sum(1 for x in results if x.get("Build Weekly Email Now?") is True),
        "sent_true": sum(1 for x in results if x.get("Weekly Email Sent?") is True),
        "send_to_make_true": sum(1 for x in results if x.get("Send to Make?") is True),
        "ready_true": sum(1 for x in results if x.get("Weekly Email Ready?") is True),
        "armed_with_fails": [
            {"id": x["id"], "week_display": x.get("week_display"), "fails": x["fail_reasons"]}
            for x in results
            if x["armed"] and x["fail_reasons"]
        ],
        "armed_clean": [
            {"id": x["id"], "week_display": x.get("week_display")}
            for x in results
            if x["armed"] and not x["fail_reasons"]
        ],
    }

    path = ROOT / "reports" / f"weekly-email-072-{RUN}.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(out, indent=2, default=str), encoding="utf-8")
    print(json.dumps({"path": str(path), "enrollment": out["enrollment"], "summary": out["summary"]}, indent=2, default=str))
    # compact per-WAS table
    for x in results:
        print(
            json.dumps(
                {
                    "id": x["id"],
                    "armed": x["armed"],
                    "week": x.get("week_display"),
                    "Build": x.get("Build Weekly Email Now?"),
                    "Sent": x.get("Weekly Email Sent?"),
                    "Make": x.get("Send to Make?"),
                    "Ready": x.get("Weekly Email Ready?"),
                    "shots": x.get("Total Shots This Week"),
                    "scanned": x.get("scanned_shots"),
                    "xp": x.get("XP Earned This Week"),
                    "xp_linked": x.get("linked_active_xp_sum"),
                    "subs": x.get("linked_subs"),
                    "xp_n": x.get("linked_xp"),
                    "orphans": len(x.get("orphan_xp_ids") or []),
                    "fails": x.get("fail_reasons"),
                    "err": x.get("Weekly Email Error"),
                    "parent": x.get("Parent Email - Cleaned"),
                    "combined": x.get("Combined Recipient Emails"),
                    "thr": x.get("Threshold XP Status"),
                    "thr_ready": x.get("Threshold XP Ready?"),
                    "pw": x.get("Perfect Week Eligible?"),
                    "pw_status": x.get("Perfect Week Automation Status"),
                },
                default=str,
            )
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
