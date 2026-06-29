# Homework Flow

Flow for **assigned homework**, video upload, coach review, XP, and parent/coach communication.

## Overview

```
Coach assigns homework (Airtable)
    → Athlete completes / uploads video
    → (Optional) Airtable → Make webhook
    → Make: Google Drive storage, update Homework URL
    → Coach reviews in Airtable
    → Status → Complete triggers XP automation
    → XP Event + optional Make email
```

## Tables & Fields

See [field-map.md](../../airtable/schema/current/field-map.md):

- **Homework:** Athlete, Due Date, Status, Video URL, Coach Feedback, XP Awarded

## Status Progression

| Status | Meaning | Automation |
|--------|---------|------------|
| Assigned | Coach created row | Reminder scenarios (optional) |
| Submitted | Athlete marked done / URL set | Make may process upload |
| Reviewed | Coach added feedback | — |
| Complete | Approved | XP automation fires |

## Make.com Role

Typical scenario ([make/blueprints/](../../make/blueprints/)):

1. Receive webhook from Airtable on video URL or file metadata
2. Store file in Google Drive folder per athlete/season
3. Update Homework `{Video URL}` with share link
4. Notify coach (Gmail)

Test with [homework-submitted sample payload](../../make/test-payloads/README.md).

## XP on Completion

When Status = Complete and `{XP Awarded}` is false:

1. Create XP Event (Event Type: `Homework`, dedupe key `hw-{recordId}`)
2. Set `{XP Awarded}` true

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
- Extension audits: missing video URL, complete without XP

## Failure Modes

| Symptom | Action |
|---------|--------|
| Video in Drive, URL blank on Homework | Re-run Make or manual URL paste |
| Complete but no XP | Audit + safe backfill |
| Duplicate parent emails | Check Make filter on `eventId` and Homework flags |

## Related

- [Homework XP audits](../../airtable/extension-scripts/audits/README.md)
- [Make documentation](../../make/documentation/README.md)
