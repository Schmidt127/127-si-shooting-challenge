# C-020 — Testing Scenarios script checklist (future)

**Backlog:** C-020  
**Status:** **DEV verified** — Automation **115** v1.3 (Daily Submission + Homework + Video; Tests A–D PASS 2026-07-07). Production not deployed  
**Environment:** DEV only (`appTetnuCZlCZdTCT`) until promotion doc + Mike approval

**Architecture:** [testing-and-intake-architecture.md](../testing-and-intake-architecture.md) § C-020  
**Testing views (C-019):** [C-019 Testing views verification checklist](./C-019-testing-views-verification-checklist.md) — manual Airtable UI; OMNI cannot audit view filters  
**Table:** **Testing Scenarios** (`tblEQLsXTCwx0iOd8`) on DEV

---

## Why C-020 exists (justification)

| Finding | Why it matters |
|---------|----------------|
| **Manual DEV Submissions are not reliable** | Rows typed into Submissions may not run **023**, **005**, **009**, **010**, **031**, etc. unless shaped exactly like Fillout |
| **Manual rows are not enough** | Operator-created incomplete rows cannot validate pipeline behavior |
| **Testing Scenarios must create Fillout-shaped Submissions** | Only production-shaped intake produces trustworthy downstream state for **066**, upload, homework, and video tests |
| **066 depends on real pipeline state** | Shot milestone logic uses counted submissions from a enrollment that went through intake — not ad-hoc manual fields |

**066 DEV test** completed separately (Easton Hill) — see [066 dev checklist](./066-v3.1-dev-deploy.md). C-020 provides ongoing Fillout-shaped DEV intake for Schmidt and future scenarios.

---

## C-020 Script Start Gates

### Required

- **Pipeline-ready submission path defined** for DEV testing — Fillout-shaped Submission via C-020 **or** verified existing DEV row ([066 dev deploy checklist](./066-v3.1-dev-deploy.md))

**Daily Submission MVP verified** 2026-07-06 — Homework and Video branches may proceed per [upload-workflow-homework-video.md](../upload-workflow-homework-video.md).

**115 implementation order:** Homework branch (v1.1) **before** Video branch (v1.2).

### Recommended (non-blocking)

- **Operator Assigned** uses **Collaborator** field (operator UX only — no effect on Testing Scenarios architecture or future script behavior)

---

## Engineering Test Framework — script behavior (required)

When implemented, the Cursor script **must** follow these steps in order:

| Step | Action | Writes to |
|------|--------|-----------|
| **1** | Read one **Testing Scenarios** row (trigger: **`Run Test?`** checked, unless automation design changes) | — |
| **2** | Validate **Related Enrollment** (linked enrollment exists and is allowed test enrollment) | — |
| **3** | Create a **normal Submission** shaped like Fillout (Enrollment pre-linked, activity date, shot fields, attachments as scenario specifies) | **Submissions only** — production-shaped, **no test metadata** |
| **4** | Link created **Submission** back to the **Testing Scenarios** row (**Linked Submission**) | **Testing Scenarios** link field only |
| **5** | Let **normal pipeline automations** run (do not manually chain **005**, **009**, **013**, **070**, etc.) | — |
| **6** | Write **Last Run Status**, **Last Run At**, **Actual Result**, and **Pass/Fail Notes** back to **Testing Scenarios** only | **Testing Scenarios** only |
| **7** | **Never** write test metadata to pipeline tables (Submissions, Submission Assets, Homework Completions, Video Feedback, XP Events, Weekly Athlete Summary, etc.) | — |

**After successful run:** uncheck **`Run Test?`** (operator trigger lives on **Testing Scenarios** only).  
**Dry Run?:** if checked, preview/log without pipeline writes — design detail at implementation time.

---

## Final DEV field list (OMNI — 2026-07-05)

Authoritative export: DEV base `appTetnuCZlCZdTCT`, table **Testing Scenarios** (`tblEQLsXTCwx0iOd8`).

| Field | Airtable type | Field ID | Script / operator role |
|-------|---------------|----------|------------------------|
| **Test Intake Name** | singleLineText (primary) | `fldqfcodjXsPpyl05` | Operator label — cosmetic rename to “Scenario Name” optional later |
| **Scenario Type** | singleSelect | `fldcTd7qaFhyKZp5Q` | Preset — Daily Submission, Homework, Homework + Video, Three Video Upload, Milestone Crossing, Perfect Week, Backdated Submission, Parent Feedback, Weekly Summary, Award Generation, Other |
| **Test Status** | singleSelect | `fldji9YCoxcTIR6Cu` | Operator workflow — Not Started, Queued, In Progress, Blocked, Completed, Rejected |
| **Operator Assigned** | collaborator | `fldTGPN6emJvYb03J` | Operator UX — recommended; does not affect script behavior |
| **Related Enrollment** | link → Enrollments | `fldPylkKBdhFTTDCL` | Required — Schmidt/testing or DEV test enrollment; pre-link on created Submission |
| **Submission Date** | date | `fldNCS0y5Ez4pFccA` | Maps to Submission activity date |
| **Shot Total** | number | *(added DEV 2026-07-06)* | Maps to Submission **Shot Total** — Daily Submission MVP |
| **Intake Attachments** | multipleAttachments | `fldYubBWgAKHstQ6P` | **Homework** → Submission **HW Sub 1**; **Video** → Submission **Video Upload** |
| **Homework Assignment** | link → FBC Curriculum - SYNC | *(OMNI DEV 2026-07-06)* | Required for **Homework** scenario — maps to **Homework Name 1** |
| **Video Feedback Focus** | singleSelect | *(OMNI DEV 2026-07-06)* | Required for **Video Upload** / **Homework + Video** — submission-level focus |
| **Video Feedback Question** | multilineText | *(OMNI DEV 2026-07-06)* | Required for video scenarios — maps to Submission **Video Feedback Note** |
| **Scenario Requirements** | multilineText | `fldVWP6MVqrBXqa6J` | Operator scenario inputs / constraints |
| **Test Notes** | multilineText | `fldD8y9YrgIhjiqfu` | Operator notes |
| **Operator Feedback** | multilineText | `fldslXpxwlEBxousb` | Operator feedback |
| **Relevant Homework Completion** | link → Homework Completions | `fldD1xEqr5fyFluuN` | Optional — homework-linked scenarios |
| **Pipeline Entity Linked** | link → Final Reflection Quiz Submissions | `fldNtyAo1tZsRQXmB` | Optional — non-Submission pipeline targets when scenario requires |
| **Operator Priority** | singleSelect | `fldTJ17facY3V6rUf` | P1 - Urgent, P2 - High, P3 - Routine |
| **Automation Platform** | singleSelect | `fldEMLXIjQYgPpB4k` | Manual, Fillout, Make, Other — metadata only |
| **Expected Result** | multilineText | `fldvIibzIarXIOHlw` | Pass criteria |
| **Actual Result** | multilineText | `fld41YuEuFYTNAaOC` | Filled after run (script or operator) — **step 6** |
| **Pass/Fail Notes** | multilineText | `fldDfIl3muCcjV8U2` | Operator notes — **step 6** |
| **Last Run Status** | singleSelect | `fld4tedtEbwfa1cMB` | Not Run, Pass, Fail, Blocked, Error — **step 6** |
| **Last Run At** | dateTime (UTC) | `fld498KtmqKzJEOog` | Run timestamp — **step 6** |
| **Run Test?** | checkbox | `fldAjFqic7nEBWgBT` | Operator trigger — check to fire automation |
| **Dry Run?** | checkbox | `fldSSRZKRBMv9UfuA` | Preview without writes |
| **Linked Submission** | link → Submissions | `fld4DCoxCVBqmBzfh` | Back-link from created Submission — **step 4** |
| **Last Updated** | lastModifiedTime | `fldNrhrZIVIuhCctc` | Audit — read-only |
| **Test Submission Summary** | aiText | `fldcFA3EQZ4Btfvzc` | AI summary — read-only; not written by script |

### Inverse links on pipeline tables (read-only for script)

| Pipeline table | Inverse field | Purpose |
|----------------|---------------|---------|
| **Submissions** | **Testing Scenarios** | Back-link from **Linked Submission** |
| **Enrollments** | **Testing Scenarios** | Scenarios for test enrollment |
| **Homework Completions** | **Testing Scenarios** | HW-linked scenarios |
| **Final Reflection Quiz Submissions** | **Testing Scenarios** | Reflection-linked scenarios |

**Hard rule unchanged:** no test flags, **Test Status**, or framework fields on pipeline tables — only the normal inverse link field where OMNI added it.

---

## G1 — Daily Submission field map (MVP — closed 2026-07-06)

**Scenario Type:** `Daily Submission` only (v1.0 script).

### Testing Scenarios → read

| Testing Scenarios field | Maps to / use |
|-------------------------|---------------|
| **Related Enrollment** | Must be Schmidt MVP allowlist: `recgP9qZYjAhE7NXm` |
| **Submission Date** | Submission **Activity Date** |
| **Shot Total** | Submission **Shot Total** (number — added DEV 2026-07-06) |
| **Run Test?** | Trigger; cleared after run |
| **Dry Run?** | Preview only — no Submission create |
| **Scenario Requirements** | Not used in v1.0 (optional operator notes) |

### Submission → write (writable only)

| Submission field | Value |
|------------------|-------|
| **Enrollment** | Related Enrollment link |
| **Athlete** | Athlete from Enrollment |
| **Activity Date** | Submission Date |
| **Shot Total** | Testing Scenarios **Shot Total** |
| **Duplicate Review Status** | `Count It` |

### Submission → do not write

Week, Submission Assets, XP Events, Homework/Video attachment fields, computed/formula fields, any test flag.

### Downstream (normal automations)

**023** skipped (Enrollment pre-linked). Expect **005**, **007**, **010**, **031**, etc. per [testing-and-intake-architecture.md](../testing-and-intake-architecture.md).

### G3 — MVP enrollment allowlist (Schmidt-only)

| Enrollment | Record ID | Notes |
|------------|-----------|-------|
| Schmidt, Testing - 2025-2026 | `recgP9qZYjAhE7NXm` | Athlete `recgqVstObQRzgXJF`; Grade Band K-2; `Active?` false |
| *Expanded allowlist* | *Deferred* | Five other DEV test enrollments + Bakken — post-MVP |

---

## G2 — Homework Upload field map (115 v1.1 — DEV verified 2026-07-07)

**Scenario Type:** `Homework`  
**Design:** [upload-workflow-homework-video.md](../upload-workflow-homework-video.md)  
**Script:** `115-engineering-test-framework-run-testing-scenario-daily-submission.js` **v1.1**

### Testing Scenarios → read

| Testing Scenarios field | Maps to / use |
|-------------------------|---------------|
| **Related Enrollment** | Schmidt MVP allowlist: `recgP9qZYjAhE7NXm` |
| **Submission Date** | Submission **Activity Date** |
| **Homework Assignment** | Submission **Homework Name 1** (single link) |
| **Intake Attachments** | Submission **HW Sub 1** (1–3 files, same assignment) |
| **Run Test?** / **Dry Run?** | Trigger; cleared after run |

### Submission → write (writable only)

| Submission field | Value |
|------------------|--------|
| **Enrollment** | Related Enrollment |
| **Athlete** | From Enrollment |
| **Activity Date** | Submission Date |
| **Homework Name 1** | Homework Assignment |
| **HW Sub 1** | Intake Attachments (all files) |
| **Duplicate Review Status** | **Omitted** for homework-only (no Shot Total; avoids shot-count XP path) |

### Submission → do not write

**Homework Name 2**, **HW Sub 2**, **Video Upload**, **Video Feedback Note**, Week, computed fields, test flags.

### Script validation (before create)

| Check | Action |
|-------|--------|
| **Homework Assignment** empty | Block — `Last Run Status: Blocked` |
| **Intake Attachments** count 0 | Block |
| **Intake Attachments** count &gt; 3 | Block — no Submission create |
| Wrong **Scenario Type** | Skip or error per router |

### Downstream (normal automations — do not chain manually)

**005** → **009** (N assets: HW1-1 … HW1-N) → **020** (one Homework Completion, all assets linked) → **070a** (DEV OFF).

### Acceptance criteria

| ID | Test | Pass |
|----|------|------|
| A | Dry run, 1 file | Preview only; no Submission |
| B | Live, 1 file | 1 Submission, 1 asset, 1 Homework Completion |
| C | Live, 2–3 files | 1 Submission, N assets, **still 1** Homework Completion |
| D | 4 files | Blocked before Submission create |

---

## G3 — Video Upload field map (115 v1.3 — DEV verified 2026-07-07)

**Scenario Type:** `Video` (alias: `Three Video Upload`)  
**Design:** [upload-workflow-homework-video.md](../upload-workflow-homework-video.md)  
**Script:** `115-engineering-test-framework-run-testing-scenario-daily-submission.js` **v1.3**

**v1.3 field model (confirmed):** Video files live on Testing Scenarios **Intake Attachments** only. Script copies to Submissions **Video Upload** for 009.  
**Design:** [upload-workflow-homework-video.md](../upload-workflow-homework-video.md)

### Testing Scenarios → read

| Testing Scenarios field | Maps to / use |
|-------------------------|---------------|
| **Related Enrollment** | Schmidt MVP allowlist |
| **Submission Date** | **Activity Date** |
| **Video Feedback Focus** | Submission **Video Feedback Focus** |
| **Video Feedback Question** | Submission **Video Feedback Note** |
| **Intake Attachments** | Submission **Video Upload** (1–3 files) |

### Submission → write

| Submission field | Value |
|------------------|--------|
| **Enrollment** | Related Enrollment |
| **Athlete** | From Enrollment |
| **Activity Date** | Submission Date |
| **Video Feedback Focus** | Testing Scenarios **Video Feedback Focus** |
| **Video Feedback Note** | Testing Scenarios **Video Feedback Question** |
| **Video Upload** | Testing Scenarios **Intake Attachments** (1–3 files) |

### Downstream

**005** → **009** (VIDEO-1 … VIDEO-N assets + sequence) → **013** (one VF per asset, inherit Focus + Question) → naming gate → **070b** (DEV OFF).

### Acceptance criteria

| ID | Test | Pass |
|----|------|------|
| A | Dry run, 1 video | Preview; Focus + Question shown |
| B | Live, 1 video | 1 asset, 1 VF row, naming metadata present |
| C | Live, 3 videos | 3 assets, 3 VF rows, same Focus + Question on all |
| D | 4 videos | Blocked before create |

---

## OMNI — pipeline fields still needed (post Testing Scenarios)

Testing Scenarios intake fields are **complete** on DEV. Pipeline tables still need:

| Table | Field | Type | MVP |
|-------|-------|------|-----|
| **Submissions** | **Video Feedback Focus** | singleSelect (same options as Testing Scenarios) | Video branch |
| **Submissions** | **Video Feedback Question** | long text | Optional — can map to **Video Feedback Note** for MVP |
| **Submission Assets** | **Video Feedback Focus** | singleSelect (copy from Submission at **009**) | Video + naming |
| **Submission Assets** | **Asset Sequence** | number (1–3) | Video naming |
| **Submission Assets** | **Upload Naming Status** | singleSelect or formula | Gates **070b** |
| **Video Feedback** | **Video Feedback Focus** | singleSelect (copy at **013**) | Coach queue |
| **Video Feedback** | **Video Feedback Question** | long text (copy at **013**) | Coach queue |
| **Video Feedback** | **Coach Video Title** | single line text | Post-review display (C-022) |
| **Submission Assets** | **Formatted Upload Name** | formula | Evolve **Create Google Drive File Name** |
| **Submission Assets** | **Canonical File URL** | url | C-013 wave (today: **Google Drive File URL**) |

**009 change (video):** Set **Asset Slot** to `VIDEO-1` / `VIDEO-2` / `VIDEO-3` (not generic `VIDEO`) for sequence in formatted name.

**Config table (future):** **Default Homework File Limit**, **Max Homework File Limit** — align with existing **Max Videos Per Submission**.

---

## 115 — automation approach (closed DEV MVP)

| Decision | Choice |
|----------|--------|
| Extend **115** vs new **116** | **Extend 115** — one **Run Test?** trigger; scenario router by **Scenario Type** |
| v1.0 | Daily Submission |
| v1.1 | Homework |
| v1.3 | Video (`Intake Attachments` → `Submissions.Video Upload`) |
| **Homework + Video** combined scenario | **Defer** — prove each path separately first |

---

## DEV test log — Automation 115 v1.1/v1.3 Homework + Video (2026-07-07)

**Base:** DEV `appTetnuCZlCZdTCT`  
**Script:** `115-engineering-test-framework-run-testing-scenario-daily-submission.js` **v1.3** (Homework from v1.1; Video v1.3)  
**External sends:** **070a** / **070b** OFF on DEV

### Test A — Homework dry run

- [x] **PASS**

### Test B — Homework live (1 file)

| Item | Value |
|------|--------|
| Testing Scenarios | `recP51mbE5KEGngxQ` |
| Submission | `reca8SxXfri7aRZiB` |
| Submission Asset | `recv2C72is5w3YJYB` |
| Homework Completion | `recB8kqdoOkYJkNYr` |
| Result | **PASS** — one asset, one Homework Completion |

### Test C — Video dry run (2 files)

| Item | Value |
|------|--------|
| Testing Scenarios | `reck9d758vX5yLneq` |
| Scenario Type | Video |
| Source field | **Intake Attachments** |
| File count | 2 |
| Filenames | BlueOrangeCircleLogo.png; Shooting Tracker - 2026 Version.png |
| Submission / Assets / VF | None (expected) |
| Result | **PASS** |

### Test D — Video live (2 files)

| Item | Value |
|------|--------|
| Testing Scenarios | `rec459yCln87a0w2V` |
| Submission | `recj2rU2XtmCGBNpn` |
| Video Upload files | 2 |
| Week | Week 5 (**005**) |
| Submission Assets | `recKQNVzYHHBHS2Qg`, `recc2dDzgl4Mqp6P1` |
| Video Feedback | `recLc5Sj3lQlzJeLe`, `recalGPUFG19BmbSP` |
| Homework Completions | None |
| **070b** | OFF (expected) |
| Result | **PASS** |

---
## Open schema notes

| Item | Detail |
|------|--------|
| **Shot Total** on **Testing Scenarios** | **Done** — number field added DEV 2026-07-06 (writable, not computed). |
| **Test Intake Name** (primary) | Legacy label from earlier naming — acceptable; optional rename to **Scenario Name** later. |

---

## Future Enhancements (Not Phase 2)

Intentionally deferred — do not build during Phase 2:

- **Testing Scenario Library**
- **Automatic Expected vs Actual validation**
- **Regression test suites**
- **Release certification runs**

---

## Hard rules

- Pipeline records must look as if created by **Fillout** — no `Is Test Record?`, no **Test Status** on pipeline tables.
- Framework fields (**Scenario Type**, **Test Status**, **Expected/Actual Result**, **Pass/Fail Notes**, **Last Run** fields) live on **Testing Scenarios only**.
- DEV first → promotion doc → Production mirror (structure only).

---

## After script exists

- [x] Dry-run on DEV with one scenario row (2026-07-06)
- [x] Homework + Video DEV tests A–D (2026-07-07, v1.3)
- [ ] Stages A–H audit dry-run on Schmidt enrollment (optional follow-up)
- [ ] Promotion doc committed before prod

---

## DEV test log — Automation 115 v1.0 (2026-07-06)

**Base:** DEV `appTetnuCZlCZdTCT`  
**Automation:** 115 - Engineering Test Framework - Run Testing Scenario Daily Submission  
**Script:** `115-engineering-test-framework-run-testing-scenario-daily-submission.js` v1.0  
**Result:** **PASS**

| Item | Value |
|------|--------|
| Testing Scenarios row | `rec6UZsARW5dzTvzd` |
| Scenario Type | Daily Submission |
| Related Enrollment | Schmidt, Testing - 2025-2026 (`recgP9qZYjAhE7NXm`) |
| Athlete | `recgqVstObQRzgXJF` |
| Created Submission | `recHmgJB8txE5w0Bg` |
| Activity Date | 2026-05-26 |
| Shot Total | 100 |
| Duplicate Review Status | Count It |
| Count This Submission? | 1 |
| Week | Week 5 (`recUPkXtsDOHnY5q7`) — assigned by **005** |
| XP Event | `recEjDUfUHY2tUvJL` — Submission Base / Shooting Base / 20 XP |
| Source Key | `SUBMISSION_XP\|recHmgJB8txE5w0Bg` |
| Weekly Athlete Summary | `recBO81w4dYtcaL4V` |
| Submission Assets | None (expected — no attachments) |
| Homework Completions | None (expected) |
| Video Feedback | None (expected) |
| Duplicates | None |
| Pipeline errors | None |

**Link note:** Submission may show **Testing Scenarios** only as the inverse link from **Linked Submission** on the scenario row — acceptable; no test flags on pipeline tables.

### Dry-run

- [x] **PASS** — `actionOut: dry_run`, no Submission created, `Run Test?` cleared

### Live-create

- [x] **PASS** — `actionOut: created`, Submission + downstream (**005**, **010**, **031**) verified
