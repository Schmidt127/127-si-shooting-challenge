# Table Map (pointer)

> **Status:** Detailed hand inventory lives in the Agent 2 pack.  
> **Canonical SoT:**  
> 1. PROD snapshot `../snapshots/prod-foundation-reset-20260723-post-ts/`  
> 2. [`docs/next-wave/data-model/CANONICAL-TABLE-MAP.md`](../../../docs/next-wave/data-model/CANONICAL-TABLE-MAP.md)  
> 3. Reliability audit context: [`docs/next-wave/reliability-audit-2026-07-24/REPORT.md`](../../../docs/next-wave/reliability-audit-2026-07-24/REPORT.md)

## Correct hub model

**Enrollment-centric** (not Athlete-centric):

```
Athletes → Enrollments → Submissions / WAS / XP Events / HC / VF / Zoom
Weeks ← Program Instance; Weeks → Submissions / WAS
Config (by Active School Year) → season settings / Zoom config links
```

Week Name pattern (human label): `Week 0` … `Post-Challenge` for 2026–2027.  
**Week Key** formula is `RECORD_ID()` (not `2026-2027|Week N`) — see Agent 2 unique-key audit.

## Out of scope

Team Shot Tracker inactivity alerts (3/7/10-day) are not part of this base.

## Legacy note

Earlier drafts in this file described Athletes as the primary hub. That description is **Do not use** for V2 automation design.
