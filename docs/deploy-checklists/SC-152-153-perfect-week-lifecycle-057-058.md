# Deploy — SC-152 / SC-153 Perfect Week lifecycle (057 v2.4 + 058 v1.7)

**Date:** 2026-09-04  
**Base:** Production `appn84sqPw03zEbTT`  
**Why UI paste:** Airtable MCP `update_automation` rejects graphs that contain `customScript` (`readOnlyNodeType`). Scripts and trigger edits for 057/058 must be applied in the Airtable UI.

## Already live (attested 2026-09-04)

| Item | Status |
|------|--------|
| Checkbox `Perfect Week Recalc Needed?` | Present |
| Queue formula `Perfect Week Calculation Queue?` | Pending **OR** Recalc Needed |
| **057 script v2.4** | **Live / attested** — SF-01 Recalc re-entry PASS |
| **058 trigger** | **Live** `recordUpdated` with approved nine watched fields (Unlock not watched) |
| **058 script** | Live **v1.6** — create/award/restore PASS; **withdraw FAILS** (Coach Note query bug) |
| Pre-change rollbacks | `airtable/rollbacks/20260904-pre-sc152-153/` |

## Remaining Mike paste (058 v1.7 only)

1. Open automation `wflDinFz6FBIGEOMg` (058 Create Perfect Week Unlock).
2. Keep the current **When record updated** trigger and nine watched fields (do **not** re-add positive-only conditions; do **not** watch Perfect Week Unlock).
3. Replace script with GitHub paste body from `airtable/automations/shooting-challenge/058-achievements-and-milestones-create-perfect-week-unlock.js` (**skip GitHub sync banner**; paste from production docblock / `Version: 1.7`).
4. Confirm `recordId` = triggering record.
5. Update / publish.
6. Disposable withdraw re-test: Active unlock + drop Video Count → unlock Inactive + `058 skipped:…` (not Coach Note QueryResult error).

## Historical Mike paste (completed)

### 1) Automation 057 — script (DONE)

Live **v2.4**. Trigger remains Queue?=1.

### 2) Automation 058 — trigger + script v1.6 (DONE; superseded by v1.7 for withdraw)

Lifecycle trigger + nine fields attested. v1.6 body created unlock + XP; withdraw hotfix = v1.7.

## Operator reconciliation

WAS filter: `Perfect Week Recalc Needed?` checked **OR** (`Queue? = 1` AND Status not progressing) **OR** Automation Error not empty.

## Rollback

Restore trigger JSON + script bodies from `airtable/rollbacks/20260904-pre-sc152-153/` if needed.
