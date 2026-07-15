# Four-Agent Run Kit — Start Here

**Status:** Minimal controlled workflow  
**Control file:** [CONTROL.json](./CONTROL.json)  
**Authority:** [AGENTS.md](../../AGENTS.md) · [.cursor/rules/four-agent-workflow.mdc](../../.cursor/rules/four-agent-workflow.mdc)

## Purpose

Coordinate **four Cursor agents** on one package without overlapping writes, production access, or unapproved merges to `master`/`main`.

## Roles

| # | Role | Doc | Writes? | Merges? |
|---|------|-----|---------|---------|
| 1 | **Lead / Integrator** | [01-LEAD.md](./01-LEAD.md) | Integration branch + CONTROL + handoffs | Yes — worker branches only |
| 2 | **Implementation Worker** | [02-IMPLEMENTATION.md](./02-IMPLEMENTATION.md) | Exclusive paths in assignment | **No** |
| 3 | **Testing and Review Worker** | [03-TESTING.md](./03-TESTING.md) | Exclusive test/review paths | **No** |
| 4 | **Research and Documentation Worker** | [04-RESEARCH.md](./04-RESEARCH.md) | Docs/research artifacts only (if assigned) | **No** |

Launch prompts: [05-LAUNCH-PROMPTS.md](./05-LAUNCH-PROMPTS.md)

## Hard limits (all agents)

- **DEV only** — no Production Airtable, Make, Lambda, or live traffic changes
- **No live Airtable access** from agents unless Mike explicitly authorizes a named DEV check
- **No Airtable schema changes** (create/rename/delete fields, tables, views) unless Mike authorizes
- **No credential or secret changes**
- **No deployment** (Vercel, AWS, Make prod, Airtable prod paste)
- **No destructive Git** (`reset --hard`, `clean`, force push, branch delete)
- **Workers cannot merge** — only Lead integrates worker branches
- **Mike must approve** any merge to `master` / `main`

## Session start (every agent)

1. Read [CONTROL.json](./CONTROL.json).
2. Read your role doc.
3. Confirm branch and tip SHA with `git rev-parse --abbrev-ref HEAD` and `git rev-parse HEAD`.
4. Do not trust chat history over CONTROL + git state.

## Flow

```text
Mike / ChatGPT (brief + AC)
        ↓
Lead plans + writes assignments (exclusive paths)
        ├── Research (docs / inventory brief)
        ├── Implementation (feature slice)
        └── Testing (tests + review notes)
        ↓
Lead reviews diffs → merges workers → re-runs tests → updates CONTROL
        ↓
Mike approves merge to master/main (never automatic)
```

## Templates

- Assignment: [assignments/_TEMPLATE.md](./assignments/_TEMPLATE.md)
- Result: [results/_TEMPLATE.md](./results/_TEMPLATE.md)
- Lead handoff: [06-HANDOFF-TEMPLATE.md](./06-HANDOFF-TEMPLATE.md)
- Pilot checklist: [07-PILOT-CHECKLIST.md](./07-PILOT-CHECKLIST.md)

## Out of scope for this kit

This kit does **not** replace the historical overnight OS on `overnight/lead-integration`. It is a **minimal** four-agent control surface on the current line of development.
