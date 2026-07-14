# Stage S17 — AUTHORIZED

## Stage

| Field | Value |
|-------|-------|
| Stage ID | S17 |
| Package ID | `c025-c027-overnight-stage17` (config linkage / deadline / submission / automation packages / C-027 prep) |
| Base SHA | `4530780` |
| Date | 2026-07-13 |

## Objective

Complete C-025 config-linkage + deadline-repair + submission verification designs, C-025 automation package designs, C-027 MEN implementation prep, and offline contracts — repo-safe overnight Lead-direct with Agents A/B; no PROD, no deploy, no XP/email sends.

## Authorized scope

- Repo-safe: docs under `docs/deploy-checklists/`, `docs/overnight-runs/`, offline tests under `tools/airtable/tests/`
- Optional draft automation designs (markdown; scripts only if standard-compliant DRAFT)
- DEV Meta API **read** for field verification
- **Not authorized:** PROD, credentials, XP Events, email sends, Make, Vercel, destructive Airtable deletes, Tutorials, Learning Activities Airtable implementation, pasting automations into Airtable

## Lane assignments

| Lane | Branch | Deliverables |
|------|--------|--------------|
| Lead | `overnight/lead-integration` | Integration + tests + commit/push |
| Agent A | research only | Config linkage, deadline, submission verification docs + tests |
| Agent B | research only | C-025 automation packages, C-027 prep, contracts tests |

## Required deliverables

- [ ] `docs/deploy-checklists/C-025-config-linkage-design.md`
- [ ] `docs/deploy-checklists/C-025-deadline-repair-design.md`
- [ ] `docs/deploy-checklists/C-025-submission-page-verification.md`
- [ ] `docs/deploy-checklists/C-025-automation-packages-stage17.md`
- [ ] `docs/deploy-checklists/C-027-implementation-prep-stage17.md`
- [ ] Offline C-025/C-027 contract tests
- [ ] CONTROL + UNATTENDED-RUN-STATUS morning report

## Required tests

- [ ] Lambda: 66/66
- [ ] Offline: full suite
- [ ] Targeted: all new C-025/C-027 tests tonight

## Merge order

1. Lead-direct only (no worker branch merge)

## Blocked actions

PROD, credentials, Airtable destructive deletes, force push, Tutorials, Learning Activities implementation, automation paste/deploy.

## Definition of done

- [ ] Designs + tests committed
- [ ] Regression PASS
- [ ] CONTROL updated; Lead local = remote
- [ ] Morning report written
- [ ] PROD untouched confirmed
