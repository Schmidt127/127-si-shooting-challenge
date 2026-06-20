# Shooting Challenge Automation

Airtable automation script(s) for processing **shooting submissions** and awarding XP, updating streaks, and triggering downstream workflows.

## Purpose

When an athlete logs a shooting submission (makes, attempts, challenge type), this automation:

1. Validates the submission (athlete enrolled, required fields present)
2. Calculates XP per challenge rules
3. Creates an **XP Event** record (append-only ledger) with a dedupe key
4. Updates athlete streak / rollup fields as designed
5. Optionally calls a Make webhook for notifications (if configured)

## Location in Airtable

| Item | Value |
|------|-------|
| Automation name | *(fill in production name)* |
| Trigger | Record created or updated — Submissions table |
| Script type | Run script action |

See [../../schema/current/automation-trigger-map.md](../../schema/current/automation-trigger-map.md) for the live trigger map.

## Files in This Folder

| File | Status | Description |
|------|--------|-------------|
| `submission-xp.js` | *(add)* | Main automation script |
| `README.md` | Active | This document |

## Development Workflow

1. **Edit in Cursor** — Scripts live in GitHub first.
2. **Review** — Use ChatGPT or peer review for XP logic and edge cases.
3. **Test** — Use a test athlete / sandbox view in Airtable; never test on production athletes without a flag.
4. **Deploy** — Paste script into Airtable automation; match field names to [field-map.md](../../schema/current/field-map.md).
5. **Verify** — Run audit extension script (dry-run) after deploy.
6. **Document** — Update `CHANGELOG.md` and automation-trigger-map.

## Idempotency

Before creating an XP Event, check:

- Submission `{XP Awarded}` flag, or
- Existing XP Event with matching `{Dedupe Key}`

On success, set `{XP Awarded}` on the submission to prevent double-award on automation retry.

## XP Rules (Placeholder)

Document challenge-specific rules here or link to Config table:

| Challenge type | XP formula | Notes |
|----------------|------------|-------|
| Daily 127 | *(e.g. makes × multiplier)* | |
| *(add)* | | |

## Related Docs

- [Submission → XP flow](../../../docs/data-flow/submission-to-xp-flow.md)
- [Emergency recovery](../../../docs/recovery/emergency-recovery.md)
