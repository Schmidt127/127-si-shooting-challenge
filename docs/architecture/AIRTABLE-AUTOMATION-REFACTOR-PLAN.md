# Airtable Automation Refactor Plan — DEV (corrected)

**As-of:** 2026-07-14 · S21 correction  
**Rule:** Capacity via **safe consolidation of required automations**. **OFF ≠ deletable.**  
**Goal:** ≥ **5 free slots after** C-025 **117** is pasted.

---

## Retracted recommendations

| Prior S21 advice | Status |
|------------------|--------|
| Retire **061** / **078** for capacity | **Retracted** — required until replacement merge proven |
| Free slots by leaving **070a–078 OFF** | **Retracted** — OFF is intentional DEV policy |
| Delete any automation because it is OFF | **Forbidden** |
| Path B (043+061+078+merges) as primary | **Superseded** by consolidation Path A–E |

**Still valid with replacement framing (not OFF):** **043** may be folded into **042** only under explicit replacement evidence (042 GitHub + V2-014a) and Mike approval.

---

## Targets

| Metric | Value |
|--------|------:|
| Current | **50 / 0 free** |
| After Phase A + 117 | **50 / 0 free** |
| After Phases A–E | **45 / 5 free** |
| Deletions for OFF | **0** |

---

## Ranked disposition (all required)

See full table in [CAPACITY-LEDGER](./AIRTABLE-AUTOMATION-CAPACITY-LEDGER.md).

| Rank | Who |
|------|-----|
| Keep separate | Most production path autos; **all 070a–078** until EMC; 061; 078; 115; 116; 101; XP prep/award pairs |
| Combine safely | **006+021** |
| Combine with conditions | **030+032+033**; **063→020**; **111→013**; **072+074**; later **076+077**; optional **043→042** |
| Retire safely | **None** based on OFF. Replacement-only: **043→042** if Mike approves |
| Rename only | Docs hygiene 008/112 rows |
| Needs investigation | **001** trigger docs vs script; GitHub gap for **061/078** |

---

## Safe consolidation groups + slots

| Phase | Group | Slots freed | Risks | Rollback |
|-------|-------|------------:|-------|----------|
| **A (first)** | 006∪021 | **+1** | Double-fire / missed Processing | Re-enable split scripts |
| then | Paste **117** OFF | **−1** | Recording credit path | Delete 117 |
| **B** | 030∪032∪033 | **+2** | Partial WAS if order wrong | Re-split |
| **C** | 063→020 | **+1** | Legacy HC empty GB | Re-enable 063 |
| **D** | 111→013 | **+1** | Legacy VF empty GB | Re-enable 111 |
| **E** | 072∪074 | **+1** | Weekly Make email | Re-split |

**Cumulative free after 117 + A–E: 5.**

---

## First migration phase (execute next)

1. GitHub: combined **006+021** Submissions prep script (idempotent sections).  
2. DEV paste combined; validate video+attachment submission.  
3. Disable **only the two superseded separate automations** after PASS (consolidation handoff — not “delete because OFF”).  
4. Paste **117** orchestrator OFF (+1 consumed).  
5. **Stop.** No 070a–078 changes.

---

## Test / rollback (global)

- No duplicate XP; Stage A / WAS / email Make dry-runs as phases proceed.  
- Leave upload/email automations OFF until intentional webhook test — **keep their slots**.  
- GitHub SHA re-paste for all rollbacks.

---

## Related

- [CAPACITY-LEDGER](./AIRTABLE-AUTOMATION-CAPACITY-LEDGER.md)
- [INVENTORY](./AIRTABLE-AUTOMATION-INVENTORY.md)
- [DEPENDENCY-MAP](./AIRTABLE-AUTOMATION-DEPENDENCY-MAP.md)
