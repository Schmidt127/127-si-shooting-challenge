# SC-149 — Independent End-to-End and Privacy Verification (Agent 4)

**Date:** 2026-09-04  
**Agent:** Agent 4 — Independent verifier  
**Worktree:** `C:\Users\mschmidt_fairfield\Documents\GitHub\127-si-worktrees\sc-149-wave\a4-verify`  
**Branch:** `verify/sc-149-e2e-privacy`  
**Base / Production SHA:** `824062a00a41f87838da18c6b60e2fe8a3675a68`  
**Production deployment:** `dpl_4WDcPGnGK8wet8pbBX5ZobqQwqWX` (Vercel `READY`, target `production`, commit SHA matches)  
**Public URL:** https://www.fairfieldbasketballclub.com/shoot  

**Related backlog (preserve status — do not reopen):**  
- SC-109 — COMPLETE (untouched)  
- SC-112 — COMPLETE — PRODUCTION VERIFIED BY MIKE (untouched)  
- SC-151 — MERGED/DEPLOYED (regression-checked only; Gmail prohibition still absent)

**Recommendation:** **CLOSE SC-149**

---

## Task Classification

| Field | Value |
|-------|-------|
| Type | Independent E2E + privacy verification |
| Priority | P1 (Family Dashboard nav) / P0 (Fairfield branding theme) |
| Difficulty | Medium |
| Owner | Agent 4 (verify) |
| Dependencies | Production deploy of `824062a0` |
| Backlog ID | SC-149 |
| Estimated Scope | Read-only prod smoke + evidence docs |
| Phase | Phase 5 Close (verification) |
| Correct tool | Cursor + Playwright MCP / HTTP smoke |
| Repo | `127-si-shooting-challenge` |
| Mike's role | Review matrix + close SC-149 if accepted |

No application code was modified. No Season Sim work. No magic-link email sent to a real parent inbox (unknown `example.com` anti-enumeration POST only).

---

## Acceptance Pass/Fail matrix

| # | Acceptance check | Result | Evidence |
|---|------------------|--------|----------|
| A1 | Header Family Dashboard → `/shoot/dashboard/sign-in` | **PASS** | Playwright `family-dashboard-nav` + MCP desktop `headerHref` |
| A2 | Mobile menu Family Dashboard → `/shoot/dashboard/sign-in` | **PASS** | Playwright mobile nav test + MCP mobile href |
| A3 | Footer Family Dashboard → `/shoot/dashboard/sign-in` | **PASS** | Playwright + HTTP probe + MCP |
| A4 | Homepage parent CTA → `/shoot/dashboard/sign-in` | **PASS** | Playwright + HTTP probe (`family-dashboard-home-cta`) |
| A5 | FAQ Family Dashboard CTA → `/shoot/dashboard/sign-in` | **PASS** | HTTP probe `faqCtaHrefs` = `/shoot/dashboard/sign-in` (3 path refs) |
| A6 | Sign-in page loads (200, form, title) | **PASS** | HTTP 200; title “Family dashboard sign-in”; email form present |
| B1 | Live HTML uses Fairfield landing (not hoopchallenges) | **PASS** | Attestation harness `pass: true`, `legacyHoopHost: false` on 4 routes |
| B2 | Fillout forms on fairfieldbasketballclub.com | **PASS** | Both registration + daily submission URLs present |
| B3 | No `/shoot/shoot/` duplicated basePath in public HTML | **PASS** | Attestation + home/sign-in probes + MCP `shootShoot: 0` |
| B4 | `/shoot/shoot` route is not a valid app page | **PASS** | GET `/shoot/shoot` → **404** |
| B5 | Vercel Production env dashboard explicit values | **PASS (inferred)** | Live render proves Fairfield `LANDING`/`SITE` behavior; dashboard env UI not read by Agent 4 (historical Mike ops note retained, not a product defect) |
| P1 | No Airtable `rec…` in public **generated** hrefs (home/sign-in) | **PASS** | `airtableRecInHref: 0` on home + sign-in |
| P2 | Anti-enumeration magic-link response (unknown email) | **PASS** | HTTP 200, generic message, keys `ok`+`message` only, no token, no `rec…` |
| P3 | Anonymous `/dashboard` does not show authenticated private UI | **PASS** | Playwright dashboard-privacy + probe `hasAuthenticatedMarker: false` |
| P4 | SC-151: sign-in does **not** prohibit Gmail | **PASS** | Copy absent; instruction present |
| P5 | SC-151: instructs use of registration email | **PASS** | Exact: “Use the parent email entered on your Shooting Challenge registration.” |
| N1 | Navigation refresh on sign-in | **PASS** | MCP reload stayed on `/shoot/dashboard/sign-in`; instruction still present |
| N2 | Sign-out | **N/A** | No signed-in fixture without capturing secrets/tokens |
| N3 | Single/multi athlete select UX | **N/A** | No signed-in fixture; would require magic-link capture (forbidden) |
| N4 | Registered safe test-email send | **SKIPPED (by design)** | Public + smoke + unknown-email anti-enum sufficient; no ATHLETE_AUTH_TEST_MODE send |

**Failures with reproducible steps:** none.

---

## Commands and exact counts

### Git / deployment identity

```text
git rev-parse HEAD
→ 824062a00a41f87838da18c6b60e2fe8a3675a68

Vercel get_deployment dpl_4WDcPGnGK8wet8pbBX5ZobqQwqWX
→ readyState READY, target production, githubCommitSha 824062a0…
```

### Fairfield attestation (MRW-E02 / SC-149 branding)

```powershell
node tools/testing/sc-149-fairfield-attestation.mjs --write-evidence
```

| Metric | Count |
|--------|------:|
| Routes checked | 4 (`/`, `/leaderboard`, `/homework`, `/game-manual`) |
| Route failures | **0** |
| Fillout URL checks | 2 present |
| Nested HTTP smoke `failureCount` | **0** |
| Overall `pass` | **true** |

Evidence: `docs/testing/evidence/SC-149-FAIRFIELD-ATTESTATION-2026-09-04.json`

### Production HTTP smoke

```powershell
cd web
$env:SMOKE_BASE_URL = "https://www.fairfieldbasketballclub.com/shoot"
$env:SMOKE_REQUIRE_AIRTABLE_CONFIG = "true"
$env:SMOKE_OUT = "../docs/testing/evidence/SC-149-A4-HTTP-SMOKE-20260904.json"
node scripts/http-smoke.mjs
```

| Metric | Count |
|--------|------:|
| Routes probed | 19 |
| Route HTTP failures | **0** |
| Assets probed | 4 (all 200) |
| Named checks | 4 (airtable-health, 2× fillout, landing-url) — all ok |
| `failureCount` | **0** |

### Playwright (production base URL)

```powershell
cd web
$env:PLAYWRIGHT_BASE_URL = "https://www.fairfieldbasketballclub.com/shoot/"
npx playwright test tests/family-dashboard-nav.spec.ts tests/dashboard-privacy.spec.ts tests/athlete-auth-privacy.spec.ts --reporter=list
```

| Metric | Count |
|--------|------:|
| Tests run | 19 |
| Passed | **14** |
| Skipped | **5** (local `ATHLETE_AUTH_ENABLED` unset — auth-gated local skips; production still covered by HTTP + MCP + dashboard-privacy) |
| Failed | **0** |

Family Dashboard nav suite: **4/4 passed** (desktop header/footer/CTA, leaderboard public, homework nav, mobile menu).

### Agent 4 HTTP + privacy probe

```powershell
node docs/testing/evidence/_sc149_a4_http_probe.mjs
# (disposable helper; JSON evidence committed, helper not required long-term)
```

Key observations:

- Home Family Dashboard hrefs (header/footer/home CTA): all `/shoot/dashboard/sign-in`
- Sign-in: `gmailProhibited: false`, `registrationInstruction: true`
- Magic-link unknown email: generic confirmation, `hasToken: false`, `leakedRec: false`
- Intentional probe URL `/athletes/recTESTPRIVACY0001` returned 200 with slug echoed in body — **not** an app-emitted public link (home/sign-in `airtableRecInHref: 0`)

Evidence: `docs/testing/evidence/SC-149-A4-HTTP-PROBE-20260904.json`

### Playwright MCP (manual)

- Desktop 1440×900: header/footer/home CTA → `/shoot/dashboard/sign-in`; Fairfield logo → `https://www.fairfieldbasketballclub.com`; hoopchallenges links **0**; `/shoot/shoot` links **0**
- Mobile 375×812: header Family Dashboard hidden; mobile toggle visible; mobile link `/shoot/dashboard/sign-in`; lands on sign-in with registration-email copy
- Sign-in refresh preserved URL + copy
- Console: Next.js RSC prefetch 404 noise on some navigations — **not** treated as SC-149 acceptance failure (document routes return 200 on direct GET)

---

## Dual SC-149 themes — verdict

### Theme A — Family Dashboard public navigation (PR #358)

**PASS.** Header, mobile menu, footer, homepage parent CTA, and FAQ CTA all resolve to `/shoot/dashboard/sign-in` on production. Sign-in page loads and remains reachable after refresh. Public catalog routes remain available without auth.

### Theme B — Fairfield branding URLs

**PASS.** Live production HTML contains Fairfield landing/root links, Fairfield Fillout hosts, and zero `hoopchallenges` hosts across attestation routes. Duplicated `/shoot/shoot` not present in HTML; bare `/shoot/shoot` returns 404. Explicit Vercel dashboard env screenshot attestation remains optional ops hygiene; rendered production is the verification authority used here.

---

## Privacy / SC-151 regression notes

- No secrets, magic-link URLs, tokens, or PII captured in evidence.
- Anti-enumeration message for unknown email is uniform and non-leaky.
- SC-151 Gmail prohibition copy remains absent; registration-email instruction remains present. **Do not reopen SC-112 or SC-151.**

---

## Recommendation

**CLOSE SC-149**

Not HOLD (no Agent 2/3 product defects found). Not BLOCKED (production deploy SHA verified; public checks completed without authenticated fixture).

Optional Mike follow-up (non-blocking): glance at Vercel Production env for `NEXT_PUBLIC_LANDING_URL` / `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_BASE_PATH` if dashboard attestation is desired for ops records — live render already confirms correct behavior.
