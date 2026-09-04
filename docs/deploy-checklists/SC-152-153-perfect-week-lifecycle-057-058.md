# Deploy — SC-152 / SC-153 Perfect Week lifecycle (057 v2.4 + 058 v1.7)

**Date:** 2026-09-04  
**Base:** Production `appn84sqPw03zEbTT`  
**Status:** **COMPLETE / Live Tested** — no further paste required for SC-152/SC-153.

## Live (attested 2026-09-04)

| Item | Status |
|------|--------|
| Checkbox `Perfect Week Recalc Needed?` | Present |
| Queue formula | Pending **OR** Recalc Needed |
| **057 script v2.4** | **Live** — SF-01 Recalc re-entry PASS |
| **058 trigger** | **Live** `recordUpdated` + nine watched fields (Unlock not watched) |
| **058 script v1.7** | **Live** — withdraw/restore/idempotency PASS |

Evidence: [`../audits/SC-152-153-LIVE-VERIFICATION-20260904.md`](../audits/SC-152-153-LIVE-VERIFICATION-20260904.md) · [`../audits/SC-153-058-V17-LIVE-VERIFICATION-20260904.md`](../audits/SC-153-058-V17-LIVE-VERIFICATION-20260904.md)

## Operator reconciliation

WAS filter: `Perfect Week Recalc Needed?` checked **OR** (`Queue? = 1` AND Status not progressing) **OR** Automation Error not empty.

## Rollback

Pre-SC-152/153 snapshots remain at `airtable/rollbacks/20260904-pre-sc152-153/`.
