# Table Map (pointer)

> **Status:** Pointer updated 2026-08-19. Full hand inventory still open.  
> **Canonical SoT:**  
> 1. PROD snapshot **`../snapshots/prod-20260819/`** (stamp `20260819_184903`) — [refresh summary](../../../docs/deploy-checklists/SCHEMA-REFRESH-2026-08-19.md)  
> 2. Older: `../snapshots/prod-foundation-reset-20260723-post-ts/`  
> 3. [`docs/next-wave/data-model/CANONICAL-TABLE-MAP.md`](../../../docs/next-wave/data-model/CANONICAL-TABLE-MAP.md)  
> 4. Reliability audit context: [`docs/next-wave/reliability-audit-2026-07-24/REPORT.md`](../../../docs/next-wave/reliability-audit-2026-07-24/REPORT.md)

## Correct hub model

**Enrollment-centric** (not Athlete-centric):

```
Athletes → Enrollments → Submissions / WAS / XP Events / HC / VF / Zoom
Weeks ← Program Instance; Weeks → Submissions / WAS
Config (by Active School Year) → season settings / Zoom config links
```

**Homework (2026-08-19 PROD):** reusable content in **Homework Library**; season/week schedule in **Program Homework Assignments** (PHA). Do not treat library `Week` / `Grade Band` as authoritative if still present during cutover.

Week Name pattern (human label): `Week 0` … `Post-Challenge` for 2026–2027.  
**Week Key** formula is `RECORD_ID()` (not `2026-2027|Week N`) — see Agent 2 unique-key audit.

## Out of scope

Team Shot Tracker inactivity alerts (3/7/10-day) are not part of this base.

## Legacy note

Earlier drafts in this file described Athletes as the primary hub. That description is **Do not use** for V2 automation design.
