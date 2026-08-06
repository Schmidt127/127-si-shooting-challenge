# SC-041 — Weekly email retry executable packet (Schmidt)

**Date:** 2026-08-05  
**Enrollment:** `recgP9qZYjAhE7NXm`  
**SOP:** [`WEEKLY-EMAIL-RETRY-SOP.md`](../next-wave/was-email/WEEKLY-EMAIL-RETRY-SOP.md)  
**Contracts:** `planWeeklyEmailWebhookOutcome` / `decideWeeklyEmailRetryAction`

## Probe result (Agent 4 — no sends)

Run:

```bash
node tools/testing/ops_email_readiness_probe.mjs --write-evidence
```

Evidence: `docs/testing/evidence/2026-08-05-agent4-ops/EMAIL-READINESS-PROBE.json`

Observed 2026-08-05:

- Schmidt WAS rows exist (identity path); weekly email Ready/Sent flags were **not armed** on sampled rows.
- No automatically_retryable candidates at probe time.
- Welcome package exists with Sent At, but subject still references **2025-2026** (rebuild before next-season Live).

## Exact retry decision tree (operator)

| Observe on WAS | Action | Class |
|----------------|--------|-------|
| `Weekly Email Sent?` checked | Stop | never_retry_already_completed |
| `Make Send Status=Sent` but Sent? unchecked | Inspect Make/writeback — do not blind rearm | manual_review_required |
| Ready? + Send to Make? + not Sent (± Error) | Re-run **074** only | automatically_retryable |
| Ready? + not Send to Make? + not Sent | Set Send to Make?=true → run **074** | retryable_after_correcting_data |
| not Ready? | Re-run **072** (then 119/074) | retryable_after_correcting_data |

## Controlled failure→recovery (when Mike authorizes)

1. Pick one Schmidt WAS for a target Week (prefer empty Ready/Sent).
2. Ensure package built (`Weekly Email Ready?` true, Subject/Recipients/HTML present).
3. Set `Send to Make?` true.
4. Optional deliberate fail: temporary bad webhook (**Mike only**) **or** use a row that already has `Weekly Email Error`.
5. Expect after failed 074: Send to Make? still true · Error non-empty · Sent? false.
6. Restore webhook / Fix Make.
7. Re-run 074 → Make Live writeback sets Sent? + Make Send Status=Sent + timestamp.
8. Re-run 074 again → must not send a second email.

## Suppression

Agent 4 did **not** POST Make webhooks and did **not** send Gmail.

## Status

SC-041 remains **Built in Repository** until a dated Schmidt failure→recovery live proof is attested. This packet minimizes Mike’s remaining steps to one authorized WAS rerun.
