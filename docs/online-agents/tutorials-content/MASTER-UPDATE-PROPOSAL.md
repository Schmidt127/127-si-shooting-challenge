# Master Update Proposal — Tutorials Consolidation (SC-052 / SC-053)

**Agent:** Online Agent 8  
**Date:** 2026-07-23  
**Constraint:** Do **not** edit `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md`. This file proposes statuses only.

## Validated recommendation

Keep **`Tutorials`**. Treat **`Tutorials & Assets`** as a schema-only orphan candidate after migration + Softr/UI proof. Repository evidence re-validates the prior C-026 recommendation; it does not by itself complete PROD migration.

## Proposed status changes

| SC | Current (master, read-only) | Proposed status | Rationale |
|----|----------------------------|-----------------|-----------|
| **SC-052** | Planned | **Ready for DEV execution** (not Complete) | Dependency inventory, schema comparison, migration map, duplicate/quality tools, and runbook are in repo. Live row audit + Softr proof + migration still outstanding. |
| **SC-053** | Planned | **Blocked on SC-052 execution** (not Complete) | Merge-complete requires actual migration + Softr/view/publish verification in target base(s). |
| **SC-054** | Planned | **No status change** — supporting content spec only | `PRESENTATION-FIELD-SPEC.md` ready; fields not created; web/email not wired. |
| **SC-105** | Installed in PROD | **No status change** | Public tutorials routes already installed; still depends on SC-052 for table cleanup confidence. |
| **SC-127** | Deferred | **No status change** | No Tutorials dependency. |
| **SC-128** | Deferred | **No status change** | No Tutorials dependency. |
| **SC-129** | Deferred | **No status change** | No Tutorials dependency. |
| **SC-130** | Complete | **No status change** | Manual kits already complete. |
| **SC-131** | Deferred | **No status change** | Platform kits unrelated to table merge. |
| **SC-132** | Deferred | **No status change** | Optional Facebook kits unrelated to table merge. |

## Suggested master note text (for a future human edit)

> Online Agent 8 (2026-07-23): Repository consolidation package landed under `docs/online-agents/tutorials-content/` + `tools/tutorials-content/`. Keep `Tutorials` re-validated. SC-052 analysis artifacts ready; SC-053 remains incomplete until DEV/PROD migration + Softr verification.

## What must be true before marking Complete

### SC-052 Complete

- [ ] Live duplicate/orphan reports on real exports  
- [ ] Softr/Interface dependency cleared  
- [ ] Unique rows migrated or explicitly discarded  
- [ ] Website verification passed  
- [ ] Orphan deletion/hide decision recorded  

### SC-053 Complete

- [ ] SC-052 Complete  
- [ ] Publish-state verification passed  
- [ ] Orphan table deleted **or** explicitly retained with reason  
- [ ] No public regression on tutorials/shoutouts/articles  

## Do not mark Complete from this package alone

This overnight/online package intentionally stops at implementation-ready artifacts.
