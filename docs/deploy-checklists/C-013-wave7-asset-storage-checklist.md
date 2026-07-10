# C-013 / C-023 — Wave 7 asset storage execution checklist

**Backlog:** C-013 (AWS S3 canonical URLs), C-023 (file content hash dedup)
**Status:** **Wave 7 Slice 2 SDK proof PASS (2026-07-08)** — controlled confirm-write recheck same day. Full writeback + C-023 duplicate flags on `recBBi80bYuxXifVj`. Upload runtime = **Lambda** (Make S3 **dropped**). **070a/070b OFF**; Production untouched. **Not** full migration.
**Depends on:** C-020 DEV functional complete (115 harness); C-012 field ownership (partial — document as we go)
**Architecture:** [asset-storage-migration.md](../asset-storage-migration.md) · [upload-workflow-homework-video.md](../upload-workflow-homework-video.md) · [make/documentation/upload-asset-engine.md](../../make/documentation/upload-asset-engine.md) · [Slice 2 mapping](./C-013-make-s3-writeback-mapping.md) · **[Make build packet](./C-013-make-s3-dev-build-packet.md)**
**Test harness:** [C-020 checklist](./C-020-testing-scenarios-script-checklist.md) — Tests **F** (video) and **G** (homework) for upload path after DEV Make is wired
**DEV probe:** `tools/airtable/_probe_c013_asset_storage_fields.py` (read-only)

**Environment:** DEV `appTetnuCZlCZdTCT` first. **070a/070b OFF**. Upload runtime = **[SDK / hybrid interim](./C-013-sdk-hybrid-runtime.md)** (Make S3 **parked**).

**DEV baselines (read-only):**

| File | When | Notes |
|------|------|-------|
| [c013-dev-baseline.json](../../tools/airtable/_preview/c013-dev-baseline.json) | 2026-07-07 (first probe) | Both canonical fields missing |
| [c013-dev-baseline-before-fields.json](../../tools/airtable/_preview/c013-dev-baseline-before-fields.json) | 2026-07-07 (post-OMNI) | OMNI report stale; Metadata API later confirmed fields |
| [c013-dev-s3-writeback-partial-pass-recBBi80bYuxXifVj.json](../../tools/airtable/_preview/c013-dev-s3-writeback-partial-pass-recBBi80bYuxXifVj.json) | 2026-07-07 (EOD) | Make partial PASS (no hash) |
| [c013-dev-s3-sdk-proof-recBBi80bYuxXifVj.json](../../tools/airtable/_preview/c013-dev-s3-sdk-proof-recBBi80bYuxXifVj.json) | 2026-07-08 | **SDK live proof** — S3 + full writeback |
| [c013-dev-s3-sdk-proof-recBBi80bYuxXifVj-verify.json](../../tools/airtable/_preview/c013-dev-s3-sdk-proof-recBBi80bYuxXifVj-verify.json) | 2026-07-08 | Probe verify `allPass=true` |

---

## 2026-07-08 — DEV SDK proof PASS (C-013 + C-023 hash writeback)

**Tool:** `tools/airtable/c013_dev_s3_upload_proof.py` (AWS SDK — bypasses Make S3 timeout)
**Record:** `recBBi80bYuxXifVj` (Video Feedback / **070b** route)
**Verifier:** `allPass=true` — [verify.json](../../tools/airtable/_preview/c013-dev-s3-sdk-proof-recBBi80bYuxXifVj-verify.json)

### Status summary

| Track | Status |
|-------|--------|
| **C-013 DEV S3 + canonical writeback** | **PASS** (SDK, one video asset) |
| **C-023 hash writeback** | **PASS** (SHA-256 on asset row) |
| **C-023 duplicate lookup (module 52)** | **PASS** (SDK/Lambda — flag-only; not Make module 52 on DEV) |
| **Make DEV scenario S3 path** | **DROPPED** — S3 Upload timeout; use **Lambda** orchestration |
| **Upload runtime** | **Lambda** — [C-013-sdk-hybrid-runtime.md](./C-013-sdk-hybrid-runtime.md) · [Make migration plan](./C-013-make-upload-migration-plan.md) |
| **DEV 070a/070b connection** | **NOT STARTED** — gated on **H2** + C-023 duplicate test |
| **C-020 H2 harness** | **NEXT BUILD** |
| **Production cutover** | **NOT STARTED** |

### Confirmed writeback

| Field | Value |
|-------|-------|
| **Upload Status** | `Uploaded` |
| **Canonical File URL** | `https://shooting-challenge-assets.s3.us-east-2.amazonaws.com/shooting-challenge/2026-2027/shooting-challenge/schmidt-mike/2026-07-08-video-feedback-recBBi80bYuxXifVj-BlueOrangeCircleLogo.png` |
| **Storage Key** | `shooting-challenge/2026-2027/shooting-challenge/schmidt-mike/2026-07-08-video-feedback-recBBi80bYuxXifVj-BlueOrangeCircleLogo.png` |
| **File Content Hash** | `448c3126df730cf6b0cf6875f77f1f726b1fa3a2b4c36bb631b326981b25f967` |
| **File Hash Algorithm** | `SHA-256` |
| **Uploaded At** | `2026-07-08T14:15:37.412Z` |
| **File Size Bytes** | `67730` |
| **File MIME Type** | `image/png` |
| **Upload Error** | blank |
| **Airtable Attachment** | retained |
| **Writeback Complete?** | `1` |

### What this proves vs not

**Proven:** DEV program S3 bucket accepts upload; Airtable DEV accepts full §6 success writeback including **true byte-hash**; Mike path pattern works via SDK (`season/challenge/athlete-slug` + dated filename).

**Not proven:** Make.com end-to-end path; homework route; **070a/070b** automation send; C-020 **H2**; duplicate-hash detection; attachment cleanup; Production; formula/view cutover.

### Next steps (ordered) — runtime locked 2026-07-08

**Decision:** **Option 3 — SDK / hybrid interim.** Make S3 **parked**. Lambda deferred until after DEV harness proof.

1. Extend SDK path: **C-023 duplicate lookup** on [`c013_dev_s3_upload_proof.py`](../../tools/airtable/c013_dev_s3_upload_proof.py).
2. Build **C-020 H2** (video 1-file harness) → SDK processes harness asset → verify `allPass`.
3. **Only after H2 gate** — prep **070b** hybrid webhook (Make orchestration → SDK; **not** Make S3).
4. **H1** homework after video path stable.

Full spec: [C-013-sdk-hybrid-runtime.md](./C-013-sdk-hybrid-runtime.md).

---

## 2026-07-07 End-of-night checkpoint — DEV S3 partial writeback proof

**Resume here tomorrow morning.** Mike stopped for the night after first live DEV Make S3 proof. Production untouched.

### Status summary

| Track | Status |
|-------|--------|
| **C-013 DEV S3 partial writeback proof** | **PASS** |
| **C-023 hash completion** | **PENDING** |
| **Dynamic path mapping** | **PENDING** (hardcoded test values in Make tonight) |
| **DEV 070a/070b connection** | **NOT STARTED** |
| **Production cutover** | **NOT STARTED** |

### Make scenario (DEV only)

**Name:** `Shooting Challenge - DEV - Upload Engine - S3 - v1`

| # | Module | Status tonight |
|---|--------|----------------|
| 1 | Custom webhook | Working |
| 2 | Airtable Get Record | Working |
| 3 | HTTP Make a request — download Airtable Attachment URL | Working |
| 4 | Amazon S3 Upload a file → bucket `shooting-challenge-assets` | Working |
| 5 | Airtable Update Record — canonical S3 fields on Submission Assets | Working |

**Not built yet:** SHA-256 hash module; duplicate lookup (C-023 module 52); dynamic Storage Key / filename / canonical URL builders; error-handler branch; **Upload Error** clear-on-success verification.

### Tested record and route

| Item | Value |
|------|-------|
| **Base** | DEV `appTetnuCZlCZdTCT` |
| **Table** | Submission Assets |
| **Record** | `recBBi80bYuxXifVj` |
| **Route** | Video Feedback — **070b**-style webhook (`routeKey = video_feedback`) |
| **Bucket** | `shooting-challenge-assets` (us-east-2) |

### Mike’s path patterns (chosen tonight — still hardcoded in Make)

**Folder (Storage Key prefix):**

```text
shooting-challenge/{seasonSlug}/{challengeSlug}/{athleteSlug}
```

**File name segment:**

```text
{date}-{assetType}-{assetRecordId}-{safeOriginalFileName}
```

**Full Storage Key (tested):**

```text
shooting-challenge/2026-2027/shooting-challenge/schmidt-mike/2026-07-07-video-feedback-recBBi80bYuxXifVj-C013-Test.png
```

**Canonical File URL (tested — direct S3 HTTPS; CloudFront/presigned decision pending):**

```text
https://shooting-challenge-assets.s3.us-east-2.amazonaws.com/shooting-challenge/2026-2027/shooting-challenge/schmidt-mike/2026-07-07-video-feedback-recBBi80bYuxXifVj-C013-Test.png
```

### Confirmed partial PASS (Airtable writeback)

- Make received webhook payload
- Airtable Get Record worked
- HTTP module downloaded Airtable Attachment
- S3 upload worked
- Airtable Update Record worked
- **Upload Status** = `Uploaded`
- **Storage Key** populated
- **Canonical File URL** populated
- **File Hash Algorithm** = `SHA-256`
- **Uploaded At** populated
- **Airtable Attachment** stayed in place
- **Writeback Complete?** = `1`

### Known remaining gaps

- **File Content Hash** still blank — hash module not added
- **Upload Error** clearing on success — verify/document on next run
- S3 path/file/canonical URL still **hardcoded test values** — convert to dynamic Make mappings from Get Record fields
- Canonical URL uses **direct S3 URL**; final CloudFront vs presigned decision pending
- DEV **070a/070b** not enabled
- Production untouched
- Attachments not cleared; Google Drive fields not removed
- Formulas/views/scripts not switched to Canonical File URL

### Tomorrow morning — next-step sequence

| Step | Task |
|------|------|
| **A** | Add/confirm Make hash step for **File Content Hash** (v2 module **50** or Make Crypto SHA-256) |
| **B** | Write **File Content Hash** (+ confirm **File Hash Algorithm = SHA-256**) on success Airtable update |
| **C** | Convert hardcoded folder/file/canonical URL values to **dynamic** mappings (`seasonSlug`, `challengeSlug`, `athleteSlug`, date, asset type, record id, safe filename) |
| **D** | Re-test same video asset or a fresh `Pending Link` video asset via manual webhook |
| **E** | Document **full** C-013/C-023 manual webhook PASS (all §6 success fields including hash) |
| **F** | **Only after manual PASS** — prepare controlled DEV **070b** connection (webhook URL in Make only; do not paste Production) |
| **G** | Run C-020 **H2** video test **before** homework **H1** |

### Hard stops (still in force)

- Do **not** enable DEV **070a/070b** tonight or before full manual PASS
- Do **not** touch Production
- Do **not** clear Airtable attachments
- Do **not** remove Google Drive fields
- Do **not** switch formulas/views/scripts to Canonical File URL
- Do **not** store secrets/env values in repo (webhook URL, AWS creds → Make only)

**Artifacts:** [preflight](../../tools/airtable/_preview/c013-manual-webhook-recBBi80bYuxXifVj.json) · [partial PASS](../../tools/airtable/_preview/c013-dev-s3-writeback-partial-pass-recBBi80bYuxXifVj.json) · [build packet §8.1](./C-013-make-s3-dev-build-packet.md#81-manual-test-result--partial-pass-2026-07-07) · [runbook](../../make/documentation/C-013-dev-s3-make-ui-runbook.md) · **[hash patch (Step A)](../../make/documentation/C-013-dev-s3-hash-patch.md)**

---

## 2026-07-08 — C-023 hash patch (SDK path — PASS)

**Result:** **PASS** via [c013_dev_s3_upload_proof.py](../../tools/airtable/c013_dev_s3_upload_proof.py) — see [SDK proof section](#2026-07-08--dev-sdk-proof-pass-c-013--c-023-hash-writeback). Make hash/S3 modules still blocked (S3 timeout).

### 2026-07-08 End-of-test — C-023 hash SDK proof

**Status:** **PASS** — `allPass=true` on `recBBi80bYuxXifVj`.

| Check | Result |
|-------|--------|
| File Content Hash populated | **PASS** — 64-char SHA-256 |
| All §6 success fields | **PASS** |
| Upload Error blank on success | **PASS** |
| Probe `allPass` | **PASS** |
| Airtable Attachment retained | **PASS** |

**Artifacts:** [live proof](../../tools/airtable/_preview/c013-dev-s3-sdk-proof-recBBi80bYuxXifVj.json) · [verify](../../tools/airtable/_preview/c013-dev-s3-sdk-proof-recBBi80bYuxXifVj-verify.json)

**Next:** Upload runtime = **Make → Lambda → S3**; C-020 **H2** gate complete; AWS Lambda deploy pending admin IAM.

---

## 2026-07-08 — Controlled DEV confirm-write recheck (C-013 + C-023)

**Purpose:** Re-verify SDK path after dry-run recheck; force **`schmidt-mike`** athlete slug to match prior writeback on canonical test record.

| Item | Value |
|------|--------|
| **Tool** | `c013_dev_s3_upload_proof.py` |
| **Command** | `--confirm-write --athlete-slug schmidt-mike` |
| **Base** | `appTetnuCZlCZdTCT` only |
| **Record** | `recBBi80bYuxXifVj` |
| **Bucket / region** | `shooting-challenge-assets` / `us-east-2` |
| **Verifier** | `allPass=true` (probe) |

### Confirmed

| Check | Result |
|-------|--------|
| S3 key | `shooting-challenge/2026-2027/shooting-challenge/schmidt-mike/2026-07-08-video-feedback-recBBi80bYuxXifVj-BlueOrangeCircleLogo.png` |
| Canonical File URL | Same `schmidt-mike` path (HTTPS S3 URL) |
| SHA-256 | `448c3126df730cf6b0cf6875f77f1f726b1fa3a2b4c36bb631b326981b25f967` |
| Upload Status | `Uploaded` · **Upload Error** cleared · **Writeback Complete?** = 1 |
| C-023 duplicate fields | **Written** — `File is Duplicate? = true`, `Exact Duplicate`, first match `recL9r4a7navUxEhg` |
| S3 object | Re-PUT to **same** key (path unchanged vs prior live writeback) |
| **Uploaded At** | Refreshed (`2026-07-08T15:50:26.579Z`) |
| Airtable Attachment | **Retained** |
| Production | **Untouched** |

**Artifacts:** Local-only recheck JSON under `tools/airtable/_preview/` (`*-confirm-recheck*.json`) — not required for Git; prior committed proof artifacts remain canonical.

**Next:** [C-013 production promotion plan](./C-013-production-promotion-plan.md) documented — **execution not started**. **C-023:** Stage 2A/2B local implementation complete — [policy](./C-023-production-duplicate-policy.md); **Stage 3** DEV schema + OMNI next.

---

## Storage source of truth transition

**Yes — C-013 moves the system toward S3 / canonical URL as the storage source of truth.** Wave 7 Slice 1 prepared DEV schema columns. **S3 is not yet the active source of truth** until DEV Make uploads files to S3 and writeback populates **Canonical File URL**, **Storage Key**, and **hash fields** on **Submission Assets**.

**2026-07-08:** One DEV video asset has **full** SDK writeback including hash ([verify.json](../../tools/airtable/_preview/c013-dev-s3-sdk-proof-recBBi80bYuxXifVj-verify.json)). Make S3 path still blocked.

### 1. Current source of truth (today on DEV)

| Layer | Role |
|-------|------|
| **Airtable Attachment** | Still the **transient file source** at intake — **009** copies from Submissions; **020/013/070** still gate on it |
| **Google Drive File URL** | Still the **legacy uploaded-file bridge** — 40/49 DEV assets have Drive URL; formulas/views/**022** still use it |
| **Canonical File URL** | Field exists — **1+** populated (SDK proof `recBBi80bYuxXifVj`) |
| **Storage Key** | Field exists — **1+** populated (same) |
| **File Content Hash** | Field exists — **1+** populated (SDK proof 2026-07-08) |

### 2. Target source of truth (C-013 end state)

| Layer | Role |
|-------|------|
| **S3 object** | Program-owned **durable asset** (bytes live in bucket, not Airtable/Drive) |
| **Canonical File URL** | Airtable / web / email / coach-facing **HTTPS pointer** to that object — one URL wins everywhere |
| **Storage Key** | Provider-neutral **object key/path** (e.g. season/enrollment/assetId/filename) for audits and dedupe |
| **Airtable Attachment** | **Transient only** — cleared after successful upload (Slice 4) |
| **Google Drive File URL** | **Legacy / archive only** — retained for 2025–26 history until migration policy; not the gate for new uploads |

### 3. Cutover rule (do not switch consumers early)

Do **not** repoint formulas, views, **022**, **070a/b**, coach queues, or emails away from **Google Drive File URL** or **Airtable Attachment** until **DEV Make S3 writeback** proves on test assets:

- [x] Upload succeeds (`Upload Status = Uploaded`) — SDK proof 2026-07-08
- [x] **Canonical File URL** populated — same
- [x] **Storage Key** populated — same
- [x] **File Content Hash** (+ algorithm) populated — SDK proof `allPass=true`
- [x] Old **Airtable Attachment** still present until explicit cleanup step (Slice 4)
- [ ] Downstream homework / video coach views still work *(not re-validated on canonical URL yet)*
- [ ] **Runtime for harness:** Make S3 still times out — decide Make fix vs Lambda vs SDK hybrid before **070b**

Only after **upload runtime** chosen + **070b** wired + C-020 **H2** → Slice 3 (automations/formulas) and Slice 4 (attachment clear + full H1–H4).

---

## Slice 1 — DEV field add (Mike / OMNI manual)

**DEV only first.** Add fields on **`127SI - SHOOTING CHALLENGE - DEV`** (`appTetnuCZlCZdTCT`) only. Do **not** mirror to Production until promotion doc + Mike approval.

**Why manual:** Cursor/OMNI cannot add Airtable fields via the public Data API. Mike or OMNI adds them in the Airtable UI.

**Base:** `127SI - SHOOTING CHALLENGE - DEV` (`appTetnuCZlCZdTCT`)
**Table:** **Submission Assets** (`tblhMLKxQK77agtME`)

### OMNI field confirmation (2026-07-07)

OMNI verified on DEV **Submission Assets**:

| Field | OMNI status | Type (OMNI) |
|-------|-------------|-------------|
| **Canonical File URL** | **Missing** | URL (preferred when added) |
| **Storage Key** | **Missing** | Single line text |
| **File Content Hash** | Exists | Single line text |
| **File Hash Algorithm** | Exists | Single select |
| **Upload Status** | Exists | Single select |
| **Airtable Attachment** | Exists | Attachment |
| **Google Drive File URL** | Exists | Single line text |

**Repo rule:** Do **not** treat fields as added for Slice 1 completion until **Mike confirms** in Airtable UI. A later API probe may show schema drift before Mike confirms — use Mike confirmation as the gate.

**No consumer switch yet:** Do **not** point formulas, views, **022**, **070a/b**, or coach queues at **Canonical File URL** / **Storage Key** until **DEV Make S3 writeback is proven** (Slice 2 + Slice 4). Existing gates stay on **Airtable Attachment** and **Google Drive File URL**.

### Required manual DEV field additions (Mike / OMNI)

| Field name | Type | Writer (owner) | Readers | Notes |
|------------|------|----------------|---------|-------|
| **Canonical File URL** | **URL** (preferred) | Make S3 upload / writeback (Slice 2) | **022**, coach views, **071/073** emails, audits, future web | HTTPS canonical object URL after upload |
| **Storage Key** | **Single line text** | Make S3 upload / writeback (Slice 2) | Audits, C-023 duplicate detection, repair tools | S3 object key — pattern TBD by Mike |

**Optional (defer):** `Storage Bucket`; `Athlete Headshot URL` on **Enrollments** (Slice 5).

### Fields already present — protect (do not rename/delete in Slice 1)

| Field | Status on DEV (2026-07-07 probe) | Writer today | Slice 1 rule |
|-------|-------------------------------------|--------------|--------------|
| **File Content Hash** | Present | Make v2 hash modules (not wired DEV) | Do not delete; Make will populate at upload |
| **File Hash Algorithm** | Present — exact option **`SHA-256`** (OMNI confirmed; no new option) | Make S3 writeback (Slice 2) | C-023 dedupe audit | Write literal **`SHA-256`** on success |
| **Upload Status** | Present (`Pending Link`, `Processing`, `Uploaded`, `Error`, …) | **009**, **020**, **013**, **070a/b**, Make | Keep ladder unchanged |
| **Airtable Attachment** | Present | **009** (intake copy) | **Do not clear yet** — still required by **020/013/070** |
| **Google Drive File URL** | Present (Single line text per OMNI) | Make Drive engine (legacy) | **Legacy bridge — do not delete yet**; formulas/views still gate on it |

**Probe record stats (DEV):** 49 Submission Assets sampled — 40 `Uploaded`, 9 `Pending Link`; **0** with `File Content Hash` populated (C-023 not wired end-to-end).

### Do not change yet (Slice 1)

- **Do not** switch formulas, views, **022**, or **070a/b** to **Canonical File URL** / **Storage Key** until DEV Make S3 writeback is proven (after Slice 2 + Slice 4).
- **Do not** clear **Airtable Attachment** fields after upload (Slice 4).
- **Do not** turn **070a** / **070b** ON on DEV until DEV Make S3 scenario exists (Slice 2).
- **Do not** remove **Google Drive File URL** or other Drive fields yet — legacy bridge until cutover verified.
- **Do not** paste automation script changes to Production.

### After Mike confirms both fields added on DEV

1. Re-run probe: `python tools/airtable/_probe_c013_asset_storage_fields.py --out tools/airtable/_preview/c013-dev-baseline-after-fields.json`
2. Confirm `schemaInventory.Submission Assets.groups.canonicalPlanned.present` includes **Canonical File URL** and **Storage Key**.
3. Mark Slice 1c complete; proceed to Slice 2 (DEV Make S3).

---

## Wave 7 execution map (concise)

### Current state (DEV schema snapshot 2026-07-06)

| Layer | Today | Gap |
|-------|-------|-----|
| **Intake attachments** | `Submissions.HW Sub 1`, `Video Upload` → **009** copies to `Submission Assets.Airtable Attachment` | Permanent copy in Airtable; storage limit risk |
| **Upload send** | **070a/070b** require `Airtable Attachment` + `Upload Status = Pending Link` | No S3; personal Google Drive in Make v1/v2 |
| **Writeback** | **022** syncs `Google Drive File URL` (+ folder IDs) to HC / VF | No `Canonical File URL`; attachments often not cleared |
| **Hash (C-023)** | Fields on **Submission Assets** exist; Make v2 blueprint modules **50/51/52** documented | Not wired to DEV base end-to-end; flag-only (no block) |
| **URL consumers** | Formulas **`Upload Ready?`**, **`Writeback Complete?`**, **`Ready to Send to Make?`**, coach views, **071/073** emails | All gate on attachment and/or Drive URL |
| **Web** | `leaderboard.ts` reads `Athlete Headshot` attachment | Needs URL field (C-013 phase 6) |
| **Missing fields** | — | **`Canonical File URL`**, **`Storage Key`** not in schema snapshots |

### Target contract (unchanged)

- One **HTTPS URL** per file = the asset (`Canonical File URL`).
- **`Upload Status = Uploaded`** + canonical URL = ready for coach/email/web.
- Intake attachments **transient** — clear after successful upload.
- **SHA-256** at upload time; duplicate policy explicit (flag vs block — Mike).

---

## Fields inventory (by table)

### Submissions (`tblEVjVpGGlPTsYSt`)

| Field | Role today | Wave 7 |
|-------|------------|--------|
| `HW Sub 1`, `HW Sub 2`, `Video Upload` | Fillout/C-020 intake attachments | Transient only; clear after **009** + upload success |
| `Attachment Upload Status`, `Attachment Upload Error` | **009** writeback | Keep; may reference canonical URL phase |
| `Ready to Send Attachments to Make?` | Formula | Update when gates use URL not attachment |

### Submission Assets (`tblhMLKxQK77agtME`) — primary upload row

| Field | Role today | Wave 7 |
|-------|------------|--------|
| `Airtable Attachment` | **009** copy; **020/013/070** gate | Transient; clear after upload |
| `Upload Status` | Ladder: `Pending Link` → `Processing` → `Uploaded` / `Error` | Keep ladder; same semantics |
| `Google Drive File URL`, `Google Drive File ID`, folder URL/ID fields | Make writeback | **Deprecate** after cutover; migrate formulas to `Canonical File URL` |
| `Create Google Drive File Name` | Video/homework naming for Make | Rename → **`Formatted Upload Name`** (formula or field) |
| `Upload Naming Status`, `Ready to Send to Make?` | Video gate before **070b** | Point at naming + attachment/URL readiness |
| `Upload Ready?` | Formula uses **attachment** | **Change:** URL + status OR transient attachment pre-upload |
| `Writeback Complete?` | Formula uses Drive URL + folder fields | **Change:** `Canonical File URL` + `Uploaded At` |
| `File Content Hash`, `File Hash Algorithm`, `File Size Bytes`, `File MIME Type` | C-023 schema | **Make** (or Lambda) writes at upload |
| `File is Duplicate?`, `Duplicate File Status`, … | C-023 schema | Make v2 pattern; enrollment scope TBD |
| `Source Attachment ID` | **009** dedupe by Airtable att id | Keep for intake; not a byte-hash substitute |
| *(planned)* `Canonical File URL` | — | **Add** — single source of truth |
| *(planned)* `Storage Key` | — | **Add** — S3 object key (e.g. `season/enrollment/assetId/filename`) |

### Homework Completions (`tblv58ppTFDBXb3nv`)

| Field | Role today | Wave 7 |
|-------|------------|--------|
| `Upload Status` | Child ladder (Pending/Processing/Uploaded/…) | Align with asset; **022** sync from asset |
| `Google Drive File URL`, folder fields | **022** lookup/writeback | Mirror **Canonical File URL** |
| `Airtable Attachment` | Legacy | Do not use as gate |
| Lookups from Submission Assets | Drive URL, duplicate flags | Repoint to canonical URL + hash lookups |

### Video Feedback (`tbl…`)

| Field | Role today | Wave 7 |
|-------|------------|--------|
| `Upload Status`, `Video URL or Drive Link`, Drive fields | **013** + **022** + Make | Mirror **Canonical File URL** |
| `Submission Asset` | Link to asset | Unchanged |
| Coach queue filters | Often attachment/Drive dependent | Update to URL + status |

### Enrollments

| Field | Role today | Wave 7 |
|-------|------------|--------|
| `Athlete Headshot` | Attachment; web leaderboard | Add **`Athlete Headshot URL`** (or canonical on Athletes); CloudFront public path |

---

## Automations affected (GitHub scripts — do not paste to Production until checklist complete)

| # | Script | Change type |
|---|--------|-------------|
| **009** | Create Submission Assets | Stop permanent attachment strategy; optional temp only; no Drive |
| **020** | Link Homework Completion | Gate: attachment **or** pre-upload URL; not Drive-specific |
| **013** | Create/link Video Feedback | Same |
| **070a** | Send homework to Make | Accept canonical pre-check; payload unchanged (v4.1 minimal); duplicate guard on URL/key not Drive ID |
| **070b** | Send video to Make | Same + naming gate |
| **022** | Child upload writeback | Write **`Canonical File URL`**, `Storage Key`; sync to HC/VF |
| **021** | Set Attachment Upload Status | May set submission-level status when assets clear attachments |

**Not Wave 7 slice 1:** 064/065/071/073 XP and email content (consume URL once present).

---

## Formulas / views (Airtable UI — Mike or documented steps)

| Field / view | Depends on | Action |
|--------------|------------|--------|
| `Upload Ready?` | `Airtable Attachment` | URL-or-attachment rule |
| `Writeback Complete?` | Google Drive * | Canonical URL + Uploaded |
| `Ready to Send to Make?` | Naming + attachment | Include `Upload Naming Status` for video |
| `Asset Key` | `Google Drive File ID` | Consider `Storage Key` or record id |
| Coach **Homework** / **Video** queues | Drive URL empty checks | Filter `Upload Status = Uploaded` + canonical URL |
| C-019 **Testing** views | Enrollment filter | No change to filter; rows gain URL fields |

---

## Make / external

| Item | Today | Wave 7 target |
|------|-------|---------------|
| Blueprint | v1/v2 → **Google Drive** | Fork: **S3 PutObject** + public or presigned URL |
| Hash | v2 modules 50/51/52 (Drive continues after hash) | Keep hash path; swap upload destination to S3 |
| Webhook | Production hook ids in docs only | **DEV-only** webhook URL in DEV **070a/070b** |
| Error writeback | [upload-asset-engine-error-handling.md](../../make/documentation/upload-asset-engine-error-handling.md) | Same ladder; set `Upload Status = Error` |

Reference: [upload-asset-engine-v2-hash-duplicate-check.md](../../make/documentation/upload-asset-engine-v2-hash-duplicate-check.md)

---

## Smallest first implementation slice

**Slice 1 — Inventory + schema design (no Production, no automation paste)**

1. Run `_probe_c013_asset_storage_fields.py` on DEV → baseline JSON in `_preview/` or terminal.
2. Mike adds DEV-only fields: **`Canonical File URL`**, **`Storage Key`** on **Submission Assets** (+ optional `Storage Bucket`); mirror URL on HC/VF if not lookup-only.
3. Update [field-map.md](../../airtable/schema/current/field-map.md) ownership row (C-012 lite): who writes URL (Make), who reads (022, views, web).
4. Mike decisions (blockers below): S3 bucket layout, public vs presigned, Lambda vs Make.

**Slice 2 — DEV Make S3 upload/writeback proof (still no Production)**

See **[C-013-make-s3-writeback-mapping.md](./C-013-make-s3-writeback-mapping.md)** (architecture), **[C-013-make-s3-dev-build-packet.md](./C-013-make-s3-dev-build-packet.md)** (checklist), and **[Make UI runbook](../../make/documentation/C-013-dev-s3-make-ui-runbook.md)** (step-by-step build).

1. Clone Upload Engine v2 hash blueprint → **DEV-only** scenario + webhook.
2. Replace Google Drive modules with **S3 Upload Object** + canonical URL build.
3. Prove writeback on DEV (H1/H2) before enabling **070a/070b** on DEV.
4. Point DEV **070a/070b** `makeWebhookUrl` at DEV hook only after Mike approves.

**Slice 3 — Airtable DEV automations + formulas**

1. **022** vNext: sync canonical URL to children.
2. **070a/b**: duplicate guard uses canonical URL / storage key.
3. Formulas: `Writeback Complete?`, `Upload Ready?`, `Ready to Send to Make?`.
4. **009** optional: defer attachment clear until Slice 4.

**Slice 4 — C-020 harness proof**

| Test | Scenario | Pass criteria |
|------|----------|---------------|
| **H1** | New C-020 Homework 1-file (clone G) | Asset → **070a** → Make → `Upload Status = Uploaded`, **Canonical File URL** set, **022** on HC |
| **H2** | New C-020 Video 1-file (clone F) | Asset → **070b** → VF URL set |
| **H3** | C-023 | Global hash + independent S3 — **PASS** (`rec1ZyqOfljt4foEX`). **Stage 2A/2B** local code + unit tests PASS. **H3b–H3p** runtime tests pending Stage 3–4 |
| **H4** | Attachment clear | After success, `Airtable Attachment` empty on asset (+ submission intake fields) |

Use Schmidt enrollment `recgP9qZYjAhE7NXm`; small test files (&lt; 5 MB).

**Slice 5 — Web headshots + Production promotion doc**

- Web reads URL field; promotion checklist per `_PROMOTION-STEPS-TEMPLATE.md`.

---

## DEV test plan (C-020 harness + upload)

**Prerequisite:** Slice 2 complete (DEV Make accepts webhook).

1. Confirm **070a/070b** automations **ON** on DEV; webhook URL = DEV Make scenario.
2. Create **Testing Scenarios** row (Homework 2-file pattern from Test **G** `rec14HLmrN5suEyWs`) with **new** activity date.
3. Run **115** → verify **009/020** unchanged from Wave 6.
4. Trigger **070a** (manual or `Send to Make Trigger`) → watch Make → asset **Uploaded** + **Canonical File URL**.
5. Verify **022** updated HC child fields.
6. Repeat for Video (Test **F** pattern `recvuvDdglwY2I7nu`).
7. Run probe again → compare hash/URL population vs baseline.

**Out of scope for first upload proof:** Homework XP (**064/065**), parent emails, Production paste, 2025–26 archive migration.

---

## Hard rules (Wave 7)

- **DEV first** — no Production Airtable automation paste until promotion doc + Mike approval.
- **No secrets in GitHub** — PAT, webhook URLs, bucket credentials in Make/Vercel/Airtable only.
- **Read-only probes OK** — schema list + record counts; no bulk deletes.
- **C-020 harness** — pipeline rows stay Fillout-shaped; no test flags on Submissions/Assets.

---

## Mike blockers (stop and ask)

| # | Decision | Blocks |
|---|----------|--------|
| 1 | **AWS account** + bucket name(s) + IAM for Make (or Lambda) | Slice 2 |
| 2 | **Upload runtime** | **DECIDED 2026-07-08:** SDK/hybrid interim for DEV; Lambda later for prod — [runtime doc](./C-013-sdk-hybrid-runtime.md) |
| 3 | **Public CloudFront** (headshots) vs **presigned/private** (homework/video) | URL shape + Make modules |
| 4 | **S3 key layout** (`Storage Key` pattern) | Make writeback + dedupe scope |
| 5 | **C-023 policy**: flag duplicate vs block upload | Make module 51 + coach workflow |
| 6 | **DEV Make webhook** URL + approval to turn **070a/070b ON** on DEV | Slice 4 live test |
| 7 | **Production cutover window** | Any prod paste |

---

## Checklist progress

- [x] Slice 1a — probe baselines → [before-fields.json](../../tools/airtable/_preview/c013-dev-baseline-before-fields.json) (+ [first baseline](../../tools/airtable/_preview/c013-dev-baseline.json))
- [x] Slice 1b — OMNI + Metadata API field confirmation + ownership documented
- [x] Slice 1c — **Canonical File URL** + **Storage Key** on DEV Submission Assets (Metadata API; 0/49 records populated — schema only)
- [x] **Slice 2 — DEV S3 upload/writeback proof** — **SDK PASS** 2026-07-08 ([proof](../../tools/airtable/_preview/c013-dev-s3-sdk-proof-recBBi80bYuxXifVj.json) · [verify](../../tools/airtable/_preview/c013-dev-s3-sdk-proof-recBBi80bYuxXifVj-verify.json))
- [x] **Runtime decision** — SDK/hybrid interim; Make S3 parked — [C-013-sdk-hybrid-runtime.md](./C-013-sdk-hybrid-runtime.md)
- [ ] **Slice 2b — C-020 H2** + C-023 duplicate lookup on SDK path
- [ ] Slice 2b gate → prep **070b** hybrid webhook (DEV only)
- [ ] Slice 3 — 022 / 070 / formulas on DEV
- [ ] Slice 4 — C-020 H1–H4 PASS
- [ ] Slice 5 — web headshot URL + promotion doc
- [~] C-013 status → DEV verified *(SDK proof one asset; Make path blocked; not prod)*
- [~] C-023 status → DEV verified *(hash writeback PASS; duplicate lookup module 52 pending)*

---

## Related backlog rows

| ID | Note |
|----|------|
| **C-012** | Field ownership matrix when adding canonical fields |
| **C-024** | Broader dedupe keys; C-023 is file-byte layer |
| **C-009** | HW17 PDF must join same pipeline after C-013 |
| **C-020** | DEV functional complete — upload path explicitly excluded until Wave 7 |
