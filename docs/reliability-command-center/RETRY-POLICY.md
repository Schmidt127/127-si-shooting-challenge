# Retry policy

**Status:** Built / Tested

## Classes

| Class | Meaning | Auto-retry? |
|-------|---------|-------------|
| `automatically_retryable` | Re-arm / re-run owning automation after uniqueness check | Yes (manual trigger only) |
| `retryable_after_correcting_data` | Fix fields/links first | No until fixed |
| `manual_review_required` | Ambiguous / blocking | No |
| `never_retry_already_completed` | Sent/completed — retry risks duplicates | Never |
| `possible_duplicate_risk` | Shared Source Key / identity | Never until resolved |
| `production_action_prohibited_without_verification` | Historical / Test-only / proposed prod write | Never without Mike verification |

## Hard rules

1. **No automatic bulk retry** that writes live records.
2. Repair tooling defaults to **dry-run**.
3. Explicit `--record-ids` required; `*` / `all` refused.
4. Skip already-completed records.
5. Display exact proposed field changes before any future authorized write.
6. Maintain Source Key / dedupe protection — never create a second XP Event, unlock, WAS, or email for the same identity.
7. Weekly email: if `Weekly Email Sent?` is checked, do not resend.
8. PROD 074 must not use fixed `sendMode=Test` (blocks Live writeback).

## Dry-run preview

```bash
node tools/reliability-command-center/repair-preview.js \
  --fixture path/to/export.json \
  --record-ids recXXXXXXXXXXXXXX,recYYYYYYYYYYYYYY
```

`--execute` is accepted but **ignored** for live writes in this tool. Real repairs use Mike-authorized safe-backfills / OMNI after review.
