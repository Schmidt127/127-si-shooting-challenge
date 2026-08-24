# Historical audit artifacts — preserved records (2026-08-24)

**Status:** `complete` — documentation only  
**Rule:** Do **not** delete, modify, overwrite, or re-arm these records unless Mike explicitly authorizes a separate cleanup task.

These rows are **intentionally retained** as audit evidence from controlled Production testing. They are **not** open production defects.

---

## Protected weekly-email and queue evidence

| Record ID | Table / role | Why it exists | Why it is not an active failure |
|-----------|--------------|---------------|----------------------------------|
| `reczxTIpVI8ZJLex0` | Weekly Athlete Summary (old reference WAS) | Pre-**072 v4.7** weekly email and XP disagreement investigation | Corrected behavior proven on disposable WAS `recdj8MD0szplMW5r` (2026-08-24 E2E). Old email content is **historical evidence** only. |
| `recoikFrli3m0xDRa` | Email Handoff Queue (old queue proof) | Idempotency / conflict investigation during weekly-email QA | Must **remain unchanged** and must **not be reused** for sends. Preserves proof that duplicate protection worked. |

---

## Disposable fixture records (optional manual cleanup)

Created for 2026-08-24 weekly-email E2E. Mike may delete when evidence is no longer needed:

| Record ID | Role |
|-----------|------|
| `recdj8MD0szplMW5r` | Disposable WAS |
| `recxIzdVil9ewhBxN` | Disposable enrollment |
| `recPg14iNRkxblMLs` | Disposable athlete |

Associated XP events, unlocks, streak rows, and video rows from this run are also disposable.

**Do not** delete the protected records in the first table.

---

## Deleted disposable fixture records (2026-08-24 closeout)

These were **throwaway test rows**, not production participant data:

| Item | Notes |
|------|-------|
| Bad Homework Completion (disposable) | Created during fixture build; deleted after QA — not a missing-production-data defect |
| Orphan Submission (disposable) | Same fixture session — deleted intentionally |

Their deletion explains why some **historical orphan links** below may point at blank or deleted targets.

---

## Remaining historical orphan references (retained — do not delete)

| Record ID | Table | Why retained | Why links may look broken |
|-----------|-------|--------------|---------------------------|
| `recYIn2CHdvIaiYg6` | Email Handoff Queue | Queue row from pre-v4.7 weekly-email conflict investigation | May reference deleted disposable Homework Completion or Submission from fixture cleanup |
| `rec1QYofvoDBHIsSS` | XP Events | Historical homework XP row tied to investigation / manual settlement era | Source Homework Completion may have been a disposable row since deleted |
| `recgP3pc7mXUccsdC` | XP Events (video) | Historical video XP artifact from same investigation window | May reference disposable video/submission rows removed during fixture hygiene |

**These are audit artifacts, not active queue failures or missing XP defects.** They document what was observed before **072 v4.7**, dynamic **065/066** inputs, and the corrected disposable E2E send.

---

## Operator rules

1. **Never** re-arm `recoikFrli3m0xDRa` for a send.
2. **Never** use `reczxTIpVI8ZJLex0` as proof that weekly email is broken today — use the 2026-08-24 disposable E2E report instead.
3. **Do not** bulk-delete the three orphan reference rows without Mike approval — they are preserved for traceability.
4. Optional disposable fixture cleanup is separate and does not require touching protected or orphan-reference rows.

**Evidence:** [`WAS_EMAIL_QA_20260824_FINAL_REPORT.md`](../testing/autonomous-qa/WAS_EMAIL_QA_20260824_FINAL_REPORT.md) · [`2026-08-24-weekly-email-e2e-closeout.md`](./2026-08-24-weekly-email-e2e-closeout.md)
