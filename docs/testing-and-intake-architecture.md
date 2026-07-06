# Testing, intake validation, and flexible weeks

**Status:** V2 architecture / ops planning — **C-020 priority DEV build**  
**Last updated:** 2026-07-05 (OMNI test-flag rejection; Phase 2 next sequence)  
**Tracked in:** [close-out-considerations.md](./close-out-considerations.md) **C-017** – **C-020**

---

## Overview

| ID | Topic |
|----|--------|
| **C-017** | Fillout → **Athletes** intake validation and field hygiene |
| **C-018** | **Two calendars** — intake opens (early bird) vs challenge run dates (all in **Weeks** config) |
| **C-019** | **Schmidt test enrollment** — `Active?` = false for standings only; **no test flags** |
| **C-020** | **Test Intake harness** — production-identical pipeline, no Fillout (**priority DEV build after 066**) |

---

## Owner decisions (2026-07-04)

| Decision | Choice |
|----------|--------|
| **Test identification** | **No `Is Test Record?` checkbox.** Base does not know a row is a test. |
| **Schmidt sandbox** | Dedicated Athlete + Enrollment; **`Active?` = false** — excluded from leaderboard, standings, close-out audits, production emails. |
| **Automation behavior** | **Same as production.** All intake, asset, upload, XP, and video-feedback automations run normally so failures surface. |
| **Testing views** | Filter by **Enrollment link** (Schmidt/testing or retained DEV test enrollments) — **not** a test flag or Test Status field |

---

## OMNI correction — rejected (2026-07-05)

ChatGPT reviewed OMNI output. The following OMNI suggestions are **rejected** and must **not** be implemented:

| Rejected | Why |
|----------|-----|
| **`Is Test Record?`** (or any test checkbox) on pipeline tables | Pipeline must look production-shaped |
| **`Test Status`** (or similar) on Submissions, Submission Assets, Homework Completions, Video Feedback, XP Events, Weekly Athlete Summary | Same — no operator metadata on pipeline rows |
| Testing views filtered by test flags/status on pipeline tables | Wrong pattern — use **Enrollment link** only |

**Approved testing architecture:**

| Layer | Allowed test fields |
|-------|---------------------|
| **Test Intake table only** | `Run Test?`, `Dry Run?`, `Scenario Type`, `Last Run Status`, `Last Run At`, operator attachments |
| **Pipeline tables** | **None** — records as if created by Fillout |
| **Testing views** | Filter `Enrollment =` Schmidt/testing or selected DEV test enrollment |
| **Enrollment** | `Active?` = false for standings visibility only — not a pipeline test flag |

Tell OMNI: *Do not add test flags or Test Status to Submissions or related pipeline tables. Testing views use Enrollment link filters only.*
| **Early bird** | Date on **Weeks** row = when app **starts accepting input** (intake open). |
| **Challenge run** | Separate configured period = when the **challenge officially runs** (Week 1+). |

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
| **Testing views** | `Enrollment = Schmidt test enrollment` on pipeline tables |

### Distinction from C-010

**C-010** hardens `Active?` for athletes **removed from production** mid-season (should not earn XP/emails).

**Schmidt test** is a **permanent test identity**: `Active?` = false for **visibility**, but pipeline must still run for debugging. Test Intake **pre-links Enrollment** on Submissions (because **023** will not auto-link inactive enrollments from Fillout).

### Known follow-up

Automations **056**, **066**, **101** skip inactive enrollments today. Upload/video/homework tests (009→070→S3) do not depend on those. If full streak/milestone parity is needed on Schmidt rows, revisit without adding a test checkbox (e.g. document manual trigger or narrow Active? semantics for standings only).

---

## C-020 — Test Intake harness (production-identical)

**Priority:** **Confirmed** — priority testing feature for Phase 2 / V2-015 DEV base.  
**Build order:** **After Automation 066 v3.1 DEV paste + test passes** — next DEV-first build candidate.  
**Environment:** **DEV first** (`appTetnuCZlCZdTCT`); promote table + automation/extension to Production per [structural promote-as-you-go](./v2-015-development-base-architecture.md#structural-promote-as-you-go-permanent-rule) after DEV pass + promotion doc.

### Problem

Fillout for every pipeline test is slow. Need one Airtable row → full pipeline run → inspect results — without test flags on pipeline rows.

### Goal

Create a **Test Intake** table and **automation + extension script** (GitHub source) that creates **production-shaped** Submission records as if they came from Fillout.com, then lets the **existing** intake/upload/XP chain run normally.

### Requirements (locked)

| Rule | Detail |
|------|--------|
| **DEV first** | Build and prove on DEV base before any Production mirror |
| **No `Is Test Record?`** | Do **not** add test flags to Submissions, Submission Assets, Video Feedback, Homework Completions, XP Events, or any pipeline table |
| **Enrollment source** | Schmidt/testing enrollment **or** any of the **6 retained DEV test enrollments** (link on Test Intake row) |
| **Operator trigger** | **`Run Test?`** on Test Intake only — check to fire; **auto-uncheck** after successful run |
| **Dry run** | Optional **`Dry Run?`** on Test Intake only — preview/log without writes |
| **Fillout parity** | Created Submission must match field shapes **005**, **009**, **023** expect (Enrollment pre-linked, activity date, shot fields, attachments) |
| **Pre-link Enrollment** | Script sets Enrollment on Submission (Fillout path uses **023**; inactive enrollments may not auto-link — see C-019) |
| **Multi-file video** | Support **multiple video attachments** on one Test Intake row when practical (primary scenario: N files → N assets → N upload paths) |
| **Promotion doc** | Cursor documents prod steps before promote ([doc 04 § Official promotion documentation](./v2/04-ai-development-standards.md#official-promotion-documentation-required)) |

### Design principles

1. **No test metadata on pipeline rows** — Submission Assets, Video Feedback, etc. look like production.
2. **`Run Test?` lives only on the Test Intake table** — operator trigger, auto-unchecks after run.
3. **Creates the same shapes Fillout would** — fields existing automations expect.
4. **Pre-links Enrollment** on Submission so the chain starts without Fillout or **023** guessing.

### Test Intake table (operator — DEV first)

| Field | Purpose |
|-------|---------|
| **Scenario Type** | Preset or free-text scenario label (e.g. `Daily shots only`, `HW + 1 video`, `3-video upload`, `Full intake`) — drives defaults and test matrix docs |
| **Enrollment** | Link — default Schmidt test enrollment; may select any retained DEV test enrollment |
| **Activity Date** | Drives **005** week assignment (C-018) |
| **Shots / makes / attempts** | Daily submission stat fields (match Fillout / Submissions column names) |
| **Homework attachments** | One or more HW file(s) as needed |
| **Video attachments** | One or **multiple** files (multi-file upload test) |
| **`Dry Run?`** | Optional — preview without creating Submission |
| **`Run Test?`** | Check to fire → script runs → **unchecks** for re-run |
| **Last Run Status** | Optional — success / error / dry-run summary for operator (Test Intake only — not on pipeline rows) |
| **Last Run At** | Optional — timestamp (Test Intake only) |

### Implementation (GitHub + DEV)

| Artifact | Location |
|----------|----------|
| Extension / automation script | `airtable/extension-scripts/` or `airtable/automations/shooting-challenge/` (follow automation standard if native automation) |
| Trigger | Automation on **Test Intake** when **`Run Test?`** is checked → run script → uncheck **`Run Test?`** |
| Testing views | `Testing` view on pipeline tables — filter `Enrollment =` selected test enrollment |
| Deploy checklist | `docs/deploy-checklists/C-020-test-intake-dev-deploy.md` (create in Phase 3) |

**DEV enrollments available (2026-07-05):** Schmidt/testing + **5** additional test enrollments — all `Active?` = false for standings; pipeline still runs.

### Extension / automation behavior

1. Read Test Intake row when **`Run Test?`** is checked (or manual extension run against row ID).
2. If **`Dry Run?`** — log intended Submission field map + attachment counts; exit without writes.
3. Create **Submission** with Enrollment linked, Activity Date, shot fields, and attachments copied/placed like Fillout intake — **no test flag** on Submission.
4. Uncheck **`Run Test?`** (and set Last Run Status if field exists).
5. **Do not** invoke downstream automations manually — let Airtable triggers fire on the new Submission and assets.

### Downstream automations expected to fire

After Test Intake creates a Submission, the **normal** chain should run. Use this map when verifying a test run in DEV (Make webhooks must point at **dev** scenarios per [development-base-setup.md](./development-base-setup.md)).

#### Stage A — Submission intake (immediate)

| # | Automation | Expected when | Notes |
|---|------------|---------------|-------|
| **023** | Assign Enrollment to Submission | Submission created **without** Enrollment | **Skipped** if Test Intake pre-linked Enrollment |
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
Test Intake row:
  Scenario Type → 3-video upload
  Enrollment → Schmidt (or DEV test enrollment)
  Activity Date → chosen test date
  Video attachments → 3 files
  Run Test? → checked

Expected pipeline (same as production):
  Submission created (Enrollment pre-linked)
  → 009: 3 Submission Asset rows
  → 013: link/create Video Feedback per asset
  → 070b: each asset → Make (dev) → S3 → Canonical File URL writeback
  → 022: sync URLs to child records

Verify in Testing views:
  Submission Assets — 3 rows, Upload Status = Uploaded, 3 canonical URLs
  Video Feedback — 3 rows ready for coach feedback
```

### Testing views (every submission-data table)

**View name:** `Testing`  
**Filter:** `Enrollment` (or linked enrollment) **=** test enrollment used on Test Intake row

Tables (minimum): Submissions, Submission Assets, Homework Completions, Video Feedback, XP Events, Weekly Athlete Summary, Streak Occurrences, Athlete Achievement Unlocks.

### Workflow

```
1. Test Intake → new row, set Scenario Type + enrollment + scenario (date, shots, 3 video files, …)
2. Check Run Test? → script creates Submission → checkbox clears
3. Wait for automation chain (or run extension audit dry-run on DEV)
4. Open Testing views → confirm URLs, row counts, failures
5. Edit row → check Run Test? again to re-run scenario
```

### V2-015 sequencing

| Order | Item | Environment |
|-------|------|-------------|
| 1 | **066 v3.1** paste + test | DEV — **in progress** |
| 2 | **C-020** Test Intake table + script + Testing views | **DEV build** — **next** |
| 3 | Promotion doc + Mike approval | GitHub |
| 4 | Mirror Test Intake structure to Production | Prod — promote-as-you-go |
| 5 | Optional prod smoke | Schmidt enrollment only (C-019) |

---

## Implementation priority

| Order | Item | Why |
|-------|------|-----|
| 1 | **066 DEV test** (H-002) | Blocks V2-015 done; milestone unlock reference |
| 2 | **C-020** | Fast pipeline testing without Fillout — **next DEV build** |
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
