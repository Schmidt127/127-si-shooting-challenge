# Public route audit — Dashboard, Display, and family chrome

**Date:** 2026-08-30  
**Owner:** Cursor web UX workstream  
**Authority:** Live Airtable schema (`appn84sqPw03zEbTT`), `web/docs/site-hierarchy.md`, Master Future Work List (SC-110–SC-112), Phase 4 copy review CR-12 defaults

## Verdict

**Final public-app readiness pass (2026-08-30):** Routes reviewed; Dashboard and Display remain hidden from family chrome; FAQ added to Playwright + HTTP smoke suites; Vitest public-route-readiness contract added. No redirects required — operator URLs preserved.

| Route | Purpose | Classification | Public nav/hub | Keep route? |
|-------|---------|----------------|----------------|-------------|
| `/shoot/dashboard` | Athlete home preview (level, XP, weekly shots, streak, Perfect Week, homework, feedback) | **Demo** until SC-112 auth — mock adapter by default | **Hidden** | Yes (direct URL + smoke) |
| `/shoot/public-display` | Full-screen season standings for gyms / lobbies / event TVs | **Operational gym/ops** — live Airtable leaderboard | **Hidden** from family chrome | Yes (bookmarkable; no redirect) |

Defaults applied: hide incomplete Dashboard from public navigation; hide Display from parent chrome while preserving the operational URL.

## Link and dependency inventory

| Surface | Dashboard | Public Display |
|---------|-----------|----------------|
| ProductShell nav | Removed 2026-08-30 | Removed 2026-08-30 |
| Homepage hub cards | Removed | Removed |
| Footer quick links | Never linked | Never linked |
| Leaderboard CTA | — | Removed “Display mode” CTA |
| FAQ | No longer points families to dashboard | Not linked |
| Softr / Fillout / Make | No required public deep-links found | No required public deep-links found |
| External landing (`fairfieldbasketballclub.com`) | Not a marketed family destination | Not marketed |
| Tests | Smoke + mobile-a11y still hit URL directly | Smoke / screenshots / indexing still cover URL |
| SEO | `noindex` + robots disallow | `noindex` + robots disallow; sitemap excluded |

## Other routes in scope (status)

| Route | Purpose | Status for public SC experience |
|-------|---------|----------------------------------|
| `/shoot` | Program overview, registration, pricing (incl. Early Bird tiers when published), How it works | Live — primary public entry |
| `/shoot/faq` | Parent FAQ (grades, online, timing, homework, feedback, privacy) | Live — promoted in primary nav |
| `/shoot/tutorials` | Technique catalog | Live |
| `/shoot/zoom-meetings` | Live + recording meetings | Live |
| `/shoot/athletes/[slug]` | Public athlete progress when shared | Live; privacy-safe; not in nav |
| Landing links | Brand/footer → Fairfield Basketball Club home | Preserved (SC-149) |

## Deferred (policy / redesign)

- CR-13 dedicated “For parents” layout expansion — homepage already has a parents section; no additional block invented
- CR-17 adjacent-grade FAQ nuance beyond existing sentence
- CR-18 coach feedback SLA / turnaround promises
- SC-112 authenticated athlete dashboard cutover
- FUT-016 / FUT-017 further portfolio redesigns

## Production gym URL

Operators who need the kiosk view: `https://www.fairfieldbasketballclub.com/shoot/public-display`
