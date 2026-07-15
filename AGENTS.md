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

The only locally runnable service is the Next.js app in `web/` (npm). Everything else in this repo (Airtable automations/extension scripts, `make/` blueprints, `lambda/`, `tools/airtable/` Python CLIs) runs on external platforms or is ad-hoc tooling — there is no local database; all data lives in Airtable (external SaaS).

- Run the app from `web/`; commands are in `web/package.json`: `npm run dev` (dev server), `npm run lint`, `npm run typecheck`, `npm test` (vitest), `npm run build`.
- The dev server listens on **port 3001** (`next dev -p 3001`), not 3000 as the `web/README.md` prose says — trust the script.
- The app uses a **`/shoot` base path**. All routes are prefixed: home is `/shoot`, health check is `/shoot/api/airtable`. Requests to `/` return 404 — this is expected, not a bug.
- Data is read from Airtable server-side. Without `AIRTABLE_API_TOKEN` and `AIRTABLE_BASE_ID` (set in `web/.env.local`; see `web/.env.example`), the app still boots and the home page renders fully, but data-driven pages (leaderboard, levels, tutorials, etc.) show graceful fallback cards ("Could not load…"). Use the DEV base `appTetnuCZlCZdTCT` for local UI work; never expose the token to the browser.
- Optional: `tools/airtable/` Python CLIs need `pip install -r tools/airtable/requirements.txt` and their own `tools/airtable/.env`.
