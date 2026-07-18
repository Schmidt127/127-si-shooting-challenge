# C-025 Stage 17 — Downstream DEV install results (2026-07-18)

**Branch:** `feature/c025-stage17-zoom-attendance`  
**Verified tip at start:** `233bd51`  
**DEV:** `appTetnuCZlCZdTCT` · **PROD:** `appn84sqPw03zEbTT` (untouched)  
**Packet:** [C-025-stage17-perfect-week-level-gate-dev-installation-packet.md](./C-025-stage17-perfect-week-level-gate-dev-installation-packet.md)

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

1. **UI paste still required** — 057 v1.3, 042 v3.1, optional 117 v1.1.1 not installed in Airtable by Cursor (API 403).
2. **Automation IDs / prior live versions** unknown until Mike records them.
3. **No Schmidt WAS** for week `rec7fCckt1zj9CbmP` — full Airtable Test of 057 on a real WAS not run.
4. **Live Attendees** not written — live cases are harness-simulated (correct safety).
5. **Gate min not-met** not demonstrable on Schmidt (min zoom = 0) without threshold changes.
6. **Soft-void vs 057/042** — scripts trust ZA qualification flags; they do not re-check XP `Active?`.
7. Formula `Total Zoom Attendances` still live-only until 042 v3.1 is pasted and run.

---

## Recommended next step

1. Mike completes paste card (057 → 1.3, 042 → 3.1, optional 117 → 1.1.1), leave all **OFF**.
2. Reply with automation IDs + confirmed triggers/inputs.
3. Cursor (or Mike) runs one controlled Airtable **Test** each on 057/042, then leave **OFF** for review — or enable only after Mike approves continuous DEV use.
4. Do **not** promote to PROD.

---

## Final safety state (this session)

- **057** — not pasted by Cursor; presumed prior state (unknown ON/OFF)
- **042** — not pasted by Cursor; presumed prior state
- **117** — **OFF** (not refreshed)
- **101** — unchanged
- No recording athlete on Attendees
- No Make / email
- PROD untouched
