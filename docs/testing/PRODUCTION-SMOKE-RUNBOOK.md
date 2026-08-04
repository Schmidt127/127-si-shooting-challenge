# Production smoke-test runbook — `/shoot`

**Purpose:** Detect broken routes, bad links, missing assets, runtime errors, and deployment regressions before participants hit them.

**Official public host:** `https://www.fairfieldbasketballclub.com`  
**App base path:** `/shoot`  
**Controlling plan:** [`docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md`](../SHOOTING_CHALLENGE_COMPLETION_MASTER.md) (SC-102 / SC-118)

---

## What this package covers

| Layer | Entry | Checks |
|-------|-------|--------|
| Playwright smoke | `web/tests/production-smoke.spec.ts` | Routes, headings, registration CTAs, landing/logo URLs, nav destinations, assets, `/shoot/shoot` guard, external `rel`, console errors, mobile/desktop, 404/missing detail, dashboard demo sections |
| HTTP smoke | `web/scripts/http-smoke.mjs` | Status codes, assets, Fillout + landing URL presence in home HTML, Airtable health JSON |
| Unit guards | `web/lib/registration.test.ts`, `web/lib/app-config.test.ts` | Exact Fillout URLs; safe landing URL fallbacks |
| Broader E2E | `web/tests/public-experience.spec.ts`, `public-hardening.spec.ts`, `registration-gateway.spec.ts` | Full public chrome / a11y / privacy suite |

---

## Safety rules (read carefully)

### Always read-only in this package

- Route GETs and HTML/asset checks only
- Assert Fillout **href** values — **never click through and submit** live forms
- Never create athletes, enrollments, submissions, emails, XP events, or Airtable rows
- Dashboard / athlete profile assertions accept **demo** data (SC-112 auth still Decision Needed)

### Must never run against uncontrolled participant data

| Action | Allowed? |
|--------|----------|
| `npm run test:smoke` / `test:smoke:prod` / `test:smoke:http*` | Yes — read-only |
| Clicking Fillout CTAs and submitting | **No** |
| Live Airtable mutations / scenario runners | **No** (separate controlled Schmidt packages only) |
| Make / Lambda upload tests | **No** (out of scope) |

If a future smoke needs authenticated athlete data, use an explicit controlled fixture approved in the completion master — do not invent one here.

---

## Required environment variables

### Local app (`web/.env.local`)

| Variable | Required for smoke? | Notes |
|----------|---------------------|-------|
| `NEXT_PUBLIC_BASE_PATH` | No (defaults `/shoot`) | Must stay `/shoot` |
| `NEXT_PUBLIC_LANDING_URL` | No (defaults `https://www.fairfieldbasketballclub.com`) | Logo / hub links |
| `NEXT_PUBLIC_SITE_URL` | No (defaults `https://www.fairfieldbasketballclub.com/shoot`) | Metadata base |
| `AIRTABLE_API_TOKEN` | Optional | Without it, Airtable pages render empty/error chrome — smoke still passes |
| `AIRTABLE_BASE_ID` | Optional | Defaults documented in `.env.example` |
| `SITE_ACCESS_TOKEN` | Optional | Leave unset for public smoke |
| `NEXT_PUBLIC_GAME_MANUAL_URL` | Optional | Missing URL shows configured empty state |

### Smoke runners

| Variable | Purpose |
|----------|---------|
| `PLAYWRIGHT_BASE_URL` | Point Playwright at preview/prod (must end with `/shoot/` preferred) |
| `PLAYWRIGHT_PORT` | Local `next start` port (default `3001`) |
| `SMOKE_BASE_URL` | HTTP smoke base (default `http://127.0.0.1:3001/shoot`) |
| `SMOKE_OUT` | Optional path to write HTTP smoke JSON |

**Never commit** `.env`, `.env.local`, or tokens.

---

## How to run locally

From repo root (or `web/`):

```bash
cd web
npm install
npx playwright install chromium
npm run build
npm run test:smoke
```

Optional broader suite:

```bash
npm run test:e2e
npm test                 # vitest unit suite
npm run test:smoke:http  # requires `npm run start` already listening on :3001
```

Playwright config starts `npx next start -p 3001` automatically when `PLAYWRIGHT_BASE_URL` is unset (expects a prior `npm run build`).

---

## How to run against a Vercel preview

```bash
cd web
PLAYWRIGHT_BASE_URL="https://<preview-host>/shoot/" npm run test:smoke
# or HTTP-only:
SMOKE_BASE_URL="https://<preview-host>/shoot" npm run test:smoke:http
```

Notes:

- Preview must expose `/shoot` (project Root Directory = `web`, basePath `/shoot`).
- If Deployment Protection is on, use an authenticated preview access method before running smoke.
- Do not point preview smoke at production Airtable write tooling.

---

## How to run against production

Official host:

```bash
cd web
npm run test:smoke:prod
npm run test:smoke:http:prod
```

Equivalent explicit forms:

```bash
PLAYWRIGHT_BASE_URL=https://www.fairfieldbasketballclub.com/shoot/ \
  npx playwright test tests/production-smoke.spec.ts

SMOKE_BASE_URL=https://www.fairfieldbasketballclub.com/shoot \
  SMOKE_OUT=../docs/testing/evidence/production-http-smoke-latest.json \
  node scripts/http-smoke.mjs
```

Production smoke is **GET-only**. It validates participant-facing surfaces; it does not prove season content depth or auth.

---

## External URL expectations

Active production code must expose:

| Kind | Exact URL |
|------|-----------|
| Player registration | `https://forms.fairfieldbasketballclub.com/shoot-playerregistration` |
| Daily submissions | `https://forms.fairfieldbasketballclub.com/shoot-dailysubmissions` |
| Logo / landing | `https://www.fairfieldbasketballclub.com` |

Tests fail if these drift or if the historical typo host `hooopchallenges.com` reappears.

---

## How to interpret failures

| Failure | Likely meaning | Next step |
|---------|----------------|-----------|
| Route status 404/5xx | Deploy/routing/basePath regression | Check Vercel rewrite + `NEXT_PUBLIC_BASE_PATH`; compare preview vs prod |
| Missing h1 / heading mismatch | Page crash or redesign without smoke update | Open route in browser; check server logs |
| Console errors | Client runtime exception | Reproduce locally with same build; inspect stack |
| `/shoot/shoot` in href/src | Double basePath | Audit `withBasePath` / Link hrefs / metadata icons |
| Asset 404 | Missing `public/` file or wrong basePath on static URL | Confirm `/shoot/favicon.png` and brand logos |
| Fillout URL mismatch | `lib/registration.ts` drift or bad deploy | Fix canonical constants; do **not** patch only HTML |
| Landing URL mismatch | Env/default drift | Set `NEXT_PUBLIC_LANDING_URL` and rebuild |
| API `tokenValid:false` (HTTP smoke) | Vercel Airtable env broken | Fix `AIRTABLE_API_TOKEN` / `AIRTABLE_BASE_ID` in Vercel (Mike) |
| Nav destination 404 | Nav item points at removed route | Update `shooting-challenge-nav.ts` |
| Mobile overflow | Layout regression | Fix CSS; keep overflow ≤ 24px in smoke |

Playwright HTML report: `web/playwright-report/` after a run.

---

## Evidence locations

| Artifact | Path |
|----------|------|
| This runbook | `docs/testing/PRODUCTION-SMOKE-RUNBOOK.md` |
| Playwright suite | `web/tests/production-smoke.spec.ts` |
| Helpers | `web/tests/helpers/smoke.ts` |
| HTTP smoke | `web/scripts/http-smoke.mjs` |
| Prior PROD HTTP evidence | `docs/prod-completion/2026-07-25/PUBLIC-SHOOT-SMOKE.md` |
| Broader Playwright map | `docs/overnight/web-integration/PLAYWRIGHT-COVERAGE.md` |

---

## Related SC items

- **SC-102** — Airtable-backed public pages
- **SC-118** — Playwright coverage / production smoke package
- **SC-112** — Athlete auth (dashboard remains demo; smoke does not invent login)
- **SC-115** — `noindex` still intentional until Mike approves indexing
