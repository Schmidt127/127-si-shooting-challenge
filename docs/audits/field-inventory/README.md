# Live field inventory audit

## Schema snapshot authority

| Item | Value |
|------|--------|
| **Schema snapshot date/time (UTC)** | 2026-08-30T17:49:53.329688+00:00 |
| **Data-access method** | Airtable Meta API (schema) + Records API (population) via PAT; MCP `list_tables` cross-check; repository grep for dependencies |
| **Live base** | `appn84sqPw03zEbTT` (Production Shooting Challenge) |
| **Number of live tables** | 33 |
| **Number of live fields** | 1358 |
| **Tables/fields that could not be read** | none |
| **Live vs repository documentation** | 75 field-ID differences vs `prod-20260819` schema snapshot (42 new, 33 removed) — see `name-drift-report.md` |

**Primary authority:** live Airtable schema + live record population. Repository snapshots, FUT-002 offline inventory, and docs are comparison/dependency aids only.

**Audit date (UTC):** 2026-08-30T17:49:53.329688+00:00
**Scope:** All 33 tables / 1358 fields
**Record-count method:** Full table pagination; blanks inferred from omitted/empty values
**Dependency-scan method:** Field ID + field name scan across automations, web, tools, tests, make, docs, lambda

## QC

| Check | Result |
|-------|--------|
| Tables audited | 33 |
| Inventory rows | 1358 |
| Matches live field count | YES |
| Unique field IDs | YES |
| Tables failed | 0 |
| Unknown population fields | 0 |

## Classification meanings

| Classification | Meaning |
|----------------|---------|
| ACTIVE | Referenced by active repo code/tests and populated or otherwise in use |
| ACTIVE BUT EMPTY | Active dependency exists but no populated values in live records |
| HISTORICAL | Only historical docs/audits/Make/retired references |
| FORMULA DEPENDENCY | Formula/lookup/rollup/count — do not delete without graph retarget |
| AUTOMATION DEPENDENCY | Referenced by active automation scripts |
| EXTERNAL DEPENDENCY | Web / Make / Fillout contract |
| STRUCTURAL FIELD | Primary or linked-record field |
| RETIRED AUTOMATION ONLY | Only retired automation archive references |
| DUPLICATE OR SUPERSEDED | Explicitly superseded by a canonical field |
| LEGACY CANDIDATE | Legacy Drive/storage field still needing retirement plan |
| EMPTY UNKNOWN | Empty with no verified active dependency — OMNI/Mike review |
| NEEDS MIKE DECISION | Ambiguous; Mike must decide |
| SAFE TO ARCHIVE — PENDING APPROVAL | Evidence supports archive **only after Mike approval** |
| DO NOT TOUCH | Protected workflow / infrastructure |

## Outputs

- `field-inventory.json` — full machine-readable inventory (one object per field)
- `field-inventory.csv` — same rows as CSV
- `empty-fields.md`
- `nearly-empty-fields.md`
- `obsolete-candidates.md`
- `duplicate-candidates.md`
- `dependency-risk-report.md`
- `cleanup-queue.md`
- `audit-limitations.md`
- `name-drift-report.md`
- `_raw/` — Meta schema + Automations table + record counts

## Workflow confirmations

| Check | Result |
|-------|--------|
| Automation 075 retired / absent | PASS — absent from Automations table identity |
| Six deleted welcome fields not proposed for restoration | PASS — not in inventory; still-present=none |
| PHA / 18-assignment fields not proposed for deletion | PASS — DO NOT TOUCH / dependency classes only for those tables |
| Early Bird countable / Week 9 no homework | Documented in Weeks audit evidence; Weeks fields protected |

## Counts

| Metric | Count |
|--------|------:|
| Completely empty | 239 |
| Nearly empty (<5%) | 35 |
| Obsolete/legacy | 2 |
| Duplicate/superseded | 0 |
| Safe to archive (pending approval) | 2 |
| Needs Mike decision / empty unknown | 69 |
| Do not touch | 330 |
| Unknown population | 0 |

## Tooling

```bash
python tools/airtable/live_field_inventory_audit.py
python -m pytest tools/airtable/tests/test_live_field_inventory_audit.py -q
```
