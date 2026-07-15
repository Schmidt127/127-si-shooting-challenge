# S26 — Folder 01 decision (001 / 002 / 003)

**As-of:** 2026-07-14  
**Workstream:** 6  
**Investigation:** [FOLDER-01-001-003-investigation.md](../../deploy-checklists/FOLDER-01-001-003-investigation.md)

---

## Verdict

```text
combine_with_conditions
```

**Not** `combine_001_002_safely` — blocked by confirmed docs trigger swap + missing live-UI attestation + no zero-UI consolidation path tonight.  
**Not** `keep_separate` as the long-term rank for 001∪002 — shared intake pipeline makes a conditional orchestrator reasonable *after* triggers are corrected.

| Pair | Tonight | After Mike UI verify |
|------|---------|----------------------|
| **001 ∪ 002** | **Do not combine** · plan only | Eligible for **combine_with_conditions** |
| **003** | **Keep separate** | Stay separate (refresh lifecycle) |

---

## Conditions before any combine

1. Mike confirms live 001/002 views match **script** intent (not the swapped docs-table row).
2. Docs table conditions corrected (or proven UI≠docs and UI already correct).
3. Explicit DEV smoke: new enrollment → Athlete link → Grade Band assign; grade change → 003 refresh.
4. Written promotion package + Mike approval before PROD (always).
5. 003 remains its own automation unless a later ADR changes refresh semantics.

---

## Evidence summary

- Docs-table slim export shows **001 conditions == 002 script intent** and **002 conditions == 001 script intent**.
- 003 docs ↔ script **aligned**.
- Offline contracts: `tools/airtable/tests/test_folder01_enrollment_contracts.py` (PASS expected).

---

## Implementation tonight

**None** (plan + tests + inventory updates only).
