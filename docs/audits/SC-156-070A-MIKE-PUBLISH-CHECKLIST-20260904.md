# SC-156 — Mike publish checklist (070a remove post-script clear)

**Date:** 2026-09-04  
**Agent:** A2 — Implementation (`fix/sc-156-070a-remove-clear-a2`)  
**Base:** Production `appn84sqPw03zEbTT`  
**Automation:** 070a · `wflIYVOmRRaHu9cl2`  
**Why UI:** MCP `update_automation` **rejects** graphs that contain `customScript` (`readOnlyNodeType`). Draft graph was **not** changed. Live still has obsolete Update node until you publish from UI.

**Do not** paste or edit the Run a script body. Leave **v4.7** as-is.

---

## Exact UI steps

1. Open Production base → **Automations**.
2. Open **070a - Email, Notifications, and External Handoffs - Send Homework Asset Payload to Make** (`wflIYVOmRRaHu9cl2`).
3. Confirm the graph currently shows **two** actions, in order:
   1. **Run a script** (node `wacZVMXuabTetYmQ7`)
   2. **Update record** (node `wacpcvzcDB1KKjaKI`) that clears **Send to Make Trigger**
4. Click the **Update record** action (the one after the script).
5. Confirm it targets **Submission Assets** and sets **Send to Make Trigger** to empty/unchecked (null).
6. **Delete** that Update record action only. Do **not** delete or reconfigure the script action.
7. Confirm the graph now shows **only** **Run a script**.
8. Open the script action and verify inputs are unchanged (do not retype secrets):
   - `recordId` ← trigger record id
   - `webhookUrl` ← existing Make Upload Engine URL (leave as configured)
   - `automationNumber` = `070a`
9. Click **Update** / **Publish** (apply unpublished changes). Draft-only delete is **not** live until this step.
10. Leave automation **ON** / `deploymentStatus` **deployed**.

---

## Post-publish verification (Agent or Mike)

1. Re-run MCP `get_automation` with `includeDeployedVersion=true` on `wflIYVOmRRaHu9cl2`.
2. Expect:
   - Exactly **one** node: `wacZVMXuabTetYmQ7` (`customScript`)
   - Node `wacpcvzcDB1KKjaKI` **absent**
   - Trigger conditions unchanged (all nine AND, including Upload Status = Pending Link)
   - Script body still **v4.7**; inputs still `recordId` / `webhookUrl` / `automationNumber=070a`
   - `deployedVersion` **null** (draft === published) after publish settles
3. Only then run the disposable functional matrix in `SC-156-070A-IMPLEMENTATION-AND-TEST-20260904.md`.

---

## Rollback (not recommended)

Re-add an Update record after the script that clears **Send to Make Trigger** on the trigger row. Prefer keeping script-owned clearing (v4.7). Script rollback file: `airtable/rollbacks/20260904-sc154-156/070a-v4.7-pre-wave.js`.

---

## Holds

- No Season Sim  
- No field deletes  
- No 057/058 changes  
- No broad email  
- Do not claim SC-156 complete until published graph is script-only  
