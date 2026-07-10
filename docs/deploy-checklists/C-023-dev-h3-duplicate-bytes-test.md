# C-023 H3 — DEV duplicate-bytes test

**Date:** 2026-07-10
**Base:** DEV `appTetnuCZlCZdTCT` only
**Backlog:** C-023 (related C-013)
**070a / 070b:** OFF (unchanged)
**Production:** Untouched
**AWS config:** Unchanged

---

## Objective

Prove how the DEV hybrid upload path behaves when the same file bytes are submitted again under a fresh Submission Asset record (renamed filename; new `rec` id).

---

## Preflight — current duplicate policy (code)

Source: `lambda/upload-asset/upload_core/duplicate.py`, `processor.py`

| Aspect | Behavior |
|--------|----------|
| Detection | SHA-256 after download, **before** S3 PutObject |
| Lookup scope | **Global** within Submission Assets (`File Content Hash` match, exclude current record) |
| On match | `File is Duplicate? = true`, `Duplicate File Status = Exact Duplicate`, link first match, notes |
| On no match | `Duplicate File Status = Unique` |
| Upload blocked? | **No** — `uploadBlocked: false`; upload continues |
| S3 | **New storage key per asset** (`record_id` + date + filename in path); does **not** reuse existing object |
| Retry | If already **Uploaded** with canonical + hash → `skipped_already_uploaded` |

**Duplicate indicator fields:** `File is Duplicate?`, `Duplicate File Status`, `Duplicate Match Strength`, `Duplicate Match Record`, `Duplicate Match Notes`, `Duplicate Checked At`, `Duplicate Check Error`, `Duplicate Review Status` (formula/views).

---

## Test design (pre-execution)

| Item | Value |
|------|--------|
| Reference asset | `recF86pJTIMFoEypJ` |
| Fresh H3 asset | `rec1ZyqOfljt4foEX` (created at runtime) |
| H3 scenario | `rectsBgWM1POi1hkl` |
| H3 submission | `reczpFd8nv1nYB0Ws` |
| Test filename | `c023-h3-renamed-dup-bytes-test.png` |
| Expected SHA-256 | `448c3126df730cf6b0cf6875f77f1f726b1fa3a2b4c36bb631b326981b25f967` |
| Expected storage | New S3 key (flag-only policy; no object reuse) |
| Expected duplicate fields | `Exact Duplicate`, match link to first global hash hit |
| Upload path | Lambda Function URL via `c013_dev_lambda_invoke.py` (same 070b payload as Make) |
| Rollback | Retain H3 record as audit evidence; reference asset untouched |

**Prep harness:** `tools/airtable/c013_dev_h3_duplicate_bytes_prep.py --confirm-write`

**Prohibited records:** `recIYFnfmsPcy7iop` (not touched), `recF86pJTIMFoEypJ` (read-only reference).

---

## Execution notes

1. **Prep PASS** — H2/C-020 scenario created; asset reached **Pending Link** with renamed attachment (same CDN URL bytes as reference).
2. **First upload attempt FAIL** — Asset moved to **Processing** before manual invoke (likely external Make/070b race while `Ready to Send = READY_TO_SEND`). Direct Lambda invoke returned `error_invalid_upload_status` (Processing).
3. **Recovery** — Narrow DEV reset on H3 only: `Upload Status → Pending Link`, clear **Upload Error**; immediate Lambda retry.
4. **Second upload PASS** — Lambda HTTP 200, `actionOut = uploaded`, `allPass = true`.
5. **Idempotency retry PASS** — Second invoke HTTP 200, `actionOut = skipped_already_uploaded` (no conflicting writeback).
6. **Make webhook** — `MAKE_DEV_UPLOAD_WEBHOOK_URL` not present in local `tools/airtable/.env`; Make module not exercised this run. Lambda path is the same runtime Make calls.

---

## Results

### H3 asset (`rec1ZyqOfljt4foEX`)

| Field | Value |
|-------|--------|
| Upload Status | **Uploaded** |
| Canonical File URL | `https://shooting-challenge-assets.s3.us-east-2.amazonaws.com/shooting-challenge/2026-2027/shooting-challenge/schmidt-testing/2026-07-10-video-feedback-rec1ZyqOfljt4foEX-c023-h3-renamed-dup-bytes-test.png` |
| Storage Key | `shooting-challenge/2026-2027/shooting-challenge/schmidt-testing/2026-07-10-video-feedback-rec1ZyqOfljt4foEX-c023-h3-renamed-dup-bytes-test.png` |
| File Content Hash | `448c3126df730cf6b0cf6875f77f1f726b1fa3a2b4c36bb631b326981b25f967` |
| File Hash Algorithm | SHA-256 |
| File Size Bytes | 67730 |
| Uploaded At | `2026-07-10T10:29:49.405Z` |
| Upload Error | *(blank)* |
| Writeback Complete? | **1** |
| File is Duplicate? | **true** |
| Duplicate File Status | **Exact Duplicate** |
| Duplicate Match Strength | Exact SHA-256 Hash |
| Duplicate Match Record | `rec9Pk14BJjFuNpf7` *(first of 5 global matches; includes reference `recF86`)* |
| Duplicate Match Notes | Exact duplicate file content. Same SHA-256 hash already exists on Submission Asset rec9Pk14BJjFuNpf7. |
| Airtable Attachment | **Retained** |

### Reference asset (`recF86pJTIMFoEypJ`)

Re-probe **unchanged** — `allPass=true`, same hash and storage key as before test.

### Lambda / invoke

| Run | HTTP | actionOut | duplicateBehaviorDecision |
|-----|------|-----------|---------------------------|
| 1 (failed) | 400 | `error_invalid_upload_status` | — |
| 2 (success) | 200 | `uploaded` | `match_found_written_to_existing_field` |
| 3 (retry) | 200 | `skipped_already_uploaded` | — |

`c023Duplicate.uploadBlocked = false` on success run.

### S3

| Object | Result |
|--------|--------|
| Reference key | `.../recF86pJTIMFoEypJ-BlueOrangeCircleLogo.png` — unchanged |
| H3 key | **New** key with `rec1ZyqOfljt4foEX` + renamed filename |
| Same bytes | Yes — identical SHA-256; **two distinct S3 objects** |
| AWS CLI HEAD | Not run (local AWS profile unavailable); keys confirmed via Lambda writeback |

---

## Verdict: **PASS** (H3 test); C-023 remains **in progress**

H3 pass criteria met on successful upload + retry:

1. Same SHA-256 as reference (identical bytes, different filename).
2. Duplicate identified per **current flag-only** policy.
3. Airtable duplicate flags populated and understandable.
4. Final state **Uploaded** (not stuck Processing).
5. Reference asset unchanged.
6. Retry idempotent (`skipped_already_uploaded`).
7. Auditable via prep script + local preview artifacts.

**C-023 is not closed.** Global hash detection and independent upload are proven on DEV. **Owner-approved policy (2026-07-10):** always upload to a new S3 object; flag same-enrollment contextual reuse for **manual review** — see [C-023-production-duplicate-policy.md](./C-023-production-duplicate-policy.md). Prior canonical-reuse draft **superseded**. Implementation **not started**.

---

## Processing race (first invoke failure)

See [C-023-production-duplicate-policy.md §5](./C-023-production-duplicate-policy.md#5-processing-race-investigation-read-only). **Open** — likely 070b/Make set `Processing` before Lambda completed; separate fix slice from duplicate policy.

---

## Writes performed

| # | Action | Record(s) |
|---|--------|-----------|
| 1 | Create Testing Scenario + Run Test? | `rectsBgWM1POi1hkl`, linked submission/asset chain |
| 2 | Week patch on new submission (005 chain) | `reczpFd8nv1nYB0Ws` |
| 3 | Failed Lambda error writeback | `rec1ZyqOfljt4foEX` |
| 4 | Reset Pending Link (H3 recovery) | `rec1ZyqOfljt4foEX` |
| 5 | Successful Lambda upload + duplicate writeback | `rec1ZyqOfljt4foEX` |
| 6 | Idempotency retry (no Airtable change) | `rec1ZyqOfljt4foEX` |

No other Submission Assets modified.

---

## Rollback / evidence

- **H3 record retained** as DEV audit evidence (`rec1ZyqOfljt4foEX`).
- **Reference** `recF86pJTIMFoEypJ` untouched.
- **recIYFnfmsPcy7iop** untouched.
- Preview artifacts local only: `tools/airtable/_preview/c013-dev-h3-*` (not committed).

---

## Recommended next slice

1. **Mike approval:** [C-023-production-duplicate-policy.md](./C-023-production-duplicate-policy.md) (independent upload + manual review)
2. **Schema approval:** review fields + operator status options (§7.5 of policy doc)
3. **Implementation:** Lambda contextual review + DEV H3b–H3i
4. **OMNI:** review Interface after schema approved
5. **Processing race:** separate C-013-OPS slice (policy doc §10)

---

## Related

| Doc | Topic |
|-----|--------|
| [C-013-dev-070b-hybrid-prep.md](./C-013-dev-070b-hybrid-prep.md) | Hybrid path PASS |
| [C-013-wave7-asset-storage-checklist.md](./C-013-wave7-asset-storage-checklist.md) | Wave 7 gates |
| [C-023-production-duplicate-policy.md](./C-023-production-duplicate-policy.md) | Production duplicate scope + reuse spec — **planning only** |
