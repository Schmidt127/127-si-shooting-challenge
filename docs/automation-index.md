# Automation index — Shooting Challenge

Production scripts: `airtable/automations/shooting-challenge/` (numbered `001`–`116`).

**C-020 test harness:** **115** v1.3 — Daily Submission + Homework + Video (**DEV verified** 2026-07-07). [upload workflow](./upload-workflow-homework-video.md), [checklist](./deploy-checklists/C-020-testing-scenarios-script-checklist.md).

**Modernization roadmap:** [v2-014-automation-modernization-roadmap.md](./v2-014-automation-modernization-roadmap.md) — master inventory, disposition, capacity plan (Phase 2).

**Wave 2A classification (complete):** [v2-014-wave-2a-classification.md](./v2-014-wave-2a-classification.md) — Category A–F + complexity for all 46 scripts.

Standard: [../airtable/automations/AUTOMATION_SCRIPT_STANDARD.md](../airtable/automations/AUTOMATION_SCRIPT_STANDARD.md)

Trigger map (downstream effects): [../airtable/schema/current/automation-trigger-map.md](../airtable/schema/current/automation-trigger-map.md)

> **Note:** Triggers marked *confirm in Airtable* have placeholder headers — verify the live automation trigger in the Airtable UI before debugging.

---

## Enrollment intake (001–003)

| # | Airtable automation name | Trigger (from script header) | File |
|---|--------------------------|------------------------------|------|
| 001 | Enrollment Intake and Setup — Find or Create Athlete and Link Enrollment | *confirm in Airtable* | `001-enrollment-intake-and-setup-find-or-create-athlete-and-link-enrollment.js` |
| 002 | Enrollment Intake and Setup — Assign Grade Band — Initial | *confirm in Airtable* | `002-enrollment-intake-and-setup-assign-grade-band-initial.js` |
| 003 | Enrollment Intake and Setup — Assign Grade Band — If Grade Changes | *confirm in Airtable* | `003-enrollment-intake-and-setup-assign-grade-band-if-grade-changes.js` |

## Submission intake and assets (005–007, 009, 010, 013, 021–023)

| # | Airtable automation name | Trigger | File |
|---|--------------------------|---------|------|
| 005 | Submission Intake — Assign Week to Submission — Homework First | *confirm in Airtable* | `005-submission-intake-and-asset-creation-assign-week-to-submission-homework-first.js` |
| 006 | Submission Intake — Set Video Count | **LIBRARY only (Phase A)** — merged into **021** | `_rollback/phase-a-006-021-2026-07-14/` + library stub `006-…-set-video-count.js` |
| 007 | Submission Intake — Duplicate Checker for Submissions | *confirm in Airtable* | `007-submission-intake-and-asset-creation-duplicate-checker-for-submissions.js` |
| 009 | Submission Intake — Create Submission Assets | *confirm in Airtable* | `009-submission-intake-create-submission-assets.js` |
| **010** | Submission Intake — Create XP Event from Submission | Submissions when `Count This Submission?` checked and XP should be awarded | `010-submission-intake-create-xp-event.js` |
| **013** | Submission Intake — Create or Link Video Feedback | Submission Assets when video asset ready for Video Feedback prep | `013-submission-intake-create-or-link-video-feedback.js` |
| 021 | Submission Intake — Set Attachment Status and Video Count | Submissions updated · watch HW/Video · Match ANY status empty/No Files OR video count empty | `021-submission-intake-and-asset-creation-set-attachment-status-and-video-count.js` (**Phase A** consolidates former 006+021) |
| **022** | Submission Intake — Sync Child Upload Writeback | Submission Assets when Upload Status is Uploaded/Processing/Error and child linked | `022-submission-intake-sync-child-upload-writeback-from-submission-asset.js` |
| 023 | Submission Intake — Assign Enrollment to Submission | *confirm in Airtable* | `023-submission-intake-and-asset-creation-assign-enrollment-to-submission.js` |

## Homework (020, 063–065, 067, 070a, 071)

| # | Airtable automation name | Trigger | File |
|---|--------------------------|---------|------|
| **020** | Homework — Link or Create Homework Completion (+ Grade Band repair; Phase C1) | Submission Assets when homework asset ready | `020-homework-link-or-create-homework-completion.js` |
| 063 | Homework Review — Copy Enrollment Grade Band to Homework Completion | **DELETED** Phase C1 | library stub · rollback `_rollback/phase-c1-020-063-2026-07-14/` |
| 064 | Homework Review — Prepare Homework XP Award | *confirm in Airtable* | `064-homework-review-and-xp-prepare-homework-xp-award.js` |
| **065** | Homework Review — Create Homework XP Event | Homework Completions when review complete, satisfactory, XP pending | `065-homework-review-and-xp-create-homework-xp-event.js` |
| **067** | Homework — Link or Create Completion from Reflection Quiz | Final Reflection Quiz Submissions when ready (created / Processing Status Pending, Enrollment set) | `067-homework-link-or-create-completion-from-reflection-quiz.js` |
| **070a** | Email — Send Homework Asset Payload to Make | Submission Assets when Send to Make Trigger checked and homework asset ready | `070a-email-notifications-and-external-handoffs-send-homework-asset-payload-to-make.js` |
| **071** | Email — Send Homework Feedback Email Webhook | Homework Completions when parent feedback ready and not yet sent | `071-email-notifications-and-external-handoffs-send-homework-feedback-email-webhook.js` |

**070a status (2026-07-12):** GitHub **v4.4**. **DEV homework upload E2E PASS** — synchronous Lambda JSON path (Make Module 16 `{{14.data}}`); **070c not required** for this path. Trigger: Send to Make Trigger checked → 070a → DEV Make → DEV Lambda → S3 → Airtable writeback; **022** synced Canonical URL to Homework Completion. Leave **070a OFF** when idle. **PROD 070a OFF.** For plain-text **`Accepted`** async path only: companion **070c** v1.1 may be required (PROD video proven). Package: [C-070a-dev-airtable-v4.4-prep.md](./deploy-checklists/C-070a-dev-airtable-v4.4-prep.md) · [C-070c-dev-homework-trigger-verify.md](./deploy-checklists/C-070c-dev-homework-trigger-verify.md) (Accepted path only).

## Weekly summary and goals (030–034)

| # | Airtable automation name | Trigger | File |
|---|--------------------------|---------|------|
| 030 | Weekly Summary — Bootstrap WAS Grade Band + Goal + Homework (Phase B; absorbs 032/033) | *confirm in Airtable* | `030-weekly-summary-and-goal-logic-bootstrap-grade-band-goal-and-homework.js` |
| **031** | Weekly Summary — Find or Create WAS from Submission | Submissions when `Count This Submission?` checked and WAS empty | `031-weekly-summary-and-goal-logic-find-or-create-weekly-athlete-summary-from-submission.js` |
| 032 | Weekly Summary — Link Challenge Goal to WAS | **DELETED** Phase B | library stub · rollback `_rollback/phase-b-030-032-033-2026-07-14/` |
| 033 | Weekly Summary — Assign Homework to WAS | **DELETED** Phase B | library stub · rollback `_rollback/phase-b-030-032-033-2026-07-14/` |
| 034 | Weekly Summary — Set Previous Week Helper Values | *confirm in Airtable* | `034-weekly-summary-and-goal-logic-set-previous-week-helper-values.js` |

## Levels and progression (041–043)

| # | Airtable automation name | Trigger | File |
|---|--------------------------|---------|------|
| 041 | Levels — Mark Enrollment for Level Recalculation | *confirm in Airtable* | `041-levels-and-progression-mark-enrollment-for-level-recalculation.js` |
| 042 | Levels — Assign Current and Next Level with Gate Blocking | *confirm in Airtable* | `042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js` |
| 043 | Levels — Set Level Gate Rule from Next Level | *confirm in Airtable* | `043-levels-and-progression-set-level-gate-rule-from-next-level.js` |

## Achievements and streaks (053–059, 066)

| # | Airtable automation name | Trigger | File |
|---|--------------------------|---------|------|
| 053 | Achievements — Streak Occurrences Rebuild from Submissions | *confirm in Airtable* | `053-achievements-and-milestones-streak-occurrences-rebuild-and-upsert-from-submissions.js` |
| **054** | Achievements — Create or Repair Streak XP Event | Streak Occurrences when Source Status is Ready for XP | `054-achievements-and-milestones-streak-occurrences-create-or-repair-streak-xp-event.js` |
| 055 | Achievements — Recalculate Current Shooting Streak from Submission | *confirm in Airtable* | `055-achievements-and-milestones-recalculate-current-shooting-streak-from-submission.js` |
| 056 | Achievements — Refresh Current Shooting Streaks Daily | *confirm in Airtable (scheduled)* | `056-achievements-and-milestones-refresh-current-shooting-streaks-daily.js` |
| 057 | Achievements — Calculate Perfect Week Eligibility | *confirm in Airtable* | `057-achievements-and-milestones-calculate-perfect-week-eligibility.js` |
| 058 | Achievements — Create Perfect Week Unlock | *confirm in Airtable* | `058-achievements-and-milestones-create-perfect-week-unlock.js` |
| **059** | Achievements — Create XP Event from Achievement Unlock | Athlete Achievement Unlocks when XP Award Status Pending and Ready for 059 XP | `059-achievements-and-milestones-create-xp-event-from-achievement-unlock.js` |
| 066 | Achievements — Create Shot Milestone Unlocks | Enrollments · Run Shot Milestone Check? | `066-achievements-and-milestones-create-shot-milestone-unlocks.js` (**v3.2** — DEV + PROD pasted 2026-07-06, GitHub `36a2e95`; [deploy checklist](./deploy-checklists/066-v3.1-dev-deploy.md)) |

## Email and Make handoffs (070b, 070c, 072–077)

| # | Airtable automation name | Trigger | File |
|---|--------------------------|---------|------|
| 070b | Email — Send Video Asset Payload to Make | Submission Assets · `Send to Make Trigger` checked · `Upload Status = Pending Link` · `Upload Destination = Video Feedback` | `070b-email-notifications-and-external-handoffs-send-video-asset-payload-to-make.js` (**v4.4**) |
| **070c** | Email — Verify Async Video Asset Upload | Submission Assets · `Upload Status = Uploaded` · `Writeback Complete?` checked · canonical/hash fields populated · `Upload Error` blank · **repurpose existing slot if at limit** | `070c-email-notifications-and-external-handoffs-verify-async-video-asset-upload.js` (**v1.1** — idempotent; `Send to Make Trigger` optional on trigger) · **Required for plain-text `Accepted` async path only**; **not required** when Make returns full Lambda JSON and 070a/070b clears trigger (DEV homework PASS 2026-07-12) |
| **072** | Email — Build Weekly Summary Email Package | Weekly Athlete Summary when `Build Weekly Email Now?` checked | `072-email-notifications-and-external-handoffs-build-weekly-summary-email-package.js` |
| 073 | Email — Send Video Feedback Parent Email Webhook | *confirm in Airtable* | `073-email-notifications-and-external-handoffs-send-video-feedback-parent-email-webhook.js` |
| 074 | Email — Send Weekly Summary Email Package to Make | *confirm in Airtable* | `074-email-notifications-and-external-handoffs-send-weekly-summary-email-package-to-make.js` |
| 075 | Email — Build Challenge Welcome Email | *confirm in Airtable* | `075-email-notifications-and-external-handoffs-build-challenge-welcome-email.js` |
| 076 | Email — Build Daily Submission Email Package | *confirm in Airtable* | `076-email-notifications-and-external-handoffs-build-daily-submission-email-package.js` |
| 077 | Email — Send Daily Submission Email Package to Make | *confirm in Airtable* | `077-email-notifications-and-external-handoffs-send-daily-submission-email-package-to-make.js` |

## Video review and XP (111–114)

| # | Airtable automation name | Trigger | File |
|---|--------------------------|---------|------|
| 111 | Video Review — Copy Enrollment Grade Band to Video Feedback | *confirm in Airtable* | `111-video-review-and-xp-copy-enrollment-grade-band-to-video-feedback.js` |
| 112 | Video Review — Create Video Feedback from Submission Asset | **OFF — monitor before delete** (legacy duplicate of **013**) | `112-video-review-and-xp-create-video-feedback-from-submission-asset.js` |
| 113 | Video Review — Assign Base Video XP | *confirm in Airtable* | `113-video-review-and-xp-assign-base-video-xp.js` |
| **114** | Video Review — Create or Update Video XP Event | Video Feedback posted, XP positive, `Ready for XP Automation?` checked | `114-video-review-and-xp-create-or-update-video-xp-event.js` |

## Asset reuse review (116)

| # | Airtable automation name | Trigger | File |
|---|--------------------------|---------|------|
| **116** | Submission Assets — Apply Asset Reuse Decision Consequences | Submission Assets · **When record updated** · watched field **`Asset Reuse Decision`** · input `recordId` | `116-submission-assets-apply-asset-reuse-decision-consequences.js` |

**DEV (2026-07-10):** **Deployed and validated** on `appTetnuCZlCZdTCT` · script `992677d` · v1.0.1 · matrix **S5A–S5L 12/12 PASS** · live **Confirmed Duplicate PASS** + **Approved Reuse reversal PASS** on asset `recF86pJTIMFoEypJ` → VF `rec20xfx0hKCCwPw2` → XP `recx2MvUh2WP0tbjO` (Source Key `VIDEO_SUBMISSION|rec20xfx0hKCCwPw2`; same row deactivated then reactivated; no duplicate XP Event). Replaced retired **008** (slot-neutral; count unchanged). [Stage 5 report](./deploy-checklists/C-023-dev-stage5-duplicate-consequences.md).

**PROD (2026-07-11):** Runtime **PASS** on Schmidt Testing fixture asset `recWZ4cHNYgbV60mL` → VF `reccXspFIiNIPMPcm` → XP `recYQ10pOoFlApmjZ` (Source Key `VIDEO_SUBMISSION|reccXspFIiNIPMPcm`; Confirmed Duplicate then Approved Reuse reversal; XP count stayed 1). Automations-table documentation row for 116 still missing (legacy 008 doc drift — not a runtime blocker). [PROD validation](./deploy-checklists/C-023-prod-automation-116-validation-2026-07-11.md). C-023 remaining work: Stage 6 / OMNI review UX / homework path after 070a — [Worker D C-023 audit](./overnight-runs/worker-results/worker-d-t4-c023-readonly-audit.md).

## Zoom (101)

| # | Airtable automation name | Trigger | File |
|---|--------------------------|---------|------|
| **101** | Zoom Attendance XP — Award Meeting XP | Zoom Meetings when `Create XP Events` checked and meeting ready to award | `101-zoom-attendance-xp-award-meeting-xp.js` |

## Zoom Recording Credit (117) — C-025 · **S20 orchestrator**

| # | Airtable automation name | Trigger (design) | File |
|---|--------------------------|------------------|------|
| **117** | Zoom Recording Credit — Orchestrator | Zoom Attendance · Recording Quiz updates | `117-zoom-recording-credit-orchestrator.js` |
| 117a–f | *(library only — **do not paste ×6**)* | — | `117a`–`117f-*.js` |

**DEV (2026-07-14 Phase A):** **117 v1.0.0** pasted DEV — **OFF**, `webhookUrl` blank, trigger not configured. Slot freed by deleting **006** after combined **021** smoke PASS. [Closeout](./overnight-runs/results/S22-phase-a-closeout.md) · [Phase B plan](./deploy-checklists/PHASE-B-WAS-bootstrap-plan.md).

---

## Pipeline stage map (audits)

| Stage | Scripts | Audit |
|-------|---------|-------|
| A — Submission intake | 023, 005, 007, 006, 021 | `audit-submission-pipeline-integrity.js` |
| B — Submission XP | 010 | `audit-xp-vs-submissions.js` |
| C — Weekly summary | 031, 032, 033, 030, 034 | `audit-submission-pipeline-integrity.js`, `audit-orphan-xp-events.js` |
| D — Assets | 009, 021 | `audit-submission-pipeline-integrity.js` |
| E — Homework upload | 020, 070a, 022, 063 | `audit-homework-completion-upload-edge-cases.js` |
| F — Homework XP + email | 064, 065, 071 | `audit-homework-pipeline-integrity.js` |
| F2 — HW17 Fillout test intake | 067 | `audit-homework17-reflection-quiz-pipeline.js` |
| G — Video upload | **013** (not 112), 070b, 022, 111 | `audit-video-pipeline-integrity.js` |
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
| **008** | *(legacy duplicate/reuse handler — pre-C-023 Stage 5)* | **Removed (DEV 2026-07-10)** | Obsolete; last run **2026-05-10**. Replaced by **116** in same automation slot — **net count unchanged**. |
| **012** | *(unknown — not in GitHub)* | **Deleted** | Mike confirmed legacy, unused. **+1 automation slot recovered.** |

## Engineering test framework (115)

| # | Airtable automation name | Trigger | File |
|---|--------------------------|---------|------|
| **115** | Engineering Test Framework — Run Testing Scenario | Testing Scenarios when **Run Test?** checked | `115-engineering-test-framework-run-testing-scenario-daily-submission.js` |

**Scenario types:** `Daily Submission`, `Homework`, `Video` (alias `Three Video Upload`) — DEV verified v1.3. [upload workflow](./upload-workflow-homework-video.md).

**Upload scripts (no new automations for naming):** **009** asset creation, **013** VF link, **070b** gated by **Upload Naming Status** formula — see upload workflow doc.

---

## Deploy workflow

1. Edit script in GitHub → commit
2. Paste docblock through end into **development** automation (skip GitHub header)
3. Test on sandbox record + run matching audit (dry-run) on **dev** base
4. Mike approves promote
5. Paste same script into **production** automation
6. Update `CHANGELOG.md` and this index if trigger/name changed

Runbook: [development-base-setup.md](./development-base-setup.md) (V2-015).
