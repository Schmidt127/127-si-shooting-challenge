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
| `JR_REF_AIRTABLE_BASE_ID` | Base ID for **127SI - JR REF** (JR Referee Clinics) |
| `NEXT_PUBLIC_SITE_URL` | `https://hoopchallenges.com` |
| `SITE_ACCESS_TOKEN` | Optional random string for preview-only gate |

5. Deploy from `master` branch

## Pipeline verification checklist

- [ ] Homepage shows three-line dev message
- [ ] `GET /api/airtable` returns `{ ok: true }` (Shooting Challenge base)
- [ ] `GET /api/jr-ref/airtable` returns `{ ok: true }` when JR REF base ID is set
- [ ] Placeholder routes load (`/leaderboard`, `/levels`, etc.)
- [ ] No Airtable token in browser Network tab

## Custom domain — hoopchallenges.com

1. In **Vercel** → your project → **Settings** → **Domains**
2. Add `hoopchallenges.com` and `www.hoopchallenges.com`
3. At your domain registrar (where you bought the name), add the DNS records Vercel shows you — usually:
   - **A record** `@` → `76.76.21.21` (Vercel’s IP), or
   - **CNAME** `www` → `cname.vercel-dns.com`
4. Wait for DNS to propagate (minutes to a few hours)
5. Set `NEXT_PUBLIC_SITE_URL` to `https://hoopchallenges.com` in Vercel env vars and redeploy
6. HTTPS is automatic on Vercel once DNS is verified

**Live URLs after cutover:**

- Homepage: `https://hoopchallenges.com`
- Leaderboard: `https://hoopchallenges.com/leaderboard`
- Health check: `https://hoopchallenges.com/api/airtable`

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
