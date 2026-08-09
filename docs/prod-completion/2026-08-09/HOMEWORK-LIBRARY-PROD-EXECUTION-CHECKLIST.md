# Homework Library — PROD Deployment Packet

Date: 2026-08-09  
Base: PROD `appn84sqPw03zEbTT`  
PR: #128  
Table rename: **Homework Library** (operator complete)

Pipeline may remain **OFF** during cutover.

---

## 1. Automations to paste (exact versions + filenames)

| Order | File | Version | Paste required |
|-------|------|---------|----------------|
| 1 | `airtable/automations/shooting-challenge/005-submission-intake-and-asset-creation-assign-week-to-submission-homework-first.js` | **v5.1** | Yes |
| 2 | `airtable/automations/shooting-challenge/033-weekly-summary-and-goal-logic-assign-homework-to-weekly-athlete-summary.js` | **v4.1** | Yes |
| 3 | `airtable/automations/shooting-challenge/067-homework-link-or-create-completion-from-reflection-quiz.js` | **v3.1** | Yes |
| 4 | `airtable/automations/shooting-challenge/068-homework-reconcile-deferred-weekly-summary-links.js` | v1.1 | Yes (table name only) |
| 5 | `airtable/automations/shooting-challenge/072-email-notifications-and-external-handoffs-build-weekly-summary-email-package.js` | current | Yes (table alias) |
| 6 | `airtable/automations/shooting-challenge/076-email-notifications-and-external-handoffs-build-daily-submission-email-package.js` | current | Yes (table alias) |

## 2. Automations unchanged (verify, do not downgrade)

| File | Version | Notes |
|------|---------|-------|
| `020-homework-link-or-create-homework-completion.js` | **v3.3.0** | Strict exact PHA — do not paste older |
| `009-submission-intake-create-submission-assets.js` | v1.1 | Content provenance only |
| `064-homework-review-and-xp-prepare-homework-xp-award.js` | current | No library schedule reads |
| `065-homework-review-and-xp-create-homework-xp-event.js` | current | No library schedule reads |
| `071-email-notifications-and-external-handoffs-build-homework-feedback-email-package.js` | current | No change |
| `115-engineering-test-framework-run-testing-scenario-daily-submission.js` | current | Table name note only |

## 3. Trigger / input-variable changes

| Automation | Change |
|------------|--------|
| 005 | **None** — still `recordId` from Submissions |
| 033 | **None** — still `recordId` from Weekly Athlete Summary |
| 067 | **None** — still `recordId` from Final Reflection Quiz Submissions |
| 068–076 | **None** |

## 4. Airtable field changes (after paste + proof)

See [HOMEWORK-LIBRARY-FIELD-MATRIX.md](./HOMEWORK-LIBRARY-FIELD-MATRIX.md).

**DELETE (library):** `Week`, `Grade Band`, `Lesson Key`, schedule Program/Year fields, library `Homework Slot` if present.

**REWRITE:** `Assignment Full Name - Display` → content-only formula (no Week/PI/slot/PWTEST).

**KEEP:** content fields listed in field matrix.

## 5. PHA fields required

`Homework Assignment`, `Program Instance`, `Week`, `Grade Band`, `Homework Slot`, `Active?`, `Schedule Key` (formula).

## 6. JIT PHA proof rows (create manually — fresh RIDs)

| Field | HW1 | HW2 |
|-------|-----|-----|
| Homework Assignment | `rechVLOeyEVIqmy2v` | `rec6WmXjpLtIWDERo` |
| Program Instance | `rec5mEM0YPqPqq0hZ` | same |
| Week | `recWeVrSabnsYaHc2` | same |
| Grade Band | `reclWDQZzKbVBtdhG` | same |
| Homework Slot | `HW1` | `HW2` |
| Active? | ✓ | ✓ |

## 7. Fillout

See [HOMEWORK-FILLOUT-INTEGRATION.md](./HOMEWORK-FILLOUT-INTEGRATION.md).

## 8. Live regression order

1. Repo offline tests (below)
2. Create JIT PHA rows
3. 005 — Activity Date week + PHA validate
4. 033 — WAS homework from PHA only
5. Full intake 009 → 020 with aligned submission
6. 067 — HW17 quiz (if in scope)
7. `/shoot` public catalog
8. Fillout limited choices

### Repo offline tests

```bash
node --test tools/testing/tests/test_homework_runtime_guardrails.mjs
node --test tools/testing/tests/test_homework_architecture_offline.mjs
node --test tools/testing/tests/test_005_023_chain_offline.mjs
node --test tests/homework-contracts/067-summary-link.test.js
node --test tests/homework-contracts/068-summary-reconciliation.test.js
```

## 9. Web deploy

Push `master` after Mike approval → Vercel root `web/`.  
`homework-queries.ts` uses **Homework Library** + PHA-first catalog.

## 10. Do not update until live proof

`docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md`
