# Production smoke evidence — 2026-08-04

**Branch:** `cursor/production-smoke-package-88d7`  
**Host:** `https://www.fairfieldbasketballclub.com/shoot`  
**Method:** Read-only Playwright + HTTP smoke (no form submits, no Airtable writes)

## Results

| Suite | Result |
|-------|--------|
| `npm run build` | **PASS** |
| Vitest (`npm test`) | **137/137 PASS** |
| Playwright local (`npm run test:smoke`) | **41/41 PASS** |
| Playwright production (`npm run test:smoke:prod`) | **41/41 PASS** |
| HTTP production (`npm run test:smoke:http:prod`) | **PASS** (`ok:true`, `tokenValid:true`) |

Machine JSON: [`production-http-smoke-2026-08-04.json`](./production-http-smoke-2026-08-04.json)

## External URLs confirmed in live HTML

- `https://forms.fairfieldbasketballclub.com/shoot-playerregistration`
- `https://forms.fairfieldbasketballclub.com/shoot-dailysubmissions`
- Logo/landing → `https://www.fairfieldbasketballclub.com`
- No `hooopchallenges` typo host
- No `/shoot/shoot` duplicated basePath

## Findings

- No material browser console errors on smoked routes
- No broken required brand assets
- Unknown route returns 404
- Athlete dashboard remains **demo** (SC-112 Decision Needed) — weekly summary + video feedback sections visible
- Game Manual page loads; Adobe PDF env may still be empty (SC-109 follow-up)

## Remaining launch risks (not blocked by this package)

1. Athlete auth / live dashboard (SC-112)
2. `noindex` still on (SC-115)
3. Catalog content hygiene / Presentation fields (SC-054 / SC-117)
4. Optional: wire `test:smoke` into CI
