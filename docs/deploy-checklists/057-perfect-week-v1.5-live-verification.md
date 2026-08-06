# Deploy / Live Verification — Automation 057 Perfect Week v1.5

| Field | Value |
|-------|--------|
| SC items | SC-021, SC-028, SC-077, SC-091 |
| Script | `airtable/automations/shooting-challenge/057-achievements-and-milestones-calculate-perfect-week-eligibility.js` |
| PROD version (Mike attestation 2026-08-05) | **1.5** — enabled and running |
| Repository version | **1.5** — **matches PROD** |
| Fixture method | **`GATED_TEST_TIMESTAMP`** (primary) — [`PERFECT-WEEK-FIXTURE-METHOD.md`](../testing/perfect-week/PERFECT-WEEK-FIXTURE-METHOD.md) |
| Prior runbook | [`057-perfect-week-denver-v1.4.md`](./057-perfect-week-denver-v1.4.md) — **historical**; do **not** paste/downgrade to v1.4 |
| Status | **Installed in PROD / running** — CASE-01 eligibility + unlock + XP data path proven (Agent 3) via **gated test timestamp** fixtures; **059 auto-fire still open** |
| Do not mark Complete | Until required cases pass; gated path is Schmidt-only (not athlete-facing) |

## What this package is

A **tightly gated fixture mechanism** so historical seven-day Perfect Week fixtures can run for Enrollment `recCyFEPeATOVNlr9` only.  
**Not** athlete-facing production behavior. Normal athletes still use `Submitted At` (`CREATED_TIME()`) vs `Activity Date`.

## Pilot + control evidence (preserve)

| Case | IDs | Result |
|------|-----|--------|
| CASE-07 | `recxbwkZpSJZ5eiqA` | Same Day **0**, Countable **0** |
| CASE-02 | Sub `recbr8gduRKmpiDkd`, WAS `recMMeJENu6Pg8l58` | Same Day **1**, Countable **1**, Eligible **0** |

## Hard facts

1. `Submitted At` = `CREATED_TIME()` — historical Activity Dates are not same-day without the gated path.
2. Gated path requires **all**: Enrollment RID `recCyFEPeATOVNlr9` + `Perfect Week Test Record?` + `Perfect Week Test Submitted At`.
3. `Perfect Week Test Override?` does **nothing** — do not check it.
4. Automation **057** has **no** test-mode path — do **not** change 057 for fixtures.

## PROD field IDs (gated path)

| Field | ID |
|-------|-----|
| Perfect Week Test Record? | `fld0xNqO0ryOe7uEY` |
| Perfect Week Test Submitted At | `fldr2msxUo1kPjROD` |
| Enrollment Record ID Lookup | `fldHH6GDDG9DixHBT` |

Rollback: [`PERFECT-WEEK-GATED-TEST-TIMESTAMP-ROLLBACK.md`](../testing/perfect-week/PERFECT-WEEK-GATED-TEST-TIMESTAMP-ROLLBACK.md)

## CASE-01 live fixtures (2026-08-05)

| Item | ID |
|------|-----|
| Enrollment | `recCyFEPeATOVNlr9` |
| Week | `reci5GdxEC57vfoS3` |
| WAS | `recKebuZ79QFTwivA` |
| Goal Record | `recQJRxpaBgwN42Un` |
| Submissions (7×715) | `recVLL0vDAX6WniCA`, `recPJFAC2c2JWtUp6`, `recY4Y3U10VmDwNfR`, `recA1YgNKTJ1LgTwF`, `rec9XPi5OsDRxwGuU`, `rec2f3SDemsJSkeIO`, `recbsbSR5UXhFOdjo` |
| Videos (3) | `recNnc5jyNZhr7aMl`, `recU0fm1oWJWjjabv`, `recjxoiMZ2WTRuUmW` |

Observed after formula gate:

- All seven: `Submitted Same Day? = 1`, `Perfect Week Countable Submission? = 1`
- Distinct dates: 7; week shots: 5005
- Security probes: checkbox-only → 0; timestamp-only → 0

### Mike action required if 057 stays Pending

API Error→Pending / Skipped→Pending did **not** complete helpers (Status remained Pending, helpers unset).  

1. Open WAS `recKebuZ79QFTwivA`.  
2. Confirm `Perfect Week Calculation Queue? = 1`.  
3. Open automation **057** → **Test** / **Run** with `recordId = recKebuZ79QFTwivA`, **or** inspect automation run history for errors.  
4. Expect Status **Ready**, Daily Met, Video Count ≥ 3, Zoom Met (no meeting), Homework Met, Eligible **1**.  
5. Confirm **058** one unlock + **059** one XP `PERFECT_WEEK|recCyFEPeATOVNlr9|reci5GdxEC57vfoS3`.  
6. Re-run 057 twice — no duplicate unlock/XP.

## Verifier

```bash
node tools/testing/verify_perfect_week_fixtures.mjs
```

Optional evidence:

```bash
node tools/testing/verify_perfect_week_fixtures.mjs --out docs/testing/evidence/2026-08-05-perfect-week-gated/VERIFY.json
```

## Rollback readiness

Documented and ready — restore original Same Day formula; clear test fields on fixtures; re-check CASE-02/07; optionally delete test-only fields after verification complete.

## Related

- Method: `docs/testing/perfect-week/PERFECT-WEEK-FIXTURE-METHOD.md`
- Dependency audit: `docs/testing/perfect-week/PERFECT-WEEK-DEPENDENCY-AUDIT.md`
- Omni: `docs/testing/perfect-week/PERFECT-WEEK-OMNI-PROMPT.md`
- Spec: `docs/testing/perfect-week/PERFECT-WEEK-FIXTURE-SPEC.md`
