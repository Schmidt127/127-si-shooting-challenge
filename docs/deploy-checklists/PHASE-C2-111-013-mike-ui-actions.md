# Mike UI actions — Phase C2 (111→013)

**Repo prep is done.** Meta automations API returns **403** — paste/retire in Airtable UI.

**Do not start Phase D. Do not touch 117. Do not touch Folder 07 OFF. Do not touch PROD.**

---

## Evidence already green (Cursor)

| Gate | Result |
|------|--------|
| Offline contracts | `tools/airtable/tests/test_phase_c2_013_combined.py` |
| Rollback | `_rollback/phase-c2-013-111-2026-07-14/` |
| Combined SoT | `013-submission-intake-create-or-link-video-feedback.js` **v3.0.0** |
| 111 path | Library stub in GitHub (leave **111 ON** in DEV UI until smoke PASS) |
| Pre-paste live smoke | `docs/overnight-runs/results/S25-phase-c2-live-smoke-result.md` |

---

## Step 1 — Update surviving automation **013** (first Airtable UI action)

1. DEV → Automations → open **013**.
2. Confirm name:  
   `013 - Submission Intake - Create or Link Video Feedback`
3. Paste script from (skip GitHub header):  
   `airtable/automations/shooting-challenge/013-submission-intake-create-or-link-video-feedback.js`
4. Input: `recordId` = triggering Submission Assets record.
5. Keep existing 013 trigger (Submission Assets video-ready conditions).
6. Optional output mapping: `gradeBandActionOut`.
7. Leave **013 ON**. Leave **111 ON** until post-paste smoke PASS.

### Smoke checklist (Cursor post-paste + your eyes)

| Test | Expect |
|------|--------|
| New VF create via video asset | VF created; Grade Band set from Enrollment when blank |
| Link existing VF | Asset linked; **no** duplicate VF |
| Blank Grade Band repair | Empty VF GB → fills from Enrollment |
| Already-correct GB | No overwrite churn |
| Existing valid GB that differs | **Not** overwritten (blank-only) |
| Missing Enrollment GB | Soft-skip GB; no invent |
| Repeated edits | Idempotent |
| Adjacent 113 / 114 / 070b | No new errors (feedback prep / video XP / Make send) |

If **critical** fail → restore `_rollback/phase-c2-013-111-2026-07-14/` and **stop**.

Reply after paste: **“013 pasted — run post-paste smoke”**

---

## Step 2 — After post-paste PASS, retire **111**

1. Delete automation **111** from DEV UI (consolidation, not “because OFF”).
2. Confirm inventory math: **46 estimated / 4 free** (no visible Airtable counter).
3. Reply: **“Phase C2 UI complete”**

---

## Occupancy note

Airtable exposes **no visible** automations counter. Counts are **estimated** from the authoritative inventory + retirement history.
