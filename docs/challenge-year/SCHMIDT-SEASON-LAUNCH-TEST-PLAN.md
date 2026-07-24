# Schmidt Controlled Season Launch Test Plan

**Athlete:** Schmidt (`recgqVstObQRzgXJF`)  
**Enrollment (current known):** `recgP9qZYjAhE7NXm` — re-link to new year when launching  
**Rule:** Controlled PROD tests only; no mass parent email  
**Email chain:** `118 → 072 → 119 → 074 → Make Bulk Email May 18 → Gmail → writeback`

For each test: record pass/fail, record IDs, cleanup notes, and update repository evidence if status changes.

---

### 1. New Config
- **Precondition:** Prior Config retained; new year label chosen  
- **Action:** Create/verify Config row; set dates / Active School Year  
- **Expected:** Exactly one intended target Config; no overlapping actives  
- **Inspect:** Config fields, Launch Status (if present)  
- **Duplicate check:** No second “current” Config  
- **Cleanup:** Keep row; do not delete prior  
- **Evidence:** `launch-preflight` output  

### 2. Week 0
- **Action:** Import/verify Week 0 Sunday–Saturday  
- **Expected:** Label Week 0; linked to new Program Instance  
- **Inspect:** Start/End, Week Name, Week Key (RECORD_ID)  
- **Cleanup:** None if correct  

### 3. First regular Week
- **Expected:** Week 1 (or first regular) contiguous after Week 0  
- **Inspect:** No gap/overlap; Sunday start / Saturday end  

### 4. Post-Challenge
- **Expected:** Post-Challenge week present per generator rules  
- **Inspect:** Dates after final regular week  

### 5. New Enrollment
- **Action:** Schmidt Enrollment for new year (Fillout test or manual)  
- **Expected:** School Year + Program Instance + Grade Band set; Active? intentional  
- **Duplicate check:** No two active Enrollments same athlete/year  

### 6. Daily Submission
- **Action:** 115 or Fillout-shaped Submission with Activity Date in Week 1  
- **Expected:** Links Enrollment; shots stored  
- **Duplicate check:** Rerun policy per SC-007  

### 7. Backdated Submission
- **Action:** Submission with Activity Date in Week 0  
- **Expected:** 005 maps to Week 0; no cross-year Week  

### 8. Week assignment
- **Inspect:** Submission.Week matches Activity Date range  
- **Fail if:** Ambiguous multi-match or wrong year Week  

### 9. Submission XP
- **Expected:** One XP Event; Source Key unique; Enrollment = new year  
- **Fail if:** Cross-season Enrollment or stolen prior XP  

### 10. Homework
- **Action:** Controlled HC for Schmidt  
- **Expected:** One HC per assignment; XP via 064/065 only  

### 11. Video
- **Expected:** Video path + XP without double credit  

### 12. Zoom
- **Expected:** Attendance/recording credit per Stage 17 rules; WAS/XP correct year  

### 13. Streak
- **Expected:** Streak occurrences/XP on new Enrollment only  

### 14. Shot milestone
- **Expected:** 066 unlock on correct grade band + Enrollment  

### 15. Perfect Week
- **Expected:** Helpers/unlock link correct Week + Enrollment  

### 16. Level recalculation
- **Expected:** 041/042 on new Enrollment; no historical Enrollment overwrite  

### 17. Weekly Athlete Summary
- **Expected:** Unique Summary Key Enrollment\|Week; correct Week  

### 18. Weekly email package
- **Action:** 072 build (manual or 118 path)  
- **Expected:** Ready package; empty-week `send_short` if empty  

### 19. Make Live writeback
- **Action:** 119 → 074 with **sendMode=Live** (Schmidt recipients)  
- **Expected:** Sent? checked; Make Send Status=Sent; timestamp set  
- **Restore:** Keep 074 Live after test (do not leave fixed Test)  

### 20. `/shoot` display
- **Expected:** New-season Enrollment visible per SC-004 Schmidt policy; no prior-year-only hard filter blocking  
- **Note:** Softr is Obsolete / Not Used — do not test Softr surfaces  

### 21. Duplicate prevention
- **Action:** Re-trigger XP/WAS paths  
- **Expected:** No second Active XP for same Source Key; no duplicate WAS  

### 22. Rollback drill (dry)
- **Action:** Run `rollback-preview`; do **not** execute destructive steps unless aborting  
- **Expected:** Preview lists prior Config restore + Fillout/Make/`/shoot` view reversions (no Softr steps)  
- **Cleanup:** Confirm still on new season if not aborting  

---

## Pass criteria for Test Passed state

- Tests 1–9, 17–19, 21 PASS on Schmidt  
- Remaining paths PASS or explicitly deferred with Mike note  
- `launch-preflight` is PASS or Mike-accepted PASS WITH WARNINGS  
- No multiple active Configs  

## Cleanup defaults

- Prefer deactivating mistaken test rows over delete when linked widely  
- Never delete prior-year Config/Weeks as cleanup  
- Keep Schmidt Active? per SC-004 unless Mike changes policy  
