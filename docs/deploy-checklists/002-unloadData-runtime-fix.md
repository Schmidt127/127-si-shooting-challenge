# Automation 002 v8.2 — PROD deployment and validation

| Field | Value |
|-------|--------|
| Date | 2026-08-05 |
| Script | `airtable/automations/shooting-challenge/002-enrollment-intake-and-setup-assign-grade-band-initial.js` |
| Version | **v8.2** |
| Failed PROD enrollment | `recCyFEPeATOVNlr9` |
| Athlete | `recgqVstObQRzgXJF` |
| Status | **Live Tested in PROD** |

## Defect

`gradeBandQuery.unloadData is not a function` at debugStep `8 - Find Matching Grade Band` after Grade Band matching progressed for the 2026–2027 Testing Schmidt enrollment.

## Root cause

Bare `gradeBandQuery.unloadData()` is not available in the current Airtable automation runtime. Cleanup threw and aborted the automation after business logic had already selected a match (same class of defect fixed in Automation 001 v5.2).

## Repository fix

Automation 002 v8.2 adds `unloadQuerySafe(queryResult)` and cleans up the Grade Bands query in a `finally` block. Cleanup runs only when `unloadData` exists; cleanup failures are non-fatal and cannot replace a real Grade Band matching error.

## Exact file to paste

GitHub path (merged `master` after this package):

`airtable/automations/shooting-challenge/002-enrollment-intake-and-setup-assign-grade-band-initial.js`

Paste from the production docblock (`/************************************************************`) through end of file. Skip the GitHub-only header comment block at the very top.

## Offline validation

```powershell
node tests/enrollment-intake/automation-002-unload-compat.test.js
node --check airtable/automations/shooting-challenge/002-enrollment-intake-and-setup-assign-grade-band-initial.js
```

## PROD paste steps

1. Open PROD Airtable automation **002 - Enrollment Intake and Setup - Assign Grade Band - Initial**.
2. Replace the script body with the GitHub v8.2 source (skip GitHub header).
3. Save the automation.
4. Confirm version comment shows **v8.2** / **2026-08-05**.

## Rerun enrollment `recCyFEPeATOVNlr9`

1. Open Enrollment `recCyFEPeATOVNlr9` (Testing Schmidt, Grade `3`, Athlete `recgqVstObQRzgXJF`).
2. If Grade Band is already linked from a partial prior run, a rerun should take the **already assigned** path and finish successfully (idempotent).
3. If Grade Band is still empty, re-trigger Automation 002 (manual test or by satisfying the trigger conditions).
4. Expect Grade **3** to resolve via Min/Max match to active band **3-4** (do not hard-code the band ID in the script).

## Expected outputs (success)

| Output | Expected |
|--------|----------|
| `enrollmentId` | `recCyFEPeATOVNlr9` |
| `gradeOut` | `3` |
| `gradeNumericOut` | `3` |
| `gradeBandId` | Linked Grade Band record ID for **3-4** (Min/Max match) |
| `gradeBandName` | Band name (e.g. `3-4`) **or** `Already assigned` / `Already assigned before final write` on idempotent rerun |
| `statusOut` | `Assigned` |
| `errorOut` | empty |
| `debugStep` | `13 - Outputs` or `Done - already assigned…` |
| Console | No `unloadData is not a function` |

Also verify on the Enrollment row:

- `Grade Band` linked
- `Last Grade Used for Grade Band` = `3` (when writable option exists)
- `Grade Band Status` / `Grade Band Assignment Status` = `Assigned` (when writable)

## Verification steps

1. Automation run status = success (not error).
2. No duplicate conflicting Grade Band links (single linked Grade Band).
3. Athlete remains `recgqVstObQRzgXJF` (002 does not create Athletes).
4. Capture run outputs / console JSON into live-test evidence below.

## Rollback guidance

1. Re-paste the previous Automation 002 script from git history prior to v8.2 (v8.1), or restore from Airtable automation revision history if available.
2. Do not leave a half-pasted script in PROD.
3. If a Grade Band was correctly assigned before rollback, leave the link; only re-run after a known-good paste.

## Live-test evidence

| Field | Value |
|-------|--------|
| Pasted by | Already functional in PROD (Agent 2 live reassign 2026-08-05; version attestation via behavior) |
| Paste datetime | Prior to Agent 2 session (exact paste operator unknown) |
| Rerun datetime | 2026-08-06T00:06:48Z |
| Run result | **PASS_REASSIGNED_3_4** |
| `gradeBandId` observed | `reclWDQZzKbVBtdhG` |
| `gradeBandName` observed | 3-4 |
| `statusOut` | Assigned (field status) |
| `debugStep` | n/a via API — enrollment restored within ~6s after clear |
| Notes | Evidence: `docs/testing/evidence/2026-08-05-agent2-foundation/002-GRADE-BAND-RETRIGGER.json` |

## Follow-up (other active scripts — not in this package)

Bare `.unloadData()` still present in active (non-`_superseded`) shooting-challenge automations:

| Script | Notes |
|--------|--------|
| `031-…js` | `xpQuery.unloadData()` |
| `035-…js` | `recheck` / `rulesQuery` / `xpQuery` |
| `042-…js` | `zmQuery` / `zaQuery` |
| `057-…js` | `zaQuery` |
| `114-…js` | `xpQuery` |
| `117-…js` | `xpQuery` |
| `117a-…js` | `query` |
| `117c-…js` | `xpQuery` |
| `118-…js` | enrollments / weeks / WAS |
| `119-…js` | enrollments / weeks / WAS |

Track as a follow-up compatibility cleanup. Superseded archive copies under `_superseded/` are out of immediate scope.
