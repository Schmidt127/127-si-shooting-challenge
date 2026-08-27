# Perfect Week fixture method (authoritative)

| Field | Value |
|-------|--------|
| Date | 2026-08-05 |
| Primary method (award / historical 7-day) | **`GATED_TEST_TIMESTAMP`** |
| Alternate (true calendar creates) | `LIVE_SAME_DAY_CALENDAR` |
| Automation 057 | v1.5 — **no logic change in this package** |
| Nature | **Tightly gated fixture mechanism — not athlete-facing production behavior** |
| Disposable E2E harness | [`SC-PW-E2E.md`](./SC-PW-E2E.md) — `tools/testing/sc-pw-e2e.mjs` (057→058→059, dry-run default) |

## Controlling rule

Normal athlete records **always** compare real `Submitted At` (`CREATED_TIME()`) to `Activity Date`.

Only controlled Perfect Week fixtures for Enrollment **`rec93mAfo5jKqP3g5`** (`Perfect Week Testing`) may use `Perfect Week Test Submitted At` instead of Created/Submitted At — and **only** when **all** of these are true:

1. Enrollment record ID is exactly `rec93mAfo5jKqP3g5` (via `Enrollment Record ID Lookup`, not display name)
2. `Perfect Week Test Record?` is checked
3. `Perfect Week Test Submitted At` is populated

If any condition is false → existing production Same Day logic unchanged.

## Why this exists

| Item | Value |
|------|--------|
| Pilot Submission | `recxbwkZpSJZ5eiqA` |
| Result | `Submitted Same Day? = 0`, `Perfect Week Countable Submission? = 0` |
| Cause | `Submitted At` = `CREATED_TIME()` — historical Activity Dates created later are never same-day |

`LIVE_SAME_DAY_CALENDAR` remains valid but requires one create per Denver day across a full week.  
`GATED_TEST_TIMESTAMP` allows CASE-01 (and other award fixtures) to be created **today** with historical Sunday–Saturday Activity Dates **without** weakening normal athlete logic.

## Field IDs (PROD)

| Field | ID |
|-------|-----|
| Perfect Week Test Record? | `fld0xNqO0ryOe7uEY` |
| Perfect Week Test Submitted At | `fldr2msxUo1kPjROD` |
| Enrollment Record ID Lookup | `fldHH6GDDG9DixHBT` |
| Submitted Same Day? | `fldE7G8H1O7HPYuIi` |

Formulas / rollback: [`PERFECT-WEEK-GATED-TEST-TIMESTAMP-ROLLBACK.md`](./PERFECT-WEEK-GATED-TEST-TIMESTAMP-ROLLBACK.md)  
Dependency audit: [`PERFECT-WEEK-DEPENDENCY-AUDIT.md`](./PERFECT-WEEK-DEPENDENCY-AUDIT.md)

## Perfect Week Test Override? (WAS)

**Unused.** Does nothing. Do **not** check. Verifier FAILs if checked.

## Automation 057 test mode

**None.** 057 still only counts `Perfect Week Countable Submission?`. Do not modify 057 for fixtures.

## CASE-01 create order (`GATED_TEST_TIMESTAMP`)

Enrollment: `rec93mAfo5jKqP3g5` (`Perfect Week Testing`) · Program Instance: `rec5mEM0YPqPqq0hZ`

### Program Instance isolation note (2026-08-06)

Test Weeks that **overlap operational Weeks** in the same Program Instance (example: `reci5GdxEC57vfoS3` PWTEST vs Early Bird `recWeVrSabnsYaHc2`) will block Automation **005** Activity Date matching if both remain Active.

**Convention:** Prefer a **dedicated testing Program Instance** for overlapping date fixtures. Otherwise deactivate/delete the fixture Week after the test (inspect dependencies first). See [`docs/prod-completion/2026-08-06/PROGRAM-INSTANCE-ISOLATION-PACKAGE.md`](../prod-completion/2026-08-06/PROGRAM-INSTANCE-ISOLATION-PACKAGE.md).

1. Week Sun–Sat (e.g. `2026-08-02` … `2026-08-08`) + WAS + Goal Record (5000 target).
2. Create **seven** Submissions today, one per day:
   - `Perfect Week Test Record?` = checked
   - `Activity Date` = that day’s Denver date
   - `Perfect Week Test Submitted At` = matching Denver date/time that day
   - `Shot Total` ≥ daily min (`ceil((Goal/9)/7)` with current WAS formula) and week total ≥ 5000 preferred
   - Leave system `Created` / `Submitted At` as actual create time
3. Three Video Feedback rows linked to enrollment + week + submissions.
4. No Zoom meeting for CASE-01 (Zoom Met via “none required”).
5. No parent email / Build-Send arms.
6. Wait for formulas → Same Day=1, Countable=1 on all seven.
7. Set/rearm WAS `Perfect Week Automation Status` so **057** runs → Ready → **058** unlock → **059** XP.

## Security expectations

| Attempt | Expected |
|---------|----------|
| Checkbox only | Production path → historical Same Day 0 |
| Timestamp only | Production path → historical Same Day 0 |
| Other Enrollment + both test fields | Production path (RID gate fails) |
| Non-fixture record with either test field | Verifier FAIL |
| Fixture using test fields without Schmidt enrollment | Verifier FAIL |

## Forbidden

- Using gated fields on real athletes
- Exposing test fields on Fillout / Softr / public UI
- Relying on `Perfect Week Test Override?`
- Changing Automation 057 logic for fixtures
- Marking Perfect Week Complete from install alone

## Related

- Omni: `PERFECT-WEEK-OMNI-PROMPT.md`
- Spec: `PERFECT-WEEK-FIXTURE-SPEC.md`
- Verifier: `tools/testing/verify_perfect_week_fixtures.mjs`
- Runbook: `docs/deploy-checklists/057-perfect-week-v1.5-live-verification.md`
