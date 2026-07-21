# C-025 Stage 17 — Automation readiness

> **⚠️ SUPERSEDED — HISTORICAL READINESS PACKAGE (resolved 2026-07-20).** The "PROD schema still blocked" status below no longer holds: the schema was migrated and Stage 17 recording **credit** is **COMPLETE in PROD** (Airtable Automation **117** v1.1.1 / **057** v1.3 / **042** v3.1 ON; **101** unchanged). The automation map still documents the modular 117a–f reference package (use the **117 orchestrator** in production). The 117f row previously listed a **wrong** send-key prefix (`ZOOM_REC_APPROVAL`, three-part) — the canonical key is the four-part `ZOOM_REC_EMAIL|{EnrollmentRID}|{ZoomMeetingRID}|{ZoomAttendanceRID}` (corrected below). Retained for historical evidence. **Authoritative current state:** [Stage 17 current PROD progress](../status/C-025-stage17-current-prod-progress.md) · credit evidence [prod-live](./C-025-stage17-prod-live-2026-07-20.md) · email workflow [PROD 117f](./C-025-117f-prod-zoom-recording-approval-email.md).

**Status:** Repository readiness package (historical). Original verdict: PROD schema blocked (Zoom Attendance missing); automations OFF; do not install 115 in PROD. **Now resolved — see banner above.**

**CONFIRMED (historical, pre-migration):** At authoring time Production lacked the `Zoom Attendance` table and the recording XP Source option. Both have since been created in PROD. See [schema gap analysis](./C-025-stage17-prod-schema-gap-analysis.md), [implementation checklist](./C-025-stage17-prod-implementation-checklist.md), and [isolated smoke test](./C-025-stage17-prod-smoke-test.md).

**ASSUMPTION / operator verification required:** Existing deployed Automation 101 is the current unchanged live path and is ON. Confirm its installed text/version in Airtable before any production work; the Automations API did not establish that fact.

## Release rules

| Rule | Requirement |
|---|---|
| Schema gate | Complete the Stage 17 schema, select choices, Config values, formula rebuild, and read-only re-audit with zero critical blockers before any paste. |
| 101 safety | Keep the live path unchanged. It may remain ON only if it is already operating normally; do not use recording rows to alter `Zoom Meetings.Attendees`. |
| Stage 17 safety | Paste 117, 057, and 042 OFF. Enable only for the prescribed isolated smoke window. |
| Package choice | Use 117 v1.1.1 **or** modular 117a–f, never both concurrently. The orchestrator is preferred under DEV slot limits. |
| Ledger safety | Never rewrite or delete historical live `ZOOM_ATTEND_BASE|…` XP. Correct new recording errors with `Active? = false`. |
| ETF boundary | 115 v1.8 is DEV-only; never paste or install it in PROD. |

## Automation map

| # / name | Trigger table / type / conditions | Inputs | Script / version | Tables read | Tables written | Required fields / dedupe | Expected outputs / error behavior |
|---|---|---|---|---|---|---|---|
| **101 — Zoom Attendance XP — Award Meeting XP** | `Zoom Meetings`; record matches: `Create XP Events` checked, `Attendees`, `Week`, `Zoom Meeting Key` nonempty, `Meeting Status=Completed` | `recordId` required | `101-zoom-attendance-xp-award-meeting-xp.js` v5.5 | Zoom Meetings, Enrollments, XP Reward Rules, XP Events, WAS | XP Events; WAS if absent; meeting award/status fields | Attendees, reward rules; `ZOOM_ATTEND_BASE\|{meetingKey}\|{enrollmentId}` | `statusOut=created|updated|skipped|error`; live XP; errors to output/meeting error when available. |
| **117 — Zoom Recording Credit — Orchestrator** | `Zoom Attendance`; Record matches: Method `Recording Quiz`, Enrollment + Meeting nonempty | `recordId` required; `webhookUrl` optional (blank = no email); `dryRun` optional (opt-in; no writes) | `117-zoom-recording-credit-orchestrator.js` v1.1.1 | ZA, Zoom Meetings, XP Events | ZA normalization/review fields; XP Events; email timestamp only if configured (skipped when dryRun) | credit/review/amount/conflict fields; `ZOOM_CREDIT\|{Enrollment RID}\|{Zoom Meeting RID}` | `statusOut`, `errorOut`, `debugStep`, XP/gate/PW/email actions, `attendeesWriteAttempted=false`, `dryRunOut`, `intendedWritesOut`; skips invalid/ineligible rows. |
| **117a — Normalize Recording Quiz Submission** | `Zoom Attendance`; exact production condition must be configured to target Recording Quiz rows | `recordId` required | `117a-zoom-recording-normalize-recording-quiz-submission.js` v1.1.0 | ZA | ZA | Method, Enrollment, Meeting, RIDs, review status; Enrollment+Meeting identity | Standard `statusOut/errorOut/debugStep/actionOut`; initializes blank review to `Needs Review`. |
| **117b — Coach Review / Needs Correction** | `Zoom Attendance`; exact trigger condition must target reviewed Recording Quiz rows | `recordId` required | `117b-zoom-recording-coach-review-and-needs-correction-handling.js` v1.1.0 | ZA | ZA | review status, satisfactory, correction fields | Standard outputs; `Needs Correction` clears satisfactory; no credit-key change. |
| **117c — Create Zoom XP Event** | `Zoom Attendance`; `Zoom Credit Approved?` and `Zoom XP Amount > 0` | `recordId` required | `117c-zoom-recording-create-zoom-xp-event.js` v1.1.0 | ZA, Zoom Meetings, XP Events | XP Events (`Active?` soft-void on loss of approval/conflict) | credit key, approval/conflict, amount, Enrollment, Meeting; `ZOOM_CREDIT\|…` | Standard outputs plus XP id/points/source key; recheck-before-create. |
| **117d — Apply Zoom Gate Credit** | `Zoom Attendance`; optional diagnostic-only modular run | `recordId` required | `117d-zoom-recording-apply-zoom-gate-credit.js` v1.2.0 | ZA | None (observation-only) | approved, conflict, gate-earned/applied fields | Standard outputs; reports eligibility only. **042 owns `Gate Credit Applied?`.** |
| **117e — Apply Perfect Week Credit** | `Zoom Attendance`; optional diagnostic-only modular run | `recordId` required | `117e-zoom-recording-apply-perfect-week-credit.js` v1.2.0 | ZA | None (observation-only) | approved, conflict, PW effective/applied fields | Standard outputs; reports eligibility only. **057 owns `Perfect Week Credit Applied?`.** |
| **117f — Send Approval Email** (Airtable automation name `117 — Zoom — Send Recording Approval Email to Make`; Make identifier **117f**) | `Zoom Attendance`; exact trigger must target satisfactory eligible recording rows | `recordId`, `webhookUrl`, `enrollmentRid`, `zoomMeetingRid` | `117f-zoom-recording-send-approval-email.js` **v1.1** | ZA / Enrollments / Zoom Meetings (read only via Make) | **None** — script writes **no** Airtable records; Make owns send/dedupe (Data Store `C025_117f_PROD_SendKeys`) | satisfactory/approval/conflict, effective email config; canonical four-part send key `ZOOM_REC_EMAIL\|{EnrollmentRID}\|{ZoomMeetingRID}\|{ZoomAttendanceRID}` | Outputs `makeStatus` (`sent`\|`already_sent`), `sendKey`, `zoomAttendanceId`; blank webhook skips safely. |
| **057 — Calculate Perfect Week Eligibility** | `Weekly Athlete Summary`; automation condition `Perfect Week Calculation Queue? = 1` | `recordId` required | `057-achievements-and-milestones-calculate-perfect-week-eligibility.js` v1.3 | WAS, Submissions, Homework Completions, Video Feedback, Zoom Meetings, ZA, Weeks | WAS helper/status fields; qualifying ZA `Perfect Week Credit Applied?` | recording must be approved, non-conflicting, effective PW, not Needs Correction; live wins by meeting | Computes helper status; no unlock; error status/error field on failure. |
| **042 — Assign Current / Next Level with Gate Blocking** | `Enrollments`; enters view `042 - Needs Level Assignment`, filter `Level Recalc Needed?` checked | `recordId` required | `042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js` v3.1 | Enrollments, Levels, Level Gate Rules, Zoom Meetings, ZA | Enrollment level/status/recalc fields; qualifying ZA `Gate Credit Applied?` | recording approved, non-conflicting, gate-earned, not Needs Correction; live wins by meeting | `statusOut`, level/gate outputs; status `Assigned`, `Gate Blocked`, or `Error`. |
| **115 — Engineering Test Framework** | `Testing Scenarios`; `Run Test?` checked | `recordId` required | `115-engineering-test-framework-run-testing-scenario-daily-submission.js` v1.8 | Testing Scenarios, Enrollments, Submissions; C-025 also WAS, ZA, Zoom Meetings, goals | Testing Scenarios; controlled synthetic Submissions; C-025 trigger fields | Testing Scenarios table and DEV allowlist; scenario/run state | `statusOut/actionOut/errorOut/debugStep`; clears C-025 run flag. **DEV only; table absent in PROD.** |

## Confirmed field and outcome controls

| Control | Confirmed requirement |
|---|---|
| Live XP | Base rule `ZOOM_ATTEND_BASE=60`; live key `ZOOM_ATTEND_BASE\|{meetingKey}\|{enrollmentId}`. |
| Recording XP | 50% × 60 = **30**; bucket `Zoom Attendance`; source `Zoom Meeting Recording Quiz`; date `XP Activity Date`. |
| Conflict | When live and recording exist for an Enrollment + Meeting, the conflict formula suppresses recording approval; live wins. |
| Non-write | The recording path never writes `Zoom Meetings.Attendees`. |
| Consumption flags | Only 042 sets `Gate Credit Applied?` after counting; only 057 sets `Perfect Week Credit Applied?` after counting. |

## Paste sources

- [117 v1.1.1 paste packet](./C-025-stage17-117-orchestrator-v1.1.1-PASTE.txt)
- [057 v1.3 paste packet](./C-025-stage17-057-perfect-week-v1.3-PASTE.txt)
- [042 v3.1 paste packet](./C-025-stage17-042-level-gates-v3.1-PASTE.txt)
- [115 v1.8 paste packet — DEV only](./C-025-stage17-115-etf-v1.8-PASTE.txt)

## First script after schema completion

**CONFIRMED (enable-order):** After schema + select choices + Config values pass re-audit, the first automation script Mike should paste (still **OFF**) is **117 — Zoom Recording Credit — Orchestrator v1.1.1**. Do not enable it until S0 formula checks pass. Continue schema Step 6A field work (`Zoom Attendance.Calculated Recording Quiz Deadline` lookup) before any enablement.

**Offline contracts:** `node airtable/automations/shooting-challenge/lib/c025-stage17-zoom-attendance.test.js`
