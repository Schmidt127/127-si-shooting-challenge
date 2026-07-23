# Tutorial Migration Map — Tutorials & Assets → Tutorials

**Agent:** Online Agent 8  
**Date:** 2026-07-23  
**Machine-readable twin:** `tutorial-migration-map.json`  
**Direction:** Source = `Tutorials & Assets` (`tblDOTgsWfqPm18bw`) → Target = `Tutorials` (`tbldfoVGdhqATi4MS`)  
**Mode:** Dry-run / future execution only — **do not migrate live data in this package**

## Policy

| Rule | Detail |
|------|--------|
| Canonical table | Keep `Tutorials` |
| Prefer update-in-place | If duplicate match finds an existing Tutorials row, update gaps rather than create a new `rec` (preserves public detail URLs) |
| Never title-only delete | Automatic deletion must not use title alone |
| Unknown source fields | Leave unmapped; report in dry-run |
| Schema changes | Not performed here (no new fields, no renames) |
| Historical preservation | Not required for orphan rows, but linked/external dependencies still matter |

## Field-by-field map

### 1. `Name` → `Name`

| Attribute | Value |
|-----------|-------|
| Target field | `Name` |
| Direct copy | No |
| Transform required | Strip BOM/`\uFEFF`; collapse newlines to spaces; trim; truncate if needed for single-line UX |
| Default | `(untitled)` only for dry-run classification — **do not publish** untitled rows |
| Validation | Non-empty after normalize |
| Collision behavior | Exact normalized title + URL → probable duplicate; title alone → related/review |
| Unknown/unmapped | Empty name → classify `incomplete` |

### 2. `Link to Video` → `Link to Video`

| Attribute | Value |
|-----------|-------|
| Target field | `Link to Video` |
| Direct copy | No |
| Transform required | Take first URL-looking token from multiline text; normalize scheme/host/path (strip tracking noise optionally); require `http://` or `https://` |
| Default | `""` (blank allowed for incomplete/unpublished) |
| Validation | URL syntax; content-quality rules may fail publish candidates with blank/invalid URL |
| Collision behavior | Canonical URL match is a strong duplicate signal even if titles differ |
| Unknown/unmapped | Non-URL text → leave blank + flag `invalid_media_url` |

### 3. `Sort Order` → `Sort Order`

| Attribute | Value |
|-----------|-------|
| Target field | `Sort Order` |
| Direct copy | Yes (numeric) |
| Transform required | Coerce to integer; reject non-numeric |
| Default | `0` if blank |
| Validation | Finite number |
| Collision behavior | On update-in-place, keep target sort unless source sort is present and target empty |
| Unknown/unmapped | Non-numeric → default `0` + warn |

### 4. `Type of Asset` → `Tutorial Type`

| Attribute | Value |
|-----------|-------|
| Target field | `Tutorial Type` |
| Direct copy | No |
| Transform required | Map: `Tutorial`→`Tutorial`; `Shout Out`→`Shout - Out`; `FBC Article Book`→`FBC Article Book`; wrap as multi-select array |
| Default | `[]` |
| Validation | Must be one of target choices after map |
| Collision behavior | Union types if updating existing row; never remove an existing target type without operator approval |
| Unknown/unmapped | `Informational` → **unmapped** (Mike decision: drop / keep unpublished / later schema) |

### 5. `Associated Program` → `Associated Program`

| Attribute | Value |
|-----------|-------|
| Target field | `Associated Program` |
| Direct copy | Yes (choice names match) |
| Transform required | Ensure array of known choices |
| Default | `["Shooting Challenge"]` for public candidates missing program (web treats empty as SC); for archival copies leave empty |
| Validation | Each value ∈ {`Shooting Challenge`,`Dribbling Challenge`} |
| Collision behavior | Union on update |
| Unknown/unmapped | Unknown program string → flag + omit |

### 6. `Detailed Description` → `Detailed Description`

| Attribute | Value |
|-----------|-------|
| Target field | `Detailed Description` |
| Direct copy | No |
| Transform required | multilineText → richText-compatible plain text (preserve paragraphs); strip internal-only phrases later via quality audit |
| Default | `""` |
| Validation | Optional for unpublished; recommended for publish |
| Collision behavior | If target non-empty and differs → `conflicting` (manual) |
| Unknown/unmapped | None |

### 7. `Brief Descriptions` → `Brief Description`

| Attribute | Value |
|-----------|-------|
| Target field | `Brief Description` |
| Direct copy | No |
| Transform required | Name plural → singular; multiline → richText-compatible text |
| Default | `""` |
| Validation | Recommended for publish |
| Collision behavior | Conflicting non-empty values → manual |
| Unknown/unmapped | None |

### 8. `Assignment Rationale` → *(no target)*

| Attribute | Value |
|-----------|-------|
| Target field | **UNMAPPED** |
| Direct copy | No |
| Transform required | Preserve in migration sidecar JSON only |
| Default | n/a |
| Validation | Report as orphan-only narrative |
| Collision behavior | n/a |
| Unknown/unmapped | **Confirmed unmapped** without schema addition (do not create live fields in this pass) |

### 9. `Athlete` → `Athlete`

| Attribute | Value |
|-----------|-------|
| Target field | `Athlete` |
| Direct copy | No |
| Transform required | singleSelect name → singleLineText; trim double spaces (`Seyler  Ehrlich`) |
| Default | `""` |
| Validation | No email addresses; public-safe display name only |
| Collision behavior | Prefer target if already set |
| Unknown/unmapped | Blank OK |

### 10. `Athlete Headshot` → `Athlete Headshot - Lkp`

| Attribute | Value |
|-----------|-------|
| Target field | `Athlete Headshot - Lkp` |
| Direct copy | No |
| Transform required | Copy attachment metadata/files via Airtable API/UI; do not assume URL permanence |
| Default | `[]` |
| Validation | Attachment IDs present when claimed |
| Collision behavior | Keep target attachments if present; else copy source |
| Unknown/unmapped | Missing attachments → media-not-ready |

### 11. `Thumbnail` → `Thumbnail`

| Attribute | Value |
|-----------|-------|
| Target field | `Thumbnail` |
| Direct copy | Conditional (attachment copy) |
| Transform required | Attachment transfer |
| Default | `[]` |
| Validation | Optional if `Website Image Resolved` will be populated |
| Collision behavior | Keep target if present |
| Unknown/unmapped | None |

### 12. `Display Image` → `Website Image Resolved`

| Attribute | Value |
|-----------|-------|
| Target field | `Website Image Resolved` |
| Direct copy | No |
| Transform required | Attachment transfer into web-preferred image field |
| Default | `[]` |
| Validation | Preferred public image source |
| Collision behavior | Keep target if present (web prefers this over Thumbnail) |
| Unknown/unmapped | None |

### 13. `OK to Publish on Softr` → `OK to Publish on Softr`

| Attribute | Value |
|-----------|-------|
| Target field | `OK to Publish on Softr` |
| Direct copy | No |
| Transform required | `checked` → `true`; blank/other → `false` |
| Default | `false` |
| Validation | Boolean |
| Collision behavior | **Never auto-promote unpublished target to published.** If source published and target unpublished → flag `publish_promotion_review`. If both published with conflicting media → `conflicting`. |
| Unknown/unmapped | Unexpected select values → `false` + flag |

## Target fields with no source

| Target field | Source | Behavior |
|--------------|--------|----------|
| `Tutorial - Category` | None | Leave empty; operator may set post-migration; web groups as `More to explore` |

## Collision matrix (record level)

| Match strength | Action |
|----------------|--------|
| Exact linked record ID (same `rec` — only if re-importing identical IDs) | Treat as exact duplicate; no create |
| Canonical URL match | Probable duplicate → update gaps / manual if conflict |
| Normalized title + type + program | Probable duplicate |
| Normalized title only | Related but distinct — **no auto merge** |
| Attachment ID overlap | Probable duplicate / same media |
| No match + incomplete required fields | Incomplete — migrate unpublished or skip per Mike decision |
| No match + complete | Create new Tutorials row |

## Sidecar / audit outputs (not Airtable fields)

Dry-run must emit:

- `sourceRecordId`
- `targetRecordId` (if matched)
- `classification`
- `unmappedFields[]`
- `transformsApplied[]`
- `publishDecision`
- `warnings[]`
)
