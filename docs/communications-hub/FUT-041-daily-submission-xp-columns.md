# FUT-041 — Daily Submission XP columns (Hub integration note)

**Backlog:** FUT-041  
**Shooting Challenge automation:** **076** → Email Handoff Queue → **079** → Hub → Resend  
**Hub template:** `DAILY_SUBMISSION`

## Presentation

The Daily Submission Acknowledgement email renders three compact metric columns in one horizontal row:

1. **Current Day Streak**
2. **XP Earned** — shooting-base submission XP (`SUBMISSION_XP|` active event total)
3. **Extra Credit** — always shown; **`0`** when none applies

## Payload contract

See Communications Hub [`DAILY_SUBMISSION_v1.md`](../../communications/docs/contracts/DAILY_SUBMISSION_v1.md) (in `Schmidt127/communications`).

| Field | Required | Notes |
|-------|----------|-------|
| `xpEarned` | Optional | Preferred; mirrors active submission-base XP |
| `xpExtraCredit` | Optional | Hub defaults to `0`; **076** sends explicit `0` |
| `submissionXp` | Optional | Backward-compatible alias of `xpEarned` |
| `submissionXpStatus` | Optional | Shown on **XP Earned** when `xpEarned` / `submissionXp` is `null` |

## Decision record

Display-time split only — no change to XP award logic. Full operator steps: [`../deploy-checklists/FUT-041-daily-submission-xp-columns.md`](../deploy-checklists/FUT-041-daily-submission-xp-columns.md).
