# C-025 — Agent 2 DEV evidence: 117f install & controlled-test prep (2026-07-20)

**Role:** Agent 2 — Install and Test 117f in DEV Safely  
**Branch:** `feature/c025-stage17-zoom-attendance`  
**Base:** DEV `appTetnuCZlCZdTCT` only  
**PROD:** No writes; no PROD 117f prep  
**Upstream:** [Agent 1 handoff](./C-025-117f-agent2-handoff.md) · [Make contract](./C-025-117f-dev-make-scenario-contract.md) · [Make checklist](./C-025-117f-dev-make-deployment-checklist.md)

---

## Verdict

DEV preparation for 117f v1.2.0 is **complete in-repo and in Airtable DEV records**. Live Make webhook / Gmail / Data Store runs are **blocked** on Make UI login + Mike-controlled test inbox (ops-only). Airtable Automations Meta API cannot paste scripts (403). Automation 117f remains **not installed / OFF**.

---

## DEV automation status

| Item | Status |
|------|--------|
| Script source | **v1.2.0** in repo + paste packet |
| Airtable automation 117f | **Not installed** (Meta API 403; UI paste required) |
| Inputs expected | `recordId`, `webhookUrl` (blank until controlled test) |
| Make scenario | **Not built in Make UI** (blueprint + offline simulator ready) |
| Webhook URL | **Blank / absent** — never committed |
| 117 credit path | Unchanged; `webhookUrl` stays blank |
| 101 / 057 / 042 | Not modified |
| 115 | Absent (not installed) |

---

## Schema prep (DEV only)

Created three **Zoom Attendance** lookups (matching existing Effective\* pattern):

| Field | Type | Source |
|-------|------|--------|
| `Effective Recording Approval Email Enabled?` | lookup | Zoom Meetings same-name formula |
| `Effective Recording Approval Email Timing` | lookup | Zoom Meetings same-name formula |
| `Effective Recording Approval Email Template Key` | lookup | Zoom Meetings same-name formula |

Without these, 117f always saw `skipped_disabled` / missing template.

---

## Dedicated DEV fixtures (Schmidt enrollment only)

**Enrollment:** `recgP9qZYjAhE7NXm` (test only)  
**Tag:** `C025-117f-DEV-EMAIL` · stamp `20260720-135538`

| Role | Zoom Meeting | Zoom Attendance | Notes |
|------|--------------|-----------------|-------|
| Happy / blank-webhook / first-send | `recNOsPJQVH69ibah` | `recsEERuvtyoHmDma` | Override email **Yes**; template `ZOOM_RECORDING_APPROVED`; timing On Satisfactory; Conflict **0**; Sent At / Send Key blank; **Attendees empty** |
| Disabled effective | `reclJMFG2w1OkObuE` | `recAqFTWmuHF1V4Z5` | Override email **No** → Effective Enabled **0** |
| Conflict = 1 | `recupcVrBxglX8f0t` | `recbL9e1Be4iNbCZF` | + Live sibling `rec4vldEPJDvFO2wn` (`Live Attendance Confirmed?` = true); Conflict **1**; meeting Attendees = Schmidt (fixture setup only) |

Canonical Send Key (happy): `ZOOM_REC_EMAIL|recgP9qZYjAhE7NXm|recNOsPJQVH69ibah`

Fixture tool: `tools/airtable/_c025_117f_prepare_dev_fixture.py`  
Snapshot: `tools/airtable/_preview/c025_117f_dev_fixture.json` (local preview; not required in git)

---

## Offline / gate results (executed)

| Suite | Result |
|-------|--------|
| `node --test airtable/.../c025-stage17-zoom-attendance.test.js` | **PASS** (includes all 117f decision cases) |
| `node --test make/lib/c025-117f-make-scenario.test.js` | **PASS** |
| Live-field gate: happy + blank webhook | **PASS** → `skipped_no_webhook` (no stamp) |
| Live-field gate: disabled fixture | **PASS** → `skipped_disabled` |
| Live-field gate: conflict fixture | **PASS** → `skipped_conflict` |
| Live-field gate: happy + webhook present (shape only) | **PASS** → `ready_to_post` / mayPost; payload `117f` + `ZOOM_RECORDING_APPROVED` |

### Controlled sequence vs Make (blocked)

| # | Test | Result |
|---|------|--------|
| Blank webhook | expect `skipped_no_webhook` | **PASS** (decision gate on live fixture values; Airtable Run once still needs 117f paste) |
| Disabled effective | expect `skipped_disabled` | **PASS** (same) |
| Conflict = 1 | expect `skipped_conflict` | **PASS** (same) |
| Invalid payload → Make | expect non-2xx; no Gmail; no DS | **BLOCKED** — Make UI |
| Valid first send | expect sent + 1 test email + stamps + DS | **BLOCKED** — Make UI + test inbox |
| Identical rerun | expect already_sent / no 2nd Gmail | **BLOCKED** — Make UI |

---

## Gmail / recipient / Data Store / stamps

| Check | Result |
|-------|--------|
| Gmail count | **0** (no live Make send executed) |
| Recipient | **n/a** — Make `testRecipientEmail` ops-only; never parent; never in git |
| Send Key / Sent At on happy ZA | **Blank** (verified) |
| Make Data Store | **Not created in Make UI** |

---

## Safety verification (baseline after fixture create)

| Check | Result |
|-------|--------|
| XP Events with fixture meeting Source Keys | **0 rows** |
| Happy / disabled meeting Attendees | **0** (unchanged after create) |
| Conflict meeting Attendees | **1** (Schmidt — intentional fixture setup for Conflict=1 only) |
| Historical `ZOOM_ATTEND_BASE\|…` | Not touched by this work |
| Automation 101 / 117 / 057 / 042 scripts | Not edited for this Agent 2 package beyond existing branch 117/117f email-deferral work |
| 115 | Still absent |

---

## Secrets scan (tracked 117f paths)

No `hooks.make.com` URL, PAT, Bearer token, or parent recipient in:

- `117f-zoom-recording-send-approval-email.js`
- `make/lib/c025-117f-*`
- `make/blueprints/c025-117f-*`
- `make/test-payloads/c025-117f-*`
- contract / checklist / paste / this evidence doc

Reply-To brand address `coach@127sportsintensity.com` remains documentation-only (071 parity).

---

## Files changed (Agent 2 + scoped Agent 1 package)

See commit message. Unrelated 021 / media / overnight / recovery / schema-snapshot / temp tools **excluded**.

---

## Exact remaining blocker before PROD preparation

1. **Mike:** Make.com UI — build scenario from blueprint **OFF**; set `testRecipientEmail` to Mike-controlled test inbox (ops only); create Custom webhook (no early 2xx).  
2. **Mike / Agent:** Run Make checklist M1–M5 (Run once).  
3. **Mike:** Paste [117f v1.2.0](./C-025-stage17-117f-v1.2.0-PASTE.txt) into DEV Airtable **OFF**; inputs `recordId` + `webhookUrl` blank.  
4. **Mike authorizes** then one controlled ON: map DEV webhook → run happy ZA → confirm stamps + single test Gmail → OFF + clear webhook.  
5. **Only after DEV proof:** consider PROD prep (out of scope for this agent).

One-page UI sheet: [C-025-117f-dev-manual-action-sheet.md](./C-025-117f-dev-manual-action-sheet.md)
