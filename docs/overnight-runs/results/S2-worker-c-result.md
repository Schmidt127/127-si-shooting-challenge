# Worker C result — S2 — C-024 idempotency tests

**Task ID:** C-024 Stage 2  
**Agent:** Worker-C  
**Branch:** `overnight/v2-run/worker-c-s2-c024-idempotency-tests`  
**Base SHA:** `c59dca8`  
**Run date:** 2026-07-12  
**Authorization:** `docs/overnight-runs/2026-07-12/LEAD-STAGE2-AUTHORIZED.md`

---

## Status

**COMPLETE — all required suites PASS**

| Gate | Result |
|---|---|
| Upload retry / double-invoke idempotency | **PASS** |
| Source Key guard mocks | **PASS** |
| Full lambda unittest discover | **PASS** |
| `c070a_overnight_offline_suite.py` | **PASS** |
| PROD / live smoke | **Not run** (forbidden) |

---

## Test totals (exact)

### New file — `tests.test_c024_idempotency_stage2`

| Test | Focus |
|---|---|
| `test_double_invoke_after_success_skips_second_upload` | Second invoke after Uploaded → `skipped_already_uploaded`; S3/lookup once |
| `test_matching_claim_retry_continues_without_reclaiming` | Processing + matching claim → `claim_continuation`; no reclaim patch |
| `test_concurrent_double_invoke_other_claim_does_not_upload` | Other worker claim → `skipped_concurrent_upload`; no S3 |
| `test_uploaded_with_prior_claim_still_skips_before_claim_logic` | Early `already_uploaded` guard; claim eval not invoked |

| Class | Tests |
|---|---:|
| `C024UploadIdempotencyStage2Tests` | 4 |

### Source Key guard mocks

| File | Class | Tests |
|---|---|---:|
| `tools/tests/test_c024_idempotency.py` | `TestC024Idempotency` | 1 |
| `tools/airtable/tests/test_c024_source_key_guards.py` | `TestC024SourceKeyGuards` | 4 |
| **C-024 targeted subtotal** | | **9** |

Command:

```bash
python -m unittest discover -s lambda/upload-asset/tests -p test_*.py
```

| Result | Count |
|---|---:|
| Ran | **66** |
| Failures | **0** |
| Errors | **0** |
| Skipped | **0** |
| **Outcome** | **OK** |

Prior S1 suite was 62 tests; **+4** C-024 idempotency tests in lambda discover.

C-024 targeted (separate):

```bash
python -m unittest tools.tests.test_c024_idempotency tools.airtable.tests.test_c024_source_key_guards
```

| Result | Count |
|---|---:|
| Ran | **5** |
| Failures | **0** |
| Errors | **0** |
| **Outcome** | **OK** |

### Offline regression — `c070a_overnight_offline_suite.py`

| Suite | Passed | Failed | Skipped | Total |
|---|---:|---:|---:|---:|
| Node `070a-homework-upload.test.js` | 22 | 0 | 0 | 22 |
| Node `upload-make-lambda-response.test.js` | 19 | 0 | 0 | 19 |
| Python `tests.test_c070a_dev_smoke_run` | 16 | 0 | 0 | 16 |
| Python `tests.test_homework_route` | 7 | 0 | 0 | 7 |
| Python `tests.test_070a_homework_regression` | 8 | 0 | 0 | 8 |
| Python `tests.test_c013_dev_homework_make_smoke` | 20 | 0 | 0 | 20 |
| Mock `c070a_dev_smoke_run.py all` | 5 | 0 | 0 | 5 |
| **TOTAL** | **97** | **0** | **0** | **97** |

**Overall offline suite:** PASS — 97 passed / 0 failed / 0 skipped

---

## Deliverables

| Path | Change |
|---|---|
| `lambda/upload-asset/tests/test_c024_idempotency_stage2.py` | **New** — 4-test upload retry/double-invoke matrix |
| `tools/tests/test_c024_idempotency.py` | **New** — Source Key rerun guard mock |
| `tools/airtable/tests/test_c024_source_key_guards.py` | **New** — HC/XP/achievement/submission guard mocks |
| `docs/overnight-runs/results/S2-worker-c-result.md` | This result file |

### Not edited (per locks)

- `lambda/upload-asset/upload_core/processor.py` (read-only)
- `lambda/upload-asset/upload_core/duplicate.py` (Worker B)
- `overnight/lead-integration`
- Automations, PROD, deploy-checklists

---

## Idempotency coverage notes

| Layer | Assertion focus |
|---|---|
| **Upload (C-024)** | Double-invoke after success skips S3; claim continuation does not reclaim; concurrent claim rejected |
| **Source Key (C-024)** | `VIDEO_SUBMISSION\|{id}` / `HOMEWORK_XP\|{id}` rerun skips second create |
| **Homework Completion** | One official key per enrollment + assignment + week |
| **Submissions** | Identical stats flagged for review, not auto-deleted |
| **Achievements** | Earliest unlock kept; later same-key unlock flagged |

C-024 complements C-023: **file bytes** (hash) vs **record identity** (Source Key / dedupe keys).

---

## Commit

| Field | Value |
|---|---|
| Branch | `overnight/v2-run/worker-c-s2-c024-idempotency-tests` |
| Commit SHA | `bad97fa` |

---

## Explicit production statement

**PROD was not modified.** No live Airtable/Make/AWS calls. Tests use mocks/patches only.
