# Homework Library — Field Matrix (Final Cutover)

Date: 2026-08-09  
Table: **Homework Library** (`tblUuxwYlX4EQ9MKE`)  
PROD table rename: **complete** (operator)

---

## KEEP — reusable content (required after cutover)

| Field | Purpose |
|-------|---------|
| `Assignment Title` | Short content name |
| `Assignment Full Name` | Primary editable content label |
| `Assignment Topic` | Content grouping |
| `Book` / `Book Abbreviation` | Curriculum structure |
| `Full Assignment Description` | Long-form instructions |
| `Assignment Description` / `Brief Description - Display` | Summaries |
| `Specific Steps` | Athlete instructions |
| `Assignment Rationale` | Coach context |
| `Age Appropriate` | Content metadata |
| `Docs` / `URL` / `URL Additional` | Resources |
| `Cover Images` | Public display |
| `Homework Number` | Reusable content identifier (HW 1…HW 18) — **not** schedule slot |
| `Assignment Number` / `Order` | Content sort order within book/topic |
| `Active?` | Content lifecycle |
| `Published?` | Public `/shoot` catalog gate |
| `Record Id` | Stable RID helper |
| Inverse links: `Submissions`, `Homework Completions`, `Weekly Athlete Summary`, `Program Homework Assignments` | System dependencies |

---

## DELETE — obsolete scheduling (delete after PROD paste + proof)

| Field | Reason |
|-------|--------|
| `Week` | PHA.`Week` owns schedule |
| `Grade Band` | PHA.`Grade Band` owns schedule |
| `Program` | Season on PI / PHA |
| `Program Instance` | If present on library |
| School-year scheduling fields | PI / PHA scope |
| `Homework Slot` | If on library — PHA.`Homework Slot` owns HW1/HW2 |
| `Lesson Key` | Formula embeds Week + Grade Band |
| PWTEST / historical test-only fields | No preservation required |

---

## REWRITE — display formulas (content-only)

### `Assignment Full Name - Display`

**Current (obsolete):** embeds `{Week} | {Homework Number} | {Assignment Title}`

**Replace with (after DELETE fields removed):**

```text
CONCATENATE(
  IF({Book Abbreviation}, {Book Abbreviation} & " - ", ""),
  IF({Assignment Topic}, {Assignment Topic} & " - ", ""),
  {Assignment Title}
)
```

**Example output:** `SA - Personal Game Plan - Shot Tracker Usage`

**Rules:**

- No Week, Program Instance, School Year, HW1/HW2 slot, or PWTEST strings
- Must work after `Week` and schedule fields are deleted
- If `Assignment Full Name` is already clean content text, operators may alternatively set primary display to `{Assignment Full Name}` only:

```text
IF({Assignment Full Name}, {Assignment Full Name}, CONCATENATE(
  IF({Book Abbreviation}, {Book Abbreviation} & " - ", ""),
  IF({Assignment Topic}, {Assignment Topic} & " - ", ""),
  {Assignment Title}
))
```

### Other formulas to review

| Field | Action |
|-------|--------|
| `Brief Description - Display` | Ensure no Week/PI references |
| Any lookup from library.`Week` on Submissions | Delete `Week Lkp` on Submissions after proof |

---

## REVIEW — external / ambiguous

| Field | Notes |
|-------|-------|
| External sync source | May block field deletes — confirm with Mike |
| `Submissions copy` inverse | Keep if still used by Fillout HW2 |
| Historical `Assignment Full Name` text | Normalize rows with embedded PWTEST/week strings |

---

## PHA required fields (unchanged)

| Field | Role |
|-------|------|
| `Homework Assignment` | Link → Homework Library RID |
| `Program Instance` | Schedule PI |
| `Week` | Schedule week |
| `Grade Band` | Schedule band |
| `Homework Slot` | HW1 / HW2 |
| `Active?` | Current assignment gate |
| `Schedule Key` | Formula identity |

---

## Deletion order (PROD)

1. Paste automations 005 v5.1, 033 v4.1, 067 v3.1
2. Create JIT PHA proof rows
3. Run live regression (checklist §D)
4. Update Fillout choice filters
5. Rewrite `Assignment Full Name - Display` formula
6. Delete `Lesson Key`
7. Delete `Week` on Homework Library
8. Delete `Grade Band` on Homework Library
9. Delete remaining schedule fields on library
10. Delete Submissions.`Week Lkp` if unused
