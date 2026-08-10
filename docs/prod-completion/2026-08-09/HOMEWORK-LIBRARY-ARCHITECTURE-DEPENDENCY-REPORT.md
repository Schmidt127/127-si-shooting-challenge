# Homework Library Architecture — Dependency Report

Date: 2026-08-10 (PHA-first intake contract; current proof reconciled in the 2026-08-10 closeout packet)
Environment: PROD `appn84sqPw03zEbTT` (code/repo side; no live writes from agents)
Related audit: [HOMEWORK-CURRICULUM-PHA-CROSS-YEAR-AUDIT.md](./HOMEWORK-CURRICULUM-PHA-CROSS-YEAR-AUDIT.md)

## Canonical model (target)

```text
Program Homework Assignments — sole scheduling authority
        ↓
Submissions.Homework Name 1/2 — PHA record ID (Fillout / 115 ETF intake)
        ↓
005 validates PHA + assigns Week from Activity Date + PI
        ↓
009 creates Submission Assets (slot guard only)
        ↓
020 / 067 write Homework Completions:
  HC.Homework = Homework Library ID (via PHA.Homework Assignment)
  HC.Program Homework Assignment = PHA ID
```

**Schedule identity:** `Program Instance | Week | Homework Slot | Active` (+ PHA record ID at intake).
**Grade Band** is eligibility/metadata only — never used for scheduling matches in 005/020/067.

**Homework Library** is content-only. Do not write library RIDs to `Submissions.Homework Name 1/2`.

---

## Automation contract summary (repo)

| Automation | Version | Homework Name 1/2 | HC writes | Notes |
|------------|---------|-------------------|-----------|-------|
| **005** | v5.3 | Reads PHA IDs; validates; outputs PHA + library IDs | — | Week from Activity Date + PI |
| **009** | v1.1 | Slot guard (exactly one link) | — | Unchanged |
| **020** | v3.5 | Reads PHA from Submission | Library + PHA | Enrollment idempotency |
| **067** | v3.4 | Writes PHA ID on parent Submission | Library + PHA | HW17 PI-first PHA scan; linked Completion validation is fail-closed |
| **115** | v2.1 | Writes PHA ID from scenario link | — | Authorized enrollment allowlist; fail closed on library-only |
| **033** | v4.3 | — | WAS homework links via PHA | Unchanged in this package |

---

## Homework Name 1 / Homework Name 2

| Location | Class | Contract |
|----------|-------|----------|
| Fillout → Submissions | fillout | Stores **PHA record ID** |
| 115 ETF → Submissions | test-fixture | Testing Scenarios.Homework Assignment must link PHA |
| 005 | scheduling | Direct PHA load + validate + dereference library |
| 020 | scheduling | PHA from Submission → HC library + PHA fields |
| 067 | scheduling | HW17 PHA discovery → Submission + HC |

---

## Legacy data

Submissions created before this contract may still have **Homework Library** RIDs in `Homework Name 1/2`. Those rows will fail 005 validation until a **controlled backfill** replaces library RIDs with the correct PHA RIDs. **No runtime fallback** is implemented.

---

## Operator actions (post-paste)

1. Treat the historical paste sequence above as superseded by the current committed package versions.
2. Update Fillout choice lists to PHA record IDs.
3. Update Testing Scenarios homework rows to link PHA (not library).
4. Use the current [C-020 checklist](../../deploy-checklists/C-020-testing-scenarios-script-checklist.md) and closeout packet for controlled proof; one explicit 115 request creates one Submission, while a second explicit request creates another by design.
5. Plan historical Submission backfill separately.

See also: [HOMEWORK-FILLOUT-INTEGRATION.md](./HOMEWORK-FILLOUT-INTEGRATION.md)
