# Stage S6 authorization — Homework + Video pipeline audit

| Field | Value |
|-------|-------|
| Stage ID | S6 |
| Package ID | `pipeline-homework-video-audit` |
| Base SHA | `e511ed388bc48125f32eab6cee7ccf79138cd00f` |
| Date | 2026-07-13 |

## Objective

Repo-safe consolidated audit of homework and video submission pipelines (scripts, audits, C-010/C-024 touchpoints, DEV verification order).

## Authorized scope

- Repo-safe: documentation, inventory, offline contracts
- **Not authorized:** Airtable schema/automation paste, PROD, credentials, destructive git

## Lane assignments

| Lane | Branch | Deliverables |
|------|--------|--------------|
| worker-a | `overnight/v2-run/worker-a-s6-homework-video-pipeline` | `docs/deploy-checklists/PIPELINE-homework-video-audit-stage6.md`, `docs/overnight-runs/results/S6-worker-a-result.md` |

Lead-direct in worker-a worktree. One lane only.

## Required deliverables

- [x] `docs/deploy-checklists/PIPELINE-homework-video-audit-stage6.md`
- [x] `docs/overnight-runs/results/S6-worker-a-result.md`

## Required tests

- [ ] Lambda: 66/66
- [ ] Offline: 97/97
- [ ] Carry-forward: C-010 + C-024 targeted

## Merge order

1. worker-a

## Blocked actions

PROD, credentials, Airtable schema, destructive git, Tutorials, Learning Activities implementation.

## Definition of done

- [ ] Deliverables on worker branch
- [ ] `assert_git_lane.py` passed before commits
- [ ] Merged to `overnight/lead-integration`
- [ ] Regression PASS
- [ ] CONTROL.json updated; Lead pushed; local = remote
