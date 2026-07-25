# Launch Certification — START HERE

**Authority:** Final Launch Closure Lead  
**Date:** 2026-07-25  
**Repo:** `Schmidt127/127-si-shooting-challenge`  
**Status:** **MERGED + DEPLOYED**

## How to read production identifiers (avoid tip-sync loops)

| Concept | Meaning | Stable? |
|---------|---------|---------|
| **Application release commit** | PR #42 merge that landed the certified web/docs release | **Yes** — do not rewrite this when only docs change |
| **Verified production baseline** | `master` tip that was confirmed live on Vercel during closeout | Snapshot for that verification moment |
| **Current repository tip** | Whatever `origin/master` is now | **No** — verify dynamically |
| **Current Vercel production deploy** | Latest READY production deployment for this project | May move on documentation-only pushes without changing app behavior |

Later documentation-only commits do **not** invalidate the certified application release (`9110a71`).

### Verify current tip / deploy

```bash
git fetch origin
git rev-parse origin/master
```

In Vercel (project `127-si-shooting-challenge`, team 127 Sports Intensity): open the latest **Production** deployment and confirm **READY** + commit SHA.

## Certified application release

| Item | Value |
|------|-------|
| Application release commit (PR #42 merge) | `9110a711220fa209e3918680c7d18e936989b783` |
| PR #42 head before merge | `30513dc3ff590efd201cbdf8361d1c30e2f40023` |
| Open PRs after merge | **0** |
| Certification branch | Deleted (`launch/final-production-certification`) |

## Verified production baseline (closeout smoke)

Snapshot taken when post-merge public smoke and PR #33 frontend markers were confirmed. This is **not** an immutable forever tip.

| Item | Value |
|------|-------|
| Verified `master` tip at closeout | `4ffad3c4b846c140a7ca24f14bc7851ce97469e1` |
| Vercel deployment ID | `dpl_B2qc92jb8gg9wRvvixfhyDpTQKiG` |
| Vercel deployed commit | `4ffad3c4b846c140a7ca24f14bc7851ce97469e1` |
| Vercel status | **READY** (production) |
| Production domains | `127-si-shooting-challenge.vercel.app` · https://www.hoopchallenges.com/shoot |

Note: a later documentation correction commit may create a newer Vercel production deployment while leaving application behavior unchanged. Prefer the application release commit (`9110a71`) when asking “what release is certified?”

## Launch decision

# READY WITH NON-BLOCKING FOLLOW-UPS

Detail: [LAUNCH-DECISION.md](./LAUNCH-DECISION.md) · Closeout: [LAUNCH-CLOSEOUT.md](./LAUNCH-CLOSEOUT.md)

Weekly email PROD truth (do **not** disable):

- **072** ON  
- **074** ON and Live  
- **118** ON with `dryRun=false`, `sendMode=Live`, `includeSchmidt=false`, `emptyWeekPolicy=send_short`  
- **119** ON with `dryRun=false`  
- Make **`Weekly Athlete Summary - Bulk Email - May 18`** ON  

## Authoritative production facts (post-merge)

| Area | Truth |
|------|-------|
| Application release | `9110a71` (PR #42) |
| PR #33 frontend port | On master + live (`Weekly summary`, `Recent XP`/`Submission Base` on dashboard; `Recording credit` on Zoom detail) |
| Public URL | https://www.hoopchallenges.com/shoot |
| Softr | Obsolete / Not Used / Historical Reference Only |
| 070a PROD | Intentionally **OFF** |
| 112 | **OFF** expected |
| Completion master | Total **147**; Built **29** after SC-032 |

## Pack index

| Doc | Role |
|-----|------|
| [LAUNCH-CLOSEOUT.md](./LAUNCH-CLOSEOUT.md) | Final merge/deploy/smoke report |
| [BASELINE.md](./BASELINE.md) | Pre-merge session baseline |
| [GITHUB-PR-CLOSEOUT.md](./GITHUB-PR-CLOSEOUT.md) | PR disposition table |
| [WORKSPACE-CLEANUP.md](./WORKSPACE-CLEANUP.md) | Worktrees / stashes / branch prune |
| [VERCEL-CERTIFICATION.md](./VERCEL-CERTIFICATION.md) | Vercel project + deploy evidence |
| [AIRTABLE-PROD-CERTIFICATION.md](./AIRTABLE-PROD-CERTIFICATION.md) | PROD automation truth + Mike UI reconfirm |
| [MAKE-CERTIFICATION.md](./MAKE-CERTIFICATION.md) | Make scenarios (no webhook secrets) |
| [FILLOUT-CERTIFICATION.md](./FILLOUT-CERTIFICATION.md) | Season / Config Fillout Mike checklist |
| [TEST-CERTIFICATION.md](./TEST-CERTIFICATION.md) | Full suite + public smoke results |
| [LIVE-SMOKE-EVIDENCE.md](./LIVE-SMOKE-EVIDENCE.md) | 25-workflow evidence matrix |
| [MIKE-ACTIONS.md](./MIKE-ACTIONS.md) | Remaining authenticated UI reconfirm only |
| [LAUNCH-DECISION.md](./LAUNCH-DECISION.md) | Go / no-go with follow-ups |
| [_pr33-port-analysis.md](./_pr33-port-analysis.md) | PR #33 unique web port analysis |

## What Mike should do next

1. Complete remaining [MIKE-ACTIONS.md](./MIKE-ACTIONS.md) L1–L7 Airtable/Make reconfirm only (do **not** turn 118/119 OFF).
2. Optionally prune leftover local worktrees per [WORKSPACE-CLEANUP.md](./WORKSPACE-CLEANUP.md).