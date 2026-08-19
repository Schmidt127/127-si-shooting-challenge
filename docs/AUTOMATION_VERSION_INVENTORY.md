# Automation Version Inventory — Shooting Challenge V2

> **⚠️ C-025 / 117 banner (updated 2026-08-19).** Older inventory rows below still describe superseded S16 `117a/117b` and early Stage 17 designs — treat those table rows as **historical**. **Current PROD Automation 117 (Mike script paste 2026-08-19):** **v2.1** — `Create Zoom Recording Approval Communications Hub Handoff` — creates Email Handoff Queue only; **079** → Hub → Resend. **Not** the Stage 17 credit orchestrator. **Not** Make **117f** (historical Gmail). Live Zoom attendance XP remains **101**. Recording `ZOOM_CREDIT` under slot 117 is **not** live. Defer narrative to [automation-index.md](./automation-index.md) · [C-025-117-numbering.md](./deploy-checklists/C-025-117-numbering.md) · Completion Master §9L overlay.

**Status:** Living inventory (GitHub headers + existing evidence)
**Last updated:** 2026-08-19 (022 **v2.1**, 020 **v3.6**, 070b **v4.6**, 117 **v2.1**, 066 **v3.8**, 010 **v10.10**; other rows still largely UNKNOWN)
**Source scripts:** `airtable/automations/shooting-challenge/*.js`
**Companion:** [automation-index.md](./automation-index.md) · [V2_RELEASE_CHECKLIST.md](./V2_RELEASE_CHECKLIST.md) · [deploy-checklists/Production-release-readiness-verification-2026-07-16.md](./deploy-checklists/Production-release-readiness-verification-2026-07-16.md)

**Repo verification (2026-07-16, Online Agent 2):** Offline release-readiness validator + C-025/066/header/engine/upload/web suites **PASS** (originally on tip `b320aa2`). No live Airtable poll — Production UI columns remain UNKNOWN unless noted. **Merge gate closed:** #25/#26/#27 merged to `master` 2026-07-16; this OA2 package reconciled onto post-merge tip.

## How to read this table

| Column | Meaning |
|--------|---------|
| Script version / version date / original-written | From GitHub `SCRIPT` / `CONFIG` / docblock when present |
| Trigger / conditions / inputs | From script headers or automation-index; many still say *confirm in Airtable* |
| Production / PROD status | **UNKNOWN** unless documented elsewhere (PROJECT_STATE, deploy-checklists, audits) |
| Test evidence | Existing repo docs only — not a live Airtable poll |
| Remaining action | Next operator step before treating the row as launch-ready |

**Unknowns are intentional.** Do not invent live Airtable versions. Fill Production columns during release checklist execution.

**Base IDs:** Production `appn84sqPw03zEbTT` · PROD `appn84sqPw03zEbTT`

## Summary (2026-08-19)

022 Production paste is **v2.1**, 020 is **v3.6**, 070b is **v4.6**, 117 is **v2.1** Hub handoff, 066 is **v3.8**, and 010 is **v10.10** (Mike 2026-08-19). The 2026-08-16 controlled-path packet remains path evidence. Older UNKNOWN/OFF values and S16 117a/117b rows remain historical unless explicitly reconciled.

| Metric | Value |
|--------|-------|
| Numbered automation scripts in repo | 50 |
| Rows with UNKNOWN GitHub version date / sparse headers | Common on legacy scripts — fill from Airtable UI at promote time |
| Rows with strong PROD evidence | **022 v2.1**, **020 v3.6**, **070b v4.6**, **117 v2.1**, **066 v3.8**, **010 v10.10** (Mike); 070c/116 (partial historical); C-013 v4.4 closeout historical |
| Production-only by design | 115 (Engineering Test Framework) |
| Explicitly leave PROD OFF until scheduled | 070a homework upload |
| C-025 / slot 117 | **Email Hub handoff v2.1 live** (Mike paste). Recording XP orchestrator = design alternative only. Table rows for 117a/117b below are **historical S16**. |

## Inventory

| # | Name | Script version | Version date | Original written | Trigger | Conditions | Input variables | Production status | PROD status | Test evidence | Remaining action |
|---|------|----------------|--------------|------------------|---------|------------|-----------------|------------|-------------|---------------|------------------|
| 001 | Enrollment Intake and Setup — Find or Create Athlete and Link Enrollment | v5.1 | UNKNOWN | 2026-05-20 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in Production Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 002 | Enrollment Intake and Setup — Assign Grade Band — Initial | v8.1 | UNKNOWN | 2026-05-20 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in Production Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 003 | Enrollment Intake and Setup — Assign Grade Band — If Grade Changes | v2.0 | UNKNOWN | 2026-05-20 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in Production Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 005 | Submission Intake — Assign Week to Submission — Homework First | v4.0 | UNKNOWN | 2026-05-20 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in Production Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 006 | Submission Intake — Set Video Count | v3.0 | UNKNOWN | 2026-05-20 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in Production Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 007 | Submission Intake — Duplicate Checker for Submissions | v2.0 | UNKNOWN | 2026-05-20 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in Production Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 009 | Submission Intake — Create Submission Assets | v1.0 | 2026-07-15 | 2026-06-20 | Submissions — confirm in Airtable UI | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in Production Airtable UI | UNKNOWN — confirm in PROD Airtable UI | SCRIPT metadata established 2026-07-15 (runtime unchanged) | Verify live trigger; paste only if Production drift |
| 010 | Submission Intake — Create XP Event from Submission | **v10.10** | 2026-08-16 | 2026-06-06 | Submissions when `Count This Submission?` checked and XP should be awarded | Controlled Testing3 path passed | Current controlled path passed | **v10.10 in Production Airtable (Mike 2026-08-19)** | PKG-006R v10.9 lifecycle proof 2026-08-15 historical; preserve `SUBMISSION_XP|{submissionId}` | None for version string |
| 013 | Submission Intake — Create or Link Video Feedback | v2.0 | UNKNOWN | 2026-05-20 | Submission Assets when video asset ready for Video Feedback prep | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in Production Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 020 | Homework — Link or Create Homework Completion | **v3.6** | 2026-08-16 | 2026-05-20 | Submission Assets when homework asset ready for Homework Completion prep | 13/13 offline tests reported by Cursor | Controlled HW1/HW2 path passed | **ON / v3.6 in Production Airtable (Mike 2026-08-19)** | Current reconciliation packet + Mike UI | Optional HW1/HW2 no-duplicate rerun only; version paste is confirmed |
| 021 | Submission Intake — Set Attachment Upload Status | v2.0 | UNKNOWN | 2026-04-13 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in Production Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 022 | Submission Intake — Sync Child Upload Writeback | **v2.1** | 2026-08-17 | 2026-06-21 | Submission Assets when Upload Status is Uploaded/Processing/Error and child linked | Upload Destination + child linked | recordId | UNKNOWN — confirm in Production UI | **ON / v2.1 in Production Airtable (Mike 2026-08-19)** | 2026-08-16 path evidence in [`SC-2026-08-16-CURRENT-STATE-RECONCILIATION.md`](./prod-completion/2026-08-16/SC-2026-08-16-CURRENT-STATE-RECONCILIATION.md) (then v2.0); offline `lib/022-child-upload-writeback.test.js` | Keep GitHub aligned with Airtable v2.1 |
| 023 | Submission Intake — Assign Enrollment to Submission | v2.0 | UNKNOWN | 2026-05-20 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in Production Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 030 | Weekly Summary — Copy Enrollment Grade Band to Weekly Summary | v3.0 | UNKNOWN | 2026-05-27 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in Production Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 031 | Weekly Summary — Find or Create WAS from Submission | v3.1 | UNKNOWN | 2026-05-20 | Submissions when `Count This Submission?` checked and WAS empty | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN | UNKNOWN | script v3.1 | WAS create from submission |
| 032 | Weekly Summary — Link Challenge Goal to WAS | v3.2 | UNKNOWN | 2026-05-27 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in Production Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 033 | Weekly Summary — Assign Homework to WAS | v3.1 | UNKNOWN | 2026-05-27 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in Production Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 034 | Weekly Summary — Set Previous Week Helper Values | v3.4 | UNKNOWN | 2026-05-20 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN | UNKNOWN | script v3.4 | Previous week helper order |
| 041 | 041 - Levels and Progression - Mark Enrollment for Level Recalculation | 3.0 | UNKNOWN | UNKNOWN | Table: XP Events Trigger: When record matches conditions  Trigger Conditions: Enrollment is not empty XP Points is greater than 0  Required  | Enrollment is not empty XP Points is greater than 0  Required Input Variable: recordId = Airtable re | recordId | UNKNOWN — confirm in Production Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 042 | 042 - Levels and Progression - Assign Current and Next Level with Gate Blocking | 3.0 | UNKNOWN | 2026-06-02 | Table: Enrollments Trigger Type: When record enters view View: 042 - Needs Level Assignment  View Filter: Level Recalc Needed? is checked  R | Level Recalc Needed? is checked  Required Input Variable: recordId = Airtable record ID from the tri | recordId | UNKNOWN | UNKNOWN | script v3.0 | Gate blocked scenario in E2E matrix |
| 043 | Levels — Set Level Gate Rule from Next Level | v2.0 | UNKNOWN | 2026-05-20 | **Retire** — legacy Next Level gate helper; keep until planned maintenance window then delete | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm retired/disabled in Production UI | UNKNOWN — confirm retired/disabled in PROD UI | V2-014 / PROJECT_STATE retirement plan | Do not promote; schedule delete with **112** |
| 053 | Achievements — Streak Occurrences Rebuild from Submissions | 5.1 | UNKNOWN | 2026-06-09 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN | UNKNOWN | script 5.1 | Streak rebuild smoke |
| 054 | Achievements — Create or Repair Streak XP Event | v5.4 | UNKNOWN | 2026-06-09 | Streak Occurrences when Source Status is Ready for XP | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN | UNKNOWN | script v5.4 | Streak XP Source Key rerun |
| 055 | Achievements — Recalculate Current Shooting Streak from Submission | v3.2 | UNKNOWN | UNKNOWN | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in Production Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 056 | Achievements — Refresh Current Shooting Streaks Daily | v1.2 | UNKNOWN | UNKNOWN | *confirm in Airtable (scheduled)* | UNKNOWN — confirm in Airtable UI | UNKNOWN — typically recordId; confirm in Airtable | UNKNOWN — confirm in Production Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 057 | Achievements — Calculate Perfect Week Eligibility | 1.2 | UNKNOWN | UNKNOWN | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN | UNKNOWN | script 1.2 | Perfect Week eligibility |
| 058 | Achievements — Create Perfect Week Unlock | 1.0 | UNKNOWN | UNKNOWN | Table: Weekly Athlete Summary Conditions: - Perfect Week Eligible? = 1 - Perfect Week Unlock is empty - Perfect Week Automation Status = Rea | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN | UNKNOWN | script 1.0 | Perfect Week unlock Source Key |
| 059 | Achievements — Create XP Event from Achievement Unlock | v3.5 | UNKNOWN | 2026-06-05 | **Recommended:** record **created** · Shot Milestone not empty · XP Award Status Pending — **Do NOT filter on Ready for 059 XP** | UNKNOWN — confirm UI matches recommended trigger | recordId | UNKNOWN — confirm in Production Airtable UI | UNKNOWN — confirm in PROD Airtable UI | Script RECOMMENDED TRIGGER 2026-06-24; automation-index | Confirm created-trigger (not Ready-for-059 formula filter) before promote |
| 063 | Homework Review — Copy Enrollment Grade Band to Homework Completion | v2.0 | UNKNOWN | 2026-04-27 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in Production Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 064 | Homework Review — Prepare Homework XP Award | 2026-06-17 v12.1 | UNKNOWN | UNKNOWN | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in Production Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 065 | Homework Review — Create Homework XP Event | v9.2 | UNKNOWN | 2026-06-06 | Homework Completions when review complete, satisfactory, XP pending | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN | UNKNOWN | script v9.2 | Homework XP after review |
| 066 | 066 - Achievements and Milestones - Create Shot Milestone Unlocks | **v3.8** | 2026-08-14 | 2026-06-17 | Enrollments · Run Shot Milestone Check? | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in Production UI | **ON / v3.8 in Production Airtable (Mike 2026-08-19)** | Historical: v3.3 install 2026-07-24; v3.5 existing-unlock replay 2026-08-08 | Optional OMNI sandbox (K-H1) if still open |
| 067 | Homework — Link or Create Completion from Reflection Quiz | v1.0 | UNKNOWN | 2026-06-28 | Final Reflection Quiz Submissions when ready (created / Processing Status Pending, Enrollment set) | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in Production Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 070a | Email — Send Homework Asset Payload to Make | v4.1 | UNKNOWN | UNKNOWN | Submission Assets when Send to Make Trigger checked and homework asset ready | UNKNOWN — confirm in Airtable UI | recordId | Production E2E PASS (overnight evidence) | **OFF in PROD** — keep OFF ([AUTOMATION_070A_LAUNCH_DECISION.md](./v2/AUTOMATION_070A_LAUNCH_DECISION.md)) | overnight S10; 070a decision 2026-07-15; re-confirm UI still OFF | Do not promote until Mike schedules |
| 070b | Email — Send Video Asset Payload to Make | **v4.6** | 2026-08-17 | 2026-06-27 | Submission Assets · `Send to Make Trigger` checked · `Upload Status = Pending Link` · `Upload Destination = Video Feedback` | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in Production UI | **ON / v4.6 in Production Airtable (Mike 2026-08-19)** | Historical C-013 PROD E2E was **v4.4** (2026-07-11); Lambda season CodeOnly deploy 2026-08-19 | Optional Storage Key retry proof; rotate secrets exposed by deploy log |
| 070c | Email — Verify Async Video Asset Upload | v1.1 | 2026-07-11 | 2026-07-11 | Submission Assets · `Upload Status = Uploaded` · `Writeback Complete?` checked · canonical/hash fields populated · `Upload Error` blank · **repurpose existing slot if at limit** | UNKNOWN — confirm in Airtable UI | recordId | Production proven | **PROD COMPLETE v1.1** (C-013) — idempotent writeback verify; clears `Send to Make Trigger` | C-013 closeout; SCRIPT.version v1.1 | Hygiene only — version wording locked to script **v1.1** |
| 071 | Email — Send Homework Feedback Email Webhook | v3.4 | UNKNOWN | 2026-06-06 | Homework Completions when parent feedback ready and not yet sent | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in Production Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 072 | Email — Build Weekly Summary Email Package | v3.7 | UNKNOWN | 2026-05-19 | Weekly Athlete Summary when `Build Weekly Email Now?` checked | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in Production Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 073 | Email — Send Video Feedback Parent Email Webhook | v3.2 | UNKNOWN | 2026-06-17 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in Production Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 074 | Email — Send Weekly Summary Email Package to Make | v2.0 | UNKNOWN | 2026-05-29 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in Production Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 075 | Email — Build Challenge Welcome Email | v3.0 | UNKNOWN | 2026-05-29 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in Production Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 076 | Email — Build Daily Submission Email Package | v6.4 | UNKNOWN | UNKNOWN | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in Production Airtable UI | UNKNOWN — confirm in PROD Airtable UI | CONFIG.version v6.4 | Verify live trigger/version against GitHub before promote |
| 077 | Email — Send Daily Submission Email Package to Make | v5.0 | UNKNOWN | 2026-05-29 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in Production Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 101 | Zoom Attendance XP — Award Meeting XP | v5.4 | UNKNOWN | 2026-05-28 | Zoom Meetings when `Create XP Events` checked and meeting ready to award | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN | UNKNOWN | script v5.4; recording credit C-025 not implemented | Live attendance unchanged; recording via **117a** (repo) |
| 117 | Zoom — Create Zoom Recording Approval Communications Hub Handoff | **v2.1** | 2026-08-17 | 2026-07-20 | Zoom Attendance · Satisfactory recording path | Recording Quiz Satisfactory? | recordId, enrollmentRid, zoomMeetingRid, testMode | UNKNOWN | **v2.1 Hub queue create (Mike paste 2026-08-19)** — not XP; not Make 117f | Creates Email Handoff Queue; 079 → Hub → Resend | Keep filename historical; do not paste orchestrator |
| 111 | Video Review — Copy Enrollment Grade Band to Video Feedback | v1.1 | UNKNOWN | 2026-04-27 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in Production Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 112 | Video Review — Create Video Feedback from Submission Asset | v2.1 | UNKNOWN | 2026-05-19 | **OFF — monitor before delete** (legacy duplicate of **013**; do not re-enable) | Confirm still **OFF** in Airtable UI | recordId | **Expected OFF** — confirm in Production UI | **Expected OFF** — confirm in PROD UI | PROJECT_STATE; automation-index; V2-014 | Keep OFF; delete with **043** in maintenance window |
| 113 | Video Review — Assign Base Video XP | v6.2 | UNKNOWN | UNKNOWN | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in Production Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 114 | Video Review — Create or Update Video XP Event | v5.8 | UNKNOWN | 2026-05-23 | Video Feedback posted, XP positive, `Ready for XP Automation?` checked | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN | UNKNOWN | script v5.8 | Video XP steal-guard rerun |
| 115 | 115 - Engineering Test Framework - Run Testing Scenario Daily Submission | v1.8 | 2026-07-18 | 2026-07-06 | Testing Scenarios when **Run Test?** checked | UNKNOWN — confirm in Airtable UI | recordId | v1.8 C025 wait WAS Ready (not ZA Applied?); Queue? leave + 042 view re-entry; Daily/HW/Video unchanged from v1.3 | Not deployed (Production only) | C-025 ETF packet + C-020 checklist | Keep Production-only; never paste to PROD |
| 116 | 116 - Submission Assets - Apply Asset Reuse Decision Consequences | v1.0.1 | 2026-07-10 | 2026-07-10 | Submission Assets · **When record updated** · watched field **`Asset Reuse Decision`** · input `recordId` | UNKNOWN — confirm in Airtable UI | recordId | Production complete | PROD runtime PASS on fixture; doc hygiene pending | C-023-prod-automation-116-validation-2026-07-11.md | Sign-off checklist hygiene |

| 117a | 117a - Zoom Recording Credit - Award XP from Quiz Completion | v1.0 | 2026-07-15 | 2026-07-15 | Homework Completions when Satisfactory + Zoom Meeting linked | Completion Status Satisfactory; Zoom Meeting + Enrollment not empty | recordId | **Ready for Production install** — offline contract tests PASS 2026-07-16; **not live-installed/verified** | **Not installed** — do not activate PROD | C-025 tests PASS 2026-07-16; ZOOM_RECORDING_CREDIT_DEV_INSTALL.md | Execute Production packet after Mike auth; capture Source Keys |
| 117b | 117b - Zoom Recording Credit - Send Approval Email Webhook | v1.0 | 2026-07-15 | 2026-07-15 | Homework Completions when Satisfactory + send flag | Config email enabled; template key present | recordId, makeWebhookUrl | **Ready for Production install** — offline tests PASS 2026-07-16; **not live-verified** | **Not installed** — do not activate PROD | C-025 tests PASS 2026-07-16 | Production Make webhook only; leave OFF until dry-run |

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
| Zoom recording | **117a** | `ZOOM_RECORDING\|{meetingId}\|{enrollmentId}` — repo implemented; Production install pending |
| Zoom recording email | **117b** | Config-gated parent email after Satisfactory — repo implemented; Production install pending |

## Refresh procedure

1. Re-parse GitHub headers after automation commits.
2. During Production smoke, overwrite UNKNOWN status cells with observed Airtable UI version + date.
3. Link test evidence to deploy-checklist or audit paths under `docs/`.
4. Re-run `node tools/validate-v2-release-readiness.js`.


## Implementation status legend (2026-07-15)

| State | Meaning |
|-------|---------|
| Implemented in repository | Scripts/docs/tests exist in GitHub |
| Ready for Production installation | Install packet exists; no claim of live Production paste |
| Verified in Production | Live Production evidence captured (OMNI/Mike) |
| Ready for PROD promotion | Production verified + promotion checklist + Mike approval |
| Verified in PROD | Live PROD smoke evidence |

| Item | Repo | Ready Production install | Verified Production | Ready PROD | Verified PROD |
|------|------|-------------------|--------------|------------|---------------|
| 009 SCRIPT header | Yes | N/A (existing automation) | UNKNOWN | UNKNOWN | UNKNOWN |
| C-025 / 117a XP award | Yes | Yes | No | No | No |
| C-025 / 117b email | Yes | Yes | No | No | No |
| 117c–117e | Modular slices / reference | Prefer orchestrator **117** | — | — | — |
| **117f** email | Yes (v1.2.0) | Yes — paste packet + Production fixtures | **Pending UI paste** (Meta API 403); gates PASS offline | No | No |
| 066 OMNI confirm support | Yes (packet+harness) | N/A | **Pending OMNI** | No | No |
| 070a homework upload | Yes (existing) | Production evidence historical | Re-verify | **No — keep OFF** | No |
