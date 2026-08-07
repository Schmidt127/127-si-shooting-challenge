# Asset Replay and Email Safety Audit

Date: 2026-08-06
Environment: PROD Airtable `appn84sqPw03zEbTT`
Controlled Enrollment: `recCyFEPeATOVNlr9`

## Scope

Audit the current Schmidt asset, Video Feedback, homework-feedback, daily-email, and weekly-email paths after the broader Submission, Summary, XP, and Program Homework Assignment cleanup.

## Media policy clarification

Video feedback submissions may validly contain:

- video files;
- PDF files;
- image files.

MIME type alone must not reject a video-feedback submission. Validity is determined by the originating Submission field and workflow intent.

GitHub issue #103 was corrected accordingly.

## Homework slot defect

Source Submission `recA1YgNKTJ1LgTwF` had:

- an HW2 attachment;
- no Homework Name 2 assignment;
- no valid HW2 Homework Completion.

The attachment produced malformed HW2 assets twice during replay testing:

- `recoZwB1hbZ9V10PO`
- `rec2Ewo5sXeirH4FQ`

The unmatched `HW Sub 2` attachment was cleared from the Submission and the malformed asset was deleted. This stopped the recreation loop.

The decision was based on slot/assignment mismatch, not the PDF file type.

## Duplicate Submission Asset cleanup

The live asset creation path recreated eight assets with the same:

- Submission;
- source attachment ID;
- VIDEO slot.

Eight replay-generated duplicate assets were removed:

- `recpxodw5btiLxduF`
- `rec7KFO8XJ2xTPsBF`
- `recJTYx7XlzymQCFw`
- `recuGICaptyYGaykU`
- `recst7l29CZj6pL54`
- `recKnaXjw4j2SN9RP`
- `rec9FlLFqM66ckk8m`
- `recnJeoS5htfxEtKt`

Eight canonical current Schmidt video assets remain, each tied to one source attachment and one canonical Video Feedback record.

## Duplicate Video Feedback cleanup

Two overlapping writer/replay patterns were proven.

### Duplicate records for the same asset

Eight redundant Video Feedback records were deleted after confirming they had no coach feedback, XP, review state, or parent-send state:

- `recQoU7fAFenTcaze`
- `recpIOwNBq7wbH20V`
- `recLbyp6y0w1mZozz`
- `reclIftk1hZOk7vDT`
- `recyF5O5AwkIZNtzf`
- `recpyTI4klbVPosVq`
- `rec1cYn1eRkNb4GJo`
- `recNUvc2fThIWWcJt`

A second set of eight Video Feedback records linked to the replay-generated assets was also deleted before those assets were removed.

### Assetless or orphaned records

Eight additional Video Feedback records were proven invalid because they either:

- referenced a deleted replay asset through their key;
- belonged to a Submission with no Video Upload;
- duplicated valid asset-level Video Feedback for the same Submission.

The platform blocked destructive deletion, so they were retired with `Active? = false`:

- `rec0YDvZGxXEKvQFo`
- `rec8ymwEZIh77QfLw`
- `recOf0IllwZovsszR`
- `recjxApIpsNNl0mT7`
- `recwuMB968NaY3hU9`
- `recNnc5jyNZhr7aMl`
- `recU0fm1oWJWjjabv`
- `recjxoiMZ2WTRuUmW`

## Canonical writer requirement

Automations 013 and 112 must not independently create competing Video Feedback records.

Required end state:

1. one canonical asset creation identity based on Submission + originating attachment ID + slot;
2. one canonical Video Feedback identity based on Submission Asset;
3. replay updates or skips the existing record;
4. no submission-level Video Feedback record when asset-level records exist;
5. PDF/image/video files are all accepted from Video Upload.

This remains tracked in GitHub issue #103.

## Email package defects

GitHub issue #104 was created for Automations 072 and 076.

### Automation 072

The PROD inventory copy uses obsolete or absent field names, including `XP Bucket Key` and `XP Reason`, and reads assigned homework through legacy Week-to-curriculum links. It can also display configured XP as earned when no XP Event exists.

### Automation 076

The PROD inventory copy:

- sums XP without filtering `Active?`;
- reads homework through legacy curriculum Week links;
- uses the maximum of conflicting XP totals rather than reconciling them.

Retired or invalid XP could therefore reappear in parent emails.

Inventory records 072 and 076 were marked with confirmed-defect warnings and their Cursor verification flags were cleared.

## Current send safety

### Weekly summaries

Neither current Schmidt summary is queued, ready, or marked for Make handoff.

### Daily submissions

Nine current Schmidt submissions show historical handoff to Make, but recipients were the controlled testing address:

`mschmidt@fairfield.k12.mt.us`

No `Send Daily Email to Make Now?` flags remain checked.

### Homework feedback

The two controlled Perfect Week Homework Completions had `Parent Feedback Ready?` checked but no linked Submission Assets. Both had stale missing-asset send errors.

The ready flags and stale errors were cleared on:

- `recqXxlOpATQI3sD4`
- `rechzFmWrUp1tonto`

They remain controlled fixtures and cannot trigger parent-feedback sends.

## Completion status

No automation status advances from this audit.

Remaining work requires code repair, Airtable editor installation, trigger verification, Make/browser review, and controlled replay testing.
