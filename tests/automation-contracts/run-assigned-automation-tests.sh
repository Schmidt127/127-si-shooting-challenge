#!/usr/bin/env bash
# Worker 1 assigned automation test bundle — run from repo root.
set -euo pipefail

echo "=== automation-contracts ==="
node tests/automation-contracts/known-reference-numbers.test.js
node tests/automation-contracts/source-key-registry.test.js
node tests/automation-contracts/program-instance-isolation.test.js

echo "=== airtable-runtime (031/118/119 unload compat) ==="
node tests/airtable-runtime/active-automation-unload-compat.test.js

echo "=== homework 020 identity ==="
node tests/homework/automation-020-sc016-identity.test.js

echo "=== 066 harness ==="
node airtable/automations/shooting-challenge/lib/066-milestone-crossing-harness.test.js
node airtable/automations/shooting-challenge/lib/066-create-records-batch.test.js

echo "=== was-email 118/119 contracts ==="
node tests/was-email-contracts/schedule-on-contract.test.js
node tests/was-email-contracts/send-mode-live-test-regression.test.js
node tests/was-email-contracts/sendmode-prod-contract.test.js

echo "=== offline script mocks ==="
node --test \
  tools/testing/tests/test_023_offline.mjs \
  tools/testing/tests/test_010_offline.mjs \
  tools/testing/tests/test_031_offline.mjs \
  tools/testing/tests/test_005_023_chain_offline.mjs

echo ""
echo "ALL assigned-automation tests PASSED"
