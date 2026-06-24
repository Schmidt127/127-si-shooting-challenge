# Deployment Notes

## Vercel setup

1. Import the GitHub repo in Vercel
2. Set **Root Directory** to `web`
3. Framework preset: **Next.js** (auto-detected)
4. Add environment variables (Production + Preview):

| Variable | Value |
|----------|-------|
| `AIRTABLE_API_TOKEN` | Personal access token with `data.records:read` |
| `AIRTABLE_BASE_ID` | `appn84sqPw03zEbTT` (confirm in Airtable URL) |
| `NEXT_PUBLIC_SITE_URL` | `https://your-project.vercel.app` |
| `SITE_ACCESS_TOKEN` | Optional random string for preview-only gate |

5. Deploy from `master` branch

## Pipeline verification checklist

- [ ] Homepage shows three-line dev message
- [ ] `GET /api/airtable` returns `{ ok: true, airtable: { configured: true } }`
- [ ] Placeholder routes load (`/leaderboard`, `/levels`, etc.)
- [ ] No Airtable token in browser Network tab

## Custom domain (later)

- Point subdomain (e.g. `challenge.127sports.com`) to Vercel
- Update `NEXT_PUBLIC_SITE_URL`
- Enable HTTPS (automatic on Vercel)

## Preview vs production

| Environment | robots | Auth |
|-------------|--------|------|
| Preview | noindex | optional `SITE_ACCESS_TOKEN` middleware |
| Production (pre-launch) | noindex | optional site gate |
| Production (post-launch) | index public routes | participant auth on dashboard |

## Monorepo note

Only `web/` deploys to Vercel. Airtable scripts in the parent repo are not part of the Next.js build.

## Rollback

- Vercel instant rollback to previous deployment
- Softr remains live until DNS cutover (Phase 6)

## Airtable token hygiene

- Use a dedicated token for the website (not personal admin token if avoidable)
- Rotate token if leaked
- Scope: read-only for Phase 1–2
