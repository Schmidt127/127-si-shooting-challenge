# Agent instructions  -  127 SI Shooting Challenge

Guidance for AI assistants (Cursor, etc.) working in **`127-si-shooting-challenge`** / `Schmidt127/127-si-shooting-challenge`.

## Before any edit

1. Confirm you are in the **Shooting Challenge** repository (not landing, JR Ref, TST, or another app).
2. Read, in order:
   - [AGENTS.md](./AGENTS.md) (this file)
   - [BRAND_STANDARDS.md](./BRAND_STANDARDS.md)
   - [APP_CONTEXT.md](./APP_CONTEXT.md)
3. Confirm public route / `basePath`: **`/shoot`**.
4. Inspect existing architecture (`web/`, `airtable/`, `docs/`) before making changes.
5. Preserve business logic and integrations (Airtable, XP, achievements, levels, summaries, automations).
6. Do not assume instructions from another repository apply here.
7. Do not let another app's theme overwrite this app's theme; keep shared brand + this app's accents per `APP_CONTEXT.md`.

## Start here

0. [docs/ENGINEERING_CONSTITUTION.md](./docs/ENGINEERING_CONSTITUTION.md)  -  **highest-level engineering law** (GitHub, DEV-first, priorities)
1. [docs/agent-runs/00-START-HERE.md](./docs/agent-runs/00-START-HERE.md)  -  **controlled four-agent workflow** (Lead / Implementation / Testing / Research)
2. [docs/agent-runs/CONTROL.json](./docs/agent-runs/CONTROL.json)  -  **four-agent resume source of truth** (read before multi-agent work; verify git SHA)
3. [docs/SESSION_HANDOFF-2026-07-06.md](./docs/SESSION_HANDOFF-2026-07-06.md)  -  **latest session handoff** (bases, blockers, schema snapshots)
4. [docs/v2/04-ai-development-standards.md](./docs/v2/04-ai-development-standards.md)  -  **permanent workflow** (Mike / ChatGPT / Cursor / **OMNI-first** for in-Airtable work)
5. [docs/v2/README.md](./docs/v2/README.md)  -  **V2 numbered doc pack** (`01`-`09`)
6. [docs/PROJECT_STATE.md](./docs/PROJECT_STATE.md)  -  live snapshot (bases, audits, Vercel, Softr)
7. [docs/v2-change-backlog.md](./docs/v2-change-backlog.md)  -  live backlog (add new items here)
8. [docs/CHATGPT-MASTER-PLAN-BRIEF.md](./docs/CHATGPT-MASTER-PLAN-BRIEF.md)  -  aggregated planning view for ChatGPT
9. [APP_CONTEXT.md](./APP_CONTEXT.md)  -  route, theme, product boundaries
10. [BRAND_STANDARDS.md](./BRAND_STANDARDS.md)  -  shared 127 SI brand foundation

## Repo scope

- **This repo:** Shooting Challenge backend (Airtable automations, audits, backfills) + Next.js app at **`/shoot`** on hoopchallenges.com
- **Not this repo:** Hoop landing (`hoopchallenges-landing`), JR Ref (`127-si-jr-ref`), Team Shot Tracker, Dribbling, Brackets, Rankings

## Canonical brand synchronization

The canonical shared brand document is maintained in the
`Schmidt127/hoopchallenges-landing` repository.

Before significant design work, compare this repository's
`BRAND_STANDARDS.md` version with the canonical version.

If the versions differ:
- report the mismatch,
- do not silently invent or merge standards,
- synchronize only through an approved cross-repository documentation update.

`APP_CONTEXT.md` remains repository-specific and must not be copied between apps.

## Canonical rules

| Area | Rule file / doc |
|------|-----------------|
| **Four-agent workflow** | [docs/agent-runs/00-START-HERE.md](./docs/agent-runs/00-START-HERE.md) · `.cursor/rules/four-agent-workflow.mdc` |
| **AI workflow (Mike / ChatGPT / Cursor)** | [docs/v2/04-ai-development-standards.md](./docs/v2/04-ai-development-standards.md) |
| Workspace guardrails (Cursor) | `.cursor/rules/workflow-guardrails.mdc` |
| Airtable automations | `.cursor/rules/airtable-automation-scripts.mdc` |
| Web UI | `.cursor/rules/web-ui-brand.mdc` |
| Monorepo navigation | `.cursor/rules/monorepo.mdc` |
| Shared brand | [BRAND_STANDARDS.md](./BRAND_STANDARDS.md) |
| App theme / route | [APP_CONTEXT.md](./APP_CONTEXT.md) |

## Four-agent operating rules

Use this model for controlled multi-agent packages. Role docs live under `docs/agent-runs/`.

| Role | Responsibility |
|------|----------------|
| **Lead / Integrator** | Plan, assign exclusive paths, merge worker branches, re-run tests, update CONTROL, handoff |
| **Implementation Worker** | Bounded code/docs slice on assigned branch only  -  **never merges** |
| **Testing and Review Worker** | Tests + structured review on assigned paths  -  **never merges** |
| **Research and Documentation Worker** | Inventory/briefs/docs  -  **never merges** |

**Hard stops (all four roles):**

- DEV only  -  no Production access
- No Airtable schema changes without Mike authorization
- No credential or secret changes
- No deployment (Vercel, AWS, Make prod, Airtable prod)
- No destructive Git (`reset --hard`, `clean`, force push, branch delete)
- Workers cannot merge  -  only Lead integrates worker branches
- Mike must approve any merge to `master` / `main`
- No live Airtable access unless Mike authorizes a named DEV check

Launch prompts: [docs/agent-runs/05-LAUNCH-PROMPTS.md](./docs/agent-runs/05-LAUNCH-PROMPTS.md).

## Git / branches / deployment

- Use a **feature branch** for meaningful changes.
- Default production branch: **`master`**.
- Vercel root: **`web`**.
- Avoid direct production deployment from agent work.
- **Do not merge or deploy without Mike's approval.**

## Validation before handoff

Run when configured:

- lint
- type-check
- tests (if configured)
- production build

Also verify main `/shoot` routes and assets (respect `basePath`).

## Report back

Include:

- files changed
- assumptions
- validation results
- unresolved issues

## Hard constraints

- **Never commit secrets**  -  `.env`, PATs, webhook URLs with tokens
- **DEV before Production**  -  automations, formulas, views, interfaces, Make scenarios, scripts, schema  -  test in DEV first ([doc 04](./docs/v2/04-ai-development-standards.md))
- **Promotion doc required**  -  DEV changes are not official until Cursor documents prod steps in `docs/deploy-checklists/` ([doc 04 Â§ Official promotion documentation](./docs/v2/04-ai-development-standards.md#official-promotion-documentation-required))
- **Airtable production writes**  -  GitHub â†' DEV test â†' Mike approval â†' prod paste â†' `CHANGELOG.md`
- **Audits/backfills**  -  dry-run first; explicit `CONFIRM_WRITE` / `CONFIRM_DELETE` for writes
- **Web Airtable reads**  -  server-side only (`lib/airtable/`); never expose `AIRTABLE_API_TOKEN` to the browser
- **XP idempotency**  -  one source record â†' one XP Event; use Source Key patterns from automation scripts
- **Four-agent merges**  -  workers never merge; Lead merges workers only; Mike approves `master`/`main`
- **Preserve** Airtable, XP, achievement, level, summary, and automation logic
- **Theme**  -  primarily light; no full dark theme unless Mike explicitly approves ([APP_CONTEXT.md](./APP_CONTEXT.md))

## Task intake (Cursor)

When Mike brings a new task, respond first with a **Task Classification** block (see [04-ai-development-standards.md](./docs/v2/04-ai-development-standards.md)):

```
Task Classification
Type:
Priority:
Difficulty:
Owner:
Dependencies:
Backlog ID:
Estimated Scope:
Phase:
Correct tool for this step:
Repo:
Mike's role right now:
```

Then proceed only within Cursor's scope (Phase 3 Implementation / Phase 5 Close) unless Mike explicitly asks for planning.

## Workspace guardrails (Cursor)

**Actively prevent Mike from working in the wrong area.** Full rules: [04-ai-development-standards.md Â§ Workspace guardrails](./docs/v2/04-ai-development-standards.md#workspace-guardrails-do-not-work-in-the-wrong-area).

| If Mike asks forâ€¦ | Cursor shouldâ€¦ |
|-------------------|----------------|
| Planning, requirements, parent/editor copy, Phase 4 review | Output **Workspace Check** â†' send to **ChatGPT** |
| In-Airtable work (views, formulas, data, interfaces, one-off fixes) | Output **Workspace Check** â†' **OMNI first** (Mike's Airtable credit priority) unless GitHub required |
| Production automations, audits, web, tools, commits | Proceed (after Task Classification) |
| Implementation with no backlog ID or unapproved plan | Stop  -  request backlog ID + Phase 2 approval |
| Backlog change | Edit `docs/v2-change-backlog.md`  -  not `CHATGPT-MASTER-PLAN-BRIEF.md` |
| Hoop landing / JR Ref / other apps | Redirect to correct repo  -  not this one |

When redirecting, use the **Workspace Check** block from doc 04 (Current request, Correct phase/tool/repo, What Mike should do instead).

## Common tasks

| Task | Path |
|------|------|
| Data integrity pass | `airtable/extension-scripts/audits/README.md` |
| Historical repair | `airtable/extension-scripts/safe-backfills/README.md` |
| Automation lookup | `docs/automation-index.md` |
| Web routes | `web/docs/site-hierarchy.md` |
| Airtable views for web | `web/docs/airtable-views.md` |
| Deploy web | `docs/deployment-notes.md` |
| Media / publicity kits | `docs/media-kits.md`, `media/README.md` |

## Cursor Cloud specific instructions

The only locally-runnable application is the **Next.js web app** in `web/` (Node 22, npm). Everything else (Airtable, Make.com, Vercel, the `tools/airtable` Python CLI, `lambda/`) is an external/hosted service and is not needed to run or test the site. The startup update script already runs `npm --prefix web ci`.

Standard commands live in `web/package.json` (`dev`, `build`, `lint`, `typecheck`, `test`). Run them from `web/`.

Non-obvious caveats:
- **Base path `/shoot`**: the app mounts at `/shoot` (see `web/next.config.ts`). The dev server listens on **port 3001** (not 3000 as the `web/README.md` text says), so open `http://localhost:3001/shoot`. The bare `/` path returns 404 — always include `/shoot`.
- **Airtable token is optional for dev/CI**: there is no local database; all data comes from the hosted Airtable base at request time. Pages catch fetch failures and render graceful fallback/empty states, so the app boots, lints, typechecks, tests, and builds with **no** `AIRTABLE_API_TOKEN`. To see live data (leaderboard, levels, tutorials, etc.) or a green `/shoot/api/airtable` health check, copy `web/.env.local.example` to `web/.env.local` and set `AIRTABLE_API_TOKEN` (needs `data.records:read`) plus `AIRTABLE_BASE_ID` (DEV base `appTetnuCZlCZdTCT`).
- **Site access gate**: leave `SITE_ACCESS_TOKEN` unset locally. If it is set, `middleware.ts` blocks all routes (and returns 401 on `/api/*`) unless a matching token is supplied.
- No git hooks, Makefile, or devcontainer exist; CI is `.github/workflows/web.yml` (lint → typecheck → test → build on Node 22).
