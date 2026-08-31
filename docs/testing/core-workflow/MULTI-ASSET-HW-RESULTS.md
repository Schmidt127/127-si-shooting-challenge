# SC-MULTI-ASSET-HW Results — COMPLETE 2026-08-31

| Item | Result |
|------|--------|
| Harness | `tools/testing/sc-multi-asset-homework.mjs` |
| Operator runbook | [`MULTI-ASSET-HW-OPERATOR-RUNBOOK.md`](./MULTI-ASSET-HW-OPERATOR-RUNBOOK.md) |
| Enrollment | Testing3 `recNu6fcBpF1GG3u5` (disposable) |
| Week / PHA | Early Bird `recBrZ1sV8byWEHZU` · HW1 `recgj8dPk4ouTwCOj` · HW2 `recXXZErbjxxGxWw2` |
| Live 020 multi-asset → one HC | **PASS** |
| Correct assignment identity | **PASS** (Enrollment + PHA + Week + library + official HW1 slot) |
| Both assets linked | **PASS** |
| No duplicate HC (same Enrollment+PHA) | **PASS** |
| Different slot isolation (HW2) | **PASS** (separate HC) |
| Missing PHA fail-safe | **PASS** (`Upload Status=Error`) |
| Satisfactory grading arms 064 | **PASS** (`Total Homework XP Awarded=35`, then Awarded) |
| **065 `recordId` dynamic remap** | **DONE** (UI; no script paste) |
| Exactly one `HOMEWORK_XP\|{hcId}` via live 065 | **PASS** |
| Duplicate Homework XP | **None** (`xpCount=1`) |
| Email / Make / Resend | **Not invoked** on harness apply path (Make trigger cleared) |
| Automation paste | **None** (remap + trigger re-entry only) |
| Workflow status | **COMPLETE** |

## Closeout path (065)

1. **2026-08-30:** Live 020 PASS; 065 blocked by hardcoded `recordId=reccYReUfSId2MH1S`.
2. **Remap:** Live 065 `recordId` → `{ "$ref": "trigger", "path": ["id"] }` (no script paste).
3. **2026-08-31 apply:** 020 PASS; 065 still did not fire — HC `rec8E94Jg7mpmuMW9` stayed at `Reconcile Needed=1` with empty `Last Homework XP Reconciled Signature` (`recordMatchesConditions` never re-entered).
4. **Manual trigger re-entry** after remap → 065 created exactly one XP Event.

### Proven XP

| Field | Value |
|-------|--------|
| HC | `rec8E94Jg7mpmuMW9` |
| Source Key | `HOMEWORK_XP\|rec8E94Jg7mpmuMW9` |
| XP Event | `recwpzl8pkXecUqRK` (created `2026-08-31T12:35:11Z`) |
| Points / bucket | 35 / Homework Completion |
| Award Status | Awarded |
| Reconcile Needed | 0 |
| Duplicate count | **0** (exactly one row) |

## Evidence

| Run | File |
|-----|------|
| Pre-remap apply (020 PASS, 065 blocked) | [`apply-2026-08-30T191216579Z.json`](../evidence/sc-multi-asset-homework/apply-2026-08-30T191216579Z.json) |
| Post-remap apply (065 still blocked by trigger re-entry) | [`apply-2026-08-31T122146465Z.json`](../evidence/sc-multi-asset-homework/apply-2026-08-31T122146465Z.json) |
| Closeout (exactly one XP) | [`closeout-2026-08-31-065-xp.json`](../evidence/sc-multi-asset-homework/closeout-2026-08-31-065-xp.json) |
| Operator packet | [`../../deploy-checklists/065-recordId-dynamic-remap-operator-packet.md`](../../deploy-checklists/065-recordId-dynamic-remap-operator-packet.md) |
| Cleanup (partial) | [`cleanup-2026-08-30-mcp.json`](../evidence/sc-multi-asset-homework/cleanup-2026-08-30-mcp.json) |
| PR | [#306](https://github.com/Schmidt127/127-si-shooting-challenge/pull/306) |

## Cleanup limitations

| Item | Note |
|------|------|
| PAT DELETE | 403 on some tables — MCP or UI cleanup |
| Shared Early Bird Week | Not deleted (calendar config) |
| Shared Testing3 WAS | Kept (`recIwx50zhNsUqV1L`) |
| Disposable HC / XP | Retained as closeout proof unless Mike cleans later |
