# Level Gate Rule Integrity

Overnight Agent 2 · 2026-07-23 · source: `prod-config-snapshot.json`

## Integrity checks (all 12 rules)

| Check | Result |
|---|---|
| Duplicate active rules per level | **None** (12 rules, 12 distinct levels) |
| Duplicate level numbers among active Levels | **None** (ranks 1–12 unique) |
| Gate rule without Level link | **None** |
| Gate rule pointing at missing Level record | **None** |
| Missing minimum values | None — ranks 1–6 hold explicit zeros |
| Negative values | None |
| Field types | Consistent numerics across all five minimum fields |
| Zoom requirement field | Present on all rules (0–2) |
| Streak requirement field | Present on all rules (0–30) |
| Inactive rules still read | None inactive; all 12 are Version Active |
| Levels without gate link | None — every level links a gate rule |
| XP threshold monotonicity | 0→2200 strictly increasing by rank |

## Engineering defects

None found in the rule data. Duplicate/missing-link failure modes are now guarded twice:
042's in-script check and the shared `buildGateRuleMap` helper (throws; tested).

## Configuration issues (non-blocking)

1. Ranks 1–6 use `Gate Enabled?` unchecked + zero minimums. Functionally identical to "no gate",
   but two representations exist for "ungated" (disabled rule vs missing rule). Harmless; keep the
   convention of always having a row per level.
2. Level Gate Rules carry `School Year / Rule Set` — single rule set today. If a second season set
   is added, 042's active-rule filter becomes the dedupe boundary; revisit then.

## Product-tuning observations (decisions for Mike — NOT applied)

- **First gate cliff at Deadeye (rank 7):** 30 submissions + 6 homework + 6 videos at 1200 XP.
  An athlete can bank XP to 2200 while blocked at Hot Hand. If earlier, softer gates are desired
  (e.g. small requirements at ranks 3–5), that is a product change.
- **Zoom minimums (1–2)** depend on meetings existing; a season with no meetings would hard-block
  ranks 8+ unless recording credit compensates (Config flags, see MIKE-ACTIONS #1).
- **Streak 30 required for G.O.A.T.** is the steepest jump (20→30); consistent with 30-day streak
  achievement but worth a deliberate sign-off.
- Later-level spacing is even (+200 XP per level); no gaps.

No gate values were changed.
