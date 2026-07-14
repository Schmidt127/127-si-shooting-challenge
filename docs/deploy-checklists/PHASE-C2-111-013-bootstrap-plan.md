# Phase C2 plan — absorb 111 into 013 (Video Feedback)

**Status:** Recommendation only — **not authorized to execute**  
**Depends on:** Phase C1 COMPLETE (2026-07-14) — DEV **47 estimated / 3 free**  
**Target:** Free **+1** slot (111 → into 013)  
**After Phase C2:** DEV **46 estimated / 4 free**

---

## Objective

| Absorb | Into surviving slot | Slots freed |
|--------|---------------------|------------:|
| **111** Create Video Feedback from Submission Asset (legacy path) | **013** Create/Link Video Feedback | +1 |

**Keep separate:** **112** (if present / library), **114** video feedback XP, asset upload path **070b**.

---

## Why C2 next

| Criterion | Score |
|-----------|-------|
| Slots freed | **+1** (toward ≥5; cumulative **4 free**) |
| Architecture | Capacity Path C second half; V2-014 |
| Domain | Video Feedback only (disjoint from C1 homework) |
| OFF≠obsolete | Consolidation with replacement evidence — not status delete |

---

## Recommended shape

1. Diff **111** vs **013** on GitHub — confirm 013 already covers create-from-asset or add missing arm idempotently.
2. Prefer survive **013**; library-stub **111**; rollback under `_rollback/phase-c2-013-111-…/`.
3. Preserve one source → one Video Feedback; recheck-before-create.
4. Live DEV smoke: new video asset → VF create/link; already-linked; no duplicate VF; adjacent **114** / **070b**.
5. Retire **111** only after PASS.

---

## Risks

| Risk | Mitigation |
|------|------------|
| Duplicate VF vs 013/111 dual-run | Idempotent link; smoke before delete |
| XP from feedback | Do not merge **114** in C2 |
| 112 confusion | Confirm DEV UI occupancy; do not delete because OFF |

---

## After C2 — still needed for ≥5 free

| Phase | Group | Cumulative free |
|-------|-------|----------------:|
| D | 072∪074 | **5** |

---

## Authorization needed

Mike: reply **“Authorize Phase C2”**. Cursor will not change Airtable or start C2 until then.
