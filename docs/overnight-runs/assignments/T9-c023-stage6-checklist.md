# Assignment T9 — Queue refill (Worker D follow-on or next free docs worker)

**Assigned by:** Cloud Lead (LEAD-005)  
**Time:** 2026-07-11T22:35Z  

---

## T9 — C-023 Stage 6 production readiness checklist (docs-only)

After T4 Phase 2 is merged, produce:

`docs/deploy-checklists/C-023-stage6-production-readiness-checklist.md`

Scope from Worker D Phase 1 audit §8 (T5-Stage6-closure / P-T5a):

- OMNI views/Interface checklist (Mike)
- Docs reconciliation checklist (P-D1 pointer)
- Automations table row for 116
- Homework hash path note (blocked on 070a enable)
- Attachment/Drive retirement disposition (deferred)

### Locks

- Prefer Worker D under `L-c023-docs-readonly`
- No Airtable/Make/AWS/PROD writes
- Never reset `recGQ8EjAMz3bEBiW`
