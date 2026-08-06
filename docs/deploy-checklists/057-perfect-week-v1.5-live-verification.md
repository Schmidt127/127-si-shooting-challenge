# Deploy / Live Verification — Automation 057 Perfect Week v1.5

| Field | Value |
|-------|--------|
| SC items | SC-021, SC-028, SC-077, SC-091 |
| Script | `airtable/automations/shooting-challenge/057-achievements-and-milestones-calculate-perfect-week-eligibility.js` |
| PROD version (Mike attestation 2026-08-05) | **1.5** — enabled and running |
| Repository version | **1.5** — **matches PROD** |
| Fixture method | **`LIVE_SAME_DAY_CALENDAR`** — [`PERFECT-WEEK-FIXTURE-METHOD.md`](../testing/perfect-week/PERFECT-WEEK-FIXTURE-METHOD.md) |
| Prior runbook | [`057-perfect-week-denver-v1.4.md`](./057-perfect-week-denver-v1.4.md) — **historical**; do **not** paste/downgrade to v1.4 |
| Status | **Installed in PROD / running** — CASE-01 eligibility + unlock + XP data path proven (Agent 3); **059 auto-fire still open** |
| Do not mark Complete | Until required cases pass under the live same-day method |

## Pilot proof (2026-08-05)

| Item | Result |
|------|--------|
| Submission | `recxbwkZpSJZ5eiqA` (may be deleted after documenting) |
| Submitted Same Day? | **0** |
| Perfect Week Countable Submission? | **0** |
| Conclusion | Historical Omni backfill **cannot** test Perfect Week eligibility normally |

## Hard facts (do not ignore)

1. `Submitted At` = `CREATED_TIME()` — create submissions **on** the Denver Activity Date.
2. `Perfect Week Test Override?` does **nothing** — do not check it.
3. Automation **057** has **no** test-mode path — do not change 057 for fixtures in this package.

## What v1.5 changed vs v1.4

| Item | Change? |
|------|---------|
| Product Perfect Week rules | No |
| Denver date-key helper (v1.4) | Unchanged |
| Runtime | Guard optional `QueryResult.unloadData()` via `unloadQuerySafe` |

## Preconditions

1. Confirm Automation **057** is **enabled** in PROD.
2. Confirm script header: Version **1.5**, Last updated **2026-08-05**.
3. Confirm repository file is also **1.5**. Do **not** paste v1.4.
4. Read [`PERFECT-WEEK-FIXTURE-METHOD.md`](../testing/perfect-week/PERFECT-WEEK-FIXTURE-METHOD.md).

## Live verification steps

1. **Confirm 057 enabled + v1.5.**
2. **Batch A (today):** Omni prompt Batch A — CASE-07 + CASE-02 (and scaffolds). Save IDs to `PWTEST-MANIFEST.json`.
3. **Batch B (calendar):** Starting Sunday **2026-08-09**, create one same-day submission per Denver day through Saturday **2026-08-15** for award cases (CASE-01, etc.).
4. Wait for / re-run 057 → 058 → 059 as appropriate.
5. **Run read-only verifier:**

```bash
node tools/testing/verify_perfect_week_fixtures.mjs
```

Optional evidence:

```bash
node tools/testing/verify_perfect_week_fixtures.mjs --out docs/testing/evidence/2026-08-05-perfect-week-fixtures/VERIFY.json
```

6. Inspect FAIL / BLOCKED (`calendar_incomplete` is expected for unfinished Batch B).
7. Idempotency (CASE-15) after CASE-01 awards.
8. Record evidence; delete fixtures only after capture (pilot may be deleted now that method is documented).
9. Do not mark Perfect Week Complete from “enabled” alone.

## Offline checks (repo)

```bash
node --check tools/testing/lib/perfect_week_fixtures.js
node --check tools/testing/verify_perfect_week_fixtures.mjs
node tools/testing/tests/test_perfect_week_fixtures.cjs
node airtable/automations/shooting-challenge/lib/agent4-perfect-week-edges.test.js
node airtable/automations/shooting-challenge/lib/overnight-perfect-week.test.js
```

## Rollback

Do **not** downgrade to v1.4.

## Related

- Method: `docs/testing/perfect-week/PERFECT-WEEK-FIXTURE-METHOD.md`
- Omni: `docs/testing/perfect-week/PERFECT-WEEK-OMNI-PROMPT.md`
- Spec: `docs/testing/perfect-week/PERFECT-WEEK-FIXTURE-SPEC.md`
