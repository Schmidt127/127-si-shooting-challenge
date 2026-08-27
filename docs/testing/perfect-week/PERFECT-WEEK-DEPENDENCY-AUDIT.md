# Perfect Week — Dependency Audit (gated test timestamp path)

| Field | Value |
|-------|--------|
| Date | 2026-08-05 |
| PROD base | `appn84sqPw03zEbTT` |
| Scope | Before/after updating `Submissions.Submitted Same Day?` for gated fixtures |
| Automation 057 | **No logic change** |

## Fields inspected

| Field | Table | ID | Type |
|-------|-------|-----|------|
| Submitted Same Day? | Submissions | `fldE7G8H1O7HPYuIi` | formula (updated) |
| Perfect Week Countable Submission? | Submissions | `fldYDitgQr6jgoDMk` | formula (unchanged) |
| Submitted At | Submissions | `fld7JJ7neI0YYmB7i` | formula `CREATED_TIME()` |
| Created | Submissions | `fld4G2aFUD8mxwjJ5` | formula `CREATED_TIME()` (twin; **not** used by Same Day formula) |
| Activity Date | Submissions | `fldpkkSBsx8kQRZos` | date |
| Testing Scenarios | Submissions | `fldOqG2lqGtdOo6ws` | link |
| Weekly Athlete Summary | Submissions | `fldZXSYorbG7BdDEo` | link |
| Perfect Week Test Record? | Submissions | `fld0xNqO0ryOe7uEY` | checkbox (**new**) |
| Perfect Week Test Submitted At | Submissions | `fldr2msxUo1kPjROD` | dateTime America/Denver (**new**) |
| Enrollment Record ID Lookup | Submissions | `fldHH6GDDG9DixHBT` | lookup → Enrollments.`Record Id` (**new**, gate only) |
| Perfect Week Test Override? | WAS | `fldowpElOxgvOisY0` | checkbox (**unused**; must stay unchecked) |

## Dependency map

### Submitted Same Day?

| Consumer | Dependency |
|----------|------------|
| `Perfect Week Countable Submission?` | Requires Same Day `= 1` |
| Automation **057** | Indirect — reads Countable only |
| Unlock **058** / XP **059** | Indirect via Eligible after 057 |
| Website (`web/`) | **None** |
| Make blueprints | **None** |
| Fillout | **None** (test fields must stay off forms) |
| Softr | **None** found in repo |
| Lambda | **None** found in repo |
| Fixture tooling / verifier | Reads Same Day + Countable for CASE-07/02/01 |

### Perfect Week Countable Submission?

| Consumer | Dependency |
|----------|------------|
| Automation **057** | Counts days where Countable is truthy |
| Rollups / Days Logged | Existing WAS rollups (unchanged) |
| Website / Make / Fillout | **None** in repo |

### Created / Submitted At

| Note |
|------|
| Production Same Day path continues to use **`Submitted At`** (`CREATED_TIME()`), not `{Created}`. Both are system create-time twins. Preserving `{Submitted At}` keeps blank-handling and historical formula identity. |

### Activity Date

| Consumer | Dependency |
|----------|------------|
| Same Day formula | Compared (Denver day) to submit timestamp |
| Countable | Must be present |
| 057 | Denver date-key aggregation |
| Fillout / athlete path | Normal activity date (unchanged) |

### Testing Scenarios

| Consumer | Dependency |
|----------|------------|
| Same Day gated path | **Not** used as security gate |
| Fixtures | Optional link for labeling only |

### New test fields + Enrollment RID lookup

| Consumer | Dependency |
|----------|------------|
| Same Day formula | Gate: checkbox + Test Submitted At + `FIND("rec93mAfo5jKqP3g5", ARRAYJOIN({Enrollment Record ID Lookup}))` |
| 057 | Does **not** read these fields |
| Verifier | FAIL if non-Schmidt enrollment uses them; FAIL if CASE-02/07 have them; FAIL if CASE-01 fixtures missing them under gated method |
| Public surfaces | Must remain absent from Fillout / Softr / parent UI |

## Gate design (Enrollment RID)

`RECORD_ID({Enrollment})` is **not** reliable Airtable formula syntax for linked records.

Safest dependency-preserving approach used in PROD:

1. Enrollments already expose `Record Id` = `RECORD_ID()`.
2. Added Submissions lookup **`Enrollment Record ID Lookup`** → that field.
3. Gate uses `FIND("rec93mAfo5jKqP3g5", ARRAYJOIN({Enrollment Record ID Lookup})) > 0`.

Do **not** gate on displayed Enrollment name.

## Blast radius of formula change

| Path | Effect |
|------|--------|
| Normal athlete submissions | Unchanged — still `Submitted At` vs `Activity Date` |
| Checkbox alone | No test path (probe PASS 2026-08-05) |
| Timestamp alone | No test path (probe PASS 2026-08-05) |
| Other Enrollment + both test fields | No test path (RID FIND fails) |
| Schmidt enrollment + both fields + matching Test Submitted At | Test path → Same Day 1 when Denver days match |

## Explicit non-dependencies

- Automation **057/058/059** script source — **not modified**
- `Perfect Week Test Override?` — remains unused
- XP Source Key format — unchanged (`PERFECT_WEEK|{enr}|{week}`)
