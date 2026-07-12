# Worker C result — S1 — C-023 duplicate detection test matrix

**Task ID:** C-023 Stage 1  
**Agent:** Worker-C  
**Branch:** `overnight/v2-run/worker-c-s1-c023-tests`  
**Base SHA:** `ba6c8440890e4db97e65c48224250dc02bb961a0`  
**Run date:** 2026-07-12  
**Authorization:** `docs/overnight-runs/2026-07-12/LEAD-AUTHORIZED-START.md`

---

## Status

**COMPLETE — all required suites PASS**

| Gate | Result |
|---|---|
| Matrix: same file same filename | **PASS** |
| Matrix: same file renamed | **PASS** |
| Matrix: different file same filename | **PASS** |
| Matrix: retry after successful upload | **PASS** |
| Matrix: retry after partial writeback | **PASS** |
| Matrix: multi-file submission (one duplicate) | **PASS** |
| Matrix: missing hash | **PASS** |
| Matrix: hash lookup failure | **PASS** |
| Full lambda unittest discover | **PASS** |
| `c070a_overnight_offline_suite.py` | **PASS** |
| `duplicate.py` implementation changes | **None** (Worker B scope) |
| PROD | **Not run** (forbidden) |

---

## Test totals (exact)

### New matrix file — `tests.test_duplicate_matrix_stage1`

| Class | Tests |
|---|---:|
| `DuplicateMatrixClassificationTests` | 3 |
| `DuplicateMatrixWritebackTests` | 6 |
| `DuplicateMatrixProcessorTests` | 7 |
| **Matrix subtotal** | **16** |

Command:

```bash
python -m unittest discover -s lambda/upload-asset/tests -p test_*.py
```

| Result | Count |
|---|---:|
| Ran | **62** |
| Failures | **0** |
| Errors | **0** |
| Skipped | **0** |
| **Outcome** | **OK** |

Prior suite was 46 tests; **+16** matrix tests added.

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
| `lambda/upload-asset/tests/test_duplicate_matrix_stage1.py` | **New** — 16-test C-023 Stage 1 matrix |
| `docs/overnight-runs/results/S1-worker-c-result.md` | This result file |

### Not edited (per locks)

- `lambda/upload-asset/upload_core/duplicate.py` (Worker B)
- `overnight/lead-integration`
- Automations, PROD, deploy-checklists

---

## Matrix coverage notes

| Scenario | Assertion focus |
|---|---|
| Same file, same filename | Exact hash match; `Same Assignment Resubmission`; upload not blocked |
| Same file, renamed | Hash match independent of `Original File Name`; review flagged |
| Different file, same filename | Unique status; no hash match despite shared filename |
| Retry after success | `skipped_already_uploaded`; S3 and lookup not invoked |
| Retry after partial writeback | Upload complete + review missing → skip; no re-review patch |
| Multi-file, one duplicate | Asset A unique; Asset B flags prior match; both upload |
| Missing hash | `Duplicate File Status = Error`; `SHA-256 hash not computed.` |
| Hash lookup failure | Upload continues; `uploadBlocked = false`; error writeback; `duplicateLookupPerformed = false` |

All scenarios assert **`uploadBlocked` remains false** per C-023 policy.

---

## Commit

| Field | Value |
|---|---|
| Branch | `overnight/v2-run/worker-c-s1-c023-tests` |
| Commit SHA | `3aee60b754943f6e74a4c0a11ef2cdc13bcec30f` |

---

## Explicit production statement

**PROD was not modified.** No live Airtable/Make/AWS calls. Tests use mocks/patches only.
