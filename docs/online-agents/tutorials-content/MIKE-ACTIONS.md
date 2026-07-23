# Mike Actions — Tutorials Content Consolidation

**Agent:** Online Agent 8  
**Date:** 2026-07-23  
**Note:** Actions Mike (or an authorized operator) must perform. Agent does not require Mike during analysis execution; these are post-package follow-through items.

## Immediate (unblock SC-052 execution later)

| # | Action | Why | Done? |
|---|--------|-----|-------|
| A1 | In Airtable UI, note row counts for `Tutorials` and `Tutorials & Assets` (DEV + PROD) | Live volume unknown in repo | [ ] |
| A2 | List Softr pages / Interfaces using either table | Deletion blocker (D-014) | [ ] |
| A3 | Export both tables (rows + attachment metadata) to a private working folder | Enables dry-run mapping | [ ] |
| A4 | Resolve `MIKE-DECISIONS.md` D1–D5 | Product judgment gates | [ ] |

## Before any PROD write

| # | Action | Why | Done? |
|---|--------|-----|-------|
| A5 | Authorize DEV migration dry-run → write | DEV-first rule | [ ] |
| A6 | Confirm website `/shoot/tutorials` smoke on DEV data | Protect SC-105 | [ ] |
| A7 | Confirm no Make scenarios outside repo bind orphan table | Repo cannot see live Make UI | [ ] |

## After successful migration

| # | Action | Why | Done? |
|---|--------|-----|-------|
| A8 | Approve publish promotions only for quality-passing rows | Public-content safety | [ ] |
| A9 | Decide hide vs delete orphan table (D5) | Irreversible without export | [ ] |
| A10 | When ready for Presentation schema wave, authorize field creation from `PRESENTATION-FIELD-SPEC.md` | SC-054 — separate from merge | [ ] |

## Explicitly not required from Mike for this analysis package

- Approving technical keep-table choice (already evidenced)
- Watching agent run fixture tests
- Editing completion master statuses
- Creating schema fields during this overnight package
)
