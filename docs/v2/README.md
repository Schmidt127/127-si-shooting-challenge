# Shooting Challenge v2 — Documentation pack

**Status:** Numbered pack. **01**, **03**, **04**, **06**, and **08** are active; others are shells until expanded.

**Wave 0 (2025–26 close-out):** **Closed 2026-07-05.**

**Source of truth:** GitHub. Re-upload after meaningful commits.

**ChatGPT import:** Use **[../chatgpt-sources/](../chatgpt-sources/)** — select all files in that folder for Project Sources. Refresh with `.\tools\docs\sync-chatgpt-sources.ps1` from repo root.

## Read order

| # | File | Status |
|---|------|--------|
| — | [../ENGINEERING_CONSTITUTION.md](../ENGINEERING_CONSTITUTION.md) | **Active** — highest-level engineering law (GitHub, DEV-first, priorities) |
| 01 | [01-constitution.md](./01-constitution.md) | **Active** — configurable game engine + four layers |
| 02 | [02-master-direction.md](./02-master-direction.md) | Shell — links to master direction |
| 03 | [03-business-rules.md](./03-business-rules.md) | **Engine contract** (Layer 1) — platform behavior only |
| — | [season-configuration-design.md](./season-configuration-design.md) | **DRAFT** — gate spread / season tuning (Layer 2) |
| — | [level-gate-rules-config-template.csv](./level-gate-rules-config-template.csv) | Worksheet — example level names; numbers TBD |
| 04 | [04-ai-development-standards.md](./04-ai-development-standards.md) | **Active** — three-role workflow, **DEV-first delivery diagram**, five phases |
| 05 | [05-system-architecture.md](./05-system-architecture.md) | Shell |
| 06 | [06-automation-standards.md](./06-automation-standards.md) | **Active** — V2 rewrite pattern; **permanent SCRIPT+CONFIG header**; **066 v3.2** reference |
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
| [../phase-2b-engineering-review-2026-07-06.md](../phase-2b-engineering-review-2026-07-06.md) | Phase 2B — V2-014 review, C-020 gaps |
| [../development-base-setup.md](../development-base-setup.md) | **V2-015 ops runbook** — clone prod, isolate webhooks, dev-first deploy |
| [../V2_RELEASE_CHECKLIST.md](../V2_RELEASE_CHECKLIST.md) | **Release checklist** — promote, smoke, rollback, sign-off |
| [../AUTOMATION_VERSION_INVENTORY.md](../AUTOMATION_VERSION_INVENTORY.md) | Automation version / trigger / DEV·PROD inventory |
| [../V2_END_TO_END_TEST_MATRIX.md](../V2_END_TO_END_TEST_MATRIX.md) | End-to-end athlete scenario matrix |
| [ZOOM_RECORDING_CREDIT_DEV_INSTALL.md](./ZOOM_RECORDING_CREDIT_DEV_INSTALL.md) | C-025 Zoom recording credit DEV install |
| [C025_ARCHITECTURE_RECONCILIATION.md](./C025_ARCHITECTURE_RECONCILIATION.md) | Stage 17 six-pack vs S16 117a/b — responsibility matrix |
| [AUTOMATION_070A_LAUNCH_DECISION.md](./AUTOMATION_070A_LAUNCH_DECISION.md) | 070a homework upload launch decision |
| [REMAINING_AIRTABLE_DEV_PACKAGES_INDEX.md](./REMAINING_AIRTABLE_DEV_PACKAGES_INDEX.md) | Worker A index — C-009/010/011/019 + 059/043/112 |
| [DEV_FIELD_TRIGGER_INVENTORY_2026-07-16.md](./DEV_FIELD_TRIGGER_INVENTORY_2026-07-16.md) | DEV field/trigger inventory (snapshot + auth blocker) |
| [C009_C010_C011_MIGRATION_SAFETY.md](./C009_C010_C011_MIGRATION_SAFETY.md) | Migration order, safe defaults, dedupe keys, rollback |
| [C009_HW17_ATTACHMENT_DEV_INSTALL.md](./C009_HW17_ATTACHMENT_DEV_INSTALL.md) | C-009 HW17 attachment intake (067 correction) |
| [C010_ACTIVE_GUARDS_DEV_INSTALL.md](./C010_ACTIVE_GUARDS_DEV_INSTALL.md) | C-010 Active?/PPE guards for 010/031/053/065/072 |
| [C011_AUTOMATIC_WEEKLY_EMAIL_DEV_INSTALL.md](./C011_AUTOMATIC_WEEKLY_EMAIL_DEV_INSTALL.md) | C-011 automatic weekly email (118/119 design) |
| [C019_DEV_TESTING_VIEWS.md](./C019_DEV_TESTING_VIEWS.md) | C-019 DEV Testing views specification |
| [AUTOMATION_059_TRIGGER_RESOLUTION.md](./AUTOMATION_059_TRIGGER_RESOLUTION.md) | 059 created vs Ready-filter conflict |
| [AUTOMATION_043_RETIREMENT_PLAN.md](./AUTOMATION_043_RETIREMENT_PLAN.md) | 043 superseded by 042 — retirement procedure |
| [AUTOMATION_112_OFF_STATE_VERIFICATION.md](./AUTOMATION_112_OFF_STATE_VERIFICATION.md) | 112 OFF-state verification packet |

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
