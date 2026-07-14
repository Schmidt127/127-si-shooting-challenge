# C-009 / Learning Activities — Owner review package (Stage 9)

**Date:** 2026-07-13  
**Package:** `C-009-learning-activities-proposal`  
**Branch:** `overnight/v2-run/worker-d-s9-learning-activities`  
**Base SHA:** `53793c9`  
**Status:** **Proposal only — no Airtable implementation**

---

## 1. Approved architecture (not reopened)

- **`Homework`** remains the authoritative homework catalog.
- **`Learning Activities`** = future routing layer (does not replace Homework).
- **`Learning Activity Responses`** = athlete completion/intake rows.
- **067** today: Fillout quiz → Final Reflection Quiz Submissions → Homework Completion (no Submission Asset).
- No Homework 17–specific architecture — generalize via Learning Activities.

---

## 2. Homework table dependency inventory (repo)

| Dependency type | Examples | Notes |
|-----------------|----------|-------|
| Automations | **020**, **033**, **064**, **065**, **067**, **071** | HC link/create, WAS, XP, email |
| Audits | homework pipeline + HW17 audits | Dry-run before migration |
| Web | `/shoot` homework views | Server-side Airtable reads |
| Make | **070a** homework upload | Submission Asset path |
| XP | Source Keys on HC | C-024 DK-03 |
| C-020 | **115** Homework scenario | DEV functional complete |

**Do not rename, delete, or migrate Homework fields unattended.**

---

## 3. Proposed minimum schema — `Learning Activities`

| Field | Type | Purpose |
|-------|------|---------|
| Activity Title | Single line | Public label (C-022) |
| Activity Type | Single select | `fillout_quiz`, `file_upload`, `video`, `reflection`, `assessment`, `optional` |
| Linked Homework | Link → Homework | Optional — counts as homework when set |
| Route Targets | Multi-select | `homework_completion`, `video_feedback`, `assessment_result`, `submission_asset` |
| XP Rule Link | Link → XP Reward Rules | Optional override |
| Active? | Checkbox | Catalog visibility |
| Week Scope | Link → Weeks | Optional window |
| Dedupe Key Template | Text/formula | Per-type C-024 template |

---

## 4. Proposed minimum schema — `Learning Activity Responses`

| Field | Type | Purpose |
|-------|------|---------|
| Learning Activity | Link | Parent |
| Enrollment | Link | Athlete context |
| Week | Link | Assignment week |
| Response Status | Single select | `started`, `submitted`, `reviewed`, `complete` |
| Source Key | Formula/text | C-024 idempotency |
| Routed Homework Completion | Link | When HC route |
| Routed Video Feedback | Link | When VF route |
| Routed Submission Asset | Link | When file/video |
| Fillout Response Id | Text | External idempotency |
| Needs Review | Checkbox | Duplicate/anomaly |

---

## 5. Routing contract (proposal)

```
Learning Activity Response created
  → submission_asset route → 009 path when file/video
  → homework_completion route → 020 or 067-equivalent
  → video_feedback route → 013 path
  → XP via existing 065/114 Source Key patterns
```

**Dedupe:** One official response per enrollment+activity+week unless resubmission history retained (same as HC rule).

---

## 6. Migration safety (future — owner approval required)

1. Inventory **067** / Fillout / HW17 completions.
2. Parallel-run new router on DEV beside **067**.
3. No PROD cutover until C-020 scenarios pass.

---

## 7. Owner review asks

1. Approve minimum field lists?
2. v1 activity types: quiz + file + video only?
3. Does optional Homework link complement or replace **033** WAS assignment?

**Not authorized here:** table creation, Homework changes, automations, record migration.

**Status:** **COMPLETE** (owner-review proposal)
