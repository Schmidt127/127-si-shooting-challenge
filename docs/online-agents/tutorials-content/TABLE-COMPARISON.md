# Table Comparison — Tutorials vs Tutorials & Assets

**Agent:** Online Agent 8  
**Date:** 2026-07-23  
**Evidence baseline:** `airtable/schema/snapshots/prod-foundation-reset-20260723-post-ts/schema_doc_appn84sqPw03zEbTT_20260723_152229.md`  
**Also checked:** PROD 2026-07-23 pre-ts, PROD 2026-07-06, DEV 2026-07-06 (same 13-field shapes)

> Rule: Do **not** assert fields that cannot be confirmed. Unknowns are marked **UNKNOWN**.

## Identity

| Attribute | Tutorials (keep) | Tutorials & Assets (orphan candidate) | Confirmed? |
|-----------|------------------|----------------------------------------|------------|
| Table name | `Tutorials` | `Tutorials & Assets` | Yes |
| Table ID | `tbldfoVGdhqATi4MS` | `tblDOTgsWfqPm18bw` | Yes |
| Field count | 13 | 13 | Yes |
| Link fields | 0 | 0 | Yes |
| Computed fields | 0 | 0 | Yes |
| Description | Empty (schema INFO) | Empty (schema INFO) | Yes |
| Row counts | **UNKNOWN** (no export in repo) | **UNKNOWN** | No |
| Views / Interfaces | View name `Web - Tutorials Catalog` referenced by web | **UNKNOWN** (possible Softr) | Partial |

## Concept comparison

| Concept | Tutorials field | Type | Tutorials & Assets field | Type | Match | Notes |
|---------|-----------------|------|--------------------------|------|-------|-------|
| Primary field | `Name` | singleLineText | `Name` (snapshot: `﻿Name` BOM) | multilineText | Partial | BOM + type drift |
| Title / name | `Name` | singleLineText | `Name` | multilineText | Partial | Same concept |
| Description (short) | `Brief Description` | richText | `Brief Descriptions` | multilineText | Partial | Name plural + type |
| Description (long) | `Detailed Description` | richText | `Detailed Description` | multilineText | Partial | Type drift |
| Instructions | — | — | `Assignment Rationale` | richText | **No target** | Orphan-only |
| Grade Band | — | — | — | — | Absent both | Not on either table |
| Category | `Tutorial - Category` | multipleSelects | — | — | **No source** | Keep-only |
| Asset type | `Tutorial Type` | multipleSelects | `Type of Asset` | singleSelect | Partial | Options differ |
| URL / video | `Link to Video` | url | `Link to Video` | multilineText | Partial | Must validate URL |
| Attachment (display) | `Website Image Resolved` | multipleAttachments | `Display Image` | multipleAttachments | Partial | Name drift |
| Thumbnail | `Thumbnail` | multipleAttachments | `Thumbnail` | multipleAttachments | Yes | Direct concept match |
| Video (separate) | Uses `Link to Video` | url | Uses `Link to Video` | multilineText | Partial | No separate video attachment field confirmed |
| Thumbnail vs headshot | `Athlete Headshot - Lkp` | multipleAttachments | `Athlete Headshot` | multipleAttachments | Partial | Name drift; not confirmed as lookup |
| Publish flag | `OK to Publish on Softr` | checkbox | `OK to Publish on Softr` | singleSelect (`checked` / blank) | Partial | Transform required |
| Sort order | `Sort Order` | number | `Sort Order` | number | Yes | |
| Active status | — | — | — | — | Absent both | Publish flag is public gate |
| Homework links | — | — | — | — | Absent both | |
| Activity links | — | — | — | — | Absent both | |
| Athlete label | `Athlete` | singleLineText | `Athlete` | singleSelect (hardcoded names) | Partial | Orphan options are 2025–26 athletes |
| Associated program | `Associated Program` | multipleSelects | `Associated Program` | multipleSelects | Yes | Same choice names |
| Created / modified metadata | Airtable system only | **UNKNOWN in export** | Airtable system only | **UNKNOWN** | Unknown | Not custom fields in snapshot |

## Select option comparison

### Tutorial / asset type

| Tutorials `Tutorial Type` | Tutorials & Assets `Type of Asset` | Mapping note |
|---------------------------|------------------------------------|--------------|
| `Tutorial` | `Tutorial` | Direct |
| `Shout - Out` | `Shout Out` | Normalize spacing/hyphen |
| `FBC Article Book` | `FBC Article Book` | Direct |
| — | `Informational` | **No Tutorials option** — needs Mike decision or leave unpublished |

Web kind matching (`web/lib/data/tutorials.ts`) normalizes by lowercasing and stripping spaces/hyphens, so `Shout Out` and `Shout - Out` both match shoutout.

### Category (Tutorials only)

Confirmed choices: `Dribble`, `Shoot`, `Character`, `Freethrow`.

`Tutorials & Assets` has **no** category field → migrated rows default to uncategorized (`More to explore` in web grouping) unless operators set category post-migration.

### Associated Program

Both tables: `Shooting Challenge`, `Dribbling Challenge` (order differs in snapshot; names match).

### Publish

| Tutorials | Tutorials & Assets |
|-----------|--------------------|
| checkbox true/false | singleSelect `checked` or blank (`""`) |

### Athlete (orphan table)

Hardcoded single-select options confirmed in snapshot (2025–26 names). This is **not** a linked Athletes table. Treat as brittle presentation data.

## Confirmed structural risks

1. **Type mismatches** on nearly every narrative/URL/publish field — blind CSV copy will fail validation.
2. **Orphan-only `Assignment Rationale`** has no Tutorials destination without a new field (out of scope for live schema changes in this agent).
3. **Category exists only on keep table** — orphan content loses taxonomy unless filled later.
4. **`Informational` type** cannot land in `Tutorial Type` without schema change or drop.
5. **BOM on orphan primary field name** in schema export — import tooling must strip `\uFEFF`.
6. **No linked dependencies inside Airtable schema** for either table (`link fields: 0`) — deletion risk is external (web + Softr/UI), not inverse links.

## Unknowns requiring export / UI check

| Unknown | Why it matters | Where to resolve |
|---------|----------------|------------------|
| Live row counts | Whether orphan has unique content | Fresh Airtable export |
| Content overlap | Duplicate vs unique migration volume | Duplicate audit tool on exports |
| Softr/Interface bindings to orphan table | Blocks deletion | Mike / Airtable UI (D-014) |
| Attachment URL freshness | Media readiness | Export + HEAD/check URLs |
| Created/modified timestamps | Prefer newer conflicting version | Export metadata if available |
| Whether `Athlete Headshot - Lkp` is truly a lookup | Naming suggests lookup but snapshot type is `multipleAttachments` | Treat as attachment field per snapshot; do not invent lookup behavior |
)
