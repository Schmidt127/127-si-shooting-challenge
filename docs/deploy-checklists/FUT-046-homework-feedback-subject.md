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

## Pre-deploy (historical — completed 2026-09-01)

1. [x] GitHub **071 v4.3** and Hub template paired and deployed.
2. [x] **071 v4.3** in Production Airtable.
3. [x] Hub production Vercel deployed.
4. [x] Homework Library **Assignment Title** populated for active assignments.

## Controlled proof (historical)

DEV/Production proof completed 2026-09-01. Hub subject: `[TEST] Homework Feedback – {First Last} – {Assignment Name}` when `testMode: true`.

## Production promotion (complete — 2026-09-01)

1. [x] Mike updated Production **071 v4.3** (2026-09-01).
2. [x] Hub production deployed.
3. [x] `CHANGELOG.md` updated.

**Do not re-paste 071** unless a regression is proven.

## Out of scope

- FUT-047 contact/footer copy
- XP award, writeback, or `Parent Feedback Sent?` behavior
- Video feedback subject (separate backlog)
