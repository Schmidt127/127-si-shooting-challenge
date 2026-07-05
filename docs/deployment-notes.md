# Deployment — Shooting Challenge

| Setting | Value |
|---------|--------|
| Repo | `127-si-shooting-challenge` |
| Root Directory | `web` |
| `NEXT_PUBLIC_BASE_PATH` | `/shoot` |
| `AIRTABLE_BASE_ID` (Vercel **production only**) | `appn84sqPw03zEbTT` |
| `NEXT_PUBLIC_LANDING_URL` | `https://www.hoopchallenges.com` |

## Airtable environments (V2-015)

| Environment | Base ID | Where configured |
|-------------|---------|------------------|
| **Production** | `appn84sqPw03zEbTT` | Vercel, live Make, Fillout |
| **Development** | `appTetnuCZlCZdTCT` | Local `web/.env.local`, `tools/airtable/.env` |

**Never** set the dev base ID on Vercel production. Setup: [development-base-setup.md](./development-base-setup.md).

**Automation deploy:** GitHub → paste **dev** → audit → Mike approves → paste **prod** → `CHANGELOG.md`.

## Local dev

```powershell
cd web
copy .env.local.example .env.local
# Edit .env.local — use dev AIRTABLE_BASE_ID for safe local reads (optional)
npm run dev
```

Open http://localhost:3001/shoot

## Health check

`GET /shoot/api/airtable` → `{ ok: true, airtable: { tokenValid: true } }`

If `tokenValid` is `false`, the PAT is missing or rejected (pages will load but show “Invalid authentication token”). Create a token at [airtable.com/create/tokens](https://airtable.com/create/tokens) with **`data.records:read`** on base `appn84sqPw03zEbTT`, paste into Vercel **without quotes**, then **Redeploy**.

## Root URL (`/`)

The app uses `basePath` `/shoot`, so it does **not** serve a page at `https://www.hoopchallenges.com/` by itself.

| Situation | Fix |
|-----------|-----|
| Domain on **this** Vercel project | `web/vercel.json` redirects `/` → `/shoot` |
| Domain on a **landing** Vercel project | Deploy `hoopchallenges-landing` with a home page, or add the same redirect there |

Until a multi-program landing hub exists, `/` → `/shoot` is the expected behavior.
