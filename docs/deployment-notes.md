# Deployment — Shooting Challenge

| Setting | Value |
|---------|--------|
| Repo | `127-si-shooting-challenge` |
| Production commit (verify) | `git rev-parse origin/master` — documented in [PROJECT_STATE.md](./PROJECT_STATE.md) |
| Root Directory | `web` |
| Public URL | https://www.hoopchallenges.com/shoot |
| `NEXT_PUBLIC_BASE_PATH` | `/shoot` |
| `AIRTABLE_BASE_ID` (Vercel **production only**) | `appn84sqPw03zEbTT` |
| `NEXT_PUBLIC_LANDING_URL` | `https://www.hoopchallenges.com` |
| `NEXT_PUBLIC_SITE_URL` | `https://www.hoopchallenges.com/shoot` |

## Airtable environments (V2-015)

| Environment | Base ID | Where configured |
|-------------|---------|------------------|
| **Production** | `appn84sqPw03zEbTT` | Vercel, live Make, Fillout (form currently OFF) |
| **Development** | `appTetnuCZlCZdTCT` | Local `web/.env.local`, `tools/airtable/.env` |

**Never** set the dev base ID on Vercel production. Setup: [development-base-setup.md](./development-base-setup.md).

**Automation deploy:** GitHub → paste **dev** → audit → Mike approves → paste **prod** → `CHANGELOG.md`.

## Environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `AIRTABLE_API_TOKEN` | Yes (server) | PAT with `data.records:read` on the target base. Never expose to the browser. |
| `AIRTABLE_BASE_ID` | Yes (server) | Production on Vercel; DEV optional locally |
| `NEXT_PUBLIC_BASE_PATH` | Yes | Always `/shoot` |
| `NEXT_PUBLIC_LANDING_URL` | Yes | Landing hub URL |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Canonical site URL for metadata |
| `NEXT_PUBLIC_GAME_MANUAL_URL` | Optional | Embed URL for `/shoot/game-manual` |
| `SITE_ACCESS_TOKEN` | Optional | When set, gates middleware + `/api/airtable` health |

Template: [`web/.env.local.example`](../web/.env.local.example)

## Local dev

```powershell
cd web
copy .env.local.example .env.local
# Edit .env.local — use DEV AIRTABLE_BASE_ID for safe local reads (optional)
npm run dev
```

Open http://localhost:3001/shoot

## Health check

`GET /shoot/api/airtable` → `{ ok: true, airtable: { tokenValid: true } }`

If `tokenValid` is `false`, the PAT is missing or rejected (pages will load but show “Invalid authentication token”). Create a token at [airtable.com/create/tokens](https://airtable.com/create/tokens) with **`data.records:read`** on base `appn84sqPw03zEbTT`, paste into Vercel **without quotes**, then **Redeploy**.

When `SITE_ACCESS_TOKEN` is set, include `Authorization: Bearer <token>` or `?site_access_token=<token>`.

## Validation before promote

From `web/`:

```powershell
npm test
npm run typecheck
npm run lint
npm run build
```

## Root URL (`/`)

The app uses `basePath` `/shoot`, so it does **not** serve a page at `https://www.hoopchallenges.com/` by itself.

| Situation | Fix |
|-----------|-----|
| Domain on **this** Vercel project | `web/vercel.json` redirects `/` → `/shoot` |
| Domain on a **landing** Vercel project | Deploy `hoopchallenges-landing` with a home page, or add the same redirect there |

Until a multi-program landing hub exists, `/` → `/shoot` is the expected behavior for this project alone.

## Softr / SEO

Sitewide `noindex` remains until cutover approval. Do **not** change robots metadata without Mike approval. See [SOFTR-CUTOVER-READINESS.md](./deploy-checklists/SOFTR-CUTOVER-READINESS.md).
