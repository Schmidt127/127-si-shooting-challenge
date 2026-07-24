# Current Configuration Baseline — Config / XP / Levels / Gates / Achievements

Overnight Agent 2 · 2026-07-23 · re-verified 2026-07-24 · PROD base `appn84sqPw03zEbTT`

Evidence: `prod-config-snapshot.json` (2026-07-23) + `prod-config-snapshot-2026-07-24.json` (read-only API probe),
schema snapshot `airtable/schema/snapshots/prod-foundation-reset-20260723-post-ts/`, repository scripts on `master`.

## 0. 2026-07-24 re-verification (read-only)

- Schmidt enrollment still Active; Lifetime XP 61; Current=Beginner; Next=Rookie Shooter; Level Gate Rule=Level 2 Gate; Status=Assigned; Total Shots Counted=75; Current Streak=1.
- Submission `recuuTBgstSTGg2E3` still links exactly one Submission Base XP Event (`recOodD23MQrP1O9F`, 20 XP).
- Athlete Achievement Unlocks still empty; Streak Occurrences still empty.
- Config table still has **4 conflicting records** — unresolved (MIKE-ACTIONS #1).
- Video XP defect (`recYQ10pOoFlApmjZ` = 1 pt, blank date) still present (MIKE-ACTIONS #4).
- Repo hardenings this run: **054 v5.6** (duplicate active XP rule error), **066 v3.3** (Grade Band link-ID match). Paste still required.

## 1. Config tables (live PROD state)

| Table | Records | State |
|---|---|---|
| XP Reward Rules | 31 active (no inactive dupes of active keys) | Healthy — zero duplicate active `Rule Key`s |
| Grade Bands | 7 (5 active: K-2, 3-4, 5-6, 7-8, 9-12; 2 inactive legacy with mojibake names "Grades 9–10", "Grades 1–2") | Active set healthy; legacy rows should be reviewed |
| Levels | 12 active, ranks 1–12, XP 0→2200 in +200 steps, monotonic | Healthy |
| Level Gate Rules | 12 (exactly one active per level; gates enabled ranks 7–12 only) | Healthy |
| Achievements | 15 (active: streak 3/5/7/10/20/30/40/50/60, Perfect Week, Shot Milestone; inactive: Goal Achiever, Goal Crusher, Comeback Player, Homework Hero) | Healthy |
| Shot Milestones | 61 (5 active bands × 8 active thresholds; 16 legacy inactive; no duplicate keys or thresholds) | Healthy |
| Config | **4 records** with conflicting values (Max Videos Per Submission = 4/6/4/5) | **Defect risk — see § 6** |
| Target Goal Shots | 1 record | Superseded by Grade Bands `Total Shot Target` in practice |
| Weeks | manually seeded (probe field-filter errored; not a defect) | Per instructions: do not redesign |

## 2. XP Reward Rules — active values (authoritative)

| Rule Key | XP | Grade Band |
|---|---|---|
| SHOOTING_BASE | 20 | — |
| HOMEWORK_COMPLETION | 35 | — |
| VIDEO_SUBMISSION | 25 | — |
| ZOOM_ATTEND_BASE / BONUS_2 / BONUS_3 | 60 / 30 / 40 | — |
| STREAK_3DAY…60DAY | 10, 15, 20, 30, 50, 60, 75, 90, 105 | — |
| PERFECT_WEEK | 100 | — |
| WEEKLY_THRESHOLD_100/125/150 per band | 10 / 20 / 30 | per-band (5 bands × 3) |

Notes:

- Streak amounts differ from the historical doc values (7d=35, 10d=60, 20d=90, 30d=140). **PROD rules are authoritative** per assignment; documentation citing the old amounts is stale.
- No `MANUAL_BONUS` rule exists. Manual adjustments flow through `Lifetime XP Manual Adjustments` on Enrollments.
- No `ZOOM_RECORDING_*` rule key; the live Zoom Recording Quiz XP event (30 pts) was written by the C-025 recording path with its own amount source.

## 3. Levels and gates

- Levels: Beginner(0), Rookie Shooter(200), Developing(400), Consistent(600), Dangerous(800), Hot Hand(1000), Deadeye(1200), Sharpshooter(1400), Pro(1600), All-Star(1800), Legend(2000), G.O.A.T.(2200).
- Gates enabled only for ranks 7–12:
  - L7 Deadeye: 30 subs / 6 hw / 6 vids / 0 zoom / 0 streak
  - L8 Sharpshooter: 34 / 8 / 8 / 1 / 0
  - L9 Pro: 38 / 10 / 10 / 1 / 10
  - L10 All-Star: 42 / 12 / 12 / 1 / 20
  - L11 Legend: 50 / 13 / 16 / 2 / 20
  - L12 G.O.A.T.: 58 / 18 / 20 / 2 / 30
- Ranks 1–6 have gate rows with all-zero minimums and `Gate Enabled?` unchecked (pass-through placeholders).

## 4. Automation ownership (current PROD direction)

| System | Owner | Notes |
|---|---|---|
| Level Recalc Needed? | 041 sets, 042 clears | |
| Current Level / Next Level / Level Gate Rule / Level Status | **042** (sole owner) | **043 deleted from PROD — do not restore.** Any doc saying 043 is required is stale. |
| Submission Base XP | 010 | Rule-driven (SHOOTING_BASE) |
| Streak occurrences | 053 (rebuild/upsert) | Thresholds from Achievements (Trigger Type = "Streak Length") |
| Streak XP events | 054 | Rule key derived `STREAK_{n}DAY` |
| Perfect Week eligibility | 057 (Weekly Athlete Summary helper fields) | |
| Perfect Week unlock | 058 | |
| Achievement Unlock → XP event | 059 | Handles Perfect Week + Shot Milestone |
| Shot milestone unlocks | 066 | |
| Grade Band propagation | 013 (Video Feedback), 020 (Homework Completions), 030 (Weekly Athlete Summary) | Linked-record copies; 063/111 deleted from PROD |
| Testing scenario intake | 115 | Live-verified (submission `recuuTBgstSTGg2E3`) |

Deleted from PROD: 043, 032, 033, 063, 111. Replaced with newer versions: 030, 020, 013.

## 5. Live evidence (Schmidt, read-only, 2026-07-23)

- Enrollment `recgP9qZYjAhE7NXm`: Active, Grade Band K-2, Lifetime XP 61, Current Level Beginner, Next Level Rookie Shooter, Level Gate Rule = "Level 2 Gate" (`reccFKwOVHZ3hn36i`), Level Status "Assigned" — consistent with 042 ownership.
- Submission `recuuTBgstSTGg2E3`: exactly one Submission Base XP event (`recOodD23MQrP1O9F`), 20 XP, dedupe key `recgp9qzyjahe7nxm|submission_xp|recuutbgststgg2e3|submission base`, XP date `2026-07-23T06:00Z` (= Denver midnight). Correct.
- 5 XP events total in base (3× Submission Base 20, 1× Zoom Recording Quiz 30, 1× Video Submission 1).
- Athlete Achievement Unlocks: empty. Streak Occurrences: empty.

## 6. Dangerous hardcodes and unresolved items (summary)

Full detail in `CONFIG-HARDCODE-AUDIT.md`. Highlights:

1. **Config table has 4 records with conflicting values.** Scripts that read "the" Config record are order-dependent. Only `recq14M5hEv3TIGEj` carries the richer recording/Perfect Week flags. → Mike decision: collapse to one record or key by season (MIKE-ACTIONS #1).
2. **Live Video Submission XP event = 1 point vs rule VIDEO_SUBMISSION = 25**, and its XP date is blank. Writer and amount source need reconciliation (MIKE-ACTIONS #4).
3. **Enrollment `Lifetime XP Earned` (61) excludes the 30-pt Zoom Recording Quiz event** (60 submission + 1 video = 61). Rollup filter likely excludes the Zoom source. Needs confirmation whether intentional (MIKE-ACTIONS #5).
4. **`XP Date Resolved` formula (XP Events) switches on `XP Bucket` but one case is "Submission Base"** — not a bucket choice ("Shooting Base" is). Fallback path silently degrades to CREATED_TIME; primary path unaffected because 010 always writes `XP Activity Date` (MIKE-ACTIONS #3).
5. **057 date-key helper slices UTC ISO strings** instead of converting in America/Denver (latent, low live risk because Weeks are seeded at Denver midnight and Activity Date is date-only).
6. **066 matches Grade Bands by display label string**, not linked record ID (works today; brittle under rename).
7. Submission-level XP formula fields (`XP Base Points`=5, `XP Volume Bonus`) reflect a "GOAT starting test setup" note in Config record `recq14M5hEv3TIGEj` but are **not** what 010 awards (20 from SHOOTING_BASE). Two competing submission XP designs exist in the base; the XP Events pipeline is the operative one.

## 7. Stale assumptions corrected

- Any handoff/plan stating 043 assigns levels: stale — 042 is the sole owner and 043 is deleted.
- Historical streak XP amounts (35/60/90/140): stale — see § 2.
- DEV-first requirement: superseded — PROD is the active build/test environment for this run.
