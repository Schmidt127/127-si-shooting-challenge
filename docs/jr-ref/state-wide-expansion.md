# JR Referee Clinics — statewide expansion

Fairfield proved the model. Statewide rollout needs stronger **data**, **visibility**, and **repeatable ops**.

## Airtable priorities

1. **Geography** — City/region, school district, or MHSA classification on participants and teams
2. **Season / clinic session** — Separate Fairfield legacy from new statewide cohorts
3. **Mentor capacity** — Which mentors cover which regions; availability flags
4. **Game assignments** — Link teams, officials, mentors, dates, locations
5. **Publish flags** — Which rows may appear on the public website (mirror Shooting Challenge pattern)
6. **Views for web** — `Web - Participants`, `Web - Mentors`, `Web - Teams` (filtered, sorted)

## Fillout

Keep Fillout as registration front door. Ensure each form maps cleanly to one Airtable table with stable field names documented in `field-map.md`.

## Web priorities

| Phase | Deliverable |
|-------|-------------|
| 1 | Overview + nav shell ✅ |
| 2 | First live roster page (Participants) from Airtable view |
| 3 | Mentors + Teams catalogs |
| 4 | Clinic schedule / game assignments (tables TBD) |
| 5 | Regional filters for statewide audience |

## Schema discipline

After every meaningful base change:

1. Run `tools/airtable/jr-ref/export_schema.py -v`
2. Commit snapshot under `airtable/schema/jr-ref/snapshots/`
3. Update `airtable/schema/jr-ref/current/table-map.md` and `field-map.md`
4. Note in `CHANGELOG.md` under `### JR Ref / Airtable`

## Open questions (fill in as you decide)

- [ ] Base ID for `127SI - JR REF` (for `.env` files)
- [ ] Exact Airtable table names (confirm vs Fillout mappings)
- [ ] Which fields are public vs admin-only
- [ ] Per-region landing pages or single statewide roster with filters?
