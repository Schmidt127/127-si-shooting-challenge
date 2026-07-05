# Shooting Challenge v2 — Documentation pack

**Status:** Numbered pack. **01**, **03**, **04**, **06**, and **08** are active; others are shells until expanded.

**Wave 0 (2025–26 close-out):** **Closed 2026-07-05.**

**Source of truth:** GitHub. Re-upload after meaningful commits.

**ChatGPT import:** Use **[../chatgpt-sources/](../chatgpt-sources/)** — select all files in that folder for Project Sources. Refresh with `.\tools\docs\sync-chatgpt-sources.ps1` from repo root.

## Read order

| # | File | Status |
|---|------|--------|
| 01 | [01-constitution.md](./01-constitution.md) | **Active** — configurable game engine + four layers |
| 02 | [02-master-direction.md](./02-master-direction.md) | Shell — links to master direction |
| 03 | [03-business-rules.md](./03-business-rules.md) | **Engine contract** (Layer 1) — platform behavior only |
| — | [season-configuration-design.md](./season-configuration-design.md) | **DRAFT** — gate spread / season tuning (Layer 2) |
| — | [level-gate-rules-config-template.csv](./level-gate-rules-config-template.csv) | Worksheet — example level names; numbers TBD |
| 04 | [04-ai-development-standards.md](./04-ai-development-standards.md) | **Active** — three-role workflow, **DEV-first delivery diagram**, five phases |
| 05 | [05-system-architecture.md](./05-system-architecture.md) | Shell |
| 06 | [06-automation-standards.md](./06-automation-standards.md) | **Active** — V2 rewrite pattern; **066 v3.1** reference; **Automation Complexity Score** |
| 07 | [07-ui-standards.md](./07-ui-standards.md) | Shell |
| 08 | [08-testing-standards.md](./08-testing-standards.md) | **Active** — audit-first workflow; **fix the audit, not the data** |
| 09 | [09-release-notes.md](./09-release-notes.md) | Shell — points to CHANGELOG |

## Also read (not renumbered)

| Doc | Purpose |
|-----|---------|
| [../PROJECT_STATE.md](../PROJECT_STATE.md) | Live ops snapshot |
| [../../CHANGELOG.md](../../CHANGELOG.md) | Production release history |
| [../../AGENTS.md](../../AGENTS.md) | AI assistant instructions |
| [../README.md](../README.md) | Full documentation index |
| [../CHATGPT-MASTER-PLAN-BRIEF.md](../CHATGPT-MASTER-PLAN-BRIEF.md) | Consolidated backlog for ChatGPT master planning |
| [../development-base-setup.md](../development-base-setup.md) | **V2-015 ops runbook** — clone prod, isolate webhooks, dev-first deploy |

## Workflow: Mike + ChatGPT + Cursor

Permanent operating procedure: **[04-ai-development-standards.md](./04-ai-development-standards.md)**

| Role | Responsibility |
|------|----------------|
| **Mike** | Product Owner — final decisions, approves scope and commits |
| **ChatGPT** | Architect, planner, reviewer, docs, business analyst, copy |
| **Cursor** | Engineer — repo edits, code, audits, testing, commits |

**Five phases:** Idea → Planning → Implementation → Review → Close

**Guardrails:** Both tools output **Task Classification** + **Workspace Check** when Mike is in the wrong phase, tool, repo, or path. See doc 04 § Workspace guardrails.

**OMNI first:** For in-Airtable work (views, formulas, data, interfaces), Mike uses **OMNI** in the base before Cursor — Airtable credits are priority.

**Live backlog:** [v2-change-backlog.md](../v2-change-backlog.md) · **Planning aggregate:** [CHATGPT-MASTER-PLAN-BRIEF.md](../CHATGPT-MASTER-PLAN-BRIEF.md)

1. **ChatGPT** — Phases 1, 2, 4 (plan, document, review). Import [chatgpt-sources/](../chatgpt-sources/).
2. **Cursor** — Phases 3, 5 (implement, commit). Run sync script after doc commits.
3. **Mike** — Approves at every phase gate.

```powershell
.\tools\docs\sync-chatgpt-sources.ps1
```
