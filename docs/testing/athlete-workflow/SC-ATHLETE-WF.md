# SC-ATHLETE-WF-001 — Individual athlete workflow QA

| Field | Value |
|-------|--------|
| Backlog | **SC-ATHLETE-WF-001** · **MRW-F09** |
| Status | **IN PROGRESS** (harness + dry-run + offline contracts) |
| Purpose | Expose workflow defects on the **single-athlete** path **before** season simulation (`SC-SEASON-SIM-001` / `SC-SEASON-SIM-002`) |
| Harness | `tools/testing/sc-athlete-wf.mjs` |
| Library | `tools/testing/lib/sc-athlete-wf-lib.mjs` |
| Contracts | `tools/testing/tests/test_sc_athlete_wf_contract.mjs` |
| Evidence | `docs/testing/evidence/sc-athlete-wf/` |
| Manifest | `docs/testing/athlete-workflow/fixtures/_sc-athlete-wf-last.json` |

## Scope (in)

Enrollment → daily submissions → assets → homework → video → XP → streaks → levels → achievements → Weekly Athlete Summary → replay/dedupe → negatives.

## Scope (out)

- Season simulation (`tools/season_simulation/`, SC-SEASON-SIM-*) — **do not implement or run here**
- Perfect Week full award path — covered by **SC-PW-E2E** (COMPLETE; do not re-`--apply` closed fixtures)
- Live email / Resend / Gmail / Make notification arms
- Production automation paste
- Real athlete mutations

## Safety

| Rule | Enforcement |
|------|-------------|
| Dry-run default | No Airtable writes without `--apply` |
| `ATHWF\|` prefix | Created Week names / batch labels must start with `ATHWF\|` |
| Gated enrollment | Testing3 Schmidt only: `recNu6fcBpF1GG3u5` |
| No email | Never set `Build Daily Email Now?` / `Build Weekly Email Now?` / Hub send triggers |
| No formula writes | Do not write computed fields or Lifetime XP |
| Cleanup guard | `--cleanup` deletes **only** manifest IDs; Week name must still start with `ATHWF\|` |
| Weeks policy | Disposable `ATHWF\|` weeks created by this harness may be deleted on cleanup only. Operational calendar Weeks are never touched. |

## Automation contracts under test

| Stage | Automations | Source Key / uniqueness |
|-------|-------------|-------------------------|
| Week / identity | 005, 023 | Enrollment + Week links; Denver Activity Date |
| Submission XP | 010 | `SUBMISSION_XP\|{submissionId}` — one per submission; counted day rules per engine |
| WAS find/create | 031 | One WAS per Enrollment + Week |
| Homework HC | 020 | One HC per Enrollment + PHA (FUT-001) |
| Homework XP | 065 | `HOMEWORK_XP\|{hcId}` |
| Video Feedback | 112 / 114 | `VIDEO_SUBMISSION\|{vfId}` |
| Streaks | 053, 054, 055 | `STREAK_XP\|{enrollmentId}\|{achievementId}\|{streakEndDate}` |
| Levels | 041, 042 | Current / Next Level assignment |
| Weekly rollup | 031, 034, 072 (build only) | Days Logged, Shots, Weekly XP — **072 must not send** |

## Workflow checklist (17 stages)

1. Identify gated disposable Active enrollment (Testing3).
2. Create `ATHWF|` Week + Weekly Athlete Summary (or dry-run plan).
3. Submit valid daily shooting across multiple dates.
4. Include same-day, backdated, multi-same-date, varied shot totals, Count It + Simple Total.
5. Verify enrollment/week links, Activity Date, week-mismatch for backdates, submission XP once, dedupe.
6. Add disposable homework/video assets (or direct HC/VF rows when asset path blocked).
7. Verify routing to Homework Completions and Video Feedback.
8. Multiple assets → one Homework Completion.
9. Mark homework satisfactory → homework XP once.
10. Video feedback → correct enrollment, activity date, grade band, XP, no duplicate.
11. Streaks: consecutive dates, missed date, backdate, multi-same-day.
12. Streak unlocks + streak XP.
13. Level recalculation / current / next.
14. WAS: Days Logged, Shots, Weekly XP, Current Level, Perfect Week fields, calculation status.
15. XP Events: bucket, source, source key, activity date, enrollment, week.
16. Replay automations / re-poll → no duplicate records or XP.
17. Negatives: missing enrollment/week, invalid asset destination, duplicate submission, incomplete homework, ineligible Perfect Week, inactive enrollment, outside season window.

## Commands

```bash
# Dry-run plan (default — no writes)
node tools/testing/sc-athlete-wf.mjs --case full

# Offline contract suite
node tools/testing/tests/test_sc_athlete_wf_contract.mjs

# Read-only live probe (enrollment + XP inventory; no creates)
node tools/testing/sc-athlete-wf.mjs --case full --readonly

# Live disposable apply (requires Enrollments + Weeks write PAT)
node tools/testing/sc-athlete-wf.mjs --case full --apply

# Cleanup only what this run created
node tools/testing/sc-athlete-wf.mjs --cleanup
```

## Cases

| `--case` | Intent |
|----------|--------|
| `full` | Happy path through stages 1–16 + negative matrix as evaluations |
| `submissions` | Stages 1–5 + replay only |
| `homework-video` | Stages 6–10 |
| `streaks-levels` | Stages 11–13 |
| `was` | Stage 14 |
| `negatives` | Stage 17 offline + plan-only |

## Defect report format

For every defect in evidence JSON / report:

- Severity (`P0`–`P3`)
- Workflow stage (1–17)
- Exact reproduction steps
- Expected result
- Actual result
- Likely cause
- Recommended fix
- Fix owner: `code` | `airtable` | `make.com` | `product-decision`

## Related

- SC-005 matrix: `docs/V2_END_TO_END_TEST_MATRIX.md` · `tools/testing/run_e2e_matrix.mjs`
- SC-PW-E2E: `docs/testing/perfect-week/SC-PW-E2E.md`
- Season sim (future only): Future Work `SC-SEASON-SIM-001` / `SC-SEASON-SIM-002` — **not this harness**
