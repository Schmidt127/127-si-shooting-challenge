# C-013 — DEV Make S3 upload/writeback mapping

**Backlog:** C-013 (Wave 7 Slice 2)  
**Environment:** DEV only — base `appTetnuCZlCZdTCT`  
**Status:** **SDK proof PASS (2026-07-08)** — full writeback + SHA-256 on `recBBi80bYuxXifVj` via [c013_dev_s3_upload_proof.py](../../tools/airtable/c013_dev_s3_upload_proof.py). Make S3 blocked. **Not** full migration.  
**Parent checklist:** [C-013-wave7-asset-storage-checklist.md](./C-013-wave7-asset-storage-checklist.md)

---

## 2026-07-07 End-of-night checkpoint — DEV S3 partial writeback proof

| Track | Status |
|-------|--------|
| **C-013 DEV S3 partial writeback proof** | **PASS** |
| **C-023 hash completion** | **PENDING** |
| **Dynamic path mapping** | **PENDING** |
| **DEV 070a/070b connection** | **NOT STARTED** |
| **Production cutover** | **NOT STARTED** |

**Live DEV scenario:** `Shooting Challenge - DEV - Upload Engine - S3 - v1`. Working chain: webhook → Get Record → HTTP download attachment → S3 `shooting-challenge-assets` → Airtable success update on **Submission Assets**.

**Test record:** `recBBi80bYuxXifVj` (Video Feedback / **070b**).

**Tested Storage Key:**

```text
shooting-challenge/2026-2027/shooting-challenge/schmidt-mike/2026-07-07-video-feedback-recBBi80bYuxXifVj-C013-Test.png
```

**Tested Canonical File URL:**

```text
https://shooting-challenge-assets.s3.us-east-2.amazonaws.com/shooting-challenge/2026-2027/shooting-challenge/schmidt-mike/2026-07-07-video-feedback-recBBi80bYuxXifVj-C013-Test.png
```

### Mike path convention (2026-07-07 — hardcoded in Make; dynamic mapping pending)

| Segment | Pattern |
|---------|---------|
| Folder prefix | `shooting-challenge/{seasonSlug}/{challengeSlug}/{athleteSlug}` |
| File name | `{date}-{assetType}-{assetRecordId}-{safeOriginalFileName}` |

Replaces earlier draft pattern `shooting-challenge/dev/{assetType}/{enrollmentRecordId}/…` for production path layout — update module **60** / **62** when converting to dynamic mappings (tomorrow step **C**).

### Confirmed writeback fields (partial)

`Upload Status = Uploaded`, **Storage Key**, **Canonical File URL**, **File Hash Algorithm = SHA-256**, **Uploaded At**, attachment retained, **Writeback Complete? = 1**. **File Content Hash** blank.

### Tomorrow A→G

A. Hash module → B. Write **File Content Hash** → C. Dynamic path/URL → D. Re-test video → E. Full manual PASS doc → F. DEV **070b** prep (after PASS) → G. C-020 **H2** before **H1**. Full detail: [Wave 7 checkpoint](./C-013-wave7-asset-storage-checklist.md#2026-07-07-end-of-night-checkpoint--dev-s3-partial-writeback-proof).

---

### Confirmed schema — File Hash Algorithm (OMNI 2026-07-07)

| Field | Table | Type | Exact write value |
|-------|-------|------|-------------------|
| **File Hash Algorithm** | Submission Assets | Single select | **`SHA-256`** — only option on DEV; **no new option needed** |

Make module **63** (success) and partial-failure paths must write the literal string **`SHA-256`** to match the single-select option name.

**Source blueprints (Drive — replace upload destination only):**

- [make/documentation/upload-asset-engine.md](../../make/documentation/upload-asset-engine.md)
- [make/documentation/upload-asset-engine-v2-hash-duplicate-check.md](../../make/documentation/upload-asset-engine-v2-hash-duplicate-check.md)
- [make/blueprints/upload-asset-engine-v2-with-file-hash-duplicate-check.json](../../make/blueprints/upload-asset-engine-v2-with-file-hash-duplicate-check.json)

**Working assumptions (Slice 2):**

- Make.com first for DEV; Lambda deferred unless Make cannot hash/upload reliably.
- **Storage Key pattern (Mike 2026-07-07):** `shooting-challenge/{seasonSlug}/{challengeSlug}/{athleteSlug}/{date}-{assetType}-{assetRecordId}-{safeOriginalFileName}` — **hardcoded in Make tonight**; dynamic mapping pending (step **C**). Earlier draft `shooting-challenge/dev/{assetType}/…` superseded for path layout.
- **Hash:** SHA-256
- Attachments stay in Airtable until later cleanup slice.
- **Google Drive File URL** stays legacy bridge until S3 proven.
- **070a/070b** remain OFF on DEV until this scenario is ready and Mike approves DEV webhook wiring.

---

## 1. Purpose

This document maps the **DEV Make upload scenario** from today’s **Google Drive writeback** to **S3 + canonical URL writeback** on **Submission Assets**.

Slice 1 added empty schema columns (**Canonical File URL**, **Storage Key**, hash fields). Slice 2 builds the Make path that:

1. Reads the same **070a/070b** webhook contract (v4.1 minimal payload).
2. Downloads the file from **Airtable Attachment** (fresh URL via Get Record).
3. Uploads to **program-owned S3**.
4. Writes **Canonical File URL**, **Storage Key**, and **SHA-256** hash back to Airtable.

Until this scenario succeeds on DEV test assets, **S3 is not the storage source of truth** — see [storage transition section](./C-013-wave7-asset-storage-checklist.md#storage-source-of-truth-transition) in the Wave 7 checklist.

**2026-07-07 partial proof:** One DEV video asset has S3 object + **Canonical File URL** + **Storage Key** populated; **File Content Hash** still blank — see [partial PASS artifact](../../tools/airtable/_preview/c013-dev-s3-writeback-partial-pass-recBBi80bYuxXifVj.json).

---

## 2. Current Make behavior

Today’s Upload Engine (v1 / v2 hash blueprint):

| Step | Actor | Behavior |
|------|-------|----------|
| 1 | **070a** / **070b** | Require `Upload Status = Pending Link`, `Airtable Attachment` present; POST v4.1 webhook (`submissionAssetRecordId`, `routeKey`, `uploadDestination`, …); set **`Processing`** after Make accepts |
| 2 | Make module **1** | Custom webhook receives payload |
| 3 | Make module **2** | **Airtable Get Record** — Submission Asset (re-fetch attachment URL) |
| 4 | Make module **5** | **HTTP GET** — download file from `Airtable Attachment[].url` |
| 5 | Make modules **50–52** (v2 only) | Hash helper POST → duplicate hash lookup → write duplicate flags (upload continues) |
| 6 | Make modules **20–45** | **Google Drive** — search/create athlete folder, upload file |
| 7 | Make Airtable update | **Submission Assets:** `Upload Status = Uploaded`, **Google Drive File URL**, folder/file IDs, **Uploaded At**; **Video Feedback** child fields when video path |
| 8 | On failure | **Upload Status = Error**, **Upload Error** message ([error-handling guide](../../make/documentation/upload-asset-engine-error-handling.md)) |

**070a/070b do not send attachment bytes** — Make re-reads the asset row (v4.1 design).

---

## 3. Target DEV Make behavior

For each **Submission Asset** webhook run:

```text
Webhook (070a/070b v4.1)
  → Airtable Get Record (Submission Assets) — fresh attachment URL + lookups
  → Router: attachment missing? → Error writeback
  → HTTP GET file from attachment URL
  → SHA-256 hash (Make crypto module OR reuse v2 hash-helper HTTP)
  → Optional: C-023 duplicate hash lookup (HTTP GET Airtable API — same as v2 module 52, DEV base)
  → Build Storage Key from pattern + field lookups
  → AWS S3 Upload Object (DEV bucket)
  → Build Canonical File URL (CloudFront or S3 HTTPS URL — Mike config)
  → Airtable Update Record — success fields on Submission Assets
  → (Optional) mirror URL/status to Homework Completions / Video Feedback via existing 022 chain later — Slice 2 proof is asset row first
```

**Per asset outcomes:**

| Outcome | Submission Assets |
|---------|-------------------|
| Success | `Uploaded` + canonical URL + storage key + hash + timestamp |
| Failure | `Error` + readable `Upload Error`; canonical/key/hash blank unless partially computed |

**Not in Slice 2:** clear **Airtable Attachment**; stop writing Drive URL; switch formulas/views.

---

## 4. Make module map

Draft module plan — clone **v2 hash blueprint**, **remove Drive modules 20–45**, insert S3 path after hash/duplicate step.

| # | Module | App / action | Purpose | Notes |
|---|--------|--------------|---------|-------|
| **1** | Custom webhook | Intake | Same v4.1 fields as today: `submissionAssetRecordId`, `routeKey`, `uploadDestination`, `targetRecordId`, … | New **DEV-only** hook URL; do not overwrite Production hook |
| **2** | Airtable → Get a record | Load asset | Base **DEV** `appTetnuCZlCZdTCT`, table **Submission Assets**, id `{{1.submissionAssetRecordId}}` | Fields: `Airtable Attachment`, `Original File Name`, `Asset Purpose`, `Asset Type`, `Enrollment - Linked`, `Submission - Linked`, `Upload Status`, `Upload Error` |
| **30** | Router | Attachment gate | Branch: `Airtable Attachment` URL exists | No URL → module **31** error writeback |
| **31** | Airtable → Update record | Error (no file) | `Upload Status = Error`, `Upload Error = No Airtable Attachment URL` | Same record id |
| **5** | HTTP → Get a file | Download | URL = `{{2.Airtable Attachment[1].url}}` (fresh from module 2) | Binary body for hash + S3 |
| **50** | HTTP → Make a request **or** Crypto | Hash | Output: `sha256`, `sizeBytes`, `mimeType` | Reuse v2 hash-helper if already deployed; else Make **Hash** module with SHA-256 |
| **52** | HTTP → GET Airtable API | Duplicate lookup (C-023) | Same formula as v2 doc; base **DEV** `appTetnuCZlCZdTCT`, table `tblhMLKxQK77agtME` | Flag only — do not block upload in Slice 2 unless Mike changes policy |
| **51** | Airtable → Update record | Duplicate flags | Optional mid-path: hash + duplicate fields; if writing algorithm here use **`File Hash Algorithm = SHA-256`** | Can merge into module **63** |
| **60** | Tools → Set variable **or** Text parser | Build **Storage Key** | See pattern below | Sanitize `originalFileName` (spaces → `-`, strip path chars) |
| **61** | AWS → S3 → Upload a file | Put object | Bucket: **DEV bucket** (Mike); Key: `{{60.storageKey}}`; Body: module **5** output | IAM connection in Make — not in GitHub |
| **62** | Tools → Set variable | Build **Canonical File URL** | `https://{cloudfront-or-bucket-host}/{{60.storageKey}}` OR presigned URL module | Mike chooses public CloudFront vs private + presigned |
| **63** | Airtable → Update record | **Success writeback** | §5 locked contract — includes **`File Hash Algorithm = SHA-256`** | Record id `{{1.submissionAssetRecordId}}` |
| **EH** | Scenario error handler | Failure path | See §6 | Never leave `Processing` stuck |

**Remove (from v2 clone):** Google Drive modules **20, 21, 19, 17, 36, 38, 42, 43, 24, 39, 40, 44, 45**.

### Storage Key build (module 60)

Template:

```text
shooting-challenge/dev/{assetType}/{enrollmentRecordId}/{submissionRecordId}/{assetRecordId}/{originalFileName}
```

| Token | Source (module 2) |
|-------|-------------------|
| `assetType` | Map `Asset Purpose` / `Asset Type`: e.g. `homework` \| `video` \| `headshot` |
| `enrollmentRecordId` | First linked id from `Enrollment - Linked` |
| `submissionRecordId` | First linked id from `Submission - Linked` |
| `assetRecordId` | `{{1.submissionAssetRecordId}}` |
| `originalFileName` | `Original File Name` or attachment filename fallback |

---

## 5. Airtable success writeback

**Table:** Submission Assets  
**Record:** `{{1.submissionAssetRecordId}}`  
**Base:** DEV `appTetnuCZlCZdTCT`

### Locked success contract (module 63)

| Field | Value |
|-------|--------|
| **Upload Status** | `Uploaded` |
| **Canonical File URL** | Final S3 / CloudFront / presigned **HTTPS URL** from module **62** |
| **Storage Key** | Generated object key from module **60** |
| **File Content Hash** | SHA-256 hex string from module **50** |
| **File Hash Algorithm** | **`SHA-256`** (exact single-select option — OMNI confirmed) |
| **Uploaded At** | Current timestamp (`{{now}}`; America/Denver if matching field config) |
| **Upload Error** | blank |

**Optional same update (C-023 v2 parity):** `File Size Bytes`, `File MIME Type`, duplicate flag fields from module **51**.

**Do not write in Slice 2 success path (leave unchanged):**

- **Google Drive File URL** / Drive IDs — legacy; may still exist on row
- **Airtable Attachment** — keep until cleanup slice

**022 / child tables:** Slice 2 proof targets **Submission Assets** first. After asset proof, Slice 3 can extend **022** to sync **Canonical File URL** to Homework Completions / Video Feedback.

---

## 6. Airtable failure writeback

**Scenario-level error handler** + explicit router branch (module **31**).

### Locked failure contract

| Field | Value |
|-------|--------|
| **Upload Status** | `Error` |
| **Upload Error** | Human-readable error (≤500 chars), e.g. `Make S3 upload failed: {{error.message}}` or `No Airtable Attachment URL` |
| **Canonical File URL** | blank |
| **Storage Key** | blank *(unless S3 object was created — then include key for ops recovery)* |
| **File Content Hash** | blank *(unless hash was computed before failure)* |
| **File Hash Algorithm** | blank *(unless hash was computed — then **`SHA-256`**)* |

If hash was written in module **51** before S3 failure, leave hash fields populated; set **Upload Status = Error** and explain in **Upload Error**.

**Video Feedback:** Mirror **Upload Status** + **Upload Error** on linked VF row when `uploadDestination = Video Feedback` (same pattern as [error-handling guide](../../make/documentation/upload-asset-engine-error-handling.md)).

---

## 7. DEV test plan (C-020 harness)

**Prerequisites:** DEV Make S3 scenario live; **070a/070b ON** on DEV with DEV webhook URL only; Schmidt enrollment `recgP9qZYjAhE7NXm`.

| Test | C-020 pattern | Pass criteria |
|------|---------------|---------------|
| **H1** | Homework **1-file** (clone Test G, new date) | **115** → **009/020** unchanged; **070a** → Make → asset: `Uploaded`, **Canonical File URL**, **Storage Key**, **File Content Hash**, algorithm `SHA-256`; **Airtable Attachment** still present |
| **H2** | Video **1-file** (clone Test F) | **115** → **009/013** unchanged; **070b** → same writeback on asset |
| **H3** | Homework **2-file** (Test G style) | **2** Submission Assets; each row gets distinct URL/key/hash + **`File Hash Algorithm = SHA-256`**; **1** Homework Completion links both (**020** dedupe unchanged) |
| **H4** | Video **2-file** (Test F style) | **2** assets + **2** Video Feedback rows; each asset gets URL/key/hash + **`File Hash Algorithm = SHA-256`** |

**Verification commands (read-only):**

```powershell
python tools/airtable/_probe_c013_asset_storage_fields.py --out tools/airtable/_preview/c013-dev-after-s3-h1.json
```

Confirm counts: `withCanonicalFileUrl`, `withStorageKey`, `withFileContentHash` > 0 for new test assets only.

**Manual webhook (pre-harness):** Partial PASS 2026-07-07 on `recBBi80bYuxXifVj` — canonical URL + storage key only; hash pending before H1–H4.

---

## 8. Do not switch yet

Until Slice 2 + Slice 4 pass on DEV:

- **Do not** clear **Airtable Attachment** on success.
- **Do not** remove **Google Drive File URL** or Drive ID fields.
- **Do not** repoint formulas (`Upload Ready?`, `Writeback Complete?`, …), coach views, **022**, **071/073**, or web to **Canonical File URL**.
- **Do not** enable Production Make scenario or Production **070a/070b** webhook.
- **Do not** paste Airtable automation script changes to Production.

---

## Mike / ops inputs (not in GitHub)

| Input | Used by |
|-------|---------|
| DEV S3 bucket name | Module **61** |
| Make AWS connection (IAM) | Module **61** |
| CloudFront distribution host **or** presigned URL policy | Module **62** |
| DEV Make webhook URL | DEV **070a/070b** input `makeWebhookUrl` when enabled |
| Scoped Airtable PAT (duplicate lookup only) | Module **52** — store in Make, not repo |

---

## Related

| Doc | Topic |
|-----|--------|
| [C-013-wave7-asset-storage-checklist.md](./C-013-wave7-asset-storage-checklist.md) | Wave 7 slices + cutover rules |
| [asset-storage-migration.md](../asset-storage-migration.md) | Architecture target |
| [C-020-testing-scenarios-script-checklist.md](./C-020-testing-scenarios-script-checklist.md) | Harness Tests F/G → H1–H4 |
