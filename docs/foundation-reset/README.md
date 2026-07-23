# Foundation Reset Pack — Index (2026-07-23)

Controlling plan: [`docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md`](../SHOOTING_CHALLENGE_COMPLETION_MASTER.md)

## Deliverables

| # | Deliverable | Path |
|---|-------------|------|
| 1 | Fresh PROD schema export | `airtable/schema/snapshots/prod-foundation-reset-20260723/` + `PROD-SCHEMA-EXPORT-2026-07-23.md` |
| 2 | PROD automation inventory | `PROD-AUTOMATION-VERSION-INVENTORY-2026-07-23.md` |
| 3 | Field ownership matrix | `CRITICAL-PATH-FIELD-OWNERSHIP-MATRIX-2026-07-23.md` |
| 4 | Schmidt foundation | `schmidt-seed-result.json` + evidence doc |
| 5 | Testing Scenarios table | `prod-testing-scenarios-created.json` (`tblagI7Q5wXQm2XGS`) |
| 6 | Testing views checklist | `PROD-TESTING-VIEWS-CHECKLIST-2026-07-23.md` |
| 7 | Live PROD test evidence | `FOUNDATION-RESET-PACK-TEST-EVIDENCE-2026-07-23.md` |
| 8 | Mike next action (115) | `MIKE-ACTION-INSTALL-115-PROD.md` |
| 9 | DEV↔PROD automation reconciliation + capacity plan | `DEV-PROD-AUTOMATION-RECONCILIATION-2026-07-23.md` (+ `.json`) |

## Approved decisions applied

- SC-001: Testing Scenarios allowed in PROD (orchestration only)
- SC-004: Schmidt `Active?` = true for processing; no new exclusion field; standings exclusion via existing view/`Active?` mechanisms pending Mike view filter
