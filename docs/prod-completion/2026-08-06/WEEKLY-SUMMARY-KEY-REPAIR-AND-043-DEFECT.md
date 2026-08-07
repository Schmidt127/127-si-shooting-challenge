# Weekly Summary Key Repair and Automation 043 Defect

Date: 2026-08-06
Environment: PROD Airtable `appn84sqPw03zEbTT`
Operator: ChatGPT direct Airtable/GitHub work

## Scope

Repair duplicate/mis-scoped Weekly Athlete Summary records for the Schmidt historical fixture set, restore Submission and XP links to the correct period, and inspect Automation 043 v2.1 against the current Level Gate Rule data.

## Weekly Summary repairs

Four records previously shared the same 2025-2026 Week 2 summary identity even though their linked evidence belonged to different periods.

### Existing records corrected

| Summary record | Correct Week | Restored Submissions | Notes |
|---|---|---:|---|
| `recbvmjaNsYzUYAUT` | Week 1 `recnMGC2JBHjO0ay6` | 1 | Homework and Submission XP already referenced Week 1. |
| `recBpJc27P9QKoke5` | Week 3 `recaX4EyJ7BWWKfSq` | 1 | Homework and Submission XP already referenced Week 3. |
| `recWi4FtZhPqQHCC1` | Week 2 `rec2Rewxt21z7dI9f` | 0 | Zoom XP references this Week and a May 2, 2027 meeting. This remains a historical cross-year fixture requiring later cleanup, but no longer collides with the legacy 2025-2026 Week 2 key. |
| `recuxvGq2kY8WKcey` | Post - Testing Today `recVDKiYATgzsfpmE` | 4 | Retains only matching Post - Testing Today submissions and XP. |

### New record created

- Summary: `rece4DyujJEbTV5Z3`
- Display: `Schmidt, Testing - 2025-2026 - Post Challenge - K-2`
- Week: Post Challenge `rec7fCckt1zj9CbmP`
- Submissions restored: `rec9yoDZ3DMIEhi3I`, `recbAVGWg0OKT7FSX`, `recM0GbWfptu06da1`
- Submission XP events moved to this summary: `recPdp5afnI70f2hd`, `recffMjiomQwV0VR4`, `recQxiwjLOvQ8BzSB`

## Verification

The five repaired summaries now have distinct period identities:

- Week 1
- Week 3
- Week 2 from the separate 2026-2027 Week set
- Post - Testing Today
- Post Challenge

Submission totals and linked XP now align with the period assigned to each summary.

## Remaining historical fixture concern

`recWi4FtZhPqQHCC1` links the inactive 2025-2026 Enrollment to Week `rec2Rewxt21z7dI9f`, whose Summary Key indicates the Week belongs to the 2026-2027 year. Its Zoom XP is dated 2027-05-03. This was not silently reassigned to the active Enrollment because the linked XP and attendance dependencies require a separate controlled migration or retirement decision.

## Automation 043 confirmed defect

Repository file:

`airtable/automations/shooting-challenge/043-levels-and-progression-set-level-gate-rule-from-next-level.js`

Current version: v2.1

The script returns `already_linked` immediately whenever `Enrollments.Level Gate Rule` is non-empty. It therefore does not validate whether the existing link still matches:

- current Next Level;
- active Version requirement;
- Enrollment School Year;
- preferred School Year / Rule Set.

PROD evidence:

- active Enrollment `recCyFEPeATOVNlr9` is 2026-2027;
- current gate link is Level 3 Gate `recrLcVfwPcWGflR2`;
- that gate record is labeled Rule Set `2025-2026`;
- all 12 active Level Gate Rules currently use the `2025-2026` label.

GitHub issue created:

- Issue #95 — Fix Automation 043 stale gate-rule refresh and school-year fallback

Airtable Automations inventory record `recZWrVJTi2ovc3uM` was updated with the confirmed code defect and issue reference.

## Completion status

No Completion Master item should advance from this work alone.

Automation 043 remains Built in Repository / repair required until:

1. issue #95 is implemented and merged;
2. the actual Airtable automation editor receives the repaired script;
3. trigger conditions support revalidation after Next Level or School Year changes;
4. a controlled Schmidt refresh test passes;
5. the 2026-2027 gate-rule policy is explicit.
