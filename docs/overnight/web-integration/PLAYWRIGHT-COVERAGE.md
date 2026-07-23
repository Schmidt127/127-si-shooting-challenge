# Playwright Coverage — public experience (SC-118)

**Agent 6 overnight** · 2026-07-23 · Config: `web/playwright.config.ts` (chromium, basePath `/shoot`, `npx next start -p 3001`)

---

## Coverage map after this session

| Area | Spec | Type |
|------|------|------|
| Landing/home, all 14 public routes, desktop | `tests/public-experience.spec.ts` | Assertions (status < 500, single h1) |
| Same routes, mobile 390×844 + horizontal-overflow guard | `tests/public-experience.spec.ts` | Assertions |
| Navigation (labelled nav landmark, link navigation) | `tests/public-experience.spec.ts` | Assertions |
| Accessibility basics (one h1 per page, `html lang`, nav aria-label) | `tests/public-experience.spec.ts` | Assertions |
| noindex meta present sitewide (until SC-115 decision) | `tests/public-experience.spec.ts` | Assertions |
| Empty states / missing detail records (`rec00000000000000`) | `tests/public-experience.spec.ts` | Assertions |
| Invalid athlete profile slug | `tests/public-experience.spec.ts` | Assertions |
| Unknown route → 404 | `tests/public-experience.spec.ts` | Assertions |
| Privacy: no rendered email addresses on standings/profile/dashboard/admin | `tests/public-experience.spec.ts` | Assertions |
| Admin placeholder safety copy (no participant data / no writes) | `tests/public-experience.spec.ts` | Assertions |
| Screenshot capture (before/after redesign) | `tests/public-pages-screenshots.spec.ts`, `tests/landing-screenshots.spec.ts` | Visual artifacts |
| Smoke (title + nav presence) | `tests/example.spec.ts` | Assertions |

## CI-stability strategy

- **No live Airtable dependency.** Every Airtable-backed page has designed data/empty/error states; specs assert the page chrome (h1, status < 500) rather than record contents, so runs pass with or without `AIRTABLE_API_TOKEN`. This is the "mocks where production connectivity would make CI unstable" approach — the app's own empty/error states act as the stable fixture.
- **API failure path** is exercised naturally when no token is configured (queries throw → error states render). Route-level `try/catch` plus `error.tsx` boundaries are asserted to keep responses under 500.
- Mobile/desktop are separate projects-in-file via `test.use({ viewport })`.

## Local execution status (honest)

`@playwright/test` is declared in `web/package.json` (commit `7a83f7f`) but was
**never installed on this machine**, and the overnight auto-run policy blocks
`npm install`. Therefore this session could not execute the E2E suite locally.

- Unit suite (vitest): **109/109 passing** — includes the logic these specs lean on (standings, XP rules, profile states, security scaffolding).
- ESLint: passing.
- `tsc --noEmit`: fails only on the two uninstalled packages (`tailwind-merge`, `@playwright/test`) — pre-existing environment gap, not a code defect.

**Mike action (morning):** run `npm install` then `npx playwright install chromium`
in `web/`, then `npm run build && npx playwright test`. Expected: all specs in
`public-experience.spec.ts` pass against empty PROD data.

## Suggested next expansions (not done)

1. Axe-core scan step (`@axe-core/playwright`) once dependencies can be installed.
2. Airtable-mocked data states via Next route interception (needs test double for server fetch — larger design).
3. Visual regression baseline once real season data is seeded.
