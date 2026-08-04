# PR #52 / #53 / #54 File Overlap Map

Integration branch: `cursor/integrate-pr52-pr53-pr54`  
Base: `origin/master` @ `44a0877`

## Unique to PR #52 (landing-domain)

- `.cursor/rules/monorepo.mdc`
- `AGENTS.md`, `APP_CONTEXT.md`, `BRAND_STANDARDS.md`
- `docs/PROJECT_STATE.md`, `docs/README.md`, `docs/app-overview.md`, `docs/brand-system.md`
- `docs/challenge-year/WEB-SEASON-ACTIVATION.md`, `docs/deployment-notes.md`
- `docs/v2/05-system-architecture.md`, `docs/v2/07-ui-standards.md`
- `web/docs/airtable-data-map.md`, `web/docs/brand-guide.md`
- `web/lib/site-chrome-links.test.ts`
- `web/next.config.ts` (metadata / site URL wiring if any)

## Unique to PR #53 (smoke package)

- `docs/overnight/web-integration/PLAYWRIGHT-COVERAGE.md`
- `docs/testing/PRODUCTION-SMOKE-RUNBOOK.md`
- `docs/testing/evidence/PRODUCTION-SMOKE-2026-08-04.md`
- `docs/testing/evidence/production-http-smoke-2026-08-04.json`
- `web/package.json` (smoke scripts)
- `web/scripts/http-smoke.mjs`
- `web/tests/helpers/smoke.ts`
- `web/tests/production-smoke.spec.ts`

## Unique to PR #54 (mobile a11y)

- `web/app/globals.css`
- `web/components/dashboard/athlete-dashboard-view.tsx`
- `web/components/home/home-page-view.tsx`
- `web/components/home/registration-gateway.tsx` (a11y polish)
- `web/components/layout/product-nav.tsx`, `product-shell.tsx`
- `web/components/leaderboard/leaderboard-table.tsx`
- `web/components/site/feature-card.tsx`, `page-hero.tsx`, `program-page.tsx`
- `web/components/site/skip-to-content.tsx`, `index.ts`
- `web/components/ui/button.tsx`, `empty-state.tsx`, `error-state.tsx`, `loading-state.tsx`
- `web/lib/release/public-surface.ts`, `public-surface.test.ts`
- `web/scripts/capture-mobile-a11y-shots.mjs`
- `web/tests/mobile-a11y.spec.ts`
- `web/tests/registration-gateway.spec.ts` (updates)

## Overlapping files (conflict risk)

| File | #52 | #53 | #54 | Resolution rule |
|------|:---:|:---:|:---:|-----------------|
| `web/lib/app-config.ts` | Y | Y | | **#52 wins** (Fairfield rewrite of hoop hosts) |
| `web/lib/app-config.test.ts` | Y | Y | | Merge: #52 landing tests + #53 smoke-related asserts |
| `web/app/layout.tsx` | Y | Y | | #52 SITE_URL / Fairfield metadata; keep #53 extras if any |
| `web/components/site/site-header.tsx` | Y | Y | Y | #54 a11y menu + #52 Fairfield landing links |
| `web/components/site/site-footer.tsx` | Y | | Y | #54 structure + #52 Fairfield links |
| `web/tests/public-hardening.spec.ts` | Y | Y | | Fairfield URLs + smoke/hardening asserts |
| `web/playwright.config.ts` | Y | Y | | Merge both config deltas |
| `.env.example`, `web/.env.example`, `web/.env.local.example` | Y | Y | | Fairfield landing/site URLs from #52 |
| `web/docs/site-hierarchy.md` | Y | Y | | Fairfield + smoke notes |
| `CHANGELOG.md` | Y | Y | Y | Combine all three entries; correct SC IDs |
| `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md` | Y | Y | Y | SC-148 mobile, SC-149 landing, SC-118 smoke |

## Correct SC classifications

- **SC-148** — Mobile Usability and Accessibility → Built in Repository
- **SC-149** — Landing Domain Transition → Built in Repository
- **SC-118** — Production Readiness Smoke Package → Built in Repository — smoke suite successfully executed against current PROD
