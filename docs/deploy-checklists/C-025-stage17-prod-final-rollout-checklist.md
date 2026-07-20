# C-025 Stage 17 — Final PROD rollout checklist

**Date written:** 2026-07-20  
**Updated:** 2026-07-20 — **COMPLETE** ([enablement + verification](./C-025-stage17-prod-live-2026-07-20.md))  
**PROD:** `appn84sqPw03zEbTT`  
**Backlog:** C-025  
**Authority:** [117 PROD verification](./C-025-stage17-prod-117-verification-2026-07-20.md) · [enable order](./C-025-stage17-automation-enable-order.md) · [rollback plan](./C-025-stage17-rollback-plan.md)

**Current gate:** Stage 17 recording path is **COMPLETE** in PROD (verification PASS). **117 / 057 / 042 ON**. **101 unchanged**. **`webhookUrl` blank**.

---

## Required automation / input states (now — live)

| Item | Required state | Why |
|------|----------------|-----|
| **117** Orchestrator v1.1.1 | **ON** | Recording quiz credit |
| **101** Live Zoom XP | **Unchanged** live path; do not repaste for Stage 17 | Live `ZOOM_ATTEND_BASE`; only Attendees path may write Attendees |
| **042** Level gates v3.1 | **ON** | Gate Applied? owner |
| **057** Perfect Week v1.3 | **ON** | PW Applied? owner |
| **115** ETF | **Not installed** | DEV-only |
| **117 `webhookUrl`** | **Blank** | Approval email deferred |
| **117a–f modular pack** | **Not installed** alongside 117 | Prefer single orchestrator |

---

## Already complete

| Gate | Evidence |
|------|----------|
| 117 v1.1.1 creation smoke | ZA `recfqsgM7zDobxsPf` → XP `recOceuW34jQz7suD` · **30** XP · `skipped_exists` |
| Effective Recording XP % formula fix | Program Config % only when `Config (Program Scope)` populated |
| Preconflict rollup | `ARRAYJOIN(ARRAYUNIQUE(values), "\n")` — LIVE+REC confirmed |
| Conflict exclusivity | Recording Conflict=1, Approved=0; XP `recOceuW34jQz7suD` inactive |
| Permanent enable | Mike: **117 / 057 / 042 ON** (2026-07-20); 101 unchanged; webhook blank |
| **Stage 17** | **COMPLETE** |
---

## Post-enable monitoring (active)

- [ ] New `ZOOM_CREDIT|…` @ **30** when % = 50 and live base = 60
- [ ] No duplicate Source Keys
- [ ] No recording path writes to **Attendees**
- [ ] Live `ZOOM_ATTEND_BASE|…` history untouched
- [ ] Webhook blank ⇒ no approval emails (expected)

---

## Immediate rollback triggers

| Problem | Immediate action |
|---------|------------------|
| Recording path writes **`Zoom Meetings.Attendees`** | Turn **117 OFF** |
| New live **`ZOOM_ATTEND_BASE`** from recording-only action | Turn **117 OFF** |
| Second **`ZOOM_CREDIT`** for same Source Key | Turn **117 OFF**; soft-void duplicate |
| Historical live XP deleted / bulk-deactivated / rewritten | Stop; preserve evidence |
| `ZOOM_ATTEND_BASE` amount changed without approval | Stop; restore rule; Stage 17 OFF |
| Unexpected parent email / Make (webhook should be blank) | Turn **117 OFF** |
| **115** installed in PROD | Remove/disable 115 |
| 057/042 double-count live+recording for one meeting | Turn **057** and/or **042 OFF** |

Full procedure: [C-025-stage17-rollback-plan.md](./C-025-stage17-rollback-plan.md).
