# APP_CONTEXT  -  127 SI Shooting Challenge

## Identity

| Field | Value |
|-------|--------|
| App name | 127 SI Shooting Challenge |
| Local folder | `127-si-shooting-challenge` |
| GitHub | `Schmidt127/127-si-shooting-challenge` |
| Vercel project | `127-si-shooting-challenge` |
| Default branch | `master` |
| Vercel root directory | `web` |
| Public route | `/shoot` on https://hoopchallenges.com/shoot |
| `basePath` | `/shoot` (`NEXT_PUBLIC_BASE_PATH`) |

## Purpose

Competitive skill-development program: homework, leaderboards, levels, achievements, XP, streaks, and milestones. Backend is heavily Airtable-driven (automations, audits, backfills) plus a Next.js participant site.

## Theme

- Competitive skill development
- Shot arcs, court lines, progress, XP, levels, streaks, achievements, milestones
- **Primarily light theme**
- Blue / orange dominant (see `BRAND_STANDARDS.md`)
- Controlled accents only: deep navy, court tan, or muted gold
- **Do not use a full dark theme unless Mike explicitly approves it**

Keep shared brand consistent; do not borrow JR Ref stripes, TST dashboard chrome, or rankings table styling as the primary look.

## Critical business rules

- **Preserve** Airtable, XP, achievement, level, summary, and automation logic.
- XP idempotency: one source record → one XP Event (Source Key patterns in automation scripts).
- Web Airtable reads: server-side only (`lib/airtable/`); never expose `AIRTABLE_API_TOKEN` to the browser.
- DEV before Production for automations, schema, Make, and related changes.

## Repo layout (high level)

| Path | Purpose |
|------|---------|
| `web/` | Next.js app (Vercel root) |
| `airtable/` | Automations, schema, audits, backfills |
| `tools/` | CLI / schema tools |
| `docs/` | Engineering constitution, V2 pack, agent runs, deployment |
| `make/` | Make.com blueprints |

## Related docs

| Doc | Role |
|-----|------|
| `AGENTS.md` | Agent workflow (includes four-agent model) |
| `BRAND_STANDARDS.md` | Shared brand foundation |
| `docs/ENGINEERING_CONSTITUTION.md` | Highest-level engineering law |
| `docs/PROJECT_STATE.md` | Live snapshot |
| `docs/app-overview.md` | Short product overview |
| `docs/brand-system.md` / `web/docs/brand-guide.md` | Implementation notes (prefer `BRAND_STANDARDS.md` on shared conflicts) |
| Landing `APP_REPOSITORY_MAP.md` | Cross-repo map (in `hoopchallenges-landing`) |

## Not this repo

- Hoop landing (`hoopchallenges-landing`)
- JR Ref (`127-si-jr-ref`)
- Team Shot Tracker, Dribbling, Brackets, Rankings
