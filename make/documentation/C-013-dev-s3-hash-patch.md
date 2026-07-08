# C-013 / C-023 — DEV S3 hash patch (Make UI)

**Scenario:** `Shooting Challenge - DEV - Upload Engine - S3 - v1`  
**Owner:** Mike  
**Environment:** DEV only — base `appTetnuCZlCZdTCT`  
**Backlog:** C-013, C-023 (hash writeback slice — duplicate lookup optional later)

> **2026-07-08:** Make **Amazon S3 Upload** **PARKED** (timeout). Runtime = **[SDK / hybrid](../../docs/deploy-checklists/C-013-sdk-hybrid-runtime.md)**. Extend [`c013_dev_s3_upload_proof.py`](../../tools/airtable/c013_dev_s3_upload_proof.py) for H2 + C-023 duplicate — not Make hash/S3 modules.

**Goal:** Add SHA-256 hash of downloaded file bytes **after HTTP download** and write **File Content Hash** on success Airtable update.

**Hard stops:** Do **not** enable DEV **070a/070b**. Do **not** touch Production. Do **not** clear attachments or Drive fields. No secrets in GitHub.

---

## Current proven chain (5 modules)

| # | Module | Status |
|---|--------|--------|
| 1 | Custom webhook | Working |
| 2 | Airtable Get Record — Submission Assets | Working |
| 3 | HTTP — download Airtable Attachment URL | Working |
| 4 | Amazon S3 Upload → `shooting-challenge-assets` | Working |
| 5 | Airtable Update Record — canonical writeback | Working (hash field **missing**) |

---

## Target chain (6 modules)

```text
1 Webhook
→ 2 Get Record
→ 3 HTTP download
→ 4 Hash (NEW — SHA-256 of module 3 file bytes)
→ 5 S3 Upload (was 4)
→ 6 Airtable success update (was 5)
```

Hash **must** run on the **same binary** uploaded to S3 (module 3 output → hash → S3).

---

## Step 1 — Insert hash module after HTTP download

1. Open scenario in Make → click **+** between module **3** (HTTP) and module **4** (S3).
2. Choose one option below.

### Option A — Make native Hash (preferred if it accepts file body)

| Setting | Value |
|---------|--------|
| App | **Tools → Hash** (or **Crypto → Hash**) |
| Algorithm | **SHA-256** |
| Data | File body from module **3** — e.g. `{{3.data}}` (reselect from HTTP module output after save) |

**Output:** hex digest — map to **File Content Hash** in module **6**. Note the exact output field name in Make (e.g. `hash`, `result`).

### Option B — Reuse Production v2 hash-helper (module 50 pattern)

Copy settings from [upload-asset-engine-v2-hash-duplicate-check.md](./upload-asset-engine-v2-hash-duplicate-check.md) module **50**:

| Setting | Value |
|---------|--------|
| App | HTTP → Make a request |
| Method | POST |
| URL | Your hash-helper endpoint *(Make only — not GitHub)* |
| Body type | Multipart form |
| File field | `file` = module **3** body (`{{3.data}}`, filename `{{3.fileName}}` if available) |
| Text field | `submissionAssetRecordId` = `{{1.submissionAssetRecordId}}` |
| Parse response | Yes |

**Expected JSON response fields:** `sha256`, `sizeBytes`, `mimeType` → map `sha256` to **File Content Hash**.

---

## Step 2 — Reconnect S3 and Airtable modules

After inserting hash as new module **4**:

1. **Disconnect** old link 3 → 4 (S3).
2. Connect **3 → 4 (Hash) → 5 (S3) → 6 (Airtable update)**.
3. S3 **file input** stays module **3** body (same bytes hashed).
4. S3 **key** and canonical URL mappings unchanged from partial PASS (hardcoded OK for this test).

---

## Step 3 — Update Airtable success module (module 6)

**Table:** Submission Assets · **Base:** DEV `appTetnuCZlCZdTCT` · **Record ID:** `{{1.submissionAssetRecordId}}`

| Field | Value |
|-------|--------|
| **Upload Status** | `Uploaded` |
| **Canonical File URL** | *(unchanged from partial PASS mapping)* |
| **Storage Key** | *(unchanged)* |
| **File Content Hash** | Module **4** SHA-256 hex — `{{4.hash}}` or `{{4.sha256}}` *(reselect after hash module run)* |
| **File Hash Algorithm** | **`SHA-256`** (exact single-select option) |
| **Uploaded At** | `now` |
| **Upload Error** | **blank** — clear field on success (verify empty after test) |

**Optional (Slice 2+):** `File Size Bytes`, `File MIME Type` from hash-helper if using Option B.

**Do not write:** Google Drive fields. **Do not clear** Airtable Attachment.

---

## Step 4 — Manual webhook re-test (070a/070b still OFF)

1. Scenario → **Run once**.
2. POST payload from [c013-hash-retest-webhook-recBBi80bYuxXifVj.json](../../tools/airtable/_preview/c013-hash-retest-webhook-recBBi80bYuxXifVj.json).
3. Confirm scenario completes **green**.
4. In Airtable DEV, open `recBBi80bYuxXifVj` — all success fields including **File Content Hash**.

**Re-test same asset:** OK — current Make path does not require `Upload Status = Pending Link` (that gate is **070b**, still OFF). Row may already show `Uploaded` from partial PASS; hash should populate on this run.

**Fresh asset alternative:** Pick any DEV Submission Asset with `Pending Link` + attachment + Video Feedback link; document new record id in preview JSON.

---

## Pass condition (full C-013/C-023 manual webhook PASS for hash slice)

| Check | Expected |
|-------|----------|
| Upload Status | `Uploaded` |
| Canonical File URL | non-empty HTTPS |
| Storage Key | non-empty |
| **File Content Hash** | non-empty 64-char hex (SHA-256) |
| File Hash Algorithm | `SHA-256` |
| Uploaded At | set |
| Upload Error | blank |
| Airtable Attachment | still present |
| Writeback Complete? | `1` |

---

## Step 5 — Save verification artifact (read-only)

```powershell
python tools/airtable/_probe_c013_asset_storage_fields.py `
  --record-id recBBi80bYuxXifVj `
  --out tools/airtable/_preview/c013-dev-s3-writeback-full-pass-recBBi80bYuxXifVj.json
```

Copy [full-pass template](../../tools/airtable/_preview/c013-dev-s3-writeback-full-pass-TEMPLATE.json) → rename with record id if using a different asset.

Update [Wave 7 end-of-test section](../../docs/deploy-checklists/C-013-wave7-asset-storage-checklist.md#2026-07-08-end-of-test--c-023-hash-manual-webhook).

---

## After hash PASS only (not tonight)

| Step | Task |
|------|------|
| **C** | Dynamic Storage Key / filename / canonical URL (replace hardcoded test values) |
| **F** | Prep DEV **070b** webhook URL in ops notes — enable **070b** only after Mike approves |
| **G** | C-020 **H2** video harness before **H1** homework |

**C-023 duplicate lookup (module 52)** — optional after hash PASS; not required for this slice.

---

## Related

- [C-013-dev-s3-make-ui-runbook.md](./C-013-dev-s3-make-ui-runbook.md)
- [C-013-make-s3-dev-build-packet.md](../../docs/deploy-checklists/C-013-make-s3-dev-build-packet.md)
- [Partial PASS artifact](../../tools/airtable/_preview/c013-dev-s3-writeback-partial-pass-recBBi80bYuxXifVj.json)
