# Automation index — Shooting Challenge

Production scripts: `airtable/automations/shooting-challenge/` (numbered `001`–`119`, plus `070a/b/c`, `117a–f`).

**Reliability audit (2026-07-24):** [next-wave/reliability-audit-2026-07-24/REPORT.md](./next-wave/reliability-audit-2026-07-24/REPORT.md) — trust bands, input/dedupe/ownership audits, ranked repairs, Mike actions. **Do not create a second index.**

**Reference corrections:** 012→**020**; 051/052→**053→054**; 075 is Welcome Email **build**; Zoom live XP=**101**; recording approval **email** = Automation **117 v2.1** → Email Handoff Queue → **079** → Communications Hub → **Resend** (Make 117f Gmail is historical); **WELCOME send=079→Communications Hub→Resend**; recording XP credit has **no** deployed Airtable writer under slot 117. Current email plane: [integrations/email-send-plane.md](./integrations/email-send-plane.md).

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
| 003 | Enrollment Intake and Setup — Assign Grade Band — If Grade Changes | *confirm in Airtable* | `003-enrollment-intake-and-setup-assign-grade-band-if-grade-changes.js` |

## Submission intake and assets (005–007, 009, 010, 013, 021–023)

| # | Airtable automation name | Trigger | File |
|---|--------------------------|---------|------|
| 005 | Submission Intake — Assign Week (Activity Date + PHA validate) | Submissions when week/homework assignment needed — dynamic `recordId` | `005-submission-intake-and-asset-creation-assign-week-to-submission-homework-first.js` (**v5.5** — Live in PROD 2026-08-21; Homework Name 1/2 = PHA IDs; wrong-slot normalization) |
| 006 | Submission Intake — Set Video Count | *confirm in Airtable* | `006-submission-intake-and-asset-creation-set-video-count.js` |
| 007 | Submission Intake — Duplicate Checker for Submissions | *confirm in Airtable* | `007-submission-intake-and-asset-creation-duplicate-checker-for-submissions.js` |
| 009 | Submission Intake — Create Submission Assets | *confirm in Airtable* | `009-submission-intake-create-submission-assets.js` |
| **010** | Submission Intake — Create/Reconcile XP Event from Submission | Submissions when `Reconciliation Needed? = 1`, dynamic `recordId` | `010-submission-intake-create-xp-event.js` (**v10.10** in Production Airtable — Mike 2026-08-19; PKG-006R v10.9 lifecycle proof 2026-08-15 remains historical) |
| **013** | Submission Intake — Create or Link Video Feedback | Submission Assets when video asset ready for Video Feedback prep | `013-submission-intake-create-or-link-video-feedback.js` |
| 021 | Submission Intake — Set Attachment Upload Status | *confirm in Airtable* | `021-submission-intake-and-asset-creation-set-attachment-upload-status.js` |
| **022** | Submission Intake — Sync Child Upload Writeback | Submission Assets when Upload Status is Uploaded/Processing/Error and child linked | `022-submission-intake-sync-child-upload-writeback-from-submission-asset.js` (**v2.1** — **ON in Production Airtable per Mike 2026-08-19**; Video Feedback uses existing Upload Status; Video URL prefers Reviewer File URL then Canonical File URL; no Google Drive mirrors). 2026-08-16 controlled path was proven on then-live **v2.0**. |
| 023 | Submission Intake — Assign Enrollment to Submission | *confirm in Airtable* | `023-submission-intake-and-asset-creation-assign-enrollment-to-submission.js` |

## Homework (020, 064–065, 067–068, 070a, 071) — 063 retired

> **2026-07-24:** PROD baseline claims **063 deleted**. **020 v3.0.0** only *partially* replaces 063 (asset-driven Grade Band). Do not reinstall full 063. Repo file retained as historical.

| # | Airtable automation name | Trigger | File |
|---|--------------------------|---------|------|
| **020** | Homework — Link or Create Homework Completion | Submission Assets when homework asset ready for Homework Completion prep — **v3.6 in Production Airtable (Mike 2026-08-19)** (PHA-first intake; HC.Homework = library, HC.Program Homework Assignment = PHA). Earlier v3.5 install evidence is historical. | `020-homework-link-or-create-homework-completion.js` (**v3.6**) |
| 063 | ~~Homework Review — Copy Enrollment Grade Band~~ | **RETIRED / DELETED in PROD; keep OFF**; repository runtime stop | `063-homework-review-and-xp-copy-enrollment-grade-band-to-homework-completion.js` *(historical)* |
| 064 | Homework Review — Prepare Homework XP Award | **v12.2 installed in PROD per Mike evidence**; positive preparation only, exact Enrollment/Homework/Week and exact active rule; re-arms 065 restoration but does not own correction | `064-homework-review-and-xp-prepare-homework-xp-award.js` |
| **065** | Homework Review — Create/Reconcile Homework XP Event | **v10.1 installed in PROD per Mike evidence**; trigger `Homework XP Reconciliation Needed? = 1`; formula-backed automatic award/correction for the supplied controlled signature lifecycle; exact `HOMEWORK_XP\|<HC ID>` ownership; same-event withdrawal/restoration passed in controlled Schmidt test | `065-homework-review-and-xp-create-homework-xp-event.js` |
| **067** | Homework — Link or Create Completion from Reflection Quiz | Final Reflection Quiz Submissions when ready — **repo v3.4** (PHA-first HW17; linked HC fail-closed; **PROD paste not confirmed**) | `067-homework-link-or-create-completion-from-reflection-quiz.js` (**v3.4**) |
| **068** | Homework — Reconcile Deferred Weekly Summary Links | **RETIRED / keep OFF**; 033 v4.2 owns deferred WAS reconciliation | `068-homework-reconcile-deferred-weekly-summary-links.js` |
| **070a** | Email — Send Homework Asset Payload to Make | Submission Assets when Send to Make Trigger checked and homework asset ready | `070a-email-notifications-and-external-handoffs-send-homework-asset-payload-to-make.js` (**v4.7** Live in PROD 2026-08-21; GitHub still **v4.6** until synced — enrollment + Program Instance cross-check; Lambda resolves season) |
| **071** | Email — Homework feedback Hub handoff | Homework Completions when parent feedback ready and not yet sent | GitHub Hub queue create. Current delivery is Hub → Resend. Exact Airtable version unconfirmed. Filename may still say webhook. |

## Weekly summary and goals (030–034)

| # | Airtable automation name | Trigger | File |
|---|--------------------------|---------|------|
| 030 | Weekly Summary — Copy Enrollment Grade Band to Weekly Summary | *confirm in Airtable* | `030-weekly-summary-and-goal-logic-copy-enrollment-grade-band-to-weekly-summary.js` |
| **031** | Weekly Summary — Find or Create WAS from Submission | Submissions when formula-backed count readiness evaluates checked and formula-backed stat mode evaluates `Simple Total` or `Detailed Shooting`; reuses or creates the canonical WAS | `031-weekly-summary-and-goal-logic-find-or-create-weekly-athlete-summary-from-submission.js` (**v4.1** — authoritative find-or-create owner; exact Enrollment/Week cardinality, formula-backed readiness inputs, writable email-readiness checkbox) |
| 032 | Weekly Summary — Link Challenge Goal to WAS | WAS with one Enrollment + Grade Band and no Goal Record | `032-weekly-summary-and-goal-logic-link-challenge-goal-record-to-weekly-athlete-summary.js` (**v3.4** — exactly one active explicit-numeric Target Goal Shots match by Program Instance record ID + Grade Band record ID; zero is valid only when configured) |
| 033 | Weekly Summary — Assign Homework to WAS | WAS when homework assignment reconciliation needed — dynamic `recordId` | `033-weekly-summary-and-goal-logic-assign-homework-to-weekly-athlete-summary.js` (**v4.4** — Live in PROD 2026-08-21; PHA-only, exact PI required) |
| **035** | Weekly Summary — Create Weekly Threshold XP Events | WAS when goal completion threshold is eligible; creates threshold XP Events and updates WAS threshold status | `035-weekly-summary-and-goal-logic-create-weekly-threshold-xp-events.js` |
| 034 | Weekly Summary — Set Previous Week Helper Values | *confirm in Airtable* | `034-weekly-summary-and-goal-logic-set-previous-week-helper-values.js` |

## Levels and progression (041–043)

| # | Airtable automation name | Trigger | File |
|---|--------------------------|---------|------|
| 041 | Levels — Mark Enrollment for Level Recalculation | **v5.0 installed in PROD / ON** (PKG-036 complete 2026-08-15) | `041-levels-and-progression-mark-enrollment-for-level-recalculation.js` |
| 042 | Levels — Assign Current and Next Level with Gate Blocking | **v4.1.2 installed in PROD / ON** (PKG-036 complete 2026-08-15) | `042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js` |
| 043 | Levels — Set Level Gate Rule from Next Level | **Retired; absent from current Production automation inventory; do not recreate** | `043-levels-and-progression-set-level-gate-rule-from-next-level.js` |

## Achievements and streaks (053–059, 066)

> **PKG-038 status:** **COMPLETE** (Production proof passed 2026-08-16). 053 v5.5,
> 054 v5.8, 066 v3.8, and 059 v3.6 are installed and ON. Charlie Schmidt Early
> Bird path proven; audit v2.1 issueTotal = 0. **Do not retest** unless source,
> trigger, or schema changes. Resume after first regular Week closes (~May 8, 2027).

| # | Airtable automation name | Trigger | File |
|---|--------------------------|---------|------|
| 053 | Achievements — Streak Occurrences Rebuild from Submissions | Submissions updated; exact trigger must cover eligibility/identity corrections | `053-achievements-and-milestones-streak-occurrences-rebuild-and-upsert-from-submissions.js` (**v5.5** — first-create Ready handoff; **ON in PROD**) |
| **054** | Achievements — Create or Reconcile Streak XP Event | Streak Occurrences updated; exact trigger must cover Active? withdrawal and Ready/restoration | `054-achievements-and-milestones-streak-occurrences-create-or-repair-streak-xp-event.js` (**v5.8** — exact same-event lifecycle; **ON in PROD**) |
| 055 | Achievements — Recalculate Current Shooting Streak from Submission | *confirm in Airtable* | `055-achievements-and-milestones-recalculate-current-shooting-streak-from-submission.js` |
| 056 | Achievements — Refresh Current Shooting Streaks Daily | *confirm in Airtable (scheduled)* | `056-achievements-and-milestones-refresh-current-shooting-streaks-daily.js` |
| **057** | Achievements — Calculate Perfect Week Eligibility | WAS Perfect Week recalc | `057-achievements-and-milestones-calculate-perfect-week-eligibility.js` (**v1.7** — inactive enrollment and unsettled/multiple/wrong-scope goals fail closed; requires lookup parity with the linked active goal) |
| 058 | Achievements — Create Perfect Week Unlock | Lifecycle-capable WAS trigger; dynamic `recordId` | `058-achievements-and-milestones-create-perfect-week-unlock.js` (**v1.3** — exact source-key lifecycle owner; inactive or unsettled/wrong-scope goal state withdraws the same unlock rather than creating a replacement) |
| **059** | Achievements — Create/Reconcile XP Event from Achievement Unlock | Athlete Achievement Unlock lifecycle; **Do NOT filter on Ready for 059 XP**; prefer When a record is **created** or updated | `059-achievements-and-milestones-create-xp-event-from-achievement-unlock.js` (**v3.6** — corrected-history milestone lifecycle; Perfect Week preserved; **ON in PROD**) |
| 066 | Achievements — Create Shot Milestone Unlocks | Enrollments · Run Shot Milestone Check? | `066-achievements-and-milestones-create-shot-milestone-unlocks.js` (**v3.8** in Production Airtable — Mike 2026-08-19; counted-submission totals and corrected-history unlock lifecycle) |

## Email handoffs (070b/070c upload are not parent email)

Current parent/athlete **email delivery** is Communications Hub → **Resend**. Make.com is not the email sender (Mike 2026-08-19). [email send plane](./integrations/email-send-plane.md).

### Weekly Athlete Summary email

**Current send plane:** `118 → 072 → 119 → 074 → 079 → Communications Hub → Resend`

**Historical (2026-07-24):** `118 → 072 → 119 → 074 → Make.com → Gmail → Make.com writeback` — preserved in [WAS-WEEKLY-EMAIL-ARCHITECTURE.md](./next-wave/was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md). That Make/Gmail path is not current.

| # | Airtable automation name | Trigger / schedule | File / notes |
|---|--------------------------|--------------------|--------------|
| **118** | Email — Schedule Weekly Summary Email Build | Sunday **5:00 AM** America/Denver | `118-…-schedule-weekly-summary-email-build.js` — arms build; does not send email |
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
| 070b | Upload — Send Video Asset Payload to Make | Submission Assets · `Send to Make Trigger` checked · `Upload Status = Pending Link` · `Upload Destination = Video Feedback` | Upload path, **not parent email**. **v4.7 Live in PROD (2026-08-21 poll)**; GitHub still **v4.6** until synced. Historical C-013 proof was **v4.4** (2026-07-11). |
| **070c** | Email — Verify Async Video Asset Upload | Submission Assets · `Upload Status = Uploaded` · `Writeback Complete?` checked · canonical/hash fields populated · `Upload Error` blank · **repurpose existing slot if at limit** | `070c-email-notifications-and-external-handoffs-verify-async-video-asset-upload.js` (**v1.1** — idempotent; `Send to Make Trigger` optional on trigger) |
| 073 | Email — Video feedback Hub handoff | *confirm in Airtable* | GitHub is Hub queue create. Current delivery is Hub → Resend. Filename may still say webhook. |
| **078** | Email — Mark Homework Parent Feedback Ready | Homework Completions · Satisfactory? + Coach Feedback | **No script** — native Update Record only (`NO SCRIPT - UPDATE RECORD is all.` in Automations Code column). Not an email sender. |
| **078A** | Enrollment — Create WELCOME Email Handoff | Enrollments after Athlete + cleaned parent email + Program Instance | `078A-email-notifications-and-external-handoffs-enrollment-create-welcome-email-handoff.js` (**v1.3** — queue create only; `WELCOME\|ENROLLMENTS\|{Enrollment Id}`) |
| 075 | Email — Build Challenge Welcome Email | **Not in current 49-row Automations set** | Repo file retained; live Welcome path is **078A → 079 → Hub → Resend** |
| **079** | Email — Send WELCOME and DAILY_SUBMISSION Handoffs to Communications Hub | Email Handoff Queue when Status is Ready — *confirm trigger in Airtable* | `079-email-notifications-and-external-handoffs-send-queue-handoff-to-communications-hub.js` (**v2.5** GitHub — shared dispatcher; preserves WELCOME validation/retry/replay and accepts exact `DAILY_SUBMISSION|SUBMISSIONS|{Submission Record ID}` keys; confirm pasted Airtable version in Automations UI) |
| **076** | Email — Create Daily Submission Communications Hub Handoff | Consumes the `Build Daily Email Now?` signal checked only by 031 after count readiness, `Simple Total`/`Detailed Shooting` mode validation, and final summary validation; 076 clears it after queue create/reuse | `076-email-notifications-and-external-handoffs-build-daily-submission-email-package.js` (**v8.7** — requires one settled active exact Program Instance + Grade Band goal before preparing a queue; configured zero is permitted, unconfigured/lagged zero is not) |
| **077** | Email — Send Daily Submission Email Package to Make | **Retired / deleted from Production** (2026-08-13) | GitHub archive only; daily email uses Hub 076 → 079 → Resend. Do not restore Make email. |

## Video review and XP (112–114) — 111 retired; 112 must stay OFF

> **2026-07-24:** PROD baseline claims **111 deleted**. **013 v2.0** owns Video Feedback Grade Band create/repair. **112** must remain OFF (OW-D1). Repo 111 file retained as historical.

| # | Airtable automation name | Trigger | File |
|---|--------------------------|---------|------|
| 111 | ~~Video Review — Copy Enrollment Grade Band~~ | **DELETED in PROD (attest)** / replaced by **013 v2.0** | `111-video-review-and-xp-copy-enrollment-grade-band-to-video-feedback.js` *(historical)* |
| 112 | Video Review — Create Video Feedback from Submission Asset | **OFF / must stay OFF** (legacy duplicate of **013**) | `112-video-review-and-xp-create-video-feedback-from-submission-asset.js` |
| 113 | Video Review — Assign Base Video XP | *confirm in Airtable* | `113-video-review-and-xp-assign-base-video-xp.js` (**v6.4** — exactly one canonical `VIDEO_SUBMISSION` rule; inactive exact-event re-arm only) |
| **114** | Video Review — Create or Update Video XP Event | Video Feedback lifecycle reconciliation; *confirm trigger in Airtable* | `114-video-review-and-xp-create-or-update-video-xp-event.js` (**v6.1** — exact VF/source-key identity; deactivates/reactivates the same XP Event; selected-field runtime regression covered by `tests/video-feedback/video-feedback-xp-mocked-runtime.test.js`) |

## Asset reuse review (116)

| # | Airtable automation name | Trigger | File |
|---|--------------------------|---------|------|
| **116** | Submission Assets — Apply Asset Reuse Decision Consequences | Submission Assets · **When record updated** · watched field **`Asset Reuse Decision`** · input `recordId` | `116-submission-assets-apply-asset-reuse-decision-consequences.js` |

**Production (2026-07-10):** **Deployed and validated** on `appn84sqPw03zEbTT` · script `992677d` · v1.0.1 · matrix **S5A–S5L 12/12 PASS** · live **Confirmed Duplicate PASS** + **Approved Reuse reversal PASS** on asset `recF86pJTIMFoEypJ` → VF `rec20xfx0hKCCwPw2` → XP `recx2MvUh2WP0tbjO` (Source Key `VIDEO_SUBMISSION|rec20xfx0hKCCwPw2`; same row deactivated then reactivated; no duplicate XP Event). Replaced retired **008** (slot-neutral; count unchanged). [Stage 5 report](./deploy-checklists/C-023-production-stage5-duplicate-consequences.md).

## Zoom (101, 117)

| # | Airtable automation name | Trigger | File |
|---|--------------------------|---------|------|
| **101** | Zoom Attendance XP — Award Meeting XP | Zoom Meetings when `Zoom XP Reconciliation Needed? = 1`; dynamic `recordId`; no Create XP Events, Attendees, or Completed condition | `101-zoom-attendance-xp-award-meeting-xp.js` (**v6.6** Live in PROD 2026-08-21; GitHub matches — resolves one existing canonical WAS only; 031 is the sole WAS creator) |
| **117** | Zoom — Create Zoom Recording Approval Communications Hub Handoff (**v2.1**). Automations table **Name** still says “Orchestrator”; **Status = Off** (2026-08-20 audit). | Zoom Attendance · Satisfactory recording path | `117-zoom-send-recording-approval-email-to-make.js` — creates Email Handoff Queue only (Event Type `ZOOM_RECORDING_APPROVAL`, Template Key `ZOOM_RECORDING_APPROVED`). Does **not** write XP or call Make/Gmail/Resend. **079** → Hub → Resend. Not the Stage 17 orchestrator. Historical Make 117f: [C-025-117f-prod-zoom-recording-approval-email.md](./deploy-checklists/C-025-117f-prod-zoom-recording-approval-email.md) |
| **117f** | Historical Make workflow identifier (not an Airtable slot) | Retired for email | Do not re-enable Make Gmail for Zoom. Current send plane: [email-send-plane.md](./integrations/email-send-plane.md) |
| **Stage 17 modular / orchestrator** | Repository design alternatives — **not** PROD Airtable automations | Prefer consolidated paths; do **not** create 117a–e slots (automation-count limit) | `_design-alternatives/stage17-modular-reference/` · [numbering note](./deploy-checklists/C-025-117-numbering.md) |

**Airtable automation-count constraint:** Use consolidated automations where practical. Repository-only modular alternatives must not be represented as active PROD automations. The active canonical automation directory must distinguish deployed scripts from archived/design alternatives.

Live attendance XP remains **101** only. The canonical repository source is
**v6.6** (Production Automations Code poll 2026-08-21). Mike-supplied Production
evidence from 2026-08-13 records **v6.1** installed and ON — historical only.
The Introduction and Motivation future meetings both safely acknowledged empty
rosters with no XP Event and Needed = 0. This is installation plus
empty-roster proof only; live-attendee XP, withdrawal, bonuses, progression,
standings, and recording XP remain pending. Gate Applied? / Perfect Week
Applied? remain **042** / **057**. Recording `ZOOM_CREDIT` XP has **no**
currently deployed Airtable writer (orchestrator/117c are design-only). Do
**not** paste the Stage 17 orchestrator over PROD Automation 117.

C-025 historical Stage 17 packets: [deploy-checklists/C-025-stage17-zoom-recording-production-installation-packet.md](./deploy-checklists/C-025-stage17-zoom-recording-production-installation-packet.md). Architecture history: [v2/C025_ARCHITECTURE_RECONCILIATION.md](./v2/C025_ARCHITECTURE_RECONCILIATION.md). Historical Make approval-email path (not current): [C-025-117f-prod-zoom-recording-approval-email.md](./deploy-checklists/C-025-117f-prod-zoom-recording-approval-email.md). Current email delivery: [integrations/email-send-plane.md](./integrations/email-send-plane.md).

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
| G — Video upload | **013** (not 112; 111 retired), 070b, 022 | `audit-video-pipeline-integrity.js` |
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
