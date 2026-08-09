# Homework Fillout Integration — Post-Cutover Architecture

Date: 2026-08-09  
Related: [HOMEWORK-LIBRARY-PROD-EXECUTION-CHECKLIST.md](./HOMEWORK-LIBRARY-PROD-EXECUTION-CHECKLIST.md)

## Principle

Fillout continues to write **Homework Library record IDs** to:

- `Submissions.Homework Name 1`
- `Submissions.Homework Name 2`

These fields store **reusable content identity**, not schedule.

**Program Homework Assignments** is the sole scheduling authority for what homework is currently assigned.

## Required participant experience

Athletes must only **see and select** homework that is **currently assigned** to them via active PHA for their context:

| PHA dimension | Source |
|---------------|--------|
| Program Instance | Enrollment.Program Instance |
| Week | Resolved by automation 005 from Activity Date + PI calendar (not library Week) |
| Grade Band | Enrollment.Grade Band |
| Slot | HW1 / HW2 |
| Content | Homework Library RID |

## Validation chain (server-side)

```text
Fillout writes Homework Name 1/2 (library RID)
    → 005 assigns Submission.Week from Activity Date + PI
    → 005 validates library RID against active PHA (exact PI + Week + GB + slot)
    → 009 creates assets (content/slot provenance only)
    → 020 exact PHA match (fail closed if misaligned)
```

Misaligned Fillout choices **must fail closed** — do not weaken 020.

## Fillout configuration options

### Option A — Preferred: dynamic choice filter (Fillout)

If Fillout supports filtering linked-record choices per respondent:

1. Pre-filter Homework Library choices to RIDs with an **active PHA** matching respondent Enrollment PI + current Week + Grade Band + slot.
2. Store selected **library RID** in Homework Name 1/2.

This may require Fillout logic outside Airtable or a maintained "current assignments" helper view — **do not** add schedule fields back to Homework Library.

### Option B — Operator-maintained choice lists (interim)

Until dynamic PHA filtering exists:

1. Coach creates JIT PHA rows for the current week.
2. Operator updates Fillout choice lists weekly to only the **currently assigned library RIDs** for each slot.
3. 005 + 020 still validate server-side — stale Fillout choices fail closed.

### Option C — Automation-mediated intake (future)

If Fillout cannot filter cleanly:

1. Fillout writes a **slot selection** or **PHA-aware helper field** (not library Week).
2. An automation maps slot → active PHA → library RID before 005/020.

This is **not implemented** in this PR. Document as future work if Option A/B are insufficient.

## What NOT to do

- Do not write PHA record IDs into Homework Name 1/2 (PHA is schedule, library is content).
- Do not restore `Homework Library.Week` for Fillout filtering.
- Do not show the full Homework Library catalog as current homework.

## Controlled proof (JIT PHA)

After operator creates JIT PHA rows for Early Bird week:

| Slot | Library RID |
|------|-------------|
| HW1 | `rechVLOeyEVIqmy2v` |
| HW2 | `rec6WmXjpLtIWDERo` |

Fillout choices for Schmidt 3-4 Early Bird should offer **only these two** library records until PHA changes.
