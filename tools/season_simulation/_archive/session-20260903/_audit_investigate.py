"""Evidence gather for SC-SEASON-SIM-002 root-cause investigation."""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from season_simulation.airtable_client import AirtableClient, fields_of  # noqa: E402

RUN = "SEASON-SIM-2027-20260902T202049Z-athlete1"
ROOT = Path(__file__).resolve().parent


def or_ids(ids: list[str]) -> str:
    return "OR(" + ",".join(f"RECORD_ID()='{rid}'" for rid in ids) + ")"


def main() -> int:
    c = AirtableClient(allow_writes=False)
    reg = json.loads((ROOT / "run_registries" / f"{RUN}.json").read_text(encoding="utf-8"))
    out: dict = {}

    sub_ids = [r["record_id"] for r in reg["records"] if r["table"] == "Submissions"]
    rows = c.list_records("Submissions", formula=or_ids(sub_ids[:5]), max_records=10)
    out["sub_samples"] = []
    for r in rows:
        f = fields_of(r)
        out["sub_samples"].append(
            {
                "id": r["id"],
                "Activity Date": f.get("Activity Date"),
                "Count This Submission?": f.get("Count This Submission?"),
                "Activity Date Is Future?": f.get("Activity Date Is Future?"),
                "Reconciliation Needed?": f.get("Reconciliation Needed?"),
                "XP Award Ready?": f.get("XP Award Ready?"),
                "XP Award Status": f.get("XP Award Status"),
                "XP Events": f.get("XP Events"),
            }
        )

    # Count how many have Reconciliation Needed = 0 and no XP
    needed0 = 0
    no_xp = 0
    for i in range(0, len(sub_ids), 20):
        rows = c.list_records("Submissions", formula=or_ids(sub_ids[i : i + 20]), max_records=100)
        for r in rows:
            f = fields_of(r)
            if float(f.get("Reconciliation Needed?") or 0) == 0:
                needed0 += 1
            if not f.get("XP Events"):
                no_xp += 1
    out["sub_summary"] = {"reconciliation_needed_0": needed0, "no_xp_events": no_xp, "total": len(sub_ids)}

    hw_ids = [r["record_id"] for r in reg["records"] if r["table"] == "Homework Completions"]
    rows = c.list_records("Homework Completions", formula=or_ids(hw_ids), max_records=50)
    out["homework"] = []
    for r in rows:
        f = fields_of(r)
        out["homework"].append(
            {
                "id": r["id"],
                "Submission Date": f.get("Submission Date"),
                "Completion Status": f.get("Completion Status"),
                "Award Status": f.get("Award Status"),
                "Automation Error": f.get("Automation Error"),
                "Satisfactory?": f.get("Satisfactory?"),
                "Review Complete": f.get("Review Complete"),
                "Submissions - Linked": f.get("Submissions - Linked"),
            }
        )

    was_ids = sorted(
        {
            r["record_id"]
            for r in reg["records"]
            if r["table"] == "Weekly Athlete Summary" and r.get("record_id")
        }
    )
    rows = c.list_records("Weekly Athlete Summary", formula=or_ids(was_ids), max_records=50)
    out["was"] = []
    for r in rows:
        f = fields_of(r)
        out["was"].append(
            {
                "id": r["id"],
                "Enrollment": f.get("Enrollment"),
                "Grade Band": f.get("Grade Band"),
                "Goal Record": f.get("Goal Record"),
                "Perfect Week Automation Status": f.get("Perfect Week Automation Status"),
                "Perfect Week Automation Error": f.get("Perfect Week Automation Error"),
                "Perfect Week Eligible?": f.get("Perfect Week Eligible?"),
                "Created": f.get("Created"),
            }
        )

    vf_ids = sorted({r["record_id"] for r in reg["records"] if r["table"] == "Video Feedback"})
    rows = c.list_records("Video Feedback", formula=or_ids(vf_ids), max_records=20)
    out["video"] = []
    for r in rows:
        f = fields_of(r)
        out["video"].append(
            {
                "id": r["id"],
                "Feedback Posted?": f.get("Feedback Posted?"),
                "Ready for XP Automation?": f.get("Ready for XP Automation?"),
                "Award Status": f.get("Award Status"),
                "Do Not Award XP?": f.get("Do Not Award XP?"),
                "XP Events": f.get("XP Events"),
                "Submission": f.get("Submission"),
                "Total Video XP Awarded": f.get("Total Video XP Awarded"),
                "Base XP Awarded": f.get("Base XP Awarded"),
            }
        )

    # Linked submission activity dates for VF
    sub_for_vf = []
    for v in out["video"]:
        sid = (v.get("Submission") or [None])[0]
        if sid:
            sub_for_vf.append(sid)
    if sub_for_vf:
        rows = c.list_records("Submissions", formula=or_ids(sub_for_vf), max_records=20)
        out["vf_submission_dates"] = [
            {
                "id": r["id"],
                "Activity Date": fields_of(r).get("Activity Date"),
                "Activity Date Is Future?": fields_of(r).get("Activity Date Is Future?"),
            }
            for r in rows
        ]

    za_ids = [r["record_id"] for r in reg["records"] if r["table"] == "Zoom Attendance"]
    rows = c.list_records("Zoom Attendance", formula=or_ids(za_ids), max_records=10)
    out["zoom"] = []
    for r in rows:
        f = fields_of(r)
        keys = [
            k
            for k in f
            if any(
                x in k.lower()
                for x in (
                    "credit",
                    "approv",
                    "satisf",
                    "live",
                    "method",
                    "xp",
                    "gate",
                    "quiz",
                    "debug",
                )
            )
        ]
        out["zoom"].append({"id": r["id"], **{k: f.get(k) for k in keys}})

    # Homework Completions field type for Submission Date
    tables = c.meta_tables()
    hc = next(t for t in tables if t["name"] == "Homework Completions")
    for f in hc["fields"]:
        if f["name"] in ("Submission Date", "Satisfactory?", "Award Status", "Automation Error"):
            out.setdefault("hc_field_types", {})[f["name"]] = {
                "type": f["type"],
                "options": f.get("options"),
            }

    was_t = next(t for t in tables if t["name"] == "Weekly Athlete Summary")
    for f in was_t["fields"]:
        if f["name"] in ("Grade Band", "Enrollment", "Goal Record"):
            out.setdefault("was_field_types", {})[f["name"]] = {
                "type": f["type"],
                "options": {
                    k: f.get("options", {}).get(k)
                    for k in ("isValid", "prefersSingleRecordLink", "inverseLinkFieldId", "linkedTableId", "result", "isValid")
                    if f.get("options") and k in f.get("options", {})
                }
                or f.get("options"),
            }

    path = ROOT / "reports" / f"investigate-{RUN}.json"
    path.write_text(json.dumps(out, indent=2, default=str), encoding="utf-8")
    print(json.dumps({"path": str(path), "sub_summary": out["sub_summary"], "hw_blank_sub_date": sum(1 for h in out["homework"] if not h.get("Submission Date")), "was_grade_band": [(w["id"], w.get("Grade Band"), w.get("Perfect Week Automation Status"), w.get("Perfect Week Automation Error")) for w in out["was"]], "vf_dates": out.get("vf_submission_dates"), "zoom": out["zoom"]}, indent=2, default=str))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
