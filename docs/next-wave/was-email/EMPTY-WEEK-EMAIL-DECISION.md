# Empty-week weekly email — decision packet

**Agent:** 12 · **Date:** 2026-07-24  
**Status:** DECISION NEEDED — Mike  
**Related:** SC-035 · overnight `docs/overnight/communications/EMPTY-WEEK-EMAIL-DECISION.md`  
**Code hook:** `emptyWeekPolicy` input on 118/119 (`send_normal` \| `send_short` \| `suppress`) — default `send_normal`; **suppress/short not enforced until Mike decides**.

WAS records are still created for empty weeks (guarantee). This decision only controls **email send**.

---

## Options

### 1 — Send normal “no activity” summary (`send_normal`)

Full weekly package with zeroed sections.

| Lens | Implication |
|---|---|
| Engagement | Predictable rhythm; risk of “nagging” / ignore training |
| Testing | Easiest Schmidt dry-run parity with live volume math |
| Dedupe | Existing send key / Sent? stamp unchanged |

### 2 — Send shortened reminder (`send_short`)

Short encouragement template instead of full zero stats.

| Lens | Implication |
|---|---|
| Engagement | Best accountability + tone (needs ChatGPT copy) |
| Testing | Extra template path; Schmidt must cover both full + short |
| Dedupe | Same send key; body differs — still one send/week |

### 3 — Suppress email (`suppress`)

No arm/build/send when WAS has zero activity.

| Lens | Implication |
|---|---|
| Engagement | Silence during drop-off — weak for program accountability |
| Testing | Skip counts must be monitored (`skipped_empty_week`) |
| Dedupe | Fewer sends; “missing email” ≠ failure without skip telemetry |

---

## Recommendation (not a decision)

**Option 2** seasonally; **Option 1** interim until copy exists. Do not choose Option 3 as default.

## What Mike records

Pick `send_normal` | `send_short` | `suppress` into completion master SC-035. Until then keep schedules **OFF** and defaults **dryRun=true**.
