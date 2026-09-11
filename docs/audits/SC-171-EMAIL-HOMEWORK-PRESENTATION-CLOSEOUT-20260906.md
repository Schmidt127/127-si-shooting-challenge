# SC-171 — Daily Submission + Homework Feedback presentation closeout (2026-09-06)

**Status:** **GitHub ready / PENDING Production paste + Hub deploy + live verify**  
**Backlog:** SC-171  
**Production base:** `appn84sqPw03zEbTT` (no DEV base)  
**Repos:** `Schmidt127/127-si-shooting-challenge` · `Schmidt127/communications`

> **Operator pointer (2026-09-11):** Paste bundles and ordered steps live in [`deploy-checklists/TIER-1-LAUNCH-OPS-RUNBOOK-20260911.md`](../deploy-checklists/TIER-1-LAUNCH-OPS-RUNBOOK-20260911.md). GitHub versions advanced to **076 v8.14** and **071 v4.5** (includes Structured Curriculum HC-only path).

---

## Summary

Parent-facing email and homework-feedback presentation corrections without changing XP award logic, homework identity, or unrelated email paths.

| Area | Change |
|---|---|
| Daily Submission email | Remove Extra Credit XP and Shooting Percentage; fix stale shooting streak |
| Homework Feedback email | Remove Program/slot clutter; prominent assignment name; Submitted/Reviewed dates; Homework Files Uploaded; View Athlete Details CTA |
| Automations | **076 v8.14** (streak + payload trim + `athleteFirstName`) · **071 v4.5** (dates + athlete profile URL + Structured Curriculum HC-only path) |
| Hub templates | `daily-submission-email.js` · `homework-feedback-email.js` · `formatParentFacingDate()` |

---

## Root cause — repeated “11 Day Shooting Streak”

**Symptom:** Three consecutive Daily Submission emails all showed ~**11 Day Shooting Streak** instead of 11 → 12 → 13.

**Cause:** Automation **076** read `Enrollments.Current Shooting Streak` at handoff-build time. That field is updated by Automation **055** (recalculate streak from submissions). When **076** ran before **055** finished (or on a stale rollup), the email carried yesterday’s enrollment snapshot — not the post-submission active streak.

**Fix:** **076 v8.14** computes `currentStreak` deterministically from all **counted** Submission `Activity Date` values for the enrollment, using logic aligned with **055** (anchor = most recent counted date; streak active if anchor is today, yesterday, or future per rules; broken/missed → 0). Does **not** use `Longest Streak Days` or enrollment rollup at send time.

**Authoritative streak source after fix:** `computeCurrentShootingStreakFromSubmissions()` in **076** (inline; mirrored in `airtable/automations/shooting-challenge/lib/shooting-streak-from-submissions.js` for tests).

---

## Daily Submission — before / after (presentation)

| Before | After |
|---|---|
| Activity Date | Activity Date |
| Week Date Range | Week Date Range |
| Shots Submitted | Shots Submitted |
| XP Earned | XP Earned |
| Extra Credit XP | *(removed)* |
| Shooting Percentage (simple mode) | *(removed)* |
| Current Day Streak | Current Day Streak *(computed fresh)* |
| Levels, homework, XP CTA | Unchanged |

**Payload fields removed from 076 handoff `data`:** `xpExtraCredit`, `shootingPercentage`. Shared contracts may still accept legacy keys; Hub template ignores them for display.

---

## Homework Feedback — before / after (presentation)

| Before | After |
|---|---|
| Program | *(removed from display)* |
| Week | Week |
| Assignment (inline) | **Prominent Assignment Name** (FUT-045 canonical title) |
| Homework slot (HW1/HW2) | *(removed)* |
| Result | Result |
| — | **Submitted Date** |
| — | **Reviewed Date** |
| Coach Feedback | Coach Feedback (quotation styling preserved) |
| Homework XP | Homework XP |
| “Submitted Work” + file links | **Homework Files Uploaded** + file links |
| “View Submitted Homework” → reviewer file | **View Athlete Details** → public athlete profile |

**Date sources (071 v4.5):**

| Label | Airtable field | Homework Completions |
|---|---|---|
| Submitted Date | `Submission Date` | HC submission date (canonical completion contract) |
| Reviewed Date | `Reviewed At` | Coach review timestamp |

**Athlete CTA:** `buildAthleteProfileUrl()` when `Public Profile Enabled` + `Public Profile Slug` → `https://www.fairfieldbasketballclub.com/shoot/athletes/{slug}`. Fallback: homework page URL when profile unavailable.

Backend payload may still include `programName` / `homeworkSlot` for contract compatibility; Hub template does not render them.

---

## Explicit non-claims

- No change to XP amounts, SUBMISSION_XP, homework XP, Extra Credit award rules, Perfect Week, or Game Log presentation.
- Extra Credit removed **only** from Daily Submission email surface.
- Shooting Percentage removed **only** from Daily Submission email surface.
- No DEV environment created or required.
- No real family emails sent during development (render/preview tests only).

---

## Tests (repo)

| Suite | Result |
|---|---|
| `shooting-streak-from-submissions.test.js` | PASS — day 1→1, 2→2, 11/12/13 sequence, missed day→0, longest≠current, replay-safe |
| `automation-076-offline.test.mjs` | PASS — no xpExtraCredit/shootingPercentage; stale enrollment 11 + two days → streak 2 |
| `sc-171-daily-submission-presentation.test.mjs` | PASS |
| `homework-video-feedback-email.test.mjs` | PASS — SC-171 homework presentation |
| `communications` daily + homework template tests | PASS (175/175) |
| `welcome-source-contract.test.mjs` | PASS — Extra Credit absent from daily render |

---

## Live verification (PENDING)

Post-purge transactional tables are empty. Live proof requires disposable Schmidt test records + Hub test allowlist only.

Checklist: [`../deploy-checklists/SC-171-email-homework-presentation.md`](../deploy-checklists/SC-171-email-homework-presentation.md)

| Check | Status |
|---|---|
| Paste **076 v8.14** to Production Airtable | Pending — [`TIER-1-LAUNCH-OPS-RUNBOOK-20260911.md`](../deploy-checklists/TIER-1-LAUNCH-OPS-RUNBOOK-20260911.md) |
| Paste **071 v4.5** to Production Airtable | Pending — same runbook |
| Deploy Communications Hub templates | Pending |
| Daily Submission render: no Extra Credit, no Shooting %, streak increments | Pending |
| Homework Feedback: no Program/slot, dates, Homework Files Uploaded, View Athlete Details | Pending |
| Public `/shoot/athletes/{slug}` 200 for test athlete | Pending |

---

## Files changed

**Shooting Challenge:** 076 v8.14, 071 v4.5, `lib/shooting-streak-from-submissions.js`, email contract tests, runtime test 076.

**Communications:** `emails/daily-submission-email.js`, `emails/homework-feedback-email.js`, `emails/lib/formatters.js`, template tests, `docs/contracts/DAILY_SUBMISSION_v1.md` (presentation note).
