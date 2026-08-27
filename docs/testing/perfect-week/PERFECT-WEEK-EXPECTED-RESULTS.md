# Perfect Week — Expected Results Matrix

Fixture batch: `PWTEST|2026-08-05`  
Method: **`LIVE_SAME_DAY_CALENDAR`** — [`PERFECT-WEEK-FIXTURE-METHOD.md`](./PERFECT-WEEK-FIXTURE-METHOD.md)  
Disposable E2E harness (057→058→059): [`SC-PW-E2E.md`](./SC-PW-E2E.md)  
Authority: [`PERFECT-WEEK-FIXTURE-SPEC.md`](./PERFECT-WEEK-FIXTURE-SPEC.md)

Statuses for verifier: **PASS** | **FAIL** | **BLOCKED**

## Method constraints

| Constraint | Effect on expectations |
|------------|------------------------|
| `Submitted At` = `CREATED_TIME()` | Past Activity Date ⇒ Same Day=0, Countable=0 |
| `Perfect Week Test Override?` | **Ignored** — must remain unchecked; verifier FAILs if checked expecting bypass |
| Award cases | Require Batch B calendar creates (one per Denver day) |

## Batches

| Batch | Cases | Executable |
|-------|-------|------------|
| **A — Immediate** | CASE-02, CASE-07 (+ pilot documentation) | Today |
| **B — Calendar** | CASE-01, 03–06, 08–16 | Daily Sun `2026-08-09` → Sat `2026-08-15` |

## Canonical field aliases

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
| `testOverride` | `Perfect Week Test Override?` (must be false/empty) |
| `xpSourceKey` | `PERFECT_WEEK\|{enrollmentId}\|{weekId}` |
| `xpAmount` | **100** |

## Matrix

| Case | Batch | Award? | Daily Met | Days Logged | Notes |
|------|-------|--------|-----------|-------------|-------|
| CASE-01 | B | Yes | true | 7 | 3 videos; no Zoom; create each day Sun–Sat |
| CASE-02 | A | No | false | 1 | All countable shots on Denver **today** only |
| CASE-03 | B | No | false | 6 | Omit one calendar day |
| CASE-04 | B | No | false | ≤6 | Adjacent-week days not counted |
| CASE-05 | B | No | false | ≤6 | Enrollment B excluded |
| CASE-06 | B | No† | false† | * | †Preferred; if awards → **DEFECT** |
| CASE-07 | A | No | false | * | Same Day=0; Countable=0 (pilot `recxbwkZpSJZ5eiqA`) |
| CASE-08 | B | No | true | 7 | Video Count=2; Video Met=0 |
| CASE-09 | B | No | true | 7 | Adjacent video excluded; Video Count=2 |
| CASE-10 | B | Yes | true | 7 | Zoom not required |
| CASE-11 | B | Yes | true | 7 | Zoom attended |
| CASE-12 | B | No | true | 7 | Zoom Met=0 |
| CASE-13 | B | No | true | 7 | Other Enrollment attendance |
| CASE-14 | B | Yes‡ | true | 7 | ‡Seven distinct dates; duplicates don’t inflate days |
| CASE-15 | B | Yes | true | 7 | Exactly one Unlock + one XP after reruns |
| CASE-16 | B | N/A | boundary | — | Live midnight creates + offline Intl tests |

## Pilot documentation row

| Item | Expected / observed |
|------|---------------------|
| Pilot id | `recxbwkZpSJZ5eiqA` (deletable after method docs) |
| Submitted Same Day? | 0 |
| Perfect Week Countable Submission? | 0 |
| Verifier | Document under `pilotProof`; not a CASE FAIL if deleted |

## BLOCKED conditions

- Manifest missing WAS / Enrollment / Week for a case that should have run
- Batch B case checked before calendar week complete → **BLOCKED** (not FAIL) with reason `calendar_incomplete`
- `Perfect Week Test Override?` checked → **FAIL** (`test_override_must_not_be_used`)
- Token / schema field missing

## Evidence

`docs/testing/evidence/YYYY-MM-DD-perfect-week-fixtures/`
