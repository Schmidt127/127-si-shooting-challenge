# C-025 / 117 numbering note

**Date:** 2026-07-18 (updated — Stage 17 path selected for DEV)
**See:** [C-025-stage17-zoom-recording-dev-installation-packet.md](./C-025-stage17-zoom-recording-dev-installation-packet.md) · [C025_ARCHITECTURE_RECONCILIATION.md](../v2/C025_ARCHITECTURE_RECONCILIATION.md)

Two incompatible designs reused the **117** family. **DEV now follows Stage 17 (Zoom Attendance).**

## A. Stage 17 (Zoom Attendance) — **current repo package for DEV**

| Number | File | Role |
|--------|------|------|
| **117a** | `117a-zoom-recording-normalize-recording-quiz-submission.js` | Normalize Recording Quiz ZA row |
| **117b** | `117b-zoom-recording-coach-review-and-needs-correction-handling.js` | Coach review / Needs Correction |
| **117c** | `117c-zoom-recording-create-zoom-xp-event.js` | Create/soft-void XP from `ZOOM_CREDIT\|…` |
| **117d** | `117d-zoom-recording-apply-zoom-gate-credit.js` | Gate credit via `Zoom Meetings.Attendees` |
| **117e** | `117e-zoom-recording-apply-perfect-week-credit.js` | Perfect Week roster via Attendees |
| **117f** | `117f-zoom-recording-send-approval-email.js` | Approval email (leave OFF) |

Live attendance remains **101** unchanged (`ZOOM_ATTEND_BASE|…`).

## B. S16 (Homework Completions) — **superseded for this base**

Stored under `airtable/automations/shooting-challenge/_superseded/`:

- `117a-s16-homework-completions-award-xp-SUPERSEDED.js`
- `117b-s16-homework-completions-approval-email-SUPERSEDED.js`

Historical packet: [C-025-117a-117b-dev-installation-packet.md](./C-025-117a-117b-dev-installation-packet.md) — **do not install on DEV** while Stage 17 is authoritative.

**Do not** paste S16 and Stage 17 packages side by side.
