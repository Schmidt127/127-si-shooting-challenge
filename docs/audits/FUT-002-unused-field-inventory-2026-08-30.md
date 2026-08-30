# FUT-002 — Unused Airtable field inventory (audit)

**Date:** 2026-08-30  
**Backlog:** FUT-002 / MRW-H01  
**Base:** Production `appn84sqPw03zEbTT`  
**Status:** Audit complete + **cleanup in progress** — see [`FUT-002-cleanup-session-2026-08-30.md`](./FUT-002-cleanup-session-2026-08-30.md) and [`field-inventory/`](./field-inventory/)  

## Hard stop

Original audit was read-only prep. **Cleanup phase (same day)** quarantined obsolete fields and retargeted Asset Key. Physical field DELETE still requires Mike UI (Meta API DELETE → 404).

## Executive summary

| Metric | Count |
|--------|------:|
| Tables scanned | 32 |
| Fields scanned | 1347 |
| **Active** (repo and/or live schema dependency) | 1043 |
| **Legacy** (obsolete storage / Drive retirement) | 15 |
| **Duplicate** (superseded by canonical field) | 8 |
| **Unknown** (no active repo ref — needs Mike/interface review) | 281 |
| Safe to delete later (no schema blockers) | 18 |
| Blocked / do-not-delete | 22 |

Prior focused audit: [`google-drive-field-removal-prep-2026-08-17.md`](./google-drive-field-removal-prep-2026-08-17.md). This inventory confirms those findings against the **prod-20260819** snapshot and full repo grep.

## Methodology

1. **Schema snapshot (authoritative field list):**
   `airtable/schema/snapshots/prod-20260819/schema_doc_appn84sqPw03zEbTT_20260819_184903.md` — 32 tables, 1347 fields, formula dependency graph from the `## Dependencies` section.
2. **Automation scan:** `airtable/automations/shooting-challenge/*.js` — string matches excluding comment-only lines (e.g. "Do not read Google Drive…").
3. **Web contract scan:** `web/lib/airtable/`, `web/lib/data/` — public `/shoot` query field lists.
4. **Tools / tests:** `tools/airtable/`, `tools/testing/`, `lib/intake-attachment-cleanup/`.
5. **Historical evidence (non-active):** extension audits/backfills, `make/` blueprints, `docs/` — recorded but not treated as production dependencies.
6. **Classification rules:**
   - **active** — referenced in automations (code), web, tools, lambda, or depended-on by other schema fields.
   - **legacy** — Google Drive storage fields (except `Video URL or Drive Link`) and Config Drive root fields.
   - **duplicate** — superseded pair (e.g. `Canonical File URL` > `Google Drive File URL`).
   - **unknown** — no active repo reference; may still be used in Airtable interfaces/views (OMNI review).

**Tooling:** `tools/airtable/fut_002_field_inventory.py` (offline, re-runnable).  
**Machine-readable output:** [`fut-002-unused-field-inventory.json`](./fut-002-unused-field-inventory.json).

## Google Drive and URL/ID/folder fields

| Table | Field | Class | Blocker / notes |
|-------|-------|-------|-----------------|
| Submission Assets | Create Google Drive File Name | duplicate | Superseded by Formatted Upload Name: C-013 rename target; Create Google Drive File Name is legacy label |
| Homework Completions | Google Drive Download URL | legacy | legacy storage field; stale code/doc mention in: tools |
| Video Feedback | Google Drive Download URL | legacy | legacy storage field; stale code/doc mention in: tools |
| Submission Assets | Google Drive File ID | duplicate | depended on by: Asset Key |
| Homework Completions | Google Drive File ID | duplicate | depended on by: Submission Asset: Google Drive File ID (lookup), Submitted Asset File IDs |
| Video Feedback | Google Drive File ID | duplicate | Superseded by Storage Key: Storage Key is upload dedupe/writeback identity; Drive File ID is legacy |
| Submission Assets | Google Drive File URL | duplicate | Superseded by Canonical File URL: S3/Lambda canonical URL supersedes Drive File URL on Submission Assets |
| Homework Completions | Google Drive File URL | duplicate | depended on by: Google Drive View URL, Submission Asset: Google Drive File URL (lookup), Submitted Asset File Links |
| Submission Assets | Google Drive Folder ID | legacy | legacy storage field; stale code/doc mention in: tools |
| Homework Completions | Google Drive Folder ID | legacy | legacy storage field; stale code/doc mention in: tools |
| Video Feedback | Google Drive Folder ID | legacy | legacy storage field; stale code/doc mention in: tools |
| Submission Assets | Google Drive Folder Name | legacy | — |
| Submission Assets | Google Drive Folder URL | legacy | legacy storage field; stale code/doc mention in: tools |
| Homework Completions | Google Drive Folder URL | legacy | legacy storage field; stale code/doc mention in: tools |
| Video Feedback | Google Drive Folder URL | legacy | legacy storage field; stale code/doc mention in: tools |
| Homework Completions | Google Drive View URL | duplicate | Superseded by Reviewer File URL: Parent homework email uses Reviewer File URL (071 v4.1); Drive View is legacy lookup |
| Video Feedback | Google Drive View URL | duplicate | Superseded by Reviewer File URL: Parent homework email uses Reviewer File URL (071 v4.1); Drive View is legacy lookup |
| Config | Root Google Drive Folder ID | legacy | — |
| Config | Root Google Drive Folder Link | legacy | — |
| Homework Completions | Submission Asset: Google Drive File ID (lookup) | legacy | — |
| Homework Completions | Submission Asset: Google Drive File URL (lookup) | legacy | depended on by: Submission Asset Review Summary (formula) |

### Keep (name contains "Drive" but still live)

| Field | Table | Why |
|-------|-------|-----|
| **Video URL or Drive Link** | Video Feedback | Parent-facing video URL; written by **022** from Reviewer → Canonical. Not a Google Drive API field. |

## Safe to delete later (Mike, after formula retarget)

Delete only after Mike confirms no interface/view dependency and completes formula retargets in [`google-drive-field-removal-prep-2026-08-17.md`](./google-drive-field-removal-prep-2026-08-17.md).

| Table | Field | Field ID | Class |
|-------|-------|----------|-------|
| Config | Root Google Drive Folder ID | `fldvG7kDIreffetRt` | legacy |
| Config | Root Google Drive Folder Link | `fldwRqavjwXbCHzar` | legacy |
| Homework Completions | Google Drive Download URL | `fldH3XEkc4WQrn5Dp` | legacy |
| Homework Completions | Google Drive Folder ID | `fldR0yfOU8pCaDMBO` | legacy |
| Homework Completions | Google Drive Folder URL | `fldvkVGoJVGTj3AEw` | legacy |
| Homework Completions | Google Drive View URL | `fld8Lb7HmxR5MKcIc` | duplicate |
| Homework Completions | Submission Asset: Google Drive File ID (lookup) | `fldKw0Gj4Hf8qhnGR` | legacy |
| Homework Completions | Submitted Asset File IDs | `fldgGoh56Ck4fTQIE` | legacy |
| Submission Assets | Create Google Drive File Name | `fldV5480sMm40q0QX` | duplicate |
| Submission Assets | Google Drive File URL | `fldITNuxNt9xphk7j` | duplicate |
| Submission Assets | Google Drive Folder ID | `fldqd2ALDtGS6gMqs` | legacy |
| Submission Assets | Google Drive Folder Name | `fldv4Mhw3w84dXdxx` | legacy |
| Submission Assets | Google Drive Folder URL | `fldxx1m0zTsMfEHfj` | legacy |
| Video Feedback | Google Drive Download URL | `fldBj4pvJj2nZQs0c` | legacy |
| Video Feedback | Google Drive File ID | `fldLRbcq68yn7aTp1` | duplicate |
| Video Feedback | Google Drive Folder ID | `fldJDWXsPcQaH2pA2` | legacy |
| Video Feedback | Google Drive Folder URL | `fldnDfkcdMyZ0ychG` | legacy |
| Video Feedback | Google Drive View URL | `fldw6PfS3oJ9ztRU0` | duplicate |

## Do not delete (protected or blocked by schema)

| Table | Field | Reason |
|-------|-------|--------|
| Homework Completions | Airtable Attachment | protected infrastructure |
| Homework Completions | Asset Key | protected infrastructure |
| Homework Completions | Google Drive File ID | depended on by: Submission Asset: Google Drive File ID (lookup), Submitted Asset File IDs |
| Homework Completions | Google Drive File URL | depended on by: Google Drive View URL, Submission Asset: Google Drive File URL (lookup), Submitted Asset File Links |
| Homework Completions | Submission Asset: Google Drive File URL (lookup) | depended on by: Submission Asset Review Summary (formula) |
| Homework Completions | Submitted Asset File Links | depended on by: Submitted File Review Summary |
| Homework Completions | Upload Status | protected infrastructure |
| Homework Completions | Writeback Complete? | protected infrastructure |
| Submission Assets | Airtable Attachment | protected infrastructure |
| Submission Assets | Asset Key | protected infrastructure |
| Submission Assets | Canonical File URL | protected infrastructure |
| Submission Assets | Google Drive File ID | depended on by: Asset Key |
| Submission Assets | Reviewer Access Token | protected infrastructure |
| Submission Assets | Reviewer File URL | protected infrastructure |
| Submission Assets | Send to Make Trigger | protected infrastructure |
| Submission Assets | Storage Key | protected infrastructure |
| Submission Assets | Upload Status | protected infrastructure |
| Submission Assets | Writeback Complete? | protected infrastructure |
| Video Feedback | Upload Status | protected infrastructure |
| Video Feedback | Video URL or Drive Link | protected infrastructure |
| Video Feedback | Writeback Complete? | protected infrastructure |
| XP Events | Source Key | protected infrastructure |

## Per-table summary

Active fields (majority) are omitted from detail rows below. See JSON for full evidence maps.

| Table | Fields | Active | Legacy | Duplicate | Unknown |
|-------|-------:|-------:|-------:|----------:|--------:|
| Achievements | 23 | 19 | 0 | 0 | 4 |
| Athlete Achievement Unlocks | 35 | 24 | 0 | 0 | 11 |
| Athletes | 11 | 10 | 0 | 0 | 1 |
| Automations | 15 | 14 | 0 | 0 | 1 |
| Award Recipients | 40 | 18 | 0 | 0 | 22 |
| Awards | 29 | 23 | 0 | 0 | 6 |
| Config | 38 | 24 | 2 | 0 | 12 |
| Email Handoff Queue | 18 | 17 | 0 | 0 | 1 |
| Enrollments | 140 | 124 | 0 | 0 | 16 |
| Final Reflection Quiz Submissions | 55 | 30 | 0 | 0 | 25 |
| Grade Bands | 17 | 16 | 0 | 0 | 1 |
| Homework Completions | 93 | 62 | 7 | 3 | 21 |
| Homework Library | 32 | 27 | 0 | 0 | 5 |
| Level Gate Rules | 16 | 14 | 0 | 0 | 2 |
| Levels | 20 | 17 | 0 | 0 | 3 |
| Program Homework Assignments | 23 | 20 | 0 | 0 | 3 |
| Program Instance - Sync | 37 | 33 | 0 | 0 | 4 |
| School - Synced | 31 | 9 | 0 | 0 | 22 |
| Shot Milestones | 17 | 16 | 0 | 0 | 1 |
| Streak Occurrences | 24 | 21 | 0 | 0 | 3 |
| Submission Assets | 99 | 78 | 3 | 3 | 15 |
| Submissions | 111 | 91 | 0 | 0 | 20 |
| Target Goal Shots | 9 | 8 | 0 | 0 | 1 |
| Testing Scenarios | 25 | 25 | 0 | 0 | 0 |
| Tutorials & Assets | 15 | 12 | 0 | 0 | 3 |
| Video Feedback | 50 | 34 | 3 | 2 | 11 |
| Weekly Athlete Summary | 100 | 82 | 0 | 0 | 18 |
| Weeks | 23 | 22 | 0 | 0 | 1 |
| XP Events | 55 | 46 | 0 | 0 | 9 |
| XP Reward Rules | 9 | 9 | 0 | 0 | 0 |
| Zoom Attendance | 45 | 35 | 0 | 0 | 10 |
| Zoom Meetings | 92 | 63 | 0 | 0 | 29 |

### Achievements — flagged fields

| Field | Class | Evidence (repo groups) | Notes |
|-------|-------|------------------------|-------|
| Trigger Operator | unknown | docs(2) | historical refs only: docs |
| Uses Grade Band Scaling? | unknown | docs(1) | historical refs only: docs |
| Internal Notes | unknown | docs(1) | historical refs only: docs |
| Threshold Value | unknown | docs(3) | historical refs only: docs |

### Athlete Achievement Unlocks — flagged fields

| Field | Class | Evidence (repo groups) | Notes |
|-------|-------|------------------------|-------|
| Achievement Unlock Display | unknown | docs(2) | historical refs only: docs |
| Display in Weekly Email? | unknown | docs(2) | historical refs only: docs |
| Display in Dashboard? | unknown | docs(2) | historical refs only: docs |
| First Time Unlock? | unknown | docs(2) | historical refs only: docs |
| Repeat Unlock Count | unknown | docs(2) | historical refs only: docs |
| Week Summary | unknown | docs(5) | historical refs only: docs |
| Trigger Context | unknown | docs(2) | historical refs only: docs |
| Included in Summary? | unknown | docs(2) | historical refs only: docs |
| XP Events copy | unknown | docs(7), make_legacy(3) | historical refs only: make_legacy, docs |
| Achievement Unlock Display - RID | unknown | docs(2) | historical refs only: docs |
| Unlock Source Date | unknown | docs(2) | historical refs only: docs |

### Athletes — flagged fields

| Field | Class | Evidence (repo groups) | Notes |
|-------|-------|------------------------|-------|
| Register Date | unknown | docs(3) | historical refs only: docs |

### Automations — flagged fields

| Field | Class | Evidence (repo groups) | Notes |
|-------|-------|------------------------|-------|
| Ran Through Cursor? | unknown | docs(6) | historical refs only: docs |

### Award Recipients — flagged fields

| Field | Class | Evidence (repo groups) | Notes |
|-------|-------|------------------------|-------|
| Delivery Method | unknown | docs(1) | historical refs only: docs |
| Award Status Sort | unknown | docs(1), make_legacy(2) | historical refs only: make_legacy, docs |
| Athlete First Name Lookup | unknown | docs(1) | historical refs only: docs |
| Award Description - Display | unknown | docs(1) | historical refs only: docs |
| Tremendous Environment | unknown | docs(2), make_legacy(4) | historical refs only: make_legacy, docs |
| Tremendous External ID | unknown | docs(1), make_legacy(4) | historical refs only: make_legacy, docs |
| Tremendous Reward ID | unknown | docs(1), make_legacy(4) | historical refs only: make_legacy, docs; dependedBy: Ready to Send? |
| Tremendous Order ID | unknown | docs(1), make_legacy(4) | historical refs only: make_legacy, docs; dependedBy: Ready to Send? |
| Tremendous Delivery Status | unknown | docs(2), make_legacy(3) | historical refs only: make_legacy, docs |
| Tremendous Sent At | unknown | docs(1), make_legacy(3) | historical refs only: make_legacy, docs |
| Tremendous Error Message | unknown | docs(1), make_legacy(3) | historical refs only: make_legacy, docs |
| Tremendous Delivered At | unknown | docs(1) | historical refs only: docs |
| Tremendous Response | unknown | docs(1), make_legacy(3) | historical refs only: make_legacy, docs |
| Tremendous Test Record? | unknown | docs(1), make_legacy(1) | historical refs only: make_legacy, docs |
| Send to Tremendous? | unknown | docs(3), make_legacy(4) | historical refs only: make_legacy, docs |
| Ready to Send? | unknown | docs(3) | historical refs only: docs |
| Last Modified | unknown | docs(5), make_legacy(3) | historical refs only: make_legacy, docs |
| Coach Feedback - Awards | unknown | docs(1), make_legacy(2) | historical refs only: make_legacy, docs |
| Award - Display | unknown | docs(1), make_legacy(2) | historical refs only: make_legacy, docs |
| Award Amount - Send | unknown | docs(1) | historical refs only: docs |
| Parent Email - Send | unknown | docs(1) | historical refs only: docs |
| Athlete Name - Send | unknown | docs(1) | historical refs only: docs |

### Awards — flagged fields

| Field | Class | Evidence (repo groups) | Notes |
|-------|-------|------------------------|-------|
| Default Email Description | unknown | docs(1) | historical refs only: docs |
| Default Winner Text | unknown | docs(1) | historical refs only: docs |
| Default No-Winner Text | unknown | docs(1) | historical refs only: docs |
| Award Description | unknown | docs(1) | historical refs only: docs |
| Internal Notes | unknown | docs(1) | historical refs only: docs |
| Requires Manual Fulfillment? | unknown | docs(1) | historical refs only: docs |

### Config — flagged fields

| Field | Class | Evidence (repo groups) | Notes |
|-------|-------|------------------------|-------|
| Root Google Drive Folder ID | legacy | docs(4) | — |
| Root Google Drive Folder Link | legacy | docs(3) | — |
| File Naming Pattern | unknown | docs(3) | historical refs only: docs |
| Detailed Stat Tracking Enabled? | unknown | docs(2) | historical refs only: docs |
| Require Detailed Stats? | unknown | docs(2) | historical refs only: docs |
| HW Review Enabled? | unknown | docs(3) | historical refs only: docs |
| Video Review Enabled? | unknown | docs(3) | historical refs only: docs |
| Shot XP Per Shot | unknown | docs(3) | historical refs only: docs |
| Submission XP Notes | unknown | docs(2) | historical refs only: docs |
| Recording Approval Email Enabled YN | unknown | docs(5) | historical refs only: docs |
| Recording Gives Full Zoom Gate Credit YN | unknown | docs(5) | historical refs only: docs |
| Recording Makeup Counts for Perfect Week YN | unknown | docs(5) | historical refs only: docs |
| Recording Makeup Enabled YN | unknown | docs(6) | historical refs only: docs |
| Recording Quiz Requires Coach Approval YN | unknown | docs(5) | historical refs only: docs |

### Email Handoff Queue — flagged fields

| Field | Class | Evidence (repo groups) | Notes |
|-------|-------|------------------------|-------|
| Send to Hub? | unknown | docs(1) | historical refs only: docs |

### Enrollments — flagged fields

| Field | Class | Evidence (repo groups) | Notes |
|-------|-------|------------------------|-------|
| Athlete Cell Number | unknown | docs(4) | historical refs only: docs |
| Athlete Folder Name | unknown | docs(3) | historical refs only: docs |
| Parent Cell Number | unknown | docs(4) | historical refs only: docs; dependedBy: Parent Cell Number - Cleaned |
| Athlete Match Key Lookup | unknown | docs(5) | historical refs only: docs |
| Mailing Address Submitted | unknown | docs(3) | historical refs only: docs |
| Physical Address Submitted | unknown | docs(2) | historical refs only: docs |
| Zip Code Submitted | unknown | docs(2) | historical refs only: docs |
| Registration Source | unknown | docs(4) | historical refs only: docs |
| Parent Full Name Submitted | unknown | docs(3) | historical refs only: docs |
| Price Paid to Stripe | unknown | docs(4) | historical refs only: docs |
| Current Level XP Ceiling | unknown | docs(5) | historical refs only: docs |
| Registratioin Referrer | unknown | docs(5) | historical refs only: docs |
| Gate-Test Eligible Level | unknown | docs(5) | historical refs only: docs |
| Homework XP Enrollment Signature | unknown | docs(1) | historical refs only: docs |
| Parent Cell Number - Cleaned | unknown | docs(1) | historical refs only: docs |
| Reconciliation Source Signature | unknown | docs(2) | historical refs only: docs |

### Final Reflection Quiz Submissions — flagged fields

| Field | Class | Evidence (repo groups) | Notes |
|-------|-------|------------------------|-------|
| Quiz Submission Name | unknown | docs(2) | historical refs only: docs |
| Record Id - Enrollment | unknown | docs(1) | historical refs only: docs |
| Coach/Admin Notes | unknown | docs(2) | historical refs only: docs |
| How did the athlete complete this reflection quiz? | unknown | docs(2) | historical refs only: docs; dependedBy: Family Discussion Bonus? |
| Q1 — Shot Tracker Usage: A player wants to improve, but sometimes they are tempted to only count makes or leave out bad shooting days. What is the best reason to track shots honestly? | unknown | docs(1) | historical refs only: docs; dependedBy: Q1 Correct? |
| Q2 — Website Exploration: Why should the athlete regularly use the challenge site to check their progress and work? | unknown | docs(1) | historical refs only: docs; dependedBy: Q2 Correct? |
| Q3 — The Choice is Yours: If an athlete is having an off day in practice, what is the best mindset to use? | unknown | docs(1) | historical refs only: docs; dependedBy: Q3 Correct? |
| Q4 — Shooting Form and Technique: Why should players learn to focus on their form and technique during practice, even when they feel rushed or pressured? | unknown | docs(1) | historical refs only: docs; dependedBy: Q4 Correct? |
| Q5 — Self Esteem and Accomplishment: What helps a player actually build self-esteem and confidence during the challenge? | unknown | docs(1) | historical refs only: docs; dependedBy: Q5 Correct? |
| Q6 — Layup Series Homework: Why does the Layup Homework matter for every participant, even if they already make a lot of layups? | unknown | docs(2) | historical refs only: docs; dependedBy: Q6 Correct? |
| Q7 — Touch and Talk: If a teammate looks discouraged or frustrated, what is usually the best response? | unknown | docs(1) | historical refs only: docs; dependedBy: Q7 Correct? |
| Q8 — 5 Spot Shooting Locations: Why do players practice shooting from all 5 main spots, and not just their favorite one? | unknown | docs(1) | historical refs only: docs; dependedBy: Q8 Correct? |
| Q9 — Mikan Drill: What is the best intention for doing the Mikan Drill during the challenge? | unknown | docs(1) | historical refs only: docs; dependedBy: Q9 Correct? |
| Q10 — Goal Setting — What GOATS Do!: How do the best athletes approach goal setting in a program like this? | unknown | docs(1) | historical refs only: docs; dependedBy: Q10 Correct? |
| Q11 — Thank You Note: What is the biggest lesson behind the Thank You Note activity in this program? | unknown | docs(1) | historical refs only: docs; dependedBy: Q11 Correct? |
| Q12 — Coach Yourself: When a player is struggling or frustrated, what is a strong approach to coaching themselves? | unknown | docs(1) | historical refs only: docs; dependedBy: Q12 Correct? |
| Q13 — Visualization: Why use visualization in the challenge or before a game or practice? | unknown | docs(1) | historical refs only: docs; dependedBy: Q13 Correct? |
| Q14 — Build Your Freethrow Routine: What is the purpose of building a repeatable free throw routine? | unknown | docs(1) | historical refs only: docs; dependedBy: Q14 Correct? |
| Q15 — Bad Habit I Need to Fix: What is the best way to approach a bad habit noticed during the challenge? | unknown | docs(1) | historical refs only: docs; dependedBy: Q15 Correct? |
| Q16 — Sportsmanship: What does true sportsmanship look like in the context of this challenge? | unknown | docs(1) | historical refs only: docs; dependedBy: Q16 Correct? |
| Q17 — Final Reflection Challenge: What is the purpose of the final reflection challenge for athletes? | unknown | docs(1) | historical refs only: docs; dependedBy: Q17 Correct? |
| Q18 — Shot Tracker Summary: What is the real value of completing the full Shot Tracker and reviewing its data at the end? | unknown | docs(1) | historical refs only: docs; dependedBy: Q18 Correct? |
| Correct Answer Distribution | unknown | docs(2) | historical refs only: docs |
| Quiz Version | unknown | docs(3) | historical refs only: docs |
| Homework Credit Rule | unknown | docs(3) | historical refs only: docs |

### Grade Bands — flagged fields

| Field | Class | Evidence (repo groups) | Notes |
|-------|-------|------------------------|-------|
| Default Homework Tier | unknown | docs(2) | historical refs only: docs |

### Homework Completions — flagged fields

| Field | Class | Evidence (repo groups) | Notes |
|-------|-------|------------------------|-------|
| Completion Summary | unknown | docs(8) | historical refs only: docs |
| Google Drive File ID | duplicate | docs(10), extension_audit(3), extension_backfill(14), make_legacy(4), tools(4) | Superseded by Storage Key: Storage Key is upload dedupe/writeback identity; Drive File ID is legacy; dependedBy: Submission Asset: Google Drive File ID (lookup), Submitted Asset File IDs |
| Google Drive File URL | duplicate | docs(21), extension_audit(6), extension_backfill(14), make_legacy(4), tools(5) | Superseded by Canonical File URL: S3/Lambda canonical URL supersedes Drive File URL on Submission Assets; dependedBy: Google Drive View URL, Submission Asset: Google Drive File URL (lookup), Submitted Asset File Links |
| Google Drive View URL | duplicate | docs(9), extension_audit(1), extension_backfill(1), make_legacy(3), tools(1) | Superseded by Reviewer File URL: Parent homework email uses Reviewer File URL (071 v4.1); Drive View is legacy lookup |
| Google Drive Download URL | legacy | docs(5), extension_audit(1), extension_backfill(1), make_legacy(3), tools(1) | legacy storage field; stale code/doc mention in: tools |
| Google Drive Folder ID | legacy | docs(8), extension_audit(1), extension_backfill(13), make_legacy(3), tools(2) | legacy storage field; stale code/doc mention in: tools |
| Google Drive Folder URL | legacy | docs(7), extension_audit(1), extension_backfill(13), make_legacy(3), tools(2) | legacy storage field; stale code/doc mention in: tools |
| Submission Asset - Linked | unknown | docs(3) | historical refs only: docs |
| Homework Completions RID | unknown | docs(9), extension_audit(1), make_legacy(3) | historical refs only: extension_audit, make_legacy, docs |
| Submission Asset: Google Drive File URL (lookup) | legacy | docs(4) | schema depended-by: Submission Asset Review Summary (formula); dependedBy: Submission Asset Review Summary (formula) |
| Submission Asset: Google Drive File ID (lookup) | legacy | docs(4) | — |
| Submission Asset: Upload Status (lookup) | unknown | docs(3) | historical refs only: docs |
| Submission Asset: Uploaded At (lookup) | unknown | docs(3) | historical refs only: docs |
| Submission Asset: Upload Error (lookup) | unknown | docs(3) | historical refs only: docs |
| Total Uploaded Submission Assets (rollup) | unknown | docs(5) | historical refs only: docs |
| Submission Asset Review Summary (formula) | unknown | docs(4) | historical refs only: docs |
| Submitted Asset File Links | legacy | docs(4) | schema depended-by: Submitted File Review Summary; dependedBy: Submitted File Review Summary |
| Submitted Asset Uploaded At | unknown | docs(3) | historical refs only: docs |
| Submitted Asset File IDs | legacy | docs(4) | — |
| Submitted File Review Summary | unknown | docs(5) | historical refs only: docs |
| Extra Credit? | unknown | docs(3) | historical refs only: docs; dependedBy: Completion Summary |
| Submission Asset Count | unknown | docs(5) | historical refs only: docs |
| Linked Asset Duplicate? | unknown | docs(4) | historical refs only: docs |
| Linked Asset Duplicate Status | unknown | docs(4) | historical refs only: docs |
| Linked Asset Duplicate Notes | unknown | docs(4) | historical refs only: docs |
| Linked Asset Duplicate Match Record | unknown | docs(4) | historical refs only: docs |
| Linked Asset Duplicate Match Strength | unknown | docs(4) | historical refs only: docs |
| Linked Asset Duplicate Review Status | unknown | docs(4) | historical refs only: docs |
| Final Reflection Quiz Submissions 2 | unknown | docs(3) | historical refs only: docs |
| Activity XP Display Label | unknown | docs(7) | historical refs only: docs |
| Submission Asset: Reviewer File URL (lookup) | unknown | docs(2) | historical refs only: docs |

### Homework Library — flagged fields

| Field | Class | Evidence (repo groups) | Notes |
|-------|-------|------------------------|-------|
| Lesson Key | unknown | docs(9) | historical refs only: docs |
| Submissions copy | unknown | docs(4) | historical refs only: docs |
| Extension Activities | unknown | docs(1) | historical refs only: docs |
| AI assist | unknown | docs(6) | historical refs only: docs |
| AI assist 2 | unknown | docs(1) | historical refs only: docs |

### Level Gate Rules — flagged fields

| Field | Class | Evidence (repo groups) | Notes |
|-------|-------|------------------------|-------|
| Level Rank (Lookup) | unknown | docs(1) | historical refs only: docs |
| Public Gate Rules - Active Only | unknown | docs(1) | historical refs only: docs |

### Levels — flagged fields

| Field | Class | Evidence (repo groups) | Notes |
|-------|-------|------------------------|-------|
| Enrollments 2 | unknown | docs(2) | historical refs only: docs |
| Enrollments 3 | unknown | docs(1) | historical refs only: docs |
| Unlock Message | unknown | docs(1) | historical refs only: docs |

### Program Homework Assignments — flagged fields

| Field | Class | Evidence (repo groups) | Notes |
|-------|-------|------------------------|-------|
| School Year - Linked (from Program Instance) | unknown | docs(1) | historical refs only: docs |
| Record Id - PHA | unknown | docs(1) | historical refs only: docs |
| Homework XP PHA Signature | unknown | docs(1) | historical refs only: docs |

### Program Instance - Sync — flagged fields

| Field | Class | Evidence (repo groups) | Notes |
|-------|-------|------------------------|-------|
| Event - Linked | unknown | docs(3) | historical refs only: docs |
| Calendar Integration | unknown | docs(3) | historical refs only: docs |
| Roster Group | unknown | docs(3) | historical refs only: docs |
| QR - Registration | unknown | docs(3) | historical refs only: docs |

### School - Synced — flagged fields

| Field | Class | Evidence (repo groups) | Notes |
|-------|-------|------------------------|-------|
| School Level | unknown | docs(1) | historical refs only: docs |
| Division | unknown | docs(1) | historical refs only: docs |
| District | unknown | docs(1) | historical refs only: docs |
| Colors | unknown | docs(2) | historical refs only: docs |
| Song | unknown | docs(1) | historical refs only: docs |
| Nickname | unknown | docs(1) | historical refs only: docs |
| Physical Address | unknown | docs(2) | historical refs only: docs |
| Mailing Address | unknown | docs(3) | historical refs only: docs |
| Mailing Block | unknown | docs(1) | historical refs only: docs |
| Mailing Address - Formatted | unknown | docs(1) | historical refs only: docs |
| Physical Address - Formatted | unknown | docs(1) | historical refs only: docs |
| School Phone | unknown | docs(1) | historical refs only: docs |
| People | unknown | docs(2) | historical refs only: docs |
| Role Appointments - AD | unknown | docs(1) | historical refs only: docs |
| Current Athletic Director | unknown | docs(1) | historical refs only: docs |
| Cell Number - Lookup | unknown | docs(1) | historical refs only: docs |
| Email - Lookup | unknown | docs(1) | historical refs only: docs |
| Name - Cleaned | unknown | docs(1) | historical refs only: docs |
| Facilities | unknown | docs(1) | historical refs only: docs |
| Team | unknown | docs(53) | historical refs only: docs |
| JH League | unknown | docs(1) | historical refs only: docs |
| OLD - DELETE OK | unknown | docs(1) | historical refs only: docs |

### Shot Milestones — flagged fields

| Field | Class | Evidence (repo groups) | Notes |
|-------|-------|------------------------|-------|
| XP Events copy | unknown | docs(7), make_legacy(3) | historical refs only: make_legacy, docs |

### Streak Occurrences — flagged fields

| Field | Class | Evidence (repo groups) | Notes |
|-------|-------|------------------------|-------|
| Streak Occurrence Name | unknown | docs(1) | historical refs only: docs |
| Challenge / Season | unknown | docs(1) | historical refs only: docs |
| Backfill Run Label | unknown | docs(1) | historical refs only: docs |

### Submission Assets — flagged fields

| Field | Class | Evidence (repo groups) | Notes |
|-------|-------|------------------------|-------|
| Google Drive File URL | duplicate | docs(21), extension_audit(6), extension_backfill(14), make_legacy(4), tools(5) | Superseded by Canonical File URL: S3/Lambda canonical URL supersedes Drive File URL on Submission Assets |
| Google Drive Folder ID | legacy | docs(8), extension_audit(1), extension_backfill(13), make_legacy(3), tools(2) | legacy storage field; stale code/doc mention in: tools |
| RecordId - Submission Table | unknown | docs(1), extension_audit(1), extension_backfill(1), make_legacy(3) | historical refs only: extension_audit, extension_backfill, make_legacy, docs |
| Record Id - Submission Assets | unknown | docs(1) | historical refs only: docs |
| Google Drive Folder Name | legacy | docs(4), make_legacy(3) | — |
| Create Google Drive File Name | duplicate | docs(9), make_legacy(3) | Superseded by Formatted Upload Name: C-013 rename target; Create Google Drive File Name is legacy label |
| Record Id (from Enrollment - Linked) | unknown | docs(1), make_legacy(3) | historical refs only: make_legacy, docs |
| Review Complete? | unknown | docs(2), make_legacy(3) | historical refs only: make_legacy, docs |
| DELETE POSSIBLY - Homework Completion Record ID | unknown | docs(2), make_legacy(3) | historical refs only: make_legacy, docs |
| Coach Feedback (from Video Feedback) | unknown | docs(3), make_legacy(3) | historical refs only: make_legacy, docs |
| XP Events copy | unknown | docs(7), make_legacy(3) | historical refs only: make_legacy, docs |
| Ready for Homework Completion Script? | unknown | docs(2), make_legacy(3) | historical refs only: make_legacy, docs |
| Coach Feedback - LKP | unknown | docs(1), make_legacy(3) | historical refs only: make_legacy, docs |
| Workflow Next Step | unknown | docs(3), make_legacy(3) | historical refs only: make_legacy, docs |
| Ready for Video Feedback Script? | unknown | docs(1), make_legacy(3) | historical refs only: make_legacy, docs |
| Google Drive Folder URL | legacy | docs(7), extension_audit(1), extension_backfill(13), make_legacy(3), tools(2) | legacy storage field; stale code/doc mention in: tools |
| Google Drive File ID | duplicate | docs(10), extension_audit(3), extension_backfill(14), make_legacy(4), tools(4) | Superseded by Storage Key: Storage Key is upload dedupe/writeback identity; Drive File ID is legacy; dependedBy: Asset Key |
| Is Homework Upload Asset? | unknown | docs(2), make_legacy(1) | historical refs only: make_legacy, docs |
| Asset Reuse Reviewed By | unknown | docs(2) | historical refs only: docs |
| Asset Sequence | unknown | docs(5) | historical refs only: docs |
| Asset Reuse Reviewed At | unknown | docs(2) | historical refs only: docs |

### Submissions — flagged fields

| Field | Class | Evidence (repo groups) | Notes |
|-------|-------|------------------------|-------|
| XP Award Ready? | unknown | docs(8) | historical refs only: docs |
| HW 1 - Parent Note | unknown | docs(4) | historical refs only: docs |
| HW 2 - Parent Note | unknown | docs(3) | historical refs only: docs |
| HW1 Coach Feedback | unknown | docs(3) | historical refs only: docs |
| HW2 Coach Feedback | unknown | docs(3) | historical refs only: docs |
| Has HW1? | unknown | docs(4), extension_audit(1), extension_backfill(1) | historical refs only: extension_audit, extension_backfill, docs |
| Has HW2? | unknown | docs(4), extension_audit(1), extension_backfill(1) | historical refs only: extension_audit, extension_backfill, docs |
| Submission Has Detailed Stats? | unknown | docs(4) | historical refs only: docs |
| Review Queue Sort | unknown | docs(3) | historical refs only: docs |
| Ready for Weekly Summary? | unknown | docs(4) | historical refs only: docs |
| XP Notes | unknown | docs(3) | historical refs only: docs |
| Ready to Send Attachments to Make? | unknown | docs(7) | historical refs only: docs |
| Week Lkp | unknown | docs(8) | historical refs only: docs |
| Ready for Homework Completion Automation? | unknown | docs(4) | historical refs only: docs |
| Submission Assets Ready? | unknown | docs(6) | historical refs only: docs |
| Edit Submission - Parent | unknown | docs(4) | historical refs only: docs |
| Counted Activity Date Key | unknown | docs(5) | historical refs only: docs |
| Coach Feedback (from Video Feedback) | unknown | docs(3), make_legacy(3) | historical refs only: make_legacy, docs |
| Ready for 009 Asset Creation? | unknown | docs(4), extension_backfill(1) | historical refs only: extension_backfill, docs |
| Why Not Ready for 009? | unknown | docs(4), extension_backfill(1) | historical refs only: extension_backfill, docs |

### Target Goal Shots — flagged fields

| Field | Class | Evidence (repo groups) | Notes |
|-------|-------|------------------------|-------|
| Band Sort Order | unknown | docs(4) | historical refs only: docs |

### Tutorials & Assets — flagged fields

| Field | Class | Evidence (repo groups) | Notes |
|-------|-------|------------------------|-------|
| ﻿Name | unknown | docs(4) | historical refs only: docs |
| Legacy Tutorials Record ID | unknown | docs(2), extension_backfill(4) | historical refs only: extension_backfill, docs |
| Migration Status | unknown | docs(2), extension_backfill(4) | historical refs only: extension_backfill, docs |

### Video Feedback — flagged fields

| Field | Class | Evidence (repo groups) | Notes |
|-------|-------|------------------------|-------|
| Activity XP Display Label | unknown | docs(7) | historical refs only: docs |
| Auto-link Eligible? | unknown | docs(2), make_legacy(3) | historical refs only: make_legacy, docs |
| Google Drive File ID | duplicate | docs(10), extension_audit(3), extension_backfill(14), make_legacy(4), tools(4) | Superseded by Storage Key: Storage Key is upload dedupe/writeback identity; Drive File ID is legacy |
| Google Drive View URL | duplicate | docs(9), extension_audit(1), extension_backfill(1), make_legacy(3), tools(1) | Superseded by Reviewer File URL: Parent homework email uses Reviewer File URL (071 v4.1); Drive View is legacy lookup |
| Google Drive Download URL | legacy | docs(5), extension_audit(1), extension_backfill(1), make_legacy(3), tools(1) | legacy storage field; stale code/doc mention in: tools |
| Google Drive Folder ID | legacy | docs(8), extension_audit(1), extension_backfill(13), make_legacy(3), tools(2) | legacy storage field; stale code/doc mention in: tools |
| Google Drive Folder URL | legacy | docs(7), extension_audit(1), extension_backfill(13), make_legacy(3), tools(2) | legacy storage field; stale code/doc mention in: tools |
| DELETE MAYBE - XP Events copy | unknown | docs(2), make_legacy(2) | historical refs only: make_legacy, docs |
| Activity Date - Lkp | unknown | docs(5), extension_audit(1), make_legacy(3) | historical refs only: extension_audit, make_legacy, docs |
| Linked Asset Duplicate? | unknown | docs(4) | historical refs only: docs |
| Linked Asset Duplicate Status | unknown | docs(4) | historical refs only: docs |
| Linked Asset Duplicate Notes | unknown | docs(4) | historical refs only: docs |
| Linked Asset Duplicate Match Record | unknown | docs(4) | historical refs only: docs |
| Linked Asset Duplicate Match Strength | unknown | docs(4) | historical refs only: docs |
| Linked Asset Duplicate Review Status | unknown | docs(4) | historical refs only: docs |
| Video File - AWS | unknown | docs(1) | historical refs only: docs |

### Weekly Athlete Summary — flagged fields

| Field | Class | Evidence (repo groups) | Notes |
|-------|-------|------------------------|-------|
| Met Minimum Days Requirement? | unknown | docs(3) | historical refs only: docs |
| Level Number | unknown | docs(11) | historical refs only: docs |
| Homework Display | unknown | docs(7) | historical refs only: docs |
| Weekly Summary Email Status | unknown | docs(13) | historical refs only: docs |
| Weekly Summary Send Error | unknown | docs(4) | historical refs only: docs |
| Weekly Summary Email Type | unknown | docs(4) | historical refs only: docs |
| Overall Awards Placeholder | unknown | docs(3) | historical refs only: docs |
| Zoom Meetings Summary | unknown | docs(5) | historical refs only: docs |
| Combined Recipient Emails | unknown | docs(5) | historical refs only: docs |
| Weekly Awards Placeholder | unknown | docs(3) | historical refs only: docs |
| Weekly Summary Overall Section | unknown | docs(3) | historical refs only: docs |
| Weekly Awards Display | unknown | docs(3) | historical refs only: docs |
| Overall Awards Display | unknown | docs(3) | historical refs only: docs |
| Upcoming Zoom Display | unknown | docs(3) | historical refs only: docs |
| Upcoming Zoom Link | unknown | docs(3) | historical refs only: docs |
| Grade Band - Display | unknown | docs(3) | historical refs only: docs |
| Weekly Email Record ID | unknown | docs(3) | historical refs only: docs |
| Program Instance (from Enrollment) | unknown | docs(1) | historical refs only: docs |

### Weeks — flagged fields

| Field | Class | Evidence (repo groups) | Notes |
|-------|-------|------------------------|-------|
| Reconciliation Source Signature | unknown | docs(2) | historical refs only: docs |

### XP Events — flagged fields

| Field | Class | Evidence (repo groups) | Notes |
|-------|-------|------------------------|-------|
| XP Event Display | unknown | docs(4) | historical refs only: docs |
| XP Events RID | unknown | docs(4) | historical refs only: docs |
| Duplicate Count | unknown | docs(2) | historical refs only: docs; dependedBy: Needs Dedupe Review |
| Keep Record? | unknown | docs(2) | historical refs only: docs |
| Approved for Delete | unknown | docs(2) | historical refs only: docs |
| Needs Dedupe Review | unknown | docs(2) | historical refs only: docs |
| XP Event RID | unknown | docs(7) | historical refs only: docs |
| Homework XP Event Signature | unknown | docs(1) | historical refs only: docs |
| Reconciliation Source Signature | unknown | docs(2) | historical refs only: docs |

### Zoom Attendance — flagged fields

| Field | Class | Evidence (repo groups) | Notes |
|-------|-------|------------------------|-------|
| Live Attendance Confirmed? | unknown | docs(5) | historical refs only: docs; dependedBy: Zoom Credit Pre-Approved?, Zoom Credit Debug |
| Preconflict Pair Tag | unknown | docs(9) | historical refs only: docs |
| Normal Live Zoom XP | unknown | docs(6) | historical refs only: docs; dependedBy: Zoom XP Amount |
| Recording Quiz Attempt Number | unknown | docs(4) | historical refs only: docs |
| Recording Quiz Coach Feedback | unknown | docs(4) | historical refs only: docs |
| Recording Quiz Response | unknown | docs(4) | historical refs only: docs |
| Global Config: Approval Email Enabled | unknown | docs(5) | historical refs only: docs |
| Global Config: Approval Email Template Key | unknown | docs(5) | historical refs only: docs |
| Global Config: Approval Email Timing | unknown | docs(5) | historical refs only: docs |
| Zoom Recording Quiz — Past Deadline (view marker) | unknown | docs(6) | historical refs only: docs |

### Zoom Meetings — flagged fields

| Field | Class | Evidence (repo groups) | Notes |
|-------|-------|------------------------|-------|
| Meeting Number | unknown | docs(1) | historical refs only: docs; dependedBy: Meeting Display Name |
| Host Email | unknown | docs(2) | historical refs only: docs |
| Meeting Agenda - Coach Version | unknown | docs(2) | historical refs only: docs |
| Meeting Agenda - Coach Version URL | unknown | docs(2) | historical refs only: docs |
| Participant Count | unknown | docs(2) | historical refs only: docs |
| Approval Email Enabled — Meeting Override | unknown | docs(3) | historical refs only: docs; dependedBy: Effective Recording Approval Email Enabled? |
| Approval Email Template Key — Meeting Override | unknown | docs(3) | historical refs only: docs; dependedBy: Effective Recording Approval Email Template Key |
| Approval Email Timing — Meeting Override | unknown | docs(3) | historical refs only: docs; dependedBy: Effective Recording Approval Email Timing |
| Coach Approval Required — Meeting Override | unknown | docs(3) | historical refs only: docs; dependedBy: Effective Recording Quiz Requires Coach Approval? |
| Deadline Mode — Meeting Override | unknown | docs(3) | historical refs only: docs; dependedBy: Effective Recording Deadline Mode |
| Full Gate Credit — Meeting Override | unknown | docs(3) | historical refs only: docs; dependedBy: Effective Recording Counts for Level Gate? |
| Makeup Enabled — Meeting Override | unknown | docs(3) | historical refs only: docs; dependedBy: Effective Recording Makeup Enabled? |
| Makeup Window Days — Meeting Override | unknown | docs(3) | historical refs only: docs; dependedBy: Effective Recording Makeup Window Days |
| Perfect Week Credit — Meeting Override | unknown | docs(3) | historical refs only: docs; dependedBy: Effective Recording Counts for Perfect Week? |
| Recording Quiz Attempt Number | unknown | docs(4) | historical refs only: docs |
| Recording Quiz Available? | unknown | docs(3) | historical refs only: docs |
| Recording Quiz Coach Feedback | unknown | docs(4) | historical refs only: docs |
| Recording Quiz Deadline | unknown | docs(9) | historical refs only: docs |
| Recording Quiz Response | unknown | docs(4) | historical refs only: docs |
| Recording URL | unknown | docs(4) | historical refs only: docs |
| Recording XP Percentage | unknown | docs(9) | historical refs only: docs |
| Recording XP Percentage — Meeting Override | unknown | docs(4) | historical refs only: docs; dependedBy: Effective Recording XP Percentage |
| Effective Recording Approval Email Timing | unknown | docs(8) | historical refs only: docs |
| Effective Recording Counts for Level Gate? | unknown | docs(7) | historical refs only: docs |
| Effective Recording Makeup Enabled? | unknown | docs(7) | historical refs only: docs |
| Effective Recording Quiz Requires Coach Approval? | unknown | docs(7) | historical refs only: docs |
| Effective Recording XP Percentage | unknown | docs(8) | historical refs only: docs |
| Calculated Recording Quiz Deadline | unknown | docs(9) | historical refs only: docs |
| Approved Preconflict Pair Tags | unknown | docs(9) | historical refs only: docs |

## Mike-only next steps (deletion phase — not executed here)

1. **OMNI / interface pass** — For each **unknown** field (356 total), confirm not used in active interfaces, forms, or operator views.
2. **Formula retarget (required before Drive purge)** —
   - Submission Assets **Asset Key**: replace `{Google Drive File ID}` with `RECORD_ID()` or `{Storage Key}`.
   - Homework Completions **Submission Asset Review Summary** / **Submitted File Review Summary**: retarget Drive lookups to **Reviewer File URL**.
3. **Paste verified automations** — Confirm Production **070a/070b/020/022/071/073/112** match GitHub (Drive-free paths).
4. **Retire Make Drive blueprints** — Lambda-only upload scenario in Production.
5. **Delete in dependency order** — Use §Safe to delete later; delete **Google Drive File ID** on Submission Assets last.
6. **Post-delete** — Fresh schema export to `airtable/schema/snapshots/`, update field maps/tests/docs, CHANGELOG.

## Validation (repo)

```bash
python3 tools/airtable/fut_002_field_inventory.py
python3 -m pytest tools/airtable/tests/test_fut_002_field_inventory.py -q
```

