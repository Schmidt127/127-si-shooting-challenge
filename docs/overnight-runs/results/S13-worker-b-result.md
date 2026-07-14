# S13 worker-b result — C-027 major-event notifications design

| Field | Value |
|-------|-------|
| Stage | S13 |
| Package | `C-027-major-event-notifications-design` |
| Lane | worker-b |
| Branch | `overnight/v2-run/worker-b-s13-c027-major-event-notifications` |
| Base SHA | `feb8cee` |
| Date | 2026-07-13 |

## Deliverables

| File | Role |
|------|------|
| `docs/deploy-checklists/C-027-major-event-notifications-design-stage13.md` | Behavior + Send Key contract |
| `docs/deploy-checklists/C-027-dev-omni-runbook-stage13.md` | DEV phases |
| `tools/airtable/tests/test_c027_major_event_send_contract.py` | Offline gates/idempotency |

## Locked rules applied

- Parents v1; four event types only
- No daily / **071** / video feedback changes
- MEN\|… Send Keys

## Not done

- No Airtable/provider work
- OD-1…OD-5 remain for Mike
