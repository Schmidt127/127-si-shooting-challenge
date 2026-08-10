# START HERE — PROD PASTE

**Repository:** `Schmidt127/127-si-shooting-challenge`  
**Branch:** `master`  
**Purpose:** This is the one operator-facing location for the current Shooting Challenge PROD paste/cutover work. **Do not hunt through old PRs.** All links below point to the current files on `master`.

## Current homework cutover

| Order | Automation | Current repo version | PROD status | Action |
|---|---|---:|---|---|
| 1 | 005 — Assign Week to Submission | **v5.1** | Mike pasted | Keep current |
| 2 | 033 — Assign Homework to WAS + reconcile deferred completions | **v4.2** | **Needs paste over v4.1** | Paste current master file |
| 3 | 067 — Link/Create Completion from Reflection Quiz | **v3.1** | Mike pasted | Keep current |
| — | 068 — Reconcile Deferred Weekly Summary Links | **RETIRED** | Do not create | Logic absorbed into 033 v4.2 |
| — | 020 — Link/Create Homework Completion | **v3.4.1** | **Needs paste** — PHA-authoritative Homework Name 1/2 | Paste current master file |
| — | 009 — Create Submission Assets | **v1.1** | Existing | Do not downgrade |

### Copy/paste files

- **005 v5.1**  
  [`airtable/automations/shooting-challenge/005-submission-intake-and-asset-creation-assign-week-to-submission-homework-first.js`](./airtable/automations/shooting-challenge/005-submission-intake-and-asset-creation-assign-week-to-submission-homework-first.js)

- **033 v4.2 — NEXT PASTE**  
  [`airtable/automations/shooting-challenge/033-weekly-summary-and-goal-logic-assign-homework-to-weekly-athlete-summary.js`](./airtable/automations/shooting-challenge/033-weekly-summary-and-goal-logic-assign-homework-to-weekly-athlete-summary.js)

- **067 v3.1**  
  [`airtable/automations/shooting-challenge/067-homework-link-or-create-completion-from-reflection-quiz.js`](./airtable/automations/shooting-challenge/067-homework-link-or-create-completion-from-reflection-quiz.js)

- **020 v3.4.1 — PHA-authoritative (paste after 033)**  
  [`airtable/automations/shooting-challenge/020-homework-link-or-create-homework-completion.js`](./airtable/automations/shooting-challenge/020-homework-link-or-create-homework-completion.js)

  **Schema:** `Submissions.Homework Name 1/2` link to **Program Homework Assignments** (not FBC Curriculum). 020 validates PHA against Week + Program Instance + slot, then derives curriculum Homework from PHA.

- **009 v1.1 — unchanged**  
  [`airtable/automations/shooting-challenge/009-submission-intake-create-submission-assets.js`](./airtable/automations/shooting-challenge/009-submission-intake-create-submission-assets.js)

## Airtable automation capacity

### Retire / do not create

- **068:** do not create. Its deferred Homework Completion → Weekly Athlete Summary reconciliation is now inside **033 v4.2**.
- **075 — Build Challenge Welcome Email:** retire/delete from Airtable. The current Welcome delivery path is `Email Handoff Queue → 079 → Communications Hub → Resend`; the Hub owns WELCOME subject/HTML rendering. 075 is legacy build-only and is not the current send owner.
- **112:** already deleted in PROD.
- **043:** already deleted in PROD.

### Keep for now

Do **not** delete the current Daily or Weekly email paths yet. Communications Hub migration packages for Shooting Challenge Daily Submission and Weekly Athlete Summary are still separate rollout work.

## Homework Library schema cutover

### Rewrite first

`Assignment Full Name - Display`:

```text
CONCATENATE(
  IF({Book Abbreviation}, {Book Abbreviation} & " - ", ""),
  IF({Assignment Topic}, {Assignment Topic} & " - ", ""),
  {Assignment Title}
)
```

### Keep

Reusable content/identity fields such as:
- Assignment Title
- Assignment Full Name
- Assignment Topic
- Book / Book Abbreviation
- descriptions / instructions / rationale
- Age Appropriate
- Docs / URLs
- Cover Images
- Homework Number
- Assignment Number / Order
- Active?
- Published?
- Record Id
- inverse relationship fields

### Delete after dependency cleanup

Scheduling-only fields such as:
- Week
- scheduling Grade Band
- Program
- Program Instance
- school-year scheduling fields
- library Homework Slot
- Lesson Key
- PWTEST/test-only scheduling helpers

## Fresh JIT PHA proof rows

Create only after the corrected scripts/schema are installed.

### HW1
- Homework Assignment: `rechVLOeyEVIqmy2v`
- Program Instance: `rec5mEM0YPqPqq0hZ`
- Week: `recWeVrSabnsYaHc2`
- Grade Band: `reclWDQZzKbVBtdhG`
- Homework Slot: `HW1`
- Active?: checked

### HW2
- Homework Assignment: `rec6WmXjpLtIWDERo`
- Program Instance: `rec5mEM0YPqPqq0hZ`
- Week: `recWeVrSabnsYaHc2`
- Grade Band: `reclWDQZzKbVBtdhG`
- Homework Slot: `HW2`
- Active?: checked

## Immediate operator sequence

1. Open this file on `master`.
2. Paste **033 v4.2** from the direct link above over current Airtable 033 v4.1.
3. Delete Airtable Automation **075** to recover one automation slot.
4. Rewrite `Assignment Full Name - Display`.
5. Remove obsolete Homework Library scheduling fields after dependency check.
6. Create fresh HW1/HW2 JIT PHA rows.
7. Run controlled Schmidt regression: `005 → 009 → 020`, then 033 and 067.
8. Update Completion Master only after live PROD proof.

## Rule going forward

**Use `master` only.** Old PR branches are historical. If a new PROD paste is needed, update this root file in the same commit so the operator always has one obvious starting point.
