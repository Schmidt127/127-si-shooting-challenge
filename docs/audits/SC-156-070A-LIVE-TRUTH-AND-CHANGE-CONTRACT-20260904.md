# SC-156 — 070a Live Truth and Change Contract

**Date:** 2026-09-04  
**Agent:** A1 — Live Truth and Rollback (`audit/sc-156-070a-live-truth-a1`)  
**Base:** Production `appn84sqPw03zEbTT`  
**Method:** Airtable MCP `get_automation` with `includeDeployedVersion=true` (read-only; no live writes)  
**Companion:** [`SC-156-070A-ENABLED-OBSERVABILITY-20260904.md`](./SC-156-070A-ENABLED-OBSERVABILITY-20260904.md)  
**Publish checklist:** [`docs/deploy-checklists/SC-156-070a-remove-post-clear-trigger-20260904.md`](../deploy-checklists/SC-156-070a-remove-post-clear-trigger-20260904.md)

---

## Task Classification

| Field | Value |
|-------|-------|
| Type | Live attestation / change contract (no Airtable mutation) |
| Priority | P1 |
| Backlog ID | **SC-156** |
| Phase | 3 Implementation support / 5 Close prep |
| Correct tool | Cursor + Airtable MCP read |
| Repo | `127-si-shooting-challenge` |
| Mike's role | Publish graph change after Agent 2 (or UI) removes obsolete node |

---

## 1. Live config attestation

| Item | Live truth (MCP 2026-09-04) |
|------|-----------------------------|
| automationId | `wflIYVOmRRaHu9cl2` |
| Name | 070a - Email, Notifications, and External Handoffs - Send Homework Asset Payload to Make |
| deploymentStatus | **deployed** |
| deploymentError | null |
| configurationStatus | **valid** |
| deployedVersion | **null** (draft === currently published; no unpublished draft delta) |
| Trigger type | `recordMatchesConditions` |
| Trigger table | Submission Assets `tblhMLKxQK77agtME` |
| Script node | `wacZVMXuabTetYmQ7` (`customScript`) |
| Script version (body) | **v4.7** (`CONFIG.version`; Last Updated 2026-08-21) |
| Post-script Update | **`wacpcvzcDB1KKjaKI`** (`updateRecord`) — **present / obsolete for SC-156** |
| Webhook input | Present as `webhookUrl` (value **redacted** in docs/rollback JSON) |

### Script input variables (live)

| Input key | Binding |
|-----------|---------|
| `recordId` | `$ref` → trigger `id` |
| `webhookUrl` | literal Make Upload Engine URL (**redacted**) |
| `automationNumber` | literal `"070a"` |

Script also accepts alias `makeWebhookUrl`; live graph uses `webhookUrl`.

### Declared script outputs (outputSchema)

`debugStep`, `statusOut`, `actionOut`, `errorOut`, `ok`, `skipped`, `submissionAssetRecordId`, `targetRecordId`, `targetTable`, `routeKey`, `uploadDestination`, `automationNumber`, `makeStatus`, `makeResponse`, `makeResponseMode`

### Trigger conditions (all AND)

| # | Field ID | Field name | Operator | Value |
|---|----------|------------|----------|-------|
| 1 | `fld8C43NVQQ1NeQ7Z` | Send to Make Trigger | `=` | `true` |
| 2 | `fldG5lWlsUcrDNlIg` | Ready to Send to Make? | `contains` | `READY_TO_SEND` |
| 3 | `fldPybPEvRcEVuNWl` | Upload Status | `=` | choice `sel1x03bVpyf2dCcO` = **Pending Link** |
| 4 | `fld3O3MhDPbgyVw4f` | Reviewer File URL | `isEmpty` | — |
| 5 | `fldox2Rjj9YL3EYK6` | Upload Destination | `=` | `Homework Completions` |
| 6 | `flddRCbWCegg4WCoZ` | Submission - Linked | `isNotEmpty` | — |
| 7 | `fldJRSvui8RPg0Vyb` | Enrollment - Linked | `isNotEmpty` | — |
| 8 | `fldrGt7IsWDUAKfzD` | Airtable Attachment | `isNotEmpty` | — |
| 9 | `fldQF8OsfESrHdcUb` | Homework Completions | `isNotEmpty` | — |

**Attestation note:** Prior observability summary called Upload Status a “ready option.” Live MCP shows choice **Pending Link**, not Ready. Agent 2 must **not** change trigger conditions unless Mike explicitly expands scope.

### Action sequence (exact order)

1. **Run a script** — `wacZVMXuabTetYmQ7`  
2. **Update record** — `wacpcvzcDB1KKjaKI` (SC-156 remove target)

---

## 2. Exact post-script Update record action

| Property | Value |
|----------|-------|
| Node key / id | `wacpcvzcDB1KKjaKI` |
| Type | `updateRecord` |
| Table | Submission Assets `tblhMLKxQK77agtME` |
| Row | trigger record id |
| Method | `customFields` |
| Field | `fld8C43NVQQ1NeQ7Z` — **Send to Make Trigger** |
| Value | **`null`** (clears checkbox) |

No other fields are written by this node.

---

## 3. Why the script (not post-script) must own trigger clearing

v4.7 clears **Send to Make Trigger** only on intentional terminal paths:

- Verified Lambda success (`uploaded` + `writebackVerification.allPass`, or `skipped_already_uploaded`)
- Local skip `skipped_already_uploaded` (Canonical/S3 already present)
- Other `stopWithAssetUpdate` paths that default `uncheckTrigger: true` for hard local errors that should not re-fire endlessly

v4.7 **retains** the trigger (`uncheckTrigger: false` / no uncheck) when:

- Make webhook request throws
- Make returns non-2xx
- Lambda JSON invalid / unverified / writeback incomplete / explicit failure actions

Those failure paths **return** (set outputs / write Upload Error) **without throwing**. Airtable therefore continues to the next graph action. The post-script Update always runs and nulls the trigger, so failures look finished and are **not retryable** via the same conditions trigger.

**Accepted async** (`makeResponseMode=accepted_async`) intentionally leaves the trigger set for **070c** writeback verification — a blanket post-clear also breaks that companion contract.

Therefore: remove the companion Update; leave trigger ownership inside the script (and 070c for async).

---

## 4. Success / failure / retry lifecycle (intended after SC-156)

| Path | Script behavior | Trigger after script | Post-script Update (today) | Desired after remove |
|------|-----------------|----------------------|----------------------------|----------------------|
| Verified success | Clear trigger + clear Upload Error | Off | Also clears (redundant) | Off (script only) |
| `skipped_already_uploaded` | Clear trigger | Off | Also clears | Off (script only) |
| Webhook / Lambda soft fail | Write Upload Error; retain trigger; return | Still On | **Clears → BUG** | Remains On → retryable |
| Accepted async | Leave trigger; 070c clears later | On | **Clears → BUG** | Remains On for 070c |
| Hard throw (missing inputs, etc.) | Throw | N/A (run fails) | Does not run | Unchanged |

Retry signal after fix: **Send to Make Trigger still checked** + **Upload Error** populated + automation run history `statusOut=error` / `actionOut=error_*`.

---

## 5. CHANGE CONTRACT for Agent 2

### Remove (only)

- Delete action node **`wacpcvzcDB1KKjaKI`** (`updateRecord` that sets `Send to Make Trigger` / `fld8C43NVQQ1NeQ7Z` to `null`).

### Must remain unchanged

- Automation id `wflIYVOmRRaHu9cl2` and name
- Trigger type, table, and all nine AND conditions (including Upload Status = Pending Link)
- Script node `wacZVMXuabTetYmQ7` identity
- Script body **v4.7** (do not paste unrelated edits; do not change 057/058)
- Input bindings: `recordId` ← trigger id, `webhookUrl` (same secret value), `automationNumber=070a`
- Script `outputSchema` list
- `deploymentStatus` must stay **deployed** after publish
- Do not add a replacement Update that clears the trigger
- Do not send email; do not run Season Simulation; do not delete fields

### Target graph after change

1. Trigger (unchanged)  
2. Run a script `wacZVMXuabTetYmQ7` only  

### Publish

- If Agent 2 uses MCP `update_automation`: edits **draft only**. Live behavior unchanged until Mike clicks **Update / Publish** in Airtable UI.
- Confirm `get_automation` shows node `wacpcvzcDB1KKjaKI` absent and `deployedVersion` null (or draft matches deployed) after publish.

### Out of scope

- 057 / 058  
- 070b / 070c logic changes  
- Trigger condition redesign  
- Script version bumps  
- Master Future Work List / CURRENT-TRUTH / CHANGELOG (coordinator closeout)

---

## 6. Publish capability assessment (API vs UI)

| Capability | Assessment |
|------------|------------|
| MCP `get_automation` | Confirmed — full draft graph + script; `includeDeployedVersion=true` returned `deployedVersion: null` |
| MCP `update_automation` | **Can replace entire draft** (trigger + nodes + name). Full replacement required; preserve script node key `wacZVMXuabTetYmQ7` and omit `wacpcvzcDB1KKjaKI`. |
| MCP publish / Update | **Not available** via this tool. Docs: live behavior unchanged until unpublished changes are applied with **Update in the Airtable UI**. |
| Recoverability | `revert_action` may undo a draft `update_automation` if an `actionId` is returned; still does not publish. Graph rollback snapshot files below support manual UI restore. |

**Recommendation:** Agent 2 may draft-edit via MCP **or** Mike may delete the node in UI; either way Mike must **Update/Publish**. Prefer UI delete if draft replace risk (full graph rewrite) is a concern.

---

## 7. Rollback artifacts

| Path | Contents |
|------|----------|
| `airtable/rollbacks/20260904-sc154-156/070a-get-automation-live-snapshot-20260904.json` | Full MCP `get_automation` response; webhook redacted |
| `airtable/rollbacks/20260904-sc154-156/070a-graph-action-order-20260904.json` | Lean trigger + action order + field mappings |
| `airtable/rollbacks/20260904-sc154-156/070a-v4.7-pre-wave.js` | Script body v4.7 (pre-wave) |
| `airtable/rollbacks/20260904-sc154-156/README.md` | Index (updated this pass) |

**Rollback of SC-156 graph change (not recommended):** re-add Update record clearing Send to Make Trigger only if intentionally reverting. Prefer keeping script-owned clearing.

---

## 8. Blockers

| Blocker | Status |
|---------|--------|
| Live Airtable mutation | None for A1 (read-only complete) |
| Unpublished draft drift | None — `deployedVersion` null |
| Secrets in public docs | Mitigated — webhook redacted |
| Publish authority | Mike UI Update still required after Agent 2 |
| Agent 2 dependency | Graph removal + publish not done by A1 (by design) |

---

## 9. Evidence / related

- Prior node evidence: `docs/testing/evidence/sc-154-156/live-070a-nodes-20260904.json`  
- Repo script: `airtable/automations/shooting-challenge/070a-email-notifications-and-external-handoffs-send-homework-asset-payload-to-make.js`
