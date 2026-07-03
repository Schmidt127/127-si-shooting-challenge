# Documentation Index

Central map for all documentation in this monorepo. **Start here** when you are not sure which file to open.

> **Repo:** `127-si-shooting-challenge` — public app at `/shoot` on hoopchallenges.com. Landing is `hoopchallenges-landing`.

**New session?** Read [PROJECT_STATE.md](./PROJECT_STATE.md) first, then [../AGENTS.md](../AGENTS.md) for AI conventions.

---

## Operations and architecture

| Doc | Purpose |
|-----|---------|
| [PROJECT_STATE.md](./PROJECT_STATE.md) | **Live snapshot** — bases, audits, Vercel, Softr |
| [../AGENTS.md](../AGENTS.md) | AI assistant instructions |
| [../README.md](../README.md) | Repo introduction and layout |
| [../SYSTEM_OVERVIEW.md](../SYSTEM_OVERVIEW.md) | Modules, data flow, architecture goals |
| [automation-index.md](./automation-index.md) | **All 46 production automations** |
| [../CHANGELOG.md](../CHANGELOG.md) | Production-impacting changes (sections: Airtable / Web / Make) |
| [architecture/architecture-review.md](./architecture/architecture-review.md) | Architecture review checklist |
| [recovery/emergency-recovery.md](./recovery/emergency-recovery.md) | Incident recovery runbook |
| [checklists/weekly-maintenance-checklist.md](./checklists/weekly-maintenance-checklist.md) | Weekly ops checklist |
| [close-out-considerations.md](./close-out-considerations.md) | **Watchlist** — open items to consider during close-out / review |
| [post-close-hygiene-2025-26.md](./post-close-hygiene-2025-26.md) | **Post-close backlog** — 2025–26 audit hygiene (unlock dedupe, 066, scope, catalog) |
| [xp-motivation-analysis-2025-26.md](./xp-motivation-analysis-2025-26.md) | **Deferred** XP / levels / streak tuning (C-014) |

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
| [../web/docs/airtable-views.md](../web/docs/airtable-views.md) | **Views and filters** used by queries.ts |
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

## JR Referee Clinics

Separate repo: `127-si-jr-ref` (public path `/refclinic`).

## Multi-repo map

| Program | Repo | Public path |
|---------|------|-------------|
| Hoop landing | `hoopchallenges-landing` | https://www.hoopchallenges.com |
| Shooting Challenge | this repo | `/shoot` |
| JR Referee Clinics | `127-si-jr-ref` | `/refclinic` |

Details: [PROJECT_STATE.md](./PROJECT_STATE.md)

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
| Export Shooting Challenge schema | [tools/airtable](../tools/airtable/README.md) |
| Multi-repo program map | [PROJECT_STATE.md](./PROJECT_STATE.md) |
| Look up an automation | [automation-index.md](./automation-index.md) |
