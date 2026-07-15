# Stage S28 — AUTHORIZED (Phase D UI — 072 ∪ 074)

## Stage

| Field | Value |
|-------|-------|
| Stage ID | S28 |
| Package ID | `phase-d-072-074-ui` |
| Base SHA | `da95bb41bfb5a42a53b6cdf48ff89aae8213eec0` |
| Date | 2026-07-15 |
| Base | DEV `appTetnuCZlCZdTCT` only |

## Objective

Mike-authorized Phase D: paste combined **072 v4.0.0**, run complete DEV **no-send** smoke (both 072 and 074 **OFF** except temporary ON for controlled test runs as needed), then retire **074** only on critical PASS.

## Constraints (binding)

| Allowed | Forbidden |
|---------|-----------|
| DEV Automation **072** paste | PROD |
| DEV Automation **074** retire after PASS | Touching **117** |
| Blank webhook only for first smoke | Other Folder 07 automation state changes |
| Real email disabled | Live production Make webhook |
| Rollback restore on FAIL | Schema / credentials / force-push |

## Rollback (preserved)

`airtable/automations/shooting-challenge/_rollback/phase-d-072-074-2026-07-14/`

## Definition of done

- [ ] Combined 072 pasted (skip GitHub header)
- [ ] Webhook blank; 072 OFF / 074 OFF for first smoke setup
- [ ] Complete DEV no-send smoke **critical PASS**
- [ ] Confirm no real email / no Make production call
- [ ] Retire 074; capacity **45 / 5 free** (estimated)
- [ ] CONTROL + capacity ledger + migration evidence + closeout

## Stop gate

Cursor stops at **Mike’s first Airtable UI action** (paste into 072). Cursor resumes after Mike reports paste done / smoke results / “Phase D UI complete”.
