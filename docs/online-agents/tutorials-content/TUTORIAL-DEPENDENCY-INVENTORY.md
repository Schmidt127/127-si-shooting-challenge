# Tutorial Dependency Inventory

**Agent:** Online Agent 8 — Tutorials, Curriculum, and Content-Migration Readiness  
**Date:** 2026-07-23  
**Scope:** Repository evidence only (no live Airtable reads)  
**Canonical snapshot:** `airtable/schema/snapshots/prod-foundation-reset-20260723-post-ts/schema_doc_appn84sqPw03zEbTT_20260723_152229.md`  
**Related backlog:** C-026 · SC-052 · SC-053 · supporting SC-054 / SC-127–SC-132 (content-only)

## Verdict (validated)

| Table | Table ID | Repo role | Recommendation |
|-------|----------|-----------|----------------|
| **Tutorials** | `tbldfoVGdhqATi4MS` | Live public content source for `/shoot/tutorials`, `/shoot/shoutouts`, `/shoot/articles` | **Keep** |
| **Tutorials & Assets** | `tblDOTgsWfqPm18bw` | Schema-only duplicate; **zero** web/automation/Make/extension references | **Candidate orphan** after migration + Softr/UI proof |

Constraints honored by this package:

- Do **not** delete a table in this pass.
- Do **not** rename fields in this pass.
- Do **not** make live Airtable changes.
- Migration execution is deferred to the runbook.

## Search coverage

Repository searched for: `Tutorials`, `Tutorials & Assets`, table IDs, publish flags, Softr publish fields, website tutorial queries, homework / Learning Activity / Grade Band links, media URLs, attachments, thumbnails, categories, curriculum references.

| Area | `Tutorials` hits | `Tutorials & Assets` hits |
|------|------------------|---------------------------|
| `web/` queries + pages | Yes (canonical) | None |
| `airtable/automations/**/*.js` | None | None |
| `airtable/extension-scripts/` | None | None |
| `make/` | None | None |
| Schema snapshots (PROD + DEV) | Both tables present | Both tables present |
| Docs / backlog | C-026 / SC-052 / SC-053 | Same recommendation language |

## Dependency records

### D-001 — Website table binding

| Attribute | Value |
|-----------|-------|
| Source file | `web/lib/airtable/queries.ts` |
| Component/script/document | `AIRTABLE_TABLES.tutorials` |
| Table expected | `Tutorials` |
| Field expected | n/a (table name constant) |
| Read/write | Read |
| Criticality | **Critical** |
| Migration impact | Must continue pointing at `Tutorials`. Never point at `Tutorials & Assets`. |
| Current evidence | `tutorials: "Tutorials"` at line ~61 |

### D-002 — Website catalog view + publish filter

| Attribute | Value |
|-----------|-------|
| Source file | `web/lib/airtable/queries.ts` |
| Component/script/document | `listPublishedTutorialRecords`, `TUTORIALS_VIEW`, `TUTORIALS_PUBLISH_FILTER` |
| Table expected | `Tutorials` |
| Field expected | `OK to Publish on Softr`, `Associated Program`, view `Web - Tutorials Catalog` |
| Read/write | Read |
| Criticality | **Critical** |
| Migration impact | Migrated rows that should stay public must satisfy publish checkbox + Shooting Challenge program filter (or empty program). View may be missing → filter fallback exists. |
| Current evidence | View constant + `AND({OK to Publish on Softr}, … FIND("Shooting Challenge"…))` |

### D-003 — Website tutorial field set

| Attribute | Value |
|-----------|-------|
| Source file | `web/lib/airtable/queries.ts`, `web/lib/data/tutorials.ts`, `web/types/tutorials.ts` |
| Component/script/document | `TUTORIAL_FIELDS`, `TutorialFields`, `mapTutorialRecord` |
| Table expected | `Tutorials` |
| Field expected | `Name`, `Link to Video`, `Athlete`, `Athlete Headshot - Lkp`, `Thumbnail`, `Website Image Resolved`, `Tutorial Type`, `Tutorial - Category`, `Associated Program`, `Brief Description`, `Detailed Description`, `OK to Publish on Softr`, `Sort Order` |
| Read/write | Read |
| Criticality | **Critical** |
| Migration impact | Source fields from `Tutorials & Assets` must map into these names/types or remain unpublished. Type option labels must normalize to tutorial/shoutout/article. |
| Current evidence | Exact field list in `TUTORIAL_FIELDS`; mapping prefers `Website Image Resolved` over `Thumbnail` |

### D-004 — Public routes (catalog + detail)

| Attribute | Value |
|-----------|-------|
| Source file | `web/app/(program)/tutorials/*`, `web/components/tutorials/*`, nav links |
| Component/script/document | Tutorials / shoutouts / articles pages |
| Table expected | `Tutorials` (via queries) |
| Field expected | Same as D-003; content kind via `Tutorial Type` |
| Read/write | Read |
| Criticality | **Critical** |
| Migration impact | Public site must not break; SC-105 depends on SC-052 merge completion. Record IDs in detail URLs are Airtable `rec…` IDs from **Tutorials** — migrating into new rows changes public URLs. |
| Current evidence | `web/docs/site-hierarchy.md`; `fetchTutorialItem` filters by `RECORD_ID()` |

### D-005 — Publish flag Softr naming (cross-item)

| Attribute | Value |
|-----------|-------|
| Source file | Schema snapshot; `docs/KNOWN_ISSUES.md` (K-M7); `docs/PROJECT_STATE.md` |
| Component/script/document | Publish gate documentation |
| Table expected | `Tutorials` (and duplicate table has same label) |
| Field expected | `OK to Publish on Softr` |
| Read/write | Read (web); write is operator/UI only in repo evidence |
| Criticality | **High** |
| Migration impact | Keep existing field name until SC-144 / schema rename wave. Do not invent a new publish field during merge. |
| Current evidence | Checkbox on `Tutorials`; single-select (`checked` / blank) on `Tutorials & Assets` — type mismatch |

### D-006 — Schema presence (both tables)

| Attribute | Value |
|-----------|-------|
| Source file | Multiple schema snapshots under `airtable/schema/snapshots/` |
| Component/script/document | Schema docs (PROD 2026-07-23 post-ts, DEV 2026-07-06, earlier PROD) |
| Table expected | Both tables |
| Field expected | 13 fields each; **0 link fields** each; **0 computed fields** each |
| Read/write | Read (documentation) |
| Criticality | **High** |
| Migration impact | No Airtable linked-record inverse fields to Tutorials tables were found in the canonical snapshot search. Link migration step focuses on external systems (Softr/interfaces), not scripted link rewrites. |
| Current evidence | Table sections confirm `link fields: 0` for both |

### D-007 — Automations

| Attribute | Value |
|-----------|-------|
| Source file | `airtable/automations/shooting-challenge/*.js` |
| Component/script/document | All production automation scripts |
| Table expected | n/a |
| Field expected | n/a |
| Read/write | None found |
| Criticality | **Info** (absence is evidence) |
| Migration impact | No automation rewrites required for table merge. |
| Current evidence | Ripgrep: no matches for Tutorials / Tutorials & Assets |

### D-008 — Extension audits / backfills

| Attribute | Value |
|-----------|-------|
| Source file | `airtable/extension-scripts/` |
| Component/script/document | Audits + safe-backfills |
| Table expected | n/a |
| Field expected | n/a |
| Read/write | None found |
| Criticality | **Info** |
| Migration impact | No extension script updates required for merge. |
| Current evidence | No matches |

### D-009 — Make.com

| Attribute | Value |
|-----------|-------|
| Source file | `make/` |
| Component/script/document | Blueprints / docs |
| Table expected | n/a |
| Field expected | n/a |
| Read/write | None found |
| Criticality | **Info** |
| Migration impact | No Make scenario updates found in-repo. |
| Current evidence | No matches |

### D-010 — Homework / Learning Activity / Grade Band links

| Attribute | Value |
|-----------|-------|
| Source file | Canonical schema snapshot; `web/lib/airtable/queries.ts` homework fields |
| Component/script/document | FBC Curriculum + homework catalog |
| Table expected | `FBC Curriculum - SYNC` (homework), not Tutorials |
| Field expected | Curriculum has `Grade Band`, `URL`, `Published?`, etc. Tutorials tables have **no** Grade Band / homework / Learning Activity link fields |
| Read/write | Read (schema) |
| Criticality | **Medium** (negative dependency) |
| Migration impact | Duplicate detection must **not** assume Grade Band on tutorial rows. Homework content is a separate inventory track (Package G). |
| Current evidence | Tutorials field lists omit Grade Band; curriculum table is separate |

### D-011 — Backlog / completion master references

| Attribute | Value |
|-----------|-------|
| Source file | `docs/v2-change-backlog.md`, `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md` (read-only), `docs/CHATGPT-MASTER-PLAN-BRIEF.md` |
| Component/script/document | C-026 / SC-052 / SC-053 |
| Table expected | Keep `Tutorials`; retire orphan after audit |
| Field expected | Overlapping content fields; Softr publish naming called out |
| Read/write | Documentation |
| Criticality | **High** (process) |
| Migration impact | Status proposals only in this package; do not edit completion master. |
| Current evidence | C-026 decision checklist; SC-052/053 Planned |

### D-012 — Athlete name / headshot media

| Attribute | Value |
|-----------|-------|
| Source file | Schema + `web/lib/data/tutorials.ts` |
| Component/script/document | Shout-out presentation |
| Table expected | `Tutorials` |
| Field expected | `Athlete` (singleLineText), `Athlete Headshot - Lkp` (attachments) |
| Read/write | Read |
| Criticality | **High** (public PII presentation) |
| Migration impact | `Tutorials & Assets.Athlete` is a **hardcoded single-select** of 2025–26 athlete names — do not treat as durable identity. Map to text only when migrating shout-outs; prefer not migrating obsolete athlete-specific shout-outs without product decision. |
| Current evidence | Schema options list 10 athlete names on orphan table |

### D-013 — Attachment / thumbnail / display image fields

| Attribute | Value |
|-----------|-------|
| Source file | Schema snapshots |
| Component/script/document | Media readiness |
| Table expected | Both |
| Field expected | Tutorials: `Thumbnail`, `Website Image Resolved`, `Athlete Headshot - Lkp`. Orphan: `Thumbnail`, `Display Image`, `Athlete Headshot` |
| Read/write | Read |
| Criticality | **High** |
| Migration impact | Attachment IDs/URLs may expire; copy attachments into target fields carefully. Prefer mapping `Display Image` → `Website Image Resolved` when present. |
| Current evidence | Field type `multipleAttachments` on both tables |

### D-014 — Softr / Interface views (unknown in-repo)

| Attribute | Value |
|-----------|-------|
| Source file | Docs only (`docs/v2-change-backlog.md` C-026 checklist) |
| Component/script/document | Softr / Airtable Interfaces |
| Table expected | Possibly either table |
| Field expected | Unknown |
| Read/write | Unknown |
| Criticality | **Critical blocker for deletion** |
| Migration impact | Before any orphan-table deletion decision, Mike (or authorized DEV check) must confirm no Softr pages / Interfaces still bind to `Tutorials & Assets`. **Not provable from repository alone.** |
| Current evidence | Explicit open question in C-026 decision checklist |

### D-015 — Row counts / live content (unknown in-repo)

| Attribute | Value |
|-----------|-------|
| Source file | None (no export fixtures of production rows in repo) |
| Component/script/document | Live Airtable |
| Table expected | Both |
| Field expected | All content fields |
| Read/write | Unknown |
| Criticality | **Critical for migration execution** |
| Migration impact | Dry-run mapping and duplicate reports require a fresh export (runbook step 1–5). This package provides tools + fixtures only. |
| Current evidence | No production row dumps found under owned paths |

## Field / concept crosswalk (dependency lens)

| Concept searched | Tutorials | Tutorials & Assets | Notes |
|------------------|-----------|--------------------|-------|
| Primary / title | `Name` (singleLineText) | `Name` (multilineText; snapshot shows BOM prefix `﻿Name`) | Normalize BOM on import |
| Description | `Brief Description`, `Detailed Description` (richText) | `Brief Descriptions`, `Detailed Description` (multilineText) | Name + type mismatch |
| Instructions | Not present | `Assignment Rationale` (richText) | Orphan-only; no Tutorials target |
| Grade Band | Not present | Not present | N/A for these tables |
| Category | `Tutorial - Category` multi-select | Not present | Orphan rows lack category |
| Asset / tutorial type | `Tutorial Type` multi-select | `Type of Asset` single-select | Option label drift (`Shout - Out` vs `Shout Out`; orphan has `Informational`) |
| URL / video | `Link to Video` (url) | `Link to Video` (multilineText) | Must validate/normalize URL |
| Attachment / thumbnail | Yes | Yes | Field name drift for display image |
| Publish flag | Checkbox | Single-select `checked`/blank | Transform required |
| Sort order | Number | Number | Direct copy |
| Active status | Not present | Not present | Publish flag is the public gate |
| Homework links | None | None | Separate curriculum table |
| Learning Activity links | None | None | Table not present / not linked |
| Created/modified metadata | Not listed as custom fields | Not listed | Airtable system metadata only — unknown for export tooling |

## Criticality summary

| Criticality | Count | Implication |
|-------------|-------|-------------|
| Critical | 5 | Web binding, publish gate, public routes, Softr unknown, live row counts |
| High | 5 | Field set, schema, athlete media, attachments, process docs |
| Medium | 1 | Negative homework/Grade Band dependency |
| Info | 3 | Automations / extensions / Make absence |

## Migration impact summary

1. **Keep `Tutorials` as the only code-backed table.**
2. **Treat `Tutorials & Assets` as a probable orphan table** pending Softr/Interface proof and row migration.
3. **No automation/Make/extension rewrites** are required by current repo evidence.
4. **Public detail URLs are Tutorials record IDs** — prefer updating existing Tutorials rows over creating new IDs when a duplicate match exists.
5. **Do not delete the orphan table** until D-014 and D-015 are closed via the runbook.
)
