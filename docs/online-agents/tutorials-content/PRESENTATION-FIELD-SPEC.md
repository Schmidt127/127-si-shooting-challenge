# Presentation Field Spec — Tutorials & Curriculum (Content-Only)

**Agent:** Online Agent 8  
**Date:** 2026-07-23  
**Supports:** SC-054 (content analysis only) · C-022  
**Constraint:** Do **not** create live Airtable fields. Do **not** edit email or website code in this package.

## Why this exists

Public `/shoot` tutorial pages currently read operator fields from `Tutorials` (`Name`, `Brief Description`, `Detailed Description`, Softr-named publish flag). SC-054 / C-022 require parent-safe Presentation labels so primary/internal names are never the public fallback.

This spec is **content-layer recommendation only**. Schema creation and web/email wiring remain later authorized work.

## Current public consumption (evidence)

| Surface | Fields read today | Risk |
|---------|-------------------|------|
| Tutorials / shoutouts / articles web | `Name`, descriptions, `Tutorial Type`, `Tutorial - Category`, media, `OK to Publish on Softr`, `Sort Order` | Primary `Name` is public title; Softr-named publish gate (K-M7 / SC-144) |
| Homework catalog web | Separate curriculum Presentation-ish fields already exist (`Assignment Title`, `Brief Description - Display`, `Published?`) | Out of ownership for code edits; noted for consistency |
| Emails | Not wired to Tutorials table in-repo | No tutorial email rewrite in this package |

## Recommended Presentation fields (Tutorials)

Propose these as **new operator-edited or formula fields** in a future schema wave. Names are recommendations; final naming belongs to schema ownership.

| Recommended field | Type (proposed) | Public purpose | Source / seed from | Required for publish? |
|-------------------|-----------------|----------------|--------------------|-----------------------|
| `Display Title` | singleLineText | Card + detail H1 | Seed from `Name` | Yes |
| `Short Description` | singleLineText or richText (short) | Card subtitle | Seed from `Brief Description` | Yes |
| `Athlete Instructions` | richText | Athlete-facing steps | Seed from `Detailed Description` | Recommended |
| `Parent Description` | richText | Parent-facing context | Seed from brief + non-internal detailed | Recommended for shoutouts/articles |
| `Grade Band Label` | singleLineText or link display | Age appropriateness label | **No current Tutorials Grade Band** — optional future link to Grade Bands | Optional until schema adds band |
| `Category Label` | singleLineText | Public category string | Seed from `Tutorial - Category` first choice | Recommended |
| `Media Type Label` | singleLineText | "Tutorial" / "Shout-Out" / "Article" | Derived from `Tutorial Type` | Yes |
| `Public URL` | url | Canonical watch/read link | Seed from `Link to Video` | Yes for media items |
| `Published?` | checkbox | Future rename target for Softr flag | Mirror `OK to Publish on Softr` during cutover | Yes |
| `Sort Order` | number | Already exists — keep as Presentation sort | Existing `Sort Order` | Yes |

### Explicit non-goals for this pass

- Do not rename `OK to Publish on Softr` here (SC-144).
- Do not delete `Name` (primary remains operator/internal).
- Do not invent Grade Band links without Mike-authorized schema work.
- Do not wire 071/072/web queries in this package.

## Mapping from orphan table (`Tutorials & Assets`)

| Orphan field | Presentation seed candidate |
|--------------|----------------------------|
| `Name` | `Display Title` |
| `Brief Descriptions` | `Short Description` |
| `Detailed Description` | `Athlete Instructions` |
| `Assignment Rationale` | `Parent Description` (sidecar until field exists on Tutorials) |
| `Type of Asset` | `Media Type Label` (after option normalize) |
| `Link to Video` | `Public URL` |
| `OK to Publish on Softr` | `Published?` / existing publish checkbox |
| `Sort Order` | `Sort Order` |

## Public-safe labeling rules

1. **Never** publish Airtable record IDs, field IDs, or “Softr” wording in athlete/parent copy.  
2. **Never** use athlete email or private contact info in Presentation fields.  
3. Prefer `Display Title` over primary `Name` once wired.  
4. `Media Type Label` should be human copy (`Shout-Out`, not raw select quirks).  
5. If `Grade Band Label` is empty, do not invent a band in Presentation — omit age line.  
6. Unpublished rows may keep incomplete Presentation fields; published rows must pass content-quality errors.

## SC-054 supporting conclusion (content-only)

| Question | Answer from this package |
|----------|--------------------------|
| Are Tutorials ready for Presentation fields? | Spec ready; schema + wiring not started |
| Can merge wait for Presentation fields? | **Yes** — merge can use existing fields; Presentation is parallel SC-054 work |
| Should orphan table get Presentation fields? | **No** — do not invest in orphan table; migrate then present on `Tutorials` |

## Handoff

- Schema owners: create fields only with Mike authorization.  
- Web/email owners: consume Presentation fields under SC-117 / SC-043 after fields exist.  
- This agent: content rules + migration readiness only.
