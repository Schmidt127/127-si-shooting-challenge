# Launch Certification — Baseline

**Authority:** Final Launch Closure Lead session
**Captured:** 2026-07-25 (~06:53 America/Denver session start; refreshed during certification)
**Branch for certification work:** `launch/final-production-certification`

## Authoritative Git SHAs

| Item | SHA | Notes |
|------|-----|-------|
| Expected master (brief) | `267d4736a95b47273d3439a89665bd9855675395` | Matches `origin/master` |
| `origin/master` | `267d4736a95b47273d3439a89665bd9855675395` | Confirmed after `git fetch --all --prune` |
| Approved integration tip | `713f3faf05e45ea9c6bcf41eb636536d05b88ac2` | **Already an ancestor of master** (no pending merge) |
| Local `master` | `267d4736a95b47273d3439a89665bd9855675395` | Fast-forward aligned with origin |
| Continuation tip (not base) | `ee38f4d` / parent `0c8a9e5` | Docs/tests only; functional **118 v1.5** already on master via Agent 2 `de6449d` |

## Environment

| Item | Value |
|------|-------|
| Node | v22.16.0 |
| npm | 10.9.2 |
| OS | Windows 10 (win32 10.0.26200) |
| Shell | PowerShell |

## Dirty state found at session start

1. Checked out `continuation/go-live-second-pass-review` with an **in-progress merge** of Agent 5 (`c6103e3`) and conflict markers in six files.
2. Merge **aborted** after inventory — Agent 5 tip is already an ancestor of master.
3. Continuation was **21 commits behind** master; not a valid integration base.
4. Created clean `launch/final-production-certification` from `origin/master`.
5. Cherry-pick of continuation `0c8a9e5` aborted after proving master already contains functional 118 v1.5; unique schedule-on contract test + attestation corrections retained separately.

## Active worktrees (inventory)

| Path | HEAD | Branch |
|------|------|--------|
| `…/127-si-shooting-challenge` | certification branch | `launch/final-production-certification` |
| `…/127-si-agent11-homework-wt` | `19d6a25` | `agent11/homework-pipeline` |
| `…/127-si-agent2-data-model` | `55795ed` | `agent2/airtable-data-model-cleanup` |
| `…/127-si-agent5-lead-wt` | `c6103e3` | `agent5/lead-reconciliation-2026-07-24` |
| `…/127-si-agent5-lead-wt2` | `267d473` | `master` |
| `…/127-si-go-live-agent2-merge` | `713f3fa` | `integration/go-live-promotion-2026-07-24` |
| `…/127-si-shooting-challenge-agent-a` | `8edd437` | `audit-followup/agent-a-xp-automation-contracts` |
| `…/127-si-shooting-challenge-agent-b` | `07c6e95` | `audit-followup/agent-b-web-docs-release-hygiene` |
| `…/127-si-shooting-challenge-agent4` | `7b6f408` | `agent4/testing-qc-prod-safety` |
| `…/127-si-shooting-challenge-agent9` | `c0c0ca9` | `agent9/automation-ownership-contract` |
| `…/127-si-shooting-challenge-c025-stage17-audit` | `0510663` | `audit/c025-stage17-prod-readiness` |
| `…/127-si-shooting-challenge-e2e-wt` | `71cc020` | `overnight/lead-integration` |
| `…/127-si-shooting-challenge-integration` | `441ea5e` | `agent13/final-reconciliation` |
| `…/127-si-shooting-challenge-mvp-wt` | `3ec489a` | `feature/shooting-challenge-mvp` |
| `…/127-si-shooting-challenge-repo-health` | `612403b` | `overnight/repository-health-2026-07-21` |
| `…/127-si-worktrees/pr25-light-theme` | `bb74dd0` | detached |
| `…/127-si-worktrees/pr26-release-readiness` | `e24f9f2` | detached |
| `…/127-si-worktrees/worker-a` … `worker-d` | overnight tips | overnight/v2-run/* |
| `…/_sc_pr26_temp` | `e24f9f2` | detached |
| `…/_wt-handoff-2026-07-21` | `147b5f7` | `overnight/project-handoff-2026-07-21` |

## Open PRs at baseline (13)

| # | Title | Ahead / Behind master | Draft |
|---|-------|------------------------|-------|
| 2 | Cloud production environment setup | 1 / 231 | yes |
| 3 | Cloud production environment setup | 1 / 231 | yes |
| 4 | Cloud production environment setup | 1 / 231 | yes |
| 5 | Overnight Worker-D 070a docs | 3 / 231 | yes |
| 12 | Overnight Worker-B 070a backend | 5 / 231 | yes |
| 13 | Overnight Worker-C 070a tests | 7 / 231 | yes |
| 19 | Overnight Lead 070a E2E status | 57 / 231 | yes |
| 20 | Cloud production environment setup | 1 / 231 | yes |
| 21 | Cloud production environment setup | 1 / 231 | yes |
| 31 | OA2 066 OMNI blocked note | 1 / 183 | yes |
| 32 | OA1 C-025 Production install blocked | 1 / 183 | yes |
| 33 | V2 frontend functional readiness | 1 / 183 | yes |
| 36 | V2 execution board | 3 / 168 | yes |

## Stashes (not discarded)

| Index | Message |
|-------|---------|
| stash@{0} | agent5-partial-docs |
| stash@{1} | go-live-preserve-untracked-probes-snapshots-2026-07-24 |
| stash@{2} | wip-all-agents |
| stash@{3} | agent9-temp-preserve |
| stash@{4} | agent11-temp-keep-staged |
| stash@{5} | agent5-118-wip-preserve |
| stash@{6} | docs-cleanup-wip-preserved-for-send-key-run-2026-07-21 |
| stash@{7} | wip worker-a incomplete package |
| stash@{8} | lead-prep-uncommitted-2026-07-12 |

## Production truth locked for this certification

Weekly email (do **not** restore OFF guidance):

- 072 ON · 074 ON · 118 ON · 119 ON
- 118 v1.5 installed · Sunday 5:00 AM America/Denver · `dryRun=false` · `sendMode=Live` · `includeSchmidt=false` · `emptyWeekPolicy=send_short`
- 119 Sunday 10:00 AM America/Denver · `dryRun=false`
- 074 `sendMode=Live`
- Make `Weekly Athlete Summary - Bulk Email - May 18` ON
- Live email + Airtable writeback previously verified

## Vercel (spot-check at baseline)

| Item | Value |
|------|-------|
| Project | `127-si-shooting-challenge` (`prj_Qbwjx6JIazQHTHZwDxSv8zPvrTIH`) |
| Team | 127 Sports Intensity (`team_sNHJsPcyqGdsHKOk4shC9ggM`) |
| Latest production deployment | `dpl_82w6aASdkbKoVNXyRao7imFFxL7L` |
| Deployed commit | `267d4736a95b47273d3439a89665bd9855675395` |
| State | READY |
| Domains | `127-si-shooting-challenge.vercel.app` (+ team aliases) |
| Public product URL | https://www.hoopchallenges.com/shoot |

## Stop conditions checked

| Check | Result |
|-------|--------|
| local master vs origin/master | **Match** `267d473` |
| Approved integration ahead of master? | **No** — already merged |
| Untracked/stash discarded before inventory? | **No** — inventoried first |

## Next

See [START-HERE.md](./START-HERE.md) for the certification pack index.
