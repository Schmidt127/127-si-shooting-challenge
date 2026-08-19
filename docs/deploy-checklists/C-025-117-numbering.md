# C-025 / 117 numbering note

**Date:** 2026-07-18  
**Updated:** 2026-08-19 — Mike paste confirms **117 v2.1** Hub Email Handoff Queue (not Make send; not XP)

**See also:** [117-zoom-recording-approval-email.md](./117-zoom-recording-approval-email.md) · [automation-index Zoom section](../automation-index.md) · [email-send-plane.md](../integrations/email-send-plane.md)

## Authoritative PROD model (overlay 2026-08-19)

Airtable has a strict automation-count limit. **Only one** Automation **117** is used in PROD:

| Function | Active owner | Airtable slot? |
|----------|--------------|----------------|
| Zoom attendance normalization (recording quiz) | **No deployed Airtable automation** (design alternatives only) | No |
| Zoom attendance credit / `ZOOM_CREDIT` XP | **No deployed Airtable automation** | No |
| Live Zoom meeting XP | **101** | Yes |
| Gate Applied? | **042** | Yes |
| Perfect Week Applied? | **057** | Yes |
| Recording approval email handoff | **Automation 117 v2.1** — creates Email Handoff Queue | Yes |
| Queue → Hub ingress | **Automation 079** | Yes |
| Email delivery | Communications Hub → **Resend** | No |
| Make/Gmail Zoom approval (**117f**) | **Historical only** | No Airtable slot |

Canonical Airtable script (filename still says Make):

`airtable/automations/shooting-challenge/117-zoom-send-recording-approval-email-to-make.js` (**v2.1** live paste / Mike 2026-08-19; older **v1.1** Make-era name is historical)

**Hard rules:**

- Do **not** paste the Stage 17 credit orchestrator into PROD Automation 117.
- Do **not** create Airtable automations 117a / 117b / 117c / 117d / 117e.
- Do **not** count design-alternative scripts as active PROD automations.
- Do **not** re-enable Make **117f** for email.

## A. Stage 17 modular package — **design alternatives only**

Stored under `airtable/automations/shooting-challenge/_design-alternatives/stage17-modular-reference/`.

| Number | File | Role |
|--------|------|------|
| ~~117~~ (orchestrator) | `117-zoom-recording-credit-orchestrator.js` | Historical combined normalize + review + `ZOOM_CREDIT` XP — **not** live PROD 117 |
| 117a | `117a-zoom-recording-normalize-recording-quiz-submission.js` | Modular normalize (reference) |
| 117b | `117b-zoom-recording-coach-review-and-needs-correction-handling.js` | Modular coach review (reference) |
| 117c | `117c-zoom-recording-create-zoom-xp-event.js` | Modular XP create/soft-void (reference) |
| 117d | `117d-zoom-recording-apply-zoom-gate-credit.js` | Gate flag only (no Attendees) |
| 117e | `117e-zoom-recording-apply-perfect-week-credit.js` | PW flag only (no Attendees) |

Live attendance remains **101** unchanged (`ZOOM_ATTEND_BASE|…`).  
**Hard rule:** recording credit designs must not write `Zoom Meetings.Attendees` (101 double-credit risk).

## B. S16 (Homework Completions) — **superseded**

Stored under `airtable/automations/shooting-challenge/_superseded/`.

**Do not** paste S16 and Stage 17 packages side by side.
