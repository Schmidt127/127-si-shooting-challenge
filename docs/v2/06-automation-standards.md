# 06 — Automation Standards

**Status:** Shell — links to production automation standards (do not duplicate; link is canonical).

## Principles

- Wrap in `async function main()` for new/substantive scripts.
- `CONFIG` for all field/table names; docblock + `CONFIG.scriptName` + version.
- Required outputs: `statusOut`, `errorOut`, `debugStep`; use `setOutputSafe`.
- Idempotent: safe retries; one XP source → one XP event.
- Read game rules from **config tables** where possible ([config vs code](../shooting-challenge-v2-config-vs-code.md)).
- GitHub first → paste docblock into Airtable → `CHANGELOG.md` for production changes.

## Canonical sources

| Doc | Content |
|-----|---------|
| [../../airtable/automations/AUTOMATION_SCRIPT_STANDARD.md](../../airtable/automations/AUTOMATION_SCRIPT_STANDARD.md) | **Full automation script standard** |
| [../../.cursor/rules/airtable-automation-scripts.mdc](../../.cursor/rules/airtable-automation-scripts.mdc) | Cursor rule summary |
| [../automation-index.md](../automation-index.md) | All production automations (001–114) |
| [../../airtable/schema/current/automation-trigger-map.md](../../airtable/schema/current/automation-trigger-map.md) | Trigger map |
| [../../airtable/automations/shooting-challenge/](../../airtable/automations/shooting-challenge/) | Production script files |

## Key automations (reference)

| Area | Scripts |
|------|---------|
| Submission XP | 010 |
| Levels / gates | 041, 042 |
| Streaks | 053, 054 |
| Achievements | 059, 066 |
| Weekly email | 072, 074 |
| Homework XP | 064, 065 |

## Full standalone doc

_To be expanded: trigger naming conventions, deploy checklist, config-table read patterns per script family._
