# Content Quality Rules — Tutorials & Curriculum Exports

**Agent:** Online Agent 8  
**Date:** 2026-07-23  
**Validator:** `tools/tutorials-content/bin/validate-content-quality.js`  
**Library:** `tools/tutorials-content/lib/content-quality.js`  
**Fixtures:** `tests/fixtures/tutorials-content/quality-cases.json`

## Purpose

Define publish-safety checks for tutorial/curriculum content **before** any merge promotion. Read-only against JSON/CSV exports. No live Airtable writes.

## Rules

| Rule ID | Requirement | Severity if published | Severity if unpublished | Notes |
|---------|-------------|----------------------|-------------------------|-------|
| `title_present` | Non-empty normalized title | error | error | Required for catalog cards + detail routes |
| `description_present` | Brief or detailed description present | error | warn | |
| `usable_instructions` | Detailed/instructions text ≥ ~20 chars | warn | info | Tutorials use Detailed Description; orphan may use Assignment Rationale |
| `grade_band_present` | Grade Band / Age Appropriate present when field exists or `--require-grade-band` | warn | warn | **Not in Tutorials schema today** — skipped unless present/required |
| `valid_media_url` | If URL present, must be http(s); blank OK when unpublished | error | warn | Multiline orphan URLs must extract a real URL first |
| `publish_status` | Publish flag parseable | info | info | Checkbox or `checked` select |
| `sort_order` | Numeric when present | warn | warn | Blank defaults to 0 in migration map |
| `accessible_link_text` | Title usable as link text (not `Click here`, not bare URL) | error | warn | |
| `no_internal_only_language` | No internal ops language / record IDs / TODO publish blocks | error | warn | |
| `no_athlete_email_or_private_data` | No email addresses or private contact patterns | error | error | Always enforced |
| `no_broken_asset_reference` | No flagged broken attachments; published rows should have attachment IDs when claiming media | error | warn | Export may include `brokenAssetRefs` |
| `no_duplicate_public_item` | Published row not in duplicate-public set | error | info | Feed from duplicate audit |
| `appropriate_age_labeling` | Age/Grade labels look coherent when present | warn | info | |

## Pass / fail policy

- **Record pass:** zero failed rules with severity `error`.
- **CLI exit code:** `1` if any **published** record fails; `0` otherwise.
- Unpublished incomplete rows may warn without failing the batch.

## Commands

```bash
cd tools/tutorials-content
npm test
node bin/validate-content-quality.js --input ../../tests/fixtures/tutorials-content/quality-cases.json
node bin/audit-duplicates.js \
  --source ../../tests/fixtures/tutorials-content/tutorials-assets-source.json \
  --target ../../tests/fixtures/tutorials-content/tutorials-canonical.json
```

## Relation to migration

1. Run duplicate audit → collect `duplicatePublicIds` / conflicting pairs.  
2. Run quality validator on mapped dry-run output.  
3. Only rows that pass error rules may be proposed for `OK to Publish on Softr = true`.  
4. Conflicting / incomplete / Informational-type rows stay unpublished pending Mike decisions.
)
