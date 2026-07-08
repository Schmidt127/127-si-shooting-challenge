# C-013 — Make upload migration plan (Drive → S3)

**Date:** 2026-07-08  
**Status:** **PLAN ONLY** — no Production Make, Production Airtable, or web changes  
**Environment:** DEV first (`appTetnuCZlCZdTCT`)  
**Parents:** [C-013-wave7-asset-storage-checklist.md](./C-013-wave7-asset-storage-checklist.md) · [C-013-sdk-hybrid-runtime.md](./C-013-sdk-hybrid-runtime.md) · [C-013-make-s3-writeback-mapping.md](./C-013-make-s3-writeback-mapping.md)

**Architecture lock (2026-07-08):** Make is **orchestration only**. Upload + SHA-256 + C-023 duplicate lookup + Airtable writeback run in **AWS Lambda** (or SDK CLI for regression). **Do not** use Make **Amazon S3 Upload** (timeout) or extend Production **Google Drive** upload for new DEV work.

**DEV proof baseline:** `recBBi80bYuxXifVj` — SDK confirm-write PASS with full C-013/C-023 writeback ([checkpoint](./C-013-wave7-asset-storage-checklist.md#2026-07-08--controlled-dev-confirm-write-recheck-c-013--c-023)).

---

## 1. Current state — Production Make (Google Drive)

**Scenario:** `Shooting Challenge - GAME - Upload Engine - April 2026`  
**Blueprint:** [upload-asset-engine-v1.json](../../make/blueprints/upload-asset-engine-v1.json)  
**Hash + duplicate variant:** [upload-asset-engine-v2-with-file-hash-duplicate-check.json](../../make/blueprints/upload-asset-engine-v2-with-file-hash-duplicate-check.json) — see [upload-asset-engine-v2-hash-duplicate-check.md](../../make/documentation/upload-asset-engine-v2-hash-duplicate-check.md)

### Current Drive module chain (v2 good-URL branch)

| Step | Module(s) | App | Action |
|------|-----------|-----|--------|
| 1 | **1** | Webhooks | Custom webhook — **070a** / **070b** v4.1 payload |
| 2 | **2** | Airtable | Get Submission Asset (fresh attachment URL) |
| 3 | **30** | Router | Attachment URL exists? |
| 4 | **31** | Airtable | Error writeback if no attachment |
| 5 | **5** | HTTP | Download file from `Airtable Attachment[].url` |
| 6 | **50** | HTTP | POST to hash helper → `sha256`, `sizeBytes`, `mimeType` |
| 7 | **52** | HTTP | GET Airtable API — duplicate hash lookup (`records: []` safe) |
| 8 | **51** | Airtable | Write hash + **C-023 duplicate flags** (upload continues) |
| 9 | **20** | Google Drive | Search athlete folder under root `1e4ymb1M4IlAMBgjAhSMiuYdaSiUtYM80` |
| 10 | **21** | Router | Folder exists vs create-new branch |
| 11 | **19 / 17 / 24** | Google Drive | Create folder (if needed) |
| 12 | **36 / 38 / 42 / 43 / 44 / 45** | Google Drive | Upload file to athlete folder |
| 13 | **Airtable updates** | Airtable | **Submission Assets** + **Video Feedback** — Drive URLs/IDs, `Upload Status = Uploaded` |

**Production writeback (Drive era):** `Google Drive File URL`, `Google Drive File ID`, folder IDs/URLs, `Uploaded At`, `Upload Status`. See [upload-asset-engine.md](../../make/documentation/upload-asset-engine.md).

**Known v1 fix:** NEW-folder branch mapped File ID to `webContentLink` instead of `id` — documented in blueprint README.

---

## 2. Abandoned intermediate — DEV Make S3 path

**Scenario (DEV):** `Shooting Challenge - DEV - Upload Engine - S3 - v1`  
**Result:** Partial PASS 2026-07-07 (canonical URL + storage key, no hash). **Amazon S3 Upload module timed out** — **dropped permanently**. Do not troubleshoot.

| Step | Module | Action |
|------|--------|--------|
| 1–3 | Webhook → Get Record → HTTP download | Same as Drive path |
| 4 | **Amazon S3 Upload** | Put to `shooting-challenge-assets` — **BLOCKED (timeout)** |
| 5 | Airtable update | Partial writeback |

Full module map for reference: [C-013-make-s3-writeback-mapping.md §4](./C-013-make-s3-writeback-mapping.md#4-make-module-map).

---

## 3. Proposed DEV Make scenario (locked target)

**Scenario name:** `Shooting Challenge - DEV - Upload Engine - Lambda - v1`  
**Lambda:** `127si-dev-shooting-challenge-asset-upload` — [lambda/upload-asset/DEPLOY.md](../../lambda/upload-asset/DEPLOY.md)

Make **does not** download, hash, upload to S3, or PATCH Airtable in the locked design. Lambda owns the full upload runtime (ported from [`c013_dev_s3_upload_proof.py`](../../tools/airtable/c013_dev_s3_upload_proof.py)).

### Proposed Make steps (orchestration only)

| Step | Module | App | Action |
|------|--------|-----|--------|
| 1 | **1** | Webhooks | Custom webhook — same **070b** v4.1 JSON (`submissionAssetRecordId`, `routeKey`, `uploadDestination`, …) |
| 2 | **2** | Router | `automationNumber = 070b` AND `routeKey = video_feedback` (homework **070a** later) |
| 3 | **3** | HTTP → Make a request | **POST** Lambda Function URL — body = webhook JSON; headers `Content-Type: application/json` (+ optional `X-Upload-Secret`) |
| 4 | **4** | Router | HTTP status 2xx vs error |
| 5 | **5** | Webhooks | Response **200** to close 070b webhook (070b sets `Processing` on 2xx) |

**Removed vs Drive v2:** modules **5, 50, 51, 52, 20–45** (download, hash, duplicate, Drive).  
**Removed vs DEV S3 attempt:** **Amazon S3 Upload** module.  
**Not in Make:** Airtable success PATCH — Lambda writes **Submission Assets** directly.

### What Lambda does (not Make)

| Step | Owner | Action |
|------|-------|--------|
| Validate DEV base + route | Lambda | Reject prod base / wrong `routeKey` |
| Get asset + download attachment | Lambda | Airtable API + HTTP GET |
| SHA-256 | Lambda | `hashlib` on downloaded bytes |
| C-023 duplicate lookup | Lambda | Airtable filter on `File Content Hash` |
| S3 PutObject | Lambda | `shooting-challenge-assets` / `us-east-2` |
| Airtable writeback | Lambda | C-013 + C-023 fields (attachment **not** cleared) |
| JSON response | Lambda | `writebackVerification.allPass` for Make logs |

---

## 4. Airtable writeback fields (target contract)

**Table:** Submission Assets · **Base:** DEV `appTetnuCZlCZdTCT` (prod later, separate promotion)

### C-013 success (written by upload runtime — Lambda)

| Field | Value |
|-------|--------|
| Upload Status | `Uploaded` |
| Canonical File URL | `https://shooting-challenge-assets.s3.us-east-2.amazonaws.com/{encoded-key}` |
| Storage Key | `shooting-challenge/{season}/{challenge}/{athleteSlug}/{date}-{assetType}-{recordId}-{filename}` |
| File Content Hash | 64-char lowercase SHA-256 hex |
| File Hash Algorithm | `SHA-256` |
| Uploaded At | America/Denver ISO ms |
| File Size Bytes | integer |
| File MIME Type | from download / guess |
| Upload Error | cleared (`null`) |

### C-023 duplicate (written on `--confirm-write` / Lambda live — flag-only)

| Field | Value |
|-------|--------|
| File is Duplicate? | `true` / `false` |
| Duplicate File Status | `Exact Duplicate` / `Unique` / `Error` |
| Duplicate Match Strength | `Exact SHA-256 Hash` |
| Duplicate Match Record | linked first match record id |
| Duplicate Match Notes | human-readable |
| Duplicate Checked At | UTC ISO |
| Duplicate Check Error | blank on success |

### Do not write / clear (this wave)

- **Airtable Attachment** — retain  
- **Google Drive** * fields — leave legacy values; do not remove  
- Formula / rollup / lookup fields  
- Video Feedback child URLs (**022** scope later)

Full mapping: [C-013-make-s3-writeback-mapping.md §5](./C-013-make-s3-writeback-mapping.md#5-airtable-success-writeback).

---

## 5. Where SHA-256 should be computed

| Option | Verdict | Notes |
|--------|---------|-------|
| **Make hash helper (module 50)** | **No** for new DEV path | Was designed for Drive v2; duplicates download path; Make S3 path abandoned |
| **Make Crypto module** | **No** | Same timeout/size limits as S3 module risk |
| **AWS Lambda** | **Yes (locked)** | Same logic as SDK proof; bytes already in memory |
| **Airtable automation script** | **No** | No binary access; wrong layer |
| **SDK CLI (`c013_dev_s3_upload_proof.py`)** | **Regression / dry-run only** | Default dry-run; `--confirm-write` for controlled ops |

**Rule:** One authoritative runtime computes hash **once** from downloaded bytes **before** S3 upload. Make forwards webhook only.

---

## 6. Duplicate hash detection (C-023) — Make vs runtime

| Layer | Role |
|-------|------|
| **Make module 52 (Production v2)** | Historical — HTTP GET Airtable API after hash helper; flag-only; upload continues to Drive |
| **Make (DEV Lambda scenario)** | **None** — no duplicate modules |
| **Lambda / SDK** | **Authoritative for DEV** — `filterByFormula` on `File Content Hash`, exclude current record; write duplicate fields on live run; `match_found_report_only` on dry-run |

**Recommendation:** **Do not duplicate** C-023 in both Make and Lambda. Single runtime (Lambda) writes duplicate fields. Make logs Lambda JSON `c023Duplicate` block only.

**Not both:** Avoid reintroducing Make module **52** on DEV while Lambda also writes duplicate flags — risk double-PATCH or conflicting match notes.

---

## 7. Preserving dry-run / test behavior

| Layer | Dry-run / test pattern |
|-------|------------------------|
| **SDK CLI** | Default = dry-run (plan JSON only). `--confirm-write` requires explicit flag. |
| **Lambda** | Idempotent skip if already `Uploaded` + canonical + hash. Manual invoke via `c013_dev_lambda_invoke.py` without AWS deploy. |
| **Make DEV scenario** | Keep **OFF** until Lambda AWS deploy PASS. Test with **Run once** + sample webhook JSON; **070a/070b OFF** in Airtable. |
| **Airtable 070b** | Enable **last** — only after Lambda direct test + Make manual test PASS |
| **Verifier** | `_probe_c013_asset_storage_fields.py --record-id <rec>` → `allPass` |
| **C-020 H2** | Harness creates fresh `Pending Link` asset; never use prod enrollment |

**Athlete slug override:** Use `--athlete-slug schmidt-mike` on canonical test record `recBBi80bYuxXifVj` when enrollment display name would produce `schmidt-testing`.

---

## 8. Migration phases (DEV → Production)

| Phase | Scope | Production touched? |
|-------|--------|---------------------|
| **A** | SDK/Lambda proof on DEV (`recBBi80bYuxXifVj`, H2 harness assets) | **No** |
| **B** | Deploy DEV Lambda + Function URL | **No** |
| **C** | Create DEV Make Lambda scenario (webhook → HTTP → Lambda) | **No** |
| **D** | Manual Make test + probe verify | **No** |
| **E** | Enable DEV **070b** only (one asset) | DEV Airtable only |
| **F** | **070a** homework route (H1 gate) | DEV only |
| **G** | Production Lambda + Make + 070a/070b | **Promotion doc required** — separate approval |

**Production Drive scenario:** Stays live until phase **G** promotion. Do not edit `Shooting Challenge - GAME - Upload Engine` for DEV experiments.

---

## 9. Hard stops (unchanged)

- No Production Make scenario edits in this plan  
- No Production Airtable automation paste  
- No web code changes  
- No Make **Amazon S3 Upload** module  
- No clearing **Airtable Attachment**  
- No removing **Google Drive** fields  
- No formula/view cutover to **Canonical File URL**  
- No secrets in GitHub (webhook URLs, PATs, AWS keys)

---

## Related

| Doc | Topic |
|-----|--------|
| [upload-asset-engine.md](../../make/documentation/upload-asset-engine.md) | Drive-era status ladder + module overview |
| [upload-asset-engine-v2-hash-duplicate-check.md](../../make/documentation/upload-asset-engine-v2-hash-duplicate-check.md) | Drive v2 hash modules 50–52 |
| [C-013-dev-lambda-upload-plan.md](./C-013-dev-lambda-upload-plan.md) | Lambda payload/response contract |
| [C-013-dev-070b-hybrid-prep.md](./C-013-dev-070b-hybrid-prep.md) | 070b trigger prep (OFF until Lambda PASS) |
| [upload-asset-engine-error-handling.md](../../make/documentation/upload-asset-engine-error-handling.md) | Error writeback (Lambda owns terminal status) |
