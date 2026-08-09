/*
Automation: 068 - Homework - Reconcile Deferred Weekly Summary Links
Status: RETIRED — DO NOT INSTALL AS AN AIRTABLE AUTOMATION
Retired: 2026-08-09

Replacement:
Automation 033 v4.2 now performs deferred Homework Completion -> Weekly Athlete Summary
reconciliation during the Weekly Athlete Summary assignment pass.

Reason:
- Airtable automation capacity is constrained.
- 068 was only a scheduled retry for Homework Completions whose Weekly Athlete Summary
  Link was empty because the canonical summary did not yet exist.
- 033 already runs with the authoritative Enrollment + Week context and can safely perform
  that reconciliation without a separate automation slot.

Safety:
This file intentionally fails fast if pasted or executed. Use 033 v4.2 instead.
*/

throw new Error(
  "Automation 068 is retired. Deferred Weekly Athlete Summary reconciliation is owned by Automation 033 v4.2."
);
