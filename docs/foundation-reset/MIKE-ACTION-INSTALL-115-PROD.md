# Historical Mike action — Install Automation 115 in PROD

> **Superseded 2026-08-10.** This packet predates Automation 115 v2.1 and the controlled PROD proof. Do not use its v1.8 instructions or fixed historical scenario/enrollment IDs. Current status and evidence are in [`docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md`](../SHOOTING_CHALLENGE_COMPLETION_MASTER.md) §2A and [`docs/prod-completion/2026-08-10/SCV2-APP-BASE-CLOSEOUT-001.md`](../prod-completion/2026-08-10/SCV2-APP-BASE-CLOSEOUT-001.md).

**One action only for the next step**

## Capacity prerequisite (2026-07-23 reconciliation)

PROD is at the **50-automation limit**. Free **one slot** before creating 115.

**Recommended first free:** delete PROD automation **112** (legacy duplicate of **013**), after confirming it is OFF and unused. See `DEV-PROD-AUTOMATION-RECONCILIATION-2026-07-23.md`.

Do **not** delete **032 / 033 / 063 / 070c / 111** to make room — not proven superseded.

## Do this

1. Open PROD base `appn84sqPw03zEbTT`.
2. After the slot is free, create a new Airtable Automation in folder **12 - Engineering Test Framework** (create folder if needed).
3. Name it exactly:  
   `115 - Engineering Test Framework - Run Testing Scenario Daily Submission`
4. Trigger: **When record matches conditions**  
   - Table: **Testing Scenarios**  
   - Condition: **Run Test?** is checked
5. Action: **Run script**
6. Input variable: `recordId` = Testing Scenarios record ID from trigger
7. Paste the script body from GitHub file (skip the top GitHub sync header if your paste standard skips it):  
   `airtable/automations/shooting-challenge/115-engineering-test-framework-run-testing-scenario-daily-submission.js`  
   Version **v1.8**
8. Turn the automation **ON**.
9. Open Testing Scenarios record `recPdyfYRFgDtpzQ8`:
   - Keep Related Enrollment = Schmidt `recgP9qZYjAhE7NXm`
   - Set **Dry Run?** = checked first → check **Run Test?** → confirm outputs only on Testing Scenarios
   - Then uncheck Dry Run?, check Run Test? again for a live create
10. Add/update a row in the **Automations** table for 115.

## Why this is blocked for Cursor

Airtable does not allow Cursor to create/paste automation scripts via API.

## After you finish

Tell Cursor: “115 pasted in PROD” and we will verify SC-001 live scenario evidence.
