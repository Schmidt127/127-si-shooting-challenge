# Mike action sheet — S20 C-025 orchestrator (slot limit)

**Stop here.** First Airtable UI decision required.

## Why

DEV is at the automation limit. Pasting **117a–f as six** is blocked. GitHub now has **one** orchestrator that runs A→F safely (XP Recording Quiz–only, conflict deactivate, gate/PW, email skip without webhook).

## First action (choose one)

### Preferred

In **DEV** Automations only:

1. Confirm **112** is still **OFF** (legacy duplicate of **013**).  
2. **Delete** or permanently **turn off + leave deleted** slot for **112** — **only if you approve** (this frees one slot).  
3. Reply to Cursor: “112 freed in DEV” (or name the slot you freed).

### Alternative

Free any **other** unused DEV automation you confirm is safe (e.g. **043** if you prefer that retirement instead of 112). Same reply.

## After that (not yet — wait for Cursor confirmation)

1. Create **`117 - Zoom Recording Credit - Orchestrator`** in folder `17 - Zoom Recording Credit`.  
2. Paste `117-zoom-recording-credit-orchestrator.js` (skip GitHub header).  
3. Leave **OFF**; `webhookUrl` blank.

## Do not

- Paste six `117a`–`117f` automations  
- Touch PROD  
- Enable real email / production webhook  
- Start C-027  

## Docs

- Slot plan: `docs/deploy-checklists/C-025-s20-orchestrator-slot-plan.md`  
- Lead verdict: `docs/overnight-runs/results/S20-lead-integration-result.md`
