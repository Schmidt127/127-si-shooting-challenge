# Agent 6 — Mike Actions (Website / Public Experience)

Overnight 2026-07-23 · See also consolidated `docs/overnight/MIKE-ACTIONS-TOMORROW.md`

## Urgent / blocking (web)

1. Authorize `npm install` (+ `npx playwright install chromium`) in `web/` so typecheck, build, and Playwright can run.
2. Spot-check a Vercel deploy (or local after install) of `/shoot/game-manual`, `/shoot/leaderboard`, `/shoot/athletes/schmidt` against rebuilt PROD.

## Product decisions (do not implement until decided)

| ID | Decision | Recommendation |
|----|----------|----------------|
| SC-112 | Athlete auth approach | Parent magic-link email (Option A); shared family code (B) OK interim |
| SC-114 | Softr cutover timing | Soft cutover after Softr inventory + catalog spot-check; keep Softr alive |
| SC-115 | Remove sitewide noindex? | Keep noindex until real season content + soft cutover |
| SC-144 | Rename Softr-named publish/sort fields | Coordinate schema + web query rename in one wave |

## Quick Airtable / ops (web-related)

1. Export Softr page inventory into `docs/deploy-checklists/SOFTR-CUTOVER-READINESS.md`.
2. Confirm Vercel env: `AIRTABLE_BASE_ID=appn84sqPw03zEbTT`, PAT read-only, `NEXT_PUBLIC_SITE_URL` correct before any indexing flip.
3. Do **not** add a Schmidt exclusion filter on `Web - Leaderboard` yet (overnight direction: Schmidt remains visible).

## Later / deferred

- Staff auth for `/admin` diagnostics (separate from athlete auth).
- Presentation-field wiring (SC-054 / SC-117) after schema exists.
- Shot Milestones public catalog surface (needs public view/contract).
- Pre-season parent comms from rules (SC-133) after game-manual editorial approval.
