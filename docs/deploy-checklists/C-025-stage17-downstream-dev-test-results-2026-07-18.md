# C-025 Stage 17 — Downstream DEV install results (2026-07-18)

**Branch:** `feature/c025-stage17-zoom-attendance`
**Verified tip at start:** `233bd51` · docs tip before final UI attempt: `c8687e8`
**DEV:** `appTetnuCZlCZdTCT` · **PROD:** `appn84sqPw03zEbTT` (untouched)
**Packet:** [C-025-stage17-perfect-week-level-gate-dev-installation-packet.md](./C-025-stage17-perfect-week-level-gate-dev-installation-packet.md)

---

## Live ETF run (2026-07-18) — PASS

| Item | Value |
|------|--------|
| Testing Scenarios ID | **`recEuHFTjBftoJGMc`** |
| Last Run Status | **Pass** |
| Execution | Records API mirror of 115 C025 branch (115 still **v1.3** → Blocked Other; 057/042 live triggers used) |
| 057 | Zoom attendance count **1**; PW Applied? **true**; WAS status stayed Pending after write |
| 042 | Gate Applied? **true**; Current/Next Level unchanged; recalc cleared |
| Dedupe | count stayed **1**; Applied? flags stable |
| Attendees | **[]** unchanged |
| 115 paste | Still needed for one-click Run Test? path: [115 v1.4 paste](./C-025-stage17-115-etf-v1.4-PASTE.txt) |

**Mike: turn Automation 057 and 042 OFF immediately.**

Evidence: `tools/airtable/_preview/c025_stage17_etf_live_run.json`

---


**Mike confirmed paste:** 057 **v1.3**, 042 **v3.1**, 117 **v1.1.1** (optional), `recordId` mapped, 117 `webhookUrl` blank, no post-script actions, all **OFF**.

Cursor **still cannot** enable, disable, or run Airtable Automations (Meta API **403**). Controlled UI Test clicks must be done by Mike. Fixtures are prepared and Applied? flags cleared for a clean before→after.

### Prepared fixtures (Records API)

| Role | ID |
|------|-----|
| Isolated WAS (created) | `recvtukGFL7u74Tme` |
| Enrollment (Schmidt) | `recgP9qZYjAhE7NXm` |
| Week | `rec7fCckt1zj9CbmP` |
| Zoom Attendance (eligible) | `reciRsLuiJGYcea3U` |
| Zoom Meeting | `recwnEKJAW8hxPSNL` |
| Tag | `C025-S17-DOWNSTREAM-UI-TEST` |

### Before state (pre-UI-Test)

| Field | Value |
|-------|--------|
| WAS Automation Status | `Pending` |
| WAS Zoom Meeting / Attendance counts | null / null |
| ZA `Perfect Week Credit Applied?` | **false/null** (cleared) |
| ZA `Gate Credit Applied?` | **false/null** (cleared) |
| Meeting Attendees | `[]` |
| Enrollment Current / Next Level | `rec1iGy92ZC0jwzD4` / `rec1EJLJLmfdJLtoF` |
| Level Status | `Assigned` |
| Formula `Total Zoom Attendances` | `1` (live-only; unchanged) |
| Gate Minimum Zoom Meetings | `0` (rule `reccFKwOVHZ3hn36i`) |
| Level Recalc Needed? | unchecked |

Prep JSON: `tools/airtable/_preview/c025_stage17_final_ui_test_prep.json`
Capture script (run after Mike Tests): `tools/airtable/_c025_stage17_capture_final_ui_tests.py`

### Mike UI Test card (~5–8 min)

**Do not enable 117. Do not write Attendees. Leave OFF when done.**

#### Test 1 — Automation 057

1. Enable **only** `057 - … Perfect Week Eligibility`.
2. In the automation, use **Test** / Run with `recordId` = **`recvtukGFL7u74Tme`**.
3. From run history, copy: status, outputs, error text.
4. **Turn 057 OFF immediately.**
5. Expect: WAS Zoom Meeting Count ≥ 1 (week has meetings), Zoom Attendance Count **1**, `Perfect Week Credit Applied?` **true** on `reciRsLuiJGYcea3U`, Attendees still `[]`.

#### Test 2 — Automation 042

1. Confirm 057 is **OFF**.
2. Enable **only** `042 - … Assign Current and Next Level`.
3. **Test** / Run with `recordId` = **`recgP9qZYjAhE7NXm`**.
4. Copy: status, outputs, `effectiveZoomCountOut` (if configured), errors.
5. **Turn 042 OFF immediately.**
6. Expect: `Gate Credit Applied?` **true** on eligible ZA; Attendees still `[]`; levels follow existing rules (min zoom = 0 so gate zoom should not block).

#### Dedupe rerun

1. Re-enable **one** automation, Test the **same** `recordId` once more, then OFF.
2. Expect: Zoom attendance / effective count still **1** for that meeting; Applied? stays true; no Attendees write.

#### After Tests

Reply in chat: **UI tests done** (paste run-history snippets + automation IDs if visible). Cursor will run the capture script and commit final evidence.

### UI run evidence (pending Mike)

| Item | Status |
|------|--------|
| 057 run status / outputs | **Pending Mike Test** |
| 042 run status / outputs | **Pending Mike Test** |
| Dedupe rerun | **Pending Mike Test** |
| Automation IDs | **Pending Mike** (API 403) |

---

## Execution mode (important)

Automations Meta API remains **403**. Cursor **cannot** list, inspect, replace, enable, disable, or run Airtable Automations.

| Step | Status |
|------|--------|
| Inspect live 057/042 config via API | **Blocked (403)** |
| Paste 057 v1.3 / 042 v3.1 / 117 v1.1.1 via API | **Blocked (403)** |
| Clear premature Applied? on named fixtures | **Done** (Records API) |
| Controlled logic tests | **Done** via REST harness mirroring **057 v1.3** / **042 v3.1** Zoom union |
| Automations enabled by Cursor | **No** |

Evidence JSON: `tools/airtable/_preview/c025_stage17_downstream_test_results.json`
Harness: `tools/airtable/_c025_stage17_run_downstream_tests.py`
Paste bodies (for Mike UI):

- [C-025-stage17-057-perfect-week-v1.3-PASTE.txt](./C-025-stage17-057-perfect-week-v1.3-PASTE.txt)
- [C-025-stage17-042-level-gates-v3.1-PASTE.txt](./C-025-stage17-042-level-gates-v3.1-PASTE.txt)
- [C-025-stage17-117-orchestrator-v1.1.1-PASTE.txt](./C-025-stage17-117-orchestrator-v1.1.1-PASTE.txt)

---

## Step 1 — Live DEV automation inventory

**Not available via API.** Mike must confirm in Automations UI before/after paste:

### 057 — Calculate Perfect Week Eligibility

| Item | Expected (repo / prior docs) | Live DEV (API) |
|------|------------------------------|----------------|
| Automation ID | Unknown | **Unknown (403)** |
| Previous version | **1.2** (repo prior) | Confirm in UI |
| Installed version | **1.3** (paste pending) | **Not pasted by Cursor** |
| Trigger | WAS / Perfect Week calc path (existing) | Confirm unchanged |
| Input | `recordId` | Confirm |
| Post-script actions | Prefer none beyond existing | Confirm |
| Enabled | Leave **OFF** after paste until named Test | Confirm |

### 042 — Assign Current and Next Level

| Item | Expected | Live DEV (API) |
|------|----------|----------------|
| Automation ID | Unknown | **Unknown (403)** |
| Previous version | **3.0** | Confirm in UI |
| Installed version | **3.1** (paste pending) | **Not pasted by Cursor** |
| Trigger | Enrollment enters view (recalc) | Confirm |
| Input | `recordId` | Confirm |
| Optional new output | `effectiveZoomCountOut` | Add if convenient |
| Enabled | Leave **OFF** after paste until named Test | Confirm |

### 117 — Orchestrator (optional refresh)

| Item | Value |
|------|--------|
| Prior paste | **v1.1.0 OFF** (Mike UI) |
| Target | **v1.1.1** (does not set Applied?) |
| State | Keep **OFF** |
| Cursor paste | **Blocked (403)** |

---

## Mike paste card (required — ~10–15 min)

Keep each automation **OFF** except isolated Test runs, then disable again.

### A) Automation 057 → v1.3

1. Open DEV Automations → `057 - Achievements and Milestones - Calculate Perfect Week Eligibility`.
2. Record current version string, trigger, conditions, `recordId` mapping, post-actions, ON/OFF.
3. Replace script with paste body from `C-025-stage17-057-perfect-week-v1.3-PASTE.txt` (already header-stripped).
4. Preserve trigger + `recordId`.
5. Leave **OFF**.

### B) Automation 042 → v3.1

1. Open `042 - Levels and Progression - Assign Current and Next Level`.
2. Record current version/trigger/inputs/state.
3. Replace with `C-025-stage17-042-level-gates-v3.1-PASTE.txt`.
4. Preserve trigger + `recordId`; optionally add output `effectiveZoomCountOut`.
5. Leave **OFF**.

### C) Optional 117 → v1.1.1

1. Replace with `C-025-stage17-117-orchestrator-v1.1.1-PASTE.txt`.
2. Keep trigger / `recordId` / blank `webhookUrl` / no post-actions.
3. Leave **OFF**.

### D) After paste — optional Airtable Test runs

1. Temporarily enable **057**, Test on a WAS for week `rec7fCckt1zj9CbmP` if one exists for Schmidt (none found via API — may need create isolated WAS first).
2. Temporarily enable **042**, Test on Enrollment `recgP9qZYjAhE7NXm`.
3. Disable both again.
4. Reply with automation IDs + versions + Test outputs.

---

## Step 5 — Premature Applied? cleared

Named C-025 fixtures only.

| Fixture | ID | Before (inspect) | Action |
|---------|-----|------------------|--------|
| Eligible | `reciRsLuiJGYcea3U` | PW Applied?=**true**, Gate Applied?=**true** | Cleared by harness, then re-set **only after** consume tests |
| Missing approval | `recRMXO3Yy6olFlrk` | both null | Untouched |
| Needs Correction | `recRhwglba8cK7NUH` | both null | Untouched |
| Recording conflict | `recwbD9fKLPRzVhQn` | both null | Untouched |
| Live sibling | `recVgsm8Zzg51gqNF` | both null | Untouched |

**Final eligible Applied?** (after harness consume): PW=**true**, Gate=**true** — set only when harness counted the credit (mirrors 057/042 ownership).

---

## Fixtures used

| Role | ID |
|------|-----|
| Schmidt enrollment | `recgP9qZYjAhE7NXm` |
| Eligible ZA | `reciRsLuiJGYcea3U` |
| Missing approval | `recRMXO3Yy6olFlrk` |
| Needs Correction | `recRhwglba8cK7NUH` |
| Recording conflict | `recwbD9fKLPRzVhQn` |
| Meeting eligible | `recwnEKJAW8hxPSNL` |
| Meeting conflict | `rechIfspgLxgO4tL0` |
| Week | `rec7fCckt1zj9CbmP` |
| Eligible XP Event | `recuPdEjQv3hS8N7X` (Active?=**true**, 30 pts) |

**Attendees** on both meetings: **[] → []** unchanged every case.
**No WAS** for Schmidt linked to this week (0 hits) — Perfect Week daily/video fields not rewritten; Zoom union tested in harness logic.

**Live attendance:** fixture meetings have empty Attendees. Live-only / live+recording cases used **in-memory simulated live** (explicitly **not** written to Attendees) to avoid Automation **101**.

---

## Perfect Week harness results

| # | Case | Result |
|---|------|--------|
| 1 | Live only (simulated) | **PASS** — attendance count 1 |
| 2 | Recording only | **PASS** — count 1; PW Applied? set after consume |
| 3 | Live + recording same meeting | **PASS** — count 1; live wins; recording not Applied |
| 4 | Conflict | **PASS** — count 0 |
| 5 | Soft-void XP | **PASS*** — XP Active?=true this run; 057 qualifies via ZA flags (does not read XP Active?) |
| 6 | Needs Correction | **PASS** — excluded |
| 7 | Missing approval | **PASS** — excluded |
| 8 | No Zoom meeting week | **PASS** — meeting/attendance counts 0 (formula auto-pass) |
| 9 | Backdated recording | **PASS** — still counts |
| 10 | America/Denver week boundary | **PASS** — Sun–Sat from Weeks.Start Date |
| 11–12 | Daily / video unchanged | **PASS** — no WAS daily/video writes |

\*If XP were soft-voided (`Active?=false`) while ZA remained approved, **057 v1.3 would still count** the ZA flags. Soft-void exclusion remains owned by **117** / approval clearing — noted as residual design gap if Mike wants 057 to also check XP Active?.

---

## Level-gate harness results

| # | Case | Result |
|---|------|--------|
| 1 | Live only (simulated) | **PASS** — effective=1 |
| 2 | Recording gate only | **PASS** — effective=1; Gate Applied? after consume |
| 3 | Live + recording same meeting | **PASS** — effective=1; dedupe |
| 4 | Multiple distinct meetings | **PASS** — effective=2 |
| 5 | Conflict | **PASS** — excluded |
| 6 | Needs Correction | **PASS** — excluded |
| 7 | Missing approval | **PASS** — excluded |
| Soft-void | XP Active? | **PASS** (Active?=true); same ZA-vs-XP note as PW |
| 9 | Enrollment scope | **PASS** — foreign enrollment excluded |
| 10 | Gate minimum met | **PASS** — effective=1 vs Minimum Zoom Meetings=**0** (rule `reccFKwOVHZ3hn36i`) |
| 11 | Gate minimum not met | **N/A** — Schmidt gate min zoom is **0**; cannot demonstrate block on this enrollment without changing thresholds (forbidden) |
| 12–13 | Current/Next + rollback | **PASS** — Enrollment levels **unchanged** (harness did not write levels); rollback path not live-executed |

Formula field `Total Zoom Attendances` remains **1** (live link count) — **042 v3.1** is designed to override with script combined count; formula field itself was **not** modified.

---

## Safety confirmations

| Check | Result |
|-------|--------|
| Attendees unchanged | **Yes** (`[]` both meetings) |
| Automation 101 | **Unchanged** (not edited; no Attendees write) |
| Automation 117 | Remains **OFF** / not refreshed by Cursor |
| 057 / 042 enabled by Cursor | **No** |
| Make / email | **None** |
| PROD | **Untouched** |
| Level thresholds | **Unchanged** |
| XP amounts | **Unchanged** |

---

## Repository tests (post-harness)

| Check | Result |
|-------|--------|
| `c025-stage17-combined-zoom-credit.test.js` | Run at commit time |
| `c025-stage17-zoom-attendance.test.js` | Run at commit time |
| Python `test_c025_stage17_contracts.py` | Run at commit time |
| `validate-v2-release-readiness.js` | Run at commit time |
| `git diff --check` | Run at commit time |

---

## Remaining gaps

1. **Airtable UI Tests not yet run** — Cursor cannot enable/Test automations (API 403); Mike Test card above is blocking.
2. **Automation IDs** still unknown until Mike records them from UI.
3. **Gate min not-met** not demonstrable on Schmidt (min zoom = 0) without threshold changes.
4. **Soft-void vs 057/042** — scripts trust ZA qualification flags; they do not re-check XP `Active?`.
5. Formula `Total Zoom Attendances` remains live-only by design; 042 v3.1 uses script combined count when run.

---

## Recommended next step

1. Mike completes the **Final Airtable UI Test card** (057 then 042, leave OFF; skip 117).
2. Reply **UI tests done** with run-history snippets + automation IDs.
3. Cursor runs `_c025_stage17_capture_final_ui_tests.py` and commits final evidence.
4. Do **not** promote to PROD until UI evidence is recorded PASS.

---

## Final safety state (this session)

- **057 / 042 / 117** — Mike reports **OFF**; Cursor did not enable
- **101** — unchanged
- Isolated WAS `recvtukGFL7u74Tme` created in DEV only
- Applied? cleared on eligible ZA pending UI consume
- Attendees still `[]`
- No Make / email
- PROD untouched
