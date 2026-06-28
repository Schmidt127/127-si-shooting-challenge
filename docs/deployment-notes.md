# Deployment — Shooting Challenge

| Setting | Value |
|---------|--------|
| Repo | `127-si-shooting-challenge` |
| Root Directory | `web` |
| `NEXT_PUBLIC_BASE_PATH` | `/shoot` |
| `AIRTABLE_BASE_ID` | `appn84sqPw03zEbTT` |
| `NEXT_PUBLIC_LANDING_URL` | `https://www.hoopchallenges.com` |

## Local dev

```powershell
cd web
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
