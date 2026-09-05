# SC-SEASON-SIM-002 — Discrepancies before cleanup
# Run: SEASON-SIM-2027-20260905T122531Z-athlete1
# Date: 2026-09-05

## Email safety (PASS)

- All **69** Email Handoff Queue rows for enrollment `recmImoXTlKb5NWSY` are **Accepted**
- Every recipient is exactly `schmidt@fairfieldbasketballclub.com`
- Events: DAILY_SUBMISSION 58 · WELCOME 1 · HOMEWORK_FEEDBACK 9 · ZOOM_RECORDING_APPROVAL 1
- **No non-allowlisted recipients** — proceed

## Core cascade (PASS / expected)

| Metric | Expected | Actual |
|---|---:|---:|
| Submissions created | 58 | 58 |
| Count This Submission? = 1 | 58 | 58 |
| Activity Date Is Future? = 1 | 0 | 0 |
| Submitted Same Day? = 1 | 57 | 57 |
| Total Shots Counted | 13906 | 13906 |
| Homework Completions | 18 | 18 |
| Video Feedback creates | 4 | 4 |
| Perfect Week Eligible | 0 | 0 |
| Streak Occurrences | ~17 | **18** |
| ZOOM_ATTEND_BASE XP | 1 | 1 |
| ZOOM_RECORDING_CREDIT XP | 1 | 1 |
| VIDEO_SUBMISSION XP | 4 | 4 |
| HOMEWORK_XP | ~9 | 9 |
| WEEKLY_THRESHOLD XP | — | 11 |
| SHOT_MILESTONE XP | — | 4 |
| STREAK_XP | — | 16 |

## Discrepancies (non-blocking for cleanup)

1. **SUBMISSION_XP row count 59 vs unique keys 58** — one duplicate `SUBMISSION_XP|{submissionId}` XP Event exists for this enrollment. Core countable submissions remain 58. Cleanup will delete both rows with the enrollment.
2. **WEEKLY parent email handoffs not observed** in Email Handoff Queue for this enrollment (0 WEEKLY event types). Daily / welcome / homework / zoom recording approval all Accepted. Prior T213135Z had 6 WEEKLY Accepted — this run did not produce WEEKLY Hub handoffs (or they are not keyed to this Enrollment Record ID). Documented; not a cleanup blocker.
3. **Athlete Achievement Unlocks = 0** — may still be cascading or unlock path not armed for this scenario; enrollment has level link present. Documented.

## Cleanup scope

- Registry-scoped delete via `python -m season_simulation cleanup` for this run ID only
- Enrollment-scoped extras: XP Events (105), Streak Occurrences (18), Email Handoff Queue (69), Unlocks (0)
- Never: Weeks, PHA, schema, formulas until Stage Z restore, real athletes
