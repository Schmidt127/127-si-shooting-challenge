# C-025 Stage 17 — Engineering Test Framework DEV packet (115 v1.4)

**Status:** Repository-ready · **No new Airtable fields** · Mike UI steps below  
**Branch tip at package:** see git log  
**DEV:** `appTetnuCZlCZdTCT` · **PROD:** forbidden  
**Scenario:** `C025_STAGE17_DOWNSTREAM`  
**Testing Scenarios record:** `recEuHFTjBftoJGMc`

---

## Architecture (reuse, do not replace)

| Piece | Role |
|-------|------|
| Table **Testing Scenarios** | Operator control plane — `Run Test?`, results writeback |
| Automation **115** | Scenario router when `Run Test?` checked |
| Daily / Homework / Video | **Unchanged** intake branches (still create Fillout-shaped Submissions) |
| **C025_STAGE17_DOWNSTREAM** | New branch (v1.4): prepare fixtures → trigger **057** + **042** via normal conditions → poll → write JSON to **Actual Result** |

**No new fields.** Identity = Scenario Type **Other** (or Perfect Week) + name/requirements containing `C025_STAGE17_DOWNSTREAM`.

---

## Trigger methods (production-like)

| Automation | How 115 fires it |
|------------|------------------|
| **057** | WAS `Perfect Week Automation Status`: Ready → then **Pending** (re-enter normal path). Optionally links Goal Record so Calculation Queue can be 1. |
| **042** | Enrollment `Level Recalc Needed?` = true → enters view **042 - Needs Level Assignment**. |

115 does **not** call script bodies of 057/042 directly. It never writes `Attendees`.

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

## Results writeback (existing fields only)

| Field | Content |
|-------|---------|
| Last Run Status | Pass / Fail |
| Last Run At | Timestamp |
| Actual Result | JSON: phaseA_057, phaseB_042, dedupe, attendees, fixtures |
| Pass/Fail Notes | Short summary |
| Run Test? | Cleared after run |

---

## Cleanup

- Clears `Run Test?`
- Clears `Level Recalc Needed?` if still set
- Retains WAS / ZA fixtures (not deleted)
- Never touches Attendees / XP amounts / gate thresholds

---

## Prerequisites before Mike’s card

1. Paste **115 v1.4** into DEV Automation 115: [C-025-stage17-115-etf-v1.4-PASTE.txt](./C-025-stage17-115-etf-v1.4-PASTE.txt) (skip GitHub header — already stripped).
2. Confirm **057 v1.3** and **042 v3.1** already pasted.
3. Confirm **117 OFF**. Keep email / Make / schedules OFF.
4. Confirm **101** unchanged.

---

## Mike’s test card (6 steps)

1. Confirm **117** is **OFF**.
2. Turn **057** and **042** **ON**.
3. Open **Testing Scenarios** → record **`C025_STAGE17_DOWNSTREAM`** (`recEuHFTjBftoJGMc`) → check **`Run Test?`** (leave Dry Run? unchecked).
4. Wait until **Last Run Status** is **Pass** or **Fail** (may take ~1–2 minutes while 115 polls 057/042).
5. Turn **057** and **042** **OFF**.
6. Send Cursor the Testing Scenarios record ID + Last Run Status + Pass/Fail Notes (or paste Actual Result JSON).

Do **not** use Airtable’s per-automation Test button or type WAS/Enrollment IDs.

Optional dry-run first: check **Dry Run?** + **Run Test?** with 057/042 still OFF — should Pass with a plan JSON and no triggers.

---

## Stop / risks

- If 057’s live trigger is not status-based, Phase A may time out → Fail with JSON; confirm trigger in UI and adjust (report back — do not change thresholds).
- Polling uses ~40s budgets per wait; slow DEV queues may need a second `Run Test?`.
- Automations Meta API remains 403 — Cursor cannot toggle 057/042/115 ON/OFF.

---

## PROD

Do not paste 115 v1.4 or enable 057/042 combined path in PROD from this packet.
