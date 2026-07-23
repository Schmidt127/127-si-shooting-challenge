# Mike action — Install Automation 115 in PROD

**One action only for the next step**

## Do this

1. Open PROD base `appn84sqPw03zEbTT`.
2. Create a new Airtable Automation in folder **12 - Engineering Test Framework** (create folder if needed).
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
