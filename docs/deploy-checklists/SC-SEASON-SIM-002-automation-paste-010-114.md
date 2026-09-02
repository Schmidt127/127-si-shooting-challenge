# SC-SEASON-SIM-002 — Automation paste (010 / 114 / 073 Season Sim date gate)

| | |
|---|---|
| **Backlog** | SC-SEASON-SIM-002 |
| **Date** | 2026-09-02 |
| **Base** | Production `appn84sqPw03zEbTT` (paste after GitHub review) |
| **Scope** | Dual-gated “today” for Activity Date eligibility on disposable sim Submissions only |

## What changed

When a Submission has **both**:

1. `Season Sim Test Record?` = checked  
2. `Video Upload Note` contains `SEASON-SIM|`

automations treat `Season Sim Clock Now` as “today” for Activity Date ≤ today / future checks.

Ordinary (non-sim) records keep exact wall-clock America/Denver behavior. Missing clock on a gated row falls back to wall-clock (fail closed).

| Script | Version | Gate helpers |
|---|---|---|
| `010-submission-intake-create-xp-event.js` | **v10.13** | `isSeasonSimRecord` + `effectiveTodayKey` |
| `114-video-review-and-xp-create-or-update-video-xp-event.js` | **v6.2** | `isSeasonSimRecord` + `effectiveTodayDenverKey` |
| `073-…-send-video-feedback-parent-email-webhook.js` | **v4.6** | same gate so future sim Activity Dates do not block Hub handoff **create** (does not send email) |

**Do not paste:** 101, SC-147, 117. Do not create automation 121.

## Paste steps (Mike)

1. Confirm GitHub copies are the versions above (`SCRIPT.version` / `CONFIG.version`).
2. Open each Airtable automation script action.
3. Paste from the production docblock (`/************************************************************`) through end of file — **skip** the GitHub-only header above that docblock.
4. Save; leave automations **off** or run on a disposable sim Submission only until verified.
5. Verify with one gated sim row: Activity Date in May 2027, `Season Sim Clock Now` ≥ that date → 010 eligible / 114 not `skipped_submission_activity_date_future`.
6. Verify a normal athlete row with a future Activity Date still skips / errors as before.

## Offline contract tests

```bash
python -m unittest tools.season_simulation.tests.test_season_sim_date_gate
# or from tools/:
python -m unittest season_simulation.tests.test_season_sim_date_gate
```

Contract module (not importable from Airtable): `tools/season_simulation/season_sim_date_gate.py`.

## Related

- Formula gate packet: `tools/season_simulation/FORMULAS-TO-PASTE.txt`
- Operator checklist: `docs/deploy-checklists/SC-SEASON-SIM-002-operator-checklist.md`
