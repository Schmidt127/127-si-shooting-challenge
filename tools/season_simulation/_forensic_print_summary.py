import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
r = json.loads(
    Path(
        "tools/season_simulation/reports/forensic-full-SEASON-SIM-2027-20260912T222521Z-threeathlete.json"
    ).read_text(encoding="utf-8")
)
print("ORACLE", r["oracle_total"])
print("EXPECTED BUCKETS")
for k, v in sorted(r["oracle_expected_buckets"].items()):
    print(f"  {k}: count={v['count']} xp={v['xp']}")

for profile in ["athlete1_perfect", "athlete2_recovery", "athlete3_edge"]:
    p = r["profiles"][profile]
    print("\n" + "=" * 80)
    print(profile, p["athlete_name"], p["enrollment_id"])
    print(
        "XP",
        p["xp"]["total_actual_xp"],
        "lifetime",
        p["lifetime_xp_total"],
        "level",
        p["public_level"],
        "status",
        p["level_status"],
    )
    print("gate", p.get("gate_debug"))
    print("active events", p["xp"]["active_event_count"], "dups", p["xp"]["duplicate_source_keys"])
    print("BUCKETS:")
    for k, v in p["xp"]["buckets"].items():
        print(
            f"  {k}: exp_c={v['expected_event_count']} act_c={v['actual_active_event_count']} "
            f"exp_xp={v['expected_xp']} act_xp={v['actual_xp']} diff={v['difference_xp']} "
            f"by={v['by_source_xp']}"
        )
    print("PW events:")
    for e in (p["xp"]["buckets"].get("Perfect Week") or {}).get("events") or []:
        print(" ", e["id"], e["source_key"], e["xp"], e.get("reason"), e.get("was"))
    print("WAS:")
    for w in p["perfect_week_matrix"]:
        print(
            f"  {w['week_label']}|elig={w['eligible']}|daily={w['daily_met']}|hw={w['hw_met']}|"
            f"vid={w['video_met']}|zoom={w['zoom_met']}|status={w['automation_status']}|"
            f"days={w['days_logged']}|pq={w['pw_qualifying_days']}|hwA={w['hw_assigned']}|"
            f"hwS={w['hw_satisfactory_by_week_end']}|vidC={w['video_count']}|"
            f"zMeet={w['zoom_required_hint']}|zAtt={w['zoom_attendance_count']}|"
            f"shots={w['actual_shots']}|tgt={w['weekly_shot_target']}|scaled={w['scaled_target']}|"
            f"xp={w['perfect_week_xp_event_rids']}|unlock={w['unlock_rids']}|"
            f"end={w['week_end']}|fail={w['exact_failing_reason']}"
        )
        if w.get("daily_detail"):
            print("    detail:", str(w["daily_detail"])[:300])
        if w.get("automation_error"):
            print("    error:", str(w["automation_error"])[:300])
    print("ZOOM records count", len(p["zoom_attendance"]))
    for z in p["zoom_attendance"]:
        interesting = {
            k: z.get(k)
            for k in z
            if k != "id"
            and any(
                x in k.lower()
                for x in ("name", "method", "mode", "status", "credit", "perfect", "meeting", "week")
            )
        }
        print(" ", z["id"], interesting)
    zoom_enr = {k: v for k, v in p["enrollment"].items() if "zoom" in k.lower() or "attend" in k.lower()}
    print("ZOOM enroll", zoom_enr)
    print(
        "EMAIL matched",
        p["email"].get("matched_count"),
        "by_type",
        p["email"].get("by_type"),
        "statuses",
        p["email"].get("statuses"),
        "recipients",
        p["email"].get("recipients"),
        "unsafe",
        p["email"].get("unsafe_recipients"),
        "dupes",
        p["email"].get("duplicate_dedupe_keys"),
    )
    print(
        "DEDUPE streak",
        p["dedupe"].get("streak_occurrences"),
        "dup streak",
        p["dedupe"].get("duplicate_streak_keys"),
        "pw unlocks",
        p["dedupe"].get("perfect_week_unlocks"),
        "reg dupes nonempty",
        {k: v for k, v in (p["dedupe"].get("registry_dupes") or {}).items() if v},
    )
    print("matrix expected PW", p["expectation_matrix_summary"].get("expected_perfect_weeks"))
    print("matrix cats", p["expectation_matrix_summary"].get("expected_xp_by_category"))
    if p.get("matrix_count_compare"):
        print("matrix count compare", p["matrix_count_compare"])
    # level links
    for k in [
        "Current Level",
        "Next Level",
        "Gate-Test Eligible Level",
        "Level Status",
        "Current Level - Public Facing Display",
        "Longest Streak",
        "Current Shooting Streak",
        "Goal Met?",
        "Goal Met",
        "Total Zoom Attendances",
    ]:
        if k in p["enrollment"]:
            print(f"  ENR {k}={p['enrollment'][k]!r}")
