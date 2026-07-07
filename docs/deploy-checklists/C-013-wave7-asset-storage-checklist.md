# C-013 / C-023 — Wave 7 asset storage execution checklist

**Backlog:** C-013 (AWS S3 canonical URLs), C-023 (file content hash dedup)  
**Status:** **Wave 7 Slice 2 in progress** — DEV schema complete; [Make S3 writeback mapping](./C-013-make-s3-writeback-mapping.md) drafted. S3 not active until DEV scenario proves writeback. No Production changes.  
**Depends on:** C-020 DEV functional complete (115 harness); C-012 field ownership (partial — document as we go)  
**Architecture:** [asset-storage-migration.md](../asset-storage-migration.md) · [upload-workflow-homework-video.md](../upload-workflow-homework-video.md) · [make/documentation/upload-asset-engine.md](../../make/documentation/upload-asset-engine.md) · **[Slice 2 Make S3 mapping](./C-013-make-s3-writeback-mapping.md)**  
**Test harness:** [C-020 checklist](./C-020-testing-scenarios-script-checklist.md) — Tests **F** (video) and **G** (homework) for upload path after DEV Make is wired  
**DEV probe:** `tools/airtable/_probe_c013_asset_storage_fields.py` (read-only)

**Environment:** DEV `appTetnuCZlCZdTCT` first. **070a/070b OFF** on DEV until DEV Make S3 scenario exists.

**DEV baselines (read-only):**

| File | When | Notes |
|------|------|-------|
| [c013-dev-baseline.json](../../tools/airtable/_preview/c013-dev-baseline.json) | 2026-07-07 (first probe) | Both canonical fields missing |
| [c013-dev-baseline-before-fields.json](../../tools/airtable/_preview/c013-dev-baseline-before-fields.json) | 2026-07-07 (post-OMNI) | OMNI report stale; Metadata API later confirmed fields |

---

## Storage source of truth transition

**Yes — C-013 moves the system toward S3 / canonical URL as the storage source of truth.** Wave 7 Slice 1 only prepared DEV schema columns. **S3 is not yet the active source of truth** until DEV Make uploads files to S3 and writeback populates **Canonical File URL**, **Storage Key**, and hash fields on **Submission Assets**.

### 1. Current source of truth (today on DEV)

| Layer | Role |
|-------|------|
| **Airtable Attachment** | Still the **transient file source** at intake — **009** copies from Submissions; **020/013/070** still gate on it |
| **Google Drive File URL** | Still the **legacy uploaded-file bridge** — 40/49 DEV assets have Drive URL; formulas/views/**022** still use it |
| **Canonical File URL** | Field **exists** on DEV schema — **0/49 records populated** until Make S3 writeback |
| **Storage Key** | Field **exists** on DEV schema — **0/49 records populated** until Make S3 writeback |
| **File Content Hash** | Field exists — **0/49 populated** (C-023 not wired end-to-end) |

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

- [ ] Upload succeeds (`Upload Status = Uploaded`)
- [ ] **Canonical File URL** populated
- [ ] **Storage Key** populated
- [ ] **File Content Hash** (+ algorithm) populated
- [ ] Old **Airtable Attachment** still present until explicit cleanup step (Slice 4)
- [ ] Downstream homework / video coach views still work

Only after the above → Slice 3 (automations/formulas) and Slice 4 (attachment clear + C-020 H1–H4).

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
| **File Hash Algorithm** | Present (`SHA-256` option) | Make v2 | Do not delete |
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

See **[C-013-make-s3-writeback-mapping.md](./C-013-make-s3-writeback-mapping.md)** for module map, writeback fields, and C-020 H1–H4 tests.

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
| **H3** | C-023 | Re-upload same bytes → `Duplicate File Status = Exact Duplicate` (policy: flag or block per Mike) |
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
| 2 | **Lambda vs Make** for upload (Mike 2026-07-05: Lambda direction) | Architecture of Slice 2 |
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
- [ ] **Slice 2 — DEV Make S3 upload/writeback proof** — [mapping doc](./C-013-make-s3-writeback-mapping.md)
- [ ] Slice 3 — 022 / 070 / formulas on DEV
- [ ] Slice 4 — C-020 H1–H4 PASS
- [ ] Slice 5 — web headshot URL + promotion doc
- [ ] C-013 status → DEV verified
- [ ] C-023 status → DEV verified (hash + duplicate flag)

---

## Related backlog rows

| ID | Note |
|----|------|
| **C-012** | Field ownership matrix when adding canonical fields |
| **C-024** | Broader dedupe keys; C-023 is file-byte layer |
| **C-009** | HW17 PDF must join same pipeline after C-013 |
| **C-020** | DEV functional complete — upload path explicitly excluded until Wave 7 |
