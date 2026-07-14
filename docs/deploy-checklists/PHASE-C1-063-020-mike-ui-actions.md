# Mike UI actions — Phase C1 (063→020)

**Repo prep is done.** Meta automations API returns **403** — paste/retire in Airtable UI.

**Do not start C2. Do not touch 117. Do not touch Folder 07 OFF. Do not touch PROD.**

---

## Evidence already green (Cursor)

| Gate | Result |
|------|--------|
| Offline contracts | See `test_phase_c1_020_combined.py` |
| Rollback | `_rollback/phase-c1-020-063-2026-07-14/` |
| Combined SoT | `020-homework-link-or-create-homework-completion.js` **v3.0.0** |
| 063 path | Library stub |

---

## Step 1 — Update surviving automation **020**

1. DEV → Automations → open **020**.
2. Keep name or confirm:  
   `020 - Homework - Link or Create Homework Completion`
3. Paste script from (skip GitHub header):  
   `airtable/automations/shooting-challenge/020-homework-link-or-create-homework-completion.js`
4. Input: `recordId` = triggering Submission Assets record.
5. Keep existing 020 trigger (Submission Assets homework-ready conditions).
6. Optional output mapping: `gradeBandActionOut`.
7. Leave **020 ON**. Leave **063 ON** until smoke PASS.

### Smoke checklist (before retiring 063)

| Test | Expect |
|------|--------|
| New HC create via homework asset | HC created; Grade Band set (Submission or Enrollment) |
| Link existing HC | Asset linked; no duplicate HC |
| Blank Grade Band repair | Empty HC GB → fills from Enrollment |
| Already-correct GB | No overwrite churn |
| Missing Enrollment GB | Soft-skip GB; no invent |
| Repeated edits | Idempotent |
| Adjacent 061 / 064 / 065 / 067 | No new errors (reviewed / base XP / HW XP / reflection) |

If **critical** fail → restore `_rollback/phase-c1-020-063-2026-07-14/` and **stop**.

---

## Step 2 — After smoke PASS, retire **063**

1. Delete automation **063** from DEV UI (consolidation, not “because OFF”).
2. Confirm inventory math: **47 estimated / 3 free** (no visible Airtable counter).
3. Reply: **“Phase C1 UI complete”**

---

## Occupancy note

Airtable exposes **no visible** automations counter. Counts are **estimated** from the authoritative 50-item inventory + consolidation history.
