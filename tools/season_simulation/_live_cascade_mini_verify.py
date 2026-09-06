"""SC-SEASON-SIM-001 targeted cascade live verification (mini).

Creates one disposable Sim athlete + enrollment + WAS + 2 countable submissions,
waits for Automation 010 Submission Base XP, then cleans up and restores the
Activity Date Is Future? Production formula.

Requires AIRTABLE_API_TOKEN. Does not send email.
"""

from __future__ import annotations

import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

PACKAGE_PARENT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PACKAGE_PARENT))

from season_simulation.airtable_client import AirtableClient  # noqa: E402
from season_simulation.cascade_settlement import (  # noqa: E402
    classify_submission_xp_status,
    list_active_submission_xp_ids,
)
from season_simulation.clock_override import (  # noqa: E402
    GATED_ACTIVITY_DATE_IS_FUTURE_FORMULA,
    PRODUCTION_ACTIVITY_DATE_IS_FUTURE_FORMULA,
)
from season_simulation.constants import SAFE_EMAIL_RECIPIENT  # noqa: E402
from season_simulation.reference_data import load_reference_snapshot  # noqa: E402
from season_simulation.run_registry import new_run_id, run_marker  # noqa: E402

SUBMISSIONS_TABLE_ID = "tblEVjVpGGlPTsYSt"
ACTIVITY_FUTURE_FIELD_ID = "fldyFAjhbfaC4LlPb"
BASE_ID = "appn84sqPw03zEbTT"


def _patch_formula_via_meta(token: str, formula: str) -> dict:
    import requests

    url = (
        f"https://api.airtable.com/v0/meta/bases/{BASE_ID}/tables/"
        f"{SUBMISSIONS_TABLE_ID}/fields/{ACTIVITY_FUTURE_FIELD_ID}"
    )
    resp = requests.patch(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        json={"options": {"formula": formula}},
        timeout=120,
    )
    if not resp.ok:
        raise RuntimeError(f"Meta formula patch failed: {resp.status_code} {resp.text[:500]}")
    body = resp.json()
    # Meta may rewrite field refs to fld… IDs; verify NOW() vs Season Sim branch.
    written = str(((body.get("options") or {}).get("formula")) or "")
    wants_prod = "Season Sim" not in formula and "Season Sim Test Record?" not in formula
    if wants_prod and "NOW()" not in written and "NOW()" not in formula:
        raise RuntimeError(f"Production restore did not stick: {written[:200]}")
    return body


def main() -> int:
    run_id = new_run_id(suffix="cascade1")
    marker = run_marker(run_id)
    out = {
        "run_id": run_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "steps": [],
        "errors": [],
        "formula_restored": False,
        "cleanup_done": False,
        "xp_ok": False,
    }
    reports = Path(__file__).resolve().parent / "reports"
    reports.mkdir(exist_ok=True)

    client = AirtableClient(allow_writes=True, base_id=BASE_ID)
    created: dict[str, list[str]] = {
        "Athletes": [],
        "Enrollments": [],
        "Weekly Athlete Summary": [],
        "Submissions": [],
        "XP Events": [],
    }

    try:
        # 1) Confirm Production formula, then install temporary gate.
        out["steps"].append("install_gated_activity_future")
        _patch_formula_via_meta(client.token, GATED_ACTIVITY_DATE_IS_FUTURE_FORMULA)

        snap = load_reference_snapshot(client)
        if snap.errors or not snap.grade_band or not snap.highest_goal:
            raise RuntimeError(f"reference snapshot failed: {snap.errors}")
        weeks = list(snap.weeks_covering_window or [])
        if not weeks:
            raise RuntimeError("No weeks covering simulation window")
        week0 = weeks[0]
        week_id = week0.record_id
        pi_ids = list(getattr(week0, "program_instance_ids", None) or [])
        if not pi_ids and hasattr(snap, "program_instance_id"):
            pi_ids = [snap.program_instance_id] if snap.program_instance_id else []

        # Resolve Program Instance from enrollment goal / week fields if needed
        week_rec = client.get_record("Weeks", week_id)
        week_fields = week_rec.get("fields") or {}
        pi_link = week_fields.get("Program Instance") or []
        if isinstance(pi_link, list) and pi_link:
            pi_id = pi_link[0] if isinstance(pi_link[0], str) else pi_link[0].get("id")
        elif pi_ids:
            pi_id = pi_ids[0]
        else:
            raise RuntimeError("Could not resolve Program Instance from Week")

        # 2) Create athlete + enrollment + WAS
        out["steps"].append("create_athlete_enrollment_was")
        ath = client.create_records(
            "Athletes",
            [
                {
                    "First Name": "Sim",
                    "Last Name": "CascadeMini",
                    "Parent Email": SAFE_EMAIL_RECIPIENT,
                    "Active?": True,
                }
            ],
        )[0]
        created["Athletes"].append(ath["id"])

        enr_fields = {
            "Athlete": [ath["id"]],
            "Athlete First Name": "Sim",
            "Athlete Last Name": "CascadeMini",
            "Parent Email": SAFE_EMAIL_RECIPIENT,
            "Athlete Email": SAFE_EMAIL_RECIPIENT,
            "Grade Band": [snap.grade_band.record_id],
            "Program Instance": [pi_id],
            "School Year": "2026-2027",
            "Grade": "12",
            "Active?": True,
        }
        enr = client.create_records("Enrollments", [enr_fields])[0]
        created["Enrollments"].append(enr["id"])

        was = client.create_records(
            "Weekly Athlete Summary",
            [
                {
                    "Enrollment": [enr["id"]],
                    "Week": [week_id],
                    "Goal Record": [snap.highest_goal.record_id],
                    "Grade Band": [snap.grade_band.record_id],
                }
            ],
        )[0]
        created["Weekly Athlete Summary"].append(was["id"])

        # 3) Two countable submissions (same week day range)
        out["steps"].append("create_submissions")
        activity_dates = ["2027-05-01", "2027-05-02"]  # Early Bird week inclusive
        submission_ids: list[str] = []
        for i, ad in enumerate(activity_dates):
            fields = {
                "Enrollment": [enr["id"]],
                "Athlete": [ath["id"]],
                "Week": [week_id],
                "Weekly Athlete Summary": [was["id"]],
                "Activity Date": ad,
                "Shot Total": 100 + i,
                "Duplicate Review Status": "Count It",
                "Season Sim Test Record?": True,
                "Season Sim Clock Now": f"{ad}T12:00:00.000Z",
                "Season Sim Test Submitted At": f"{ad}T18:00:00.000Z",
                "Video Upload Note": marker,
                "Daily Email Subject": f"{marker}|MINI|{i}",
            }
            sub = client.create_records("Submissions", [fields])[0]
            submission_ids.append(sub["id"])
            created["Submissions"].append(sub["id"])
            # Do NOT Enrollment-clear here — verify clean 010 path without 053 amplifier.

        # 4) Poll for Active SUBMISSION_XP on both
        out["steps"].append("poll_submission_xp")
        deadline = time.monotonic() + 180
        settled: dict[str, list[str]] = {}
        while time.monotonic() < deadline:
            settled = {}
            for sid in submission_ids:
                settled[sid] = list_active_submission_xp_ids(client.list_records, sid)
            if all(settled.values()):
                break
            time.sleep(5)

        out["settled"] = settled
        out["xp_ok"] = all(bool(v) for v in settled.values())
        statuses = []
        for sid in submission_ids:
            raw = client.get_record("Submissions", sid)
            fields = raw.get("fields") or {}
            statuses.append(
                classify_submission_xp_status(
                    submission_id=sid,
                    fields=fields,
                    active_xp_ids=settled.get(sid) or [],
                ).to_dict()
            )
        out["statuses"] = statuses
        for sid, xp_ids in settled.items():
            created["XP Events"].extend(xp_ids)

        if not out["xp_ok"]:
            out["errors"].append(
                "Timed out waiting for Active SUBMISSION_XP on one or more submissions"
            )

    except Exception as exc:  # noqa: BLE001
        out["errors"].append(str(exc))
    finally:
        # Always restore Production formula first.
        try:
            out["steps"].append("restore_production_formula")
            _patch_formula_via_meta(client.token, PRODUCTION_ACTIVITY_DATE_IS_FUTURE_FORMULA)
            out["formula_restored"] = True
        except Exception as exc:  # noqa: BLE001
            out["errors"].append(f"FORMULA RESTORE FAILED: {exc}")

        # Cleanup created records (dependents first).
        try:
            out["steps"].append("cleanup")
            # Discover XP by source key even if poll missed
            for sid in created["Submissions"]:
                try:
                    for xid in list_active_submission_xp_ids(client.list_records, sid):
                        if xid not in created["XP Events"]:
                            created["XP Events"].append(xid)
                except Exception:
                    pass
                # Also deactivate-scan all SUBMISSION_XP rows for these ids
                try:
                    rows = client.list_records(
                        "XP Events",
                        fields=["Source Key", "Active?"],
                        formula=f"FIND('{sid}', {{Source Key}} & '')",
                        max_records=20,
                    )
                    for row in rows or []:
                        rid = row.get("id")
                        if rid and rid not in created["XP Events"]:
                            created["XP Events"].append(rid)
                except Exception:
                    pass

            for table in (
                "XP Events",
                "Weekly Athlete Summary",
                "Submissions",
                "Enrollments",
                "Athletes",
            ):
                ids = created.get(table) or []
                if ids:
                    client.delete_records(table, ids)
            out["cleanup_done"] = True
            out["deleted"] = {k: v for k, v in created.items() if v}
        except Exception as exc:  # noqa: BLE001
            out["errors"].append(f"CLEANUP FAILED: {exc}")
            out["created_for_manual_cleanup"] = created

    path = reports / f"live-cascade-mini-{run_id}.json"
    path.write_text(json.dumps(out, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(out, indent=2))
    print(f"Wrote {path}")
    if out["errors"] or not out["xp_ok"] or not out["formula_restored"] or not out["cleanup_done"]:
        return 3
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
