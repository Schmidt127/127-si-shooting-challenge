# Engineering Constitution — 127 SI Shooting Challenge

**Status:** **Active** — highest-level engineering authority for this repository.  
**Last updated:** 2026-07-06 (Phase 2B)  
**Scope:** How we build, test, document, and ship — not game rules (see [v2/01-constitution.md](./v2/01-constitution.md)).

---

## Read order for engineers

| # | Document | Role |
|---|----------|------|
| 0 | [SESSION_HANDOFF-2026-07-06.md](./SESSION_HANDOFF-2026-07-06.md) | Latest session snapshot |
| 1 | **This document** | Engineering law |
| 2 | [PROJECT_STATE.md](./PROJECT_STATE.md) | Live bases, blockers, deploy paths |
| 3 | [v2/04-ai-development-standards.md](./v2/04-ai-development-standards.md) | Mike / ChatGPT / Cursor / OMNI workflow |
| 4 | [v2-change-backlog.md](./v2-change-backlog.md) | Approved change IDs |

---

## 1. GitHub is the source of truth

| Layer | Source of truth | Deployed copy |
|-------|-----------------|---------------|
| Automations `001`–`114` | `airtable/automations/shooting-challenge/` | Airtable (DEV then Production) |
| Audit / backfill extensions | `airtable/extension-scripts/` | Airtable Scripting extension (paste) |
| Schema documentation | `airtable/schema/snapshots/` + `airtable/schema/current/` | Airtable (live schema) |
| Web app | `web/` | Vercel (`/shoot`) |
| Ops docs | `docs/` | — |
| Make | `make/blueprints/` + `make/documentation/` | Make.com |

**Rules:**

- Edit GitHub first. Paste into Airtable only after review (skip GitHub-only header when pasting automations).
- Airtable is the **running** copy, not the **authoritative** copy.
- OMNI may prototype in-base; production automations and Engine behavior still flow through GitHub → paste → `CHANGELOG.md`.
- Never commit secrets (`.env`, PATs, webhook URLs with tokens).

---

## 2. DEV first

**Permanent model:** one repo · one **Production** base · one **Development** base.

| Base | ID | Role |
|------|-----|------|
| **Production** | `appn84sqPw03zEbTT` | Live season — system of record |
| **Development** | `appTetnuCZlCZdTCT` | Paste test, schema experiments, audits, C-020 |

**Rule:** Nothing ships to **Production** until it passes in **DEV** (or documented exception with Mike approval).

Structural changes promote incrementally — **DEV first. Production soon after approval. Not Production last.**

Full architecture: [v2-015-development-base-architecture.md](./v2-015-development-base-architecture.md)  
Ops runbook: [development-base-setup.md](./development-base-setup.md)

**After DEV clone:** verify intake automations are **ON** before pipeline tests (see [066 dev checklist](./deploy-checklists/066-v3.1-dev-deploy.md) § Discovery).

---

## 3. Promotion process

Official promotion is **not complete** until documented in GitHub.

| Step | Owner | Artifact |
|------|-------|----------|
| 1. Implement in GitHub | Cursor | Commit on `master` |
| 2. Paste / apply in **DEV** | Mike / Cursor | DEV base |
| 3. Audit + sandbox test | Mike / Cursor | Dry-run extension; test enrollment |
| 4. **Promotion doc** | Cursor | `docs/deploy-checklists/` or wave doc |
| 5. Mike approves | Mike | — |
| 6. Paste / apply in **Production** | Mike | Same script as DEV |
| 7. Post-deploy audit | Mike / Cursor | Dry-run on prod |
| 8. `CHANGELOG.md` | Cursor | `### Airtable` / `### Web` / `### Make` |

Template: [deploy-checklists/_PROMOTION-STEPS-TEMPLATE.md](./deploy-checklists/_PROMOTION-STEPS-TEMPLATE.md)  
Authority: [v2/04-ai-development-standards.md](./v2/04-ai-development-standards.md) § Official promotion documentation

---

## 4. Documentation standards

| Type | Where | When to update |
|------|-------|----------------|
| Live snapshot | `PROJECT_STATE.md` | Major deploy, audit pass, architecture change |
| Change requests | `v2-change-backlog.md` | Every new C-/V2-/H- ID |
| Automation index | `automation-index.md` | Trigger or name change |
| Promotion | `docs/deploy-checklists/` | Before prod paste |
| Schema | `airtable/schema/snapshots/` | After structural base change |
| ChatGPT mirror | `docs/chatgpt-sources/` | After doc commits — `.\tools\docs\sync-chatgpt-sources.ps1` |

**Principles:**

- Docs are part of the deliverable, not an afterthought.
- Cross-link; do not duplicate long content — link to the canonical file.
- Status lines must reflect **blocked / pending / done** accurately.

Index: [README.md](./README.md)

---

## 5. Automation standards

| Topic | Document |
|-------|----------|
| V2 rewrite structure | [v2/06-automation-standards.md](./v2/06-automation-standards.md) |
| **Permanent SCRIPT + CONFIG header** | [v2/06-automation-standards.md](./v2/06-automation-standards.md) § Permanent automation header |
| Full script contract | [airtable/automations/AUTOMATION_SCRIPT_STANDARD.md](../airtable/automations/AUTOMATION_SCRIPT_STANDARD.md) |
| Reference implementation | **066 v3.2** — [066 script](../airtable/automations/shooting-challenge/066-achievements-and-milestones-create-shot-milestone-unlocks.js) |
| Modernization inventory | [v2-014-automation-modernization-roadmap.md](./v2-014-automation-modernization-roadmap.md) |
| Cursor rule | `.cursor/rules/airtable-automation-scripts.mdc` |

**Rewrite rule:** When touching an automation substantively, rewrite to V2 standard — no isolated patches that increase drift.

---

## 6. Testing standards

| Topic | Document |
|-------|----------|
| Audit-first philosophy | [v2/08-testing-standards.md](./v2/08-testing-standards.md) |
| **Fix the audit, not the data** | [v2/08-testing-standards.md](./v2/08-testing-standards.md) |
| Pipeline audits | [airtable/extension-scripts/audits/README.md](../airtable/extension-scripts/audits/README.md) |
| Safe backfills | `CONFIRM_WRITE` / dry-run — [safe-backfills README](../airtable/extension-scripts/safe-backfills/README.md) |
| Engineering Test Framework (C-020) | [testing-and-intake-architecture.md](./testing-and-intake-architecture.md) |

**No test metadata on pipeline tables.** Framework fields live on **Testing Scenarios** only (DEV).

---

## 7. Golden Test Dataset philosophy

A **golden test dataset** is a small, known set of DEV enrollments and scenarios used to prove the pipeline — not production data and not ad-hoc manual rows.

| Principle | Detail |
|-----------|--------|
| **Fixed test identities** | Schmidt/testing enrollment + **5** retained DEV test enrollments ([V2-015](./v2-015-development-base-architecture.md)) |
| **Production-shaped pipeline rows** | Submissions must look like **Fillout** output — intake chain **023 → 005 → 009 → 010 → 031** must run |
| **Manual rows are not enough** | Typing into Submissions without intake is invalid for milestone/upload/HW tests |
| **C-020 creates golden scenarios** | **Testing Scenarios** table drives Fillout-shaped Submissions on demand |
| **Testing views** | Filter pipeline tables by **Enrollment link** — not test flags on pipeline rows |
| **Inactive enrollments** | `Active?` false for standings only; pipeline still runs; **056 / 066 / 101** may skip — document in test notes |
| **No config-table pollution** | Test rows in registrant/pipeline tables only — not Milestones, Levels, XP Rules, Weeks |

Enrollment IDs: document under **C-019** when OMNI exports them.

---

## 8. ChatGPT / Cursor / OMNI responsibilities

| Role | Owns | Does not |
|------|------|----------|
| **Mike** | Product decisions, approvals, Airtable paste, OMNI in-base work | — |
| **ChatGPT** | Architecture, planning, requirements, review, doc drafts | Repo edits, unapproved schema changes |
| **Cursor** | GitHub implementation, audits, commits, promotion docs | Unapproved architecture; Production paste without DEV pass |
| **OMNI** | In-base exploration, views, formulas, table shells, live automation audit | Production script source of truth; bypass GitHub for `001`–`114` |

**Tool priority for Airtable work:** OMNI first when sufficient → else GitHub/Cursor.

Full workflow: [v2/04-ai-development-standards.md](./v2/04-ai-development-standards.md)

---

## 9. Rewrite philosophy (Phase 2)

Phase 2 goal: **reduce platform complexity first**; automation capacity recovery is **secondary**.

| Axis | Weight |
|------|--------|
| Is it still needed? | **High** |
| Is it understandable? | **High** |
| Does it follow V2 standard? | **High** |
| Does merge save a slot? | **Medium** |

**Do not merge** solely to save slots if readability suffers.  
**Do not rewrite** outside an approved wave.  
**One reference template:** **066 v3.2** — all Category B rewrites converge on this structure.

Roadmap: [v2-014-automation-modernization-roadmap.md](./v2-014-automation-modernization-roadmap.md)  
Phase 2B review: [phase-2b-engineering-review-2026-07-06.md](./phase-2b-engineering-review-2026-07-06.md)

---

## 10. Versioning standard

### Automations (GitHub + Airtable docblock)

| Element | Format | Example |
|---------|--------|---------|
| Version | `vMAJOR.MINOR` | `v3.1` |
| Version date | `YYYY-MM-DD` | `2026-07-05` |
| Original written | `YYYY-MM-DD` | preserve earliest |
| Last updated | `YYYY-MM-DD` | today on logic edits |
| `SCRIPT.version` | Must match docblock | — |
| `CHANGELOG.md` | Production-impacting edits | `### Airtable` |

Semantic intent:

- **MAJOR** — trigger change, breaking behavior, new required outputs
- **MINOR** — logic fix, refactor to V2 structure, batching, schema gates

### Documentation

- `Last updated:` on active docs when substance changes
- Backlog IDs (`C-`, `V2-`, `H-`) never reused

### Schema snapshots

- Folder: `dev-YYYYMMDD` / `prod-YYYYMMDD`
- Commit manifests with snapshot

---

## 11. Engineering priorities (ordered)

When trade-offs conflict, decide in this order:

| Priority | Name | Meaning |
|----------|------|---------|
| **1** | **Reliability** | Correct data, idempotent XP, audits pass, failures are loud |
| **2** | **Understandability** | Next engineer can read the script and docblock |
| **3** | **Consistency** | V2 standard, CONFIG-over-code, same patterns everywhere |
| **4** | **Capacity** | Merge/retire when clarity allows — ~50 automation cap |
| **5** | **New features** | Phase 3+ — blocked until Phase 2 platform is stable |

---

## 12. Hard constraints (never without Mike approval)

- Paste to **Production** before DEV pass + promotion doc
- Write to Production base for experiments
- Add test flags to pipeline tables (`Is Test Record?`, `Test Status` on Submissions, etc.)
- Delete production data in audits without dry-run proof
- Force-push `master`
- Skip `CHANGELOG.md` for production-impacting changes

---

## Related documents

| Doc | Link |
|-----|------|
| Game constitution (product) | [v2/01-constitution.md](./v2/01-constitution.md) |
| Business rules (engine) | [v2/03-business-rules.md](./v2/03-business-rules.md) |
| AI workflow | [v2/04-ai-development-standards.md](./v2/04-ai-development-standards.md) |
| Automation modernization | [v2-014-automation-modernization-roadmap.md](./v2-014-automation-modernization-roadmap.md) |
| DEV base | [v2-015-development-base-architecture.md](./v2-015-development-base-architecture.md) |
| Agent startup | [AGENTS.md](../AGENTS.md) |

---

## Revision log

| Date | Notes |
|------|-------|
| 2026-07-06 | Phase 2B — initial Engineering Constitution |
