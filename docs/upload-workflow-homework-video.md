# Upload workflow — homework and video (accepted design)

**Status:** Owner-approved architecture — **PROD photo path Live Tested (SC-009, 2026-08-04)**
**Backlog:** SC-009 / SC-010 / C-020 / C-013 / C-023 / SC-150
**Last updated:** 2026-08-05
**Environment:** PROD `appn84sqPw03zEbTT` is the active construction base (see completion master)

**Related:**

- [SC-009 photo homework PROD evidence](./testing/evidence/2026-08-04-sc-009-photo-homework/README.md)
- [SC-009 deploy checklist](./deploy-checklists/SC-009-photo-homework-prod.md)
- [SC-150 reviewer file links](./deploy-checklists/SC-150-prod-reviewer-file-links.md)
- [C-020 script checklist](./deploy-checklists/C-020-testing-scenarios-script-checklist.md)
- [testing-and-intake-architecture.md](./testing-and-intake-architecture.md) — Engineering Test Framework
- [asset-storage-migration.md](./asset-storage-migration.md) — C-013 canonical URL target

---

## PROD photo homework runbook (SC-009)

```
Fillout/API Submission (Enrollment + Week + Homework Name 1 + HW Sub 1 image)
  → 009 creates Submission Asset (Asset Type = Homework Image)
  → 020 finds/creates ONE Homework Completion; Pending Link + Send to Make Trigger
  → 070a payload routeKey=homework_completion + enrollmentId/programInstanceId → Make → PROD Lambda
  → Lambda resolves season from Program Instance `School Year - Linked`, private S3 writeback (Uploaded + Canonical + Storage Key + SHA-256 + Reviewer Access Token)
  → Coach: Satisfactory? + Review Complete + Coach Feedback
  → 064/065 exactly one XP (HOMEWORK_XP|{hcId})
  → 071 parent-feedback ready (Schmidt-only recipients)
```

| Gate | Rule |
|------|------|
| Clickable coach file | **`Reviewer File URL`** (never make Canonical/S3 public) |
| Parent email file link (071 v3.5+) | **`Reviewer File URL` → Google Drive View URL → Google Drive File URL**; filenames are labels only; Make marks Sent? after Gmail |
| Writeback Complete? | Canonical + Storage Key + hash + Uploaded At (not Google Drive) |
| HC Upload Ready? | Linked assets Uploaded **or** legacy HC attachment **or** Fillout quiz |
| Idempotent upload | Canonical present → 070a v4.5 `skipped_already_uploaded`; Lambda retry same |
| One HC / one XP | Enrollment \| Week \| Homework identity; Source Key `HOMEWORK_XP\|{hcId}` |

**Known follow-up:** Make may return `Accepted` without Airtable writeback — verify Module → PROD Lambda (SC-101). Direct Lambda with 070a payload is proven.

---

## Summary

| Path | Core rule |
|------|-----------|
| **Homework** | One selected assignment → one Submission → up to **3** files → multiple **Submission Assets** → **one Homework Completion** |
| **Video** | One **Video Feedback Focus** + one **Video Feedback Question** per Submission → up to **3** video files → one asset + one **Video Feedback** row **per file** — coach reviews once |

**Rejected:**

- Multiple files → multiple Homework Completions / XP events / parent emails
- Video modeled as homework-style slots (Video 1 Type / Video 2 Type / Video 3 Type)
- Per-video parent focus or per-video parent notes
- Coach must watch a video once to name it, send to Make, then watch again to grade

---

## Homework upload model (locked)

| Rule | Detail |
|------|--------|
| Assignment selection | Exactly **one** homework assignment per intake (Fillout or C-020) |
| Preferred file count | **1** |
| Maximum file count | **3** (MVP; config-driven later) |
| Submission shape | One Fillout-style **Submission** per intake |
| Assets | **009** creates **one Submission Asset per file** |
| Completion | **All** homework assets for that assignment link to **one Homework Completion** |
| Legacy slots | MVP uses **Homework Name 1** + **HW Sub 1** only (HW1 slot). Do **not** populate HW2 for single-assignment intake |
| XP / email | **064/065** and **071** operate on **Homework Completion**, not per file |

### Homework pipeline (production-shaped)

```
Intake (Fillout / C-020)
  → Submission (Enrollment, Activity Date, Homework Name 1, HW Sub 1 [1–3 files])
  → 005 Week
  → 009 → N Submission Assets (HW1-1 … HW1-N)
  → 020 per asset → find/create ONE Homework Completion; merge asset links
  → 070a → Make upload (Production: OFF until production webhook)
  → 022 writeback URL
  → coach review → 064/065 XP → 071 parent email
```

**020 dedupe key:** `Enrollment | Week | Homework` (formula on Homework Completions) — not per file.

---

## Video upload model (locked)

| Rule | Detail |
|------|--------|
| Parent input | **One** Video Feedback Question + **one** Video Feedback Focus for the whole submission |
| Files | Up to **3** videos in one **Video Upload** field |
| Not homework slots | Do **not** use Video 1/2/3 Type fields in final design |
| Per file | Each video → **one Submission Asset** + **one Video Feedback** row |
| Inheritance | All assets and VF rows inherit submission-level Focus + Question |
| Naming before upload | Formatted name from athlete + date + focus + sequence — **before** coach review |
| Coach title | **Coach Video Title** optional after review — improves display; **not** required before **070b** |
| Coach UX | Coach watches **once** in Video Feedback queue |

### Video pipeline (production-shaped)

```
Intake (Fillout / C-020)
  → Submission (Enrollment, Activity Date, Video Feedback Focus, Video Feedback Question, Video Upload [1–3 files])
  → 005 Week
  → 009 → N video Submission Assets (VIDEO-1 … VIDEO-N sequence)
  → 013 per asset → one Video Feedback row; copy Focus + Question
  → naming metadata complete → asset ready for 070b
  → 070b → Make upload using Formatted Upload Name (Production: OFF until production webhook)
  → 022 writeback Canonical/Drive URL
  → coach review once → 113/114 XP → 073 parent email
```

---

## Metadata ownership

| Data | Owner (source of truth) | Copies / lookups |
|------|-------------------------|------------------|
| **Video Feedback Focus** | **Submissions** (intake) | **Submission Assets** (writable copy at **009** for naming formula); **Video Feedback** (writable copy at **013** for coach queue) |
| **Video Feedback Question** | **Submissions** | **Video Feedback** (copy at **013**). MVP map: write to existing **Video Feedback Note** on Submissions until a dedicated **Video Feedback Question** field is added on Submissions |
| **Video files** | **Submissions.Video Upload** (transient intake) | **Submission Assets.Airtable Attachment** (today; transient until C-013) |
| **Asset Sequence** | **Submission Assets** (1–3 per submission video set) | Set by **009** from file index |
| **Formatted Upload Name** | **Submission Assets** | Evolve existing **Create Google Drive File Name** formula; rename to **Formatted Upload Name** in C-013 wave |
| **Upload Naming Status** | **Submission Assets** (formula) | Gates **070b** readiness — not a new automation |
| **Coach Video Title** | **Video Feedback** (coach-written after review) | Optional lookup to assets for display; never required before upload |
| **Canonical File URL** | **Submission Assets** + child (**Video Feedback** / **Homework Completions**) | **022** writeback; C-013 replaces **Google Drive File URL** |
| **Homework assignment** | **Submissions.Homework Name 1** | Lookups on assets; **Homework Completions.Homework** from **020** |

**Principle:** Intake fields live on **Submissions**. Per-file upload and Make payload fields live on **Submission Assets**. Coach queue and review fields live on **Video Feedback** (with inherited intake copies for filtering without submission open).

---

## File limits and config strategy

| Layer | Homework MVP | Video MVP | Long-term |
|-------|--------------|-----------|-----------|
| **115 CONFIG** | `maxHomeworkFiles: 3` | `maxVideoFiles: 3` | Read Config table when wired |
| **C-020 validation** | Block >3 **Intake Attachments** before create | Block >3 **Video Upload** before create | Same |
| **Fillout** | Max 3 files on HW upload; assignment required | Max 3 on Video Upload; Focus + Question required | Assignment-level limits from curriculum |
| **Config table** | Future: **Default Homework File Limit**, **Max Homework File Limit** | Reuse / align **Max Videos Per Submission**; add **Default Video File Limit** if needed | Per-assignment overrides on **FBC Curriculum - SYNC** (post-MVP) |

**File size:** Use small test files on Production (&lt; ~5 MB). Airtable attachment limit ~20 MB/file. Fillout enforces its own upload limits in production intake.

---

## Fillout form design (Wave 8 — C-017)

### Homework section

- Single **homework assignment** picker (linked curriculum / week assignment)
- One file upload control — **max 3 files**, preferred 1
- Fillout validation: assignment required; file count 1–3
- Optional parent note per assignment slot (**HW 1 - Parent Note**) — not required for C-020 MVP

### Video section

- **Video Feedback Question** (long text) — one for whole submission
- **Video Feedback Focus** (single select) — one for whole submission
- **Video Upload** — one multi-file control, max 3
- Fillout validation: Focus + Question required when any video attached; file count 1–3
- Do **not** add per-video type or per-video note fields

---

## Automations affected (later waves — not C-020 script)

| # | Change | New automation? |
|---|--------|-----------------|
| **009** | Homework: unchanged slot HW1. Video: set **Asset Slot** `VIDEO-1`/`VIDEO-2`/`VIDEO-3`; set **Asset Sequence**; copy **Video Feedback Focus** from Submission | **No** — modify script |
| **013** | Copy Submission Focus + Question to new VF row; optional copy to asset if not done in 009 | **No** |
| **020** | No change for homework MVP (already merges multi-asset → one completion) | **No** |
| **070a** | Homework payload unchanged for MVP | **No** |
| **070b** | Read **Formatted Upload Name**; trigger only when **Upload Naming Status** = ready | **No** — tighten trigger condition / formula gate |
| **022** | Write **Canonical File URL** (C-013); today **Google Drive File URL** | **No** |
| **064/065** | No homework XP change (per completion) | **No** |
| **071/073** | Display **Coach Video Title** / presentation fields (C-022) when present | **No** |

**Automation limit risk:** Prefer **formula gates** (`Ready to Send to Make?`, **Upload Naming Status**) and **existing trigger condition** edits over new automations. Upload naming happens in **Make** using metadata from **070b** payload — not a separate Airtable rename automation.

---

## Production safety (external sends)

Per [production-base-setup.md](./production-base-setup.md) — verified OFF on Production:

| Automation | Status |
|------------|--------|
| **070a** homework upload | OFF |
| **070b** video upload | OFF |
| **071** homework parent email | OFF |
| **073** video parent email | OFF |
| **074** weekly summary | OFF |
| **077** daily submission email | OFF |

**C-020 live tests:** Safe through **009 → 020** (homework) or **009 → 013** (video) with uploads OFF. Phase 2: enable production Make webhooks before **070a/070b** live file tests.

---

## Implementation sequence (repo + Production)

| Step | Work | Owner |
|------|------|-------|
| 1 | This doc + checklist + backlog updates | Cursor (done) |
| 2 | OMNI: pipeline metadata fields (see checklist § OMNI) | OMNI / Mike |
| 3 | Formula: **Create Google Drive File Name** includes focus + sequence for video; add **Upload Naming Status** | OMNI |
| 4 | **009** video slot + sequence + focus copy | Cursor |
| 5 | **013** VF metadata copy | Cursor |
| 6 | **070b** readiness formula / trigger (naming gate) | OMNI + Cursor review |
| 7 | **115 v1.1** — Homework branch only | Cursor |
| 8 | Production tests A–D (homework) | Mike |
| 9 | **115 v1.2** — Video branch | Cursor |
| 10 | Production tests (video 1–3 files, naming gate, 070b OFF) | Mike |
| 11 | Commit + push; promotion doc before Production | Mike |

**115 branching order:** **Homework first**, then **Video**. Homework needs fewer schema changes and validates multi-asset → single completion. Video depends on new metadata fields and **009** sequence/naming before meaningful **070b** tests.

---

## Related backlog

| ID | Link |
|----|------|
| **C-020** | [checklist](./deploy-checklists/C-020-testing-scenarios-script-checklist.md) |
| **C-013** | [asset-storage-migration.md](./asset-storage-migration.md) |
| **C-022** | Coach Video Title / public display — emails use presentation labels |
| **C-023** | SHA-256 dedup at upload — not filename |
