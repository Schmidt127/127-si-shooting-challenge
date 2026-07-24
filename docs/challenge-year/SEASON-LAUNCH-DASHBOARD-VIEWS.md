# Season Launch Dashboard — Airtable View Spec

**Status:** Designed (not installed)  
**Base:** PROD `appn84sqPw03zEbTT`  
**Coordinate with:** Reliability Command Center view spec on master after PR #40 merges (`docs/reliability-command-center/AIRTABLE-VIEW-SPEC.md`). This PR does **not** vendor RCC.

Do **not** duplicate RCC weekly-email integrity / XP integrity views. This spec adds **season-launch** views only. Softr checklist views are Obsolete / Not Used.

## Interface concept (optional)

Name: **Season Launch Control** (can be a page inside Reliability Command Center Interface)  
Landing: Launch Blocking Errors + Config Health  
**Not installed** until Mike/OMNI creates views.

---

### 1. Launch Blocking Errors

| Item | Spec |
|------|------|
| Table | Config (or operator Launch Evidence notes until Launch Status exists) |
| Filter | Proposed: `{Launch Status}="Blocking Error"` — until field exists, use RCC/season CLI report IDs |
| Group | none |
| Sort | Launch Status Updated At desc |
| Visible fields | Active School Year, Launch Status, Launch Blocking Error, Launch Evidence URL, Launch Operator |
| Action | Resolve blocker; re-run `launch-preflight` |
| Helper formula? | Optional only after Mike authorizes Launch Status fields |

### 2. Config Health

| Item | Spec |
|------|------|
| Table | Config |
| Filter | All Config rows (or Active School Year not blank) |
| Group | Active School Year |
| Sort | Active School Year desc |
| Visible fields | Active School Year, Challenge Week Count, Test Mode? (if present), dates, Launch Status (proposed) |
| Action | Ensure exactly one intended current Config at activation |
| Helper? | No |

### 3. Week Plan Validation

| Item | Spec |
|------|------|
| Table | Weeks |
| Filter | Link to target Program Instance / year (operator sets year) |
| Group | Week Name |
| Sort | Start Date asc |
| Visible fields | Week Name, Start Date, End Date, Program Instance, Week Key (RECORD_ID) |
| Action | Compare to generated week package; fix gaps/overlaps/Sunday–Saturday |
| Helper? | Optional ops formula for `YYYY-YYYY\|Week Name` display — do not rename Week Key |

### 4. Enrollment Season Mismatches

| Item | Spec |
|------|------|
| Table | Enrollments |
| Filter | `{Active?}=1` AND (School Year / Challenge Year ≠ target OR Program Instance blank) |
| Group | School Year |
| Sort | Name |
| Visible fields | Athlete, Active?, School Year, Program Instance, Grade, Grade Band, emails |
| Action | Correct links; never silently steal prior Enrollment |
| Helper? | No |

### 5. Submission Week Mismatches

| Item | Spec |
|------|------|
| Table | Submissions |
| Filter | Week blank OR Enrollment year ≠ Week’s Program Instance year (manual / export until helper) |
| Group | Week |
| Sort | Activity Date desc |
| Visible fields | Enrollment, Activity Date, Week, Shot Total |
| Action | Re-run 005 after Weeks fixed |
| Helper? | Optional later |

### 6. Weekly Summary Season Mismatches

| Item | Spec |
|------|------|
| Table | Weekly Athlete Summary |
| Filter | Operator uses season export FAIL IDs; practical start: recent WAS where Enrollment School Year ≠ Week year |
| Group | Week |
| Sort | Last Modified desc |
| Visible fields | Enrollment, Week, Summary Key, Ready?, Sent?, Build Now?, sendMode |
| Action | Do not auto-delete; dry-run preview scripts only |
| Helper? | No — overlaps RCC email health only on send fields; keep season mismatch separate |

### 7. XP Cross-Season Risks

| Item | Spec |
|------|------|
| Table | XP Events |
| Filter | RCC/season report `cross_season_xp` IDs; or Enrollment year ≠ linked Submission/Week year |
| Group | XP Source |
| Sort | Created desc |
| Visible fields | Enrollment, Source Key, XP Dedupe Key, Active?, links |
| Action | Deactivate wrong-year duplicates; never double-create |
| Helper? | No |

### 8. Achievement Cross-Season Risks

| Item | Spec |
|------|------|
| Table | Athlete Achievement Unlocks |
| Filter | Enrollment year ≠ Week year / Achievement season mismatch from report |
| Group | Achievement |
| Sort | Created desc |
| Visible fields | Enrollment, Achievement, Week, Unlock Key, XP Award Status |
| Action | Preview-only corrections |
| Helper? | No |

### 9. Fillout Checklist (Form Activation)

| Item | Spec |
|------|------|
| Table | Config |
| Filter | Target year Config only (Active School Year = launch year) |
| Group | none |
| Sort | Active School Year |
| Visible fields | Active School Year, Launch Status (proposed), Launch Evidence URL, Launch Operator |
| Action required | Complete F-ATT-01…05; update hidden School Year / Program Instance / Config; Schmidt test enrollment |
| Helper formula? | No — track attestations in Launch Evidence URL doc |

### 10. Automation Checklist

| Item | Spec |
|------|------|
| Table | Config (ops landing) + repo audit artifact |
| Filter | Target year Config |
| Group | none |
| Sort | — |
| Visible fields | Year, Launch Status, Launch Evidence URL |
| Action required | Attach `audit-automations` JSON/MD; confirm 005/010/031/072/074/118/119 reviewed; 074 sendMode=Live |
| Helper formula? | No — do not invent automation status fields |

### 11. Make Checklist

| Item | Spec |
|------|------|
| Table | Config |
| Filter | Target year Config |
| Visible fields | Year, Launch Evidence URL, Launch Operator |
| Action required | Preserve `Weekly Athlete Summary - Bulk Email - May 18`; complete M-ATT-01…03; verify Live writeback |
| Helper formula? | No |

### 12. Website (/shoot) Checklist

| Item | Spec |
|------|------|
| Table | Config |
| Filter | Target year Config |
| Visible fields | Year, Launch Evidence URL |
| Action required | Complete W-ATT-01…03; confirm `/shoot` leaderboard/views use new year; Softr is Obsolete — do not checklist Softr |
| Helper formula? | No |

Prefer a single **Launch Evidence** URL over duplicating checklist tables.

### Softr Checklist — Obsolete

**Not Used.** Do not create a Softr activation view. Historical Softr cutover docs remain Historical Reference Only.

### 13. Launch Evidence

| Item | Spec |
|------|------|
| Table | Config |
| Filter | Launch Evidence URL not blank (proposed) |
| Visible fields | Year, Launch Status, Evidence URL, Operator, Updated At |
| Action | Keep preflight/manifest artifacts linked |
| Helper? | No |

### 14. Rollback Readiness

| Item | Spec |
|------|------|
| Table | Config |
| Filter | Prior year Config rows + current Launch Status in Live/Paused/Approved |
| Visible fields | Years, current flags, evidence |
| Action | Run `rollback-preview`; follow ROLLBACK-CHECKLIST |
| Helper? | No |

## Proposed helper fields

Only if Mike authorizes — see `PROPOSED_LAUNCH_FIELDS` in `lib/challenge-year/launch-state.js`. Do not create from this agent run.
