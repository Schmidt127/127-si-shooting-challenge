# 05 — System Architecture

**Status:** Shell — links to existing architecture and data-flow docs.

## System layers

| Layer | Role |
|-------|------|
| **Airtable** | Data, formulas, native automations, extension scripts |
| **Make.com** | S3 upload (target), Gmail, webhooks — today still Google Drive in upload engine |
| **GitHub** | Versioned scripts, schema, blueprints, docs |
| **Next.js (`web/`)** | Public app at `/shoot` on hoopchallenges.com |
| **Fillout** | Submission and quiz intake |

## Core data flow

```
Enrollment → Submission → XP Event → Weekly Athlete Summary
                ↓
         Levels / gates (config tables + automation 042)
                ↓
         Parent email (Make + automations 072/074)
```

## Canonical sources

| Doc | Content |
|-----|---------|
| [../../SYSTEM_OVERVIEW.md](../../SYSTEM_OVERVIEW.md) | Modules and architecture goals |
| [../architecture/architecture-review.md](../architecture/architecture-review.md) | Review checklist |
| [../data-flow/submission-to-xp-flow.md](../data-flow/submission-to-xp-flow.md) | Submission → XP |
| [../data-flow/homework-flow.md](../data-flow/homework-flow.md) | Homework pipeline |
| [../data-flow/weekly-summary-flow.md](../data-flow/weekly-summary-flow.md) | Weekly email chain |
| [../shooting-challenge-v2-base-cutover.md](../shooting-challenge-v2-base-cutover.md) | Archive + clone for 2026–27 |
| [../asset-storage-migration.md](../asset-storage-migration.md) | **AWS S3 + canonical URL** asset architecture (C-013) |
| [../../airtable/schema/current/table-map.md](../../airtable/schema/current/table-map.md) | Tables and links |
| [../../airtable/schema/current/automation-trigger-map.md](../../airtable/schema/current/automation-trigger-map.md) | Automation triggers |
| [../PROJECT_STATE.md](../PROJECT_STATE.md) | Live base IDs, Vercel, audit status |

## Full standalone doc

_To be expanded: diagrams, integration inventory (Fillout, Make, Vercel env vars), 2026–27 base cutover as architecture milestone._
