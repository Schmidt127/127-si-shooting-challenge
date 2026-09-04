# SC-156 — 070a Independent Reliability Verification (Agent 3)

**Date:** 2026-09-04  
**Agent:** A3 — Independent Reliability Verification (`verify/sc-156-070a-reliability-a3`)  
**Base:** Production `appn84sqPw03zEbTT`  
**Automation:** `wflIYVOmRRaHu9cl2`  
**Method:** Airtable MCP `get_automation` with `includeDeployedVersion=true` (read-only); live Submission Assets scans (counts only); repo script review  
**Mike report under test:** 070a published — Update node removed; automation remains enabled; trigger and script unchanged  

**Overall verdict: PASS**

---

## Task Classification

| Field | Value |
|-------|-------|
| Type | Independent post-publish reliability verify |
| Priority | P1 |
| Backlog ID | **SC-156** |
| Phase | 5 Close (verify only) |
| Correct tool | Cursor + Airtable MCP read |
| Repo | `127-si-shooting-challenge` (worktree `a3-verify`) |
| Mike's role | Observe; coordinator closes CURRENT-TRUTH / Master list |

---

## Graph attestation (live MCP)

| Check | Expected | Live result | Verdict |
|-------|----------|-------------|---------|
| Obsolete Update `wacpcvzcDB1KKjaKI` | ABSENT | ABSENT (not in `nodes`) | **PASS** |
| Action nodes | Only `customScript` | Exactly one node: `wacZVMXuabTetYmQ7` (`customScript`) | **PASS** |
| `deploymentStatus` | deployed / enabled | `deployed`; `deploymentError` null; `configurationStatus` valid | **PASS** |
| Draft vs published | Aligned | `deployedVersion` null (draft === published) | **PASS** |
| Script version | v4.7 | Live body `CONFIG.version = "v4.7"`; Last Updated 2026-08-21 | **PASS** |
| Inputs | `recordId`, `webhookUrl`, `automationNumber=070a` | `recordId` ← trigger `id`; `webhookUrl` present (**redacted**); `automationNumber` literal `070a` | **PASS** |
| Trigger | Unchanged nine AND conditions | `recordMatchesConditions` on Submission Assets `tblhMLKxQK77agtME`; nine AND operands (unchanged) | **PASS** |

### Trigger conditions (live — do not change)

| # | Field ID | Meaning | Operator | Value |
|---|----------|---------|----------|-------|
| 1 | `fld8C43NVQQ1NeQ7Z` | Send to Make Trigger | `=` | `true` |
| 2 | `fldG5lWlsUcrDNlIg` | Ready to Send to Make? | `contains` | `READY_TO_SEND` |
| 3 | `fldPybPEvRcEVuNWl` | Upload Status | `=` | `sel1x03bVpyf2dCcO` (**Pending Link**) |
| 4 | `fld3O3MhDPbgyVw4f` | Reviewer File URL | `isEmpty` | — |
| 5 | `fldox2Rjj9YL3EYK6` | Upload Destination | `=` | `Homework Completions` |
| 6 | `flddRCbWCegg4WCoZ` | Submission - Linked | `isNotEmpty` | — |
| 7 | `fldJRSvui8RPg0Vyb` | Enrollment - Linked | `isNotEmpty` | — |
| 8 | `fldrGt7IsWDUAKfzD` | Airtable Attachment | `isNotEmpty` | — |
| 9 | `fldQF8OsfESrHdcUb` | Homework Completions | `isNotEmpty` | — |

### Target graph (attested)

1. **Run a script** — `wacZVMXuabTetYmQ7` only  
2. ~~Update record `wacpcvzcDB1KKjaKI`~~ — **removed / published**

No live Airtable graph or script edits performed by this agent.

---

## PASS / FAIL matrix

| # | Requirement | Evidence | Verdict |
|---|-------------|----------|---------|
| 1 | Post-script Update removed and published | MCP nodes list has no `updateRecord`; obsolete key absent; `deployedVersion` null | **PASS** |
| 2 | Only customScript remains | Single node `wacZVMXuabTetYmQ7` | **PASS** |
| 3 | Automation deployed/enabled | `deploymentStatus=deployed` | **PASS** |
| 4 | Script still v4.7; inputs correct | Live script + inputObj | **PASS** |
| 5 | Trigger unchanged (9 AND) | Live filtersObj matches prior A1 contract | **PASS** |
| 6 | Trigger ownership: not cleared by post-script Update | Graph proof: no Update after script | **PASS** |
| 7 | Trigger clears only via script success / `skipped_already_uploaded` (and intentional local `stopWithAssetUpdate` defaults) | Code: success writeback + Canonical gate; soft fails use `uncheckTrigger: false` / `stopWithLambdaHandoffFailure` (no uncheck) | **PASS** |
| 8 | Soft failure remains retryable | Graph: no blanket post-clear; code retains trigger on webhook/Lambda soft fail | **PASS** (code + graph; no live soft-fail fire this pass) |
| 9 | Idempotency / duplicate handoff protection | Local `skipped_already_uploaded` when Canonical URL or Uploaded+Storage Key; Lambda `skipped_already_uploaded` treated verified | **PASS** |
| 10 | Failed/stranded items detectable | `Upload Error`, `Send to Make Trigger`, `Upload Status`, run outputs (`statusOut`/`actionOut`/`errorOut`/`debugStep`) | **PASS** (signals present; queue empty at scan) |
| 11 | Make/external-handoff evidence without unauthorized send | Observe-only: homework Uploaded + Canonical + Storage Key present for Schmidt test assets (count=3); trigger queue=0 | **PASS** (observe) |
| 12 | No live mutation / no CURRENT-TRUTH / CHANGELOG / Master list / 057/058 | This branch: audit doc only | **PASS** |

---

## Send to Make Trigger ownership (independent assessment)

### Graph proof

Before SC-156 publish, soft failures returned from the script without throwing, so Airtable continued to Update `wacpcvzcDB1KKjaKI` and nulled `Send to Make Trigger`. That node is now **absent** from the deployed graph. Soft-failure returns no longer hit a companion clear.

### Script ownership (v4.7)

| Path | Trigger behavior |
|------|------------------|
| Verified Lambda success (`uploaded` + `allPass`, or Lambda `skipped_already_uploaded`) | Clears trigger; clears Upload Error |
| Local Canonical/S3 gate `skipped_already_uploaded` | Clears trigger intentionally |
| Accepted async (`Accepted`) | Leaves trigger for 070c |
| Webhook throw / non-2xx | Writes Upload Error; **retains** trigger (`uncheckTrigger: false`) |
| Invalid / unverified Lambda body | Writes Upload Error; **retains** trigger (`stopWithLambdaHandoffFailure`) |
| Hard local data errors via `stopWithAssetUpdate` | Default `uncheckTrigger: true` (stop endless re-fire until data fixed) |

**Conclusion:** After publish, retryability for soft Make/Lambda failures is restored. Trigger clearing is script-owned (plus 070c for async), not a post-script Update.

---

## Idempotency / duplicate handoff

1. **Pre-webhook gate:** Canonical File URL present OR (`Upload Status=Uploaded` AND Storage Key) → `actionOut=skipped_already_uploaded`, no Make POST.  
2. **Post-webhook:** Lambda `skipped_already_uploaded` is a verified success handoff; trigger cleared.  
3. **Live observe:** 3 homework assets already Uploaded with Canonical File URL + Storage Key (Schmidt test path) — ready for skip-path if coordinator re-arms trigger; this agent did not arm triggers or send.

---

## Failure / stranded detectability

| Signal | Use |
|--------|-----|
| `Upload Error` | Soft/hard failure text |
| `Send to Make Trigger` still checked | Soft fail / accepted-async pending |
| `Upload Status` | Error / Pending Link / Processing / Uploaded |
| Automation run history | `statusOut`, `actionOut`, `errorOut`, `debugStep` |

**Queue scan (2026-09-04, observe-only):**

| Filter (Homework Completions) | Count |
|-------------------------------|-------|
| Send to Make Trigger = true | 0 |
| Upload Status = Error | 0 |
| Upload Error not empty | 0 |
| Upload Status = Uploaded + Canonical present | 3 |

No stranded homework retry queue at scan time.

---

## Residual risks

1. **No live soft-failure fire this pass** — retry retention after webhook/Lambda error is proven by graph+code, not a new intentional fail run.  
2. **Accepted async** still depends on companion **070c** clearing the trigger after writeback (out of SC-156 remove-Update scope; not modified).  
3. **Make/Lambda health** not re-E2E’d with a fresh upload send (intentionally avoided unauthorized recipients).  
4. Hard local validation errors still clear the trigger by design — operators must fix data and re-arm to retry.  
5. Trigger still requires Upload Status **Pending Link** (not Ready) — documented historical contract; unchanged.

---

## Constraints honored

- No live Airtable graph/script edits  
- No CURRENT-TRUTH / CHANGELOG / Master Future Work List edits  
- No 057/058 / Season Sim / field deletes / broad email  
- No secrets, webhook URLs, or record IDs in this document  

---

## References

- Prior defect: [`SC-156-070A-ENABLED-OBSERVABILITY-20260904.md`](./SC-156-070A-ENABLED-OBSERVABILITY-20260904.md)  
- Publish checklist: [`docs/deploy-checklists/SC-156-070a-remove-post-clear-trigger-20260904.md`](../deploy-checklists/SC-156-070a-remove-post-clear-trigger-20260904.md)  
- Repo script: `airtable/automations/shooting-challenge/070a-email-notifications-and-external-handoffs-send-homework-asset-payload-to-make.js`
