# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary audience: athletes and parents using the Shooting Challenge together.

- **Athletes** (enrolled kids/teens): should feel motivated, competitive, and proud of their progress — XP, levels, streaks, achievements, leaderboards, homework, and improvement.
- **Parents**: should quickly understand progress, requirements, upcoming work, and what needs attention — without the interface feeling like an administrative dashboard.

Secondary audiences that must still find the experience clear and credible: coaches and schools. Staff/admin tools exist but are not the primary `/shoot` job.

## Product Purpose

**127 SI Shooting Challenge** is a competitive skill-development program for Fairfield Basketball Club / 127 Sports Intensity: homework, leaderboards, levels, achievements, XP, streaks, milestones, tutorials, Zoom meetings, and related catalogs.

Success means families can see where the athlete stands, what to do next, and what they have earned — on a site that feels like a premium youth sports product, not generic SaaS.

Public site: `https://www.fairfieldbasketballclub.com/shoot` (`basePath` `/shoot`). Official club landing: `https://www.fairfieldbasketballclub.com`.

## Positioning

A gamified shooting homework program with Airtable as the system of record for XP, progression, streaks, milestones, and Perfect Week — plus a Next.js participant site that presents that truth. Neighboring club apps (JR Ref, Team Shot Tracker, rankings, landing) are separate products; this repo is Shooting Challenge only.

## Confirmed Design Direction

- **Athlete-forward:** Make competition, visible progress, earned accomplishments, and the next training action the first visual read. Parent clarity supports that athlete-centered experience; it must not turn the product into an administrative dashboard.
- **Public and family-readable:** Shared public surfaces should make sense to athletes and families together. Prefer a single, clear progress story over separate athlete-versus-parent visual modes unless a future approved product requirement introduces distinct permissions or jobs.
- **Professional sports craft:** The interface should feel authored for a serious youth basketball program: confident, energetic, concise, and credible to parents, coaches, and schools. It must never become childish, generic SaaS, or a promotional landing-page imitation.

## Operating Context

- Families often use phones; design must be mobile-first.
- Weekly email, Zoom recording credit, video submissions, and Airtable automations are part of the real operating loop (backend/Make/Airtable — not reimplemented in the website).
- Local web: `http://localhost:3001/shoot` (`npm run dev` in `web/`, port 3001).
- Vercel root directory: `web`. Production branch: `master`.

## Capabilities and Constraints

### Confirmed product surfaces (web)

Live participant catalogs and program pages under `/shoot` (overview, leaderboard, homework, tutorials, shoutouts, articles, Zoom meetings, levels, achievements, game manual, public display). Dashboard and athlete profile routes exist but are demo / not cutover-ready until auth. Admin is a placeholder.

### Data and calculation rules

- Airtable remains the canonical data source.
- Do not recreate XP, progression, streak, milestone, or Perfect Week calculations in the website.
- Web Airtable reads are server-side only; never expose `AIRTABLE_API_TOKEN` to the browser.
- Preserve existing working routes, Airtable integrations, privacy boundaries, tests, and production behavior across visual redesigns.

### Privacy boundaries (public athlete pages)

May show approved Shooting Challenge information such as: name, school, grade, shots, XP, levels, streaks, achievements, milestones, weekly progress, and recent submission activity.

Must never expose: email addresses, phone numbers, addresses, payment information, private feedback, uploaded files, internal Airtable IDs, automation details, or administrative fields.

### UI stack constraint

Use shadcn/ui as accessible foundations, but heavily customize composition so it does not resemble a default shadcn template.

### Out of scope for this product record

Hoop landing, JR Ref, Team Shot Tracker, Dribbling, Brackets, Rankings — separate repos/products.

## Brand Commitments

- Parent organization: **127 Sports Intensity**; public club face: **Fairfield Basketball Club**.
- App name: **127 SI Shooting Challenge**.
- Established palette: 127 SI blue, orange, white, and dark-neutral (`BRAND_STANDARDS.md`: brand blue `#0034B7`, brand orange `#FF8B00`, charcoal, light/medium gray, white).
- Shared typography commitments: Magistral (when licensed) for major branded headings; Maven Pro for UI; approved substitutions only per brand standards.
- Logo assets in-repo (e.g. `web/public/brand/`); do not invent remote logo URLs or distort logos.
- Primarily light theme; no full dark theme unless Mike explicitly approves.
- Use the established blue-and-orange system as the visual anchor. Add complementary colors only when a semantic state, accessibility need, or intentional basketball-program emphasis requires them; keep those additions restrained, harmonious with the palette, and subordinate to blue and orange.
- Use the established font system first. A complementary typeface is acceptable only when it has a clear functional role the existing fonts cannot serve (for example, highly legible numeric data), preserves the sports-program character, and does not compete with Maven Pro or licensed Magistral display headings.
- Experience should feel like a **premium youth sports product**, not a generic SaaS dashboard.
- Prefer strong sports typography, scoreboard-inspired data presentation, deliberate hierarchy, restrained basketball motifs, and compact information density.
- Avoid AI slop and template-led composition. Each visual element must clarify a real program action, metric, or hierarchy; do not add decoration merely to make a screen feel “designed.”
- Avoid excessive rounded-card grids, pills, gradients, glass effects, decorative blobs, floating dashboard widgets, repeated icon-stat tiles, generic “feature” layouts, stock-SaaS patterns, and other generic AI-generated treatments.
- Athlete progress, competition, accomplishments, and improvement should be visually prominent.
- Exciting for athletes; clear and credible for parents, coaches, and schools.
- Canonical shared brand source: `Schmidt127/hoopchallenges-landing` `BRAND_STANDARDS.md`; leaf copy in this repo must stay synchronized through approved updates. App-specific accents live in `APP_CONTEXT.md`.

## Evidence on Hand

- Brand standards: `BRAND_STANDARDS.md`, `APP_CONTEXT.md`
- Logo files: `web/public/brand/logo-circle-blue-orange.png`, `web/public/brand/logo-v1-blue-orange.png`
- Live route map: `web/docs/site-hierarchy.md`
- Ops snapshot: `docs/PROJECT_STATE.md`
- Media / publicity kits under `media/` (season outreach assets)

Do not fabricate testimonials, school endorsements, benchmarks, pricing, or licensing claims. Do not invent missing brand asset paths.

## Product Principles

1. **Family dual-job** — Motivate the athlete and orient the parent in the same surface without turning the product into an admin console.
2. **Progress is the hero** — Competition, accomplishments, and improvement stay visually primary.
3. **Airtable owns the math** — The site presents program truth; it does not reimplement progression rules.
4. **Privacy by default** — Public surfaces show only approved athlete/program fields; private and operational data stay out of the browser.
5. **Premium sports craft, mobile-first** — Youth-sports product quality, scanable hierarchy, and phone-ready use over dashboard chrome or template UI.

## Accessibility & Inclusion

Required: accessible contrast, readable type, visible focus states, touch-friendly controls, keyboard navigation, semantic structure, and responsive / mobile-first behavior. Do not rely on color alone for status. shadcn/ui foundations support accessibility; customization must not strip those affordances.
