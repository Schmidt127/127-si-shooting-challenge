# Shooting Challenge Automations

**46 production scripts** for the 127 SI Shooting Challenge Airtable base (`appn84sqPw03zEbTT`).

GitHub is the **source of truth**; Airtable is the deployed copy.

## Quick links

| Doc | Purpose |
|-----|---------|
| [../../../docs/automation-index.md](../../../docs/automation-index.md) | **Full script index** (numbered table by domain) |
| [../../schema/current/automation-trigger-map.md](../../schema/current/automation-trigger-map.md) | Triggers, tables, downstream XP/email/Make |
| [../AUTOMATION_SCRIPT_STANDARD.md](../AUTOMATION_SCRIPT_STANDARD.md) | Required script structure |
| [../../../airtable/extension-scripts/audits/README.md](../../../airtable/extension-scripts/audits/README.md) | Pipeline audits (Stages A–J) |

## Numbering

Scripts use `{number}-{kebab-case-description}.js`:

| Range | Domain |
|-------|--------|
| 001–003 | Enrollment intake |
| 005–023 | Submission intake and assets |
| 020, 063–065 | Homework review and XP |
| 030–034 | Weekly summary and goals |
| 041–043 | Levels and progression |
| 053–059, 066 | Achievements and streaks |
| 070a–077 | Email and Make handoffs |
| 101 | Zoom attendance XP |
| 111–114 | Video review and XP |

## Deploy workflow

1. Edit script in this folder → commit to GitHub
2. Copy from production docblock through end into Airtable automation (**skip** the GitHub header block at top)
3. Test on a sandbox record or test athlete
4. Run matching audit extension (dry-run)
5. Update `CHANGELOG.md` and [automation-index.md](../../../docs/automation-index.md) if trigger or name changed

## Script format

All scripts follow [AUTOMATION_SCRIPT_STANDARD.md](../AUTOMATION_SCRIPT_STANDARD.md) (enforced by `.cursor/rules/airtable-automation-scripts.mdc`):

- `CONFIG` for field/table names
- `async function main()` wrapper (new and substantive edits)
- Required outputs: `statusOut`, `errorOut`, `debugStep`, `actionOut`
- XP idempotency via Source Key — one source record → one XP Event

## Pipeline integrity

After any production deploy affecting data links or XP:

```text
airtable/extension-scripts/audits/   → dry-run audit for affected stage
airtable/extension-scripts/safe-backfills/   → repair only after audit identifies issues
```

Stage map is in the [audits README](../../../airtable/extension-scripts/audits/README.md).

## Related docs

- [Submission → XP flow](../../../docs/data-flow/submission-to-xp-flow.md)
- [Emergency recovery](../../../docs/recovery/emergency-recovery.md)
- [PROJECT_STATE](../../../docs/PROJECT_STATE.md) — live audit status
