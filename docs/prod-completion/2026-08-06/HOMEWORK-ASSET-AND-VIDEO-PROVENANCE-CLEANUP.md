# Homework Asset and Video Provenance Cleanup

Date: 2026-08-06
Environment: PROD Airtable `appn84sqPw03zEbTT`

## Scope

Audit the current Schmidt 2026-2027 homework and asset chain across Submission Assets, Homework Completions, Program Homework Assignments, and Video Feedback.

## Findings

### Malformed homework asset

Deleted Submission Asset `recoZwB1hbZ9V10PO`.

It was classified as:

- Asset Purpose: Homework 2
- Asset Slot: HW2
- Upload Status: Error
- Source Submission: `recA1YgNKTJ1LgTwF`
- Attachment: `Allegra - Name Tag Bid.pdf`

The source Submission had no Homework Name 2 assignment and no matching Homework Completion. The record was malformed test data and had no downstream dependency.

### PDF files misclassified as video feedback

Eight Submission Assets were classified as `Video For Feedback` even though their attachments were unrelated PDFs. Each asset created an empty Video Feedback record.

Examples included:

- Cut Bank Bus bill.pdf
- Dryland Property Information.pdf
- Camp-ClinicApplication_FILLABLE_20240417.pdf
- Big Sky Registration Receipt.pdf
- Location-Conformance-Permit-Application-PDF.pdf
- Thank You Article - Acantha.pdf

The eight Video Feedback records had no coach feedback, no XP Events, and no review state. The eight Video Feedback records were deleted first, followed by their eight source Submission Assets.

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

Each record now carries a confirmed source-provenance warning and has `Ran Through Cursor?` cleared.

## GitHub issue

Issue #103 — Validate asset MIME/type before creating Video Feedback or Homework Completion

Required behavior includes:

- preserve originating attachment field and slot;
- require MIME/type compatibility;
- require matching Homework Name for the same slot;
- preserve Program Homework Assignment links;
- fail closed on conflicts;
- prevent duplicate downstream writers between 013 and 112;
- add controlled valid/invalid replay tests.

## Completion status

No automation status should advance from this cleanup alone. Automations 013, 020, and 112 require code repair, Airtable editor paste, trigger verification, and controlled PROD tests.
