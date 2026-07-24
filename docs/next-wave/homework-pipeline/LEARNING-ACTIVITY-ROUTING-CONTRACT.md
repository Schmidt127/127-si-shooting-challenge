# Learning Activity routing contract

**Agent:** 11 · **Date:** 2026-07-24  
**Code:** `lib/homework-contracts/learning-activity-routing.js`  
**Tests:** `tests/homework-contracts/learning-activity-routing.test.js`  
**Web mirror (do not diverge):** `web/lib/learning-activities/routing.ts`

---

## Decisions

### 1. Homework Completion routing

```
resolveHomeworkCompletionRouting(activity) →
  create_or_update_homework_completion | no_homework_completion
```

Create/update HC **only** when:

- activity exists and `active`
- `homeworkId` is a `rec…` curriculum link
- `countsAsHomework === true`

Otherwise: store response only (stand-alone or non-counting).

### 2. Asset routing

```
planSubmissionAssetFanout(response) →
  { processingLayer: "Submission Assets", assetIntents[] }
```

- Empty `uploadIntents` is valid.
- Filenames required on intents that create assets.
- Downstream: existing **009 / 020 / 070a / 022** (or LA-specific creator that emits the same asset shape).

### 3. Method → asset policy

`resolveAssetRoutingForMethod(method)` encodes whether attachments are required. Quiz/written paths must not invent fake attachments.

### 4. XP ownership

`resolveLearningActivityXpOwnership()`:

- Owner automation: **065** (prepare **064**)
- Path: Response → (optional) HC → coach review → 064 → 065
- Forbidden: any direct LA XP writer

### 5. Uniqueness when counting as homework

When routed to HC, identity must follow  
`docs/next-wave/homework-pipeline` uniqueness contract:

- Enrollment + Homework assignment + item/asset slot + applicable Submission  
- Align LA slot stamping with HW1/HW2/WRITTEN/QUIZ/LA  
- Do not dual-write HC via both a future LA automation and 020 for the same asset without shared match keys

---

## Stand-alone activity behavior

| Aspect | Rule |
|---|---|
| HC | Never |
| Submission Assets | Only if uploads present |
| Coach homework review | No |
| XP | No (unless later product adds a **separate approved** XP Source Key — out of scope; not homework XP) |

---

## Readiness

| Item | Status |
|---|---|
| Routing helpers + tests | **Ready** |
| JSON schema | **Ready** |
| Airtable tables | **Not created** — needs Mike authorization |
| Automations | **Not written** — wait for schema + backlog ID |
| Competing XP path | **None defined** (correct) |
