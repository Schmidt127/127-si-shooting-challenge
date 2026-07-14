# Mike UI actions — Phase A (006∪021 → free slot → 117)

**Repo prep is done.** Meta automations API returns **403** — paste/create must be in Airtable UI.

**Do not touch Folder 07 OFF automations. Do not start Phase B. Do not touch PROD.**

---

## Evidence already green (Cursor)

| Gate | Result |
|------|--------|
| Offline contracts | **13/13 PASS** `test_phase_a_021_combined` |
| Live API mirror (decision+write) | **PASS** `docs/audits/phase-a-021-combined-live-dev-2026-07-14.json` |
| Live Video Count repair while Processing | **PASS** `docs/audits/phase-a-021-repair-path-2026-07-14.json` |
| Rollback copies | `_rollback/phase-a-006-021-2026-07-14/` |

---

## Step 1 — Update automation **021** (keep its slot)

1. DEV → Automations → open **021** (Set Attachment Upload Status).
2. Rename to:  
   `021 - Submission Intake and Asset Creation - Set Attachment Status and Video Count`
3. Paste script from (skip GitHub header):  
   `airtable/automations/shooting-challenge/021-submission-intake-and-asset-creation-set-attachment-status-and-video-count.js`
4. Input: `recordId` from trigger Submissions record.
5. Trigger (recommended):
   - **When a record is updated**
   - Watch: `HW Sub 1`, `HW Sub 2`, `Video Upload`
   - Match **ANY**:  
     - Attachment Upload Status is empty  
     - Attachment Upload Status is No Files  
     - Video Upload is not empty AND Video Count is empty  
6. Leave **021 ON**. Leave **006 ON** until Step 3.

### Smoke in Airtable (before retiring 006)

| Test | Expect |
|------|--------|
| Submission with Video only, status empty/No Files | Status → Processing; Video Count = file count |
| HW only | Status → Processing; Video Count = 0 |
| Both | Status → Processing; Video Count = video files |
| Already correct | Skip / no churn |
| Status = Sent + videos | Status stays Sent; Video Count may update |
| After Processing + Week + Enrollment | **009** still creates assets |

If any **critical** fail → restore `_rollback/phase-a-006-021-2026-07-14/` scripts into 006/021 and **stop** (do not create 117).

---

## Step 2 — Confirm +1 free then retire **006**

After Step 1 smoke PASS:

1. Turn **006 OFF** (or delete 006 automation) — free **one** slot.  
   This is consolidation handoff, not “delete because OFF.”
2. Confirm Automations counter shows **≤49/50** (one free).

---

## Step 3 — Create **117** OFF

1. Create automation:  
   `117 - Zoom Recording Credit - Orchestrator`  
   Folder: `17 - Zoom Recording Credit`
2. Paste:  
   `airtable/automations/shooting-challenge/117-zoom-recording-credit-orchestrator.js`  
   (skip GitHub header)
3. Inputs:
   - `recordId` (Zoom Attendance)
   - `webhookUrl` — **leave blank**
4. Trigger can be configured later; leave **OFF**.
5. Do **not** paste 117a–f.

---

## Done when

- [ ] Combined 021 live and smoke PASS  
- [ ] Separate 006 retired  
- [ ] Counter shows free slot used by 117 OFF  
- [ ] Reply to Cursor: “Phase A UI complete”  

Cursor will then finalize docs/CONTROL if anything remains.
