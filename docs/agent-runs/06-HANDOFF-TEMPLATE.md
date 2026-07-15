# Lead end-of-run handoff — {PACKAGE_ID}

Fill this after worker merges and independent test re-run. Do **not** merge to `master`/`main` until Mike approves.

## Run identity

| Field | Value |
|-------|-------|
| Package ID | |
| Integration branch | |
| Base tip SHA (start) | |
| Integration tip SHA (end) | |
| Started at (UTC) | |
| Finished at (UTC) | |
| Lead takeover? | true / false |

## Worker table

| Role | Branch | Tip SHA | Result file | Status | Path contract OK? |
|------|--------|---------|-------------|--------|-------------------|
| Research | | | | | |
| Implementation | | | | | |
| Testing | | | | | |

## Merge order executed

1. Research
2. Implementation
3. Testing

(Adjust if Lead documented a different order in CONTROL.)

## Tests re-run on integration tip

| Command | Result |
|---------|--------|
| | |

## Risks

1.
2.

## Decisions needed from Mike

1. Approve merge of integration branch → `master` / `main`? **Yes / No / Hold**
2.

## Next steps

1.
2.

## Hard-stop confirmation

- [ ] No Production access
- [ ] No Airtable schema changes
- [ ] No credential or secret changes
- [ ] No deployment
- [ ] No destructive git
- [ ] Workers did not merge
- [ ] Merge to `master`/`main` not performed without Mike approval
