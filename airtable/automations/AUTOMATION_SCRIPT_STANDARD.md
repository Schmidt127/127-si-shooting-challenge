# Airtable Automation Script Standard

**127 SI Shooting Challenge** — required format for every script in `airtable/automations/shooting-challenge/`.

GitHub is the source of truth. Airtable is the deployed copy.

Enforced by `.cursor/rules/airtable-automation-scripts.mdc`.

---

## File layout (top to bottom)

1. **GitHub header** (GitHub only — skip when pasting into Airtable)
2. **Production docblock** (`/** ... */`)
3. `// @ts-nocheck`
4. **SECTION 1: CONFIG** (and helpers)
5. **`async function main()`** — all runtime logic
6. **Run wrapper** — `try { await main(); } catch ...` or `await main();`

---

## GitHub header template

```js
/*
Automation: ### - [Exact Automation Name]
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: Production Copy
Last Synced From Airtable: YYYY-MM-DD

Purpose:
[One-line summary]

Trigger:
[Trigger table and conditions summary]

Important Tables:
[Comma-separated table names]

Important Fields:
[Key fields touched]

Notes:
GitHub is the source-of-truth copy.
Airtable is the deployed/running copy.
*/
```

Update `Last Synced From Airtable` when deploying a production copy to GitHub.

---

## Production docblock template

Match the style of automations **114** (XP) and **034** (weekly summary).

```js
/************************************************************
 * ### - [FOLDER NAME]
 * [Short Title]
 *
 * Version: v1.0
 * Date Written: YYYY-MM-DD
 * Last Updated: YYYY-MM-DD
 *
 * PURPOSE
 * - [What triggers this script and what it does]
 *
 * IMPORTANT DESIGN RULES
 * - [Idempotency, read-only fields, dedupe keys, etc.]
 *
 * FOLDER
 * - [## - Category Name]
 *
 * AUTOMATION NAME
 * - ### - [Exact Airtable automation name]
 *
 * TRIGGER TABLE
 * - [Table name]
 *
 * RECOMMENDED TRIGGER CONDITIONS
 * - [Condition bullets]
 *
 * OPTIONAL TRIGGER CONDITIONS
 * - [Condition bullets]
 *
 * DO NOT USE THIS TRIGGER CONDITION
 * - [Anti-patterns, if any]
 *
 * REQUIRED INPUT VARIABLES
 * - recordId = [description]
 * - [other inputs]
 *
 * OUTPUTS (automation script action outputs)
 * - statusOut = success | skipped | error
 * - actionOut = [created | updated | skipped_* | error]
 * - errorOut = [message or empty]
 * - debugStep = [last step reached]
 * - [other output.set keys and meanings]
 *
 * PRIMARY TABLES USED
 * - [Table list]
 *
 * OUTPUT / WRITEBACK FIELDS
 * - [Table → Field = source]
 *
 * IMPORTANT NOTES
 * - This is not [related automation X].
 * - [Scope boundaries]
 *
 * FIELD RENAME FIX (when applicable)
 * - Old field: [name]
 * - New field: [name]
 ************************************************************/
```

### Metadata rules

| Field | Rule |
|-------|------|
| **Version** | `vMAJOR.MINOR` in docblock and `CONFIG.version`. Bump **minor** for logic/behavior changes. |
| **Date Written** | Earliest known date the script was first written. **Preserve on edits.** Only fix if the date was wrong. |
| **Last Updated** | Set to **today** whenever script logic changes. |

### Docblock extras (encouraged)

- **FOLDER** and **AUTOMATION NAME** — exact Airtable automation name
- **RECOMMENDED / OPTIONAL / DO NOT USE** trigger conditions
- **“This is not…”** — what the automation is *not* responsible for (063, 111)
- **FIELD RENAME FIX** — when production renamed fields (114)
- **PRIMARY TABLES USED** / **OUTPUT / WRITEBACK FIELDS**

---

## Code structure

### 1. Wrap everything in `main`

**Preferred (114-style)** — top-level error handler:

```js
async function main() {
  // all logic here
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  setOutputSafe("statusOut", "error");
  setOutputSafe("errorOut", message);
  throw error;
}
```

**Acceptable (034-style)** — errors handled inside `main`:

```js
async function main() {
  try {
    // logic
  } catch (error) {
    // set outputs, rethrow
    throw error;
  }
}

await main();
```

**Legacy:** Scripts without `main` (009, 013, 020, 021, 057, 058, 063, 072, 074, 075, 111, 112) may stay as-is until edited for other reasons. **All new scripts and substantive edits** must use `main`.

### 2. CONFIG object

```js
const CONFIG = {
  scriptName: "### - [Exact Name]",
  version: "v1.0",

  tables: { /* ... */ },
  /* field name maps, status values */
  timeZone: "America/Denver", /* when touching Weeks / activity dates */
  debug: { logToConsole: true },
};
```

- Exact Airtable field names only (match schema snapshot / `field_index`).
- Status single-select values in `CONFIG.values`, `CONFIG.statusValues`, or `CONFIG.statuses`.
- No magic strings for field names in runtime logic.

### 3. Numbered sections

Scripts over ~150 lines should use labeled sections:

```js
/* =========================================================
   SECTION 1: EASY-EDIT CONFIG
========================================================= */

/* =========================================================
   SECTION 4: HELPER FUNCTIONS
========================================================= */

/* =========================================================
   SECTION 5: MAIN
========================================================= */

/* =========================================================
   SECTION 6: RUN
========================================================= */
```

Section count may vary (021 uses 11 sections; 114 uses 6). Keep CONFIG and helpers before `main`.

### 4. `debugStep` (required)

Update before every major step and write to outputs:

```js
debugStep = "5 - Load Current Week";
setOutputSafe("debugStep", debugStep);
```

On failure, include step in error context: `FAILED AT: ${debugStep}`.

Use numbered steps: `"1 - Validate recordId"`, `"2 - Validate schema"`, etc.

---

## Inputs and validation

| Rule | Detail |
|------|--------|
| **Read inputs** | `const cfg = input.config();` or `input.config()` at start of `main` |
| **`recordId`** | Standard trigger input; validate non-empty |
| **Record ID shape** | `if (!recordId.startsWith("rec")) throw ...` |
| **Optional inputs** | Document in docblock (e.g. `webhookUrl`, `makeWebhookUrl`) |
| **Normalize text** | `normalizeText()` for comparisons on select values and rule keys |

---

## Outputs: status, action, error

### Required minimum outputs

| Output | Values | Purpose |
|--------|--------|---------|
| `statusOut` | `success`, `skipped`, `error` | Overall run result (lowercase) |
| `errorOut` | `""` on success; message on skip/error | Human-readable reason |
| `debugStep` | Last step name | Debugging in Airtable run history |

### `actionOut` (strongly recommended)

Use for *what happened*:

- Success: `created`, `updated`, `updated-after-recheck`, `awarded_zoom_attendance_xp`
- Skip: `skipped_zero_xp`, `skipped_already_awarded`, `skipped_missing_submission`, `skipped_inactive`
- Error: `error`

Document all outputs in the docblock **OUTPUTS** section.

### Skip vs error vs success

| Situation | Behavior |
|-----------|----------|
| **Expected no-op** (flag set, already done, blank optional field) | `setSkippedOutputs` / `exitSkipped` → set `statusOut: skipped`, `actionOut: skipped_*`, **return** (do not throw) |
| **Broken data** (missing required link, invalid schema, failed write) | Set error outputs, optionally write error status to record, **throw** |
| **Success** | Set `statusOut: success`, domain outputs, final `console.log(JSON.stringify({...}))` |

### Final logging

End success and failure paths with structured JSON log:

```js
console.log(JSON.stringify({
  automation: CONFIG.scriptName,
  version: CONFIG.version,
  statusOut,
  actionOut,
  recordId,
  /* key IDs and counts */
}, null, 2));
```

Use `log(message, data)` wrapper where `CONFIG.debug.logToConsole` controls verbosity.

### `setOutputSafe`

Always wrap `output.set` — never fail when an output is not mapped in the automation action:

```js
function setOutputSafe(name, value) {
  try {
    output.set(name, value);
  } catch {
    // Ignore output mapping errors.
  }
}
```

---

## Schema validation (before record work)

Run early in `main`, after input validation:

- `validateRequiredSchema()` / `assertRequiredSchema()`
- `requireField` — field exists
- `requireFieldType` — link, singleSelect, etc.
- `requireWritableField` — not formula/rollup/lookup
- `requireSingleSelectOption` — option exists before write

For optional newer fields: check existence and writability; skip write with log if missing.

---

## Field helpers (standard library)

### Cache and existence

- `fieldCache = new Map()` + `getFieldSafe(table, fieldName)` — cache `table.getField()` in larger scripts
- `fieldExists`, `isWritableField` — gate all writes
- Non-writable types: formula, rollup, count, lookup, multipleLookupValues, createdTime, lastModifiedTime, createdBy, lastModifiedBy, autoNumber, button, aiText, externalSyncSource

### Reads

- `getRaw`, `getText`, `getNumber` (with `getCellValueAsString` fallback for rollups/formulas)
- `getCheckbox` / `getBooleanish` — handle true/false, 1/0, select-like names
- `getLinkedIds`, `getFirstLinkedId`
- `normalizeText(value)` — trim + lowercase for comparisons

### Writes

- `addIfWritable(payload, table, fieldName, value)` — skip missing/non-writable
- `updateRecordSafe` — filter updates through writability checks
- `updateRecordBestEffort` — try/catch with log on failure
- **Avoid unnecessary writeback** — if value already matches (063 `arraysMatch`, 021 status unchanged), skip update
- **Linked records** — `[{ id: recordId }]` via `buildLinkedRecordArray`

### Large queries

After `selectRecordsAsync` on full tables, call `query.unloadData()` when done (114 pattern) to reduce memory pressure.

---

## Single-select writes

**New scripts and substantive edits:** use 114 pattern:

1. `requireSingleSelectOption(table, fieldName, optionName)`
2. Match choice by normalized name
3. Write `{ id: match.id }`

**Legacy scripts** may use `{ name: match.name }` or `{ name: value }` until touched.

Case-insensitive option matching via `normalizeText(choice.name) === normalizeText(optionName)`.

---

## Dates and time

| Rule | Detail |
|------|--------|
| **Timezone** | `timeZone: "America/Denver"` in CONFIG when script reads Weeks or activity dates |
| **Weeks fields** | `Start Date` and `End Date` are **dateTime**, not plain date |
| **Parsing** | Reuse 005/034 helpers — do **not** rely on `new Date("5/24/2026 12:00am")` alone |
| **Helpers** | `toDateKeyFromText` (ISO + `M/D/YYYY`), `toDateKeyFromDateObject` with `Intl.DateTimeFormat` |
| **Docblock** | Note week-boundary dependency in DESIGN RULES when relevant |

Reference: `005-submission-intake-and-asset-creation-assign-week-to-submission-homework-first.js`, `034-weekly-summary-and-goal-logic-set-previous-week-helper-values.js`.

---

## Design rules (all scripts)

1. **Idempotent** — safe to retry; use source keys, dedupe keys, status flags, “already done” checks.
2. **XP Events** — append-only ledger; do not overwrite historical XP totals on Athlete.
3. **Read-only fields** — never write formulas, rollups, lookups, counts.
4. **Skip vs error** — skipped = expected; error = broken data or schema.
5. **Schema-safe writes** — field exists + writable before every update.
6. **One record in, clear writeback** — document which fields the script owns.

---

## XP automation rules

Apply to 010, 054, 059, 065, 101, 114, and similar.

| Rule | Detail |
|------|--------|
| **Source Key** | Document exact format in DESIGN RULES (e.g. `VIDEO_SUBMISSION\|recordId`) |
| **One source → one XP Event** | Explicit “no stealing” guards; refuse to overwrite another source’s event (114) |
| **Match before create** | Find by Source Key and/or linked source record for same enrollment/submission |
| **Last-chance recheck** | Re-query before `createRecordAsync` on high-risk creates (114 step 10a) |
| **XP Reason Public** | Short user-facing reason (single line) |
| **XP Reason Debug** | Multi-line audit: automation name, version, record IDs, source key, points |
| **Dedupe** | Use `Source Key`, `XP Dedupe Key Normalized`, or table-specific keys per automation docblock |
| **Active** | Set XP Event `Active?` = true on create/update unless automation says otherwise |
| **Optional date fields** | Write `XP Source Date` / `XP Date Source` only when fields exist and are writable |

Reference: `114-video-review-and-xp-create-or-update-video-xp-event.js`.

---

## Email and Make automation rules

Apply to 070a, 070b, 071, 072, 073, 074, 075, 076, 077.

| Rule | Detail |
|------|--------|
| **Build then send** | Separate “build package” (072, 076, 075) from “send to Make” (074, 077, 070a/b) |
| **Webhook URL** | Prefer automation **input** over hardcoded URL in CONFIG |
| **`fetch` with timeout** | Wrap webhook posts; throw with HTTP status + response body on failure |
| **Do not clear trigger on failure** | If webhook fails, leave “Send to Make?” (or equivalent) so retry is possible (074) |
| **Idempotent send** | Check sent/handoff flags before posting; set flags only after success |
| **No real PII in GitHub** | Test payloads use placeholders |

Reference: `072-email-notifications-and-external-handoffs-build-weekly-summary-email-package.js`, `074-email-notifications-and-external-handoffs-send-weekly-summary-email-package-to-make.js`.

---

## Copy and link automation rules

Apply to 030, 063, 111, 032, 023, and similar.

| Rule | Detail |
|------|--------|
| **Scope notes** | Docblock: “This is not the [other] automation” |
| **Copy pattern** | Read linked Enrollment (or source) → write to target field |
| **Skip if unchanged** | Compare existing value to source; skip write if already matches |
| **Single link** | Use `getFirstLinkedId` when field prefers one record |
| **Grade band copy** | Same pattern across Homework Completion, Weekly Summary, Video Feedback |

Reference: `063-homework-review-and-xp-copy-enrollment-grade-band-to-homework-completion.js`, `111-video-review-and-xp-copy-enrollment-grade-band-to-video-feedback.js`.

---

## Weekly summary pipeline rules

Apply to 030–034, 057, 058, 072.

| Rule | Detail |
|------|--------|
| **Chain order** | 031 create/find → 032 goal link → 033 homework → 034 previous-week helpers → 057 perfect week |
| **Read-only weekly fields** | Do not write rollups/formulas (e.g. Total Shots This Week, Total XP After Week) |
| **034 writes** | Previous Week Shots, Previous Total XP, Summary Calculation Status, Perfect Week Automation Status |
| **Week ordering** | By Weeks.Start Date chronology, same enrollment |

Reference: `034-weekly-summary-and-goal-logic-set-previous-week-helper-values.js`.

---

## Streak and achievement rules

Apply to 053–066, 101.

| Rule | Detail |
|------|--------|
| **Rebuild vs repair** | 053 rebuilds occurrences; 054 creates/repairs XP events |
| **Status writeback** | Set automation status fields on enrollment/submission when done or on error |
| **Rule keys** | Match config/rule records by normalized `ruleKey` where used (101) |

---

## What not to force retroactively

- Do not rewrap legacy scripts in `main` only for style
- Do not mass-change `{ name }` → `{ id }` without testing in Airtable
- Do not rewrite working scripts to match section numbering exactly
- Do not change logic when syncing GitHub headers or docblocks only

---

## Workflow

1. Edit script in GitHub (Cursor).
2. Update **Last Updated**, bump **Version** if logic changed.
3. Update GitHub header Purpose/Trigger/Fields if needed.
4. Commit to GitHub.
5. Copy **production docblock through end** into Airtable (skip GitHub header).
6. Note deploy in `CHANGELOG.md` when production-impacting.

---

## Reference scripts

| Pattern | Example file |
|---------|----------------|
| Full docblock + CONFIG + try/catch + XP guards | `114-video-review-and-xp-create-or-update-video-xp-event.js` |
| Weekly logic + main + dateTime parsing | `034-weekly-summary-and-goal-logic-set-previous-week-helper-values.js` |
| Week dateTime + America/Denver | `005-submission-intake-and-asset-creation-assign-week-to-submission-homework-first.js` |
| Copy enrollment → child, skip if match | `063-homework-review-and-xp-copy-enrollment-grade-band-to-homework-completion.js` |
| Skip outputs + actionOut | `101-zoom-attendance-xp-award-meeting-xp.js` |
| Build email package | `072-email-notifications-and-external-handoffs-build-weekly-summary-email-package.js` |
| Send to Make webhook | `074-email-notifications-and-external-handoffs-send-weekly-summary-email-package-to-make.js` |
| Numbered sections, attachment status | `021-submission-intake-and-asset-creation-set-attachment-upload-status.js` |

---

## Cursor rule

This standard is enforced by `.cursor/rules/airtable-automation-scripts.mdc`.
