"""Second-pass extras: find orphaned XP/streaks by Source Key / marker after enrollment delete."""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from season_simulation.airtable_client import AirtableClient, fields_of  # noqa: E402

RUN = "SEASON-SIM-2027-20260905T122531Z-athlete1"
ENROLL = "recmImoXTlKb5NWSY"
CONFIRM = f"CONFIRM-CLEANUP2-{RUN}"
OUT = Path(__file__).resolve().parent / "reports" / f"cleanup-extras-pass2-{RUN}.json"
REG = Path(__file__).resolve().parent / "run_registries" / f"{RUN}.json"


def main() -> int:
    if len(sys.argv) < 2 or sys.argv[1] != CONFIRM:
        print(f"Refused: pass {CONFIRM!r}")
        return 2

    reg = json.loads(REG.read_text(encoding="utf-8"))
    sub_ids = [
        r["record_id"]
        for r in reg["records"]
        if r["table"] == "Submissions" and "|SUB|D" in (r.get("dedupe_key") or "")
    ]
    hc_ids = [r["record_id"] for r in reg["records"] if r["table"] == "Homework Completions"]
    vf_ids = [
        r["record_id"]
        for r in reg["records"]
        if r["table"] == "Video Feedback" and "|VF|" in (r.get("dedupe_key") or "")
    ]
    zoom_meeting_ids = [r["record_id"] for r in reg["records"] if r["table"] == "Zoom Meetings"]
    # unique zoom meetings
    zoom_meeting_ids = sorted(set(zoom_meeting_ids))

    c = AirtableClient(allow_writes=True)

    # XP by enrollment id in Source Key
    xp = c.list_records(
        "XP Events",
        fields=["Source Key", "Enrollment"],
        formula=f"FIND('{ENROLL}', {{Source Key}} & '')",
    )
    xp_ids = {r["id"] for r in xp}

    # SUBMISSION_XP by each submission id
    for sid in sub_ids:
        rows = c.list_records(
            "XP Events",
            fields=["Source Key"],
            formula=f"{{Source Key}}='SUBMISSION_XP|{sid}'",
        )
        for r in rows:
            xp_ids.add(r["id"])

    # HOMEWORK / VIDEO by source ids
    for hid in hc_ids:
        rows = c.list_records(
            "XP Events",
            fields=["Source Key"],
            formula=f"FIND('{hid}', {{Source Key}} & '')",
        )
        for r in rows:
            xp_ids.add(r["id"])
    for vid in vf_ids:
        rows = c.list_records(
            "XP Events",
            fields=["Source Key"],
            formula=f"FIND('{vid}', {{Source Key}} & '')",
        )
        for r in rows:
            xp_ids.add(r["id"])
    for zid in zoom_meeting_ids:
        rows = c.list_records(
            "XP Events",
            fields=["Source Key"],
            formula=f"FIND('{zid}', {{Source Key}} & '')",
        )
        for r in rows:
            xp_ids.add(r["id"])

    # Streaks: try Source Key / Name / any text containing enroll — list via enrollment link empty
    # Use FIND on any field that may still hold enroll id - try common text fields
    streak_ids: set[str] = set()
    for formula in [
        f"FIND('{ENROLL}', {{Enrollment Record ID}} & '')",
        f"FIND('{ENROLL}', ARRAYJOIN({{Enrollment}}) & '')",
        f"FIND('{ENROLL}', {{Streak Occurrence Key}} & '')",
        f"FIND('{ENROLL}', {{Source Key}} & '')",
    ]:
        try:
            rows = c.list_records("Streak Occurrences", formula=formula)
            for r in rows:
                streak_ids.add(r["id"])
        except Exception as exc:  # noqa: BLE001
            print("streak formula skip", formula, exc)

    # Leftover zoom meetings from registry
    leftover_zoom = []
    for zid in zoom_meeting_ids:
        try:
            c.get_record("Zoom Meetings", zid)
            leftover_zoom.append(zid)
        except Exception:
            pass

    deleted = {"XP Events": [], "Streak Occurrences": [], "Zoom Meetings": []}
    xp_list = sorted(xp_ids)
    streak_list = sorted(streak_ids)
    for i in range(0, len(xp_list), 10):
        chunk = xp_list[i : i + 10]
        c.delete_records("XP Events", chunk)
        deleted["XP Events"].extend(chunk)
        print("deleted XP", len(chunk))
    for i in range(0, len(streak_list), 10):
        chunk = streak_list[i : i + 10]
        c.delete_records("Streak Occurrences", chunk)
        deleted["Streak Occurrences"].extend(chunk)
        print("deleted streaks", len(chunk))
    if leftover_zoom:
        c.delete_records("Zoom Meetings", leftover_zoom)
        deleted["Zoom Meetings"].extend(leftover_zoom)
        print("deleted zoom meetings", leftover_zoom)

    # Verify no XP with enroll in Source Key remain
    remain_xp = c.list_records(
        "XP Events",
        fields=["Source Key"],
        formula=f"FIND('{ENROLL}', {{Source Key}} & '')",
    )
    remain_sub = 0
    for sid in sub_ids[:5]:  # sample
        remain_sub += len(
            c.list_records("XP Events", formula=f"{{Source Key}}='SUBMISSION_XP|{sid}'")
        )

    report = {
        "deleted_counts": {k: len(v) for k, v in deleted.items()},
        "deleted": deleted,
        "remain_xp_with_enroll_in_source_key": len(remain_xp),
        "sample_submission_xp_remain": remain_sub,
        "leftover_zoom_before": leftover_zoom,
    }
    OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report["deleted_counts"], indent=2))
    print("remain_xp_enroll_key", len(remain_xp), "sample_sub_xp", remain_sub)
    print("Wrote", OUT)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
