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

`GET /shoot/api/airtable` → `{ ok: true }`
