# SC-152 / SC-153 — Silent-miss state table (Perfect Week WAS)

**Date:** 2026-09-04  
**Scope:** Every state where an eligible (or previously unlocked) Weekly Athlete Summary can remain **silently unprocessed** by 057 and/or 058.  
**Labels:** WAS-Test / Enrollment-Test / Unlock-Test (no Airtable record IDs).

## Legend

| Symbol | Meaning |
|--------|---------|
| Q | `Perfect Week Calculation Queue?` (formula 0/1) |
| S | `Perfect Week Automation Status` |
| E | `Perfect Week Eligible?` (formula 0/1) |
| U | `Perfect Week Unlock` link |
| UA | Linked unlock `Active?` |
| Silent | No automation run / no error writeback for the needed action |

---

## A. Automation 057 — calculation misses (SF-01 / SC-152)

| ID | Preconditions | Q | Expected action | Actual | Silent? | Re-arm today |
|----|---------------|---|-----------------|--------|---------|--------------|
| A1 | Enr+Week+Goal linked; S blank/null | 0 | Evaluate PW helpers | Never enters 057 | **Yes** | Set S→Pending (Q 0→1) |
| A2 | Enr+Week+Goal; S=Skipped | 0 | Re-evaluate after new data | Never enters 057 | **Yes** | Skipped→Pending |
| A3 | Enr+Week+Goal; S=Error | 0 | Re-evaluate after fix | Never enters 057 | **Yes** | Error→Pending |
| A4 | Enr+Week+Goal; S=Created | 0 | Re-evaluate | Never enters 057 | **Yes** | Created→Pending (rare) |
| A5 | First Pending; Q 0→1 | 1 | 057 run | Runs (proven) | No | — |
| A6 | After 057 sets Ready; Q stays 1 | 1 | Re-run when submissions/HW/VF/Zoom change | **Does not re-fire** while Q sticky | **Yes — primary SF-01** | Force Q through 0 (Error/Skipped) then Pending |
| A7 | Ready + Q=1; writable helper/data change | 1 | Recalculate helpers | No 057 run (proven: Video Count left untouched) | **Yes** | Same as A6 |
| A8 | Pending→Ready without leaving match set | 1→1 | Second evaluation | No second edge | **Yes** (subset of A6) | Same as A6 |
| A9 | Missing Goal Record (or Enr/Week) | 0 | N/A / wait for 032 | Correctly not queued | No (correct gate) | Link Goal then Pending |
| A10 | 057 runs, writes Error | 0 | Operator fix | Visible via Automation Error | Partial (observable) | Error→Pending |

**Primary silent class:** A6/A7 — WAS remains “in queue” (Q=1) with Ready but stale evaluation after late-arriving countable work.

---

## B. Automation 058 — unlock lifecycle misses (SF-02 / SC-153)

| ID | Preconditions | E | U | S | Expected action | Actual | Silent? |
|----|---------------|---|---|---|-----------------|--------|---------|
| B1 | Helpers pass; Unlock empty; Ready | 1 | empty | Ready | Create unlock | Can run on match enter | No when edge fires |
| B2 | E=1; Unlock empty; Ready but already matched earlier without create | 1 | empty | Ready | Create unlock | May stick if no new match edge | **Yes** (`058_never_ran`) |
| B3 | E=1; Unlock linked; Ready | 1 | linked | Ready | No-op or restore if inactive | **058 never starts** (U not empty) | **Yes** for restore |
| B4 | E 1→0; Unlock linked Active; Ready | 0 | linked | Ready | Deactivate unlock | **058 never starts** | **Yes — primary SF-02** |
| B5 | Enrollment inactive; Unlock linked | 0* | linked | any | Deactivate | Never starts under positive-only | **Yes** |
| B6 | Goal invalid after unlock; Unlock linked | 0 or 1† | linked | Ready | Deactivate | Never starts if U linked | **Yes** |
| B7 | E=1; Unlock linked Inactive; Ready | 1 | linked | Ready | Restore Active + Pending XP | Never starts (U not empty) | **Yes** |
| B8 | Script invoked manually / offline | any | any | any | Withdraw/restore/create | Works (offline lifecycle tests) | N/A |

\* Eligible formula may already be 0 when Status≠Ready.  
† Eligible can remain 1 if Daily/HW/Video/Zoom helpers still pass even when Goal settlement is wrong — script would still reject if it ran.

**Primary silent class:** B4 — Active Perfect Week unlock survives eligibility loss.

---

## C. Combined chain traps

| ID | Scenario | Miss |
|----|----------|------|
| C1 | 057 sticky Ready (A6) never refreshes helpers → Eligible stays 0 → 058 never creates | Unlock never born |
| C2 | 057 later re-armed, Eligible becomes 1, but Unlock already linked Active from earlier week mistake | 058 cannot restore/reconcile (B3) |
| C3 | Unlock created → 059 awards XP → eligibility later fails → Unlock stays Active Awarded | Wrong lasting Perfect Week credit (B4 + 059) |
| C4 | Status Skipped left after sim/operator (A2) | Entire PW chain dark until Pending re-arm |

---

## D. Non-silent / correctly gated states

| State | Why OK |
|-------|--------|
| Q=0 because Goal/Enr/Week missing | Upstream 031/032 incomplete — not SF-01 |
| 057 Error with Automation Error text | Observable failure |
| 058 `058 error:` / `058 skipped:` after a run | Observable (but today often unreachable for withdrawal) |
| Eligible=0, Unlock empty, never qualified | Correct non-award |

---

## Operator reconciliation cheat-sheet (near-term)

1. WAS where `Queue?=1` and helpers look stale vs current submissions → Status Error/Skipped → Pending.  
2. WAS where `Eligible?=1`, Unlock empty, Ready, Error blank → manual Run 058 or lifecycle fix.  
3. Unlock Active while Eligible?=0 → manual deactivate (until SC-153).  
4. Do not delete Queue/Eligible formulas.
