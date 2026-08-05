# Perfect Week — Expected Results Matrix

Fixture batch: `PWTEST|2026-08-05`  
Authority: [`PERFECT-WEEK-FIXTURE-SPEC.md`](./PERFECT-WEEK-FIXTURE-SPEC.md)

Statuses for verifier: **PASS** | **FAIL** | **BLOCKED**

Canonical field aliases used by the verifier:

| Alias | Airtable field |
|-------|----------------|
| `dailyMet` | `Perfect Week Daily Requirement Met?` |
| `videoCount` | `Perfect Week Video Count` |
| `videoMet` | `Perfect Week Video Requirement Met?` |
| `zoomMeetings` | `Perfect Week Zoom Meeting Count` |
| `zoomAttendance` | `Perfect Week Zoom Attendance Count` |
| `zoomMet` | `Perfect Week Zoom Requirement Met?` |
| `eligible` | `Perfect Week Eligible?` |
| `automationStatus` | `Perfect Week Automation Status` |
| `daysLogged` | `Days Logged This Week` |
| `unlock` | `Perfect Week Unlock` |
| `xpSourceKey` | XP Events `Source Key` pattern `PERFECT_WEEK\|{enrollmentId}\|{weekId}` |
| `xpAmount` | XP Events `XP Points` (expect **100**) |
| `xpDate` | Prefer `XP Date Resolved` / weekly end Saturday |

## Matrix

| Case | Award? | Daily Met | Days Logged | Video Count | Video Met | Zoom Mtgs | Zoom Met | Eligible | Unlock | PERFECT_WEEK XP | Notes |
|------|--------|-----------|-------------|-------------|-----------|-----------|----------|----------|--------|-----------------|-------|
| CASE-01 | Yes | true | 7 | 3 | 1 | 0 | 1 | 1 | 1 | exactly 1 @ 100; date Sat 2026-08-08 | Clean pass; homework unassigned |
| CASE-02 | No | false | 1 | * | * | * | * | 0 | 0 | 0 | All shots one day |
| CASE-03 | No | false | 6 | * | * | * | * | 0 | 0 | 0 | Six of seven |
| CASE-04 | No | false | ≤6 | * | * | * | * | 0 | 0 | 0 | Adjacent-week shots excluded |
| CASE-05 | No | false | ≤6 | * | * | * | * | 0 | 0 | 0 | Enrollment B excluded |
| CASE-06 | No† | false† | * | * | * | * | * | 0† | 0† | 0† | †Preferred; if awards → **DEFECT** (057 ignores Submission.Week mismatch when WAS-linked) |
| CASE-07 | No | false | * | * | * | * | * | 0 | 0 | 0 | Backdated → not countable |
| CASE-08 | No | true | 7 | 2 | 0 | 0 | 1 | 0 | 0 | 0 | Video fail |
| CASE-09 | No | true | 7 | 2 | 0 | 0 | 1 | 0 | 0 | 0 | Adjacent video excluded |
| CASE-10 | Yes | true | 7 | 3 | 1 | 0 | 1 | 1 | 1 | 1 @ 100 | Zoom not required |
| CASE-11 | Yes | true | 7 | 3 | 1 | ≥1 | 1 | 1 | 1 | 1 @ 100 | Zoom attended |
| CASE-12 | No | true | 7 | 3 | 1 | ≥1 | 0 | 0 | 0 | 0 | Zoom missing attendance |
| CASE-13 | No | true | 7 | 3 | 1 | ≥1 | 0 | 0 | 0 | 0 | Other Enrollment attendance |
| CASE-14 | Yes‡ | true | 7 | 3 | 1 | 0 | 1 | 1 | 1 | 1 @ 100 | ‡If seven distinct dates present; duplicates must not inflate days |
| CASE-15 | Yes | true | 7 | 3 | 1 | 0 | 1 | 1 | 1 | exactly 1 | Idempotent reruns |
| CASE-16 | N/A | boundary | — | — | — | — | — | — | — | — | Sat 23:55 Denver in ending week; Sun 00:05 in new week |

\* = not the primary assertion (may be unset or irrelevant when daily fails first).

## Idempotency / dedupe (CASE-15)

| Check | Expected |
|-------|----------|
| Unlock count for Enrollment+Week+PERFECT_WEEK | 1 |
| XP Events with Source Key `PERFECT_WEEK\|{enr}\|{week}` | 1 |
| Rerun 057 Automation Status | Ready (stable) |
| Rerun 058/059 | skip / no second create |

## Contamination assertions

| Case | Assertion |
|------|-----------|
| CASE-04 | `Perfect Week Daily Check Detail` mentions ignored outside-week countable submissions **or** Days Logged excludes adjacent dates |
| CASE-05 | Enrollment A WAS does not include Enrollment B submission IDs |
| CASE-09 | Video Count ignores videos whose Submission ∉ WAS.Submissions |
| CASE-13 | Zoom Attendance Count for target WAS stays 0 when only other Enrollment attended |

## BLOCKED conditions

Mark **BLOCKED** (not FAIL) when:

- Manifest missing WAS / Enrollment / Week IDs for the case
- Automation 057 not Ready and no run yet
- Token / schema field missing (report field name)
- CASE-06 product decision pending after first observation

## Evidence

After live run, store verifier JSON under:

`docs/testing/evidence/YYYY-MM-DD-perfect-week-fixtures/`
