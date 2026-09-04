# SC-148 — Mobile usability + accessibility production attestation (2026-09-04)

**Backlog ID:** SC-148  
**Verdict:** **COMPLETE / Live Tested in PROD** (original package already deployed; interactive production rerun recorded here)  
**Production URL:** https://www.fairfieldbasketballclub.com/shoot  
**Repo HEAD at attestation start:** `8e662a38ab3d12a726dd7599ccdac4077db0e015` (`origin/master`)  
**Agent:** Cursor Agent 4 (SC-148 Mobile Accessibility)  
**Prior proof:** [`docs/prod-completion/2026-08-08/SC-148-149-FAIRFIELD-PROD-LIVE-PROOF.md`](../prod-completion/2026-08-08/SC-148-149-FAIRFIELD-PROD-LIVE-PROOF.md)

## Acceptance criteria (from Completion Master §9H / FWL)

| Criterion | Production result |
|---|---|
| Accessible mobile menu (open / close / Escape / focus return) | **PASS** — interactive + Playwright |
| Skip link → `#main-content` | **PASS** — mobile + desktop |
| 44px+ tap targets (logo, CTAs, menu toggle, registration gateway) | **PASS** |
| Overflow protection at 375×812 and 390×844 | **PASS** (0px horizontal overflow on sampled pages) |
| Visible focus rings (skip link + nav) | **PASS** |
| Registration CTAs in mobile menu + gateway | **PASS** |
| Footer text-link treatment (`.sc-text-link`) | **PASS** |
| Heading hierarchy (single `h1` on sample pages) | **PASS** |
| Loading / empty / error chrome usable | **PASS** on public routes; global 404/error landmark hardened in attestation PR |
| Playwright coverage 375 / 768 / 1440 | **PASS** — `web/tests/mobile-a11y.spec.ts` **18/18** vs Production |
| Optional axe-core full audit | **Not run** (explicitly optional / non-blocking) |

## Interactive production checks (Playwright MCP)

Viewport **375×812** unless noted.

| Check | Result |
|---|---|
| Menu Escape closes panel and returns focus to toggle | PASS |
| Skip link focused on Tab; visible focus cue; Enter focuses `#main-content` | PASS |
| Sign-in `Parent email` wrapping `<label>`; input height ≥44px | PASS |
| Leaderboard at **390×844** — single h1, no overflow | PASS |
| homework / levels / faq / game-manual — single h1, no overflow | PASS |
| Footer Family Dashboard → `/shoot/dashboard/sign-in` | PASS |
| Unnamed interactive controls on home, leaderboard, sign-in, achievements, zoom, tutorials | PASS (0 unnamed) |
| Images missing `alt` on those routes | PASS (0) |
| Text resize (~200% root font) on home — no horizontal overflow | PASS |
| Athlete switcher / authenticated dashboard | **Not retested** — auth-gated; covered by closed SC-112 Mike verification |

## Automated production regression

```text
PLAYWRIGHT_BASE_URL=https://www.fairfieldbasketballclub.com/shoot/
npx playwright test tests/mobile-a11y.spec.ts --workers=1
→ 18 passed (pre-attestation suite against LIVE package)
```

Attestation PR adds 390px + sign-in label + not-found `<main>` coverage. The not-found main landmark assertion requires the PR deploy; core LIVE package remains attested by the 18/18 run and interactive matrix above.

## LIVE vs Built-only

| Surface | Status |
|---|---|
| Mobile nav dialog, skip link, 44px targets, focus rings, overflow guards, footer text links | **LIVE** on fairfieldbasketballclub.com/shoot |
| Global 404 / error `<main id="main-content">` landmark | **Built in this PR** → LIVE after merge/deploy |

## Functional fixes in attestation PR

1. `web/app/not-found.tsx` — wrap content in `<main id="main-content" tabIndex={-1}>` (screen-reader landmark on unknown routes).
2. `web/app/error.tsx` — same landmark treatment for the app error boundary.

No cosmetic redesign. No SEO indexing gate changes. No Automation 101 / PR #310 files.

## Residual risks (non-blocking)

- Full axe-core CI gate still optional.
- Authenticated athlete switcher / sign-out not re-proven in this unauthenticated pass (SC-112 closed).
- Decorative hero contrast remains a visual-design judgment (explicitly out of SC-148 package scope).

## Evidence paths

- This audit: `docs/audits/SC-148-mobile-a11y-prod-attestation-20260904.md`
- Machine summary: `docs/testing/evidence/SC-148-PROD-ATTESTATION-2026-09-04.json`
- Prior markup proof: `docs/prod-completion/2026-08-08/SC-148-149-FAIRFIELD-PROD-LIVE-PROOF.md`
- Regression: `web/tests/mobile-a11y.spec.ts`
