# SC-111 Public Athlete Profiles — Implementation Evidence

**Date:** 2026-08-04  
**Branch:** `feature/sc-111-public-athlete-profiles`  
**Package:** Public `/shoot/athletes/[slug]` profiles + sitewide name links  
**Airtable base:** PROD `appn84sqPw03zEbTT`

---

## Summary

Live Airtable-backed public athlete profiles replace the previous demo/mock profile adapter. Profiles resolve by `Public Profile Slug` only when `Public Profile Enabled` and `Active?` are true. Disabled/unknown/duplicate slugs fail closed via the segment not-found UI (no existence leak). Athlete names on standings surfaces link when a valid public slug is present.

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

## Verification

| Check | Result |
|-------|--------|
| `npm run typecheck` | PASS |
| `npm test` (Vitest) | PASS — 152 tests |
| `npm run lint` | PASS |
| `npm run build` | PASS |
| Playwright `athlete-profile.spec.ts` + `public-experience.spec.ts` | PASS — 50 passed, 3 skipped (surfaces without Schmidt in top slice) |
| Live slug `testing-schmidt` | Loads hero + sections against PROD |
| Privacy HTML | No emails / no `rec…` IDs in profile HTML |
| Screenshots | `docs/testing/evidence/athlete-profiles-2026-08-04/` |

### Screenshots reviewed

- `profile-phone.png` — hero + primary shots hierarchy; empty states honest  
- `profile-desktop.png` — editorial two-column activity/weeks; scoreboard empty state (no fake 0%)  
- `profile-not-found.png` — clear unavailable copy + back to standings  

---

## Known limitations

1. `Web - Leaderboard` view is missing in PROD (`VIEW_NAME_NOT_FOUND`); app falls back to `AND({Active?}, {Lifetime XP Total} >= 0)` — pre-existing.
2. Related history depends on Enrollment link arrays; empty links → empty activity/week/achievement sections (honest empty states).
3. Document HTTP status for dynamic `notFound()` with `loading.tsx` may be 200 while UI shows not-found (Next streaming) — tests assert content.
4. Not Installed on Vercel until Mike deploys this branch.

---

## Live production testing steps (Mike)

1. Deploy `web/` from this branch to Vercel.
2. Open `https://www.fairfieldbasketballclub.com/shoot/athletes/testing-schmidt`.
3. Confirm standings name links to the profile.
4. Confirm a disabled/cleared slug returns not-found.
5. Create a second enrollment with the same enabled slug once → expect not-found + fix in Airtable.
6. Optional: recreate `Web - Leaderboard` view in Airtable (OMNI) to restore preferred sorting view.
