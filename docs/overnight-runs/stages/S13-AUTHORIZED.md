# Stage S13 — AUTHORIZED

## Stage

| Field | Value |
|-------|-------|
| Stage ID | S13 |
| Package ID | `C-027-major-event-notifications-design` |
| Base SHA | `feb8cee` (verify at claim time) |
| Date | 2026-07-13 |
| Claim ID | `claim-s13-c027-desktop-lead` |
| Owner | `desktop-lead` |

## Objective

Repo-only design for major-event parent notifications: event taxonomy, send-key/idempotency contract, gating rules, channel options, and offline tests — without Airtable or provider changes.

## Authorized scope

- Design docs, dependency audit vs **042/054/058/059/066/071/073**, offline tests, DEV OMNI/runbook stubs
- **Locked:** parents first; events = level up, major shot milestone, Perfect Week, major streak milestone; no daily-submission notifications; do not alter **071** or video feedback flows
- **Not authorized:** Airtable schema, Make/SMS credentials, PROD, provider signups

## Lane assignments

| Lane | Branch | Deliverables |
|------|--------|--------------|
| worker-b | `overnight/v2-run/worker-b-s13-c027-major-event-notifications` | `docs/deploy-checklists/C-027-*`, `tools/airtable/tests/test_c027_*`, `docs/overnight-runs/results/S13-worker-b-result.md` |

## Reserved paths

- `docs/deploy-checklists/C-027-*`
- `docs/overnight-runs/stages/S13-*`
- `docs/overnight-runs/results/S13-*`
- `tools/airtable/tests/test_c027_*`

## Required deliverables

- [ ] `docs/deploy-checklists/C-027-major-event-notifications-design-stage13.md`
- [ ] `docs/deploy-checklists/C-027-dev-omni-runbook-stage13.md`
- [ ] `tools/airtable/tests/test_c027_major_event_send_contract.py`
- [ ] Worker + Lead result docs

## Required tests

- Lambda 66/66 · Offline 97/97 · C-027 + C-010/C-024/comms carry-forward

## Merge order

1. `overnight/v2-run/worker-b-s13-c027-major-event-notifications`

## Blocked actions

PROD, credentials, Airtable writes, SMS/email provider setup, destructive git, Tutorials, Learning Activities implementation.

## Definition of done

Deliverables merged, tests PASS, claim released, CONTROL updated, Lead pushed.
