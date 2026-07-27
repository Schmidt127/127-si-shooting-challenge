# 057 Perfect Week — America/Denver date-key paste (v1.4)

**SC items:** SC-028, SC-077, SC-091  
**Script (canonical):** PR #43 — `airtable/automations/shooting-challenge/057-achievements-and-milestones-calculate-perfect-week-eligibility.js`  
**Deploy checklist (canonical):** `docs/deploy-checklists/057-perfect-week-denver-v1.4.md`  
**Change:** `getDateKeyFromDateOnly` uses `America/Denver` via `Intl` (no UTC ISO slice)  
**This document:** Paste/runbook evidence only on PR #44 (stacked on #43). Do **not** treat this PR as a second 057 implementation.  
**Date:** 2026-07-25

## Why this matters

Perfect Week eligibility and the 100 XP week-ending Saturday key must match Denver calendar days. UTC `toISOString().slice(0,10)` can shift date-only values near midnight and mis-assign week boundaries.

## Dependency map

| Area | Dependency |
|------|------------|
| Weeks | Week Start/End date keys (Denver) |
| Submissions | Activity Date distinct-day counts |
| Zoom | Live vs recording exclusivity (SC-087) for Zoom requirement |
| XP | Perfect Week Source Key / one event per enrollment×week |
| Levels | Indirect via XP totals only |

## PROD paste

1. Merge/checkout PR #43 script (or this branch after #43 is included).  
2. Open automation **057**.  
3. Paste repo script (skip GitHub header).  
4. Confirm version/header notes Denver date-key change (**v1.4**).  
5. Keep existing ON/OFF state unless Mike authorizes change.  
6. Do **not** create a second Perfect Week automation.

## Schmidt live proof (after paste + token)

1. Build seven distinct Denver days of qualifying submissions for Schmidt in one Week.  
2. Meet one-seventh daily minimum, same-day submission, video minimum, Zoom rule per Config.  
3. Expect eligibility true + one Perfect Week XP (100) with week-ending Saturday date.  
4. Rerun 057 → no second XP.

Offline: `node airtable/automations/shooting-challenge/lib/xp-date-normalization.test.js` (includes 057 Denver assertion; owned by PR #43).
