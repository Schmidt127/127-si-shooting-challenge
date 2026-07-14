# Phase C2 plan — absorb 111 into 013 (Video Feedback)

**Status:** **AUTHORIZED / IN FLIGHT** (2026-07-14 S25) — stop at Mike paste after pre-paste smoke  
**Depends on:** Phase C1 COMPLETE (2026-07-14) — DEV **47 estimated / 3 free**  
**Target:** Free **+1** slot (111 → into 013)  
**After Phase C2:** DEV **46 estimated / 4 free**

---

## Objective

| Absorb | Into surviving slot | Slots freed |
|--------|---------------------|------------:|
| **111** Copy Enrollment Grade Band → Video Feedback | **013** Create/Link Video Feedback (+ blank-only GB) | +1 |

**Keep separate:** **112** (if present / library), **113**, **114** video XP, asset upload path **070b**.

---

## Execution shape

1. Survive **013**; library-stub **111**; rollback `_rollback/phase-c2-013-111-2026-07-14/`.
2. Blank-only Grade Band repair (safer than pre-C2 overwrite); soft-skip missing Enrollment GB.
3. Preserve one source → one Video Feedback; recheck-before-create.
4. Live DEV smoke: create/link/repair/idempotent/dupes; adjacent **113** / **114** / **070b**.
5. Mike paste 013; post-paste PASS; then retire **111**.

Mike UI: [`PHASE-C2-111-013-mike-ui-actions.md`](./PHASE-C2-111-013-mike-ui-actions.md)

---

## After C2 — still needed for ≥5 free

| Phase | Group | Cumulative free |
|-------|-------|----------------:|
| D | 072∪074 | **5** |

**Do not start Phase D without separate authorization.**
