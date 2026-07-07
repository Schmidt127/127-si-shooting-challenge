# C-013 — DEV Make S3 build packet (Mike / ops)

**Use in:** Make.com UI — build DEV scenario only  
**Base:** DEV `appTetnuCZlCZdTCT`  
**Table:** Submission Assets (`tblhMLKxQK77agtME`)  
**Architecture map:** [C-013-make-s3-writeback-mapping.md](./C-013-make-s3-writeback-mapping.md)  
**Wave 7 checklist:** [C-013-wave7-asset-storage-checklist.md](./C-013-wave7-asset-storage-checklist.md)

---

## 1. Build objective

- Create a **DEV-only** Make scenario that uploads **Submission Assets** files to **S3** and writebacks **Canonical File URL**, **Storage Key**, and **SHA-256** hash fields.
- **Do not** modify or repoint the **Production** Upload Engine scenario or Production webhook.
- **Do not** enable DEV **070a** / **070b** until a **manual webhook test** on one asset succeeds and writeback is verified in Airtable.
- Slice 2 proof only — attachments and **Google Drive File URL** stay on rows; no formula/view/script cutover.

**Suggested scenario name:** `Shooting Challenge - DEV - Upload Engine - S3 - v1`

---

## 2. Required decisions / placeholders

Fill these in Make or ops notes (never commit values to GitHub):

| Placeholder | Value | Notes |
|-------------|-------|-------|
| **DEV S3 bucket name** | TBD | e.g. `127si-shooting-challenge-dev` |
| **AWS connection name in Make** | TBD | IAM user/role with `s3:PutObject` on DEV bucket |
| **Canonical URL mode** | TBD | **CloudFront HTTPS URL** *or* **S3 presigned URL** |
| **CloudFront host** (if used) | TBD | e.g. `d1234abcd.cloudfront.net` — prefix in URL builder |
| **DEV webhook URL** | TBD | Copy from new scenario Custom Webhook module after save |

---

## 3. Scenario source

1. In Make, **duplicate or import** [upload-asset-engine-v2-with-file-hash-duplicate-check.json](../../make/blueprints/upload-asset-engine-v2-with-file-hash-duplicate-check.json).
2. Rename scenario per §1; bind a **new** Custom Webhook (do not reuse Production hook id).
3. **Repoint all Airtable modules** to DEV base `appTetnuCZlCZdTCT`.
4. **Remove or disable** Google Drive modules **20, 21, 19, 17, 36, 38, 42, 43, 24, 39, 40, 44, 45**.
5. **Keep** (adapt for DEV base id):
   - Webhook **1** → Get Record **2** → attachment router **30**
   - HTTP download **5**
   - Hash **50** (or Make Crypto SHA-256)
   - Duplicate lookup **52** + flag write **51** (optional but recommended)
6. **Insert after hash/duplicate:**
   - Build **Storage Key** (module **60**)
   - **AWS S3 → Upload a file** (module **61**)
   - Build **Canonical File URL** (module **62**)
   - Success Airtable update **63**

Detail: [C-013-make-s3-writeback-mapping.md §4](./C-013-make-s3-writeback-mapping.md#4-make-module-map)

---

## 4. Required Airtable inputs (Get Record — module 2)

**Base:** DEV `appTetnuCZlCZdTCT`  
**Table:** Submission Assets  
**Record ID:** `{{1.submissionAssetRecordId}}`

| Field | Use |
|-------|-----|
| **RecordId** (formula) or record id from webhook | Sanity / logging |
| **Airtable Attachment** | Fresh download URL (module **5**) |
| **Original File Name** | Storage Key filename segment |
| **Asset Type** | Map to `assetType` token (`homework` / `video` / …) |
| **Asset Slot** | Optional logging / future naming |
| **Enrollment - Linked** | First linked record id → `enrollmentRecordId` |
| **Submission - Linked** | First linked record id → `submissionRecordId` |
| **Upload Status** | Pre-check (expect `Pending Link` or `Processing` during test) |
| **Send to Make Trigger** | Not required in Make — Airtable **070a/b** sets before send |
| **Ready to Send to Make?** | Coach/formula gate — not used inside Make |

Also useful: **Asset Purpose**, **Upload Destination**, **Upload Error** (clear on success).

---

## 5. Storage Key formula

**Pattern:**

```text
shooting-challenge/dev/{assetType}/{enrollmentRecordId}/{submissionRecordId}/{assetRecordId}/{safeOriginalFileName}
```

| Token | Make mapping |
|-------|----------------|
| `assetType` | Lowercase map from **Asset Type** or **Asset Purpose** (e.g. `Homework 1` → `homework`, `Video For Feedback` → `video`) |
| `enrollmentRecordId` | First id from **Enrollment - Linked** |
| `submissionRecordId` | First id from **Submission - Linked** |
| `assetRecordId` | `{{1.submissionAssetRecordId}}` |
| `safeOriginalFileName` | **Original File Name** — replace spaces with `-`, strip `/\` and other path chars |

Example:

```text
shooting-challenge/dev/homework/recgP9qZYjAhE7NXm/recfVEP3SAmPP6jiw/recW63hxae641BCco/HW1-test.pdf
```

---

## 6. Success writeback (module 63)

**Table:** Submission Assets  
**Record ID:** `{{1.submissionAssetRecordId}}`

| Field | Value |
|-------|--------|
| **Upload Status** | `Uploaded` |
| **Canonical File URL** | Generated HTTPS URL (CloudFront or presigned) |
| **Storage Key** | Module **60** output |
| **File Content Hash** | SHA-256 hex digest from module **50** |
| **File Hash Algorithm** | **`SHA-256`** (exact single-select option) |
| **Uploaded At** | `now` |
| **Upload Error** | blank |

**Do not clear** **Airtable Attachment**. **Do not overwrite** **Google Drive File URL** in Slice 2.

---

## 7. Failure writeback

**Router branch (no attachment)** + **scenario error handler**.

| Field | Value |
|-------|--------|
| **Upload Status** | `Error` |
| **Upload Error** | Clear human-readable message (≤500 chars) |
| **Canonical File URL** | blank |
| **Storage Key** | blank *(unless S3 object was created — then keep key for recovery)* |
| **File Content Hash** | blank *(unless hash computed)* |
| **File Hash Algorithm** | blank *(unless hash computed — then **`SHA-256`**)* |

If `uploadDestination = Video Feedback`, mirror **Upload Status** + **Upload Error** on `{{1.targetRecordId}}` (same as [error-handling guide](../../make/documentation/upload-asset-engine-error-handling.md)).

---

## 8. Manual webhook test

**Before enabling 070a/070b on DEV.**

### Pick a candidate asset

On DEV **Submission Assets**, choose one row:

- **Upload Status** = `Pending Link`
- **Airtable Attachment** present
- **Google Drive File URL** blank *(preferred for clean S3 proof; legacy Drive URL ok for first test)*
- Homework: **Homework Completions** linked; Video: **Video Feedback** linked

Example Pending Link assets from 2026-07-07 inventory: `recBBi80bYuxXifVj`, `recIYFnfmsPcy7iop`, `recKQNVzYHHBHS2Qg` — verify current state in UI before use.

**Preflight PASS (2026-07-07):** [`recBBi80bYuxXifVj`](../../tools/airtable/_preview/c013-manual-webhook-recBBi80bYuxXifVj.json) — **VIDEO** asset (`070b` / `video_feedback`); attachment present; canonical/key/hash blank; `Pending Link`. Use **Make UI runbook:** [C-013-dev-s3-make-ui-runbook.md](../../make/documentation/C-013-dev-s3-make-ui-runbook.md).

### v4.1 webhook payload (070a / 070b contract)

Make **Custom Webhook** must accept these fields (070a/070b v4.1 — see automation **070a** docblock):

**Homework example:**

```json
{
  "sourceName": "Airtable Upload Engine",
  "automationNumber": "070a",
  "sentAtIso": "2026-07-07T12:00:00.000Z",
  "routeKey": "homework_completion",
  "uploadDestination": "Homework Completions",
  "sourceTable": "Submission Assets",
  "submissionAssetRecordId": "recXXXXXXXXXXXXXX",
  "targetTable": "Homework Completions",
  "targetRecordId": "recXXXXXXXXXXXXXX"
}
```

**Video example (confirmed test asset `recBBi80bYuxXifVj` — use this for first manual test):**

```json
{
  "sourceName": "Airtable Upload Engine",
  "automationNumber": "070b",
  "sentAtIso": "2026-07-07T18:00:00.000Z",
  "routeKey": "video_feedback",
  "uploadDestination": "Video Feedback",
  "sourceTable": "Submission Assets",
  "submissionAssetRecordId": "recBBi80bYuxXifVj",
  "targetTable": "Video Feedback",
  "targetRecordId": "recjdf9cSiw1ADs0T"
}
```

Replace `submissionAssetRecordId`, `targetRecordId`, and `sentAtIso` with live values. Make module **2** re-fetches the asset — webhook does **not** include attachment bytes or URLs.

### Manual test steps

1. In Make, open scenario → Custom Webhook → **Run once** / copy webhook URL.
2. POST JSON (Postman or Make “Redetermine data structure” with sample above).
3. Confirm scenario completes green.
4. In Airtable DEV, open the asset row — verify §6 success fields populated.
5. Optional read-only probe:

```powershell
python tools/airtable/_probe_c013_asset_storage_fields.py --out tools/airtable/_preview/c013-dev-after-manual-webhook.json
```

**Pass:** `Upload Status = Uploaded`, **Canonical File URL** and **Storage Key** non-empty, **File Content Hash** + **File Hash Algorithm = SHA-256**.

---

## 9. C-020 proof tests (after manual webhook passes)

Enable DEV **070a/070b** with **DEV webhook URL only** → run via **115** harness (Schmidt `recgP9qZYjAhE7NXm`):

| Test | Pattern | Route |
|------|---------|-------|
| **H1** | Homework 1-file | **070a** |
| **H2** | Video 1-file | **070b** |
| **H3** | Homework 2-file | **070a** × 2 assets |
| **H4** | Video 2-file | **070b** × 2 assets |

Confirm **009/020/013** unchanged; each new asset gets canonical URL + key + hash. See [mapping doc §7](./C-013-make-s3-writeback-mapping.md#7-dev-test-plan-c-020-harness).

---

## 10. Hard stops

- **No Production** base, scenario, webhook, or **070a/b** paste.
- **No** clearing **Airtable Attachment** after upload.
- **No** removing **Google Drive File URL** / Drive ID fields.
- **No** switching formulas, views, **022**, emails, or web to **Canonical File URL** until Slice 3–4 cutover rules met.
- **No** secrets in GitHub (bucket creds, webhook URL, PAT for module **52** live in Make only).

---

## Build checklist (ops)

- [ ] DEV scenario created; Production untouched
- [ ] Airtable modules use DEV base `appTetnuCZlCZdTCT`
- [ ] Drive modules removed; S3 upload inserted
- [ ] Placeholders §2 filled in Make
- [ ] Manual webhook test §8 PASS on one asset
- [ ] DEV **070a/b** enabled with DEV webhook URL only
- [ ] C-020 H1–H4 PASS
- [ ] Record results in Wave 7 checklist
