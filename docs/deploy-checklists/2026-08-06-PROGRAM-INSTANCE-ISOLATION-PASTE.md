# Deploy checklist — Program Instance isolation (2026-08-06)

**PROD base:** `appn84sqPw03zEbTT`  
**Repo:** GitHub is canonical; Airtable is runtime.

For every automation below: **Repository updated ≠ PROD updated** until paste + live test.

## Paste order (remaining)

1. ~~**005** Assign Week~~ — **DONE** (pasted + Live Tested **PASS**)
2. **023** Assign Enrollment ← **NEXT**
3. **053** Streak occurrences
4. **066** Shot milestones (v3.5 includes v3.4 createRecords fix)
5. **118** / **119** Weekly email schedules
6. **043** only if still Live in PROD (otherwise skip)

## Status matrix

| Automation | Repository Updated | Merged to Master | PROD Pasted | Live Tested | Result |
| ---------- | ------------------ | ---------------- | ----------- | ----------- | ------ |
| 005 v4.1 | Yes | Yes | Yes | Yes | **PASS** |
| 023 v3.0 | Yes | Yes | No | No | — |
| 053 5.3 | Yes | Yes | No | No | — |
| 066 v3.5 | Yes | Yes | No | No | — |
| 118 v1.7 | Yes | Yes | No | No | — |
| 119 v1.7 | Yes | Yes | No | No | — |
| 043 v2.1 | Yes | Yes | TBD | TBD | — |

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

### 023 — Assign Enrollment to Submission ← NEXT

| | |
|--|--|
| File | `airtable/automations/shooting-challenge/023-submission-intake-and-asset-creation-assign-enrollment-to-submission.js` |
| Version | **v3.0** |
| Trigger | Submission; Athlete present; Enrollment empty (recommended) |
| Input | `recordId` |
| Test record | Submission `recElDBcFvuE6jWwc` / Athlete `recgqVstObQRzgXJF` |
| Expected Enrollment | `recCyFEPeATOVNlr9` (Program Instance `rec5mEM0YPqPqq0hZ`) |
| Expected | `matchModeOut` = `existing-valid-enrollment` (or single safe fallback); Enrollment unchanged if already correct; ambiguous multi-active → skipped (never guess) |

**Live test steps (Mike):**

1. Paste v3.0 into PROD Automation 023 scripting action; Save.
2. Open Automations → 023 → Test / Run with `recordId` = `recElDBcFvuE6jWwc`.
3. Paste the full console / output JSON back to the agent.
4. Confirm Submission `recElDBcFvuE6jWwc` still (or again) links Enrollment `recCyFEPeATOVNlr9`.

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
