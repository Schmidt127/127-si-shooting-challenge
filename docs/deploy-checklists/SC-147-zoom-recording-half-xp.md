# SC-147 — Recorded Zoom half-XP (101 extension)

**Status:** **GitHub complete (PR #338 merged) — Production paste pending Mike — NOT Production-complete**  
**Date:** 2026-09-02  
**Backlog:** SC-147 / MRW-H10  
**Merge commit:** `49098217` on `master`  
**Production automation:** **101** (extended v6.7) — **no new slot**  
**Operator packet:** [`101-v6.7-sc-147-operator-packet.md`](./101-v6.7-sc-147-operator-packet.md)  
**Formula fix:** [`SC-147-reconciliation-trigger-formula-fix.md`](./SC-147-reconciliation-trigger-formula-fix.md)  
**Production base:** `appn84sqPw03zEbTT`  
**Design brief:** [`docs/challenge-year/RECORDED-ZOOM-HALF-XP-DESIGN-BRIEF.md`](../challenge-year/RECORDED-ZOOM-HALF-XP-DESIGN-BRIEF.md)

> **No DEV base.** DEV base retired **2026-08-19**. All install and proof is **Production-only** with disposable VERIFY/Schmidt records. Slot **121 is not used**.

---

## Current state

| Item | Status |
|------|--------|
| Product/design decision | **Confirmed** (Mike 2026-08-27) |
| Automation slot | **101 extended** (v6.7) — no slot 121 |
| GitHub / PR #338 | **Merged** to `master` @ `49098217` |
| XP Reward Rules row | **`ZOOM_RECORDING`** optional (fallback `floor(live/2)`) |
| Offline tests | **24/24 pass** |
| Reconciliation trigger | **Formula fix documented** — apply before 101 paste |
| Production paste | **Pending Mike** |
| Production-complete | **No** — until paste + controlled proof |

---

## Architecture

| Automation | Role |
|------------|------|
| **101 v6.7** | Live Zoom XP + recording half-XP (same reconciliation pass) |
| **117 v2.1** | Recording approval **email** only |
| **121** | Retired design artifact only |

**Source Key:** `ZOOM_RECORDING_CREDIT|{enrollmentId}|{zoomMeetingId}`

---

## Reconciliation trigger (critical)

Recording-only approval on Zoom Attendance **does not** flip `Zoom XP Reconciliation Needed?` until the formula package in [`SC-147-reconciliation-trigger-formula-fix.md`](./SC-147-reconciliation-trigger-formula-fix.md) is applied. Gap analysis: [`SC-147-omni-reconciliation-trigger-review.md`](./SC-147-omni-reconciliation-trigger-review.md).

---

## Mike actions (Production-only)

1. **Apply reconciliation trigger formula fix** ([`SC-147-reconciliation-trigger-formula-fix.md`](./SC-147-reconciliation-trigger-formula-fix.md)) and verify scenario 0
2. Disposable **Production** proof per operator packet
3. Optional: add **`ZOOM_RECORDING`** XP Reward Rules row
4. Paste **101 v6.7** to Production Automation 101
5. Re-prove SC-087 + live Zoom XP unchanged
6. **Do not** create Automation 121

**SC-147 is not Production-complete until steps 2–5 pass (step 1 required before paste).**
