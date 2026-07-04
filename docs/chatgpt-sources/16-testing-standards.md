# 08 — Testing Standards

**Status:** Shell — links to audit and backfill practices (integrity over unit tests).

## Philosophy

**Trust is everything.** Data integrity checks (extension audits + Python tools) are the primary “tests” for this system. Safe backfills require dry-run before any write.

## Audit-first workflow

1. Run **audit** extension script (dry-run) → JSON with counts and sample record IDs.
2. Fix via **safe-backfill** with `DRY_RUN=true`, then `CONFIRM_WRITE=true` in batches.
3. Re-run audit until clean.
4. Run **field coverage** / legacy cleanup when appropriate.

## Canonical sources

| Doc | Content |
|-----|---------|
| [../../airtable/extension-scripts/audits/README.md](../../airtable/extension-scripts/audits/README.md) | **Pipeline audits Stages A–J + 090** |
| [../../airtable/extension-scripts/safe-backfills/README.md](../../airtable/extension-scripts/safe-backfills/README.md) | Backfill run order |
| [../airtable/stage-j-legacy-cleanup.md](../airtable/stage-j-legacy-cleanup.md) | Stage J field cleanup |
| [../post-close-hygiene-2025-26.md](../post-close-hygiene-2025-26.md) | 2025–26 hygiene backlog |
| [../../tools/airtable/README.md](../../tools/airtable/README.md) | Python schema export and close-out tools |
| [../../.github/workflows/web.yml](../../.github/workflows/web.yml) | Web CI (lint, typecheck, test) |

## Pre-season checklist (2026–27)

- Stages A–J on **clone** base with test enrollments.
- Final 090A–090G adapted for new season.
- Schema export to `airtable/schema/snapshots/`.

## Full standalone doc

_To be expanded: required audits before launch, test enrollment pattern, Make webhook smoke tests._
