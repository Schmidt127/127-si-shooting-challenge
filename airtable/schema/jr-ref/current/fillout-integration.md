# Fillout → Airtable integration

Fillout.com is the registration layer. **127SI - JR REF** is the source of truth.

## Forms (confirm names in Fillout dashboard)

| Form | Target table | Web feature |
|------|--------------|-------------|
| JR Ref participant registration | JR Ref Participants | Participants roster |
| Mentor Montana official registration | Mentor Montana Officials | Mentors roster |
| Team registration | Teams | Teams roster |

## Maintenance rules

1. **Field renames** — Update Fillout mapping AND `field-map.md` AND any web mappers in `web/lib/data/jr-ref/`.
2. **New forms** — Add table to Airtable first, wire Fillout, document here, then add web route.
3. **Testing** — Submit test rows in Fillout; verify in Airtable before enabling public web filters.

## Web registration

Phase 1: public site links **out** to Fillout URLs (add to `web/lib/jr-ref/fillout.ts` when ready).

Phase 2 (optional): embed Fillout or custom form with same Airtable write path.
