# SC-160 — Workflow & Dependency Truth (early/late asset intake without Submission.Week)

**Date:** 2026-09-04  
**Agent:** A1 — Current Workflow and Dependency Truth  
**Branch:** `sc160/a1-workflow-truth`  
**Base SHA:** `95e83bf2e691cc589a3cfc836a37727ad9af4107` (`origin/master` tip after SC-159 redesign / PR #419)  
**Airtable base (read-only):** DEV companion `appn84sqPw03zEbTT`  
**Scope:** Analysis + acceptance criteria + rollback snapshot plan only. No product changes. No Season Simulation. No FUT-002 field trash. No Automation 059 edits. No deletion of Mike’s reported registration/submission. No record IDs, PII, attachment URLs, or secrets in this document.

**Recommended backlog ID:** **SC-160** (confirmed free — Master Future Work List ends at SC-159; no existing SC-160 row).

---

## 1. Executive verdict

Early-bird / pre-calendar submissions with a valid Enrollment, HW1+HW2+videos, and Activity Date **before** the Program Instance Weeks calendar starts correctly fail Week assignment. That empty `Submissions.Week` then **hard-blocks** Ready-for-009 and Automation 009, so **no Submission Assets are created** even though attachments exist. Attachment Upload Status can still show **Processing** via Automation **021** (file-presence flag only — does not require Week).

**SC-160 product intent:** allow **asset intake / upload handoff** to proceed without `Submission.Week`, while keeping Week genuinely required for homework completion assignment, XP, Weekly Athlete Summary, and Perfect Week.

---

## 2. Known defect evidence (redacted)

Observed pattern (no IDs):

| Observation | Meaning |
|---|---|
| HW Sub 1 + HW Sub 2 + Video Upload present | Attachments landed on Submission |
| Enrollment linked | Enrollment gate OK |
| Activity Date = 2026-09-04 | Pre-season relative to calendar starting 2027-04-25 |
| `Week` empty | 005 could not match Activity Date to any Week |
| Week Assignment Status = Needs Assignment | Formula: Activity Date present, not future, Week blank |
| Ready for 009 Asset Creation? = 0 | Formula requires Enrollment + Week + no assets + ≥1 attachment |
| Why Not Ready for 009? = Missing Week | Exact formula branch |
| Attachment Upload Status = Processing | 021 (or 009 writeback) — files present; **not** proof assets exist |
| No Submission Assets | 009 never ran successfully / formula never armed |

This is a **gate design** issue, not missing attachments.

---

## 3. State / dependency map

### 3.1 Happy-path chain (in-season)

```text
Fillout / intake
  → Submissions (Enrollment, Activity Date, HW Name 1/2 = PHA links, attachments)
  → 021 Set Attachment Upload Status (No Files | Processing)     [no Week]
  → 005 Assign Week (Activity Date ∈ Weeks.Start–End for Enrollment.Program Instance)
       + validate / normalize PHA HW1/HW2 slots against PHA.Week == Submission.Week
  → Ready for 009? = 1  (Enrollment + Week + attachments + zero assets)
  → 009 Create Submission Assets
       (fail-closed: exactly one Enrollment + exactly one Week;
        copies Enrollment to asset; Week is lookup from Submission)
       → parent Attachment Upload Status = Processing
  → 020 Link/Create Homework Completions (replaces deleted legacy 012)
       (requires Submission.Week; PHA.Week must match; deadline from PHA Due Date else Week End Date)
  → 013 Create/Link Video Feedback                         [no Week in script]
  → 063 Copy Enrollment Grade Band → HC                    [no Week]
  → 070a Send homework asset payload to Make               [no Week; needs HC link]
  → 070b Send video asset payload to Make                  [no Week; needs VF link]
  → 070c Verify async video upload writeback               [no Week]
  → 022 Sync child upload writeback to parent              [no Week]
  → Coach review → 064 Prepare Homework XP (requires HC.Week)
  → 065 Create Homework XP Event (requires week on XP Event + PHA week match)
  → WAS / 057 Perfect Week (Week-scoped; on-time homework uses PHA Due Date else Week End Date)
  → 058 Perfect Week unlock → 059 XP from unlock           [out of SC-160; do not modify 059]
```

### 3.2 Defect path (Activity Date before calendar)

```text
Submission + Enrollment + attachments + Activity Date before Weeks calendar
  → 021 → Attachment Upload Status = Processing
  → 005 → no Week match
       · if HW1/HW2 selected: ERROR ("Homework is selected but no Week could be assigned…")
       · Week remains empty; Week Assignment Status = Needs Assignment
  → Ready for 009? = 0; Why Not Ready = Missing Week
  → 009 never creates assets (formula gate and/or fail-closed Week check)
  → 020 / 070a / HC / VF / XP / Perfect Week never start for those assets
```

### 3.3 Automation inventory notes

| Slot | Role in chain | Week dependency |
|---|---|---|
| **005** | Assign `Submissions.Week` from Activity Date (PI-scoped); validate PHA | Writer of Week; fails when Activity Date outside Weeks |
| **009** | Create Submission Assets | **Hard require** exactly one Week |
| **012** | Legacy HC create | **DELETED** — do not restore; successor is **020** |
| **013** | Create/link Video Feedback | No Week read in script |
| **020** | Link/create Homework Completions | **Hard require** Week + PHA.Week match |
| **021** | Attachment Upload Status fan-out | **No Week** |
| **022** | Child → parent upload writeback | **No Week** |
| **063** | Grade band copy to HC | **No Week** |
| **070a** | Homework asset → Make | **No Week** (needs HC link / attachment) |
| **070c** | Verify video upload | **No Week** |
| **064 / 065** | Homework XP prepare / create | **Require** Week |
| **057 / 058** | Perfect Week calc / unlock | **Week-scoped** (WAS.Week) |
| **059** | Unlock → XP | Out of scope — **do not modify** |

---

## 4. Live formula gates (DEV companion, 2026-09-04)

### 4.1 Week Assignment Status

```text
IF(NOT(Activity Date), "No Activity Date",
  IF(Activity Date in Future = 1, "Activity Date in Future",
    IF(Week, "Assigned", "Needs Assignment")))
```

### 4.2 Ready for 009 Asset Creation?

Requires **all** of:

1. Enrollment present  
2. **Week present**  
3. `COUNTA(Submission Assets) = 0`  
4. At least one of HW Sub 1 / HW Sub 2 / Video Upload  

### 4.3 Why Not Ready for 009?

Ordered messages: Missing Enrollment → **Missing Week** → Already has Submission Assets → No attachments → READY.

### 4.4 Downstream formulas that also require Week (homework / WAS path)

| Formula | Week? | Purpose |
|---|---|---|
| Homework Completion Ready? | Yes | Enrollment + Week + HW name + HW attachment |
| Ready for Homework Completion Automation? | Yes | + Activity Date + Submission Assets |
| Submission Assets Ready? | Indirect | AND(Homework Completion Ready?, attachments) |
| Ready for Weekly Summary? | Yes | Week + qualifying flag |
| XP Award Ready? | Yes | Enrollment + Week + WAS + flags |
| Perfect Week Countable Submission? | Yes | Enrollment + Week + Activity Date + shot/same-day gates |
| Submission Key | Concatenates Week | Display/key helper (blank Week → weak key) |

---

## 5. Week requirement classification table

| Location | Mechanism | Classification | Notes for SC-160 |
|---|---|---|---|
| `Ready for 009 Asset Creation?` | Formula requires Week | **Genuinely required today for asset intake gate** — **candidate to relax** | Primary product lever for early/late intake |
| `Why Not Ready for 009?` | Reports Missing Week | Diagnostic mirror of gate | Update with Ready for 009 |
| Automation **009** fail-closed Week check | Script throws if ≠1 Week | **Genuinely required today for asset create** — **candidate to relax** | Assets copy Enrollment only; Week is lookup from Submission |
| Submission Assets.`Week` | Lookup from Submission | Passive / derived | Becomes blank until Submission.Week filled — OK for intake |
| Automation **021** | Status only | **Legacy/unnecessary for Week** | Already Week-free; explains Processing without assets |
| Automation **070a / 070b / 070c / 022** | Make / writeback | **Not Week-gated** | Proceed once asset + HC/VF links exist |
| Automation **013** | VF create/link | **Not Week-gated** | Video path can continue without Week after assets exist |
| Automation **020** HC create | Requires Submission.Week; PHA.Week must equal it | **Homework assignment only** | Keep Week required |
| Homework Completion Ready? / Ready for HC Automation? | Formulas | **Homework assignment only** | Keep Week required |
| Automation **064 / 065** | HC.Week / XP Event.Week | **XP only** | Keep Week required |
| PHA Due Date / Week End deadline in 020 / 057 | Date-key compare | **XP timing + Perfect Week on-time** | Not an asset-intake gate |
| Perfect Week Countable? / Ready for Weekly Summary? / 057–058 | Week-scoped | **Perfect Week only** (plus WAS) | Keep Week required |
| Automation **005** | Writes Week from Activity Date | Scheduling authority for Submission.Week | Early Activity Date → no match by design |
| PHA.`Week` | Scheduled assignment week | **Homework assignment authority** | Identity of *which week’s homework*; not asset storage |
| Submission Key / display formulas | Include Week | **Legacy/convenience** | Not a hard intake blocker |
| Automation **063** | Grade band only | **Unnecessary for Week** | Already Week-free |

**Summary for design:**

- **Relax for SC-160 (asset intake):** Ready for 009 + 009 Week fail-closed (+ optionally “Already has assets” if multi-upload needs re-arm — see §7).  
- **Keep Week required:** 005 outcome for in-season scheduling, 020/HC formulas, 064/065 XP, WAS/Perfect Week.  
- **Do not invent Week from PHA for shooting Activity Date** without an explicit product rule (today 005 assigns Week from Activity Date only; PHA validates after).

---

## 6. Authoritative homework assignment Week + deadline

### 6.1 Assignment Week (which week’s homework)

| Layer | Authority |
|---|---|
| **PHA.Week** | Scheduled week for that Program Homework Assignment (with PI, Grade Band, Slot, library Homework Assignment) |
| **Submissions.Week** | Challenge week for the **Activity Date** inside Enrollment Program Instance Weeks calendar (**005**) |
| **020 validation** | Selected PHA must be Active, same Program Instance, and **PHA.Week === Submission.Week** |

Early registration with Activity Date before the calendar cannot satisfy 005 → empty Submission.Week → cannot legitimately bind PHA schedule identity yet. That is correct for **homework assignment / XP / Perfect Week**, but should not block **file intake**.

### 6.2 Deadline (on-time vs late)

Canonical contract (`lib/homework-contracts/assignment-identity.js` + Automation **020** + Perfect Week **057**):

1. **PHA `Due Date`** (date field) when present — **overrides**  
2. Else **Weeks.`End Date`** (dateTime, America/Denver) converted to a **calendar date key**  
3. Compare **Submission Date** (calendar day) with due date key — **inclusive on or before due day**  
4. Late satisfactory homework: **full XP credit**; **not** Perfect Week on-time  

**Not implemented as a literal “Saturday 11:59:59pm America/Denver” instant compare.**  
If operators set Week End DateTime to Saturday evening Denver, the **date key** is that Saturday and the whole calendar day is on-time. Time-of-day on End Date is not used as a cutoff in the deadline helpers — only the Denver/UTC date-key extraction paths used by 020/contracts.

**Product clarification for SC-160 / ops:** if the intended deadline is “through Saturday 11:59:59pm Denver,” confirm Week End DateTime values (and any PHA Due Date) are set so the **date key** is that Saturday; do not assume a separate time-of-day gate exists in code.

---

## 7. How asset submission timestamps are retained (multi-upload / resubmit)

| Timestamp / identity | Where | Retention behavior |
|---|---|---|
| **Submitted At** | Submissions formula = `CREATED_TIME()` | Immutable create time of the Submission record (America/Denver display) |
| **Perfect Week Test Submitted At** | Writable dateTime (test fixtures only) | Test override path; not normal parent traffic |
| **Source Attachment ID** | Submission Assets | Primary idempotency key per slot; exact match → skip create |
| **Airtable Attachment** | Submission Assets | File blob copy from Submission slot |
| **Created / Created Time** | Submission Assets `createdTime` | Asset record birth (intake moment) |
| **Uploaded At** | Submission Assets dateTime (America/Denver) | Make/Lambda writeback when storage upload succeeds |
| **Upload Status** | Pending Link → Processing → Uploaded / Error / Ready | Pipeline state |
| **Attachment Upload Status** (parent) | Processing / Sent / Error / No Files | 021 sets Processing when files exist; 009 also sets Processing after work; 022 syncs child outcomes |

**Multi-file / resubmit behavior (009):**

- One asset per source attachment per slot (HW1 / HW2 / VIDEO[+indexed]).  
- Exact Source Attachment ID → skip (idempotent).  
- Compatible restoration when Airtable re-IDs the same file.  
- Ambiguous matches → needs_review (no silent duplicates).  
- **Ready for 009 requires zero existing assets** → first-create gate only. Subsequent attachment changes rely on **009’s own trigger** (attachment field changes), not on Ready for 009 re-arming. SC-160 design should preserve Source Attachment ID replay and confirm live 009 trigger conditions still fire when Week was initially blank and assets are created later.

Attachments remain on the **Submission** even when assets are never created — they are not deleted by the Week miss; only the asset pipeline stalls.

---

## 8. Acceptance criteria for SC-160

### 8.1 Must fix (early / pre-calendar / late Activity Date outside Weeks)

1. Given Enrollment linked + ≥1 attachment (HW and/or Video) and **Week empty** because Activity Date is outside the PI Weeks calendar, **Submission Assets are still created** for authorized slots (HW requires matching Homework Name link; VIDEO does not).  
2. Why Not Ready / Ready for 009 messaging no longer treats Missing Week as a hard asset-intake blocker (or SC-160 replaces that gate with an Enrollment + attachments gate).  
3. Attachment Upload Status does not remain stuck as Processing-with-zero-assets solely due to Missing Week after SC-160 ships (assets create and/or status clarifies).  
4. 070a/070b can still wait for HC/VF links; SC-160 does **not** require HC create without Week.

### 8.2 Must not break

5. In-season Activity Date inside a Week still assigns Week via **005** and proceeds through 009→020→XP as today.  
6. Automation **020** still requires Submission.Week and PHA.Week match before HC create.  
7. Homework XP (**064/065**) still requires Week; Perfect Week (**057/058**) still Week-scoped and on-time via PHA Due Date else Week End Date.  
8. Automation **059** unchanged.  
9. No deletion of Weeks, schemas, or Mike’s reported enrollment/submission.  
10. Idempotency: Source Attachment ID exact match still skips; no duplicate assets on replay.

### 8.3 Deferred / explicit non-goals unless product expands scope

11. Auto-assigning Submission.Week from PHA.Week when Activity Date is outside calendar (would redefine scheduling authority — separate decision).  
12. Awarding XP or Perfect Week credit without Week / WAS.  
13. Restoring deleted Automation **012**.

### 8.4 Verification scenarios (DEV only)

| # | Scenario | Expect |
|---|---|---|
| A | Pre-calendar Activity Date + Enrollment + HW1/HW2 + videos | Assets created; Week still empty until calendar match possible |
| B | Same as A after season Week exists and Activity Date updated/rematched | Week assigns; 020 can create HC; prior assets remain linked |
| C | In-season normal day | Unchanged happy path |
| D | Resubmit new file on existing submission with assets | 009 replay/create by Source Attachment ID; no duplicate exact IDs |
| E | Video-only, Week empty | VIDEO assets created without HW name; 013 may proceed; 020 not required |

---

## 9. Rollback snapshot checklist (before formula / 009 edits)

Export **before** changing Ready for 009, Why Not Ready, or Automation 009 Week fail-closed behavior:

### 9.1 Schema / formulas (Airtable)

- [ ] Submissions field formulas: Ready for 009 Asset Creation?, Why Not Ready for 009?, Week Assignment Status, Homework Completion Ready?, Ready for Homework Completion Automation?, Submission Assets Ready?, Perfect Week Countable Submission?, Submitted At  
- [ ] Field descriptions / choice lists: Attachment Upload Status  
- [ ] Automation **009** full script text + trigger conditions (UI screenshot or export)  
- [ ] Automation **005** trigger conditions (confirm Activity Date / Enrollment triggers)  
- [ ] Automation **021** trigger conditions  
- [ ] Confirm live Automations table Name / Status / Automation Code for 009, 005, 021, 020 only as needed  

### 9.2 Contract / repo snapshots (Git)

- [ ] Branch tip SHA (`95e83bf2…` baseline for this analysis)  
- [ ] Copies already in repo: `009-…js`, `005-…js`, `021-…js`, `020-…js`, `lib/homework-contracts/assignment-identity.js`  
- [ ] Optional: paste prior formula text into `docs/deploy-checklists/` rollback appendix when implementing  

### 9.3 Data safety (disposable DEV only if testing)

- [ ] Do **not** delete Mike’s reported registration/submission  
- [ ] If creating disposable early-bird fixtures, record counts of Submissions / Submission Assets / HC before/after  
- [ ] Do not trash FUT-002 fields; do not run Season Simulation for this audit  

### 9.4 Rollback order if a bad paste lands

1. Restore Ready for 009 + Why Not Ready formulas from snapshot.  
2. Restore Automation 009 script + triggers.  
3. Leave 020/064/065/057/059 untouched unless intentionally changed (they should not be part of SC-160 asset-intake relaxation).  

---

## 10. Recommended Master Future Work List entry

**ID:** SC-160 (free)  
**Area:** Intake / Assets  
**Title:** Early/late asset intake without Submission.Week  
**Priority:** P1 (blocks early-bird attachments from entering Make/review pipeline)  
**Depends on:** SC-159 context only as recent master tip; functionally depends on 009/021/005 current truth  
**Summary:** Decouple Submission Asset creation from Week assignment so pre-calendar and out-of-range Activity Dates still create assets; keep Week mandatory for HC assignment, XP, and Perfect Week.

Suggested one-line for the list:

> Allow 009 asset creation when Enrollment + attachments exist even if Week is empty (early/late Activity Date); keep Week required for 020/XP/Perfect Week. Evidence: `docs/audits/SC-160-WORKFLOW-DEPENDENCY-TRUTH-20260904.md`.

---

## 11. Sources consulted

- Live schema/formulas via Airtable MCP (read-only) on `appn84sqPw03zEbTT`  
- GitHub automations: 005, 009, 013, 020, 021, 063, 070a, 070c, 064, 057  
- `docs/automation-index.md` (012 deleted → 020)  
- `lib/homework-contracts/assignment-identity.js`  
- `docs/online-agents/homework-assets/HOMEWORK-ASSET-COMPLETION-RUNBOOK.md`  
- `docs/127-SI-MASTER-FUTURE-WORK-LIST.md` (SC-160 free; SC-159 last numbered OPEN/COMPLETE block)

---

## 12. Agent constraints attestation

- Started from `origin/master` @ `95e83bf2…`  
- No product implementation  
- No Season Simulation  
- No FUT-002 trash  
- No Automation 059 modification  
- No deletion of Mike’s reported records  
- No PII / record IDs / attachment URLs / secrets in this report  
