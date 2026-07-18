# C-025 Stage 17 — Orchestrator DEV replace/test STOP (2026-07-18, session 2)

**Branch:** `feature/c025-stage17-zoom-attendance`  
**Verified commit:** `c952879`  
**This session:** Automations Meta API re-probed; fixtures refreshed; repo tests run  
**DEV:** `appTetnuCZlCZdTCT` · **PROD:** `appn84sqPw03zEbTT` (untouched)

---

## Verdict

**STOPPED before Automation 117 script paste / controlled automation Test runs.**

Stop condition matched: **Automations Meta API returns 403** — Cursor cannot list, inspect, replace, enable, disable, or run Airtable Automations. Replacement of **117 - Zoom Recording Credit - Orchestrator** requires Mike in the DEV Automations UI.

Isolated DEV fixtures remain ready and were re-verified (eligible amount **30**).

---

## Stop conditions checked this session

| Condition | Status |
|-----------|--------|
| Automations API paste / enable / Test run | **Blocked (403)** |
| Inspect actions after the script | **Cannot** — UI only |
| Confirm `recordId` mapping from trigger | **Cannot** until UI open |
| Confirm no email/Make actions after script | **Cannot** until UI open |
| Script attempts Attendees write (repo) | **PASS** — v1.1.0 refuses Attendees |
| XP Source / Bucket / formula amount (repo + fixtures) | **PASS** |
| PROD access required | **No** — DEV only |

---

## Mike paste card (exact — 5–10 min)

Keep automation **OFF** except isolated Test runs, then disable again.

### 1. Open

DEV Automations → **`117 - Zoom Recording Credit - Orchestrator`**

### 2. Safety inspection (STOP if fail)

Confirm before replacing anything:

- [ ] Automation is **OFF**
- [ ] **No actions after the script** (no email, no webhook, no update-record to Attendees)
- [ ] No unrelated scheduled trigger left in place

If any extra action exists → **STOP and report** before replacing script.

### 3. Replace trigger

Remove: `Recording Quiz Submitted At is one week from now`

| Item | Value |
|------|--------|
| Table | **Zoom Attendance** |
| Conditions | `Attendance Method` **is** `Recording Quiz` |
| | `Enrollment` **is not empty** |
| | `Zoom Meeting` **is not empty** |
| Do not add | Scheduled trigger |

### 4. Inputs

| Variable | Value |
|----------|--------|
| `recordId` | Airtable record ID of the triggering Zoom Attendance record (**required**) |
| `webhookUrl` | **Leave blank** |

### 5. Paste script v1.1.0

- Repo: `airtable/automations/shooting-challenge/117-zoom-recording-credit-orchestrator.js`
- Paste-ready (header stripped): [`C-025-stage17-117-orchestrator-v1.1.0-PASTE.txt`](./C-025-stage17-117-orchestrator-v1.1.0-PASTE.txt)

Confirm in body: `v1.1.0` · no Attendees config · Bucket `Zoom Attendance` · Source `Zoom Meeting Recording Quiz` · `XP Activity Date` / Public / Debug · `Refuse write to Attendees`

### 6. Leave OFF

Do not enable permanently.

### 7. Reply to Cursor with

1. Automation ID  
2. Previous version seen (expect v1.0.0)  
3. Confirmation: no actions after script  
4. New trigger text  
5. Which fixture Test runs you completed  

Then Cursor will API-verify XP Events / Attendees / flags and commit  
`docs: record stage17 orchestrator DEV test results`.

---

## Prepared fixtures (retained / refreshed)

Tag: `C025-S17-ORCH-TEST` · Enrollment Schmidt `recgP9qZYjAhE7NXm`  
`Normal Live Zoom XP` = **60** → formula amount **30** when approved.

| Scenario | Zoom Attendance ID | Key notes |
|----------|--------------------|-----------|
| Eligible approved (30 XP) | `reciRsLuiJGYcea3U` | `ZOOM_CREDIT\|recgP9qZYjAhE7NXm\|recwnEKJAW8hxPSNL` · Approved=1 · Conflict=0 · Gate=1 · PW=1 |
| Missing approval | `recRMXO3Yy6olFlrk` | Amount 0 |
| Needs Correction | `recRhwglba8cK7NUH` | Amount 0 |
| Missing Enrollment | `recf3nLZDDCEupt3e` | |
| Missing Zoom Meeting | `recgwpubxhs76fXUZ` | |
| Live sibling | `recVgsm8Zzg51gqNF` | Method Live |
| Recording + live conflict | `recwbD9fKLPRzVhQn` | Conflict=1 · Amount 0 |
| Meeting (eligible) | `recwnEKJAW8hxPSNL` | Attendees empty · Create XP Events unchecked · XP Award Status Awarded |
| Meeting (conflict) | `rechIfspgLxgO4tL0` | Same 101-safe settings |

Suggested first Test run: enable briefly → Test on `reciRsLuiJGYcea3U` → disable immediately.

Evidence: `tools/airtable/_preview/c025_stage17_orchestrator_fixtures.json`

---

## Repository tests this session

| Check | Result |
|-------|--------|
| `node …/c025-stage17-zoom-attendance.test.js` | **PASS** (21) |
| Python Stage 17 contracts (`unittest`) | **PASS** |
| `node tools/validate-v2-release-readiness.js` | **PASS** (1 unrelated WARN) |
| `git diff --check` | **PASS** |
| Automations Meta API | **403** |

---

## Final report (blocked items marked)

| # | Item | Result |
|---|------|--------|
| 1 | Automation 117 ID | **Unknown** (UI / API 403) |
| 2 | Previous version | **Unknown** until Mike confirms (expect v1.0.0) |
| 3 | Installed version | **Not installed this session** — repo ready **v1.1.0** |
| 4 | Previous trigger | Incorrect: `Recording Quiz Submitted At is one week from now` (per task / prior inventory) |
| 5 | New trigger | **Not applied** — paste card §3 |
| 6 | Input variables | Spec: `recordId` required; `webhookUrl` blank — **not applied** |
| 7 | Test records | Fixtures above (ready) |
| 8–16 | Eligible XP / amount / key / dedupe / conflict / soft-void / Attendees / date / email | **Not run** — need post-paste Test runs |
| 17–18 | Perfect Week / Gate flags | Observation-only after paste; **057/042 gaps remain** |
| 19 | Final Automation 117 state | Assumed **OFF** (cannot toggle via API) |
| 20 | Automation 101 unchanged | **Yes** (no API/schema changes this session) |
| 21 | PROD untouched | **Yes** (`appn84sqPw03zEbTT` not targeted) |
| 22 | Make/email untouched | **Yes** |
| 23 | Documentation commit | This stop doc update |
| 24 | Repository tests | PASS (see table) |
| 25 | Remaining gaps | **057** live Attendees only; **042** live `Total Zoom Attendances` |
| 26 | Recommended next task | Mike completes paste card → Cursor verifies fixtures via Records API |

---

## Safety confirmations

| Item | Status |
|------|--------|
| Automation 117 permanently enabled | **No** |
| Automation 101 modified | **No** |
| PROD modified | **No** |
| Make / email sent | **No** |
| Softr | **No** |
| Recording path wrote Attendees | **No** |

---

## Known downstream gaps (unchanged)

- **057** counts live `Attendees` only — do not mark Perfect Week integration passing  
- **042** reads live `Total Zoom Attendances` — do not mark gate integration passing  
