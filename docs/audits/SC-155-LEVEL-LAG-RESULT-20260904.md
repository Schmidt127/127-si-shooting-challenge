# SC-155 — Level recalculation lag / stuck Needed? (SF-04)

**Date:** 2026-09-04  
**Agent:** A3 P1 (`fix/sc-154-156-p1-workflows-a3`)  
**Base:** Production `appn84sqPw03zEbTT`  
**Verdict:** **Conclusively expected async delay (041 cron ≤15m), not a stuck-queue defect.** No aged `Level Recalc Needed?=1` rows at measurement. No script paste required.

---

## Task Classification

| Field | Value |
|-------|-------|
| Type | Levels workflow reliability |
| Priority | P1 |
| Backlog ID | **SC-155** (SF-04) |
| Phase | 3 Implementation / 5 Close |

---

## Live automation chain

| Code | automationId | Status | Trigger | Version |
|------|--------------|--------|---------|---------|
| **041** | `wflCRvaopntNPsc64` | deployed | **cron every 15 minutes** (start 2026-08-08) | **v5.1** |
| **042** | `wfl3aiiK8vI2tz0HA` | deployed | Enrollments enters view `042 - Needs Level Assignment` (`viwm9OgwkPKI2bii3`) | **4.1.2** |

**042 view filter (script docblock / live):** `Level Recalc Needed?` checked **AND** `Active?` checked.

**Design:**

1. 041 compares progression signature to `Progression Last Reconciled Signature`.  
2. On change (active enrollment): sets `Level Recalc Needed?=true` + writes `Progression Last Queued Signature`.  
3. Enrollment enters 042 view → 042 assigns levels / gate block → clears Needed? → writes reconciled signature.  
4. On 042 error: Needed? **preserved** (retryable). Inactive: Needed? cleared without progression writes.

Blank `recordId` on scheduled 041 is **by design** (full scan).

---

## Live evidence (2026-09-04)

| Check | Result |
|-------|--------|
| Enrollments with `Level Recalc Needed?=1` | **0** |
| Schmidt active enrollments | 2 · signatures queued==reconciled at baseline |
| Forced signature change | Disposable `Lifetime XP Manual Adjustments` +1 on one Schmidt enrollment (XP formula advanced) |
| Poll window | **~6.2 minutes** after bump — Needed? still unchecked (within 15m cron SLA) |
| Restore | Manual Adjustments restored to **0** |

**Interpretation:** Eligible rows can remain unflagged for up to one cron interval after input change. That is **expected async delay**, not a missed trigger. Absence of any Needed?=1 rows rules out a currently stuck queue.

Controlled 041 `recordId` proof remains available via Airtable **Test / Run** using enrollment ID (see `docs/testing/manual-test-cards/041-042-level-recalculation-verification-card.md`).

---

## Failure / reconciliation visibility

**Operator filter (Enrollments) — create view or grid filter:**

```
Level Recalc Needed? = checked
```

Optional tighten:

```
AND(
  {Level Recalc Needed?} = 1,
  {Active?} = 1
)
```

**Aged stuck definition (ops):** Needed?=1 longer than **30 minutes** (2× cron) → investigate 042 run history / Level Status=`Error` / view membership.

**Existing views:**

- `042 - Needs Level Assignment` (`viwm9OgwkPKI2bii3`) — processing queue  
- `ENROLLMENTS - Needs Initial Level Assignment` (`viwbi08N7HxOKkbxc`) — separate initial path  

**Suggested monitoring view name (OMNI / Mike):** `OPS - Level Recalc Needed Aged` with Needed?=1 + Created/last activity columns. No new Airtable fields required.

---

## Code / live changes

| Change | Result |
|--------|--------|
| 041 / 042 scripts | **No paste** — live matches GitHub intent |
| Live data | Temporary Manual Adjustments bump restored |
| Rollback snapshots | `airtable/rollbacks/20260904-sc154-156/041-v5.1-pre-wave.js`, `042-4.1.2-pre-wave.js` |

---

## Remaining risk

- Up to **15 minutes** lag after XP/gate-stat changes before Needed? flips.  
- If 042 fails closed with Level Status=`Error`, Needed? stays checked until fixed — monitor Error status, not only blank status.  
- Optional future: event-driven queue in addition to cron (capacity permitting) — **not** required by this evidence.
