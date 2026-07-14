# C-025 / S20 — Orchestrator slot plan (DEV automation limit)

**Status:** Repo design + Option 1 script COMPLETE — **no Airtable paste / no disable / no PROD**
**Date:** 2026-07-14  
**Agent:** A (S20)  
**Backlog:** C-025  
**Authority:** DEV at automation slot limit — cannot add six new 117a–f slots  
**Do not:** delete/disable/repurpose live Airtable automations without **Mike approval** · do not touch PROD  
**GitHub is SoT**

**Companion script:** [`airtable/automations/shooting-challenge/117-zoom-recording-credit-orchestrator.js`](../../airtable/automations/shooting-challenge/117-zoom-recording-credit-orchestrator.js)  
**Library (do not paste ×6):** `117a`–`117f` (headers marked S20 consolidated)

---

## Task Classification (S20 Agent A)

| Field | Value |
|-------|--------|
| Type | Implementation + deploy checklist (Phase 3 DEV prep) |
| Priority | P0 for C-025 DEV activation under slot pressure |
| Difficulty | Medium |
| Owner | Cursor Agent A → Mike for UI paste / retirement approvals |
| Dependencies | C-025 formulas + support fields present in DEV |
| Backlog ID | C-025 |
| Estimated Scope | 1 orchestrator + docs; 0 live Airtable writes by agent |
| Phase | 3 |
| Correct tool | Cursor |
| Repo | `127-si-shooting-challenge` |
| Mike's role | Approve retirement candidates (if needed); create **one** DEV automation; paste Option 1 |

---

## 1. Inventory (REPO EVIDENCE ONLY)

Live Airtable automation count was **not** polled this pass. Treat live count as **UNKNOWN**. Mike reports DEV is **at the automation limit** (platform hard cap **50** per [v2-014](../v2-014-automation-modernization-roadmap.md) / [PROJECT_STATE](../PROJECT_STATE.md)).

### 1.1 GitHub script count (verified 2026-07-14)

| Metric | Count | Notes |
|--------|------:|-------|
| Files in `airtable/automations/shooting-challenge/*.js` | **57** after S20 (was **56** before orchestrator) | Includes `117a`–`117f` + new `117` orchestrator |
| Numbered production-family scripts (001–116 + 117*) | **57** | Gap numbers still absent as files: `004`, `008`, `011`, `012`, `014`–`019`, etc. |
| PROJECT_STATE / V2-014 snapshot (stale) | **46** | As of **2026-07-05** — predates 115/116/117* / 070c expansions |
| Airtable hard cap | **50** | Active + disabled both consume slots (confirm in OMNI) |
| Live DEV slot count | **UNKNOWN** | Must reconcile in Airtable Automations list / OMNI |

**Implication:** GitHub file count (**57**) is **not** equal to live slots. Only pasted, named automations in the base consume the limit. Many GitHub scripts may already be live; 117a–f were **never meant to consume six new slots** under S20 — paste **one** orchestrator instead.

### 1.2 Retired / already gone (automation-index + V2-014)

| # | Repo status | Slot effect | Source |
|---|-------------|-------------|--------|
| **008** | Removed DEV **2026-07-10**; replaced by **116** in **same** slot | Net **0** | [automation-index retired](../automation-index.md) |
| **012** | **Deleted** (no GitHub file) | **+1** recovered historically | automation-index · V2-014 · PROJECT_STATE |

### 1.3 Likely inactive / OFF / legacy / duplicate (candidates only — Mike approval required)

Do **not** delete, disable, or repurpose without Mike. Recommendations from repo disposition only:

| Candidate | Repo evidence | Likely disposition | Est. slots if Mike approves |
|-----------|---------------|--------------------|-----------------------------|
| **112** | automation-index: **OFF — monitor before delete**; legacy duplicate of **013**; V2-014 Cat **F** | Delete after Mike confirm | **+1** |
| **043** | V2-014 Cat **F** Retire; **042** owns gate; PROJECT_STATE: “retire **043**” in maintenance window | Disable/delete after Mike confirm | **+1** |
| **070c** | Index: required only for plain-text `Accepted` async path; **not required** when Make returns full Lambda JSON (DEV homework PASS sync path) | Possibly leave OFF / skip enabling; **not** automatic delete | 0 unless Mike disables a live ON copy |
| **115** | Engineering test framework — DEV tooling | Leave ON in DEV; never a PROD requirement | 0 (keep) |
| Merge Cat **C** (`006+021`, `030+032+033`, `111→013`, email EMC) | Wave 2A planning only — **not executed** | Future wave; not S20 | TBD |

### 1.4 What this means for C-025

| Path | Slots needed | Feasible at limit? |
|------|-------------:|--------------------|
| Original Stage 17 (117a–f ×6) | **+6** | **No** — blocked |
| **Option 1** (preferred): 1 orchestrator | **+1** | Yes if **≥1** free **or** Mike frees 112/043 |
| **Option 2**: core + email (2 automations) | **+2** | Needs **≥2** free |

---

## 2. Option 1 (preferred) — single orchestrator

### 2.1 Design

| Item | Spec |
|------|------|
| **File** | `117-zoom-recording-credit-orchestrator.js` |
| **Airtable name** | `117 - Zoom Recording Credit - Orchestrator` |
| **Folder** | `17 - Zoom Recording Credit` |
| **Version** | v1.0.0 · 2026-07-14 |
| **Order** | A → B → C → D → E → F (same safeguards as 117a–f; b/c/f logic matches **v1.0.1**) |
| **Abort early** | A: `skipped_not_recording_quiz` · `skipped_missing_links` · `skipped_duplicate_pair` |
| **Reload after B** | Re-select Zoom Attendance so formula fields (`Zoom Credit Approved?`, XP amount, gate, PW) see `Satisfactory?` before C–F |
| **XP** | Source Key = `Zoom Credit Key` (`ZOOM_CREDIT\|…`); recheck-before-create; deactivate on conflict/not approved |
| **Gate / PW** | Independent applied flags; idempotent Attendees link |
| **Email (F)** | No send if webhook blank, config missing/disabled, not satisfactory, not approved, conflict, missing template, already sent; stamp only after 2xx |

### 2.2 Trigger (covers review + credit formula changes)

**Preferred (one condition set):**

- Table: **Zoom Attendance**
- When: **record matches conditions**
- Conditions (AND):
  1. `Attendance Method` **is** `Recording Quiz`
  2. `Enrollment` **is not empty**
  3. `Zoom Meeting` **is not empty**

**Why this covers both review and credit formulas**

Airtable re-runs “matches conditions” when a matching record is **updated** while still matching. Coach edits (`Recording Quiz Review Status`, `Satisfactory?`) and formula recalcs (`Zoom Credit Approved?`, `Zoom Credit Conflict?`, `Zoom Gate Credit Earned?`, `Zoom XP Amount`, Effective email/PW fields) all update the same row and should re-fire the automation. Each internal step self-gates (skips when inapplicable), so a broad trigger is safe and preferred over six narrow automations.

**Optional tighten (only if Mike sees noise):** add OR groups for specific writable fields — verify first that formula-only updates still re-fire under the preferred broad trigger.

**Do not use:** Zoom Meetings table · Live attendance rows · Schedule trigger.

### 2.3 Inputs

| Input | Required | Notes |
|-------|----------|-------|
| `recordId` | **Yes** | Zoom Attendance record id from trigger |
| `webhookUrl` | No | Make DEV webhook; **leave blank** until email authorized → step F `skipped_no_webhook` |

### 2.4 Outputs

`statusOut`, `errorOut`, `debugStep`, `actionOut` (pipe of A\|B\|C\|D\|E\|F), `actionAOut`…`actionFOut`, `zoomAttendanceId`, `enrollmentRid`, `zoomMeetingRid`, `xpEventId`, `xpPoints`, `correctionCount`, `sendKey`

### 2.5 Paste boundary

1. Open `117-zoom-recording-credit-orchestrator.js`
2. **Skip** GitHub header (lines 1–7)
3. Paste from production docblock (`/************************************************************`) through end into one Scripting action
4. Leave automation **OFF** until Mike authorizes DEV ON + fixture run
5. Do **not** create 117a–f as separate automations

### 2.6 Slot math (Option 1)

```
Need: +1 slot for Orchestrator
If DEV at 50/50 → free 1 slot first (Mike-approved candidate: 112 delete or 043 retire)
Net for C-025 recording credit: +1 (not +6)
```

---

## 3. Option 2 (fallback) — two automations

Use only if Mike wants email isolation or script size/timeout concern.

| Automation | File | Steps | Trigger sketch | Inputs |
|------------|------|-------|----------------|--------|
| **117-core** | Could split later: steps A–E only (not implemented as separate file this pass — Option 1 is SoT) | A→E | Same broad Recording Quiz match | `recordId` |
| **117f-email** | Keep `117f-…js` library paste **or** extract F | F only | `Attendance Method = Recording Quiz` AND `Recording Quiz Satisfactory?` checked AND preferably Approved | `recordId`, `webhookUrl` |

**Slot math:** +2. Requires Mike free **2** slots if at hard cap.

**Safeguard note:** Core must still reload after B before C; email must keep all F no-send defaults. Prefer Option 1 unless split is mandated.

*(S20 Agent A did **not** implement a separate core-only file — Option 1 orchestrator already includes F with safe skips.)*

---

## 4. Safeguard checklist (must hold in DEV tests)

- [ ] Idempotent re-run → no duplicate XP Event for same `Zoom Credit Key`
- [ ] Conflict → XP deactivated / not created; gate/PW/email skip
- [ ] Needs Correction → clears Satisfactory; same credit identity on resubmit
- [ ] Gate Applied? / Perfect Week Credit Applied? independent
- [ ] Webhook blank → `skipped_no_webhook`, no stamp
- [ ] Email config missing/disabled → no send
- [ ] Live method row → abort/skipped at A (101 untouched)

Offline contracts for step logic remain in `tools/airtable/tests/test_c025_117_contracts.py` (117a–f decision tables).

---

## 5. Mike action (UI — not done by agent)

1. Reconcile live DEV automation count (OMNI / Automations list) → confirm free slots.
2. If **0** free: approve **one** retirement candidate (**112** preferred if still OFF; else **043** if verified superseded by **042**).
3. Create **one** automation: `117 - Zoom Recording Credit - Orchestrator` (folder `17 - Zoom Recording Credit`).
4. Paste Option 1 script (skip GitHub header). Wire inputs. Trigger per §2.2. Leave **OFF**.
5. Tell Cursor when paste exists so fixtures / ON can proceed under existing C-025 DEV rules.
6. Do **not** paste 117a–f as six automations.
7. Do **not** PROD.

---

## 6. Files changed this pass (Agent A)

| Path | Change |
|------|--------|
| `airtable/automations/shooting-challenge/117-zoom-recording-credit-orchestrator.js` | **Created** — Option 1 A→F orchestrator v1.0.0 |
| `117a`…`117f` `*.js` | Header + docblock note: library/reference; consolidated into 117 orchestrator |
| `docs/deploy-checklists/C-025-s20-orchestrator-slot-plan.md` | **This checklist** |

**Not changed:** PROD · live Airtable · CONTROL.json · retirement execution · 117a–f decision logic bodies (still reference SoT for contracts)

---

## 7. Supersedes (activation planning)

For DEV slot-constrained activation, prefer this plan over creating six automations in:

- [C-025-mike-action-sheet-117-dev-activation.md](./C-025-mike-action-sheet-117-dev-activation.md) (S19 six-paste first action)
- [C-025-dev-airtable-117-deployment-sheet.md](./C-025-dev-airtable-117-deployment-sheet.md) (update mental model to **1** paste)
- Stage 17 package map in [C-025-automation-packages-stage17.md](./C-025-automation-packages-stage17.md) (logic preserved; packaging = orchestrator)

Promotion package [C-025-prod-promotion-package.md](./C-025-prod-promotion-package.md) should be updated in a later pass to cite **117 orchestrator** instead of six PROD pastes — **not applied here** (PROD stop).
