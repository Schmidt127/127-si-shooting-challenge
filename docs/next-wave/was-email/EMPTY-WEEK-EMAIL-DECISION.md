# Empty-week weekly email — decision packet

**Agent:** 12 · **Date:** 2026-07-24  
**Status:** APPROVED + **PROD verified** (2026-07-24) · **Policy:** `send_short`  
**Related:** SC-035 · [`WAS-WEEKLY-EMAIL-ARCHITECTURE.md`](./WAS-WEEKLY-EMAIL-ARCHITECTURE.md)  
**Enforcement:** **072 v4.0** (118/119 v1.4 default `send_short`; schedules **ON** verified_prod)

WAS records are still created for empty weeks (guarantee). This decision only controls **email send**.

---

## Approved decision (2026-07-24)

| Field | Value |
|-------|--------|
| **Choice** | **`send_short`** |
| **Meaning** | Send a **short no-activity reminder** email for empty weeks |
| **Do not** | Suppress the email (`suppress`) |
| **Do not** | Send the full normal weekly summary (`send_normal`) for empty weeks |

Recorded on completion master **SC-035**.

---

## Options (reference)

### 1 — Send normal “no activity” summary (`send_normal`) — rejected for empty weeks

Full weekly package with zeroed sections.

### 2 — Send shortened reminder (`send_short`) — **APPROVED**

Short encouragement / no-activity reminder template instead of full zero stats.

| Lens | Implication |
|---|---|
| Engagement | Accountability without a full empty-stats summary |
| Testing | Schmidt must cover both full (active week) + short (empty week) |
| Dedupe | Same send key; body differs — still one send/week |

### 3 — Suppress email (`suppress`) — rejected

No arm/build/send when WAS has zero activity.

---

## Implementation status (2026-07-24)

| Layer | Status |
|-------|--------|
| Product decision | **Approved — `send_short`** |
| Repo enforcement | **072 v4.0** |
| PROD verification | **PASS** — Schmidt Check-In via `118→072→119→074→Make` |
| 118/119 | **v1.4**; schedules **ON** (Sun 5:00 / 10:00 AM Denver) |
| Live schedules | **Authorized ON** 2026-07-24 — do not disable from stale OFF notes |

Architecture: [`WAS-WEEKLY-EMAIL-ARCHITECTURE.md`](./WAS-WEEKLY-EMAIL-ARCHITECTURE.md)
