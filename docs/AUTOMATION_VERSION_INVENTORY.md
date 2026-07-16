# Automation Version Inventory — Shooting Challenge V2

**Status:** Living inventory (GitHub headers + existing evidence)  
**Last updated:** 2026-07-16  
**Source scripts:** `airtable/automations/shooting-challenge/*.js`  
**Companion:** [automation-index.md](./automation-index.md) · [V2_RELEASE_CHECKLIST.md](./V2_RELEASE_CHECKLIST.md) · [deploy-checklists/DEV-release-readiness-verification-2026-07-16.md](./deploy-checklists/DEV-release-readiness-verification-2026-07-16.md)

**Repo verification (2026-07-16, Online Agent 2):** Offline release-readiness validator + C-025/066/header/engine/upload/web suites **PASS** (originally on tip `b320aa2`). No live Airtable poll — DEV/PROD UI columns remain UNKNOWN unless noted. **Merge gate closed:** #25/#26/#27 merged to `master` 2026-07-16; this OA2 package reconciled onto post-merge tip.

**Authorized DEV install attempt (2026-07-16, Online Agent 1):** Starting master `1d403df` (includes #25–#28). Pre-install checklist completed from docs + DEV snapshot `20260706`. **Live paste/smoke blocked** — no Airtable PAT or authenticated UI session in cloud environment. Evidence: [C-025-dev-install-attempt-2026-07-16.md](./deploy-checklists/C-025-dev-install-attempt-2026-07-16.md). 117a/117b remain **not live-installed**.

## How to read this table

| Column | Meaning |
|--------|---------|
| Script version / version date / original-written | From GitHub `SCRIPT` / `CONFIG` / docblock when present |
| Trigger / conditions / inputs | From script headers or automation-index; many still say *confirm in Airtable* |
| DEV / PROD status | **UNKNOWN** unless documented elsewhere (PROJECT_STATE, deploy-checklists, audits) |
| Test evidence | Existing repo docs only — not a live Airtable poll |
| Remaining action | Next operator step before treating the row as launch-ready |

**Unknowns are intentional.** Do not invent live Airtable versions. Fill DEV/PROD columns during release checklist execution.

**Base IDs:** DEV `appTetnuCZlCZdTCT` · PROD `appn84sqPw03zEbTT`

## Summary (2026-07-15)

| Metric | Value |
|--------|-------|
| Numbered automation scripts in repo | 50 |
| Rows with UNKNOWN GitHub version date / sparse headers | Common on legacy scripts — fill from Airtable UI at promote time |
| Rows with strong PROD evidence | 070b, 070c, 116 (partial), C-013 closeout |
| DEV-only by design | 115 (Engineering Test Framework) |
| Explicitly leave PROD OFF until scheduled | 070a homework upload |
| C-025 recording credit | **117a/117b implemented in repo** — ready for DEV install; OA1 authorized attempt **blocked** (no credentials); **not** live-installed |

## Inventory

| # | Name | Script version | Version date | Original written | Trigger | Conditions | Input variables | DEV status | PROD status | Test evidence | Remaining action |
|---|------|----------------|--------------|------------------|---------|------------|-----------------|------------|-------------|---------------|------------------|
| 001 | Enrollment Intake and Setup — Find or Create Athlete and Link Enrollment | v5.1 | UNKNOWN | 2026-05-20 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 002 | Enrollment Intake and Setup — Assign Grade Band — Initial | v8.1 | UNKNOWN | 2026-05-20 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 003 | Enrollment Intake and Setup — Assign Grade Band — If Grade Changes | v2.0 | UNKNOWN | 2026-05-20 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 005 | Submission Intake — Assign Week to Submission — Homework First | v4.0 | UNKNOWN | 2026-05-20 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 006 | Submission Intake — Set Video Count | v3.0 | UNKNOWN | 2026-05-20 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 007 | Submission Intake — Duplicate Checker for Submissions | v2.0 | UNKNOWN | 2026-05-20 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 009 | Submission Intake — Create Submission Assets | v1.0 | 2026-07-15 | 2026-06-20 | Submissions — confirm in Airtable UI | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | SCRIPT metadata established 2026-07-15 (runtime unchanged) | Verify live trigger; paste only if DEV/PROD drift |
| 010 | Submission Intake — Create XP Event from Submission | 10.4 | UNKNOWN | 2026-06-06 | Submissions when `Count This Submission?` checked and XP should be awarded | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV UI | UNKNOWN — confirm live | automation-index; script header v10.4 | Verify trigger + Source Key SUBMISSION_XP in DEV smoke |
| 013 | Submission Intake — Create or Link Video Feedback | v2.0 | UNKNOWN | 2026-05-20 | Submission Assets when video asset ready for Video Feedback prep | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 020 | Homework — Link or Create Homework Completion | v2.3 | UNKNOWN | 2026-05-20 | Submission Assets when homework asset ready for Homework Completion prep | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN | UNKNOWN | script v2.3 | DEV homework duplicate / recheck smoke |
| 021 | Submission Intake — Set Attachment Upload Status | v2.0 | UNKNOWN | 2026-04-13 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 022 | Submission Intake — Sync Child Upload Writeback | v1.1 | UNKNOWN | 2026-06-21 | Submission Assets when Upload Status is Uploaded/Processing/Error and child linked | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 023 | Submission Intake — Assign Enrollment to Submission | v2.0 | UNKNOWN | 2026-05-20 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 030 | Weekly Summary — Copy Enrollment Grade Band to Weekly Summary | v3.0 | UNKNOWN | 2026-05-27 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 031 | Weekly Summary — Find or Create WAS from Submission | v3.1 | UNKNOWN | 2026-05-20 | Submissions when `Count This Submission?` checked and WAS empty | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN | UNKNOWN | script v3.1 | WAS create from submission |
| 032 | Weekly Summary — Link Challenge Goal to WAS | v3.2 | UNKNOWN | 2026-05-27 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 033 | Weekly Summary — Assign Homework to WAS | v3.1 | UNKNOWN | 2026-05-27 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 034 | Weekly Summary — Set Previous Week Helper Values | v3.4 | UNKNOWN | 2026-05-20 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN | UNKNOWN | script v3.4 | Previous week helper order |
| 041 | 041 - Levels and Progression - Mark Enrollment for Level Recalculation | 3.0 | UNKNOWN | UNKNOWN | Table: XP Events Trigger: When record matches conditions  Trigger Conditions: Enrollment is not empty XP Points is greater than 0  Required  | Enrollment is not empty XP Points is greater than 0  Required Input Variable: recordId = Airtable re | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 042 | 042 - Levels and Progression - Assign Current and Next Level with Gate Blocking | 3.0 | UNKNOWN | 2026-06-02 | Table: Enrollments Trigger Type: When record enters view View: 042 - Needs Level Assignment  View Filter: Level Recalc Needed? is checked  R | Level Recalc Needed? is checked  Required Input Variable: recordId = Airtable record ID from the tri | recordId | UNKNOWN | UNKNOWN | script v3.0 | Gate blocked scenario in E2E matrix |
| 043 | Levels — Set Level Gate Rule from Next Level | v2.0 | UNKNOWN | 2026-05-20 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 053 | Achievements — Streak Occurrences Rebuild from Submissions | 5.1 | UNKNOWN | 2026-06-09 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN | UNKNOWN | script 5.1 | Streak rebuild smoke |
| 054 | Achievements — Create or Repair Streak XP Event | v5.4 | UNKNOWN | 2026-06-09 | Streak Occurrences when Source Status is Ready for XP | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN | UNKNOWN | script v5.4 | Streak XP Source Key rerun |
| 055 | Achievements — Recalculate Current Shooting Streak from Submission | v3.2 | UNKNOWN | UNKNOWN | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 056 | Achievements — Refresh Current Shooting Streaks Daily | v1.2 | UNKNOWN | UNKNOWN | *confirm in Airtable (scheduled)* | UNKNOWN — confirm in Airtable UI | UNKNOWN — typically recordId; confirm in Airtable | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 057 | Achievements — Calculate Perfect Week Eligibility | 1.2 | UNKNOWN | UNKNOWN | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN | UNKNOWN | script 1.2 | Perfect Week eligibility |
| 058 | Achievements — Create Perfect Week Unlock | 1.0 | UNKNOWN | UNKNOWN | Table: Weekly Athlete Summary Conditions: - Perfect Week Eligible? = 1 - Perfect Week Unlock is empty - Perfect Week Automation Status = Rea | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN | UNKNOWN | script 1.0 | Perfect Week unlock Source Key |
| 059 | Achievements — Create XP Event from Achievement Unlock | v3.5 | UNKNOWN | 2026-06-05 | Athlete Achievement Unlocks when XP Award Status Pending and Ready for 059 XP | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 063 | Homework Review — Copy Enrollment Grade Band to Homework Completion | v2.0 | UNKNOWN | 2026-04-27 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 064 | Homework Review — Prepare Homework XP Award | 2026-06-17 v12.1 | UNKNOWN | UNKNOWN | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 065 | Homework Review — Create Homework XP Event | v9.2 | UNKNOWN | 2026-06-06 | Homework Completions when review complete, satisfactory, XP pending | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN | UNKNOWN | script v9.2 | Homework XP after review |
| 066 | 066 - Achievements and Milestones - Create Shot Milestone Unlocks | v3.2 | 2026-07-06 | 2026-06-17 | Enrollments · Run Shot Milestone Check? | UNKNOWN — confirm in Airtable UI | recordId | ON / DEV ready (H-002); **live OMNI sandbox still pending** — offline harness PASS 2026-07-16 | UNKNOWN — confirm live version in Airtable UI | 066-dev-omni-confirmation-packet.md; harness PASS 2026-07-16; PROJECT_STATE | OMNI confirm Schmidt intake + crossings before closing H-002 |
| 067 | Homework — Link or Create Completion from Reflection Quiz | v1.0 | UNKNOWN | 2026-06-28 | Final Reflection Quiz Submissions when ready (created / Processing Status Pending, Enrollment set) | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 070a | Email — Send Homework Asset Payload to Make | v4.1 | UNKNOWN | UNKNOWN | Submission Assets when Send to Make Trigger checked and homework asset ready | UNKNOWN — confirm in Airtable UI | recordId | DEV E2E PASS (overnight evidence) | **OFF in PROD** — keep OFF ([AUTOMATION_070A_LAUNCH_DECISION.md](./v2/AUTOMATION_070A_LAUNCH_DECISION.md)) | overnight S10; 070a decision 2026-07-15; re-confirm UI still OFF | Do not promote until Mike schedules |
| 070b | Email — Send Video Asset Payload to Make | v4.4 | UNKNOWN | UNKNOWN | Submission Assets · `Send to Make Trigger` checked · `Upload Status = Pending Link` · `Upload Destination = Video Feedback` | UNKNOWN — confirm in Airtable UI | recordId | DEV proven | PROD COMPLETE (v4.4 per PROJECT_STATE 2026-07-11) | docs/deploy-checklists/C-013-prod-*; audits/C-013-prod-*; CONFIG.version v4.4 | Hygiene only |
| 070c | Email — Verify Async Video Asset Upload | v1.1 | UNKNOWN | UNKNOWN | Submission Assets · `Upload Status = Uploaded` · `Writeback Complete?` checked · canonical/hash fields populated · `Upload Error` blank · **repurpose existing slot if at limit** | UNKNOWN — confirm in Airtable UI | recordId | DEV proven | PROD COMPLETE (v1.1 per PROJECT_STATE) | C-013 closeout; CONFIG/SCRIPT.version v1.1 | Hygiene only |
| 071 | Email — Send Homework Feedback Email Webhook | v3.4 | UNKNOWN | 2026-06-06 | Homework Completions when parent feedback ready and not yet sent | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 072 | Email — Build Weekly Summary Email Package | v3.7 | UNKNOWN | 2026-05-19 | Weekly Athlete Summary when `Build Weekly Email Now?` checked | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 073 | Email — Send Video Feedback Parent Email Webhook | v3.2 | UNKNOWN | 2026-06-17 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 074 | Email — Send Weekly Summary Email Package to Make | v2.0 | UNKNOWN | 2026-05-29 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 075 | Email — Build Challenge Welcome Email | v3.0 | UNKNOWN | 2026-05-29 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 076 | Email — Build Daily Submission Email Package | v6.4 | UNKNOWN | UNKNOWN | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | CONFIG.version v6.4 | Verify live trigger/version against GitHub before promote |
| 077 | Email — Send Daily Submission Email Package to Make | v5.0 | UNKNOWN | 2026-05-29 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 101 | Zoom Attendance XP — Award Meeting XP | v5.4 | UNKNOWN | 2026-05-28 | Zoom Meetings when `Create XP Events` checked and meeting ready to award | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN | UNKNOWN | script v5.4; recording credit C-025 not implemented | Live attendance unchanged; recording via **117a** (repo) |
| 111 | Video Review — Copy Enrollment Grade Band to Video Feedback | v1.1 | UNKNOWN | 2026-04-27 | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 112 | Video Review — Create Video Feedback from Submission Asset | v2.1 | UNKNOWN | 2026-05-19 | **OFF — monitor before delete** (legacy duplicate of **013**) | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 113 | Video Review — Assign Base Video XP | v6.2 | UNKNOWN | UNKNOWN | *confirm in Airtable* | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN — confirm in DEV Airtable UI | UNKNOWN — confirm in PROD Airtable UI | GitHub script header + docs/automation-index.md | Verify live trigger/version against GitHub before promote |
| 114 | Video Review — Create or Update Video XP Event | v5.8 | UNKNOWN | 2026-05-23 | Video Feedback posted, XP positive, `Ready for XP Automation?` checked | UNKNOWN — confirm in Airtable UI | recordId | UNKNOWN | UNKNOWN | script v5.8 | Video XP steal-guard rerun |
| 115 | 115 - Engineering Test Framework - Run Testing Scenario Daily Submission | v1.3 | 2026-07-07 | 2026-07-06 | Testing Scenarios when **Run Test?** checked | UNKNOWN — confirm in Airtable UI | recordId | v1.3 DEV functional complete 2026-07-07 | Not deployed (DEV only) | C-020 checklist | Keep DEV-only until promotion doc |
| 116 | 116 - Submission Assets - Apply Asset Reuse Decision Consequences | v1.0.1 | 2026-07-10 | 2026-07-10 | Submission Assets · **When record updated** · watched field **`Asset Reuse Decision`** · input `recordId` | UNKNOWN — confirm in Airtable UI | recordId | DEV complete | PROD runtime PASS on fixture; doc hygiene pending | C-023-prod-automation-116-validation-2026-07-11.md | Sign-off checklist hygiene |

| 117a | 117a - Zoom Recording Credit - Award XP from Quiz Completion | v1.0 | 2026-07-15 | 2026-07-15 | Homework Completions when Satisfactory + Zoom Meeting linked | Completion Status Satisfactory; Zoom Meeting + Enrollment not empty | recordId | **Ready for DEV install** — OA1 pre-install checklist done 2026-07-16; **live paste blocked (no PAT/UI)**; not installed | **Not installed** — do not activate PROD | Offline PASS; [C-025-dev-install-attempt-2026-07-16.md](./deploy-checklists/C-025-dev-install-attempt-2026-07-16.md) | Provide DEV PAT or OMNI paste; reconcile XP Bucket `Zoom` vs `Zoom Attendance`; add XP Source `Zoom Recording` |
| 117b | 117b - Zoom Recording Credit - Send Approval Email Webhook | v1.0 | 2026-07-15 | 2026-07-15 | Homework Completions when Satisfactory + send flag | Config email enabled; template key present | recordId, makeWebhookUrl | **Ready for DEV install** — OA1 blocked same as 117a; webhook DEV-safety unproven | **Not installed** — do not activate PROD | Offline PASS; install-attempt packet | Prove DEV Make webhook before ON; leave OFF until dry-run |

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
| C-025 / 117a XP award | Yes | Yes | No (OA1 blocked 2026-07-16) | No | No |
| C-025 / 117b email | Yes | Yes | No (OA1 blocked 2026-07-16) | No | No |
| 117c–117f | Not required | — | — | — | — |
| 066 OMNI confirm support | Yes (packet+harness) | N/A | **Pending OMNI** | No | No |
| 070a homework upload | Yes (existing) | DEV evidence historical | Re-verify | **No — keep OFF** | No |
