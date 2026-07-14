# Mike UI actions — Phase B (030∪032∪033 → +2 free)

**Repo prep is done.** Meta automations API returns **403** — paste/retire must be in Airtable UI.

**Do not touch 117. Do not touch Folder 07 OFF automations. Do not touch PROD. Keep 031 and 034 as-is.**

---

## Evidence already green (Cursor)

| Gate | Result |
|------|--------|
| Offline contracts | **14/14 PASS** `test_phase_b_030_combined` |
| Rollback copies | `_rollback/phase-b-030-032-033-2026-07-14/` (full pre-combine scripts) |
| Combined SoT | `030-weekly-summary-and-goal-logic-bootstrap-grade-band-goal-and-homework.js` **v1.0.0** |
| Library stubs | Old 030 / 032 / 033 paths throw if pasted |

---

## Step 1 — Update surviving automation **030** (keep its slot)

1. DEV → Automations → open **030** (Copy Enrollment Grade Band…).
2. Rename to:  
   `030 - Weekly Summary and Goal Logic - Bootstrap WAS Grade Band Goal Homework`
3. Paste script from (skip GitHub header through end):  
   `airtable/automations/shooting-challenge/030-weekly-summary-and-goal-logic-bootstrap-grade-band-goal-and-homework.js`
4. Input: `recordId` = triggering Weekly Athlete Summary record id.
5. Replace trigger with **Match ANY** (covers former 030 ∪ 032 ∪ 033):

   **Option A — When record matches conditions** (preferred if view already used):

   Match **ANY** of:
   1. Enrollment is not empty **AND** Week is not empty **AND** Grade Band is empty  
   2. Week is not empty **AND** Grade Band is not empty **AND** Goal Record is empty  
   3. Week is not empty **AND** Grade Band is not empty **AND** Homework is empty  

   **Option B — When a record is updated**  
   Watch: `Enrollment`, `Week`, `Grade Band`, `Goal Record`, `Homework`  
   Same Match **ANY** conditions as above.

6. Leave **030 ON**. Leave **032** and **033 ON** until smoke PASS (dual-run is OK; combined is idempotent).

### Smoke in Airtable (before retiring 032/033)

| # | Test | Expect |
|---|------|--------|
| 1 | New counted Submission → **031** creates WAS | Bootstrap fills GB / Goal / HW as data allows |
| 2 | WAS missing Grade Band only | Copies Enrollment GB; Goal/HW skip or fill |
| 3 | WAS missing Goal only | Links active Target Goal Shots for GB |
| 4 | WAS missing Homework only | Assigns curriculum Week+GB |
| 5 | Needs multiple steps | One run fills all pending fields |
| 6 | Already correct | All steps skip / no churn |
| 7 | Repeated edit | Second run skipped |
| 8 | **031** / **034** still fire correctly | Adjacent helpers unchanged |
| 9 | Duplicate Goal config | Error path (do not leave duplicate active goals) |
| 10 | Failure / retry | Fix data → re-run succeeds; no duplicate Goal/HW |

If any **critical** fail → restore `_rollback/phase-b-030-032-033-2026-07-14/` into 030/032/033 and **stop** (do not delete 032/033).

---

## Step 2 — After smoke PASS, retire **032** and **033**

1. Delete (or permanently remove) automations **032** and **033** from DEV UI.  
   This is consolidation handoff — not “delete because OFF.”
2. Confirm Automations counter: **48/50 occupied, 2 free**.
3. Leave **117** OFF / unconfigured. Leave Folder 07 OFF alone.

---

## Done when

- [ ] Combined 030 live and smoke PASS  
- [ ] 032 + 033 retired  
- [ ] Counter shows **48/50** (2 free)  
- [ ] Reply to Cursor: **“Phase B UI complete”**  

Cursor will then update ledger / CONTROL / evidence and push closeout.
