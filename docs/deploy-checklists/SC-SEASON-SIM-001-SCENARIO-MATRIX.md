# SC-SEASON-SIM-001 — Scenario Matrix (Deterministic Expectations)

**Backlog:** SC-SEASON-SIM-001  
**Generated:** 2026-09-06 (offline fixture @ 12,000 season goal)  
**Status:** READY — pre-execute expectations only  
**Source of truth at execute:** `tools/season_simulation/reports/sc001-dry-run-latest.md` (regenerate with `dry-run-three`)

> **No DEV environment.** Production disposable records only when authorized.  
> Expectations derive from scenario plans + Production-aligned Perfect Week rules (057). No independent hardcoded PW / Goal Met / XP counts.

---

## Athlete 1 — Sim Perfect (`athlete1_perfect`)

**Design intent:** Gold-standard success — 67/67 submit days, 0 misses, all 18 homework Satisfactory/on-time, ≥3 qualifying videos every week, live Zoom on required weeks + one recorded credit, all reachable milestones, maximum streak tiers, all weekly threshold tiers where volume supports.

**Goal Met Date (derived):** **2027-06-08** — cumulative countable shots first reach **12,098**.

| Week | Weekly shots | Goal est. | % | Thresholds | HW | Videos | Zoom | Perfect Week |
|------|-------------:|----------:|--:|------------|----|-------:|------|--------------|
| Early Bird | 1768 | 1254 | 141.0% | 100,125 | complete_satisfactory | 3 | live | pass |
| Week 1 | 1768 | 1254 | 141.0% | 100,125 | complete_satisfactory | 3 | none | pass |
| Week 2 | 2056 | 1254 | 163.9% | 100,125,150 | complete_satisfactory | 3 | live | pass |
| Week 3 | 1816 | 1254 | 144.8% | 100,125 | complete_satisfactory | 3 | live | pass |
| Week 4 | 1978 | 1254 | 157.7% | 100,125,150 | complete_satisfactory | 3 | live | pass |
| Week 5 | 1803 | 1254 | 143.8% | 100,125 | complete_satisfactory | 3 | recorded | pass |
| Week 6 | 2140 | 1254 | 170.7% | 100,125,150 | complete_satisfactory | 3 | live | pass |
| Week 7 | 1886 | 1254 | 150.4% | 100,125,150 | complete_satisfactory | 3 | live | pass |
| Week 8 | 1964 | 1254 | 156.6% | 100,125,150 | complete_satisfactory | 3 | live | pass |
| Week 9 | 1115 | 716 | 155.7% | 100,125,150 | none | 3 | none | pass_partial_window |

**Totals:** 18,294 planned shots · **10** expected Perfect Weeks · milestones **3000–18000** · streak gates **3–60**

**Expected XP buckets (oracle):** SHOOTING_BASE 67 · WEEKLY_THRESHOLD 26 · HOMEWORK 18 · VIDEO 30 · STREAK 9 · SHOT_MILESTONE 6 · PERFECT_WEEK **10** · **Lifetime XP = 5340** (see `expected_perfect_season_xp.json`)

---

## Athlete 2 — Sim Recovery (`athlete2_recovery`)

**Design intent:** Irregular participation — 8 miss days (days **10, 17, 24, 31, 38, 45, 59, 64**), broken streaks, skipped homework weeks 2/5, Needs Revision week 4, late homework week 6, zero-video week 3, missed live Zoom week 4, **exactly one** late-season Perfect Week on **Week 7** after recovery volume + compliance.

| Week | Weekly shots | Goal est. | % | Thresholds | HW | Videos | Zoom | Perfect Week |
|------|-------------:|----------:|--:|------------|----|-------:|------|--------------|
| Early Bird | 106 | 197 | 53.8% | — | complete_satisfactory | 1 | none | fail_weekly_shots |
| Week 1 | 777 | 1377 | 56.4% | — | complete_satisfactory | 2 | none | fail_weekly_shots |
| Week 2 | 770 | 1377 | 55.9% | — | skipped | 1 | none | fail_homework_skipped |
| Week 3 | 691 | 1377 | 50.2% | — | complete_satisfactory | 0 | none | fail_video_count |
| Week 4 | 871 | 1377 | 63.3% | — | needs_revision_then_fix | 3 | none | fail_required_zoom |
| Week 5 | 1086 | 1377 | 78.9% | — | skipped | 2 | recorded | fail_homework_skipped |
| Week 6 | 1158 | 1377 | 84.1% | — | late_satisfactory | 1 | none | fail_homework_timing |
| Week 7 | 1435 | 1377 | 104.2% | 100 | complete_satisfactory | 3 | live | **pass** |
| Week 8 | 991 | 1377 | 72.0% | — | complete_satisfactory | 2 | none | fail_weekly_shots |
| Week 9 | 389 | 787 | 49.4% | — | late_satisfactory | 1 | none | fail_weekly_shots |

**Totals:** 8,274 planned shots · **1** expected Perfect Week (Week 7) · milestones **3000, 6000** · streak gates **3, 7, 10**

**Week 7 pass rationale:** 7/7 submit days (miss moved off Week 7), weekly shots ≥ goal, 3 videos, on-time homework, live Zoom attended.

---

## Athlete 3 — Sim Edge (`athlete3_edge`)

**Design intent:** Stress timing/idempotency — explicit week-by-week Perfect Week truth table (`ATHLETE3_PERFECT_WEEK_TRUTH_TABLE`), same-day double submission day 19, backdate day 38→36, replay probe days 10/29/45/58, late homework day 33 (Week 5).

| Week | Weekly shots | Goal est. | % | Thresholds | HW | Videos | Zoom | Perfect Week |
|------|-------------:|----------:|--:|------------|----|-------:|------|--------------|
| Early Bird | 200 | 197 | 101.5% | 100 | complete_satisfactory | 1 | none | pass |
| Week 1 | 1424 | 1377 | 103.4% | 100 | complete_satisfactory | 3 | none | pass |
| Week 2 | 1093 | 1377 | 79.4% | — | complete_satisfactory | 0 | none | fail_daily_shooting |
| Week 3 | 1036 | 1377 | 75.2% | — | complete_satisfactory | 4 | live | fail_video_count |
| Week 4 | 2183 | 1377 | 158.5% | 100,125,150 | complete_satisfactory | 0 | none | fail_required_zoom |
| Week 5 | 2221 | 1377 | 161.3% | 100,125,150 | late_satisfactory | 0 | none | fail_homework_timing |
| Week 6 | 1424 | 1377 | 103.4% | 100 | complete_satisfactory | 3 | recorded | pass |
| Week 7 | 1421 | 1377 | 103.2% | 100 | complete_satisfactory | 3 | live | pass |
| Week 8 | 1386 | 1377 | 100.7% | 100 | complete_satisfactory | 2 | none | fail_single_requirement |
| Week 9 | 812 | 787 | 103.2% | 100 | complete_satisfactory | 3 | none | pass_partial_window |

**Totals:** 13,200 planned shots · **5** expected Perfect Weeks · milestones **3000–12000** (4) · Goal Met **2027-06-25** @ 12,190 cumulative · streak gates **3–30** (6 tiers)

**Expected XP buckets (derived):** SUBMISSION_XP 62 · WEEKLY_THRESHOLD 12 · HOMEWORK_XP 18 · VIDEO 19 · STREAK 6 · SHOT_MILESTONE 4 · PERFECT_WEEK **5**

---

## SC-167 / SC-168 / SC-169 expectation contracts

| Lesson | Offline expectation |
|--------|---------------------|
| **SC-167 SUBMISSION_XP** | One idempotent XP Event per countable submission (`SUBMISSION_XP\|{submissionId}`); Athlete 3 day-19 same-day double uses distinct dedupe keys (`SUB` vs `SUB2`) |
| **SC-168 Weekly email** | Execute arms **Build Weekly** (072 path) on Saturdays; **0 WEEKLY Hub handoffs after execute alone** is expected — Hub requires SC-168 `weekly-email-stage` (119 substitute) |
| **SC-169 Unlocks** | Shot milestones via `SHOT_MILESTONE\|{enrollmentId}\|{milestoneId}`; Perfect Week via `PERFECT_WEEK\|{enrollmentId}\|{weekId}`; streaks use 053/054 (not unlock table) |

---

## Email verification (READY package)

When live execute is authorized, verify **allowlist only** (`schmidt@fairfieldbasketballclub.com`):

- Daily Submission emails (one per submit day per athlete)
- Homework Feedback emails when grading/review is exercised
- Weekly summary build arms (Saturdays) + Hub handoffs after SC-168 stage
- Send status / writeback on Email Handoff Queue
- **No send during preparation** — dry-run only

---

## Combined coverage checklist

- [x] Athletes / Enrollments / Submissions / Assets
- [x] Homework Completions (18 PHA paths across profiles)
- [x] Video Feedback / Zoom Meetings / Zoom Attendance
- [x] Weekly Athlete Summary / XP Events / Streak Occurrences
- [x] Athlete Achievement Unlocks / Shot Milestones / Perfect Week
- [x] Weekly threshold awards / Level gates / Goal Met Date (derived)
- [x] Email handoff path (SC-168 stage — allowlist only)

**Regenerate:** `cd tools && python3 -m season_simulation dry-run-three --offline-fixture`
