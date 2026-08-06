# Evidence — Overnight Agent 3 Perfect Week chain (2026-08-05)

## Verdict

CASE-01 Perfect Week **data chain is proven** end-to-end:

1. **057** eligibility (prior package) — PASS  
2. **058** unlock — PASS (auto)  
3. **059** auto-fire — **FAIL** (trigger gap)  
4. **059 v3.5 contract XP award** — PASS (agent repair)  
5. Idempotent re-award — PASS (exactly one Source Key)

Automation **059 PROD trigger** must drop `Shot Milestone is not empty` — see [`docs/deploy-checklists/059-perfect-week-trigger-coverage.md`](../../deploy-checklists/059-perfect-week-trigger-coverage.md).

## Exact IDs

| Role | ID |
|------|----|
| Weekly Athlete Summary | `recKebuZ79QFTwivA` |
| Enrollment | `recCyFEPeATOVNlr9` |
| Week | `reci5GdxEC57vfoS3` |
| Perfect Week Unlock | `recALZFQNL3XicEOX` |
| Perfect Week XP Event | `recMdcI5lN8gJ6830` |
| Achievement | `recd2jEIVPskiRTSu` |
| XP Reward Rule | `recZVpCbWfPPXwDbU` (100 XP) |
| Source Key | `PERFECT_WEEK\|recCyFEPeATOVNlr9\|reci5GdxEC57vfoS3` |

## Files

| File | Purpose |
|------|---------|
| `CHAIN-PROBE.json` | Pre-award unlock/XP gap |
| `059-RETRIGGER-BOUNCE.json` | Status bounce did not fire 059 |
| `AWARD-DRY.json` / `AWARD-LIVE.json` | Contract award + idempotency |
| `CHAIN-VERIFY.json` | Field-level XP verification |
| `ADJACENT-PROBE.json` | Achievements Visible?, levels/gates, pending unlocks |
| `XP-EVENTS-SCHEMA.json` | XP Events field inventory |

## Adjacent fixes applied in PROD

- Achievements `Perfect Week` (`recd2jEIVPskiRTSu`) → `Visible?` = true  
- Achievements `Shot Milestone` (`reclgScxpCba3m1Mo`) → `Visible?` = true  

## Tools added

- `tools/testing/probe_perfect_week_chain.mjs`
- `tools/testing/award_perfect_week_059.mjs`
- `tools/testing/retrigger_059_bounce.mjs`
- `tools/testing/verify_perfect_week_chain.mjs`
- `tools/testing/probe_adjacent_achievements.mjs`
- `tools/testing/probe_059_meta.mjs`
