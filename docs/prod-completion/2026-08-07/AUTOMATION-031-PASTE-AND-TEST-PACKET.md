# Automation 031 Paste and Test Packet — 2026-08-07

## Scope

Focused repository package for issue #96:

- `airtable/automations/shooting-challenge/031-weekly-summary-and-goal-logic-find-or-create-weekly-athlete-summary-from-submission.js` v3.3
- offline harness: `tools/testing/tests/run_031_script.mjs`
- offline regression: `tools/testing/tests/test_031_offline.mjs`

This packet documents repository repair status only.

- Airtable installation: **unconfirmed**
- Controlled PROD live testing: **not performed**

## Airtable automation identity

- Automation number: `031`
- Exact Airtable automation name: `031 - Weekly Summary and Goal Logic - Find or Create Weekly Athlete Summary from Submission`
- Authoritative script path: `airtable/automations/shooting-challenge/031-weekly-summary-and-goal-logic-find-or-create-weekly-athlete-summary-from-submission.js`
- Repository version in this package: `v3.3`

## Repository repair completed

The v3.3 repair now:

1. validates an existing Submission -> Weekly Athlete Summary link against the current Submission Enrollment + Week + Summary Key;
2. keeps a valid existing link without churn;
3. repairs a stale Submission link to the canonical summary when exactly one safe replacement exists;
4. removes the source Submission from the stale summary when repair occurs;
5. repairs matching XP Events for the same Enrollment + Week when they are blank or still linked to the stale summary;
6. fails closed when no canonical replacement exists or duplicate canonical matches are found.

## Offline verification

Command run:

`node --test tools/testing/tests/test_031_offline.mjs`

Result:

- **PASS** (`5/5`)

Covered cases:

1. valid existing link;
2. stale link with canonical replacement;
3. stale link without canonical replacement;
4. replay after repair;
5. ambiguous canonical matches.

## Paste instructions

1. Open the actual Airtable automation editor for `031 - Weekly Summary and Goal Logic - Find or Create Weekly Athlete Summary from Submission`.
2. Copy the script from `airtable/automations/shooting-challenge/031-weekly-summary-and-goal-logic-find-or-create-weekly-athlete-summary-from-submission.js`.
3. Paste the full Airtable docblock-through-end body into the editor, skipping the GitHub header comment.
4. Save the automation.
5. Verify the automation input variable:
   - `recordId`
6. Verify the trigger path supports controlled stale-link repair:
   - an empty-only trigger/view is **not sufficient** to exercise issue #96;
   - use a temporary repair view, test button path, or another controlled operator method that can run the repaired script against an already-linked Submission.

## Controlled test procedure

Use only:

- Enrollment `recCyFEPeATOVNlr9`
- Program Instance `rec5mEM0YPqPqq0hZ`
- Week `recWeVrSabnsYaHc2`

Before any Airtable mutation, state the exact source Submission, current linked summary, expected canonical summary, and any XP Event IDs expected to move.

### Test A — stale-link repair

Prepare one controlled counted Submission on the Schmidt enrollment with:

- `Enrollment = recCyFEPeATOVNlr9`
- `Week = recWeVrSabnsYaHc2`
- `Weekly Athlete Summary` intentionally linked to a stale/wrong summary

Expected first-run result:

- `Submissions.Weekly Athlete Summary` changes to the canonical Early Bird summary for the same Enrollment + Week;
- canonical `Weekly Athlete Summary.Submissions` contains the source Submission;
- stale `Weekly Athlete Summary.Submissions` no longer contains that Submission;
- matching `XP Events` with the same Enrollment + Week and blank/stale summary linkage now link to the canonical summary;
- unrelated XP Events remain untouched.

### Test B — replay after repair

Run the same Submission again with no other changes.

Expected replay result:

- no new Weekly Athlete Summary is created;
- `Submissions.Weekly Athlete Summary` stays on the same canonical summary;
- canonical `Weekly Athlete Summary.Submissions` does not gain duplicates;
- no XP Event link churn beyond the already-repaired canonical state;
- outputs indicate an existing valid summary path rather than a second repair.

### Test C — fail-closed

Run a controlled stale-link scenario where the Submission points to a stale summary but no unique canonical summary exists for the Submission Enrollment + Week.

Expected result:

- the script errors/fails closed;
- the Submission keeps its current link until an operator resolves the ambiguity or missing canonical summary safely;
- no new Weekly Athlete Summary is created;
- no XP Events are reassigned.

## Expected records and fields

Primary fields expected to change on a successful stale-link repair:

- `Submissions -> Weekly Athlete Summary`
- `Weekly Athlete Summary -> Submissions` on the canonical summary
- `Weekly Athlete Summary -> Submissions` on the stale summary
- `XP Events -> Weekly Athlete Summary` for matching Enrollment + Week rows that were blank or stale-linked

Fields expected to remain unchanged:

- unrelated Weekly Athlete Summary records
- unrelated XP Events for other Enrollment/Week pairs
- formula Summary Key values
- Enrollment and Week ownership on the source Submission

## Rollback procedure

If the Airtable paste or controlled test fails:

1. turn the automation Off or stop further test runs immediately;
2. paste the prior repository version from `origin/master` (`031` v3.2) back into the Airtable editor;
3. on the controlled source Submission only, restore the previous `Weekly Athlete Summary` link if the repair was incorrect;
4. move any incorrectly reassigned `XP Events -> Weekly Athlete Summary` links back to their prior state for the controlled record set only;
5. confirm the canonical and stale summaries no longer contain accidental Submission link changes;
6. record the exact failing Submission ID, summary IDs, XP Event IDs, and output/error text before retrying.
