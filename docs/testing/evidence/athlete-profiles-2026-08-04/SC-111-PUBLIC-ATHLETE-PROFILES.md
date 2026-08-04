# SC-111 Public Athlete Profiles — Implementation Evidence

**Date:** 2026-08-04  
**Status:** Live Tested in PROD  
**PR:** [#58](https://github.com/Schmidt127/127-si-shooting-challenge/pull/58)  
**Merge commit:** `ce7723a2e219f63539ba3db0685ecd20bc5d28e2`  
**Feature commit:** `c3bf17d6503e54dd3fbd07a7a816c840ff8f2b5c`  
**Vercel production deployment:** `dpl_wakFzRMAX2HJAyzX8eBoPxquVXEj` (READY, target=production, ref=master)  
**Live profile URL:** https://www.fairfieldbasketballclub.com/shoot/athletes/testing-schmidt  
**Airtable base:** PROD `appn84sqPw03zEbTT`

---

## Summary

Live Airtable-backed public athlete profiles replace the previous demo/mock profile adapter. Profiles resolve by `Public Profile Slug` only when `Public Profile Enabled` and `Active?` are true. Disabled/unknown/duplicate slugs fail closed via the segment not-found UI (no existence leak). Athlete names on standings surfaces link when a valid public slug is present.

Published to production via PR #58 → master → Vercel production READY, then live-verified.

---

## Airtable schema (PROD)

Created (fields were missing at task start; Mike’s package named them):

| Field | Type | Notes |
|-------|------|-------|
| `Public Profile Enabled` | checkbox | Must be checked for public route |
| `Public Profile Slug` | singleLineText | Exact slug in URL; unique among enabled rows |

**Schmidt seed:** Enrollment `Testing Schmidt` → Enabled + slug `testing-schmidt` + `Active?=true`.

### Duplicate slug correction (operators)

If two Active enrollments share the same enabled slug:

1. Website logs a server-side error (no PII) and returns not-found for that slug.
2. In Airtable, clear or rename one slug, or uncheck `Public Profile Enabled` on the incorrect enrollment.
3. Do not auto-rewrite records from the website.

---

## Public field allowlist (enrollment)

Consumed by `PUBLIC_PROFILE_ENROLLMENT_FIELDS` in `web/lib/airtable/queries.ts`:

Identity / publish: Full Athlete Name, School Name Lookup, Grade, School Year, Athlete Headshot, Public Profile Enabled, Public Profile Slug, Active?, Program Instance Name Only  

Progress: Current Level - Public Facing Display, Level Sort Order - For Softr, Lifetime XP Total, XP Progress in Current Level, XP Needed for Next Level, Current/Next Level XP Required, Next Level  

Shooting: Total Shots Counted, Total Makes Submitted, Overall FG Attempted/Made/%, Total 2PT/3PT/FT Attempted/Made, Overall 2PT/3PT/FT %  

Streak / goal / gate public: Total Submissions, Current Shooting Streak (+ As Of, Status), Longest Streak Days, Target Goal Shots, Goal Met?, Public Progression Status, Public Gate Missing Reason, Public Missing *  

Server-only links (IDs never sent to browser): Submissions, Weekly Athlete Summary, Athlete Achievement Unlocks, XP Events  

### Private exclusions (never fetched for profile UI)

Athlete/Parent emails, phones, addresses, ZIP, Stripe/payment, welcome email HTML, Gate Debug Summary, Source Keys / XP Dedupe Keys, automation errors/statuses, coach notes, attachment URLs except Athlete Headshot, Google Drive fields, homework/video uploads.

---

## Route behavior

| Case | Behavior |
|------|----------|
| Enabled + Active + unique slug | `/shoot/athletes/{slug}` renders profile |
| Missing / disabled / inactive | Segment `not-found` UI |
| Duplicate enabled slug | Server log + not-found |
| Metadata | Name, school, public stats description; `noindex` preserved |

---

## Sitewide link audit

`AthleteProfileLink` wired on:

- Homepage top standings (`home-page-view.tsx`)
- Leaderboard podium + table (`leaderboard-podium.tsx`, `leaderboard-table.tsx`)
- Public display cards (`public-display-view.tsx`)

Plain text when `publicProfileSlug` is null. Focus ring + underline hover. Row containers are not wrapped as links.

---

## Files changed (high level)

- `web/types/public-athlete-profile.ts`, `web/types/leaderboard.ts`
- `web/lib/data/public-athlete-profile.ts`, `athlete-profile.ts`, `leaderboard.ts`, `airtable-values.ts`
- `web/lib/airtable/queries.ts`
- `web/components/athlete/*` (hero, snapshot, shooting, progression, streak, activity, weekly, achievements, link, view)
- `web/app/(program)/athletes/[slug]/{page,not-found}.tsx`
- Leaderboard / home / public-display wiring
- `web/tests/athlete-profile.spec.ts` + updates to `public-experience.spec.ts`, smoke helper
- Docs: this evidence file; `web/docs/airtable-data-map.md`; completion master SC-111

---

## Verification (pre-merge / local)

| Check | Result |
|-------|--------|
| `npm run typecheck` | PASS |
| `npm test` (Vitest) | PASS — 152 tests |
| `npm run lint` | PASS |
| `npm run build` | PASS |
| Playwright `athlete-profile.spec.ts` + `public-experience.spec.ts` | PASS — 51 passed, 2 skipped locally |

### Screenshots reviewed (local)

- `profile-phone.png` — hero + primary shots hierarchy; empty states honest  
- `profile-desktop.png` — editorial two-column activity/weeks; scoreboard empty state (no fake 0%)  
- `profile-not-found.png` — clear unavailable copy + back to standings  

---

## Production publish + live test (2026-08-04)

| Item | Value |
|------|-------|
| PR | #58 merged into `master` |
| Merge SHA | `ce7723a2e219f63539ba3db0685ecd20bc5d28e2` |
| Vercel deployment ID | `dpl_wakFzRMAX2HJAyzX8eBoPxquVXEj` |
| Deploy target | production |
| Deploy state | READY |
| Git ref / SHA | `master` / `ce7723a2e219f63539ba3db0685ecd20bc5d28e2` |
| Live URL | https://www.fairfieldbasketballclub.com/shoot/athletes/testing-schmidt |

### Live checks

| Check | Result |
|-------|--------|
| Playwright `athlete-profile.spec.ts` vs PROD | **7 passed, 2 skipped** (homepage/public-display top-slice without Schmidt may skip) |
| Profile loads Testing Schmidt + approved metrics | PASS |
| Homepage HTML contains `/athletes/testing-schmidt` | PASS |
| Leaderboard HTML contains `/athletes/testing-schmidt` | PASS |
| Public-display HTML contains `/athletes/testing-schmidt` | PASS |
| Unknown slug shows not-found / unavailable UI | PASS |
| No Airtable `rec…` IDs in profile HTML | PASS |
| `noindex` retained on profile | PASS |
| Mobile overflow (Playwright) | PASS |
| Desktop hero + snapshot (Playwright) | PASS |

Completion master advanced: **Installed in PROD** (Vercel READY) → **Live Tested in PROD** (same-day live checks).

---

## Known limitations

1. `Web - Leaderboard` view is missing in PROD (`VIEW_NAME_NOT_FOUND`); app falls back to `AND({Active?}, {Lifetime XP Total} >= 0)` — pre-existing; not blocking.
2. Related history depends on Enrollment link arrays; empty links → empty activity/week/achievement sections (honest empty states).
3. Document HTTP status for dynamic `notFound()` with `loading.tsx` may be 200 while UI shows not-found (Next streaming) — tests assert content.
4. Homepage / public-display Playwright link assertions may skip when Schmidt is outside the rendered top slice; HTML link presence was confirmed separately on PROD.
