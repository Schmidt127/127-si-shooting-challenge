# Automation 031 Paste and Test Packet — v3.8 — 2026-08-12

## Scope

Focused repository package for issue #96:

- `airtable/automations/shooting-challenge/031-weekly-summary-and-goal-logic-find-or-create-weekly-athlete-summary-from-submission.js` v3.8
- offline harness: `tools/testing/tests/run_031_script.mjs`
- offline regression: `tools/testing/tests/test_031_offline.mjs`

This packet documents repository repair status only.

- Airtable installation: **unconfirmed**
- Controlled PROD live testing: **not performed**
- Production Airtable is the only Airtable environment for this integration.
- The required test is a controlled Production test using the existing valid
  Schmidt Submission; `rec58gdymfPKKeVRI` is a temporary manual-test record
  selection only, with Mike's allowlisted email.
- No DEV Airtable evidence is required or claimed.

## Airtable automation identity

- Automation number: `031`
- Exact Airtable automation name: `031 - Weekly Summary and Goal Logic - Find or Create Weekly Athlete Summary from Submission`
- Authoritative script path: `airtable/automations/shooting-challenge/031-weekly-summary-and-goal-logic-find-or-create-weekly-athlete-summary-from-submission.js`
- Repository version in this package: `v3.8`

## Repository repair completed

The v3.8 repair now:

1. validates an existing Submission -> Weekly Athlete Summary link against the current Submission Enrollment + Week + Program Instance + Summary Key;
2. keeps a valid existing link without churn;
3. repairs a stale Submission link to the canonical summary when exactly one safe replacement exists;
4. removes the source Submission from the stale summary when repair occurs;
5. repairs matching non-Submission-Base XP Events for the same Enrollment + Week when they are blank or still linked to the stale summary;
6. derives Program Instance from authoritative Enrollment and Week links and requires exactly one matching ID;
7. ignores and logs malformed unrelated candidate summaries before any Submission, Summary, or XP Event write;
8. excludes Automation 010-owned Submission Base XP Events using the authoritative `XP Source` single-select option ID `selZw4nOkwMJCgGyR`;
9. fails closed when Program Instance is missing/ambiguous, no fully valid replacement exists, or multiple fully valid replacements exist;
10. never creates a Weekly Athlete Summary; a unique canonical record must already exist;
11. requires `Count This Submission?` to exist but accepts its existing formula type; `isChecked()`
    reads raw `true`, raw `1`, and checked/true/1 formula text;
12. requires `Submission Stat Mode` to exist as a formula/read-only readiness
    input and accepts only its trimmed, case-insensitive evaluated text `Counted`;
13. requires `Build Daily Email Now?` to remain a writable physical `checkbox`;
14. checks `Build Daily Email Now?` only after final summary validation succeeds. Automation 031
    is the sole owner of that readiness check; Automation 076 consumes and clears it.

## v3.8 startup field-role audit

| Field | Role | v3.8 contract |
|---|---|---|
| `Submissions -> Enrollment` | Required linked input | Required field existence |
| `Submissions -> Week` | Required linked input | Required field existence |
| `Submissions -> Weekly Athlete Summary` | Writable output | Required and writable link |
| `Submissions -> Count This Submission?` | Required formula/read-only input | Required field existence; evaluated through `isChecked()` |
| `Submissions -> Submission Stat Mode` | Required formula/read-only input | Required field existence; evaluated text must equal `Counted` after trim/case normalization |
| `Submissions -> Build Daily Email Now?` | Writable output | Required physical `checkbox` and writable; checked only after final validation |
| `Enrollments -> Enrollment Key` | Required formula/read-only input | Required field existence |
| `Enrollments -> Program Instance` | Required linked input | Required field existence |
| `Weeks -> Week Key` | Required formula/read-only input | Required field existence |
| `Weeks -> Program Instance` | Required linked input | Required field existence |
| `Weeks -> Week Name` | Required read-only input | Required field existence |
| `Weekly Athlete Summary -> Summary Key` | Required formula/read-only input | Required field existence |
| `Weekly Athlete Summary -> Enrollment` | Writable output | Required and writable link |
| `Weekly Athlete Summary -> Week` | Writable output | Required and writable link |
| `Weekly Athlete Summary -> Submissions` | Writable output | Required and writable link |
| `XP Events -> XP Source` | Required read-only configuration input | Required `singleSelect`; preserves Automation 010 ownership |

No Airtable schema or formula changes are included.

## Offline verification

Command run:

`node --test tools/testing/tests/test_031_offline.mjs`

Result:

- **PASS** (`23/23`)

Covered cases:

1. valid existing link;
2. no existing link with one valid replacement;
3. no existing link with zero valid candidates and no writes;
4. non-Submission-Base XP Event repair with Submission Base exclusion;
5. stale link with canonical replacement;
6. stale link with zero valid candidates;
7. replay after repair;
8. multiple valid candidates;
9. wrong Enrollment;
10. wrong Week;
11. wrong Program Instance;
12. same athlete/week in another Program Instance;
13. missing or ambiguous Program Instance;
14. formula `Count This Submission?` returning `1` and formula `Submission Stat Mode` returning `Counted`;
15. formula `Count This Submission?` returning `0` without email readiness;
16. formula `Submission Stat Mode` returning another value without email readiness;
17. formula readiness values with ordinary whitespace/case normalization;
18. writable-checkbox contract, valid completion readiness, and unchanged readiness on errors before final validation.

## Paste instructions

1. Open the actual Airtable automation editor for `031 - Weekly Summary and Goal Logic - Find or Create Weekly Athlete Summary from Submission`.
2. Copy the script from `airtable/automations/shooting-challenge/031-weekly-summary-and-goal-logic-find-or-create-weekly-athlete-summary-from-submission.js`.
3. Paste the full Airtable docblock-through-end body into the editor, skipping the GitHub header comment.
4. Save the automation.
5. Verify the automation input variable:
   - `recordId` is dynamically mapped to the Airtable record ID from the
     triggering Submission;
   - never permanently hardcode `rec58gdymfPKKeVRI` into Automation 031.
6. Verify the trigger path supports controlled stale-link repair:
   - an empty-only trigger/view is **not sufficient** to exercise issue #96;
   - use a temporary repair view, test button path, or another controlled operator method that can run the repaired script against an already-linked Submission.

## Controlled test procedure

For Airtable's Test action after installing v3.8, `rec58gdymfPKKeVRI` may be
selected or supplied temporarily as the test record. After testing, verify the
saved Production automation input remains dynamically mapped to the triggering
Submission.

Use only:

- Existing valid Schmidt Submission `rec58gdymfPKKeVRI`
- Mike's allowlisted email

Before any Airtable mutation, state the exact source Submission, current linked summary, expected canonical summary, and any XP Event IDs expected to move.

### Test A — existing valid Schmidt Submission

Use only the existing valid Schmidt Submission `rec58gdymfPKKeVRI`. Do not
manually change formula results or intentionally alter the Submission to
exercise negative cases.

Run Airtable's Test action with that record and Mike's allowlisted email.
Verify the formulas evaluate to count `1` and stat mode `Counted`, then verify
031 checks `Build Daily Email Now?` only after final summary validation.

Use Mike's allowlisted email (`mschmidt@fairfield.k12.mt.us`) and `testMode=true`
for the controlled Production email-path test. Do not send to any other
recipient.

Expected first-run result:

- `Submissions.Weekly Athlete Summary` remains linked to the canonical Early Bird summary for the same Enrollment + Week;
- canonical `Weekly Athlete Summary.Submissions` contains the source Submission exactly once;
- no new Weekly Athlete Summary is created and no stale-link repair is induced;
- matching non-Submission-Base `XP Events` remain correctly linked without unnecessary churn;
- the Submission Base XP Event is not modified by Automation 031; Automation 010 owns that event and its summary link;
- unrelated XP Events remain untouched.

### Test B — replay after the valid run

Run the same Submission again with no other changes.

Expected replay result:

- no new Weekly Athlete Summary is created;
- `Submissions.Weekly Athlete Summary` stays on the same canonical summary;
- canonical `Weekly Athlete Summary.Submissions` does not gain duplicates;
- no XP Event link churn beyond the already-repaired canonical state;
- outputs indicate an existing valid summary path rather than a second repair.

### Offline-only negative cases

Do not manually change Production formula results to exercise count `0` or
another stat mode, and do not intentionally alter the Submission merely to
exercise them. These negative cases are covered by the offline regression:
formula count `0`, another stat-mode value, whitespace/case normalization, and
pre-final-validation failure all leave email readiness unchanged.

### Offline-only fail-closed contract case

Run this case only in the offline harness; do not alter the valid Production
Schmidt Submission to exercise it.

- the script errors/fails closed;
- the Submission keeps its current link until an operator resolves the ambiguity or missing canonical summary safely;
- no new Weekly Athlete Summary is created;
- no XP Events are reassigned.
- every affected link and backlink remains unchanged.

### Offline-only wrong-context candidate case

Run this case only in the offline harness. Do not create or alter a Production
candidate merely to exercise it.

Expected result:

- the candidate is rejected before any write;
- the stale Submission link, stale Summary backlink, and XP Event links remain unchanged;
- the script fails closed unless exactly one fully valid replacement remains.

## Expected records and fields (offline repair-contract cases)

Primary fields expected to change on a successful stale-link repair:

- `Submissions -> Weekly Athlete Summary`
- `Weekly Athlete Summary -> Submissions` on the canonical summary
- `Weekly Athlete Summary -> Submissions` on the stale summary
- `XP Events -> Weekly Athlete Summary` for matching non-Submission-Base Enrollment + Week rows that were blank or stale-linked

Fields expected to remain unchanged:

- unrelated Weekly Athlete Summary records
- unrelated XP Events for other Enrollment/Week pairs
- Submission Base XP Events owned by Automation 010
- formula Summary Key values
- Enrollment and Week ownership on the source Submission

## Rollback procedure

If the Airtable paste or controlled test fails:

1. turn Automation 031 OFF;
2. preserve the failed Submission and all output/error evidence;
3. do not change the Airtable formula or field type;
4. do not restore v3.6 or v3.7;
5. leave 031 OFF until a corrected repository version is approved;
6. do not alter formulas;
7. do not enable 077 or Make/Gmail as a rollback;
8. record the exact failing Submission ID, summary IDs, XP Event IDs, and
   output/error text before retrying.
