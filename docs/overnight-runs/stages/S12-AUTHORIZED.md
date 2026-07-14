# Stage S12 — AUTHORIZED

## Stage

| Field | Value |
|-------|-------|
| Stage ID | S12 |
| Package ID | `C-025-zoom-recording-design` |
| Base SHA | `98c3df9a80973f7c5744d86038f28ec0ec0c5802` |
| Date | 2026-07-13 |
| Claim ID | `claim-s12-c025-desktop-lead` |
| Owner | `desktop-lead` |

## Objective

Produce a repo-only Zoom recording-watch behavior contract, field/source-key proposal, conflict prevention design, DEV OMNI runbook, and offline tests — without modifying Airtable.

## Authorized scope

- Repo-safe work only: design docs, dependency audit, offline tests, DEV OMNI runbook, owner-decision list for unresolved operational choices
- **Approved owner rules (do not reopen):** recording = 50% of live Zoom XP; recording = full level-gate credit; live and recording mutually exclusive for the same meeting
- **Not authorized:** Airtable schema/automation paste, PROD, credentials, destructive git, Tutorials, Learning Activities Airtable implementation

## Lane assignments

| Lane | Branch | Deliverables |
|------|--------|--------------|
| worker-a | `overnight/v2-run/worker-a-s12-c025-zoom-recording-design` | `docs/deploy-checklists/C-025-*`, `tools/airtable/tests/test_c025_*`, `docs/overnight-runs/results/S12-worker-a-result.md` |

Lead owns: `CONTROL.json`, this auth doc, Lead integration result, milestone status log, backlog status line.

## Reserved paths (claim)

- `docs/deploy-checklists/C-025-*`
- `docs/overnight-runs/stages/S12-*`
- `docs/overnight-runs/results/S12-*`
- `tools/airtable/tests/test_c025_*`

## Required deliverables

- [ ] `docs/deploy-checklists/C-025-zoom-recording-design-stage12.md` (behavior contract + audit)
- [ ] `docs/deploy-checklists/C-025-dev-omni-runbook-stage12.md`
- [ ] `tools/airtable/tests/test_c025_recording_watch_contract.py`
- [ ] `docs/overnight-runs/results/S12-worker-a-result.md`
- [ ] `docs/overnight-runs/results/S12-lead-integration-result.md` (after merge)

## Required tests

- [ ] Lambda: 66/66
- [ ] Offline: full suite (expect +C-025 tests)
- [ ] Targeted: C-025 + C-024 DK-08 carry-forward + branch guard

## Merge order

1. `overnight/v2-run/worker-a-s12-c025-zoom-recording-design`

## Blocked actions

PROD, credentials, Airtable schema/automation changes, destructive git, Tutorials, Learning Activities implementation.

## Definition of done

- [ ] All deliverables exist on worker branch
- [ ] `assert_git_lane.py` passed before each commit
- [ ] Merged to `overnight/lead-integration`
- [ ] Regression tests PASS
- [ ] CONTROL.json updated (package COMPLETE, claim released, canonical SHA)
- [ ] Lead pushed; local SHA = remote SHA
