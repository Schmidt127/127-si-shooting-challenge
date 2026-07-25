# Launch Certification — START HERE

**Authority:** Final Launch Closure Lead  
**Date:** 2026-07-25  
**Repo:** `Schmidt127/127-si-shooting-challenge`  
**Certification branch:** `launch/final-production-certification`  
**Master tip (origin):** `267d4736a95b47273d3439a89665bd9855675395`

## Purpose

Single index for final production launch certification. Use this pack — not stale next-wave OFF guidance — as the ops entry point for the 2026-07-25 closeout.

## Current launch decision (placeholder → see LAUNCH-DECISION)

| Item | Value |
|------|-------|
| Preliminary decision | **READY WITH NON-BLOCKING FOLLOW-UPS** |
| Detail | [LAUNCH-DECISION.md](./LAUNCH-DECISION.md) |
| Hard gate remaining | Merge this certification branch (PR #33 web port) → public `/shoot` smoke → Mike UI reconfirm of weekly-email season inputs |

Do **not** treat Softr, 070a, or 112 as launch blockers (Obsolete / intentionally OFF / expected OFF).

## Authoritative production facts (locked)

| Area | Truth |
|------|-------|
| Git `origin/master` | `267d473` |
| Approved integration `713f3fa` | Already on master |
| Functional **118 v1.5** | Already on master (Agent 2 `de6449d`) |
| Vercel production | READY `dpl_82w6aASdkbKoVNXyRao7imFFxL7L` serving `267d473` |
| Public URL | https://www.hoopchallenges.com/shoot |
| Weekly email | **072/074/118/119 ON**; 118 v1.5; 118 Sun 5AM Denver `dryRun=false` `sendMode=Live` `includeSchmidt=false` `emptyWeekPolicy=send_short`; 119 Sun 10AM `dryRun=false`; 074 Live; Make Bulk Email May 18 ON; live email+writeback previously verified |
| Softr | Obsolete / Not Used / Historical Reference Only |
| 070a PROD | Intentionally **OFF** |
| 112 | **OFF** expected |
| Completion master | Total **147** (SC-147 RCC from PR #40); Built **29** after SC-032 |
| Open PRs | 12 closed this session; **#33** remaining until frontend port merges |

## Pack index

| Doc | Role |
|-----|------|
| [BASELINE.md](./BASELINE.md) | Session baseline SHAs, worktrees, stashes, Vercel spot-check |
| [GITHUB-PR-CLOSEOUT.md](./GITHUB-PR-CLOSEOUT.md) | PR disposition table (12 closed, #33 open) |
| [WORKSPACE-CLEANUP.md](./WORKSPACE-CLEANUP.md) | Worktrees / stashes / branch prune proposals |
| [VERCEL-CERTIFICATION.md](./VERCEL-CERTIFICATION.md) | Vercel project + deploy evidence |
| [AIRTABLE-PROD-CERTIFICATION.md](./AIRTABLE-PROD-CERTIFICATION.md) | PROD automation truth from repo docs + Mike UI reconfirm |
| [MAKE-CERTIFICATION.md](./MAKE-CERTIFICATION.md) | Make scenarios (no webhook secrets) |
| [FILLOUT-CERTIFICATION.md](./FILLOUT-CERTIFICATION.md) | Season / Config Fillout Mike checklist |
| [LIVE-SMOKE-EVIDENCE.md](./LIVE-SMOKE-EVIDENCE.md) | 25-workflow evidence matrix |
| [MIKE-ACTIONS.md](./MIKE-ACTIONS.md) | Minimal authenticated UI only |
| [LAUNCH-DECISION.md](./LAUNCH-DECISION.md) | Preliminary go / no-go with follow-ups |
| [_pr33-port-analysis.md](./_pr33-port-analysis.md) | PR #33 unique web port analysis |
| [_pr33-port.patch](./_pr33-port.patch) | Port patch artifact |

## Related ops docs

- Live snapshot: [`docs/PROJECT_STATE.md`](../PROJECT_STATE.md)
- Completion master: [`docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md`](../SHOOTING_CHALLENGE_COMPLETION_MASTER.md)
- Automation index: [`docs/automation-index.md`](../automation-index.md)
- Weekly email architecture: [`docs/next-wave/was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md`](../next-wave/was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md)
- Stale OFF correction: [`docs/next-wave/reliability-audit-2026-07-24/STALE-CLAIM-CORRECTION.md`](../next-wave/reliability-audit-2026-07-24/STALE-CLAIM-CORRECTION.md)

## What Mike should do next

1. Complete [MIKE-ACTIONS.md](./MIKE-ACTIONS.md) (reconfirm only — do not turn 118/119 OFF).
2. After this branch merges: public smoke at `/shoot` + health `GET /shoot/api/airtable`.
3. Close PR #33 with replacement evidence once port is on master.
4. Optionally prune local worktrees per [WORKSPACE-CLEANUP.md](./WORKSPACE-CLEANUP.md) (remote branch deletes require Mike auth).