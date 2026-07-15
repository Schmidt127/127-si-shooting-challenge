# Automation 022 — Identity + Mike rename verification

**Status:** Identified from GitHub (2026-07-14 S26) — **no Airtable changes by Cursor**  
**DEV UI symptom:** Automation shows as **`022 -`** (blank/truncated name)

---

## Exact intended identity

| Field | Value |
|-------|-------|
| Number | **022** |
| Full name | `022 - Submission Intake - Sync Child Upload Writeback from Submission Asset` |
| GitHub SoT | `airtable/automations/shooting-challenge/022-submission-intake-sync-child-upload-writeback-from-submission-asset.js` |
| Folder | `02 - Submission Intake and Asset Creation` |
| Version (header) | v1.1 (2026-06-21) |
| Required? | **Yes** — post-Make child writeback for HW + Video paths |

## Purpose

After Make (070a/070b) updates a Submission Asset upload state, **022** copies Drive URLs/IDs, upload status, errors, and uploaded-at onto the linked **Homework Completion** or **Video Feedback** child. Assets remain upload SoT; children stay in sync.

## Trigger (recommended)

| Item | Value |
|------|-------|
| Table | Submission Assets |
| Conditions | Upload Status ∈ {Uploaded, Processing, Error}; Upload Destination ∈ {Homework Completions, Video Feedback}; child link not empty |
| Input | `recordId` from triggering Submission Asset |
| Do not trigger on | Upload Status = Pending Link |

## Adjacent automations

| Auto | Relation |
|------|----------|
| 009 | Creates assets |
| 013 / 020 | Create/link VF / HC (not replaced by 022) |
| 070a / 070b | Make upload writers (022 syncs *after*) |
| 070c | Async verify path only |

## Diagnosis

Blank UI name **`022 -`** is almost certainly a **rename/label drift** in Airtable UI — not missing script. Index + GitHub agree on full name and path.

## Mike verification sheet (UI only)

1. Open DEV Automations → find **`022 -`** (or search 022).
2. Confirm script body matches GitHub SoT (compare PURPOSE / Version v1.1).
3. Set automation **name** to:  
   `022 - Submission Intake - Sync Child Upload Writeback from Submission Asset`
4. Confirm trigger table = Submission Assets; conditions align with recommended set above.
5. Confirm input `recordId` mapped.
6. Leave ON/OFF unchanged unless intentionally testing upload writeback (often needed ON for upload E2E).
7. Reply: **`022 rename verified`** or note mismatches.

## Rollback

N/A for rename-only. Script restore: GitHub file above.

## Out of scope tonight

No paste required unless script mismatch found. Do not delete 022.
