# S14 worker-c result — C-022 presentation fields audit

| Field | Value |
|-------|-------|
| Stage | S14 |
| Package | `C-022-presentation-fields-audit` |
| Branch | `overnight/v2-run/worker-c-s14-c022-presentation-fields` |
| Base SHA | `cd5ddc0` |
| Date | 2026-07-13 |

## Deliverables

- `docs/deploy-checklists/C-022-presentation-fields-audit-stage14.md`
- `tools/airtable/tests/test_c022_presentation_label_contract.py`

## Key findings

- **071** still falls back to `homeworkRecord.name` (V2-003)
- **072** still falls back to Assignment Full Name (V2-004)
- Web prefers Title but still falls back to Full Name

## Not done

Script edits deferred to V2-003/V2-004/web implementation tickets.
