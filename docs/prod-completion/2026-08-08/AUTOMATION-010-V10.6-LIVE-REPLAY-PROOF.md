# Automation 010 v10.6 Live Replay Proof — 2026-08-08

## Scope

Controlled PROD replay validation of Automation 010 — Submission Intake and Asset Creation — Create XP Event from Submission.

## Controlled record

- Submission: `recElDBcFvuE6jWwc`
- Enrollment: `recCyFEPeATOVNlr9` — Schmidt, Testing - 2026-2027
- Week: `recWeVrSabnsYaHc2` — Early Bird
- Canonical Weekly Athlete Summary: `recMMeJENu6Pg8l58`
- Existing Submission Base XP Event: `recHHhpkgQS1hhIHo`

## Live Airtable editor

- Automation version confirmed in editor: **v10.6**
- Automation was turned OFF for controlled staging.
- Submission XP Award Status was temporarily staged to Pending so the trigger/action could be tested safely.

## Live action output

- debug step: `15 - Complete`
- success: `true`
- statusOut: `updated`
- actionOut: `updated_existing_xp_event`
- submissionId: `recElDBcFvuE6jWwc`
- xpEventId: `recHHhpkgQS1hhIHo`
- weeklySummaryId: `recMMeJENu6Pg8l58`
- weeklySummaryResolution: `source_valid`
- sourceKey: `SUBMISSION_XP|recElDBcFvuE6jWwc`
- candidateEventCount: `1`
- submissionSummaryLinkNeedsRepair: `false`
- totalShotsCounted: `10000`
- XP Points: `20`
- XP Source: `Submission Base`
- XP Bucket: `Shooting Base`
- XP Rule Key: `SHOOTING_BASE`

## Post-run verification

Verified directly in PROD after the action:

- Submission is `Awarded`.
- Submission remains linked to Enrollment `recCyFEPeATOVNlr9`.
- Submission remains linked to Early Bird Week `recWeVrSabnsYaHc2`.
- Submission remains linked to canonical Weekly Athlete Summary `recMMeJENu6Pg8l58`.
- Submission still links to exactly one Submission Base XP Event: `recHHhpkgQS1hhIHo`.
- XP Event remains Active.
- XP Event remains 20 XP.
- XP Event remains linked to the same Submission, Enrollment, Week, and canonical Weekly Athlete Summary.
- Source Key remains `SUBMISSION_XP|recElDBcFvuE6jWwc`.
- No duplicate Submission Base XP Event was created.

## Result

**PASS — Automation 010 v10.6 replay is idempotent for the controlled Schmidt Early Bird submission and preserves canonical summary linkage while updating the existing XP Event rather than creating a duplicate.**
