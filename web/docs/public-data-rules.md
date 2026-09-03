# Public Data Rules

Rules for what the website may show on **unauthenticated** pages (leaderboard, public display, public athlete profiles).

## Registration publication consent

Registration includes agreement to publish the participant's game-related
information on public Shooting Challenge pages. A separate per-player public
profile consent checkbox is not required for game-related information.

This agreement does not authorize publication of operational or private data.
Birthday, exact age, contact information, guardian information, addresses,
internal notes, administrative fields, debug fields, and Airtable record IDs
remain excluded from public routes.

## Public game-related information

The following may be shown for a registered participant:

- Full first and last name
- School, grade band, division, team, city, and active season
- Approved profile photo
- Total XP, current level, level badge art
- Shooting totals, makes, percentages, and streak counts
- Daily and session bests
- Public game/session history and recent performance trends
- Achievement names and icons marked OK to publish
- Homework / video **completion status** (e.g. "Reviewed", "Awarded") — not file URLs, coach feedback, or submission assets
- Week labels and season name

## Never expose on public routes

- Never expose parent / guardian email or phone
- Full home addresses / ZIP
- Internal record IDs in UI or public URLs (use a stable public profile slug)
- `XP Reason Debug`, automation debug fields, Source Key internals
- Coach feedback / coach notes on homework or video feedback
- Homework or video submission file URLs (including Lambda reviewer links with tokens)
- Other athletes' detailed submission stats unless leaderboard-aggregated

Public profiles (`/players/[publicPlayerId]`) may show approved enrollment
shooting totals, streaks, daily/session results, public game history, weekly
summaries, and visible achievement unlocks — never contact, payment, guardian,
address, birthday, or administrative fields.

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

- Youth program: publish only game-related information covered by registration
  agreement; never publish birthday or operational/private data
- Public game/session history must use the approved allowlist and eligibility
  rules; do not serialize Airtable record IDs
