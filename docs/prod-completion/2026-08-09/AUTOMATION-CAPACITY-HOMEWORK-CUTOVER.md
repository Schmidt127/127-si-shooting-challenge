# Automation Capacity — Homework Cutover

Date: 2026-08-09

## Decision

Do **not** create Airtable automation 068 as a separate slot during the Homework Library / PHA cutover.

Automation 068 only retries one deferred condition from 067: an HW17 Homework Completion exists but its `Weekly Athlete Summary Link` is empty because the canonical Weekly Athlete Summary did not yet exist. Its reconciliation key is the Homework Completion's own exact `Enrollment + Week`; it never creates a Weekly Athlete Summary or XP Event.

## Replacement design

Absorb 068 reconciliation into Automation 033 in the next revision (target v4.2):

1. 033 already runs from a canonical Weekly Athlete Summary and has exact Enrollment + Week context.
2. After PHA-only homework assignment succeeds, 033 should look for HW17 Homework Completions matching the same exact Enrollment + Week with blank `Weekly Athlete Summary Link`.
3. Link only when the current WAS is canonical for that exact key.
4. Do not create Homework Completions, WAS records, or XP Events.
5. Existing nonblank completion-to-WAS links are never changed.
6. Fail closed on malformed/ambiguous Enrollment or Week.

Once 033 v4.2 is live and proven, `068-homework-reconcile-deferred-weekly-summary-links.js` is retained in GitHub only as historical/superseded reference and should not consume an Airtable automation slot.

## Immediate capacity recovery before deleting working email delivery

Existing modernization documentation already identifies these safe retirement candidates:

- **112** — duplicate Video Feedback create path superseded by 013. It must remain OFF and may be deleted from PROD during the maintenance window.
- **043** — superseded Level Gate helper; 042 owns gate assignment. May be retired after confirming 042 live.

These should be preferred over deleting active email delivery automations merely to free one slot.

## Email consolidation

The existing roadmap proposes a larger `071–077` Email Message Center consolidation (7 automations → 2), but that is a separate migration. Do not delete 071/073/074/075/076/077 individually until their active delivery responsibilities are migrated and proven in Communications Hub/Vercel/Resend.

## Current cutover state

- 005 v5.1 pasted in PROD.
- 033 v4.1 pasted in PROD.
- 067 v3.1 pasted in PROD.
- 068 will not be created as a standalone Airtable automation.
- Next code action: 033 v4.2 absorbs 068 deferred HW17 reconciliation.
