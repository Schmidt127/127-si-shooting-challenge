# Shooting Challenge — Current State Reconciliation

**Date:** 2026-08-16  
**Environment:** PROD Airtable base `appn84sqPw03zEbTT`

## Confirmed controlled path

| Component | Current result |
|---|---|
| Registration | `Perfect Week Testing` enrollment created and linked to Athlete |
| Submission | `rec78GPmoBJCIOCQA` assigned to `Perfect Testing Week`; Activity Date `2026-08-16`; 500 shots |
| Testing week | `recT3EXo4Tz7BKFIb`; linked to the 2026–2027 Shooting Challenge and Config; counted while the Perfect Week test is active |
| Submission Assets | Five assets created: two homework and three video assets |
| Homework linking | Automation 020 created HW1 `rec10waf7JxBoByPU` and HW2 `reck5pIV0DqmzwnT1`; both linked and uploaded |
| Homework attachments | Both Homework Completions contain a direct `Airtable Attachment`; the v3.6 attachment-copy backfill is verified |
| Weekly Athlete Summary | Automation 031 created canonical WAS `recExkFwq1kULw7v9` |
| Homework XP | Automation 065 v10.1 created HW1 XP `recequB1OPEIpATzX` and HW2 XP `recn8H4SedHseLXK4`; both use the canonical WAS and have no warnings |
| Video assets | Three Video Feedback records were created and linked; the upload path was verified through 070b/022 |

## Version evidence

| Automation | Version | Evidence boundary |
|---|---:|---|
| 010 — Submission XP | v10.10 | Controlled Testing3 submission passed after the canonical-identity/date correction |
| 020 — Homework Completion | v3.6 package | v3.5 controlled run passed; v3.6 attachment-copy backfill and 13/13 offline tests reported by Cursor; future automatic copying requires v3.6 paste confirmation |
| 022 — Child upload writeback | **v2.0** (Airtable live + GitHub aligned 2026-08-16) | Controlled homework/video writeback passed; Reviewer File URL preferred; Canonical File URL fallback; existing VF Upload Status; Writeback Complete? verified |
| 031 — Find/Create Weekly Athlete Summary | current live run | Canonical WAS created for the testing week; exact repository version was not independently polled here |
| 065 — Homework XP | v10.1 | HW1 and HW2 XP Events created successfully |
| 070b — Video asset upload | v4.4 | PROD Lambda upload verified successfully |
| 071 / 073 — Parent feedback email | Off | Intentionally excluded from current core-path launch testing |

## Remaining test work

1. Review the three Video Feedback records and confirm Video XP Events.
2. Submit one qualifying entry per day for the remaining six dates of `Perfect Testing Week`.
3. Verify the Perfect Week summary and final Perfect Week XP Event after seven qualifying dates.
4. Confirm PROD 020 v3.6 is pasted; rerun HW1/HW2 only as a no-duplicate confirmation if needed.
5. Archive or disable the temporary testing week after testing.

This document records live evidence supplied by Mike and Airtable verification performed on 2026-08-16. It does not claim that the remaining video, seven-day Perfect Week, daily-email, Dribbling, or launch-approval paths are complete.
