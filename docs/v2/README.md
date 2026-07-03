# Shooting Challenge v2 — Documentation pack

**Status:** Numbered pack. **03 Business Rules** is the first full standalone doc; others are thin shells until expanded.

**Source of truth:** GitHub. Re-upload `docs/v2/*.md` to ChatGPT Project Sources after meaningful commits.

## Read order

| # | File | Status |
|---|------|--------|
| 01 | [01-constitution.md](./01-constitution.md) | Shell — links to master direction |
| 02 | [02-master-direction.md](./02-master-direction.md) | Shell — links to master direction |
| 03 | [03-business-rules.md](./03-business-rules.md) | **Draft** — full doc; **§8.3 gate spread under review** |
| — | [level-gate-rules-config-template.csv](./level-gate-rules-config-template.csv) | **DRAFT** — gate numbers worksheet (after §8.3 approval) |
| 04 | [04-ai-development-standards.md](./04-ai-development-standards.md) | Shell |
| 05 | [05-system-architecture.md](./05-system-architecture.md) | Shell |
| 06 | [06-automation-standards.md](./06-automation-standards.md) | Shell |
| 07 | [07-ui-standards.md](./07-ui-standards.md) | Shell |
| 08 | [08-testing-standards.md](./08-testing-standards.md) | Shell |
| 09 | [09-release-notes.md](./09-release-notes.md) | Shell — points to CHANGELOG |

## Also read (not renumbered)

| Doc | Purpose |
|-----|---------|
| [../PROJECT_STATE.md](../PROJECT_STATE.md) | Live ops snapshot |
| [../../CHANGELOG.md](../../CHANGELOG.md) | Production release history |
| [../../AGENTS.md](../../AGENTS.md) | AI assistant instructions |
| [../README.md](../README.md) | Full documentation index |

## Workflow: ChatGPT + Cursor

1. **ChatGPT** — Draft or expand numbered docs (03 done; 04+ next).
2. **GitHub** — Save markdown in this folder; commit.
3. **ChatGPT Project Sources** — Re-upload updated `docs/v2/` files.
4. **Cursor** — Apply repo changes, code, audits when credits allow.

Existing long-form docs under `docs/` are **not renamed or removed** until each v2 file is fully written.
