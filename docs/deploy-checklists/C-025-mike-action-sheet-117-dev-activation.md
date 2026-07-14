# Mike action sheet — C-025 DEV 117a–f activation (S19)

**Stop here.** First Airtable UI action required.

## Do this first (one action)

In **DEV** Airtable base `appTetnuCZlCZdTCT`:

1. Open **Automations**.
2. Create folder **`17 - Zoom Recording Credit`** (if missing).
3. Create a **new automation** named exactly:  
   **`117a - Zoom Recording Credit - Normalize Recording Quiz Submission`**
4. Paste script from GitHub file  
   `airtable/automations/shooting-challenge/117a-zoom-recording-normalize-recording-quiz-submission.js`  
   — **skip lines 1–7** (GitHub header); paste from line 9 through end.
5. Leave the automation **OFF**.
6. Tell Cursor when 117a exists (still OFF) so we continue wiring trigger/inputs for 117a, then 117b–f.

Full sheet (all six): [`C-025-dev-airtable-117-deployment-sheet.md`](../deploy-checklists/C-025-dev-airtable-117-deployment-sheet.md)  
Live E2E after all pasted: Agent B plan inside [`S19-lead-integration-result.md`](../overnight-runs/results/S19-lead-integration-result.md)

## Do not do yet

- PROD paste  
- Real parent email / production webhook  
- Turn ON 117f with a Make URL  
- C-027  

## Why we stop

Airtable automation create/paste is a UI action. Repo + sheet are ready; agents cannot finish without this first paste.
