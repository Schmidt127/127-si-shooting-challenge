# Shooting Challenge Production Certification — 2026-08-04

## Scope

Post-merge certification for PR #55 and merge commit `ea4edb4ffdccb5f76cb7dfdf58e5911dc64ce46f`.

This evidence records the state of GitHub `master`, the Vercel production deployment, the public `/shoot` application, branded external links, and remaining decision items.

## Repository and deployment alignment

- Repository: `Schmidt127/127-si-shooting-challenge`
- GitHub branch: `master`
- Merge commit: `ea4edb4ffdccb5f76cb7dfdf58e5911dc64ce46f`
- Integrated PR: #55
- Superseded PRs: #52, #53, #54 — closed after integration
- Local Cursor checkout: confirmed up to date with `origin/master`; clean working tree
- Vercel project: `127-si-shooting-challenge`
- Vercel production deployment: `dpl_943HN5RwG6GZpzEwkvpJdqhNhb2h`
- Deployment state: `READY`
- Deployment commit: `ea4edb4ffdccb5f76cb7dfdf58e5911dc64ce46f`

## Effective production URL configuration

The live rendered application proves the active production configuration resolves to:

- Landing: `https://www.fairfieldbasketballclub.com`
- App: `https://www.fairfieldbasketballclub.com/shoot`
- Player Registration: `https://forms.fairfieldbasketballclub.com/shoot-playerregistration`
- Daily Submissions: `https://forms.fairfieldbasketballclub.com/shoot-dailysubmissions`

The rendered header logo, wordmark, and footer home link all point to Fairfield Basketball Club. Internal routes remain under `/shoot`. No `/shoot/shoot` links were found in the rendered HTML.

The connector does not expose raw Vercel environment-variable values. This certification therefore proves the effective deployed behavior, not the hidden dashboard values themselves. Code normalization also rewrites missing, malformed, and legacy Hoop Challenges values to Fairfield.

## Public application verification

Verified from the live production response:

- `/shoot` returns HTTP 200
- skip-to-content is present
- `#main-content` is present
- mobile navigation toggle is present with dialog semantics
- 44px minimum targets are present in rendered classes
- desktop and internal navigation point to `/shoot/*`
- registration gateway is present
- both Fillout links use the required hyphenated slugs
- both Fillout links use `target="_blank"` and `rel="noopener noreferrer"`
- live Airtable data renders on the leaderboard/homepage (`Testing Schmidt` visible)
- footer Fairfield link is present
- no `/shoot/shoot` duplication found
- production deployment logs show successful 200 responses for `/shoot`, leaderboard, homework, levels, tutorials, Zoom meetings, and Game Manual
- no fatal or error runtime logs were found immediately after deployment

## Status recommendations

Based on merge, production deployment, live response verification, and prior focused Playwright results:

- SC-149 Landing Domain Transition: **Live Tested in PROD**
- SC-148 Mobile Usability and Accessibility: **Installed in PROD** pending one human interaction check for Escape/focus return on a real mobile browser; static production output and pre-merge Playwright are verified
- SC-118 Production Readiness Smoke Package: **Installed in PROD**; the package is on `master` and deployed. Re-run `npm run test:smoke:prod` after deployment to promote to Live Tested in PROD

## Remaining decisions and backlog

### SC-115 — Search indexing

The live page currently emits:

`<meta name="robots" content="noindex, nofollow">`

This remains a deliberate Decision Needed item. Do not remove it without Mike's explicit indexing approval.

### SC-112 — Athlete auth and live dashboard

The current dashboard/profile path remains demo/scaffolded. Parent magic-link remains the recommended direction, but implementation requires an explicit auth decision.

### SC-109 — Game Manual PDF URL

The dynamic Game Manual route is live. The external PDF environment URL still requires confirmation/set-up if a downloadable PDF is desired.

### SC-054 / SC-117 — Presentation fields

Public Presentation-field wiring remains a separate Airtable/schema package and must preserve existing field dependencies.

## Final operator checks

1. On a physical phone or responsive browser, open the mobile menu.
2. Press Escape and confirm the menu closes.
3. Confirm focus returns to the menu toggle.
4. Run from `web/`:
   - `npm run test:smoke:prod`
   - `npm run test:smoke:http:prod`
5. Update `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md` statuses using the recommendations above and this evidence.
