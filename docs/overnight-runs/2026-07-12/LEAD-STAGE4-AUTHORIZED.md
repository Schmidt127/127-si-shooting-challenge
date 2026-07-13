# LEAD-STAGE4-AUTHORIZED — C-010 enrollment lifecycle

**Lead branch:** `overnight/lead-integration`  
**Starting SHA:** `9e905ca` (Stage 3 C-024 integrated PASS)  
**Authorized:** 2026-07-13  
**PROD / schema:** **Prohibited**

## Objective

Repo-only audit and design for **C-010** two-field enrollment model per approved owner decisions.

## Workers

| Worker | Branch | Deliverable |
|--------|--------|-------------|
| A | `overnight/v2-run/worker-a-s4-c010-enrollment` | Field + automation inventory |
| B | `overnight/v2-run/worker-b-s4-c010-enrollment` | Email/public visibility audit |
| C | `overnight/v2-run/worker-c-s4-c010-enrollment` | Offline lifecycle tests |
| D | `overnight/v2-run/worker-d-s4-c010-enrollment` | Behavior contract + OMNI runbook |

**Integration order:** D → B → C → A

*Lead · Stage 4 authorized*
