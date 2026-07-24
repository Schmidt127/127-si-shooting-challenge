# Table Map (pointer)

> **Status:** Hand map below is **superseded** for Shooting Challenge V2.  
> **Canonical SoT:**  
> 1. PROD snapshot `../snapshots/prod-foundation-reset-20260723-post-ts/`  
> 2. Agent 2 pack [`docs/next-wave/data-model/CANONICAL-TABLE-MAP.md`](../../../docs/next-wave/data-model/CANONICAL-TABLE-MAP.md)

## Correct hub model

**Enrollment-centric** (not Athlete-centric):

```
Athletes → Enrollments → Submissions / WAS / XP Events / HC / VF / Zoom
Weeks ← Program Instance; Weeks → Submissions / WAS
Config (by Active School Year) → season settings / Zoom config links
```

## Full inventory

See Agent 2 canonical table map for all 30+ tables with primary fields and key links.

## Legacy note

Earlier drafts in this file described Athletes as the primary hub. That description is **Do not use** for V2 automation design.
