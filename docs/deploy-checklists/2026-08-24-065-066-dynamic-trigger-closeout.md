# Deploy checklist — 065 v10.3 / 066 v3.9 dynamic trigger closeout (2026-08-24)

**Status:** `complete` / `live-tested`  
**Production impact:** Airtable automation script paste + input variable mapping only (no schema changes)

---

## What was proven (Mike attestation 2026-08-24)

| Automation | Version | Trigger table | Input mapping | Result |
|------------|---------|---------------|---------------|--------|
| **065** Homework XP create/reconcile | **v10.3** | Homework Completions | `recordId` = **Record ID from trigger** (dynamic) | Live with dynamic record mapping |
| **066** Shot milestone unlocks | **v3.9** | Enrollments | `recordId` = **Record ID from trigger** (dynamic) | Live; replay verified idempotent |

Prior Production issue (hardcoded reference `recordId` in script action inputs) is **resolved**. Disposable weekly-email fixture settlement that required canonical manual writes was a **pre-paste** workaround only.

---

## Repository verification (no Production writes)

| Check | Result |
|-------|--------|
| **065** uses `input.config().recordId` only | PASS — no hardcoded operational record IDs in executable logic |
| **066** uses `input.config().recordId` only | PASS |
| Missing / invalid `recordId` fails safely | PASS — explicit errors in script |
| Source keys | PASS — `HOMEWORK_XP\|{hcId}` / `SHOT_MILESTONE\|{enrollmentId}\|{milestoneId}` |
| Replay idempotency | PASS — offline harness + Mike Production replay on **066** |
| Wrong enrollment / week / assignment protection | PASS — ownership + PHA checks in **065**; enrollment-scoped milestone logic in **066** |
| Existing XP reused instead of duplicated | PASS — reconcile paths in **065**; skip-existing unlocks in **066** |
| `tests/automation-contracts/065-066-trigger-record.test.js` | PASS |
| `tools/testing/tests/test_065_066_trigger_record.mjs` | PASS |
| Agent 4 suite | PASS |

Paste artifacts: [`065-v10.3-PASTE.txt`](./065-v10.3-PASTE.txt), [`066-v3.9-PASTE.txt`](./066-v3.9-PASTE.txt)  
Install guide: [`065-066-v10.3-v3.9-dynamic-trigger-record.md`](./065-066-v10.3-v3.9-dynamic-trigger-record.md)

---

## Reuse guidance

**065** and **066** are now reusable on **new** Homework Completion and Enrollment records when:

1. Automations remain **ON** with dynamic `recordId` input mapping (never paste literal test IDs).
2. Trigger conditions match the script contract (065: `Homework XP Reconciliation Needed? = 1`; 066: `Run Shot Milestone Check?` checked).
3. Business ownership preconditions are met (enrollment, week, PHA identity for homework; grade band + counted submissions for milestones).

Reference test records (`recpuUEXGlVve9tRN`, `recCyFEPeATOVNlr9`) remain valid **manual test cards** only — not production input mappings.

---

## Do not

- Paste literal `recordId` values into automation script inputs.
- Re-arm protected historical records (see [`2026-08-24-historical-audit-artifacts.md`](./2026-08-24-historical-audit-artifacts.md)).
- Run **072**, **074**, or **079** as part of this closeout.
- Send email.
