# C-013 DEV S3 Upload Engine — Make.com UI runbook

**Execute in:** Make.com UI (Mike / ops)  
**Do not edit:** Production Upload Engine scenario  
**References:** [build packet](../../docs/deploy-checklists/C-013-make-s3-dev-build-packet.md) · [writeback mapping](../../docs/deploy-checklists/C-013-make-s3-writeback-mapping.md)

**Active task (2026-07-08):** **[C-013-dev-s3-hash-patch.md](./C-013-dev-s3-hash-patch.md)** — insert SHA-256 hash after module 3; map **File Content Hash** on Airtable update; re-test webhook.

**Manual test asset:** `recBBi80bYuxXifVj` — **VIDEO** / **070b**. Retest: [c013-hash-retest-webhook-recBBi80bYuxXifVj.json](../../tools/airtable/_preview/c013-hash-retest-webhook-recBBi80bYuxXifVj.json) · Partial PASS: [c013-dev-s3-writeback-partial-pass-recBBi80bYuxXifVj.json](../../tools/airtable/_preview/c013-dev-s3-writeback-partial-pass-recBBi80bYuxXifVj.json)

---

## 2026-07-08 — Hash patch (Step A/B)

See **[C-013-dev-s3-hash-patch.md](./C-013-dev-s3-hash-patch.md)** for the exact 6-module chain:

`1 webhook → 2 Get Record → 3 HTTP → **4 Hash** → 5 S3 → 6 Airtable update`

After PASS, verify:

```powershell
python tools/airtable/_probe_c013_asset_storage_fields.py --record-id recBBi80bYuxXifVj --out tools/airtable/_preview/c013-dev-s3-writeback-full-pass-recBBi80bYuxXifVj.json
```

---

## 2026-07-07 End-of-night checkpoint — DEV S3 partial writeback proof

**Start here tomorrow.** Full checklist: [Wave 7 checkpoint](../../docs/deploy-checklists/C-013-wave7-asset-storage-checklist.md#2026-07-07-end-of-night-checkpoint--dev-s3-partial-writeback-proof).

| Track | Status |
|-------|--------|
| C-013 DEV S3 partial writeback proof | **PASS** |
| C-023 hash completion | **PENDING** |
| Dynamic path mapping | **PENDING** |
| DEV 070a/070b connection | **NOT STARTED** |
| Production cutover | **NOT STARTED** |

### Scenario modules working tonight

| # | Module |
|---|--------|
| 1 | Custom webhook |
| 2 | Airtable Get Record (DEV `appTetnuCZlCZdTCT`, Submission Assets) |
| 3 | HTTP — download Airtable Attachment URL |
| 4 | Amazon S3 Upload → `shooting-challenge-assets` |
| 5 | Airtable Update Record — canonical fields |

**Not built:** hash module; dynamic Storage Key / filename / canonical URL; C-023 duplicate lookup; verify **Upload Error** cleared on success.

### Tested values

- **Record:** `recBBi80bYuxXifVj` (Video Feedback / **070b** payload)
- **Storage Key:** `shooting-challenge/2026-2027/shooting-challenge/schmidt-mike/2026-07-07-video-feedback-recBBi80bYuxXifVj-C013-Test.png`
- **Canonical URL:** `https://shooting-challenge-assets.s3.us-east-2.amazonaws.com/shooting-challenge/2026-2027/shooting-challenge/schmidt-mike/2026-07-07-video-feedback-recBBi80bYuxXifVj-C013-Test.png`

**Path patterns (hardcoded — dynamic tomorrow):** folder `shooting-challenge/{seasonSlug}/{challengeSlug}/{athleteSlug}`; file `{date}-{assetType}-{assetRecordId}-{safeOriginalFileName}`.

### Tomorrow morning sequence

| Step | Action |
|------|--------|
| **A** | Add/confirm SHA-256 hash step |
| **B** | Map digest → **File Content Hash** on Airtable update |
| **C** | Replace hardcoded path/URL with dynamic Make mappings |
| **D** | Re-test video asset (same or fresh `Pending Link`) |
| **E** | Document full C-013/C-023 manual webhook PASS |
| **F** | After full PASS only — prep DEV **070b** webhook connection |
| **G** | C-020 **H2** video before **H1** homework |

**Hard stops:** No DEV **070a/070b** enable; no Production; no attachment clear; no Drive field removal; no formula/view/script cutover; no secrets in repo.

---

## Before you start — fill placeholders

| Placeholder | Your value (Make only — not GitHub) |
|-------------|-------------------------------------|
| DEV S3 bucket name | `shooting-challenge-assets` |
| AWS connection in Make | *(Make only)* |
| Canonical URL mode | Direct S3 HTTPS tonight; CloudFront/presigned **TBD** |
| CloudFront host (if used) | TBD |
| DEV webhook URL | Copy from scenario module 1 — **not in GitHub** |

**Hard stops:** Do not enable DEV **070a/070b** until manual webhook test passes. Do not touch Production.

---

## Step 1 — Create DEV scenario

1. Make → **Scenarios** → **Create a new scenario**.
2. Name: `Shooting Challenge - DEV - Upload Engine - S3 - v1`
3. Add module: **Webhooks → Custom webhook**.
4. Click **Add** → **Determine data structure** (or save hook URL for later).
5. Copy **Webhook URL** → this is your DEV webhook (placeholder above).

**Alternative:** Import [upload-asset-engine-v2-with-file-hash-duplicate-check.json](../blueprints/upload-asset-engine-v2-with-file-hash-duplicate-check.json) → **Save as new scenario** → rename → **delete/rebind webhook** so Production hook is untouched.

---

## Step 2 — Webhook data structure (v4.1)

Redetermine structure using sample JSON from preflight file (`webhookPayload`):

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

---

## Step 3 — Module chain (build left → right)

### 3a. Airtable — Get a record (module 2)

| Setting | Value |
|---------|--------|
| Connection | Airtable → **DEV** base |
| Base | `appTetnuCZlCZdTCT` |
| Table | Submission Assets |
| Record ID | `{{1.submissionAssetRecordId}}` |
| Fields | Airtable Attachment, Original File Name, Asset Type, Asset Purpose, Enrollment - Linked, Submission - Linked, Upload Status, Upload Error |

### 3b. Router — attachment present?

- **Yes:** continue to download  
- **No:** Airtable Update → `Upload Status = Error`, `Upload Error = No Airtable Attachment URL`

### 3c. HTTP — Get a file (module 5)

| Setting | Value |
|---------|--------|
| URL | `{{2.Airtable Attachment[].url}}` (first attachment) |
| Method | GET |

### 3d. Hash (module 50)

**Option A:** Reuse existing hash-helper HTTP POST (from Production v2 module 50) — output `sha256`, `sizeBytes`, `mimeType`.

**Option B:** Make **Tools → Hash** with algorithm **SHA-256** on file body from module 5.

### 3e. Duplicate lookup (optional, module 52)

HTTP GET Airtable API on **DEV** base:

- URL: `https://api.airtable.com/v0/appTetnuCZlCZdTCT/tblhMLKxQK77agtME`
- Formula: `AND({File Content Hash} = "{{50.sha256}}", RECORD_ID() != "{{1.submissionAssetRecordId}}")`
- Bearer token: scoped PAT in Make connection (not GitHub)

Module **51:** write duplicate flags only (optional); upload continues.

### 3f. Set variable — Storage Key (module 60)

```text
shooting-challenge/dev/video/{{first(2.`Enrollment - Linked`)}}/{{first(2.`Submission - Linked`)}}/{{1.submissionAssetRecordId}}/{{2.`Original File Name`}}
```

For homework assets use `homework` instead of `video` in path (map from Asset Type / Asset Purpose).

**Test asset preview:**

```text
shooting-challenge/dev/video/recgP9qZYjAhE7NXm/reczeIEhJW60DlULu/recBBi80bYuxXifVj/BlueOrangeCircleLogo.png
```

Sanitize filename in Make if needed (spaces → `-`).

### 3g. AWS S3 — Upload a file (module 61)

| Setting | Value |
|---------|--------|
| Connection | Your DEV AWS connection |
| Bucket | DEV bucket name |
| Key | Storage Key from module 60 |
| File | Body from HTTP module 5 |

### 3h. Set variable — Canonical File URL (module 62)

**CloudFront mode:**

```text
https://{{CLOUDFRONT_HOST}}/{{60.storageKey}}
```

**Presigned mode:** use S3 module output URL if available, or AWS presign module.

### 3i. Airtable — Update record success (module 63)

| Field | Value |
|-------|--------|
| Base | DEV `appTetnuCZlCZdTCT` |
| Table | Submission Assets |
| Record ID | `{{1.submissionAssetRecordId}}` |
| Upload Status | Uploaded |
| Canonical File URL | module 62 |
| Storage Key | module 60 |
| File Content Hash | module 50 sha256 |
| File Hash Algorithm | **SHA-256** |
| Uploaded At | now |
| Upload Error | *(empty)* |

**Do not clear** Airtable Attachment. **Do not write** Google Drive fields.

---

## Step 4 — Error handler

Scenario wrench → **Error handlers** → add route:

| Field | Value |
|-------|--------|
| Upload Status | Error |
| Upload Error | `Make S3 upload failed: {{error.message}}` (truncate) |
| Canonical File URL | blank |
| Storage Key | blank unless S3 put succeeded |
| File Content Hash / Algorithm | blank unless computed |

If `uploadDestination = Video Feedback`, update `{{1.targetRecordId}}` with Upload Status + Upload Error.

---

## Step 5 — Remove Google Drive path

If imported from v2 blueprint, **delete or disconnect** modules **20, 21, 19, 17, 36, 38, 42, 43, 24, 39, 40, 44, 45** so flow ends at S3 success update **63** only.

---

## Step 6 — Manual webhook test (070a/b still OFF)

1. Scenario → **Run once**.
2. POST `webhookPayload` from [preflight JSON](../../tools/airtable/_preview/c013-manual-webhook-recBBi80bYuxXifVj.json) to DEV webhook URL.
3. Confirm scenario green.
4. In Airtable DEV, open `recBBi80bYuxXifVj`:
   - Upload Status = **Uploaded**
   - Canonical File URL, Storage Key, File Content Hash populated
   - File Hash Algorithm = **SHA-256**
   - Airtable Attachment **still present**
   - Google Drive File URL **still blank**

5. Optional probe:

```powershell
python tools/airtable/_probe_c013_asset_storage_fields.py --out tools/airtable/_preview/c013-dev-after-manual-webhook.json
```

---

## Step 7 — After manual PASS only

1. Document DEV webhook URL in ops notes (not GitHub).
2. Enable DEV automations **070a** / **070b** with **DEV webhook URL** in `makeWebhookUrl` input.
3. Run C-020 **H1–H4** per build packet.

---

## Production safety checklist

- [ ] New scenario name contains **DEV**
- [ ] All Airtable modules point to `appTetnuCZlCZdTCT`
- [ ] Production scenario unchanged
- [ ] Production webhook URL not reused
- [ ] DEV **070a/b** still OFF until step 6 passes
