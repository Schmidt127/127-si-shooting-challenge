# Perfect Week homework timing — Week End Saturday boundary

**Date:** 2026-09-12  
**Base:** Production `appn84sqPw03zEbTT`  
**Verdict:** Repo corrected; **Production 057 paste still required** before claiming live VERIFIED.

## Business rule (authoritative)

| Concern | Rule |
|---|---|
| Normal Homework XP | Late Satisfactory still earns full Homework XP. PHA Due Date / Week must **not** block XP. |
| Perfect Week homework | Assigned to that PHA Week, Satisfactory, completed by **Week End Saturday 11:59 PM America/Denver**. |
| Catch-up Due Date | Catalog/display only. Must **not** expand Perfect Week eligibility or retroactively grant Perfect Week. |

## Production data finding

All **18** active PHA rows have `Due Date = 2027-06-29` (season catch-up).  
Week End Dates are per-week Saturdays (Early Bird through Week 8; Week 9 has no PHAs).

## Gap found (pre-fix)

Automation **057** preferred **PHA Due Date** over Week End for Perfect Week homework. With catch-up dues at `2027-06-29`, homework completed after the assigned Saturday could still count toward that week's Perfect Week.

Homework XP path **065** already does **not** block XP on late timing (correct).

Submission formulas `Perfect Week Grace Eligible?` / `Perfect Week Countable Submission?` apply to **shooting** submissions (48h grace), not homework.

## Repo fixes

| File | Change |
|---|---|
| `lib/homework-contracts/assignment-identity.js` | Perfect Week deadline = Week End only |
| `057-…perfect-week-eligibility.js` | **v2.7** — Week End only for homework PW gate |
| `065-…create-homework-xp-event.js` | **v10.9** — timing notes align to Week End; XP still unblocked |
| Contract tests | Catch-up Due cannot grant PW after Week End |
| `perfect_week_eval.py` | Docstring clarifies Week End Saturday boundary |

## Production paste required (not applied live)

Paste GitHub **057 v2.7** into `wflVRPhgunsosFjWS`. Optional: **065 v10.9**.  
See [`docs/deploy-checklists/057-v2.7-perfect-week-homework-week-end-PASTE.md`](../deploy-checklists/057-v2.7-perfect-week-homework-week-end-PASTE.md).

## Oracle Perfect Week implications

Perfect-athlete (18 HW Satisfactory within each Week End Saturday):

- Perfect Weeks: **10** (Early Bird + Weeks 1–9)
- Perfect Week XP: **1000** (unchanged by this timing fix)
- Season Lifetime XP total is owned by the **67-day** oracle in PR #529 (**5340**), not the prior 61-day **5000** figure
