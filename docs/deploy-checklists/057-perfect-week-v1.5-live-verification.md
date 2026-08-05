# Deploy / Live Verification — Automation 057 Perfect Week v1.5

| Field | Value |
|-------|--------|
| SC items | SC-021, SC-028, SC-077, SC-091 |
| Script | `airtable/automations/shooting-challenge/057-achievements-and-milestones-calculate-perfect-week-eligibility.js` |
| PROD version (Mike attestation 2026-08-05) | **1.5** — enabled and running |
| Repository version | **1.5** — **matches PROD** |
| Prior runbook | [`057-perfect-week-denver-v1.4.md`](./057-perfect-week-denver-v1.4.md) — **historical**; do **not** paste/downgrade to v1.4 |
| Status | **Installed in PROD / running** — Perfect Week **live cross-boundary verification still required** |
| Do not mark Complete | Until CASE-01…16 pass (or documented product exceptions) |

## What v1.5 changed vs v1.4

| Item | Change? |
|------|---------|
| Product Perfect Week rules | No |
| Denver date-key helper (v1.4) | Unchanged |
| Runtime | Guard optional `QueryResult.unloadData()` via `unloadQuerySafe` |

## Preconditions

1. Confirm Automation **057** is **enabled** in PROD.
2. Confirm script header: Version **1.5**, Last updated **2026-08-05**.
3. Confirm repository file is also **1.5** (already true). If they ever diverge, copy PROD → repo before any future paste — **never overwrite PROD** with an older repo copy.
4. Do **not** paste v1.4.

## Live verification steps

1. **Confirm 057 enabled + v1.5** (above).
2. **Create fixtures** — paste [`docs/testing/perfect-week/PERFECT-WEEK-OMNI-PROMPT.md`](../testing/perfect-week/PERFECT-WEEK-OMNI-PROMPT.md) into Omni; save returned IDs to `docs/testing/perfect-week/fixtures/PWTEST-MANIFEST.json`.
3. **Wait** for normal Airtable automation execution (057 → formulas → 058 → 059), or re-run 057 on each fixture WAS.
4. **Run read-only verifier:**

```bash
node tools/testing/verify_perfect_week_fixtures.mjs
```

Optional evidence file:

```bash
node tools/testing/verify_perfect_week_fixtures.mjs --out docs/testing/evidence/2026-08-05-perfect-week-fixtures/VERIFY.json
```

5. **Inspect FAIL / BLOCKED** cases; compare to [`PERFECT-WEEK-EXPECTED-RESULTS.md`](../testing/perfect-week/PERFECT-WEEK-EXPECTED-RESULTS.md).
6. **Rerun 057** on failing WAS after data fixes (not after inventing formula writes).
7. **Idempotency (CASE-15):** rerun 057 twice on the awarding WAS; expect one Unlock and one `PERFECT_WEEK|…` XP.
8. **Record evidence** under `docs/testing/evidence/YYYY-MM-DD-perfect-week-fixtures/`.
9. **Delete controlled fixtures** only after evidence is captured.
10. **Status closeout:** only then advance SC-028 / SC-077 / SC-091 toward Live Tested / Complete in the Completion Master — not from “enabled” alone.

## Offline checks (repo)

```bash
node --check tools/testing/lib/perfect_week_fixtures.js
node --check tools/testing/verify_perfect_week_fixtures.mjs
node tools/testing/tests/test_perfect_week_fixtures.cjs
node airtable/automations/shooting-challenge/lib/agent4-perfect-week-edges.test.js
node airtable/automations/shooting-challenge/lib/overnight-perfect-week.test.js
```

## Rollback

Do **not** downgrade to v1.4. If v1.5 must be reverted, restore the prior Airtable revision Mike approved — prefer matching the repository canonical **1.5** body.

## Related

- Fixture spec: `docs/testing/perfect-week/PERFECT-WEEK-FIXTURE-SPEC.md`
- Omni prompt: `docs/testing/perfect-week/PERFECT-WEEK-OMNI-PROMPT.md`
- unloadData pack note: `docs/deploy-checklists/active-automation-unloadData-compat.md` (057 row)
