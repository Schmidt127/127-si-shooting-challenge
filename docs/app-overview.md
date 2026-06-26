# App overview — Shooting Challenge

## What this is

The **127 Sports Intensity Shooting Challenge** participant website — leaderboard, homework, tutorials, levels, achievements, and related catalog pages.

## Airtable base

**127 SI Shooting Challenge** — see [airtable-base-map.md](./airtable-base-map.md)

## Public path

`https://www.hoopchallenges.com/shoot` (`basePath` `/shoot`)

## This repo is not

- The Hoop Challenges landing page → `hoopchallenges-landing`
- JR REF, Brackets, Dribble, or Rankings → separate repos

## Return to landing

App header **Home** uses `NEXT_PUBLIC_LANDING_URL` → www.hoopchallenges.com

## Key paths in repo

| Path | Purpose |
|------|---------|
| `web/` | Next.js app (Vercel root) |
| `airtable/automations/shooting-challenge/` | Production automation scripts |
| `airtable/schema/` | Schema snapshots and field maps |
| `tools/airtable/` | Schema export CLI |
| `docs/automation-index.md` | Automation catalog |
| `make/` | Make.com blueprints |
