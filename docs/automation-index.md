# Automation index — Shooting Challenge

Production scripts live in `airtable/automations/shooting-challenge/`.

Standard: `airtable/automations/AUTOMATION_SCRIPT_STANDARD.md`

| # | Name | Trigger | Script | Notes |
|---|------|---------|--------|-------|
| — | _(populate from Airtable)_ | | | Run schema export; document each automation as deployed |

## Template for new entries

- **Trigger:** record created / field updated / scheduled
- **Reads:** tables and fields
- **Writes:** tables and fields
- **Risks:** idempotency, XP stealing, date timezone
- **Test:** dry-run extension or test record

## Extension audits

`airtable/extension-scripts/audits/` — Stages A–J dry-run audits.
