# SC-SEASON-SIM-002 — Cleanup plan for failed run

| Item | Value |
|------|--------|
| **Backlog** | SC-SEASON-SIM-002 |
| **Failed run** | `SEASON-SIM-2027-20260902T162925Z-athlete1` |
| **Athlete** | `recVcmD1WOy9UHVvS` |
| **Enrollment** | `recIWMKrfFkHLqg5U` |
| **Status** | **COMPLETE** 2026-09-02 — registry cleanup + Attendees reverse + out-of-registry XP Event deleted |

## Must cleanup before restart?

**Done.** Registry-scoped delete completed under confirmation  
`CONFIRM-CLEANUP-SEASON-SIM-2027-20260902T162925Z-athlete1` (plus standard tool gates).  
Start a **new run ID** when ready to re-execute; do **not** restore temporary formulas yet.

## Registry-scoped targets (121 records)

| Table | Count |
|-------|------:|
| Submissions | 58 |
| Submission Assets | 27 |
| Homework Completions | 18 |
| Weekly Athlete Summary | 10 |
| Video Feedback | 4 |
| Zoom Attendance | 2 |
| Enrollments | 1 |
| Athletes | 1 |

### Reverse (do not delete meeting)

- Zoom Meeting `recMJE0t5aR6ia8vl`: remove enrollment `recIWMKrfFkHLqg5U` from `Attendees`

### Outside registry — verify manually before restart

Automation **101** created Zoom recording XP Event `recYly4YTAVNVvGWS` (`ZOOM_RECORDING_CREDIT|recIWMKrfFkHLqg5U|…`). Confirm and delete any XP Events / Streak Occurrences / Achievement Unlocks linked to `recIWMKrfFkHLqg5U` that are not in the local registry.

### Never deleted by cleanup

Weeks, schema, automations, reference Zoom Meetings, real athletes outside this run, temporary Season Sim formulas (restore separately after a **successful** run).

## Commands (Mike approval required)

```powershell
cd tools
python -m season_simulation cleanup `
  --run-id SEASON-SIM-2027-20260902T162925Z-athlete1 `
  --dry-run

python -m season_simulation cleanup `
  --run-id SEASON-SIM-2027-20260902T162925Z-athlete1 `
  --confirm-cleanup "CONFIRM-CLEANUP-SEASON-SIM"
```

## After cleanup

1. Keep temporary gated `Activity Date Is Future?` until a successful corrected execute.
2. New run ID only (do not reuse the failed ID).
3. Restore Production NOW()-only formulas only after the new run succeeds.

## Writer fixes required before restart (done in repo)

- Date-only `Activity Date` + aligned `Season Sim Clock Now` (Denver calendar day)
- Homework Completions link **both** `Program Homework Assignment` and `Homework`
- Post-create Video Feedback update: `Feedback Posted?=true` (arms 113/114)
