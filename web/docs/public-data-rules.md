# Public Data Rules

Rules for what the website may show on **unauthenticated** pages (leaderboard, public display, public athlete profiles).

## Always allowed (if publish flags pass)

- Athlete display name (first name + last initial or configured display name)
- School, grade, gender (if already shown on Softr today)
- Total XP, current level, level badge art
- Streak counts (shooting streak, not private details)
- Achievement names and icons marked OK to publish
- Homework / video **completion status** (e.g. "Reviewed", "Awarded") — not file URLs unless already public
- Week labels and season name

## Never expose on public routes

- Parent / guardian email or phone
- Full home addresses
- Internal record IDs in UI (URLs may use opaque slugs)
- `XP Reason Debug`, automation debug fields, Source Key internals
- Unpublished coach notes on video feedback
- Other athletes' detailed submission stats unless leaderboard-aggregated

## Auth-required (participant dashboard)

- Own submission history detail
- Own homework file links
- Own video feedback links
- Weekly summary email content equivalents

## Staff-only (admin phase)

- Cross-athlete review queues
- Publish toggles
- PII for support

## Caching

- Public leaderboard: ISR 60–300 seconds
- Levels / achievements catalog: ISR 3600 seconds or on-demand revalidate
- Do not cache per-user dashboard data at CDN without private cache headers

## Parity with Softr

Before cutover, diff each Softr page against the new route and confirm the same columns appear. Document exceptions in this file.

## Compliance

- Youth program: minimize data collection on public pages
- Prefer aggregate leaderboard over exposing attempt-by-attempt detail for minors
