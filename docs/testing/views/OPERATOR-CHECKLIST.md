# SC-003 Operator Checklist — Testing Views

Canonical install + verification checklist lives in [`README.md`](./README.md).

**SC-003 status (2026-08-05): Complete** — `--require-installed` PASS (10/10). Steps below remain for reinstall/rename verification only.

Quick path (reinstall / rename):

1. Paste [`OMNI-INSTALL-PROMPT.md`](./OMNI-INSTALL-PROMPT.md) into Omni (PROD base) if recreating views.
2. Confirm each row in the README install table (canonical name **or** accepted short alias under `02 TESTING`).
3. Run:

```bash
node tools/testing/verify_testing_views.mjs
node tools/testing/verify_testing_views.mjs --require-installed
```

4. Store verifier JSON under `docs/testing/evidence/` when re-verifying after renames.
5. Do **not** treat missing views as current SC-003 status — completion master records **Complete**.
