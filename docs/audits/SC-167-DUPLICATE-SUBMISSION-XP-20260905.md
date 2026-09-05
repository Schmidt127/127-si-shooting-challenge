# SC-167 — Duplicate Submission XP (SUBMISSION_XP)

**Date:** 2026-09-05  
**Backlog ID:** SC-167  
**Branch:** `fix/sc-167-duplicate-submission-xp`  
**Source run:** `SEASON-SIM-2027-20260905T122531Z-athlete1`  
**Production base:** `appn84sqPw03zEbTT`  
**Automation:** **010** Create/Reconcile Submission Base XP Event → **v10.14** (GitHub; paste required)

---

## Task Classification

| Field | Value |
|---|---|
| Type | Defect fix (XP idempotency) |
| Priority | P0 (double-count risk under concurrency) |
| Difficulty | Medium |
| Owner | Cursor Agent 1 |
| Dependencies | SC-SEASON-SIM-002 T122531Z evidence |
| Backlog ID | SC-167 |
| Estimated Scope | Automation 010 + offline/lib tests + audit |
| Phase | 3 Implementation / 5 Close |
| Correct tool | Cursor |
| Repo | `127-si-shooting-challenge` |
| Mike's role | Paste 010 v10.14 after PR merge; run paste verification |

---

## 1. Classification

**Confirmed Production defect** (TOCTOU race in Automation 010 create path), **amplified by Season Sim harness** (Enrollment clear/restore can re-arm `Reconciliation Needed?` while a prior 010 run is still in flight).

Not expected Active+voided behavior: 010’s normal correction path deactivates the **same** XP Event row; it does not create a second `SUBMISSION_XP|{submissionId}` row to void. Two physical rows with the same canonical Source Key are always a defect relative to 010’s contract.

---

## 2. Evidence reconstruction (pre-cleanup)

From seeded audits + cascade report (records deleted in cleanup; IDs are historical):

| Fact | Source | Value |
|---|---|---|
| Enrollment | closeout / discrepancies | `recmImoXTlKb5NWSY` |
| Countable submissions | discrepancies | **58** |
| SUBMISSION_XP rows | `reconcile-cascade-counts-…json` | **59** |
| Unique SUBMISSION_XP keys | same | **58** |
| Missing submission XP keys | same | `[]` |
| XP Event id list | same | 105 enrollment-scoped IDs (includes non-submission families) |

**Proof of duplicate existence:** `xp_by_prefix.SUBMISSION_XP == 59` and `submission_xp_unique == 58` implies exactly one Source Key appeared on two rows.

**Not preserved in saved evidence:** which specific `SUBMISSION_XP|{submissionId}` collided, Created timestamps, or Active? on each twin. Cleanup deleted the rows before this investigation. Therefore Active-vs-voided for that pair is **unknown**, but row-count mathematics already prove a second create for one canonical key.

**Harness amplifier:** `tools/season_simulation/writer.py` `_submission_post_create` clears Enrollment then restores Enrollment + Activity Date to fire 053. That signature churn can re-match 010’s `Reconciliation Needed? = 1` trigger while an earlier 010 run is still between last-chance recheck and `createRecordAsync`.

---

## 3. Writers inspected

| Writer | Creates `SUBMISSION_XP\|`? | Notes |
|---|---|---|
| **010** (authoritative) | **Yes** | Only Production creator of Submission Base XP |
| 076 | No (reads) | Uses active SUBMISSION_XP for email payload |
| 065 / 114 / 054 / 035 / 101 / 059 / 066 | No | Other XP families |
| Season sim harness | No | Creates Submissions; relies on 010 |

---

## 4. Root cause

Automation 010 v10.13:

1. `findExactEvent` / last-chance recheck → no row  
2. `createRecordAsync`  
3. No post-create uniqueness consolidate  

Concurrent runs (Airtable retry, overlapping trigger from harness Enrollment toggle, or dual settlement) can both pass the recheck and both create. After duplicates exist, v10.13 **threw** on `exactKeyMatches.length > 1` and left **both Active?** (fail closed without healing double-count).

Code citations (pre-fix behavior replaced in v10.14): last-chance then create without post-create consolidate; duplicate canonical key threw without deactivating extras.

---

## 5. Production live scan (2026-09-05)

Read-only Airtable REST on `appn84sqPw03zEbTT`:

- `SUBMISSION_XP|` rows: **69**  
- Unique keys: **69**  
- Duplicate groups: **0**  
- Award-bearing duplicates: **false**  

No current Production double Active? awards. Defect is latent under concurrency.

---

## 6. Fix summary (v10.14)

1. Deterministic owner: earliest `createdTime`, then lowest record id.  
2. Matching-ownership duplicates → keep one Active?, deactivate extras (append-only; no deletes).  
3. Ambiguous ownership → fail closed; no writes.  
4. Post-create uniqueness recheck consolidates concurrent creates.  
5. New `actionOut`: `consolidated_duplicate_canonical`.  
6. Pure planner: `lib/sc167-submission-xp-dedupe.js` (+ season sim `expectations_submission_xp.py`).  

**Unchanged:** XP amounts, SHOOTING_BASE rule, Count This Submission? / future-date eligibility.

---

## 7. Tests

| Suite | Result |
|---|---|
| `node …/lib/sc167-submission-xp-dedupe.test.js` | PASS (8) |
| `node --test tools/testing/tests/test_010_offline.mjs` | PASS (19), including 3 SC-167 concurrency/duplicate cases |
| `python -m unittest season_simulation.tests.test_sc167_submission_xp` (from `tools/`) | PASS (3) |

---

## 8. Live proof

| Check | Result |
|---|---|
| Production duplicate scan | PASS — 0 duplicate keys |
| Repeated trigger on live counted Schmidt submission | **N/A** — active Schmidt enrollment `recZEwkkXTJanDlG6` currently has **0** Submissions; creating a full Week/WAS/submission fixture was deferred to post-paste verification to avoid orphan ops data |
| Offline concurrent race (injected peer create) | PASS — consolidates to one Active? |

**After paste:** follow [`docs/deploy-checklists/SC-167-010-v10.14-duplicate-consolidate.md`](../deploy-checklists/SC-167-010-v10.14-duplicate-consolidate.md) — create disposable counted submission, clear latch twice, confirm exactly one Active? `SUBMISSION_XP|{id}`.

---

## 9. Airtable paste required?

**Yes.** Automation **010** → paste GitHub **v10.14** (docblock through EOF; skip GitHub header).  
Checklist: `docs/deploy-checklists/SC-167-010-v10.14-duplicate-consolidate.md`

---

## 10. Remaining risks

1. Pre-paste Production still has the TOCTOU window (no live dups today).  
2. Historical T122531Z twin Source Key identity is not recoverable from saved reports.  
3. Season sim Enrollment clear/restore still can double-trigger 010; v10.14 consolidates instead of double-awarding — consider a future harness softening (out of SC-167 exclusive paths if it edits `writer.py` broadly; not done here).  
4. Voided duplicate rows may remain (append-only); reconcile helpers flag row-count dups vs award-bearing dups.

---

## 11. Coordinator proposals (do not edit these files in this PR unless merging)

**CHANGELOG (Web/Airtable):** Automation 010 v10.14 SC-167 duplicate SUBMISSION_XP consolidate.  
**CURRENT-TRUTH / PROJECT_STATE:** 010 Production target v10.14 after paste.  
**automation-index:** 010 version → v10.14.  
**Master Future Work List:** SC-167 entry (see isolated block in this PR if present).
