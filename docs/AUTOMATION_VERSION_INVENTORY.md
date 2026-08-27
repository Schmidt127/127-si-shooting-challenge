# Automation Version Inventory — Shooting Challenge V2

> **⚠️ C-025 / 117 banner (updated 2026-08-19).** Older inventory rows below still describe superseded S16 `117a/117b` and early Stage 17 designs — treat those table rows as **historical**. **Current PROD Automation 117 (Mike script paste 2026-08-19):** **v2.1** — `Create Zoom Recording Approval Communications Hub Handoff` — creates Email Handoff Queue only; **079** → Hub → Resend. **Not** the Stage 17 credit orchestrator. **Not** Make **117f** (historical Gmail). Live Zoom attendance XP remains **101**. Recording `ZOOM_CREDIT` under slot 117 is **not** live. Defer narrative to [automation-index.md](./automation-index.md) · [C-025-117-numbering.md](./deploy-checklists/C-025-117-numbering.md) · Completion Master §9L overlay.

> **⛔ Authority (2026-08-20):** Never use the obsolete Production **`Automations` data table** for DEV/PROD status, versions, triggers, or retirement. This inventory uses **GitHub SCRIPT headers** + Mike-dated overlays + docs references only. Live ON/OFF still requires Automations **UI** confirmation unless a Mike overlay says otherwise. See [CURRENT-TRUTH.md](./CURRENT-TRUTH.md).

**Status:** Living inventory (GitHub headers + existing evidence)  
**Last updated:** 2026-08-27 (SC-058 repo supplement — 57 active scripts verified; see [`audits/SC-058-automation-inventory-supplement.md`](./audits/SC-058-automation-inventory-supplement.md))  
**Source scripts:** `airtable/automations/shooting-challenge/*.js`  
**Companion:** [automation-index.md](./automation-index.md) · [V2_RELEASE_CHECKLIST.md](./V2_RELEASE_CHECKLIST.md) · [deploy-checklists/DEV-release-readiness-verification-2026-07-16.md](./deploy-checklists/DEV-release-readiness-verification-2026-07-16.md)

**Repo verification (2026-07-16, Online Agent 2):** Offline release-readiness validator + C-025/066/header/engine/upload/web suites **PASS** (originally on tip `b320aa2`). No live Airtable poll — DEV/PROD UI columns remain UNKNOWN unless noted. **Merge gate closed:** #25/#26/#27 merged to `master` 2026-07-16; this OA2 package reconciled onto post-merge tip.

## How to read this table

| Column | Meaning |
|--------|---------|
| Script version / version date / original-written | From GitHub `SCRIPT` / `CONFIG` / docblock when present |
| Trigger / conditions / inputs | From script headers or automation-index; many still say *confirm in Airtable* |
| DEV / PROD status | **UNKNOWN** unless documented elsewhere (PROJECT_STATE, deploy-checklists, audits) |
| Test evidence | Existing repo docs only — not a live Airtable poll |
| Remaining action | Next operator step before treating the row as launch-ready |

**Unknowns are intentional.** Do not invent live Airtable versions. Fill DEV/PROD columns during release checklist execution.

**Base IDs:** PROD `appn84sqPw03zEbTT` only (active). DEV `appTetnuCZlCZdTCT` **retired 2026-08-19** — historical snapshots and read-only install docs only.

## Summary (2026-08-20)

Production final verification (Mike 2026-08-21, live script body / run history preferred over midday Automations Code-column snapshot): **010 v10.11**, **020 v3.7**, **033 v4.4**, **041 v5.1**, **057 v1.7**, **058 v1.3**, **059 v3.6**, **064 Production-verified current live**, **065 v10.2**, **066 v3.8**, **070a/070b v4.7**, **070c current live (repo v1.1)**, **101 v6.7**, **117 v2.1 Live**. Midday Code-column reads that showed **010 v10.10** / **101 v6.6** are **historical**. Perfect Week controlled-path evidence: [`deploy-checklists/2026-08-21-perfect-week-test-prep-report.md`](./deploy-checklists/2026-08-21-perfect-week-test-prep-report.md). **077** remains deleted. Older UNKNOWN/OFF values and S16 117a/117b rows remain historical unless explicitly reconciled.

| Metric | Value |
|--------|-------|
| Numbered automation scripts in repo | 50+ |
| Rows with UNKNOWN GitHub version date / sparse headers | Common on legacy scripts — fill from Airtable UI at promote time |
| Rows with strong PROD evidence (final 2026-08-21) | **010 v10.11**, **020 v3.7**, **033 v4.4**, **041 v5.1**, **057 v1.7**, **058 v1.3**, **059 v3.6**, **064 current live**, **065 v10.2**, **066 v3.8**, **070a/070b v4.7**, **070c current live**, **101 v6.7**, **117 v2.1 Live** |
| Production-only by design | 115 (Engineering Test Framework) |
| Explicitly leave PROD OFF until scheduled | 070a homework upload |
| C-025 / slot 117 | **Email Hub handoff v2.1 live** (Mike paste). Recording XP orchestrator = design alternative only. Table rows for 117a/117b below are **historical S16**. |

## Inventory

| # | Name | Script version | Version date | Original written | Trigger | Conditions | Input variables | DEV status | PROD status | Test evidence | Remaining action |
|---|------|----------------|--------------|------------------|---------|------------|-----------------|------------|-------------|---------------|------------------|
| 001 | Enrollment Intake and Setup — Find or Create Athlete and Link Enrollment | v5.1 | UNKNOWN | 2026-05-20 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 002 | Enrollment Intake and Setup — Assign Grade Band — Initial | v8.1 | UNKNOWN | 2026-05-20 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 003 | Enrollment Intake and Setup — Assign Grade Band — If Grade Changes | v2.0 | UNKNOWN | 2026-05-20 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 005 | Submission Intake — Assign Week to Submission — Homework First | **v5.4** | 2026-08-20 | 2026-05-20 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in Production Airtable UI | UNKNOWN — confirm pasted version in PROD Automations UI | GitHub SCRIPT v5.4 midnight-UTC date-only keys | Verify live trigger/version against GitHub before promote |
| 006 | Submission Intake — Set Video Count | v3.0 | UNKNOWN | 2026-05-20 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 007 | Submission Intake — Duplicate Checker for Submissions | v2.0 | UNKNOWN | 2026-05-20 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 009 | Submission Intake — Create Submission Assets | **v1.2** | 2026-08-20 | 2026-06-20 | Submissions — confirm in Airtable UI | UNKNOWN — confirm in Airtable UI | recordId | n/a (Production only) | **Live / v1.2** (Automations Code 2026-08-21) | GitHub SCRIPT v1.2; Perfect Week five-asset proof | Keep aligned |
| 010 | Submission Intake — Create XP Event from Submission | **v10.12** | 2026-08-22 | 2026-06-06 | Submissions when `Count This Submission?` checked and XP should be awarded | Controlled Testing3 path passed | Current controlled path passed | **Production Code v10.10** (API 2026-08-23) | GitHub v10.12 | **Paste v10.12** — [`010-v10.12-formula-settlement-grace.md`](./deploy-checklists/010-v10.12-formula-settlement-grace.md) |
| 013 | Submission Intake — Create or Link Video Feedback | **v3.2.0** | 2026-08-20 | 2026-05-20 | Submission Assets when video asset ready for Video Feedback prep | Asset Slot = VIDEO; provenance + race guard | recordId | obsolete — ignore | **Live / v3.2.0 MATCH** (2026-08-20 Automations Code audit) | GitHub SCRIPT v3.2.0; sole VF create/link (112 OFF); does **not** copy Focus/Question in v3.2.0 body | Keep 112 OFF; confirm UI trigger conditions |
| 020 | Homework — Link or Create Homework Completion | **v3.7** | 2026-08-20 | 2026-05-20 | Submission Assets when homework asset ready | Controlled HW path | Controlled HW1/HW2 path passed | n/a | **Live / v3.7** (Automations Code 2026-08-21; older notes said v3.6) | Uniqueness Enrollment+Week+Homework+Slot; Perfect Week HC proof | Keep aligned |
| 021 | Submission Intake — Set Attachment Upload Status | v2.0 | UNKNOWN | 2026-04-13 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| **022** | Submission Intake — Sync Child Upload Writeback | **v2.2** | 2026-08-24 | 2026-06-21 | Submission Assets when Upload Status is Uploaded/Processing/Error and child linked | Upload Destination + child linked | recordId | UNKNOWN — confirm in DEV UI | **ON / v2.1 in Production Airtable (Mike 2026-08-19)** — **v2.2 paste pending** | Secure video URL: Reviewer/Lambda only; no Canonical S3 fallback; offline `lib/022-child-upload-writeback.test.js` + `lib/secure-video-url.test.js` | [`022-v2.2-secure-video-url-pipeline.md`](./deploy-checklists/022-v2.2-secure-video-url-pipeline.md) |
| 023 | Submission Intake — Assign Enrollment to Submission | **v3.1** | UNKNOWN | 2026-05-20 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub SCRIPT v3.1 | Verify live trigger/version against GitHub before promote |
| 030 | Weekly Summary — Copy Enrollment Grade Band to Weekly Summary | v3.0 | UNKNOWN | 2026-05-27 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 031 | Weekly Summary — Find or Create WAS from Submission | **v4.1** | UNKNOWN | 2026-05-20 | Submissions when `Count This Submission?` checked and WAS empty | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN | UNKNOWN | GitHub SCRIPT v4.1 | Confirm pasted PROD version in Automations UI |
| 032 | Weekly Summary — Link Challenge Goal to WAS | **v3.4** | UNKNOWN | 2026-05-27 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub SCRIPT v3.4 | Verify live trigger/version against GitHub before promote |
| 033 | Weekly Summary — Assign Homework to WAS | **v4.3** | UNKNOWN | 2026-05-27 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub SCRIPT v4.3 | Verify live trigger/version against GitHub before promote |
| 034 | Weekly Summary — Set Previous Week Helper Values | v3.4 | UNKNOWN | 2026-05-20 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN | UNKNOWN | script v3.4 | Previous week helper order |
| 041 | 041 - Levels and Progression - Mark Enrollment for Level Recalculation | **v5.1** | 2026-08-21 | UNKNOWN | Table: XP Events Trigger: When record matches conditions  Trigger Conditions: Enrollment is not empty XP Points is greater than 0  Required  | Enrollment is not empty XP Points is greater than 0  Required Input Variable: recordId = Airtable re | recordId (optional inputs only) | n/a | **Live / v5.1** (final 2026-08-21) | GitHub SCRIPT v5.1 | Confirm optional-input mapping remains dynamic |
| 042 | 042 - Levels and Progression - Assign Current and Next Level with Gate Blocking | **4.1.2** | UNKNOWN | 2026-06-02 | Table: Enrollments Trigger Type: When record enters view View: 042 - Needs Level Assignment  View Filter: Level Recalc Needed? is checked  R | Level Recalc Needed? is checked  Required Input Variable: recordId = Airtable record ID from the tri | recordId | UNKNOWN | UNKNOWN | GitHub SCRIPT 4.1.2 | Gate blocked scenario in E2E matrix |
| 043 | Levels — Set Level Gate Rule from Next Level | v2.0 | UNKNOWN | 2026-05-20 | **Retire** — legacy Next Level gate helper; keep until planned maintenance window then delete | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm retired/disabled in DEV UI | UNKNOWN — confirm retired/disabled in PROD UI | V2-014 / PROJECT_STATE retirement plan | Do not promote; schedule delete with **112** |
| 053 | Achievements — Streak Occurrences Rebuild from Submissions | 5.1 | UNKNOWN | 2026-06-09 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN | UNKNOWN | script 5.1 | Streak rebuild smoke |
| 054 | Achievements — Create or Repair Streak XP Event | **v5.8** | UNKNOWN | 2026-06-09 | Streak Occurrences when Source Status is Ready for XP | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN | UNKNOWN | GitHub SCRIPT v5.8 | Streak XP Source Key rerun |
| 055 | Achievements — Recalculate Current Shooting Streak from Submission | v3.2 | UNKNOWN | UNKNOWN | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 056 | Achievements — Refresh Current Shooting Streaks Daily | v1.2 | UNKNOWN | UNKNOWN | *confirm in Airtable (scheduled)* | UNKNOWN — confirm in Airtable UI | UNKNOWN — typically recordId; confirm in Airtable | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 057 | Achievements — Calculate Perfect Week Eligibility | **2.0** | 2026-08-23 | 2026-05-30 | Weekly Athlete Summary Perfect Week queue / helpers | Confirm in Airtable UI | recordId | n/a | **Live / v2.0 live-tested** | 48-hour grace period; disposable E2E 4/7 PW days | [`057-v2.0-perfect-week-grace-period.md`](./deploy-checklists/057-v2.0-perfect-week-grace-period.md) |
| 058 | Achievements — Create Perfect Week Unlock | **1.3** | 2026-08-21 | 2026-05-30 | Weekly Athlete Summary when Eligible + Ready + unlock empty/repair path | Confirm in Airtable UI | recordId | n/a | **Live / 1.3** | Unlock Source Key `PERFECT_WEEK|{enr}|{week}` | Run only after 057 confirms Eligible |
| 059 | Achievements — Create XP Event from Achievement Unlock | **v3.6** | 2026-08-21 | 2026-06-05 | **Recommended:** record **created** · XP Award Status Pending — **Do NOT filter on Ready for 059 XP**; do not require Shot Milestone | Confirm UI matches recommended trigger | recordId | n/a | **Live / v3.6** | Perfect Week + Shot Milestone XP | Confirm dynamic recordId |
| 063 | Homework Review — Copy Enrollment Grade Band to Homework Completion | v2.0 historical | — | 2026-04-27 | **DELETED — do not restore** | — | — | n/a | **Deleted / retired** | Repo hard-stop; [HOMEWORK-ASSET-COMPLETION-RUNBOOK.md](./online-agents/homework-assets/HOMEWORK-ASSET-COMPLETION-RUNBOOK.md) | Keep deleted |
| 064 | Homework Review — Prepare Homework XP Award | **v12.2** (repo) | 2026-08-12 | UNKNOWN | Homework Completions when review complete / satisfactory path | Confirm in Airtable UI | recordId | n/a | **Production-verified current live** (final 2026-08-21 — do not invent a new version string) | Prepares XP from HOMEWORK_COMPLETION rule; **does not create XP Event** | Keep prepare-only ownership |
| 065 | Homework Review — Create/Reconcile Homework XP Event | **v10.3** | 2026-08-24 | 2026-06-06 | Homework XP Reconciliation Needed? = 1 | Confirm in Airtable UI | recordId | n/a | **Live / v10.3 live-tested** | Dynamic `recordId`; closeout 2026-08-24 | [`2026-08-24-065-066-dynamic-trigger-closeout.md`](./deploy-checklists/2026-08-24-065-066-dynamic-trigger-closeout.md) |
| 066 | 066 - Achievements and Milestones - Create Shot Milestone Unlocks | **v3.9** | 2026-08-24 | 2026-06-17 | Enrollments · Run Shot Milestone Check? | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV UI | **Live / v3.9 live-tested** | Dynamic `recordId`; replay verified 2026-08-24 | [`2026-08-24-065-066-dynamic-trigger-closeout.md`](./deploy-checklists/2026-08-24-065-066-dynamic-trigger-closeout.md) |
| 067 | Homework — Link or Create Completion from Reflection Quiz | **v3.4** | UNKNOWN | 2026-06-28 | Final Reflection Quiz Submissions when ready (created / Processing Status Pending, Enrollment set) | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub SCRIPT v3.4 | Verify live trigger/version against GitHub before promote |
| 070a | Email — Send Homework Asset Payload to Make | **v4.7** | 2026-08-21 | 2026-06-27 | Submission Assets when Send to Make Trigger checked and homework asset ready | UNKNOWN — confirm in Airtable UI | recordId | DEV E2E PASS (overnight evidence) | **Production Code v4.7** — verify Live/Off in UI ([launch decision](./v2/AUTOMATION_070A_LAUNCH_DECISION.md)) | GitHub synced from Production v4.7 2026-08-21 | Do not promote homework upload until Mike schedules |
| 070b | Email — Send Video Asset Payload to Make | **v4.7** | 2026-08-21 | 2026-06-27 | Submission Assets · `Send to Make Trigger` checked · `Upload Status = Pending Link` · `Upload Destination = Video Feedback` | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV UI | **Production + GitHub v4.7** (2026-08-21) | Historical C-013 PROD E2E was **v4.4** (2026-07-11); **v4.6** Program Instance season; **v4.7** = `fetch` fix | Optional Storage Key retry proof; rotate secrets exposed by deploy log |
| 070c | Email — Verify Async Video Asset Upload | v1.1 | 2026-07-11 | 2026-07-11 | Submission Assets · `Upload Status = Uploaded` · `Writeback Complete?` checked · canonical/hash fields populated · `Upload Error` blank · **repurpose existing slot if at limit** | UNKNOWN — confirm in Airtable UI | recordId | DEV proven | **PROD COMPLETE v1.1** (C-013) — idempotent writeback verify; clears `Send to Make Trigger` | C-013 closeout; SCRIPT.version v1.1 | Hygiene only — version wording locked to script **v1.1** |
| 071 | Email — Send Homework Feedback Email Webhook | **v4.1** | UNKNOWN | 2026-06-06 | Homework Completions when parent feedback ready and not yet sent | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub SCRIPT v4.1 (Hub path) | Verify live trigger/version against GitHub before promote |
| **072** | Email — Build Weekly Summary Email Package | **v4.8** | 2026-08-24 | 2026-06-20 | Weekly Athlete Summary when `Build Weekly Email Now?` checked | **Live v4.7** (E2E 2026-08-24); **v4.8 paste pending** for secure video URLs | recordId | n/a | **Live v4.7** | v4.8: Lambda viewer URLs only in weekly video list; `missingSecureUrlCount` | [`022-v2.2-secure-video-url-pipeline.md`](./deploy-checklists/022-v2.2-secure-video-url-pipeline.md) · [`072-v4.7-weekly-email-fixes-2026-08-24.md`](./deploy-checklists/072-v4.7-weekly-email-fixes-2026-08-24.md) |
| 073 | Email — Send Video Feedback Parent Email Webhook | **v4.1** | UNKNOWN | 2026-06-17 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub SCRIPT v4.1 (Hub path) | Verify live trigger/version against GitHub before promote |
| 074 | Email — Send Weekly Summary Email Package to Make | **v3.3** | 2026-08-24 | 2026-05-29 | Weekly Athlete Summary Hub handoff when `Send to Make?` checked | **Live / live-tested** (E2E 2026-08-24) | recordId | n/a | **Live v3.3** | Hub handoff; `goalCompletionDisplay` forwarding | Confirm UI matches GitHub v3.3 |
| 075 | Email — Build Challenge Welcome Email | v3.0 | UNKNOWN | 2026-05-29 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub SCRIPT v3.0 | Verify live trigger/version against GitHub before promote |
| 076 | Email — Build Daily Submission Email Package / Hub handoff | **v8.7** | 2026-08-20 | 2026-05-29 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm pasted version in PROD Automations UI | GitHub SCRIPT v8.7 Hub queue create | Daily path is 076→079→Hub→Resend; not Make 077 |
| 077 | Email — Send Daily Submission Email Package to Make | v5.0 (archive) | UNKNOWN | 2026-05-29 | n/a — retired | n/a | n/a | n/a | **DELETED from Production (2026-08-13)** — Mike-dated Completion Master / automation-index / PKG-006 | GitHub archive only; obsolete Automations-table “Live” row **retracted** | Do not restore Make daily email |
| 078 | Email — Mark Homework Parent Feedback Ready | **(no script)** | — | — | Homework Completions Update Record | Live (2026-08-20 Automations Name/Status/Code audit) | — | — | — | Native Update Record only | Not an email sender |
| 078A | Enrollment — Create WELCOME Email Handoff | **v1.3** | 2026-08-11 | 2026-08-11 | Enrollments after Athlete + cleaned parent + PI | Live (2026-08-20 Automations Name/Status/Code audit) | recordId | UNKNOWN | UNKNOWN | GitHub SCRIPT v1.3 Hub queue create | 078A→079→Hub→Resend |
| 079 | Email — Send queue handoff to Communications Hub | **v2.5** | UNKNOWN | UNKNOWN | Email Handoff Queue when Status is Ready — *confirm in Airtable UI* | **Live / live-tested** (E2E weekly 2026-08-24) | recordId | n/a | **Live v2.5** | GitHub SCRIPT v2.5 | Confirm UI version vs GitHub |
| 101 | Zoom Attendance XP — Award Meeting XP | **v6.7** | 2026-08-21 | 2026-05-28 | Zoom Meetings when **`Zoom XP Reconciliation Needed? = 1`** (sole primary condition) | Do **not** use Create XP Events / Attendees / Completed as primary trigger | recordId | obsolete — ignore | **Live / v6.7** (live script body; final 2026-08-21). Midday Code-column v6.6 snapshot historical. | Safe skip when reconciliation not needed (`recxtpMu4ONbdDD45`) | None — reconciled |
| 117 | Zoom — Create Zoom Recording Approval Communications Hub Handoff | **v2.1** | 2026-08-21 | 2026-07-20 | Zoom Attendance · Satisfactory recording path | Recording Quiz Satisfactory? | recordId, enrollmentRid, zoomMeetingRid (all dynamic) | UNKNOWN | **Live / v2.1** Hub queue create — not XP; not Make 117f | Creates Email Handoff Queue; 079 → Hub → Resend | Keep filename historical; do not paste orchestrator |
| 111 | Video Review — Copy Enrollment Grade Band to Video Feedback | v1.1 | UNKNOWN | 2026-04-27 | **Retired** — 013 owns grade band | — | recordId | n/a | **Absent / retired** | Historical file only | Do not re-enable |
| 112 | Video Review — Create Video Feedback from Submission Asset | v2.1 | UNKNOWN | 2026-05-19 | **OFF** — legacy duplicate of **013** | Confirm still **OFF** | recordId | **Expected OFF** | **Expected OFF** | PROJECT_STATE; automation-index | Keep OFF |
| 113 | Video Review — Assign Base Video XP | **v6.4** | 2026-08-12 | UNKNOWN | Video Feedback when review posted | Confirm watched fields in UI | recordId | n/a | **Live / v6.4** (API 2026-08-23) | GitHub SCRIPT v6.4 MATCH; mocked-runtime tests | PKG-007 lifecycle proof pending |
| 114 | Video Review — Create or Update Video XP Event | **v6.1** | 2026-08-13 | 2026-05-23 | Video Feedback lifecycle (award + withdrawal) | Confirm trigger covers withdrawal branch | recordId | n/a | **Live / v6.1** (API 2026-08-23) | GitHub SCRIPT v6.1 MATCH; steal-guard + lifecycle tests | PKG-007 Schmidt proof pending |
| 115 | 115 - Engineering Test Framework - Run Testing Scenario Daily Submission | **v2.1** | 2026-07-18 | 2026-07-06 | Testing Scenarios when **Run Test?** checked | UNKNOWN — confirm in Airtable UI | recordId | v2.1 ETF (controlled PROD homework proof historical) | Not deployed as season automation (Production-only ETF) | C-025 ETF packet + C-020 checklist | Keep Production-only; never paste as normal season automation |
| 116 | 116 - Submission Assets - Apply Asset Reuse Decision Consequences | v1.0.1 | 2026-07-10 | 2026-07-10 | Submission Assets · **When record updated** · watched field **`Asset Reuse Decision`** · input `recordId` | UNKNOWN — confirm in Airtable UI | recordId | DEV complete | PROD runtime PASS on fixture; doc hygiene pending | C-023-prod-automation-116-validation-2026-07-11.md | Sign-off checklist hygiene |

| 117a | 117a - Zoom Recording Credit - Award XP from Quiz Completion | v1.0 | 2026-07-15 | 2026-07-15 | Homework Completions when Satisfactory + Zoom Meeting linked | Completion Status Satisfactory; Zoom Meeting + Enrollment not empty | recordId | **Ready for DEV install** — offline contract tests PASS 2026-07-16; **not live-installed/verified** | **Not installed** — do not activate PROD | C-025 tests PASS 2026-07-16; ZOOM_RECORDING_CREDIT_DEV_INSTALL.md | Execute DEV packet after Mike auth; capture Source Keys |
| 117b | 117b - Zoom Recording Credit - Send Approval Email Webhook | v1.0 | 2026-07-15 | 2026-07-15 | Homework Completions when Satisfactory + send flag | Config email enabled; template key present | recordId, makeWebhookUrl | **Ready for DEV install** — offline tests PASS 2026-07-16; **not live-verified** | **Not installed** — do not activate PROD | C-025 tests PASS 2026-07-16 | DEV Make webhook only; leave OFF until dry-run |

## Source Key quick reference (for version verification)

| Domain | Automation | Source Key pattern |
|--------|------------|--------------------|
| Daily submission XP | 010 | `SUBMISSION_XP\|{submissionId}` |
| Homework XP | 065 | `HOMEWORK_XP\|{homeworkCompletionId}` |
| Video XP | 114 | `VIDEO_SUBMISSION\|{videoFeedbackId}` |
| Streak XP | 054 | `STREAK_XP\|{enrollmentId}\|{achievementId}\|{streakEndDate}` |
| Shot milestone unlock | 066 | `SHOT_MILESTONE\|{enrollmentId}\|{shotMilestoneId}` |
| Perfect Week unlock | 058 | `PERFECT_WEEK\|{enrollmentId}\|{weekId}` |
| Zoom live base | 101 | `ZOOM_ATTEND_BASE\|{meetingId}\|{enrollmentId}` |
| Zoom live bonuses | 101 | `ZOOM_ATTEND_BONUS_2\|{enrollmentId}`, `ZOOM_ATTEND_BONUS_3\|{enrollmentId}` |
| Zoom recording | **117a** | `ZOOM_RECORDING\|{meetingId}\|{enrollmentId}` — repo implemented; DEV install pending |
| Zoom recording email | **117b** | Config-gated parent email after Satisfactory — repo implemented; DEV install pending |

## Refresh procedure

1. Re-parse GitHub headers after automation commits.
2. During DEV/PROD smoke, overwrite UNKNOWN status cells with observed Airtable UI version + date.
3. Link test evidence to deploy-checklist or audit paths under `docs/`.
4. Re-run `node tools/validate-v2-release-readiness.js`.


## Implementation status legend (2026-07-15)

| State | Meaning |
|-------|---------|
| Implemented in repository | Scripts/docs/tests exist in GitHub |
| Ready for DEV installation | Install packet exists; no claim of live DEV paste |
| Verified in DEV | Live DEV evidence captured (OMNI/Mike) |
| Ready for PROD promotion | DEV verified + promotion checklist + Mike approval |
| Verified in PROD | Live PROD smoke evidence |

| Item | Repo | Ready DEV install | Verified DEV | Ready PROD | Verified PROD |
|------|------|-------------------|--------------|------------|---------------|
| 009 SCRIPT header | Yes | N/A (existing automation) | UNKNOWN | UNKNOWN | UNKNOWN |
| C-025 / 117a XP award | Yes | Yes | No | No | No |
| C-025 / 117b email | Yes | Yes | No | No | No |
| 117c–117e | Modular slices / reference | Prefer orchestrator **117** | — | — | — |
| **117f** email | Yes (v1.2.0) | Yes — paste packet + DEV fixtures | **Pending UI paste** (Meta API 403); gates PASS offline | No | No |
| 066 OMNI confirm support | Yes (packet+harness) | N/A | **Pending OMNI** | No | No |
| 070a homework upload | Yes (existing) | DEV evidence historical | Re-verify | **No — keep OFF** | No |
