# Post–Final-Production-Run Fix Plan

**Preserved failed run:** `SEASON-SIM-2027-20260913T010724Z-threeathlete` — **UNTOUCHED**  
**Branch:** `chore/sim-window-apr25-jun30-67day`  
**Evidence input:** `final-production-run-SEASON-SIM-2027-20260913T010724Z-threeathlete.{json,md}`

---

## Root causes

### 1. Homework settlement (8/18 Pending, −280 XP)

**Root cause:** Orchestration gap + second-slot HC timing. The writer created all 18 Homework Completions with review fields set, but **did not** set `Weekly Athlete Summary Link` on HC rows. Automation 033 deferred reconcile ran before second-slot HC existed in dual-PHA weeks; 065 requires exactly one canonical WAS before positive award. With 67 submissions flooding 064/065/010/053, eight second-slot rows stayed `Award Status=Pending`, `Homework XP Reconciliation Needed?=1`, with no XP events.

**Fix class:** B (sim orchestration) + Production-safe HC→WAS linking and downstream poll/re-arm.

### 2. Streak 50/60 (−195 XP, Longest=40, Current=67)

**Root cause:** 053 runs per submission via Enrollment clear→restore during the day loop, but automation saturation left thresholds 50 and 60 unmaterialized before the harness advanced. `Longest Streak Days` rollup caps at max `Gate Eligible Streak Days` from Streak Occurrences (40 only). Downstream poll also queried occurrences with a broken enrollment filter (all thresholds reported 0 during run despite 7 existing post-forensic).

**Fix class:** B (post-season 053 re-arm + downstream poll with case-insensitive enrollment match + hard gate on thresholds 3–60).

### 3. Weekly Threshold (−350 XP, 11/26 events)

**Root cause:** Writer never re-armed `Requeue Threshold XP` on WAS rows after Goal Completion % rollups settled. `Threshold XP Ready?` is formula-driven; without requeue, 035 did not fire for most qualifying weeks during the compressed burst.

**Fix class:** B (post-loop `Requeue Threshold XP` false→true on all sim WAS + downstream poll).

### 4. Zoom level gate (Zoom 1/2 despite 90 XP)

**Root cause:** `Meets Gate: Zoom Meetings`, `Gate Debug Summary`, and `Public Missing Zoom` formulas use **`Total Zoom Attendances` (live only)** while 042 v4.1.2 already used live∪recording internally. Recording makeup earned XP (101 v6.9) but UI/gate formulas still showed 1/2.

**Fix class:** Production formula + 042 v4.1.3 persist `Effective Zoom Gate Meetings` written by 042 after effective count.

### 5. Business reconciliation (E2 actual=0)

**Root cause:** E2 implementation existed only in the ephemeral production runner; it gated on `cascade_complete=false` and never queried live Enrollment-linked XP Events (empty in-memory snapshot). Post-run forensic used Enrollment-linked events correctly (4085 XP).

**Fix class:** B — committed `business_reconciliation.py` always reads live XP Events via `fetch_active_xp_events_for_enrollment()`.

---

## Files changed

| File | Change |
|------|--------|
| `tools/season_simulation/downstream_settlement.py` | **NEW** — D_downstream poll, re-arm, hard-fail IDs |
| `tools/season_simulation/business_reconciliation.py` | **NEW** — E2 live XP bucket reconcile |
| `tools/season_simulation/business_expectations.py` | **NEW** — 4910 Perfect oracle buckets |
| `tools/season_simulation/execute_three.py` | Wire D_downstream + E2; business_success gate |
| `tools/season_simulation/writer.py` | HC→WAS link, threshold requeue, final 053 arm, level recalc |
| `airtable/automations/shooting-challenge/042-*.js` | **v4.1.3** — persist Effective Zoom Gate Meetings |
| `tools/season_simulation/FORMULAS-TO-PASTE.txt` | Zoom gate formula paste pack |
| `tools/season_simulation/tests/test_downstream_settlement.py` | **NEW** — regression tests |

**Unchanged (preserved):** 053 v5.6, 076 v8.15, 101 v6.9 logic; HC→WAS linking pattern; Perfect Week 10/10 path; email allowlist.

---

## Automation / formula versions requiring Mike paste

| Item | Version | Action |
|------|---------|--------|
| **042** | v4.1.3 | Paste from GitHub → Production automation (skip GitHub header) |
| **Enrollments field** | NEW | Create `Effective Zoom Gate Meetings` (Number, integer) |
| **Meets Gate: Zoom Meetings** | formula | Paste from `FORMULAS-TO-PASTE.txt` §6 |
| **Gate Debug Summary** | formula | Paste from `FORMULAS-TO-PASTE.txt` §6 |
| **Public Missing Zoom** | formula | Paste from `FORMULAS-TO-PASTE.txt` §6 |

**Do not paste:** 053 v5.6, 076 v8.15, 101 v6.9 (already deployed).

---

## Tests

```bash
cd tools && python -m unittest season_simulation.tests.test_downstream_settlement \
  season_simulation.tests.test_sc001_cascade_settlement \
  season_simulation.tests.test_sc001_three_athlete \
  season_simulation.tests.test_sc001_expectations -v
```

Covers:
1. All 18 HW settle classification
2. Streak 50/60 threshold checks in snapshot
3. Weekly threshold event gate
4. Effective zoom gate check
5. E2 reads live XP (not zero)
6. Duplicate source key detection
7. Perfect Week / submission paths unchanged (existing suite)

---

## Expected Perfect final reconciliation (next clean run)

| Bucket | XP |
|--------|---:|
| Submission XP | 1340 |
| Homework XP | 630 |
| Video XP | 750 |
| Streak XP | 455 |
| Weekly Threshold XP | 480 |
| Perfect Week XP | 1000 |
| Shot Milestone XP | 165 |
| Zoom XP | 90 |
| **Total** | **4910** |

- 10 Perfect Weeks  
- Public level **G.O.A.T.**  
- Streak occurrences: 3,5,7,10,20,30,40,50,60 exactly once  
- Effective Zoom gate ≥ 2/2  
- No duplicate XP Source Keys  

---

## Preserved failed run

**NOT cleaned up. NOT mutated.** Sim Perfect records from `SEASON-SIM-2027-20260913T010724Z-threeathlete` remain for forensic reference.
