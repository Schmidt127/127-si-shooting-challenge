# ChatGPT session pack (mandatory · Delivery System v2.0)

**Status:** Required at the start of every ChatGPT session (D9 locked)  
**Owner:** Cursor Lead generates from CONTROL + `git rev-parse HEAD`; Mike/ChatGPT consume  
**Scope:** All remaining Shooting Challenge V2 work (and future apps using this OS)  
**Rule:** ChatGPT must not invent paths, triggers, or Airtable UI. Cite sheet paths only. Workers never author this pack.

---

## Format (copy/fill)

```text
CHATGPT SESSION PACK — Delivery System v2.0
============================================
Project: 127 SI Shooting Challenge
Repository: 127-si-shooting-challenge
Integration branch: overnight/lead-integration
Actual tip SHA (git rev-parse HEAD): <full sha>
Actual tip branch: <branch>
CONTROL lagging package SHA (if present): <sha or n/a>
CONTROL match claim: IGNORE for tip — HEAD is authoritative

Backlog ID(s): <e.g. C-025>
Stage / package: <e.g. v2.0 pilot · 117 paste>
Last gate completed: <G0–G7 or n/a>
Next action (from CONTROL.next_action): <one line>

Capacity (estimated): <e.g. 45 occupied / 5 free>
Hard stops: NO PROD · NO archive write · NO real family sends · NO credentials changes · NO paste bot

Mike sheet path (if UI gate): <repo-relative path or none>
Verified full Windows paths (Lead Test-Path=True):
- <absolute path>  SHA256=<hash>  version=<ver>
- …

Do not invent file paths or Airtable trigger text.
If UI steps needed → open the Mike sheet only; do not restate fields 3–6 in chat.
Ops tip file: docs/overnight-runs/CONTROL.json
Infrastructure file: docs/PROJECT_STATE.md (stable IDs only)
Deployment registry: docs/delivery/DEPLOYMENT-REGISTRY.json
Pilot charter: docs/architecture/DELIVERY-SYSTEM-V2-PILOT.md
============================================
```

---

## Field definitions

| Field | Source |
|-------|--------|
| Actual tip SHA / branch | `git rev-parse HEAD` / `git rev-parse --abbrev-ref HEAD` after fetch |
| CONTROL lagging SHA | CONTROL.`canonical.sha` (= previous verified/package; may lag) |
| Backlog / stage / next action | CONTROL queue + `next_action` |
| Last gate | Migration/closeout or CONTROL notes |
| Capacity | CONTROL or capacity ledger |
| Hard stops | Always include the NO list above |
| Sheet path | CONTROL.`mike_gate.sheet` or active deploy-checklist handoff |
| Verified paths | Lead `Test-Path` + SHA256 before including |

---

## Example — pilot start (117)

```text
CHATGPT SESSION PACK — Delivery System v2.0
============================================
Project: 127 SI Shooting Challenge
Repository: 127-si-shooting-challenge
Integration branch: overnight/lead-integration
Actual tip SHA (git rev-parse HEAD): (run at session start)
CONTROL lagging package SHA: (from CONTROL.json — lagging pointer)
Backlog ID(s): C-025
Stage / package: Delivery System v2.0 pilot · Automation 117 DEV paste
Last gate completed: S29 readiness / offline 22/22 + unit 34/34
Next action: Mike paste 117 v1.0.1 OFF blank webhook (pilot G4)
Capacity (estimated): 45 occupied / 5 free
Hard stops: NO PROD · NO archive · NO real family sends · NO credentials · NO paste bot
Mike sheet path: docs/deploy-checklists/AUTOMATION-117-v2-pilot-mike-handoff.md
Verified full Windows paths:
- C:\Users\mschmidt_fairfield\Documents\GitHub\127-si-shooting-challenge\airtable\automations\shooting-challenge\117-zoom-recording-credit-orchestrator.js
  SHA256=D484327A9F4E13BCA3908F728B695F4C66705AD63776FC68D30247758B4AADAB version=v1.0.1
Do not invent file paths or Airtable trigger text.
Ops tip: docs/overnight-runs/CONTROL.json
Infrastructure: docs/PROJECT_STATE.md
Registry: docs/delivery/DEPLOYMENT-REGISTRY.json
Pilot: docs/architecture/DELIVERY-SYSTEM-V2-PILOT.md
============================================
```

---

*End of ChatGPT session pack.*
