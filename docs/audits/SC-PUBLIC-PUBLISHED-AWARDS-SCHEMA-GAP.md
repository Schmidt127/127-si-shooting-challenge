# SC — Public published awards (schema status)

**Updated:** 2026-09-03  
**Supersedes:** earlier “field missing” finding  

## Live Production

Award Recipients has checkbox field id `fldqX3U52KrfOKhua`.

| Current live name | Required exact name for web |
|-------------------|-----------------------------|
| `Public on Web` (lowercase “on”) | **`Public On Web`** |

Airtable API names are case-sensitive. Mike must rename in the UI to **`Public On Web`**.

## Web

- Constant: `AWARD_RECIPIENT_PUBLICATION_FIELD = "Public On Web"` in `web/lib/data/public-awards.ts`
- Public profile loads only rows with `Public On Web` true (server-side formula + fail-closed)
- Private dashboard still loads full authorized award details; `publiclyVisible` uses Public On Web only (never Award Status)

See: [`docs/deploy-checklists/award-recipients-public-on-web.md`](../deploy-checklists/award-recipients-public-on-web.md)
