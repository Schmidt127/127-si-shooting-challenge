# SC-156 — 070a Implementation and Functional Test

**Date:** 2026-09-04  
**Agent:** A2 — Implementation and Functional Test (`fix/sc-156-070a-remove-clear-a2`)  
**Base:** Production `appn84sqPw03zEbTT`  
**Automation:** 070a · `wflIYVOmRRaHu9cl2`  
**Authority:** Agent 1 change contract `SC-156-070A-LIVE-TRUTH-AND-CHANGE-CONTRACT-20260904.md`  
**Mike UI steps:** `SC-156-070A-MIKE-PUBLISH-CHECKLIST-20260904.md`

---

## Task Classification

| Field | Value |
|-------|-------|
| Type | Implementation + disposable functional test |
| Priority | P1 |
| Backlog ID | **SC-156** |
| Phase | 3 Implementation |
| Correct tool | Cursor + Airtable MCP (draft attempt) + Mike UI publish |
| Repo | `127-si-shooting-challenge` |
| Mike's role | Publish graph change (required); then optional matrix with Agent |

---

## 1. MCP draft edit result

| Item | Result |
|------|--------|
| A1 branch merged | Yes — fast-forward `audit/sc-156-070a-live-truth-a1` → this branch |
| MCP `get_automation` pre-edit | Script `wacZVMXuabTetYmQ7` + Update `wacpcvzcDB1KKjaKI`; draft === deployed |
| MCP `update_automation` attempt | **FAILED (safe)** — `isValid: false` |
| Error | `readOnlyNodeType` / `customScript` cannot be edited through the API; edit in Airtable UI |
| Draft corrupted? | **No** — rejection only; no `actionId` returned |
| Post-attempt re-get | Unchanged: both nodes present; v4.7; inputs `recordId` / `webhookUrl` / `automationNumber=070a`; `deployedVersion` null |
| Publish via MCP | **Impossible** (tool cannot publish) |
| Mike UI publish still required | **Yes** |

**Conclusion:** Agent 2 cannot remove node `wacpcvzcDB1KKjaKI` via MCP without rewriting `customScript`, which API blocks. Removal + publish are UI-only.

---

## 2. Target vs live (post A2, pre Mike publish)

| Check | Target | Live now |
|-------|--------|----------|
| Script node `wacZVMXuabTetYmQ7` | Keep | Present |
| Script body | v4.7 unchanged | v4.7 |
| Inputs | recordId, webhookUrl, automationNumber=070a | Same |
| Update node `wacpcvzcDB1KKjaKI` | **Removed** | **Still present** |
| Trigger (9 AND conditions) | Unchanged | Unchanged |
| Published graph script-only | Required for SC-156 complete | **Not yet** |

**SC-156 is not complete.** Live published graph still includes the obsolete clear step.

---

## 3. Functional test matrix

**Status: BLOCKED_ON_PUBLISH**

Disposable live fires were **not** run against Production 070a while the post-script Update remains published. Running success/failure cases now would still clear **Send to Make Trigger** via `wacpcvzcDB1KKjaKI` on soft-fail returns and would not prove SC-156.

| # | Scenario | Expected after publish | Result |
|---|----------|------------------------|--------|
| T1 | Schmidt homework asset with Canonical already present → set Send to Make Trigger | Script `skipped_already_uploaded`; trigger cleared by **script**; no duplicate Make handoff | **BLOCKED_ON_PUBLISH** |
| T2 | Soft-fail retention (`uncheckTrigger: false`) — prefer webhook/Lambda fail; no broad email; temporary invalid webhook only if immediately restorable | Upload Error set; **Send to Make Trigger remains checked**; no silent miss | **BLOCKED_ON_PUBLISH** — see §4 code-path proof |
| T3 | Retry after failure while trigger retained | Re-enter conditions / re-run can attempt again | **BLOCKED_ON_PUBLISH** |
| T4 | Re-fire / idempotency on already-uploaded | No duplicate external upload handoff; skip path | **BLOCKED_ON_PUBLISH** |
| T5 | No stranded silent miss | Upload Error / trigger / status visible on fail | **BLOCKED_ON_PUBLISH** |

### Cleanup status

No disposable records created this pass → **cleanup N/A (nothing created)**.

---

## 4. Soft-fail retention — graph-level + code-path proof (pre-publish)

Until publish, live graph still runs Update `wacpcvzcDB1KKjaKI` after every non-throwing script return, nulling `fld8C43NVQQ1NeQ7Z`.

v4.7 paths that set `uncheckTrigger: false` or omit trigger clear (retain for retry / 070c):

| Path | Script behavior | Trigger intended | Live bug with post-Update |
|------|-----------------|------------------|---------------------------|
| Make webhook `fetch` throws | `error_webhook_request`, write Upload Error | Retain | Post-step clears → not retryable |
| Make non-2xx | `error_webhook_response`, write Upload Error | Retain | Post-step clears |
| Invalid Lambda JSON on 2xx | `error_lambda_response_invalid` via `stopWithLambdaHandoffFailure` | Retain | Post-step clears |
| Unverified / incomplete writeback / explicit Lambda failures | `stopWithLambdaHandoffFailure` | Retain | Post-step clears |
| `accepted_async` | Leave trigger for 070c | Retain | Post-step clears → breaks 070c contract |

Hard throw paths (missing inputs, etc.) do not reach the Update node today; those are unchanged by SC-156.

**Safe soft-fail test preference after publish:** temporary invalid webhook binding **only if** restored immediately after the run. Prefer not to use broad email. If webhook swap is too risky, attest from run history + Upload Error + trigger checkbox on a Schmidt-only asset without swapping secrets.

---

## 5. Deliverables

| Deliverable | Path / note |
|-------------|-------------|
| Implementation + test matrix | This file |
| Mike publish checklist | `docs/audits/SC-156-070A-MIKE-PUBLISH-CHECKLIST-20260904.md` |
| Deploy checklist (pre-existing) | `docs/deploy-checklists/SC-156-070a-remove-post-clear-trigger-20260904.md` |
| A1 contract (merged) | `docs/audits/SC-156-070A-LIVE-TRUTH-AND-CHANGE-CONTRACT-20260904.md` |
| CURRENT-TRUTH / CHANGELOG / Master list | **Not edited** (coordinator) |

---

## 6. Coordinator return

| Field | Value |
|-------|-------|
| MCP draft edit succeeded? | **No** (rejected; safe; no corruption) |
| Mike UI publish still required? | **Yes** — see publish checklist |
| Test matrix | **BLOCKED_ON_PUBLISH** |
| Cleanup | N/A (no fixtures created) |
| Commit SHA | Branch tip on `origin/fix/sc-156-070a-remove-clear-a2` (includes A1 `14eaa0db` + A2 docs). Coordinator: use `git rev-parse origin/fix/sc-156-070a-remove-clear-a2`. |
| Blockers | Mike must delete Update node `wacpcvzcDB1KKjaKI` and **Update/Publish** in UI; then re-get and run matrix |

---

## 7. Holds observed

Season Simulation not run. No field deletes. No 057/058 changes. No broad email. No webhook URL / record IDs / secrets in docs.
