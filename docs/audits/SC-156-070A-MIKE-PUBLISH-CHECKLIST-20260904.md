# SC-156 — Mike publish checklist (070a)

**Date:** 2026-09-04  
**Automation:** 070a — Send Homework Asset Payload to Make (`wflIYVOmRRaHu9cl2`)  
**Base:** Production Shooting Challenge  
**Why:** Live graph still has a post-script **Update record** that clears **Send to Make Trigger** after every run (including soft failures). MCP cannot publish automations.

## Do this once (exact)

1. Open Airtable → Automations → **070a - Email, Notifications, and External Handoffs - Send Homework Asset Payload to Make**.
2. Open the action graph.
3. **Delete** the **Update record** action that sits **after** “Run a script” and clears **Send to Make Trigger** (node id `wacpcvzcDB1KKjaKI` if shown).
4. **Leave only** “Run a script” with inputs:
   - `recordId` ← triggering record
   - `webhookUrl` ← existing Make upload webhook (do not change)
   - `automationNumber` = `070a`
5. Do **not** change the trigger or its nine conditions.
6. Do **not** re-paste or edit the script body (keep **v4.7**).
7. Click **Update** / **Publish** so the draft becomes live.
8. Confirm the automation stays **ON** / deployed.

## After publish — tell Cursor

Reply: **070a published — Update node removed**

Agents will then re-MCP the graph and run disposable Schmidt success / failure-retention / retry / idempotency checks.

## Rollback (not recommended)

Re-add an Update record that clears **Send to Make Trigger** only if intentionally reverting SC-156.
