#!/usr/bin/env python3
"""
Overnight Agent 2 — offline analysis of prod-config-snapshot.json.

Reads the read-only probe output and prints integrity findings for
Levels, Level Gate Rules, Grade Bands, Shot Milestones, Achievements,
XP Reward Rules, and Schmidt state. Pure local analysis; no API calls.
"""

from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

SNAPSHOT = Path("docs/overnight/config-xp/prod-config-snapshot.json")


def fields(rec):
    return rec.get("fields", {})


def main() -> int:
    data = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
    ct = data["config_tables"]

    print("=== GRADE BANDS ===")
    for rec in ct["Grade Bands"]:
        f = fields(rec)
        print(f"  {rec['id']}  name={f.get('Grade Band Name')!r} active={f.get('Active?')} target={f.get('Total Shot Target')}")

    print("\n=== LEVELS ===")
    levels = []
    for rec in ct["Levels"]:
        f = fields(rec)
        levels.append((f.get("Rank"), f.get("Level Name"), f.get("XP Required (Cumulative)"), f.get("Active?"), rec["id"], bool(f.get("Level Gate Rules"))))
    for row in sorted(levels, key=lambda r: (r[0] is None, r[0])):
        print(f"  rank={row[0]} name={row[1]!r} xp={row[2]} active={row[3]} hasGateRuleLink={row[5]} id={row[4]}")
    ranks = [r[0] for r in levels if r[3]]
    dup_ranks = [k for k, v in Counter(ranks).items() if v > 1]
    if dup_ranks:
        print(f"  !! duplicate active ranks: {dup_ranks}")
    xps = [r[2] for r in sorted(levels, key=lambda r: (r[0] is None, r[0])) if r[3]]
    if xps != sorted(xps):
        print("  !! XP thresholds not monotonically increasing by rank")

    print("\n=== LEVEL GATE RULES ===")
    by_level = defaultdict(list)
    for rec in ct["Level Gate Rules"]:
        f = fields(rec)
        level_link = (f.get("Level") or [None])[0]
        by_level[level_link].append(rec)
        print(
            f"  {rec['id']} name={f.get('Level Gate Rule Name')!r} level={f.get('Level Name (Lookup)')}"
            f" versionActive={f.get('Version Active?')} gateEnabled={f.get('Gate Enabled?')}"
            f" subs={f.get('Minimum Submissions')} hw={f.get('Minimum Homework')}"
            f" vids={f.get('Minimum Videos')} zoom={f.get('Minimum Zoom Meetings')} streak={f.get('Minimum Streak Days')}"
        )
    for level_id, recs in by_level.items():
        active = [r for r in recs if fields(r).get("Version Active?")]
        if len(active) > 1:
            print(f"  !! level {level_id} has {len(active)} active gate rules")
        if level_id is None:
            print(f"  !! {len(recs)} gate rules with no Level link")
    level_ids = {rec["id"] for rec in ct["Levels"]}
    for level_id in by_level:
        if level_id and level_id not in level_ids:
            print(f"  !! gate rule references missing Level {level_id}")

    print("\n=== SHOT MILESTONES (per grade band) ===")
    by_band = defaultdict(list)
    keys = Counter()
    for rec in ct["Shot Milestones"]:
        f = fields(rec)
        band = f.get("Grade Band")
        band_key = tuple(band) if isinstance(band, list) else band
        by_band[band_key].append(f)
        if f.get("Milestone Unique Key"):
            keys[f["Milestone Unique Key"]] += 1
    for band, rows in sorted(by_band.items(), key=lambda kv: str(kv[0])):
        active = [r for r in rows if r.get("Active")]
        counts = sorted((r.get("Milestone Shot Count"), r.get("Points Awarded")) for r in active)
        print(f"  band={band} total={len(rows)} active={len(active)} thresholds={counts}")
        dup_counts = [k for k, v in Counter(r.get("Milestone Shot Count") for r in active).items() if v > 1]
        if dup_counts:
            print(f"  !! duplicate active shot counts in band {band}: {dup_counts}")
    dup_keys = [k for k, v in keys.items() if v > 1]
    if dup_keys:
        print(f"  !! duplicate Milestone Unique Keys: {dup_keys}")
    no_band = [r for r in ct["Shot Milestones"] if not fields(r).get("Grade Band")]
    if no_band:
        print(f"  !! {len(no_band)} milestones with no Grade Band link")

    print("\n=== ACHIEVEMENTS ===")
    for rec in ct["Achievements"]:
        f = fields(rec)
        print(
            f"  {rec['id']} name={f.get('Achievement Name')!r} active={f.get('Active?')}"
            f" trigger={f.get('Trigger Type')} threshold={f.get('Trigger Threshold')}"
            f" rewardKey={f.get('Reward Rule Key')} repeatable={f.get('Repeatable?')}"
        )

    print("\n=== XP REWARD RULES (active) ===")
    rule_keys = Counter()
    for rec in ct["XP Reward Rules"]:
        f = fields(rec)
        if f.get("Active?"):
            rule_keys[f.get("Rule Key")] += 1
            print(f"  {f.get('Rule Key')}: xp={f.get('XP Amount')} label={f.get('XP Source Label')!r} band={f.get('Grade Band')}")
    dups = [k for k, v in rule_keys.items() if v > 1]
    print(f"  duplicate active rule keys: {dups if dups else 'none'}")

    print("\n=== CONFIG TABLE ===")
    for rec in ct["Config"]:
        print(f"  {rec['id']}: {json.dumps(fields(rec), default=str)[:400]}")

    print("\n=== WEEKS ===")
    for rec in ct["Weeks"]:
        print(f"  {rec.get('id', rec)}: {json.dumps(fields(rec), default=str)}")

    print("\n=== TARGET GOAL SHOTS ===")
    for rec in ct["Target Goal Shots"]:
        print(f"  {rec.get('id', rec)}: {json.dumps(fields(rec), default=str)}")

    sch = data["schmidt"]
    print("\n=== SCHMIDT ENROLLMENT (selected fields) ===")
    ef = fields(sch["enrollment"])
    for key in sorted(ef):
        if any(t in key for t in ("Level", "XP", "Grade", "Streak", "Shot", "Zoom", "Homework", "Video", "Recalc", "Active", "Name", "Milestone")):
            val = ef[key]
            sval = json.dumps(val, default=str)
            print(f"  {key} = {sval[:200]}")

    print("\n=== SCHMIDT LIVE SUBMISSION ===")
    sf = fields(sch["live_submission"])
    for key in sorted(sf):
        val = json.dumps(sf[key], default=str)
        print(f"  {key} = {val[:160]}")

    print("\n=== XP EVENTS (all in base) ===")
    for rec in sch["xp_events"]:
        f = fields(rec)
        print(
            f"  {rec['id']} src={f.get('XP Source')} bucket={f.get('XP Bucket')} pts={f.get('XP Points')}"
            f" dedupe={f.get('XP Dedupe Key')!r} date={f.get('XP Activity Date')} enrollment={f.get('Enrollment')}"
        )

    print("\n=== ACHIEVEMENT UNLOCKS (all) ===")
    for rec in sch["achievement_unlocks"]:
        f = fields(rec)
        keyish = {k: v for k, v in f.items() if "Key" in k or "Status" in k or "Enrollment" in k or "Date" in k}
        print(f"  {rec['id']}: {json.dumps(keyish, default=str)[:300]}")

    print("\n=== STREAK OCCURRENCES (all) ===")
    for rec in sch["streak_occurrences"]:
        f = fields(rec)
        print(f"  {rec['id']}: {json.dumps(f, default=str)[:300]}")

    print("\n=== WEEKLY ATHLETE SUMMARIES (all) ===")
    for rec in sch["weekly_athlete_summaries"]:
        f = fields(rec)
        keyish = {k: v for k, v in f.items() if any(t in k for t in ("Week", "Perfect", "Enrollment", "Grade", "Goal", "Shots", "Status"))}
        print(f"  {rec['id']}: {json.dumps(keyish, default=str)[:400]}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
