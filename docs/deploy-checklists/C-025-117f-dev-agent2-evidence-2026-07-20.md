# C-025 — Agent 2 DEV evidence: 117f install & controlled-test prep (2026-07-20)

**Role:** Agent 2 — Install and Test 117f in DEV Safely  
**Branch:** `feature/c025-stage17-zoom-attendance`  
**Base:** DEV `appTetnuCZlCZdTCT` only  
**PROD:** No writes; no PROD 117f prep  
**Upstream:** [Agent 1 handoff](./C-025-117f-agent2-handoff.md) · [Make contract](./C-025-117f-dev-make-scenario-contract.md) · [Make checklist](./C-025-117f-dev-make-deployment-checklist.md)  
**Re-verified:** 2026-07-20 afternoon (live Airtable GET + decision gates)

---

## Verdict

DEV preparation for 117f v1.2.0 is **complete in-repo and in Airtable DEV records**. Live Make webhook / Gmail / Data Store runs (**M1–M5**) and Airtable 117f paste/Run once remain **blocked** on:

1. Make.com UI login + Custom webhook creation  
2. Mike-controlled `testRecipientEmail` (ops-only)  
3. Airtable Automations UI paste (Meta API cannot install scripts)

Automation 117f remains **not installed / OFF**. No webhook URL in git. Gmail count **0**.

---

## Make scenario status

| Item | Status |
|------|--------|
| Blueprint / offline simulator | Ready in repo |
| Make UI scenario | **Not built** |
| Data Store `C025_117f_DEV_SendKeys` | **Not created in Make UI** |
| M1–M5 | **BLOCKED** (no Make UI / no webhook / no test inbox) |

---

## DEV automation status

| Item | Status |
|------|--------|
| Script source | **v1.2.0** in repo + paste packet |
| Airtable automation 117f | **Not installed** (UI paste required) |
| Inputs expected | `recordId`, `webhookUrl` (blank until controlled test) |
| Webhook URL | **Blank / absent** — never committed |
| 117 credit path | Unchanged; `webhookUrl` stays blank |
| 101 / 057 / 042 | Not modified |
| 115 | Absent |

---

## Dedicated DEV fixtures (re-verified)

**Enrollment:** `recgP9qZYjAhE7NXm` (Schmidt test only)  
**Tag:** `C025-117f-DEV-EMAIL`

| Role | Zoom Meeting | Zoom Attendance | Live check |
|------|--------------|-----------------|------------|
| Happy | `recNOsPJQVH69ibah` | `recsEERuvtyoHmDma` | Method Recording Quiz; Satisfactory true; Conflict **0**; Effective Enabled **1**; template `ZOOM_RECORDING_APPROVED`; Send Key/Sent At **blank**; meeting Attendees **0** |
| Disabled | `reclJMFG2w1OkObuE` | `recAqFTWmuHF1V4Z5` | Effective Enabled **0** |
| Conflict | `recupcVrBxglX8f0t` | `recbL9e1Be4iNbCZF` | Conflict **1**; meeting Attendees **1** (intentional) |

Canonical Send Key (happy): `ZOOM_REC_EMAIL|recgP9qZYjAhE7NXm|recNOsPJQVH69ibah`

---

## Offline + live-field gate results

| Suite | Result |
|-------|--------|
| `node make/lib/c025-117f-make-scenario.test.js` | **PASS** (18) |
| `node …/c025-stage17-zoom-attendance.test.js` | **PASS** |
| Happy + blank webhook | **PASS** → `skipped_no_webhook` |
| Disabled fixture | **PASS** → `skipped_disabled` |
| Conflict fixture | **PASS** → `skipped_conflict` |
| Happy + webhook shape (placeholder URL, no network) | **PASS** → `ready_to_post` |
| Make M1–M5 | **BLOCKED** |
| Airtable Run once (117f) | **BLOCKED** — not pasted |

Reverify tool: `tools/airtable/_c025_117f_reverify_dev_fixtures.py` (DEV read-only)

---

## Gmail / recipient / Data Store / stamps

| Check | Result |
|-------|--------|
| Gmail count | **0** |
| Recipient | n/a — ops-only Mike test inbox required in Make; never parent; never in git |
| Send Key / Sent At (happy ZA) | **Blank** |
| Make Data Store | Not created in UI |

---

## Safety verification

| Check | Result |
|-------|--------|
| Happy / disabled meeting Attendees | **0** |
| Conflict meeting Attendees | **1** (fixture only) |
| XP Events / historical `ZOOM_ATTEND_BASE` | Not modified by this agent |
| 101 / 117 credit / 057 / 042 / 115 | Untouched for Agent 2 live path |

---

## Exact remaining blocker before PROD preparation

**Single human path:** complete [C-025-117f-dev-manual-action-sheet.md](./C-025-117f-dev-manual-action-sheet.md) sections **A→B→C (M1–M5)→D→E** in Make.com + Airtable UI, using Mike-controlled test inbox and ops-only webhook URL. Do **not** start PROD prep until M1–M5 + E1–E5 PASS.
