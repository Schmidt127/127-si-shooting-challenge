# C-025 / S20 — DEV slot analysis reopen (2026-07-14)

**Status:** Analysis only — **no Airtable changes**  
**Trigger:** Mike correction — **Automation 112 is not present in DEV** (UI). Prior S20 “retire 112” recommendation was **incorrect for DEV**.  
**Orchestrator:** still **+1** slot (`117-zoom-recording-credit-orchestrator.js`).

---

## Evidence hierarchy (this reopen)

| Source | What it measures | Authority for **UI slot occupancy** |
|--------|------------------|-------------------------------------|
| **Mike UI attestation (2026-07-14)** | 112 not in DEV Automations UI | **AUTHORITATIVE for 112** |
| **Live REST query of DEV `Automations` table** | Documentation rows (Name, Status, trigger notes) | **NOT proof of UI slots** (explicitly limited) |
| **Meta `GET …/automations`** | Would list product automations | **HTTP 403** with current PAT — unavailable |
| GitHub / V2-014 / automation-index | Design & PROD history | **Not DEV UI occupancy** |

Live snapshot written: [`docs/audits/C-025-s20-dev-automations-doc-table-2026-07-14.json`](../audits/C-025-s20-dev-automations-doc-table-2026-07-14.json)  
Queried: DEV `appTetnuCZlCZdTCT` · **48** Automations **documentation** records · 2026-07-14.

### Doc-table vs UI drift (proves why 112 was wrong)

| Signal | Observation |
|--------|-------------|
| 112 in **docs table** | Present · `Status=Live` · Name below |
| 112 in **DEV UI** | **Absent** (Mike) |
| 070c / 115 / 116 in **docs table** | **Missing** |
| Prior DEV work | 116 + 115 + 070 paths known on DEV UI from other checklists | 

Conclusion: **Do not recommend deletion from Automations table “Live” flags alone.**

---

## Actual DEV automations occupying slots

**Full product Automations UI inventory: UNKNOWN via API (403).**  
Only Mike’s Automations list (or a future export) can enumerate the **50** occupied slots.

What we **can** list from DEV today is the **Automations documentation table** (48 names) — see JSON `all_names_sorted`. Treat as incomplete catalog, not the slot counter.

Known **UI** facts in this reopen:

| Fact | Evidence |
|------|----------|
| DEV is at automation **limit** | Mike (S20) |
| **112** not in DEV UI | Mike (this correction) |
| Orchestrator needs **+1** | S20 design |

---

## 112 (retracted for DEV)

| Field | Value |
|-------|--------|
| Exact doc name (table only) | `112 - Video Review and XP - Create Video Feedback from Submission Asset` |
| Docs Status field | `Live` (stale relative to UI) |
| DEV UI | **Not present** (Mike) |
| Recommendation | **Do not** try to delete 112 in DEV — it cannot free a slot |

---

## 043 — presence and supersession (candidate, UI confirm required)

### Exact identity (from live DEV Automations **documentation** table)

| Field | Value |
|-------|--------|
| **Exact name** | `043 - Levels and Progression - Set Level Gate Rule from Next Level` |
| **Docs Status** | `Live` |
| **Docs record id** | `recZWrVJTi2ovc3uM` |
| **Trigger type / table (docs)** | When a Record Matches Condition · **Enrollments** |
| **Conditions (docs)** | Next Level not empty · Level Gate Rule empty · Active? checked |
| **Purpose (GitHub SoT)** | On Enrollment: read Next Level → find matching Level Gate Rules → write `Enrollments.Level Gate Rule` |
| **GitHub file** | `043-levels-and-progression-set-level-gate-rule-from-next-level.js` |

### Is 043 present in DEV **UI**?

| Verdict | Evidence |
|---------|----------|
| **UNCONFIRMED** | Docs table contains the row; **Meta automations API unavailable**; **Mike has not yet attested UI presence** for 043 |

**Required before any delete/disable:** Mike searches DEV Automations UI for the exact name above and confirms ON or OFF.

### Is 043 truly superseded by 042?

| Verdict | Evidence |
|---------|----------|
| **Yes — by engine design (GitHub)** | `042-…gate-blocking.js` writes `Enrollments.Level Gate Rule` and states: *“After this script is tested successfully, Automation 043 should be turned off because this script directly assigns the correct Level Gate Rule.”* |
| **042 docs row present in DEV** | Name: `042 - Levels and Progression - Assign Current and Next Level` · Status=`Live` |
| **Runtime proof that DEV UI 042 is ON and 043 is redundant today** | **UNKNOWN** without UI run history / Mike confirm |

Safest retirement story **if** UI confirms 043 exists: disable/delete **043** only after confirming **042** is the live level/gate assigner in DEV (name/status ON).

---

## Safest real retirement candidate (revised)

| Rank | Candidate | DEV UI evidence | Why safest if present |
|------|-----------|-----------------|------------------------|
| **1** | **043** (exact name above) | **UI confirm pending** | Design-superseded by **042**; Category F in V2-014; limited to gate-link copy |
| ~~112~~ | Retracted | **Not in DEV UI** | Cannot free a slot |
| **Alt** | Any automation Mike identifies as unused/OFF in the **UI** list | Mike export | Only after named + purpose checked |

**Do not** recommend retiring **042**, **013**, **116**, **115**, or idle upload **070a/b** for capacity — they are needed or already slot-sensitive.

---

## Orchestrator plan (unchanged)

Still **+1** DEV slot for:

`117 - Zoom Recording Credit - Orchestrator`  
← paste `117-zoom-recording-credit-orchestrator.js` OFF after one slot is freed.

---

## First Mike Airtable UI action (revised)

1. In **DEV → Automations**, search for:  
   **`043 - Levels and Progression - Set Level Gate Rule from Next Level`**
2. Reply with one of:
   - **“043 present — OFF/ON: ___”** (then Cursor will confirm delete/disable steps), or  
   - **“043 not in UI”** + paste/export the full Automations name list (ON and OFF) so Lead can pick a real freeable slot.
3. Do **not** hunt for 112 in DEV.
