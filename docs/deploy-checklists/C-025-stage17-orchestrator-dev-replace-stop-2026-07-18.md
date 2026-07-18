# C-025 Stage 17 — Orchestrator DEV replace/test STOP (2026-07-18)

**Branch:** `feature/c025-stage17-zoom-attendance`
**Verified commit:** `c952879`
**DEV:** `appTetnuCZlCZdTCT` · **PROD:** `appn84sqPw03zEbTT` (untouched)

---

## Verdict

**STOPPED before script paste / controlled automation runs.**

Automations Meta API still returns **403**. Cursor cannot list, inspect, replace, enable, or run Airtable Automations. Replacement of **117 - Zoom Recording Credit - Orchestrator** requires Mike in the DEV Automations UI.

Isolated DEV fixtures were prepared and retained for immediate post-paste testing.

---

## Stop condition matched

| Condition | Status |
|-----------|--------|
| Automations API paste | **Blocked (403)** |
| Inspect actions after script | **Cannot** — UI only |
| Confirm `recordId` mapping | **Cannot** until UI open |
| Confirm no email/Make actions after script | **Cannot** until UI open |

---

## Mike paste card (exact)

Keep automation **OFF** the entire time except isolated Test runs.

### 1. Open

DEV Automations → **`117 - Zoom Recording Credit - Orchestrator`**

### 2. Safety inspection (stop if fail)

Confirm:

- [ ] Automation is **OFF**
- [ ] **No actions after the script** (no email, no webhook, no update-record to Attendees)
- [ ] No scheduled trigger besides the record trigger you will replace

If any extra action exists → **STOP and report** before replacing script.

### 3. Replace trigger

Remove: `Recording Quiz Submitted At is one week from now`

Set:

| Item | Value |
|------|--------|
| Table | **Zoom Attendance** |
| When | Record matches conditions (or equivalent “when record updated / matches”) |
| Conditions | `Attendance Method` **is** `Recording Quiz` |
| | `Enrollment` **is not empty** |
| | `Zoom Meeting` **is not empty** |

### 4. Inputs

| Variable | Value |
|----------|--------|
| `recordId` | Airtable record ID of the triggering Zoom Attendance record (**required**) |
| `webhookUrl` | **Leave blank** |

### 5. Paste script

File (repo): `airtable/automations/shooting-challenge/117-zoom-recording-credit-orchestrator.js` **v1.1.0**
Paste-ready body (GitHub header already stripped):
[`C-025-stage17-117-orchestrator-v1.1.0-PASTE.txt`](./C-025-stage17-117-orchestrator-v1.1.0-PASTE.txt)

Confirm in pasted body:

- version `v1.1.0`
- no `attendees: "Attendees"` config
- XP Bucket `Zoom Attendance`
- XP Source `Zoom Meeting Recording Quiz`
- `XP Activity Date` / Public / Debug
- `Refuse write to Attendees`

### 6. Leave OFF

Do not enable permanently. For each test: enable → Run test on one fixture → disable immediately.

### 7. Reply to Cursor with

1. Automation ID (if visible)
2. Confirmation: previous version was v1.0.0 (or whatever shown)
3. Confirmation: no actions after script
4. Trigger screenshot / text
5. Which fixture Test runs completed

Then Cursor will verify XP Events / Attendees / flags via API and commit results.

---

## Prepared fixtures (retained)

Tag: `C025-S17-ORCH-TEST` · stamp `20260718-093512`
Enrollment: Schmidt `recgP9qZYjAhE7NXm`

| Scenario | Zoom Attendance ID | Notes |
|----------|--------------------|-------|
| Eligible approved (amount **30**) | `reciRsLuiJGYcea3U` | Key `ZOOM_CREDIT\|recgP9qZYjAhE7NXm\|recwnEKJAW8hxPSNL` · Approved=1 · Conflict=0 · Gate=1 · PW flag=1 |
| Missing approval | `recRMXO3Yy6olFlrk` | Amount 0 · Approved=0 |
| Needs Correction | `recRhwglba8cK7NUH` | Amount 0 · Approved=0 |
| Missing Enrollment | `recf3nLZDDCEupt3e` | No Enrollment link |
| Missing Zoom Meeting | `recgwpubxhs76fXUZ` | No Meeting link |
| Live sibling | `recVgsm8Zzg51gqNF` | Method Live on conflict meeting |
| Recording + live conflict | `recwbD9fKLPRzVhQn` | Conflict=1 · Amount 0 |
| Meeting (eligible) | `recwnEKJAW8hxPSNL` | Create XP Events unchecked · XP Award Status Awarded · Attendees empty |
| Meeting (conflict) | `rechIfspgLxgO4tL0` | Same 101-safe settings · Attendees empty |

`Normal Live Zoom XP` set to **60** on recording fixtures so formula `FLOOR(60 * 50 / 100) = 30`.

Evidence: `tools/airtable/_preview/c025_stage17_orchestrator_fixtures.json`

---

## Tests not run (blocked on paste)

Scenarios 1–15 from the task brief — **not executed** against Automation 117 (script not replaced / not runnable from Cursor).

---

## Safety confirmations (this session)

| Item | Status |
|------|--------|
| Automation 117 permanently enabled | **No** (API cannot enable; left for Mike OFF) |
| Automation 101 modified | **No** |
| PROD modified | **No** |
| Make / email sent | **No** |
| Softr | **No** |
| Recording path wrote Attendees | **No** (fixtures left Attendees empty) |

---

## Known downstream gaps (unchanged)

- **057** counts live `Attendees` only — do not mark Perfect Week integration passing
- **042** reads live `Total Zoom Attendances` — do not mark gate integration passing

Recording flags (`Gate Credit Applied?` / `Perfect Week Credit Applied?`) are observation-only after paste.

---

## Recommended next step

1. Mike completes paste card above (5–10 minutes).
2. Reply with automation ID + “no post-script actions” confirmation.
3. Cursor runs API verification on fixtures after each controlled Test run.
4. Docs commit: `docs: record stage17 orchestrator DEV test results`
