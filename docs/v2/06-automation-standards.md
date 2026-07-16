# 06 — Automation Standards

**Status:** **Active** — V2 rewrite pattern defined; **066 v3.2** is the current reference implementation (evolved from the original **v3.1** V2 rewrite).

**Last updated:** 2026-07-06 (permanent SCRIPT + CONFIG header standard — Phase 2B)

**Engineering authority:** [../ENGINEERING_CONSTITUTION.md](../ENGINEERING_CONSTITUTION.md)

---

## DEV-first rule (permanent)

**Nothing** is pasted into **Production** until tested successfully in **DEV**.

| Step | Where |
|------|--------|
| Design | ChatGPT (plan) |
| Write | Cursor → **GitHub** (reference version) |
| Validate | **DEV** base — test + audit |
| Ship | Mike approval → **Production** |

Full pipeline: [v2/04-ai-development-standards.md](./v2/04-ai-development-standards.md) § DEV-first delivery pipeline.

Every rewrite becomes the **GitHub reference version** before any Production paste.

---

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

**066 v3.2** scores **Critical** by line count alone — that is expected for domain-heavy scripts. Complexity score drives **priority and test rigor**, not “must merge to save slots.”

### How to use the score

1. Compute during Wave 2a per-automation review ([V2-014](../v2-014-automation-modernization-roadmap.md)).
2. Record score + tier in the roadmap inventory row.
3. Sort modernization queue by: **still needed?** → **understandable?** → **V2 standard?** → complexity tier → slot savings (lowest weight).

Slot recovery is a **secondary benefit** of reducing complexity — never merge solely to save a slot if readability suffers.

---

## Reference implementation

**Automation 066 v3.2** (`066-achievements-and-milestones-create-shot-milestone-unlocks.js`) is the **canonical template** for future V2 automation rewrites.

Path: [../../airtable/automations/shooting-challenge/066-achievements-and-milestones-create-shot-milestone-unlocks.js](../../airtable/automations/shooting-challenge/066-achievements-and-milestones-create-shot-milestone-unlocks.js)

Full standard: [../../airtable/automations/AUTOMATION_SCRIPT_STANDARD.md](../../airtable/automations/AUTOMATION_SCRIPT_STANDARD.md)

---

## Permanent automation header (SCRIPT + CONFIG)

**Status:** **Proposed standard** — mandatory for all **new** Category B rewrites and substantive edits. **066 v3.2** is the reference. **No mass migration of legacy scripts until their wave is approved.**

This is the **one permanent header** for V2 automations. Identity lives in **`SCRIPT`**; everything configurable lives in **`CONFIG`**.

### File layout (top to bottom)

| Order | Block | Paste into Airtable? |
|-------|--------|----------------------|
| 1 | GitHub-only header (`/* Automation: … */`) | **No** — skip lines 1–24 |
| 2 | Production docblock (`/********* … */`) | **Yes** — start paste here |
| 3 | `// @ts-nocheck` | Yes |
| 4 | `SECTION 1 — SCRIPT` (`const SCRIPT = { … }`) | Yes |
| 5 | `SECTION 2 — CONFIG` (`const CONFIG = { … }`) | Yes |
| 6 | Helpers + `async function main()` + run wrapper | Yes |

### `SCRIPT` — identity and version only

**Never** put table names, field names, status labels, or business thresholds in `SCRIPT`.

| Key | Required | Example (066) | Notes |
|-----|----------|---------------|-------|
| `scriptName` | Yes | `"066 - Achievements and Milestones - Create Shot Milestone Unlocks"` | Human-readable; matches Airtable automation title |
| `automationNumber` | Yes | `"066"` | Three-digit string; matches filename prefix |
| `version` | Yes | `"v3.2"` | Must match docblock `Version:` |
| `versionDate` | Yes | `"2026-07-05"` | Date this version was cut |
| `originalWrittenDate` | Yes | `"2026-06-17"` | Earliest write date — **preserve** |
| `lastUpdated` | Yes | `"2026-07-05"` | Today on logic edits |
| `folder` | Yes | `"06 - Achievements and Milestones"` | Airtable automation folder |
| `automationName` | Yes | Same as `scriptName` | Must match live automation name exactly |

**Proposed `SCRIPT` template:**

```javascript
const SCRIPT = {
  scriptName: "NNN - Domain - Short Description",
  automationNumber: "NNN",
  version: "vX.Y",
  versionDate: "YYYY-MM-DD",
  originalWrittenDate: "YYYY-MM-DD",
  lastUpdated: "YYYY-MM-DD",
  folder: "NN - Folder Name",
  automationName: "NNN - Domain - Short Description",
};
```

**066 gap:** `automationNumber` is not yet a separate key — add on next 066 touch or treat as migration item for all V2 rewrites.

### `CONFIG` — tables, fields, values, settings only

**Never** put `scriptName`, `version`, or dates in `CONFIG`.

| Key | Required | Purpose | 066 pattern |
|-----|----------|---------|-------------|
| `tables` | Yes | Logical key → Airtable table name | `enrollments: "Enrollments"` |
| `fields` | Yes* | Nested by table/domain — field display names | `enrollmentFields`, `unlockFields`, … |
| `values` | Yes* | Status labels, action strings, select options used in writes | `statuses`, `actions` |
| `settings` | When needed | Timezone, batch size, prefixes, feature flags | `timeZone`, `batchSize`, `sourceKeyPrefix` |

\*Use nested objects under `fields` / `values` — flat `CONFIG` keys are discouraged when a script touches multiple tables.

**Proposed `CONFIG` skeleton:**

```javascript
const CONFIG = {
  settings: {
    timeZone: "America/Denver",
    batchSize: 50,
  },
  tables: {
    enrollments: "Enrollments",
    submissions: "Submissions",
  },
  fields: {
    enrollmentFields: {
      active: "Active?",
      runCheck: "Run Shot Milestone Check?",
    },
    unlockFields: {
      milestoneSourceKey: "Milestone Source Key",
      week: "Week",
    },
  },
  values: {
    statuses: {
      success: "success",
      skipped: "skipped",
      error: "error",
      pending: "Pending",
    },
    actions: {
      created: "created",
      skippedExisting: "skipped_existing",
      error: "error",
    },
  },
};
```

### Docblock alignment

| Docblock field | Must match |
|----------------|------------|
| `Version:` | `SCRIPT.version` |
| `CONFIG.scriptName` (legacy) | Remove on V2 rewrites — use `SCRIPT` only |
| `CONFIG.version` (legacy) | Remove on V2 rewrites — use `SCRIPT` only |

Console JSON final log should include `automation`, `version` from `SCRIPT`.

### Version bumps

| Change | Bump |
|--------|------|
| SCRIPT/CONFIG split, batching, schema gates, behavior fix | **MINOR** (`v3.0` → `v3.1`) |
| Trigger change, new required output, breaking skip semantics | **MAJOR** (`v3.x` → `v4.0`) |

Record in docblock **VERSION HISTORY** and `CHANGELOG.md` when pasted to Production.

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
| Achievements | 059, **066 (v3.2 — V2 reference)** |
| Weekly email | 072, 074 |
| Homework XP | 064, 065 |
