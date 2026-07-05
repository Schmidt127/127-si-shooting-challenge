# ChatGPT Project Sources — Shooting Challenge V2

**Repo:** `127-si-shooting-challenge`  
**Purpose:** Import **all files in this folder** into your ChatGPT Project **Sources** so planning sessions start aligned with GitHub.

**Canonical source of truth:** GitHub (`docs/` and `docs/v2/`). This folder is a **synced export** for ChatGPT — not edited directly.

---

## How to import

1. In ChatGPT Project → **Sources** → add files or folder.
2. Select **every file** in `docs/chatgpt-sources/` (this folder).
3. After GitHub doc updates, re-run the sync script (below) and re-import changed files.

---

## Recommended read order

| Order | File | What it is |
|-------|------|------------|
| 1 | `01-constitution.md` | Configurable game engine + four layers |
| 2 | `02-master-direction.md` | Mission, vision, locked 2026–27 decisions |
| 3 | `03-business-rules.md` | **Engine contract** — platform behavior (not season numbers) |
| 4 | `12-ai-development-standards.md` | **AI workflow** — Mike / ChatGPT / Cursor, five phases, task classification |
| 5 | `04-season-configuration-design.md` | Season gate tuning guidance (Layer 2, DRAFT) |
| 6 | `05-config-vs-code.md` | What lives in Airtable vs scripts |
| 7 | `06-base-cutover.md` | Archive + clone base for new season |
| 8 | `07-project-state.md` | Live ops snapshot (bases, audits, deploy) |
| 9 | `08-xp-motivation-analysis-2025-26.md` | V1 season data (historical) |
| 10 | `09-agents.md` | Cursor agent conventions |
| 11 | `10-system-overview.md` | Modules and data flow |
| 12 | `11-level-gate-rules-config-template.csv` | Gate numbers worksheet (TBD) |
| 13–18 | `13`–`18` | V2 doc shells (standards — expand over time) |
| 18 | `18-close-out-considerations.md` | Open items and resolved decisions (C-014, etc.) |
| 19 | `19-asset-storage-migration.md` | AWS S3 + canonical URL architecture (C-013) |
| 20 | `20-testing-and-intake-architecture.md` | Fillout validation, Weeks, test sandbox, Test Intake (C-017–C-020) |
| 21 | `21-platform-config-improvements.md` | Grade bands + public display (C-021, C-022) |
| 22 | `22-v2-change-backlog.md` | **Owner change list** — all fixes/components, waves, dependencies (C-001–C-027) |
| **23** | **`23-master-plan-brief.md`** | **Consolidated planning brief** — all IDs, sub-system roadmaps, ChatGPT prompt (start here for master plan) |

---

## Four layers (quick reference)

| Layer | Changes | Where |
|-------|---------|--------|
| **Engine** | Never | `03-business-rules.md` |
| **Configuration** | Every season | Airtable + `04-season-configuration-design.md` + CSV |
| **Content** | Constantly | Homework, videos, emails in base |
| **Presentation** | Generated | Game manual, website, guides |

---

## Workflow: ChatGPT + Cursor + GitHub

1. **ChatGPT** — Draft or review docs (season design, parent copy, gate tuning).
2. **Cursor** — Apply changes to `docs/v2/` and related paths; run audits/code when needed.
3. **GitHub** — Commit; source of truth.
4. **This folder** — Run sync script → re-import into ChatGPT Sources.

### Refresh this folder after doc commits

From repo root (PowerShell):

```powershell
.\tools\docs\sync-chatgpt-sources.ps1
```

---

## What is NOT in this pack

- Automation script source (`.js` in `airtable/automations/`) — use Cursor for code.
- `CHANGELOG.md` — production history only.
- Regenerable previews (`tools/airtable/_preview/`).

---

*Last synced: 2026-07-05 17:54 (local)*
