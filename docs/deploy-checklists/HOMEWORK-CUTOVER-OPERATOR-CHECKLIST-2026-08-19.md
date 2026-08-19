# Homework cutover — operator checklist

**Live base:** Production only (`appn84sqPw03zEbTT`)  
**Authority:** [`START-HERE-PROD-PASTE.md`](../../START-HERE-PROD-PASTE.md) · [`HOMEWORK-LIBRARY-FIELD-MATRIX.md`](../prod-completion/2026-08-09/HOMEWORK-LIBRARY-FIELD-MATRIX.md)  
**Last updated:** 2026-08-19

Use this as the single progress tracker. Check items in Airtable/OMNI as Mike completes them.

---

## Schema deletes (Homework Library + Submissions)

| # | Item | Owner | Status |
|---|------|-------|--------|
| S1 | Delete **Homework Library → `Lesson Key`** | Mike | **Done** 2026-08-19 |
| S2 | Delete **Submissions → `Week Lkp`** | Mike | **Done** 2026-08-19 |
| S3 | Rewrite **`Assignment Full Name - Display`** (content-only formula) | Mike | Open |
| S4 | Delete **Homework Library → `Week`** | Mike | Open |
| S5 | Delete **Homework Library → scheduling `Grade Band`** | Mike | Open |
| S6 | Delete **Homework Library → `Program` / `Program Instance` / school-year schedule fields** | Mike | Open |
| S7 | Delete **Homework Library → `Homework Slot`** (if present) | Mike | Open |
| S8 | Remove **PWTEST / test-only scheduling helpers** on library | Mike | Open |

**Display formula (S3):**

```text
CONCATENATE(
  IF({Book Abbreviation}, {Book Abbreviation} & " - ", ""),
  IF({Assignment Topic}, {Assignment Topic} & " - ", ""),
  {Assignment Title}
)
```

**Identity after cutover:**

| Purpose | Field |
|---------|--------|
| Reusable lesson content | Homework Library **`Record Id`** |
| Scheduled assignment dedupe | PHA **`Schedule Key`** |
| Submission week | Submissions **`Week`** (Automation **005**) |

---

## Automation paste / retire

| # | Item | Repo version | PROD | Owner | Status |
|---|------|-------------|------|-------|--------|
| A1 | **005** Assign Week | v5.1 | Pasted | Mike | **Done** |
| A2 | **033** Assign Homework to WAS | **v4.2** | v4.1 live | Mike | **Paste v4.2** |
| A3 | **067** Reflection quiz completion | v3.1 | Pasted | Mike | **Done** |
| A4 | **020** Homework completion | **v3.6** | v3.6 live | Mike | **Done** — do not downgrade |
| A5 | **009** Submission assets | v1.1 | Existing | Mike | Keep |
| A6 | **068** Deferred WAS reconcile | RETIRED | Absent | — | Do not create (logic in 033 v4.2) |
| A7 | **075** Build Welcome Email | RETIRED | Delete | Mike | Open — frees one automation slot |

**033 paste file:** [`033-weekly-summary-and-goal-logic-assign-homework-to-weekly-athlete-summary.js`](../../airtable/automations/shooting-challenge/033-weekly-summary-and-goal-logic-assign-homework-to-weekly-athlete-summary.js)

---

## PHA proof rows + regression

| # | Item | Owner | Status |
|---|------|-------|--------|
| P1 | Create JIT **HW1** PHA row (see `START-HERE-PROD-PASTE.md`) | Mike | Open — after A2 + schema S3–S8 |
| P2 | Create JIT **HW2** PHA row | Mike | Open |
| P3 | Controlled Schmidt regression: `005 → 009 → 020` | Mike | Open |
| P4 | Then **033** and **067** on same fixture | Mike | Open |
| P5 | Update **Completion Master** §2C only after P3–P4 pass | Cursor + Mike | Open |

---

## Repo / snapshot (no Airtable paste)

| # | Item | Owner | Status |
|---|------|-------|--------|
| R1 | Re-export PROD snapshot after schema cleanup | Mike or Cursor | Open — needs `AIRTABLE_API_TOKEN`; clears stale `Lesson Key` / `Week Lkp` from `prod-20260819/` |
| R2 | Refresh `airtable/schema/current/table-map.md` / `field-map.md` | Cursor | Pointer updated 2026-08-19; full hand inventory still open |

---

## Not in this cutover

- Daily / Weekly email Communications Hub migration (separate packages)
- Perfect Week full E2E (PKG-012)
- PKG-037 core certification
- Lambda secret rotation (optional follow-up)
