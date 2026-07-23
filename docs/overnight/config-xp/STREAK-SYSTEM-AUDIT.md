# Streak System Audit

Overnight Agent 2 · 2026-07-23 · scripts reviewed: 053, 054 (occurrence pipeline); enrollment
current-streak fields maintained by the daily recalc path.

## Configuration state (live)

- Achievements with Trigger Type "Streak Length", all active and repeatable: 3, 5, 7, 10, 20, 30,
  40, 50, 60 days. (Assignment listed 3–30; PROD also has 40/50/60 — treated as authoritative.)
- Matching XP rules all present: STREAK_3DAY=10, 5=15, 7=20, 10=30, 20=50, 30=60, 40=75, 50=90,
  60=105. Historical amounts (7d=35, 10d=60, 20d=90, 30d=140) are stale documentation.
- Streak Occurrences table currently **empty** (season reset state); Schmidt Current Shooting
  Streak = 1 as of 2026-07-23 (maintained on Enrollment).

## Verified mechanics (code review + 20 passing tests)

`overnight-streak-milestone-dedupe.test.js` + `overnight-xp-date-source.test.js` exercise the
shared production helpers (`buildStreakBlocks`, `unlockStreaksFromBlocks`,
`buildStreakXpSourceKey`, `decideXpEventAction`):

- occurrence creation from counted, distinct activity-date keys (053 dedupes same-day duplicates
  before block building — helper contract pinned by test)
- start date = first block day; end date = `block[threshold-1]` (unlock date of that threshold)
- gap splits runs; month boundaries remain consecutive
- backdated insertion repairing and extending runs
- multiple thresholds unlocked in one run (3+5 on a 6-day block; full ladder on 10 days)
- rerun after unlock → `skip_existing` via source key
- repeat streak after break yields distinct end dates / distinct source keys — **whether a repeat
  is awarded again is Mike's decision; behavior not changed**
- source key `STREAK_XP|{enrollment}|{achievement}|{endDate}`; malformed end dates throw
- missing active reward rule → 054 skips/errors with debug output (no silent zero-XP award)

## Defects

1. **053 backdated double-award hazard (known, still open):** when a backfill merges two runs, the
   3-day threshold's effective end date moves earlier; the new source key differs from the already
   awarded one, so a rerun can create a second "Awarded" occurrence + second XP event for the same
   threshold. Needs an occurrence-level guard keyed on (enrollment, achievement) irrespective of
   end date — but that interacts with repeat-after-break policy, which is Mike's decision.
   → MIKE-ACTIONS #9 (decision + agreed guard), regression documented by test
   "backdated repair shifts the effective streak end date deterministically".
2. **054 duplicate-active-rule lookup** uses first match (table order) instead of throwing like
   059. PROD has zero duplicates today; hardening is a safe future paste.

## Source / dedupe key consistency

- Occurrence → XP event linkage uses the STREAK_XP source key end-to-end; normalized dedupe scan
  in 054 matches the 010 pattern.
- Key format pinned by tests; no drift found between 053 docblock, 054 implementation, and lib.

No live streak boundary test was run: Streak Occurrences is empty and constructing a 3-day
backdated submission chain would trigger the full daily-email/summary cascade for each synthetic
submission — not cleanly reversible unattended. Offline coverage substitutes; a controlled live
3-day test is scripted as a Mike-supervised option (MIKE-ACTIONS #10).
