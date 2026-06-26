# Documentation Index

Central map for all documentation in this monorepo. **Start here** when you are not sure which file to open.

> **Repo name vs product:** GitHub repo is `127-si-shooting-challenge` (historical). The public website in `web/` is the **Hoop Challenges** hub; Shooting Challenge is one program under it.

---

## Operations and architecture

| Doc | Purpose |
|-----|---------|
| [../README.md](../README.md) | Repo introduction and layout |
| [../SYSTEM_OVERVIEW.md](../SYSTEM_OVERVIEW.md) | Modules, data flow, architecture goals |
| [../CHANGELOG.md](../CHANGELOG.md) | Production-impacting changes (sections: Airtable / Web / Make) |
| [architecture/architecture-review.md](./architecture/architecture-review.md) | Architecture review checklist |
| [recovery/emergency-recovery.md](./recovery/emergency-recovery.md) | Incident recovery runbook |
| [checklists/weekly-maintenance-checklist.md](./checklists/weekly-maintenance-checklist.md) | Weekly ops checklist |

## Data flows

| Doc | Purpose |
|-----|---------|
| [data-flow/submission-to-xp-flow.md](./data-flow/submission-to-xp-flow.md) | Submission → XP Event path |
| [data-flow/homework-flow.md](./data-flow/homework-flow.md) | Homework upload and review |
| [data-flow/weekly-summary-flow.md](./data-flow/weekly-summary-flow.md) | Weekly Athlete Summary chain |

## Airtable (backend)

| Doc | Purpose |
|-----|---------|
| [../airtable/schema/current/table-map.md](../airtable/schema/current/table-map.md) | Table relationships |
| [../airtable/schema/current/field-map.md](../airtable/schema/current/field-map.md) | Canonical field names |
| [../airtable/schema/current/automation-trigger-map.md](../airtable/schema/current/automation-trigger-map.md) | Automation triggers |
| [../airtable/automations/AUTOMATION_SCRIPT_STANDARD.md](../airtable/automations/AUTOMATION_SCRIPT_STANDARD.md) | Production script standard |
| [../airtable/extension-scripts/audits/README.md](../airtable/extension-scripts/audits/README.md) | **Pipeline audits (Stages A–J)** |
| [../airtable/extension-scripts/safe-backfills/README.md](../airtable/extension-scripts/safe-backfills/README.md) | **Backfill run order** |
| [airtable/stage-j-legacy-cleanup.md](./airtable/stage-j-legacy-cleanup.md) | Stage J legacy field cleanup |
| [../airtable/extension-scripts/schema/README.md](../airtable/extension-scripts/schema/README.md) | In-base schema export script |

## Web (frontend)

| Doc | Purpose |
|-----|---------|
| [../web/README.md](../web/README.md) | Next.js app quick start |
| [../web/docs/site-hierarchy.md](../web/docs/site-hierarchy.md) | **Canonical routes and nav** |
| [../web/docs/page-plan.md](../web/docs/page-plan.md) | Page phases (links to site-hierarchy) |
| [../web/docs/airtable-data-map.md](../web/docs/airtable-data-map.md) | Airtable tables → web features |
| [../web/docs/public-data-rules.md](../web/docs/public-data-rules.md) | What may appear on public pages |
| [../web/docs/deployment-notes.md](../web/docs/deployment-notes.md) | Vercel deploy and env vars |
| [../web/docs/project-roadmap.md](../web/docs/project-roadmap.md) | Web product phases |
| [../web/docs/cursor-instructions.md](../web/docs/cursor-instructions.md) | AI editing conventions for `web/` |

## Make.com

| Doc | Purpose |
|-----|---------|
| [../make/documentation/README.md](../make/documentation/README.md) | Scenario documentation index |
| [../make/documentation/upload-asset-engine.md](../make/documentation/upload-asset-engine.md) | Upload asset engine |
| [../make/blueprints/README.md](../make/blueprints/README.md) | Exported scenario blueprints |

## Tools

| Doc | Purpose |
|-----|---------|
| [../tools/airtable/README.md](../tools/airtable/README.md) | Schema export Python tools |

## AI / Cursor

| Doc | Purpose |
|-----|---------|
| [../.cursor/rules/](../.cursor/rules/) | **Canonical Cursor rules** (always applied) |
| [../cursor/rules.md](../cursor/rules.md) | Pointer to `.cursor/rules/` |

---

## Common tasks

| I want to… | Go to |
|------------|-------|
| Run a data integrity pass | [audits README](../airtable/extension-scripts/audits/README.md) |
| Repair historical data | [safe-backfills README](../airtable/extension-scripts/safe-backfills/README.md) |
| Deploy the website | [deployment-notes](../web/docs/deployment-notes.md) |
| Add a new public page | [site-hierarchy](../web/docs/site-hierarchy.md) |
| Export schema from Airtable | [extension schema README](../airtable/extension-scripts/schema/README.md) or [tools/airtable](../tools/airtable/README.md) |
