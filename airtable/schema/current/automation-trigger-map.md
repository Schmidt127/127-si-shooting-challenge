# Automation Trigger Map

Maps Airtable automations and extension scripts to triggers, tables, and downstream effects (XP, Make webhooks, email).

**Canonical script list:** [../../../docs/automation-index.md](../../../docs/automation-index.md)

**Base:** 127 SI Shooting Challenge (`appn84sqPw03zEbTT`)

---

## Airtable native automations (by pipeline)

### Enrollment (001–003)

| # | Table | Trigger (documented) | Script | Downstream |
|---|-------|----------------------|--------|------------|
| 001 | Enrollments | *confirm in Airtable* | `001-...-find-or-create-athlete-and-link-enrollment.js` | Athletes link, enrollment setup |
| 002 | Enrollments | *confirm in Airtable* | `002-...-assign-grade-band-initial.js` | Grade Band on enrollment |
| 003 | Enrollments | Grade changes | `003-...-assign-grade-band-if-grade-changes.js` | Grade Band update |

### Submission intake → XP (005–010, 021–023)

| # | Table | Trigger | Script | Downstream |
|---|-------|---------|--------|------------|
| 023 | Submissions | *confirm* | `023-...-assign-enrollment-to-submission.js` | Enrollment link |
| 005 | Submissions | *confirm* | `005-...-assign-week-to-submission-homework-first.js` | Week assignment |
| 007 | Submissions | *confirm* | `007-...-duplicate-checker-for-submissions.js` | Duplicate flags |
| 006 | Submissions | *confirm* | `006-...-set-video-count.js` | Video count fields |
| 021 | Submissions | *confirm* | `021-...-set-attachment-upload-status.js` | Upload status |
| 009 | Submissions | *confirm* | `009-submission-intake-create-submission-assets.js` | Submission Assets |
| **010** | Submissions | `Count This Submission?` + XP eligible | `010-submission-intake-create-xp-event.js` | **XP Events** (SHOOTING_BASE), WAS link |

### Weekly summary chain (030–034)

| # | Table | Trigger | Script | Downstream |
|---|-------|---------|--------|------------|
| **031** | Submissions | Counted submission, WAS empty | `031-...-find-or-create-weekly-athlete-summary-from-submission.js` | **Weekly Athlete Summary** create/link |
| 032 | Weekly Athlete Summary | *confirm* | `032-...-link-challenge-goal-record-to-weekly-athlete-summary.js` | Challenge Goal link |
| 033 | Weekly Athlete Summary | *confirm* | `033-...-assign-homework-to-weekly-athlete-summary.js` | Homework assignment |
| 030 | Weekly Athlete Summary | *confirm* | `030-...-copy-enrollment-grade-band-to-weekly-summary.js` | Grade Band copy |
| 034 | Weeks / WAS | *confirm* | `034-...-set-previous-week-helper-values.js` | Previous week helpers |

### Homework pipeline (020, 063–065, 070a, 071)

| # | Table | Trigger | Script | Downstream |
|---|-------|---------|--------|------------|
| **020** | Submission Assets | Homework asset ready | `020-homework-link-or-create-homework-completion.js` | Homework Completions |
| 063 | Homework Completions | *confirm* | `063-...-copy-enrollment-grade-band-to-homework-completion.js` | Grade Band |
| 064 | Homework Completions | *confirm* | `064-...-prepare-homework-xp-award.js` | XP prep fields |
| **065** | Homework Completions | Reviewed, satisfactory, XP pending | `065-...-create-homework-xp-event.js` | **XP Events** (HOMEWORK) |
| **070a** | Submission Assets | Send to Make + homework ready | `070a-...-send-homework-asset-payload-to-make.js` | **Make** upload engine |
| **071** | Homework Completions | Parent feedback ready, not sent | `071-...-send-homework-feedback-email-webhook.js` | **Make** parent email |

### Video pipeline (013, 070b, 022, 111–114, 073)

| # | Table | Trigger | Script | Downstream |
|---|-------|---------|--------|------------|
| **013** | Submission Assets | Video asset ready | `013-...-create-or-link-video-feedback.js` | Video Feedback |
| **022** | Submission Assets | Upload status + child linked | `022-...-sync-child-upload-writeback-from-submission-asset.js` | Upload writeback |
| 070b | Submission Assets | *confirm* | `070b-...-send-video-asset-payload-to-make.js` | **Make** upload engine |
| 111 | Video Feedback | *confirm* | `111-...-copy-enrollment-grade-band-to-video-feedback.js` | Grade Band |
| 112 | Submission Assets | *confirm* | `112-...-create-video-feedback-from-submission-asset.js` | Video Feedback |
| 113 | Video Feedback | *confirm* | `113-...-assign-base-video-xp.js` | Base video XP fields |
| **114** | Video Feedback | Posted, XP positive, Ready for XP | `114-...-create-or-update-video-xp-event.js` | **XP Events** (VIDEO_SUBMISSION) |
| 073 | Video Feedback | *confirm* | `073-...-send-video-feedback-parent-email-webhook.js` | **Make** parent email |

### Achievements and streaks (053–059, 066)

| # | Table | Trigger | Script | Downstream |
|---|-------|---------|--------|------------|
| 053 | Submissions / Streak Occurrences | *confirm* | `053-...-rebuild-and-upsert-from-submissions.js` | Streak Occurrence rows |
| **054** | Streak Occurrences | Source Status = Ready for XP | `054-...-create-or-repair-streak-xp-event.js` | **XP Events** (streak) |
| 055 | Submissions | *confirm* | `055-...-recalculate-current-shooting-streak-from-submission.js` | Streak rollups |
| 056 | Enrollments | *scheduled* | `056-...-refresh-current-shooting-streaks-daily.js` | Streak refresh |
| 057 | Weekly Athlete Summary | *confirm* | `057-...-calculate-perfect-week-eligibility.js` | Perfect week flags |
| 058 | Weekly Athlete Summary | *confirm* | `058-...-create-perfect-week-unlock.js` | Achievement Unlocks |
| **059** | Athlete Achievement Unlocks | Pending + Ready for 059 XP | `059-...-create-xp-event-from-achievement-unlock.js` | **XP Events** (achievement) |
| 066 | Enrollments / Submissions | *confirm* | `066-...-create-shot-milestone-unlocks.js` | Shot milestone unlocks |

### Levels (041–043)

| # | Table | Trigger | Script | Downstream |
|---|-------|---------|--------|------------|
| 041 | XP Events / Enrollments | *confirm* | `041-...-mark-enrollment-for-level-recalculation.js` | Recalc flag |
| 042 | Enrollments | *confirm* | `042-...-assign-current-and-next-level-with-gate-blocking.js` | Current/Next Level |
| 043 | Levels | *confirm* | `043-...-set-level-gate-rule-from-next-level.js` | Gate rules |

### Email packages (072, 074–077, 075)

| # | Table | Trigger | Script | Downstream |
|---|-------|---------|--------|------------|
| **072** | Weekly Athlete Summary | `Build Weekly Email Now?` | `072-...-build-weekly-summary-email-package.js` | Email package fields |
| 074 | Weekly Athlete Summary | *confirm* | `074-...-send-weekly-summary-email-package-to-make.js` | **Make** weekly email |
| 075 | Enrollments | *confirm* | `075-...-build-challenge-welcome-email.js` | Welcome email package |
| 076 | Submissions / Enrollments | *confirm* | `076-...-build-daily-submission-email-package.js` | Daily email package |
| 077 | Submissions / Enrollments | *confirm* | `077-...-send-daily-submission-email-package-to-make.js` | **Make** daily email |

### Zoom (101)

| # | Table | Trigger | Script | Downstream |
|---|-------|---------|--------|------------|
| **101** | Zoom Meetings | `Create XP Events` + ready | `101-zoom-attendance-xp-award-meeting-xp.js` | **XP Events** (meeting) |

---

## Make.com webhooks (outbound from Airtable)

| Script | Scenario / blueprint | Payload highlights |
|--------|---------------------|-------------------|
| 070a | Upload Asset Engine — homework | athlete, homework, drive URL, asset metadata |
| 070b | Upload Asset Engine — video | athlete, submission, video asset metadata |
| 071 | Homework parent feedback | homework completion, parent email fields |
| 073 | Video parent feedback | video feedback, parent email fields |
| 074 | Weekly summary email | WAS package, athlete, week |
| 077 | Daily submission email | daily package, athlete |

Blueprint: [../../../make/blueprints/upload-asset-engine-v1.json](../../../make/blueprints/upload-asset-engine-v1.json)

Docs: [../../../make/documentation/upload-asset-engine.md](../../../make/documentation/upload-asset-engine.md)

---

## Extension scripts (manual / button)

| Script | Mode | Purpose |
|--------|------|---------|
| `audit-*` (audits/) | Dry-run default | Pipeline integrity — Stages A–J |
| `backfill-*`, `repair-*`, `dedupe-*` (safe-backfills/) | `DRY_RUN` default | Historical repair |
| `export-schema.js` (schema/) | Read-only | In-base schema export |

---

## Idempotency keys

| Output | Guard |
|--------|-------|
| XP Events | Source Key / Dedupe Key per script (010, 054, 059, 065, 114) |
| Weekly summary email | `Weekly Email Sent?` / send flags |
| Parent feedback emails | Send trigger cleared only on webhook success (071, 073, 074) |
| Make upload | `Send to Make Trigger` + scenario-side dedupe |

See [field-map.md](./field-map.md) for canonical field names.

---

## Testing checklist (per automation)

1. Dry-run matching audit extension after deploy
2. Confirm no duplicate XP Events on automation retry
3. Confirm Make scenario receives expected payload ([test payloads](../../../make/test-payloads/))
4. Update [automation-index.md](../../../docs/automation-index.md) and `CHANGELOG.md`
