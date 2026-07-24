# Homework / Learning pipeline — canonical map

**Agent:** 11 · **Date:** 2026-07-24  
**Scope:** File homework, written/quiz bridges, Grade Band, WAS, upload, review, XP, parent feedback.

```
Fillout / intake
  → Submissions
      → (023 Enrollment if needed)
      → (005 Week)
      → (007 Duplicate Key gate)
      → (021 Attachment Upload Status)
      → 009 Submission Assets (per file)
          → 020 Homework Completion (link/create + Grade Band blank repair)
              → HC.Grade Band ← Enrollment.Grade Band (PROD 020 v3.0.0)
              → WAS link copied from Submission when present
          → Upload Status = Pending Link + Send to Make Trigger
          → 070a Make homework upload
          → 022 upload writeback sync (asset → HC)
          → Coach review (Satisfactory? / Review Complete / feedback)
          → 064 Prepare Homework XP Award
          → 065 Create Homework XP Event  (Source Key: HOMEWORK_XP|{hcId})
          → 071 Parent homework feedback email webhook

HW17 quiz path (parallel intake)
  → Final Reflection Quiz Submissions
      → 067 link/create Homework Completion (Enrollment+Week+Homework)
          → Grade Band from Enrollment on create
          → Optional assets if Quiz Result PDF exists (Option A)
          → Else attachment-less (Option B / current PROD)
      → Coach review → 064 → 065 → 071 (no XP inside 067)
```

---

## Stage table

| Stage | Object / gate | Automation / formula | Notes |
|---|---|---|---|
| 1 Intake | Submission | Fillout / 115 scenarios | Enrollment + Week required downstream |
| 1b Enrollment repair | Submission.Enrollment | **023** | If blank |
| 1c Week | Submission.Week | **005** | |
| 1d Dedupe | Duplicate Key / status | **007** | Blocks twin Submissions |
| 1e Attachment status | Attachment Upload Status | **021** | Formula/status ladder |
| 2 Assets | Submission Assets | **009** | One asset per file; HW1/HW2 purpose |
| 3 Completion | Homework Completions | **020** | Match Submission+Homework+slot; multi-file merge; GB repair |
| 3q Quiz bridge | Final Reflection Quiz Submissions | **067** | Different dedupe key (Enr+Week+HW) |
| 3g Grade Band | HC.Grade Band | **020** / **067** create; ~~063 deleted~~ | 063 not fully replaced for orphan blanks |
| 4 WAS | Weekly Athlete Summary Link on HC | Copied from Submission in **020**; WAS created by **031** (+ others) | 020 does not invent WAS |
| 5 Upload arm | Pending Link + Send to Make | **020** sets Pending Link; Make gate **070a** | 070a may be OFF in PROD |
| 6 Writeback | Drive URL/ID on HC | **022** (+ 020 already-linked sync) | |
| 7 Coach review | Satisfactory? / Review Complete | Manual / Interface views | Formula views may gate 064 |
| 8 XP prepare | Homework XP prep fields | **064** | |
| 9 XP award | XP Events | **065** | Sole homework XP writer |
| 10 Parent feedback | Email webhook | **071** | Fillout-aware; must not require assets for Option B |

---

## Formula / view gates (operators)

| Gate | Typical location | Blocks |
|---|---|---|
| Upload Destination = Homework Completions | 020 / 070a trigger | Non-homework assets |
| Asset Purpose ∈ {Homework 1, Homework 2} | 020 trigger | Wrong slot |
| Airtable Attachment not empty | 020 / 009 file path | Written/quiz without files |
| Ready for Review / Review Complete | 064/065 trigger views | Premature XP |
| Satisfactory? | 065 (and optional 064) | Unsatisfactory awards |
| Send to Make Trigger | 070a | Upload send |
| Quiz Processing Status | 067 | Needs Review / Error rows |

Exact view names: confirm in Airtable UI (OMNI) — repo trigger map still lists retired 063/111 (see patch manifest).

---

## Grade Band ownership

| Record | Writer | Status |
|---|---|---|
| Enrollment.Grade Band | 002 / 003 | Source of truth |
| Homework Completions.Grade Band | **020** v3.0.0 (create + blank repair), **067** on create | ~~063~~ deleted — partial coverage |
| Video Feedback.Grade Band | **013** v2.0 create/repair | ~~111~~ deleted — **replaced** |
| Submissions.Grade Band | **N/A** | Field does not exist on PROD |

---

## Explicit non-owners

- **020 / 067** never create XP Events
- **065** never creates Homework Completions
- **071** never awards XP
- Learning Activities (future) must route into this map — no parallel XP
