# SC-149 — Public Family Dashboard navigation (2026-09-04)

**Backlog ID:** SC-149 (Family Dashboard navigation row; distinct from SC-149 Fairfield branding URLs)  
**Verdict:** **COMPLETE / Live Tested in PROD** — no code gap  
**Implementation PR:** [#358](https://github.com/Schmidt127/127-si-shooting-challenge/pull/358)  
**Merge SHA:** `29904b45870ad2f4c85bf96cda65dc7a92559621`  
**Production URL:** https://www.fairfieldbasketballclub.com/shoot  
**Related:** SC-112 / SC-151 remain closed — do not reopen for athlete selection or Gmail policy

## Scope verified

Public chrome only: header, mobile menu, footer, homepage parent CTA, FAQ get-started CTA → `/shoot/dashboard/sign-in`. Private `/shoot/dashboard` stays auth-gated.

## Production evidence (2026-09-04)

| Check | Result |
|---|---|
| Desktop header / home CTA / footer hrefs | `/shoot/dashboard/sign-in` |
| Mobile menu link (`family-dashboard-mobile-link`) | `/shoot/dashboard/sign-in`; header link hidden at 375px |
| FAQ CTA (`family-dashboard-faq-cta`) | `/shoot/dashboard/sign-in` |
| Direct `/shoot/dashboard/sign-in` | Sign-in form; no authenticated dashboard chrome |
| Header click → back → forward → refresh | Lands on sign-in; no `/shoot/shoot/`; no `rec…` in public URLs |
| Signed-out `/shoot/dashboard` | Redirects to `/shoot/dashboard/sign-in` (auth gate intact) |

## Repo lock tests

- Vitest: `web/lib/navigation/family-dashboard-link.test.ts` (+ public-route / footer / home source checks)
- Playwright: `web/tests/family-dashboard-nav.spec.ts` against Production (`PLAYWRIGHT_BASE_URL=https://www.fairfieldbasketballclub.com/shoot/`)

## Coordinator note

Treat **SC-149 Family Dashboard navigation** as closable. Fairfield branding URL attestation (same ID, separate row) remains its own ops checkbox if still open.
