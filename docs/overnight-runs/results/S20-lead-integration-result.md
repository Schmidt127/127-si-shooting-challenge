# S20 Lead result — C-025 117 orchestrator (slot fit)

| Field | Value |
|-------|-------|
| Stage | S20 |
| Package | `C-025-117-orchestrator-slot-fit` |
| Agents | A (design/impl) · B (review/tests 34/34) · Lead |
| Tip before stage | `af23cbd` |

## Verdict

**Do not paste six 117a–f.** Paste **one** GitHub orchestrator after freeing **one** DEV slot (Mike-approved retirement). Safeguards preserved. PROD untouched.

---

## Concise recommendation (Mike)

### 1. Slots required

| Design | New DEV slots |
|--------|--------------:|
| ~~117a–f ×6~~ | **+6** — blocked at limit |
| **Option 1 (preferred):** `117` orchestrator | **+1** |
| Option 2: core + email | **+2** |

Live DEV count = **UNKNOWN** in repo (Mike reports **at limit**; Airtable cap **50**).

### 2. Existing slots that could potentially be retired

**Recommend only — do not disable until you approve:**

| # | Why (repo evidence) | Est. slots freed |
|---|---------------------|-----------------:|
| **112** | **OFF**; legacy duplicate of **013**; V2-014 Category F | **+1** (best first candidate) |
| **043** | Superseded by **042** gate assignment; Cat F retire | **+1** |
| **008** / **012** | Already removed historically | 0 remaining |

Do **not** retire **115**, **070a/b**, or productive pipeline slots for this.

### 3. Exact safest deployment option

1. You approve **delete or permanently disable 112** in **DEV only** (frees 1 slot).  
2. Create **one** automation:  
   **`117 - Zoom Recording Credit - Orchestrator`**  
   Folder: `17 - Zoom Recording Credit`  
3. Paste **only**  
   `airtable/automations/shooting-challenge/117-zoom-recording-credit-orchestrator.js`  
   — skip GitHub header; leave **OFF**.  
4. Inputs: `recordId` (+ optional `webhookUrl` **blank**).  
5. Trigger later: Zoom Attendance · Method = Recording Quiz · update on review/credit fields (see slot plan).  
6. Keep `117a`–`117f` as **library only** — do not paste them as six automations.

Fallback if you refuse retirement: Option 2 needs **two** free slots — still no six-way paste.

### 4. First required Airtable UI action

**Decide and act in DEV Automations:**

> Approve freeing **one** slot by deleting or disabling **112** (recommended), **or** tell Cursor you’ve freed a different unused slot — then create/paste the **single** orchestrator **OFF**.

Until a slot is free, **cannot** activate C-025 recording credit in DEV Airtable.

Full plan: [`C-025-s20-orchestrator-slot-plan.md`](../../deploy-checklists/C-025-s20-orchestrator-slot-plan.md)  
Mike sheet: [`C-025-mike-action-sheet-s20-orchestrator.md`](../../deploy-checklists/C-025-mike-action-sheet-s20-orchestrator.md)

## Deliverables landed

- `117-zoom-recording-credit-orchestrator.js`
- Library headers on `117a`–`117f`
- Slot plan + Agent B result + offline tests **34/34**
- S19 six-paste path **superseded** for DEV capacity

## Untouched

PROD · live disables (pending your approval) · real email · C-027
