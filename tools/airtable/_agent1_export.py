import csv, json
from collections import defaultdict
from pathlib import Path
from airtable_read import athlete_label, f, first_id, is_active, list_table, session

PREVIEW = Path("_preview/newspaper-radio-prep")
PREVIEW.mkdir(parents=True, exist_ok=True)
MIN_SHOTS = 10

def num(v):
    try:
        return float(str(v or "0").replace(",", ""))
    except ValueError:
        return 0.0

def flat(v):
    if v is None:
        return ""
    if isinstance(v, list):
        return ", ".join(flat(x) for x in v if x)
    if isinstance(v, dict):
        return str(v.get("name") or v.get("id") or "").strip()
    return str(v).strip()

sess = session()
fields = [
    "Full Athlete Name", "Athlete First Name", "Athlete Last Name", "Grade Band Label", "Grade", "Gender",
    "School Name Lookup", "School", "City Submitted", "School Year", "Active?",
    "Current Level - Public Facing Display", "Level Status", "Lifetime XP Total", "Total Shots Counted",
    "Target Goal Shots", "Goal Met?", "Total Homework Completions", "Total Video Submissions",
    "Total Zoom Attendances", "Longest Streak Days",
]
enrollments = list_table(sess, "Enrollments", fields)
subs = list_table(sess, "Submissions", ["Enrollment", "Count This Submission?", "Total Shots Counted"])
stats = defaultdict(lambda: {"counted_submissions": 0, "total_shots_counted": 0})
for s in subs:
    sf = f(s)
    eid = first_id(sf.get("Enrollment"))
    if not eid:
        continue
    if is_active(sf.get("Count This Submission?")) and num(sf.get("Total Shots Counted")) > 0:
        stats[eid]["counted_submissions"] += 1
        stats[eid]["total_shots_counted"] += int(num(sf.get("Total Shots Counted")))
school_city = {r["id"]: flat(f(r).get("City")) for r in list_table(sess, "School - Synced", ["Name", "City"])}
athletes = []
for rec in enrollments:
    ef = f(rec)
    eid = rec["id"]
    st = stats.get(eid, {})
    shots_sub = int(st.get("total_shots_counted", 0))
    shots = shots_sub if shots_sub > 0 else int(num(ef.get("Total Shots Counted")))
    if shots < MIN_SHOTS:
        continue
    school_ids = ef.get("School") or []
    sid = school_ids[0] if school_ids else ""
    if isinstance(sid, dict):
        sid = sid.get("id", "")
    city = flat(ef.get("City Submitted")) or school_city.get(str(sid), "")
    target = int(num(ef.get("Target Goal Shots")))
    gm = is_active(ef.get("Goal Met?")) or ef.get("Goal Met?") == "Yes" or (target > 0 and shots >= target)
    athletes.append({
        "enrollment_id": eid,
        "athlete_name": athlete_label(ef, eid),
        "grade_band": flat(ef.get("Grade Band Label")),
        "grade": flat(ef.get("Grade")),
        "gender": flat(ef.get("Gender")),
        "school_name": flat(ef.get("School Name Lookup")),
        "city_town": city,
        "school_year": flat(ef.get("School Year")) or "2025-2026",
        "active": is_active(ef.get("Active?")),
        "final_level": flat(ef.get("Current Level - Public Facing Display")),
        "level_status": flat(ef.get("Level Status")),
        "lifetime_xp": int(num(ef.get("Lifetime XP Total"))),
        "total_shots_counted": shots,
        "counted_submissions": int(st.get("counted_submissions", 0)),
        "target_goal_shots": target,
        "goal_met": "Yes" if gm else "No",
        "homework_count": int(num(ef.get("Total Homework Completions"))),
        "video_count": int(num(ef.get("Total Video Submissions"))),
        "zoom_count": int(num(ef.get("Total Zoom Attendances"))),
        "longest_streak_days": int(num(ef.get("Longest Streak Days"))),
    })
athletes.sort(key=lambda r: (r["school_name"].lower(), r["athlete_name"].lower()))
cols = list(athletes[0].keys()) if athletes else []
with open(PREVIEW / "athlete-master-export.csv", "w", newline="", encoding="utf-8") as fh:
    w = csv.DictWriter(fh, fieldnames=cols)
    w.writeheader()
    w.writerows(athletes)
(PREVIEW / "athlete-master-export.json").write_text(json.dumps(athletes, indent=2), encoding="utf-8")
seen = set()
idx = []
for a in athletes:
    k = (a["school_name"], a["city_town"])
    if k in seen or not a["school_name"]:
        continue
    seen.add(k)
    idx.append({
        "school_name": a["school_name"],
        "city_town": a["city_town"],
        "athlete_count": sum(1 for x in athletes if x["school_name"] == a["school_name"]),
        "sample_athletes": "; ".join(x["athlete_name"] for x in athletes if x["school_name"] == a["school_name"])[:500],
    })
with open(PREVIEW / "athlete-school-town-index.csv", "w", newline="", encoding="utf-8") as fh:
    w = csv.DictWriter(fh, fieldnames=["school_name", "city_town", "athlete_count", "sample_athletes"])
    w.writeheader()
    w.writerows(idx)
print("Agent1:", len(athletes), "athletes")
