# SC-SEASON-SIM-001 — Scenario Matrix (Deterministic Expectations)

**Backlog:** SC-SEASON-SIM-001  
**Generated:** 2026-09-06 (offline fixture @ 12,000 season goal)  
**Status:** READY — pre-execute expectations only  
**Source of truth at execute:** `tools/season_simulation/reports/sc001-dry-run-latest.md` (regenerate with `dry-run-three`)

> **No DEV environment.** Production disposable records only when authorized.

---

## Athlete 1 — Sim Perfect (`athlete1_perfect`)

**Design intent:** Gold-standard success — 61/61 submit days, 0 misses, all 18 homework Satisfactory/on-time, ≥3 qualifying videos every week, live Zoom on required weeks + one recorded credit, all reachable milestones, maximum streak tiers, all weekly threshold tiers where volume supports.

| Week | Weekly shots | Goal est. | % | Thresholds | HW | Videos | Zoom | Perfect Week |
|------|-------------:|----------:|--:|------------|----|-------:|------|--------------|
| Early Bird | 278 | 197 | 141.1% | 100,125 | complete_satisfactory | 1 | live | pass |
| Week 1 | 1768 | 1377 | 128.4% | 100,125 | complete_satisfactory | 3 | none | pass |
| Week 2 | 1768 | 1377 | 128.4% | 100,125 | complete_satisfactory | 3 | live | pass |
| Week 3 | 2104 | 1377 | 152.8% | 100,125,150 | complete_satisfactory | 3 | live | pass |
| Week 4 | 1768 | 1377 | 128.4% | 100,125 | complete_satisfactory | 3 | live | pass |
| Week 5 | 2013 | 1377 | 146.2% | 100,125 | complete_satisfactory | 3 | recorded | pass |
| Week 6 | 1768 | 1377 | 128.4% | 100,125 | complete_satisfactory | 3 | live | pass |
| Week 7 | 2202 | 1377 | 159.9% | 100,125,150 | complete_satisfactory | 3 | live | pass |
| Week 8 | 1852 | 1377 | 134.5% | 100,125 | complete_satisfactory | 3 | live | pass |
| Week 9 | 1109 | 787 | 140.9% | 100,125 | complete_satisfactory | 3 | none | pass_partial_window |

**Totals:** 16,630 planned shots · **10** expected Perfect Weeks · milestones **3000–14400** · streak gates **3–60**

**Expected XP buckets:** SUBMISSION_XP 61 · WEEKLY_THRESHOLD 22 · HOMEWORK_XP 18 · VIDEO 28 · STREAK 8 · SHOT_MILESTONE 5 · ZOOM live 1 + recording 1 · PERFECT_WEEK 10

---

## Athlete 2 — Sim Recovery (`athlete2_recovery`)

**Design intent:** Irregular participation — 8 miss days (days 4,11,18,25,32,39,46,53), broken streaks, skipped homework weeks 2/5, Needs Revision week 4, late homework week 6, zero-video week 3, missed live Zoom week 4, one recovery-oriented strong week 7 (still below PW due to prior damage).

| Week | Weekly shots | Goal est. | % | Thresholds | HW | Videos | Zoom | Perfect Week |
|------|-------------:|----------:|--:|------------|----|-------:|------|--------------|
| Early Bird | 106 | 197 | 53.8% | — | complete_satisfactory | 1 | none | fail_weekly_shots |
| Week 1 | 777 | 1377 | 56.4% | — | complete_satisfactory | 2 | none | fail_weekly_shots |
| Week 2 | 770 | 1377 | 55.9% | — | skipped | 1 | none | fail_homework_skipped |
| Week 3 | 691 | 1377 | 50.2% | — | complete_satisfactory | 0 | none | fail_no_video |
| Week 4 | 871 | 1377 | 63.3% | — | needs_revision_then_fix | 3 | none | fail_missed_zoom |
| Week 5 | 1086 | 1377 | 78.9% | — | skipped | 2 | recorded | fail_homework_skipped |
| Week 6 | 1158 | 1377 | 84.1% | — | late_satisfactory | 1 | none | fail_weekly_shots |
| Week 7 | 585 | 1377 | 42.5% | — | complete_satisfactory | 3 | live | fail_weekly_shots |
| Week 8 | 991 | 1377 | 72.0% | — | complete_satisfactory | 2 | none | fail_weekly_shots |
| Week 9 | 519 | 787 | 65.9% | — | late_satisfactory | 1 | none | fail_weekly_shots |

**Totals:** 7,554 planned shots · **0** expected Perfect Weeks · milestones **3000, 6000** · streak gates **3, 7**

**Boundary probes:** Week 6 near-target volume · backdated submission day 40→38 · streak break before day-10 gate (miss day 53)

---

## Athlete 3 — Sim Edge (`athlete3_edge`)

**Design intent:** Stress timing/idempotency — early/on-time/late homework, same-day double submission day 19, backdate day 38→36, exact threshold hits/misses, distinct Perfect Week failure modes, replay probe days 10/29/45/58.

| Week | Weekly shots | Goal est. | % | Thresholds | HW | Videos | Zoom | Perfect Week |
|------|-------------:|----------:|--:|------------|----|-------:|------|--------------|
| Early Bird | 123 | 197 | 62.4% | — | complete_satisfactory | 0 | none | pass |
| Week 1 | 993 | 1377 | 72.1% | — | complete_satisfactory | 3 | none | pass |
| Week 2 | 2192 | 1377 | 159.2% | 100,125,150 | complete_satisfactory | 0 | none | fail_daily_shooting |
| Week 3 | 1036 | 1377 | 75.2% | — | complete_satisfactory | 4 | live | fail_video_count |
| Week 4 | 2183 | 1377 | 158.5% | 100,125,150 | complete_satisfactory | 0 | none | fail_required_zoom |
| Week 5 | 2221 | 1377 | 161.3% | 100,125,150 | complete_satisfactory | 0 | none | fail_homework_timing |
| Week 6 | 988 | 1377 | 71.8% | — | complete_satisfactory | 3 | recorded | pass |
| Week 7 | 987 | 1377 | 71.7% | — | complete_satisfactory | 0 | none | pass |
| Week 8 | 986 | 1377 | 71.6% | — | complete_satisfactory | 2 | none | fail_single_requirement |
| Week 9 | 400 | 787 | 50.8% | — | late_satisfactory | 0 | none | pass |

**Totals:** 12,109 planned shots · **5** expected Perfect Weeks · milestones **3000–12000** · replay probes on 4 days

**Idempotency:** Re-arm expectations documented in operator checklist — one canonical HC/XP/unlock per source key after replay.

---

## Combined coverage checklist

- [x] Athletes / Enrollments / Submissions / Assets
- [x] Homework Completions (18 PHA paths across profiles)
- [x] Video Feedback / Zoom Meetings / Zoom Attendance
- [x] Weekly Athlete Summary / XP Events / Streak Occurrences
- [x] Athlete Achievement Unlocks / Shot Milestones / Perfect Week
- [x] Weekly threshold awards / Level gates / Goal Met Date (Athlete 1)
- [x] Email handoff path (SC-168 stage — allowlist only)

**Regenerate:** `cd tools && python3 -m season_simulation dry-run-three`
