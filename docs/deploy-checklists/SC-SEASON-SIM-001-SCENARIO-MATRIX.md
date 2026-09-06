# SC-SEASON-SIM-001 — Scenario Matrix (Deterministic Expectations)

**Backlog:** SC-SEASON-SIM-001  
**Generated:** 2026-09-06 (offline fixture @ 12,000 season goal)  
**Status:** READY — pre-execute expectations only  
**Source of truth at execute:** `tools/season_simulation/reports/sc001-dry-run-latest.md` (regenerate with `dry-run-three`)

> **No DEV environment.** Production disposable records only when authorized.  
> Expectations derive from scenario plans + Production-aligned Perfect Week rules (057). No independent hardcoded PW / Goal Met / XP counts.

---

## Athlete 1 — Sim Perfect (`athlete1_perfect`)

**Design intent:** Gold-standard success — 61/61 submit days, 0 misses, all 18 homework Satisfactory/on-time, ≥3 qualifying videos every week, live Zoom on required weeks + one recorded credit, all reachable milestones, maximum streak tiers, all weekly threshold tiers where volume supports.

**Goal Met Date (derived):** **2027-06-14** — cumulative countable shots first reach **12,098** (11,751 immediately prior).

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

**Expected XP buckets (derived):** SUBMISSION_XP 61 · WEEKLY_THRESHOLD 22 · HOMEWORK_XP 18 · VIDEO 28 · STREAK 8 · SHOT_MILESTONE 5 · PERFECT_WEEK **10**

---

## Athlete 2 — Sim Recovery (`athlete2_recovery`)

**Design intent:** Irregular participation — 8 miss days (days **4, 11, 18, 25, 32, 39, 53, 58**), broken streaks, skipped homework weeks 2/5, Needs Revision week 4, late homework week 6, zero-video week 3, missed live Zoom week 4, **exactly one** late-season Perfect Week on **Week 7** after recovery volume + compliance.

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

**Design intent:** Stress timing/idempotency — explicit week-by-week Perfect Week truth table (`ATHLETE3_PERFECT_WEEK_TRUTH_TABLE`), same-day double submission day 19, backdate day 38→36, distinct failure modes, replay probe days 10/29/45/58.

| Week | Outcome | Failure mode (if any) |
|------|---------|------------------------|
| Early Bird | **PASS** | — |
| Week 1 | **PASS** | — |
| Week 2 | fail | fail_daily_shooting |
| Week 3 | fail | fail_video_count |
| Week 4 | fail | fail_required_zoom |
| Week 5 | fail | fail_homework_timing (late HW day 33) |
| Week 6 | **PASS** | — |
| Week 7 | **PASS** | — |
| Week 8 | fail | fail_single_requirement (2 videos only) |
| Week 9 | **PASS** | pass_partial_window |

**Totals:** 13,200 planned shots · **5** expected Perfect Weeks (derived from table) · milestones **3000–12000** · Goal Met **2027-06-25** @ 12,190 cumulative

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
