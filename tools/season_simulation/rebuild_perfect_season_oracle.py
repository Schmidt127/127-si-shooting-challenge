"""Rebuild expected_perfect_season_xp.json for the current SIM_START/SIM_END window.

Comparison-only oracle — simulation engine must not use this file to decide awards.
"""

from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

from tools.season_simulation.constants import SIM_END, SIM_START, SIMULATION_DAY_COUNT
from tools.season_simulation.perfect_week_eval import evaluate_all_perfect_weeks
from tools.season_simulation.scenario_base import (
    aggregate_weekly_shots,
    compute_goal_met_crossing,
    estimate_weekly_goal_shots,
    weekly_threshold_tiers,
)
from tools.season_simulation.scenarios_sc001 import build_athlete1_perfect_scenario
from tools.season_simulation.season_policy import week_label_for_activity_date

SHOOTING_BASE = 20
STREAK = {3: 10, 5: 15, 7: 20, 10: 30, 20: 50, 30: 60, 40: 75, 50: 90, 60: 105}
THRESH = {100: 10, 125: 20, 150: 30}
PW = 100
HW = 35
VIDEO = 25
ZOOM_BASE = 60
ZOOM_B2 = 30
ZOOM_B3 = 40
ZOOM_REC = 30
MILESTONES = [
    (3000, 10, "25%"),
    (6000, 15, "50%"),
    (9000, 20, "75%"),
    (12000, 30, "100%"),
    (14400, 40, "120%"),
    (18000, 50, "150%"),
    (21000, 65, "175%"),
    (24000, 80, "200%"),
]
LEVELS = [
    (0, "Beginner"),
    (200, "Rookie Shooter"),
    (400, "Developing Shooter"),
    (600, "Consistent Shooter"),
    (800, "Dangerous Shooter"),
    (1000, "Hot Hand"),
    (1200, "Deadeye"),
    (1400, "Sharpshooter"),
    (1600, "Pro"),
    (1800, "All-Star"),
    (2000, "Legend"),
    (2200, "G.O.A.T."),
]
WEEK_ORDER = ["Early Bird"] + [f"Week {i}" for i in range(1, 10)]
OUT = Path(__file__).with_name("expected_perfect_season_xp.json")


def level_for(xp: int) -> str:
    cur = "Beginner"
    for thr, name in LEVELS:
        if xp >= thr:
            cur = name
    return cur


def main() -> None:
    existing = json.loads(OUT.read_text(encoding="utf-8"))
    rule_snapshot = existing["rule_snapshot"]
    exclusions = existing["exclusions"]

    hw = [
        {
            "record_id": f"recPHA{i:02d}",
            "week_id": "",
            "slot": str((i % 2) + 1),
            "display": (
                "Early Bird" if i < 2 else f"Week {((i - 2) // 2) + 1}"
            ),
        }
        for i in range(18)
    ]
    sc = build_athlete1_perfect_scenario(
        run_id="SEASON-SIM-2027-ORACLE-OFFLINE",
        grade_band_id="rec75ruo3XT5nSvaK",
        goal_record_id="recGOAL912",
        goal_total_shots=12000,
        homework=hw,
        zoom_meetings=[{"record_id": "recZLIVE"}, {"record_id": "recZREC"}],
        weeks=None,
    )

    events: list[dict] = []
    shots = 0
    live_count = 0
    milestone_unlocks: list[dict] = []
    streak_unlocks: list[dict] = []

    for d in sc.days:
        label = week_label_for_activity_date(d.activity_date)
        if d.action != "submit":
            continue
        events.append(
            {
                "date": d.activity_date.isoformat(),
                "day": d.day_number,
                "week": label,
                "source": "SHOOTING_BASE",
                "rule_key": "SHOOTING_BASE",
                "xp": SHOOTING_BASE,
                "detail": f"counted submission D{d.day_number:02d}",
            }
        )
        prev = shots
        shots += d.shot_total
        for thr, xp, pct in MILESTONES:
            if prev < thr <= shots:
                events.append(
                    {
                        "date": d.activity_date.isoformat(),
                        "day": d.day_number,
                        "week": label,
                        "source": "SHOT_MILESTONE",
                        "rule_key": "SHOT_MILESTONE",
                        "xp": xp,
                        "detail": f"{thr} shots ({pct}) cumulative={shots}",
                    }
                )
                milestone_unlocks.append(
                    {
                        "shot_count": thr,
                        "percent": pct,
                        "xp": xp,
                        "date": d.activity_date.isoformat(),
                        "day": d.day_number,
                        "cumulative_shots": shots,
                    }
                )
        if d.day_number in STREAK:
            events.append(
                {
                    "date": d.activity_date.isoformat(),
                    "day": d.day_number,
                    "week": label,
                    "source": "STREAK",
                    "rule_key": f"STREAK_{d.day_number}DAY",
                    "xp": STREAK[d.day_number],
                    "detail": f"{d.day_number}-day streak unlock",
                }
            )
            streak_unlocks.append(
                {
                    "threshold_days": d.day_number,
                    "xp": STREAK[d.day_number],
                    "date": d.activity_date.isoformat(),
                    "day": d.day_number,
                }
            )
        if d.video_feedback or d.video_count:
            n = max(1, d.video_count)
            for i in range(n):
                events.append(
                    {
                        "date": d.activity_date.isoformat(),
                        "day": d.day_number,
                        "week": label,
                        "source": "VIDEO_SUBMISSION",
                        "rule_key": "VIDEO_SUBMISSION",
                        "xp": VIDEO,
                        "detail": f"satisfactory video {i + 1}",
                    }
                )
        for h in d.homework:
            if str(h.get("outcome")) == "Satisfactory":
                events.append(
                    {
                        "date": d.activity_date.isoformat(),
                        "day": d.day_number,
                        "week": label,
                        "source": "HOMEWORK_COMPLETION",
                        "rule_key": "HOMEWORK_COMPLETION",
                        "xp": HW,
                        "detail": "satisfactory homework completion",
                    }
                )
        if "live" in d.zoom_modes:
            live_count += 1
            events.append(
                {
                    "date": d.activity_date.isoformat(),
                    "day": d.day_number,
                    "week": label,
                    "source": "ZOOM_ATTEND_BASE",
                    "rule_key": "ZOOM_ATTEND_BASE",
                    "xp": ZOOM_BASE,
                    "detail": f"live attendance #{live_count}",
                }
            )
            if live_count == 2:
                events.append(
                    {
                        "date": d.activity_date.isoformat(),
                        "day": d.day_number,
                        "week": label,
                        "source": "ZOOM_ATTEND_BONUS_2",
                        "rule_key": "ZOOM_ATTEND_BONUS_2",
                        "xp": ZOOM_B2,
                        "detail": "season 2nd qualifying live meeting",
                    }
                )
            if live_count == 3:
                events.append(
                    {
                        "date": d.activity_date.isoformat(),
                        "day": d.day_number,
                        "week": label,
                        "source": "ZOOM_ATTEND_BONUS_3",
                        "rule_key": "ZOOM_ATTEND_BONUS_3",
                        "xp": ZOOM_B3,
                        "detail": "season 3rd qualifying live meeting",
                    }
                )
        if "recording" in d.zoom_modes:
            events.append(
                {
                    "date": d.activity_date.isoformat(),
                    "day": d.day_number,
                    "week": label,
                    "source": "ZOOM_RECORDING_CREDIT",
                    "rule_key": "ZOOM_RECORDING_CREDIT",
                    "xp": ZOOM_REC,
                    "detail": "recording credit = 50% of ZOOM_ATTEND_BASE",
                }
            )

    agg = aggregate_weekly_shots(sc.days)
    pw = {e.week_label: e for e in evaluate_all_perfect_weeks(sc)}
    threshold_awards: list[dict] = []
    pw_awards: list[dict] = []
    for label in WEEK_ORDER:
        days = [
            d
            for d in sc.days
            if week_label_for_activity_date(d.activity_date) == label
            and d.action == "submit"
        ]
        if not days:
            continue
        end = max(days, key=lambda x: x.activity_date)
        b = agg[label]
        goal = estimate_weekly_goal_shots(12000, label)
        ratio = b["weekly_shots"] / goal if goal else 0
        for t in weekly_threshold_tiers(ratio):
            events.append(
                {
                    "date": end.activity_date.isoformat(),
                    "day": end.day_number,
                    "week": label,
                    "source": "WEEKLY_THRESHOLD",
                    "rule_key": f"WEEKLY_THRESHOLD_{t}_912",
                    "xp": THRESH[t],
                    "detail": (
                        f"{t}% weekly goal (shots={b['weekly_shots']}, goal_est={goal})"
                    ),
                }
            )
            threshold_awards.append(
                {
                    "week": label,
                    "tier": t,
                    "xp": THRESH[t],
                    "weekly_shots": b["weekly_shots"],
                    "goal_estimate": goal,
                }
            )
        if pw[label].passes:
            events.append(
                {
                    "date": end.activity_date.isoformat(),
                    "day": end.day_number,
                    "week": label,
                    "source": "PERFECT_WEEK",
                    "rule_key": "PERFECT_WEEK",
                    "xp": PW,
                    "detail": pw[label].outcome,
                }
            )
            pw_awards.append(
                {"week": label, "outcome": pw[label].outcome, "xp": PW}
            )

    events.sort(
        key=lambda e: (e["date"], e["day"], e["source"], e["rule_key"], e["detail"])
    )
    cum = 0
    ledger = []
    for e in events:
        cum += e["xp"]
        row = dict(e)
        row["cumulative_xp"] = cum
        ledger.append(row)

    by_src: dict[str, dict] = defaultdict(
        lambda: {"units": 0, "xp": 0, "xp_per_unit": None}
    )
    for e in events:
        s = e["source"]
        by_src[s]["units"] += 1
        by_src[s]["xp"] += e["xp"]

    week_xp: dict[str, int] = defaultdict(int)
    for e in events:
        week_xp[e["week"]] += e["xp"]
    week_rows = []
    running = 0
    for label in WEEK_ORDER:
        running += week_xp[label]
        b = agg.get(label, {})
        goal = estimate_weekly_goal_shots(12000, label)
        week_rows.append(
            {
                "week": label,
                "weekly_shots": b.get("weekly_shots", 0),
                "goal_estimate": goal,
                "xp_this_week": week_xp[label],
                "cumulative_xp": running,
                "expected_level": level_for(running),
                "perfect_week": pw[label].outcome if label in pw else None,
                "threshold_tiers": weekly_threshold_tiers(
                    (b.get("weekly_shots", 0) / goal) if goal else 0
                ),
            }
        )

    crossing = compute_goal_met_crossing(sc)
    crossing_date, crossing_day, _before, crossing_cum = crossing

    # Dynamic source table from ledger (authoritative for this window).
    thresh_units = by_src["WEEKLY_THRESHOLD"]["units"]
    thresh_xp = by_src["WEEKLY_THRESHOLD"]["xp"]
    thr_100 = sum(1 for a in threshold_awards if a["tier"] == 100)
    thr_125 = sum(1 for a in threshold_awards if a["tier"] == 125)
    thr_150 = sum(1 for a in threshold_awards if a["tier"] == 150)
    shoot_u = by_src["SHOOTING_BASE"]["units"]
    video_u = by_src["VIDEO_SUBMISSION"]["units"]
    zoom_live = by_src["ZOOM_ATTEND_BASE"]["units"]
    pw_u = by_src["PERFECT_WEEK"]["units"]
    hw_u = by_src["HOMEWORK_COMPLETION"]["units"]
    streak_u = by_src["STREAK"]["units"]
    ms_u = by_src["SHOT_MILESTONE"]["units"]
    rec_u = by_src.get("ZOOM_RECORDING_CREDIT", {"units": 0, "xp": 0})["units"]

    source_table = [
        {
            "xp_source": "SHOOTING_BASE",
            "units": shoot_u,
            "xp_per_unit": 20,
            "expected_xp": by_src["SHOOTING_BASE"]["xp"],
            "formula": f"{shoot_u} counted submissions × 20",
        },
        {
            "xp_source": "STREAK",
            "units": streak_u,
            "xp_per_unit": None,
            "expected_xp": by_src["STREAK"]["xp"],
            "formula": (
                f"one award each at days {','.join(str(k) for k in STREAK)} "
                f"within single {SIMULATION_DAY_COUNT}-day block"
            ),
        },
        {
            "xp_source": "WEEKLY_THRESHOLD",
            "units": thresh_units,
            "xp_per_unit": None,
            "expected_xp": thresh_xp,
            "formula": (
                f"{thr_100}×100%(10) + {thr_125}×125%(20) + {thr_150}×150%(30) "
                "for 9-12 band"
            ),
        },
        {
            "xp_source": "PERFECT_WEEK",
            "units": pw_u,
            "xp_per_unit": 100,
            "expected_xp": by_src["PERFECT_WEEK"]["xp"],
            "formula": (
                f"{pw_u} qualifying weeks × 100 "
                "(incl. Week 9 partial window when eligible)"
            ),
        },
        {
            "xp_source": "HOMEWORK_COMPLETION",
            "units": hw_u,
            "xp_per_unit": 35,
            "expected_xp": by_src["HOMEWORK_COMPLETION"]["xp"],
            "formula": (
                f"{hw_u} satisfactory PHA × 35 "
                "(Satisfactory is the award condition; no separate review XP)"
            ),
        },
        {
            "xp_source": "VIDEO_SUBMISSION",
            "units": video_u,
            "xp_per_unit": 25,
            "expected_xp": by_src["VIDEO_SUBMISSION"]["xp"],
            "formula": (
                f"{video_u} satisfactory videos × 25 "
                "(≤3/week pattern; Max Videos Per Submission=3)"
            ),
        },
        {
            "xp_source": "ZOOM_ATTEND_BASE",
            "units": zoom_live,
            "xp_per_unit": 60,
            "expected_xp": by_src["ZOOM_ATTEND_BASE"]["xp"],
            "formula": f"{zoom_live} live attendances × 60 (design-intent scheduled Zooms)",
        },
        {
            "xp_source": "ZOOM_ATTEND_BONUS_2",
            "units": by_src["ZOOM_ATTEND_BONUS_2"]["units"],
            "xp_per_unit": 30,
            "expected_xp": by_src["ZOOM_ATTEND_BONUS_2"]["xp"],
            "formula": "once when qualifying live count reaches 2",
        },
        {
            "xp_source": "ZOOM_ATTEND_BONUS_3",
            "units": by_src["ZOOM_ATTEND_BONUS_3"]["units"],
            "xp_per_unit": 40,
            "expected_xp": by_src["ZOOM_ATTEND_BONUS_3"]["xp"],
            "formula": "once when qualifying live count reaches 3",
        },
        {
            "xp_source": "ZOOM_RECORDING_CREDIT",
            "units": rec_u,
            "xp_per_unit": 30,
            "expected_xp": by_src.get("ZOOM_RECORDING_CREDIT", {"xp": 0})["xp"],
            "formula": "1 recording × floor(60 × 50% Config Zoom Recording XP Percent of Live)",
        },
        {
            "xp_source": "SHOT_MILESTONE",
            "units": ms_u,
            "xp_per_unit": None,
            "expected_xp": by_src["SHOT_MILESTONE"]["xp"],
            "formula": (
                "9-12 milestones "
                + "/".join(str(t) for t, _, _ in MILESTONES if t <= shots)
                + " = "
                + "+".join(str(x) for t, x, _ in MILESTONES if t <= shots)
            ),
        },
    ]

    source_total = sum(r["expected_xp"] for r in source_table)
    assert source_total == cum, (source_total, cum)
    assert len(sc.days) == SIMULATION_DAY_COUNT
    assert shoot_u == SIMULATION_DAY_COUNT

    # Refresh reached flags on the preserved rule snapshot.
    for row in rule_snapshot.get("shot_milestones_9_12") or []:
        row["reached"] = int(row.get("shot_count") or 0) <= shots

    payload = {
        "oracle_id": "PERFECT_SEASON_XP_ORACLE",
        "profile": "athlete1_perfect",
        "scenario_seed": "sc001-athlete1-perfect-v1",
        "window": {
            "start": SIM_START.isoformat(),
            "end": SIM_END.isoformat(),
            "days": SIMULATION_DAY_COUNT,
        },
        "grade_band": "9-12",
        "grade_band_id": "rec75ruo3XT5nSvaK",
        "season_goal_shots": 12000,
        "total_planned_shots": shots,
        "base_id": "appn84sqPw03zEbTT",
        "rule_set": "Shooting Challenge 2026-2027",
        "captured_at": "2026-09-12",
        "purpose": (
            "Post-run comparison only. Simulation engine must NOT use this file "
            "to decide awards."
        ),
        "verdict": "67-DAY PERFECT SEASON ORACLE VERIFIED",
        "expected_perfect_season_xp": cum,
        "cross_check": {
            "source_by_source_total": source_total,
            "chronological_ledger_total": cum,
            "match": True,
            "event_count": len(ledger),
        },
        "rule_snapshot": rule_snapshot,
        "exclusions": exclusions,
        "per_source_table": source_table,
        "weekly_cumulative": week_rows,
        "goal_met": {
            "date": crossing_date,
            "day": crossing_day,
            "cumulative_shots": crossing_cum,
        },
        "final_current_level": level_for(cum),
        "achievement_unlocks": {
            "streaks": streak_unlocks,
            "perfect_weeks": pw_awards,
            "note": (
                "Streak/Perfect Week/Shot Milestone achievements award XP via "
                "linked Reward Rule Keys; unlocks are not a second XP source"
            ),
        },
        "milestone_unlocks": milestone_unlocks,
        "threshold_awards": threshold_awards,
        "events": ledger,
        "chronological_ledger": ledger,
        "notes": [
            (
                "Independent oracle from live Production XP Reward Rules "
                "(appn84sqPw03zEbTT) + SC-001 Athlete 1 perfect scenario volumes."
            ),
            (
                "Authoritative challenge window: 2027-04-25 through 2027-06-30 "
                f"11:59 PM America/Denver inclusive ({SIMULATION_DAY_COUNT} days)."
            ),
            (
                "Streak thresholds are LIVE 3/5/7/10/20/30/40/50/60 (9 awards). "
                "Offline DEFAULT_STREAK_GATE_THRESHOLDS is stale for XP math."
            ),
            (
                f"Within one unbroken {SIMULATION_DAY_COUNT}-day block each streak "
                "threshold awards once (053 endDate=block[threshold-1]); "
                "Repeatable? applies after a break."
            ),
            (
                "Zoom units follow perfect-athlete design intent "
                f"({zoom_live} live + bonuses + {rec_u} recording). "
                "Current writer may under-emit Zoom until per-week meetings exist."
            ),
            (
                "Weekly goal estimates use scenario-matrix proportional share "
                f"(12000 × week_days/{SIMULATION_DAY_COUNT}); live WAS Goal Record "
                "may differ slightly — thresholds here match SC-001 scenario matrix."
            ),
            (
                "Homework XP is permissive (late Satisfactory still earns XP). "
                "Perfect Week homework credit requires that week's PHA completed "
                "Satisfactory by Saturday 11:59 PM of that week."
            ),
        ],
    }

    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(
        f"EXPECTED PERFECT-SEASON XP = {cum}\n"
        f"window={SIM_START}..{SIM_END} ({SIMULATION_DAY_COUNT} days)\n"
        f"submissions={shoot_u} videos={video_u} hw={hw_u} pw={pw_u} "
        f"zoom_live={zoom_live} thresholds={thresh_units} "
        f"level={level_for(cum)} shots={shots}"
    )
    for row in source_table:
        print(f"  {row['xp_source']}: {row['expected_xp']} ({row['units']} units)")


if __name__ == "__main__":
    main()
