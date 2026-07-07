# Testing, intake validation, and flexible weeks

**Status:** V2 architecture / ops planning — **C-020 Engineering Test Framework**  
**Last updated:** 2026-07-05 (Testing Scenarios table; script blocked on OMNI field list)  
**Tracked in:** [close-out-considerations.md](./close-out-considerations.md) **C-017** – **C-020**

---

## Overview

| ID | Topic |
|----|--------|
| **C-017** | Fillout → **Athletes** intake validation and field hygiene |
| **C-018** | **Two calendars** — intake opens (early bird) vs challenge run dates (all in **Weeks** config) |
| **C-019** | **Schmidt test enrollment** — `Active?` = false for standings only; **no test flags** |
| **C-020** | **Engineering Test Framework** — **Testing Scenarios** table on DEV; production-shaped pipeline runs without Fillout |

---

## Owner decisions (2026-07-04)

| Decision | Choice |
|----------|--------|
| **Test identification** | **No `Is Test Record?` checkbox.** Base does not know a row is a test. |
| **Schmidt sandbox** | Dedicated Athlete + Enrollment; **`Active?` = false** — excluded from leaderboard, standings, close-out audits, production emails. |
| **Automation behavior** | **Same as production.** All intake, asset, upload, XP, and video-feedback automations run normally so failures surface. |
| **Testing views** | Filter by **Enrollment link** (Schmidt/testing or retained DEV test enrollments) — **not** a test flag on pipeline tables |
| **Early bird** | Date on **Weeks** row = when app **starts accepting input** (intake open). |
| **Challenge run** | Separate configured period = when the **challenge officially runs** (Week 1+). |

---

## OMNI correction — rejected (2026-07-05)

ChatGPT reviewed OMNI output. The following OMNI suggestions are **rejected** and must **not** be implemented:

| Rejected | Why |
|----------|-----|
| **`Is Test Record?`** (or any test checkbox) on pipeline tables | Pipeline must look production-shaped |
| **`Test Status`** (or similar) on **pipeline** tables (Submissions, Submission Assets, Homework Completions, Video Feedback, XP Events, Weekly Athlete Summary) | Framework fields belong on **Testing Scenarios only** — not on pipeline |
| Testing views filtered by test flags/status on pipeline tables | Wrong pattern — use **Enrollment link** only |

**Approved testing architecture:**

| Layer | Allowed test fields |
|-------|---------------------|
| **Testing Scenarios table only** | `Scenario Type`, `Test Status`, `Expected Result`, `Actual Result`, `Pass/Fail Notes`, `Last Run Status`, `Last Run At`, `Related Enrollment`, link to created Submission |
| **Pipeline tables** | **None** — records as if created by Fillout |
| **Testing views** | Filter `Enrollment =` Schmidt/testing or selected DEV test enrollment |
| **Enrollment** | `Active?` = false for standings visibility only — not a pipeline test flag |
| **Testing Scenario Library** | **Future option** — do not build now |

Tell OMNI: *Do not add test flags or Test Status to Submissions or related pipeline tables. **Test Status** belongs on **Testing Scenarios** only. Testing views use Enrollment link filters only.*

---

## C-017 — Fillout intake validation (Athletes minimum)

### Target

1. **Fillout-side validation** — required fields, email format, name rules, duplicate warnings before Airtable.
2. **Airtable-side validation** — automation **001** fails loud on bad data.
3. **Athlete table hygiene** — Stage K pass; Fillout → Airtable field map documented.
4. **Test matrix** — new athlete, returning athlete, email variants, siblings, bad email.

### Related

- **C-012** Stage K · automation **001**

---

## C-018 — Intake open vs challenge run (date-driven Weeks)

### Two calendars (both Configuration — **Weeks** table and/or program season config)

| Concept | Meaning | Example |
|---------|---------|---------|
| **Intake open** | App and Fillout **start accepting** submissions | Early bird Mon–Wed: set **Weeks** row start date → intake opens that day |
| **Challenge run** | Official challenge period (Week 1, Week 2, …) | Week 1 starts Thursday (challenge start date) |

Early bird may be a **partial week** — still one **Weeks** row with start/end dates. When the operator sets the early bird start date, that is the day input opens.

### Target

- **All boundaries in Weeks config** — start date, end date, America/Denver, optional `Week Type` (e.g. `Early Bird`, `Regular`, `Final`).
- Optional per-row flags (Configuration): `Intake Open?`, `Counts for XP?`, `Counts for Leaderboard?` — tune per season without code changes.
- Automation **005** maps activity date → Weeks row by **date range only** — no hardcoded calendar in scripts.
- **Fillout / web** gate “form open” on intake-open date from config (not challenge-run date alone).

### Engine contract

*Submission activity date maps to the active Weeks row whose date range contains that date.*

Exact 2026–27 dates live only in **Weeks** rows at launch.

### Related

- Automation **005** · **Weeks** table schema extension

---

## C-019 — Schmidt test enrollment (visibility only)

### Intent

One permanent **Schmidt** Athlete + Enrollment exercises the **entire base** like any real athlete. The only difference is **production visibility** — not pipeline behavior.

### Rules

| Area | Schmidt test enrollment |
|------|-------------------------|
| **`Active?`** | **false** — never leaderboard, standings, close-out audits, production email cohorts |
| **Test flags on rows** | **None** — base treats all rows the same |
| **Automations** | **Run identically** — 009, 013, 020, 070, 022, 010, 065, etc. |
| **Athlete record** | **Never shared** with a live production enrollment |
| **Testing views** | `Enrollment = Schmidt test enrollment` on pipeline tables — [verification checklist](./deploy-checklists/C-019-testing-views-verification-checklist.md) |

### Distinction from C-010

**C-010** hardens `Active?` for athletes **removed from production** mid-season (should not earn XP/emails).

**Schmidt test** is a **permanent test identity**: `Active?` = false for **visibility**, but pipeline must still run for debugging. **Testing Scenarios** pre-links **Related Enrollment** on created Submissions (because **023** will not auto-link inactive enrollments from Fillout).

### Known follow-up

Automations **056**, **066**, **101** skip inactive enrollments today. Upload/video/homework tests (009→070→S3) do not depend on those. If full streak/milestone parity is needed on Schmidt rows, revisit without adding a test checkbox (e.g. document manual trigger or narrow Active? semantics for standings only).

---

## C-020 — Engineering Test Framework (Testing Scenarios)

**Priority:** **Confirmed** — DEV testing framework for Phase 2 / V2-015.  
**Build order:** Step **4** in [Phase 2 next sequence](./v2-015-development-base-architecture.md#phase-2-next-sequence-postwave-2a) — **after** pipeline-ready submission path exists for **066** DEV test (C-020 scenario or verified existing DEV row) and approved **112**/**043** maintenance (unless Mike reprioritizes).  
**Environment:** **DEV first** (`appTetnuCZlCZdTCT`).

**Status (2026-07-07):** **DEV functional complete** — Automation **115** v1.3 on DEV; formal Tests A–D + functional live **E/F/G** PASS ([checklist](./deploy-checklists/C-020-testing-scenarios-script-checklist.md)). **Not in scope:** Homework XP after review; **070a/070b** Make/S3; combined Homework + Video; Production paste.

### What this is (and is not)

| Is | Is not |
|----|--------|
| **Engineering Test Framework** — run defined scenarios against the real pipeline | “Fake Fillout” intake only — Fillout parity is one scenario type among many |
| **Testing Scenarios** operator table on DEV | Test flags on Submissions or downstream pipeline tables |
| Production-shaped Submissions + normal automations | A second production base or test metadata on pipeline rows |

### Script development

**115 v1.3** — DEV functional complete 2026-07-07 (`9107280` docs). Daily Submission (v1.0), Homework (v1.1), Video (v1.3); Tests A–D + functional live E/F/G. See [upload-workflow-homework-video.md](./upload-workflow-homework-video.md) and [C-020 checklist](./deploy-checklists/C-020-testing-scenarios-script-checklist.md).

Field list recorded in [C-020 script checklist](./deploy-checklists/C-020-testing-scenarios-script-checklist.md).

### Problem

Manual Fillout for every pipeline test is slow. **Manual DEV Submissions are also unreliable** — rows typed directly into the Submissions table may not move through the normal intake chain unless they match Fillout field shapes and trigger **023**, **005**, **009**, **010**, **031**, etc. That makes them unsuitable for **066** milestone testing (which depends on counted submissions, Week, and XP/WAS state from a real pipeline run).

Need repeatable **scenarios** → **Fillout-shaped** production pipeline run → compare **Expected** vs **Actual** — without polluting pipeline tables with test metadata.

### C-020 justification — manual submissions are not enough

| Finding | Implication |
|---------|-------------|
| Manual DEV Submissions may skip or mis-run intake automations | **066** tests on manual rows do not prove production behavior |
| Fillout-shaped Submissions move through **023 → 005 → 009 → 010 → 031** (and downstream) | **Testing Scenarios** must create Submissions that match what Fillout sends |
| **066** needs counted submissions + correct enrollment/week state | **066 DEV sandbox** waits until C-020 can create a pipeline-ready Submission **or** until an existing real DEV Submission is identified that already completed intake |

**Locked:** Manual operator rows alone are **not** sufficient for Engineering Test Framework validation. C-020 exists to create pipeline-ready Submissions on demand.

### Goal

Create a **Testing Scenarios** table (DEV) and a future **automation + extension script** (GitHub) that:

1. Reads a scenario row  
2. Creates a **normal Submission** (Fillout-shaped when the scenario requires it)  
3. Links Submission back to the scenario row  
4. Lets existing automations run  
5. Writes run results **only** to **Testing Scenarios**

### Requirements (locked)

| Rule | Detail |
|------|--------|
| **Table name** | **`Testing Scenarios`** — not “Test Intake” |
| **DEV first** | Build and prove on DEV before Production mirror |
| **No pipeline test fields** | No `Is Test Record?`, no **Test Status**, no test flags on Submissions, Submission Assets, Homework Completions, Video Feedback, XP Events, Weekly Athlete Summary, or any downstream pipeline table |
| **Framework fields on Testing Scenarios only** | **Scenario Type**, **Test Status**, **Expected Result**, **Actual Result**, **Pass/Fail Notes**, **Last Run Status**, **Last Run At**, **Related Enrollment**, link to created Submission |
| **Related Enrollment** | Schmidt/testing or any retained DEV test enrollment |
| **Fillout-shaped Submissions** | When scenario requires intake — match field shapes **005**, **009**, **023** expect; Enrollment pre-linked |
| **Multi-file video** | Up to 3 files → N assets + N Video Feedback rows; **one** Focus + **one** Question per submission ([upload workflow](./upload-workflow-homework-video.md)) |
| **Multi-file homework** | Up to 3 files → N assets → **one** Homework Completion per selected assignment |
| **Testing Scenario Library** | **Future option** — separate template/library table; **do not build now** |
| **Promotion doc** | Required before prod ([doc 04 § Official promotion documentation](./v2/04-ai-development-standards.md#official-promotion-documentation-required)) |

### Testing Scenarios table (DEV — OMNI complete 2026-07-05)

**Authoritative field list:** [deploy-checklists/C-020-testing-scenarios-script-checklist.md](./deploy-checklists/C-020-testing-scenarios-script-checklist.md)

**Minimum framework fields** (all on Testing Scenarios only):

| Field | Purpose |
|-------|---------|
| **Scenario Type** | Preset label (Daily Submission, Homework, 3-video upload, Milestone crossing, etc.) |
| **Related Enrollment** | Link — Schmidt/testing or DEV test enrollment |
| **Test Status** | Operator workflow state (**Testing Scenarios only**) |
| **Expected Result** | Pass criteria description |
| **Actual Result** | Filled after run (script or operator) |
| **Pass/Fail Notes** | Operator notes |
| **Last Run Status** | Script outcome |
| **Last Run At** | Run timestamp |
| **Created Submission** (or equivalent) | Back-link to pipeline row created by scenario |
| *Scenario inputs* | Activity date, shots, attachments — per OMNI final list |

**Trigger field:** **`Run Test?`** on **Testing Scenarios** (Automation **115**).

### Automation 115 behavior (implemented — DEV functional complete 2026-07-07)

See [deploy-checklists/C-020-testing-scenarios-script-checklist.md](./deploy-checklists/C-020-testing-scenarios-script-checklist.md):

1. Read one **Testing Scenarios** row  
2. Validate **Related Enrollment**  
3. Create normal **Submission** (Fillout-shaped when applicable)  
4. Link Submission back to **Testing Scenarios**  
5. Let normal pipeline automations run  
6. Write **Last Run Status**, **Last Run At**, **Actual Result**, **Pass/Fail Notes** to **Testing Scenarios** only  
7. Never write test metadata to pipeline tables  

### Downstream automations expected to fire

After **Testing Scenarios** creates a Submission, the **normal** chain should run. Use this map when verifying in DEV (Make webhooks → **dev** scenarios per [development-base-setup.md](./development-base-setup.md)).

#### Stage A — Submission intake (immediate)

| # | Automation | Expected when | Notes |
|---|------------|---------------|-------|
| **023** | Assign Enrollment to Submission | Submission created **without** Enrollment | **Skipped** if scenario pre-linked **Related Enrollment** |
| **005** | Assign Week to Submission | Submission created / activity date set | Week from **Activity Date** |
| **007** | Duplicate checker | Submission created | May flag duplicate stats for same enrollment/date |
| **006** | Set Video Count | After attachments processed | Video count from submission |
| **021** | Set Attachment Upload Status | Asset prep | Upload status seeds |
| **009** | Create Submission Assets | Submission with attachments | **1 row per attachment** — multi-file video → multiple assets |
| **010** | Create XP Event from Submission | `Count This Submission?` true | Submission XP |

#### Stage D–E — Homework path (if HW attachments)

| # | Automation | Expected when |
|---|------------|---------------|
| **020** | Link or Create Homework Completion | HW Submission Asset ready |
| **070a** | Send Homework Asset to Make | Asset ready + Send to Make Trigger |
| **022** | Sync Child Upload Writeback | Upload status / URL writeback |
| **063** | Copy Grade Band to HW Completion | HW Completion created |

Coach review → **064**, **065**, **071** fire later when review fields set (not automatic on intake).

#### Stage G — Video path (if video attachments)

| # | Automation | Expected when |
|---|------------|---------------|
| **013** | Create or Link Video Feedback | Video Submission Asset ready (**not 112**) |
| **070b** | Send Video Asset to Make | Asset ready + trigger |
| **022** | Sync Child Upload Writeback | After Make/S3 upload |
| **111** | Copy Grade Band to Video Feedback | Video Feedback created |

Coach review → **113**, **114**, **073** fire when review/XP fields set.

#### Stage C / I — Weekly summary + achievements (may partial on inactive enrollments)

| # | Automation | Expected when | Caveat |
|---|------------|---------------|--------|
| **031** | Find or Create WAS from Submission | `Count This Submission?` + WAS empty | Should run |
| **032**, **033**, **030**, **034** | WAS helpers | WAS created/updated | Verify in Testing view |
| **053**, **055** | Streak rebuild from Submission | Submission counted | May run |
| **056**, **066**, **101** | Streak refresh / shot milestones / Zoom XP | Various | **May skip inactive enrollments today** — document in test notes; upload/video path does not depend on these |

#### Email / Make (DEV isolation required)

| # | Automation | Risk in DEV |
|---|------------|-------------|
| **070a**, **070b** | Upload to Make | Must use **dev** webhook URLs |
| **071**, **073**, **074**, **077** | Parent email send | **OFF or dev Make** until dev scenarios exist |

**Audit verification:** After a test run, dry-run [Stage A–H audits](../airtable/extension-scripts/audits/README.md) filtered to test Enrollment — especially `audit-submission-pipeline-integrity.js`, `audit-homework-pipeline-integrity.js`, `audit-video-pipeline-integrity.js`.

### Example — three video files

Operator goal: verify upload engine creates **3 S3 URLs** and **3 Video Feedback** rows for coach review.

```
Testing Scenarios row:
  Scenario Type → 3-video upload
  Related Enrollment → Schmidt (or DEV test enrollment)
  Expected Result → 3 assets, 3 VF rows, 3 upload URLs
  [trigger run per OMNI final design]

Expected pipeline (same as production):
  Submission created (Enrollment pre-linked) → linked back to Testing Scenarios
  → 009: 3 Submission Asset rows
  → 013 / 070b / 022 …

Verify:
  Testing views on pipeline tables (Enrollment filter)
  Actual Result + Pass/Fail Notes on Testing Scenarios only
```

### Testing views (every submission-data table)

**View name:** `Testing`  
**Filter:** `Enrollment` (or linked enrollment) **=** test enrollment used on **Testing Scenarios** row

Tables (minimum): Submissions, Submission Assets, Homework Completions, Video Feedback, XP Events, Weekly Athlete Summary, Streak Occurrences, Athlete Achievement Unlocks.

**Manual verification:** OMNI and GitHub cannot read Airtable view filter definitions. Use [C-019 Testing views verification checklist](./deploy-checklists/C-019-testing-views-verification-checklist.md) in the Airtable UI (Schmidt enrollment `recgP9qZYjAhE7NXm` — filter by link, not test flags).

### Workflow

```
1. Testing Scenarios → new row (Scenario Type, Related Enrollment, Expected Result, inputs per OMNI)
2. Trigger run (per final OMNI design) → future script creates Submission + back-link
3. Wait for automation chain (or audit dry-run on DEV)
4. Testing views → confirm pipeline; update Actual Result / Pass/Fail Notes on Testing Scenarios
5. Re-run scenario as needed
```

### V2-015 sequencing

| Order | Item | Status |
|-------|------|--------|
| 1 | **066 v3.1** DEV audit + sandbox test | **Next** |
| 2 | Optional **066** prod promote | After DEV pass — Mike decides |
| 3 | Delete **112**, retire **043** | Approved maintenance window |
| 4 | **C-020** — **115 v1.3** on DEV | **DEV functional complete** (Tests A–D + E/F/G); [upload workflow](./upload-workflow-homework-video.md) |

---

## Implementation priority

| Order | Item | Why |
|-------|------|-----|
| 1 | **066 DEV test** (H-002) | Blocks V2-015 done; milestone unlock reference |
| 2 | **C-020** | **DEV functional complete** — **115** v1.3; Production paste + optional combined scenario deferred |
| 3 | **C-019** | Document Schmidt + DEV test enrollment IDs; Testing views |
| 4 | **C-018** | Intake-open vs challenge-run dates before launch |
| 5 | **C-017** | Fillout validation before enrollment wave |

---

## Related documents

| Doc | Topic |
|-----|--------|
| [close-out-considerations.md](./close-out-considerations.md) | C-010, C-017–C-020 |
| [asset-storage-migration.md](./asset-storage-migration.md) | S3 URLs on test runs |
| [shooting-challenge-v2-master-direction.md](./shooting-challenge-v2-master-direction.md) | Phase 5 + 7 |
| [data-flow/submission-to-xp-flow.md](./data-flow/submission-to-xp-flow.md) | Submission pipeline |
