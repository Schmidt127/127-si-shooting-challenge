# Launch Closeout Report — 2026-07-25

> **Historical reference only — not an active source of truth.**
> This closeout records a prior release snapshot. Current release status is in
> [`../SHOOTING_CHALLENGE_COMPLETION_MASTER.md`](../SHOOTING_CHALLENGE_COMPLETION_MASTER.md);
> current live Vercel state must be checked in Vercel.

**Authority:** Final Launch Closure Lead  
**Mike merge authorization:** Explicit for PR #42  
**Decision:** **READY WITH NON-BLOCKING FOLLOW-UPS**

## Identifier model (no tip-sync loops)

| Label | SHA / ID | Role |
|-------|----------|------|
| **Application release commit** | `9110a711220fa209e3918680c7d18e936989b783` | PR #42 merge — certified application release |
| **Verified production baseline** | `4ffad3c4b846c140a7ca24f14bc7851ce97469e1` | `master` tip verified on Vercel during closeout (before later doc-only corrections) |
| **Current repository tip** | *(dynamic)* | Run `git fetch origin && git rev-parse origin/master` |
| **Verified Vercel production deploy** | `dpl_B2qc92jb8gg9wRvvixfhyDpTQKiG` @ `4ffad3c…` | READY production deploy confirmed at closeout |

Documentation-only commits after the application release do **not** invalidate the certified release. They may create a newer Vercel production deployment while application behavior remains the same.

### Re-verify later

1. Git tip: `git fetch origin && git rev-parse origin/master`  
2. Vercel: project `127-si-shooting-challenge` → latest Production deployment → confirm **READY** and commit SHA  

## GitHub

| Item | Value |
|------|-------|
| PR merged | [#42](https://github.com/Schmidt127/127-si-shooting-challenge/pull/42) |
| Expected head SHA | `30513dc3ff590efd201cbdf8361d1c30e2f40023` (**matched**) |
| Application release commit (merge) | `9110a711220fa209e3918680c7d18e936989b783` |
| Parents | `267d473…` + `30513dc…` |
| Verified production baseline tip | `4ffad3c4b846c140a7ca24f14bc7851ce97469e1` |
| `origin/master` | Verify dynamically (see above) |
| Open PRs remaining | **0** |
| Certification branch | Deleted |

## Vercel production (verified at closeout)

| Item | Value |
|------|-------|
| Project | `127-si-shooting-challenge` (`prj_Qbwjx6JIazQHTHZwDxSv8zPvrTIH`) |
| Deployment ID | `dpl_B2qc92jb8gg9wRvvixfhyDpTQKiG` |
| Deployed commit | `4ffad3c4b846c140a7ca24f14bc7851ce97469e1` |
| Target | production |
| Status | **READY** |
| Domains | `127-si-shooting-challenge.vercel.app` · https://www.hoopchallenges.com/shoot |
| Auto-deploy from master | **Confirmed** |

Application release content landed earlier on production via merge deploy `dpl_7srdSJxo5ubJJCEhwFrZx9zk9d3m` @ `9110a71`. Subsequent READY deploys through `4ffad3c` were documentation/closeout follow-ups on the same release line.

## Public production checks (post-deploy)

| Route | Status |
|-------|--------|
| `/shoot` | **PASS** 200 |
| `/shoot/api/airtable` | **PASS** 200 `ok:true` `tokenValid:true` base `appn84…` |
| `/shoot/leaderboard` | **PASS** 200 |
| `/shoot/dashboard` | **PASS** 200 |
| `/shoot/achievements` | **PASS** 200 |
| `/shoot/levels` | **PASS** 200 |
| `/shoot/homework` | **PASS** 200 |
| `/shoot/tutorials` | **PASS** 200 |
| `/shoot/zoom-meetings` | **PASS** 200 |
| `/shoot/game-manual` | **PASS** 200 |
| `/shoot/public-display` | **PASS** 200 |

## PR #33 frontend serving confirmation

| Marker | Where | Result |
|--------|-------|--------|
| `Weekly summary` | `/shoot/dashboard` | **PASS** |
| `Video feedback` | `/shoot/dashboard` | **PASS** |
| `Recent XP` / `Submission Base` | `/shoot/dashboard` | **PASS** |
| `Recording credit` | `/shoot/zoom-meetings/rec3ToANr5pcs2SRG` | **PASS** |

## Weekly email (unchanged — do not modify)

- **072** ON  
- **074** ON and Live  
- **118** ON with `dryRun=false`, `sendMode=Live`, `includeSchmidt=false`, `emptyWeekPolicy=send_short`  
- **119** ON with `dryRun=false`  
- Make **`Weekly Athlete Summary - Bulk Email - May 18`** ON  

## Remaining non-blocking Mike actions

Airtable/Make UI reconfirm only — [MIKE-ACTIONS.md](./MIKE-ACTIONS.md) L1–L7 / L12–L15. Not code tasks.

## Rollback

If needed: Vercel rollback to pre-release production `dpl_82w6aASdkbKoVNXyRao7imFFxL7L` (`267d473`) or GitHub revert of application release merge `9110a71`. Weekly-email settings are independent of this web/docs merge.