# SC-156 — Remove 070a post-script Send to Make Trigger clear

**Date:** 2026-09-04  
**Automation:** 070a `wflIYVOmRRaHu9cl2`  
**Base:** Production `appn84sqPw03zEbTT`  
**Status:** **COMPLETE / Live Tested** — Update node removed and published; no further Mike paste required for SC-156.

## Why

Live graph previously had Update record step `wacpcvzcDB1KKjaKI` that nulls `Send to Make Trigger` after the script. Soft failures return without throwing → trigger was cleared → not retryable.

## Done

1. Mike deleted the post-script Update record and published.  
2. Live graph is script-only (`wacZVMXuabTetYmQ7` v4.7).  
3. Disposable skip/idempotency + independent verify PASS.  

Evidence: [`../audits/SC-156-070A-LIVE-CLOSEOUT-20260904.md`](../audits/SC-156-070A-LIVE-CLOSEOUT-20260904.md) · [`../audits/SC-156-070A-INDEPENDENT-VERIFY-20260904.md`](../audits/SC-156-070A-INDEPENDENT-VERIFY-20260904.md)

## Rollback (not recommended)

Re-add Update record clearing Send to Make Trigger only if intentionally reverting.
