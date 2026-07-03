# 09 — Release Notes

**Status:** Shell — release history lives in the root changelog.

## Canonical source

**[../../CHANGELOG.md](../../CHANGELOG.md)** — all production-impacting changes.

Sections: `### Airtable` · `### Web` · `### Make`

## When to update CHANGELOG

- Production automation deployed to Airtable
- Schema or field changes affecting scripts
- Web deploy with user-visible behavior
- Make blueprint or scenario changes
- Meaningful audit/backfill passes (note in CHANGELOG + PROJECT_STATE)

## Related ops docs

| Doc | Purpose |
|-----|---------|
| [../PROJECT_STATE.md](../PROJECT_STATE.md) | Live snapshot after deploys |
| [../deployment-notes.md](../deployment-notes.md) | Vercel and env vars |
| [../../web/docs/deployment-notes.md](../../web/docs/deployment-notes.md) | Web deploy details |

## Git tags (season milestones)

| Tag (planned) | Meaning |
|---------------|---------|
| `season-2025-26-final` | Archive season code/docs after close-out |
| _(future)_ | 2026–27 base cutover, launch |

See [../shooting-challenge-v2-base-cutover.md](../shooting-challenge-v2-base-cutover.md).

## Full standalone doc

_To be expanded: release cadence, who approves Airtable paste, ChatGPT upload checklist after release._
