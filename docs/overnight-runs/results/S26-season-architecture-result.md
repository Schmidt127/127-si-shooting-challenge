# S26 — Multi-year / season architecture result (WS9)

**Date:** 2026-07-14  
**Workstream:** 9  
**Stage:** S26  
**Mode:** Docs / design only — **no schema mutations**

## Deliverable

| File | Role |
|------|------|
| `docs/architecture/MULTI-YEAR-SEASON-ARCHITECTURE-ADR.md` | ADR for V2-013 Program Instance multi-year model |

## Decision restated

- **One base** + **Program Instance** per season (not archive+clone / V2-001).
- Athletes are lifetime; **Enrollment** is season-owned.
- Config packs are cloned per Instance; historical rows are not overwritten for next-year tuning.
- Cross-season links are rejected via Instance match on Week/config resolution.
- XP awards stay on Enrollment/season Source Keys; lifetime Athlete rollups are additive, not destructive.

## Phased proposal captured

0. Docs (this stage) → 1. Schema design DEV → 2. Dual-Instance DEV rehearsal + regression matrix → 3. PROD backfill + open → 4. Closed-season ops / audits

## Hard gates called out

No PROD schema, no archive deletion, no real sends, no **117** enable, no mixing 2026–27 config into unscoped Active rows until Wave 1b runs.

## Next (not done here)

- Mike-scheduled V2-013 wave approval before any Program Instance field work.
- Align C-010 / C-018 implementations with Active Instance filtering when those land.
