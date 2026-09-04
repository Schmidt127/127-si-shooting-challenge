# SC-156 — Remove 070a post-script Send to Make Trigger clear

**Date:** 2026-09-04  
**Automation:** 070a `wflIYVOmRRaHu9cl2`  
**Base:** Production `appn84sqPw03zEbTT`  
**Why:** Live graph has Update record step `wacpcvzcDB1KKjaKI` that nulls `Send to Make Trigger` (`fld8C43NVQQ1NeQ7Z`) after the script. Soft failures return without throwing → trigger is cleared → not retryable.

## Preconditions

1. Rollback copy present: `airtable/rollbacks/20260904-sc154-156/070a-v4.7-pre-wave.js`  
2. Confirm script body remains **v4.7** (do not paste unrelated changes).  
3. Use Schmidt / synthetic assets only if testing.

## Production UI steps (Mike)

1. Automations → **070a - … Send Homework Asset Payload to Make**.  
2. Open the action graph.  
3. **Delete** the **Update record** action that clears **Send to Make Trigger** (node after Run a script).  
4. Leave the **Run a script** action only (inputs: `recordId`, webhook URL, `automationNumber=070a`).  
5. **Update / Publish** the automation (draft changes are not live until published).  
6. Confirm deploymentStatus stays **deployed**.

## Verify (safe)

1. Do **not** send broad email; 070a is Make upload only.  
2. Optional: on a disposable Schmidt homework asset that already has Canonical URL, set Send to Make Trigger → expect `skipped_already_uploaded` and trigger cleared by **script**.  
3. Failure path (when available): webhook/Lambda error must leave **Send to Make Trigger checked** and **Upload Error** populated.

## Rollback

1. Re-add Update record clearing Send to Make Trigger **only if** intentionally reverting (not recommended).  
2. Or re-paste `070a-v4.7-pre-wave.js` into the script action if the script body was changed.
