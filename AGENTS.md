# Agent instructions — 127 SI Shooting Challenge

Guidance for AI assistants (Cursor, etc.) working in this repository.

## Start here

0. [docs/ENGINEERING_CONSTITUTION.md](./docs/ENGINEERING_CONSTITUTION.md) — **highest-level engineering law** (GitHub, DEV-first, priorities)
1. [docs/SESSION_HANDOFF-2026-07-06.md](./docs/SESSION_HANDOFF-2026-07-06.md) — **latest session handoff** (bases, blockers, schema snapshots)
2. [docs/v2/04-ai-development-standards.md](./docs/v2/04-ai-development-standards.md) — **permanent workflow** (Mike / ChatGPT / Cursor / **OMNI-first** for in-Airtable work)
3. [docs/v2/README.md](./docs/v2/README.md) — **V2 numbered doc pack** (`01`–`09`)
4. [docs/PROJECT_STATE.md](./docs/PROJECT_STATE.md) — live snapshot (bases, audits, Vercel, Softr)
5. [docs/v2-change-backlog.md](./docs/v2-change-backlog.md) — live backlog (add new items here)
6. [docs/CHATGPT-MASTER-PLAN-BRIEF.md](./docs/CHATGPT-MASTER-PLAN-BRIEF.md) — aggregated planning view for ChatGPT

## Repo scope

- **This repo:** Shooting Challenge backend (Airtable automations, audits, backfills) + Next.js app at **`/shoot`** on hoopchallenges.com
- **Not this repo:** Hoop landing (`hoopchallenges-landing`), JR Ref (`127-si-jr-ref`), Team Shot Tracker

## Canonical rules

| Area | Rule file / doc |
|------|-----------------|
| **AI workflow (Mike / ChatGPT / Cursor)** | [docs/v2/04-ai-development-standards.md](./docs/v2/04-ai-development-standards.md) |
| Workspace guardrails (Cursor) | `.cursor/rules/workflow-guardrails.mdc` |
| Airtable automations | `.cursor/rules/airtable-automation-scripts.mdc` |
| Web UI | `.cursor/rules/web-ui-brand.mdc` |
| Monorepo navigation | `.cursor/rules/monorepo.mdc` |

## Hard constraints

- **Never commit secrets** — `.env`, PATs, webhook URLs with tokens
- **DEV before Production** — automations, formulas, views, interfaces, Make scenarios, scripts, schema — test in DEV first ([doc 04](./docs/v2/04-ai-development-standards.md))
- **Promotion doc required** — DEV changes are not official until Cursor documents prod steps in `docs/deploy-checklists/` ([doc 04 § Official promotion documentation](./docs/v2/04-ai-development-standards.md#official-promotion-documentation-required))
- **Airtable production writes** — GitHub → DEV test → Mike approval → prod paste → `CHANGELOG.md`
- **Audits/backfills** — dry-run first; explicit `CONFIRM_WRITE` / `CONFIRM_DELETE` for writes
- **Web Airtable reads** — server-side only (`lib/airtable/`); never expose `AIRTABLE_API_TOKEN` to the browser
- **XP idempotency** — one source record → one XP Event; use Source Key patterns from automation scripts

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

**Actively prevent Mike from working in the wrong area.** Full rules: [04-ai-development-standards.md § Workspace guardrails](./docs/v2/04-ai-development-standards.md#workspace-guardrails-do-not-work-in-the-wrong-area).

| If Mike asks for… | Cursor should… |
|-------------------|----------------|
| Planning, requirements, parent/editor copy, Phase 4 review | Output **Workspace Check** → send to **ChatGPT** |
| In-Airtable work (views, formulas, data, interfaces, one-off fixes) | Output **Workspace Check** → **OMNI first** (Mike's Airtable credit priority) unless GitHub required |
| Production automations, audits, web, tools, commits | Proceed (after Task Classification) |
| Implementation with no backlog ID or unapproved plan | Stop — request backlog ID + Phase 2 approval |
| Backlog change | Edit `docs/v2-change-backlog.md` — not `CHATGPT-MASTER-PLAN-BRIEF.md` |
| Hoop landing / JR Ref | Redirect to correct repo — not this one |

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

Only the **Next.js app in `web/`** is a locally runnable, interactive service. The Airtable
automation scripts (`airtable/automations/**`) and extension scripts run **inside Airtable's UI**
and cannot be executed locally. `tools/airtable/` and `lambda/upload-asset/` are Python CLI/AWS
utilities, not long-running services.

### web/ (the app)
- Commands are the npm scripts in `web/package.json` (`dev`, `lint`, `typecheck`, `test`, `build`);
  CI runs lint → typecheck → test → build (see `.github/workflows/web.yml`). Node 22.
- `npm run dev` serves on **port 3001** (not 3000 as the README says).
- The app sets `basePath: /shoot`, so routes live under `http://localhost:3001/shoot`
  (e.g. health check `http://localhost:3001/shoot/api/airtable`; `/` and `/api/airtable` return 404).
- Copy `web/.env.example` → `web/.env.local` before running. A non-empty `AIRTABLE_API_TOKEN` is
  enough for `lint`/`typecheck`/`test`/`build` and to boot the dev server.
- **Live data needs a real Airtable PAT.** All content pages (leaderboard, homework, tutorials,
  levels, achievements, shoutouts, articles, zoom-meetings) are server-rendered from the Airtable
  REST API. Without a valid `AIRTABLE_API_TOKEN` (with `data.records:read` on base
  `appn84sqPw03zEbTT`) these pages render a graceful "Could not load …" 401 error state — that is
  expected, not a bug. Only `/shoot` (home) and `/shoot/game-manual` render fully without a token.

### Python tooling (optional)
- `tools/airtable/` and `lambda/upload-asset/`: install with `pip install -r requirements.txt` in
  each dir. They need Airtable/AWS env vars to do real work; unit tests under each `tests/` dir run
  with `python -m unittest`.
