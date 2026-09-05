# FUT-029 — Hybrid Fillout Homework Submission System (HISTORICAL)

> **SUPERSEDED (2026-09-05).** Canonical direction is **FUT-029 — Grade-Band Homework Platform and Homework Intake Adapter** in [`FUT-029-GRADE-BAND-HOMEWORK-PLATFORM-PLAN.md`](./FUT-029-GRADE-BAND-HOMEWORK-PLATFORM-PLAN.md).  
> Status remains **Deferred / implementation-ready design** — **do not implement** until Mike separately authorizes. Not required to finish the current app.  
> This Fillout-centered brief is retained as historical evidence only. Do not treat it as the active architecture.

**Status:** Historical / superseded — **do not implement** from this brief  
**Canonical ID:** **FUT-029** (see grade-band plan for current scope)  
**Requested label:** FUT-018 (unavailable — that ID is already **COMPLETE** for Landing Page / Shooting Challenge page improvements; FUT-027/028 also assigned)  
**Master Remaining Work:** **MRW-H12**  
**Related (do not merge blindly):** SC-018 / SC-019 / SC-020 (Learning Activities), FUT-001 / SC-015 / SC-016 (Enrollment+PHA HC identity), HW17 Fillout quiz path, FUT-014 Homework Library web catalog  
**Date captured:** 2026-08-31  
**Superseded:** 2026-09-05  

---

## 1. Concept / design brief

### Goal

Expand the reusable **Homework Library** from ~70 assignments to **100+**, and add **online Fillout answer forms** as an additional homework submission method alongside paper / photo / video asset uploads — without breaking the proven seasonal **18-assignment** Program Homework Assignment (PHA) design or the live **020 → 033 → 064 → 065 → 071** homework workflows.

### Product principles (Mike-approved intake)

| Principle | Meaning |
|-----------|---------|
| Optional first | Fillout starts as an **optional** submission method. |
| Primary later | Fillout **may** become primary for assignments that work well online. |
| Paper preserved | Paper remains available for handwriting, drawing, physical work, or other material better on paper. |
| Media preserved | Photo and video uploads remain available when required. |
| Grade-band versions | Use **separate Library rows** (or versioned variants) when content differs substantially by grade band. |
| Mixed grading | Combine **automatic grading** (where safe) with **coach-reviewed** responses. |
| Catalog vs schedule | Keep **Homework Library** (reusable content) separate from seasonal **Program Homework Assignments** (schedule). |
| Seasonal design | Preserve the current **18-assignment** seasonal PHA design (Early Bird ×2 + Weeks 1–8 ×2). |
| Seasonal link | Each seasonal PHA links to a reusable Library assignment **and** the appropriate grade-band version when needed. |
| One completion spine | Fillout and traditional asset submissions both land in the **same Homework Completion** workflow. |
| No duplicates | Prevent duplicate Homework Completions and duplicate Homework XP. |
| Preserve automations | Do not replace **020, 033, 064, 065, 071** and related homework workflows — extend carefully around them. |

### Non-goals (this brief)

- Creating Fillout forms now  
- Changing live Airtable schema now  
- Modifying live automations now  
- Changing the current 18 PHA rows now  
- Changing homework XP amounts or grading rules now  
- Implementing Learning Activities (SC-018–020) as a substitute without an explicit merge decision  

### Current production spine (must remain)

```text
Asset path (today):
  Submission (+ PHA on Homework Name 1/2)
    → 009 Submission Assets
    → 020 link/create Homework Completion (Enrollment + PHA)
    → 070a upload (when attachment)
    → coach review
    → 064 prepare Total Homework XP
    → 065 create/reconcile HOMEWORK_XP|{hcId}
    → 078 Parent Feedback Ready? (when used)
    → 071 parent feedback email (Hub)

Quiz / reflection path (today, HW17-shaped):
  Fillout → quiz / reflection tables → HC (no fake assets) → 064/065
```

FUT-029 must feed the **same HC identity and XP contracts**, not invent a parallel XP writer.

---

## 2. Proposed schema and relationship plan

> Proposed only. **No fields/tables are created by this document.**

### Entity roles

| Entity | Role | Remains |
|--------|------|---------|
| **Homework Library** | Reusable content catalog (100+ rows over time) | Separate from season |
| **Homework Library Version** *(proposed)* or version fields on Library | Grade-band–specific content / form URL / answer key metadata | Optional new table vs fields — open question |
| **Program Homework Assignments (PHA)** | Seasonal schedule: PI + Week + Slot + Active + Due Date + link to Library | Keep 18-row seasonal shape |
| **Enrollments** | Athlete season membership + Grade Band / PI | Unchanged ownership |
| **Submissions** | Daily/activity container; may carry PHA selection and/or Fillout submission id | Extend carefully |
| **Submission Assets** | Photos / PDFs / videos for paper+media path | Unchanged role |
| **Homework Completions (HC)** | Canonical “this athlete finished this seasonal assignment” | **One per Enrollment + PHA** (FUT-001) |
| **XP Events** | `HOMEWORK_XP\|{homeworkCompletionId}` via **065** only | Unchanged Source Key |
| **Fillout Response** *(proposed logical record)* | Normalized online answers; may be a new table or typed HC/Submission fields | Design choice |

### Recommended relationship sketch

```text
Homework Library (content)
  ├── 1:N Homework Library Version (grade-band / modality variants)   [proposed]
  └── linked from PHA.Homework Assignment (existing)

Program Homework Assignment (season schedule)
  ├── links Homework Library (+ optional explicit Version link)       [proposed]
  ├── Week + Slot + Due Date + Active + Program Instance
  └── referenced by Submissions / HC (existing FUT-001 identity)

Enrollment
  └── Grade Band / PI → selects which Library Version is eligible

Submission (optional daily row)
  ├── Homework Name 1/2 = PHA id(s)                                  [existing Fillout pattern]
  └── optional Fillout Submission Id / Response link                 [proposed]

Submission Assets (0..N)
  └── paper / photo / video evidence → 020 merges into HC            [existing]

Fillout Response (0..1 per HC or per attempt policy)
  ├── Enrollment + PHA (+ Library Version)
  ├── answers JSON / scored fields / auto-grade result
  └── links to HC when counts as homework

Homework Completion (1 canonical)
  ├── Enrollment + PHA (+ Homework library deref)
  ├── Submissions - Linked, Submission Assets, Fillout Response(s)
  └── XP Events ← 064/065 only
```

### Identity and uniqueness (hard rules)

| Concern | Proposed rule |
|---------|----------------|
| HC uniqueness | Exactly one HC per **Enrollment + PHA** (existing FUT-001 / 020). Fillout must **not** create a second HC for the same PHA. |
| Multi-modal merge | Paper assets + Fillout answers for the **same** Enrollment+PHA attach to the **same** HC. |
| Homework XP | Exactly one `HOMEWORK_XP\|{hcId}` via **065**; no Fillout-direct XP writer. |
| Attempts | If retries are allowed, define whether they update the same response row or create superseded attempts — **open question**; default lean: one active response per HC. |
| Grade-band | PHA may remain multi-band; Library Version selection uses Enrollment Grade Band at intake validation time. |

### Library expansion model

| Pattern | When to use |
|---------|-------------|
| Single Library row | Content identical across bands; one Fillout form or one PDF |
| Separate Library rows / Versions | Substantially different questions, reading level, or scoring |
| Modality flags on Library/Version | `SupportsFillout?`, `SupportsPaper?`, `RequiresPhoto?`, `RequiresVideo?`, `AutoGradeCapable?`, `CoachReviewRequired?` |

### PHA seasonal link (preserve 18)

Each of the 18 active PHA rows continues to mean “this week/slot is assigned.” Enhancement is only:

- Link to the correct Library (already exists), and  
- Optionally link/select the **grade-band version** and **preferred primary method** (Fillout vs paper) without changing the 18-count.

---

## 3. Proposed Fillout → Airtable data-flow diagram

### A. Online Fillout answer path (proposed)

```text
Athlete opens Fillout (URL from Library Version / PHA / website)
        │
        ▼
Fillout webhook / Make / native Airtable integration
        │  writes: Enrollment id (or lookup keys), PHA id, Library Version id,
        │          Fillout Submission Id, answers, optional auto-score
        ▼
[Proposed] Fillout Response record (or Submissions + linked answer payload)
        │
        ├─ validate: Enrollment Active? · PHA Active? · PI/Week/Slot match ·
        │            Grade Band eligible for Version · deadline (PHA Due / Week End)
        │
        ▼
Ensure / link Homework Completion
        │  Prefer: reuse 020-compatible identity (Enrollment + PHA)
        │  Do NOT create duplicate HC if assets already created one
        │
        ▼
HC status → Ready for Review or Auto-Satisfactory (policy)
        │
        ▼
064 prepare Total Homework XP (existing rules)
        │
        ▼
065 create/reconcile HOMEWORK_XP|{hcId} (existing)
        │
        ▼
071 / 078 parent feedback path when coach feedback armed (existing)
```

### B. Traditional paper / photo / video path (unchanged spine)

```text
Fillout or web daily Submission selects PHA (Homework Name 1/2)
        │
        ▼
009 creates Submission Asset(s)
        │
        ▼
020 links/creates HC (Enrollment + PHA) — multi-asset merges
        │
        ▼
070a / 022 upload writeback as needed
        │
        ▼
Coach review → 064 → 065 → 071 (existing)
```

### C. Hybrid same-assignment path (critical)

```text
Same Enrollment + same PHA
   ├─ Fillout Response arrives  ─┐
   └─ Submission Asset arrives  ─┴─→ ONE Homework Completion
                                      ├─ assets linked
                                      ├─ Fillout response linked
                                      └─ one HOMEWORK_XP|{hcId} after review rules
```

Fail closed if identity cannot be resolved to exactly one PHA.

### D. What must not happen

```text
Fillout ──✗──► direct XP Event create
Fillout ──✗──► second HC for same Enrollment+PHA
Fillout ──✗──► write Library id into Homework Name 1/2 (PHA remains schedule authority)
New automation ──✗──► bypass 064/065 for homework XP
```

---

## 4. Open implementation questions

1. **Canonical Fillout landing table** — New `Fillout Homework Responses` table vs extend existing Final Reflection / quiz tables vs Submission-centric payload fields?  
2. **Who creates the HC for Fillout-only work?** — Extend **020**, add a sibling automation with shared identity helpers, or route through a Submission Asset–shaped “virtual” row (discouraged)?  
3. **Grade-band version storage** — Separate Version table vs multiple Library rows vs linked “variant of” self-link?  
4. **Primary method switch** — Field on Library, Version, or PHA (`Preferred Submission Method`)? Who may override per season?  
5. **Auto-grade → Satisfactory?** — Can auto-pass set `Satisfactory?` / `Review Complete` without coach, or only pre-score for coach confirm?  
6. **Partial credit / mixed modality** — If Fillout is complete but required photo is missing, is HC incomplete or coach-gated?  
7. **Deadline enforcement** — Reuse 065 PHA Due Date / Week End rules only, or block Fillout webhook accept after due?  
8. **Retries and edits** — One response forever, or superseding attempts with audit trail?  
9. **Website catalog** — How does `/shoot/homework` expose Fillout URLs vs Docs/PDF without leaking future-week forms?  
10. **Make vs native** — Prefer Make webhook (like FUT-003 / enrollment) or Airtable Fillout sync / Automation webhook?  
11. **Relation to SC-018–020 Learning Activities** — Absorb, parallel, or defer LA until after hybrid Fillout homework lands?  
12. **HW17 quiz path** — Generalize that pattern as the template for all auto-graded Fillout homework, or keep HW17 special-cased?  
13. **Coach UI** — Single HC review surface must show Fillout answers + assets together; which Interface / views?  
14. **Idempotency key** — `Fillout Submission Id` unique? Composite `Enrollment|PHA|FilloutSubmissionId`?  
15. **XP rule changes** — Confirm **no** XP amount changes in this program; auto-grade only affects review eligibility, not rule rows (unless later authorized).

---

## 5. Phased rollout plan

| Phase | Name | Scope | Exit criteria |
|-------|------|--------|----------------|
| **0** | Design lock | This brief + Mike answers to open questions; ID FUT-029 / MRW-H12 on work lists | Written decisions; no prod changes |
| **1** | Library content prep | Expand Library toward 100+; tag modality + grade-band needs; **no** new seasonal PHA count | Catalog inventory; still 18 active PHA |
| **2** | Schema proposal (DEV/docs) | Finalize table/field list; dependency review vs 020/064/065; still **no** prod schema until Mike authorizes | Approved schema packet |
| **3** | Fillout pilot (1–2 assignments) | Optional Fillout on disposable Testing enrollments; HC merge + single XP proof | One HC, one XP, asset+Fillout hybrid case PASS |
| **4** | Coach review UX | Views/Interface show answers + assets; auto-grade assist only | Coach can grade without dual systems |
| **5** | Optional → preferred | Mark selected Library/PHA rows Fillout-primary; paper remains for others | Policy flags live; 18 PHA unchanged |
| **6** | Scale | More Library items + forms; monitoring for duplicate HC/XP; docs + Player Manual | Season-ready; FUT-026 manual updated last |

### Explicit holds until authorization

- No Fillout form buildout beyond approved pilot  
- No Airtable schema create/rename/delete  
- No live automation paste/edit for 020/033/064/065/071  
- No change to the 18-assignment seasonal set  
- No homework XP / grading rule amount changes  

---

## 6. Acceptance criteria (future implementation — not now)

1. Library can grow past 100 without forcing more than 18 active seasonal PHA rows.  
2. Athlete can submit via Fillout **or** paper/photo/video **or** both for the same PHA without duplicate HC.  
3. Exactly one `HOMEWORK_XP|{hcId}` after eligible review.  
4. Automations **020, 033, 064, 065, 071** remain authoritative for HC/XP/email spine.  
5. Paper-only and media-required assignments still work without Fillout.  
6. Grade-band versions do not break PHA schedule identity (Enrollment + PHA).  

---

## 7. References

| Doc | Why |
|-----|-----|
| [`docs/127-SI-MASTER-FUTURE-WORK-LIST.md`](../127-SI-MASTER-FUTURE-WORK-LIST.md) | Canonical FUT-029 entry |
| [`MASTER_REMAINING_WORK_LIST.md`](../../MASTER_REMAINING_WORK_LIST.md) | MRW-H12 |
| [`docs/prod-completion/2026-08-09/HOMEWORK-FILLOUT-INTEGRATION.md`](../prod-completion/2026-08-09/HOMEWORK-FILLOUT-INTEGRATION.md) | Existing PHA-first Fillout selection pattern |
| [`docs/data-flow/homework-flow.md`](../data-flow/homework-flow.md) | Current homework + HW17 Fillout flow |
| [`docs/next-wave/homework-pipeline/LEARNING-ACTIVITY-ROUTING-CONTRACT.md`](./LEARNING-ACTIVITY-ROUTING-CONTRACT.md) | Possible future overlap with SC-018–020 |
| [`docs/testing/core-workflow/MULTI-ASSET-HW-RESULTS.md`](../testing/core-workflow/MULTI-ASSET-HW-RESULTS.md) | Proven multi-asset → one HC + one XP |

---

**Owner note:** Implementation requires a separate Mike authorization after Phase 0 decisions. This file is planning evidence only.
