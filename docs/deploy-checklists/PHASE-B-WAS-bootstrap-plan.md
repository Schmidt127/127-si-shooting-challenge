# Phase B plan — WAS bootstrap consolidation (030 + 032 + 033)

**Status:** Recommendation only — **not authorized to execute**  
**Depends on:** Phase A COMPLETE (2026-07-14)  
**Target:** Free **+2** slots (3 automations → 1)  
**After Phase B:** DEV **48 occupied / 2 free** (with 117 already using one of the prior net-zero slots)

---

## Objective

Combine three Weekly Athlete Summary (WAS) bootstrap automations into one ordered script:

| # | Current role |
|---|--------------|
| **030** | Copy Enrollment Grade Band → WAS when Grade Band empty |
| **032** | Link Goal Record when Grade Band + Week set, Goal empty |
| **033** | Assign Homework when Week + Grade Band set, Homework empty |

**Keep separate:** **031** (Find/Create WAS from Submission) · **034** (Previous Week helpers)

---

## Why Phase B next

| Criterion | Score |
|-----------|-------|
| Slots freed | **+2** (largest single consolidation after A) |
| Same table | All WAS |
| No Make/email | Low external risk |
| V2-014 Cat C | Already classified merge candidate |
| OFF≠obsolete | Consolidation of required autos — not status deletes |

---

## Recommended combined shape

**Name:** `030 - Weekly Summary and Goal Logic - Bootstrap WAS Grade Band Goal Homework`  
**Order in script:** 030 → 032 → 033 (atomic writes where safe)  
**Trigger:** Prefer **When record is updated** on WAS watching Enrollment / Week / Grade Band (or Match ANY of former three condition sets)  
**Idempotent:** Skip each section if already filled  

Exact trigger union to be confirmed in DEV before paste (OMNI/UI).

---

## Risks

| Risk | Mitigation |
|------|------------|
| Fire-order / partial WAS | Ordered sections; skip if prerequisites missing |
| Re-trigger storms | Idempotent gates; narrow watch fields |
| Goal/Homework wrong match | Preserve existing 032/033 matching logic verbatim first |
| 031 race | 031 creates WAS; bootstrap only runs when WAS exists |

---

## Test requirements (before retiring 030/032/033)

1. New counted Submission → **031** creates WAS  
2. Grade Band copies when empty  
3. Goal links when GB+Week ready  
4. Homework assigns when ready  
5. Already-complete WAS → all sections skip  
6. Adjacent: **034**, **057/058** Perfect Week unchanged  
7. Rollback copies under `_rollback/phase-b-030-032-033-…/` before paste  

---

## Rollback

Re-paste separate 030/032/033 from rollback package; disable combined automation first.

---

## Migration steps (when Mike authorizes)

1. GitHub combined script + rollback copies + offline tests  
2. Paste into one slot (update 030 in place **or** new + later retire two — prefer in-place 030 absorb, then delete 032 + 033)  
3. Live DEV smoke  
4. Retire superseded two automations → **+2 free**  
5. Update capacity ledger + CONTROL  

**Do not** alter 117, Folder 07 OFF autos, or PROD in Phase B.

---

## After Phase B — still to reach ≥5 free

| Phase | Group | Cumulative free |
|-------|-------|----------------:|
| C | 063→020 + 111→013 | 4 |
| D | 072∪074 | **5** |

---

## Authorization needed

Mike: reply **“Authorize Phase B”** (or defer). Cursor will not change Airtable until then.
