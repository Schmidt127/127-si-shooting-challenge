# SC-SEASON-SIM-002 — Cleanup plan for failed run (2026-09-02T171918Z)

| Item | Value |
|------|--------|
| **Backlog** | SC-SEASON-SIM-002 |
| **Failed run** | `SEASON-SIM-2027-20260902T171918Z-athlete1` |
| **Athlete** | `recx6DMnsAKXMgiWo` (Athlete 1) |
| **Enrollment** | `recO6jPoGznNtO7tp` |
| **Parent Email** | `schmidt@fairfieldbasketballclub.com` (allowlist only) |
| **Status** | **COMPLETE** 2026-09-02 — registry cleanup (121) + Attendees reverse + 11 WEEKLY_THRESHOLD XP Events + 2 Email Handoff Queue rows deleted |

## Disposable confirmation

| Check | Result |
|-------|--------|
| Athlete name | Athlete / 1 (VERIFY sim) |
| Parent email | Allowlist only — not a real family |
| Weeks / PHAs / schema | **Not** cleanup targets |
| Zoom Meeting records | **Not** deleted (reference/VERIFY) |
| Real athletes | None in this run |

## Registry-scoped delete targets (121 records)

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
| **Total** | **121** |

## Reverse (do not delete meeting)

| Meeting | Action |
|---------|--------|
| `recMJE0t5aR6ia8vl` | Remove enrollment `recO6jPoGznNtO7tp` from `Attendees` (leave `recn1QUIGO1PjbnnY`) |

## Outside registry — must delete with this enrollment

| Table | Count | IDs / notes |
|-------|------:|-------------|
| XP Events | 11 | All `WEEKLY_THRESHOLD\|recO6jPoGznNtO7tp\|…` (automation-created; not in writer registry) |
| Email Handoff Queue | 2 | `recHhxlnAjvYTaV7Z` (WELCOME Failed), `recdHBm621onPGXsn` (ZOOM_RECORDING_APPROVAL Failed) |
| Athlete Achievement Unlocks | 0 | — |
| Streak Occurrences | 0 | — |

## Never deleted

Weeks, PHAs, Homework Library, Grade Bands, Goals, Levels, Achievements, XP Reward Rules, Zoom Meeting **records**, temporary Season Sim formulas (restore only after a later successful run).

## Commands

```powershell
cd tools
python -m season_simulation cleanup `
  --run-id SEASON-SIM-2027-20260902T171918Z-athlete1 `
  --execute `
  --confirm "SEASON-SIMULATION-2027" `
  --confirm-cleanup "CONFIRM-CLEANUP-SEASON-SIM" `
  --simulation-id SEASON-SIM-2027-20260902T171918Z-athlete1
```

Then delete the 11 XP Events + 2 Email Handoff Queue rows identified above (out-of-registry dependents).
