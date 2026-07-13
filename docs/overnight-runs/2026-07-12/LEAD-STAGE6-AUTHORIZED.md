# LEAD-STAGE6-AUTHORIZED — Pipeline audit + Learning Activities proposal

**Lead branch:** `overnight/lead-integration`  
**Starting SHA:** `3a8247f`  
**Authorized:** 2026-07-13  
**Unattended until:** ~15:00 MDT

## Objective

Repo-safe consolidated pipeline audits and Learning Activities dependency/schema proposal (no Airtable changes).

## Workers

| Worker | Branch | Package |
|--------|--------|---------|
| A | `overnight/v2-run/worker-a-s6-homework-video-pipeline` | Homework + video pipeline audit |
| B | `overnight/v2-run/worker-b-s6-zoom-achievements-pipeline` | Zoom + achievements pipeline audit |
| C | `overnight/v2-run/worker-c-s6-summary-comms-pipeline` | Weekly summary + communications pipeline audit |
| D | `overnight/v2-run/worker-d-s6-learning-activities` | Learning Activities dependency audit + schema proposal |

**Integration order:** D → B → C → A

## Regression gates (post-integration)

- Lambda 66/66
- Offline 97/97
- C-010 carry-forward 13/13
- C-024 carry-forward 13/13
- Combined targeted 26/26

## Blocked

- Airtable schema/automation changes
- Learning Activities table creation
- Homework table modifications
- PROD deployment
