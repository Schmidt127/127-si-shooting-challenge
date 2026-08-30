# SC-MULTI-ASSET-HW Results — 2026-08-30

| Item | Result |
|------|--------|
| Harness | `tools/testing/sc-multi-asset-homework.mjs` |
| Enrollment | Testing3 `recNu6fcBpF1GG3u5` (disposable) |
| Week / PHA | Early Bird `recBrZ1sV8byWEHZU` · HW1 `recgj8dPk4ouTwCOj` · HW2 `recXXZErbjxxGxWw2` |
| Live 020 multi-asset → one HC | **PASS** |
| Correct assignment identity | **PASS** (Enrollment + PHA + Week + library + official HW1 slot) |
| Both assets linked | **PASS** |
| No duplicate HC (same Enrollment+PHA) | **PASS** (second asset linked existing) |
| Different slot isolation (HW2) | **PASS** (separate HC) |
| Missing PHA fail-safe | **PASS** (`Upload Status=Error`) |
| Satisfactory grading arms 064 | **PASS** (`Total Homework XP Awarded=35`, `Award Status=Pending`, `Reconcile Needed=1`) |
| Exactly one `HOMEWORK_XP\|{hcId}` via live 065 | **PENDING** — desktop `--apply` after dynamic `recordId` remap (2026-08-30) |
| Email / Make / Resend | **Not invoked** (handoff queue empty; Make trigger cleared; Parent Feedback not armed) |
| Automation paste | **None** |

## Defect (Airtable configuration — resolved 2026-08-30)

During the 2026-08-30 apply run, live Automation **065** script input `recordId` was hardcoded to deleted HC `reccYReUfSId2MH1S` instead of `{ "$ref": "trigger", "path": ["id"] }` (compare to healthy **020**). **Mike remapped 065 to dynamic trigger Record ID** the same day.

Operator packet (historical — UI remap only — **do not repaste 065 script**):

[`docs/deploy-checklists/065-recordId-dynamic-remap-operator-packet.md`](../../deploy-checklists/065-recordId-dynamic-remap-operator-packet.md)

**Remaining:** Mike desktop re-run `node tools/testing/sc-multi-asset-homework.mjs --apply` to confirm exactly one `HOMEWORK_XP|{hcId}`.

## Evidence

- Apply: [`../evidence/sc-multi-asset-homework/apply-2026-08-30T191216579Z.json`](../evidence/sc-multi-asset-homework/apply-2026-08-30T191216579Z.json)
- Cleanup: MCP deleted disposable HC / assets / submissions; duplicate WAS `recb1hq4wJKfBcy6z` deleted; kept shared WAS `recIwx50zhNsUqV1L`

## Cleanup limitations

| Item | Note |
|------|------|
| PAT DELETE | 403 on WAS / some tables — MCP cleanup used |
| Shared Early Bird Week | Not deleted (calendar config) |
| Shared Testing3 WAS | Kept |
| XP Events | None created during 2026-08-30 apply (065 was misconfigured; remap done; re-proof pending) |
