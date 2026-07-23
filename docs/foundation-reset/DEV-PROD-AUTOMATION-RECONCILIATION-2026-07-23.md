# DEV↔PROD Automation Reconciliation and Capacity Plan — 2026-07-23

**Controlling source of truth:** `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md`

**Mode:** Investigation and documentation only. **No** Airtable automation create/delete/enable/disable/rename/modify was performed.

## 0. Inventory integrity notice

Mike stated DEV≈46 (includes 115; many intentionally OFF) and PROD=50 (no 115). Complete UI name lists were referenced but not found in the Cursor conversation. Presence for PROD-only candidates and 115 follows package assertions; ON/OFF for live Airtable UI remains Unable to verify except where Automations operator table or prior docs attest.

DEV and PROD Automations operator tables both returned 48 nearly identical rows including 032/033/063/111. That table is NOT a reliable live UI presence/ON-OFF source for this reconciliation. Mike UI export still required.

### Reconstructed presence model (needs Mike UI confirmation)

| Set | Count | Members |
|-----|------:|---------|
| DEV (asserted) | 46 | shared core + **115** |
| PROD (asserted) | 50 | shared core + **032, 033, 063, 070c, 111** |
| Shared core (assumed) | 44 | operator-table numbers excluding PROD-only/DEV-only specials |
| DEV-only (asserted) | 1 | 115 |
| PROD-only candidates (asserted) | 5 | 032, 033, 063, 070c, 111 |
| UI presence unverified (repo extras) | 12 | 022, 067, 116, 117, 117a, 117b, 117c, 117d, 117e, 117f, 118, 119 |

Arithmetic from operator table: shared core listed = **44** (48 operator rows minus 032/033/063/111). Adding asserted DEV-only **115** ⇒ **45** (Mike asserts **46** — **gap of 1**). Adding asserted PROD-only five ⇒ **49** (Mike asserts **50** — **gap of 1**). Likely explanation: one additional shared UI automation not in the Automations operator table (candidates: **022**, **116**, or **117**), and/or one extra DEV-only and one extra PROD-only. **Confirm with UI exports — do not migrate on this arithmetic alone.**

## 1. Executive findings

1. **DEV 030 does not replace PROD 030+032+033.** Repo 030 only copies Grade Band.
2. **063 and 111 are not proven obsolete.** Create-time Grade Band copy in 020/013 does not retire the repair helpers until merge waves execute.
3. **070c remains required** for the async `Accepted` video upload verify path with 070b/Lambda.
4. **Confirmed duplicate writers / safe retirements:** **112→013**, **043→042** (approved, not yet deleted).
5. **Safest first PROD capacity action:** delete **112** to free the slot for **115**.
6. **Do not delete 032/033/063/070c/111** for capacity — not proven superseded.

## 2. Specific investigations

### prod030_032_033

- **claim:** DEV 030 replaces PROD 030+032+033
- **verdict:** FALSE for current scripts
- **evidence:** 030 PURPOSE: only Grade Band; does not assign Goal Record or Homework; V2-014 merge Planned only

### dev021_vs_prod021

- **verdict:** Unable to verify expansion/replacement
- **evidence:** Repo 021 v2.0 only sets Attachment Upload Status; no proof DEV absorbed other writers

### gradeBand_063_111

- **claim:** Grade Band logic makes 063/111 unnecessary
- **verdict:** NOT PROVEN
- **evidence:** Create-path copy exists in 020/013; merge Planned; scripts still required until merge executed + proven

### 070c

- **claim:** 070c obsolete
- **verdict:** FALSE for async Accepted path
- **evidence:** 070c still required to verify Lambda writeback after 070b Accepted

### 116_117_final_set

- **verdict:** Intended yes (repo + completion master SC-094/097/074)
- **uiPresence:** Unable to verify against asserted 50 PROD count

### unnamed_022

- **verdict:** Keep disposition in V2-014; OFF≠obsolete; UI presence Unable to verify

### 115_slot

- **requiredName:** 115 - Engineering Test Framework - Run Testing Scenario Daily Submission
- **version:** v1.8
- **slotToFreeFirst:** 112
- **installDoc:** docs/foundation-reset/MIKE-ACTION-INSTALL-115-PROD.md

## 3. Confirmed replacements

| Retired | Replaced by | Status | Evidence |
|---------|-------------|--------|----------|
| 112 | 013 | Approved retirement (V2-014); delete not yet executed | Same VF create path; 112 wrong key; keep 013 |
| 043 | 042 | Approved retirement (V2-014); delete not yet executed | 042 assigns Level Gate Rule |

## 4. Confirmed duplicate writers

| Pair | Area | Keep | Retire |
|------|------|------|--------|
| 013 / 112 | Video Feedback create from Submission Assets | 013 | 112 |
| 042 / 043 | Enrollment Level Gate Rule | 042 | 043 |

## 5. Safe deletion candidates (capacity)

| Rank | # | Why | Slot gain | Mike must confirm |
|-----:|---|-----|----------:|-------------------|
| 1 | 112 | Approved Category F retire; duplicate of 013; historically OFF | 1 | PROD UI shows 112 OFF and no recent required runs |
| 2 | 043 | Approved Category F retire; superseded by 042 | 1 | 042 live script assigns Level Gate Rule; 043 has no unique writes still needed |

## 6. Capacity plan (keep PROD ≤ 50 at every step)

- **Limit:** 50
- **Current PROD count:** 50
- **Free slots now:** 0

### Exact first change

- **Change:** Delete PROD automation 112
- **Why safest:** Only candidate with approved retirement + duplicate-writer proof + historically OFF; does not remove a PROD-only pipeline helper
- **Frees slot for:** 115
- **Rollback:** Recreate 112 OFF from GitHub script; restore prior trigger from Automations inventory

### Staged steps

#### Step 1: Delete PROD automation 112 (Create Video Feedback from Submission Asset)

- **evidence:** V2-014 Category F; duplicate of 013; OFF—monitor period documented
- **testAfter:** Create video Submission Asset on Schmidt; confirm 013 still creates/links Video Feedback; no 112 run needed
- **rollback:** Recreate automation 112 from repo script 112-*.js (v2.1), leave OFF, restore trigger conditions from PROD inventory row
- **freeSlotsAfter:** 1

#### Step 2: Install Automation 115 in the freed slot

- **evidence:** SC-001 approved; MIKE-ACTION-INSTALL-115-PROD.md
- **testAfter:** Dry Run then live Testing Scenario on Schmidt enrollment
- **rollback:** Disable/delete 115; do not restore 112 unless video path regresses
- **freeSlotsAfter:** 0
- **when115Installs:** Immediately after Step 1 succeeds and video path smoke test passes
- **replacesWith:** 115 v1.8 from repo

#### Step 3: Optional: delete PROD 043 after 042 attestation

- **evidence:** V2-014 Category F; 042 owns gate rule
- **testAfter:** Force Level Recalc Needed on Schmidt; confirm gate rule set by 042 only
- **rollback:** Recreate 043 from repo 043-*.js v2.0, leave OFF
- **freeSlotsAfter:** 1

#### Step 4: Do NOT delete 032/033/063/070c/111 for capacity

- **evidence:** Not proven superseded; required until merge waves execute
- **freeSlotsAfter:** unchanged

**When 115 can be installed:** after Step 1 delete of **112** and video-path smoke test (freeSlotsAfter=1).

**Additional future slots:** up to **2** from approved retirements (112+043). Category C merges are **not** counted until executed.

**Recommended final PROD count (near-term):** 50 — Keep at 50 after swapping 112→115; then optionally drop to 49 by retiring 043

## 7. Mike verification checklist

- [ ] Paste complete DEV UI automation list (name + ON/OFF + trigger type) into repo evidence
- [ ] Paste complete PROD UI automation list confirming exactly 50 and naming the 2 slots beyond the 48 operator-table rows
- [ ] Confirm 112 is OFF in PROD UI before delete
- [ ] Confirm whether 022 / 116 / 117 / 117f / 118 / 119 exist in DEV and/or PROD UI
- [ ] Confirm DEV truly lacks 032/033/063/070c/111 (operator table still lists them)
- [ ] Attest live script versions for critical path after any paste

## 8. Comparison matrix (one row per automation)

Full machine-readable fields are in the companion JSON. Condensed table:

| # | Classification | DEV? | PROD? | Repo ver | Migration action | Risk | Mike decision |
|---|----------------|------|-------|----------|------------------|------|---------------|
| 001 | Keep PROD as-is | True | True | v5.1 | No capacity action; optional later version paste from repo after attestation | Low | No |
| 002 | Keep PROD as-is | True | True | v8.1 | No capacity action; optional later version paste from repo after attestation | Low | No |
| 003 | Keep PROD as-is | True | True | v2.0 | No capacity action; optional later version paste from repo after attestation | Low | No |
| 005 | Keep PROD as-is | True | True | v4.0 | No capacity action; optional later version paste from repo after attestation | Low | No |
| 006 | Keep PROD as-is | True | True | v3.0 | No capacity action; optional later version paste from repo after attestation | Low | No |
| 007 | Keep PROD as-is | True | True | v2.0 | No capacity action; optional later version paste from repo after attestation | Low | No |
| 008 | Keep PROD as-is | True | True | — | No capacity action; optional later version paste from repo after attestation | Low | No |
| 009 | Keep PROD as-is | True | True | v1.0 | No capacity action; optional later version paste from repo after attestation | Low | No |
| 010 | Keep PROD as-is | True | True | 10.4 | No capacity action; optional later version paste from repo after attestation | Low | No |
| 013 | Keep PROD as-is | True | True | v2.0 | No capacity action; optional later version paste from repo after attestation | Low | No |
| 020 | Keep PROD as-is | True | True | v2.3 | No capacity action; optional later version paste from repo after attestation | Low | No |
| 021 | Keep PROD as-is | True | True | v2.0 | No capacity action; optional later version paste from repo after attestation | Low | No |
| 022 | Decision needed | None | None | v1.1 | Mike UI attestation required before keep/remove/add | High | Yes |
| 023 | Keep PROD as-is | True | True | v2.0 | No capacity action; optional later version paste from repo after attestation | Low | No |
| 030 | Keep PROD as-is | True | True | v3.0 | No capacity action; optional later version paste from repo after attestation | Low | No |
| 031 | Keep PROD as-is | True | True | v3.1 | No capacity action; optional later version paste from repo after attestation | Low | No |
| 032 | PROD-only and still required | False | True | v3.2 | Keep in PROD until merge/retirement proven; do not delete for 115 capacity | High | No |
| 033 | PROD-only and still required | False | True | v3.1 | Keep in PROD until merge/retirement proven; do not delete for 115 capacity | High | No |
| 034 | Keep PROD as-is | True | True | v3.4 | No capacity action; optional later version paste from repo after attestation | Low | No |
| 041 | Keep PROD as-is | True | True | 3.0 | No capacity action; optional later version paste from repo after attestation | Low | No |
| 042 | Keep PROD as-is | True | True | 3.1 | No capacity action; optional later version paste from repo after attestation | Low | No |
| 043 | Legacy and safe to remove | True | True | v2.0 | After Mike UI confirms OFF/superseded: delete PROD automation 043 to free 1 slot | Medium | Yes |
| 053 | Keep PROD as-is | True | True | 5.2 | No capacity action; optional later version paste from repo after attestation | Low | No |
| 054 | Keep PROD as-is | True | True | v5.5 | No capacity action; optional later version paste from repo after attestation | Low | No |
| 055 | Keep PROD as-is | True | True | v3.2 | No capacity action; optional later version paste from repo after attestation | Low | No |
| 056 | Keep PROD as-is | True | True | v1.2 | No capacity action; optional later version paste from repo after attestation | Low | No |
| 057 | Keep PROD as-is | True | True | 1.3 | No capacity action; optional later version paste from repo after attestation | Low | No |
| 058 | Keep PROD as-is | True | True | 1.0 | No capacity action; optional later version paste from repo after attestation | Low | No |
| 059 | Keep PROD as-is | True | True | v3.5 | No capacity action; optional later version paste from repo after attestation | Low | No |
| 061 | Keep PROD as-is | True | True | — | No capacity action; optional later version paste from repo after attestation | Low | No |
| 063 | PROD-only and still required | False | True | v2.0 | Keep in PROD until merge/retirement proven; do not delete for 115 capacity | High | No |
| 064 | Keep PROD as-is | True | True | 2026 | No capacity action; optional later version paste from repo after attestation | Low | No |
| 065 | Keep PROD as-is | True | True | v9.2 | No capacity action; optional later version paste from repo after attestation | Low | No |
| 066 | Keep PROD as-is | True | True | v3.2 | No capacity action; optional later version paste from repo after attestation | Low | No |
| 067 | Decision needed | None | None | v2.0 | Mike UI attestation required before keep/remove/add | High | Yes |
| 070a | Keep PROD as-is | True | True | v4.1 | No capacity action; optional later version paste from repo after attestation | Low | No |
| 070b | Keep PROD as-is | True | True | v4.4 | No capacity action; optional later version paste from repo after attestation | Low | No |
| 070c | PROD-only and still required | False | True | v1.1 | Keep in PROD until merge/retirement proven; do not delete for 115 capacity | High | No |
| 071 | Keep PROD as-is | True | True | v3.4 | No capacity action; optional later version paste from repo after attestation | Low | No |
| 072 | Keep PROD as-is | True | True | v3.8 | No capacity action; optional later version paste from repo after attestation | Low | No |
| 073 | Keep PROD as-is | True | True | v3.2 | No capacity action; optional later version paste from repo after attestation | Low | No |
| 074 | Keep PROD as-is | True | True | v2.1 | No capacity action; optional later version paste from repo after attestation | Low | No |
| 075 | Keep PROD as-is | True | True | v3.0 | No capacity action; optional later version paste from repo after attestation | Low | No |
| 076 | Keep PROD as-is | True | True | v6.4 | No capacity action; optional later version paste from repo after attestation | Low | No |
| 077 | Keep PROD as-is | True | True | v5.0 | No capacity action; optional later version paste from repo after attestation | Low | No |
| 078 | Keep PROD as-is | True | True | — | No capacity action; optional later version paste from repo after attestation | Low | No |
| 101 | Keep PROD as-is | True | True | v5.5 | No capacity action; optional later version paste from repo after attestation | Low | No |
| 111 | PROD-only and still required | False | True | v1.1 | Keep in PROD until merge/retirement proven; do not delete for 115 capacity | High | No |
| 112 | Legacy and safe to remove | True | True | v2.1 | After Mike UI confirms OFF/superseded: delete PROD automation 112 to free 1 slot | Medium | Yes |
| 113 | Keep PROD as-is | True | True | v6.2 | No capacity action; optional later version paste from repo after attestation | Low | No |
| 114 | Keep PROD as-is | True | True | v5.8 | No capacity action; optional later version paste from repo after attestation | Low | No |
| 115 | Add missing DEV automation to PROD | True | False | v1.8 | Free 1 PROD slot first, then create/paste 115 per MIKE-ACTION-INSTALL-115-PROD.m | Low | No |
| 116 | Decision needed | None | None | v1.0.1 | Mike UI attestation required before keep/remove/add | High | Yes |
| 117 | Decision needed | None | None | v1.1.1 | Mike UI attestation required before keep/remove/add | High | Yes |
| 117a | Decision needed | None | None | v1.1.0 | Mike UI attestation required before keep/remove/add | High | Yes |
| 117b | Decision needed | None | None | v1.1.0 | Mike UI attestation required before keep/remove/add | High | Yes |
| 117c | Decision needed | None | None | v1.1.0 | Mike UI attestation required before keep/remove/add | High | Yes |
| 117d | Decision needed | None | None | v1.2.0 | Mike UI attestation required before keep/remove/add | High | Yes |
| 117e | Decision needed | None | None | v1.2.0 | Mike UI attestation required before keep/remove/add | High | Yes |
| 117f | Decision needed | None | None | v1.1 | Mike UI attestation required before keep/remove/add | High | Yes |
| 118 | Decision needed | None | None | v1.1 | Mike UI attestation required before keep/remove/add | High | Yes |
| 119 | Decision needed | None | None | v1.1 | Mike UI attestation required before keep/remove/add | High | Yes |

## 9. Detailed matrix notes (PROD-only + critical)

### Automation 021

- **DEV name:** 021 - Submission Intake and Asset Creation - Set Attachment Upload Status
- **PROD name:** 021 - Submission Intake and Asset Creation - Set Attachment Upload Status
- **Present DEV/PROD:** True / True
- **Presence basis:** assumed shared core (operator table lists both bases; package math implies shared≈45). UI attestation still required.
- **DEV/PROD ON-OFF:** Live / Live
- **Triggers:** When a Record Matches Condition / When a Record Matches Condition
- **Repo:** `airtable/automations/shooting-challenge/021-submission-intake-and-asset-creation-set-attachment-upload-status.js` @ v2.0
- **Purpose:** - Runs from one Submissions record. - Checks whether the submission has files in: 1) HW Sub 1 2) HW Sub 2 3) Video Upload - Sets Submissions → Attachment Upload Status to: - No Files when no upload fields contain files. - Processing when one or more upload fields contain files. -
- **Tables R/W:** ['Submissions'] / ['Submissions']
- **Fields written:** ['Attachment Upload Status']
- **Make/Lambda/email/Fillout/web/SourceKey:** Make=None; Lambda=None; email=None; Fillout=None; web=None; key=None
- **DEV replaces PROD version?** False
- **Absorbed by?** None
- **Classification:** Keep PROD as-is
- **Migration action:** No capacity action; optional later version paste from repo after attestation
- **Risk:** Low
- **Evidence:** 021 sets Attachment Upload Status only; does not create assets; expand/replace of PROD 021 not proven; assumed shared core (operator table lists both bases; package math implies shared≈45). UI attestation still required.
- **Mike decision needed:** False

### Automation 022

- **DEV name:** 022 - 022-submission-intake-sync-child-upload-writeback-from-submission-asset.js
- **PROD name:** 022 - (name from repo 022-submission-intake-sync-child-upload-writeback-from-submission-asset.js)
- **Present DEV/PROD:** None / None
- **Presence basis:** repo script exists; live UI presence Unable to verify (not in Automations operator table and not in package PROD-only/DEV-only lists)
- **DEV/PROD ON-OFF:** Unable to verify — many DEV automations intentionally OFF per Mike; operator Status≠live UI ON/OFF / Unable to verify
- **Triggers:** None / None
- **Repo:** `airtable/automations/shooting-challenge/022-submission-intake-sync-child-upload-writeback-from-submission-asset.js` @ v1.1
- **Purpose:** - Runs from one Submission Assets record after Make (or 070a/070b) updates upload state. - Copies upload status, Drive URLs/IDs, upload error, and uploaded-at from the asset to the linked Homework Completion or Video Feedback child record. - Submission Assets remain the upload pi
- **Tables R/W:** ['Submission Assets'] / ['Homework Completions', 'Video Feedback']
- **Fields written:** None
- **Make/Lambda/email/Fillout/web/SourceKey:** Make=Post-Make/Lambda child writeback sync; Lambda=None; email=None; Fillout=None; web=None; key=None
- **DEV replaces PROD version?** False
- **Absorbed by?** None
- **Classification:** Decision needed
- **Migration action:** Mike UI attestation required before keep/remove/add
- **Risk:** High
- **Evidence:** V2-014 Keep; OFF≠obsolete; UI presence Unable to verify; repo script exists; live UI presence Unable to verify (not in Automations operator table and not in package PROD-only/DEV-only lists)
- **Mike decision needed:** True

### Automation 030

- **DEV name:** 030 - Weekly Summary and Goal Logic - Copy Enrollment Grade Band to Weekly Summary
- **PROD name:** 030 - Weekly Summary and Goal Logic - Copy Enrollment Grade Band to Weekly Summary
- **Present DEV/PROD:** True / True
- **Presence basis:** assumed shared core (operator table lists both bases; package math implies shared≈45). UI attestation still required.
- **DEV/PROD ON-OFF:** Live / Live
- **Triggers:** When a Record Matches Condition / When a Record Matches Condition
- **Repo:** `airtable/automations/shooting-challenge/030-weekly-summary-and-goal-logic-copy-enrollment-grade-band-to-weekly-summary.js` @ v3.0
- **Purpose:** - Runs from one Weekly Athlete Summary record. - Reads the linked Enrollment. - Reads the Enrollment's Grade Band. - Writes that Grade Band to Weekly Athlete Summary → Grade Band. IMPORTANT DESIGN RULES - This automation only copies Grade Band. - It does not assign Goal Record. -
- **Tables R/W:** ['Weekly Athlete Summary', 'Enrollments'] / ['Weekly Athlete Summary']
- **Fields written:** ['Grade Band']
- **Make/Lambda/email/Fillout/web/SourceKey:** Make=None; Lambda=None; email=None; Fillout=None; web=None; key=None
- **DEV replaces PROD version?** False
- **Absorbed by?** None
- **Classification:** Keep PROD as-is
- **Migration action:** No capacity action; optional later version paste from repo after attestation
- **Risk:** Low
- **Evidence:** 030 docblock: only copies Grade Band; does not assign Goal Record or Homework; assumed shared core (operator table lists both bases; package math implies shared≈45). UI attestation still required.
- **Mike decision needed:** False

### Automation 032

- **DEV name:** 032 - Weekly Summary and Goal Logic - Link Goal Record to Weekly Athlete Summary
- **PROD name:** 032 - Weekly Summary and Goal Logic - Link Goal Record to Weekly Athlete Summary
- **Present DEV/PROD:** False / True
- **Presence basis:** package assertion (listed as PROD-only candidate)
- **DEV/PROD ON-OFF:** Unable to verify — many DEV automations intentionally OFF per Mike; operator Status≠live UI ON/OFF / Live
- **Triggers:** When a Record Matches Condition / When a Record Matches Condition
- **Repo:** `airtable/automations/shooting-challenge/032-weekly-summary-and-goal-logic-link-challenge-goal-record-to-weekly-athlete-summary.js` @ v3.2
- **Purpose:** - Runs from one Weekly Athlete Summary record. - Reads the linked Grade Band. - Finds the matching Target Goal Shots record for the entire challenge. - Matches Target Goal Shots by Grade Band only. - Requires Target Goal Shots.Active? to be checked if that field exists. - Writes 
- **Tables R/W:** ['Weekly Athlete Summary', 'Target Goal Shots'] / ['Weekly Athlete Summary']
- **Fields written:** ['Goal Record']
- **Make/Lambda/email/Fillout/web/SourceKey:** Make=None; Lambda=None; email=None; Fillout=None; web=None; key=None
- **DEV replaces PROD version?** False
- **Absorbed by?** NOT absorbed by current repo 030 (030 only copies Grade Band)
- **Classification:** PROD-only and still required
- **Migration action:** Keep in PROD until merge/retirement proven; do not delete for 115 capacity
- **Risk:** High
- **Evidence:** Separate Goal Record writer; merge with 030+033 only Planned in V2-014; package assertion (listed as PROD-only candidate)
- **Mike decision needed:** False

### Automation 033

- **DEV name:** 033 - Weekly Summary and Goal Logic - Assign Homework to Weekly Athlete Summary
- **PROD name:** 033 - Weekly Summary and Goal Logic - Assign Homework to Weekly Athlete Summary
- **Present DEV/PROD:** False / True
- **Presence basis:** package assertion (listed as PROD-only candidate)
- **DEV/PROD ON-OFF:** Unable to verify — many DEV automations intentionally OFF per Mike; operator Status≠live UI ON/OFF / Live
- **Triggers:** When a Record Matches Condition / When a Record Matches Condition
- **Repo:** `airtable/automations/shooting-challenge/033-weekly-summary-and-goal-logic-assign-homework-to-weekly-athlete-summary.js` @ v3.1
- **Purpose:** - Runs from one Weekly Athlete Summary record. - Reads the linked Week. - Reads the linked Grade Band. - Finds matching homework/curriculum records in FBC Curriculum - SYNC. - Matches homework by Week + Grade Band. - Filters to Active? = checked, if that field exists. - Filters t
- **Tables R/W:** ['Weekly Athlete Summary', 'FBC Curriculum - SYNC'] / ['Weekly Athlete Summary']
- **Fields written:** ['Homework']
- **Make/Lambda/email/Fillout/web/SourceKey:** Make=None; Lambda=None; email=None; Fillout=None; web=None; key=None
- **DEV replaces PROD version?** False
- **Absorbed by?** NOT absorbed by current repo 030 (030 only copies Grade Band)
- **Classification:** PROD-only and still required
- **Migration action:** Keep in PROD until merge/retirement proven; do not delete for 115 capacity
- **Risk:** High
- **Evidence:** Separate Homework writer; merge with 030+032 only Planned in V2-014; package assertion (listed as PROD-only candidate)
- **Mike decision needed:** False

### Automation 043

- **DEV name:** 043 - Levels and Progression - Set Level Gate Rule from Next Level
- **PROD name:** 043 - Levels and Progression - Set Level Gate Rule from Next Level
- **Present DEV/PROD:** True / True
- **Presence basis:** assumed shared core (operator table lists both bases; package math implies shared≈45). UI attestation still required.
- **DEV/PROD ON-OFF:** Live / Live
- **Triggers:** When a Record Matches Condition / When a Record Matches Condition
- **Repo:** `airtable/automations/shooting-challenge/043-levels-and-progression-set-level-gate-rule-from-next-level.js` @ v2.0
- **Purpose:** - Reads one Enrollment record. - Reads the linked Next Level. - Finds the matching Level Gate Rules record where Level = Next Level. - Preferably uses only active Level Gate Rules when Version Active? exists. - Writes the matching Level Gate Rule into Enrollments.Level Gate Rule.
- **Tables R/W:** ['Enrollments', 'Level Gate Rules'] / ['Enrollments', 'Level Gate Rules']
- **Fields written:** None
- **Make/Lambda/email/Fillout/web/SourceKey:** Make=None; Lambda=None; email=None; Fillout=None; web=None; key=None
- **DEV replaces PROD version?** False
- **Absorbed by?** 042 (assigns Level Gate Rule; V2-014 Category F)
- **Classification:** Legacy and safe to remove
- **Migration action:** After Mike UI confirms OFF/superseded: delete PROD automation 043 to free 1 slot
- **Risk:** Medium
- **Evidence:** V2-014 Category F retire; 042 owns gate assignment; assumed shared core (operator table lists both bases; package math implies shared≈45). UI attestation still required.
- **Mike decision needed:** True

### Automation 063

- **DEV name:** 063 - Homework Review and XP - Copy Enrollment Grade Band to Homework Completion
- **PROD name:** 063 - Homework Review and XP - Copy Enrollment Grade Band to Homework Completion
- **Present DEV/PROD:** False / True
- **Presence basis:** package assertion (listed as PROD-only candidate)
- **DEV/PROD ON-OFF:** Unable to verify — many DEV automations intentionally OFF per Mike; operator Status≠live UI ON/OFF / Live
- **Triggers:** When a Record Matches Condition / When a Record Matches Condition
- **Repo:** `airtable/automations/shooting-challenge/063-homework-review-and-xp-copy-enrollment-grade-band-to-homework-completion.js` @ v2.0
- **Purpose:** - Runs from one Homework Completions record. - Reads the linked Enrollment record. - Pulls the linked Grade Band from the Enrollment record. - Writes that Grade Band back to the Homework Completions record. FOLDER - 06 - Homework Review and XP AUTOMATION NAME - 063 - Homework Rev
- **Tables R/W:** ['Homework Completions', 'Enrollments'] / ['Homework Completions']
- **Fields written:** ['Grade Band']
- **Make/Lambda/email/Fillout/web/SourceKey:** Make=None; Lambda=None; email=None; Fillout=None; web=None; key=None
- **DEV replaces PROD version?** False
- **Absorbed by?** Planned merge into 020 (V2-014) — NOT executed
- **Classification:** PROD-only and still required
- **Migration action:** Keep in PROD until merge/retirement proven; do not delete for 115 capacity
- **Risk:** High
- **Evidence:** 020 may set Grade Band at create; 063 still listed; merge→020 Planned only; package assertion (listed as PROD-only candidate)
- **Mike decision needed:** False

### Automation 070c

- **DEV name:** 070c - 070c-email-notifications-and-external-handoffs-verify-async-video-asset-upload.js
- **PROD name:** 070c - (name from repo 070c-email-notifications-and-external-handoffs-verify-async-video-asset-upload.js)
- **Present DEV/PROD:** False / True
- **Presence basis:** package assertion (listed as PROD-only candidate)
- **DEV/PROD ON-OFF:** Unable to verify — many DEV automations intentionally OFF per Mike; operator Status≠live UI ON/OFF / Unable to verify
- **Triggers:** None / None
- **Repo:** `airtable/automations/shooting-challenge/070c-email-notifications-and-external-handoffs-verify-async-video-asset-upload.js` @ v1.1
- **Purpose:** See automation-index / script header
- **Tables R/W:** ['Submission Assets'] / ['Submission Assets']
- **Fields written:** ['Send to Make Trigger (clear when verified)']
- **Make/Lambda/email/Fillout/web/SourceKey:** Make=Companion to 070b async Accepted path; Lambda=Verifies Lambda writeback fields; email=None; Fillout=None; web=None; key=None
- **DEV replaces PROD version?** False
- **Absorbed by?** None
- **Classification:** PROD-only and still required
- **Migration action:** Keep in PROD until merge/retirement proven; do not delete for 115 capacity
- **Risk:** High
- **Evidence:** 070c PURPOSE: required for async Accepted verify; not for sync full JSON path; package assertion (listed as PROD-only candidate)
- **Mike decision needed:** False

### Automation 111

- **DEV name:** 111 - Video Review and XP - Copy Enrollment Grade Band to Video Feedback
- **PROD name:** 111 - Video Review and XP - Copy Enrollment Grade Band to Video Feedback
- **Present DEV/PROD:** False / True
- **Presence basis:** package assertion (listed as PROD-only candidate)
- **DEV/PROD ON-OFF:** Unable to verify — many DEV automations intentionally OFF per Mike; operator Status≠live UI ON/OFF / Live
- **Triggers:** When a Record Matches Condition / When a Record Matches Condition
- **Repo:** `airtable/automations/shooting-challenge/111-video-review-and-xp-copy-enrollment-grade-band-to-video-feedback.js` @ v1.1
- **Purpose:** - Runs from one Video Feedback record. - Reads the linked Enrollment record. - Pulls the linked Grade Band from the Enrollment record. - Writes that Grade Band back to the Video Feedback record. FOLDER - 11 - Video Review and XP AUTOMATION NAME - 111 - Video Review and XP - Copy 
- **Tables R/W:** ['Video Feedback', 'Enrollments'] / ['Video Feedback']
- **Fields written:** ['Grade Band']
- **Make/Lambda/email/Fillout/web/SourceKey:** Make=None; Lambda=None; email=None; Fillout=None; web=None; key=None
- **DEV replaces PROD version?** False
- **Absorbed by?** Planned merge into 013 (V2-014) — NOT executed
- **Classification:** PROD-only and still required
- **Migration action:** Keep in PROD until merge/retirement proven; do not delete for 115 capacity
- **Risk:** High
- **Evidence:** 013 may set Grade Band at create; 111 still listed; merge→013 Planned only; package assertion (listed as PROD-only candidate)
- **Mike decision needed:** False

### Automation 112

- **DEV name:** 112 - Video Review and XP - Create Video Feedback from Submission Asset
- **PROD name:** 112 - Video Review and XP - Create Video Feedback from Submission Asset
- **Present DEV/PROD:** True / True
- **Presence basis:** assumed shared core (operator table lists both bases; package math implies shared≈45). UI attestation still required.
- **DEV/PROD ON-OFF:** Live / Live
- **Triggers:** When a Record Matches Condition / When a Record Matches Condition
- **Repo:** `airtable/automations/shooting-challenge/112-video-review-and-xp-create-video-feedback-from-submission-asset.js` @ v2.1
- **Purpose:** - Runs from one Submission Assets record. - Creates one linked Video Feedback record when the asset is routed to Video Feedback. - Uses the Submission Asset record ID as the stable Video Feedback Key. - Prevents duplicate Video Feedback records by checking: 1. Submission Assets →
- **Tables R/W:** None / None
- **Fields written:** None
- **Make/Lambda/email/Fillout/web/SourceKey:** Make=None; Lambda=None; email=None; Fillout=None; web=None; key=None
- **DEV replaces PROD version?** False
- **Absorbed by?** 013 (duplicate VF create path; V2-014 Category F)
- **Classification:** Legacy and safe to remove
- **Migration action:** After Mike UI confirms OFF/superseded: delete PROD automation 112 to free 1 slot
- **Risk:** Medium
- **Evidence:** V2-014 Category F retire; duplicate of 013; OFF—monitor then delete; assumed shared core (operator table lists both bases; package math implies shared≈45). UI attestation still required.
- **Mike decision needed:** True

### Automation 115

- **DEV name:** 115 - Engineering Test Framework - Run Testing Scenario Daily Submission
- **PROD name:** None
- **Present DEV/PROD:** True / False
- **Presence basis:** package assertion (DEV includes 115; PROD missing 115)
- **DEV/PROD ON-OFF:** Unable to verify — many DEV automations intentionally OFF per Mike; operator Status≠live UI ON/OFF / N/A — not in PROD
- **Triggers:** None / None
- **Repo:** `airtable/automations/shooting-challenge/115-engineering-test-framework-run-testing-scenario-daily-submission.js` @ v1.8
- **Purpose:** - Runs from one Testing Scenarios record when Run Test? is checked. - Scenario Types: Daily Submission, Homework, Video (+ C025_STAGE17_DOWNSTREAM via Other/Perfect Week). - Intake scenarios: create one production-shaped Submission (Enrollment + Athlete pre-linked). - C025 scenar
- **Tables R/W:** ['Testing Scenarios', 'Submissions', 'Enrollments'] / ['Testing Scenarios', 'Submissions']
- **Fields written:** None
- **Make/Lambda/email/Fillout/web/SourceKey:** Make=None; Lambda=None; email=None; Fillout=Creates Fillout-shaped Submissions; not a Fillout replacement; web=None; key=None
- **DEV replaces PROD version?** False
- **Absorbed by?** None
- **Classification:** Add missing DEV automation to PROD
- **Migration action:** Free 1 PROD slot first, then create/paste 115 per MIKE-ACTION-INSTALL-115-PROD.md
- **Risk:** Low
- **Evidence:** SC-001 allows PROD paste; repo v1.8; PROD slot blocked at 50; package assertion (DEV includes 115; PROD missing 115)
- **Mike decision needed:** False

### Automation 116

- **DEV name:** 116 - 116-submission-assets-apply-asset-reuse-decision-consequences.js
- **PROD name:** 116 - (name from repo 116-submission-assets-apply-asset-reuse-decision-consequences.js)
- **Present DEV/PROD:** None / None
- **Presence basis:** repo script exists; live UI presence Unable to verify (not in Automations operator table and not in package PROD-only/DEV-only lists)
- **DEV/PROD ON-OFF:** Unable to verify — many DEV automations intentionally OFF per Mike; operator Status≠live UI ON/OFF / Unable to verify
- **Triggers:** None / None
- **Repo:** `airtable/automations/shooting-challenge/116-submission-assets-apply-asset-reuse-decision-consequences.js` @ v1.0.1
- **Purpose:** - Runs from one Submission Asset when Mike updates Asset Reuse Decision. - Keeps Lambda detection separate from operator consequences. - Confirmed Duplicate → zero XP (deactivate ledger row, block future award). - Approved Reuse / False Positive → restore XP idempotently when rev
- **Tables R/W:** ['Submission Assets', 'Video Feedback', 'Homework Completions', 'XP Events', 'Enrollments'] / ['Submission Assets', 'Video Feedback', 'Homework Completions', 'XP Events', 'Enrollments']
- **Fields written:** None
- **Make/Lambda/email/Fillout/web/SourceKey:** Make=None; Lambda=None; email=None; Fillout=None; web=None; key=VIDEO_SUBMISSION| / HOMEWORK_XP| consequences
- **DEV replaces PROD version?** False
- **Absorbed by?** None
- **Classification:** Decision needed
- **Migration action:** Mike UI attestation required before keep/remove/add
- **Risk:** High
- **Evidence:** Intended production asset-reuse path; UI presence Unable to verify; repo script exists; live UI presence Unable to verify (not in Automations operator table and not in package PROD-only/DEV-only lists)
- **Mike decision needed:** True

### Automation 117

- **DEV name:** 117 - 117-zoom-recording-credit-orchestrator.js
- **PROD name:** 117 - (name from repo 117-zoom-recording-credit-orchestrator.js)
- **Present DEV/PROD:** None / None
- **Presence basis:** repo script exists; live UI presence Unable to verify (not in Automations operator table and not in package PROD-only/DEV-only lists)
- **DEV/PROD ON-OFF:** Unable to verify — many DEV automations intentionally OFF per Mike; operator Status≠live UI ON/OFF / Unable to verify
- **Triggers:** None / None
- **Repo:** `airtable/automations/shooting-challenge/117-zoom-recording-credit-orchestrator.js` @ v1.1.1
- **Purpose:** - Single DEV automation for Stage 17 recording-quiz credit: normalize → coach review sync → create/soft-void XP → report gate/PW eligibility. - Replace incorrect "Recording Quiz Submitted At is one week from now" trigger. IMPORTANT DESIGN RULES - NEVER write Zoom Meetings → Atten
- **Tables R/W:** ['Zoom Attendance', 'Zoom Meetings', 'XP Events'] / ['Zoom Attendance', 'Zoom Meetings', 'XP Events']
- **Fields written:** None
- **Make/Lambda/email/Fillout/web/SourceKey:** Make=None; Lambda=None; email=None; Fillout=None; web=None; key=ZOOM_CREDIT|{Enrollment}|{Meeting}
- **DEV replaces PROD version?** False
- **Absorbed by?** None
- **Classification:** Decision needed
- **Migration action:** Mike UI attestation required before keep/remove/add
- **Risk:** High
- **Evidence:** Stage 17 orchestrator intended final Zoom recording path; UI presence vs PROD count Unable to verify; repo script exists; live UI presence Unable to verify (not in Automations operator table and not in package PROD-only/DEV-only lists)
- **Mike decision needed:** True

## 10. Companion file

- `docs/foundation-reset/DEV-PROD-AUTOMATION-RECONCILIATION-2026-07-23.json`

## 11. Next approved migration package (recommended)

**Name:** PROD Slot Recovery for Automation 115 (112 delete → 115 paste)

**Includes:** Mike UI confirm 112 OFF → delete 112 → smoke-test 013 video path → paste 115 v1.8 → Dry Run + live Schmidt scenario → update Automations operator table.

**Explicitly excluded:** deleting 032/033/063/070c/111; merging 030+032+033; enabling 070a; weekly schedule 118/119 enable.

---

*Generated 2026-07-23. No Airtable automation mutations in this package.*
