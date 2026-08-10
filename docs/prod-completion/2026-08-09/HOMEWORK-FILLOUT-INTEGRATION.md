# Homework Fillout Integration — Post-Cutover Architecture

Date: 2026-08-10 (updated for PHA-first intake)
Related: [HOMEWORK-LIBRARY-PROD-EXECUTION-CHECKLIST.md](./HOMEWORK-LIBRARY-PROD-EXECUTION-CHECKLIST.md)

## Principle

Fillout writes **Program Homework Assignment (PHA) record IDs** to:

- `Submissions.Homework Name 1`
- `Submissions.Homework Name 2`

These fields store **schedule selection** (which PHA row the athlete chose). **Homework Library** content identity is derived server-side from `PHA.Homework Assignment`.

**Program Homework Assignments** is the sole scheduling authority for what homework is currently assigned.

## Required participant experience

Athletes must only **see and select** homework that is **currently assigned** to them via active PHA for their context:

| PHA dimension | Source |
|---------------|--------|
| Program Instance | Enrollment.Program Instance |
| Week | Resolved by automation 005 from Activity Date + PI calendar (not library Week) |
| Slot | HW1 / HW2 |
| Content | Homework Library RID via `PHA.Homework Assignment` |

**Grade Band is not part of scheduling identity.** PHA Grade Band may remain eligibility/descriptive metadata; automations 005 and 020 do not match on it.

## Validation chain (server-side)

```text
Fillout writes Homework Name 1/2 (PHA record ID)
    → 005 assigns Submission.Week from Activity Date + PI
    → 005 loads PHA by ID; validates PI + Week + Slot + Active; dereferences library ID
    → 009 creates assets (content/slot provenance only — exactly one link per slot)
    → 020 loads same PHA by ID; writes HC.Homework = library ID, HC.Program Homework Assignment = PHA ID
```

Misaligned Fillout choices **must fail closed** — do not weaken 005 or 020.

## Fillout configuration options

### Option A — Preferred: dynamic PHA choice filter (Fillout)

If Fillout supports filtering linked-record choices per respondent:

1. Pre-filter **PHA** choices to active rows matching respondent Enrollment PI + current Week + slot.
2. Store selected **PHA record ID** in Homework Name 1/2.
3. Do **not** require athletes to pick Homework Library records directly.

### Option B — Operator-maintained PHA choice lists (interim)

Until dynamic PHA filtering exists:

1. Coach creates JIT PHA rows for the current week.
2. Operator updates Fillout choice lists weekly to only the **currently assigned PHA record IDs** for each slot.
3. 005 + 020 still validate server-side — stale Fillout choices fail closed.

### Option C — Automation-mediated intake (future)

If Fillout cannot filter cleanly:

1. Fillout writes a **slot selection** helper field.
2. An automation maps slot → active PHA before 005/020.

This is **not implemented** in this change set.

## What NOT to do

- Do not write Homework Library record IDs into Homework Name 1/2 (library is content; PHA is schedule).
- Do not restore `Homework Library.Week` for Fillout filtering.
- Do not show the full Homework Library catalog as current homework.
- Do not use Grade Band in 005/020 scheduling matches.

## Controlled proof (JIT PHA)

After operator creates JIT PHA rows for Early Bird week:

| Slot | PHA record ID | Library RID (via PHA.Homework Assignment) |
|------|---------------|-------------------------------------------|
| HW1 | `recgj8dPk4ouTwCOj` | `rechVLOeyEVIqmy2v` |
| HW2 | *(operator PHA for HW2)* | `rec6WmXjpLtIWDERo` |

Fillout choices for Schmidt 3-4 Early Bird should offer **only the active PHA record IDs** for each slot until PHA changes.

## Automation paste order (production)

1. **005 v5.3** — PHA-direct validation on intake
2. **020 v3.5** — PHA dereference for Homework Completions
3. **009** — unchanged (compatible slot guard)
4. Re-trigger a controlled submission or the failing row

**Not in this paste:** 067, 115, historical Submission backfill.
