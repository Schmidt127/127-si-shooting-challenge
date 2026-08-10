# Web Production, Accessibility, and Launch Closeout

**Package:** 10 — Web Production, Accessibility, and Launch Closeout
**Status:** Implementation complete; complete test evidence, production approval, and live evidence pending
**Public route:** `https://www.fairfieldbasketballclub.com/shoot`
**Vercel project root:** `web`

This checklist is a release gate. Do not mark it live tested from a local run, preview run, or a successful build alone.

## 1. Required local checks

From `web/`, install exactly from the committed lockfile and run:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run test:smoke
npm run test:smoke:http
```

`npm run test:e2e` starts the production build at `http://127.0.0.1:3001/shoot/`. It deliberately binds to loopback so the test runner does not depend on local network-interface discovery.

On a new developer or CI image, install the Playwright browser before browser checks: `npx playwright install chromium`. Keep the browser cache outside the repository if the environment requires a custom cache path.

Local `npm run test:smoke:http` reports Airtable health without requiring credentials, so public rendering, assets, links, and routes can be checked safely. `npm run test:smoke:http:prod` requires a healthy Airtable configuration and fails if the token or base is missing or invalid.

If any PHA-first homework tests are failing, record them separately and obtain the owning homework package’s result; do not waive unrelated web failures.

## 2. Environment configuration (names only)

| Variable | Required for | Validation / behavior |
|---|---|---|
| `NEXT_PUBLIC_BASE_PATH` | Public mount | Defaults to `/shoot`; must match the landing rewrite and Next.js `basePath`. |
| `NEXT_PUBLIC_LANDING_URL` | Logo and Fairfield return links | Invalid, legacy, or blank values fall back to `https://www.fairfieldbasketballclub.com`. |
| `NEXT_PUBLIC_SITE_URL` | Metadata, canonical URL, sitemap | Invalid, legacy, or blank values fall back to the Fairfield `/shoot` URL. |
| `NEXT_PUBLIC_GAME_MANUAL_URL` | Official manual open link | Optional. Only HTTP(S) is accepted; absence shows a public-safe unavailable state. Confirm the final public Adobe/PDF URL before approval. |
| `AIRTABLE_API_TOKEN` | Server-side Airtable catalog reads and health detail | Required for live Airtable-backed data. Never expose to the browser or commit it. |
| `AIRTABLE_BASE_ID` | Server-side Airtable catalog reads | Required with the token; use the approved base for the target environment. |
| `AIRTABLE_ACTIVE_SCHOOL_YEAR` | Optional public data scoping | Optional; confirm the intended season if set. |
| `SITE_ACCESS_TOKEN` | Optional preview protection | When set, middleware protects pages and `/api/airtable`; production public access must be deliberately confirmed. |

No secret values belong in this repository, logs, screenshots, or PR comments.

## 3. Route and browser smoke matrix

Perform the following against the approved preview, then production after approval. Capture the URL, timestamp, status code, and screenshots for the home page and any failure.

| Area | Routes / check | Required result |
|---|---|---|
| Core chrome | `/shoot`, `/shoot/leaderboard`, `/shoot/homework`, `/shoot/tutorials`, `/shoot/levels`, `/shoot/achievements`, `/shoot/zoom-meetings`, `/shoot/game-manual` | HTTP success, one visible `h1`, no material browser-console error, no duplicated `/shoot/shoot` paths. |
| Supplemental public routes | `/shoot/shoutouts`, `/shoot/articles`, `/shoot/public-display`, `/shoot/dashboard`, `/shoot/athletes/testing-schmidt`, `/shoot/admin` | HTTP success; demo and placeholder pages must remain accurately labeled. |
| Static assets | `/shoot/favicon.ico`, `/shoot/favicon.png`, `/shoot/brand/logo-circle-blue-orange.png`, `/shoot/brand/logo-v1-blue-orange.png` | HTTP success, no missing asset. |
| Fairfield links | Header logo, wordmark, and footer home link | Use `https://www.fairfieldbasketballclub.com`; no Hoop Challenges or typo host. |
| Game Manual | `/shoot/game-manual` | If configured, the Open game manual link reaches the approved public document. If absent, public-safe unavailable state renders with no environment-variable name. |
| Forms | Registration and daily-submission CTAs | Confirm exact configured Fillout URLs and `noopener noreferrer`; inspect only—never submit a live form during smoke. |

Use desktop `1440×900`, tablet `768×1024`, and mobile `375×812` at minimum. Confirm no horizontal overflow, nav usability, and no header overlap.

## 4. Accessibility verification

- Keyboard: first Tab reaches “Skip to main content”; activating it focuses `#main-content`.
- Focus: keyboard focus is clearly visible on header navigation, menu controls, footer links, and manual links.
- Navigation: mobile menu opens, traps focus, closes with Escape, and returns focus to its toggle.
- Semantics: every route above has one page `h1`; navigation landmarks have accessible names; loading/error/unavailable states announce status appropriately.
- Controls: registration and daily-submission CTAs have a minimum 44px target height on mobile.
- Content: meaningful images have appropriate alternate text; decorative art is hidden from assistive technology.
- Contrast: validate current production colors with a browser contrast tool before sign-off, including small header/footer labels and all CTA states.

## 5. Preview and production approval gate

1. Confirm the deployment’s root directory is `web` and the public route is `/shoot`.
2. Confirm the production environment-variable names above are present without recording values.
3. Confirm the landing-site rewrite sends `/shoot/*` to this app and does not double-prefix paths.
4. Run the local checks and capture their results in the PR.
5. Run the preview matrix and resolve every material failure.
6. Obtain Mike’s explicit approval to merge and deploy. This package does not authorize deployment.
7. After deployment, run `npm run test:smoke:prod` and `npm run test:smoke:http:prod`, then repeat the manual matrix against the canonical Fairfield URL.
8. Save production evidence in the approved release/evidence location. Only then update launch status.

## 6. Rollback procedure

1. Stop further promotion and preserve the failing URL, timestamp, browser console output, and screenshots.
2. In Vercel, promote the last known-good deployment for the same project/root directory; do not alter Airtable data as part of a web rollback.
3. Verify `/shoot`, `/shoot/game-manual`, branding assets, and registration URLs on the restored deployment.
4. Record the rollback deployment URL and result in release evidence; open a follow-up issue/PR for the root cause.
5. Do not retry the production deployment until preview checks and the approval gate pass.

## 7. Evidence required before Package 10 is complete

- Commit SHA and draft/merged PR URL.
- Exact command output (or CI links) for lint, type check, unit tests, build, Playwright, and HTTP smoke.
- Preview and production URLs, timestamps, HTTP status results, and browser-console result.
- Screenshots at the three required viewports for `/shoot` and any route that needed repair.
- Fairfield link and Game Manual verification result.
- Accessibility checklist result, including contrast-tool result.
- Approval record, deployment identifier, and rollback target.
