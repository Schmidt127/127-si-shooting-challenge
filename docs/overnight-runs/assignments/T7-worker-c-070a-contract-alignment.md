# Assignment T7 — Worker C

**Assigned by:** Cloud Lead (LEAD-005)  
**Time:** 2026-07-11T22:35Z  
**Agent:** Worker-C  
**Cloud agent:** https://cursor.com/agents/bc-3fe201a7-2824-4762-a35d-acb258a5c1a1  
**Branch:** `overnight/worker-c-070a-tests` (continue on this branch)  
**Do not wait on:** Mike #8 / #9 / #11 / live smoke

---

## Task

**T7 — Align 070a contracts to Worker A v4.4 + unified overnight regression suite**

Worker A published 070a **v4.4** (`worker-a-t1-070a-airtable.md`, PR #18). Update T3 stubs/harness so they assert against the **real** script contract (not placeholders), and add one command that runs the overnight 070a offline suite.

### Deliverables

1. Update `airtable/automations/shooting-challenge/lib/070a-homework-upload-contract.js` (+ tests):
   - Remove “stub until Worker A publishes” framing where obsolete
   - Assert `EXPECTED_070A_ASYNC_VERSION = v4.4`
   - Cover Accepted → `lambda_upload_accepted_async` / trigger retained
   - Cover immediate Lambda JSON success / failure paths aligned to A+B
2. Add unified runner, e.g. `tools/airtable/c070a_overnight_offline_suite.py` (or shell/node equivalent) that runs:
   - Node `070a-homework-upload.test.js`
   - Node `upload-make-lambda-response.test.js`
   - Python `tests.test_c070a_dev_smoke_run`
   - Python lambda `tests.test_070a_homework_regression` (+ homework route)
   - Mock `c070a_dev_smoke_run.py all`
3. Worker result: `docs/overnight-runs/worker-results/worker-c-t7-070a-contract-alignment.md`
4. Update PR #13

### Locks

- May use: `L-070a-tests` (already held)
- Do **not** edit: `070a-*.js` (Worker A lock), Make blueprints (Worker B), C-023 docs, lead shared overnight files
- Do **not** enable live smoke (`C070A_ALLOW_LIVE`) unless Mike resolves #8/#9/#17

### Tests required

- Full offline suite PASS; document totals in result file
- Keep PROD guards (refuse prod base + protected evidence record)

### Explicit

**DEV-first. No PROD changes.** Never reset `recGQ8EjAMz3bEBiW`.
