# Worker C result — S2 — C-024 idempotency and rerun tests

**Status:** **COMPLETE**  
**Branch:** `overnight/v2-run/worker-c-s2-c024-idempotency-tests`  
**Base SHA:** `c59dca8`  
**Commit SHA:** *(filled after push)*

## Deliverables

| File | Status |
|------|--------|
| `lambda/upload-asset/tests/test_c024_idempotency_stage2.py` | Created — 4 upload idempotency tests |
| `tools/tests/test_c024_idempotency.py` | Created — Source Key guard mock |
| `tools/airtable/tests/test_c024_source_key_guards.py` | Created — HC/XP/achievement/submission mocks |

## Test commands and results

### C-024 targeted tests

```powershell
cd lambda/upload-asset
python -m unittest tests.test_c024_idempotency_stage2 -v
```

**Result:** 4/4 PASS

```powershell
cd <repo-root>
python -m unittest tools.tests.test_c024_idempotency tools.airtable.tests.test_c024_source_key_guards -v
```

**Result:** 5/5 PASS

**C-024 targeted total:** 9/9 PASS

### Full Lambda suite

```powershell
cd lambda/upload-asset
python -m unittest discover -s tests -p "test_*.py" -v
```

**Result:** 66/66 PASS

### Full offline suite

```powershell
python tools/airtable/c070a_overnight_offline_suite.py
```

**Result:** 97/97 PASS — OVERALL PASS

## Coverage summary

| Requirement | Test evidence |
|-------------|---------------|
| Repeated upload does not duplicate Submission Assets | `test_double_invoke_after_success_skips_second_upload` |
| Upload claim retry continues without reclaim | `test_matching_claim_retry_continues_without_reclaiming` |
| Concurrent claim does not double-upload | `test_concurrent_double_invoke_other_claim_does_not_upload` |
| XP Source Key rerun skips second create | `test_xp_source_key_rerun_skips_second_create`, `test_repeated_operation_does_not_create_second_result` |
| One official Homework Completion key | `test_one_official_homework_completion_key` |
| Identical submission flagged not deleted | `test_identical_submission_flagged_not_deleted` |
| Achievement earliest wins; later flagged | `test_achievement_keeps_earliest_unlock` |

*Worker C · COMPLETE*
