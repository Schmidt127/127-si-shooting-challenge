# 06 — Automation Standards

**Status:** **Active** — V2 rewrite pattern defined; **066 v3.1** is the reference implementation.

**Last updated:** 2026-07-05 (Automation Complexity Score added)

---

## Automation Complexity Score

Every production automation gets a **Complexity Score** during Phase 2 inventory (see [V2-014](../v2-014-automation-modernization-roadmap.md)). Use the score to answer: *Which automation should we modernize next?*

### Scoring factors

| Factor | Points |
|--------|-------:|
| Each table touched (read or write) | 1 |
| Each table written to | 2 |
| External API call (Make webhook, fetch, etc.) | 3 |
| Creates records | 2 |
| Deletes records | 3 |
| Script length > 300 lines | 2 |
| Script length > 700 lines | 4 |

Count each factor once per script (not per occurrence). Line count from GitHub file at inventory time.

### Complexity tiers

| Tier | Score | Guidance |
|------|------:|----------|
| **Simple** | 0–6 | Category A candidate — leave alone unless V2 format missing |
| **Medium** | 7–14 | Rewrite when touched; low modernization urgency |
| **Complex** | 15–22 | Plan V2 rewrite carefully; audit before deploy |
| **Critical** | 23+ | Modernize only in approved wave; full audit + sandbox test required |

**066 v3.1** scores **Critical** by line count alone — that is expected for domain-heavy scripts. Complexity score drives **priority and test rigor**, not “must merge to save slots.”

### How to use the score

1. Compute during Wave 2a per-automation review ([V2-014](../v2-014-automation-modernization-roadmap.md)).
2. Record score + tier in the roadmap inventory row.
3. Sort modernization queue by: **still needed?** → **understandable?** → **V2 standard?** → complexity tier → slot savings (lowest weight).

Slot recovery is a **secondary benefit** of reducing complexity — never merge solely to save a slot if readability suffers.

---

## Reference implementation

**Automation 066 v3.1** (`066-achievements-and-milestones-create-shot-milestone-unlocks.js`) is the **canonical template** for future V2 automation rewrites.

Path: [../../airtable/automations/shooting-challenge/066-achievements-and-milestones-create-shot-milestone-unlocks.js](../../airtable/automations/shooting-challenge/066-achievements-and-milestones-create-shot-milestone-unlocks.js)

Full standard: [../../airtable/automations/AUTOMATION_SCRIPT_STANDARD.md](../../airtable/automations/AUTOMATION_SCRIPT_STANDARD.md)

---

## V2 rewrite structure (follow 066)

| # | Block | Purpose |
|---|--------|---------|
| — | GitHub header | GitHub only — skip when pasting into Airtable |
| — | Production docblock | Version, version history, PURPOSE, triggers, outputs, design rules |
| 1 | **`SCRIPT`** metadata | `scriptName`, `version`, `versionDate`, `originalWrittenDate`, `lastUpdated`, `folder`, `automationName` |
| 2 | **`CONFIG`** | Tables, fields, statuses, actions, business keys only — **no** script identity |
| 3 | Output helpers | `setOutputSafe`, `setSkippedOutputs`, `statusOut` / `actionOut` / `errorOut` |
| 4 | Schema helpers | `requireField`, `isWritableField`, `validateRequiredSchema` |
| 5 | Data helpers | Reads, links, grade band, dates |
| 6+ | Domain helpers | e.g. Week resolution, batch writes |
| — | **`async function main()`** | Numbered `debugStep`; all runtime logic |
| — | Run wrapper | `try { await main(); } catch` with safe outputs |

**Required behaviors:**

- Safe output variables (`setOutputSafe`)
- Idempotency safeguards (Source Key / dedupe before create)
- No computed-field writes (formula, rollup, lookup)
- Config-over-code — thresholds and labels from Airtable config tables where possible
- GitHub first → paste docblock into Airtable → `CHANGELOG.md` for production

---

## Rewrite rule (no isolated patches)

When rewriting an automation:

| Scope of change | Required approach |
|-----------------|-------------------|
| One section needs changes | **Rewrite the full section** |
| Multiple sections need changes | **Rewrite the full script** |
| Emergency hotfix only | Isolated line patch — **only when Mike explicitly requests** |

Do not deliver partial line-change patches for planned V2 upgrades.

---

## Principles (all automations)

- Wrap in `async function main()` for new/substantive scripts.
- **`SCRIPT.version`** must match docblock Version; bump minor on behavior/metadata structure changes.
- Required outputs: `statusOut`, `errorOut`, `debugStep`; use `setOutputSafe`.
- Idempotent: safe retries; one XP source → one XP event.
- Read game rules from **config tables** where possible ([config vs code](../shooting-challenge-v2-config-vs-code.md)).

---

## Canonical sources

| Doc | Content |
|-----|---------|
| [../../airtable/automations/AUTOMATION_SCRIPT_STANDARD.md](../../airtable/automations/AUTOMATION_SCRIPT_STANDARD.md) | **Full automation script standard** |
| [../../.cursor/rules/airtable-automation-scripts.mdc](../../.cursor/rules/airtable-automation-scripts.mdc) | Cursor rule summary |
| [../automation-index.md](../automation-index.md) | All production automations (001–114) |
| [../v2-014-automation-modernization-roadmap.md](../v2-014-automation-modernization-roadmap.md) | Phase 2 inventory, categories, complexity scores |
| [../../airtable/schema/current/automation-trigger-map.md](../../airtable/schema/current/automation-trigger-map.md) | Trigger map |

---

## Key automations (reference)

| Area | Scripts |
|------|---------|
| Submission XP | 010 |
| Levels / gates | 041, 042 |
| Streaks | 053, 054 |
| Achievements | 059, **066 (v3.1 — V2 reference)** |
| Weekly email | 072, 074 |
| Homework XP | 064, 065 |
