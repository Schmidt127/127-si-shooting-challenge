# LEAD-STAGE5-AUTHORIZED — Post-OMNI verification + C-019/C-011

**Lead branch:** `overnight/lead-integration`  
**Starting SHA:** `38b92cb`  
**Authorized:** 2026-07-13  
**Unattended until:** ~15:00 MDT

## Objective

Repo-safe verification tooling and audits for C-010 post-OMNI, C-019, C-011, C-023/C-024 smoke.

## Workers

| Worker | Branch | Package |
|--------|--------|---------|
| A | `overnight/v2-run/worker-a-s5-c010-post-omni-verify` | C-010 post-OMNI DEV verification checklist |
| B | `overnight/v2-run/worker-b-s5-c019-testing-views` | C-019 testing views repo verification |
| C | `overnight/v2-run/worker-c-s5-c023-c024-smoke` | C-023/C-024 smoke + post-OMNI offline tests |
| D | `overnight/v2-run/worker-d-s5-c011-weekly-email` | C-011 weekly email design audit |

**Integration order:** D → B → C → A
