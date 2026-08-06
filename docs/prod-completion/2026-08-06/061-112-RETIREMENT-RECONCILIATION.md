# PROD Reconciliation — Automations 061 and 112

**Date:** 2026-08-06  
**Environment:** Airtable PROD `appn84sqPw03zEbTT`  
**Evidence type:** Mike Schmidt operator attestation + current repository ownership audit

## Final PROD disposition

| Automation | Final status | Replacement / current owner |
|---|---|---|
| **061 — Mark Homework Completion as Reviewed** | **Deleted from native PROD Automations** | Replaced by a working formula field on `Homework Completions`; no automation slot or run required |
| **112 — Create Video Feedback from Submission Asset** | **Retired / absent from native PROD Automations; do not recreate** | **013** is the canonical create-or-link Video Feedback owner |
| **113 — Assign Base Video XP** | Current video XP preparation owner | Prepares a reviewed Video Feedback record and arms 114; it does **not** create Video Feedback records |
| **114 — Create or Update Video XP Event** | Current Video Feedback XP Event owner | Creates or repairs exactly one XP Event per Video Feedback record using `VIDEO_SUBMISSION|{Video Feedback RID}` |

## Canonical current flows

### Homework review status

```text
Review Complete changes
→ formula field calculates the reviewed display/status
→ no Automation 061 writeback
```

Automations 064, 065, and 071 continue to own homework XP preparation, XP Event creation, and parent-feedback handoff. Deleting 061 does not replace or disable those automations.

### Video Feedback and XP

```text
Submission Asset ready for video feedback
→ 013 creates or links the Video Feedback record
→ coach posts feedback
→ 113 assigns base video XP and arms 114
→ 114 creates or repairs the single Video Feedback XP Event
```

Automation 112 is a legacy duplicate of the 013 create/link function. It must remain absent/off to preserve single-writer ownership and prevent duplicate Video Feedback records.

## Tracking-table correction required

The Airtable `Automations` operator table was read on 2026-08-06 and still showed both 061 and 112 as `Live`. Those rows are stale and do not represent the native PROD Automations panel.

Update the operator-table rows as follows:

- Record `recG5HO86DbCPjr8T` — Automation 061: set `Status = Off` and note `Deleted from native PROD 2026-08-06; replaced by formula field on Homework Completions.`
- Record `recNUvkyi3dABPX9f` — Automation 112: set `Status = Off` and note `Retired legacy duplicate of Automation 013; absent from native PROD; do not recreate.`

The ChatGPT Airtable connector attempted this update but received HTTP 403, so these two tracking-table cells require an operator edit.

## Documentation correction

Do not describe 113 as the replacement creator for 112. The precise ownership is:

- **013 replaces 112 for Video Feedback record creation/linking.**
- **113 owns base Video XP preparation.**
- **114 owns Video XP Event creation/update.**

## Closeout criteria

This package is closed when:

1. 061 remains absent from native PROD and the formula continues to calculate correctly.
2. 112 remains absent/off.
3. The two stale `Automations` tracking rows are changed from `Live` to `Off`.
4. A controlled video submission confirms `013 → 113 → 114` without duplicate Video Feedback or XP Event records.
