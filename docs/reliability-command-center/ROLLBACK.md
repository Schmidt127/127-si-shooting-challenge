# Rollback plan

**Status:** Designed / Ready for Production Installation packet

## Repository framework

If the RCC branch causes problems before merge:

1. Do not merge to `master`.
2. Leave branch; revert PR.
3. No Airtable impact (repo-only).

If already merged and docs confuse operators:

1. Revert the merge commit on a new PR.
2. Mark docs status as superseded in CHANGELOG.

## Airtable views / Interface (if Mike installed later)

1. Delete or hide Interface **Reliability Command Center**.
2. Delete saved views created from AIRTABLE-VIEW-SPEC.md.
3. If optional formula fields were added (`RCC Email Conflict?`, `RCC Level Conflict?`), delete those fields.
4. If `RCC Findings` table was created, archive it — do not delete historical evidence without export.

## What rollback must never do

- Delete XP Events, unlocks, WAS, or Submissions as a “cleanup”
- Clear `Weekly Email Sent?` to force a resend
- Disable 074/Make without a separate incident decision
- Weaken Source Key uniqueness

## Confirm no duplicates after any repair attempt

Re-run:

```bash
node tools/reliability-command-center/cli.js --input <fresh-export.json> --output /tmp/rcc-post
```

Expect zero (or explained residual) findings for:

- `xp_duplicate_source_key`
- `duplicate_was_enrollment_week`
- `duplicate_*_unlock*`
- `already_sent_eligible_to_resend`
- `sent_still_armed`
