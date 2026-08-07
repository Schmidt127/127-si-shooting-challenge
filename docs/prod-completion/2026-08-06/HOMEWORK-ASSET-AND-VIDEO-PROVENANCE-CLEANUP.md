# Homework Asset and Video Provenance Cleanup

Date: 2026-08-06
Environment: PROD Airtable `appn84sqPw03zEbTT`

## Scope

Audit the current Schmidt 2026-2027 homework and asset chain across Submission Assets, Homework Completions, Program Homework Assignments, and Video Feedback.

## Corrected file-type policy

Video feedback submissions may validly use:

- video files;
- PDF files;
- image files.

MIME type alone must not reject a video-feedback submission. The controlling distinction is the originating Submission field and the intended asset slot/purpose.

## Findings

### Malformed homework asset

Deleted Submission Asset `recoZwB1hbZ9V10PO`.

It was classified as:

- Asset Purpose: Homework 2
- Asset Slot: HW2
- Upload Status: Error
- Source Submission: `recA1YgNKTJ1LgTwF`
- Attachment: `Allegra - Name Tag Bid.pdf`

The source Submission had no Homework Name 2 assignment and no matching Homework Completion. This remains a valid cleanup because the defect was slot/assignment mismatch, not file type.

### Video-feedback records restored after policy correction

Eight Submission Assets originated from the designated Video Upload field and contained PDF files. They created eight Video Feedback records.

An initial audit incorrectly treated those PDF-based feedback submissions as invalid. That cleanup was fully reversed:

- the eight deleted Submission Assets were restored;
- the eight deleted Video Feedback records were restored;
- the source Video Upload attachments were restored on the affected Submissions.

These records are valid candidates for feedback because PDF and image uploads are supported in the video-feedback workflow.

## Current valid homework fixture state

The current Schmidt enrollment still has two controlled Homework Completion fixture records:

- `recqXxlOpATQI3sD4` — HW1, linked to PHA `reca5GM1JkROhXOiy`
- `rechzFmWrUp1tonto` — HW2, linked to PHA `reccQhrgOK8e8Yngv`

Both are Satisfactory and retain their existing XP evidence. Their PHA records remain inactive fixture rows and should not be reused as live schedule rows.

## Automation inventory updates

Updated PROD Automations inventory records:

- 013 — Create or Link Video Feedback
- 020 — Link or Create Homework Completion from Submission Asset
- 112 — Create Video Feedback from Submission Asset

The valid unresolved concern is source-field/slot provenance and competing downstream writers—not MIME restriction.

## GitHub issue

Issue #103 — Validate source attachment slot before creating Video Feedback or Homework Completion

Required behavior includes:

- preserve the originating Submission attachment field and slot;
- accept video, PDF, and image files from the Video Upload field;
- require matching Homework Name for the same HW1/HW2 slot;
- preserve Program Homework Assignment links;
- fail closed on source-field, slot, or assignment conflicts;
- prevent duplicate downstream writers between 013 and 112;
- add controlled valid/invalid replay tests.

## Completion status

No automation status should advance from this work alone. Automations 013, 020, and 112 require source-provenance review, Airtable editor verification, and controlled PROD replay tests.
