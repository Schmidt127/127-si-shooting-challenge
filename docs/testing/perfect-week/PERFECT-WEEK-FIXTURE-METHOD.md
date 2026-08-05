# Perfect Week fixture method (authoritative)

| Field | Value |
|-------|--------|
| Date | 2026-08-05 |
| Repo merge (package) | `95216191ceb1260b5cf444472f137aa19729a048` (PR #79) |
| Automation 057 | v1.5 — **no logic change in this revision** |
| Status | Historical backfill **rejected**; live same-day calendar required |

## Pilot proof (PROD)

| Item | Value |
|------|--------|
| Pilot Submission | `recxbwkZpSJZ5eiqA` (may be deleted after documenting) |
| Result | `Submitted Same Day? = 0`, `Perfect Week Countable Submission? = 0` |
| Cause | `Submissions.Submitted At` = formula **`CREATED_TIME()`** — cannot invent a historical submit timestamp |

Therefore Omni/API **cannot** create a countable Perfect Week day by writing Activity Date in the past.

---

## Answers (required)

### 1. Does `Weekly Athlete Summary.Perfect Week Test Override?` bypass same-day / countable?

**No.**

Evidence (PROD Meta API 2026-08-05):

| Check | Result |
|-------|--------|
| Field type | Checkbox only (`fldowpElOxgvOisY0`) |
| Formulas referencing it | **None** (including `Perfect Week Eligible?`, `Perfect Week Calculation Queue?`) |
| Automation 057 | Does **not** read this field |
| Offline engine | `evaluatePerfectWeekEligibility` ignores any `testOverride` flag (Agent 4 G-11) |

Checking the box does **nothing** to `Submitted Same Day?` or `Perfect Week Countable Submission?`. Do **not** use it for fixtures.

### 2. If yes, CASE-01 order/fields?

**Not applicable** — override does not bypass.

### 3. Revised fixture plan (executable without pretending)

**Intended method: `LIVE_SAME_DAY_CALENDAR`**

Rule: For every submission that must be Perfect Week countable:

```text
Activity Date (Denver calendar) === CREATED_TIME() Denver calendar day
```

Create that submission **on** the Denver day it represents — never backdate Activity Date on a later day and expect countable=1.

| Batch | When | Purpose |
|-------|------|---------|
| **A — Immediate** | Today | Failures / isolation that do not need seven countable days |
| **B — Calendar** | One create per Denver day across a full Sunday–Saturday week | Award-path cases (CASE-01, 10–11, 14–15, etc.) |

**Do not** use historical week `2026-08-02`…`08` for award cases unless those days are still “today” when created (impossible after the fact).

**Recommended Calendar week (next full Sun–Sat after pilot day):**

| Role | Denver date |
|------|-------------|
| Sunday start | `2026-08-09` |
| Saturday end | `2026-08-15` |

### 4. Does Automation 057 contain a test-mode path?

**No.**

057 only counts submissions where `Perfect Week Countable Submission?` is truthy. It has no input flag, no `Test Override` read, and no bypass of same-day. (Do not add one in this package.)

---

## Writable fields (PROD adaptations)

| Need | Write this | Not this |
|------|------------|----------|
| Shots | `Shot Total` (number) | `Total Shots Counted` (formula) |
| Stat mode | Leave blank — setting `Shot Total` yields Simple Total | — |
| Weekly goal | Link WAS → `Goal Record` (`Target Goal Shots`) | Direct weekly goal = 70 |
| Submit time | Implicit `CREATED_TIME()` | Cannot write `Submitted At` |
| Program | `Program Instance - Synced` | Table named `Programs` |

Daily minimum = `ceil((Goal.Total Shot Target / 9) / 7)`. Set `Shot Total` ≥ that minimum each day.

---

## Batch A — Immediate (today)

| Case | Method today | Expected |
|------|--------------|----------|
| CASE-07 / pilot | Activity Date ≠ Denver today | Same Day=0, Countable=0; 057 ignores |
| CASE-02 | All countable shots on **today** only (week scaffold Sun–Sat) | Days Logged=1; Daily Met=false; no award |
| CASE-03 partial | Only today’s countable day among six needed | Still fails daily (not a full six-day proof until calendar) |
| Structural scaffolds | Weeks / Enrollments / WAS / Zoom shells | OK if no email arms |

## Batch B — Calendar (award path)

For CASE-01 (and other award cases):

1. Create Week (`Start Date` = Sunday `2026-08-09`) + Enrollment + WAS + Goal Record link **before** Sunday (or on Sunday before first submission).
2. **Each Denver day** Sun→Sat: create **one** Submission with `Activity Date` = that day, `Shot Total` ≥ daily min, Enrollment+Week linked, no email checkboxes.
3. On days that need videos: create Video Feedback linked to that day’s submission (3 total by Saturday).
4. After Saturday’s submission (and videos/Zoom per case): run/wait 057 → 058 → 059.
5. Record IDs daily into `PWTEST-MANIFEST.json`.

CASE-15: after award, re-run 057 twice on the same WAS.

CASE-16: Activity Date is date-only — live midnight proof is “create just after Denver midnight on Sunday vs Saturday’s create”; offline Date-object tests remain the unit proof for 057’s Intl helper.

---

## Explicitly forbidden

- Pretending historical Activity Dates were submitted same-day
- Relying on `Perfect Week Test Override?`
- Manually writing formula / Eligible / Unlock / XP
- Changing Automation 057 logic for fixtures (Mike must approve any future test path separately)

## Related

- Omni: `PERFECT-WEEK-OMNI-PROMPT.md`
- Spec: `PERFECT-WEEK-FIXTURE-SPEC.md`
- Verifier: `tools/testing/verify_perfect_week_fixtures.mjs`
- Runbook: `docs/deploy-checklists/057-perfect-week-v1.5-live-verification.md`
