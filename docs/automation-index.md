# Automation index — Shooting Challenge

Production scripts: `airtable/automations/shooting-challenge/` (numbered `001`–`119`, plus `070a/b/c`, `117a–f`).

**Reliability audit (2026-07-24):** [next-wave/reliability-audit-2026-07-24/REPORT.md](./next-wave/reliability-audit-2026-07-24/REPORT.md) — trust bands, input/dedupe/ownership audits, ranked repairs, Mike actions. **Do not create a second index.**

**Reference corrections:** 012→**020**; 051/052→**053→054**; **075 is LEGACY RETIRED** (historical Enrollment welcome *build* only — not live; not Zoom XP); Zoom live XP=**101**; recording approval **email** = Automation **117 v2.1** → Email Handoff Queue → **079** → Communications Hub → **Resend** (Make 117f Gmail is historical); **WELCOME = 078A → Email Handoff Queue → 079 → Communications Hub → Resend**; recording XP credit has **no** deployed Airtable writer under slot 117. Current email plane: [integrations/email-send-plane.md](./integrations/email-send-plane.md). Legacy Enrollment fields `Parent Email Subject`, `Parent Email HTML`, `Welcome Email Status`, `Welcome Email Sent At`, `Welcome Email Error`, `Welcome Email Ready?` are retired — see [deploy-checklists/RETIRE-LEGACY-WELCOME-EMAIL-FIELDS.md](./deploy-checklists/RETIRE-LEGACY-WELCOME-EMAIL-FIELDS.md).

**C-020 test harness:** **115** v2.1 in repo and controlled PROD Homework proof passed 2026-08-10 (ETF; Homework scenarios require PHA RID). The allowlist is limited to the two approved Schmidt enrollments. Each explicit checked `Run Test?` request intentionally creates one new production-shaped Submission; an unchecked trigger is skipped. This is not an idempotent Submission processor. Daily/HW/Video Production history remains historical; the current proof does not claim full downstream or season end-to-end behavior. [upload workflow](./upload-workflow-homework-video.md), [checklist](./deploy-checklists/C-020-testing-scenarios-script-checklist.md).

**Modernization roadmap:** [v2-014-automation-modernization-roadmap.md](./v2-014-automation-modernization-roadmap.md) — master inventory, disposition, capacity plan (Phase 2).

**Wave 2A classification (complete):** [v2-014-wave-2a-classification.md](./v2-014-wave-2a-classification.md) — Category A–F + complexity for all 46 scripts.

**⛔ Obsolete `Automations` table inventory (2026-07-23):** [foundation-reset/PROD-AUTOMATION-VERSION-INVENTORY-2026-07-23.md](./foundation-reset/PROD-AUTOMATION-VERSION-INVENTORY-2026-07-23.md) — **non-authority**. Built from the pre-V2 Production `Automations` data table. Do not use for ON/OFF, versions, retirement, or contradictions. See [`CURRENT-TRUTH.md`](./CURRENT-TRUTH.md) Authority rule.

Standard: [../airtable/automations/AUTOMATION_SCRIPT_STANDARD.md](../airtable/automations/AUTOMATION_SCRIPT_STANDARD.md)

Trigger map (downstream effects): [../airtable/schema/current/automation-trigger-map.md](../airtable/schema/current/automation-trigger-map.md)

> **Note:** Triggers marked *confirm in Airtable* have placeholder headers — verify the live automation trigger in the Airtable UI before debugging.

---

## Enrollment intake (001–003)

| # | Airtable automation name | Trigger (from script header) | File |
|---|--------------------------|------------------------------|------|
| 001 | Enrollment Intake and Setup — Find or Create Athlete and Link Enrollment | *confirm in Airtable* | `001-enrollment-intake-and-setup-find-or-create-athlete-and-link-enrollment.js` |
| 002 | Enrollment Intake and Setup — Assign Grade Band — Initial | *confirm in Airtable* | `002-enrollment-intake-and-setup-assign-grade-band-initial.js` |
| **003** | Enrollment Intake and Setup — Assign Grade Band — If Grade Changes | Enrollments enter view **Automation - 003 - Grade Band Refresh Needed** (Grade Band / Grade / Athlete not empty; `Grade Band Refresh Needed = 1`); dynamic `recordId` | `003-enrollment-intake-and-setup-assign-grade-band-if-grade-changes.js` (**v2.0** — **COMPLETE / PRODUCTION-VERIFIED** 2026-09-03; keep active; initial assign = **002**; offline: `tests/enrollment-intake/automation-003-grade-change-refresh.test.js`; closeout [`prod-completion/2026-09-03/AUTOMATION-003-GRADE-CHANGE-VERIFIED.md`](./prod-completion/2026-09-03/AUTOMATION-003-GRADE-CHANGE-VERIFIED.md)) |

## Submission intake and assets (005–007, 009, 010, 013, 021–023)

| # | Airtable automation name | Trigger | File |
|---|--------------------------|---------|------|
| 005 | Submission Intake — Assign Week (Activity Date + PHA validate) | **paste v5.3 pending** | `005-submission-intake-and-asset-creation-assign-week-to-submission-homework-first.js` (**v5.3** — Homework Name 1/2 = PHA IDs; library via dereference) |
| 006 | ~~Submission Intake — Set Video Count~~ | **LEGACY RETIRED — absent from live Automations; do not restore** (SF-07 / SC-158). Presence = `Has Video?` formula; Perfect Week videos = **057** `Perfect Week Video Count`. | `006-…js` *(historical only)* · [`audits/SF-07-VIDEO-COUNT-CLOSEOUT-20260904.md`](./audits/SF-07-VIDEO-COUNT-CLOSEOUT-20260904.md) |
| 007 | Submission Intake — Duplicate Checker for Submissions | *confirm in Airtable* | `007-submission-intake-and-asset-creation-duplicate-checker-for-submissions.js` |
| 009 | Submission Intake — Create Submission Assets | **Live v1.3** (SC-160 Stage 6 Live Tested) | `009-submission-intake-create-submission-assets.js` (**GitHub v1.3** — Week optional for intake; one asset per attachment; Source Attachment ID idempotent; checklist [SC-160-009-asset-intake-decouple.md](./deploy-checklists/SC-160-009-asset-intake-decouple.md); see [HOMEWORK-ASSET-COMPLETION-RUNBOOK.md](./online-agents/homework-assets/HOMEWORK-ASSET-COMPLETION-RUNBOOK.md)) |
| **010** | Submission Intake — Create/Reconcile XP Event from Submission | Submissions when `Reconciliation Needed? = 1`, dynamic `recordId` | `010-submission-intake-create-xp-event.js` (**Production v10.12 Live** — Automations Code MCP 2026-08-29/30; do not re-paste) |
| **013** | Submission Intake — Create or Link Video Feedback | Submission Assets when video asset ready for Video Feedback prep | `013-submission-intake-create-or-link-video-feedback.js` |
| 021 | Submission Intake — Set Attachment Upload Status | *confirm in Airtable* | `021-submission-intake-and-asset-creation-set-attachment-upload-status.js` |
| **022** | Submission Intake — Sync Child Upload Writeback | Submission Assets when Upload Status is Uploaded/Processing/Error and child linked | `022-submission-intake-sync-child-upload-writeback-from-submission-asset.js` (**v2.2 Live** — Automations Code MCP 2026-08-29/30; Lambda-only parent URL; do not re-paste). |
| 023 | Submission Intake — Assign Enrollment to Submission | *confirm in Airtable* | `023-submission-intake-and-asset-creation-assign-enrollment-to-submission.js` |

## Homework (020, 064–065, 067–068, 070a, 071) — 063 retired

> **2026-07-24:** PROD baseline claims **063 deleted**. **020 v3.0.0** only *partially* replaces 063 (asset-driven Grade Band). Do not reinstall full 063. Repo file retained as historical.

| # | Airtable automation name | Trigger | File |
|---|--------------------------|---------|------|
| **020** | Homework — Link or Create Homework Completion | Submission Assets when homework asset ready — **Live v4.0** (SC-160 Stage 6 Live Tested) | `020-homework-link-or-create-homework-completion.js` (**v4.0** — HC Week = PHA.Week; Submission.Week optional; Early/Late Notes; checklist [SC-160-homework-timing-pw-020-057-065.md](./deploy-checklists/SC-160-homework-timing-pw-020-057-065.md)). Upstream assets: **009**. |
| 012 | ~~Legacy HC create~~ | **DELETED** — do not restore | — |
| 063 | ~~Homework Review — Copy Enrollment Grade Band~~ | **DELETED / RETIRED in PROD** — do not restore; repo runtime stop | `063-…js` *(historical only)* |
| 064 | Homework Review — Prepare Homework XP Award | **Production-verified current live** — prepares XP from rule `HOMEWORK_COMPLETION`; **does not create XP Event** (repo header v12.2) | `064-homework-review-and-xp-prepare-homework-xp-award.js` |
| **065** | Homework Review — Create/Reconcile Homework XP Event | `Homework XP Reconciliation Needed? = 1` — **Production v10.7 Live** (SC-160 Stage 6); Source Key `HOMEWORK_XP\|{HC ID}`; input `recordId` = **triggering HC** (dynamic); do not re-paste | `065-homework-review-and-xp-create-homework-xp-event.js` |
| **067** | Homework — Link or Create Completion from Reflection Quiz | Final Reflection Quiz Submissions when ready — **repo v3.4** | `067-homework-link-or-create-completion-from-reflection-quiz.js` |
| **068** | Homework — Reconcile Deferred Weekly Summary Links | **RETIRED / keep OFF**; 033 owns deferred WAS reconciliation | `068-homework-reconcile-deferred-weekly-summary-links.js` |
| **070a** | Send Homework Asset Payload to Make | Send to Make Trigger checked **and** homework ready — **Live v4.7** (Perfect Week test window 2026-08-21; historically intentional OFF) | `070a-…js` (**v4.7** `fetch`) |
| **070b** | Send Video Asset Payload to Make | Send to Make Trigger + video pending — **Live v4.7** | `070b-…js` (**v4.7** — Airtable Automation `fetch`; not `remoteFetchAsync`) |
| **070c** | Verify Async Video Asset Upload | Submission Assets · **`Writeback Complete?` greater than 0** (+ writeback fields; see runbook) — **ON / enabled in PROD** | `070c-…js` (**v1.1** — verifies writeback; clears `Send to Make Trigger`; does **not** upload or replace **070b**) |
| **078** | Mark Homework Parent Feedback Ready | Satisfactory? + Coach Feedback — **native Update Record (no script)** | — |
| **071** | Homework parent feedback Hub handoff | Parent Feedback Ready? and not yet sent | GitHub Hub queue create (**v4.3** — public `assignmentTitle`, athlete first/last in payload); delivery Hub → Resend via **079** |

## Weekly summary and goals (030–034)

| # | Airtable automation name | Trigger | File |
|---|--------------------------|---------|------|
| 030 | Weekly Summary — Copy Enrollment Grade Band to Weekly Summary | *confirm in Airtable* | `030-weekly-summary-and-goal-logic-copy-enrollment-grade-band-to-weekly-summary.js` |
| **031** | Weekly Summary — Find or Create WAS from Submission | Submissions when formula-backed count readiness evaluates checked and formula-backed stat mode evaluates `Simple Total` or `Detailed Shooting`; reuses or creates the canonical WAS | `031-weekly-summary-and-goal-logic-find-or-create-weekly-athlete-summary-from-submission.js` (**v4.1** — authoritative find-or-create owner; exact Enrollment/Week cardinality, formula-backed readiness inputs, writable email-readiness checkbox) |
| 032 | Weekly Summary — Link Challenge Goal to WAS | WAS with one Enrollment + Grade Band and no Goal Record | `032-weekly-summary-and-goal-logic-link-challenge-goal-record-to-weekly-athlete-summary.js` (**v3.4** — exactly one active explicit-numeric Target Goal Shots match by Program Instance record ID + Grade Band record ID; zero is valid only when configured) |
| 033 | Weekly Summary — Assign Homework to WAS | **paste v4.1 pending** — PHA-only, exact PI required | `033-weekly-summary-and-goal-logic-assign-homework-to-weekly-athlete-summary.js` (**v4.1**) |
| **035** | Weekly Summary — Create Weekly Threshold XP Events | WAS when goal completion threshold is eligible; creates threshold XP Events and updates WAS threshold status | `035-weekly-summary-and-goal-logic-create-weekly-threshold-xp-events.js` |
| 034 | Weekly Summary — Set Previous Week Helper Values | *confirm in Airtable* | `034-weekly-summary-and-goal-logic-set-previous-week-helper-values.js` |

## Levels and progression (041–043)

| # | Airtable automation name | Trigger | File |
|---|--------------------------|---------|------|
| 041 | Levels — Mark Enrollment for Level Recalculation | **Production v5.1 Live** (final 2026-08-21); optional inputs only | `041-levels-and-progression-mark-enrollment-for-level-recalculation.js` |
| 042 | Levels — Assign Current and Next Level with Gate Blocking | **v4.1.2 installed in PROD / ON** (PKG-036 complete 2026-08-15) | `042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js` |
| 043 | Levels — Set Level Gate Rule from Next Level | **Retired; absent from current Production automation inventory; do not recreate** | `043-levels-and-progression-set-level-gate-rule-from-next-level.js` |

## Achievements and streaks (053–059, 066)

> **PKG-038 status:** **COMPLETE** (Production proof passed 2026-08-16). 053 v5.5,
> 054 v5.8, **066 v3.9** (dynamic trigger live-tested 2026-08-24), and 059 v3.7 (repo; paste with 058 v1.5) are the GitHub source. Charlie Schmidt Early
> Bird path proven; audit v2.1 issueTotal = 0. **Do not retest** unless source,
> trigger, or schema changes. Resume after first regular Week closes (~May 8, 2027).

| # | Airtable automation name | Trigger | File |
|---|--------------------------|---------|------|
| 053 | Achievements — Streak Occurrences Rebuild from Submissions | Submissions updated; exact trigger must cover eligibility/identity corrections | `053-achievements-and-milestones-streak-occurrences-rebuild-and-upsert-from-submissions.js` (**v5.5** — first-create Ready handoff; **ON in PROD**) |
| **054** | Achievements — Create or Reconcile Streak XP Event | Streak Occurrences updated; exact trigger must cover Active? withdrawal and Ready/restoration | `054-achievements-and-milestones-streak-occurrences-create-or-repair-streak-xp-event.js` (**v5.8** — exact same-event lifecycle; **ON in PROD**) |
| 055 | Achievements — Recalculate Current Shooting Streak from Submission | *confirm in Airtable* | `055-achievements-and-milestones-recalculate-current-shooting-streak-from-submission.js` |
| 056 | Achievements — Refresh Current Shooting Streaks Daily | *confirm in Airtable (scheduled)* | `056-achievements-and-milestones-refresh-current-shooting-streaks-daily.js` |
| **057** | Achievements — Calculate Perfect Week Eligibility | WAS Perfect Week recalc | `057-achievements-and-milestones-calculate-perfect-week-eligibility.js` (**Live v2.5** — SC-160 early HW counts for assigned-week Perfect Week; late still excluded; SC-152 clears `Perfect Week Recalc Needed?` on writeback; Config-driven Perfect Week video minimum (SC-034); inactive enrollment and unsettled/multiple/wrong-scope goals fail closed; requires lookup parity with the linked active goal) |
| **058** | Achievements — Create Perfect Week Unlock | Lifecycle-capable WAS trigger; dynamic `recordId` | `058-achievements-and-milestones-create-perfect-week-unlock.js` (**v1.7** — SC-153 Coach Note query hotfix for withdraw; lifecycle deactivate/restore; Milestone Source Key `PERFECT_WEEK|{enr}|{week}`) |
| **059** | Achievements — Create/Reconcile XP Event from Achievement Unlock | Athlete Achievement Unlocks · **`059 Lifecycle Trigger?` = 1** only; **Do NOT filter on Ready for 059 XP** or XP Events empty | `059-achievements-and-milestones-create-xp-event-from-achievement-unlock.js` (**v3.8** — SC-159 formula trigger Live Tested; Trigger Context; Milestone Source Key; `lifecycleOut`) |
| 066 | Achievements — Create Shot Milestone Unlocks | Enrollments · Run Shot Milestone Check? | `066-achievements-and-milestones-create-shot-milestone-unlocks.js` (**v3.9** — dynamic `recordId` from trigger; **live-tested 2026-08-24**) |

## Email handoffs (070b/070c upload are not parent email)

Current parent/athlete **email delivery** is Communications Hub → **Resend**. Make.com is not the email sender (Mike 2026-08-19). [email send plane](./integrations/email-send-plane.md).

### Weekly Athlete Summary email

**Current send plane:** `118 → 072 → 119 → 074 → 079 → Communications Hub → Resend`

**Historical (2026-07-24):** `118 → 072 → 119 → 074 → Make.com → Gmail → Make.com writeback` — preserved in [WAS-WEEKLY-EMAIL-ARCHITECTURE.md](./next-wave/was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md). That Make/Gmail path is not current.

| # | Airtable automation name | Trigger / schedule | File / notes |
|---|--------------------------|--------------------|--------------|
| **118** | Email — Schedule Weekly Summary Email Build | Sunday **5:00 AM** America/Denver | `118-email-notifications-and-external-handoffs-schedule-weekly-summary-email-build.js` (**v2.0** — arms build; does not send email) |
| **072** | Email — Build Weekly Summary Email Package | WAS when `Build Weekly Email Now?` checked | `072-…-build-weekly-summary-email-package.js` — owns **`emptyWeekPolicy`** (`send_short` default); does **not** send email |
| **119** | Email — Schedule Weekly Summary Email Send | Sunday **10:00 AM** America/Denver | `119-…-schedule-weekly-summary-email-send.js` — arms send; does **not** send email |
| **074** | Email — Weekly summary Hub handoff | WAS Ready? + !Sent? + Send to Make? + package fields | `074-…-send-weekly-summary-email-package-to-make.js` — GitHub is Hub queue create (filename still says Make). **Does not send via Make/Gmail.** Current delivery is Hub → Resend. Historical 2026-07-24 Make webhook proof is evidence only. |
| **079** | Email — Send queue handoff to Communications Hub | Email Handoff Queue when Status is Ready | Shared dispatcher to Hub / Resend |
| Make (historical) | `Weekly Athlete Summary - Bulk Email - May 18` | Retired for email | Do not treat as the current sender |

**Not the email sender:** Make `Weekly Athlete Summary Updated` (WAS calculation create/update).

### Other handoffs

070a/070b/070c are **upload** paths to Make/Lambda, not parent email.

| # | Airtable automation name | Trigger | File |
|---|--------------------------|---------|------|
| 070b | Upload — Send Video Asset Payload to Make | Submission Assets · `Send to Make Trigger` checked · `Upload Status = Pending Link` · `Upload Destination = Video Feedback` | Upload path, **not parent email**. Production Automations Code **v4.7** (`fetch`). Historical C-013 proof was **v4.4** (2026-07-11). |
| **070c** | Upload — Verify Async Video Asset Upload | Submission Assets · corrected condition: **`Writeback Complete?` is greater than 0**; verifies Upload Status / Canonical / Storage Key / hashes / Uploaded At / Upload Error | `070c-…js` (**current live / repo v1.1** — **enabled in PROD**; do not invent a new version). Does **not** upload; does **not** replace **070b**. Clears **`Send to Make Trigger`** only after successful verification. Separate from **070a** homework upload. See [HOMEWORK-ASSET-COMPLETION-RUNBOOK.md](./online-agents/homework-assets/HOMEWORK-ASSET-COMPLETION-RUNBOOK.md). |
| 073 | Email — Video feedback Hub handoff | Video Feedback when Parent Feedback Ready? (**manual**) + Feedback Posted? + Coach Feedback + Parent Feedback Sent? unchecked (+ script XP/source gates) | GitHub Hub queue create (**v4.2 Live MATCH**). Delivery Hub → Resend via **079**. Does **not** write Sent?/Sent On (**open** who does). Make/Gmail do **not** send. See [HOMEWORK-ASSET-COMPLETION-RUNBOOK.md](./online-agents/homework-assets/HOMEWORK-ASSET-COMPLETION-RUNBOOK.md) |
| **078** | Email — Mark Homework Parent Feedback Ready | Homework Completions · Satisfactory? + Coach Feedback | **No script** — native Update Record only (`NO SCRIPT - UPDATE RECORD is all.` in Automations Code column). Not an email sender. |
| **078A** | Enrollment — Create WELCOME Email Handoff | Enrollments after Athlete + cleaned parent email + Program Instance | `078A-email-notifications-and-external-handoffs-enrollment-create-welcome-email-handoff.js` (**v1.5** — queue create only; optional `testMode` input default true; `WELCOME\|ENROLLMENTS\|{Enrollment Id}`; does **not** write retired 075 Enrollment fields) |
| 075 | ~~Email — Build Challenge Welcome Email~~ | **LEGACY RETIRED — absent from live Automations; do not restore** | Repo file retained as audit archive only. Live Welcome path is **078A → Email Handoff Queue → 079 → Hub → Resend**. Not Zoom XP (that is **101**). |
| **079** | Email — Send WELCOME and DAILY_SUBMISSION Handoffs to Communications Hub | Email Handoff Queue when Status is Ready — *confirm trigger in Airtable* | `079-email-notifications-and-external-handoffs-send-queue-handoff-to-communications-hub.js` (**v2.5** GitHub — shared dispatcher; preserves WELCOME validation/retry/replay and accepts exact `DAILY_SUBMISSION|SUBMISSIONS|{Submission Record ID}` keys; confirm pasted Airtable version in Automations UI) |
| **076** | Email — Create Daily Submission Communications Hub Handoff | Consumes the `Build Daily Email Now?` signal checked only by 031 after count readiness, `Simple Total`/`Detailed Shooting` mode validation, and final summary validation; 076 clears it after queue create/reuse | `076-email-notifications-and-external-handoffs-build-daily-submission-email-package.js` (**v8.12** — `xpEarned`/`xpExtraCredit` payload; requires one settled active exact Program Instance + Grade Band goal before preparing a queue; configured zero is permitted, unconfigured/lagged zero is not) |
| **077** | Email — Send Daily Submission Email Package to Make | **Retired / deleted from Production** (2026-08-13) | GitHub archive only; daily email uses Hub 076 → 079 → Resend. Do not restore Make email. |

## Video review and XP (112–114) — 111 retired; 112 must stay OFF

> **2026-07-24:** PROD baseline claims **111 deleted**. **013 v2.0** owns Video Feedback Grade Band create/repair. **112** must remain OFF (OW-D1). Repo 111 file retained as historical.

| # | Airtable automation name | Trigger | File |
|---|--------------------------|---------|------|
| 111 | ~~Video Review — Copy Enrollment Grade Band~~ | **DELETED in PROD (attest)** / replaced by **013 v2.0** | `111-video-review-and-xp-copy-enrollment-grade-band-to-video-feedback.js` *(historical)* |
| 112 | Video Review — Create Video Feedback from Submission Asset | **OFF / must stay OFF** (legacy duplicate of **013**) | `112-video-review-and-xp-create-video-feedback-from-submission-asset.js` |
| 113 | Video Review — Assign Base Video XP | *confirm in Airtable* | `113-video-review-and-xp-assign-base-video-xp.js` (**v6.4** — exactly one canonical `VIDEO_SUBMISSION` rule; inactive exact-event re-arm only) |
| **114** | Video Review — Create or Update Video XP Event | Video Feedback lifecycle reconciliation; *confirm trigger in Airtable* | `114-video-review-and-xp-create-or-update-video-xp-event.js` (**v6.1** — exact VF/source-key identity; deactivates/reactivates the same XP Event; selected-field runtime regression covered by `tests/video-feedback/video-feedback-xp-mocked-runtime.test.js`) |
| **120** | Video Review — Apply FUT-009 S3 Video Rename | Video Feedback · **Confirm S3 Video Rename** checked · Custom Video File Name valid · Submission Asset linked — **paste v1.0 pending** | `120-video-review-and-xp-apply-fut009-s3-video-rename.js` (**v1.0** — automatic Lambda `POST /fut009/rename`; CopyObject + verified writeback; CLI recovery only; **OFF until Mike disposable Production test**) |

## Zoom (101, 117)

| # | Airtable automation name | Trigger | File |
|---|--------------------------|---------|------|
| **101** | Zoom Attendance XP — Award Meeting XP | Zoom Meetings when `Zoom XP Reconciliation Needed? = 1`; dynamic `recordId`; no Create XP Events, Attendees, or Completed as primary condition | `101-zoom-attendance-xp-award-meeting-xp.js` (**v6.8** Live — SC-147 recording half-XP `ZOOM_RECORDING_CREDIT\|{Enrollment}\|{Meeting}` + live `ZOOM_ATTEND_BASE\|…` in same pass; no slot 121 — [`101-v6.8-paste-card.md`](./deploy-checklists/101-v6.8-paste-card.md); closeout [`audits/SC-147-101-V68-PRODUCTION-CLOSEOUT-20260904.md`](./audits/SC-147-101-V68-PRODUCTION-CLOSEOUT-20260904.md)) |
| **117** | Zoom — Create Zoom Recording Approval Communications Hub Handoff (**v2.1**). Automations **Name** matches Hub handoff; **Status = Live** (2026-08-21 evening Automations Code re-read). | Zoom Attendance · Satisfactory recording path | `117-zoom-send-recording-approval-email-to-make.js` — creates Email Handoff Queue only (Event Type `ZOOM_RECORDING_APPROVAL`, Template Key `ZOOM_RECORDING_APPROVED`). Does **not** write XP or call Make/Gmail/Resend. **079** → Hub → Resend. Not the Stage 17 orchestrator. Historical Make 117f: [C-025-117f-prod-zoom-recording-approval-email.md](./deploy-checklists/C-025-117f-prod-zoom-recording-approval-email.md) |
| **117f** | Historical Make workflow identifier (not an Airtable slot) | Retired for email | Do not re-enable Make Gmail for Zoom. Current send plane: [email-send-plane.md](./integrations/email-send-plane.md) |
| **Stage 17 modular / orchestrator** | Repository design alternatives — **not** PROD Airtable automations | Prefer consolidated paths; do **not** create 117a–e slots (automation-count limit) | `_design-alternatives/stage17-modular-reference/` · [numbering note](./deploy-checklists/C-025-117-numbering.md) |
| **121 (design artifact)** | ~~Zoom Recording Credit — Award Half XP~~ — **superseded by 101 v6.7** | Not installable — automation capacity full | `drafts/sc-147-slot-121-design-artifact-not-production.js` (audit only) |

**Airtable automation-count constraint:** Use consolidated automations where practical. Repository-only modular alternatives must not be represented as active PROD automations. The active canonical automation directory must distinguish deployed scripts from archived/design alternatives.

Live attendance XP remains **101**. **SC-147** recording half-XP is **Production-complete on 101 v6.8** (no slot **121**). Recording approval email remains **117** (email only). Closeout: [`audits/SC-147-101-V68-PRODUCTION-CLOSEOUT-20260904.md`](./audits/SC-147-101-V68-PRODUCTION-CLOSEOUT-20260904.md).

C-025 historical Stage 17 packets: [deploy-checklists/C-025-stage17-zoom-recording-production-installation-packet.md](./deploy-checklists/C-025-stage17-zoom-recording-production-installation-packet.md). Architecture history: [v2/C025_ARCHITECTURE_RECONCILIATION.md](./v2/C025_ARCHITECTURE_RECONCILIATION.md). Historical Make approval-email path (not current): [C-025-117f-prod-zoom-recording-approval-email.md](./deploy-checklists/C-025-117f-prod-zoom-recording-approval-email.md). Current email delivery: [integrations/email-send-plane.md](./integrations/email-send-plane.md).

---

## Asset reuse review (116)

| # | Airtable automation name | Trigger | File |
|---|--------------------------|---------|------|
| **116** | Submission Assets — Apply Asset Reuse Decision Consequences | Submission Assets · **When record updated** · watched field **`Asset Reuse Decision`** · input `recordId` | `116-submission-assets-apply-asset-reuse-decision-consequences.js` |

**Production (2026-07-10):** **Deployed and validated** on `appn84sqPw03zEbTT` · script `992677d` · v1.0.1 · matrix **S5A–S5L 12/12 PASS** · live **Confirmed Duplicate PASS** + **Approved Reuse reversal PASS** on asset `recF86pJTIMFoEypJ` → VF `rec20xfx0hKCCwPw2` → XP `recx2MvUh2WP0tbjO` (Source Key `VIDEO_SUBMISSION|rec20xfx0hKCCwPw2`; same row deactivated then reactivated; no duplicate XP Event). Replaced retired **008** (slot-neutral; count unchanged). [Stage 5 report](./deploy-checklists/C-023-production-stage5-duplicate-consequences.md).

---

## Pipeline stage map (audits)

| Stage | Scripts | Audit |
|-------|---------|-------|
| A — Submission intake | 023, 005, 007, 006, 021 | `audit-submission-pipeline-integrity.js` |
| B — Submission XP | 010 | `audit-xp-vs-submissions.js` |
| C — Weekly summary | 031, 032, 033, 030, 034 | `audit-submission-pipeline-integrity.js`, `audit-orphan-xp-events.js` |
| D — Assets | 009, 021 | `audit-submission-pipeline-integrity.js` |
| E — Homework upload | 020, 070a, 022 *(063 retired)* | `audit-homework-completion-upload-edge-cases.js` |
| F — Homework XP + email | 064, 065, 071 | `audit-homework-xp-pipeline-integrity.js` (XP authority); 071 email separate |
| F2 — HW17 Fillout test intake | 067 | `audit-homework17-reflection-quiz-pipeline.js` |
| G — Video upload | **013** (not 112; 111 retired), 070b, 022, **120** (FUT-009 rename) | `audit-video-pipeline-integrity.js` |
| H — Video XP + email | 113, 114, 073 | `audit-video-xp-pipeline-integrity.js` |
| I — Achievements | 053–059, 066 | `audit-achievement-xp-pipeline-integrity.js` |
| J — Legacy cleanup | — | `audit-field-coverage-report.js`, `audit-legacy-cleanup-candidates.js` |

Full audit order: [../airtable/extension-scripts/audits/README.md](../airtable/extension-scripts/audits/README.md)

## Extension scripts (manual)

| Folder | Purpose |
|--------|---------|
| `airtable/extension-scripts/audits/` | Dry-run pipeline audits (Stages A–J) |
| `airtable/extension-scripts/safe-backfills/` | Controlled repairs with `DRY_RUN` / `CONFIRM_WRITE` gates |
| `airtable/extension-scripts/schema/` | In-base schema export |

## Retired automations (no GitHub file)

| # | Name | Status | Notes |
|---|------|--------|-------|
| **008** | *(legacy duplicate/reuse handler — pre-C-023 Stage 5)* | **Removed (Production 2026-07-10)** | Obsolete; last run **2026-05-10**. Replaced by **116** in same automation slot — **net count unchanged**. |
| **012** | *(unknown — not in GitHub)* | **Deleted** | Mike confirmed legacy, unused. **+1 automation slot recovered.** |

## Engineering test framework (115)

| # | Airtable automation name | Trigger | File |
|---|--------------------------|---------|------|
| **115** | Engineering Test Framework — Run Testing Scenario | Testing Scenarios when **Run Test?** checked — **repo v2.1** (authorized enrollment allowlist; Homework → PHA RID on Submission.Homework Name 1) | `115-engineering-test-framework-run-testing-scenario-daily-submission.js` (**v2.1**) |

**Scenario types:** `Daily Submission`, `Homework`, `Video` (alias `Three Video Upload`) — Production verified v1.3. [upload workflow](./upload-workflow-homework-video.md).

**Upload scripts (no new automations for naming):** **009** asset creation, **013** VF link, **070b** gated by **Upload Naming Status** formula — see upload workflow doc.

---

## Deploy workflow

1. Edit script in GitHub → commit
2. Paste docblock through end into **development** automation (skip GitHub header)
3. Test on sandbox record + run matching audit (dry-run) on **production** base
4. Mike approves promote
5. Paste same script into **production** automation
6. Update `CHANGELOG.md` and this index if trigger/name changed

Runbook: [production-base-setup.md](./production-base-setup.md) (V2-015).

---

## Reliability Command Center (repository audits)

Offline workflow-health audits (fixtures / exports) — complements in-base `airtable/extension-scripts/audits/*`. Does **not** add Airtable automations.

| Tool | Path |
|------|------|
| Shared library | `lib/reliability-command-center/` |
| CLI | `node tools/reliability-command-center/cli.js --fixture <path>` |
| Dry-run repair preview | `node tools/reliability-command-center/repair-preview.js --record-ids rec…` |
| Tests | `node tests/reliability-command-center/run-all.js` |
| Docs | [reliability-command-center/README.md](./reliability-command-center/README.md) |
