# SC — Public published awards (schema gap)

**Date:** 2026-09-03  
**Branch:** `feature/public-published-awards`  
**Base:** `appn84sqPw03zEbTT` · Award Recipients `tblTyQXl8aEP93ubK`

## Finding — publication field missing

Live MCP `get_table_schema` + `docs/audits/field-inventory/_raw/meta_tables.json` show **no** Public / Published / OK-to-publish field on **Award Recipients**.

Checked candidate names (none present on Award Recipients):

- `Published?`
- `Public?` / `Public`
- `OK to Publish` / `OK to Publish on Softr`
- `Show on Public Profile?` / `Include on Public Profile?`

### Related Awards catalog fields (do **not** reuse for public web)

On **Awards** (`tbltlhInAQPtOB8hx`), these control weekly/overall **email summary** sections, not public website publication:

- `Include in Overall Awards Section?` (`fld3iYVye7jgqXAh6`)
- `Include in Weekly Awards Section?` (`fld3yQWw1Jb2Thy5n`)
- `Eligible for Weekly Summary?` / `Eligible for Overall Summary?`

## Product rule (code)

- Public award display is gated by `AWARD_RECIPIENT_PUBLICATION_FIELD` in `web/lib/data/public-awards.ts`.
- Field is currently `null` → `listPublicAwardsForEnrollment` always returns `[]`.
- Private dashboard Award Recipients loading is unchanged (authorized enrollment only).

## Mike action required

1. Confirm whether public athlete pages should show season awards at all.
2. If yes, add an explicit Award Recipients checkbox (recommended name: **`Published?`**) — or confirm an existing field if one is added later.
3. After the field exists, tell Cursor the exact field name + id so `AWARD_RECIPIENT_PUBLICATION_FIELD` can be set and public mapping enabled (still excluding parent email, Tremendous ids, and internal notes).

**Do not** create Airtable fields from this PR.
