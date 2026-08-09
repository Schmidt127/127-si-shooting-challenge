# Homework Library — Field KEEP / DELETE / REVIEW Matrix

Date: 2026-08-09  
Table: `FBC Curriculum - SYNC` → **`Homework Library`** (`tblUuxwYlX4EQ9MKE`)

After PHA owns all scheduling, Homework Library is **content-only**. No historical 2025–2026 row preservation is required.

---

## KEEP — reusable content

| Field | Type | Role |
|-------|------|------|
| `Assignment Full Name` | text | Primary human label; operator editing |
| `Assignment Title` | text | Short content title (e.g. Shot Tracker Usage) |
| `Assignment Topic` | text | Content grouping |
| `Book` / `Book Abbreviation` | text / select | Curriculum structure |
| `Full Assignment Description` | long text | Coach/athlete content |
| `Assignment Description` / `Brief Description - Display` | text | Summaries |
| `Specific Steps` | long text | Instructions |
| `Assignment Rationale` | long text | Coach context |
| `Age Appropriate` | text | Content metadata |
| `Docs` / `URL` / `URL Additional` | url / text | Resources |
| `Cover Images` | attachment | Public display |
| `Homework Number` | single select | **Content slot hint** (HW 1…HW 18) — not schedule authority |
| `Assignment Number` / `Order` | number | Sort order within book/topic |
| `Active?` | checkbox | Operator content lifecycle |
| `Published?` | checkbox | Public catalog gate (`/shoot`) |
| `Record Id` | formula | Stable RID helper for PHA / tooling |
| `Submissions` / `Submissions copy` | link | Inverse HW1/HW2 intake |
| `Homework Completions` | link | Inverse completion bridge |
| `Weekly Athlete Summary` | link | Inverse (legacy link path; PHA assigns via 033) |
| `Program Homework Assignments` | link | Inverse PHA scheduling |

---

## DELETE — scheduling-only / obsolete

Delete only **after** automations in this PR are pasted to PROD and controlled proof passes.

| Field | Why obsolete |
|-------|----------------|
| `Week` | PHA.`Week` is sole schedule week |
| `Grade Band` | PHA.`Grade Band` is sole schedule band |
| `Program` | Season scope lives on PHA + Program Instance |
| `Program Instance` | If present — never belonged on reusable library |
| School-year fields | Season belongs on PI / PHA |
| `Lesson Key` | Formula embeds Week + Grade Band — schedule identity |
| Slot-specific schedule helpers | Any field encoding HW1/HW2 **week** assignment on library |

---

## REVIEW — ambiguous / display / external sync

| Field | Issue | Recommendation |
|-------|-------|----------------|
| `Assignment Full Name - Display` | Formula `{Week} \| {Homework Number} \| {Assignment Title}` embeds schedule + PWTEST context | **Refactor** to content identity, e.g. `{Book Abbreviation} - {Assignment Title} - {Assignment Topic}` or `{Assignment Full Name}` only. Do **not** include Week, PI, season, or PWTEST. |
| `Homework Number` | Looks like schedule slot | **KEEP** as content metadata; PHA.`Homework Slot` owns HW1/HW2 schedule |
| `Active?` | Was used by 033 legacy path | **KEEP** for content lifecycle; PHA.`Active?` owns schedule activation |
| `Published?` | Public + legacy 033 | **KEEP** for `/shoot` content gate |
| `Assignment Full Name` (primary) | May contain pasted schedule text | **Audit rows**; normalize to content-only labels |
| External sync source fields | If FBC sync still connected | **REVIEW** with Mike — may block deletes |
| Lookups from Submissions (`Week Lkp`) | On Submissions table, not library | **DELETE on Submissions** after Fillout/005 proof (separate step) |

---

## PHA display (schedule context allowed)

PHA fields **may** include scheduling context:

- `Program Homework Assignment Display` — Library \| PI \| Week \| GB \| Slot
- `Schedule Key` — canonical composite

Homework Library display formulas **must not** mirror PHA schedule context.

---

## Exact field deletion order (PROD)

Execute only after checklist proof steps 1–8 pass.

1. Remove `Week` from any Homework Library interfaces/views used by operators for scheduling.
2. Confirm PHA has JIT assignments for current proof week (see checklist).
3. Paste automations `005` v5.0, `033` v4.0, `067` v3.0.
4. Run controlled submission + 020 proof.
5. Delete `Lesson Key` (formula — depends on Week/Grade Band).
6. Delete `Week` link field on Homework Library.
7. Delete `Grade Band` link field on Homework Library.
8. Delete `Program` / `Program Instance` / school-year fields if present.
9. Refactor `Assignment Full Name - Display` formula (content-only).
10. Delete Submissions.`Week Lkp` lookup if no longer referenced.

---

## Controlled proof library rows (content)

| Slot | Library RID | Content label (target) |
|------|-------------|------------------------|
| HW1 | `rechVLOeyEVIqmy2v` | SA - Personal Game Plan - Shot Tracker Usage |
| HW2 | `rec6WmXjpLtIWDERo` | Website Exploration (normalize display) |

Do **not** hardcode PHA record IDs — create fresh JIT rows per checklist.
