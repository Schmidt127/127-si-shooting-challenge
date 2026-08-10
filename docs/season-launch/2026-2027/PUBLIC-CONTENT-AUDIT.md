# Public content & environment audit — `/shoot`

**Date:** 2026-08-10  
**Deployment evidence:** Playwright prod smoke **41/41 PASS** (2026-08-04) · `npm run test:smoke:prod`

## Environment variables

| Variable | Expected | Repo status | Action |
|----------|----------|-------------|--------|
| `NEXT_PUBLIC_BASE_PATH` | `/shoot` | Set in `.env.local.example` | **OK** |
| `NEXT_PUBLIC_LANDING_URL` | `https://www.fairfieldbasketballclub.com` | Set | **OK** |
| `NEXT_PUBLIC_SITE_URL` | `https://www.fairfieldbasketballclub.com/shoot` | Set | **OK** |
| `NEXT_PUBLIC_GAME_MANUAL_URL` | Adobe PDF URL for 2026–27 manual | **Empty** | **Mike:** set on Vercel (D10) |
| `AIRTABLE_BASE_ID` | `appn84sqPw03zEbTT` (prod) | Documented | **OK** |
| `AIRTABLE_ACTIVE_SCHOOL_YEAR` | `2026-2027` at launch | Commented in `.env.example` | **Set on Vercel** before season flip |

## Routes audited

| Route | Status | Notes |
|-------|--------|-------|
| `/shoot` | PASS smoke | Home loads |
| `/shoot/leaderboard` | PASS | Uses Airtable views; optional `AIRTABLE_ACTIVE_SCHOOL_YEAR` filter in `queries.ts` |
| `/shoot/levels` | PASS | Enrollment-year scoped |
| `/shoot/achievements` | PASS | Public achievements from views |
| `/shoot/game-manual` | **Partial** | Page loads; PDF embed empty without env URL |
| `/shoot/tutorials` etc. | PASS | Publish gate field (may still be Softr-named — SC-144) |

## Content freshness

| Item | Status | Action |
|------|--------|--------|
| Legacy `hoopchallenges.com` links | **Hardened** | Tests assert no hoopchallenges in public HTML |
| Week curriculum on web | N/A | Homework content from Airtable catalogs — PHA restored 2026-08-08 |
| Season label on leaderboard | Dynamic | Driven by enrollment data / env year filter |
| Stable image URLs | **Verify** | Tutorial/shoutout cover images — spot-check after deploy |
| Grade / School Year display | Dynamic | No hard-coded 2025–26 in production query code |
| Registration links | **Stale risk** | Point to Fillout — form OFF; update when F-ATT-01 known |

## Safe corrections committed (this branch)

1. `web/.env.local.example` — document `AIRTABLE_ACTIVE_SCHOOL_YEAR=2026-2027` for local season testing
2. Season package + validators under `docs/challenge-year/generated/2026-2027/`

## Production-only (not done by agent)

1. Set `AIRTABLE_ACTIVE_SCHOOL_YEAR=2026-2027` on Vercel Production
2. Set `NEXT_PUBLIC_GAME_MANUAL_URL` when PDF ready
3. Re-run `npm run test:smoke:prod` after env change
4. W-ATT-01…03 attestations per [`WEB-SEASON-ACTIVATION.md`](../../challenge-year/WEB-SEASON-ACTIVATION.md)

## CI / build

| Check | Result (master line) |
|-------|---------------------|
| `web` CI workflow | Configured on `web/**` changes |
| Vitest | 137/137 historical PASS |
| Typecheck/lint | Per CI |

## Registration URL placeholder

Until F-ATT-01 is recorded, public site should not advertise a dead Fillout link. Verify landing CTAs in club site repo separately.
