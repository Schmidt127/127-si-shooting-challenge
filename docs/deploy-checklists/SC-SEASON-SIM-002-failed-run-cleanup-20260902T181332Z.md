# SC-SEASON-SIM-002 — Cleanup plan for run `…T181332Z` (writer gap run)

| Item | Value |
|------|--------|
| **Backlog** | SC-SEASON-SIM-002 |
| **Run** | `SEASON-SIM-2027-20260902T181332Z-athlete1` |
| **Athlete** | `recU4HjofACTDwjK7` (Athlete 1) |
| **Enrollment** | `recD7sivJvlncZVex` |
| **Live Zoom Meeting** | `recKT5aEIlg5CEKqe` |
| **Recorded Zoom Meeting** | `recsZVEdX1dlNoDOq` |
| **Live Zoom Attendance** | `recUcYaYRQPGInq16` |
| **Recording Zoom Attendance** | `recJVV15MoVwn4ftA` |
| **Parent Email** | `schmidt@fairfieldbasketballclub.com` (allowlist only) |
| **Status** | **PLAN ONLY** — do not execute cleanup until Mike authorizes. Do not repair this run in place. |

## Why this run is disposable

Writer completed, but live Zoom / streaks / email arms were incomplete (writer gaps fixed in GitHub for the *next* run). Perfect Week ineligibility is expected (misses + sparse videos + Needs Revision homework). Temporary Season Sim formulas stay until a later successful run.

## Disposable confirmation

| Check | Result |
|-------|--------|
| Athlete name | Athlete / 1 (VERIFY sim) |
| Parent email | Allowlist only — not a real family |
| Weeks / PHAs / schema | **Not** cleanup targets |
| Real athletes | None in this run |
| Automations 101 / 117 / SC-147 | **Do not modify** |

## Registry-scoped delete targets (123 unique records)

Use registry: `tools/season_simulation/run_registries/SEASON-SIM-2027-20260902T181332Z-athlete1.json`

| Table | Count |
|-------|------:|
| Submissions | 58 |
| Submission Assets | 27 |
| Homework Completions | 18 |
| Weekly Athlete Summary | 10 |
| Video Feedback | 4 |
| Zoom Attendance | 2 |
| Zoom Meetings | 2 |
| Enrollments | 1 |
| Athletes | 1 |
| **Total** | **123** |

Sim-created Zoom Meetings are registry-deleted (no Attendees reverse patch required).

## Outside registry — delete with this enrollment

Filter: `{Enrollment Record ID}='recD7sivJvlncZVex'` (or equivalent).

| Table | Count | Notes |
|-------|------:|-------|
| XP Events | **87** | Prefixes: `SUBMISSION_XP` 58, `WEEKLY_THRESHOLD` 11, `HOMEWORK_XP` 9, `SHOT_MILESTONE` 4, `VIDEO_SUBMISSION` 4, `ZOOM_RECORDING_CREDIT` 1. No live Zoom XP (Create XP Events was never armed). |
| Email Handoff Queue | **2** | `recQU4aDux4XRtmbL` WELCOME Accepted; `rec776koIp0e5O95X` ZOOM_RECORDING_APPROVAL Accepted |
| Athlete Achievement Unlocks | 0 | — |
| Streak Occurrences | 0 | Expected — 053 never fired (create-only) |

## Never deleted

Weeks, PHAs, Homework Library, Grade Bands, Goals, Levels, Achievements, XP Reward Rules, VERIFY Zoom Meeting records (none used), temporary Season Sim formulas (restore only after a later successful run), Automation scripts.

## Commands (Mike authorize first)

```powershell
cd tools
python -m season_simulation cleanup `
  --run-id SEASON-SIM-2027-20260902T181332Z-athlete1 `
  --execute `
  --confirm "SEASON-SIMULATION-2027" `
  --confirm-cleanup "CONFIRM-CLEANUP-SEASON-SIM" `
  --simulation-id SEASON-SIM-2027-20260902T181332Z-athlete1
```

Then delete the **87 XP Events** + **2 Email Handoff Queue** rows for enrollment `recD7sivJvlncZVex` (out-of-registry dependents).

## After cleanup

1. Confirm enrollment / athlete / sim Zoom Meetings are gone.
2. Do **not** start the next simulation until writer changes are reviewed.
3. Next execute still needs: temporary gated formulas (if wall date &lt; 2027-05-01), allowlisted email when delivery enabled, `--acknowledge-clock-override` when required.
