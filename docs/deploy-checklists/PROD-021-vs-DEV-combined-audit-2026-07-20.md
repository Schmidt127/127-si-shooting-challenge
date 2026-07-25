# PROD Automation 021 audit vs tested DEV combined script

**Date:** 2026-07-20  
**Updated:** 2026-07-20 (PROD paste + no-file smoke **PASS**)  
**PROD:** `appn84sqPw03zEbTT`  
**DEV:** `appTetnuCZlCZdTCT`

---

## Verdict

# CLOSED — PROD 021 v1.0.0 combined; deleted-006 gap closed

| Layer | Attachment Upload Status | Submissions.`Video Count` writeback |
|-------|--------------------------|-------------------------------------|
| **Tested DEV combined 021** (`v1.0.0`) | Yes | Yes |
| **PROD 021 (live after paste)** | Yes | **Yes** |
| Former PROD **006** | — | **Deleted** (by design; logic in 021) |

**PROD no-file smoke PASS:** Submission `recM0GbWfptu06da1` — status remained **No Files**; Video Count blank → **0**; no duplicate Submission Assets.  
Evidence: [PROD-021-v1.0.0-nofile-smoke-2026-07-20.md](./PROD-021-v1.0.0-nofile-smoke-2026-07-20.md).

---

## Historical finding (pre-paste)

Before the PROD paste, GitHub `master` still held legacy **021 v2.0** (status-only). With **006 deleted**, Video Count writeback was missing until combined **v1.0.0** was pasted. That gap is **closed**.

---

## Evidence

### 1. Tested DEV version (authoritative)

| Item | Value |
|------|--------|
| SoT path (branch `overnight/lead-integration` @ `7f64154`) | `airtable/automations/shooting-challenge/021-submission-intake-and-asset-creation-set-attachment-status-and-video-count.js` |
| Paste copy (this repo) | [PHASE-A-021-combined-v1.0.0-PASTE.txt](./PHASE-A-021-combined-v1.0.0-PASTE.txt) |
| Version | **v1.0.0** (2026-07-14) |
| Supersedes | Former **006** (Video Count) + prior **021** (Attachment Upload Status) |
| Offline contracts | **13/13 PASS** (`tools/airtable/tests/test_phase_a_021_combined.py`) |
| Live DEV smoke | **PASS** 2026-07-14 — on overnight branch |
| PROD no-file smoke | **PASS** 2026-07-20 — `recM0GbWfptu06da1` |

### 2. Legacy GitHub library note

Checkout may still contain status-only  
`021-submission-intake-and-asset-creation-set-attachment-upload-status.js` (**v2.0**) until SoT is promoted from overnight. **PROD Airtable** is the live source for **v1.0.0** after Mike’s paste (no-file smoke PASS).

### 3. Former 006

**PROD deleted.** Video Count writeback is owned by combined **021 v1.0.0**. Repo may keep `006-…-set-video-count.js` as library/rollback only — do not re-enable unless emergency rollback.

### 4. Repo promotion (optional)

Combined SoT still lives primarily on `overnight/lead-integration`; paste file is in `docs/deploy-checklists/PHASE-A-021-combined-v1.0.0-PASTE.txt`. Promote the `.js` onto `master` when Mike approves a docs/SoT sync commit.

---

## Replacement steps (completed in PROD)

Mike pasted combined **v1.0.0** and ran no-file smoke — see [PROD-021-v1.0.0-nofile-smoke-2026-07-20.md](./PROD-021-v1.0.0-nofile-smoke-2026-07-20.md). Historical paste instructions below are retained for rollback/reference only.


### A — Pre-checks

1. Confirm PROD **006** is absent/deleted (Mike).  
2. Confirm PROD **021** script is still status-only (**v2.0**) via UI glance.  
3. Optional: UI-copy current PROD 021 script text into  
   `docs/deploy-checklists/rollback/prod-021-pre-combine-YYYY-MM-DD.txt` before overwrite.

### B — Automation identity

| Field | Exact value |
|-------|-------------|
| **Name** | `021 - Submission Intake and Asset Creation - Set Attachment Status and Video Count` |
| **Folder** | `02 - Submission Intake and Asset Creation` |
| **Version (in script)** | **v1.0.0** |
| **Date Written** | 2026-07-14 |
| **Last Updated** | 2026-07-14 |

### C — Paste source

1. Open [PHASE-A-021-combined-v1.0.0-PASTE.txt](./PHASE-A-021-combined-v1.0.0-PASTE.txt).  
2. Paste into Airtable **starting after** the GitHub header block (first `/* … */` “GitHub Source of Truth…”).  
3. Begin paste at the production docblock:  
   `/************************************************************`  
   `* 021 - Submission Intake and Asset Creation -`  
   `*       Set Attachment Status and Video Count`

Same bytes as:  
`git show overnight/lead-integration:airtable/automations/shooting-challenge/021-submission-intake-and-asset-creation-set-attachment-status-and-video-count.js`

### D — Trigger

| Setting | Exact value |
|---------|-------------|
| **Table** | `Submissions` |
| **Type** | When a record is updated |
| **Watch fields** | `HW Sub 1`, `HW Sub 2`, `Video Upload` |
| **Conditions** | Match **ANY** of: |
| | 1) `Attachment Upload Status` is empty |
| | 2) `Attachment Upload Status` is `No Files` |
| | 3) `Video Upload` is not empty **AND** `Video Count` is empty |

**Note:** Script also corrects `Video Count` when the watch fires while status is already `Processing` (covers former 006 re-fire gap). Do **not** omit HW/Video watch fields.

### E — Input variables

| Name | Source |
|------|--------|
| `recordId` | Airtable record ID of the triggering **Submissions** record (required; must start with `rec`) |

### F — Output variables (create/map all)

| Output | Meaning |
|--------|---------|
| `statusOut` | `success` \| `skipped` \| `error` |
| `errorOut` | Error text or blank |
| `debugStep` | Last step label |
| `actionOut` | Pipe of step actions (e.g. `status_updated\|video_count_updated`) |
| `attachmentStatusOut` | Resulting / preserved status |
| `previousAttachmentStatusOut` | Prior status |
| `videoCountOut` | Computed count from `Video Upload` |
| `existingVideoCountOut` | Prior `Video Count` |
| `hasHwSub1Out` | boolean |
| `hasHwSub2Out` | boolean |
| `hasVideoUploadOut` | boolean |
| `hasAnyFilesOut` | boolean |
| `updatedFields` | Comma-separated field names written |
| `recordId` | Echo of input |

### G — Design rules (must remain true after paste)

- Idempotent: skip each field if already correct.  
- Never clobber terminal attachment statuses (e.g. **Sent**) — only manage empty / `No Files` / `Processing`.  
- Never write formula fields (`Has Video?`, `Has Review Assets?`).  
- Prefer one atomic `updateRecordAsync` for both status + count.  
- Not asset creation (**009**), XP (**010**), VF (**013**), or HW link (**020**).

---

## PROD smoke test (isolated fixture only)

Use a **test** Submission (Schmidt Testing or dedicated synthetic). Do **not** toggle unrelated automations.

| # | Setup | Expect |
|---|--------|--------|
| 1 | Video-only attachment; status empty or `No Files`; `Video Count` blank/wrong | Status → `Processing`; `Video Count` = file count; `actionOut` includes `status_updated` and/or `video_count_updated` |
| 2 | HW only (no video) | Status → `Processing`; `Video Count` = **0** |
| 3 | HW + Video | Status → `Processing`; `Video Count` = video file count |
| 4 | Re-touch same attachments (idempotent) | `statusOut` = `skipped` or no field churn; count unchanged |
| 5 | Status = **Sent** + videos present; force count mismatch if needed | Status stays **Sent**; `Video Count` may update (`status_unmanaged_skip` + `video_count_updated`) |
| 6 | After Processing + Week + Enrollment | **009** still creates Submission Assets as before |
| 7 | Confirm no second asset row on idempotent re-run | Asset count stable |

**Pass bar:** Cases 1–4 and 6–7 green. Case 5 confirms Sent protection.

**Fail → rollback:** Restore pre-combine PROD 021 script from UI backup; do **not** recreate 006 unless Mike authorizes an emergency dual-automation rollback.

---

## Post-paste documentation

After Mike confirms smoke PASS:

1. Update `docs/automation-index.md` row for **021** (combined name + path).  
2. Note **006** retired in PROD in `AUTOMATION_VERSION_INVENTORY.md` / capacity ledger.  
3. Promote combined SoT file onto the integration/`master` line when Mike approves (currently overnight-only).  
4. `CHANGELOG.md` under **Airtable** if production-impacting paste is accepted.

---

## Safety this audit

| Action | Done? |
|--------|-------|
| Change automation ON/OFF | **No** |
| Paste to PROD | **No** (packet only) |
| Recreate 006 | **No** |
| Live PROD API reads | **No** (token 401) |
