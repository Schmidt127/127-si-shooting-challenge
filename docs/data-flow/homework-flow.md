# Homework Flow

Flow for **assigned homework**, file upload (AWS/Lambda/S3), coach review, XP, and parent/coach communication.

## Overview

```
Coach assigns homework (Airtable)
    → Athlete completes / uploads file
    → Airtable 070a → Make → Lambda → private S3 writeback
    → Submission Asset gets Reviewer File URL (tokenized viewer)
    → Coach reviews in Airtable
    → Satisfactory + XP (064/065) → Parent Feedback Ready?
    → 071 sends parent feedback email payload to Make (Gmail)
```

**Parent email asset URL priority (Automation 071 v3.5+):**

```text
Reviewer File URL → Google Drive View URL → Google Drive File URL
```

- Lambda/AWS is the current primary upload path.
- Google Drive URLs remain historical fallback only.
- Filenames (`Original File Name`, `Asset Label`) are labels, not URL substitutes.
- Make marks `Parent Feedback Sent?` / `Parent Feedback Sent On` only after Gmail success.

## Tables & Fields

See [field-map.md](../../airtable/schema/current/field-map.md):

- **Homework Completions:** Enrollment, Homework, Satisfactory?, Coach Feedback, XP Events, Parent Feedback Ready?/Sent?
- **Submission Assets:** `Original File Name`, `Reviewer File URL`, legacy `Google Drive File URL` / View URL, `Asset Label`

## Status Progression

| Status | Meaning | Automation |
|--------|---------|------------|
| Assigned | Coach created row | Reminder scenarios (optional) |
| Submitted | Athlete marked done / file uploaded | 070a → Make → Lambda writeback |
| Reviewed | Coach added feedback | — |
| Awarded | XP awarded; parent email armed | 064/065 → 071 |

## Make.com Role

Typical homework **upload** scenario ([make/blueprints/](../../make/blueprints/)):

1. Receive webhook from Airtable **070a** with asset metadata
2. Call Lambda upload → private S3 + Airtable writeback (`Reviewer Access Token` / formula `Reviewer File URL`)
3. Legacy Google Drive storage may still exist on historical rows only

Homework **parent feedback** scenario (Make after **071**):

1. Receive `homework_feedback` / `HOMEWORK_FEEDBACK_PARENT` payload (`subjectOut`, `htmlOut`, `assetFiles`)
2. Send Gmail
3. On Gmail success only: check `Parent Feedback Sent?` and set `Parent Feedback Sent On`

Test with [homework-submitted sample payload](../../make/test-payloads/README.md).

## XP on Completion

When coach marks Satisfactory and review fields arm XP:

1. **064** prepares homework XP fields
2. **065** creates XP Event (`HOMEWORK_XP|{homeworkCompletionId}`) and sets Parent Feedback Ready?
3. **071** hands email payload to Make (does not mark Sent?)

Same idempotency rules as [submission → XP](./submission-to-xp-flow.md).

## Homework 17 — Fillout Test Intake

Homework 17 is completed through a Fillout test form, not a video/file upload. The Fillout
response lands in **`Final Reflection Quiz Submissions`** (auto-scored: `Score` /18,
`Target Score Met?` = `Score >= 10`). That row is **intake only** — it must become a normal
`Homework Completion` so HW17 gets the same grading / satisfactory / feedback / XP flow.

```
Fillout HW17 test → Final Reflection Quiz Submissions (auto-scored)
    → 067 (or one-time backfill) matches the row's Enrollment link
    → resolves the single active HW 17 in FBC Curriculum - SYNC + its Week
    → link-or-create ONE Homework Completion (Enrollment | Week | Homework dedupe)
       Source System = Fillout, Completion Status = Submitted, Review Status = Ready for Review
    → coach reviews like any homework (Coach Feedback + Satisfactory? + Review Complete)
    → 064 → 065 award XP (no special path, no direct/duplicate XP)
    → 071 may send without Submission Assets (quiz path)
```

Key rules:
- Matching uses the quiz row's `Enrollment` link only. Blank/ambiguous → `Processing Status = Needs Review` (never guesses the child).
- Week comes from the HW 17 curriculum record; if it cannot be resolved the row is reported, not created.
- `067` and the backfill **never** create or modify XP Events and **never** mark Satisfactory — XP stays gated behind normal coach review.

Scripts: automation `067-homework-link-or-create-completion-from-reflection-quiz.js`;
one-time backfill `airtable/extension-scripts/safe-backfills/backfill-homework17-completions-from-reflection-quiz.js`;
audit `airtable/extension-scripts/audits/audit-homework17-reflection-quiz-pipeline.js`.

## Coach Workflow (Airtable)

- View: homework due this week / awaiting review
- Open files via **`Reviewer File URL`** (not private Canonical/S3 URLs)
- Deploy / closeout for parent email: [`docs/deploy-checklists/071-homework-feedback-email-closeout.md`](../deploy-checklists/071-homework-feedback-email-closeout.md)
