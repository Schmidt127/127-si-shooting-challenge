# Live field inventory (FUT-002)

**Generated:** 2026-08-30T18:38:17.934095+00:00
**Base:** `appn84sqPw03zEbTT`
**Tables:** 33 · **Fields:** 1355

## Integrity

- PASS — HC Drive batch fields absent
- PASS — HC Review Summary still present (quarantined pending UI delete)
- PASS — HC Review Summary formula valid BLANK()
- PASS — SA Asset Key present
- PASS — SA Asset Key formula valid

## Pack

| File | Purpose |
| --- | --- |
| field-inventory.json / .csv | Full classification |
| cleanup-queue.md | Ordered actions |
| empty-fields.md | Populated=0 |
| nearly-empty-fields.md | <5% |
| invalid-formulas.md | Broken formulas |
| safe-delete-candidates.md | Empty + legacy-named + no deps |
| quarantined-for-delete.md | Renamed awaiting Mike UI trash |
| _raw/ | Meta + counts |

## Regenerate

```bash
python tools/airtable/_fut002_live_pass.py
```
