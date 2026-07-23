# Season Date Contract

**SC items:** SC-032 (related), SC-064, SC-065, SC-066  
**Timezone:** `America/Denver` (mandatory)  
**Helper:** `tools/enrollment-season/season_date_boundaries.py`  
**Fixtures:** `tests/fixtures/enrollment-season/season-date-boundary-cases.json`

---

## Separated calendars

| Concept | Meaning | Typical storage |
|---------|---------|-----------------|
| Enrollment-open date | First day Fillout/app accepts enrollments | Season config / Weeks flag / ops calendar |
| Enrollment-close date | Last day normal enrollment accepted | Season config |
| Challenge start | Official Week 1 / challenge begin | Weeks row start / season config |
| Challenge end | Last challenge day | Weeks final end / season config |
| Week start/end | Per-week activity window for 005 mapping | Weeks.Start Date / End Date (dateTime) |
| Submission eligibility | Activity date falls in an intake-open week within challenge/preseason rules | Derived |
| Early-bird period | Optional pre-challenge or partial week accepting input | **Mike decision (SC-066)** — document only |
| Preseason access | Optional access before challenge start | Season config |
| Late enrollment | Optional window after enrollment-close | Season config |
| Backdated submission | Activity date earlier than “today” / outside week | Policy flag — default **disallow** in offline contract |

**C-018 / testing-and-intake-architecture:** intake open ≠ challenge run. Automation **005** maps by **date range only**.

---

## Early bird — Mike decision

| Question | Status |
|----------|--------|
| Keep early-bird for next season? | **Decision Needed (SC-066)** |
| This package | Models early-bird dates if provided; never assumes ON or OFF as product truth |
| Helper marker | `earlyBirdDecision = MIKE_DECISION_REQUIRED` |

---

## Boundary tests (offline)

Covered in fixtures:

- One day before intake  
- Intake open (Denver midnight)  
- Intake close (Denver end of day)  
- Challenge start / end  
- Late enrollment  
- Backdated submission disallowed  
- Timezone UTC vs Denver date rollover  

Example calendar in fixtures is **placeholder-only** — not a committed real 2026–27 schedule.

---

## Implementation notes for Mike/OMNI

1. Store all absolute dates in Airtable config (Weeks + Program Instance / season settings).  
2. Never hardcode season dates in automation scripts.  
3. Evaluate “form open” in America/Denver, not UTC midnight alone.  
4. Do not redesign Week creation automation — manual seed only (Package H).
