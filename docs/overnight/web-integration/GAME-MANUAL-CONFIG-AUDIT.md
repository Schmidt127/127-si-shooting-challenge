# Game Manual Configuration Audit — SC-109

**Agent 6 overnight audit** · 2026-07-23 · Route: `/shoot/game-manual`

---

## Before this session

The game manual page rendered only an external Adobe-hosted PDF link from
`NEXT_PUBLIC_GAME_MANUAL_URL` (empty state when unset). No program rules were
rendered from configuration — the entire rules narrative lived in the PDF,
which duplicates Airtable configuration and goes stale whenever Mike tunes XP.

## What changed this session (implemented)

1. **New config catalog module** `web/lib/data/xp-rules.ts` (+17 unit tests):
   - Reads the `XP Reward Rules` table shape (`Rule Key`, `XP Source Label`, `XP Amount`, `Active?`, `Rule Set`, `Sort Order`).
   - Filters inactive rules, groups by rule-key family (shooting, weekly thresholds, streaks, homework, video, Zoom, Perfect Week, other), stable-sorts, and collapses per-grade-band weekly-threshold duplicates for display.
   - Malformed records degrade to safe defaults instead of throwing.
2. **New query** `fetchXpRuleCatalog()` in `web/lib/airtable/queries.ts` — uses the existing `Active Rules Only` Airtable view with a `{Active?} = 1` formula fallback, 300 s revalidate, server-side only.
3. **Game manual page** now fetches XP rules + level ladder in parallel; failures fall back to `null` → empty states, so the manual link keeps working even if Airtable is down.
4. **Game manual view** renders two live-config sections with accessibility labels:
   - *How you earn XP* — grouped amounts straight from XP Reward Rules, with a footnote that amounts are live configuration.
   - *Level ladder* — ascending levels with cumulative XP from the Levels table, linking to `/levels` for gate details.

**Verification:** grouping matches the live PROD export
`docs/overnight/config-xp/xp-reward-rules-prod-live.json` (31 active rules:
1 shooting, 15 weekly thresholds → 3 display rows, 9 streaks, 1 homework,
1 video, 3 Zoom, 1 Perfect Week). Unit tests encode those shapes.

## What the manual can present from config vs what needs editorial content

| Topic | Config source available today | Rendered now | Notes |
|-------|------------------------------|--------------|-------|
| XP sources / amounts | XP Reward Rules | ✔ live | Authoritative per Agent 2 export |
| Levels | Levels table | ✔ live | Ladder + link to `/levels` detail |
| Gates | Levels `Public Gate Criteria` | ✔ via `/levels` pages | Level Gate Rules table itself not read directly (public criteria text is the safe surface) |
| Achievements | Achievements table | ✔ via `/achievements` catalog | Not duplicated in manual; link candidates |
| Streaks | XP Reward Rules `STREAK_*` | ✔ live | Repeat-after-break *behavior* is code (SC-081) — **not stated** in manual to avoid inventing rules |
| Shot milestones | Shot Milestones table | ✖ not yet | No public web view/field contract yet; add after SC-027 re-test |
| Perfect Week | XP Reward Rules `PERFECT_WEEK` | ✔ amount only | Qualification criteria live in 057 logic — needs editorial copy approved by Mike, not invention |
| Zoom rules | XP Reward Rules `ZOOM_*` | ✔ amounts | Recording-credit percentage knobs (Stage 17 config) intentionally not published |
| Homework | XP Reward Rules + homework catalog | ✔ amount + `/homework` | Review/satisfactory flow described only in PDF |
| Video feedback | XP Reward Rules `VIDEO_SUBMISSION` | ✔ amount | Submission mechanics remain PDF/editorial |

## Deliberately NOT done

- **No rules were invented.** Where behavior lives in automation code (streak repeat rules, Perfect Week qualification, Zoom recording percentages), the manual shows only configured amounts and neutral wording.
- Level Gate Rules table is not queried directly — no public view exists and raw gate rows may contain operator language. `Public Gate Criteria` on Levels is the vetted public surface.
- The Adobe PDF remains the narrative authority until Mike approves config-generated narrative copy (SC-109 full completion, feeds SC-133 pre-season comms).

## Remaining work for SC-109 → Complete

1. Mike reviews the live-config sections on a deploy (PROD Vercel or preview).
2. Decide whether Shot Milestones and Perfect Week criteria get public config surfaces (new fields/views — schema authorization required).
3. Replace or slim the Adobe PDF once config sections cover the rules narrative.
4. Presentation fields (SC-054/SC-117) adoption when schema lands.
