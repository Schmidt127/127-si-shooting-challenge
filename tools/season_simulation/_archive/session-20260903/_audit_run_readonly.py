"""Read-only post-execute audit for one season-sim run. No writes."""

from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from season_simulation.airtable_client import AirtableClient  # noqa: E402

RUN = "SEASON-SIM-2027-20260902T202049Z-athlete1"
ENROLL = "recekm0ke1bihWAc3"
ATHLETE = "recGTljTSqelacjyp"
SAFE = "schmidt@fairfieldbasketballclub.com"
TAG = f"SEASON-SIM|{RUN}"
ROOT = Path(__file__).resolve().parent


def main() -> int:
    reg = json.loads((ROOT / "run_registries" / f"{RUN}.json").read_text(encoding="utf-8"))
    ex = json.loads((ROOT / "reports" / f"execute-{RUN}.json").read_text(encoding="utf-8"))
    c = AirtableClient(allow_writes=False)

    report: dict = {
        "run_id": RUN,
        "enrollment_id": ENROLL,
        "athlete_id": ATHLETE,
        "writer_status": ex.get("writer_status") or reg.get("status"),
        "execute_errors": ex.get("errors") or [],
        "registry_email_recipients": sorted(
            {e.get("recipient") for e in (reg.get("email_events") or [])}
        ),
        "checks": {},
        "errors": [],
        "pending": [],
        "succeeded": [],
    }

    # ---- Enrollment ----
    enr = c.get_record("Enrollments", ENROLL)
    ef = enr.get("fields") or {}
    enroll_interesting = {
        k: ef[k]
        for k in sorted(ef)
        if any(
            x in k.lower()
            for x in (
                "xp",
                "level",
                "gate",
                "streak",
                "email",
                "shot",
                "perfect",
                "parent",
                "athlete",
                "school",
                "total",
                "current",
                "active",
                "season",
            )
        )
    }
    report["enrollment_snapshot"] = enroll_interesting
    parent = (ef.get("Parent Email") or "").strip().lower()
    if parent != SAFE:
        report["errors"].append(f"Enrollment Parent Email is {parent!r}, expected {SAFE}")
    else:
        report["succeeded"].append("Enrollment Parent Email allowlisted")

    # ---- Submissions (by record ids from registry) ----
    sub_ids = [
        r["record_id"]
        for r in (reg.get("records") or [])
        if r.get("table") == "Submissions" and r.get("record_id")
    ]
    # Batch via formula OR of RECORD_ID — Airtable formula length limits; use chunks
    subs: list[dict] = []
    chunk = 20
    for i in range(0, len(sub_ids), chunk):
        part = sub_ids[i : i + chunk]
        or_parts = ",".join(f"RECORD_ID()='{rid}'" for rid in part)
        formula = f"OR({or_parts})"
        try:
            subs.extend(
                c.list_records(
                    "Submissions",
                    formula=formula,
                    page_size=100,
                    max_records=100,
                )
            )
        except Exception as exc:  # noqa: BLE001
            report["errors"].append(f"Submissions fetch chunk {i}: {exc}")

    sub_fields_present: set[str] = set()
    for r in subs:
        sub_fields_present |= set((r.get("fields") or {}).keys())

    def g(f: dict, *names, default=None):
        for n in names:
            if n in f:
                return f[n]
        return default

    count_vals = Counter()
    future_vals = Counter()
    same_day = Counter()
    grace = Counter()
    pw_countable = Counter()
    pw_manual = Counter()
    status_vals = Counter()
    for r in subs:
        f = r.get("fields") or {}
        count_vals[str(g(f, "Count This Submission?"))] += 1
        future_vals[str(g(f, "Activity Date Is Future?"))] += 1
        same_day[str(g(f, "Submitted Same Day?"))] += 1
        grace[str(g(f, "Perfect Week Grace Eligible?"))] += 1
        pw_countable[str(g(f, "Perfect Week Countable Submission?"))] += 1
        pw_manual[str(g(f, "Perfect Week Manual Exception?"))] += 1
        st = g(f, "Status")
        if isinstance(st, dict):
            st = st.get("name")
        status_vals[str(st)] += 1

    countable_ones = count_vals.get("1", 0) + count_vals.get("True", 0) + count_vals.get("1.0", 0)
    # numeric 1 may come as int
    for k, v in list(count_vals.items()):
        try:
            if float(k) == 1.0:
                countable_ones = v  # override if exact
        except ValueError:
            pass
    # better: sum where truthy numeric
    countable_n = 0
    uncountable_n = 0
    future_n = 0
    for r in subs:
        f = r.get("fields") or {}
        ct = g(f, "Count This Submission?")
        try:
            if float(ct or 0) == 1:
                countable_n += 1
            else:
                uncountable_n += 1
        except (TypeError, ValueError):
            uncountable_n += 1
        fut = g(f, "Activity Date Is Future?")
        try:
            if float(fut or 0) == 1:
                future_n += 1
        except (TypeError, ValueError):
            pass

    report["checks"]["submissions"] = {
        "registry_ids": len(sub_ids),
        "fetched": len(subs),
        "countable": countable_n,
        "uncountable": uncountable_n,
        "activity_date_is_future": future_n,
        "count_this_distribution": dict(count_vals),
        "future_distribution": dict(future_vals),
        "submitted_same_day": dict(same_day),
        "pw_grace_eligible": dict(grace),
        "pw_countable": dict(pw_countable),
        "pw_manual_exception": dict(pw_manual),
        "status": dict(status_vals),
        "fields_present_sample": sorted(sub_fields_present)[:60],
    }
    if len(subs) != len(sub_ids):
        report["errors"].append(
            f"Submission fetch mismatch: registry {len(sub_ids)} vs fetched {len(subs)}"
        )
    if countable_n == len(subs) and len(subs) > 0:
        report["succeeded"].append(f"All {countable_n} submissions Count This Submission?=1")
    elif countable_n > 0:
        report["pending"].append(
            f"Only {countable_n}/{len(subs)} submissions countable; {uncountable_n} still blocked"
        )
    else:
        report["pending"].append(
            f"0/{len(subs)} submissions countable (likely Activity Date Is Future? / clock)"
        )

    # ---- Homework Completions ----
    hw_ids = [
        r["record_id"]
        for r in (reg.get("records") or [])
        if r.get("table") == "Homework Completions" and r.get("record_id")
    ]
    hws: list[dict] = []
    for i in range(0, len(hw_ids), chunk):
        part = hw_ids[i : i + chunk]
        or_parts = ",".join(f"RECORD_ID()='{rid}'" for rid in part)
        try:
            hws.extend(
                c.list_records("Homework Completions", formula=f"OR({or_parts})", max_records=100)
            )
        except Exception as exc:  # noqa: BLE001
            report["errors"].append(f"HW fetch: {exc}")
    hw_keys: set[str] = set()
    for r in hws:
        hw_keys |= set((r.get("fields") or {}).keys())
    report["checks"]["homework"] = {
        "registry_ids": len(hw_ids),
        "fetched": len(hws),
        "fields_present": sorted(hw_keys),
    }
    report["succeeded"].append(f"Homework Completions present: {len(hws)}/{len(hw_ids)}")

    # ---- Video Feedback ----
    vf_ids = sorted(
        {
            r["record_id"]
            for r in (reg.get("records") or [])
            if r.get("table") == "Video Feedback" and r.get("record_id")
        }
    )
    vfs: list[dict] = []
    if vf_ids:
        or_parts = ",".join(f"RECORD_ID()='{rid}'" for rid in vf_ids)
        try:
            vfs = c.list_records("Video Feedback", formula=f"OR({or_parts})", max_records=50)
        except Exception as exc:  # noqa: BLE001
            report["errors"].append(f"VF fetch: {exc}")
    vf_keys: set[str] = set()
    vf_status = Counter()
    for r in vfs:
        f = r.get("fields") or {}
        vf_keys |= set(f.keys())
        st = f.get("Status") or f.get("Feedback Status") or f.get("Feedback Posted?")
        if isinstance(st, dict):
            st = st.get("name")
        vf_status[str(st)] += 1
    report["checks"]["video_feedback"] = {
        "registry_unique_ids": len(vf_ids),
        "fetched": len(vfs),
        "status_like": dict(vf_status),
        "fields_present": sorted(vf_keys),
    }

    # ---- Zoom Attendance ----
    za_ids = [
        r["record_id"]
        for r in (reg.get("records") or [])
        if r.get("table") == "Zoom Attendance" and r.get("record_id")
    ]
    zas: list[dict] = []
    if za_ids:
        or_parts = ",".join(f"RECORD_ID()='{rid}'" for rid in za_ids)
        try:
            zas = c.list_records("Zoom Attendance", formula=f"OR({or_parts})", max_records=20)
        except Exception as exc:  # noqa: BLE001
            report["errors"].append(f"Zoom Attendance fetch: {exc}")
    za_keys: set[str] = set()
    for r in zas:
        za_keys |= set((r.get("fields") or {}).keys())
    report["checks"]["zoom_attendance"] = {
        "registry_ids": len(za_ids),
        "fetched": len(zas),
        "fields_present": sorted(za_keys),
        "ids": za_ids,
    }

    # ---- WAS ----
    was_ids = sorted(
        {
            r["record_id"]
            for r in (reg.get("records") or [])
            if r.get("table") == "Weekly Athlete Summary" and r.get("record_id")
        }
    )
    # also from ids_by_table
    for rid in (reg.get("ids_by_table") or {}).get("Weekly Athlete Summary") or []:
        was_ids.append(rid)
    was_ids = sorted(set(was_ids))
    was_rows: list[dict] = []
    for i in range(0, len(was_ids), chunk):
        part = was_ids[i : i + chunk]
        or_parts = ",".join(f"RECORD_ID()='{rid}'" for rid in part)
        try:
            was_rows.extend(
                c.list_records(
                    "Weekly Athlete Summary", formula=f"OR({or_parts})", max_records=100
                )
            )
        except Exception as exc:  # noqa: BLE001
            report["errors"].append(f"WAS fetch: {exc}")
    was_keys: set[str] = set()
    pw_flags = Counter()
    email_flags = {}
    for r in was_rows:
        f = r.get("fields") or {}
        was_keys |= set(f.keys())
        for k in f:
            kl = k.lower()
            if "perfect week" in kl or "email" in kl or "ready" in kl or "send" in kl:
                email_flags.setdefault(k, Counter())[str(f[k])[:80]] += 1
            if "perfect week" in kl:
                pw_flags[f"{k}={f[k]}"] += 1
    report["checks"]["was"] = {
        "registry_ids": len(was_ids),
        "fetched": len(was_rows),
        "fields_present": sorted(was_keys),
        "perfect_week_like": dict(pw_flags),
        "email_ready_like": {k: dict(v) for k, v in email_flags.items()},
    }

    # ---- XP Events linked to enrollment ----
    xp: list[dict] = []
    try:
        xp = c.list_records(
            "XP Events",
            formula=f"FIND('{ENROLL}', ARRAYJOIN({{Enrollment}}))",
            max_records=500,
        )
    except Exception as exc:  # noqa: BLE001
        # try Athlete link
        try:
            xp = c.list_records(
                "XP Events",
                formula=f"FIND('{ATHLETE}', ARRAYJOIN({{Athlete}}))",
                max_records=500,
            )
            report["pending"].append(f"XP Events via Athlete (Enrollment formula failed: {exc})")
        except Exception as exc2:  # noqa: BLE001
            report["errors"].append(f"XP Events fetch failed: {exc}; {exc2}")

    by_source: Counter = Counter()
    by_reason: Counter = Counter()
    source_keys: list[str] = []
    xp_keys: set[str] = set()
    for r in xp:
        f = r.get("fields") or {}
        xp_keys |= set(f.keys())
        sk = f.get("Source Key") or f.get("SourceKey") or ""
        source_keys.append(str(sk))
        prefix = str(sk).split("|")[0] if sk else "(empty)"
        by_source[prefix] += 1
        rp = f.get("Reason Public") or f.get("Reason") or ""
        by_reason[str(rp)[:60]] += 1
    report["checks"]["xp_events"] = {
        "count": len(xp),
        "by_source_key_prefix": dict(by_source),
        "by_reason_public_sample": dict(by_reason.most_common(30)),
        "fields_present": sorted(xp_keys),
        "source_keys": source_keys,
    }
    if len(xp) == 0:
        report["pending"].append("No XP Events linked to enrollment/athlete yet")
    else:
        report["succeeded"].append(f"XP Events found: {len(xp)} ({dict(by_source)})")

    # ---- Achievement Unlocks ----
    unlocks: list[dict] = []
    try:
        unlocks = c.list_records(
            "Athlete Achievement Unlocks",
            formula=f"OR(FIND('{ENROLL}', ARRAYJOIN({{Enrollment}})), FIND('{ATHLETE}', ARRAYJOIN({{Athlete}})))",
            max_records=200,
        )
    except Exception as exc:  # noqa: BLE001
        try:
            unlocks = c.list_records(
                "Athlete Achievement Unlocks",
                formula=f"FIND('{ATHLETE}', ARRAYJOIN({{Athlete}}))",
                max_records=200,
            )
        except Exception as exc2:  # noqa: BLE001
            report["errors"].append(f"Unlocks fetch: {exc}; {exc2}")
    unlock_names = []
    for r in unlocks:
        f = r.get("fields") or {}
        unlock_names.append(
            f.get("Achievement Name")
            or f.get("Name")
            or f.get("Achievement")
            or r.get("id")
        )
    report["checks"]["achievements"] = {
        "count": len(unlocks),
        "names_or_ids": unlock_names[:50],
    }
    if unlocks:
        report["succeeded"].append(f"Achievement unlocks: {len(unlocks)}")
    else:
        report["pending"].append("No Athlete Achievement Unlocks yet")

    # ---- Streak tables (discover names) ----
    for table in ("Streak Occurrences", "Streaks", "Athlete Streaks", "Current Streaks"):
        try:
            rows = c.list_records(
                table,
                formula=f"OR(FIND('{ENROLL}', ARRAYJOIN({{Enrollment}})), FIND('{ATHLETE}', ARRAYJOIN({{Athlete}})))",
                max_records=100,
            )
            report["checks"][f"streak_table:{table}"] = {"count": len(rows)}
            if rows:
                report["succeeded"].append(f"{table}: {len(rows)}")
        except Exception as exc:  # noqa: BLE001
            report["checks"][f"streak_table:{table}"] = {"error": str(exc)[:200]}

    # ---- Email packages / Hub ----
    for table in (
        "Email Packages",
        "Email Handoff Packages",
        "Email Queue",
        "Outbound Emails",
        "Email Sends",
        "Make Email Queue",
        "Hub Email Queue",
    ):
        try:
            rows = c.list_records(
                table,
                formula=f"OR(FIND('{ENROLL}', ARRAYJOIN({{Enrollment}})), FIND('{TAG}', {{Debug Note}} & ''), FIND('{TAG}', {{Notes}} & ''), FIND('{SAFE}', {{To}} & ''), FIND('{SAFE}', {{Recipient}} & ''), FIND('{ATHLETE}', ARRAYJOIN({{Athlete}})))",
                max_records=200,
            )
            recipients = set()
            statuses = Counter()
            for r in rows:
                f = r.get("fields") or {}
                for rk in ("To", "Recipient", "Parent Email", "Email To", "to"):
                    if f.get(rk):
                        recipients.add(str(f[rk]).strip().lower())
                st = f.get("Status") or f.get("Send Status") or f.get("Hub Status")
                if isinstance(st, dict):
                    st = st.get("name")
                if st is not None:
                    statuses[str(st)] += 1
            report["checks"][f"email_table:{table}"] = {
                "count": len(rows),
                "recipients": sorted(recipients),
                "statuses": dict(statuses),
            }
            unsafe = [r for r in recipients if r and r != SAFE and "@" in r]
            if unsafe:
                report["errors"].append(f"{table}: non-allowlist recipients {unsafe}")
            elif rows:
                report["succeeded"].append(f"{table}: {len(rows)} rows; recipients ok")
        except Exception as exc:  # noqa: BLE001
            msg = str(exc)
            if "NOT_FOUND" in msg or "Could not find table" in msg or "422" in msg:
                report["checks"][f"email_table:{table}"] = {"missing": True}
            else:
                report["checks"][f"email_table:{table}"] = {"error": msg[:250]}

    # Broader email search by schmidt + SEASON-SIM in common package tables
    # Also try Email Handoffs from known automation naming
    for table in ("Email Packages", "Emails", "Parent Emails"):
        try:
            rows = c.list_records(
                table,
                formula=f"FIND('{RUN}', {{Body}} & {{Subject}} & {{Debug}} & {{Notes}} & '')",
                max_records=50,
            )
            if rows:
                report["checks"][f"email_search:{table}"] = {"count": len(rows)}
        except Exception:
            pass

    # ---- Levels / gates on enrollment ----
    level_like = {k: ef[k] for k in ef if "level" in k.lower() or "gate" in k.lower()}
    report["checks"]["levels_gates_on_enrollment"] = level_like
    if level_like:
        report["succeeded"].append(f"Enrollment level/gate fields present: {list(level_like)}")
    else:
        report["pending"].append("No obvious level/gate fields on enrollment snapshot")

    # ---- Registry email intent ----
    emails = reg.get("email_events") or []
    bad_recips = [e for e in emails if (e.get("recipient") or "").lower() != SAFE]
    report["checks"]["registry_email_intents"] = {
        "count": len(emails),
        "send_true": sum(1 for e in emails if e.get("send")),
        "by_type": dict(Counter(e.get("event_type") for e in emails)),
        "non_allowlist": bad_recips,
    }
    if bad_recips:
        report["errors"].append(f"Registry email intents have non-allowlist: {bad_recips}")
    else:
        report["succeeded"].append(
            f"All {len(emails)} registry email intents target {SAFE} only"
        )

    out_path = ROOT / "reports" / f"audit-{RUN}.json"
    out_path.write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")
    print(json.dumps({
        "out": str(out_path),
        "succeeded": report["succeeded"],
        "pending": report["pending"],
        "errors": report["errors"],
        "xp_count": report["checks"].get("xp_events", {}).get("count"),
        "submissions": report["checks"].get("submissions"),
        "achievements": report["checks"].get("achievements"),
        "was_pw": report["checks"].get("was", {}).get("perfect_week_like"),
        "email_tables": {k: v for k, v in report["checks"].items() if k.startswith("email_")},
    }, indent=2, default=str))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
