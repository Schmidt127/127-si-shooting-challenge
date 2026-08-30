# Program Homework Assignments audit — 18-assignment design (read-only)

**Date:** 2026-08-30  
**Base:** `appn84sqPw03zEbTT` (Production)  
**Table:** `Program Homework Assignments` (`tblhA3maf7xOa8EUS`)  
**Mode:** Read-only — no PHA create/update/delete  
**Related:** FUT-001, MRW-A03, Automations 020 / 033 / 065  

Companion Weeks audit: [`WEEKS-2026-27-AUDIT-2026-08-30.md`](./WEEKS-2026-27-AUDIT-2026-08-30.md)

---

## Design authority (operator brief 2026-08-30)

| Rule | Confirmed |
|------|-----------|
| Exactly **18** active season assignments | Yes |
| Early Bird: HW1 + HW2 | Yes |
| Weeks 1–8: HW1 + HW2 each | Yes |
| Week 9: **no** homework | Yes |
| Post-Challenge / Post-Feedback: **no** normal homework | Yes |
| Common final due date | **2027-06-29** on all 18 active rows |
| Linked Week = assignment identity / challenge-period ownership | Yes |
| Due date = final completion deadline only (not weekly deadlines) | Yes |
| Level gates remain based on these 18 | Do not redesign |

---

## Active season inventory (18)

Program Instance: `rec5mEM0YPqPqq0hZ` — Shooting Challenge \| 2026-2027  
All rows: `Active?` = true · Due Date = **2027-06-29** · Grade Band = all five bands (K-2 … 9-12)

| Week | Slot | PHA record | Library (title) |
|------|------|------------|-----------------|
| Early Bird `recBrZ1sV8byWEHZU` | HW1 | `recgj8dPk4ouTwCOj` | Shot Tracker Usage |
| Early Bird | HW2 | `recXXZErbjxxGxWw2` | Website Exploration |
| Week 1 `rec2Rewxt21z7dI9f` | HW1 | `reciIDlAOMCuc9nYi` | The Meditation Workout |
| Week 1 | HW2 | `recdWEZZfq1huxVBx` | Train Rough |
| Week 2 `rec7RpUMVLbcrmn4h` | HW1 | `recDqjtMJdSwezYfB` | Family Culture |
| Week 2 | HW2 | `rec0nGwvcTIwT0xQU` | Learn to Play Small |
| Week 3 `recCCpyqPKA580sdk` | HW1 | `recoJW2lsvwfRwuGp` | Writing Down Your Goals |
| Week 3 | HW2 | `recqxPazIshROwQXn` | The Visualization Workout |
| Week 4 `recEapVpi6u0oxuPy` | HW1 | `recwqNHnDh8IkXtNJ` | Watch the Pros! Not the Joes |
| Week 4 | HW2 | `recYhGHCXRoYIuZa2` | The Cooldown |
| Week 5 `recKJMGYbEzGHyXfd` | HW1 | `recHUw96J4agLSZtA` | Practice Slower |
| Week 5 | HW2 | `recFJ09VzZtY3DxLG` | Strengthen Your Subconscious Mind |
| Week 6 `recRp4y42EpLvtwk5` | HW1 | `receoNQt0ZPxPoaU1` | Identity, Job, Approach |
| Week 6 | HW2 | `recKRrrOZIhtL3hXL` | Get Your Head (Back) in the Game |
| Week 7 `recW3irij491AIPrl` | HW1 | `recQv6dISolNYu75t` | Don't Beat Yourself |
| Week 7 | HW2 | `recNYRlGBZczsicJI` | What's Your Sports Credo? |
| Week 8 `recfu3dpVJAnVBvCB` | HW1 | `rec3kgdcgcSlW2fAv` | Act Like a Champion |
| Week 8 | HW2 | `recQXYoYabtjaM3pd` | Performance Affirmations |

**Counts:** Early Bird 2 + Weeks 1–8 × 2 = **18**. Week 9 / Post-Challenge: **0** active PHA.

---

## Inactive / orphan row (not part of the 18)

| Record | Week | Slot | Notes |
|--------|------|------|-------|
| `recpHX3stQ8YBVtLi` | Week 1 | HW1 | Final Reflection Quiz; **`Active?` unchecked**; no Due Date |

**Classification:** Operator hygiene (optional OMNI archive/delete) — **not** a season-design defect. Automations **033** / **020** / **005** ignore inactive PHA. Schedule Key differs from active Week 1 HW1 (different library RID), so no active duplicate-slot collision.

---

## Identity + automation audit (repo + live schema)

| Check | Result |
|-------|--------|
| PHA identity fields | Program Instance + Week + Homework Slot + Homework Assignment (+ multi-band Grade Band metadata) |
| Schedule Key | `PI\|Week\|Slot\|Library` (Grade Band not in key; multi-band on one row is intentional) |
| 020 HC dedupe | Enrollment + PHA record id (FUT-001) |
| 020 / 065 due date | PHA Due Date (June 29) overrides Week End Date → post-week completion through June 29 remains on-time |
| 033 WAS homework | Active PHA only for PI + Week; skip when none (Week 9 / Post-Challenge safe) |
| 065 XP | `HOMEWORK_XP\|{hcId}` once; inactive enrollment / inactive PHA fail closed |
| Early Bird | Countable Week + active PHA HW1/HW2 — not treated as test-only by automations |
| Common deadline vs Week link | Due Date does not change linked Week ownership |

**Defects requiring live paste / schema change:** **None.**

**Optional OMNI:** Archive inactive `recpHX3stQ8YBVtLi`.

---

## Mike actions (homework only)

1. Treat the 18 active rows + June 29 common deadline as finalized (this audit).  
2. Optional: archive inactive Final Reflection Quiz PHA `recpHX3stQ8YBVtLi`.  
3. Do **not** add Week 9 or Post-Challenge homework.  
4. Do **not** repaste 020 / 033 / 065.
