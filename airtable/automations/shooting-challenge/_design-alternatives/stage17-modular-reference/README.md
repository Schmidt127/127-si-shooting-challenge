# Stage 17 modular / orchestrator — design reference only

**Not for PROD paste. Not active Airtable automations.**

## Why this folder exists

PROD has a hard Airtable **automation-count limit**. Mike consolidates workflows into the fewest slots.

Operator-attested PROD Automation **117** (2026-07-24 and reconfirmed 2026-08-05) is only:

`117 — Zoom — Send Recording Approval Email to Make`

Canonical source:

`airtable/automations/shooting-challenge/117-zoom-send-recording-approval-email-to-make.js`

Make workflow identifier remains **`117f`** inside the payload (`automationNumber = "117f"`). That is **not** a second Airtable automation slot.

## Contained files (historical / modular alternatives)

| Former active-folder name | Role |
|---------------------------|------|
| `117-zoom-recording-credit-orchestrator.js` | Combined normalize + review + `ZOOM_CREDIT` XP + eligibility report |
| `117a-…normalize….js` | Modular normalize |
| `117b-…coach-review….js` | Modular coach review sync |
| `117c-…create-zoom-xp-event.js` | Modular XP create/soft-void |
| `117d-…apply-zoom-gate-credit.js` | Gate eligibility observe-only (042 owns Applied?) |
| `117e-…apply-perfect-week-credit.js` | PW eligibility observe-only (057 owns Applied?) |

These were developed for Stage 17 when a dedicated recording-credit automation slot existed. They must **not** be represented as active PROD automations and must **not** be pasted over the live email Automation 117.

## Recording XP ownership (PROD today)

| Function | Active owner |
|----------|--------------|
| Live Zoom XP | Automation **101** |
| Recording Zoom XP (`ZOOM_CREDIT\|…`) | **No Airtable automation currently deployed** (slot used by email 117). Design alternative retained here only. |
| Gate Applied? | **042** |
| Perfect Week Applied? | **057** |
| Recording approval email | Automation **117** → Make **117f** |

## Offline tests

Behavioral offline suites may still load scripts from this folder as **design-reference** fixtures. That does not mean they are deployable PROD automations.
