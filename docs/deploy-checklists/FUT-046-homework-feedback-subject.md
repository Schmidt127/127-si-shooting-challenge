# Deploy checklist — Homework feedback email subject (FUT-046)

**Date:** 2026-09-01  
**Repos:** `127-si-shooting-challenge` (Automation **071**) + `communications` (Hub template)  
**Related:** FUT-045 (public Assignment Name) · FUT-032 (Hub writeback) · FUT-047 (contact copy — separate agent)

## Subject contract

| Mode | Example |
|------|---------|
| `testMode: true` | `[TEST] Homework Feedback – Taylor Smith – Form Shooting Reflection` |
| `testMode: false` (future live) | `Homework Feedback – Taylor Smith – Form Shooting Reflection` |

- Separator: en dash (`–`) between segments.
- Athlete: `Athlete First Name` + `Athlete Last Name` from Enrollment (fallback: `Full Athlete Name`).
- Assignment Name: FUT-045 precedence from Homework Library — **Assignment Title** → **Assignment Full Name - Display** → **Assignment Full Name**.

## Ownership

| Layer | Owner | Notes |
|-------|-------|-------|
| Payload fields | **071** | Sends `assignmentTitle`, `athleteFirstName`, `athleteLastName`, `homeworkTitle`/`homeworkLabel` (all public name) |
| Subject string | **Communications Hub** | `lib/template-candidate-renderer.js` (`HOMEWORK_FEEDBACK`) |
| `[TEST]` prefix | **Communications Hub** | `lib/welcome-processor.js` when `testMode === true` |

Hub owns subject per 071 docblock — do not duplicate subject logic in 071.

## Pre-deploy

1. Confirm GitHub **071 v4.3** and Hub template branch are paired in the integration PR.
2. Paste **071** into DEV Airtable (docblock through end; skip GitHub header).
3. Deploy Hub to DEV/staging Vercel project.
4. Confirm Homework Library rows have **Assignment Title** populated for active assignments.

## Controlled proof (DEV)

1. Pick one allowlisted Homework Completion with `Parent Feedback Ready?` checked, `Parent Feedback Sent?` unchecked, XP awarded.
2. Run **071** with `testMode: true`.
3. Confirm Email Handoff Queue payload includes:
   - `assignmentTitle` = public Assignment Name (not primary **Assignment Full Name** alone)
   - `athleteFirstName` / `athleteLastName` when present on Enrollment
4. Run **079** → Hub ingest.
5. Confirm Hub Message subject = `[TEST] Homework Feedback – {First Last} – {Assignment Name}`.
6. Confirm Resend send uses the same subject; parent email body unchanged (FUT-047 is separate).

## Production promotion

1. Mike approval on DEV proof.
2. Paste **071 v4.3** into Production Airtable automation.
3. Deploy Hub production Vercel.
4. One controlled Production send with `testMode: true` before live cutover.
5. Update `CHANGELOG.md` under **Airtable** and **Web** (Hub).

## Out of scope

- FUT-047 contact/footer copy
- XP award, writeback, or `Parent Feedback Sent?` behavior
- Video feedback subject (separate backlog)
