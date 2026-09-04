# 127 Sports Intensity ? Master Future Work List



**Project:** 127 Sports Intensity Shooting Challenge and public website  

**Repository:** `Schmidt127/127-si-shooting-challenge`  

**Created:** 2026-08-24  

**Purpose:** One owner-approved list of future app, Airtable, AWS, email, payment, award, and website work. Each item is written so it can later become a focused Cursor or Airtable/OMNI prompt.



## Governance



**Canonical future-work source:** this document.



**Operating mode:** [CHATGPT-PROJECT-OPERATING-MODE.md](./CHATGPT-PROJECT-OPERATING-MODE.md) · [AGENTS.md](../AGENTS.md)



**Work-list policy:** Items already listed here may proceed without a separate backlog-ID approval. New work must be added to this list and assigned an identifier before implementation.



**Historical evidence:** [SHOOTING_CHALLENGE_COMPLETION_MASTER.md](./SHOOTING_CHALLENGE_COMPLETION_MASTER.md) · retired [v2-change-backlog.md](./v2-change-backlog.md) (git: `2f243d8`) · retired [CHATGPT-MASTER-PLAN-BRIEF.md](./CHATGPT-MASTER-PLAN-BRIEF.md) (git: `a081b76`)



---



## Mike-approved decisions ? 2026-08-27



These decisions are authoritative for future implementation prompts and production configuration.



### Streak rewards



After an athlete's shooting streak ends, a new streak begins automatically. Streak achievements and their rewards may be earned again on later qualifying streaks. Deterministic instance keys and deduplication must still prevent duplicate credit for the same streak instance.



### Recorded Zoom meetings



Recorded Zoom meetings do not count toward Perfect Week requirements. They do count toward level-gate advancement and earn **one-half of the normal live-attendance XP**. Live attendance and recorded-meeting credit must remain distinct and must not create duplicate credit for the same meeting.



### 2026?2027 early-bird registration



Use an early-bird registration period for the 2026?2027 challenge. Dates, pricing, eligibility, cutoff behavior, and payment/writeback handling must be defined and tested before activation. This decision does not activate registration or change the current paid-only FUT-003 Make scenario by itself.



### Program naming and public taxonomy (2026-08-31)



**Preferred program name:** Jr. Referee Clinic. **Acceptable short form** where space is limited: Jr. Ref Clinic. **Never use:** Jr. Ref.



**Public taxonomy:** Use **Youth Programs** (not ?Youth opportunities?) for Shooting Challenge, Dribbling Challenge, and Jr. Referee Clinic. Use **Coach Tools** for Brackets, Team Shot Tracker, and **State Rankings** (not ?State Standings?).



### Coach Tools product naming ? State Rankings (2026-09-01)



**Preferred public name:** **State Rankings** (matches `/rankings` app and `apps.ts`). **Do not use:** State Standings.



### SC-034 / Perfect Week config closeout (2026-08-27)



Repository and Production closeout for the bounded SC-034 / V2-002 pass:



| Item | Status | Evidence |

|---|---|---|

| **V2-002 / SC-034** repository implementation | **COMPLETE** | `audits/2026-08-27-SC-034-config-hardcode-audit.md`; `lib/config-selection/`; 57-script scan; contract tests |

| **Automation 057 v2.2** | **COMPLETE (live script)** | Config schema renamed; live script uses `Perfect Week Video Minimum`; Automations Code tracker may lag ? do not repaste |

| **Config-driven Perfect Week video minimum** | **COMPLETE** | Config field **`Perfect Week Video Minimum`** = 3; `lib/config-selection/perfect-week-video-minimum.js` |

| **WAS Config lookup + formula** | **COMPLETE** | Lookup **`Config: Perfect Week Video Minimum`**; formula **`Perfect Week Video Requirement Met?`** live PROD |

| **Automation 059 trigger correction** | **COMPLETE** | Mike removed `Shot Milestone is not empty` filter; Pending-only created trigger ? [`059-perfect-week-trigger-coverage.md`](./deploy-checklists/059-perfect-week-trigger-coverage.md) |

| **058/059 script changes** | **Not required** | `docs/testing/perfect-week/PERFECT-WEEK-DEPENDENCY-AUDIT.md` ? eligibility from 057 + WAS formulas |

| **Disposable Perfect Week end-to-end test** | **COMPLETE** | **SC-PW-E2E** ? WAS `recl3DmBh22ADPWWe` unlock Awarded + 100 XP. Evidence `docs/testing/evidence/sc-pw-e2e/award-was-recl3DmBh22ADPWWe-2026-08-29-mcp.json`. Do not re-`--apply`. |

| **General schema field typo renames** | **DEFERRED** | `Perfect Week Video Minimum` typo fixed; gate summary / Softr flag / HC RID typos ? SAFE-MIGRATION-PLAN P3; **SC-144** |



## How to use this document



- This is the single planning list for future work.

- Each item is intentionally separate so it can be implemented, tested, and closed independently.

- Do not begin implementation from a vague note. Convert the item into a Phase 2 implementation brief first.

- Production Airtable changes, live sends, payment activation, and destructive cleanup remain Mike-approved actions.

- Technical evidence, deployment checklists, test reports, current-truth records, and historical closeout evidence are not replaced by this list.



## Status and priority vocabulary



**Operator snapshot (Section G):** **COMPLETE** · **IN PROGRESS** · **BLOCKED** · **READY** · **DEFERRED**



| Snapshot status | Meaning |

|---|---|

| **COMPLETE** | Implemented and verified (repo and/or Production as cited in evidence). |

| **IN PROGRESS** | Active work, partial proof, or Production paste/attestation still open. |

| **BLOCKED** | Waiting on an explicit owner decision or external dependency. |

| **READY** | Requirements clear; not started or queued for next prompt. |

| **DEFERRED** | Intentionally postponed or rejected direction. |



**Legacy narrative sections (A?F)** may still use older labels (`Planned`, `Live Tested in PROD`, `Built in Repository`, etc.). Treat **Section G** as the current operator queue.



| Legacy status | Meaning |

|---|---|

| Brainstormed | Idea captured; requirements still need refinement. |

| Planned | Product direction is clear enough to write an implementation prompt. |

| Ready for prompt | Requirements and acceptance criteria are sufficiently defined. |

| In progress | Work has started. |

| Deferred | Intentionally postponed. |

| Complete | Future request is fully implemented and verified. |

| Not approved | Explicitly rejected or replaced. |



Priority: **P0** launch/security blocker · **P1** important parent/athlete experience or reliability · **P2** valuable improvement · **P3** low priority/future experiment.



---



## A. Airtable and application behavior



### FUT-001 ? Match homework by assignment identity, not HW1/HW2 slot



**Priority:** P1  

**Status:** Assignment-identity Complete (GitHub + Production). **Late-credit policy (2026-09-03):** GitHub **020 v3.9 / 065 v10.6 / 057 v2.4** via PR **#372** (+ live 057 advanced to **2.4**). Production **Automations Code** 2026-09-04 MCP: **020 v3.9 / 065 v10.6 / 057 2.4** all **Live** (**PASTE-ALIGNED**). **Disposable late-HW / Perfect Week exclusion behavior proof COMPLETE 2026-09-04** ? [`audits/FUT-001-LATE-CREDIT-LIVE-PROOF-20260904.md`](./audits/FUT-001-LATE-CREDIT-LIVE-PROOF-20260904.md) · [`testing/evidence/fut-001-late-credit/closeout-20260904.json`](./testing/evidence/fut-001-late-credit/closeout-20260904.json).  

**Systems:** Airtable, homework intake, Homework Completions, XP, parent submission flow



Allow a parent or athlete to submit an assignment in either visible homework slot. The system must identify the assignment by its assignment/lesson identity and match it to the correct scheduled assignment. The HW number is not authoritative because slot numbering may change from year to year.



**Approved late-credit policy (2026-09-03):** Homework remains selectable whenever visible or assigned through a PHA. Students may submit before, during, or after the official week. Late satisfactory homework receives **full credit and normal XP**. Grading delay does not penalize. Submission Date is the student?s submission date. Needs Revision receives no homework XP until satisfactory. Revisions update the existing completion (no duplicate HC / XP Event). Late homework counts toward total homework history, XP, level gates, and the private dashboard, but **does not** count toward Perfect Week for the original week.



The system must preserve checks for assignment identity, enrollment, challenge/season, and duplicate credit. Multiple uploads or repeat submissions are allowed, but only one Homework Completion and one XP award may be credited for the same athlete, assignment identity, and enrollment context.



**Acceptance criteria:** correct assignment matching across either slot; late full-credit XP once satisfactory; Perfect Week on-time gate; repeat uploads reviewable; XP deduplicated; no dependence on HW1/HW2 names.



**Implementation (2026-08-25):** GitHub **020 v3.8** + **065 v10.4**; contracts in `lib/homework-contracts/assignment-identity.js`. Promotion doc: [FUT-001-homework-assignment-identity-deadline.md](./deploy-checklists/FUT-001-homework-assignment-identity-deadline.md).



**PR #264 (2026-08-28):** Branch `fix/fut-001-homework-assignment-identity` ? commit `91c65b36` + CI fix `3d497f4a` (065 offline Weeks mock). **Merged.** Production Automations Code **020 v3.8 / 065 v10.4 Live** (MCP 2026-08-29/30) at that time.



**PR #372 (2026-09-03):** Late-credit policy ? merge `da009262`. Operator checklist: [`deploy-checklists/homework-late-credit-policy-020-057-065.md`](./deploy-checklists/homework-late-credit-policy-020-057-065.md). Automations Code column **PASTE-ALIGNED** 2026-09-03 (Agent 4 MCP). **Do not paste from agents.**



**Live disposable proof (2026-09-04 Agent 4):** Late HC Submission Date after PHA Due Date ? full `HOMEWORK_XP` (35) on official Early Bird week; Perfect Week homework satisfactory count stayed **0**; no duplicate XP on re-grade. Report: [`audits/FUT-001-LATE-CREDIT-LIVE-PROOF-20260904.md`](./audits/FUT-001-LATE-CREDIT-LIVE-PROOF-20260904.md).



### FUT-002 ? Audit and remove unused Airtable fields



**Priority:** P2  

**Status:** **Batch 1 COMPLETE (2026-08-31)** + **SA XP text stubs deleted (2026-08-31)** + **Batch 2 audit READY (2026-09-01)** ? five `ZZZ DELETE ?` fields + Submission Assets unused text fields `XP Events` / `XP Events copy` removed. Live after SA stubs: **1363 fields / 35 tables**. Batch 2 Phase A: **5** quarantine-ready text stubs (Mike UI delete pending). Later: Config Drive roots + `unknown` interface review.  

**Systems:** Airtable schema, automations, email payloads, website/data contracts



Inventory every Airtable table and identify fields that are unused, obsolete, duplicated, or no longer part of the current app. This includes legacy Google Drive URL, Google Drive ID, Google Drive folder ID, and similarly named fields. Check formulas, automations, scripts, emails, views, interfaces, website/data contracts, and documentation before deleting anything.



Because all current records are test data that will be deleted before the next challenge, no historical-value preservation is required. The cleanup must still distinguish truly unused fields from fields needed by current production or future-approved workflows.



After confirming no active dependency remains, delete the obsolete fields and update documentation, schema snapshots, field maps, tests, and any remaining references.



**Acceptance criteria:** complete field/dependency inventory; unused and obsolete fields classified; fields removed only after audit; tests and documentation updated; no active S3/Lambda or future-approved fields removed accidentally.



**Audit deliverables (2026-08-30):** [`docs/audits/FUT-002-unused-field-inventory-2026-08-30.md`](./audits/FUT-002-unused-field-inventory-2026-08-30.md) · [`docs/audits/fut-002-unused-field-inventory.json`](./audits/fut-002-unused-field-inventory.json) · tool `tools/airtable/fut_002_field_inventory.py`. Offline snapshot (pre-cleanup): **1347 fields**.



**Live cleanup (2026-08-30 ? batch-1 close 2026-08-31):** [`docs/audits/field-inventory/`](./audits/field-inventory/) · [`docs/audits/FUT-002-cleanup-session-2026-08-30.md`](./audits/FUT-002-cleanup-session-2026-08-30.md) · [`docs/audits/FUT-002-cleanup-queue.md`](./audits/FUT-002-cleanup-queue.md) · packet [`docs/deploy-checklists/FUT-002-batch1-quarantined-field-delete.md`](./deploy-checklists/FUT-002-batch1-quarantined-field-delete.md). Quarantine day: **1355 fields / 33 tables**; Asset Key retargeted; five fields quarantined then **Mike UI-deleted**. Post-delete verify: [`testing/evidence/fut-002/batch1-live-verify.json`](./testing/evidence/fut-002/batch1-live-verify.json) · schema `airtable/schema/snapshots/prod-20260831-fut002-batch1/` (**1350** fields). Meta API still cannot DELETE fields (404) ? UI required for any future batch.



**Submission Assets XP text stubs (2026-08-31):** Mike UI-deleted unused `XP Events` (`fldwOklyDaW3nN2Kz`) and `XP Events copy` (`fld5Emwipb3UjAMz9`) ? single-line text only; not XP link fields. Packet: [`deploy-checklists/FUT-002-sa-xp-text-stubs-delete.md`](./deploy-checklists/FUT-002-sa-xp-text-stubs-delete.md). Evidence: [`testing/evidence/fut-002/sa-xp-text-stubs-deleted-2026-08-31.json`](./testing/evidence/fut-002/sa-xp-text-stubs-deleted-2026-08-31.json).



**Batch 2 audit (2026-09-01):** [`docs/audits/FUT-002-batch2-candidate-queue.md`](./audits/FUT-002-batch2-candidate-queue.md) · [`docs/audits/fut-002-batch2-candidates.json`](./audits/fut-002-batch2-candidates.json) · operator packet [`docs/deploy-checklists/FUT-002-batch2-quarantined-field-delete.md`](./deploy-checklists/FUT-002-batch2-quarantined-field-delete.md). **303** candidates reviewed; **5** quarantine-ready text stubs (AAU, Shot Milestones, VF, Weeks×2). Delete pending Mike UI. SNAPSHOT DATE: 2026-08-31 (no live Meta API in agent run).



### FUT-003 ? Stripe payment writeback to Airtable



**Priority:** P1  

**Status:** **Paid route validated ? ready for Mike Make activation** (2026-08-26 Maia; A5 re-audit 2026-09-04). Make scenario remains **inactive** by design until Mike turns it ON. Free/$0 path **deferred Nov/Dec 2026**. Not a website/XP launch blocker; **required when paid registration opens**.  

**Systems:** Fillout webhook, Make.com, Stripe API, Airtable `Payment Transactions` + `Enrollments`  

**Make scenario:** `FUT-003 - Fillout Stripe Payment to Airtable Payment Transactions` ? **inactive** at validation time; ready for Mike activation when approved  

**Audit (2026-09-04):** [`docs/audits/FUT-003-STRIPE-STATUS-20260904.md`](./audits/FUT-003-STRIPE-STATUS-20260904.md)



After Stripe accepts a registration payment, write the payment result back to Airtable. At minimum, capture the amount paid and whether a coupon or promotion code was used.



**Verified paid-only workflow (2026-08-26 ? controlled Production Make test, scenario inactive):**



| Step | Result |

|------|--------|

| Fillout webhook receives submission | Pass |

| Payload normalized (Module 4) | Pass |

| One **10-second delay** before Enrollment lookup | Present by design |

| Enrollment found via `{Fillout Submission Id} = "{{4.filloutSubmissionId}}"` (Module 16) | Pass |

| Stripe **PaymentIntent** retrieved (Module 6) | Pass |

| Payment amount calculated correctly (cents ? dollars) | Pass ? **$2.00** test |

| Payment Transactions duplicate search runs once (Module 7) | Pass |

| One **Payment Transactions** record created (Module 8) | Pass |

| Enrollment linked once (Module 12) | Pass |

| Duplicate protection | Pass ? no duplicate transaction on replay |

| **Payment Status** = `Paid` | Pass |

| **Stripe Payment ID** stored | Pass |

| **Actual Amount Paid** stored | Pass ? `$2.00` |

| **Fillout Submission ID** stored | Pass |

| **Payment Date** stored | Pass |

| **Make Processed At** stored | Pass |



**Final tested transaction (Maia report):** Actual Amount Paid `$2.00` · Payment Status `Paid` · one Payment Transactions row · one Enrollment link update · no duplicate row.



**Scope note:** This validation covers the **paid PaymentIntent path only**. It does **not** change Airtable XP logic, XP calculations, or XP award amounts.



**Deferred until November/December 2026 (do not mark complete):**



| Item | Status |

|------|--------|

| 100% coupon / $0 payment route | **Deferred** |

| `No Payment Required` payment status | **Deferred** |

| Stripe Checkout Session webhook route | **Deferred** |

| Stripe metadata correlation | **Deferred** |

| Custom Checkout Session creation | **Deferred** |

| Coupon / promotion-code capture | **Deferred** (Fillout webhook gap) |

| Enterprise webhook architecture | **Deferred** |

| Advanced Stripe reconciliation | **Deferred** |



Do **not** add a blank **Stripe Payment ID** route to the current paid-only workflow.



**Acceptance criteria (paid path):** paid test payment with amount + duplicate protection + enrollment linkage + field writeback ? **verified**; coupon/promotion evidence ? **deferred**; discounted/zero-dollar test ? **deferred** (free route not built).



**Promotion doc:** [FUT-003-fillout-stripe-payment-writeback.md](./deploy-checklists/FUT-003-fillout-stripe-payment-writeback.md)



### FUT-004 ? Automated award emailer to replace Tremendous



**Priority:** P3  

**Status:** Deferred  

**Systems:** Airtable awards, email/communications system, future reward provider if needed



Do not continue the Tremendous integration for awards. Later, design and implement an automated award emailer as its replacement. Keep the first version simple and defer provider selection and advanced requirements until the app?s remaining automation capacity is known.



The future prompt should define which award types are included, who receives the email, how duplicate sends are prevented, and how delivery status is recorded.



### FUT-005 ? Automated accomplishment emails



**Priority:** P3  

**Status:** Deferred  

**Systems:** Airtable XP/achievement events, communications system



Future automated emails may notify families about meaningful accomplishments:



- Streak occurrence

- Shot milestone reached

- Challenge shot goal met



This is intentionally separate from the award emailer and should not be started until the current automation inventory and remaining capacity are reviewed.



### FUT-006 ? Parent-facing email workflows available for the upcoming challenge



**Priority:** P1  

**Status:** Complete  

**Systems:** Daily Submission, Welcome, Weekly Summary, Zoom Attendance, Video/Homework Feedback emails



The current parent-facing email workflows are functional and can be used for the upcoming challenge:



- Daily Submission email

- Welcome email

- Weekly Summary email

- Zoom Attendance email, which is not yet in Production



Optional future work may improve visual presentation or wording, but email functionality is not a blocker for the upcoming challenge.



**Remaining writeback gap:** ~~Weekly Athlete Summary Sent? after Hub ? Resend (still TBD)~~ **CLOSED in repo** (2026-09-01) ? Hub `source-writeback-weekly-summary.js` + contract `WEEKLY_SUMMARY_SOURCE_WRITEBACK_v1.md`; **paste/deploy pending** ([`deploy-checklists/FUT-006-weekly-was-hub-writeback.md`](./deploy-checklists/FUT-006-weekly-was-hub-writeback.md)). Homework Completions Sent?/Sent On ? **FUT-032 COMPLETE** (2026-08-31 Mike verify). Hub PR [#42](https://github.com/Schmidt127/communications/pull/42) **MERGED**.



---



## B. AWS storage and secure media



### FUT-007 ? Simplify future AWS media naming and support future media types



**Priority:** P2  

**Status:** **Phase 3 prep shipped** ? Lambda code behind flag (`USE_FUT007_BASENAME` default off); DEV deploy pending  

**Systems:** Upload Lambda, S3, Airtable storage-key/writeback fields  

**Spec:** [FUT-007-AWS-MEDIA-NAMING-SPEC.md](./next-wave/aws-media/FUT-007-AWS-MEDIA-NAMING-SPEC.md) · Promotion: [FUT-007-aws-media-naming.md](./deploy-checklists/FUT-007-aws-media-naming.md) · Prep helpers: [`lib/aws-media-naming/`](../lib/aws-media-naming/) · Lambda: [`upload_core/fut007_basename.py`](../lambda/upload-asset/upload_core/fut007_basename.py)



Change the naming convention for future uploads only. Existing test uploads will be deleted before the next challenge, so no migration is required. Supported future upload categories should include:



- `HW` for homework

- `VIDEO` for video feedback

- `HEADSHOT` for future athlete headshot uploads; this is not currently in use but should be supported by the naming design



Proposed pattern:



`YYYYMMDD_HW-or-VIDEO-or-HEADSHOT_LastName_FirstName_CustomVideoName`



Examples:



- `20260817_HW_Boltz_Drew_ShotChallenge`

- `20260817_VIDEO_Boltz_Drew_OffTheDribble`

- `20260817_HEADSHOT_Boltz_Drew_Profile`



Do not include the Airtable record ID in the filename. Use the **Custom Video File Name** in the final filename position. The Airtable record ID remains system metadata and is not part of the human-facing filename.



The prompt must define sanitization, collision handling, missing-name behavior, and preservation of the Airtable record ID elsewhere as system metadata.



**Delivered (2026-09-01):** Full spec + promotion checklist + `lib/aws-media-naming/` offline tests (21 vitest cases). **Phase 3 prep (2026-09-01):** `upload_core/fut007_basename.py` + `storage_key.py` integration behind `USE_FUT007_BASENAME` (default off). **No Lambda deploy.**



### FUT-008 ? Custom Video File Name field and parent-facing usage



**Priority:** P1  

**Status:** Complete ? field created; future workflow remains in FUT-009  

**Systems:** Airtable Video Feedback, correction interface, S3 upload naming, parent emails, website



The Airtable field **Custom Video File Name** has already been created and is ready for use in the Video Feedback correction interface. Mike should be able to enter names such as `OffTheDribble`, `FreeThrows`, or `ShootingInTheRain`.



Use the Custom Video File Name everywhere a parent-facing or coach-facing descriptive video name is appropriate, including the future S3 filename, Video Feedback display, email copy, and website display. Preserve the original upload metadata separately when needed for audit/debugging.



### FUT-009 ? AWS storage structure and corrected-video naming workflow



**Priority:** P2  

**Status:** **COMPLETE / Live Tested (2026-09-04)** ? Lambda `POST /fut009/rename` live; Automation **120** deployed **Live**; disposable Schmidt rename + idempotent re-run + dual S3 object proof passed. Writeback omits absent Formatted Upload Name; activity date resolves from SA `Date`.  

**Systems:** Video Feedback correction interface, Lambda/S3, Airtable links  

**Audit (2026-09-04):** [`docs/audits/FUT-009-LAMBDA-STATUS-20260904.md`](./audits/FUT-009-LAMBDA-STATUS-20260904.md)



Combine the AWS bucket-structure review and corrected-video naming workflow into one future project. Review the current bucket structure, folder/key organization, naming rules, retention expectations, and separation of homework, video, and future headshot assets.



When Mike corrects a video and supplies a Custom Video File Name, provide a safe workflow to apply that name to the stored object or create a clearly named replacement object. The secure Lambda Reviewer URL must remain valid or be regenerated safely. The workflow must not create duplicate XP, duplicate Video Feedback records, or broken parent links.



Keep the S3 bucket private and preserve the Lambda viewer architecture.



**Delivered (2026-09-01):** Phase 2 brief ? [`docs/next-wave/aws-media/FUT-009-AWS-STORAGE-STRUCTURE-BRIEF.md`](./next-wave/aws-media/FUT-009-AWS-STORAGE-STRUCTURE-BRIEF.md). **Implementation (2026-09-01):** FUT-009 rename worker (`lambda/upload-asset/upload_core/fut009_rename.py`), Option D destination builder, dual-prefix Storage Key validation (FUT-010 alignment), CLI `tools/airtable/fut_009_video_rename.py` (recovery/backfill only), extension `fut-009-video-rename.js`, **Automation 120** automatic trigger (`120-?-apply-fut009-s3-video-rename.js`), Lambda `POST /fut009/rename`, promotion doc [`docs/deploy-checklists/FUT-009-aws-storage-rename.md`](./deploy-checklists/FUT-009-aws-storage-rename.md). Coach confirmation via **Confirm S3 Video Rename** triggers Automation 120. **Activated (2026-09-04):** CodeOnly Lambda deploy + disposable Production rename proof; Automations Status **Live**. Optional residual: secret rotation; PKG-004 audit fields; Formatted Upload Name if product wants basename writeback.



### FUT-010 ? Delete Airtable intake attachments after verified S3 upload



**Priority:** P1  

**Status:** **Dry-run complete (2026-08-30)** ? 0 eligible rows in Production preflight/reconcile; supervised apply pending Mike attestation + AWS creds  

**Systems:** Airtable, Submission Assets, Homework Completions, AWS S3, Lambda viewer pipeline



Reduce Airtable storage usage by deleting the original **Submission Assets** intake attachment after the uploaded file has been successfully written to AWS S3 and the durable file path is confirmed.



**Scope note:** Homework coverage means **homework-route Submission Assets** (`Upload Destination = Homework Completions`). Legacy **`Homework Completions.Airtable Attachment`** is **out of scope** ? separate future work (see SC-100 / FUT-002).



**Requirements:**



- Apply to homework-route and video-route **Submission Assets** intake attachments.

- Confirm `Upload Status = Uploaded`.

- Confirm the S3 object exists and is accessible through the expected AWS storage path.

- Confirm the stored S3 key is present.

- Confirm the Lambda viewer URL or other approved parent-facing URL is valid where applicable.

- Delete only the Airtable attachment contents.

- Never delete the Airtable record.

- Never delete the S3 object.

- Never delete an attachment when the upload is pending, failed, incomplete, or uncertain.

- Preserve all Airtable record links, S3 storage keys, upload status, review status, XP links, and audit metadata.

- Make the deletion idempotent and safe to retry.

- Include a reconciliation process for records where the Airtable attachment remains after a successful upload.

- Prevent reprocessing from creating duplicate S3 objects, duplicate Video Feedback records, duplicate Homework Completions, or duplicate XP.

- Add a dry-run mode before any destructive attachment cleanup.

- Require logging of record ID, asset purpose, S3 key, verification result, deletion result, and failure reason.

- Do not delete Airtable attachments until the AWS verification step has passed.



**Related items:** FUT-007 (future AWS media naming), FUT-009 (AWS storage structure and corrected-video workflow), **FUT-040** (automatic migration orchestration + headshots ? extends this item; do not duplicate), SC-094 (video storage on program-owned S3), SC-095 (homework storage on S3 via 070a), SC-096 (canonical HTTPS URLs on assets), SC-099 (writeback verification via 070c), SC-100 (attachment / Drive retirement strategy ? broader planning; remains deferred).



**Acceptance criteria:**



1. A successfully uploaded **homework-route Submission Asset** attachment is verified in S3 and then removed from Airtable.

2. A successfully uploaded **video-route Submission Asset** attachment is verified in S3 and then removed from Airtable.

3. Failed or uncertain uploads retain their Airtable attachment.

4. Re-running the cleanup does not create duplicate files or fail incorrectly.

5. S3/Lambda links continue to work after the Airtable attachment is removed.

6. The Airtable record and all application metadata remain intact.

7. A dry-run report identifies eligible, skipped, and failed records without deleting anything.

8. Automated tests cover successful cleanup, failed upload, missing S3 object, invalid URL, retry, and duplicate-processing cases.



**Implementation (2026-08-28, revised):** Shared helpers `lib/intake-attachment-cleanup/` (fail-closed verification contract); CLI `tools/airtable/fut_010_intake_attachment_cleanup.py` (dry-run default, reconcile filter on apply, per-record AWS error skip, `--confirm-delete` required); extension `airtable/extension-scripts/safe-backfills/fut-010-clear-intake-attachments.js`. **Out of scope:** `Homework Completions.Airtable Attachment`. Promotion doc: [FUT-010-intake-attachment-cleanup.md](./deploy-checklists/FUT-010-intake-attachment-cleanup.md). **Dry-run evidence (2026-08-30 R3):** [`testing/evidence/FUT-010-DRY-RUN-2026-08-30-R3.md`](./testing/evidence/FUT-010-DRY-RUN-2026-08-30-R3.md) ? **0 eligible** (homework scope 0); **no deletion request**; Production attachment delete **not** executed.



---



## C. Website and athlete experience



Each page is a separate future item so it can receive its own focused Cursor prompt, tests, and review.



### FUT-011 ? Athlete page: level graphic and hero-label polish



**Priority:** P1  

**Status:** Complete ? 2026-08-25 · implementation `901812e` · production verified `900e61c`  

**Systems:** Website athlete profile, Airtable level data, design system



**Summary:** Public profile hero uses `AthleteLevelDisplay` with large level graphic and high-contrast hero badge; at-a-glance panel surfaces level for parents.



**Tests:** 349 Vitest · typecheck · lint · build pass.



**Production verification (2026-08-25):** Vercel Production deploy `900e61c` success · slug `perfect-week-testing` · hero + glance + Game Log pass · mobile overflow 0px.



**Limitation:** Level still appears in hero, snapshot, and progression (intentional emphasis).



On the athlete page, place the appropriate level graphic beside or near the athlete?s displayed shooter level, such as Beginner. Fix the current blue level label with black text so it has sufficient contrast and matches the other hero labels professionally.



### FUT-012 ? Athlete page: professional Game Log presentation



**Priority:** P1  

**Status:** Complete ? 2026-08-25 · implementation `901812e` · production verified `900e61c` · **XP Event Log presentation finalized 2026-08-26**  

**Systems:** Website XP activity table, XP Events, Airtable presentation fields



**Summary:** Game Log short labels and contextual details; server-side pagination via `GET /api/athletes/[slug]/game-log` with cursor (`activityDate` + XP Event record id), opaque row keys, Load more with loading/retry, enrollment-scoped isolation.



**XP Event Log ? completed website presentation (2026-08-26, display-only ? no XP calculation or Airtable XP logic changes):**



| Feature | Status |

|---------|--------|

| Two-row event layout preserved | Complete |

| `Date:` label removed; ISO dates (`YYYY-MM-DD`) on row 2 | Complete |

| XP amount alone on the right; middle column empty | Complete |

| Shot Submissions ? total shots | Complete |

| Homework ? assignment title | Complete |

| Video Submissions ? `Custom Video File Name` | Complete |

| Zoom Attendance ? linked meeting name | Complete (`3306379`) |

| Same-date events sort deterministically | Complete |

| Weekly targets sort by percentage descending | Complete (`68c3a45`) |

| Milestones sort by percentage descending | Complete (`68c3a45`) |

| Shot Submissions below later same-date accomplishments | Complete |

| No duplicate XP rows | Complete |

| Mobile layout | Verified |



**Commits:** `6625559` (details + ordering) · `f225f04` (Airtable field fallbacks) · `68c3a45` (same-date % sort) · `3306379` (Zoom attendance detail)



**Tests:** `game-log-presentation.test.ts`, `recent-activity-log.test.ts`, `xp-activity-table.test.ts`, `xp-activity-loader.test.ts` · unit baseline **393/393** before final sorting adjustment · build pass · prod smoke **50/50** pass after final sorting update.



**Production verification (2026-08-25):** API page 1/2 return 12 rows, no key overlap; Load more 12?24 on `perfect-week-testing`; invalid slug API 404.



**Limitation:** Full ledger capped at `GAME_LOG_MAX_FETCH=2000` per enrollment (deferred ? safe at current scale).



### FUT-013 ? Athlete page: Perfect Week activity panel



**Priority:** P1  

**Status:** Complete ? 2026-08-25 · implementation `901812e` · production verified `900e61c`  

**Systems:** Website, Weekly Athlete Summary, Perfect Week fields



**Summary:** `PerfectWeekPanel` shows week-by-week requirements and status labels; weekly performance stats moved below with clarifying copy.



**Tests:** Production profile section order verified on `charlie-schmidt` and `perfect-week-testing`.



**Production closeout ? athlete profile reliability (2026-08-25)**



| Item | Status |

|------|--------|

| Vercel Production deploy | **Success** ? `207a2c1` on `www.fairfieldbasketballclub.com/shoot` (2026-08-25) |

| Smoke stabilization commits | `0adcb8d` (Fairfield retry, image/footer hydration) · `fce037f` (profile freshness) on ancestry |

| Production smoke slug | `perfect-week-testing` (also `charlie-schmidt`, `curtis-schmidt`; `testing-schmidt` is DEV-only) |

| PHA Due Date | **Verified** ? catalog + athlete homework assignments show readable due dates; commit `207a2c1` adds prod Playwright + Vitest coverage |

| Game Log pagination | API-backed; Load more verified 12?24 |

| Freshness notice | **Fixed** ? hidden on clean prod loads; only when homework source fails (`mayBeStale`); ?Last checked? renders client-side to avoid hydration mismatch on prod smoke |

| Homework image | `withBasePath` fix deployed `a71cbef`; static asset HTTP 200 |

| Mobile nav smoke | **Fixed** ? `cross-env` for Windows; `openMobileNavPanel()` retries until post-hydration menu opens |

| `npm run test:smoke:prod` | **50/50** pass (2026-08-25); cross-platform via `cross-env`; serial `--workers=1` against live prod |

| Vitest | **369** pass (2026-08-25) |

| `homework-due-date.spec.ts` | **3/3** pass on prod (2026-08-25) |

| SEO production | `NEXT_PUBLIC_ALLOW_SEARCH_INDEXING=true` on Vercel; `search-indexing.spec.ts` pass on prod |

| Local PAT 403 | Documented ? read on Program Instance - Sync, Program Homework Assignments, Homework Library, Weeks, Homework Completions |

| `GAME_LOG_MAX_FETCH=2000` | **Deferred** ? safe at current scale; no athlete near cap |



### FUT-014 ? Homework page redesign and live Homework Library connection



**Priority:** P1  

**Status:** **Complete** (2026-08-26)  

**Systems:** Website Homework page, Airtable Homework Library / Program Homework Assignments  

**Production route:** https://www.fairfieldbasketballclub.com/shoot/homework



**Brief Description mapping (verified ? previous mapping was correct):**



| Layer | Value |

|-------|--------|

| Airtable table | **Homework Library** |

| Airtable field | **`Brief Description - Display`** |

| Field ID | `fldAnHr3uTuDN5bs9` |

| Field type | `aiText` |

| Website property | `briefDescription` |

| Normalized path | `fetchScheduledHomeworkCatalog()` ? `mapCurriculumToAssignment()` ? `HomeworkAssignment.briefDescription` ? `resolveInstructionsPreview()` ? `instructionsPreview` |

| Card property | `assignment.instructionsPreview` |

| Test selector | `data-testid="homework-catalog-brief"` |

| Blank fallback | `Instructions coming soon.` |



**Does not use on catalog cards:** `Full Assignment Description` · `Description` · `Assignment Title` (card headline uses `title` with `displayName` fallback; brief text comes only from **`Brief Description - Display`**).



**Completed features:** live PHA + Homework Library data · dynamic assignment count · active/published schedule display · newest week first · assignment title · assigned week · brief description · due date · `URL` · `URL Additional` · `Docs` links · keyboard-accessible links · detail-page links preserved · Operator Notes removed from public cards · mobile layout verified · **four published cards** verified in production.



**Commits:** `cdd2b97` (redesign + mapping verification) · `4a26aa4` (verification documentation)



**Deploy checklist:** [docs/deploy-checklists/FUT-014-homework-page-redesign.md](../deploy-checklists/FUT-014-homework-page-redesign.md)



**Validation (2026-08-26):** lint ? (4 pre-existing unrelated warnings) · typecheck ? · vitest **406/406** ? · build ? · prod smoke **50/50** ? · homework-due-date **3/3** ? · desktop ? · mobile 390px ? · homework detail route ? · live Airtable spot-check ? (`rechVLOeyEVIqmy2v` ? `Brief Description - Display`)



### FUT-015 ? Levels page redesign



**Priority:** P2  

**Status:** **Complete** (2026-08-26)  

**Systems:** Website Levels page, Airtable Levels and Gate Rules



Redesigned `/shoot/levels` with ascending Level 1?12 order, ladder-style hero background, clarified **Level** badge (replacing ambiguous `LV`), gate previews from `Public Gate Criteria`, and terminology for current/next level and gates. Data via `fetchLevelLadder()` ? no XP or gate-rule logic changes.



**Deploy checklist:** [docs/deploy-checklists/FUT-015-levels-page-redesign.md](../deploy-checklists/FUT-015-levels-page-redesign.md)



**Validation (2026-08-26):** lint ? · typecheck ? · levels vitest ? · build ? · prod smoke **49/50** ? (levels route) · live verification ?



### FUT-016 ? Tutorials page redesign



**Priority:** P2  

**Status:** **Complete** (portfolio catalog shipped 2026-08-30 ? FUT-014/FUT-015 parity)  

**Systems:** Website Tutorials page, canonical Tutorials & Assets data



Create a new portfolio-style Tutorials page using the approved design tools while preserving the existing links and content relationships. Do not reintroduce the retired duplicate Tutorials table.



**Shipped (2026-08-30):** Portfolio catalog with feature banner, media-delivery orientation, AccentRail cards, in-page vs external badges, keyboard focus rings, display-layer EXT-QA-003 cross-program de-emphasis; Vitest for `tutorial-presentation` helpers.



**Shipped (2026-08-28):** Parent-facing catalog subtitle clarifying in-page vs external media; metadata description polish; existing `TutorialMediaGridView` contract unchanged.



### FUT-017 ? Zoom Meeting page redesign



**Priority:** P2  

**Status:** **Complete** (2026-08-30)  

**Systems:** Website Zoom page, Airtable Zoom Meetings



Create a new portfolio-style Zoom Meeting page using the approved design tools while preserving current links and meeting information.



**Shipped (2026-08-28):** Catalog copy for live links vs recordings; metadata description polish; existing week-grouped catalog unchanged.



**Shipped (2026-08-30):** Full portfolio redesign ? `ProgramFeatureBanner`, live vs recording terminology/orientation, `AccentRail` week groups, access badges, catalog resource links, graceful cover fallback (`W{n}` monogram + session type), detail cover fallback; vitest + smoke headings unchanged.



**Validation (2026-08-30):** lint ? · typecheck ? · vitest ? · build ? · browser desktop + mobile ?



### FUT-018 ? Landing Page and Shooting Challenge page improvements



**Priority:** P1  

**Status:** **Complete** (2026-08-28)  

**Systems:** Website public pages, SEO metadata, existing content/data contracts



Review and improve the Landing Page and Shooting Challenge page without duplicating existing pages. Adapt existing pages when they already serve the required purpose. Separate prompts should be used for each page.



**Validation (2026-08-30):** Rebased onto homepage redesign (#270); kept #270 hero CTAs and content hierarchy; added ?For parents and families? section with FAQ/homework links from #266.



**Follow-on (do not reopen this ID):** Club landing ?More than a Scoreboard,? navy?royal, Upcoming Programs redesign, and program images are **FUT-033?FUT-037** (`hoopchallenges-landing`).



### FUT-019 ? Website footer consistency



**Priority:** P2  

**Status:** **Complete** (2026-08-28)  

**Systems:** Website layout and all public pages



Create and apply one professional, accessible footer across all public website pages. Preserve required navigation, contact, program, and legal/consent information.



**Validation (2026-08-28):** `lib/site-chrome/footer-config.ts` + enhanced `SiteFooter` (quick links, Fillout registration CTAs, FAQ pointer, consent copy); Playwright footer consistency on 6 public routes; vitest footer-config ?



---



## D. Website SEO and national discoverability



### FUT-020 ? National-first SEO foundation with legitimate local context



**Priority:** P1  

**Status:** Complete (2026-08-26) ? merged to `master` 2026-08-27 (`94c018e`, `ee5d3fd`)  

**Systems:** Website metadata, content, structured data, sitemap, internal links  

**Evidence:** `web/docs/seo.md`, `web/lib/seo/metadata.ts`, `web/tests/search-indexing.spec.ts`



Optimize the website so families nationwide can discover the program when searching for youth basketball training, basketball shooting challenges, skill development, progress tracking, and related terms. Fairfield, Montana should be represented accurately but should not be the only SEO strategy or the dominant focus.



Do not claim in-person services in locations where the program does not operate. Use Fairfield and nearby communities where accurate, and explain online/remote or nationally accessible aspects where supported.



### FUT-021 ? Homepage SEO and messaging



**Priority:** P1  

**Status:** Complete (2026-08-26) ? merged to `master` 2026-08-27 (`94c018e`, `ee5d3fd`)  

**Systems:** Homepage copy, metadata, internal links  

**Evidence:** `web/components/home/home-page-view.tsx`, `web/lib/seo/program-facts.ts`, `web/tests/national-seo.spec.ts`



Rewrite the homepage title, main heading, description, internal links, and image alt text so the page clearly communicates:



- Youth basketball training and shooting challenges

- Boys and girls in grades 1?8

- Educational Athletics

- Skill development, daily submissions, goals, progress tracking, and feedback

- Accurate Fairfield, Montana context without limiting national discovery



### FUT-022 ? Adapt existing pages for SEO before creating duplicates



**Priority:** P1  

**Status:** Complete (2026-08-26) ? merged to `master` 2026-08-27 (`94c018e`, `ee5d3fd`)  

**Systems:** Route audit, existing page adaptations  

**Evidence:** `web/docs/seo.md` § FUT-022 route audit; only new route: `/faq`



Audit the existing website before adding pages. Adapt an existing page when it already covers the subject. Create a new page only when the content has no appropriate home.



Potential content areas include youth basketball program, shooting challenge, youth basketball training, Team Shot Tracker, About, Activities and Events, Contact, and FAQ. The implementation prompt must identify the existing route map first and prevent duplicate or competing pages.



### FUT-023 ? Page-specific titles, descriptions, links, and image text



**Priority:** P1  

**Status:** Complete (2026-08-26) ? merged to `master` 2026-08-27 (`94c018e`, `ee5d3fd`)  

**Systems:** Per-page metadata, hub link labels, feature banner aria labels  

**Evidence:** `web/app/(program)/*/page.tsx`, `web/lib/navigation/program-hub-links.ts`, `web/tests/feature-images.spec.ts`



Give every important public page unique metadata and descriptive internal links. Replace vague links such as `Learn More` with descriptive link text. Improve image alt text without keyword stuffing.



### FUT-024 ? FAQ and structured organization information



**Priority:** P1  

**Status:** Partially complete (2026-08-26) ? merged to `master` 2026-08-27. Team Shot Tracker FAQ omitted (separate product policy)  

**Systems:** `/shoot/faq`, Organization + FAQPage JSON-LD  

**Evidence:** `web/app/(program)/faq/page.tsx`, `web/lib/seo/faq-content.ts`, `web/lib/seo/metadata.ts`



Add an appropriate FAQ and organization information where supported by the current website. Cover grades served, boys and girls, Educational Athletics, shooting challenge, XP/progress, video feedback, Team Shot Tracker, location, and registration. Add organization/local information only where accurate and privacy-safe.



### FUT-025 ? Sitemap, indexing, and public athlete profiles



**Priority:** P1  

**Status:** **COMPLETE / Live Tested** (2026-09-04) ? Production athlete indexing cutover enabled (`NEXT_PUBLIC_ATHLETE_PROFILE_INDEXING=true`); privacy boundaries verified; sitemap still excludes athlete URLs  

**Systems:** Sitemap, robots, athlete profile metadata, consent assumptions

**Evidence:** [`docs/audits/FUT-025-indexing-cutover-20260904.md`](./audits/FUT-025-indexing-cutover-20260904.md) · [`docs/testing/evidence/fut-025-indexing-cutover-20260904.json`](./testing/evidence/fut-025-indexing-cutover-20260904.json) · deploy `dpl_4tbg25UzYPFruga1PzQthewWswNP`



Create or verify a sitemap and indexability rules for public pages. Public athlete profiles may be indexable using the athlete?s full name because registration consent covers name, image, and likeness promotion. The public profile may display:



- Full athlete name

- School

- Grade

- Approved progress information



Do not expose parent contact information, email addresses, private submission metadata, or sensitive information. The prompt must verify consent assumptions, route stability, metadata uniqueness, and search-engine behavior.



**Policy (live 2026-09-04):** Program listing pages indexable when `NEXT_PUBLIC_ALLOW_SEARCH_INDEXING=true`. Athlete profiles are **`index, follow`** when **both** program and athlete flags are true **and** the enrollment has Public Profile Enabled + unique Public Profile Slug. Missing/disabled profiles stay **`noindex`**. In-page profile HTML uses registration-consent allowlist only (`lib/data/public-athlete-profile.ts`, `PUBLIC_PROFILE_ENROLLMENT_FIELDS`). Metadata excludes grade/school via `buildAthleteProfilePageMetadata`. Sitemap intentionally excludes athlete slugs even after cutover (discovery via leaderboard links). `robots.txt` omits `/athletes/` from Disallow when the athlete cutover flag is enabled.



**Validation (2026-09-04):** Production robots/profile/sitemap checks · `public-athlete-profile-privacy.test.ts` · `athlete-profile-metadata.test.ts` · `metadata.test.ts` · `search-indexing.spec.ts` · deploy checklist [`docs/deploy-checklists/2026-08-30-athlete-profile-indexing-cutover.md`](../docs/deploy-checklists/2026-08-30-athlete-profile-indexing-cutover.md)



### FUT-026 ? Final Player Manual before challenge launch



**Priority:** P1  

**Status:** Deferred until final pre-launch phase  

**Systems:** Player Manual, Airtable configuration, website/app behavior



Keep the Player Manual on the future-work list, but complete it last?immediately before the challenge begins. The final manual must reflect the finished rules, homework deadline behavior, levels, XP, Perfect Week requirements, video feedback, Zoom options, website experience, and parent/athlete workflows.



Do not finalize or publish the manual while material app rules or page behavior are still changing.



### FUT-027 ? Program-wide gift card award commitment (parent FAQ)



**Priority:** P1  

**Status:** **Complete** (2026-08-30) ? Mike-approved copy shipped on `/shoot/faq`  

**Systems:** FAQ content, parent registration expectations  

**Evidence:** `web/lib/seo/public-program-content.ts`, `web/lib/seo/faq-content.ts` (`gift-card-commitment`), `web/lib/seo/faq-content.test.ts`, `web/tests/national-seo.spec.ts`



Publish parent-facing wording that at least 100% of registration fees collected across the challenge will be distributed through gift cards, with recipients and amounts at the program director's discretion ? without implying refunds, guaranteed individual awards, or a fixed schedule.



### FUT-028 ? About the Coach (homepage)



**Priority:** P1  

**Status:** **Complete** (2026-08-30) ? Mike-approved copy shipped on `/shoot#about-the-coach`  

**Systems:** Homepage parent trust section  

**Evidence:** `web/lib/seo/public-program-content.ts`, `web/components/home/home-page-view.tsx`, `web/lib/seo/public-program-content.test.ts`, `web/tests/national-seo.spec.ts`



Add a parent-facing About the Coach section identifying Mike Schmidt's education and coaching credentials without inventing accomplishments or exposing private athlete information.



### FUT-029 ? Hybrid Fillout Homework Submission System



**Priority:** P2 (long-term)  

**Status:** **Brief Needed / FUTURE** ? concept/design only; **do not implement** until separately authorized  

**Systems:** Homework Library, Program Homework Assignments, Fillout, Homework Completions, Submissions / Submission Assets, Automations **020 / 033 / 064 / 065 / 071** (preserve)  

**Master Remaining Work:** **MRW-H12**  

**ID note:** Intake requested label **FUT-018**; that ID is already **COMPLETE** (Landing Page / Shooting Challenge page improvements). FUT-027/028 also assigned. Canonical ID is **FUT-029**.  

**Brief:** [`next-wave/homework-pipeline/FUT-029-HYBRID-FILLOUT-HOMEWORK-BRIEF.md`](./next-wave/homework-pipeline/FUT-029-HYBRID-FILLOUT-HOMEWORK-BRIEF.md)



Expand Homework Library from ~70 to **100+** assignments and add **online Fillout answer forms** as an additional homework submission method.



**Confirmed requirements (2026-08-31):**



- Fillout begins **optional**; may later become **primary** for assignments that work well online.

- **Paper** remains for handwriting, drawing, physical work, and similar.

- **Photo / video** uploads remain when required.

- Use **separate grade-band versions** when content differs substantially.

- Combine **automatic grading** and **coach-reviewed** responses.

- Keep **Homework Library** separate from seasonal **Program Homework Assignments**.

- Preserve the current **18-assignment** seasonal design.

- Each seasonal assignment links to a reusable Library assignment and the appropriate grade-band version.

- Fillout and traditional asset submissions connect to the **same Homework Completion** workflow.

- Prevent **duplicate Homework Completions** and **duplicate Homework XP**.

- Preserve automations **020, 033, 064, 065, 071** and related homework workflows.



**Out of scope until authorized:** Fillout form creation, Airtable schema changes, live automation edits, changing the 18 PHA rows, homework XP/grading rule changes.



**Related (coordinate, do not silently merge):** SC-018 / SC-019 / SC-020 Learning Activities; existing HW17 Fillout quiz path; FUT-001 / SC-015 / SC-016 HC identity.



### FUT-030 ? Full transactional record reset (clean rebuild base)



**Priority:** P0  

**Status:** **COMPLETE** (2026-08-31)  

**Systems:** Athletes, Enrollments, Submissions, Submission Assets, Homework Completions, Program Homework Assignments, XP Events, Athlete Achievement Unlocks, Streak Occurrences, Weekly Athlete Summary, Video Feedback, Zoom Attendance, Award Recipients, Payment Transactions, Email Handoff Queue, Final Reflection Quiz Submissions  

**Preserved:** Weeks, Config, Program Instance, Homework Library, XP Reward Rules, Achievements, Target Goal Shots, Grade Bands, Tutorials & Assets, Awards catalog, Levels/gates/milestones, Zoom Meetings, School - Synced, Testing Scenarios, Automations (**075** remains retired)  

**Evidence:** [`testing/evidence/transactional-reset-2026-08-31/`](./testing/evidence/transactional-reset-2026-08-31/)  

**Tool:** `tools/airtable/transactional_record_reset.py`



Mike-authorized **record deletion only** (not schema). Deleted **959** transactional records across all program years and test fixtures. No external sends. **18 seasonal PHA restored same day** (new RIDs; Due Date 2027-06-29) ? see `11-pha-restore-created-20260831_133022.json`. Base is ready for clean workflow rebuild.



### FUT-031 ? Game Log: Extra Credit tagline after date



**Priority:** P2  

**Status:** **COMPLETE** (2026-08-31) ? repo verified; commit `b6f789e7`; display-only tagline on Game Log date row when Homework Completion `Extra Credit XP Awarded` > 0  

**Systems:** Website Game Log / XP activity table, Homework Completions (`Extra Credit XP Awarded`), XP Events  

**Related:** FUT-012 (Game Log presentation)



**Summary:** Keep one Homework XP Event (base + extra credit total). When `Extra Credit XP Awarded` > 0, show a parent-visible tagline on the Game Log date row, e.g. `2026-08-31 · Extra credit +125 XP`. Display-only ? no XP calculation or Airtable award-logic changes.



**Done (2026-08-31):** `game-log-presentation.ts` (`formatGameLogExtraCreditTagline`, `formatGameLogDateLine`, `dateTagline` on homework rows); `xp-activity-loader.ts` loads `Extra Credit XP Awarded`; `recent-activity-log.tsx` + `xp-activity-table.tsx` wire tagline to date row; `mapXpSummariesToPublicActivity` passes `dateTagline`.



**Tests:** `game-log-presentation.test.ts`, `recent-activity-log.test.ts`, `xp-activity-table.test.ts`, `xp-activity-loader.test.ts` ? **63/63 PASS** (2026-09-01 verify)



### FUT-032 ? Homework Completions Hub ? Resend source writeback (Parent Feedback Sent?)



**Priority:** P1  

**Status:** **COMPLETE** (2026-08-31) ? Hub writeback live ([communications#42](https://github.com/Schmidt127/communications/pull/42) **MERGED**); Mike verified Parent Feedback Sent? + Sent On on Schmidt HC after 065/071 path  

**Systems:** Communications Hub, Resend webhooks, Homework Completions, Automation **071** / **079** (read-only for Sent?), Email Handoff Queue  

**Related:** FUT-006 · Video Feedback Hub writeback ([`deploy-checklists/VIDEO-FEEDBACK-HUB-RESEND-WRITEBACK.md`](./deploy-checklists/VIDEO-FEEDBACK-HUB-RESEND-WRITEBACK.md)) · [`online-agents/homework-assets/HOMEWORK-ASSET-COMPLETION-RUNBOOK.md`](./online-agents/homework-assets/HOMEWORK-ASSET-COMPLETION-RUNBOOK.md) §7  

**Promotion:** [`deploy-checklists/FUT-032-homework-hub-resend-writeback.md`](./deploy-checklists/FUT-032-homework-hub-resend-writeback.md) · Hub contract `communications/docs/contracts/HOMEWORK_FEEDBACK_SOURCE_WRITEBACK_v1.md`



**Problem:** After Hub cutover, homework parent emails send via **071 ? Email Handoff Queue ? 079 ? Hub ? Resend**, but Homework Completions **`Parent Feedback Sent?`** and **`Parent Feedback Sent On`** were never written. **071** correctly does **not** write them. Video Feedback already had Hub ? SC source writeback after Resend.



**Owner of Sent?:** Communications Hub after Resend success/failure (same pattern as Video). Not 071, not 079, not Make/Gmail, not S3/`Writeback Complete?`.



**Done (2026-08-31):**



1. Production HC fields created (Video parity): Delivery Status, Delivery Error, Hub Event ID, Resend Message ID.

2. Hub: `source-writeback-homework-feedback.js`; wired in `welcome-processor.js` + `resend-webhook.js`; tests `homework-feedback-writeback.test.mjs`; **PR #42 merged** to `communications` `main`.

3. SC docs/checklist updated.

4. Mike verified live: **Parent Feedback Sent?** checked and **Parent Feedback Sent On** correct after homework feedback send (Athlete1 / Meditation Workout path). Related: Production **065 v10.5** paste (points reconcile) same day.



**Out of scope:** `Completion Status` / `Satisfactory?` / XP / S3 upload writeback; historical backfill of pre-writeback sends.



---



## H. Approved brainstorming intake ? 2026-08-31



Owner-approved product/UX/infrastructure items captured below as **FUT-033?FUT-047**. Documentation-only intake; **do not implement from this section alone** ? convert each item to a Phase 2 brief before code, schema, Fillout, or Production changes. Do not reopen completed **FUT-018** / **FUT-019** / **FUT-010** as duplicates; new IDs own the new scope and cross-reference related work.



**Repo routing:** Club marketing root / ?More than a Scoreboard? / Upcoming Programs (**FUT-033?FUT-037**) ? implement in **`hoopchallenges-landing`** (Fairfield Basketball Club landing). Shooting Challenge app, Airtable, Hub email, Fillout SC forms, and S3 pipeline items (**FUT-038?FUT-047**) ? this repo and linked systems unless noted.



### FUT-033 ? Correct ?More than a Scoreboard? Youth Programs vs Coach Tools copy



**Priority:** P1  

**Status:** **IMPLEMENTED (landing repo)** ? deploy pending (`hoopchallenges-landing` master merge). Live audit 2026-09-01 showed stale copy; corrected same day.  

**Systems:** Club landing / public website copy  

**Correct repo:** `hoopchallenges-landing` (local clone `127si-landing-page`; not `/shoot` in this repo)  

**Related:** FUT-034 · FUT-036 · SC-149 · [CURRENT-TRUTH.md](./CURRENT-TRUTH.md) § Website · Mike-approved naming taxonomy above · [`audits/2026-09-01-FUT-033-047-LIVE-REMAINING-AUDIT.md`](./audits/2026-09-01-FUT-033-047-LIVE-REMAINING-AUDIT.md)



**Problem:** The ?More than a Scoreboard? Q&A does not clearly distinguish Youth Programs from Coach Tools, and must not use ?Youth opportunities.?



**Approved requirements:**



- **Youth Programs:** Shooting Challenge, Dribbling Challenge, Jr. Referee Clinic  

- **Coach Tools:** Brackets, Team Shot Tracker, State Rankings  

- Proposed copy: ?Youth programs include Shooting Challenge, Dribbling Challenge, and Jr. Referee Clinic. Coach tools are also available, including Brackets, Team Shot Tracker, and State Rankings.?  

- Use **?Youth Programs?** consistently; do not use ?Youth opportunities.?



**Dependencies / risks:** Copy must stay consistent with FUT-034 naming and FUT-036 program cards. Landing repo ownership ? do not edit this repo?s `web/` for this item unless Mike confirms the content also lives under `/shoot`.



**Decisions still open:** Exact heading/Q wording beyond the approved distinction sentence; whether `/shoot` FAQ or homepage needs a parallel correction.



### FUT-034 ? Standardize ?Jr. Referee Clinic? naming everywhere



**Priority:** P1  

**Status:** **IMPLEMENTED (landing repo)** ? deploy pending. Live audit 2026-09-01 found **0** hits for ?Jr. Referee Clinic? and user-facing **Jr. Ref** still live.  

**Systems:** Public website, emails, Fillout forms, documentation, user-facing copy (cross-repo)  

**Correct repos:** `hoopchallenges-landing` + this repo (`web/`, Hub templates, docs) + Fillout + Jr. Referee Clinic product surfaces where the public name must match  

**Related:** FUT-033 · FUT-036 · Mike-approved naming taxonomy above · SC-143 (multi-challenge ? do not merge)



**Problem:** Short or incorrect names (especially **Jr. Ref**) weaken brand consistency across public surfaces.



**Approved requirements:**



- Preferred: **Jr. Referee Clinic**  

- Acceptable when space is limited: **Jr. Ref Clinic**  

- Never: **Jr. Ref**  

- Search and correct incorrect uses across public website, emails, forms, documentation, and other user-facing copy.



**Dependencies / risks:** Broader than landing-only; coordinate with the Jr. Referee Clinic product repo (`127-si-jr-ref`) only where that product?s public name must match ? do not pull JR Ref implementation into this repo.



**Decisions still open:** Inventory of live Fillout form titles and email subjects that still use the banned short form **Jr. Ref**; whether internal/admin-only labels may keep a shorter form.



### FUT-035 ? Replace navy-blue landing treatments with royal blue / orange brand system



**Priority:** P2  

**Status:** **IMPLEMENTED (landing repo)** ? deploy pending. Live audit 2026-09-01 still measured Club/#About as navy `#061a43`.  

**Systems:** Club landing visual design (header, ?More than a Scoreboard,? related image/content section; footer already brand blue)  

**Correct repo:** `hoopchallenges-landing`  

**Related:** FUT-019 (SC site footer ? **COMPLETE**, separate app) · SC-149 · `BRAND_STANDARDS.md` (sync check vs landing canonical brand doc)



**Problem:** Navy-blue treatment in the landing header, ?More than a Scoreboard? section, related image/content section, and footer does not match the royal blue / orange brand system.



**Approved requirements:**



- Replace navy with a professional treatment based on existing **royal blue and orange** branding.  

- Prefer a royal-blue-based color or gradient matching the header.  

- Footer must use the same blue/header color system rather than navy.



**Dependencies / risks:** Brand doc version mismatch between landing and this repo ? synchronize through approved cross-repo documentation update; do not invent a third palette.



**Decisions still open:** Exact hex/CSS tokens; whether SC `/shoot` chrome needs any parallel navy cleanup (out of scope unless found during audit).



### FUT-036 ? Redesign Upcoming Programs section (six differentiated program cards)



**Priority:** P1  

**Status:** **IMPLEMENTED (landing repo)** ? deploy pending. Live audit 2026-09-01 showed **3** youth cards only (not six).  

**Systems:** Club landing Upcoming Programs UI  

**Correct repo:** `hoopchallenges-landing`  

**Related:** FUT-033 · FUT-034 · FUT-037 · SC-143



**Problem:** Current three identical white boxes are visually weak and do not present all six offerings or Youth Programs vs Coach Tools.



**Approved requirements:**



- Completely redesign Upcoming Programs with attractive, clearly differentiated program cards.  

- Each card supports: program image, program name, short description, category label, availability/status, clear CTA, consistent but engaging design.  

- Include all six: Shooting Challenge, Dribbling Challenge, Jr. Referee Clinic, Brackets, Team Shot Tracker, State Rankings.  

- Clearly distinguish **Youth Programs** from **Coach Tools**.



**Dependencies / risks:** FUT-037 images; FUT-034 naming; CTA destinations and availability status per program (**decision needed** per offering).



**Decisions still open:** Per-program CTA URLs/status copy; card layout breakpoints; whether Coach Tools share the same card component with different category chrome only.



### FUT-037 ? Youth Programs / program cards: replace solid panels with images



**Priority:** P1  

**Status:** **COMPLETE** (2026-09-01) ? Program images live at `/images/programs/*.jpg` (HTTP 200 per live audit)  

**Systems:** Club landing program imagery  

**Correct repo:** `hoopchallenges-landing`  

**Asset directory (landing):** `/public/images/programs/`  

**Related:** FUT-036



**Problem:** Solid-color panels in the Youth Programs (and related program) section should be real imagery.



**Approved requirements:**



- Replace solid-color panels with images supplied by Mike.  

- Recommended filenames: `shooting-challenge.jpg`, `dribbling-challenge.jpg`, `jr-referee-clinic.jpg`, `brackets.jpg`, `team-shot-tracker.jpg`, `state-standings.jpg`.  

- Consistent dimensions, cropping, overlays, accessibility text, and responsive behavior.



**Dependencies / risks:** Image supply and licensing; FUT-036 card redesign should define slots before final crop specs.



**Decisions still open:** Final image dimensions/aspect ratio; overlay treatment; alt-text source of truth.



### FUT-038 ? Global configurable program-category on/off system



**Priority:** P1  

**Status:** **Brief Needed** ? decision worksheet ready; **do not implement** schema/automation/web/email until Mike replies and PKG-004 approves fields  

**Brief:** [next-wave/config-selection/FUT-038-GLOBAL-CATEGORY-ONOFF-BRIEF.md](./next-wave/config-selection/FUT-038-GLOBAL-CATEGORY-ONOFF-BRIEF.md)  

**Worksheet:** [next-wave/config-selection/FUT-038-MIKE-DECISION-WORKSHEET.md](./next-wave/config-selection/FUT-038-MIKE-DECISION-WORKSHEET.md) (**12** decisions; reply `1D, 2A, ?`)  

**Systems:** Airtable Config / Program Instance (or equivalent), XP, levels/gates, GOAT, achievements, milestones, weekly summaries, parent/athlete emails, website progress displays, related automations  

**Correct repo:** this repo (+ Production Airtable after approved design)  

**Related:** SC-034 / config-over-code · C-014 / SC-082 gate tuning · FUT-026 Player Manual · PKG-004 · [v2/03-business-rules.md](./v2/03-business-rules.md) · [next-wave/config-selection/CONFIG-CONSUMER-INVENTORY.md](./next-wave/config-selection/CONFIG-CONSUMER-INVENTORY.md) · [CURRENT-TRUTH.md](./CURRENT-TRUTH.md) § XP / levels



**Problem:** Coaches need to disable whole participation categories for a program instance/season without breaking XP, levels, GOAT, achievements, or communications.



**Initial categories (extensible):** Submissions, Homework, Video Feedback, Zoom, Streaks, Achievements, Milestones, and any other existing XP/progression category that should be configurable.



**Approved requirements:**



- Global category on/off per program instance or season.  

- When a category is disabled (example: Homework off), participants must still: earn XP appropriately; move through all levels; meet **adjusted** gates; earn achievements where applicable; reach **GOAT**; receive accurate progress displays and communications.  

- **Disabled categories must not block GOAT progression** or accidentally block level advancement.  

- Auto-adjust: XP calculations, level gates, GOAT requirements, achievement requirements, progress/status displays, weekly summaries, parent emails, athlete emails, related automations / success calculations.  

- Extensible configuration so new categories can be added later without redesigning the architecture.  

- Safe defaults; administrative visibility; clear documentation.  

- Testing with Homework **enabled** and **disabled**.  

- Protection against disabled categories accidentally blocking progression.



**Dependencies / risks:** Large cross-cutting change ? schema ownership gate (PKG-004), automation inventory, email templates, web loaders. High regression risk if gates remain hard-required for disabled categories.



**Decisions still open (do not invent):** Which Airtable table owns the flags (Config vs Program Instance vs new table); default on/off per category for 2026?27; how Perfect Week / recorded Zoom interact when Zoom or Homework is off; whether website hides disabled category UI entirely or shows ?not part of this season.?



### FUT-039 ? Fillout.com branding and CSS consistency (planning only)



**Priority:** P2  

**Status:** **COMPLETE** (2026-09-01) ? Mike attested Fillout CSS styling complete  

**Brief:** [FUT-039-FILLOUT-BRANDING-BRIEF.md](./next-wave/fillout/FUT-039-FILLOUT-BRANDING-BRIEF.md)  

**CSS artifact:** [fillout-theme-sc-2026.css](./next-wave/fillout/fillout-theme-sc-2026.css)  

**Inventory:** [FILLOUT-FORM-INVENTORY.md](./next-wave/fillout/FILLOUT-FORM-INVENTORY.md) (**12 rows**; **5** v1 in-scope surfaces)  

**Systems:** Fillout forms (registration, homework, and related SC forms)  

**Correct repo / surface:** Fillout.com + docs in this repo; coordinate with FUT-003 / FUT-029  

**Related:** FUT-003 · FUT-029 · FUT-034 · FUT-035 · SC-060 / SC-146



**Problem:** Related Fillout forms lack a consistent 127 SI / Fairfield branding treatment.



**Approved requirements (planning item):**



- Standardize header treatment, royal-blue/orange palette, typography, buttons, fields, spacing, logo/program identification, confirmation screens.  

- Produce an implementation brief and form inventory before any live Fillout CSS/theme changes.



**Brief deliverables (2026-09-01):** Form inventory; current vs target brand alignment (`BRAND_STANDARDS.md`, FUT-035 royal blue); Fillout theme/CSS capability research; v1 scope (registration + daily + edit submission); risk matrix (FUT-003, SC-060, FUT-029); Phase 3 slices; **12** Mike decisions **locked**; PKG/promotion requirements; operator checklist + CSS artifact.



**Mike decisions (2026-09-01):** Option A shared theme; repo CSS file; `web/public/brand/` logos; Mike applies in Fillout; v1 trio only; edit URL ? `shoot-editsubmission` custom domain + formula update; per-form theme (not org default); logo+text header; Maven Pro only; Fillout ending (no redirect); branding before FUT-003; OMNI Jr. Ref title audit.



### FUT-040 ? Automatic S3 migration for homework, video-feedback, and headshot attachments



**Priority:** P1  

**Status:** **Brief Needed** ? Phase 2 brief ready; Phase 3 blocked on Mike decisions + PKG-004  

**Brief:** [FUT-040-AUTOMATIC-S3-MIGRATION-BRIEF.md](./next-wave/s3-migration/FUT-040-AUTOMATIC-S3-MIGRATION-BRIEF.md)  

**Systems:** Airtable attachments, AWS S3, Lambda viewer (where applicable), Submission Assets / registration headshots, audit/status fields  

**Correct repo:** this repo + AWS  

**Related:** **FUT-010** (intake SA cleanup after verified upload ? dry-run complete; supervised apply pending) · FUT-007 (HEADSHOT naming) · FUT-009 · SC-094 · SC-095 · SC-096 · SC-099 · SC-100 · [deploy-checklists/FUT-010-intake-attachment-cleanup.md](./deploy-checklists/FUT-010-intake-attachment-cleanup.md) · [CURRENT-TRUTH.md](./CURRENT-TRUTH.md) FUT-010 row



**Problem:** Need an automatic migration path that copies approved attachment categories to S3, verifies access, preserves the S3 URL, then deletes the Airtable attachment ? including headshots collected at registration ? without expanding to unapproved attachment types.



**Scope (only these categories unless separately approved):**



1. Homework files  

2. Video files for feedback  

3. Headshots collected during registration  



**Required order:**



1. Copy the file to AWS S3.  

2. Confirm that the S3 object exists.  

3. Confirm that the stored link works and is accessible to the authorized user.  

4. Preserve the verified S3 URL.  

5. Automatically delete the original Airtable attachment.  



**Hard rule:** S3 / Airtable attachment deletion occurs **only after successful verification** (steps 1?4). Never delete the S3 object as part of this cleanup. Never delete the Airtable record.



**Before automatic deletion is enabled, require:** migration status, verification status, error handling, audit trail, retry or exception handling, and a test using non-production records or an approved test process.



**Dependencies / risks:** FUT-010 already covers verified cleanup for homework-route and video-route **Submission Assets**; this item adds **automatic migration orchestration**, **headshots**, and explicit status/audit fields. Do not run destructive apply until verification gates pass. Public S3 bucket remains **rejected** (Section E).



**Decisions still open:** Headshot source field/table on Athletes/Enrollments; whether FUT-010 CLI becomes a worker inside this pipeline or remains a separate supervised tool; Lambda viewer applicability for headshots vs homework/video.



### FUT-041 ? Daily Submission Acknowledgement email: XP in horizontal columns



**Priority:** P2  

**Status:** **COMPLETE** (2026-09-01) ? **076 v8.12** Production + Hub **FUT-041** template. Paste queue empty.  

**Systems:** Daily Submission Acknowledgement email (Hub / Resend; automation **076** path)  

**Correct repo:** this repo + Communications Hub templates  

**Related:** FUT-006 · FUT-031 · [integrations/email-send-plane.md](./integrations/email-send-plane.md) · [CURRENT-TRUTH.md](./CURRENT-TRUTH.md) § Email path · `docs/communications-hub/`



**Problem:** XP presentation in the Daily Submission Acknowledgement email should show earned XP and extra credit in clear horizontal columns.



**Approved requirements:**



- Display XP in horizontal columns with headings **XP Earned** and **Extra Credit**.  

- **Always** display the Extra Credit column.  

- Display **0** when no extra credit is awarded.  

- Example: XP Earned `10` · Extra Credit `0`.



**Shipped (2026-09-01):** **076 v8.12** sends `xpEarned` (active `SUBMISSION_XP|` total) and `xpExtraCredit` (`0` until stored daily extra-credit source exists). Hub `DAILY_SUBMISSION` template renders horizontal columns. Display-time split only ? no XP award logic change. Checklist: [`docs/deploy-checklists/FUT-041-daily-submission-xp-columns.md`](./deploy-checklists/FUT-041-daily-submission-xp-columns.md).



### FUT-042 ? Style Coach Feedback as a quotation (emails + website cards)



**Priority:** P2  

**Status:** **COMPLETE** (2026-09-01) ? SC web `CoachFeedbackQuote` + Hub homework/video quotation styling deployed.  

**Systems:** Parent-facing emails; website/dashboard homework (and related) cards  

**Correct repo:** this repo (`web/` + Hub email HTML)  

**Related:** FUT-043 · FUT-032 · Automation **071** / homework feedback templates · `web/lib/data/public-athlete-homework.ts` (`Coach Feedback`)



**Problem:** Coach Feedback reads as plain body text rather than a clear quotation.



**Approved requirements:**



- Indented block; smaller font; italic text; orange left border; light blue-gray background; consistent padding; accessible color contrast.  

- Apply in both parent-facing emails and website/dashboard cards.



**Dependencies / risks:** Shared design tokens with FUT-043; contrast check against brand orange/blue.



**Shipped (2026-09-01):** `CoachFeedbackQuote` web component + Hub `coach-feedback-quote.js` in homework and video feedback emails. Orange left border, light blue-gray background, italic; hidden when empty.



### FUT-043 ? Consistent card design system (website + emails)



**Priority:** P2  

**Status:** READY (optional after 042) ? do not treat prior COMPLETE claim as live without re-verify  

**Systems:** Relevant website components and email cards  

**Correct repo:** this repo  

**Related:** FUT-042 · FUT-044 · FUT-011?FUT-017 design patterns · Impeccable / `BRAND_STANDARDS.md` · `APP_CONTEXT.md`



**Problem:** Cards across website and email surfaces are visually inconsistent.



**Approved requirements:** Standardize card heading size, font/weight, spacing, border/outline, corner radius, background colors, accent colors, internal padding, and responsive behavior across relevant website components and emails.



**Shipped (2026-09-01):** Web tokens in `globals.css`, helpers in `components/ui/sc-card.tsx`, applied to homework rows, Game Log, XP activity, catalog panels. Hub mirror in `card-tokens.js`. Doc: [`web/docs/sc-card-design-tokens.md`](../web/docs/sc-card-design-tokens.md).



**Decisions still open:** Token source of truth (CSS variables vs Hub partials); whether email HTML can share the same radius/border language as the web app.



### FUT-044 ? Remove redundant Submitted Work card; keep View Submitted Homework CTA



**Priority:** P2  

**Status:** **COMPLETE** (2026-09-01)  

**Systems:** Website athlete/parent homework UI  

**Correct repo:** this repo (`web/`)  

**Related:** FUT-043 · FUT-014 · athlete homework presentation components



**Problem:** A Submitted Work card is redundant when the View Submitted Homework action already covers the need.



**Approved requirements:** Remove the redundant Submitted Work card; keep the **View Submitted Homework** button.



**Shipped (2026-09-01):** Inventory found no prior Submitted Work card in `web/` (never implemented). Athlete profile homework rows (`HomeworkAssignments`) now expose only a **View Submitted Homework** external CTA when a safe lambda reviewer URL is present ? no inline submitted-work preview card. Data: Homework Completions `Submission Asset: Reviewer File URL (lookup)`.



**Validation:** `web` lint ? · typecheck ? · vitest homework-assignment + public-athlete-homework tests ?



### FUT-045 ? Use ?Assignment Name? (not ?Full Assignment Name?) in public-facing UI



**Priority:** P1  

**Status:** **COMPLETE** (2026-09-01) ? PR **#319** merged `de21fa36`; prod verified on `/shoot/athletes/athlete1-schmidt`  

**Systems:** Website cards, emails, assignment details, parent-facing displays  

**Correct repo:** this repo (+ Hub email payloads)  

**Related:** FUT-001 · FUT-014 · chatgpt-sources platform-config notes on public assignment naming · Homework Library / PHA field map



**Problem:** Public surfaces expose ?Full Assignment Name? (or equivalent long/internal labels) instead of parent-friendly **Assignment Name**.



**Approved requirements:** Use **Assignment Name** instead of **Full Assignment Name** in all public-facing components: website cards, emails, assignment details, parent-facing displays.



**Shipped (2026-09-01):** `resolvePublicAssignmentName()` in `web/lib/data/homework.ts` ? precedence **Assignment Title** ? `Assignment Full Name - Display` ? `Assignment Full Name`. Applied to homework catalog, athlete profile rows, homework detail view, and page SEO titles. FUT-001 identity matching unchanged (IDs only). Hub emails still pending FUT-046.



**Dependencies / risks:** Confirm Airtable field that is the canonical public Assignment Name vs formula/primary full name; do not break FUT-001 identity matching (internal identity may still use stable IDs / library keys).



### FUT-046 ? Homework feedback email subject: name + Assignment Name



**Priority:** P2  

**Status:** **COMPLETE** (2026-09-01) ? **071 v4.3** Production + Hub subject builder. Paste queue empty.  

**Systems:** Homework feedback email subject (Hub / **071** payload or Hub template)  

**Correct repo:** this repo + Communications Hub  

**Related:** FUT-032 · FUT-045 · FUT-047 · `docs/communications-hub/README.md`



**Problem:** Homework feedback subject line should identify athlete and assignment clearly.



**Approved requirements:** Subject format:



`Homework Feedback ? First Name Last Name ? Assignment Name`



**Shipped (2026-09-01):** Hub builds subject in `template-candidate-renderer.js`; `[TEST]` prefix when `testMode: true`. **071 v4.3** sends `assignmentTitle`, `athleteFirstName`, `athleteLastName`. Checklist: [`docs/deploy-checklists/FUT-046-homework-feedback-subject.md`](./deploy-checklists/FUT-046-homework-feedback-subject.md).



### FUT-047 ? Homework feedback contact: monitored Fairfield address (not unmonitored reply)



**Priority:** P1  

**Status:** **COMPLETE** (2026-09-01) ? Hub homework feedback contact copy deployed.  

**Systems:** Homework feedback (and any related) parent email copy  

**Correct repo:** this repo + Communications Hub templates  

**Related:** FUT-046 · FUT-006 · email send plane docs



**Problem:** Current instruction tells recipients to reply to an unmonitored notification address.



**Approved requirements:**



- Use monitored contact: **schmidt@fairfieldbasketballclub.com**  

- Recommended wording: ?Questions about this feedback? Please contact us at schmidt@fairfieldbasketballclub.com.?  

- Do not instruct parents to reply to the unmonitored notification address for feedback questions.



**Shipped (2026-09-01):** Hub `HOMEWORK_FEEDBACK` template footer updated; `mailto:` link on address. Reply-To / From headers unchanged. Homework-only v1 (video/welcome copy unchanged). Checklist: [`docs/deploy-checklists/FUT-047-homework-feedback-contact-copy.md`](./deploy-checklists/FUT-047-homework-feedback-contact-copy.md).



---



### SC-ATHLETE-WF-001 ? Individual athlete workflow QA (pre?season simulation)



**Priority:** P0  

**Status:** COMPLETE (harness) ? **MRW-I13 closed** (Submission XP once per Count It submission); 065 Satisfactory-alone is expected skip  

**Systems:** Testing harness, Enrollments (Testing3), Submissions, WAS, Homework Completions, Video Feedback, XP Events, streaks/levels contracts  

**Related (distinct):** SC-005 matrix · **SC-PW-E2E** (COMPLETE ? do not re-`--apply`) · **SC-SEASON-SIM-001/002** · **SC-CORE-WF / MRW-F11** (COMPLETE) · MRW-F09



Prove the **single disposable athlete** path end-to-end before any multi-enrollment season simulation: enrollment ? submissions (same-day / backdate / multi / Count It / Simple Total via Shot Total) ? XP dedupe ? homework/video ? streaks/levels expectations ? WAS rollups ? negatives ? replay.



**Safety:** `ATHWF|` Week labels · Testing3 `recNu6fcBpF1GG3u5` only · dry-run default · no email / Resend / Make · cleanup only manifest records.



**Plan / harness / evidence:** [`docs/testing/athlete-workflow/SC-ATHLETE-WF.md`](./testing/athlete-workflow/SC-ATHLETE-WF.md) · `tools/testing/sc-athlete-wf.mjs` · [`docs/testing/evidence/sc-athlete-wf/apply-session-final-2026-08-30.json`](./testing/evidence/sc-athlete-wf/apply-session-final-2026-08-30.json)



**Disposition (2026-08-30):** SC-005 B3 same-day multi SUBMISSION_XP is **expected** (once per Count It). Satisfactory HC without PHA does not fire 065 (expected skip). Agent PAT DELETE XP Events remains best-effort/MCP. Leave uncommitted `sc-pw-e2e-lib` formula-field WIP untouched.



### SC-SEASON-SIM-001 ? 60-Day Five-Enrollment Season Simulation



**Priority:** P2  

**Status:** Planned / Future ? **not active**; do **not** begin implementation until Phase 2 brief and dependencies below are satisfied  

**Systems:** Testing harness, Program Instances, Enrollments, Submissions, Homework Completions, Video Feedback, Zoom attendance, Weekly Athlete Summaries, XP Events, achievements/milestones, email handoff (test mode), SC-PW-E2E infrastructure  

**Related (distinct):** SC-001 / SC-002 / SC-005 (scenario matrix), **SC-PW-E2E** (Perfect Week disposable proof ? COMPLETE; do not re-`--apply` for closed fixtures), **FUT-010** (intake attachment cleanup ? **separate and unchanged**)



Create a reusable, unattended end-to-end simulation of a complete **60-day** Shooting Challenge season using **five disposable test enrollments**. Reuse and extend existing **SC-PW-E2E** infrastructure where appropriate. Support both **controlled harness mode** and **production-like Airtable automation mode**.



**Purpose (eventual coverage):**



- Daily submissions  

- Missed days and broken streaks  

- Homework completion and incomplete homework  

- Video submissions and feedback  

- Zoom attendance  

- Weekly summaries and XP  

- Levels and gates  

- Streak achievements  

- Shot milestones  

- Perfect Week success and failure  

- Backdated activity  

- Email handoffs in **test mode only** (no live delivery)  

- Correction, replay, deduplication, and failure handling  



**Proposed test profiles:**



1. Complete season  

2. Missed days and broken streaks  

3. Strong shooting with incomplete homework/videos  

4. Backdated activity and correction/replay  

5. Perfect Week, milestones, levels, and edge cases  



**Hard requirements (when implemented):**



- Separate test program instance: **?Season Simulation Testing?**  

- Test-only enrollment allowlist  

- No real participant records  

- No live email delivery  

- Stop on first material failure  

- Detailed evidence and failure report  

- Automatic cleanup **or** clearly marked archive  

- Controlled harness mode **and** production-like Airtable automation mode  

- Reuse/extend SC-PW-E2E where appropriate  



**Dependencies (must be resolved before implementation):**



1. **FUT-010** remains separate and unchanged (this item does not own attachment cleanup).  

2. Confirmed **test-environment isolation** (program instance + allowlist + no real participants).  

3. Final **field and automation inventory** for the season path under test.  

4. Decision on **cleanup vs archive** strategy for disposable simulation records.  

5. Design of **automation polling and timeout handling** for unattended runs.



**Acceptance criteria (future):** Phase 2 implementation brief exists; five profiles run unattended against the Season Simulation Testing instance; material failures stop the run with evidence; cleanup/archive policy executed; no live email; no real participant mutation; harness and automation modes both documented.



**Do not implement from this entry alone.** Convert to a Phase 2 brief first. Do not modify Airtable or FUT-010 under this ID until that brief is approved.



### SC-SEASON-SIM-002 ? Athlete 1 Season Simulation Infrastructure (May?June 2027)



**Priority:** P2  

**Status:** **COMPLETE (2026-09-02)** ? Final controlled run `SEASON-SIM-2027-20260902T213135Z-athlete1` writer complete; cascade verified (58 countable / 13,906 shots during gated formulas; Submission Base XP 58; 17 Streak Occurrences; Zoom live+recording XP; 6 WEEKLY Accepted/Hub sent allowlisted only; PW Eligible=0 expected). Production formulas restored; disposable run cleaned. Evidence (gitignored reports dir): `tools/season_simulation/reports/evidence-final-SEASON-SIM-2027-20260902T213135Z-athlete1.json`. **Next execute: NOT currently authorized.** Live formulas are normal **`NOW()` / `TODAY()`** ? **DO NOT change**.  

**Systems:** `tools/season_simulation/`, Airtable gated formulas (temporary), automations 010/114/073/053/055/057/072, Hub Test Allowlist  

**Related (distinct):** **SC-SEASON-SIM-001** (five-enrollment unattended package ? still Planned / Future; not started)



Build reusable Python infrastructure for a full **Athlete 1** season simulation against Production (no DEV base; app not live to families):



- Window: **2027-05-01 through 2027-06-30 inclusive** (61 calendar days)

- Athlete: **Athlete 1**, Grade **12**, highest configured Grade 12 / 9?12 shot goal (runtime resolve)

- Modes: **preflight**, default **dry-run**, gated **execute**, gated **cleanup**

- Writer: HC `Submission Date`, WAS Grade Band at create, disposable 2027 Zoom Meetings, VF Feedback Posted? arm

- Automations: dual-gated Season Sim path in **010 / 114 / 073** (`Season Sim Test Record?` + `Video Upload Note` contains `SEASON-SIM|` ? compare to `Season Sim Clock Now`)

- Emails: off by default; Hub Test Allowlist must include `schmidt@fairfieldbasketballclub.com` (row `recLxwQnjM6gpfVc9` added 2026-09-02)

- Success = records **and** live automation cascade (XP / streaks / achievements / levels / WAS / Perfect Week / email handoffs)



**Hard constraints:** Do not create 121; do not modify 101 / SC-147 / 117 unless a proven sim defect requires it; no family emails; temporary formulas stay until a successful run then restore.



**Acceptance (next execute):** Paste 010/114/073 ? new run ID ? poll cascade ? verify ? cleanup ? restore formulas.



**Paste packets:** [`SC-SEASON-SIM-002-automation-paste-010-114.md`](./deploy-checklists/SC-SEASON-SIM-002-automation-paste-010-114.md) · operator checklist · `tools/season_simulation/FORMULAS-TO-PASTE.txt`

---



## E. Items intentionally excluded or preserved elsewhere



These are not deleted or re-created as future-work items in this document:



- Current-state and security reports

- Deployment checklists and paste bundles

- Test fixtures and test results

- Historical closeout evidence

- Game Manual and Player Handbook source documents

- Current automation/version inventory used for production truth

- AWS/Lambda implementation and secure URL evidence

- Technical data-model, ownership, and deduplication contracts

- Media kits and completed 2025?26 publicity packets



### Superseded or rejected directions



- Public S3 bucket: rejected. S3 remains private; Lambda viewer URLs remain the parent-facing path.

- Tremendous awards integration: rejected as the future award solution; replace with FUT-004.

- Separate duplicate SEO pages when an existing page can be adapted: rejected.

- One large website redesign prompt: rejected in favor of separate page/component prompts.

- HW1/HW2 slot as the homework identity: rejected; assignment name/identity is authoritative.



---



## Source reconciliation inventory



The consolidation was based on a read-only review of:



- Repository `docs/v2-change-backlog.md`

- Repository `docs/CHATGPT-MASTER-PLAN-BRIEF.md`

- Repository `docs/shooting-challenge-v2-master-direction.md`

- Repository `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md`

- Repository `docs/next-wave/**` planning and Mike-action documents

- Repository `docs/overnight/web-integration/ADMIN-ROADMAP.md`

- Repository `docs/overnight/web-integration/INDEXING-SEO-DECISION.md`

- Repository `web/docs/admin-roadmap.md`, `web/docs/page-plan.md`, and `web/docs/project-roadmap.md`

- Repository `docs/audits/google-drive-field-removal-prep-2026-08-17.md`

- Repository `docs/next-wave/homework-pipeline/FLEXIBLE-HW1-HW2-SLOT-FOLLOWUP.md`

- Repository email redesign and Zoom deployment documents

- Library brainstorming note `Pasted markdown(20260824-200747).md`

- Library post-launch roadmap `Airtable_Post_Launch_Enablement_Roadmap.docx`



Where sources conflicted, this document uses the newest owner decisions supplied by Mike on 2026-08-24. Historical documents remain evidence, not current instructions.



## Proposed cleanup after Mike review



Historical planning documents were retired to pointer stubs on 2026-08-24:



1. `docs/v2-change-backlog.md` ? **historical stub** (full content: `git show 2f243d8:docs/v2-change-backlog.md`)

2. `docs/CHATGPT-MASTER-PLAN-BRIEF.md` ? **historical stub** (full content: `git show a081b76:docs/CHATGPT-MASTER-PLAN-BRIEF.md`)

3. `docs/chatgpt-sources/22-v2-change-backlog.md` and `23-master-plan-brief.md` ? synced historical stubs

4. Section F below ? reconciled legacy **C-/V2-/SC-** inventory for traceability



Do not delete current-truth, completion, deployment, security, test, schema, or historical evidence documents merely because this list summarizes them.



---



## F. Legacy C-/SC- inventory (reconciled 2026-08-24)



The owner-facing **FUT-** items above are the active future-work queue. The tables below preserve migrated **C-/V2-/SC-** IDs from historical planning documents with duplicate reconciliation applied. Use them for traceability and evidence lookup ? not as a second active queue.



### Duplicate reconciliation summary



| Overlap | Canonical | Other status |

|---------|-----------|--------------|

| C-010 / SC-068 | **C-010** | SC-068 ? Tracked under C-010 |

| V2-013 / SC-067 | **V2-013** | SC-067 ? Tracked under V2-013 |

| C-026 / SC-105 | **C-026** | SC-105 ? Tracked under C-026 |

| C-022 / SC-117 | **C-022** | SC-117 ? Tracked under C-022 |

| V2-002 / SC-034 | **V2-002** | SC-034 ? Tracked under V2-002 |

| V2-011 / SC-134 | **V2-011** | SC-134 ? Tracked under V2-011 |

| V2-012 / SC-135 | **V2-012** | SC-135 ? Tracked under V2-012 |

| C-023 / SC-097 / SC-098 | **C-023** | SC-097/098 ? Tracked under C-023 |

| C-018 / SC-064 | **C-018** | SC-064 ? Tracked under C-018 |

| C-025-EMAIL / SC-088 | **C-025-EMAIL** | SC-088 ? Tracked under C-025-EMAIL |

| V2-010 / SC-133 | **V2-010** | SC-133 ? Tracked under V2-010 |

| SC-027 / SC-076 | **SC-027** | SC-076 ? Tracked under SC-027 |

| SC-074 / SC-086 | **SC-074** | SC-086 ? Tracked under SC-074 |

| C-011 / SC-031 / SC-035 | **C-011** | SC-031/035 stay open (proof slices) |

| C-017 / SC-060 | **Both open** | Related; cross-reference only |



**Monitoring** (Live Tested with optional follow-up only): SC-004, SC-006, SC-008, SC-014, SC-023, SC-061, SC-083, SC-095, SC-027.



Removed corrupted migration row **SC-079**.



## Section A GÇö Backlog waves (C- / V2- / PKG- / SCV2-)



| ID | Title | Status | Dependencies | Notes |

|----|-------|--------|--------------|-------|

| **V2-065-066-SCRIPT-INPUT-001** | Fix Production **065** / **066** hardcoded `recordId` script inputs | `repository-ready` | [`065-066-v10.3-v3.9-dynamic-trigger-record.md`](./deploy-checklists/065-066-v10.3-v3.9-dynamic-trigger-record.md) | Migrated from v2-change-backlog |

| **V2-013** | **Multi-Year Architecture GÇö Program Instance Integration** | queued | Wave 1 hygiene, C-012 partial | Canonical for Program Instance architecture; merged SC-067. |

| **V2-014b** | Email Message Center (EMC) | queued | V2-014, C-011 | Migrated from v2-change-backlog |

| **C-012** | Stage K GÇö every field has one writer | queued | V2-013 | Migrated from v2-change-backlog |

| **C-026** | Merge **Tutorials** vs **Tutorials & Assets** GÇö keep one, delete duplicate | in progress | C-012 | Canonical for Tutorials table merge; merged SC-105 (web cutover proof, Dribble category audit EXT-QA-003). |

| **C-024** | Rock-solid dedupe keys + safe backfill reruns | queued | C-012 | Migrated from v2-change-backlog |

| **C-021** | Grade bands propagate automatically | queued | C-012 (field map) | Migrated from v2-change-backlog |

| **V2-002** | Config-over-scripts audit | **COMPLETE** (2026-08-27 repo pass) | C-021 | Canonical for config-over-scripts audit; merged SC-034. Evidence: `audits/2026-08-27-SC-034-config-hardcode-audit.md`. |

| **C-022** | Public display fields GÇö not primary/formula | queued | C-012 | Canonical for Presentation-field policy; SC-117 web wiring tracked here; email slices V2-003/V2-004. |

| **V2-003** | Homework email column fix (**071**) | queued | C-022 | Migrated from v2-change-backlog |

| **V2-004** | Weekly email homework table (**072**) | queued | C-022 | Migrated from v2-change-backlog |

| **C-010** | Harden `Active?` on Enrollments | queued | V2-013 partial | Canonical for Active? hardening; merged SC-068 (PPE backfill, automation guards, 072/118/119 Schmidt visibility conflict). |

| **C-011** | Fully automatic weekly parent emails | queued | C-010, C-022 | Related proof slices: SC-031 and SC-035 ? not duplicate deliverables. |

| **C-019** | Schmidt test enrollment | queued | C-010 partial | Migrated from v2-change-backlog |

| **C-023** | File dedup by **content hash**, not title/filename | in progress | C-013, C-024 | Canonical for content-hash dedup; merged SC-097/SC-098 proof slices. |

| **C-017** | Fillout GåÆ Athletes validation | queued | C-012 | Related to SC-060; keep both ? SC-060 covers intake-reopen validation. |

| **C-018** | Intake open vs challenge run | queued | V2-013 | Canonical for intake-open vs challenge-run calendars; merged SC-064 wiring. |

| **C-009** | Redo HW17 Fillout quiz intake (no attachment today) | queued | C-013, C-024 | Migrated from v2-change-backlog |

| **V2-005** | Tune Level Gate Rules | queued | C-021, V2-013 | Migrated from v2-change-backlog |

| **V2-006** | Tune XP Reward Rules | queued | C-021 | Migrated from v2-change-backlog |

| **V2-007** | Tune Levels table | queued | V2-005 | Migrated from v2-change-backlog |

| **V2-008** | Game manual | queued | Wave 9 | Migrated from v2-change-backlog |

| **V2-009** | `/shoot` rules + progress hub | queued | Wave 9, C-022 | Migrated from v2-change-backlog |

| **V2-010** | Pre-season parent comms | queued | V2-008 | Canonical for pre-season parent comms; merged SC-133. |

| **C-027** | **Major-event** notifications GÇö level up, milestones (not daily XP) | queued | C-010, C-024, V2-008 | Migrated from v2-change-backlog |

| **C-028** | First Tremendous award send via Make.com sandbox | in-progress | Gift-card Award Recipients row | Migrated from v2-change-backlog |

| **V2-011** | Full pre-season audit pack | queued | All above | Canonical for pre-season audit pack; merged SC-134. |

| **V2-012** | Dry-run season on Schmidt test | queued | C-020, Wave 7GÇô9 | Canonical for Schmidt dry-run season; merged SC-135. |

| **C-025-EMAIL** | C-025 Stage 17 GÇö wire Zoom recording approval email webhook (117 blank) | queued | C-025 Stage 17 complete | Canonical for Zoom recording approval email; merged SC-088 live proof. |



---



## Section B GÇö Completion master (SC-)



Open SC items with remaining work (status not Complete / Superseded / Not Needed). Sorted by priority then ID.



| ID | Area | Title | Priority | Status | Dependencies | Remaining work |

|----|------|-------|----------|--------|--------------|----------------|

| **SC-001** | Testing | Universal Testing Scenarios framework so Mike can run Fillout-shaped tests without Fillout | P0 | Live Tested in PROD | SC-004, SC-059 | Broader season matrix, Homework XP after review, Make/S3, and email remain separate release work |

| **SC-004** | Testing | Permanent Schmidt testing enrollment for live PROD tests | P0 | Monitoring | GÇö | Keep emails Schmidt-only; **Schmidt remains visible on public standings**; optional refresh when foundation WAS IDs change |

| **SC-005** | Testing | Full end-to-end live PROD matrix (all major paths) | P0 | Live Tested in PROD | SC-001GÇôSC-004, core pipelines | Unblock B3 policy / B5 backdate week; streak+milestone when unlocks exist; email/failure inject GåÆ SC-008 |

| **SC-SEASON-SIM-001** | Testing | 60-day five-enrollment season simulation (reusable, unattended) | P2 | Planned / Future | Test isolation; field/automation inventory; cleanup/archive decision; polling/timeout design; SC-PW-E2E reuse; **FUT-010 separate** | Not active ? do not implement yet; five disposable profiles; harness + automation modes; stop on first material failure; evidence + cleanup/archive |

| **SC-007** | Testing | Duplicate and rerun testing (idempotency proof) | P0 | Live Tested in PROD | SC-066, SC-096+ | Optional: 010 UI re-trigger attest; milestone/PW/Zoom-attend live fixtures when present |

| **SC-010** | Homework | PDF / document homework submissions work end-to-end | P0 | Installed in PROD | SC-019 | Re-test PDF path; quiz uses Option B (no PDF asset GÇö SC-014) |

| **SC-011** | Homework | Video submissions as homework/learning assets | P0 | Installed in PROD | SC-133 | Re-test video as homework vs daily video rules; confirm purpose routing |

| **SC-013** | Homework | Online quizzes create a reviewable completion | P0 | Live Tested in PROD | SC-014 | Optional: expand to non-Schmidt enrollment; keep 071 path smoke if needed |

| **SC-014** | Homework | Final Reflection quiz completion path (PDF vs attachment-less) | P0 | Monitoring | SC-013 | No further path decision; do not reopen Option A / Quiz Result PDF |

| **SC-016** | Homework | Exactly one Homework Completion per assignment per enrollment | P0 | **COMPLETE** (2026-08-31) | SC-066, SC-014 | Multi-asset + 065 XP proven on Testing3; do **not** re-paste 020/065 scripts |

| **SC-021** | Config | Config-over-code audit (no hardcoded season numbers in scripts) | P0 | Installed in PROD | SC-022 | Run 057 on CASE-01 WAS; CASE-01GÇª16 + verifier; migrate remaining hardcode consumers |

| **SC-022** | Config | XP Reward Rules audit and cleanup | P0 | Installed in PROD | SC-021, SC-023 | Resolve Video XP 1-vs-25; decide Zoom Recording / Manual Bonus rule records; supervised streak proof still open |

| **SC-023** | Config | Grade Bands as linked source of truth | P0 | Monitoring | SC-021 | **003 v2.0 COMPLETE / PRODUCTION-VERIFIED / DO-NOT-TOUCH** (2026-09-03) ? keep active; grade-change refresh on disposable VERIFY Enrollment; offline regression `tests/enrollment-intake/automation-003-grade-change-refresh.test.js`; closeout [`prod-completion/2026-09-03/AUTOMATION-003-GRADE-CHANGE-VERIFIED.md`](./prod-completion/2026-09-03/AUTOMATION-003-GRADE-CHANGE-VERIFIED.md). Archive inactive legacy bands when ready; keep Min/Max match (no hard-coded band ID); **002** remains initial assign |

| **SC-027** | Config | Shot Milestones config + awards | P0 | Monitoring | SC-096 | Continue recurrence monitoring; no further 066 paste/replay unless source, trigger, schema, or milestone data changes |

| **SC-031** | Config | Weekly schedule settings (build/send timing) | P0 | Installed in PROD | SC-051 | Proof slice for C-011 weekly email automation ? keep open. Prove the normal `build_armed` and send-arm branches after a real eligible completed Week/package exists; keep 074 `sendMode=Live` where app |

| **SC-032** | Config | Season settings (dates, windows) | P0 | Built in Repository | SC-065, SC-084 | Import Weeks in PROD; Mike UI attestations; authorize Launch Status fields; controlled activation |

| **SC-035** | Weekly Summary | Guaranteed Weekly Athlete Summary for every enrollment +ù ended week | P0 | Installed in PROD | SC-004, SC-082 | Proof slice for C-011 WAS build path ? keep open. Prove 118 `build_armed` with a real eligible completed Week; monitor WAS uniqueness and the downstream 072GåÆ119GåÆ074 handoff |

| **SC-036** | Weekly Summary | Weekly summary calculations correct | P0 | Installed in PROD | SC-054 | Re-test calc fields on Schmidt; Presentation columns (SC-054) |

| **SC-058** | Data Integrity | Automation version inventory filled from live UI | P0 | **Live Tested in PROD ? MCP attestation 2026-09-04** | SC-059 | 50 live automations attested; **101** GitHub+Live **v6.8** after PR **#398**. Evidence: [`audits/SC-057-058-LIVE-ATTESTATION-20260904.md`](./audits/SC-057-058-LIVE-ATTESTATION-20260904.md) · [`audits/WORKFLOW-RELIABILITY-INVENTORY-20260904.md`](./audits/WORKFLOW-RELIABILITY-INVENTORY-20260904.md) |

| **SC-059** | Data Integrity | Retire legacy automations 112 and 043 | P0 | Installed in PROD / 043 not deployed | SC-001, SC-058 | Confirm 112 OFF and retain the no-recreate-043 disposition; do not restore 043 or the stale orphan-XP bulk count from #100 |

| **SC-065** | Enrollment | Challenge dates / Weeks configuration rebuilt | P0 | **COMPLETE (calendar + 18 PHA)** | SC-032 | Early Bird Apr 25?May 1 countable finalized; 18 active PHA + June 29 due; Week 9/Post-Challenge no HW; archive WSTEST/PWTEST before season sim ? [`WEEKS-2026-27-AUDIT-2026-08-30.md`](./testing/evidence/WEEKS-2026-27-AUDIT-2026-08-30.md) · [`HOMEWORK-PHA-18-AUDIT-2026-08-30.md`](./testing/evidence/HOMEWORK-PHA-18-AUDIT-2026-08-30.md) |

| **SC-068** | Enrollment | Inactive / processing controls (`Active?` hardened) | P0 | Tracked under C-010 | SC-004 | PPE create/backfill; paste guards; resolve 072/118/119 Schmidt hard-exclude conflict vs GÇ£Schmidt visibleGÇ¥ web direction |

| **SC-069** | Enrollment | Testing enrollment behavior documented and proven | P0 | Live Tested in PROD | SC-004, SC-068 | Email-path live proof still needed; standings web spot-check |

| **SC-070** | XP | Daily submission XP awards correctly | P0 | Live Tested in PROD | SC-049 | Rerun pack on additional submissions; keep Schmidt-only |

| **SC-071** | XP | Homework XP after satisfactory review | P0 | Installed in PROD | SC-017 | Live prove after coach satisfactory |

| **SC-072** | XP | Video XP awards correctly | P0 | Installed in PROD | SC-133 | Mike verifies current trigger + one Schmidt lifecycle proof after upload writeback |

| **SC-073** | XP | Live Zoom XP awards correctly | P0 | Installed in PROD | SC-116 | Re-test live meeting attendance |

| **SC-074** | XP | Zoom recording XP / credit path | P0 | Built in Repository | SC-116 | Decide whether to deploy a future dedicated recording-credit automation (new slot) or keep email-only 117 |

| **SC-076** | XP | Milestone XP (shot milestones) | P0 | Tracked under SC-027 | SC-027 | Continue recurrence monitoring; no further paste/replay unless 066 source, trigger, schema, or milestone model changes |

| **SC-078** | XP | Level progression updates correctly | P0 | Live Tested in PROD | SC-024 | Live level-up past Rookie and post-test scheduled-041 idempotency still need controlled proof |

| **SC-080** | XP | Gate clearing when requirements met | P0 | Installed in PROD | SC-074 | Live prove clear after HW/Zoom credit |

| **SC-084** | Zoom | Live attendance capture works | P0 | Installed in PROD | SC-073 | Recreate meetings; Schmidt attend test |

| **SC-086** | Zoom | Recording credit path works | P0 | Tracked under SC-074 | SC-074 | Re-open only with a new attested automation plan that does not steal email slot 117 |

| **SC-087** | Zoom | Live-versus-recording exclusivity | P0 | Installed in PROD | SC-086 | Re-prove Conflict=1 blocks double credit |

| **SC-090** | Zoom | Level gate integration for Zoom credit | P0 | Installed in PROD | SC-080 | Live prove |

| **SC-091** | Zoom | Perfect Week integration for Zoom credit | P0 | Installed in PROD | SC-077 | Fixture CASE-10GÇª13 (not required / attended / missing / cross-enrollment) |

| **SC-094** | Assets | Video storage on program-owned S3 | P0 | Installed in PROD | SC-150 | Re-test writeback on Schmidt asset as needed |

| **SC-095** | Assets | Homework storage on S3 (070a route) | P0 | Monitoring | SC-094 | Keep 070a ON; monitor Make Module if routing drifts |

| **SC-096** | Assets | Canonical HTTPS URLs on assets | P0 | Installed in PROD | SC-094, SC-150 | Re-verify after wipe; do not make Canonical public |

| **SC-099** | Assets | Writeback verification (070c) | P0 | Installed in PROD | SC-094 | Re-test AcceptedGåÆverify |

| **SC-135** | Platform | Dry-run full season on Schmidt before public intake | P0 | Tracked under V2-012 | SC-005 | Execute after phases 1GÇô13 |

| **SC-147** | Data Integrity | Reliability Command Center GÇö workflow health visibility before prod failures | P0 | Built in Repository | SC-040, SC-046 | Mike/OMNI create views 1GÇô4; review first Sunday health; **no auto repairs** |

| **SC-149** | Website | Fairfield branding URLs (landing / site env / chrome ? not Hoop Challenges) | P0 | **COMPLETE / Live Tested in PROD** (2026-09-04) | SC-102 | Production Vercel env MATCH (`NEXT_PUBLIC_LANDING_URL` / `SITE_URL` / `BASE_PATH`); live HTML Fairfield; zero hoop hosts. Dual deliverable with Family Dashboard nav row below (same ID). Evidence [`testing/evidence/SC-149-FAIRFIELD-ATTESTATION-2026-09-04.json`](testing/evidence/SC-149-FAIRFIELD-ATTESTATION-2026-09-04.json) · ledger [`audits/SC-149-TRUTH-LEDGER-20260904.md`](./audits/SC-149-TRUTH-LEDGER-20260904.md) · checklist Promoted |

| **SC-002** | Testing | Test scenario library / templates for repeatable suites | P1 | Installed in PROD | SC-001 | Install/execute SCN-021GÇô043 on Schmidt; expand matrix; optional Airtable fields/UI only if approved |

| **SC-008** | Testing | Email, Make, upload, and failure-path testing | P1 | Monitoring | SC-131+, SC-051+, SC-150 | Optional Mike-authorized live 074 invalid-webhook inject (SCN-029) GÇö offline+SOP already cover keep-Send-to-Make? |

| **SC-012** | Homework | Written / reflection responses work | P1 | Installed in PROD | SC-019 | Re-test written-only HC; coach review + 071 |

| **SC-015** | Homework | Multiple files per homework response | P1 | **COMPLETE** (2026-08-31) | SC-019 | N assets ? one HC + one `HOMEWORK_XP\|{hcId}` on Testing3; 065 required remap + trigger re-entry |

| **SC-018** | Homework | Learning Activities table (catalog of activities) | P1 | Built in Repository | SC-020 | Mike-authorized Airtable schema; seed catalog; keep FBC Curriculum SYNC unless decided otherwise |

| **SC-019** | Homework | Learning Activity Responses table + ResponseGåÆasset routing | P1 | Built in Repository | SC-018 | Schema; automations; Fillout/web intake; route to Submission Assets / optional HC |

| **SC-020** | Homework | Activities that count as homework vs stand-alone | P1 | Planned | SC-018, SC-019 | Implement flag + automation filters + coach views |

| **SC-024** | Config | Levels table reliable for progression | P1 | Installed in PROD | SC-022 | Re-seed after wipe if needed; tune thresholds (SC-027) |

| **SC-026** | Config | Achievements catalog + unlock rules | P1 | Installed in PROD | SC-066 | Re-seed; re-test unlocks; dedupe keys |

| **SC-028** | Config | Perfect Week rules configurable | P1 | **COMPLETE** (E2E) ? 057 v2.2 + WAS + 059 + award on `recl3DmBh22ADPWWe` | SC-116, **SC-PW-E2E** | MCP award evidence JSON |

| **SC-030** | Config | Zoom percentage / credit settings in config | P1 | Installed in PROD | SC-116 | Re-verify config rows after wipe; document operator knobs |

| **SC-034** | Config | Remove remaining hardcoded values from automations | P1 | **COMPLETE** (2026-08-27) | SC-021, **V2-002** | Bounded pass complete: Config-only video minimum, audit JSON, contract tests, 057 v2.2 live |

| **SC-037** | Weekly Summary | Previous-week helpers reliable | P1 | Installed in PROD | SC-084 | Re-verify after Weeks rebuild |

| **SC-056** | Data Integrity | Script input/output variables standardized | P1 | **Built in Repository ? standard + tests 2026-08-27** | SC-057 | 058 legacy output migration on next touch |

| **SC-057** | Data Integrity | Automation trigger review (no duplicate triggers) | P1 | **Complete ? live MCP 2026-09-04** | SC-058 | 112/043/063/068/075/077/111 **absent**; no duplicate VF/level writers. Residual **SF-01/SF-02** (057 formula queue / 058 positive-only) tracked as separate remediation ? not duplicate triggers. Evidence: [`audits/SC-057-058-LIVE-ATTESTATION-20260904.md`](./audits/SC-057-058-LIVE-ATTESTATION-20260904.md) · [`audits/WORKFLOW-SILENT-FAILURE-REMEDIATION-20260904.md`](./audits/WORKFLOW-SILENT-FAILURE-REMEDIATION-20260904.md) |

| **SC-060** | Enrollment | Fillout enrollment validation is trustworthy | P1 | Live Tested in PROD | SC-081 | Related to C-017; keep open for intake-reopen validation work. Live Fillout tighten when intake reopens; retain broader intake proof boundaries |

| **SC-061** | Enrollment | New vs returning athletes handled correctly | P1 | Monitoring | SC-060 | Additional non-Schmidt returning case optional |

| **SC-063** | Enrollment | Email validation (parent/athlete) | P1 | Built in Repository | SC-060 | Fillout email rules ON; bounce SOP still open |

| **SC-064** | Enrollment | Intake-open dates separate from challenge run dates | P1 | Tracked under C-018 | SC-032 | Wire intake-open into Fillout/web gate; Weeks flags if authorized |

| **SC-075** | XP | Streak XP | P1 | Live Tested in PROD | SC-029, SC-068 | Optional break/rebuild supervised test; SC-081 decision |

| **SC-077** | XP | Perfect Week XP | P1 | **COMPLETE** ? 059 awarded 100 XP on unlock `recJ5umer4J4FHTOz` | SC-028, SC-074, **SC-PW-E2E** | MCP evidence JSON |

| **SC-083** | XP | Achievement unlock deduplication | P1 | Monitoring | SC-026 | Monitor recurrence; do not reintroduce stale orphan-XP bulk counts from #100 |

| **SC-088** | Zoom | Recording approval email to parent | P1 | Tracked under C-025-EMAIL | SC-086 | Mike: create Recording Quiz Satisfactory fixture GåÆ Test 117 GåÆ expect sent/already_sent; no XP |

| **SC-089** | Zoom | Total Zoom counts correct | P1 | Installed in PROD | SC-048 | Re-verify formulas after schema export |

| **SC-092** | Zoom | Weekly summary shows Zoom correctly | P1 | Installed in PROD | SC-036, SC-054 | Re-test Presentation labels |

| **SC-097** | Assets | SHA-256 hashes recorded | P1 | Tracked under C-023 | SC-094 | Re-test hash write + review queue |

| **SC-098** | Assets | Duplicate file reuse decision (manual, safe) | P1 | Tracked under C-023 | SC-097 | Re-test confirm/reversal; never auto-reuse another athleteGÇÖs object |

| **SC-102** | Website | Airtable-backed public pages work | P1 | Live Tested in PROD | SC-055 | Keep catalog content current; Presentation fields later (SC-054) |

| **SC-117** | Website | Public Presentation fields consumed by web | P1 | Tracked under C-022 | SC-054 | Wire queries to Presentation fields only |

| **SC-134** | Platform | Full pre-season audit pack green | P1 | Tracked under V2-011 | SC-046GÇôSC-058 | Extend audits; run on rebuilt PROD |

| **SC-139** | Platform | Refresh stale status docs (KNOWN_ISSUES, inventory, E2E Zoom rows, brief) | P1 | **Partial ? CURRENT-TRUTH + audits 2026-08-27** | GÇö | Continue sweeping KNOWN_ISSUES / Zoom E2E stale rows / brief after each SC |

| **SC-148** | Website | Mobile usability + accessibility for public `/shoot` | P1 | **COMPLETE / Live Tested in PROD** (2026-09-04) | SC-102, SC-113, SC-118 | Interactive prod attestation (Escape/focus return, skip link, 44px targets, 375/390 overflow, labeled sign-in). Playwright `mobile-a11y` **18/18** vs Production. Evidence [`audits/SC-148-mobile-a11y-prod-attestation-20260904.md`](./audits/SC-148-mobile-a11y-prod-attestation-20260904.md) · [`testing/evidence/SC-148-PROD-ATTESTATION-2026-09-04.json`](./testing/evidence/SC-148-PROD-ATTESTATION-2026-09-04.json). Optional later: full axe-core CI gate |

| **SC-006** | Testing | Automatic Expected-versus-Actual results on scenarios | P2 | Monitoring | SC-001, SC-002 | Keep read-only unless Mike designates one Pass/Fail writer; optional wire CLI report into scenario UI manually |

| **SC-029** | Config | Streak values in config (not buried in code) | P2 | Live Tested in PROD | SC-022 | Mike decide repeat-after-break (SC-081); optional supervised break/rebuild test |

| **SC-033** | Config | Enable/disable switches for major features | P2 | Planned | SC-066 | Inventory switches; document operator map |

| **SC-062** | Enrollment | Sibling handling works | P2 | Built in Repository | SC-045 | Live sibling parent-email routing test |

| **SC-081** | XP | Streak economics review | P2 | Decision resolved ? repeat rewards automatically | SC-029 | Decide whether to change repeat-after-break rules |

| **SC-082** | XP | Early level-gate tuning for next season | P2 | Planned | SC-025 | Load numbers when season config ready |

| **SC-085** | Zoom | Live bonuses (if configured) work | P2 | Decision resolved ? recorded meetings count for level gates and half XP | SC-022 | Confirm which bonuses still desired; test |

| **SC-093** | Zoom | Public website Zoom pages accurate | P2 | Installed in PROD | SC-146 | Confirm Airtable publish filters after wipe |

| **SC-103** | Website | Leaderboard | P2 | Live Tested in PROD | SC-068 | Fix Schmidt Grade/School Year (EXT-QA-005); season content hygiene |

| **SC-104** | Website | Homework catalog | P2 | **Complete** (FUT-014, 2026-08-26) | SC-054 | PHA-backed live catalog at `/shoot/homework`; Brief Description = `Homework Library.Brief Description - Display`; commits `cdd2b97` / `4a26aa4`; optional: unpublish stale Week 10 prior-season rows (EXT-QA-006) |

| **SC-105** | Website | Tutorials | P2 | Tracked under C-026 | SC-052 | Complete table merge SC-052; audit Article GÇ£DribbleGÇ¥ category (EXT-QA-003) |

| **SC-106** | Website | Levels pages | P2 | Live Tested in PROD | SC-024 | Gate copy polish; cover 410 graceful fallback in web |

| **SC-107** | Website | Achievements pages | P2 | Installed in PROD | SC-026 | Re-seed / Active?+Visible? for Shot Milestones + Perfect Week (EXT-QA-002) |

| **SC-108** | Website | Zoom public pages | P2 | Live Tested in PROD | SC-093 | Refresh expired Cover Media URLs (EXT-QA-004); web now hides 410 images |

| **SC-109** | Website | Game Manual from config | P2 | **COMPLETE / Live Tested in PROD** (2026-09-04) | SC-032, SC-082 | Adobe Publish Online link live on `/shoot/game-manual` (repo default `GAME_MANUAL_PUBLISH_URL`; env override optional). Evidence [`testing/evidence/SC-109-PROD-ATTESTATION-2026-09-04.json`](testing/evidence/SC-109-PROD-ATTESTATION-2026-09-04.json) · checklist [`SC-109-game-manual-url-verification.md`](deploy-checklists/SC-109-game-manual-url-verification.md). Optional later: Shot Milestones public config surface; SC-133 parent comms |

| **SC-110** | Website | Public display page | P2 | Installed in PROD | SC-054 | Wire Presentation fields; real season year after School Year fix |

| **SC-111** | Website | Athlete profiles (real data, not mocks) | P2 | Live Tested in PROD | SC-103 | Optional: recreate `Web - Leaderboard` view (fallback OK) |

| **SC-112** | Website | Athlete auth + dashboard | P2 | **COMPLETE ? PRODUCTION VERIFIED BY MIKE** (2026-09-04) | SC-149 | Private `/shoot/dashboard`; opaque selection keys. Select 404 root cause: JSON `redirectTo` already had `/shoot`, `router.push` doubled basePath ? `/shoot/shoot/dashboard`. Fix commit `e3bb7e45` · merge `78208ffc` · PR **#388** · Production deploy `dpl_8TLH6uQAvLXUoQGDrGQ4NrFnWcVG`. Mike verified three-child select, switch, dashboards, sign-out; no `/shoot/shoot/`, no `rec?` in URLs. **No further SC-112 action.** Closeout: [`audits/SC-112-multi-child-select-404-fix-20260904.md`](./audits/SC-112-multi-child-select-404-fix-20260904.md) · [`audits/SC-112-finalization-closeout-20260903.md`](./audits/SC-112-finalization-closeout-20260903.md) |

| **SC-149** | Website | Public Family Dashboard navigation | P1 | **COMPLETE / Live Tested in PROD** (2026-09-04) | SC-112 | Header, mobile, footer, parent/FAQ CTAs ? `/shoot/dashboard/sign-in`; private `/dashboard` remains auth-gated. PR **#358** merge `29904b45`. Evidence [`audits/SC-149-family-dashboard-nav-prod-verification-20260904.md`](./audits/SC-149-family-dashboard-nav-prod-verification-20260904.md) |

| **SC-151** | Website | Family Dashboard allows registered Gmail parent emails | P1 | **MERGED/DEPLOYED** (PR **#389** · merge `a00ef7a5` · prod `dpl_2mch4scL3c6bgHZgizDbsqPTywbW`) | SC-112 | Removed incorrect Gmail domain block + fixed sign-in copy. Production smoke: `/shoot/dashboard/sign-in` shows registration-email instruction; Gmail prohibition gone. **SC-112 remains closed.** Audit: [`audits/SC-151-family-dashboard-gmail-access-20260904.md`](./audits/SC-151-family-dashboard-gmail-access-20260904.md) |

| **SC-152** | Achievements | Perfect Week 057 formula-queue / trigger reliability (SF-01) | P0 | **COMPLETE / Live Tested** (2026-09-04) | SC-057 (attestation closed), SC-028 | Live 057 **v2.4**; Recalc re-entry PASS. Evidence [`audits/SC-152-153-LIVE-VERIFICATION-20260904.md`](./audits/SC-152-153-LIVE-VERIFICATION-20260904.md). |

| **SC-153** | Achievements | Perfect Week 058 lifecycle / positive-only trigger (SF-02) | P0 | **COMPLETE / Live Tested** (2026-09-04) | SC-152, SC-077 | Live 058 **v1.7** + lifecycle trigger; withdraw/restore/idempotency PASS. Evidence [`audits/SC-153-058-V17-LIVE-VERIFICATION-20260904.md`](./audits/SC-153-058-V17-LIVE-VERIFICATION-20260904.md). |

| **SC-154** | Weekly Summary | Duplicate Weekly Athlete Summary uniqueness (SF-03) | P1 | **COMPLETE / Live attested** (2026-09-04) | SC-037 | No valid Enrollment+Week duplicates; 031 v4.1 sole create; reconciliation view exists. Evidence [`audits/SC-154-WAS-DUPLICATE-RESULT-20260904.md`](./audits/SC-154-WAS-DUPLICATE-RESULT-20260904.md). |

| **SC-155** | Levels | Level recalculation lag / stuck Needed? (SF-04) | P1 | **COMPLETE / Disproven as defect** (2026-09-04) | SC-024 | 041 cron ?15m expected async; 0 stuck Needed? rows. Evidence [`audits/SC-155-LEVEL-LAG-RESULT-20260904.md`](./audits/SC-155-LEVEL-LAG-RESULT-20260904.md). |

| **SC-156** | Assets | Automation 070a enabled-state + failure observability (SF-06) | P1 | **COMPLETE / Live Tested** (2026-09-04) | SC-095, SC-138 | Live 070a **v4.7** script-only (post-clear Update removed + published); skip/idempotency PASS. Evidence [`audits/SC-156-070A-LIVE-CLOSEOUT-20260904.md`](./audits/SC-156-070A-LIVE-CLOSEOUT-20260904.md). |

| **SC-157** | Platform | Draft PR **#340** disposition vs SC-147 closeout | P1 | **COMPLETE** (2026-09-04) | SC-147 | PR **#340** closed as fully superseded; evidence [`audits/SC-157-PR340-DISPOSITION-20260904.md`](./audits/SC-157-PR340-DISPOSITION-20260904.md). |

| **SC-158** | Intake | Automation 006 / Submissions.Video Count ownership (SF-07) | P2 | **COMPLETE / Live Tested** (2026-09-04) | SF-07 | **RETIRE 006** (not deployed). Presence = Has Video? formula; PW videos = **057**. Orphan Video Count mismatches detectable. Evidence [udits/SF-07-VIDEO-COUNT-CLOSEOUT-20260904.md](./audits/SF-07-VIDEO-COUNT-CLOSEOUT-20260904.md). |
| **SC-159** | Achievements | Automation 059 Active? lifecycle / formula trigger (SF-08) | P2 | **COMPLETE / Live Tested** (2026-09-04) | SC-077, SC-066 | Live `059 Lifecycle Trigger?` + **059 v3.8**; withdraw/restore/idempotency/PW PASS. Nested OR checklist superseded. Evidence [`audits/SC-159-LIVE-VERIFICATION-CLOSEOUT-20260904.md`](./audits/SC-159-LIVE-VERIFICATION-CLOSEOUT-20260904.md) · redesign [`audits/SC-159-LIFECYCLE-TRIGGER-REDESIGN-20260904.md`](./audits/SC-159-LIFECYCLE-TRIGGER-REDESIGN-20260904.md) · checklist [`deploy-checklists/059-sc159-lifecycle-formula-trigger.md`](./deploy-checklists/059-sc159-lifecycle-formula-trigger.md). |
| **SC-160** | Intake / Homework / PW | Asset intake without Submission.Week + early/on-time/late HW (009/020/065/057) | P0 | **IN PROGRESS — GitHub ready; Mike paste** (2026-09-04) | 009, 005, FUT-001 | **009 v1.3** (assets without Week); Ready/Why Not Ready drop Week gate; **020 v4.0** (HC Week=PHA.Week); **065 v10.7**; **057 2.5** (early counts PW HW; late XP ok / PW exclude). 059 untouched. Checklists [`deploy-checklists/SC-160-009-asset-intake-decouple.md`](./deploy-checklists/SC-160-009-asset-intake-decouple.md) · [`deploy-checklists/SC-160-homework-timing-pw-020-057-065.md`](./deploy-checklists/SC-160-homework-timing-pw-020-057-065.md). Audits [`audits/SC-160-ASSET-INTAKE-DECOUPLE-20260904.md`](./audits/SC-160-ASSET-INTAKE-DECOUPLE-20260904.md) · [`audits/SC-160-HOMEWORK-TIMING-PW-20260904.md`](./audits/SC-160-HOMEWORK-TIMING-PW-20260904.md). |
| **SC-113** | Website | Loading, empty, and error states | P2 | Live Tested in PROD | GÇö | Keep states aligned when SC-112 lands |

| **SC-115** | Website | noindex removal / search indexing | P2 | **Complete** (2026-08-25, `647d465`; prod verified) | SC-114 | **Prod cutover verified** ? Vercel Production `NEXT_PUBLIC_ALLOW_SEARCH_INDEXING=true`; public pages indexable; athlete profiles + private routes `noindex`; sitemap excludes athletes/public-display; `npm run test:smoke:prod` 50/50 after cross-env fix. Checklist: `docs/deploy-checklists/2026-08-25-web-search-indexing-cutover.md`. |

| **SC-118** | Website | Production readiness smoke package for public `/shoot` | P2 | **Complete** (2026-08-30, PR **#308** `7332d2f3`) | SC-102 | Prod smoke **52/52** (includes `/faq`); HTTP smoke PASS; Vitest **493/493** + `public-route-readiness`; indexing policy verified on prod |

| **SC-133** | Platform | Pre-season parent comms from rules | P2 | Tracked under V2-010 | SC-109 | Write/send after SC-109 |

| **SC-138** | Platform | Close stale overnight GitHub issues/PRs for 070a | P2 | Planned | SC-095 | Close or update with current truth |

| **SC-144** | Website | Rename Softr-named publish flag | P2 | **DEFERRED** (general schema typo wave) | SC-054 | Gate summary / Softr flag / HC RID typos ? SAFE-MIGRATION-PLAN P3; **Perfect Week Video Minimum** typo fixed 2026-08-27 |

| **SC-145** | Platform | Repo health / security audit follow-ups | P2 | Planned | GÇö | Triage findings into SC items as needed |

| **SC-146** | Enrollment | Re-open Fillout daily intake when season ready | P2 | Deferred | SC-060, SC-135 | Turn on only after SC-135 dry-run |

| **SC-147** | Zoom | Recorded meeting half-XP via Automation **101 v6.8** (no slot 121) | P1 | **COMPLETE / Live Tested in PROD** (2026-09-04) | SC-022, SC-087 | Production Live **v6.8** attested; GitHub synced to v6.8; disposable recording 30 + live 60; idempotent re-run; **no 121**; 117 email-only. Evidence [`audits/SC-147-101-V68-PRODUCTION-CLOSEOUT-20260904.md`](./audits/SC-147-101-V68-PRODUCTION-CLOSEOUT-20260904.md) · [`testing/evidence/SC-147-20260904/production-attestation.json`](./testing/evidence/SC-147-20260904/production-attestation.json) · prior [`testing/evidence/sc-147-101-v68/VERIFY-2026-09-02-POST-PASTE.md`](./testing/evidence/sc-147-101-v68/VERIFY-2026-09-02-POST-PASTE.md) |

| **SC-066** | Enrollment | Early-bird periods supported for 2026?2027 | P3 | Decision resolved ? use early-bird registration | SC-065 | Decide if 2026GÇô27 uses early-bird; config if yes |

| **SC-067** | Enrollment | Program Instance multi-year design | P3 | Tracked under V2-013 | SC-032, SC-046 | Dedicated architecture wave later GÇö do not block season launch on PI redesign |

| **SC-100** | Assets | Attachment / Drive retirement strategy | P3 | Deferred | SC-095 | Plan retirement after S3 paths stable for HW+video |

| **SC-116** | Website | Admin roadmap (gated read-only first) | P3 | Built in Repository | SC-112 | Staff auth then read-only aggregates; no writes in first slice |

| **SC-127** | Awards | Award Recipients scope metadata cleanup | P3 | Deferred | GÇö | Optional if reports need it |

| **SC-128** | Awards | Awards catalog duplicate `thanks_for_playing` bucket | P3 | Deferred | GÇö | Consolidate Class/bucket |

| **SC-129** | Other | Conquered Goal Date lookup filter | P3 | Deferred | GÇö | Only if parent-facing field wrong |

| **SC-131** | Media | Generate Media Kits as platform feature | P3 | Deferred | SC-094, SC-054 | Config tables + generator + UI later |

| **SC-132** | Media | Facebook kits | P3 | Deferred | SC-131 | Not started |

| **SC-143** | Platform | Educational Athletics multi-challenge platform (Dribble, etc.) | P3 | Deferred | GÇö | Separate repos/bases recommended |



---



## G. Current work list snapshot (2026-08-27)



Unified status vocabulary for this snapshot: **COMPLETE** · **IN PROGRESS** · **BLOCKED** · **READY** · **DEFERRED**.



Sorted by priority (P0?P3), then ID. Historical Sections A?F above remain for narrative evidence; this table is the operator queue.



**Regenerate full queue table:** `node tools/docs/generate-work-list-section-g.mjs` ? `docs/_generated-work-list-section-g.md`



### Summary



| Metric | Count |

|---|---|

| Total items | 173 |

| COMPLETE | 46 |

| IN PROGRESS | 68 |

| BLOCKED | 1 |

| READY | 46 |

| DEFERRED | 12 |

| Production actions remaining | 18 |

| Items requiring Mike | 16 |

| Items requiring Cursor | 13 |

| Items requiring OMNI/Airtable | 6 |



### 2026-08-27 SC-034 / Perfect Week closeout



| Item | Status | Evidence |

|---|---|---|

| **V2-002** | COMPLETE | SC-034 repo pass 2026-08-27; `audits/2026-08-27-SC-034-config-hardcode-audit.md`; 57 scripts; `lib/config-selection/` |

| **SC-034** | COMPLETE | V2-002 repo + prod pass 2026-08-27; hardcode audit JSON; contract tests pass; 057 v2.2 live |

| **SC-034-PW-MIN** | COMPLETE | `lib/config-selection/perfect-week-video-minimum.js`; Config **Perfect Week Video Minimum** = 3 |

| **SC-034-WAS** | COMPLETE | WAS lookup + formula live PROD 2026-08-27; `airtable/formulas/README.md` |

| **SC-034-057** | **COMPLETE** | Live script CONFIG `Perfect Week Video Minimum` (MCP get_automation 2026-08-30); optional Automations Code tracker refresh only ? do not repaste |

| **SC-034-059-TRIG** | COMPLETE | Mike 2026-08-27; Pending-only created trigger; `deploy-checklists/059-perfect-week-trigger-coverage.md` |

| **SC-034-058-059** | COMPLETE | Not required ? `docs/testing/perfect-week/PERFECT-WEEK-DEPENDENCY-AUDIT.md` |

| **SC-PW-E2E** | **COMPLETE** | MCP award for WAS `recl3DmBh22ADPWWe`: unlock `recJ5umer4J4FHTOz` Awarded + XP `reczehlzkA8fjiQh0` 100 pts. Evidence `docs/testing/evidence/sc-pw-e2e/award-was-recl3DmBh22ADPWWe-2026-08-29-mcp.json`. Do not re-`--apply`. |

| **SC-144** | DEFERRED | General schema typo renames ? SAFE-MIGRATION-PLAN P3 |

| **Field typo rename (general schema)** | DEFERRED | **Perfect Week Video Minimum** typo fixed 2026-08-27; gate summary / Softr flag / HC RID typos deferred |



### 2026-08-28 launch-readiness backend pass



| Item | Status | Evidence |

|---|---|---|

| **Weekly email audit** | Harness shipped (2026-08-30) | `audits/2026-08-28-weekly-email-pipeline-audit.md` + [`testing/weekly-email/MRW-F07-POSITIVE-ARM-HARNESS.md`](testing/weekly-email/MRW-F07-POSITIVE-ARM-HARNESS.md) ? live `--apply` Mike disposable WAS |

| **SC-PW-E2E preflight** | COMPLETE (repo) | `preflightApplyAccess`; unlock field resolver (`Source Key` / `Milestone Source Key`) |

| **SC-147** (Zoom half-XP) | **COMPLETE / Live Tested in PROD** | **101 v6.8** Production Live + GitHub sync; recording `ZOOM_RECORDING_CREDIT|*` @ 30; live @ 60; idempotent; **no 121** ? [`audits/SC-147-101-V68-PRODUCTION-CLOSEOUT-20260904.md`](./audits/SC-147-101-V68-PRODUCTION-CLOSEOUT-20260904.md) |

| **071 v4.3** | **COMPLETE** (2026-09-01) | Homework Feedback Hub handoff ? FUT-046; Mike Production paste |

| **076 v8.12** | **COMPLETE** (2026-09-01) | Daily Submission Hub handoff ? FUT-041 XP columns; Mike Production paste |

| **FUT-001 / PR #264** | **COMPLETE** (repo + Production paste + multi-asset XP) | 020 v3.8 + 065 v10.4 Live; multi-asset 020 **PASS**; 065 dynamic `recordId` remapped; **trigger re-entry after remap** required; exactly one `HOMEWORK_XP\|rec8E94Jg7mpmuMW9` (`recwpzl8pkXecUqRK`, no duplicate) ? PR **#312** MERGED `f8a7365f` ? [`testing/evidence/sc-multi-asset-homework/closeout-2026-08-31-065-xp.json`](./testing/evidence/sc-multi-asset-homework/closeout-2026-08-31-065-xp.json) · [`deploy-checklists/065-recordId-dynamic-remap-operator-packet.md`](./deploy-checklists/065-recordId-dynamic-remap-operator-packet.md) |

| **SC-015 / SC-016 / MRW-F02** | **COMPLETE** (2026-08-31) | Multi-asset ? one HC + one Homework XP; 065 remap + re-entry **COMPLETE**; **do not** re-paste 020/065; **do not** re-`--apply` |

| **FUT-002 batch 1** | **COMPLETE** (2026-08-31) | Five `ZZZ DELETE ?` fields UI-deleted; then **1350** fields / **0** ZZZ; [`testing/evidence/fut-002/batch1-live-verify.json`](./testing/evidence/fut-002/batch1-live-verify.json) · schema `airtable/schema/snapshots/prod-20260831-fut002-batch1/` |

| **FUT-002 SA XP text stubs** | **COMPLETE** (2026-08-31) | Submission Assets unused text `XP Events` + `XP Events copy` UI-deleted; live **1363** fields / **35** tables ? [`deploy-checklists/FUT-002-sa-xp-text-stubs-delete.md`](./deploy-checklists/FUT-002-sa-xp-text-stubs-delete.md) · [`testing/evidence/fut-002/sa-xp-text-stubs-deleted-2026-08-31.json`](./testing/evidence/fut-002/sa-xp-text-stubs-deleted-2026-08-31.json) |

| **FUT-002 batch 2 audit** | **AUDIT READY** (2026-09-01) | **303** candidates / **5** quarantine-ready text stubs ? delete pending Mike UI ? [`FUT-002-batch2-candidate-queue.md`](./audits/FUT-002-batch2-candidate-queue.md) · [`FUT-002-batch2-quarantined-field-delete.md`](./deploy-checklists/FUT-002-batch2-quarantined-field-delete.md) |

| **FUT-029 / MRW-H12** | **FUTURE** (design only) | Hybrid Fillout Homework ? [`next-wave/homework-pipeline/FUT-029-HYBRID-FILLOUT-HOMEWORK-BRIEF.md`](./next-wave/homework-pipeline/FUT-029-HYBRID-FILLOUT-HOMEWORK-BRIEF.md); requested as FUT-018 (ID already used) |

| **FUT-030** | **COMPLETE** (2026-08-31) | Full transactional record reset ? **959** deleted; Weeks/Config/Library/rules/automations preserved; **18 PHA restored** same day (new RIDs); **075** absent; no external sends ? [`testing/evidence/transactional-reset-2026-08-31/`](./testing/evidence/transactional-reset-2026-08-31/) |

| **FUT-031** | **COMPLETE** (2026-09-01) | Game Log Extra Credit tagline ? PR **#319** `de21fa36`; prod verified on athlete profile Game Log |

| **Game Log category filters** | **Built in Repository** (2026-09-03) | PR **#366** `b7f80534` ? nine category chips/filters; public-safe vs authorized private |

| **FUT-032** | **COMPLETE** (2026-08-31) | Homework Hub ? Resend source writeback ? Hub PR [#42](https://github.com/Schmidt127/communications/pull/42) MERGED; Sent? + Sent On verified live after homework feedback ? [`deploy-checklists/FUT-032-homework-hub-resend-writeback.md`](./deploy-checklists/FUT-032-homework-hub-resend-writeback.md) |

| **065 v10.5** | **COMPLETE** (2026-08-31) | Points-reconcile fix pasted Live; Awarded + 071/Hub path verified ? [`deploy-checklists/065-v10.5-points-reconcile-operator-packet.md`](./deploy-checklists/065-v10.5-points-reconcile-operator-packet.md) |

| **065 v10.6 / 020 v3.9 / 057 v2.4 late-credit** | **COMPLETE** (GitHub + Production PASTE-ALIGNED + disposable live proof 2026-09-04) | PR **#372** da009262. Live Automations Code **020 v3.9 / 065 v10.6 / 057 2.4**. Proof: [`audits/FUT-001-LATE-CREDIT-LIVE-PROOF-20260904.md`](./audits/FUT-001-LATE-CREDIT-LIVE-PROOF-20260904.md). |



### 2026-08-31 approved brainstorming intake (documentation only)



| Item | Status | Notes |

|---|---|---|

| **FUT-033** | **COMPLETE** (2026-09-01) | Landing FUT-033?036 ? Youth Programs vs Coach Tools copy |

| **FUT-034** | **COMPLETE** (2026-09-01) | **Jr. Referee Clinic** naming on landing |

| **FUT-035** | **COMPLETE** (2026-09-01) | Navy ? brand blue on landing |

| **FUT-036** | **COMPLETE** (2026-09-01) | Six Upcoming Programs cards; Youth + Coach Tools groups |

| **FUT-037** | **COMPLETE** (2026-09-01) | Program images live at `/images/programs/*.jpg` |

| **FUT-038** | **Brief Needed** | Global category on/off ? do not implement |

| **FUT-039** | **COMPLETE** (2026-09-01) | Fillout CSS styling ? Mike attested |

| **FUT-040** | **Brief Needed** | Automatic S3 migration ? do not implement |

| **FUT-041** | **COMPLETE** (2026-09-01) | **076 v8.12** Production + Hub XP Earned \| Extra Credit |

| **FUT-042** | **COMPLETE** (2026-09-01) | Coach Feedback quotation ? web + Hub |

| **FUT-043** | READY | Consistent card design system (optional) |

| **FUT-044** | **COMPLETE** (website) | View Submitted Homework CTA |

| **FUT-045** | **COMPLETE** | Public **Assignment Title** |

| **FUT-046** | **COMPLETE** (2026-09-01) | **071 v4.3** Production + Hub subject |

| **FUT-047** | **COMPLETE** (2026-09-01) | Monitored contact in Hub homework email |

| **FUT-029** | **Brief Needed** (design only) | Hybrid Fillout Homework ? do not implement |



### 2026-08-29 legacy welcome-email field retirement



| Item | Status | Evidence |

|---|---|---|

| **FUT-WELCOME-LEGACY** repo cleanup | **COMPLETE** | PR **#274** merged `1b15d37f`; 075 LEGACY/RETIRED; probes/indexes/contracts; Vercel Production deploy OK |

| **FUT-WELCOME-LEGACY** Airtable field delete | **COMPLETE** | All six Enrollment fields deleted (final MCP verify 2026-08-29 incl. Parent Email HTML). Packet: [`deploy-checklists/RETIRE-LEGACY-WELCOME-EMAIL-FIELDS.md`](./deploy-checklists/RETIRE-LEGACY-WELCOME-EMAIL-FIELDS.md) |

| Live welcome path | Unchanged | **078A ? Email Handoff Queue ? 079 ? Hub ? Resend**; 075 absent; **101** untouched; **066** still triggers on `Run Shot Milestone Check?` |



### Uncommitted WIP (separate ? not complete)



| ID | Title | Status | Evidence |

|---|---|---|---|

| **WIP-XP-ACT** | Athlete XP Activity ledger (web + API) | **RESOLVED ? abandoned** | PR #240 abandoned; FUT-012 COMPLETE on master |

| **WIP-HW-CONTRACTS** | Homework assignment-identity (FUT-001) | **COMPLETE** | Merged + Production 020/065 Live |

| **WIP-057-TESTS** | 057 runtime + hardcode + live-schema field assert | **COMPLETE** | `test_057_runtime.mjs` + `057-perfect-week-video-minimum` + `057-live-schema-field-assert` in Agent 4 suite |



### 2026-08-29 future testing (not active)



| Item | Status | Evidence |

|---|---|---|

| **SC-ATHLETE-WF-001** | **COMPLETE (harness)** | Individual athlete workflow QA (pre?season-sim). Plan `docs/testing/athlete-workflow/SC-ATHLETE-WF.md`; harness `tools/testing/sc-athlete-wf.mjs`; evidence `docs/testing/evidence/sc-athlete-wf/apply-session-final-2026-08-30.json`. MRW-F09. **MRW-I13 CLOSED** (once per Count It). |

| **SC-CORE-WF / MRW-F11** | **COMPLETE** | Core workflow reliability ? `lib/workflow-contracts/`, `tools/testing/sc-core-workflow.mjs`, `docs/testing/core-workflow/`. Live Weeks/PHA audit + disposable apply 2026-08-30. |

| **SC-WEEKLY-SETTLEMENT-E2E** | **COMPLETE** | Weekly settlement matrix (WAS / calc / PW fail-closed / handoff prep). Docs `docs/testing/weekly-settlement/`; harness `tools/testing/sc-weekly-settlement.mjs`; RESULTS + DEFECT-REPORT 2026-08-30. MRW-F10. |

| **SC-SEASON-SIM-001** | **Planned / Future** | 60-day five-enrollment season simulation ? narrative entry above § D / FUT-026; MRW-H11. Do **not** implement yet. FUT-010 unchanged. Reuse SC-PW-E2E later where appropriate. |

| **SC-SEASON-SIM-002** | **COMPLETE ? T213135Z** | Final execute + formula restore + cleanup 2026-09-02. Evidence `tools/season_simulation/reports/evidence-final-SEASON-SIM-2027-20260902T213135Z-athlete1.json`. Distinct from SC-SEASON-SIM-001. |



### 2026-09-03 Automation 003 verification (SC-023)



| Item | Status | Evidence |

|---|---|---|

| **Automation 003 v2.0** | **COMPLETE / PRODUCTION-VERIFIED / DO-NOT-TOUCH** ? keep active | Disposable VERIFY Enrollment grade-change refresh; dynamic `recordId`; refresh view conditions attested. Docs: [`prod-completion/2026-09-03/AUTOMATION-003-GRADE-CHANGE-VERIFIED.md`](./prod-completion/2026-09-03/AUTOMATION-003-GRADE-CHANGE-VERIFIED.md). Offline: `tests/enrollment-intake/automation-003-grade-change-refresh.test.js`. Initial assign remains **002**. Automations Code Live **v2.0** (2026-09-03). |



### 2026-09-03 SC-112 / final work wave merges



| Item | Status | Evidence |

|---|---|---|

| **SC-112 magic-link + private dashboard** | **COMPLETE ? PRODUCTION VERIFIED BY MIKE** | PRs **#350?#357**. Magic-link operational with Production auth **on**. |

| **SC-112 multi-child parent auth** | **COMPLETE ? PRODUCTION VERIFIED BY MIKE** (2026-09-04) · **no further action** | PR **#373** multi-child keys · select-404 fix PR **#388** merge **`78208ffc`** (fix `e3bb7e45`) · Production deploy **`dpl_8TLH6uQAvLXUoQGDrGQ4NrFnWcVG`**. Mike verified: three athletes presented; each selectable; correct dashboards; family switcher; sign-out; no Page Not Found; no `/shoot/shoot/`; no `rec?` in URLs. Evidence: [`audits/SC-112-multi-child-select-404-fix-20260904.md`](./audits/SC-112-multi-child-select-404-fix-20260904.md). |

| **Homework late-credit policy (020/065/057)** | **COMPLETE** (GitHub + Production PASTE-ALIGNED + disposable live proof 2026-09-04) | PR **#372** merged `da009262`. Live **020 v3.9 / 065 v10.6 / 057 2.4**. Checklist: [`deploy-checklists/homework-late-credit-policy-020-057-065.md`](./deploy-checklists/homework-late-credit-policy-020-057-065.md). Proof: [`audits/FUT-001-LATE-CREDIT-LIVE-PROOF-20260904.md`](./audits/FUT-001-LATE-CREDIT-LIVE-PROOF-20260904.md). |

| **Automation 067** | **COMPLETE (Live v3.5) / DO-NOT-TOUCH** | Automations Code 2026-09-03 SCRIPT **v3.5** Live. Do not edit this closeout wave. |

| **Game Log category filters** | **Built in Repository** | PR **#366** merged `b7f80534`. Nine public-safe category slugs (shooting, homework, video, zoom, streak, weekly threshold, shot milestone, perfect week, manual award). |

| **Public awards publication gate** | **MERGED** PR **#378** (a0e84533); **#376** closed superseded | Live checkbox **Public On Web** wired as sole public gate. Fail-closed blank/false. Vercel Production follows merge. |

| **ZOOM_RECORDING_APPROVED email restyle** | **Built in Communications repo** ? no send in this wave | [communications#49](https://github.com/Schmidt127/communications/pull/49) merged. Duplicate **#50** **CLOSED** (not merged). |

| **Season Sim helper hygiene** | **Archive executed (Agent 4 coord)** ? Remove/Archive classes moved under `_archive/session-20260903/`; Required class preserved | Classification: [`audits/SC-112-untracked-hygiene-classification-20260903.md`](./audits/SC-112-untracked-hygiene-classification-20260903.md). Proposal PR **#368**. No Season Sim package edits. |

| **Season Simulation next execute** | **NOT currently authorized** | Temporary Season Simulation formulas are **not** active ? live formulas are normal **`NOW()` / `TODAY()`**. **DO NOT change formulas.** No Airtable record changes/deletes. No emails sent. |

| **SC-112 docs closeout (Agent 4)** | **Updated 2026-09-04** ? Mike Production verify complete; tip includes **`78208ffc`** | [`audits/SC-112-multi-child-select-404-fix-20260904.md`](./audits/SC-112-multi-child-select-404-fix-20260904.md) · [`audits/SC-112-finalization-closeout-20260903.md`](./audits/SC-112-finalization-closeout-20260903.md) · hygiene archive `tools/season_simulation/_archive/session-20260903/` |

| **SC-109 Game Manual** | **COMPLETE / Live Tested in PROD** (2026-09-04) | Production `/shoot/game-manual` shows **Open game manual** ? Adobe Publish Online; XP + level ladder live. Evidence [`testing/evidence/SC-109-PROD-ATTESTATION-2026-09-04.json`](./testing/evidence/SC-109-PROD-ATTESTATION-2026-09-04.json). Optional later: Shot Milestones public config; SC-133 parent comms. |

| **SC-151 Family Dashboard Gmail access** | **MERGED/DEPLOYED** | PR **#389** merge `a00ef7a5`; Production `dpl_2mch4scL3c6bgHZgizDbsqPTywbW`. Smoke: registration-email instruction; Gmail prohibition gone. **SC-112 remains closed.** [`audits/SC-151-family-dashboard-gmail-access-20260904.md`](./audits/SC-151-family-dashboard-gmail-access-20260904.md) |

| **SC-149 Fairfield branding + Family Dashboard nav** | **COMPLETE / Live Tested in PROD** (2026-09-04) | Dual deliverables under one ID. Branding: Vercel Production env MATCH + attestation [`testing/evidence/SC-149-FAIRFIELD-ATTESTATION-2026-09-04.json`](./testing/evidence/SC-149-FAIRFIELD-ATTESTATION-2026-09-04.json). Nav: PR **#358** `29904b45` live. Ledger [`audits/SC-149-TRUTH-LEDGER-20260904.md`](./audits/SC-149-TRUTH-LEDGER-20260904.md) · verify [`audits/SC-149-INDEPENDENT-VERIFY-20260904.md`](./audits/SC-149-INDEPENDENT-VERIFY-20260904.md). **No Mike follow-up.** |

| **SC-158 / SF-07 Video Count ownership** | **COMPLETE / Live Tested** (2026-09-04) | **RETIRE 006** (absent live). Presence = `Has Video?`; PW = **057**. Evidence [`audits/SF-07-VIDEO-COUNT-CLOSEOUT-20260904.md`](./audits/SF-07-VIDEO-COUNT-CLOSEOUT-20260904.md). |

| **SC-159 / SF-08 Automation 059 lifecycle** | **COMPLETE / Live Tested** (2026-09-04) | Formula trigger + v3.8 live. Evidence [`audits/SC-159-LIVE-VERIFICATION-CLOSEOUT-20260904.md`](./audits/SC-159-LIVE-VERIFICATION-CLOSEOUT-20260904.md). FUT-002 Batch 2 trash still needs asset-intake dependency review. |
| **SC-160 / asset intake + HW timing** | **IN PROGRESS � GitHub ready; Mike paste** (2026-09-04) | **009 v1.3** then Ready formulas; then **020/065/057**. See SC-160 row above. FUT-002 trash still gated. |



---

