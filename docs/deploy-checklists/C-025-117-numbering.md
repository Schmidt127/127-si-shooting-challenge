# C-025 / 117 numbering note

**Date:** 2026-07-18 (updated 2026-07-20 — PROD Make 117f approval-email path documented)
**See:** [C-025-stage17-zoom-recording-dev-installation-packet.md](./C-025-stage17-zoom-recording-dev-installation-packet.md)

Two incompatible designs reused the **117** family. **DEV follows Stage 17 (Zoom Attendance).**

## A. Stage 17 — **current DEV package**

| Number | File | Role |
|--------|------|------|
| **117** | `117-zoom-recording-credit-orchestrator.js` | **DEV paste target (v1.1.0)** — normalize + review + XP + gate/PW flags; **never** writes `Attendees` |
| **117a** | `117a-zoom-recording-normalize-recording-quiz-submission.js` | Modular normalize (reference) |
| **117b** | `117b-zoom-recording-coach-review-and-needs-correction-handling.js` | Modular coach review (reference) |
| **117c** | `117c-zoom-recording-create-zoom-xp-event.js` | Modular XP create/soft-void (reference) |
| **117d** | `117d-zoom-recording-apply-zoom-gate-credit.js` | Gate **flag only** (no Attendees) — downstream gap vs 042 |
| **117e** | `117e-zoom-recording-apply-perfect-week-credit.js` | PW **flag only** (no Attendees) — downstream gap vs 057 |
| **117f** | `117f-zoom-recording-send-approval-email.js` | Approval email script package (DEV); Make workflow id **117f** |
| **117 → Make 117f (PROD)** | [C-025-117f-prod-zoom-recording-approval-email.md](./C-025-117f-prod-zoom-recording-approval-email.md) | Airtable **117** posts to Make scenario `… - 117f - v1`; Data Store `C025_117f_PROD_SendKeys`; **tested, not documented fully live** |

Live attendance remains **101** unchanged (`ZOOM_ATTEND_BASE|…`).
**Hard rule:** recording credit must not write `Zoom Meetings.Attendees` (101 double-credit risk).

## B. S16 (Homework Completions) — **superseded for this base**

Stored under `airtable/automations/shooting-challenge/_superseded/`.

**Do not** paste S16 and Stage 17 packages side by side.
