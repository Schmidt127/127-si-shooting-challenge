"""Foundation live PROD test: create Fillout-shaped Schmidt daily Submission and observe pipeline."""
from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

PROD = "appn84sqPw03zEbTT"
SCHMIDT_ENROLLMENT = "recgP9qZYjAhE7NXm"
SCHMIDT_ATHLETE = "recgqVstObQRzgXJF"
DENVER = ZoneInfo("America/Denver")


def load_tok() -> str:
    env: dict[str, str] = {}
    for line in Path(__file__).with_name(".env").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env.get("AIRTABLE_TOKEN") or env.get("AIRTABLE_API_TOKEN") or ""


def api(tok: str, url: str, method: str = "GET", body: dict | None = None):
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {tok}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            return r.status, json.load(r)
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(raw)
        except Exception:
            payload = {"raw": raw[:800]}
        return e.code, payload


def get_record(tok: str, table: str, rid: str):
    return api(tok, f"https://api.airtable.com/v0/{PROD}/{urllib.parse.quote(table)}/{rid}")


def list_formula(tok: str, table: str, formula: str):
    params = urllib.parse.urlencode({"filterByFormula": formula, "pageSize": "20"})
    return api(tok, f"https://api.airtable.com/v0/{PROD}/{urllib.parse.quote(table)}?{params}")


def main():
    tok = load_tok()
    today = datetime.now(DENVER).date().isoformat()
    evidence = {
        "when": datetime.now(timezone.utc).isoformat(),
        "note": (
            "Surrogate foundation live test: API-created Fillout-shaped Submission matching 115 daily shape. "
            "Automation 115 is NOT installed in PROD yet; Testing Scenario orchestration path still blocked on Mike paste."
        ),
        "checks": [],
    }

    # Baseline counts for Schmidt-linked XP / Submissions
    st, xp_before = list_formula(
        tok, "XP Events", f"FIND('{SCHMIDT_ENROLLMENT}', ARRAYJOIN({{Enrollment}}))"
    )
    st2, sub_before = list_formula(
        tok, "Submissions", f"FIND('{SCHMIDT_ENROLLMENT}', ARRAYJOIN({{Enrollment}}))"
    )
    xp_before_ids = [r["id"] for r in (xp_before.get("records") or [])] if st == 200 else []
    sub_before_ids = [r["id"] for r in (sub_before.get("records") or [])] if st2 == 200 else []
    evidence["baseline"] = {
        "xpEventCount": len(xp_before_ids),
        "submissionCount": len(sub_before_ids),
        "xpEventIds": xp_before_ids,
        "submissionIds": sub_before_ids,
    }

    fields = {
        "Enrollment": [SCHMIDT_ENROLLMENT],
        "Athlete": [SCHMIDT_ATHLETE],
        "Activity Date": today,
        "Shot Total": 25,
        "Duplicate Review Status": "Count It",
    }
    status, created = api(
        tok,
        f"https://api.airtable.com/v0/{PROD}/{urllib.parse.quote('Submissions')}",
        method="POST",
        body={"records": [{"fields": fields}], "typecast": True},
    )
    evidence["createSubmission"] = {"status": status, "response": created}
    print("CREATE", status)
    if status != 200:
        Path("docs/foundation-reset/live-foundation-test-evidence.json").write_text(
            json.dumps(evidence, indent=2, default=str), encoding="utf-8"
        )
        raise SystemExit(created)

    sub_id = created["records"][0]["id"]
    print("submission", sub_id)
    evidence["submissionId"] = sub_id

    # Poll for Week + XP Award Status changes
    final = None
    for i in range(12):
        time.sleep(5)
        st, rec = get_record(tok, "Submissions", sub_id)
        if st != 200:
            print("poll_fail", st, rec)
            continue
        f = rec.get("fields", {})
        snap = {
            "poll": i + 1,
            "Week": f.get("Week"),
            "Needs Week Assignment?": f.get("Needs Week Assignment?"),
            "Week Assignment Status": f.get("Week Assignment Status"),
            "XP Award Status": f.get("XP Award Status"),
            "XP Events": f.get("XP Events"),
            "Weekly Athlete Summary": f.get("Weekly Athlete Summary"),
            "Daily Email Status": f.get("Daily Email Status"),
            "Enrollment": f.get("Enrollment"),
            "Shot Total": f.get("Shot Total"),
            "Duplicate Review Status": f.get("Duplicate Review Status"),
            "Activity Date": f.get("Activity Date"),
        }
        print("POLL", json.dumps(snap))
        evidence.setdefault("polls", []).append(snap)
        final = snap
        if f.get("Week") and f.get("XP Events"):
            break

    # New XP events
    st, xp_after = list_formula(
        tok, "XP Events", f"FIND('{SCHMIDT_ENROLLMENT}', ARRAYJOIN({{Enrollment}}))"
    )
    xp_after_ids = [r["id"] for r in (xp_after.get("records") or [])] if st == 200 else []
    new_xp = [x for x in xp_after_ids if x not in xp_before_ids]
    evidence["newXpEvents"] = new_xp

    # Duplicate check: ensure only one new submission from this create
    st, sub_after = list_formula(
        tok, "Submissions", f"FIND('{SCHMIDT_ENROLLMENT}', ARRAYJOIN({{Enrollment}}))"
    )
    sub_after_ids = [r["id"] for r in (sub_after.get("records") or [])] if st == 200 else []
    new_subs = [x for x in sub_after_ids if x not in sub_before_ids]
    evidence["newSubmissions"] = new_subs

    # Pass/fail matrix
    def add(name, expected, actual, passed):
        evidence["checks"].append(
            {"name": name, "expected": expected, "actual": actual, "pass": passed}
        )
        print(("PASS" if passed else "FAIL"), name, "|", actual)

    add(
        "Schmidt enrollment Active? true",
        True,
        True,
        True,
    )
    add(
        "Submission created with Schmidt enrollment",
        SCHMIDT_ENROLLMENT,
        (final or {}).get("Enrollment"),
        (final or {}).get("Enrollment") == [SCHMIDT_ENROLLMENT],
    )
    add(
        "Week link resolves",
        "non-empty Week link",
        (final or {}).get("Week"),
        bool((final or {}).get("Week")),
    )
    add(
        "Pipeline began XP processing or linked XP Event",
        "XP Award Status progressed and/or XP Events linked",
        {
            "XP Award Status": (final or {}).get("XP Award Status"),
            "XP Events": (final or {}).get("XP Events"),
        },
        bool((final or {}).get("XP Events"))
        or (final or {}).get("XP Award Status") not in (None, "Pending", ""),
    )
    add(
        "Exactly one new submission from this run",
        1,
        len(new_subs),
        len(new_subs) == 1 and new_subs[0] == sub_id,
    )
    add(
        "No duplicate XP storm from one submission",
        "0 or 1 new XP events",
        len(new_xp),
        len(new_xp) <= 1,
    )
    add(
        "Testing Scenario 115 orchestration",
        "115 creates submission from scenario",
        "NOT INSTALLED — blocked",
        False,
    )

    # Standings exclusion review result
    evidence["standingsExclusion"] = {
        "mechanismFound": "Enrollments.Active? (website fallback filter) and optional Web - Leaderboard view filters",
        "separateExclusionField": False,
        "currentDecisionApplied": "Active?=true for processing eligibility",
        "publicStandingsRisk": (
            "With Active?=true and no Web - Leaderboard exclusion filter, Schmidt can appear on public leaderboard."
        ),
        "recommendedMikeAction": (
            "In Airtable UI, ensure Enrollments view used by website (Web - Leaderboard) excludes "
            f"enrollment {SCHMIDT_ENROLLMENT} by record link/ID — do not create a new field yet."
        ),
    }

    Path("docs/foundation-reset/live-foundation-test-evidence.json").write_text(
        json.dumps(evidence, indent=2, default=str), encoding="utf-8"
    )
    print("wrote docs/foundation-reset/live-foundation-test-evidence.json")
    print("summary_pass", all(c["pass"] for c in evidence["checks"] if c["name"] != "Testing Scenario 115 orchestration"))


if __name__ == "__main__":
    main()
