# XP Reward Rules Audit

Overnight Agent 2 · 2026-07-23 · machine-readable version: `xp-rules-audit.json`

Live rule inventory: 31 active rules, **zero duplicate active Rule Keys** (verified via
`tools/airtable/overnight_config_xp_prod_probe.py` + `overnight_config_xp_analyze.py`, and previously
`tools/airtable/verify_xp_reward_rules.py` → `xp-reward-rules-prod-live.json`).

## Source-by-source coverage

### Submission Base — HEALTHY (live-verified)
- Rule: `SHOOTING_BASE` = 20, active, no Grade Band dependency.
- Writer: 010. Lookup by Rule Key + Active; **errors** when rule missing or amount invalid (L1033).
- Source Key `SUBMISSION_XP|{submissionId}`; XP date = Submission Activity Date; XP Source "Submission Base"; bucket "Shooting Base".
- Dedupe: normalized key scan + `decideXpEventAction` semantics; rerun-safe.
- Live evidence: `recuuTBgstSTGg2E3` → exactly one event `recOodD23MQrP1O9F`, 20 XP, Denver-midnight date, deterministic dedupe key. Verified read-only 2026-07-23.

### Homework Completion — RULE PRESENT
- Rule: `HOMEWORK_COMPLETION` = 35, active. Writer: homework XP automation (065-family). Source Key `HOMEWORK_XP|{completionId}`. Not live-tested this run (owned by homework agent).

### Video Feedback — **DEFECT FOUND**
- Rule: `VIDEO_SUBMISSION` = 25, active.
- Live event `recYQ10pOoFlApmjZ` has **XP Points = 1** and **blank XP Activity Date** (`date=None`), dedupe key `…|video_submission|reccxspfiinipmpcm|video submission`.
- Either the writer did not read the rule, or the rule amount changed after the event. Needs writer identification + repair decision → MIKE-ACTIONS #4. Do not mass-edit XP without Mike.

### Zoom Attendance — RULES PRESENT
- `ZOOM_ATTEND_BASE` = 60, `ZOOM_ATTEND_BONUS_2` = 30, `ZOOM_ATTEND_BONUS_3` = 40. Source keys `ZOOM_ATTEND_BASE|{meeting}|{enrollment}` etc. (lib-verified formats). Zoom system owned by another agent; not modified.

### Zoom Recording Credit — NO RULE (by design so far)
- No `ZOOM_RECORDING_*` rule key. Live event (30 pts, XP Source "Zoom Meeting Recording Quiz") came from the C-025 recording path. If the amount should be rule-driven, a rule record is needed (decision, not defect).

### Streak — RULES PRESENT (amounts differ from historical docs)
- Active: 3d=10, 5d=15, 7d=20, 10d=30, 20d=50, 30d=60, 40d=75, 50d=90, 60d=105. PROD authoritative; historical 35/60/90/140 values are stale documentation.
- Writer: 054. Rule key derived `STREAK_{n}DAY` (matches all nine active rules).
- **Weakness:** 054 uses `.find()` on active rules; duplicate active keys would resolve nondeterministically (059 throws instead). PROD currently clean; hardening recommended.
- Source Key `STREAK_XP|{enrollment}|{achievement}|{endDate}` — format pinned by tests.

### Shot Milestone — HEALTHY DESIGN
- Points come from `Points Awarded` on the Shot Milestone record (per-band table), with 059 creating the XP event; 059 throws on duplicate active rules. Source Key `SHOT_MILESTONE|{enrollment}|{milestone}`.

### Perfect Week — RULE PRESENT
- `PERFECT_WEEK` = 100, active — matches the historical product value. Writers: 058 (unlock) → 059 (XP). Source Key `PERFECT_WEEK|{enrollment}|{week}`.

### Weekly Threshold — FULL BAND COVERAGE
- 15 rules: `WEEKLY_THRESHOLD_{100|125|150}_{K2|34|56|78|912}` = 10/20/30, each linked to its Grade Band record. All five active bands covered; no gaps, no duplicates.

### Manual Bonus — NO RULE (works via field)
- No `MANUAL_BONUS` rule; `Lifetime XP Manual Adjustments` (Enrollments) carries manual XP. XP Source select includes "Manual Adjustment" for event-based entries. Acceptable; document as intended pattern or add a rule (decision).

## Cross-cutting behaviors

| Behavior | 010 | 054 | 059 | 065-family |
|---|---|---|---|---|
| Missing rule | error out | skip/error with debug | error | error |
| Duplicate active rules | first match (PROD clean) | **first match — weakness** | **throws** | n/a |
| Rerun | skip via dedupe key | skip via source key | skip via source key | skip |
| Amount source | rule | rule | milestone record, else rule | rule |

## Test coverage added this run

- Dedupe decisions (create / skip_existing / repair_link / cross-source error / blank key): `overnight-streak-milestone-dedupe.test.js`.
- Source-key determinism for every prefix used by XP writers.
- Date-source behavior for all sources: `overnight-xp-date-source.test.js`.

## Recommendations (no XP amounts changed)

1. Harden 054 with the 059 duplicate-active-rule throw (repo edit + paste).
2. Resolve the Video Submission 1-vs-25 discrepancy (MIKE-ACTIONS #4).
3. Decide whether Zoom Recording Credit and Manual Bonus should have rule records (decision section).
