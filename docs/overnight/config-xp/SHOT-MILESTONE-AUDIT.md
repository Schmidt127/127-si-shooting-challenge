# Shot Milestone Audit

Overnight Agent 2 · 2026-07-23 · scripts: 066 (unlock writer), 059 (XP writer). 058 is the Perfect
Week unlock writer, not milestones (assignment listed it; actual owner confirmed = 066).

## Configuration state (live)

- 61 Shot Milestone records; 40 active across the 5 active bands (8 thresholds each):
  - K-2: 500 → 4000 · 3-4: 1250 → 10000 · 5-6: 2000 → 16000 · 7-8: 2500 → 20000 · 9-12: 3000 → 24000
  - Points ladder identical for every band: 10, 15, 20, 30, 40, 50, 65, 80
  - Thresholds are 25/50/75/100/120/150/175/200% of each band's Total Shot Target
- No duplicate `Milestone Unique Key`s, no duplicate active thresholds within a band, every record
  has exactly one Grade Band link. 16 inactive legacy rows (two retired bands) — inert.

## Contract confirmation

- **Unlock Key / source key:** `SHOT_MILESTONE|{enrollmentId}|{shotMilestoneId}` — confirmed in 066
  and lib (`buildShotMilestoneSourceKey`); pinned by test.
- Cumulative shot source: Enrollment `Total Shots Counted` (counted submissions only).
- XP: 059 prefers `Points Awarded` on the milestone record; throws on duplicate active reward
  rules; dedupe via the milestone source key.
- Activity date: latest counted submission date key (`Milestone Activity Date` on the unlock,
  falling back to Date Unlocked in the display formula).

## Verified behaviors (tests, all passing)

`overnight-streak-milestone-dedupe.test.js` against `detectShotMilestoneCrossings` with the live
K-2 and 3-4 ladders:

- one shot below threshold → no crossing; exact threshold → crossing; one above → single crossing
- multiple thresholds crossed at once (backfill) → all awarded in order
- rerun with unlocked source keys → no-op
- changed Grade Band → different ladder applies (500/1000 vs 1250 for the same 1300 shots)
- missing rule set (no active milestones) → no crossings, no error at helper level (066 wraps this
  in explicit skip logging)
- duplicate active milestone records → helper emits two crossings; 066's one-active-rule
  validation is the upstream guard (documented by test)

## Defects

1. **Grade Band string matching in 066** (display labels, not link IDs) — the milestone system's
   single point of brittleness. Safe fix identified: compare linked record IDs; requires re-paste
   (MIKE-ACTIONS #6, SC-023/SC-078).
2. Grade-band change behavior: crossing detection recomputes against the new band's ladder; keys
   already awarded under the old band remain (by design — append-only XP). An athlete moving up a
   band mid-season keeps old unlocks; new ladder thresholds apply going forward. Documented, no
   change made (product-adjacent).

## Live boundary test

Not executed live: Schmidt (K-2) sits at 75 counted shots vs first milestone 500. Crossing it would
require +425 controlled shots, which also inflates weekly summaries, streak day counts, and XP —
multi-system cleanup is not cleanly reversible unattended. Offline coverage substitutes; a
controlled live crossing script is queued for a supervised session (MIKE-ACTIONS #10).
