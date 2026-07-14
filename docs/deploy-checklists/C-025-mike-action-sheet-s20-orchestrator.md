# Mike action sheet — S20 DEV slot free (revised 2026-07-14)

**Correction applied:** **112 is not in DEV.** Do not delete 112. Orchestrator still needs **+1** slot.

**Stop here.** First Airtable UI decision:

## 1) Confirm whether 043 exists in DEV Automations UI

Search exactly:

**`043 - Levels and Progression - Set Level Gate Rule from Next Level`**

| If you find it | What it is | Next |
|----------------|------------|------|
| Present (ON or OFF) | Sets `Level Gate Rule` from Next Level — **superseded by 042** in GitHub design | Reply **“043 present — status ON/OFF”**. Safest retirement candidate for +1 slot **after** you confirm **042** is live in DEV. |
| Not present | Docs table was stale (same class of error as 112) | Reply **“043 not in UI”** and send a full Automations list (every name, ON/OFF). |

## 2) Do not

- Delete **112** in DEV (not present)  
- Paste six 117a–f  
- Touch PROD  
- Disable **042** / **013** / **116** / **115** without a named plan  

## 3) After a real slot is freed

Paste **one** orchestrator OFF:  
`117-zoom-recording-credit-orchestrator.js`  
(see prior S20 sheet / slot plan).

## Evidence

[`C-025-s20-dev-slot-reopen-2026-07-14.md`](./C-025-s20-dev-slot-reopen-2026-07-14.md) · JSON: `docs/audits/C-025-s20-dev-automations-doc-table-2026-07-14.json`
