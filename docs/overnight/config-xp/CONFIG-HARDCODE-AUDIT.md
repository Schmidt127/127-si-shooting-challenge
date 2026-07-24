# Config-over-Code Hardcode Audit

Overnight Agent 2 · 2026-07-23 · machine-readable version: `config-hardcode-audit.json`

Classification key: **stable** = valid code constant · **config** = should come from Airtable ·
**compat** = temporary compatibility mapping · **stale** · **dangerous** · **decision** = Mike decision required.

## Findings

| # | File / location | Literal | Purpose | Class | Risk | Recommendation |
|---|---|---|---|---|---|---|
| 1 | `057…perfect-week-eligibility.js` L150 | `requiredVideoCount: 3` | Perfect Week video minimum | config | Med — product value buried in script CONFIG | Move to Config table field (e.g. "Perfect Week Video Minimum"); keep 3 as fallback. Product value itself confirmed by completion master. |
| 2 | `057…perfect-week-eligibility.js` L151 | `requiredDailyCount: 7` | Days per Perfect Week window | stable | Low — definitional (Sun–Sat week) | Keep as constant; it defines the week shape, not a tunable. |
| 3 | `057…perfect-week-eligibility.js` L380 | `weeklyGoal / requiredDailyCount` + `Math.ceil` | Daily minimum derivation | stable | Low | Matches "one-seventh of weekly goal" rule; goal itself comes from WAS field (config). |
| 4 | `057…perfect-week-eligibility.js` `getDateKeyFromDateOnly` | UTC ISO slice | Date key extraction | dangerous (latent) | Low live / Med latent — disagrees with Denver standard for evening dateTimes | Align to 005/034/066 Denver conversion. Regression test added (`overnight-xp-date-source.test.js`, "naive UTC slicing…"). Fix needs a 057 re-paste → MIKE-ACTIONS #2. |
| 5 | `066…create-shot-milestone-unlocks.js` (grade band match) | Grade Band display labels ("K-2" etc.) | Match Enrollment band to Shot Milestones rows | dangerous | Med — silently awards nothing if a band is renamed / spelling drifts | Compare linked record IDs instead of labels. Both tables carry the link; safe V2 section rewrite + re-paste → MIKE-ACTIONS #6. |
| 6 | `054…create-or-repair-streak-xp-event.js` L423 | `` `STREAK_${streakDays}DAY` `` | Derive XP rule key from threshold | stable | Low — matches all 9 active PROD rule keys | Keep; documented contract. |
| 7 | `054…` rule lookup (`.find()` on active rules) | first-match wins | XP rule selection | dangerous | Med — nondeterministic if duplicate active keys ever appear (059 throws instead) | Add duplicate-active detection like 059. PROD currently clean (0 duplicates). |
| 8 | `010…create-xp-event.js` L178 | `SHOOTING_BASE` | Rule key for submission base XP | stable | Low | Correct pattern: key constant + amount from rule; errors when rule missing/invalid (L1033). |
| 9 | `lib/v2-engine-contracts.js` L40-54 | `SOURCE_KEY_PREFIXES` | Source/dedupe key prefixes | stable | Low | Contract constants; must never come from config (dedupe integrity). |
| 10 | `042…assign-current-and-next-level…` | Combined Zoom credit logic flags | Gate stat composition | config/compat | Med | Recording credit toggles live in Config table (`Recording Gives Full Zoom Gate Credit?`); verify 042 reads the intended Config record (see Config-table duplication, #12). |
| 11 | Levels/gate thresholds | none hardcoded | — | — | — | 041/042 read Levels + Level Gate Rules tables. Confirmed config-driven. |
| 12 | PROD `Config` table | 4 records, conflicting values | Global feature flags | dangerous / decision | High — "first record" readers are order-dependent | Collapse to a single record or add explicit season/instance key selection. MIKE-ACTIONS #1. |
| 13 | Submissions formula fields `XP Base Points`(5) / `XP Volume Bonus`(0.02/shot) | GOAT test economics | Alternate submission XP computation | stale / decision | Med — two competing XP designs visible to anyone reading the base | XP Events pipeline (SHOOTING_BASE=20) is operative. Decide whether to remove the formula-field economics or adopt them. MIKE-ACTIONS #7. |
| 14 | `XP Events.XP Date Resolved` formula | SWITCH case "Submission Base" on `XP Bucket` field | Fallback date resolution | stale/dangerous | Low live (010 writes XP Activity Date directly) | Fix case to "Shooting Base" (UI formula edit). MIKE-ACTIONS #3. |
| 15 | Grade Bands table | inactive rows "Grades 9–10", "Grades 1–2" (mojibake en-dash) | Legacy bands | stale | Low (inactive, only inactive milestones reference them) | Archive/delete after dependency check. MIKE-ACTIONS #8. |
| 16 | `053…streak-occurrences-rebuild…` | thresholds read from Achievements table | Streak thresholds | — | — | Confirmed config-driven (Trigger Type = "Streak Length", Trigger Threshold). No hardcode. |
| 17 | `web/` leaderboard/standings queries | no XP/level literals found in scope | — | — | — | Website reads Airtable-calculated fields server-side; no XP economics duplicated. |

## Fixes applied this run

- `buildGateRuleMap` added to `lib/v2-engine-contracts.js` — duplicate-active gate rule and missing Level link now throw in shared logic; covered by `overnight-level-gate-boundaries.test.js`.
- Regression tests pinning the Denver-vs-UTC date-key contract and the `STREAK_XP`/`SHOT_MILESTONE`/`PERFECT_WEEK` key formats (prior overnight commit).
- **2026-07-24:** `selectActiveXpRewardRule`, `normalizeGradeBandLabel`, `gradeBandsMatch`, `auditAchievementUnlockIntegrity` added to shared lib.
- **2026-07-24:** **054 v5.6** — duplicate active XP Reward Rules error (matches 059) instead of first-match.
- **2026-07-24:** **066 v3.3** — Grade Band match prefers linked record IDs; normalized label is fallback only.

Items 4, 12–15 still need Mike UI/product actions. Item 5 and item 7 are **repo-fixed**; PROD paste listed in MIKE-ACTIONS #6 / #11. Nothing in this audit changes XP economics.
