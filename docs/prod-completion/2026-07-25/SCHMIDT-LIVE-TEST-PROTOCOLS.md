# Schmidt live-test protocols — ready when Airtable API/UI available

**Enrollment:** `recgP9qZYjAhE7NXm`  
**Athlete:** `recgqVstObQRzgXJF`  
**Base:** PROD `appn84sqPw03zEbTT`  
**Date:** 2026-07-25  
**Blocker:** Requires `AIRTABLE_API_TOKEN` or Mike UI (see `ACCESS-BLOCKER.md`)

Do not use uncontrolled athlete records. Prefer deleting obsolete Schmidt test rows after evidence capture.

---

## A. Quiz Option B (SC-013 / SC-014) — P0

Controlling packet: [`../homework-pipeline/067-OPTION-B-PROD-INSTALL.md`](../../next-wave/homework-pipeline/067-OPTION-B-PROD-INSTALL.md)  
Fixtures: SCN-027, SCN-028

**Pass:** one HC, 0 assets, one Homework XP after Satisfactory, rerun links same HC.

---

## B. Shot milestone 066 v3.3 (SC-027 / SC-076) — P0

**Current baseline (historical):** Schmidt ~75 counted shots; first K-2 milestone 500.

### B1 — Below threshold (safe now)

1. Trigger Shot Milestone Check / 066 on Schmidt (OMNI or automation path).  
2. Expect `skip_no_milestones` or equivalent skip — **no error**, no unlock, no XP.  
3. Confirm Grade Band match uses link IDs (no rename error).

### B2 — Natural crossing (optional destructive)

1. Create controlled counted submissions totaling ≥500 K-2 shots **or** temporarily lower a test milestone threshold only if Mike authorizes.  
2. Expect one Athlete Achievement Unlock + one milestone XP; Source Key unique.  
3. Rerun → no second unlock/XP.

---

## C. Streak 054 v5.6 (SC-029 / SC-075) — P1

1. Create three consecutive Denver Activity Date submissions for Schmidt (distinct days).  
2. Expect Streak Occurrence / unlock for 3-day ladder + one STREAK XP per rule.  
3. Break streak (skip a day) then rebuild 3 days → behavior per SC-081 decision (amounts from XP Reward Rules).  
4. Rerun 054 → no duplicate active XP for same occurrence Source Key.

---

## D. Levels / gates 041→042 (SC-078 / SC-079 / SC-080) — P0

**Baseline historically:** Lifetime XP ~61 → Current Beginner, Next Rookie, Gate=Level 2, Status=Assigned.

### D1 — Recalc clear

1. Set `Level Recalc Needed?=true` on Schmidt Enrollment (or trigger 041).  
2. Expect 042 clears flag; Current/Next/Gate Status rewrite consistently.

### D2 — Gate block

1. Raise Lifetime XP above next level threshold while gate stats unmet (or use offline-shaped fixture values).  
2. Expect Status blocked / gate messaging; Current Level does not skip unmet gate.

### D3 — Gate clear

1. Satisfy gate dimensions (HW / Zoom / video / streak per Level Gate Rules).  
2. Expect gate clear and level assign when XP sufficient.

### D4 — Rollback

1. If requirements drop mid-season, expect prior-level rollback on recalc (engine already offline-tested).

Offline already green: `overnight-level-gate-boundaries.test.js`.

---

## E. Perfect Week (SC-028 / SC-077 / SC-091) — after 057 v1.4 paste

See [`057-PERFECT-WEEK-PROD-PASTE.md`](./057-PERFECT-WEEK-PROD-PASTE.md).

---

## F. Weekly Threshold XP (SC-049) — coordinate with PR #43

Do **not** rebuild 035 here. After PR #43 merges and 035 is pasted, run SCN-025/026 on Schmidt WAS.

---

## Execution order after token

1. A Quiz Option B  
2. B1 Milestone skip path  
3. D1 Level recalc  
4. C Streak 3-day  
5. E Perfect Week (needs 057 paste + rich week data)  
6. D2/D3 Gate block/clear when XP budget available  
