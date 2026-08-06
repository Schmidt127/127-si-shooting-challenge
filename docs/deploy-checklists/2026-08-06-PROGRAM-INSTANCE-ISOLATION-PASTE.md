# Deploy checklist — Program Instance isolation (2026-08-06)

**PROD base:** `appn84sqPw03zEbTT`  
**Repo:** GitHub is canonical; Airtable is runtime.

For every automation below: **Repository updated ≠ PROD updated.**

## Paste order (recommended)

1. **023** Assign Enrollment (before 005 — 005 date fallback requires Enrollment)
2. **005** Assign Week
3. **053** Streak occurrences
4. **066** Shot milestones (v3.5 includes v3.4 createRecords fix)
5. **118** / **119** Weekly email schedules
6. **043** only if still Live in PROD (otherwise skip)

## Common paste instructions

1. Open Airtable → Automations → target automation → Scripting action.
2. Replace **entire** script body with repository file contents from `docblock` through end.
3. **Skip** the GitHub header block (`/* Automation: … */` above the production `/***` docblock) if your paste convention excludes it — paste from the production `/***` docblock through `await main();`.
4. Confirm input variable `recordId` (or schedule inputs for 118/119) still mapped.
5. Save. Run controlled test. Do not enable new email Live sends casually.

---

### 023 — Assign Enrollment to Submission

| | |
|--|--|
| File | `airtable/automations/shooting-challenge/023-submission-intake-and-asset-creation-assign-enrollment-to-submission.js` |
| Version | **v3.0** |
| Trigger | Submission; Athlete present; Enrollment empty (recommended) |
| Input | `recordId` |
| Test record | Submission `recElDBcFvuE6jWwc` / Athlete `recgqVstObQRzgXJF` |
| Expected | `matchModeOut` prefers `existing-valid-enrollment` or single safe fallback → Enrollment `recCyFEPeATOVNlr9`; ambiguous multi-active → skipped with diagnostics (never guess) |

### 005 — Assign Week (Homework First)

| | |
|--|--|
| File | `airtable/automations/shooting-challenge/005-submission-intake-and-asset-creation-assign-week-to-submission-homework-first.js` |
| Version | **v4.1** |
| Trigger | Week empty / Needs Week Assignment |
| Input | `recordId` |
| Prerequisite | Enrollment linked with Program Instance |
| Test | Activity Date fallback with Enrollment `recCyFEPeATOVNlr9` → Week Early Bird `recWeVrSabnsYaHc2`; overlapping PWTEST Week ignored if different or inactive; same-PI multi overlap → error with diagnostics |

### 053 — Streak occurrences rebuild

| | |
|--|--|
| File | `…053-…streak-occurrences-rebuild-and-upsert-from-submissions.js` |
| Version | **5.3** |
| Input | `recordId` (Submission) |
| Expected | Only submissions for that Enrollment; Week link PI-scoped |

### 066 — Shot Milestone Unlocks

| | |
|--|--|
| File | `…066-…create-shot-milestone-unlocks.js` |
| Version | **v3.5** |
| Input | `recordId` (Enrollment) = `recCyFEPeATOVNlr9` |
| Expected | Enrollment-only shot total; Source Key `SHOT_MILESTONE\|recCyFEPeATOVNlr9\|*`; 0 duplicate XP on rerun; Week PI-scoped |

### 118 / 119 — Weekly email schedule

| | |
|--|--|
| Files | `…118-…schedule-weekly-summary-email-build.js`, `…119-…schedule-weekly-summary-email-send.js` |
| Version | **v1.7** |
| Expected | Multi End Date Week collision throws; Schmidt RIDs `recCyFEPeATOVNlr9` + `recgP9qZYjAhE7NXm` excluded by default; 118 arms only enrollments whose PI matches target Week |

### 043 — Level Gate Rule (if Live)

| | |
|--|--|
| File | `…043-…set-level-gate-rule-from-next-level.js` |
| Version | **v2.1** |
| Expected | Prefers `School Year / Rule Set` match when populated |

## Fixture cleanup

1. Inspect dependencies of Week `reci5GdxEC57vfoS3`.
2. Deactivate Active Week? **or** move to dedicated test Program Instance.
3. Confirm Early Bird `recWeVrSabnsYaHc2` remains the only active overlap for operational PI `rec5mEM0YPqPqq0hZ`.

## Website

After merge: set Vercel env `AIRTABLE_ACTIVE_SCHOOL_YEAR=2026-2027` (optional but recommended for fallback formulas). Prefer Web views already filtered to the active season.
