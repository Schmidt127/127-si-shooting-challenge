# JR Referee Clinics — Airtable automations

Native Airtable automation scripts for **127SI - JR REF**.

## Standard

Follow the same production standard as Shooting Challenge:

- Full doc: [`../AUTOMATION_SCRIPT_STANDARD.md`](../AUTOMATION_SCRIPT_STANDARD.md)
- Cursor rule: `.cursor/rules/airtable-automation-scripts.mdc` (shared)

## File naming

```
{number}-{kebab-case}.js
```

Example: `001-participant-intake-from-fillout.js`

## Folder layout

```
jr-referee-clinics/
├── README.md
└── 001-....js
```

## Deploy workflow

1. Edit script in GitHub (this folder)
2. Copy docblock through end into Airtable automation (skip GitHub-only header if present)
3. Note production-impacting changes in `CHANGELOG.md` under `### JR Ref / Airtable`

## Triggers (document as you add scripts)

| Automation | Trigger | Purpose |
|------------|---------|---------|
| _TBD_ | Fillout sync / record created | Participant intake |
| _TBD_ | | Mentor assignment |
| _TBD_ | | Game assignment notifications |

Update [`../../schema/jr-ref/current/automation-trigger-map.md`](../../schema/jr-ref/current/automation-trigger-map.md) when live.
