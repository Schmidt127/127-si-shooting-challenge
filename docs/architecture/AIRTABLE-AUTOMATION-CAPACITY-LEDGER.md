# Airtable Automation Capacity Ledger — DEV

| Field | Value |
|-------|-------|
| Base | `appTetnuCZlCZdTCT` (DEV) |
| Hard cap | **50** (ON + OFF both consume) |
| Ledger as-of | 2026-07-14 |
| Stage | S21 — analysis only |
| UI inventory authority | Mike paste required (Meta API **403**) |
| Docs table snapshot | 48 rows — [`DEV-automations-doc-table-slim-2026-07-14.json`](../audits/DEV-automations-doc-table-slim-2026-07-14.json) |

---

## Summary

| Milestone | Occupied | Free | Status |
|-----------|----------|------|--------|
| **Current** | **50** | **0** | At cap (Mike) |
| After 117 orchestrator (swap) | 50 | 0 | Needs 1 UI-confirmed retire first |
| After 117 + Phases 1–3 (target) | **≤45** | **≥5** | Architecture target |
| After full V2-014 / EMC | ~38–40 | ~10–12 | Stretch |

| Count | Value |
|-------|------:|
| Current count | **50** |
| Proposed target count (post Phase 0–3) | **≤45** |
| Projected slots freed (gross Path B) | **+6** before 117, **net +5 after 117** |
| Orchestrator reservation | **+1** for 117 (unchanged) |

---

## Evidence hierarchy

1. Mike UI (name + ON/OFF) — authoritative  
2. Mike: at limit; **112 not in DEV UI**  
3. Automations documentation table — not occupancy  
4. Meta automations API — 403  
5. automation-index / deploy checklists  
6. GitHub + V2-014 — design only  

---

## Reconciliation (docs → 50 UI model)

```
48 docs rows
 − 008 (replaced by 116, slot-neutral swap already done historically)
 − 112 (not in DEV UI — Mike)
 + 116 (UI, missing docs)
 + 115 (UI, missing docs)
 + 022 (UI, missing docs)
 + 067 (UI, missing docs)
 = 50
```

**Uncertain (do not delete without UI):** 043, 061, 078, 070c ON/OFF.

---

## Slot ledger

| Script | Name (short) | In docs? | Est. UI | ON/OFF | GitHub | Capacity action | Phase | Conf. |
|--------|--------------|----------|---------|--------|--------|-----------------|-------|-------|
| 001 | Find or Create Athlete | Y | Y | ? | Y | Investigate triggers | — | H/L* |
| 002 | Grade Band Initial | Y | Y | ? | Y | Combine w/ conditions later | — | H |
| 003 | Grade Band If Changes | Y | Y | ? | Y | Keep separate | — | H |
| 005 | Assign Week | Y | Y | ? | Y | Keep | — | H |
| 006 | Set Video Count | Y | Y | ? | Y | Merge →021 | 2 | H |
| 007 | Duplicate Checker | Y | Y | ? | Y | Keep | — | H |
| 008 | Mark XP Processing | Y | **N** | — | — | Doc cleanup | — | H |
| 009 | Create Submission Assets | Y | Y | ? | Y | Keep | — | H |
| 010 | Create XP Event | Y | Y | ? | Y | Keep | — | H |
| 013 | Create/Link VF | Y | Y | ? | Y | Keep; absorb 111 | 3 | H |
| 020 | Link/Create HC | Y | Y | ? | Y | Keep; absorb 063 | 3 | H |
| 021 | Attachment Upload Status | Y | Y | ? | Y | Merge ←006 | 2 | H |
| 022 | Child Upload Writeback | **N** | Y | ? | Y | Keep | — | H |
| 023 | Assign Enrollment | Y | Y | ? | Y | Keep | — | H |
| 030 | Copy GB → WAS | Y | Y | ? | Y | Merge WAS trio | 2 | H |
| 031 | Find/Create WAS | Y | Y | ? | Y | Keep | — | H |
| 032 | Link Goal → WAS | Y | Y | ? | Y | Merge WAS trio | 2 | H |
| 033 | Assign HW → WAS | Y | Y | ? | Y | Merge WAS trio | 2 | H |
| 034 | Previous Week Helpers | Y | Y | ? | Y | Keep | — | H |
| 041 | Level Recalc Flag | Y | Y | ? | Y | Keep | — | H |
| 042 | Assign Levels | Y | Y | ? | Y | Keep | — | H |
| 043 | Set Level Gate Rule | Y | **?** | ? | Y | **Retire (C-025 gate)** | 0 | L |
| 053–059 | Streaks / PW / unlock XP | Y | Y | ? | Y | Keep | — | H |
| 061 | Mark HW Reviewed | Y | **?** | ? | **N** | Investigate → retire | 1 | L |
| 063 | Copy GB → HC | Y | Y | ? | Y | Retire/absorb →020 | 3 | H |
| 064–066 | HW XP prep/award + milestones | Y | Y | ? | Y | Keep | — | H |
| 067 | HW from Reflection Quiz | **N** | Y | ? | Y | Keep | — | M |
| 070a | Send HW → Make | Y | Y | ? | Y | Keep | — | H |
| 070b | Send Video → Make | Y | Y | ? | Y | Keep | — | H |
| 070c | Verify Async Upload | **N** | **?** | ? | Y | Investigate | — | L |
| 071–077 | Email build/send | Y | Y | ? | Y | EMC later | 4 | H |
| 078 | Mark Parent Feedback Ready | Y | **?** | ? | **N** | Investigate → retire | 1 | L |
| 101 | Meeting XP | Y | Y | ? | Y | Keep | — | H |
| 111 | Copy GB → VF | Y | Y | ? | Y | Retire/absorb →013 | 3 | H |
| 112 | Create VF from Asset | Y | **N** | — | Y | Doc cleanup (**0 slots**) | — | **C** |
| 113–114 | Video XP prep/award | Y | Y | ? | Y | Keep | — | H |
| 115 | Test Framework | **N** | Y | ? | Y | Keep | — | H |
| 116 | Asset Reuse Consequences | **N** | Y | ? | Y | Keep | — | H |
| 117 | Recording Orchestrator | — | **N** | — | Y | Paste after −1 | 0 | H |
| 117a–f | Library | — | **N** | — | Y | Do not paste ×6 | — | C |

\*001: script High confidence; live trigger Low (docs mismatch).  
**Conf:** C=certain · H=high · M=medium · L=low

---

## Projected slots by phase

| Phase | Δ slots | Running free after 117 |
|-------|--------:|------------------------|
| 0 C-025 swap | 0 net | 0 |
| 1 061+078 | +2 | 2 |
| 2 006∪021 (+ optional WAS) | +1 (+2) | 3 (5) |
| 3 063+111 | +2 | **5** (7) |
| 4 EMC | +5 | ~10+ |

---

## Immediate C-025 gate

1. Confirm **043** in DEV UI.  
2. If present and **042** live → retire 043 (−1).  
3. Paste **117** OFF (+1).  
4. Do **not** pursue **112** for DEV capacity.

---

## Docs-table hygiene (0 slots)

Add rows: 022, 067, 070c (if present), 115, 116, 117.  
Retire stale: 008, 112 (DEV).

---

## Related

- [INVENTORY](./AIRTABLE-AUTOMATION-INVENTORY.md)
- [REFACTOR-PLAN](./AIRTABLE-AUTOMATION-REFACTOR-PLAN.md)
- [S20 reopen](../deploy-checklists/C-025-s20-dev-slot-reopen-2026-07-14.md)
