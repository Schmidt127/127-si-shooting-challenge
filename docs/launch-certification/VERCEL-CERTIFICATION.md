# Launch Certification — Vercel

**Authority:** Final Launch Closure Lead  
**Date:** 2026-07-25  
**Evidence class:** API/CLI spot-check this session + prior deploy readiness

## Project

| Item | Value |
|------|-------|
| Project name | `127-si-shooting-challenge` |
| Project ID | `prj_Qbwjx6JIazQHTHZwDxSv8zPvrTIH` |
| Team | 127 Sports Intensity (`team_sNHJsPcyqGdsHKOk4shC9ggM`) |
| Root Directory | `web` |
| Production branch | `master` |

## Production deployment (certified)

| Item | Value |
|------|-------|
| Deployment ID | `dpl_82w6aASdkbKoVNXyRao7imFFxL7L` |
| Deployed commit | `267d4736a95b47273d3439a89665bd9855675395` |
| State | **READY** |
| Matches `origin/master` | **Yes** |

## Domains / URLs

| Surface | URL |
|---------|-----|
| Vercel default | https://127-si-shooting-challenge.vercel.app |
| Public product | https://www.hoopchallenges.com/shoot |
| Local | http://localhost:3001/shoot |

## Expected production env (do not paste secrets)

| Variable | Expectation |
|----------|-------------|
| `NEXT_PUBLIC_BASE_PATH` | `/shoot` |
| `NEXT_PUBLIC_LANDING_URL` | `https://www.hoopchallenges.com` |
| `NEXT_PUBLIC_SITE_URL` | Production shoot URL |
| `AIRTABLE_API_TOKEN` / `AIRTABLE_BASE_ID` | Server-only; production base |
| `SITE_ACCESS_TOKEN` | Optional preview gate |

Source: [`docs/PROJECT_STATE.md`](../PROJECT_STATE.md), [`docs/deployment-notes.md`](../deployment-notes.md).

## Certification checks

| Check | Result | Notes |
|-------|--------|-------|
| Latest production READY | **PASS** | `dpl_82w6aASdkbKoVNXyRao7imFFxL7L` |
| Commit = master tip | **PASS** | `267d473` |
| Domains present | **PASS** (project domains listed) | Team aliases may also exist |
| Public `/shoot` HTML smoke this session | **BLOCKED** | Requires Mike/browser after cert branch merge |
| `GET /shoot/api/airtable` this session | **BLOCKED** | Requires Mike or authenticated fetch; expect `{ ok: true, airtable: { tokenValid: true } }` |

## Pending after this branch

Certification branch ports PR #33 web fixes under `web/`. After Mike merges to `master`:

1. Confirm new Vercel production deployment READY.  
2. Confirm production commit SHA matches new master tip.  
3. Run public smoke (see [LIVE-SMOKE-EVIDENCE.md](./LIVE-SMOKE-EVIDENCE.md) W23–W24).

## Explicit non-actions

- No production redeploy from agents without Mike approval.  
- Do not remove `robots: noindex` / Softr cutover without Mike approval.  
- Do not print or commit env secret values.