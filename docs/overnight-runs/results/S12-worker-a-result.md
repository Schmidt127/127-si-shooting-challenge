# S12 worker-a result — C-025 Zoom recording design

| Field | Value |
|-------|-------|
| Stage | S12 |
| Package | `C-025-zoom-recording-design` |
| Lane | worker-a |
| Branch | `overnight/v2-run/worker-a-s12-c025-zoom-recording-design` |
| Base SHA | `98c3df9` |
| Date | 2026-07-13 |

## Deliverables

| File | Role |
|------|------|
| `docs/deploy-checklists/C-025-zoom-recording-design-stage12.md` | Behavior contract, audit, field/source-key proposal, OD list |
| `docs/deploy-checklists/C-025-dev-omni-runbook-stage12.md` | DEV OMNI phases (no Airtable execution) |
| `tools/airtable/tests/test_c025_recording_watch_contract.py` | Offline contract tests |

## Locked rules applied

- Recording XP = 50% live (floor)
- Full level-gate credit via distinct-meeting union
- Live/recording mutually exclusive (incl. legacy `ZOOM_ATTEND_BASE`)

## Not done (by design)

- No Airtable schema or automation paste
- Owner OD-1…OD-6 remain for Mike

## Worker tests (pre-integration)

Run from repo root after commit:

```text
python -m unittest tools.airtable.tests.test_c025_recording_watch_contract -v
```
