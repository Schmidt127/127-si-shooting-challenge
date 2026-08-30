# Audit limitations

**Snapshot:** 2026-08-30T17:49:53.329688+00:00
**Base:** `appn84sqPw03zEbTT`
**Data-access method:** Airtable Meta API + Records API via PAT (`tools/airtable/.env` / `web/.env.local`); repository filesystem grep for dependencies.

## Access / coverage

| Item | Result |
|------|--------|
| Live tables | 33 |
| Live fields | 1358 |
| Inventory rows | 1358 |
| Tables failed | 0 |
| Fields with UNKNOWN population | 0 |
| Automation 075 in Automations table | Absent (expected) |
| Deleted welcome fields still on Enrollments | none (expected) |

### Tables failed
- none

### MCP vs Meta differences
- none checked or no differences

### Drift vs FUT-002 (2026-08-30 snapshot inventory)
- Drift entries: 75
- NEW since prod-20260819 snapshot: Weekly Athlete Summary.Perfect Week Video Minimum (fld39byDveM8JkILN)
- NEW since prod-20260819 snapshot: Payment Transactions.Actual Amount Paid (fld5S1vCq7bXY0dvP)
- NEW since prod-20260819 snapshot: Weekly Athlete Summary.Hub Accepted At (fld8L2LSv42fEy0yN)
- NEW since prod-20260819 snapshot: Weekly Athlete Summary.Perfect Week Daily Requirement Met? Calculated (fldA22500QH0ioOcs)
- NEW since prod-20260819 snapshot: Payment Transactions.Coupon Code (fldA4KVBewRIoa0Bh)
- NEW since prod-20260819 snapshot: Program Instance - Sync.Active School Year (fldB1SRnDH2pjWkqG)
- NEW since prod-20260819 snapshot: Video Feedback.Parent Feedback Delivery Status (fldBJNpxW8ey5WQvJ)
- NEW since prod-20260819 snapshot: Payment Transactions.Payment Status (fldBa4gTzuwaa1O2q)
- NEW since prod-20260819 snapshot: Program Homework Assignments.Due Date (fldBuww8YJPGWLZFG)
- NEW since prod-20260819 snapshot: Email Handoff Queue.Last Retry At (fldBuxEejak89JYat)
- NEW since prod-20260819 snapshot: Weekly Athlete Summary.Hub Event ID (fldIUrlro7rH6kaPL)
- NEW since prod-20260819 snapshot: Submissions.Perfect Week Manual Exception? (fldIb6nJu5TBkUUrD)
- NEW since prod-20260819 snapshot: Email Handoff Queue.Retry Count (fldIbjhSgRttfaoJ6)
- NEW since prod-20260819 snapshot: Video Feedback.Parent Feedback Resend Message ID (fldKpyYLIKQiB3wBL)
- NEW since prod-20260819 snapshot: Submissions.Perfect Week Grace Eligible? (fldLo2GO5aac6tPX1)
- NEW since prod-20260819 snapshot: Email Handoff Queue.Created (fldMqPg4iP4wmOcaq)
- NEW since prod-20260819 snapshot: Email Handoff Queue.Hub Accepted At (fldNwmc620NAB4IPg)
- NEW since prod-20260819 snapshot: Payment Transactions.Enrollment (fldOGk6OCgqYlRg2r)
- NEW since prod-20260819 snapshot: Weekly Athlete Summary.Last Package Build Attempt (fldOJMIiJ5eRnc2gj)
- NEW since prod-20260819 snapshot: Enrollments.Stripe Payment Id (fldP5y086ZI5u0EE8)
- NEW since prod-20260819 snapshot: Weekly Athlete Summary.Package Build Error (fldPgl5DWwjT15qOE)
- NEW since prod-20260819 snapshot: Enrollments.Perfect Week Video Minimum (fldQSMJvdeQf5JLvx)
- NEW since prod-20260819 snapshot: Video Feedback.Parent Feedback Hub Event ID (fldQU1kv0V77ZlKbw)
- NEW since prod-20260819 snapshot: Video Feedback.Parent Feedback Delivery Error (fldRSXPqJ0o5UG2py)
- NEW since prod-20260819 snapshot: Email Handoff Queue.Hub Error (fldTDR5UGoAvNiekg)
- NEW since prod-20260819 snapshot: Enrollments.Payment Transactions (fldXJ1iLtU6UkQ2KZ)
- NEW since prod-20260819 snapshot: Payment Transactions.Payment Transaction (fldY4XR4YivvxOMJb)
- NEW since prod-20260819 snapshot: Automations.Version Number - AI Agent (fldaL4V9wSdFFNOR0)
- NEW since prod-20260819 snapshot: Payment Transactions.Payment Date (fldc2Wx5pnquQpZfp)
- NEW since prod-20260819 snapshot: Submissions.Activity Date - Time (fldeoSDKvNDfZOAgE)
- NEW since prod-20260819 snapshot: Payment Transactions.Fillout Submission ID (fldf0dMIEEDt2edIh)
- NEW since prod-20260819 snapshot: Program Homework Assignments.Assignment Title - Lkp (fldgBYP0HmmvpFAub)
- NEW since prod-20260819 snapshot: Config.Program Instance - Sync (fldgV7p9MnrXQ2nUZ)
- NEW since prod-20260819 snapshot: Payment Transactions.Make Processed At (fldgWpqZgkbWuwutv)
- NEW since prod-20260819 snapshot: Weekly Athlete Summary.Duplicate Prevention Key (fldikJ8UysT7T6SXq)
- NEW since prod-20260819 snapshot: Payment Transactions.Stripe Payment ID (fldnK7vafzEiWrkul)
- NEW since prod-20260819 snapshot: Program Instance - Sync.Minimum Video  (fldnKF50AmRwMJ2U3)
- NEW since prod-20260819 snapshot: Homework Completions.RecordId (fldoORAYyCaFUgoWN)
- NEW since prod-20260819 snapshot: Config.Perfect Week Video Minimum (fldqRxjWGXcbUZUg3)
- NEW since prod-20260819 snapshot: Video Feedback.Custom Video File Name (fldrWx17PUjsfbAZH)
- NEW since prod-20260819 snapshot: Enrollments.Fillout Submission Id (fldrylpqyHGTv59hz)
- NEW since prod-20260819 snapshot: Achievements.Submission Grace Period Hours (fldzzgfTeUg0QtgzE)
- REMOVED since prod-20260819 snapshot: fld3EmExut7IhFgdi
- REMOVED since prod-20260819 snapshot: fld69DQxhTVlmGoWh
- REMOVED since prod-20260819 snapshot: fld6NBbAwicqJ1nhf
- REMOVED since prod-20260819 snapshot: fld7zjLYXgD4YHy45
- REMOVED since prod-20260819 snapshot: fld8Lb7HmxR5MKcIc
- REMOVED since prod-20260819 snapshot: fld8q4102HlqFssGt
- REMOVED since prod-20260819 snapshot: fldBj4pvJj2nZQs0c
- REMOVED since prod-20260819 snapshot: fldGeqboEr8Ihwvjk
- REMOVED since prod-20260819 snapshot: fldH3XEkc4WQrn5Dp
- REMOVED since prod-20260819 snapshot: fldITNuxNt9xphk7j
- REMOVED since prod-20260819 snapshot: fldJDWXsPcQaH2pA2
- REMOVED since prod-20260819 snapshot: fldKw0Gj4Hf8qhnGR
- REMOVED since prod-20260819 snapshot: fldLRbcq68yn7aTp1
- REMOVED since prod-20260819 snapshot: fldOit9YidoBVa1Wo
- REMOVED since prod-20260819 snapshot: fldOtPlE3QeBTkua0
- REMOVED since prod-20260819 snapshot: fldR0yfOU8pCaDMBO
- REMOVED since prod-20260819 snapshot: fldV5480sMm40q0QX
- REMOVED since prod-20260819 snapshot: fldWYUYAOudslfXa0
- REMOVED since prod-20260819 snapshot: flddMQ8OZdvSsvak8
- REMOVED since prod-20260819 snapshot: fldhx4nDKuzuWQna6
- REMOVED since prod-20260819 snapshot: fldimsdazEpj0Z8Av
- REMOVED since prod-20260819 snapshot: fldlTvIjixfP4bfvL
- REMOVED since prod-20260819 snapshot: fldmopSNL9aZf6K1A
- REMOVED since prod-20260819 snapshot: fldnDfkcdMyZ0ychG
- REMOVED since prod-20260819 snapshot: fldoXWryfQ32rsx3x
- REMOVED since prod-20260819 snapshot: fldqd2ALDtGS6gMqs
- REMOVED since prod-20260819 snapshot: fldt3egwi2fqgpDY8
- REMOVED since prod-20260819 snapshot: fldv4Mhw3w84dXdxx
- REMOVED since prod-20260819 snapshot: fldvkVGoJVGTj3AEw
- REMOVED since prod-20260819 snapshot: fldw6PfS3oJ9ztRU0
- REMOVED since prod-20260819 snapshot: fldwtZbTk3M73OmZx
- REMOVED since prod-20260819 snapshot: fldxORUyJ7uvEgw9h
- REMOVED since prod-20260819 snapshot: fldxx1m0zTsMfEHfj

## Known limitations

1. **View field visibility:** Meta API returns view names/types per table but not which fields are visible/filtered in each view. Active view references are table-level, not per-field.
2. **Interface definitions:** Full interface element → field mapping requires MCP `list_pages_for_base` dump; field hits are best-effort when a dump is present.
3. **Automation UI triggers:** Live Automations **UI** graph is separate from the Automations **data table**. This audit records Automations table columns `Name` / `Status` / `Automation Code` / `Trigger field(s)` per CURRENT-TRUTH authority rule (only Name/Status/Code are audit authority for Live identity).
4. **Name-only dependency matches:** Repository grep may match shared field names across tables (e.g. `Status`). Field-ID matches are preferred when present; name matches are flagged as possible cross-table hits.
5. **Blank detection:** Airtable Records API omits blank fields. Blank = field key absent OR empty string OR empty array. Checkbox `false` counts as populated.
6. **Softr:** Treated as obsolete; references are historical docs only.
7. **No Airtable mutations** were performed.

## Population method

For each table, page all records (`pageSize=100`) with all fields. For each schema field name, count records where the field is present and non-blank. `populationPct = populated / total * 100`.

## Dependency-scan method

Exact field ID regex (`fld…`) and field-name substring scan across automations, web, tools, tests, make, docs, lambda. Automation comment-only lines excluded. Active vs historical groups separated.
