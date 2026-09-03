# Award Recipients — Public On Web (Airtable config)

**Do not create or rename fields from code.** Mike configures Airtable manually.

## Required field

| Item | Value |
|------|--------|
| Table | **Award Recipients** |
| Exact field name | **`Public On Web`** (capital **O** in On) |
| Type | **Checkbox** |
| Purpose | Explicit public website publication gate |

### Rename if needed (Production live note 2026-09-03)

Production currently has checkbox **`Public on Web`** (lowercase “on”, field id `fldqX3U52KrfOKhua`).  
Airtable API names are **case-sensitive**. Rename in Airtable UI to exact **`Public On Web`** so the web app can read it.

Default: unchecked (private).

## Rules

- `Public On Web` = checked → eligible for public athlete profile awards section.
- Unchecked / blank / missing → private (fail closed).
- **Never** use **Award Status** as a public-visibility substitute.
- Public HTML must never show amount, coach reason, parent email, Tremendous ids, internal status, or Airtable record ids.
- Private dashboard may still show full authorized award details to signed-in families.

## Web constant

`web/lib/data/public-awards.ts` → `AWARD_RECIPIENT_PUBLICATION_FIELD = "Public On Web"`.
