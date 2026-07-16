# C-009 — HW17 Attachment Intake — DEV Installation Packet

**Status:** Repository package **ready for DEV installation design** — **not installed / not verified** in live Airtable by this commit  
**Base:** DEV only `appTetnuCZlCZdTCT`  
**PROD:** Do not paste or enable until DEV evidence + Mike approval  
**Backlog:** C-009 · Wave 8  
**Authority:** Completed Airtable readiness audit + overnight C-010/C-019 contracts · [homework-flow.md](../data-flow/homework-flow.md) § HW17 · Stage-9 LA review  
**Script:** `067-homework-link-or-create-completion-from-reflection-quiz.js` (current **v1.0** — attachment path not yet in GitHub)  
**Downstream:** **020** (file path), **070a** (Make upload), **071** (parent email; already Fillout-aware)  
**Hard stops:** No PROD · No live Make send · No secrets in git · No schema create without Mike/OMNI

---

## 0. Problem statement (from readiness audit)

Today **067** bridges `Final Reflection Quiz Submissions` → `Homework Completions` only:

| Does | Does **not** |
|------|----------------|
| Find/create completion by Enrollment + Week + HW17 | Create **Submission** |
| Link quiz ↔ completion | Create **Submission Assets** |
| Stamp `Source System` = Fillout | Copy **Airtable Attachment** |
| Leave coach review / 064→065 untouched | Arm **070a** (`Send to Make Trigger` / Pending Link) |
| | Set `Item Slot` / `Asset Slot` |

Coach views, Upload Ready formulas, **020**, and **070a** assume file-based assets. **071** already special-cases Fillout (quiz summary/score without assets) — do **not** add Upload Ready / assets to the **071** trigger.

**Preferred path (owner):** Fillout exports a **PDF attachment** so HW17 rejoins the normal asset → Make → coach pipeline.

---

## 1. Pre-flight (DEV, read-only / OMNI)

| # | Check | Expected | Done |
|---|-------|----------|------|
| 0.1 | Base ID | `appTetnuCZlCZdTCT` | [ ] |
| 0.2 | Curriculum row | Exactly one Active `Homework Number` = `HW 17` with one Week | [ ] |
| 0.3 | Quiz table fields | Enrollment, Homework Completion, Submitted At, Processing Status/Error, Score / Quiz Result Summary | [ ] |
| 0.4 | **Attachment field on quiz** | Confirm whether Fillout now writes a file field | [ ] **UNKNOWN** |
| 0.5 | Attachment field name | Exact label if present | [ ] **UNKNOWN** |
| 0.6 | Schmidt enrollment | `recgP9qZYjAhE7NXm` available for fixture | [ ] |
| 0.7 | **070a / 071** DEV state | Note ON/OFF; do not enable PROD | [ ] |

Capture screenshots before schema edits.

---

## 2. Authoritative correction design (Path A — PDF → assets)

### 2.1 Scope of Automation **067** rewrite (target behavior)

After existing quiz → Homework Completion link/create succeeds, **067** must:

1. **Create Submission Assets** (one per attachment file)
2. **Link** each asset to the correct Homework Completion (and parent Submission when created)
3. **Map HW slot** = `HW1` / Homework 1 (single HW17 assignment — not HW2)
4. **Avoid duplicates** via `Source Attachment ID` (+ completion identity already used)
5. **Support multiple attachments** (loop files; never collapse into one asset)
6. **Remain compatible with 070a and 071**
   - 070a: asset has `Airtable Attachment`, `Upload Destination` = Homework Completions, `Upload Status` = Pending Link, linked Homework Completions; arm `Send to Make Trigger` only when upload path is intended
   - 071: keep Fillout path; do not require assets on 071 trigger

### 2.2 Optional parent Submission

| Option | When | Notes |
|--------|------|-------|
| **A1 — Assets only** | Coach/upload path can run from assets → completion | Smaller change; confirm coach views |
| **A2 — Create/link Submission** | Parity with daily HW file intake | Fields: Enrollment, Week, `Homework Name 1` = HW17 label, `HW Sub 1` attachment if Fillout lands there instead |

**Default for DEV install:** **A2** when Fillout can write to a Submissions-shaped row **or** when OMNI confirms coach views require Submissions. Otherwise **A1**.

### 2.3 Exact algorithm (post completion link/create)

```text
GIVEN quizRecord, homeworkCompletionId, enrollmentId, weekId, homeworkCurriculumId
PRECONDITION: completion already linked (created_new | linked_existing)

1. Resolve attachment source (first match wins; document which exists in DEV):
   a. quiz.[ATTACHMENT_FIELD]   // UNKNOWN name — OMNI confirm
   b. OR linked Submission.HW Sub 1
   If none → actionOut append note `no_attachment_yet`; leave completion as today; do NOT error.

2. Ensure parent Submission (if Option A2):
   - Find Submission by Enrollment + Week + homework-17 identity (or create)
   - Link completion ↔ Submission (Submissions - Linked / HW links per schema)
   - Dedupe: never create second Submission for same Enrollment|Week|HW17

3. For each attachment file in order:
   a. sourceAttachmentId = stable id from Airtable attachment object (009 pattern)
   b. If Submission Asset exists with same Source Attachment ID → link to completion if needed; skip create
   c. Else create Submission Asset:
        Enrollment - Linked     = enrollmentId
        Submission - Linked     = submissionId (if A2)
        Airtable Attachment     = [file]
        Source Attachment ID    = sourceAttachmentId
        Original File Name      = file.filename (if field exists)
        Asset Purpose           = Homework 1          // UNKNOWN if option label differs
        Asset Slot              = HW1                 // UNKNOWN if option label differs
        Asset Type              = Homework PDF        // UNKNOWN if option label differs
        Asset Label             = HW17 / quiz PDF (text)
        Upload Status           = Pending Link
        Upload Destination      = Homework Completions
        Send to Make Trigger    = false               // arm only after Mike enables 070a DEV test
        Homework Completions    = [homeworkCompletionId]
   d. Link asset onto Homework Completions.Submission Assets (merge, do not replace)

4. Stamp completion slots (if writable):
   - Item Slot / Asset Slot = HW1 (verify option names in DEV)

5. Do NOT:
   - Mark Satisfactory / Review Complete
   - Create XP Events (064→065 only)
   - Clear Fillout Source System
   - Call Make directly

6. Outputs:
   - statusOut = success | skipped | error
   - actionOut = created_new | linked_existing | assets_created | assets_linked |
                 skipped_already_linked | needs_review | no_attachment_yet | error
   - assetIdsOut (comma-separated) when assets touched
```

### 2.4 Duplicate avoidance

| Layer | Rule |
|-------|------|
| Completion | Existing: `EnrollmentId\|WeekId\|HomeworkId` + re-query before create |
| Quiz already linked | Existing: `skipped_already_linked` |
| Asset | `Source Attachment ID` unique per file (009 pattern) |
| Multi-file | One asset per file; second quiz resubmit merges links, does not clone assets with same Source Attachment ID |
| 070a | Idempotent upload status ladder — do not reset Completed uploads |

### 2.5 070a / 071 compatibility matrix

| Automation | Required from C-009 | Must not break |
|------------|---------------------|----------------|
| **070a** | Asset with attachment + Pending Link + destination Homework Completions + HC link | Leave OFF in PROD; DEV test only with Mike auth |
| **071** | Fillout detection (`Source System` = Fillout + quiz link) still works if assets missing | Trigger must **not** require Upload Ready / assets |
| **020** | Optional — if assets created with slot, 020 may no-op if HC already linked | Do not double-create HC |
| **064 / 065** | Unchanged — coach Satisfactory path | Never award from 067 |

---

## 3. Schema / field checklist (DEV)

### 3.1 Final Reflection Quiz Submissions

| Field | Type | Action |
|-------|------|--------|
| `Enrollment` | Link | Verify |
| `Homework Completion` | Link | Verify |
| `Submitted At` | DateTime | Verify |
| `Processing Status` | Single select: Pending / Processed / Error / Needs Review | Verify |
| **`[Quiz PDF Attachment]`** | Attachment | **Create or confirm** — name **UNKNOWN** until OMNI |
| Q1–Q18 / Score / Quiz Result Summary | Existing | Do not rename |

### 3.2 Submission Assets (write targets)

| Field | Value / notes |
|-------|----------------|
| `Enrollment - Linked` | Required |
| `Submission - Linked` | Required if Option A2 |
| `Airtable Attachment` | Required for 070a |
| `Source Attachment ID` | Dedupe key |
| `Asset Purpose` | Homework 1 — **verify option** |
| `Asset Slot` | HW1 — **verify option** |
| `Asset Type` | Homework PDF — **verify option** |
| `Upload Status` | Pending Link |
| `Upload Destination` | Homework Completions |
| `Send to Make Trigger` | false until DEV 070a test |
| `Homework Completions` | Link to HC |

### 3.3 Homework Completions

| Field | Action |
|-------|--------|
| Existing 067 stamps | Keep |
| `Submission Assets` | Merge links from 067 |
| `Submissions - Linked` | If A2 |
| `Item Slot` / `Asset Slot` | Set HW1 if writable — **UNKNOWN** option labels |

---

## 4. Automation UI (DEV)

| Item | Value |
|------|-------|
| Name | `067 - Homework - Link or Create Completion from Reflection Quiz` |
| Trigger table | Final Reflection Quiz Submissions |
| Recommended trigger | Record **created**, or Processing Status = Pending, Enrollment not empty |
| Input | `recordId` |
| Outputs | `statusOut`, `actionOut`, `errorOut`, `debugStep`, `quizSubmissionId`, `homeworkCompletionId`, `assetIdsOut` (new) |
| After paste | Leave **OFF** until §6 tests pass |

**Paste rules:** GitHub → skip GitHub header → paste production docblock through EOF.

---

## 5. Script version plan

| Step | Action |
|------|--------|
| 1 | Keep current v1.0 behavior for completion bridge until attachment field confirmed |
| 2 | Rewrite **067** to **v2.0** with SECTION for asset intake (full section rewrite per automation standard) |
| 3 | Offline contract tests in `tools/airtable/tests/test_c009_hw17_attachment_contract.py` |
| 4 | DEV paste + fixture on Schmidt |
| 5 | Only then consider PROD promotion checklist (separate) |

Until v2.0 lands in GitHub, this packet is the **exact correction spec** Mike/OMNI/Cursor implement against.

---

## 6. DEV test plan (Schmidt)

**Enrollment:** `recgP9qZYjAhE7NXm` (Active? = false — pipeline must still run)

| ID | Action | Expected |
|----|--------|----------|
| C009-T1 | Quiz row, no attachment | HC linked/created; `no_attachment_yet` or equivalent; Processing = Processed |
| C009-T2 | Quiz row, **one** PDF | 1 Submission Asset; linked to HC; slot HW1; Pending Link; Source Attachment ID set |
| C009-T3 | Same quiz re-run | No second HC; no second asset for same Source Attachment ID |
| C009-T4 | Quiz with **two** files | Two assets; both linked; distinct Source Attachment IDs |
| C009-T5 | 070a DEV (Mike auth) | Upload progresses without duplicate HC |
| C009-T6 | 071 path | Email package builds from quiz summary **without** requiring assets on trigger |
| C009-T7 | Coach Satisfactory → 065 | One `HOMEWORK_XP\|{hcId}` |

---

## 7. Rollback

1. Re-paste prior **067 v1.0** from GitHub tag/commit.  
2. Leave orphan test assets; delete only under Mike-approved cleanup.  
3. Do not delete quiz or HC production rows.  
4. Turn automation OFF if asset creates mis-fire.

---

## 8. Unresolved field-name uncertainties

| Item | Status |
|------|--------|
| Quiz attachment field exact name | **UNKNOWN** |
| Whether Fillout writes quiz attachment vs Submissions `HW Sub 1` | **UNKNOWN** |
| `Asset Purpose` / `Asset Slot` / `Asset Type` option labels | **UNKNOWN** — verify in DEV |
| Whether coach views require parent Submission | **UNKNOWN** — drives A1 vs A2 |
| Live 067 trigger conditions in DEV/PROD UI | **UNKNOWN** |

---

## 9. Mike approvals needed

1. Confirm Fillout PDF attachment field name (or approve OMNI field create).  
2. Choose Option **A1** (assets only) vs **A2** (create Submission).  
3. Authorize DEV paste of 067 v2.0 + named fixture run.  
4. Authorize whether DEV 070a may arm `Send to Make Trigger` for Schmidt-only test.  
5. No PROD until DEV evidence + separate promotion checklist.

---

## 10. Related

- Audit: `airtable/extension-scripts/audits/audit-homework17-reflection-quiz-pipeline.js`
- Backfill: `airtable/extension-scripts/safe-backfills/backfill-homework17-completions-from-reflection-quiz.js`
- Offline tests: `tools/airtable/tests/test_c009_hw17_attachment_contract.py`
- C-019 Testing views: [C019_DEV_TESTING_VIEWS.md](./C019_DEV_TESTING_VIEWS.md)
