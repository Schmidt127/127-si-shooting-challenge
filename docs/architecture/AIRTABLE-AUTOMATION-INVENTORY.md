# Airtable Automation Inventory — DEV

**Base:** `appTetnuCZlCZdTCT` (DEV)  
**As-of:** 2026-07-14  
**Stage:** S21 — Architecture Review (analysis only — **no Airtable mutations**)  
**Hard cap:** 50 (ON and OFF both consume slots)

---

## Task Classification

| Field | Value |
|-------|-------|
| Type | Architecture / capacity |
| Phase | 3 (docs) — recommendations only |
| Correct tool | Cursor (analysis) · Mike UI for ON/OFF attestation |
| Repo | `127-si-shooting-challenge` |
| Backlog | C-025 capacity + V2-014 modernization |

---

## Evidence hierarchy

| Rank | Source | Authority for UI slots |
|------|--------|------------------------|
| **1** | Mike Automations UI (name + ON/OFF) | **AUTHORITATIVE** — **full list still required** |
| **2** | Mike attestation 2026-07-14 | DEV **at limit**; **112 not in UI** |
| **3** | Live REST Automations **documentation** table (48 rows) | Triggers/conditions reference only — **not occupancy** |
| **4** | Meta `GET …/automations` | **HTTP 403** — unavailable |
| **5** | `docs/automation-index.md`, C-023/C-020/C-013 checklists | Strong inference for UI-known gaps |
| **6** | GitHub scripts + V2-014 Wave 2A | Design / merge taxonomy — **not occupancy** |

**Rule:** Docs-table `Status=Live` is **not** proof a UI slot exists (**112** counterexample).

Live slim snapshot: [`docs/audits/DEV-automations-doc-table-slim-2026-07-14.json`](../audits/DEV-automations-doc-table-slim-2026-07-14.json)

---

## Working model — 50 UI slots

Mike reports **50/50**. Best-fit reconciliation:

```
48 (docs rows)
 − 2 (008 stale; 112 not in UI)
 + 4 (116, 115, 022, 067 — known UI / checklist, missing from docs)
 = 50
```

**If 070c is also ON in UI**, model breaks (>50) → another stale doc row or unlisted deletion must exist. Treat **070c UI presence as uncertain**.

| Status | Meaning |
|--------|---------|
| **UI-confirmed** | Mike attestation or checklist with E2E paste |
| **Docs-inferred** | Docs table row; UI assumed until contradicted |
| **Reconciled add** | Missing from docs; assumed in UI for 50/50 model |
| **Stale doc** | In docs; **not** a DEV UI slot |
| **Pending** | Not pasted yet (117) |

---

## Folder 01 first (001–003)

| # | Exact docs name | Trigger (docs) | Tables R/W | Rank | Notes |
|---|-----------------|----------------|------------|------|-------|
| **001** | `001 - Enrollment Intake and Setup - Find or Create Athlete and Link Enrollment` *(docs name may have leading space)* | Enters view · Enrollments | Athletes + Enrollments | **Needs investigation** | Docs conditions look **swapped with 002** vs GitHub intent |
| **002** | `002 - Enrollment Intake and Setup - Assign Grade Band - Initial` | Enters view · Enrollments | Grade Bands + Enrollments | **Combine with conditions** | After 001; shares logic with 003 |
| **003** | `003 - Enrollment Intake and Setup - Assign Grade Band - If Grade Changes` | Enters view · Enrollments · Grade Band Refresh Needed=1 | Grade Bands + Enrollments | **Keep separate** | Distinct lifecycle; do not fold into 002 unconditionally |

**Folder 01 finding:** Do **not** merge into one enrollment orchestrator until Mike confirms live 001/002 trigger views. See [DEPENDENCY-MAP](./AIRTABLE-AUTOMATION-DEPENDENCY-MAP.md).

---

## Full inventory (ranked)

Legend — **Rank:** Keep separate · Combine safely · Combine with conditions · Retire safely · Rename only · Needs investigation

| # | Exact / short name | Est. UI | Docs? | GH? | ON/OFF | Trigger table | External | Rank | Evidence |
|---|--------------------|---------|-------|-----|--------|---------------|----------|------|----------|
| 001 | Find or Create Athlete | Y | Y | Y | ? | Enrollments | — | Needs investigation | Docs vs script mismatch |
| 002 | Assign Grade Band — Initial | Y | Y | Y | ? | Enrollments | — | Combine with conditions | After 001 |
| 003 | Assign Grade Band — If Grade Changes | Y | Y | Y | ? | Enrollments | — | Keep separate | Refresh path |
| 005 | Assign Week — Homework First | Y | Y | Y | ? | Submissions | — | Keep separate | C-018 calendar |
| 006 | Set Video Count | Y | Y | Y | ? | Submissions | — | Combine safely | →021 |
| 007 | Duplicate Checker | Y | Y | Y | ? | Submissions | — | Keep separate | |
| 008 | Mark XP Processing | **N** | Y stale | — | — | — | — | Rename only | Replaced by **116** |
| 009 | Create Submission Assets | Y | Y | Y | ? | Submissions | — | Keep separate | High risk path |
| 010 | Create XP Event from Submission | Y | Y | Y | ? | Submissions | — | Keep separate | Core XP |
| 013 | Create or Link Video Feedback | Y | Y | Y | ? | Submission Assets | — | Keep separate | Absorb 111 |
| 020 | Link/Create Homework Completion | Y | Y | Y | ? | Submission Assets | — | Keep separate | Absorb 063 |
| 021 | Set Attachment Upload Status | Y | Y | Y | ? | Submissions | — | Combine safely | ←006 |
| 022 | Sync Child Upload Writeback | Y | **N** | Y | ? | Submission Assets | Make/S3 writeback | Keep separate | Reconciled add |
| 023 | Assign Enrollment to Submission | Y | Y | Y | ? | Submissions | — | Keep separate | |
| 030 | Copy Grade Band → WAS | Y | Y | Y | ? | WAS | — | Combine with conditions | WAS trio |
| 031 | Find/Create WAS | Y | Y | Y | ? | Submissions | — | Keep separate | |
| 032 | Link Goal → WAS | Y | Y | Y | ? | WAS | — | Combine with conditions | WAS trio |
| 033 | Assign Homework → WAS | Y | Y | Y | ? | WAS | — | Combine with conditions | WAS trio |
| 034 | Previous Week Helpers | Y | Y | Y | ? | WAS | — | Keep separate | |
| 041 | Mark Level Recalc | Y | Y | Y | ? | XP Events | — | Keep separate | Never merge→010 |
| 042 | Assign Current/Next Level | Y | Y | Y | ? | Enrollments | — | Keep separate | Owns gate rule |
| 043 | Set Level Gate Rule | **?** | Y | Y | ? | Enrollments | — | Retire safely | **If UI confirms**; Cat F |
| 053 | Streak Occurrences Rebuild | Y | Y | Y | ? | Submissions | — | Keep separate | |
| 054 | Streak XP Event | Y | Y | Y | ? | Streak Occurrences | — | Keep separate | |
| 055 | Update Current Streak | Y | Y | Y | ? | Submissions | — | Keep separate | |
| 056 | Daily Streak Refresh | Y | Y | Y | ? | Scheduled | — | Keep separate | |
| 057 | Perfect Week Eligibility | Y | Y | Y | ? | WAS | — | Keep separate | ≠058 |
| 058 | Perfect Week Unlock | Y | Y | Y | ? | WAS | — | Keep separate | ≠057 |
| 059 | XP from Achievement Unlock | Y | Y | Y | ? | Unlocks | — | Keep separate | |
| 061 | Mark HW Reviewed | **?** | Y | **N** | ? | Homework Completions | — | Needs investigation | Likely retire if UI ON |
| 063 | Copy Grade Band → HW | Y | Y | Y | ? | Homework Completions | — | Combine with conditions | →020 |
| 064 | Assign Base Homework XP | Y | Y | Y | ? | Homework Completions | — | Keep separate | ≠065 |
| 065 | Create Homework XP Event | Y | Y | Y | ? | Homework Completions | — | Keep separate | ≠064 |
| 066 | Shot Milestone Unlocks | Y | Y | Y | ? | Enrollments | — | Keep separate | V2 reference |
| 067 | HW from Reflection Quiz | Y | **N** | Y | ? | Final Reflection Quiz | Fillout | Keep separate | Reconciled add |
| 070a | Send HW Asset → Make | Y | Y | Y | ? | Submission Assets | Make/Lambda/S3 | Keep separate | Idle OFF practice |
| 070b | Send Video Asset → Make | Y | Y | Y | ? | Submission Assets | Make/Lambda/S3 | Keep separate | |
| 070c | Verify Async Video Upload | **?** | **N** | Y | ? | Submission Assets | Lambda | Needs investigation | Optional async path |
| 071 | HW Feedback Email Webhook | Y | Y | Y | ? | Homework Completions | Make | Combine with conditions | EMC later |
| 072 | Build Weekly Email | Y | Y | Y | ? | WAS | — | Combine with conditions | EMC |
| 073 | VF Parent Email Webhook | Y | Y | Y | ? | Video Feedback | Make | Combine with conditions | EMC |
| 074 | Send Weekly Email → Make | Y | Y | Y | ? | WAS | Make | Combine with conditions | EMC |
| 075 | Build Welcome Email | Y | Y | Y | ? | Enrollments | — | Combine with conditions | EMC |
| 076 | Build Daily Email | Y | Y | Y | ? | Submissions | — | Combine with conditions | EMC |
| 077 | Send Daily Email → Make | Y | Y | Y | ? | Submissions | Make | Combine with conditions | EMC |
| 078 | Mark HW Parent Feedback Ready | **?** | Y | **N** | ? | Homework Completions | — | Needs investigation | Likely retire; 065 arms 071 |
| 101 | Award Meeting XP | Y | Y | Y | ? | Zoom Meetings | — | Keep separate | Live Zoom |
| 111 | Copy Grade Band → VF | Y | Y | Y | ? | Video Feedback | — | Combine with conditions | →013 |
| 112 | Create VF from Asset | **N** | Y stale | Y | — | — | — | Rename only | **Not in DEV UI** |
| 113 | Assign Base Video XP | Y | Y | Y | ? | Video Feedback | — | Keep separate | ≠114 |
| 114 | Create/Update Video XP | Y | Y | Y | ? | Video Feedback | — | Keep separate | ≠113 |
| 115 | Engineering Test Framework | Y | **N** | Y | ? | Testing Scenarios | — | Keep separate | Test-only · never retire for slots |
| 116 | Asset Reuse Consequences | Y | **N** | Y | ? | Submission Assets | — | Keep separate | Replaced 008 |
| 117 | Zoom Recording Orchestrator | **N** | — | Y | — | Zoom Attendance | Make optional | Keep separate | **Pending +1** |
| 117a–f | Library only | **N** | — | Y | — | — | — | Rename only | Do **not** paste ×6 |

---

## Duplicate / obsolete / superseded / legacy / test

| Class | Codes | Action |
|-------|-------|--------|
| **Superseded** | 043 (by 042); 112 (by 013); 008 (by 116) | Retire / docs cleanup |
| **Legacy no-GH** | 061, 078 | UI investigate → likely retire |
| **Test** | 115 | Keep in DEV |
| **Docs drift** | 008, 112 rows; missing 022/067/070c/115/116 | Hygiene only (0 slots) |
| **Consolidation** | 006+021; 030+032+033; 063→020; 111→013; EMC 071–077 | See [REFACTOR-PLAN](./AIRTABLE-AUTOMATION-REFACTOR-PLAN.md) |

---

## Completeness

| Dimension | Score |
|-----------|------:|
| UI enumeration | **0%** (full list still needed) |
| Working 50-model | **~92%** IDs reconciled to cap |
| Folder 01 depth | High on scripts; **Low** on live triggers |
| Overall readiness for **deletes** | **Insufficient** until Mike UI paste |

**Close the gap:** Paste all 50 Automations names + ON/OFF from DEV UI (see Mike decision sheet).

---

## Related

- [DEPENDENCY-MAP](./AIRTABLE-AUTOMATION-DEPENDENCY-MAP.md)
- [REFACTOR-PLAN](./AIRTABLE-AUTOMATION-REFACTOR-PLAN.md)
- [CAPACITY-LEDGER](./AIRTABLE-AUTOMATION-CAPACITY-LEDGER.md)
- [Mike decision sheet](../deploy-checklists/AIRTABLE-AUTOMATION-ARCHITECTURE-mike-decision-sheet.md)
