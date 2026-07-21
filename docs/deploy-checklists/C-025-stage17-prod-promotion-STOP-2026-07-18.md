# C-025 Stage 17 — PROD promotion STOP (2026-07-18)

> **⚠️ SUPERSEDED — HISTORICAL RECORD (resolved 2026-07-20).** The STOP / BLOCKED / pre-migration conditions below have been **resolved**. C-025 Stage 17 Zoom recording **credit** is **COMPLETE in PROD** (Airtable Automation **117** v1.1.1 / **057** v1.3 / **042** v3.1 ON; **101** unchanged). The Zoom Recording **Approval Email** is Airtable Automation **117** → **Make** identifier **117f** (canonical four-part send key `ZOOM_REC_EMAIL|{EnrollmentRID}|{ZoomMeetingRID}|{ZoomAttendanceRID}`) — **tested, not documented as fully live**. Retained for historical evidence only. **Authoritative current state:** [Stage 17 current PROD progress](../status/C-025-stage17-current-prod-progress.md) · credit evidence [prod-live](./C-025-stage17-prod-live-2026-07-20.md) · email workflow [PROD 117f](./C-025-117f-prod-zoom-recording-approval-email.md).

**Status:** **STOPPED at Step 1** — final DEV one-click verification did not Pass  
**Feature tip:** `3431ca9`  
**DEV:** `appTetnuCZlCZdTCT` · **PROD:** `appn84sqPw03zEbTT` (untouched this session)

---

## Stop condition matched

User instruction: *Stop if the one-click test fails.*

| Check | Result |
|-------|--------|
| Automation 115 one-click `C025_STAGE17_DOWNSTREAM` | **FAIL** — `Run Test?` stayed **true**; 115 did not clear it within 75s (115 OFF and/or not pasted as **v1.4**) |
| 115 response | Prior Last Run Status still showed Pass from earlier mirror; no new C025 JSON from 115 |
| Fallback mirror with 057/042 | **FAIL** — `Perfect Week Credit Applied?` stayed null (057 likely **OFF**); Attendees remained `[]` |
| Merge to `master` | **Not done** |
| PROD paste / enable | **Not done** |
| Automation 115 promoted | **No** (forbidden) |

Evidence: `tools/airtable/_preview/c025_stage17_etf_live_run.json`

Stuck `Run Test?` on `recEuHFTjBftoJGMc` was cleared after the stop.

---

## What already passed earlier (not a substitute for Step 1)

| Evidence | Value |
|----------|--------|
| Prior ETF Pass | `recEuHFTjBftoJGMc` Pass via Records API mirror while 057/042 were ON ([downstream results](./C-025-stage17-downstream-dev-test-results-2026-07-18.md)) |
| Repo 115 v1.4 | Ready — [C-025-stage17-115-etf-v1.4-PASTE.txt](./C-025-stage17-115-etf-v1.4-PASTE.txt) |
| Repo 117 / 057 / 042 | v1.1.1 / v1.3 / v3.1 paste bodies ready |

Step 1 requires a **fresh** one-click Pass with **115 v1.4** driving the run while 057+042 are ON.

---

## Mike card to unblock Step 1 (then re-ask Cursor to promote)

1. Paste **115 v1.4** from `docs/deploy-checklists/C-025-stage17-115-etf-v1.4-PASTE.txt` into DEV Automation 115 (if not already).
2. Confirm **117 OFF**.
3. Turn **115 ON** (DEV only).
4. Turn **057 ON** and **042 ON**.
5. On Testing Scenarios `recEuHFTjBftoJGMc` (`C025_STAGE17_DOWNSTREAM`), uncheck Dry Run?, check **`Run Test?`**.
6. Wait until **Last Run Status** updates and **`Run Test?` clears** — expect **Pass** with Actual Result JSON containing `phaseA_057` / `phaseB_042` / `c025_pass`.
7. Turn **057 OFF**, **042 OFF**. Leave **117 OFF**. 115 may return to normal DEV state.
8. Reply **one-click Pass** + paste Last Run Status / notes.

Then Cursor will resume: merge → PROD preflight → paste packet → smoke → gradual enable.

---

## Not started (blocked)

- Full repo validation + merge to `master` + push
- PROD automation inventory / script rollback files
- PROD schema + XP Reward Rule preflight (write)
- PROD paste of 117 / 057 / 042
- PROD smoke / enable / monitor

---

## Safety this session

- PROD Airtable **not modified**
- No merge to `master`
- 117 not enabled
- 101 not modified
- 115 not promoted
- Attendees remained empty on the failed attempt
