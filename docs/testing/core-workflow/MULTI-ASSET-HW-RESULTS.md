# SC-MULTI-ASSET-HW Results — 2026-08-30

| Item | Result |
|------|--------|
| Harness | `tools/testing/sc-multi-asset-homework.mjs` |
| Operator runbook | [`MULTI-ASSET-HW-OPERATOR-RUNBOOK.md`](./MULTI-ASSET-HW-OPERATOR-RUNBOOK.md) |
| Enrollment | Testing3 `recNu6fcBpF1GG3u5` (disposable) |
| Week / PHA | Early Bird `recBrZ1sV8byWEHZU` · HW1 `recgj8dPk4ouTwCOj` · HW2 `recXXZErbjxxGxWw2` |
| Live 020 multi-asset → one HC | **PASS** (2026-08-30 apply) |
| Correct assignment identity | **PASS** (Enrollment + PHA + Week + library + official HW1 slot) |
| Both assets linked | **PASS** |
| No duplicate HC (same Enrollment+PHA) | **PASS** (second asset linked existing) |
| Different slot isolation (HW2) | **PASS** (separate HC) |
| Missing PHA fail-safe | **PASS** (`Upload Status=Error`) |
| Satisfactory grading arms 064 | **PASS** (`Total Homework XP Awarded=35`, `Award Status=Pending`, `Reconcile Needed=1`) |
| **065 `recordId` dynamic remap** | **DONE** (Mike corrected in Airtable UI 2026-08-30) |
| Exactly one `HOMEWORK_XP\|{hcId}` via live 065 | **PENDING** — final `--apply` after remap |
| Email / Make / Resend | **Not invoked** (handoff queue empty; Make trigger cleared; Parent Feedback not armed) |
| Automation paste | **None** |

## Final XP proof (Mike desktop — pending)

**Command:**

```bash
node tools/testing/sc-multi-asset-homework.mjs --apply
```

**PASS when:** exit code 0, `"passed": true`, and `065.xp_source_key_exact` shows Source Key `HOMEWORK_XP|{HomeworkCompletionID}` with count 1.

**FAIL when:** exit code 1, zero XP, multiple XP, wrong Source Key, duplicate HC, or email handoff.

Full steps: [`MULTI-ASSET-HW-OPERATOR-RUNBOOK.md`](./MULTI-ASSET-HW-OPERATOR-RUNBOOK.md).

## Prior apply (pre-remap — 065 blocked)

Live Automation **065** script input `recordId` was hardcoded to deleted HC `reccYReUfSId2MH1S` (020 correctly used dynamic trigger). Mike remapped 065 in UI per:

[`docs/deploy-checklists/065-recordId-dynamic-remap-operator-packet.md`](../../deploy-checklists/065-recordId-dynamic-remap-operator-packet.md)

## Evidence

| Run | File |
|-----|------|
| Pre-remap apply (020 PASS, 065 blocked) | [`apply-2026-08-30T191216579Z.json`](../evidence/sc-multi-asset-homework/apply-2026-08-30T191216579Z.json) |
| Template for final proof | [`EVIDENCE-TEMPLATE.json`](../evidence/sc-multi-asset-homework/EVIDENCE-TEMPLATE.json) |
| Final proof (after Mike `--apply`) | `apply-YYYY-MM-DD….json` — fill row after run |
| Cleanup | [`cleanup-2026-08-30-mcp.json`](../evidence/sc-multi-asset-homework/cleanup-2026-08-30-mcp.json) |

## Cleanup limitations

| Item | Note |
|------|------|
| PAT DELETE | 403 on WAS / XP / HC — MCP or UI cleanup |
| Shared Early Bird Week | Not deleted (calendar config) |
| Shared Testing3 WAS | Kept (`recIwx50zhNsUqV1L`) |
| Duplicate WAS | Harness deletes `recb1hq4wJKfBcy6z` when PAT allows |
