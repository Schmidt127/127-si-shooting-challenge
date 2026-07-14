# Stage S16 — AUTHORIZED

## Stage

| Field | Value |
|-------|-------|
| Stage ID | S16 |
| Package ID | `c025-c027-owner-config-decisions` |
| Base SHA | `3c84ce5` |
| Date | 2026-07-13 |
| Claim ID | `claim-s16-config-decisions-desktop-lead` |
| Owner | `desktop-lead` |

## Objective

Lock Mike-approved C-025 / C-027 operational decisions into canonical docs, make adjustable values **configuration-driven** (reuse existing Config / XP Reward Rules / Achievements / Shot Milestones), update DEV OMNI runbooks and offline contract tests. **No Airtable writes.**

## Authorized scope

- Design amendments, configuration catalog, runbooks, offline tests, backlog + CONTROL updates
- **Not authorized:** Airtable schema/automation paste, PROD, credentials

## Lane

| Lane | Branch |
|------|--------|
| worker-a | `overnight/v2-run/worker-a-s16-c025-c027-config-decisions` |

## Reserved paths

- `docs/deploy-checklists/C-025-*`
- `docs/deploy-checklists/C-027-*`
- `docs/deploy-checklists/C-025-C-027-*`
- `tools/airtable/tests/test_c025_*`
- `tools/airtable/tests/test_c027_*`
- `docs/overnight-runs/stages/S16-*`
- `docs/overnight-runs/results/S16-*`

Lead also updates: `CONTROL.json`, `docs/v2-change-backlog.md`, milestone status.

## Definition of done

Docs + tests merged; CONTROL queue updated (design decisions approved; OMNI impl packages BLOCKED_AIRTABLE); Lead pushed.
