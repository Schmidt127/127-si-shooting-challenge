# Mike decision sheet — DEV Automation Architecture Review (S21)

**Stop.** Analysis only — **do not** disable, delete, rename, combine, or paste yet (except decisions you approve below).

**Goal:** Free capacity so C-025 **117** lands and you end with **≥5 free slots**.

---

## 1) Paste this from DEV Automations UI (closes the inventory)

Copy **all 50** names with **ON / OFF** each (or screenshot + typed list).

Also answer yes/no for:

| Exact name | Present? | ON/OFF |
|------------|----------|--------|
| `043 - Levels and Progression - Set Level Gate Rule from Next Level` | | |
| `061 - Homework Review and XP - Mark Homework Completion as Reviewed` | | |
| `078 - Email, Notifications, and External Handoffs - Mark Homework Parent Feedback Ready` | | |
| `070c - Email, Notifications, and External Handoffs - Verify Async Video Asset Upload` | | |
| `042 - Levels and Progression - Assign Current and Next Level` | | |

---

## 2) Decide Phase 0 (C-025)

| Choice | Effect |
|--------|--------|
| **A — Approve** retire **043** (if present) then paste **117** OFF | Unblocks recording credit (+0 free after paste) |
| **B — Alternate** free slot name you pick | Same, if UI-confirmed unused |
| **C — Wait** | Stay blocked at 50/50 |

**Do not** hunt **112** in DEV (not present).

---

## 3) Approve later phases (optional now)

| Phase | What | Slots | Recommend |
|-------|------|------:|-----------|
| 1 | Retire **061** + **078** if confirmed | +2 | Yes if UI present |
| 2 | Merge **006+021** | +1 | Yes |
| 3 | Retire **063** + **111** after create-path audit | +2 | Yes — hits **≥5 after 117** |
| 4 | EMC email merges | +5 | Defer |
| — | Upload 070a/b/c orchestrator | — | **No** near-term |
| — | Folder 01 merge 001–003 | — | **No** until trigger check |

**Path B:** 043 + 061 + 078 + 006∪021 + 063 + 111 → **+6 gross → +5 free after 117**.

---

## 4) Folder 01 heads-up

Docs table suggests **001 and 002 triggers may be swapped** vs GitHub scripts. Before any enrollment orchestrator: open live views for 001 and 002 and confirm conditions.

---

## Docs

- [INVENTORY](../architecture/AIRTABLE-AUTOMATION-INVENTORY.md)
- [DEPENDENCY-MAP](../architecture/AIRTABLE-AUTOMATION-DEPENDENCY-MAP.md)
- [REFACTOR-PLAN](../architecture/AIRTABLE-AUTOMATION-REFACTOR-PLAN.md)
- [CAPACITY-LEDGER](../architecture/AIRTABLE-AUTOMATION-CAPACITY-LEDGER.md)
