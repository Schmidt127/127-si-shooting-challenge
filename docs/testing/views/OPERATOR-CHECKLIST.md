# SC-003 Operator Checklist — Testing Views

Canonical install + verification checklist lives in [`README.md`](./README.md).

Quick path:

1. Paste [`OMNI-INSTALL-PROMPT.md`](./OMNI-INSTALL-PROMPT.md) into Omni (PROD base).
2. Confirm each row in the README install table.
3. Run:

```bash
node tools/testing/verify_testing_views.mjs
node tools/testing/verify_testing_views.mjs --require-installed
```

4. Store verifier JSON under `docs/testing/evidence/`.
5. Only then advance SC-003 to **Installed in PROD**.
