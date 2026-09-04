# SC-156 live closeout — 070a post-clear removal — 2026-09-04

**Base:** Production `appn84sqPw03zEbTT`  
**Automation:** 070a `wflIYVOmRRaHu9cl2`  
**Script:** v4.7 unchanged  
**Mike:** Published after deleting Update node `wacpcvzcDB1KKjaKI`

## Live graph (post-publish)

| Check | Result |
|-------|--------|
| deploymentStatus | **deployed** |
| Nodes | Exactly one: `customScript` `wacZVMXuabTetYmQ7` |
| Obsolete Update `wacpcvzcDB1KKjaKI` | **ABSENT** |
| Trigger | Unchanged nine AND conditions |
| Inputs | `recordId` ← trigger.id; `webhookUrl` (redacted); `automationNumber=070a` |
| Independent A3 | **PASS** — [`SC-156-070A-INDEPENDENT-VERIFY-20260904.md`](./SC-156-070A-INDEPENDENT-VERIFY-20260904.md) |

## Disposable matrix (Schmidt homework asset; IDs omitted)

| Case | Result |
|------|--------|
| T1 Success / skip (`skipped_already_uploaded`) | **PASS** — Canonical present; script set Uploaded + cleared **Send to Make Trigger** (no post-script Update) |
| T4 Idempotency re-fire | **PASS** — second arm → same Canonical/Storage Key; trigger cleared again; no duplicate S3 object key |
| T2 Soft-fail retention | **PASS (graph + code)** — no post-clear node; v4.7 retains trigger on webhook/Lambda soft fail. Live webhook-fail not induced (would require temporary webhook mutation). Make success probe cleared trigger via **script only** after Lambda restored Canonical |
| T3 Retry / re-entry | **PASS** — after clear, re-arming Pending Link + Trigger re-entered 070a (T4) |
| Reconciliation | Upload Error / Trigger / Upload Status remain operator-visible; no stranded silent clear from companion Update |
| Cleanup | Reviewer Access Token, enrollments, Canonical, Uploaded, Trigger restored; no disposable creates left |

## Holds confirmed

Season Simulation not run · no field deletion · 057/058 untouched · no broad email

## Closure

**SC-156 COMPLETE / Live Tested (2026-09-04).**
