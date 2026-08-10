# Automation 020 v3.4.1 — PROD paste packet

**Date:** 2026-08-10  
**Script:** `airtable/automations/shooting-challenge/020-homework-link-or-create-homework-completion.js`  
**Replaces:** v3.4.0 and earlier

## What changed

Production schema correction: `Submissions.Homework Name 1` and `Homework Name 2` now link to **Program Homework Assignments**, not `FBC Curriculum - SYNC`.

| v3.4.0 | v3.4.1 |
|--------|--------|
| Read library RID from Homework Name 1/2 | Read **PHA rec…** from Homework Name 1/2 |
| Scan PHA table by library + week + PI + slot | Load PHA by ID; validate week + PI + slot |
| Derive PHA from lookup | PHA is authoritative; derive **Homework** from PHA |

## Preconditions

1. Fillout (or test intake) writes **PHA record IDs** to Homework Name 1/2 for the athlete's slot.
2. Submission has exactly one Enrollment (current year) matching Submission Asset Enrollment.
3. Submission has exactly one Week (from 005).
4. PHA row is Active and matches Enrollment Program Instance + Submission Week + HW1/HW2 slot.

## Paste steps

1. Open Airtable PROD → Automation **020**.
2. Replace script body with repo file (docblock through end; skip GitHub-only header if present).
3. Confirm version header shows **v3.4.1**.
4. Save automation (leave trigger unchanged).

## Controlled proof (Schmidt — Mike only)

Use existing JIT PHA rows on Early Bird week (`recWeVrSabnsYaHc2`):

| Slot | PHA (example) |
|------|----------------|
| HW1 | `reca5GM1JkROhXOiy` |
| HW2 | `reccQhrgOK8e8Yngv` |

1. Ensure Submission links **PHA** in Homework Name 1 (not library RID).
2. Run `005 → 009 → 020` on a homework asset.
3. Expect outputs: `statusOut=success`, `phaId`, `homeworkId` (library), `homeworkCompletionId`, `enrollmentId`.
4. Re-run same asset → `linked_existing_enrollment_identity` (no duplicate HC).

## Offline tests (repo)

```bash
node tests/homework/automation-020-pha-v341.test.js
node tests/homework/automation-020-sc016-identity.test.js
```

## Rollback

Re-paste prior PROD version only if Mike approves. Do not delete Homework Completions created under v3.4.1.

## Related docs

- [HOMEWORK-FILLOUT-INTEGRATION.md](../prod-completion/2026-08-09/HOMEWORK-FILLOUT-INTEGRATION.md)
- [START-HERE-PROD-PASTE.md](../../START-HERE-PROD-PASTE.md)
