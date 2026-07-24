# Learning Activities — repository-ready schema contract

**Agent:** 11 · **Date:** 2026-07-24  
**Status:** Contract only — **no Airtable tables created** (Mike/OMNI authorization required for DEV schema).  
**JSON Schema:** `schemas/learning-activity.schema.json`  
**Prior art:** `docs/learning-activities/LA-000-current-state-handoff.md`, `web/types/learning-activities.ts`

---

## Tables (proposed)

### 1. Learning Activities (catalog)

| Field | Type | Rules |
|---|---|---|
| Name | single line text | Required |
| Active? | checkbox | Inactive → no HC routing |
| Completion Method | single select | fillout_questions, file_upload, video_upload, quiz, assessment, reflection, special_assignment, mixed |
| Homework | link → `FBC Curriculum - SYNC` | Optional; required if Counts as Homework? |
| Counts as Homework? | checkbox | True **requires** Homework link |
| Week | link → Weeks | Optional default week |
| Instructions | long text | Optional |
| Response Methods Allowed | multiple select | Subset of completion methods |

### 2. Learning Activity Responses (intake)

| Field | Type | Rules |
|---|---|---|
| Learning Activity | link → Learning Activities | Required |
| Enrollment | link → Enrollments | Required — never guess |
| Week | link → Weeks | Required when counts as homework |
| Submitted At | date/dateTime | |
| Processing Status | single select | Pending / Processed / Needs Review / Error |
| Homework Completion | link → Homework Completions | Set only when routing says create/update HC |
| Submission | link → Submissions | Optional parent for asset fan-out |
| Submission Assets | link → Submission Assets | Fan-out results |
| Score / Result JSON | number / long text | Quiz/assessment results (no fake files) |
| Source System | single select | Fillout / Web / Manual |

**Do not create** a parallel XP table or Learning Activity XP Events.

---

## countsAsHomework

| Homework link | Counts as Homework? | Behavior |
|---|---|---|
| Present | true | Create/update **Homework Completions**; enter coach → 064 → 065 |
| Present | false | Response stored; **no** HC; **no** homework XP |
| Blank | false | Stand-alone activity |
| Blank | true | **Invalid** — reject in contract (`assertStandAloneDoesNotCreateHomeworkCompletion`) |

---

## Response methods → assets

| Method | Submission Assets | Notes |
|---|---|---|
| file_upload / video_upload | Required fan-out | Reuse 009/020 semantics |
| quiz / fillout_questions / reflection | Optional / none | Prefer score fields; Option B style |
| mixed | Per upload intent | `planSubmissionAssetFanout` |

Canonical file layer remains **Submission Assets** — never invent a second upload store.

---

## Coach review

- Homework-linked + countsAsHomework → **same** Homework Completions review surfaces as today’s homework.
- Stand-alone → optional future “LA review” view; **must not** call 065.

---

## XP ownership (non-negotiable)

| Allowed | Forbidden |
|---|---|
| 064 → 065 after Satisfactory homework completion | Direct XP from Learning Activity Response |
| Reuse Source Key `HOMEWORK_XP|{homeworkCompletionId}` | `LEARNING_ACTIVITY_XP|*` parallel keys |

Machine helper: `resolveLearningActivityXpOwnership()` in `lib/homework-contracts/learning-activity-routing.js`.
