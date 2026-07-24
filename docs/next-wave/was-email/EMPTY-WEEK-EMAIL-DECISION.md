# Empty-week weekly email — decision packet

**Agent:** 12 · **Date:** 2026-07-24  
**Status:** APPROVED — Mike · **Policy:** `send_short`  
**Related:** SC-035 · overnight `docs/overnight/communications/EMPTY-WEEK-EMAIL-DECISION.md`  
**Code hook:** `emptyWeekPolicy` input on 118/119 (`send_normal` \| `send_short` \| `suppress`) — default still `send_normal` in repo until enforcement ships.

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
| Repo enforcement | **072 v4.0** builds short reminder / full / suppress per policy |
| 118/119 | **v1.4** default `send_short`; still arm Build/Send gates only |
| PROD paste | Manual — see [`EMPTY-WEEK-072-PROD-PASTE-RUNBOOK.md`](./EMPTY-WEEK-072-PROD-PASTE-RUNBOOK.md) |
| Live schedules | Remain **OFF** until Schmidt empty-week proof PASS |

Before Live Sunday schedules:

1. Paste **072 v4.0** with `emptyWeekPolicy=send_short` (required).  
2. Re-run Schmidt empty-week build — expect **Weekly Check-In**, not full zero report.  
3. Keep schedules **OFF** and `dryRun=true` until Mike authorizes.
