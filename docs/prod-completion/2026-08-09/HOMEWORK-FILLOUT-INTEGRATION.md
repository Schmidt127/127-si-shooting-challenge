# Homework Fillout Integration — Post-Cutover Architecture

Date: 2026-08-09 (updated 2026-08-10 for PHA-linked Homework Name fields)  
Related: [HOMEWORK-LIBRARY-PROD-EXECUTION-CHECKLIST.md](./HOMEWORK-LIBRARY-PROD-EXECUTION-CHECKLIST.md)

## Principle

Fillout writes **Program Homework Assignment (PHA) record IDs** to:

- `Submissions.Homework Name 1`
- `Submissions.Homework Name 2`

These fields store **authoritative schedule identity** for the selected slot. Automation **020 v3.4.1** validates the PHA against Submission Week, Enrollment Program Instance, and HW1/HW2 slot, then derives curriculum content from `PHA.Homework Assignment`.

> **2026-08-10 schema correction:** Production links Homework Name 1/2 to **Program Homework Assignments**, not directly to `FBC Curriculum - SYNC`. Older docs that described library RIDs in these fields are superseded.

**Program Homework Assignments** remains the scheduling authority; Fillout must offer only PHA rows valid for the athlete's current context.

## Required participant experience

Athletes must only **see and select** active PHA rows for their context:

| PHA dimension | Source |
|---------------|--------|
| Program Instance | Enrollment.Program Instance |
| Week | Resolved by automation 005 from Activity Date + PI calendar |
| Grade Band | Enrollment.Grade Band (eligibility on PHA; not used by 020 for schedule match) |
| Slot | HW1 / HW2 |
| Content | PHA → Homework Assignment (library) |

## Validation chain (server-side)

```text
Fillout writes Homework Name 1/2 (PHA rec…)
    → 005 assigns Submission.Week from Activity Date + PI
    → 009 creates assets (content/slot provenance only)
    → 020 validates PHA (active; Week + PI + slot match) → derives library Homework from PHA
```

Misaligned Fillout choices **must fail closed** — do not weaken 020.

## Fillout configuration options

### Option A — Preferred: PHA-linked choices (Fillout)

Filter linked-record choices to **active PHA** rows matching respondent Enrollment Program Instance + resolved Week + slot.

Store selected **PHA record ID** in Homework Name 1/2.

### Option B — Operator-maintained PHA lists (interim)

1. Coach creates JIT PHA rows for the current week.
2. Operator updates Fillout choice lists weekly to only the **currently assigned PHA records** for each slot.
3. 005 + 020 still validate server-side — stale choices fail closed.

## What NOT to do

- Do not write **library RIDs** directly into Homework Name 1/2 (superseded schema).
- Do not restore `Homework Library.Week` for Fillout filtering.
- Do not show the full Homework Library catalog as current homework.

## Controlled proof (JIT PHA)

After operator creates JIT PHA rows for Early Bird week, Fillout should offer the **PHA record IDs** (not library RIDs), e.g.:

| Slot | PHA record (example) |
|------|----------------------|
| HW1 | `reca5GM1JkROhXOiy` |
| HW2 | `reccQhrgOK8e8Yngv` |

See [PROGRAM-HOMEWORK-ASSIGNMENTS-2026-2027-RESTORATION.md](../2026-08-08/PROGRAM-HOMEWORK-ASSIGNMENTS-2026-2027-RESTORATION.md).
