# Automation 041 v4.0 — PROD install and proof packet

Date: 2026-08-08  
Repository source: `airtable/automations/shooting-challenge/041-levels-and-progression-mark-enrollment-for-level-recalculation.js`  
Issue: [#118](https://github.com/Schmidt127/127-si-shooting-challenge/issues/118) / [#98](https://github.com/Schmidt127/127-si-shooting-challenge/issues/98)  
Environment: PROD Airtable `appn84sqPw03zEbTT`  
Controlled Enrollment: `recCyFEPeATOVNlr9`

## Repository contract

041 v4.0 is a deterministic queue reconciler. It computes a stable signature from:

- `Lifetime XP Total`
- `Lifetime XP Manual Adjustments`
- `Total Submissions`
- `Total Homework Completions`
- `Total Video Submissions`
- `Total Zoom Attendances`
- `Longest Streak Days`
- `School Year`
- `Active?`
- the complete `Level Gate Rules` input set
- every `Level Gate Rules` row, including school year/rule set, active state, and thresholds

When the signature differs from `Progression Last Queued Signature`, 041 sets `Level Recalc Needed?` and stores the signature. If the checkbox is already checked or the signature is unchanged, it performs no write. 041 never writes Current Level, Next Level, Level Gate Rule, or Level Status; 042 remains the sole progression-output writer.

## Required PROD schema change

Add one field to `Enrollments`:

| Field | Type | Writer |
|---|---|---|
| `Progression Last Queued Signature` | Single line text | Automation 041 v4.0 only |

Do not rename or delete existing fields. Do not add a second progression-output writer.

## Required PROD automation configuration

1. Replace the entire Automation 041 editor body with the repository file, omitting only the GitHub header if present.
2. Set the editor version/label to `v4.0`.
3. Configure the trigger as a scheduled reconciliation, preferably every 5 minutes.
4. Configure optional input variable `recordId` for controlled single-record runs. Leave it blank for the scheduled scan.
5. Keep Automation 042 as the only writer of progression outputs and the queue checkbox after processing.
6. Do not create or restore Automation 043.

## Controlled proof matrix

Use only the Schmidt test records. Capture before/after values, 041 outputs, 042 outputs, and record IDs for every case. Restore the fixture after each case unless the change is the intended final state.

| Case | Controlled change | Required result |
|---|---|---|
| A | Positive XP change | 041 queues exactly once; 042 processes |
| B | Deactivate/retire an XP Event | affected Enrollment queues |
| C | Reduce XP Points, including to zero | affected Enrollment queues |
| D | Move an XP Event Enrollment link away, then back | old and new affected Enrollments queue |
| E | Change `Lifetime XP Manual Adjustments` | Enrollment queues |
| F | Gain/loss of Submissions count without XP | Enrollment queues |
| G | Gain/loss of Homework count without XP | Enrollment queues |
| H | Gain/loss of Video count without XP | Enrollment queues |
| I | Gain/loss of effective Zoom gate evidence, including recording credit | Enrollment queues |
| J | Gain/loss of longest streak | Enrollment queues |
| K | Change an active Level Gate Rules threshold/version/rule-set value | affected Enrollment queues |
| L | Replay without changing any input | no second queue write or signature churn |
| M | Inspect 041 writes | no Current Level, Next Level, Level Gate Rule, or Level Status writes |
| N | Inspect 042 run | 042 remains the only progression-output writer |

## Acceptance evidence required before close

Record:

- Airtable field ID/type for `Progression Last Queued Signature`;
- Automation 041 editor version and trigger configuration;
- each case A–N result;
- 041 `statusOut`, `actionOut`, `debugStep`, `queuedCount`, and `scannedCount`;
- 042 output and final Enrollment values;
- confirmation that no duplicate XP or progression writer was created;
- cleanup of temporary fixtures;
- final PROD automation inventory row.

Repository tests do not constitute PROD proof. Until this packet is completed against the live editor and controlled records, Issues #118 and #98 must remain open and the Completion Master must not advance their status.
