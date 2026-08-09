# SC-148 / SC-149 — Fairfield Production Live Proof

Date: 2026-08-08 / 2026-08-09 UTC response window  
System: Shooting Challenge public web  
Official URL checked: `https://www.fairfieldbasketballclub.com/shoot`

## Result

The official Fairfield Basketball Club `/shoot` route returned **HTTP 200** from the current Vercel-backed Shooting Challenge application and contains the repository's mobile/accessibility and Fairfield-branding work.

This advances the production evidence for:

- **SC-148 — Mobile usability + accessibility for public `/shoot`**
- **SC-149 — Official landing + branding links use Fairfield Basketball Club**

## Vercel deployment evidence

Vercel project:

- project: `127-si-shooting-challenge`
- project ID: `prj_Qbwjx6JIazQHTHZwDxSv8zPvrTIH`
- team: `127 Sports Intensity`
- team ID: `team_sNHJsPcyqGdsHKOk4shC9ggM`

The project's latest production deployment was in `READY` state during this proof. The project is continuously deploying from `master`; the official Fairfield `/shoot` URL resolved successfully to the current Shooting Challenge build.

The separate Vercel project named `hoopchallenges-landing` still lists legacy Hoop Challenges custom domains in its own project metadata. This proof does **not** assume that project owns or hosts the Fairfield root domain. It records the observed fact that the official Fairfield `/shoot` route serves the Shooting Challenge application successfully.

## Official-domain proof

Fetch of:

`https://www.fairfieldbasketballclub.com/shoot`

returned:

- HTTP status `200 OK`
- title `Shooting Challenge | 127 Sports Intensity`
- Shooting Challenge assets under `/shoot/_next/...`
- canonical application base path `/shoot`
- current Airtable-backed leaderboard content

The live rendered payload included controlled Enrollment `recCyFEPeATOVNlr9` / Testing Schmidt with current public values, demonstrating that the official route is serving the live Airtable-backed app rather than a static placeholder.

## SC-149 Fairfield branding / navigation proof

The live official page contains all of the following:

1. Header circle logo links to:
   `https://www.fairfieldbasketballclub.com`
2. Header 127 Sports Intensity wordmark links to:
   `https://www.fairfieldbasketballclub.com`
3. Footer includes:
   `Fairfield Basketball Club home`
   linking to `https://www.fairfieldbasketballclub.com`
4. Player registration CTA points to:
   `https://forms.fairfieldbasketballclub.com/shoot-playerregistration`
5. Daily submission CTA points to:
   `https://forms.fairfieldbasketballclub.com/shoot-dailysubmissions`
6. Internal Shooting Challenge links remain under `/shoot/*` rather than being redirected to the landing site.
7. No duplicated `/shoot/shoot` path was observed in the server-rendered route structure checked during this proof.

This is production evidence that the active public Shooting Challenge chrome and form destinations use Fairfield Basketball Club rather than Hoop Challenges.

## SC-148 mobile / accessibility proof

The live server-rendered production payload contains the repository hardening features, including:

- `Skip to main content` link targeting `#main-content`
- `<main id="main-content" tabindex="-1">` focus target
- mobile navigation toggle with:
  - `aria-expanded`
  - `aria-controls`
  - `aria-haspopup="dialog"`
  - descriptive `aria-label`
  - `data-testid="mobile-nav-toggle"`
- primary interactive controls using `min-h-11`, `h-11`, or `h-12` sizing consistent with the 44px+ tap-target package
- visible mobile menu entry point under the `md` breakpoint
- footer text links using the `sc-text-link` treatment
- clear status/branding semantics in the rendered page

This proves the mobile/accessibility package is present in the production build served from the official Fairfield URL.

### Boundary of this proof

This fetch validates deployed markup and production routing. It does **not** separately re-run a full interactive browser test for:

- Escape-key close behavior
- focus return after closing the mobile menu
- visual clipping at every target viewport
- axe-core automated accessibility scan

Those behaviors have repository Playwright coverage from the original SC-148 package, but this dated proof should not claim a new interactive browser run that was not performed here.

## Current public data proof

The live page's leaderboard section returned Testing Schmidt from current controlled PROD data, including:

- Enrollment identity corresponding to `recCyFEPeATOVNlr9`
- Level: Rookie
- XP shown during the fetch: 708

This is consistent with the current controlled PROD environment and confirms the official route is reading the live Shooting Challenge backend.

## Known separate launch decision — noindex

The production HTML still contains:

`<meta name="robots" content="noindex, nofollow">`

That is **not** treated as an SC-148/149 defect. Public indexing remains the separate **SC-115 Decision Needed** item and must not be changed without explicit approval.

## Recommended Completion Master reconciliation

Based on this proof:

- SC-148 should no longer be described merely as `Built in Repository`; the package is deployed on the official production route and has production markup/routing proof. Use **Live Tested in PROD** if the project accepts server-rendered production verification plus the existing repository browser regression as sufficient; otherwise use `Installed in PROD / production route verified` until an interactive mobile browser rerun is recorded.
- SC-149 has direct official-domain production proof and can be represented as **Live Tested in PROD** for the Fairfield branding/navigation transition.
- SC-115 remains Decision Needed because `noindex, nofollow` is still intentionally present.

Do not infer a new Vercel custom-domain ownership architecture from this proof; record only that `www.fairfieldbasketballclub.com/shoot` successfully serves the current Shooting Challenge app.
