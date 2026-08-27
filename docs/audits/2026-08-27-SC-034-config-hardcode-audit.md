# SC-034 / V2-002 — Config hardcode audit

**Generated:** 2026-08-27 · **Branch:** `agent/config-automation-reliability`
**Machine-readable:** [`sc-034-hardcode-audit.json`](./sc-034-hardcode-audit.json)

## Scope

- Production scripts scanned: **57**
- Excludes: `_superseded/`, `_design-alternatives/`, `lib/`
- Prior audit preserved: [`docs/overnight/config-xp/CONFIG-HARDCODE-AUDIT.md`](../overnight/config-xp/CONFIG-HARDCODE-AUDIT.md)

## Classification summary

- **stable_system_constant:** 86
- **config_pending_schema:** 1
- **dangerous_latent:** 1
- **operator_controlled:** 12

## Key conclusions

1. **No active production script** uses `configQuery.records[0]` (only `_superseded/` 117a/117b).
2. **Config selection** is centralized in `lib/config-selection/index.js` with fail-closed hierarchy.
3. **057 Perfect Week video minimum** — Repo **v2.1** resolves year-aware Config when field **`Perfect Week Video Minimum`** exists (fail-closed); until schema field is added, **`legacyRequiredVideoCount: 3`** aligns with WAS formula `>= 3`. WAS formula still requires manual update once Config field + lookup exist. Deploy: [`deploy-checklists/057-v2.1-perfect-week-config-video-minimum.md`](./deploy-checklists/057-v2.1-perfect-week-config-video-minimum.md).
4. **XP amounts** are read from XP Reward Rules in 010/054/059/065/101 — not hardcoded in award paths.
5. **Operator emails** in 075/077 are operational defaults, not business rules.

## Findings (sample — full list in JSON)

| File | Line | Match | Class | Risk | Action |
|------|------|-------|-------|------|--------|
| `005-submission-intake-and-asset-creation-assign-week-to-submission-homework-first.js` | 74 | `America/Denver` | stable_system_constant | low | Documented — no change unless contract updates |
| `005-submission-intake-and-asset-creation-assign-week-to-submission-homework-first.js` | 126 | `America/Denver` | stable_system_constant | low | Documented — no change unless contract updates |
| `010-submission-intake-create-xp-event.js` | 53 | `SUBMISSION_XP\|` | stable_system_constant | low | Documented — no change unless contract updates |
| `010-submission-intake-create-xp-event.js` | 191 | `SUBMISSION_XP\|` | stable_system_constant | low | Documented — no change unless contract updates |
| `010-submission-intake-create-xp-event.js` | 201 | `HOMEWORK_XP\|` | stable_system_constant | low | Documented — no change unless contract updates |
| `010-submission-intake-create-xp-event.js` | 205 | `PERFECT_WEEK\|` | stable_system_constant | low | Documented — no change unless contract updates |
| `010-submission-intake-create-xp-event.js` | 136 | `America/Denver` | stable_system_constant | low | Documented — no change unless contract updates |
| `010-submission-intake-create-xp-event.js` | 345 | `America/Denver` | stable_system_constant | low | Documented — no change unless contract updates |
| `010-submission-intake-create-xp-event.js` | 192 | `SHOOTING_BASE` | stable_system_constant | low | Documented — no change unless contract updates |
| `010-submission-intake-create-xp-event.js` | 205 | `PERFECT_WEEK` | stable_system_constant | low | Documented — no change unless contract updates |
| `010-submission-intake-create-xp-event.js` | 713 | `SHOOTING_BASE` | stable_system_constant | low | Documented — no change unless contract updates |
| `010-submission-intake-create-xp-event.js` | 934 | `SHOOTING_BASE` | stable_system_constant | low | Documented — no change unless contract updates |
| `034-weekly-summary-and-goal-logic-set-previous-week-helper-values.js` | 46 | `America/Denver` | stable_system_constant | low | Documented — no change unless contract updates |
| `034-weekly-summary-and-goal-logic-set-previous-week-helper-values.js` | 62 | `America/Denver` | stable_system_constant | low | Documented — no change unless contract updates |
| `035-weekly-summary-and-goal-logic-create-weekly-threshold-xp-events.js` | 109 | `[100, 125, 150]` | stable_system_constant | low | Documented — no change unless contract updates |
| `035-weekly-summary-and-goal-logic-create-weekly-threshold-xp-events.js` | 56 | `America/Denver` | stable_system_constant | low | Documented — no change unless contract updates |
| `035-weekly-summary-and-goal-logic-create-weekly-threshold-xp-events.js` | 108 | `America/Denver` | stable_system_constant | low | Documented — no change unless contract updates |
| `053-achievements-and-milestones-streak-occurrences-rebuild-and-upsert-from-submissions.js` | 65 | `America/Denver` | stable_system_constant | low | Documented — no change unless contract updates |
| `053-achievements-and-milestones-streak-occurrences-rebuild-and-upsert-from-submissions.js` | 78 | `America/Denver` | stable_system_constant | low | Documented — no change unless contract updates |
| `054-achievements-and-milestones-streak-occurrences-create-or-repair-streak-xp-event.js` | 38 | `America/Denver` | stable_system_constant | low | Documented — no change unless contract updates |
| `054-achievements-and-milestones-streak-occurrences-create-or-repair-streak-xp-event.js` | 92 | `America/Denver` | stable_system_constant | low | Documented — no change unless contract updates |
| `054-achievements-and-milestones-streak-occurrences-create-or-repair-streak-xp-event.js` | 442 | ``STREAK_${` | stable_system_constant | low | Documented — no change unless contract updates |
| `055-achievements-and-milestones-recalculate-current-shooting-streak-from-submission.js` | 83 | `America/Denver` | stable_system_constant | low | Documented — no change unless contract updates |
| `056-achievements-and-milestones-refresh-current-shooting-streaks-daily.js` | 64 | `America/Denver` | stable_system_constant | low | Documented — no change unless contract updates |
| `056-achievements-and-milestones-refresh-current-shooting-streaks-daily.js` | 76 | `America/Denver` | stable_system_constant | low | Documented — no change unless contract updates |
| `057-achievements-and-milestones-calculate-perfect-week-eligibility.js` | 220 | `legacyRequiredVideoCount: 3` | config_pending_schema | medium | **Repo v2.1** — Config path wired; legacy 3 until field exists; WAS formula still manual |
| `057-achievements-and-milestones-calculate-perfect-week-eligibility.js` | 371 | `.toISOString().slice(0, 10)` | dangerous_latent | medium | **Fixed in repo v2.1** — explicit UTC calendar formatting |
| `057-achievements-and-milestones-calculate-perfect-week-eligibility.js` | 37 | `PERFECT_WEEK` | stable_system_constant | low | Documented — no change unless contract updates |
| `057-achievements-and-milestones-calculate-perfect-week-eligibility.js` | 188 | `PERFECT_WEEK` | stable_system_constant | low | Documented — no change unless contract updates |
| `058-achievements-and-milestones-create-perfect-week-unlock.js` | 338 | `PERFECT_WEEK\|` | stable_system_constant | low | Documented — no change unless contract updates |
| `058-achievements-and-milestones-create-perfect-week-unlock.js` | 41 | `PERFECT_WEEK` | stable_system_constant | low | Documented — no change unless contract updates |
| `058-achievements-and-milestones-create-perfect-week-unlock.js` | 77 | `PERFECT_WEEK` | stable_system_constant | low | Documented — no change unless contract updates |
| `058-achievements-and-milestones-create-perfect-week-unlock.js` | 338 | `PERFECT_WEEK` | stable_system_constant | low | Documented — no change unless contract updates |
| `059-achievements-and-milestones-create-xp-event-from-achievement-unlock.js` | 570 | `PERFECT_WEEK\|` | stable_system_constant | low | Documented — no change unless contract updates |
| `059-achievements-and-milestones-create-xp-event-from-achievement-unlock.js` | 74 | `PERFECT_WEEK` | stable_system_constant | low | Documented — no change unless contract updates |

_… and 60 more rows in JSON._

## Mike actions

- UI paste repo fixes already landed (054 v5.6 duplicate-rule guard, 066 v3.3 link-ID grade band).
- Add **`Perfect Week Video Minimum`** on Config (numeric, value **3** per school year) — then paste **057 v2.1** and update WAS **`Perfect Week Video Requirement Met?`** formula (see [`057-v2.1-perfect-week-config-video-minimum.md`](../deploy-checklists/057-v2.1-perfect-week-config-video-minimum.md)).
- Collapse or key-select Config rows if any script still uses order-dependent reads (none in active scripts).
