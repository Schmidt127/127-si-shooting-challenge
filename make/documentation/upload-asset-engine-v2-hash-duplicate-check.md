# Upload Engine v2 — SHA-256 duplicate file detection

**Scenario name:** `Shooting Challenge - GAME - Upload Engine - Fresh Airtable Source - v2 - With File Hash Duplicate Check`

**Blueprint:** [../blueprints/upload-asset-engine-v2-with-file-hash-duplicate-check.json](../blueprints/upload-asset-engine-v2-with-file-hash-duplicate-check.json)

**Base scenario (before hash patch):** Fresh Airtable Source v2 — webhook `2758138`, modules `1 → 2 → 30 → (5 → … → 21)`.

## What changed

| Module | App | Purpose |
|--------|-----|---------|
| **50** | HTTP → Make a request | POST downloaded file to hash helper (`sha256`, `sizeBytes`, `mimeType`) |
| **52** | HTTP → Make a request | **GET Airtable REST API** — duplicate hash lookup (`records: []` when unique) |
| **51** | Airtable → Update record | Write hash + duplicate flags on Submission Asset, then continue to Drive |

**Not changed:** Google Drive search/upload/writeback modules `20`, `21`, `19`, `17`, `36`, `38`, `42`, `43`, `24`, `39`, `40`, `44`, `45`. No cloned upload paths. No duplicate blocking (flag only).

## Required flow (good URL branch)

```text
1 Webhook
→ 2 Get Submission Asset
→ 30 Router
   ├─ No URL → 31 Error writeback (unchanged)
   └─ URL exists →
      5 Download File
      → 50 Hash Helper
      → 52 HTTP Airtable API Search Duplicate Hash
      → 51 Update Duplicate Result
      → 20 Google Drive Search Folder
      → 21 Folder Router
      → existing upload/writeback paths
```

## Why module 52 uses HTTP, not Airtable Search Records

Make’s **Airtable → Search records** module can **stop the scenario** when zero rows match. Unique files must still upload to Google Drive. The Airtable REST API returns `{ "records": [] }` and the scenario continues.

## Placeholders to replace after import

| Placeholder | Where | Action |
|-------------|-------|--------|
| `REPLACE_WITH_HASH_HELPER_ENDPOINT_URL` | Module **50** → URL | Your hash helper POST endpoint |
| `REPLACE_IF_HELPER_REQUIRES_API_KEY` | Module **50** → header `x-api-key` | Remove header or set real key |
| `REPLACE_WITH_AIRTABLE_TOKEN` | Module **52** → `Authorization: Bearer …` | Airtable personal access token with `data.records:read` on base `appn84sqPw03zEbTT` |

**Security:** Prefer a scoped PAT used only for this lookup. Do not commit tokens to GitHub.

## Module 52 — HTTP Airtable API (duplicate lookup)

- **Method:** GET  
- **URL:** `https://api.airtable.com/v0/appn84sqPw03zEbTT/tblhMLKxQK77agtME`  
- **Query:** `maxRecords=1`  
- **filterByFormula:**

```text
AND(
  "{{50.sha256}}" != "",
  {File Content Hash} = "{{50.sha256}}",
  RECORD_ID() != "{{1.submissionAssetRecordId}}"
)
```

- **Parse response:** Yes  
- **Expected:** `{ "records": [] }` (unique) or one record in `records[1]` (duplicate)

## Module 51 — field mappings (duplicate result)

Uses HTTP response shape `52.records[1].id` and `52.records[1].fields.Submission Assets Full Name` (not Search Records’ flat `52.id`).

| Field | Mapping summary |
|-------|-----------------|
| File Content Hash | `{{50.sha256}}` |
| File Hash Algorithm | `SHA-256` |
| File Size Bytes | `{{50.sizeBytes}}` |
| File MIME Type | `{{50.mimeType}}` |
| File is Duplicate? | false if no hash or no match; true if `52.records[1].id` exists |
| Duplicate File Status | `Error` / `Unique` / `Exact Duplicate` |
| Duplicate Match Strength | `Manual Review` or `Exact SHA-256 Hash` |
| Duplicate Match Record | linked record id when duplicate; empty when unique |
| Duplicate Match Notes | human-readable note |
| Duplicate Checked At | `{{now}}` |
| Duplicate Check Error | set when hash helper returns no sha256 |

**Not written by this scenario:** XP, Coach Feedback, Parent Feedback, Award Status, grading fields.

## Airtable fields required (Submission Assets)

- File Content Hash  
- File Hash Algorithm  
- File Size Bytes  
- File MIME Type  
- File is Duplicate?  
- Duplicate File Status  
- Duplicate Match Strength  
- Duplicate Match Record  
- Duplicate Match Notes  
- Duplicate Checked At  
- Duplicate Check Error  
- Duplicate Review Status (not set by Make in v1 — manual/coach workflow)

## Manual reselect in Make after import

1. **Module 2** — Airtable connection + base/table (should restore from blueprint).  
2. **Module 50** — Replace URL and optional API key header.  
3. **Module 52** — Replace Bearer token in Authorization header.  
4. **Module 51** — Re-open field mappings if Make shows “invalid mapping”; confirm **Duplicate Match Record** linked-field array behavior with typecast on.  
5. **Google modules** — Confirm Google connection `4228233` maps to your live Google account.  
6. **Webhook module 1** — Hook `2758138` or re-bind to `Airtable Upload Engine - Webhook - June 27`.

## Regenerate blueprint from your Make export

If you export a newer v2 from Make:

```powershell
python tools/make/patch_upload_engine_v2_hash_lookup.py `
  make/blueprints/upload-asset-engine-fresh-airtable-v2-base.json `
  make/blueprints/upload-asset-engine-v2-with-file-hash-duplicate-check.json
```

The patch script:

- Replaces module **52** `airtable:ActionSearchRecords` → `http:ActionSendData` (GET API)  
- Fixes module **51** formulas for `52.records[1].…`  
- Sets scenario name suffix **With File Hash Duplicate Check**  
- Removes empty “No Duplicate Found” filter on module **20**

## Verification checklist

- [ ] Blueprint contains **no** `airtable:ActionSearchRecords` with `"id": 52`  
- [ ] Module order on good path: **5 → 50 → 52 → 51 → 20 → 21**  
- [ ] **No** extra routers or cloned Drive upload branches after module 51  
- [ ] Test **unique file** → `Duplicate File Status = Unique`, Drive upload completes  
- [ ] Test **re-upload same bytes** → `Exact Duplicate` flagged, Drive upload still completes (v2 does not block)  
- [ ] Test **hash helper failure** → `Duplicate File Status = Error`, upload still continues  

## Related

- [upload-asset-engine.md](./upload-asset-engine.md) — status ladder  
- [upload-asset-engine-error-handling.md](./upload-asset-engine-error-handling.md) — error writeback  
- Airtable **070a** / **070b** — webhook senders  
