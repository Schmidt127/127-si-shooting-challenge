# SC-156 — Automation 070a enabled-state + observability (SF-06)

**Date:** 2026-09-04  
**Agent:** A3 P1 (`fix/sc-154-156-p1-workflows-a3`)  
**Base:** Production `appn84sqPw03zEbTT`  
**Verdict:** **Enabled-state attested LIVE/deployed (docs were stale OFF).** **Retry observability defect found and remediated in repo + publish checklist** (post-script step cleared `Send to Make Trigger`).

---

## Task Classification

| Field | Value |
|-------|-------|
| Type | External handoff / Make upload reliability |
| Priority | P1 |
| Backlog ID | **SC-156** (SF-06) |
| Phase | 3 Implementation / 5 Close |

---

## Live attestation (MCP `get_automation`)

| Field | Live truth |
|-------|------------|
| automationId | `wflIYVOmRRaHu9cl2` |
| Name | 070a - Email, Notifications, and External Handoffs - Send Homework Asset Payload to Make |
| deploymentStatus | **deployed** (ON) |
| Script version | **v4.7** |
| Input `automationNumber` | `070a` |
| Trigger | `recordMatchesConditions` on Submission Assets (`tblhMLKxQK77agtME`) |
| Intended output | POST homework asset payload to Make (`routeKey=homework_completion`); write Upload Error / clear trigger only on verified success paths |

### Trigger conditions (summary)

All AND:

- `Send to Make Trigger` = true  
- `Ready to Send to Make?` contains `READY_TO_SEND`  
- `Upload Status` = specific select (ready option)  
- Canonical/storage empty gate field empty  
- `Upload Destination` = `Homework Completions`  
- Required links/attachment fields non-empty  

(Exact field IDs attested via MCP; webhook URL **redacted** — never commit.)

### Graph defect (evidence-supported)

Live nodes:

1. `customScript` (070a/070b shared body v4.7) — retains `Send to Make Trigger` on webhook/Lambda failure (`uncheckTrigger: false`).  
2. **`updateRecord` node `wacpcvzcDB1KKjaKI`** — sets `Send to Make Trigger` (`fld8C43NVQQ1NeQ7Z`) to **null** after the script.

Because soft failures **return** (do not throw), the second step still runs and **clears the trigger**, defeating retryability and making failures look “done.”

**Fix:** Remove the post-script Update record step. Script already clears the trigger on verified success / `skipped_already_uploaded`.

Publish steps: [`docs/deploy-checklists/SC-156-070a-remove-post-clear-trigger-20260904.md`](../deploy-checklists/SC-156-070a-remove-post-clear-trigger-20260904.md).

---

## Observability (safe verification — no broad email)

| Signal | Behavior |
|--------|----------|
| `Upload Error` | Written on failure paths |
| `Send to Make Trigger` | Must remain checked after failure (after publish fix) |
| Automation run history | statusOut/actionOut/errorOut/debugStep |
| Current HW Error/Trigger queue | **0** rows at scan (no live stuck homework assets) |

**Do not** arm `Send to Make Trigger` on non-Schmidt assets. No broad parent email path on 070a (Make upload only).

Idempotent safe path without new upload: assets already Canonical/Uploaded skip with `skipped_already_uploaded` and clear trigger intentionally.

---

## Doc alignment

| Doc | Prior claim | Corrected |
|-----|-------------|-----------|
| `docs/v2/AUTOMATION_070A_LAUNCH_DECISION.md` | Keep PROD OFF | **LIVE deployed** as of 2026-09-04 attestation; historical OFF decision superseded; long-term policy still Mike-owned |
| `PROJECT_STATE` / inventory | Mixed OFF vs Live notes | Coordinator may reconcile centrally; this audit is authority for 070a ON/OFF for SC-156 |

---

## Code / live changes

| Change | Result |
|--------|--------|
| Repo script `070a-…js` | Docblock warning: never add companion Update that clears trigger |
| Live Airtable | **Mike publish required** — delete Update record step per checklist (MCP draft-only cannot publish) |
| Rollback | `airtable/rollbacks/20260904-sc154-156/070a-v4.7-pre-wave.js` + README |

---

## Remaining risk

- Until the Update record step is removed **and published**, failure retries remain compromised.  
- Long-term ON vs OFF storage policy still needs Mike confirmation (homework S3 vs Airtable attachments).  
- Make/Lambda route health not re-E2E’d this pass (no broad send).
