# FUT-025 — Athlete profile indexing cutover (2026-09-04)

**Master list:** FUT-025  
**Agent:** Agent 2 — Profile Indexing  
**Status:** Production cutover **ENABLED** and verified; docs/tests PR for coordinator merge

## Authorization

Mike authorized enabling `NEXT_PUBLIC_ATHLETE_PROFILE_INDEXING=true` on Production for this wave.

## Production env change

| Variable | Environment | Value | Result |
|---|---|---|---|
| `NEXT_PUBLIC_ALLOW_SEARCH_INDEXING` | Production | `true` | Already set (SC-115) |
| `NEXT_PUBLIC_ATHLETE_PROFILE_INDEXING` | Production | `true` | **Added** 2026-09-04 via Vercel CLI |

## Production redeploy

| Field | Value |
|---|---|
| Prior READY | `dpl_4epsJG1hYnuQnBXFQsZpRGQnb14H` |
| Cutover redeploy | `dpl_4tbg25UzYPFruga1PzQthewWswNP` |
| State | READY |
| Target | production |
| Commit SHA | `8e662a38ab3d12a726dd7599ccdac4077db0e015` |
| Inspect | https://vercel.com/127-sports-intensity/127-si-shooting-challenge/4tbg25UzYPFruga1PzQthewWswNP |

Rebuild required so the `NEXT_PUBLIC_*` flag is baked into the client/server bundle.

## Verification matrix

| Check | Expected | Result |
|---|---|---|
| Public profile (`/athletes/athlete1-schmidt`) robots | `index, follow` when Public Profile Enabled + slug | **PASS** — single robots meta `index, follow` |
| Public profile canonical | `https://www.fairfieldbasketballclub.com/shoot/athletes/<slug>` | **PASS** |
| Meta description privacy | No grade / school / email / enrollment `rec*` in `<head>` | **PASS** |
| Missing slug / 404 shell | Must not advertise indexability | **PASS** (live 404 still gets `noindex` from `not-found.tsx`; PR also hardens `found:false` metadata) |
| Family Dashboard / sign-in / select | `noindex` | **PASS** |
| Admin / public-display | `noindex` | **PASS** |
| `robots.txt` | No `Disallow: /shoot/athletes/` when cutover on | **PASS** |
| `robots.txt` private disallow | Still disallows `/dashboard`, `/admin`, `/api/`, `/public-display` | **PASS** |
| `sitemap.xml` | Still **no** `/shoot/athletes/` URLs | **PASS** (`athlete_url_count=0`) |

Evidence JSON: [`docs/testing/evidence/fut-025-indexing-cutover-20260904.json`](../testing/evidence/fut-025-indexing-cutover-20260904.json)

## Code / test updates in this PR

- `buildAthleteProfilePageMetadata`: `found: false` always uses `PRIVATE_ROBOTS_NOINDEX` (even when cutover flags are true).
- Regression coverage extended for gate on/off, fail-closed robots disallow, and Playwright cutover awareness (`search-indexing.spec.ts`).
- Smoke slug for production indexing checks updated to live public slug `athlete1-schmidt`.

## Unit tests

```text
vitest run lib/seo/athlete-profile-metadata.test.ts lib/seo/metadata.test.ts
→ 2 files, 39 tests passed
```

## Remaining risks

1. **Not-found hardening** in this PR is not yet on Production until the PR merges and Production redeploys. Live cutover already works for found public profiles; 404 shells already receive `noindex` from `app/not-found.tsx`.
2. Public homework catalog links in profile HTML may include Airtable `rec*` IDs for **published** homework rows (same IDs already eligible for sitemap). Enrollment / private record IDs are not present in `<head>` meta/canonical.
3. Rollback: remove or set `NEXT_PUBLIC_ATHLETE_PROFILE_INDEXING=false` on Vercel Production and redeploy.

## Out of scope (Agent 3)

Did not touch structured-data helpers, PR #310 disposition, catalog title/OG changes, or `web/docs/seo-audit-report-*`.
