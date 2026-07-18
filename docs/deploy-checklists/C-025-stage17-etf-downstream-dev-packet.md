# C-025 Stage 17 — Engineering Test Framework DEV packet (115 v1.6)

**Status:** Repository-ready · **No new Airtable fields** · Mike UI steps below
**DEV:** `appTetnuCZlCZdTCT` · **PROD:** forbidden (do not paste 115)
**Scenario:** `C025_STAGE17_DOWNSTREAM`
**Testing Scenarios record:** `recEuHFTjBftoJGMc`
**Paste body:** [C-025-stage17-115-etf-v1.6-PASTE.txt](./C-025-stage17-115-etf-v1.6-PASTE.txt)

---

## Why v1.6

Automation **042** fires on **When record enters a view** → view **`042`** (`Level Recalc Needed?` is checked).

Writing `Level Recalc Needed? = checked` when it is **already checked** does **not** re-enter the view, so 042 never runs.

v1.6 forces a leave/re-enter transition on Enrollment `recgP9qZYjAhE7NXm` before polling.

---

## Phase B trigger (confirmed)

| Step | Action |
|------|--------|
| 1 | Exact-read `Level Recalc Needed?` |
| 2a (was checked) | Set **unchecked** → confirm read succeeds → set **checked** |
| 2b (was unchecked) | Set **checked** once |
| 3 | Record `viewEntryTriggeredAt` |
| 4 | Poll ZA exactly for `Gate Credit Applied?` (max 5 × ~2.5s) |

Resume: if `Gate Credit Applied?` already true and `resetFixtures` is false → **skip** retrigger.

---

## Query-budget design (unchanged caps)

| Rule | Value |
|------|-------|
| Internal hard stop | `MAX_QUERY_BUDGET = 22` |
| Poll 057 / 042 | **5** each · ZA exact-record only |
| Extra 042 trigger reads | ≤2 (pre-read + confirm uncheck) |
| Worst-case invocation | **≈21** (≪ 30) |

---

## Mike — DEV replacement steps (115 only)

1. Keep **057 / 042 / 117 OFF** while pasting.
2. Replace Automation **115** with [C-025-stage17-115-etf-v1.6-PASTE.txt](./C-025-stage17-115-etf-v1.6-PASTE.txt).
3. Confirm header **v1.6**.
4. Live card: ON **057+042**, OFF **117**, Run Test? on `recEuHFTjBftoJGMc`.
5. After result: OFF 057+042 again.

Do **not** paste into PROD. Do **not** enable 117. Leave **101** unchanged.
