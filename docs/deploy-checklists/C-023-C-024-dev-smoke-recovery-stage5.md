# C-023/C-024 — DEV operational smoke and recovery (Stage 5)

**Date:** 2026-07-13  
**Worker:** C — Stage 5  
**Branch:** `overnight/v2-run/worker-c-s5-c023-c024-smoke`  
**Base SHA:** `38b92cb`  
**Status:** **COMPLETE** (repo runbook)

---

## 1. Smoke command stack (DEV)

```powershell
# Full regression (required after any C-023/C-024 change)
cd lambda/upload-asset
python -m unittest discover -s tests -p "test_*.py" -v

cd <repo-root>
python tools/airtable/c070a_overnight_offline_suite.py

# C-024 targeted
python -m unittest tools.tests.test_c024_idempotency tools.airtable.tests.test_c024_source_key_guards tools.airtable.tests.test_c024_dedupe_audit_logic tools.airtable.tests.test_c024_audit_output_contract lambda.upload-asset.tests.test_c024_idempotency_stage2 -v
```

**Baseline (Stage 4):** Lambda **66/66**, offline **97/97**, C-024 **17/17**.

---

## 2. DEV extension audit (post-paste)

1. Paste `audit-dedupe-key-coverage.js` into DEV Scripting.  
2. Run dry-run; save JSON to `docs/audits/c024-dedupe-audit-YYYYMMDD.json`.  
3. Triage DK-01–DK-08 per [C-024-audit-dev-runbook-stage3.md](./C-024-audit-dev-runbook-stage3.md).

---

## 3. Upload retry recovery scenarios

| Scenario | Expected | Evidence |
|----------|----------|----------|
| Double **070a** invoke after Uploaded | `skipped_already_uploaded` | `test_c024_idempotency_stage2` |
| Claim continuation | No second S3 upload | Lambda tests |
| Partial writeback retry | Review not double-applied | `test_duplicate_matrix_stage1` |

---

## 4. Recovery without PROD

- Re-run offline suites before any automation paste.  
- Use **116** for asset reuse decisions — never auto-delete duplicates (owner #1).  
- Backfills: dry-run only until `CONFIRM_WRITE` (owner #4).

*Worker C · C-023/C-024 smoke · COMPLETE*
