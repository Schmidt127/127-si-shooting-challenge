# Shooting Challenge — Current State Reconciliation

**Date:** 2026-08-16  
**Environment:** PROD Airtable base `appn84sqPw03zEbTT`

> **022 / 020 / 070b version notes (Mike 2026-08-19):** This packet recorded Automation 022 as **v2.0** and 070b as **v4.4** on 2026-08-16. Production Airtable later shows **022 v2.1**, **020 v3.6**, and **070b v4.6**. Keep this packet as controlled-path evidence for that day. Current live Airtable versions: Completion Master / PROJECT_STATE overlays.

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
| 020 — Homework Completion | **v3.6** live paste confirmed Mike 2026-08-19 | v3.5 controlled run had already passed; v3.6 attachment-copy package was in GitHub on 2026-08-16. This packet’s remaining “confirm v3.6 paste” item is closed for the version string. Optional HW1/HW2 no-duplicate rerun is still not claimed complete. |
| 022 — Child upload writeback | **v2.0 on 2026-08-16** (historical for this packet) | Controlled homework/video writeback passed that day; Reviewer File URL preferred; Canonical File URL fallback; existing VF Upload Status; Writeback Complete? verified. **Later live paste (Mike 2026-08-19): v2.1** |
| 031 — Find/Create Weekly Athlete Summary | current live run | Canonical WAS created for the testing week; exact repository version was not independently polled here |
| 065 — Homework XP | v10.1 | HW1 and HW2 XP Events created successfully |
| 070b — Video asset upload | **v4.4 on 2026-08-16** (historical for this packet) | PROD Lambda upload verified successfully that day. **Later Airtable paste (Mike 2026-08-19): v4.6**. Lambda season/Program Instance deploy not claimed by the Airtable version alone. |
| 071 / 073 — Parent feedback email | Off | Intentionally excluded from current core-path launch testing |

## Remaining test work

1. Review the three Video Feedback records and confirm Video XP Events.
2. Submit one qualifying entry per day for the remaining six dates of `Perfect Testing Week`.
3. Verify the Perfect Week summary and final Perfect Week XP Event after seven qualifying dates.
4. Optional: rerun HW1/HW2 only as a no-duplicate confirmation now that 020 **v3.6** is confirmed in Airtable (Mike 2026-08-19).
5. Archive or disable the temporary testing week after testing.

This document records live evidence supplied by Mike and Airtable verification performed on 2026-08-16. It does not claim that the remaining video, seven-day Perfect Week, daily-email, Dribbling, or launch-approval paths are complete.
