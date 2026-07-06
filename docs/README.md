# Documentation Index

Central map for all documentation in this monorepo. **Start here** when you are not sure which file to open.

> **Repo:** `127-si-shooting-challenge` — public app at `/shoot` on hoopchallenges.com. Landing is `hoopchallenges-landing`.

**New session?** Read [ENGINEERING_CONSTITUTION.md](./ENGINEERING_CONSTITUTION.md) and [PROJECT_STATE.md](./PROJECT_STATE.md) first, then [v2/04-ai-development-standards.md](./v2/04-ai-development-standards.md) for the permanent AI workflow.

**Shooting Challenge V2?** Start at [v2/README.md](./v2/README.md), then [CHATGPT-MASTER-PLAN-BRIEF.md](./CHATGPT-MASTER-PLAN-BRIEF.md) for consolidated planning, or import [chatgpt-sources/](./chatgpt-sources/) into ChatGPT Project Sources.

---

## Engineering constitution

| Doc | Purpose |
|-----|---------|
| [ENGINEERING_CONSTITUTION.md](./ENGINEERING_CONSTITUTION.md) | **Highest-level engineering law** — GitHub, DEV-first, promotion, testing, priorities |
| [phase-2b-engineering-review-2026-07-06.md](./phase-2b-engineering-review-2026-07-06.md) | Phase 2B — V2-014 review, C-020 gaps, risks |

---

**[v2/README.md](./v2/README.md)** — read order, Mike + ChatGPT + Cursor workflow.

**[chatgpt-sources/](./chatgpt-sources/)** — **import this entire folder** into ChatGPT Project Sources (23 synced files + `00-START-HERE.md`).

| — | [v2/04-ai-development-standards.md](./v2/04-ai-development-standards.md) | **Active** — permanent workflow (Mike / ChatGPT / Cursor) |
| — | [CHATGPT-MASTER-PLAN-BRIEF.md](./CHATGPT-MASTER-PLAN-BRIEF.md) | **Consolidated backlog** — all C-/V2-/H- IDs, sub-system roadmaps, ChatGPT prompt |

| # | File | Status |
|---|------|--------|
| 01 | [v2/01-constitution.md](./v2/01-constitution.md) | **Active** — configurable game engine + four layers |
| 02 | [v2/02-master-direction.md](./v2/02-master-direction.md) | Shell |
| 03 | [v2/03-business-rules.md](./v2/03-business-rules.md) | **Engine contract** — platform behavior only |
| 04 | [v2/04-ai-development-standards.md](./v2/04-ai-development-standards.md) | **Active** — AI workflow, task classification, five phases |
| — | [v2/season-configuration-design.md](./v2/season-configuration-design.md) | Season gate design (Layer 2, DRAFT) |
| 05 | [v2/05-system-architecture.md](./v2/05-system-architecture.md) | Shell |
| 06 | [v2/06-automation-standards.md](./v2/06-automation-standards.md) | **Active** — V2 rewrite pattern; **066 v3.1** reference |
| 07 | [v2/07-ui-standards.md](./v2/07-ui-standards.md) | Shell |
| 08 | [v2/08-testing-standards.md](./v2/08-testing-standards.md) | **Active** — audit-first; **fix the audit, not the data** |
| 09 | [v2/09-release-notes.md](./v2/09-release-notes.md) | Shell — points to CHANGELOG |

Legacy long-form docs below remain canonical until each v2 file is fully expanded.

---

## Shooting Challenge v2 (legacy paths — still valid)

| Doc | Purpose |
|-----|---------|
| [shooting-challenge-v2-master-direction.md](./shooting-challenge-v2-master-direction.md) | **Season direction** — mission, locked 2026–27 decisions |
| [v2/01-constitution.md](./v2/01-constitution.md) | **Constitution** — configurable game engine + four layers |
| [v2/03-business-rules.md](./v2/03-business-rules.md) | **Engine contract** — how the system behaves (not season numbers) |
| [shooting-challenge-v2-config-vs-code.md](./shooting-challenge-v2-config-vs-code.md) | **Config vs code** — what lives in Levels / Level Gate Rules / XP Reward Rules vs scripts |
| [shooting-challenge-v2-base-cutover.md](./shooting-challenge-v2-base-cutover.md) | **Archive + clone** — scrub season data, keep config; GitHub tag (no fork) |
| [asset-storage-migration.md](./asset-storage-migration.md) | **AWS S3 + canonical URLs** — retire Drive/Airtable attachments (C-013) |
| [testing-and-intake-architecture.md](./testing-and-intake-architecture.md) | Fillout validation, flexible Weeks, test sandbox, Engineering Test Framework (C-017–C-020) |
| [platform-config-improvements.md](./platform-config-improvements.md) | Grade bands + public display fields (C-021, C-022) |
| [v2-change-backlog.md](./v2-change-backlog.md) | **Owner change list** — all requests, dependency waves, **V2-013 Program Instance** |
| [v2-014-automation-modernization-roadmap.md](./v2-014-automation-modernization-roadmap.md) | **Phase 2 master doc** — automation inventory, disposition, capacity plan |
| [development-base-setup.md](./development-base-setup.md) | **V2-015 ops runbook** — clone, PAT, webhook isolation, dev-first deploy |
| [v2-015-development-base-architecture.md](./v2-015-development-base-architecture.md) | **Approved** — dev Airtable base + one prod + one repo |
| [CHATGPT-MASTER-PLAN-BRIEF.md](./CHATGPT-MASTER-PLAN-BRIEF.md) | **Planning aggregate** — Wave 0 closed; H-001/H-002; session progress |
| [v2/06-automation-standards.md](./v2/06-automation-standards.md) | **V2 automation rewrite pattern** — 066 v3.1 reference |
| [v2/08-testing-standards.md](./v2/08-testing-standards.md) | **Audit-first testing** — fix the audit, not the data |

---

## Operations and architecture

| Doc | Purpose |
|-----|---------|
| [PROJECT_STATE.md](./PROJECT_STATE.md) | **Live snapshot** — bases, audits, Vercel, Softr |
| [../AGENTS.md](../AGENTS.md) | AI assistant instructions |
| [../README.md](../README.md) | Repo introduction and layout |
| [../SYSTEM_OVERVIEW.md](../SYSTEM_OVERVIEW.md) | Modules, data flow, architecture goals |
| [automation-index.md](./automation-index.md) | **All 46 production automations** — links to [V2-014 roadmap](./v2-014-automation-modernization-roadmap.md) |
| [../CHANGELOG.md](../CHANGELOG.md) | Production-impacting changes (sections: Airtable / Web / Make) |
| [architecture/architecture-review.md](./architecture/architecture-review.md) | Architecture review checklist |
| [recovery/emergency-recovery.md](./recovery/emergency-recovery.md) | Incident recovery runbook |
| [checklists/weekly-maintenance-checklist.md](./checklists/weekly-maintenance-checklist.md) | Weekly ops checklist |
| [close-out-considerations.md](./close-out-considerations.md) | **Watchlist** — open items to consider during close-out / review |
| [post-close-hygiene-2025-26.md](./post-close-hygiene-2025-26.md) | **Post-close backlog** — 2025–26 audit hygiene (unlock dedupe, 066, scope, catalog) |
| [media-kits.md](./media-kits.md) | **End-of-season publicity** — `media/` layout, builders, V2-028 roadmap |
| [xp-motivation-analysis-2025-26.md](./xp-motivation-analysis-2025-26.md) | V1 XP / levels / streak data; dual-track brainstorm **not** adopted — see V2 master direction |

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
