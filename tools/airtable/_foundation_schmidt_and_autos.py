"""Probe Schmidt enrollment + Automations inventory table (PROD)."""
from __future__ import annotations

import json
import urllib.parse
import urllib.request
from pathlib import Path

PROD = "appn84sqPw03zEbTT"


def load_tok() -> str:
    env: dict[str, str] = {}
    for line in Path(__file__).with_name(".env").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env.get("AIRTABLE_TOKEN") or env.get("AIRTABLE_API_TOKEN") or ""


def get(tok: str, url: str):
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {tok}"})
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.load(r)


def mask_fields(fields: dict) -> dict:
    out = {}
    for k, v in fields.items():
        lk = k.lower()
        if "email" in lk or "cell" in lk or "phone" in lk:
            out[k] = "set" if v else "blank"
        elif any(
            x in lk
            for x in [
                "name",
                "active",
                "grade",
                "program",
                "school",
                "athlete",
                "parent",
                "level",
                "xp",
                "leaderboard",
                "public",
                "status",
                "week",
            ]
        ):
            out[k] = v
    return out


def main():
    tok = load_tok()
    out_dir = Path("docs/foundation-reset")
    out_dir.mkdir(parents=True, exist_ok=True)

    schmidt = {}
    for table, rid in [
        ("Athletes", "recgqVstObQRzgXJF"),
        ("Enrollments", "recgP9qZYjAhE7NXm"),
    ]:
        d = get(tok, f"https://api.airtable.com/v0/{PROD}/{urllib.parse.quote(table)}/{rid}")
        schmidt[table] = {"id": rid, "fields": mask_fields(d.get("fields", {}))}
        print("====", table, rid)
        print(json.dumps(schmidt[table]["fields"], indent=2)[:5000])

    (out_dir / "schmidt-records-masked.json").write_text(
        json.dumps(schmidt, indent=2), encoding="utf-8"
    )

    # Views named Testing / Web - Leaderboard on key tables
    meta = get(tok, f"https://api.airtable.com/v0/meta/bases/{PROD}/tables")
    view_report = []
    wanted = {
        "Athletes",
        "Enrollments",
        "Weeks",
        "Submissions",
        "Submission Assets",
        "Homework Completions",
        "XP Events",
        "Athlete Achievement Unlocks",
        "Weekly Athlete Summary",
        "Video Feedback",
        "Zoom Meetings",
        "Zoom Attendance",
        "Streak Occurrences",
        "Testing Scenarios",
        "Automations",
    }
    for t in meta["tables"]:
        if t["name"] not in wanted:
            continue
        views = [{"id": v["id"], "name": v["name"], "type": v.get("type")} for v in t.get("views", [])]
        testing = [v for v in views if v["name"] == "Testing"]
        leaderboard = [v for v in views if "Leaderboard" in v["name"] or "leaderboard" in v["name"]]
        view_report.append(
            {
                "table": t["name"],
                "tableId": t["id"],
                "testingViews": testing,
                "leaderboardViews": leaderboard,
                "allViews": views,
            }
        )
        print(
            "VIEWS",
            t["name"],
            "testing=",
            bool(testing),
            "leaderboard=",
            [v["name"] for v in leaderboard],
        )

    (out_dir / "prod-testing-and-leaderboard-views.json").write_text(
        json.dumps(view_report, indent=2), encoding="utf-8"
    )

    # Automations inventory table
    auto_table = next(t for t in meta["tables"] if t["name"] == "Automations")
    fields = [{"name": f["name"], "type": f["type"], "id": f["id"]} for f in auto_table["fields"]]
    print("AUTO_FIELDS", json.dumps(fields, indent=2))

    recs = []
    url = (
        "https://api.airtable.com/v0/"
        + PROD
        + "/"
        + urllib.parse.quote("Automations")
        + "?pageSize=100"
    )
    while url:
        d = get(tok, url)
        recs.extend(d.get("records", []))
        off = d.get("offset")
        if off:
            url = (
                "https://api.airtable.com/v0/"
                + PROD
                + "/"
                + urllib.parse.quote("Automations")
                + "?pageSize=100&offset="
                + urllib.parse.quote(off)
            )
        else:
            url = None

    rows = []
    for r in recs:
        f = r.get("fields", {})
        rows.append({"id": r["id"], **f})
    rows.sort(key=lambda x: str(x.get("Name") or x.get("Automation Name") or ""))
    print("automation_rows", len(rows))
    for row in rows:
        print(row.get("id"), "|", row.get("Name") or row.get("Automation Name"), "| keys", sorted(row.keys()))

    (out_dir / "prod-automations-table-raw.json").write_text(
        json.dumps({"fields": fields, "records": rows}, indent=2), encoding="utf-8"
    )

    # Program instance linked on Schmidt
    pi = schmidt["Enrollments"]["fields"].get("Program Instance")
    print("program_instance_links", pi)

    # Grade band
    print("grade_band", schmidt["Enrollments"]["fields"].get("Grade Band"))
    print("active_enrollment", schmidt["Enrollments"]["fields"].get("Active?"))
    print("active_athlete", schmidt["Athletes"]["fields"].get("Active?"))


if __name__ == "__main__":
    main()
