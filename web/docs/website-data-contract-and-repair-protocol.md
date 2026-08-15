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
| WEB-001 | In Progress | Public standings: `/shoot`, `/shoot/leaderboard`, `/shoot/public-display` | Public standings fail closed because the website’s Airtable fixtures and adapters did not consistently match live REST linked-record and lookup shapes. | Complete one comprehensive public-data adapter repair; verify all standings routes and Vercel runtime logs after deployment. |
| WEB-002 | In Progress | `/shoot/homework` | Homework must be included in the same public Airtable data-contract audit and deployed-route verification, not treated as a separate afterthought. | Audit its full live REST field shapes and verify the live route in the comprehensive public-data repair. |
| WEB-003 | Completed | Documentation | Create a persistent website backlog and public Airtable data-contract protocol for future work. | This document; keep adding future entries. |

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
