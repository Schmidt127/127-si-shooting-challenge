# Email Handoff Reliability — Wave B12 Reconciliation

**Agent 7 scope** | No sends in Wave B

## Current repo versions (master)

| Automation | GitHub version | Role | Trigger state |
|------------|----------------|------|---------------|
| 071 | v4.4 | Homework parent feedback queue | **Unknown live** — Issue #105 paste gap |
| 072 | v4.9.2 | Weekly package builder | Repo current; paste bundle may drift |
| 073 | v4.7 | Video parent feedback queue | **Unknown live** — Issue #105 |
| 074 | v3.6 | Weekly Hub handoff | Offline contracts pass |
| 076 | v8.14 | Daily submission Hub handoff | Issue #104 canonical XP reporting |
| 079 | v2.5 | Sole Hub dispatcher | Offline pass |
| 118/119 | v2.0 | Weekly schedule build/send arms | Confirm live inputs |

## Send plane

All SC email → **Communications Hub → Resend** (`docs/integrations/email-send-plane.md`). Make does not send SC email.

## Issues #104 / #105

| Issue | Gap | Wave B action |
|-------|-----|---------------|
| #104 | 072/076 live paste + Schmidt payload review | Document; offline `automation-072-076-canonical-reporting.test.js` passes |
| #105 | 071/073 Airtable paste + Test-mode cases A–U | Document; stale Make/Gmail refs in packet — Hub path is current |

## Recipient safety

- Season sim allowlist: `schmidt@fairfieldbasketballclub.com`
- Test Mode? defaults true on queue creators
- 079 validates non-empty Recipients JSON
- Shared CLI blocks non-allowlisted `--execute` email scenarios

## Test-mode readiness

Offline: `tests/email/*`, `was-email-contracts/*`, SC-008 failure-path pack. Live: **BLOCKED** until `IDENTITY_VERIFIED`.
