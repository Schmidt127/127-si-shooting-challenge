# Common Engineering Patterns — Shooting Challenge Automations

**Status:** Active — Wave 2A inventory output  
**Last updated:** 2026-07-05  
**Reference implementation:** **066 v3.1** ([066 script](../airtable/automations/shooting-challenge/066-achievements-and-milestones-create-shot-milestone-unlocks.js))

**Related:** [v2/06-automation-standards.md](./v2/06-automation-standards.md) · [v2-014-automation-modernization-roadmap.md](./v2-014-automation-modernization-roadmap.md)

---

## Purpose

Document **recurring patterns** across production automations so V2 rewrites and future scripts (including C-020 Test Intake) stay consistent. **No behavior changes** — classification and standardization targets only.

---

## Pattern 1 — Script identity (`SCRIPT` + docblock)

| Element | Convention | Best example |
|---------|------------|--------------|
| GitHub-only header | Lines 1–24; never paste into Airtable | All numbered scripts |
| Production docblock | Version, Date Written, Last Updated, PURPOSE, triggers, outputs | **066** |
| `SCRIPT` block | `scriptName`, `version`, dates, `automationName` — **not** business config | **066 v3.1** only today |
| `CONFIG.version` | Must match docblock Version | **066** |

**Gap:** ~45 scripts use docblock + CONFIG without `SCRIPT` block (**Partial** standard).

**V2 target:** Every Category B rewrite adds `SCRIPT` metadata matching docblock.

---

## Pattern 2 — Configuration loading (`CONFIG`)

| Pattern | Usage | Scripts |
|---------|-------|---------|
| Table names in CONFIG | `CONFIG.tables.enrollments` | Most Partial+ scripts |
| Field names in CONFIG | `CONFIG.fields.*` | **066**, **010**, **114** |
| Status / action enums | `CONFIG.statuses`, `CONFIG.actions` | **066**, XP scripts |
| Business keys | Source Key prefixes, dedupe field names | **010**, **059**, **114**, **066** |

**Anti-pattern:** Hard-coded field display strings scattered in logic without CONFIG — common in **Legacy** scripts (**005**, **009**, **057**, **058**, email builders).

**Standardization opportunity:** Shared docblock section template listing CONFIG keys; no shared npm-style import in Airtable — copy pattern from **066** per script.

---

## Pattern 3 — Output contract (`setOutputSafe`)

| Output | Purpose | Required |
|--------|---------|----------|
| `statusOut` | `success` \| `skipped` \| `error` | Yes |
| `errorOut` | Human-readable error | Yes |
| `debugStep` | Last major step name | Yes |
| `actionOut` | `created`, `updated`, `skipped_*` | Yes (V2) |
| Domain outputs | e.g. `createdUnlocksOut` | When useful for automation chaining |

**Coverage:** Present in most Partial scripts; inconsistent naming in Legacy.

**Standardization opportunity:** Identical helper block at top of every V2 rewrite (copy from **066** lines ~output helpers section).

---

## Pattern 4 — Schema validation early

| Helper | Purpose | Reference |
|--------|---------|-----------|
| `requireField` / `requireFieldType` | Fail fast if schema drift | **066**, **114** |
| `validateRequiredSchema()` | One call at start of `main()` | **066** |
| `isWritableField` | Never write formula/rollup/lookup | **066**, standard doc |

**Gap:** Legacy intake scripts (**005**, **009**, **021**) often assume fields exist.

**Standardization opportunity:** Mandatory `validateRequiredSchema` in SECTION 1 of every Category B rewrite.

---

## Pattern 5 — Read helpers

| Helper | Purpose | Common in |
|--------|---------|-----------|
| `getRaw` / `getText` / `getNumber` | Display-safe reads | **066**, **034**, **005** |
| `getLinkedIds` | Link fields → array of IDs | **066**, **020** |
| `getCheckbox` / `getBooleanish` | Checkbox + formula fallback | **066**, **041** |
| `fieldCache` + `getFieldSafe` | Large scripts; avoid repeated `getField` | **066**, **072**, **010** |

**Standardization opportunity:** Document canonical read helper set in [AUTOMATION_SCRIPT_STANDARD.md](../airtable/automations/AUTOMATION_SCRIPT_STANDARD.md); align new rewrites to **066** naming.

---

## Pattern 6 — Date / Week resolution (America/Denver)

| Pattern | Rule | Reference |
|---------|------|-----------|
| `toDateKeyFromText` / `toDateKeyFromDateObject` | Weeks Start/End — never raw `new Date("M/D/YYYY")` alone | **005**, **034** |
| Week lookup by date range | Engine contract — config in **Weeks** table | **005**, **066** v3.1 Week write |

**Risk:** **005** Legacy — high priority Category B rewrite when C-018 intake calendar lands.

---

## Pattern 7 — Idempotency and dedupe

| Domain | Pattern | Scripts |
|--------|---------|---------|
| XP Events | One source record → one XP Event; Source Key | **010**, **059**, **054**, **114**, **065** |
| Unlocks | Milestone Source Key; recheck before create | **066**, **058** |
| Submissions | Duplicate Key on stats (not file hash) | **007** |
| Assets | Source attachment ID dedupe | **009** |
| Skip vs error | Skip = set skipped outputs + return; Error = throw | **066**, **114** |

**Standardization opportunity:** Shared docblock appendix listing Source Key patterns per table (already in business rules / script docblocks — consolidate in doc 03 cross-link).

---

## Pattern 8 — Batching writes

| Pattern | When | Reference |
|---------|------|-----------|
| `updateRecordsAsync` in chunks | >10 record updates | **066**, **053** |
| `unloadData()` after large selects | Memory / quota | **066**, audits |
| Single-record automations | Default for trigger = one record | **041**, **013** |

**Gap:** Some Legacy scripts update one-by-one in loops.

---

## Pattern 9 — External handoffs (Make / fetch)

| Pattern | Rule | Scripts |
|---------|------|---------|
| Webhook URL from `input.config()` | Never hard-code in GitHub | **070a/b**, **071**, **073**, **074**, **077** |
| `fetch` + error body logging | Log response text on failure | **070a/b**, partial in **071** |
| Do not clear send trigger on webhook failure | **074** design rule | Email handoffs |
| Category **E** | Upload + email send — not business logic | **070a/b** = upload; **071–077** = email |

**Simplification target:** Email Message Center (EMC) — merge build + send pairs when clarity allows (**072+074**, **076+077**).

---

## Pattern 10 — Logging and debug

| Pattern | Usage |
|---------|-------|
| `debugStep` before each SECTION | **066** — required |
| `console.log(JSON.stringify({ automation, version, ... }))` | Final structured log | **066**, **114**, **034** |
| Section comments `// SECTION N:` | Scripts > ~150 lines | **066**, **072**, **010** |

**Gap:** Legacy scripts lack SECTION blocks and structured final log.

---

## Pattern 11 — Error handling wrapper

| Pattern | Structure |
|---------|-----------|
| V2 | `try { await main(); } catch (e) { setOutputSafe(...); throw or return }` |
| Legacy | Top-level execution or catch inside main only |

**Target:** All Category B rewrites use **066**-style outer wrapper.

---

## Pattern 12 — Extension script vs production automation

| Use production automation | Use extension script (Category D) |
|---------------------------|-----------------------------------|
| Trigger on record create/update | Dry-run audits |
| Real-time pipeline step | Backfills with `CONFIRM_WRITE` |
| Idempotent per-record logic | One-time cleanup |
| Make webhook handoff | Bulk repair across many rows |

**C-020 Engineering Test Framework:** **Testing Scenarios** table on DEV — script **blocked** until OMNI final field list. See [testing-and-intake-architecture.md](./testing-and-intake-architecture.md); [script checklist](./deploy-checklists/C-020-testing-scenarios-script-checklist.md).

---

## Pattern 13 — Grade band copy at create time

| Script | Copies Grade Band to child | Merge candidate |
|--------|---------------------------|-----------------|
| **030** | WAS | Merge group 030+032+033 |
| **063** | Homework Completion | **Merge → 020** |
| **111** | Video Feedback | **Merge → 013** |

**Rule:** Copy at **create** time reduces orphan child rows — prefer merge into parent create script when clarity allows.

---

## Recommended shared utilities (future — GitHub doc only)

Airtable automations cannot import shared modules. **Do not build a runtime library tonight.** Instead:

1. Maintain **066 v3.1** as copy-source for helpers (outputs, schema, reads, dates).
2. When **AUTOMATION_SCRIPT_STANDARD.md** updates, paste helper blocks into each rewrite.
3. Consider a **non-runtime** `airtable/automations/_patterns/` reference folder in a future wave (snippets for copy-paste — Mike approval required).

---

## Scripts by pattern maturity

| Maturity | Count | Examples |
|----------|------:|----------|
| **V2** (`SCRIPT` + full sections) | 1 | **066** |
| **Partial** (`main` + CONFIG + outputs) | 28 | **010**, **013**, **020**, **114**, **034** |
| **Legacy** (missing one or more) | 17 | **009**, **021**, **057**, **072** (partial but huge), **073**, **075** |

See [v2-014-wave-2a-classification.md](./v2-014-wave-2a-classification.md) for per-automation Category and complexity.
