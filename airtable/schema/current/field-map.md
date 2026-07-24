# Field Map — Shooting Challenge (critical path)

**Last updated:** 2026-07-24  
Full fields: schema snapshot `prod-foundation-reset-20260723`.

## Critical ownership

| Area | Fields | Writer |
|------|--------|--------|
| Enrollment identity | Athlete, Config/Program Instance, Grade Band, Active? | 001–003 / intake / ops |
| Levels | Level Recalc Needed?, Current/Next Level | 041 / **042** |
| Submission | Enrollment, Week, Activity Date, Shot Total, XP Award Status | 023 / **005** / 010 |
| Assets | Upload Status, Canonical URL, Send to Make Trigger, Writeback Complete? | 009 / 070* / Make / 022 / 070c |
| HC / VF Grade Band | Enrollment, Grade Band | **020** / **013** (063/111 retired) |
| XP Events | Source Key (never write formula dedupe fields) | Creating XP script |
| WAS identity | Enrollment, Week, Summary Key (formula) | **031** primary |
| WAS email | Build Now?, Ready?, package, Send to Make?, Sent?, Make Send Status, sent timestamp, sendMode | 118/072/119/**074**/Make Live |
| Zoom | Attendees (101 only); Create XP Events | 101; **117 forbidden on Attendees** |

Cleanup classes: Keep / Legacy / Do not use / Unknown — see `docs/next-wave/reliability-audit-2026-07-24/CLEANUP-AND-MIGRATION-PLAN.md`.
