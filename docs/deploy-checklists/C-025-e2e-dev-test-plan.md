# C-025 — E2E DEV test plan

**Harness:** `tools/airtable/_c025_dev_e2e_recording_credit_harness.py`  
**Contracts:** `tools/airtable/tests/test_c025_automation_contracts.py`  
**Postconversion:** `tools/airtable/_c025_effective_postconversion_verify.py`

## Pass criteria (DEV)

| # | Case | Pass |
|---|------|------|
| 1 | Needs Review → Satisfactory without Fillout | Review status + Satisfactory write OK |
| 2 | Credit formulas after Satisfactory | Approved?, Key present, XP %/Amount populated |
| 3 | Conflict pair (Schmidt) | Neither live nor recording Approved when both exist |
| 4 | Effective Config chain | XP % / gate Effectives still resolve on meetings |
| 5 | Deadline | `Calculated Recording Quiz Deadline` remains a true date |
| 6 | XP Event | Idempotent via `ZOOM_CREDIT|…` after 117c paste (harness leaves create optional) |
| 7 | Email | 117f skips when disabled / missing config / no webhook |
| 8 | Restore | Harness `restoration_ok` |

## Real-intake remaining

See [C-025-dev-intake-path.md](./C-025-dev-intake-path.md).
