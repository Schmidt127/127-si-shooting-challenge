# Weeks Seed Specification

**SC item:** SC-065 (also supports SC-064)  
**Constraint:** Weeks are **manually created and seeded**. Do **not** automate Week creation. Do **not** redesign Week creation.  
**Validator:** `tools/enrollment-season/weeks_seed_validator.py` (read-only)  
**Template:** `weeks-seed-template.csv`  
**Example fixtures:** `tests/fixtures/enrollment-season/weeks-seed-*.csv` (example dates only)

---

## Required fields (seed)

| Field | Type | Rule |
|-------|------|------|
| Week Name | singleLineText | Required; Regular weeks prefer `Week N` |
| Start Date | dateTime | Required; America/Denver interpretation |
| End Date | dateTime | Required; must be ≥ Start Date |
| Sequence | integer (seed column) | Required for ordering/overlap checks (not necessarily an Airtable field today — ops ordering aid) |
| Timezone | constant | `America/Denver` |

### Recommended / optional seed columns

| Field | Rule |
|-------|------|
| Week Type | `Early Bird` \| `Regular` \| `Final` \| `Preseason` |
| Active? | If present on Weeks — otherwise treat row as active when seeded |
| Intake Open? | **Not in current PROD Weeks schema snapshot** — recommended future flag (C-018); until then, ops convention via Week Type |
| Counts for XP? | Recommended future flag; Early Bird often false |
| Counts for Leaderboard? | Recommended future flag |
| Program Instance | Link when multi-year scoping is active |

**Current PROD Weeks fields (snapshot):** Week Name, Start Date, End Date, Program Instance, plus relationship/rollup fields. Optional intake flags are **spec targets**, not live schema changes from this agent.

---

## Naming convention

| Type | Name pattern |
|------|----------------|
| Early Bird | `Early Bird` (or `Early Bird 1`) |
| Regular | `Week 1`, `Week 2`, … sequential |
| Final | `Final Week` or last `Week N` with type Final |
| Preseason | `Preseason` |

---

## Validation rules

1. Every row has name + start + end.  
2. End ≥ Start.  
3. Sequence unique.  
4. No overlapping date ranges among seeded rows.  
5. Gaps between consecutive sequences → WARNING (allowed for early-bird → Week 1 gap).  
6. Timezone must be America/Denver.  
7. Do not populate future **real** season dates unless already documented elsewhere — template uses placeholders / examples.

---

## Manual implementation steps (Mike/OMNI)

1. Copy `weeks-seed-template.csv`.  
2. Replace placeholders with approved season dates.  
3. Run `weeks_seed_validator.py` offline until PASS/acceptable WARNING.  
4. Create Weeks rows manually in PROD Airtable (UI).  
5. Link Program Instance.  
6. Smoke: Automation **005** maps a Schmidt activity date into the expected Week.

---

## Explicit non-goals

- No Airtable automation to create Weeks.  
- No script writing Start/End from code constants.  
- No live schema create for Intake Open? without Mike authorization.
