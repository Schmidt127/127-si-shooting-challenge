# C-013 — Upload runtime architecture (DEV)

**Decision date:** 2026-07-08 (Mike)  
**Architecture lock (2026-07-08):** **Airtable → Make → Lambda → S3 → Airtable**  
**Implementation plan:** [C-013-dev-lambda-upload-plan.md](./C-013-dev-lambda-upload-plan.md) — **IMPLEMENTED** (code + local PASS 2026-07-08); **AWS deploy** pending admin IAM  
**Backlog:** C-013, C-023, C-020 (H2)  
**Environment:** DEV `appTetnuCZlCZdTCT` only  
**Parent:** [C-013-wave7-asset-storage-checklist.md](./C-013-wave7-asset-storage-checklist.md)

---

## Runtime decision (locked)

| Option | Status |
|--------|--------|
| **1 — Make AWS S3 Upload** | **DROPPED** — no further troubleshooting |
| **2 — Lambda (Make → HTTP → Lambda → S3)** | **SELECTED** — permanent upload runtime |
| **3 — SDK / hybrid interim** | **Proof complete** — logic source for Lambda; [`c013_dev_s3_upload_proof.py`](../../tools/airtable/c013_dev_s3_upload_proof.py) + [`lambda/upload-asset/`](../../lambda/upload-asset/) |

**Rule:** Upload + hash + duplicate lookup + Airtable writeback run in **AWS Lambda**, invoked by **Make webhook/orchestration only** (070b v4.1 payload). **Do not** use Make **Amazon S3 Upload**.

---

## Architecture (locked)

```text
C-020 H2 (115 harness)
  → 009 / 013 (intake — unchanged)
  → Submission Asset: Pending Link + attachment
  → [070b OFF until Lambda + Make dry-run PASS]
  → 070b → Make Custom Webhook → HTTP POST Lambda Function URL
  → Lambda: download attachment → SHA-256 → C-023 duplicate lookup → S3 PutObject → Airtable writeback
  → JSON response → Make 200 → 070b sets Processing (Lambda sets Uploaded)
```

| Layer | Role |
|-------|------|
| **Airtable 115 / 009 / 013** | Fillout-shaped intake — unchanged |
| **070a / 070b** | **OFF** until Lambda AWS deploy + Make dry-run PASS |
| **Make** | Webhook receive + router + HTTP to Lambda — **no S3 module** |
| **Lambda** | `127si-dev-shooting-challenge-asset-upload` — authoritative upload runtime |
| **S3** | `shooting-challenge-assets` (us-east-2) |
| **SDK CLI** | Local proof + regression; extracts into `lambda/upload-asset/` |

**Proven baseline:** Manual SDK run on `recBBi80bYuxXifVj` — [proof](../../tools/airtable/_preview/c013-dev-s3-sdk-proof-recBBi80bYuxXifVj.json) · [verify](../../tools/airtable/_preview/c013-dev-s3-sdk-proof-recBBi80bYuxXifVj-verify.json) (`allPass=true`).

**H2 harness PASS (2026-07-08):** Scenario `recd9CxYgdJD2T435` → Submission `recv5dbLefJipUvmh` → Asset `recL9r4a7navUxEhg` — [proof](../../tools/airtable/_preview/c013-dev-h2-sdk-proof-recL9r4a7navUxEhg.json) · [verify](../../tools/airtable/_preview/c013-dev-h2-sdk-proof-recL9r4a7navUxEhg-verify.json) (`allPass=true`). C-023 duplicate matched prior manual proof asset `recBBi80bYuxXifVj` (same SHA-256); upload **not** blocked.

**H2 Lambda handler PASS (2026-07-08):** Scenario `rec1fPdnIkhHfyLUN` → Submission `reckdsMrSJFADmopS` → Asset `recLAk8TA4lfbA6eu` — [proof](../../tools/airtable/_preview/c013-dev-lambda-h2-proof-recLAk8TA4lfbA6eu.json) · [verify](../../tools/airtable/_preview/c013-dev-lambda-h2-proof-recLAk8TA4lfbA6eu-verify.json) (`allPass=true`). In-process handler (same code as Lambda zip); C-023 `match_found_written_to_existing_field` → `recBBi80bYuxXifVj` (4 prior matches). **AWS Lambda deploy** blocked on IAM; see [lambda/upload-asset/DEPLOY.md](../../lambda/upload-asset/DEPLOY.md).

---

## Next build target: C-020 **H2** (video harness)

**Order:** **H2 before H1** (homework).

| Test | Pattern | Intake source |
|------|---------|---------------|
| **H2** | Video **1-file** | Clone C-020 Test **F** style; new activity date; **115** v1.3 Video scenario |
| **H1** | Homework 1-file | After H2 gate + **070b** prep — deferred |

**H2 pass criteria (upload slice):**

1. **115** creates Submission + **013** Video Feedback + Submission Asset(s) — same as Wave 6 functional video test.
2. SDK runtime processes **at least one** harness-created video asset (not only manual `recBBi80bYuxXifVj`).
3. Writeback verifier `allPass=true` on that asset:
   - Upload Status = `Uploaded`
   - Canonical File URL, Storage Key, File Content Hash, File Hash Algorithm = `SHA-256`, Uploaded At
   - Upload Error blank
   - Attachment retained
4. **C-023** duplicate lookup **tested** on SDK path (re-upload same bytes → duplicate flags per policy).
5. **009 / 013** behavior unchanged from Wave 6.

---

## Gate — required before enabling DEV **070b**

All must pass on a **harness-origin** video asset (H2), not manual-only proof:

| # | Gate | Status |
|---|------|--------|
| 1 | SDK runtime processes video asset from harness path | **PASS** (`recL9r4a7navUxEhg`) |
| 2 | Full writeback contract (canonical, key, hash, algorithm, uploaded at, status, error clear) | **PASS** (H2 verify `allPass=true`) |
| 3 | C-023 duplicate lookup behavior tested | **PASS** (`match_found_written_to_existing_field` → `recBBi80bYuxXifVj`) |
| 4 | Airtable Attachment **not** cleared | **Enforced** |
| 5 | Production **not** touched | **Enforced** |
| 6 | No formula/view/script cutover to Canonical File URL | **Enforced** |
| 7 | **070a / 070b** remain **OFF** until Lambda AWS deploy + Make dry-run PASS | **Enforced** (handler gate rows 1–3 PASS; **070b still OFF**) |

**After gate:** Deploy DEV Lambda to AWS (admin IAM) → Make scenario dry-run → prep **070b** `makeWebhookUrl` → **DEV URL only**. **H1** homework after video path stable.

**Lambda deploy:** [lambda/upload-asset/DEPLOY.md](../../lambda/upload-asset/DEPLOY.md). **070b prep:** [C-013-dev-070b-hybrid-prep.md](./C-013-dev-070b-hybrid-prep.md) (still OFF).

---

## 070b + Lambda status (OFF — awaiting AWS deploy + Make dry-run)

| Item | Finding |
|------|---------|
| **Permanent path** | Airtable **070b** → Make webhook → **Lambda** → S3 → Airtable writeback |
| **Make S3 module** | **Dropped** — never use |
| **Lambda code** | [`lambda/upload-asset/`](../../lambda/upload-asset/) — **local handler PASS** `recLAk8TA4lfbA6eu` |
| **AWS deploy** | **Blocked** — `127si-program-storage-uploader` lacks Lambda/IAM create; admin deploy required |
| **070b enabled?** | **NO** |
| **070a enabled?** | **NO** |

---

## Engineering build sequence (Slice 2b)

| Step | Task | Owner | Status |
|------|------|-------|--------|
| **1** | Extend SDK script: C-023 duplicate lookup (Airtable GET `File Content Hash` match, enrollment scope TBD) | Cursor / Mike | **DONE** (2026-07-08) |
| **2** | Implement DEV Lambda (`lambda/upload-asset/`) from SDK proof logic | Cursor / Mike | **DONE** (2026-07-08) — local PASS; AWS deploy pending admin |
| **3** | Run **H2**: new Testing Scenarios Video 1-file row → **115** → SDK on resulting asset | Mike | **DONE** (`recL9r4a7navUxEhg`) |
| **4** | Save `_preview/c013-dev-h2-sdk-proof-<assetId>.json` + probe verify | Cursor | **DONE** |
| **4b** | H2 through Lambda handler (`c013_dev_lambda_invoke.py`) | Cursor | **DONE** (`recLAk8TA4lfbA6eu`, `allPass=true`) |
| **5** | Deploy DEV Lambda to AWS + Make Lambda scenario; prep **070b** (still OFF) | Mike | **IN PROGRESS** — code in repo; IAM blocked on storage uploader user |

**Parked (do not work):** Make **Amazon S3 Upload** module troubleshooting.

---

## C-023 duplicate lookup (SDK path)

Implemented in `c013_dev_s3_upload_proof.py` (2026-07-08):

1. SHA-256 computed from downloaded bytes **before** S3 upload.
2. DEV `Submission Assets` filtered by `File Content Hash`, excluding current record.
3. Upload **continues** regardless of match (flag-only; no duplicate-block status in architecture).
4. Existing DEV fields written via `typecast`: `File is Duplicate?`, `Duplicate File Status`, `Duplicate Match Strength`, `Duplicate Match Record`, `Duplicate Match Notes`, `Duplicate Checked At`, `Duplicate Check Error`.
5. JSON report block `c023Duplicate`: `currentAssetId`, `computedSha256`, `duplicateLookupPerformed`, `duplicateMatchCount`, `duplicateMatches[]`, `duplicateBehaviorDecision`.

| Decision | Meaning |
|----------|---------|
| `no_match` | No other asset with same hash |
| `match_found_report_only` | Dry-run; match found, not written |
| `match_found_written_to_existing_field` | Live run; duplicate flags written |

**H2 proof:** `recL9r4a7navUxEhg` matched `recBBi80bYuxXifVj` (hash `448c3126…f967`); decision `match_found_written_to_existing_field`.

---

## Hard stops (unchanged)

- No Production base, scenario, webhook, or automation paste.
- No clearing **Airtable Attachment** after upload.
- No removing **Google Drive** fields.
- No repointing formulas, views, **022**, emails, or web to **Canonical File URL**.
- No secrets in GitHub (AWS creds, PAT, webhook URLs → env / Make only).

---

## Related

| Doc | Topic |
|-----|--------|
| [C-013-wave7-asset-storage-checklist.md](./C-013-wave7-asset-storage-checklist.md) | Wave 7 slices |
| [C-020-testing-scenarios-script-checklist.md](./C-020-testing-scenarios-script-checklist.md) | H2 harness |
| [C-013-make-s3-dev-build-packet.md](./C-013-make-s3-dev-build-packet.md) | Writeback contract |
| [C-013-dev-lambda-upload-plan.md](./C-013-dev-lambda-upload-plan.md) | **Lambda implementation plan (DEV)** |
| [C-013-dev-070b-hybrid-prep.md](./C-013-dev-070b-hybrid-prep.md) | 070b trigger prep (OFF until approved) |
