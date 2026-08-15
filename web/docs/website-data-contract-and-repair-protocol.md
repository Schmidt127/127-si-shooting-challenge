# Website Data Contract & Repair Protocol

**Applies to:** every public Shooting Challenge web change that reads Airtable  
**Primary routes:** `/shoot`, `/shoot/leaderboard`, `/shoot/public-display`, `/shoot/homework`, public athlete profiles  
**Purpose:** prevent production outages caused by treating Airtable REST values as display strings instead of their actual API shapes.

## Non-negotiable rule

Before changing public Airtable query code, inspect the full affected data path. Do not patch only the first runtime error.

A related public-data defect is one repair unit: audit it, update its shared adapter/fixtures, test every affected route, and ship one coherent PR.

## Source of truth

| Item | Required source |
|---|---|
| Live table name and ID | Airtable schema or a current schema export |
| Field types and links | Airtable schema |
| Runtime value shape | Live Airtable REST response, with secrets omitted |
| Intended public membership | Approved Airtable public view plus documented filters |
| Deploy outcome | Vercel runtime logs and the deployed routes |

Repository documentation and old test fixtures are useful context, but they do not override the current live schema.

## Required discovery before coding

1. List every affected route and its query/data-mapper modules.
2. Inventory every Airtable table and field read by those modules.
3. Record each table's exact live name and stable table ID.
4. Capture the real REST value shape for every field used.
5. Identify every field used as an identity, scope, rank, threshold, or public display value.
6. Check Vercel runtime logs for all existing errors on the affected routes.
7. Write the findings in the PR body before implementation.

### Airtable REST normalization rules

Use shared helpers. Do not create page-specific parsing logic.

| Airtable value | Valid public-data handling |
|---|---|
| Linked record | Require exactly one record ID for relational comparisons. |
| Lookup | Require exactly one settled value; explicitly reject zero or multiple values. |
| Single select | Normalize to its `name`. |
| Number/formula | Accept a finite number or a valid numeric string. |
| Numeric lookup | Accept a direct number/string or a one-item array containing one. |
| Text lookup | Accept one non-empty settled text value only. |
| Checkbox | Normalize to a boolean. |
| Attachment | Normalize through the shared attachment mapper. |
| Blank, error, unset, or multiple values | Fail closed with an actionable route/data error. |

Never compare a record ID to a display name. Never infer a record relationship from a display string when a record ID is available.

## Required public standings contract

The public leaderboard must:

1. Use `Enrollments → Web - Leaderboard` as its only Enrollment source.
2. Resolve the active Shooting Challenge season from exactly one Program Instance selected by the documented live selector.
3. Validate the selected Program Instance's canonical name and school year.
4. Compare Enrollment Program Instance links with the selected Program Instance **record ID**.
5. Compare Enrollment Current Level links with Level **record IDs**.
6. Validate public level display, level rank, and XP threshold against the matched active Level record.
7. Reject inactive, wrong-season, duplicate, incomplete, or unsettled Enrollment rows.
8. Never require historical/future Config records to be deleted or reduced to one row.

## Required homework contract

The homework page must:

1. Resolve the same current Shooting Challenge Program Instance contract.
2. Scope Program Homework Assignments by Program Instance record ID.
3. Validate linked Homework, Week, Grade Band, and slot shapes before rendering.
4. Use published curriculum only.
5. Treat empty scheduled homework as an intentional empty state, not a broad table fallback.

## Test requirements

Every PR that changes a public Airtable adapter must include:

- Realistic fixtures reflecting the live REST response shapes.
- At least one valid linked-record-ID fixture.
- At least one valid single-value lookup-array fixture.
- Empty, multiple-value, invalid-number, and wrong-scope failure cases.
- A test confirming the approved Airtable view remains the public boundary.
- Tests for every affected route/data adapter, not only the first broken route.
- Focused tests, full web tests, typecheck, lint, and production build.

## Deployment checklist

Before merge:

- [ ] PR includes the route and schema inventory.
- [ ] No Airtable schema/data, Make, Fillout, or Vercel environment change is hidden in the task.
- [ ] Validation is complete.
- [ ] The PR does not broaden public queries to a table-wide fallback.

After deploy:

- [ ] Check `/shoot`.
- [ ] Check `/shoot/leaderboard`.
- [ ] Check `/shoot/public-display`.
- [ ] Check `/shoot/homework`.
- [ ] Check any affected public athlete profile.
- [ ] Review Vercel runtime errors for the new production deployment.
- [ ] Confirm returned athletes/content are limited to the intended current program/year.

## Stop conditions

Stop and report before merging when any of the following is true:

- The live table name/ID conflicts with repository assumptions.
- A field's REST shape is unknown.
- Multiple current Program Instances match the selector.
- A public query would need a table-wide fallback.
- A test fixture relies on a display name where production returns a record ID.
- One affected route works but another affected route has not been verified.

## Standard Cursor task instruction

> Treat this as a public Airtable data-contract change. Read `web/docs/website-data-contract-and-repair-protocol.md` first. Audit every affected public route and live REST field shape before coding. Use shared normalization helpers, realistic REST fixtures, one coherent PR, and post-deploy checks for all affected routes.
