# C-025 / 117 numbering note

**Date:** 2026-07-18 (updated — single orchestrator; Attendees-write removed)
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
| **117f** | `117f-zoom-recording-send-approval-email.js` | Approval email (leave OFF) |

Live attendance remains **101** unchanged (`ZOOM_ATTEND_BASE|…`).
**Hard rule:** recording credit must not write `Zoom Meetings.Attendees` (101 double-credit risk).

## B. S16 (Homework Completions) — **superseded for this base**

Stored under `airtable/automations/shooting-challenge/_superseded/`.

**Do not** paste S16 and Stage 17 packages side by side.
