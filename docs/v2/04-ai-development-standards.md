# 04 — AI Development Standards

**Status:** Shell — consolidate from existing AI and editor rules.

## Purpose

How **ChatGPT**, **Cursor**, and **GitHub** work together on this project.

## Division of labor (recommended)

| Tool | Use for |
|------|---------|
| **ChatGPT** (subscription) | Draft docs (`docs/v2/`), game manual, parent copy, architecture review, business rules |
| **Cursor** | Edit repo, run audits/tools, multi-file code, git commit/push |
| **GitHub** | Source of truth; version history |
| **ChatGPT Project Sources** | Upload `docs/v2/*.md` after commits for AI reference |

## Start here (AI sessions)

1. [01-constitution.md](./01-constitution.md) / [02-master-direction.md](./02-master-direction.md)
2. [../PROJECT_STATE.md](../PROJECT_STATE.md) — live snapshot
3. [../../AGENTS.md](../../AGENTS.md) — repo-wide agent instructions

## Canonical sources

| Doc | Content |
|-----|---------|
| [../../AGENTS.md](../../AGENTS.md) | Agent startup, hard constraints, task paths |
| [../../.cursor/rules/monorepo.mdc](../../.cursor/rules/monorepo.mdc) | Repo scope and deploy paths |
| [../../.cursor/rules/airtable-automation-scripts.mdc](../../.cursor/rules/airtable-automation-scripts.mdc) | Automation script standard |
| [../../.cursor/rules/web-ui-brand.mdc](../../.cursor/rules/web-ui-brand.mdc) | Web UI brand rules |
| [../../web/docs/cursor-instructions.md](../../web/docs/cursor-instructions.md) | Web-specific AI editing notes |

## Hard constraints (all AI tools)

- Never commit secrets (`.env`, PATs, webhook URLs with tokens).
- Airtable production writes: GitHub first → paste into Airtable → `CHANGELOG.md`.
- Audits/backfills: dry-run first; explicit confirm flags for writes.
- Web: Airtable reads server-side only.
- XP idempotency: one source record → one XP Event.

## Full standalone doc

_To be expanded: ChatGPT project instructions template, upload checklist, when to use Ask vs Agent mode in Cursor._
