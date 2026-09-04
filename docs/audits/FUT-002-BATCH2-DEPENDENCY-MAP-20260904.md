# FUT-002 Batch 2 — Dependency Map (2026-09-04)

**Agent:** A6 — Airtable cleanup prep (no deletes)  
**Backlog:** FUT-002  
**Base:** `appn84sqPw03zEbTT`  
**Live schema refresh:** Airtable MCP `list_tables_for_base` **2026-09-04**  
**Live counts:** **35** tables / **1378** fields  
**Prior snapshot:** `airtable/schema/snapshots/prod-20260831-fut002-batch1/` (historical)  
**Phase gate:** **DO NOT DELETE** until coordinator confirms Phase 1 (SF-07, SF-08, FUT-001) complete. FUT-001 is already COMPLETE; SF-07 / SF-08 remain unfinished P2 per `COORD-WAVE-A1-MASTER-BACKLOG-TRUTH-20260904.md`.

## Inputs

| Source | Role |
|--------|------|
| `docs/audits/FUT-002-batch2-candidate-queue.md` | Batch 2 candidate queue |
| `docs/audits/fut-002-batch2-candidates.json` | Quarantine-ready machine list |
| `docs/deploy-checklists/FUT-002-batch2-quarantined-field-delete.md` | Operator packet |
| Live MCP schema (this run) | Field presence / type / formula options |
| Live MCP interfaces (`list_pages_for_base`) | Interface field usage |
| Repo grep field IDs | Automations, web, tools, Make, docs |

## Quarantine scope (Batch 2 Phase A)

Original five text stubs:

| # | Table | Field | Field ID | Live 2026-09-04 |
|---|-------|-------|----------|-----------------|
| 1 | Athlete Achievement Unlocks | XP Events copy | `fldWnU9gJCsTmTLpK` | **Present** (`singleLineText`) |
| 2 | Shot Milestones | XP Events copy | `fldVcHPjvuabirn6E` | **Present** (`singleLineText`) |
| 3 | Video Feedback | DELETE MAYBE - XP Events copy | `fldTJd1LkzRRmBiAZ` | **ABSENT** — already removed |
| 4 | Weeks | Video Feedback | `fld8tdkjgyYmrs4Eq` | **Present** (`singleLineText`) |
| 5 | Weeks | Submission Assets | `fldo906P9t7nj9xmn` | **Present** (`singleLineText`) |

Live non-empty value probe (`isNotEmpty` filters): **0** records for each remaining stub.

## Dependency checks (remaining four + already-gone VF stub)

### Formulas / lookups / rollups (live schema options scan)

Scanned all field `options` JSON for the five field IDs and formula text containing `XP Events copy` / `DELETE MAYBE`.

**Result:** **zero** formula / lookup / rollup dependents.

### Linked-record both-sides validation

These candidates are **`singleLineText` stubs**, not link fields. Real XP / Weeks links on the same tables remain:

| Table | Keep (real link) | Stub (candidate) |
|-------|------------------|------------------|
| Shot Milestones | `XP Events` `fldmmFEzJt3kmEDh4` (`multipleRecordLinks`) | `XP Events copy` text |
| Athlete Achievement Unlocks | (other real links unchanged) | `XP Events copy` text |
| Video Feedback | `XP Events` `fldkTbQ1yyK0qOyLp` (`multipleRecordLinks`) — **keep** | stub **already gone** |
| Weeks | `Submissions` `fld8hxWh7fATBLghL`, `XP Events` `fldchUzF9JSCQzxai`, `Homework Completions` `fldBCFzjforqsWunR` (links) | text stubs `Video Feedback` / `Submission Assets` only |

**Both-sides note:** No inverse-link pair exists for text stubs. Deleting stubs does not orphan a reciprocal link field.

### Automations / scripts (repo)

| Field ID | Hits in `airtable/automations/` | Hits in `web/` |
|----------|--------------------------------:|---------------:|
| `fldWnU9gJCsTmTLpK` | 0 | 0 |
| `fldVcHPjvuabirn6E` | 0 | 0 |
| `fldTJd1LkzRRmBiAZ` | 0 | 0 |
| `fld8tdkjgyYmrs4Eq` | 0 | 0 |
| `fldo906P9t7nj9xmn` | 0 | 0 |

Name-only greps for “Video Feedback” / “Submission Assets” hit **tables** and unrelated fields — not these Weeks field IDs.

### Make / Fillout / Lambda / app

| Surface | Finding |
|---------|---------|
| Make blueprints | `fldTJd1LkzRRmBiAZ` appears only in **legacy schema dumps** inside `make/blueprints/upload-asset-engine-*.json` as a labeled text field in an Airtable module schema snapshot — **not an active mapped write**. Field already absent live; blueprint cleanup optional / deferred. |
| Fillout | No field-ID references found for these stubs. |
| Lambda | No field-ID references. |
| Web app | No field-ID references. |
| Tests / tools | Inventory/docs/preview JSON only (audit artifacts). |

### Interfaces / forms (live MCP)

| Interface | Uses any Batch 2 stub? |
|-----------|------------------------|
| Homework Grading Queue | **No** |
| Video Feedback Grading | Uses real `XP Events` link `fldkTbQ1yyK0qOyLp` only — **not** the deleted text stub |
| Standalone forms | None listed |

### Docs / inventory

Historical docs and FUT-002 audit JSON still list all five IDs (including the already-deleted VF stub). Treat as documentation debt after delete wave — not a runtime dependency.

## Deferred / hard-stop items (not Batch 2 delete)

| Item | Field IDs | Classification | Reason |
|------|-----------|----------------|--------|
| Config Root Google Drive Folder ID/Link | `fldvG7kDIreffetRt`, `fldwRqavjwXbCHzar` | **RETAIN / hard stop** | Live present; storage cutover not closed |
| Weeks calendar config + real links | Start/End, Week Key, Program Instance, link fields | **RETAIN** | Challenge calendar |
| 279 inventory `unknown` fields | (see unused inventory) | **Unresolved / defer** | OMNI interface/view review |
| Automation 075 | n/a | Do not restore | Hard stop |

## Classification of proposed Batch 2 fields

| Field ID | Classification | Notes |
|----------|----------------|-------|
| `fldWnU9gJCsTmTLpK` | **Legacy text stub / safe to remove** (when Phase 1 gate clears) | Empty; no runtime deps |
| `fldVcHPjvuabirn6E` | **Legacy text stub / safe to remove** | Empty; real XP link kept |
| `fldTJd1LkzRRmBiAZ` | **Already removed** | Document as pre-cleared; no further delete |
| `fld8tdkjgyYmrs4Eq` | **Legacy text stub / safe to remove** | Name collides with VF **table**; ID unused |
| `fldo906P9t7nj9xmn` | **Legacy text stub / safe to remove** | Name collides with SA **table**; ID unused |

None classified as “actively required” or “required empty.”

## Rollback / export reference

| Artifact | Path / method |
|----------|----------------|
| Pre-delete live truth | This map + MCP refresh 2026-09-04 (1378 fields / 35 tables) |
| Prior dated snapshot | `airtable/schema/snapshots/prod-20260831-fut002-batch1/` |
| Operator packet | `docs/deploy-checklists/FUT-002-batch2-quarantined-field-delete.md` |
| Post-delete (when authorized) | New `export_airtable_schema.py` snapshot under `airtable/schema/snapshots/prod-YYYYMMDD-fut002-batch2/` |

**API note:** Meta API field DELETE → 404; Mike **UI delete** only (same as batch 1).

## Status

**MANIFEST READY / DO NOT DELETE** — dependency map complete; wait for Phase-1-complete coordinator signal before any quarantine rename or UI delete.
