# C-025 Stage 17 — Engineering Test Framework DEV packet (115 v1.8)

**Status:** Repository-ready · **No new Airtable fields** · Mike UI steps below
**DEV:** `appTetnuCZlCZdTCT` · **PROD:** forbidden (do not paste 115)
**Scenario:** `C025_STAGE17_DOWNSTREAM`
**Testing Scenarios record:** `recEuHFTjBftoJGMc`
**Paste body:** [C-025-stage17-115-etf-v1.8-PASTE.txt](./C-025-stage17-115-etf-v1.8-PASTE.txt)

---

## Root cause (v1.7: 057 ran, 115 still Timed Out Waiting for 057)

| Actor | Actual |
|-------|--------|
| **057 success write** | WAS `recvtukGFL7u74Tme` → `Perfect Week Automation Status` = **Ready** (+ Zoom counts, daily/homework/video helpers, clear error) |
| **057 optional side effect** | ZA `Perfect Week Credit Applied?` = true **only if** a recording credit was newly counted (not when live Attendees already covered the meeting) |
| **115 v1.7 wait** | Polled ZA `reciRsLuiJGYcea3U` for `Perfect Week Credit Applied? = true` |

Mismatch: 115 waited on an optional ZA flag, not 057’s real completion field (**WAS Status=Ready**). Console `poll057 ZA #1…#5` matches that bug.

Queue re-entry in v1.7 **did** work (057 ran). Poll window (5 × ~2.5s) is secondary; wrong signal is primary.

---

## Why v1.8

Phase A wait polls **WAS** `Perfect Week Automation Status`:

| Status | 115 action |
|--------|------------|
| **Ready** | Phase A complete → continue to 042 |
| **Error** | Stop awaiting with `057 ended Error` |
| else after 5 polls | Timed Out Waiting for 057 |

Pass A uses Ready + Zoom counts + Attendees unchanged. ZA Applied? is logged only.

057 trigger leave/re-enter (Skipped→Pending) unchanged from v1.7. 042 leave/re-enter unchanged from v1.6.

---

## What changes / what does not

| Item | Change? |
|------|---------|
| **115** | **Yes — paste v1.8** |
| **057** | **No** |
| **042 / 117 / 101** | No |

---

## Mike — DEV replacement + one-click

1. Keep **057 / 042 / 117 OFF** while pasting.
2. Replace 115 with [C-025-stage17-115-etf-v1.8-PASTE.txt](./C-025-stage17-115-etf-v1.8-PASTE.txt).
3. Confirm header **v1.8**.
4. ON **057+042**, OFF **117**, Run Test? on `recEuHFTjBftoJGMc`.
5. Console should show `poll057 WAS #…` (not `poll057 ZA`).
6. Expect leave `c025_awaiting_057` when WAS hits Ready; then Phase B.
7. After result: OFF 057+042.

Do **not** paste PROD. Do **not** enable 117. Leave **101** unchanged.
