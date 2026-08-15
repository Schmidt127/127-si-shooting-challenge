# Website Improvement Backlog & Data Contract

**Purpose:** a living, long-term list of website fixes, content corrections, usability ideas, and styling improvements for the Shooting Challenge website.

Use it from any device. When Mike identifies an issue, add it here as **Not Started**. Do not mark it complete until the change is deployed and verified on the affected live route.

## How to use this backlog

1. Add one short item whenever an issue or improvement is identified.
2. Give it the next `WEB-###` ID.
3. Keep the original observation in the item; do not lose the reason it was added.
4. When work begins, set status to **In Progress** and link the PR.
5. Mark **Completed** only after the deployed route and Vercel runtime logs have been checked.
6. Keep completed items. They are the durable history of website fixes.

### Status values

| Status | Meaning |
|---|---|
| Not Started | Captured for a later work session. |
| Ready for Review | Scope or design decision needs approval. |
| In Progress | A focused implementation or PR is underway. |
| Blocked | Cannot proceed until a named dependency is resolved. |
| Completed | Merged, deployed, and live-verified. |
| Won't Do | Deliberately declined; retain the reason. |

## Active backlog

| ID | Status | Area / route | Observation or requested improvement | Next action / verification |
|---|---|---|---|---|
| WEB-001 | Completed | Public standings: `/shoot`, `/shoot/leaderboard`, `/shoot/public-display` | Public standings failed closed because the website’s Airtable fixtures and adapters did not consistently match live REST linked-record and lookup shapes. | Comprehensive adapter repair deployed and verified on all three live routes on Aug. 15, 2026; Xavier, Curtis, and Charlie loaded and no runtime errors were present. |
| WEB-002 | Completed | `/shoot/homework` | Homework was included in the comprehensive public Airtable data-contract audit rather than treated as a separate afterthought. | Repair deployed and the live route verified successfully on Aug. 15, 2026; no production runtime errors were present. |
| WEB-003 | Completed | Documentation | Create a persistent website backlog and public Airtable data-contract protocol for future work. | This document; keep adding future entries. |
| WEB-004 | Completed | Entire website imagery | Remove the cartoonish AI-created photos from all pages. Do not use that visual style in future site work. | Shoot app: merged PR #210 / `3274750`, production verified 2026-08-15; cartoon webp assets 404 and no HTML refs. Landing hub: hoopchallenges-landing PR #9. |
| WEB-005 | Completed | Landing page — upcoming programs and hero | Sort upcoming-program cards by the actual Program Instance start date: Dribble Challenge (Jan. 1, 2027), JR Ref Clinic (Mar. 27, 2027), then Shooting Challenge (May 1, 2027). Feature the next upcoming program in the hero section. | Shipped in hoopchallenges-landing PR #9. |
| WEB-006 | Completed | Landing-page hero | Shorten the hero headline. Remove “Fairfield Athletes”; the site serves athletes throughout the United States. | Shipped in hoopchallenges-landing PR #9. |
| WEB-007 | Completed | Organization/about information | Explain that 127 Sports Intensity is the legally recognized nonprofit and Fairfield Basketball Club is the program/brand covering Shooting Challenge, Dribble Challenge, JR Ref Clinic, Brackets, State Standings, and related activities. | Shipped in hoopchallenges-landing PR #9. |
| WEB-008 | Completed | Program pricing | Decide where each program’s cost should appear: landing-page cards, each program home page, or both. | Policy: concise price on landing cards; full pricing on program home. Shoot home `#pricing` live on 2026-08-15 (Early bird/Regular $20, Late $25). Landing cards: hoopchallenges-landing PR #9. |
| WEB-009 | Completed | Sitewide copy | Replace all statements that limit participation to grades 1–8 with grades 1–12. | Shipped in hoopchallenges-landing PR #9. |
| WEB-010 | Completed | Shooting Challenge card typography — homework, levels, game manual, shoutouts, and similar pages | Card text appears too light/slate-gray against white backgrounds, reducing readability. Establish a more visible, polished text-color and contrast system; use Impeccable or an equivalent design review during implementation. | Merged PR #210 / `3274750`; live `/shoot` homework, levels, leaderboard, and achievements use typography banners and darker card text. |

## New-item template

Copy this row format when adding an item:

| WEB-### | Not Started | Route or area | What I saw, what should change, and why it matters. Include a screenshot link if available. | What “done” should look like. |

## Rules for future website fixes

### One related problem = one coherent repair

Before editing website code, identify every affected route and public-data adapter. Do not patch only the first visible runtime error if the issue concerns a shared Airtable table, field, query, or normalizer.

### Source of truth

| Item | Required source |
|---|---|
| Live table name and stable ID | Airtable schema or current schema export |
| Field types and links | Airtable schema |
| Runtime value shape | Live Airtable REST response, with secrets omitted |
| Intended public membership | Approved Airtable public view plus documented filters |
| Deploy outcome | Vercel runtime logs and deployed routes |

Repository documentation and older test fixtures are useful context, but they do not override the live schema.

### Required discovery before a public-data change

1. List every affected route and its query/data-mapper modules.
2. Inventory every Airtable table and field read by those modules.
3. Record exact live table names and stable table IDs.
4. Capture the real REST value shape for every field used.
5. Identify each field used for identity, scope, rank, threshold, or public display.
6. Check Vercel runtime logs for existing errors on all affected routes.
7. Add the findings to the PR body before implementation.

### Airtable REST normalization rules

Use shared helpers, not page-specific parsing.

| Airtable value | Required handling |
|---|---|
| Linked record | Require exactly one record ID for relational comparisons. |
| Lookup | Require exactly one settled value; reject zero or multiple values. |
| Single select | Normalize to its `name`. |
| Number/formula | Accept a finite number or valid numeric string. |
| Numeric lookup | Accept a direct number/string or one-item array containing one. |
| Text lookup | Accept exactly one non-empty settled text value. |
| Checkbox | Normalize to boolean. |
| Attachment | Use the shared attachment mapper. |
| Blank, error, unset, or multiple values | Fail closed with an actionable route/data error. |

Never compare a record ID to a display name.

### Required public-route checks

For a related public Airtable change, verify all affected routes after deployment:

- `/shoot`
- `/shoot/leaderboard`
- `/shoot/public-display`
- `/shoot/homework`
- affected public athlete-profile routes

Also review Vercel runtime logs for the new production deployment.

### Test and merge requirements

Every public Airtable adapter change must include:

- Realistic fixtures that match live REST response shapes.
- Valid linked-record-ID and single-value lookup-array fixtures.
- Empty, multiple-value, invalid-number, and wrong-scope failure cases.
- A test preserving the approved Airtable view as the public boundary.
- Tests for every affected route/data adapter.
- Focused tests, full web tests, typecheck, lint, and production build.

Do not merge if a live table name/ID conflicts with repository assumptions, a field’s REST shape is unknown, a public query needs a table-wide fallback, or an affected route has not been verified.

## Standard Cursor instruction

> Read `web/docs/website-data-contract-and-repair-protocol.md` first. Review the active backlog items relevant to this task. Treat a shared Airtable website issue as one coherent repair: audit all affected routes and live REST shapes, use shared normalization helpers and realistic fixtures, update the relevant backlog item, and verify every affected route after deployment.
