# C-023 — Lambda / Make duplicate-hash contract (Stage 1)

**Date:** 2026-07-12  
**Worker:** B — Overnight V2 Stage 1  
**Branch:** `overnight/v2-run/worker-b-s1-c023-lambda-contract`  
**Base SHA:** `ba6c844`  
**Status:** **COMPLETE** — repo code aligned; no logic changes required tonight  
**Policy parent:** [C-023-production-duplicate-policy.md](../../docs/deploy-checklists/C-023-production-duplicate-policy.md)  
**Code:** `lambda/upload-asset/upload_core/duplicate.py`, `processor.py`, `fields.py`

**Hard stops (overnight):** DEV + repo only · no PROD deploy · no upload blocking · no S3 object reuse · no record/S3 deletion · no automation edits

---

## Locked behavior (owner decisions)

| Rule | Contract |
|------|----------|
| Detection | SHA-256 (`File Content Hash`) on downloaded bytes before S3 `PutObject` |
| Lookup scope | Global hash match among `Upload Status = Uploaded` records (exclude current `RECORD_ID()`) |
| On duplicate bytes | **Flag only** — upload and downstream processing **continue** |
| Review queue | `Potential Asset Reuse? = true` when same-enrollment contextual match warrants manual review |
| Upload block | **Never** — `c023Duplicate.uploadBlocked` is always `false` |
| S3 | **Always** new `PutObject` → new `Storage Key` + `Canonical File URL` per asset |
| Reuse prior object | **Never** copy another asset's storage key, canonical URL, or S3 object |
| Delete | **Never** delete files, S3 objects, or Airtable records from upload Lambda |
| Cross-enrollment | Informational only — `Potential Asset Reuse?` stays `false` |
| Human decision | Lambda **must not** overwrite nonblank `Asset Reuse Decision` (except init to `Not Reviewed` when blank) |
| Legacy field | `File is Duplicate?` — **not written** by Lambda (deprecated writer) |

**"Needs Review" tonight** means the **review queue via `Potential Asset Reuse?`**, not `Upload Status` hold and not automatic `Duplicate File Status = Needs Review` on every hash match. Technical status uses `Duplicate File Status`: `Unique`, `Exact Duplicate`, or `Error`.

---

## Processing sequence (Lambda)

```text
1. Validate route / claim (C-013)
2. Download attachment bytes
3. Compute SHA-256
4. lookup_duplicate_matches() — global hash, Uploaded only
5. classify_duplicate_matches() — partition same vs cross enrollment; reason codes
6. build_review_writeback() — review fields (separate PATCH)
7. upload_s3() — ALWAYS new object (steps 4–6 do not gate step 7)
8. PATCH upload writeback (Uploaded + canonical + hash + metadata)
9. PATCH review writeback (best effort; failure does not revert upload)
10. Return full Lambda JSON including c023Duplicate + writebackVerification
```

**Same-record retry:** `already_uploaded()` → `skipped_already_uploaded` — no second S3 object, no duplicate re-check.

---

## Make integration — synchronous JSON path (DEV PASS)

**Scenario:** `Shooting Challenge - DEV - Upload Engine - Lambda - v1`  
**Flow:** Webhook → Router (070a/070b) → HTTP POST Lambda Function URL → **Module 16 returns `{{14.data}}`** (complete Lambda body).

Make does **not** parse Airtable writeback for duplicate state on this path. Consumers read **`c023Duplicate`** and top-level success fields from the Lambda response.

| Make need | Lambda JSON path |
|-----------|------------------|
| Upload succeeded | `ok`, `statusOut` (`success` \| `skipped` \| `error`), `actionOut` |
| New S3 object | `s3.storageKey`, `s3.canonicalFileUrl` |
| Hash | `hash.hex`, `hash.algorithm` (`SHA-256`) |
| Duplicate flagged | `c023Duplicate.potentialAssetReuse` |
| Upload never blocked for duplicate | `c023Duplicate.uploadBlocked` (**always `false`**) |
| Review reasons | `c023Duplicate.reviewReasons`, `c023Duplicate.primaryReason` |
| Primary prior asset | `c023Duplicate.primaryMatchId` |
| Match inventory | `c023Duplicate.duplicateMatches[]` |
| Review PATCH outcome | `c023Duplicate.reviewWritebackApplied`, `c023Duplicate.reviewWritebackError` |
| Writeback smoke | `writebackVerification.allPass` |

**070c:** Not required on current DEV sync-JSON path (per LEAD-AUTHORIZED-START). Accepted-only async path is out of scope for this contract.

---

## Lambda response — top-level fields (success upload)

Returned by `process_upload_asset()` in `processor.py`:

| Field | Type | Meaning |
|-------|------|---------|
| `ok` | bool | `true` on successful upload path |
| `statusOut` | string | `success` \| `skipped` \| `error` |
| `actionOut` | string | `uploaded` \| `skipped_already_uploaded` \| claim/skip variants \| errors |
| `submissionAssetRecordId` | string | Submission Assets `rec…` |
| `routeKey` | string | `homework_completion` \| `video_feedback` |
| `automationNumber` | string | `070a` \| `070b` |
| `s3.bucket` | string | Target bucket |
| `s3.region` | string | AWS region |
| `s3.storageKey` | string | **New** key for this asset |
| `s3.canonicalFileUrl` | string | **New** canonical URL |
| `hash.algorithm` | string | `SHA-256` |
| `hash.hex` | string | 64-char lowercase hex |
| `hash.valid64CharHex` | bool | Format guard |
| `c023Duplicate` | object | Duplicate contract (below) |
| `writebackApplied` | object | Merged upload + review PATCH fields (debug) |
| `writebackVerification` | object | Boolean gates for smoke / Make validators |
| `durationMs` | number | Wall time |

Early exits (`skipped_already_uploaded`, claim skips) return a **reduced** body without `c023Duplicate` — duplicate detection runs only on the full upload path.

---

## `c023Duplicate` object (`build_c023_duplicate_report`)

| Field | Type | Writer | Meaning |
|-------|------|--------|---------|
| `currentAssetId` | string | Lambda | Uploading Submission Asset id |
| `computedSha256` | string | Lambda | SHA-256 of bytes uploaded |
| `duplicateLookupPerformed` | bool | Lambda | `true` if Airtable lookup ran |
| `exactHashMatchFound` | bool | Lambda | ≥1 global Uploaded hash match |
| `sameEnrollmentMatchCount` | int | Lambda | Same-enrollment matches |
| `crossEnrollmentMatchCount` | int | Lambda | Other-enrollment matches |
| `duplicateMatchCount` | int | Lambda | Total matches returned |
| `duplicateMatches` | array | Lambda | `{ recordId, enrollmentId }` per match |
| `reviewReasons` | string[] | Lambda | All reason codes (incl. informational) |
| `primaryReason` | string \| null | Lambda | Highest-severity same-enrollment reason |
| `primaryMatchId` | string \| null | Lambda | Primary prior asset for review UI |
| `potentialAssetReuse` | bool | Lambda | **Queue flag** — same as `Potential Asset Reuse?` writeback |
| `reviewSummary` | string | Lambda | Human-readable current vs prior summary |
| `reviewWritebackApplied` | bool | Lambda | Review PATCH succeeded |
| `reviewWritebackError` | string | Lambda | Review PATCH error text (truncated) |
| `uploadBlocked` | bool | Lambda | **Always `false`** — contract invariant |
| `notes` | string | Lambda | Static: warning-only processing |

### Review reason codes (stable strings)

| Code | When |
|------|------|
| `Homework Used for Video Feedback` | HW bytes reused for VF |
| `Video Feedback Used for Homework` | VF bytes reused for HW |
| `Different Assignment Reuse` | Same enrollment, different homework assignment |
| `Different Week Reuse` | Same enrollment, different week |
| `Different Submission Reuse` | Same enrollment, different submission |
| `Same Assignment Resubmission` | Same assignment context resubmit |
| `Missing Context` | Hash match but scope fields incomplete |
| `Multiple Prior Uses` | >1 same-enrollment prior match |
| `Cross-Type Reuse` | Same enrollment, different asset type (generic) |
| `Cross-Enrollment Match — Informational` | Different enrollment only — **does not** set `potentialAssetReuse` |

---

## Airtable writeback — upload PATCH (always)

Written **before** review PATCH; sets terminal success:

| Field | Value |
|-------|-------|
| `Upload Status` | `Uploaded` |
| `Canonical File URL` | New URL for this upload |
| `Storage Key` | New key |
| `File Content Hash` | SHA-256 hex |
| `File Hash Algorithm` | `SHA-256` |
| `Uploaded At` | America/Denver ISO timestamp |
| `File Size Bytes` | Byte length |
| `File MIME Type` | Guessed MIME |
| `Upload Error` | cleared (`null`) |

---

## Airtable writeback — review PATCH (`build_review_writeback`)

### No global hash match

| Field | Value |
|-------|-------|
| `Exact Hash Match Found?` | `false` |
| `Same Enrollment Match Found?` | `false` |
| `Duplicate File Status` | `Unique` |
| `Duplicate Match Strength` | `Exact SHA-256 Hash` |
| `Potential Asset Reuse?` | `false` |
| `Duplicate Match Record` | `[]` |
| `Duplicate Match Records (All)` | `[]` |
| `Asset Reuse Review Summary` | cleared |
| `Asset Reuse Review Reasons` | `[]` |
| `Asset Reuse Review Primary Reason` | cleared |
| `Duplicate Match Notes` | `No matching file hash found.` |
| `Duplicate Checked At` | UTC ISO |
| `Duplicate Check Error` | cleared |
| `Asset Reuse Decision` | `Not Reviewed` if blank |

### Global hash match — cross-enrollment only

| Field | Value |
|-------|-------|
| `Exact Hash Match Found?` | `true` |
| `Same Enrollment Match Found?` | `false` |
| `Duplicate File Status` | `Exact Duplicate` |
| `Potential Asset Reuse?` | **`false`** |
| `Duplicate Match Record` | optional informational link (first cross match) |
| Notes / summary | Informational cross-enrollment text |

### Global hash match — same enrollment (review queue)

| Field | Value |
|-------|-------|
| `Exact Hash Match Found?` | `true` |
| `Same Enrollment Match Found?` | `true` |
| `Duplicate File Status` | `Exact Duplicate` |
| `Potential Asset Reuse?` | **`true`** when contextual `reuse_reasons` non-empty |
| `Asset Reuse Review Primary Reason` | Highest-severity reason |
| `Asset Reuse Review Reasons` | All non-informational reasons |
| `Asset Reuse Review Summary` | Plain-language comparison |
| `Duplicate Match Record` | Primary prior asset (single link) |
| `Duplicate Match Records (All)` | All same-enrollment match ids |
| `Duplicate Match Notes` | Summary + optional informational note |
| `Asset Reuse Decision` | `Not Reviewed` if blank; **omitted** if Mike locked decision |

### Lookup / hash failure (upload still succeeds if S3 OK)

| Field | Value |
|-------|-------|
| `Duplicate File Status` | `Error` |
| `Duplicate Match Strength` | `Manual Review` |
| `Duplicate Check Error` | Error text |
| `Exact Hash Match Found?` | `false` |

If review PATCH fails after upload PATCH: asset remains **`Uploaded`** with canonical/hash; `reviewWritebackError` populated in Lambda JSON; ops may retry review fields.

---

## `writebackVerification` gates

| Key | Pass when |
|-----|-----------|
| `canonicalUrlPopulated` | Canonical URL written |
| `storageKeyPopulated` | Storage key written |
| `fileContentHashPopulated` | Valid 64-char hash |
| `fileHashAlgorithmSha256` | Algorithm field = `SHA-256` |
| `uploadedAtPopulated` | Timestamp written |
| `uploadStatusUploaded` | Status = `Uploaded` |
| `uploadErrorCleared` | Upload Error null |
| `duplicateLookupPerformed` | Lookup attempted |
| `reviewWritebackApplied` | Review PATCH OK (may be `false` on partial failure) |
| `allPass` | Core upload + lookup gates true (excludes `reviewWritebackApplied`) |

---

## Contract invariants (tests enforce)

| Invariant | Test / code evidence |
|-----------|----------------------|
| `uploadBlocked === false` | `build_c023_duplicate_report` |
| S3 always on duplicate match | `test_each_distinct_asset_uploads_independently` |
| Upload preserved if review PATCH fails | `test_review_writeback_failure_preserves_upload` |
| Cross-enrollment → no reuse flag | `test_cross_enrollment_informational_only` |
| Same-enrollment contextual → reuse flag | `test_default_decision_initialized_when_blank` |
| Mike decision not overwritten | `test_human_decision_never_overwritten` |
| No `File is Duplicate?` writer | `fields.py` legacy comment only |

---

## Alignment audit (2026-07-12)

| Area | Repo state | Gap? |
|------|------------|------|
| Flag-only duplicate | Lookup before S3; upload always proceeds | **None** |
| `uploadBlocked` | Hardcoded `false` in report | **None** |
| Independent S3 | `build_storage_key` per record; always `put_object` | **None** |
| Review fields | `fields.py` constants match DEV schema | **None** |
| Decision guard | `_apply_decision_guard` / `human_decision_is_locked` | **None** |
| Legacy `File is Duplicate?` | Not in writeback | **None** |

**Code changes tonight:** None required.

---

## Related

| Doc | Topic |
|-----|--------|
| [C-023-production-duplicate-policy.md](../../docs/deploy-checklists/C-023-production-duplicate-policy.md) | Full policy + schema |
| [C-013-dev-070a-homework-lambda-runbook.md](./C-013-dev-070a-homework-lambda-runbook.md) | DEV Make sync JSON path |
| [lambda/upload-asset/README.md](../../lambda/upload-asset/README.md) | Local test command |

**Unit tests:** `cd lambda/upload-asset && python -m unittest discover -s tests -p "test_*.py"`
