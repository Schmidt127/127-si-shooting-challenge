# Phase C plan — absorb 063→020 and 111→013

**Status:** **C1 AUTHORIZED** 2026-07-14 — GitHub combined 020 ready; Mike paste required · **C2 not authorized**  
**Depends on:** Phase B COMPLETE — DEV **48 estimated / 2 free** (no visible Airtable counter)  
**Target:** Free **+1** from C1 (063→020); C2 later for another +1  
**After C1:** DEV **47 estimated / 3 free**  
**Mike UI:** `docs/deploy-checklists/PHASE-C1-063-020-mike-ui-actions.md`

---

## Objective

| Absorb | Into surviving slot | Slots freed |
|--------|---------------------|------------:|
| **063** Copy Grade Band → Homework Completion | **020** Link/Create Homework Completion | +1 |
| **111** Create Video Feedback from Submission Asset (legacy path) | **013** Create/Link Video Feedback | +1 |

**Keep separate:** related XP/create scripts that are not these copy/link pairs.

---

## Why Phase C next

| Criterion | Score |
|-----------|-------|
| Slots freed | **+2** (toward ≥5) |
| Architecture | Already in V2-014 / capacity ledger Path C |
| Risk | Medium — two separate domains (HW Completions + Video Feedback) |
| OFF≠obsolete | Consolidation of required autos — not status deletes |

Prefer **two small consolidations** (020 then 013) rather than one mega-script. Authorize as one Phase C package or split C1/C2 if Mike prefers.

---

## Recommended shape

### C1 — Homework Completions
- Paste Grade Band copy into **020** create/link flow when HC is created/updated and GB empty.
- Retire **063** only after live DEV PASS.

### C2 — Video Feedback
- Absorb **111** create-from-asset path into **013** (or confirm 013 already covers and 111 is true duplicate).
- Retire **111** only after live DEV PASS + adjacent 112/114 checks.

---

## Risks

| Risk | Mitigation |
|------|------------|
| 020 fire vs 063 race | Single script; idempotent GB skip |
| 111 vs 013 duplicate VF | One source → one VF; recheck before create |
| XP adjacency | Do not merge XP scripts in Phase C |

---

## After Phase C — still needed for ≥5 free

| Phase | Group | Cumulative free |
|-------|-------|----------------:|
| D | 072∪074 | **5** |

---

## Authorization needed

Mike: reply **“Authorize Phase C”** (or **Authorize Phase C1** / **C2** separately). Cursor will not change Airtable until then.
