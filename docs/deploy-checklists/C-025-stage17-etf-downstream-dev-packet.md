# C-025 Stage 17 — Engineering Test Framework DEV packet (115 v1.5)

**Status:** Repository-ready · **No new Airtable fields** · Mike UI steps below  
**DEV:** `appTetnuCZlCZdTCT` · **PROD:** forbidden (do not paste 115)
**Scenario:** `C025_STAGE17_DOWNSTREAM`
**Testing Scenarios record:** `recEuHFTjBftoJGMc`
**Paste body:** [C-025-stage17-115-etf-v1.5-PASTE.txt](./C-025-stage17-115-etf-v1.5-PASTE.txt)

---

## Why v1.5 (root cause)

115 **v1.4** exceeded Airtable’s **30 table queries per script invocation** inside unbounded `waitFor057` polling (≈20 attempts × dual exact-record reads, plus other selects).

v1.5 keeps the same scenario routing and triggers, but caps the query budget.

---

## Query-budget design

| Rule | Value |
|------|-------|
| Internal hard stop | `MAX_QUERY_BUDGET = 22` |
| Poll attempts (057) | **5** max · ~2.5s delay · **ZA exact-record only** |
| Poll attempts (042) | **5** max · ~2.5s delay · **ZA exact-record only** |
| Full-table `selectRecordsAsync` | **Forbidden** on C025 path |
| Attendees writes | **Refused** |

### Expected query counts

| Path | Queries (approx.) |
|------|-------------------|
| Initial snapshot (WAS/ZA/ZM/Enrollment) | 4 |
| Poll 057 (worst) | 5 |
| Poll 042 (worst) | 5 |
| Final verify (WAS/ZA/ZM/Enrollment) | 4 |
| **Branch worst-case** | **18** |
| + main scenario load | +1 → **19** |
| Resume both Applied? | 4 + 4 = **8** |

Safety headroom: 19 ≤ 22 ≪ 30.

---

## Timeout / resume

| Condition | Behavior |
|-----------|----------|
| 057 not Applied? within 5 polls | Last Run Status **Blocked**, status `Timed Out Waiting for 057`, **Run Test? cleared** |
| 042 not Applied? within 5 polls | Same for 042 |
| Rerun with PW Applied? | Skip 057 → continue 042 |
| Rerun with PW + Gate Applied? | Skip both → final verify → Pass if stable |
| Explicit reset | Scenario Requirements JSON `"resetFixtures": true` clears Applied? flags once |

Do **not** treat slow Airtable automation queues as Fail solely due to delay — use Awaiting/Blocked + rerun.

---

## Architecture (unchanged routing)

| Piece | Role |
|-------|------|
| Daily / Homework / Video | **Unchanged** intake branches |
| **C025_STAGE17_DOWNSTREAM** | Optimized exact-record path only |
| Trigger 057 | WAS status Ready → Pending |
| Trigger 042 | `Level Recalc Needed?` = true |
| Automation 117 | Stay **OFF** |

---

## Fixtures

| Role | ID |
|------|-----|
| Testing Scenarios | `recEuHFTjBftoJGMc` |
| Enrollment | `recgP9qZYjAhE7NXm` |
| WAS | `recvtukGFL7u74Tme` |
| Week | `rec7fCckt1zj9CbmP` |
| Zoom Attendance | `reciRsLuiJGYcea3U` |
| Zoom Meeting | `recwnEKJAW8hxPSNL` |

---

## Mike — DEV replacement steps (115 only)

1. Keep **057 / 042 / 117 OFF** while pasting.
2. Open DEV Automation **115** → replace script with [C-025-stage17-115-etf-v1.5-PASTE.txt](./C-025-stage17-115-etf-v1.5-PASTE.txt) (file is already paste-ready; starts at docblock).
3. Confirm version string **v1.5** in the script header.
4. Optional dry-run: Dry Run? + Run Test? with 057/042 still OFF → Pass plan JSON, `queryCount` ≤ 4.
5. For live: turn **057 + 042 ON**, **117 OFF**, check **Run Test?** on `recEuHFTjBftoJGMc`.
6. After Pass/Blocked/Fail: turn **057 + 042 OFF** again.
7. If Blocked awaiting 057/042: re-check Run Test? later (resume-safe).

Do **not** paste into PROD. Do **not** enable 117.

---

## Actual Result JSON should include

`phaseA_057`, `phaseB_042`, `dedupe`, `queryCount`, `queryBudget`, `currentStep`, attempts, fixtures, Applied flags, attendees before/after, `resumedFrom`.
