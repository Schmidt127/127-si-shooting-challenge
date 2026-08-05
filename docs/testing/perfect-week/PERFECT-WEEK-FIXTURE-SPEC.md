# Perfect Week PROD Fixture Specification

| Field | Value |
|-------|--------|
| Authority | [`docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md`](../../SHOOTING_CHALLENGE_COMPLETION_MASTER.md) |
| Method | [`PERFECT-WEEK-FIXTURE-METHOD.md`](./PERFECT-WEEK-FIXTURE-METHOD.md) — **`LIVE_SAME_DAY_CALENDAR`** |
| Automation | **057** Calculate Perfect Week Eligibility (**v1.5**, PROD installed 2026-08-05) |
| Downstream | **058** unlock → **059** XP (`PERFECT_WEEK\|{enrollmentId}\|{weekId}`) |
| Environment | **PROD** (`appn84sqPw03zEbTT`) — controlled Schmidt test data only |
| Fixture batch | `PWTEST\|2026-08-05` |
| Status | Method revised 2026-08-05 after pilot — live verification **not** Complete |

## Pilot result (do not ignore)

| Item | Value |
|------|--------|
| Pilot Submission | `recxbwkZpSJZ5eiqA` |
| Observed | `Submitted Same Day? = 0`, `Perfect Week Countable Submission? = 0` |
| Implication | Historical Activity Dates created later are **not** countable. Historical Omni backfill **cannot** test Perfect Week eligibility normally. |

## Test Override (explicit)

`Weekly Athlete Summary.Perfect Week Test Override?` does **not** bypass same-day or countable. Unused checkbox; 057 does not read it. **Do not use.**

## Automation 057 test mode

**None.** 057 only counts `Perfect Week Countable Submission?`. No test-mode path. Do not change 057 for fixtures without a separate Mike-approved design.

## Version alignment

| Layer | Version | Match? |
|-------|---------|--------|
| Repository canonical script | **1.5** (Last updated 2026-08-05) | — |
| PROD Automation 057 (Mike attestation) | **1.5** (Last updated 2026-08-05) | **Yes — match** |
| Prior paste runbook | v1.4 | Superseded — do **not** paste/downgrade to v1.4 |

Canonical file: `airtable/automations/shooting-challenge/057-achievements-and-milestones-calculate-perfect-week-eligibility.js`

## Implemented product rules (verified from script + schema)

| Rule | Implementation | Notes |
|------|----------------|-------|
| Week boundary | Sunday–Saturday from Weeks.`Start Date` + 7 keys | `requiredDailyCount: 7` |
| Daily shots | Each of 7 dates ≥ `ceil(weeklyGoal / 7)` | Goal from WAS `Weekly Goal Shots Target` (= Goal/9 lookup) |
| Same-day only | `Submitted At`=`CREATED_TIME()` → `Submitted Same Day?` → Countable | Fixtures must create **on** the Activity Date’s Denver day |
| Videos | ≥ 3 Video Feedback rows matching WAS Enrollment **and** linked to a WAS Submission | Hardcoded `requiredVideoCount: 3` |
| Zoom | If Zoom Meeting count for Week = 0 → met; else attendance ≥ 1 | Formula `Perfect Week Zoom Requirement Met?` |
| Homework | 100% of assigned homework satisfactory; **0 assigned → met** | Fixtures leave homework empty unless testing HW |
| Eligibility | Formula `Perfect Week Eligible?` when Ready + daily + homework + video + zoom | 057 does **not** write Eligible |
| Unlock | Automation **058** | |
| XP | Automation **059**; `PERFECT_WEEK\|{enr}\|{week}`; **100** | |
| Date keys | America/Denver via `Intl` for Date objects | ISO datetime strings still UTC-prefix — date-only Activity Date preferred |

### Field name map (canonical)

| Common label | Actual field | Owner |
|--------------|--------------|-------|
| Enrollment / Week | WAS `Enrollment`, `Week` | Manual / 031 |
| Week Start | Weeks `Start Date` | Manual |
| Days Logged | WAS `Days Logged This Week` (rollup) | Formula/rollup |
| Shots (write) | Submission `Shot Total` | Manual |
| Shots (read by 057) | `Total Shots Counted` (formula) | Formula |
| Daily Requirement Met? | WAS `Perfect Week Daily Requirement Met?` | **057** |
| Perfect Week Countable Submission? | Submissions formula | Formula |
| Submitted Same Day? | Submissions formula | Formula |
| Submitted At | `CREATED_TIME()` formula | Formula — not writable |
| Video Count | WAS `Perfect Week Video Count` | **057** |
| Video Met? | WAS `Perfect Week Video Requirement Met?` | Formula (≥3) |
| Zoom Meeting Count | WAS `Perfect Week Zoom Meeting Count` | **057** |
| Zoom Met? | WAS `Perfect Week Zoom Requirement Met?` | Formula |
| Perfect Week Test Override? | WAS checkbox | **Unused — do not use** |
| XP Dedupe Key | XP Events Source Key `PERFECT_WEEK\|…` | 059 |

## Isolation rules

1. Athlete: Schmidt only (`recgqVstObQRzgXJF`).
2. Isolated Enrollments per case (or A/B for cross-program).
3. Dedicated Week records with explicit Sunday Start / Saturday End.
4. Prefix `PWTEST|2026-08-05|CASE-XX`.
5. No real parent emails; no send arms.
6. Do not manually set formula / 057–059 results / Test Override.
7. Record IDs in `fixtures/PWTEST-MANIFEST.json`.
8. Delete only after evidence.

## Shared calendar

### Batch A (immediate) — week containing Denver “today”

Use a Week whose Sunday–Saturday window **includes** the create day. Only **today’s** Activity Date is countable.

### Batch B (award) — next full Sunday–Saturday

| Role | Date key (America/Denver) |
|------|---------------------------|
| Sunday (Week Start) | `2026-08-09` |
| Monday … Friday | `2026-08-10` … `2026-08-14` |
| Saturday (Week End) | `2026-08-15` |
| Adjacent prior Saturday | `2026-08-08` |
| Adjacent next Sunday | `2026-08-16` |

**Retired for award fixtures:** historical week `2026-08-02`…`08` (pilot proved backfill is non-countable).

**Goal:** Link a `Target Goal Shots` record; daily min = `ceil((Total Shot Target/9)/7)`. Do not invent weekly=70 unless a goal yields that.

## Case catalog

See [`PERFECT-WEEK-EXPECTED-RESULTS.md`](./PERFECT-WEEK-EXPECTED-RESULTS.md) for batch tags.

### CASE-01 — Clean passing week (Batch B)

Create one countable submission **on each** Denver day Sun–Sat; 3 videos; no Zoom. Expect award after Saturday.

### CASE-02 — All shots on one day (Batch A)

Countable submissions only on Denver **today**. Expect Daily Met false.

### CASE-03 — Six of seven (Batch B)

Countable on only six calendar days of the target week.

### CASE-04 — Cross-week (Batch B)

Six in-week days + adjacent-day creates on those adjacent Denver days.

### CASE-05 — Cross-program (Batch B)

Enrollment A Shooting + Enrollment B Dribbling; seventh day only on B.

### CASE-06 — Wrong linked Week (Batch B)

Same-day Activity Date; Submission.Week ≠ WAS Week; link onto target WAS; **do not repair**; report whether 057 counts.

### CASE-07 — Backdated / not same-day (Batch A)

Activity Date before Denver today. Expect Countable=0 (pilot confirmed).

### CASE-08…16

Follow method doc: award / Zoom / video cases on Batch B calendar; CASE-15 after CASE-01; CASE-16 prefers live midnight creates + offline Intl tests.

## Upstream / downstream

| Direction | Component |
|-----------|-----------|
| Upstream | Same-day formulas; Shot Total; 031 WAS; Video; Zoom; Homework |
| 057 | Helper fields only |
| 058 / 059 | Unlock / XP |

## Safety

Label `PWTEST|2026-08-05|…`. Do not mark SC-021 / SC-028 / SC-077 / SC-091 Complete from install alone.
