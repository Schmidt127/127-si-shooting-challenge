# Season Launch Rollback Checklist

Use when activation must be aborted or the new year is unsafe.

## Principles

- Prefer **pause + restore pointers** over delete.  
- Never delete prior Config, Weeks, Enrollments, or WAS to “fix” a bad launch.  
- Weekly email ownership stays `118 → 072 → 119 → 074 → Make Bulk Email May 18`.  
- Turning 118/119 OFF is an **explicit abort** control — not a routine season step.

## Steps

1. Run:
   ```bash
   node tools/challenge-year/cli.js rollback-preview --config <NEW_CONFIG_REC> --input <export.json>
   ```
2. Set new Config Launch Status → `Rolled Back` / `Paused` (or operator note).  
3. Restore **prior** Config as the operational current (flags / Active School Year convention).  
4. Fillout: restore prior School Year / Program Instance / Config hidden IDs (from pre-change screenshots).  
5. Keep daily submission form OFF if intake was not meant to open.  
6. Make: remove any incorrect new-year filters; do not delete Bulk Email May 18.  
7. Website (`/shoot`): restore prior-year Airtable view / query filters — do **not** re-enable Softr (Obsolete).  
8. If emails must stop immediately: turn **118 and 119 OFF** (abort only); leave 072/074/Make as Mike directs.  
9. Do not mass-delete new-season Enrollments/WAS — mark inactive / exclude from current processing.  
10. Re-run `launch-preflight` against restored prior Config; archive evidence.  
11. Notify Go-Live Integration Lead / Mike before any re-attempt.

## After rollback

- Launch state: `Rolled Back` → may return to `Draft` / `Dates Pending` when ready.  
- Document root cause in Launch Blocking Error / evidence folder.  
- Re-enter lifecycle; do not jump to Live.  
