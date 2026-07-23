# PROD Testing Views Checklist — Foundation Reset Pack (SC-003)

**Base:** PROD `appn84sqPw03zEbTT`  
**Date:** 2026-07-23  
**Schmidt enrollment:** `Schmidt, Testing - 2025-2026` (`recgP9qZYjAhE7NXm`)

Airtable API **cannot** create views or read filter definitions. Mike (or OMNI in the Airtable UI) must create these.

## Rules

- View name: exact `Testing`
- Filter by **linked enrollment =** `recgP9qZYjAhE7NXm` / `Schmidt, Testing - 2025-2026`
- Do **not** filter on Active?, Is Test Record?, or Testing Scenarios fields on pipeline tables

## Checklist

| Table | Filter field | Created? | Notes |
|-------|--------------|----------|-------|
| Athletes | link/name path to Schmidt athlete `recgqVstObQRzgXJF` | ☐ | |
| Enrollments | `RECORD_ID()='recgP9qZYjAhE7NXm'` or primary = Schmidt label | ☐ | |
| Weeks | show foundation week `recVDKiYATgzsfpmE` (+ season weeks as needed) | ☐ | |
| Submissions | `Enrollment` is Schmidt | ☐ | Should show `recaCcxDqtzFWjmyi` |
| Submission Assets | `Enrollment - Linked` is Schmidt | ☐ | |
| Homework Completions | `Enrollment` is Schmidt | ☐ | |
| XP Events | `Enrollment` is Schmidt | ☐ | Should show `recOqzhV4kTdsfzMf` |
| Athlete Achievement Unlocks | `Enrollment` is Schmidt | ☐ | View name exists; confirm filter |
| Weekly Athlete Summary | `Enrollment` is Schmidt | ☐ | Should show `rechWp330MqSgRWzN` |
| Video Feedback | `Enrollment` is Schmidt | ☐ | |
| Zoom Meetings | meetings used in Schmidt tests | ☐ | |
| Zoom Attendance | enrollment/athlete Schmidt link | ☐ | |
| Streak Occurrences | `Enrollment` is Schmidt | ☐ | |
| Testing Scenarios | `Related Enrollment` is Schmidt | ☐ | Should show `recPdyfYRFgDtpzQ8` |
| Automations (optional) | Status/Live review | ☐ | Operator inventory |

## Sign-off

| Field | Value |
|-------|--------|
| Verifier | |
| Date | |
| Confirmed filters use enrollment link/ID (not display-name-only) | ☐ |
