# Testing Views — Mike Actions (Airtable UI)

**Date:** 2026-07-24  
**Why Cursor cannot complete:** Airtable Meta API / REST API cannot create filtered views with the fidelity required.  
**Related SC:** SC-003  
**Rule:** Do **not** create views that hide Schmidt.

Companion: `docs/foundation-reset/PROD-TESTING-VIEWS-CHECKLIST-2026-07-23.md`

---

## Priority order

1. Testing Scenarios  
2. Submissions  
3. XP Events  
4. Weekly Athlete Summary  
5. Submission Assets  
6. Homework Completions  
7. Video Feedback  
8. Athlete Achievement Unlocks  
9. Enrollments  
10. Weeks  
11. Email/package queues (if present)

Stable filter value used throughout:

- Schmidt Enrollment RID: `recgP9qZYjAhE7NXm`  
- Prefer `FIND("recgP9qZYjAhE7NXm", ARRAYJOIN({Enrollment}))` or link-contains where UI allows  
- Alternative: filter Enrollment **is** Schmidt testing enrollment (by linked record)

---

## 1. Testing Scenarios

| Item | Spec |
|------|------|
| Table | Testing Scenarios |
| View name | `Testing - Schmidt Scenarios` |
| Type | Grid |
| Filters | Related Enrollment contains `recgP9qZYjAhE7NXm` |
| Sort | Last Run At (newest first) |
| Grouping | none |
| Visible fields | Test Intake Name, Scenario Type, Run Test?, Dry Run?, Test Status, Last Run Status, Last Run At, Submission Date, Shot Total, Related Enrollment, Linked Submission, Actual Result, Pass/Fail Notes, Expected Result |
| Hidden | Operator Feedback (optional show), RecordId formula |
| Purpose | Drive 115 runs; see result writeback |
| Related scenario | SCN-001–SCN-020 |
| Expected state | Non-empty (seed `recPdyfYRFgDtpzQ8`) |

## 2. Submissions

| Item | Spec |
|------|------|
| Table | Submissions |
| View name | `Testing - Schmidt Submissions` |
| Type | Grid |
| Filters | Enrollment contains `recgP9qZYjAhE7NXm` |
| Sort | Activity Date desc, Created desc |
| Visible | Activity Date, Shot Total, Enrollment, Athlete, Week, Duplicate Review Status, Count This Submission?, Weekly Athlete Summary, XP Events, Submission Assets, Testing Scenarios |
| Purpose | Confirm 115 creates + downstream links |
| Expected | Non-empty after 115 live (incl. `recuuTBgstSTGg2E3`) |

## 3. XP Events

| Item | Spec |
|------|------|
| Table | XP Events |
| View name | `Testing - Schmidt XP Events` |
| Type | Grid |
| Filters | Enrollment contains `recgP9qZYjAhE7NXm` |
| Sort | Created desc |
| Visible | Source Key, XP Dedupe Key Normalized, XP Points, XP Source, Enrollment, Submission, Week, Weekly Athlete Summary, Awarded By, XP Activity Date |
| Purpose | Idempotency proof; one SUBMISSION_XP per Submission |
| Expected | Non-empty for Schmidt; **ignore** orphan rows without Enrollment in a separate Admin view |

### Admin cleanup view (optional)

| View name | `Admin - Orphan XP Events (no Enrollment)` |
| Filters | Enrollment is empty |
| Purpose | Legacy wipe candidates — not for Schmidt testing |

## 4. Weekly Athlete Summary

| Item | Spec |
|------|------|
| Table | Weekly Athlete Summary |
| View name | `Testing - Schmidt WAS` |
| Type | Grid |
| Filters | Enrollment contains `recgP9qZYjAhE7NXm` |
| Sort | Week Start desc |
| Visible | Summary Key, Enrollment, Week, Total Shots This Week, Calculation Status, Submissions, XP Events, Perfect Week Automation Status, Threshold XP Status |
| Purpose | Uniqueness Enrollment+Week |
| Expected | Exactly one row per seeded Week for Schmidt (`rechWp330MqSgRWzN` for foundation week) |

## 5. Submission Assets

| Item | Spec |
|------|------|
| Table | Submission Assets |
| View name | `Testing - Schmidt Assets` |
| Filters | Enrollment - Linked contains `recgP9qZYjAhE7NXm` |
| Visible | Asset Slot, Purpose, Upload Status, Canonical URL, Hash, Homework Completions, Video Feedback, Submission - Linked |
| Expected | Empty until HW/video tests |

## 6. Homework Completions

| Item | Spec |
|------|------|
| View name | `Testing - Schmidt Homework Completions` |
| Filters | Enrollment contains `recgP9qZYjAhE7NXm` |
| Visible | Enrollment, Homework, Week, Satisfactory?, Submission Assets, XP Events |
| Expected | Empty until HW path tested |

## 7. Video Feedback

| Item | Spec |
|------|------|
| View name | `Testing - Schmidt Video Feedback` |
| Filters | Enrollment contains `recgP9qZYjAhE7NXm` |
| Visible | Enrollment, Submission, Submission Asset, Ready for XP / review fields, XP Events |
| Expected | May show 1 existing Schmidt-linked row |

## 8. Athlete Achievement Unlocks

| Item | Spec |
|------|------|
| View name | `Testing` (may already exist) or `Testing - Schmidt Unlocks` |
| Filters | Enrollment contains `recgP9qZYjAhE7NXm` |
| Visible | Achievement, Source/Unlock Key, Week, XP Award Status, XP Events |
| Expected | Empty post-reset until milestones/streaks |

## 9. Enrollments

| Item | Spec |
|------|------|
| View name | `Testing - Schmidt Enrollment` |
| Filters | Record ID is `recgP9qZYjAhE7NXm` **or** Athlete is Testing Schmidt |
| Visible | Active?, Athlete, Grade Band, Lifetime XP Total, Current Level, Next Level, Level Gate Rule, Submissions, Weekly Athlete Summary |
| Expected | Exactly 1 row; Active?=checked |

## 10. Weeks

| Item | Spec |
|------|------|
| View name | `Testing - Seeded Weeks` |
| Filters | Manual — include Foundation Week `recVDKiYATgzsfpmE` + any backdate weeks |
| Sort | Week Start Date asc |
| Visible | Week name, Start Date, End Date, Week Key, Submissions, Weekly Athlete Summary |
| Purpose | Manual Week seeding verification (not a defect if name is manual) |
| Expected | ≥1 seeded week |

## 11. Email / package queues

Create Schmidt-filtered views on whichever tables hold daily/weekly email packages (WAS send fields and/or Email Message / package tables if present).  
**Do not enable live mass send.** Prefer Test webhook / Schmidt parent only.

---

## Evidence to verify success

- Each view opens without error  
- Schmidt rows visible where data exists  
- Orphan legacy rows excluded from Testing views via Enrollment filter  
- No view named/filtered to hide Schmidt from public standings
