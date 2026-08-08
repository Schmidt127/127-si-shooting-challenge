# Deploy checklist — Program Instance isolation (2026-08-06)

**PROD base:** `appn84sqPw03zEbTT`  
**Repo:** GitHub is canonical; Airtable is runtime.

For every automation below: **Repository updated ≠ PROD updated** until paste + live test.

## Paste order (remaining)

1. ~~**005** Assign Week~~ — **DONE** (pasted + Live Tested **PASS**)
2. ~~**023** Assign Enrollment~~ — **DONE** (pasted **v3.1** + controlled Week-derived PI test **PASS**)
3. **053** Streak occurrences ← **NEXT**
4. **066** Shot milestones (v3.5 includes v3.4 createRecords fix)
5. **118** / **119** Weekly email schedules
6. **043** only if still Live in PROD (otherwise skip)

## Status matrix

| Automation | Repository Updated | Merged to Master | PROD Pasted | Live Tested | Result |
| ---------- | ------------------ | ---------------- | ----------- | ----------- | ------ |
| 005 v4.1 | Yes | Yes | Yes | Yes | **PASS** |
| 023 v3.1 | Yes | Yes (`1d5ca1a` / PR #93) | Yes | Yes | **PASS** |
| 053 5.3 | Yes | Yes | No | No | — |
| 066 v3.5 | Yes | Yes | No | No | — |
| 118 v1.7 | Yes | Yes | No | No | — |
| 119 v1.7 | Yes | Yes | No | No | — |
| 043 v2.1 | Yes | Yes | TBD | TBD | — |

### 023 live PROD status

```text
Repository v3.1: merged
PROD v3.1: pasted
Primary controlled test: PASS — Week-derived Program Instance path
Replay test: PASS — existing Enrollment path / no-write replay
Final result: PASS
```

**Controlled evidence preserved below:** primary assignment run proved `programInstanceSource = submission-week`; replay proved `existing-valid-enrollment` with `wroteUpdate = false`.

### 023 evidence — primary assignment PASS

```text
Submission: recElDBcFvuE6jWwc
Enrollment assigned: recCyFEPeATOVNlr9
Program Instance: rec5mEM0YPqPqq0hZ
programInstanceSource: submission-week
Status: Complete
```

### 023 evidence — replay PASS

```text
version: v3.1
existingEnrollmentId: recCyFEPeATOVNlr9
resolvedProgramInstanceId: rec5mEM0YPqPqq0hZ
programInstanceSource: existing-enrollment
matchedEnrollmentId: recCyFEPeATOVNlr9
matchedEnrollmentKey: ATH-recgqVstObQRzgXJF|2026-2027
matchMode: existing-valid-enrollment
wroteUpdate: false
status: Complete
```

### 005 evidence (do not retest)

```text
Submission: recElDBcFvuE6jWwc
Enrollment: recCyFEPeATOVNlr9
Program Instance: rec5mEM0YPqPqq0hZ
Activity Date: 2026-08-05
Selected Week: recWeVrSabnsYaHc2 (Early Bird)
Source: Activity Date Fallback
Same-PI Weeks reviewed: 12 | Other-PI excluded: 13
Result: PASS
```

## Common paste instructions

1. Open Airtable → Automations → target automation → Scripting action.
2. Replace **entire** script body with repository file contents from the production `/***` docblock through `await main();`.
3. **Skip** the GitHub header block (`/* Automation: … */` above the production docblock).
4. Confirm input variable `recordId` (or schedule inputs for 118/119) still mapped.
5. Save. Run controlled test immediately. Do not enable new email Live sends casually.

---

### 023 — Assign Enrollment to Submission — COMPLETE (v3.1)

| | |
|--|--|
| File | `airtable/automations/shooting-challenge/023-submission-intake-and-asset-creation-assign-enrollment-to-submission.js` |
| Version | **v3.1** |
| Trigger | Submission; Athlete present; Enrollment empty (recommended) |
| Input | `recordId` |
| Test record | Submission `recElDBcFvuE6jWwc` / Athlete `recgqVstObQRzgXJF` / Week `recWeVrSabnsYaHc2` |
| Expected Enrollment | `recCyFEPeATOVNlr9` (Program Instance `rec5mEM0YPqPqq0hZ`) |
| Expected (Week path) | `programInstanceSource` = `submission-week`; `resolvedProgramInstanceId` = `rec5mEM0YPqPqq0hZ`; `matchModeOut` = `athlete-program-instance`; `weekId` = `recWeVrSabnsYaHc2`; `candidateCountOut` = 1; `statusOut` = `Complete` |

**PROD result:** pasted + controlled verification complete.

**Primary controlled run (assignment path):**

1. Submission `recElDBcFvuE6jWwc` entered with Enrollment cleared and Week `recWeVrSabnsYaHc2`.
2. Automation assigned Enrollment `recCyFEPeATOVNlr9`.
3. Output/console confirmed `programInstanceSource = submission-week` and Program Instance `rec5mEM0YPqPqq0hZ`.

**Replay run (idempotency path):**

1. Replay used the same Submission with existing Enrollment `recCyFEPeATOVNlr9`.
2. Output/console confirmed `programInstanceSource = existing-enrollment`.
3. `matchMode = existing-valid-enrollment`, `wroteUpdate = false`, `status = Complete`.

### 005 — Assign Week (Homework First) — COMPLETE

| | |
|--|--|
| File | `airtable/automations/shooting-challenge/005-submission-intake-and-asset-creation-assign-week-to-submission-homework-first.js` |
| Version | **v4.1** |
| Status | Pasted + Live Tested **PASS** |

### 053 — Streak occurrences rebuild

| | |
|--|--|
| File | `airtable/automations/shooting-challenge/053-achievements-and-milestones-streak-occurrences-rebuild-and-upsert-from-submissions.js` |
| Version | **5.3** |
| Input | `recordId` (Submission) = `recElDBcFvuE6jWwc` |
| Expected | Only submissions for Enrollment `recCyFEPeATOVNlr9`; Week link PI-scoped; no duplicate occurrences on rerun |

### 066 — Shot Milestone Unlocks

| | |
|--|--|
| File | `airtable/automations/shooting-challenge/066-achievements-and-milestones-create-shot-milestone-unlocks.js` |
| Version | **v3.5** |
| Input | `recordId` (Enrollment) = `recCyFEPeATOVNlr9` |
| Expected | Enrollment-only shot total; Source Key `SHOT_MILESTONE\|recCyFEPeATOVNlr9\|*`; 0 duplicate XP on rerun; Week PI-scoped |

### 118 / 119 — Weekly email schedule

| | |
|--|--|
| Files | `…118-…schedule-weekly-summary-email-build.js`, `…119-…schedule-weekly-summary-email-send.js` |
| Version | **v1.7** |
| Expected | Multi End Date Week collision throws; Schmidt RIDs `recCyFEPeATOVNlr9` + `recgP9qZYjAhE7NXm` excluded by default; 118 arms only enrollments whose PI matches target Week; keep `dryRun=true` for first test |

### 043 — Level Gate Rule (if Live)

| | |
|--|--|
| File | `airtable/automations/shooting-challenge/043-levels-and-progression-set-level-gate-rule-from-next-level.js` |
| Version | **v2.1** |
| Expected | Prefers `School Year / Rule Set` match when populated |
| If not Live | `PROD deployment: Not applicable — Automation not active` |

## Fixture cleanup

1. Inspect dependencies of Week `reci5GdxEC57vfoS3`.
2. Deactivate Active Week? **or** move to dedicated test Program Instance.
3. Confirm Early Bird `recWeVrSabnsYaHc2` remains the only active overlap for operational PI `rec5mEM0YPqPqq0hZ`.

## Fillout (UI attestation — do not block merge)

Open daily submission Fillout → Airtable mapping → confirm whether Enrollment RID and/or Program Instance RID is mapped (F-ATT-04). Repo still shows `UNKNOWN_UI_ATTESTATION`. One verification step only; report Yes/No + field name.

## Website

After merge: set Vercel env `AIRTABLE_ACTIVE_SCHOOL_YEAR=2026-2027` (optional but recommended for fallback formulas). Prefer Web views already filtered to the active season.
