# SC Status Recommendations — Agent 2 Data Model Impact

Statuses: Built in Repository · Installed in PROD · Live Tested in PROD · Complete · Decision Needed

Do not invent new SC IDs for every field.

| SC | Recommended status | Evidence-based rationale |
|----|--------------------|--------------------------|
| SC-035 | Live Tested in PROD | emptyWeekPolicy send_short in 072 v4.0; Live empty-week path proven |
| SC-038 | Live Tested in PROD | 118→072 build path; 118 ON Sun 5AM |
| SC-039 | Live Tested in PROD | 119→074→Make→Gmail Live; schedules ON |
| SC-040 | Live Tested in PROD | Sent? + Make Send Status + Weekly Summary Sent At writeback |
| SC-046 | Built in Repository | Field ownership / attestation pack (this agent) |
| SC-049 | Built in Repository | Unique-key audit + XP registry reuse; Week Code OMNI attest open |
| SC-051 | Decision Needed | Cleanup classification ready; no deletes without Mike |
| SC-007 / uniqueness WAS | Live Tested in PROD (narrow) | Creators documented; concurrency residual remains |
| SC-013/014 HC quiz | Decision Needed | 020 vs 067 match shapes differ — product rule |
| Levels / gates (SC related to 042) | Installed in PROD (assume) | 042 authoritative; attest 043 OFF |
| SC-060 Fillout enrollment | Built in Repository | Config not hard-coded in contract; live Fillout checklist open |
| SC-064/065 Weeks season | Built in Repository | Week Key/Code/Name reconciled; Week Code UI attest |

**Weekly email completion:** do **not** leave SC-039 blocked on “authorize schedules” — schedules are ON (verified-prod).
