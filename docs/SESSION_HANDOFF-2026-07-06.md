# Session handoff — V2 Shooting Challenge (2026-07-06)

**Use this after starting a fresh Cursor chat.** Then read [PROJECT_STATE.md](./PROJECT_STATE.md) and [v2/README.md](./v2/README.md).

---

## Bases (permanent model)

| Environment | Base ID | Name |
|-------------|---------|------|
| **Production** | `appn84sqPw03zEbTT` | `127SI - SHOOTING CHALLENGE GAME - NEW 5_1_2026` |
| **Development** | `appTetnuCZlCZdTCT` | `127SI - SHOOTING CHALLENGE - DEV` |

**Rule:** DEV first → audit → Mike approval → Production paste → `CHANGELOG.md`. **Never Production last.**

---

## Schema snapshots (fresh 2026-07-06)

| Base | Folder | Tables | Views | Notes |
|------|--------|--------|-------|-------|
| **DEV** | `airtable/schema/snapshots/dev-20260706/` | **30** | **120** | Includes **Testing Scenarios** (C-020) — not in prod |
| **Production** | `airtable/schema/snapshots/prod-20260706/` | **29** | **118** | No Testing Scenarios table |

Human-readable: `schema_doc_*.md` in each folder. Manifest: `manifest_*_latest.json`.

---

## Current blockers (do not skip)

| Item | Status | Next action |
|------|--------|-------------|
| **H-002 — 066 v3.1 DEV test** | **Pending** | OMNI confirms Schmidt submission completed intake pipeline + expected milestone behavior. DEV intake automations are **ON** (Mike 2026-07-05). **Do not** trigger `Run Shot Milestone Check?` until confirmed. |
| **C-020 script** | **Paused** | No script until sequencing approved. Testing Scenarios table exists on DEV only. |
| **Production** | **No changes** | No 066 paste, no C-020 mirror, no test triggers on prod. |
| **112 / 043** | **Approved, not executed** | Delete **112**, retire **043** at next approved prod maintenance window. |

Checklists:

- [066-v3.1-dev-deploy.md](./deploy-checklists/066-v3.1-dev-deploy.md)
- [C-020-testing-scenarios-script-checklist.md](./deploy-checklists/C-020-testing-scenarios-script-checklist.md)

---

## Phase 2 — what’s done vs not

| Done | Not started |
|------|-------------|
| Wave 0 close-out | Automation rewrites / merges (006+021, etc.) |
| V2-014 Wave 2A **planning** (46-script classification) | Wave 2B+ implementation |
| V2-015 DEV base live (6 test enrollments) | V2-015 `done` (blocked on 066 DEV pass) |
| 066 v3.1 in **GitHub**; 066 **ON** in DEV | 066 **prod** paste |
| C-020 **Testing Scenarios** schema on DEV | C-020 script |
| Doc 04 promote workflow | EMC, Lambda/C-013, gameplay tuning |

Master docs: [v2-014-automation-modernization-roadmap.md](./v2-014-automation-modernization-roadmap.md) · [v2-015-development-base-architecture.md](./v2-015-development-base-architecture.md)

---

## V2 refactor entry points

| Task | Start here |
|------|------------|
| Automation rewrite | [v2/06-automation-standards.md](./v2/06-automation-standards.md) — **066 v3.1** template |
| DEV deploy | [development-base-setup.md](./development-base-setup.md) |
| Promotion | [v2/04-ai-development-standards.md](./v2/04-ai-development-standards.md) § Official promotion documentation |
| Backlog | [v2-change-backlog.md](./v2-change-backlog.md) |
| Script index | [automation-index.md](./automation-index.md) |
| Testing framework | [testing-and-intake-architecture.md](./testing-and-intake-architecture.md) § C-020 |

---

## Discovery to remember (066 / intake)

After DEV clone, **intake automations were OFF** — Mike turned them **ON**. A manual Schmidt submission created while automations were off may not have run **023 → 005 → 009 → 010 → 031**. Re-verify in Testing views before blaming row shape.

---

## Git / ChatGPT

- Re-import `docs/chatgpt-sources/` in ChatGPT after doc commits.
- Sync: `.\tools\docs\sync-chatgpt-sources.ps1`

---

## Suggested next session order

1. OMNI pipeline confirm for Schmidt submission (or create new submission with automations ON).
2. Run **066** sandbox per checklist → 090F audit on DEV.
3. Mike decides **066 prod promote** (promotion doc first).
4. Sequencing decision: **C-020** script vs other Wave 2B work.
5. Approved maintenance: **112** delete, **043** retire.
