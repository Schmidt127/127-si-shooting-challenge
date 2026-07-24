# Agent 4 — Coverage Matrix

**Legend:** `R` = repository contract/unit · `L` = live PROD evidence cited · `G` = known gap · `—` = not covered  
**Do not treat `R` as integration success.**

## Weekly email (118→072→119→074→Make)

| Condition | Coverage |
|-----------|----------|
| Empty `send_short` / `send_normal` / `suppress` | R (+ L for send_short) |
| Normal non-empty package | R (partial HTML path) |
| Missing Enrollment/Week | R (074 static) |
| Duplicate after Sent? | R |
| Webhook failure keeps Send to Make? | R (static) |
| Test vs Live route + writeback expectations | R + L |
| Test does not claim live writeback | R |
| 119 no webhook; 074 owns webhook; 072 owns empty-week | R |
| Make owns Sent? writeback | R + L |
| Already-sent / manual rerun | R |

## XP / achievements

| Family | Normal | Rerun skip | Steal-guard |
|--------|--------|------------|-------------|
| Submission / Homework / Video / Streak / Milestone / Perfect Week / Zoom live+recording | R (+ L for submission via 115) | R | Video R |
| Weekly threshold XP | G | G | G |

## Levels / gates / Perfect Week / WAS

See overnight + Agent 4 edge suites: strong unit for gates, PW edges (1500-one-day, 6/7, Zoom optional), WAS uniqueness/build-send gates. Live multi-athlete and recalc-flag clearing remain gaps.
